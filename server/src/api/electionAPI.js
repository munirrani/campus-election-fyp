const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const app = require('../server/express-server');
const { db } = require('../../db');
const { authenticateToken } = require('../server/authentication');
const { contractAddressToOwnerObj } = require('../web3/contractListener');

dotenv.config();

// TODO - Call authentication function for all API endpoints

app.get('/api/election-details', authenticateToken, async (req, res) => {
      const snapshot = await db.collection('Admin').where('electionResultsCounted', '==', true).get();
    
      if (snapshot.empty) {
        res.json([]);
        return;
      }
    
      const doc = snapshot.docs[0];
      res.json(doc.data());
  });

const fetchContractAddressesFromDatabase = async () => {
  var contractAddresses = [];
  const snapshot = await db.collection("Contract").get();
  const doc = snapshot.docs[0];
  const array = doc.data().contracts;
  contractAddresses = [...array];
  return contractAddresses;
};

app.get('/api/election-of-user/:walletAddress', authenticateToken, async (req, res) => {

  console.log("/api/election-of-user/:walletAddress called")

  const walletAddress = req.params.walletAddress;

  try { 
    var contracts = await fetchContractAddressesFromDatabase();
    contracts = contracts.filter(contract => contract.ownerAddress.toString().toLowerCase() == walletAddress.toLowerCase())
    const result = []
    for (const contract of contracts) {
      const data = await fetchContractData(contract.ownerAddress, contract.contractAddress);
      const { electionCommitteeSecret, hasSentVotingFee, totalRegisteredVoters, hasCountedResult, ...rest } = data;
      const dataObj = {
        ...rest,
        contractAddress: contract.contractAddress,
        ownerAddress: contract.ownerAddress,
      }
      result.push(dataObj)
    }

    res.json(result);
  } catch(error) {
    console.log(error);
  }
});

const fetchContractData = async (ownerAddress, contractAddress) => {

  try {
      const subcollectionRef = await db
        .collection('Election')
        .doc(ownerAddress)
        .collection(contractAddress)
        .doc('Admin')
        .get()

      const data = subcollectionRef.data();
      return data;
  } catch(error) {
      console.log(error);
  }
}

app.get('/api/elections/', authenticateToken, async (req, res) => {

  console.log("/api/elections/")

  try { 
    const contracts = await fetchContractAddressesFromDatabase();
    const result = []
    for (const contract of contracts) {
      const data = await fetchContractData(contract.ownerAddress, contract.contractAddress);
      const { electionCommitteeSecret, hasSentVotingFee, totalRegisteredVoters, ...rest } = data;
      const dataObj = {
        ...rest,
        contractAddress: contract.contractAddress,
        ownerAddress: contract.ownerAddress,
      }
      result.push(dataObj)
    }

    console.log(JSON.stringify(result))

    res.json(result);
  } catch(error) {
    console.log(error);
  }
});

app.get('/api/election-info/:contractAddress', authenticateToken, async (req, res) => {
  const { contractAddress } = req.params;

  console.log("/api/election-info/:contractAddress")

  try { 
    const ownerAddress = contractAddressToOwnerObj[contractAddress.toLowerCase()].toLowerCase();
    const data = await fetchContractData(ownerAddress, contractAddress.toLowerCase());
    const { electionCommitteeSecret, hasSentVotingFee, totalRegisteredVoters, hasCountedResult, hasPublishedResult, ...rest } = data;
    res.json(rest);
  } catch(error) {
    console.log(error);
  }
});

app.get('/api/election-result/:contractAddress', authenticateToken, async (req, res) => {
  const { contractAddress } = req.params;

  console.log("/api/election-info/:contractAddress")

  try { 
    const ownerAddress = contractAddressToOwnerObj[contractAddress.toLowerCase()].toLowerCase();
    const electionData = await fetchContractData(ownerAddress, contractAddress.toLowerCase());
    if (!electionData.hasPublishedResult) {
      res.json([]);
      return;
    }
    const { hasSentVotingFee, ...rest } = electionData;

    // Fetch candidate data
    const candidatesSnapshot = await db
      .collection('Election')
      .doc(ownerAddress.toLowerCase())
      .collection(contractAddress.toLowerCase())
      .doc('Candidates')
      .collection('Candidates')
      .get();
    
      let candidates = candidatesSnapshot.docs.map(doc => doc.data());
    
    for (const f in candidates) {
        candidates[f].candidates.sort((a, b) => (a.vote_count < b.vote_count) ? 1 : -1);
    }

    res.json({
      electionData: rest,
      candidates: candidates,
    });

  } catch(error) {
    console.log(error);
  }
})