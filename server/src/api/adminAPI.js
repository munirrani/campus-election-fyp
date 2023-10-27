const dotenv = require('dotenv');
const app = require('../server/express-server');
const { db } = require('../../db');
const CryptoJS = require('crypto-js');
const multer = require('multer');
const facultiesObj = require('../../constants/faculties')
const partiesObj = require('../../constants/parties')
const { authenticateToken, authenticateContractOwner } = require('../server/authentication')

dotenv.config()

app.get('/api/admin/get-voters/:contractOwner/:contractAddress', authenticateToken, authenticateContractOwner, async (req, res) => {
    console.log("/api/admin/get-voters/:contractOwner/:contractAddress")
    const { contractOwner, contractAddress } = req.params;
    if (!contractOwner || !contractAddress) {
        res.status(400).json({ message: 'Missing contractOwner or contractAddress.' });
        return;
    }
    try {
        const accountsSnapshot = await db
            .collection('Account')
            .get();
        let accounts = [];
        // Get only their id as that corresponds to their ethereum address
        accountsSnapshot.forEach(doc => {
            accounts.push(doc.id);
        });
        accounts = accounts.filter(account => account.toLowerCase() !== contractOwner.toLowerCase());
        res.status(200).json(accounts);
    } catch (error) {
        console.error('Failed to fetch accounts:', error);
        res.status(500).json({ message: 'Failed to fetch accounts.' });
    }
});

app.get('/api/admin/candidates/:contractOwner/:contractAddress', authenticateToken, authenticateContractOwner, async (req, res) => {
    console.log("/api/admin/candidates/:contractOwner/:contractAddress")
    const { contractOwner, contractAddress } = req.params;
    if (!contractOwner || !contractAddress) {
        res.status(400).json({ message: 'Missing contractOwner or contractAddress.' });
        return;
    }
    try {
        const candidatesSnapshot = await db
            .collection('Election')
            .doc(contractOwner.toLowerCase())
            .collection(contractAddress.toLowerCase())
            .doc('Candidates')
            .collection('Candidates')
            .get();
        let candidatesTemp = [];
        candidatesSnapshot.forEach(doc => {
            const data = doc.data();
            const facultyName = data.name;
            const candidateArray = data.candidates;
            for (let i = 0; i < candidateArray.length; i++) {
                const candidate = candidateArray[i];
                const candidateObj = candidate;
                candidateObj.faculty = facultyName;
                candidatesTemp.push(candidateObj);
            }
        });
        res.status(200).json(candidatesTemp);
    } catch (error) {
        console.error('Failed to fetch candidates:', error);
        res.status(500).json({ message: 'Failed to fetch candidates.' });
    }
});

app.post('/api/admin/add-candidate', authenticateToken, authenticateContractOwner, async (req, res) => {
    console.log("/api/admin/add-candidate")
    const { candidates, contractOwner, contractAddress } = req.body;
    
    try {
        let candidatesObj = { }
        const profileImageUrlObj = { }
        for (const candidate of candidates) {
            const { full_name, googleDriveUrl } = candidate;
            profileImageUrlObj[full_name] = googleDriveUrl;
        }

        const facultyCandidateCount = {}
        for (const candidate of candidates) {
            const { full_name, party, faculty } = candidate;
            const faculty_id = facultiesObj[faculty].code;
            const candidateObj = {
                full_name: full_name,
                party: partiesObj[party],
                vote_count: 0,
                profile_image_url: profileImageUrlObj[full_name],
            }
            if (faculty in candidatesObj) {
                facultyCandidateCount[faculty]++;
                candidateObj.code = faculty_id + "C" + (facultyCandidateCount[faculty]).toString()
                candidatesObj[faculty].push(candidateObj);
            } else {
                facultyCandidateCount[faculty] = 1;
                candidateObj.code = faculty_id + "C" + (facultyCandidateCount[faculty]).toString()
                candidatesObj[faculty] = [candidateObj];
            }
        }

        // Reference to 'Candidates' collection
        const candidatesRef = db
            .collection('Election')
            .doc(contractOwner.toLowerCase())
            .collection(contractAddress.toLowerCase())
            .doc('Candidates')
            .collection('Candidates')

        // Upload to Firebase candidatesObj based on "Candidates" collection
        for (const faculty in candidatesObj) {
            const faculty_id = facultiesObj[faculty].code;
            const faculty_shortname = faculty;
    
            // Reference to 'Candidates' document
            const facultyDocRef = candidatesRef.doc(faculty_id);

            console.log("Adding candidates document")
            console.log({name: faculty_shortname, candidates: JSON.stringify(candidatesObj[faculty])})
            await facultyDocRef.set({
                name: faculty_shortname,
                candidates: candidatesObj[faculty],
            });
        }
        res.status(200).json({ message: 'Candidate added successfully.' });
    } catch (error) {
        console.error('Failed to add candidates:', error);
        res.status(500).json({ message: 'Failed to add candidates.' });
    }

});

app.get('/api/admin/election-details/:contractOwner/:contractAddress', authenticateToken, authenticateContractOwner, async (req, res) => {
    console.log("/api/admin/election-details")
    const { contractAddress } = req.params;
    
    try {
        const contractOwnerDoc = db.collectionGroup(contractAddress.toLowerCase())
        const adminSnapshot = await contractOwnerDoc.get();
        const electionDetails = adminSnapshot.docs.filter(doc => doc.id == "Admin")[0].data();
        res.json(electionDetails);
    } catch (error) {
        console.log('Failed to get election details:', error);
        res.status(500).json({ message: 'Failed to get election details.' });
    }
});
  
app.get('/api/admin/election-results/:contractOwner/:contractAddress', authenticateToken, authenticateContractOwner, async (req, res) => {

    console.log("/api/admin/election-results")
    const { contractOwner, contractAddress } = req.params;

    try {
        const candidatesSnapshot = await db
            .collection('Election')
            .doc(contractOwner.toLowerCase())
            .collection(contractAddress.toLowerCase())
            .doc('Candidates')
            .collection('Candidates')
            .get();
        let candidates = candidatesSnapshot.docs.map(doc => doc.data());
    
        for (const f in candidates) {
            candidates[f].candidates.sort((a, b) => (a.vote_count < b.vote_count) ? 1 : -1);
        }

        res.json(candidates);
    } catch(error) {
        console.log('Failed to get election results:', error);
    }

});

function countVotes(decryptedBallot, occurrenceCount) {
    const [facultyCandidate, generalCandidate] = decryptedBallot.split(",");
    occurrenceCount[facultyCandidate] = (occurrenceCount[facultyCandidate] || 0) + 1;
    occurrenceCount[generalCandidate] = (occurrenceCount[generalCandidate] || 0) + 1;
    return occurrenceCount;
}

async function updateCandidatesVotes(db, contractOwner, contractAddress, groupObj, occurrenceCount) {
    for (const str in occurrenceCount) {
        // Handle faculty and general candidates separately
        let groupIndex, candidateIndex;
        if (str.startsWith("F")) {
            const c_index = str.indexOf("C")
            groupIndex = parseInt(str.substring(0, c_index).replace("F", ""));
            candidateIndex = parseInt(str.substring(c_index).replace("C", ""));
            candidateIndex--;  // adjust for 0-based index
            groupObj["F" + (groupIndex)].candidates[candidateIndex].vote_count = occurrenceCount[str];
        } else {
            candidateIndex = parseInt(str.substring(1).replace("C", "") - 1);
            groupObj["G"].candidates[candidateIndex].vote_count = occurrenceCount[str];
        }
    }
    // Upload to Firebase candidatesObj based on "Candidates" collection
    const batch = db.batch();
    for (const faculty_id in groupObj) {
        // Reference to 'Candidates' document
        const facultyDocRef = db
            .collection('Election')
            .doc(contractOwner.toLowerCase())
            .collection(contractAddress.toLowerCase())
            .doc('Candidates')
            .collection('Candidates')
            .doc(faculty_id);
        const candidateArray = groupObj[faculty_id].candidates;
        const candidateArraySorted = candidateArray.sort((a, b) => b.vote_count - a.vote_count);
        batch.update(facultyDocRef, { candidates: candidateArraySorted });
    }
    return batch.commit();
}

async function decryptResultAndCount(db, contractOwner, contractAddress) {
    const batch = db.batch();

    try {

        // Fetch ballots from Firestore
        const ballotRef = db
            .collection('Election')
            .doc(contractOwner.toLowerCase())
            .collection(contractAddress.toLowerCase())
            .doc('Ballot')
            .collection('Ballot');
        const ballotSnapshot = await ballotRef.where("hasCounted", "==", false).get();
    
        // Get election committee secret from Firestore
        const adminSnapshot = await db
                .collection('Election')
                .doc(contractOwner.toLowerCase())
                .collection(contractAddress.toLowerCase())
                .doc('Admin')
                .get();
            
        const electionCommitteeSecret = adminSnapshot.data().electionCommitteeSecret.toString();
        
        // Initialize count object
        let occurrenceCount = {};
    
        ballotSnapshot.docs.forEach((document) => {
            // Decrypt ballot
            const cipherText = document.data().ballot;
            const bytes = CryptoJS.AES.decrypt(cipherText, electionCommitteeSecret);
            const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
            
            // Count votes
            occurrenceCount = countVotes(decryptedData, occurrenceCount);
            
            // Mark ballot as counted
            const docRef = ballotRef.doc(document.id);
            batch.update(docRef, { hasCounted: true });
        });
        
        // Apply ballot updates
        await batch.commit();
        
        // Fetch candidates from Firestore
        const candidateRef = db
            .collection('Election')
            .doc(contractOwner.toLowerCase())
            .collection(contractAddress.toLowerCase())
            .doc('Candidates')
            .collection('Candidates');
        const candidateSnapshot = await candidateRef.get();
        const groupObj = {};
        candidateSnapshot.docs.forEach((document) => {
            // Use document id as key
            groupObj[document.id] = document.data();
        });
        // Pass in groupObj by reference
        await updateCandidatesVotes(db, contractOwner, contractAddress, groupObj, occurrenceCount);
        
        // Update electionResultsCounted
        await db
            .collection('Election')
            .doc(contractOwner.toLowerCase())
            .collection(contractAddress.toLowerCase())
            .doc('Admin')
            .update({ hasCountedResult: true });
        return true;
    } catch(error) {
        console.log('decryptResultAndCount failed:', error);
        return false;
    }

}

app.post('/api/admin/count-votes', authenticateToken, authenticateContractOwner, async(req, res) => {
    console.log("/api/admin/count-votes")
    const { contractOwner, contractAddress } = req.body;
    if (!contractOwner || !contractAddress) {
        res.status(400).json({ message: 'Missing contractOwner or contractAddress.' });
        return;
    }

    try {
        const counted = await decryptResultAndCount(db, contractOwner, contractAddress);
        res.json({ status: counted ? 'Counting successful.' : 'Counting failed.' });
    } catch(error) {
        console.log('Failed to get election results:', error);
    }
});

app.post('/api/admin/publish-result', authenticateToken, authenticateContractOwner, async(req, res) => {
    console.log("/api/admin/publish-result")
    const { contractOwner, contractAddress } = req.body;
    if (!contractOwner || !contractAddress) {
        res.status(400).json({ message: 'Missing contractOwner or contractAddress.' });
        return;
    }

    try {
        await db
            .collection('Election')
            .doc(contractOwner.toLowerCase())
            .collection(contractAddress.toLowerCase())
            .doc('Admin')
            .update({ hasPublishedResult: true });
        res.json({ status: 'Result published successfully.' });
    } catch (error) {
        console.log('Failed to publish election result:', error);
        res.status(500).json({ message: 'Failed to publish election result.' });
    }
        
});

async function resetDatabase(db, contractOwner, contractAddress) {
    const batch = db.batch();
  
    const collections = ["Ballot", "Account", "PendingRegistration"];
  
    for (let collectionName of collections) {
      const collectionRef = db
        .collection("Election")
        .doc(contractOwner.toLowerCase())
        .collection(contractAddress.toLowerCase())
        .doc(collectionName)
        .collection(collectionName);
      const querySnapshot = await collectionRef.get();
      querySnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
    }
  
    const adminDocRef = db
        .collection("Election")
        .doc(contractOwner.toLowerCase())
        .collection(contractAddress.toLowerCase())
        .doc("Admin")
    batch.update(adminDocRef, {
      hasStarted: false,
      electionResultsCounted: false,
      electionStartTimestamp: 0,
      electionEndTimestamp: 0,
      totalVoteCount: 0,
      electionCommitteeSecret: "",
    });
  
    return batch.commit();
}

// app.post('/api/admin/reset', authenticateToken, async(req, res) => {
//     console.log("/api/admin/reset")
//     const { contractOwner, contractAddress } = req.body;
//     if (!contractOwner || !contractAddress) {
//         res.status(400).json({ message: 'Missing contractOwner or contractAddress.' });
//         return;
//     }

//     try {
//         await resetDatabase(db, contractOwner, contractAddress)
//         res.json({ status: 'Database successfuly reset' });
//     } catch(error) {
//         console.log('Failed to get election results:', error);
//     }
// });