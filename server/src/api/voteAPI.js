const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const app = require('../server/express-server');
const { db } = require('../../db');
const CryptoJS = require('crypto-js');
const { secret } = require('../cryptography/cryptography');
const { authenticateToken } = require('../server/authentication')
const { contractAddressToOwnerObj } = require('../web3/contractListener');

dotenv.config()

app.post('/api/encrypt', authenticateToken, async(req, res) => {
    const { message } = req.body;
    
    if (!message) {
      res.status(400).json({ valid: false, message: 'No message provided.' });
    }
    const cipherText = CryptoJS.AES.encrypt(message, secret.toString()).toString();
    res.status(200).json({ valid: true, cipherText: cipherText });
})

app.get('/api/voter-profile/:wallet', authenticateToken, async (req, res) => {
      const wallet = req.params.wallet;
    
      try {
        const voterProfileSnapshot = await db.collection('Account')
          .where('ethereumAddress', '==', wallet.toLowerCase())
          .get();
    
        let voterProfileData;
        voterProfileSnapshot.forEach((doc) => {
          voterProfileData = doc.data();
        });

        // Only return faculty
        voterProfileData = {
          faculty: voterProfileData.faculty,
        }
    
        res.json(voterProfileData || {});
      } catch (error) {
        console.error(error);
        res.status(500).send('An error occurred while fetching voter profile.');
      }
});

app.get('/api/voted/:contractAddress/:wallet', authenticateToken, async (req, res) => {
    console.log('api/voted/:contractAddress/:wallet');
    const { contractAddress, wallet } = req.params;

    const contractOwner = contractAddressToOwnerObj[contractAddress.toLowerCase()].toLowerCase();
    
    try {
      const voterBallotSnapshot = await db
        .collection('Election')
        .doc(contractOwner.toLowerCase())
        .collection(contractAddress.toLowerCase())
        .doc('Ballot')
        .collection('Ballot')
        .doc(wallet)
        .get();
  
      if (voterBallotSnapshot.exists) {
        const voterBallotData = voterBallotSnapshot.data();
        const transactionHash = voterBallotData.transactionHash;
  
        res.json({
          hasVoted: true,
          transactionHash
        });
      } else {
        res.json({
          hasVoted: false
        });
      }
    } catch (error) {
      console.error(error);
      res.status(500).send('An error occurred while checking vote status.');
    }
});

app.get('/api/candidates/:contractAddress/:faculty', authenticateToken, async (req, res) => {
  console.log('api/candidates/:contractAddress/:faculty');
  const { contractAddress, faculty } = req.params;

  const contractOwner = contractAddressToOwnerObj[contractAddress.toLowerCase()].toLowerCase();
  console.log(`contractOwner: ${contractOwner} contractAddress: ${contractAddress}`)

  try {
    const facultyCandidatesSnapshot = await db
      .collection('Election')
      .doc(contractOwner)
      .collection(contractAddress)
      .doc('Candidates')
      .collection('Candidates')
      .where('name', '==', faculty)
      .get();

    let facultyCandidatesArray = [];
    facultyCandidatesSnapshot.forEach((doc) => {
      const data = doc.data();
      facultyCandidatesArray = data.candidates
    });

    // Omit the "vote_count" property from each candidate object
    const candidatesWithoutVoteCount = facultyCandidatesArray.map(candidate => {
      // Destructure the candidate object and omit the "vote_count" property
      const { vote_count, ...candidateWithoutVoteCount } = candidate;
      return candidateWithoutVoteCount;
    });
    

    res.json(candidatesWithoutVoteCount);
  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred while fetching candidates.');
  }
});
  
  
