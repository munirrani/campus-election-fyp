const { factoryContract, factoryContractAddress, web3 } = require('./web3');
const dotenv = require('dotenv');
const { db } = require('../../db');
const { secret } = require('../cryptography/cryptography');
const CampusElectionABI = require('../../abi/CampusElection.json');
const admin = require('firebase-admin');

dotenv.config();

const handledTransactions = new Set();

var contracts = [

];

const putContractAddressInDatabase = async (contracts) => {
  const docRef = db.collection('Contract').doc("Address");
  await docRef.set({
    contracts: contracts,
  });
}

const fetchContractAddressesFromDatabase = async () => {
  var contractAddresses = [];
  const snapshot = await db.collection("Contract").get();
  if (!snapshot.empty) {
    const doc = snapshot.docs[0];
    const array = doc.data().contracts;
    contractAddresses = [...array];
  }
  return contractAddresses;
};

const contractAddressToOwnerObj = {
}

const handleVotingFeeSent = async (event) => {
  console.log('handleVotingFeeSent');
  const contractAddress = event.address;
  const ownerAddress = contractAddressToOwnerObj[contractAddress.toLowerCase()].toLowerCase();
  await db
    .collection('Election')
    .doc(ownerAddress.toLowerCase())
    .collection(contractAddress.toLowerCase())
    .doc('Admin').update({
      hasSentVotingFee: true,
  });
}

const handleEncryptedVoteCasted = async (event) => {
  console.log('handleEncryptedVoteCasted');
  const contractAddress = event.address;
  const ownerAddress = contractAddressToOwnerObj[contractAddress.toLowerCase()].toLowerCase();
  const { ballot, sender } = event.returnValues;
  console.log(`Detected new encrypted vote casted by ${sender} with ballot ${ballot} contractAddress ${contractAddress} ownerAddress ${ownerAddress}`)
  await db
    .collection('Election')
    .doc(ownerAddress.toLowerCase())
    .collection(contractAddress.toLowerCase())
    .doc('Ballot')
    .collection('Ballot')
    .doc(sender.toLowerCase())
    .set({
      hasCounted: false,
      ballot: ballot,
      transactionHash: event.transactionHash,
  });

  await db
    .collection('Election')
    .doc(ownerAddress.toLowerCase())
    .collection(contractAddress.toLowerCase())
    .doc('Admin').update({
      totalVoteCount: admin.firestore.FieldValue.increment(1),
  });
}

const handleContractInstantiated = async (event) => {
  const { contractOwner, contractAddress, electionName, electionStartTimestamp, electionEndTimestamp } = event.returnValues;
  console.log(`Detected new contract: ${contractAddress} by ${contractOwner} name ${electionName} start time ${electionStartTimestamp} end time ${electionEndTimestamp}`)

  // Reference to 'contractOwner' document in 'Election' collection
  const contractOwnerDoc = db.collection('Election').doc(contractOwner.toLowerCase());
  await contractOwnerDoc.set({empty:""});

  // Put electionContract in 'contractOwner' document 
  const electionContract = contractOwnerDoc.collection(contractAddress.toLowerCase());
  const adminDoc = electionContract.doc('Admin');

  // Add a document to the nested collection
  await adminDoc.set({
    electionCommitteeSecret: secret,
    electionEndTimestamp: parseInt(electionEndTimestamp),
    electionName: electionName,
    electionStartTimestamp: parseInt(electionStartTimestamp),
    totalRegisteredVoters: 0,
    totalVoteCount: 0,
    hasCountedResult: false,
    hasPublishedResult: false,
    hasSentVotingFee: false,
  })
  console.log("Document Admin successfully added");
  
  const candidatesDoc = electionContract.doc('Candidates');
  await candidatesDoc.set({empty:""});
  console.log("Document Candidates successfully added");
  
  const ballotDoc = electionContract.doc('Ballot');
  await ballotDoc.set({empty:""});
  console.log("Document Ballot successfully added");

  addNewContract(contractOwner, contractAddress);
}

const electionContractEventHandlers = {
  'encryptedVoteCasted': handleEncryptedVoteCasted,
  'votingFeeSent': handleVotingFeeSent,
}

const listenToContractEvents = async (votingContractAddress, votingContractInstance) => {
  votingContractInstance.events.allEvents(async (error, eventData) => {
    if (error) {
      console.error('Error:', error);
      return;
    }

    if (handledTransactions.has(eventData.transactionHash)) return;
    handledTransactions.add(eventData.transactionHash);

    if (electionContractEventHandlers[eventData.event]) {
      try {
        await electionContractEventHandlers[eventData.event](eventData);
      } catch (error) {
        console.log(error);
      }
    }
  })
  .on('connected', (subscriptionId) => {
    console.log('Subscribed. Listening to election contract ', votingContractAddress, 'with subscription ID:', subscriptionId);
  })
  .on('changed', (event) => {
    console.log('Event changed:', event.returnValues);
  })
  .on('error', (error) => {
    console.error('Subscription error:', error);
  });
}

const factoryContractEventHandlers = {
  'ContractInstantiated': handleContractInstantiated,
}

const listenToFactoryContractEvents = async () => {
  factoryContract.events.allEvents(async (error, eventData) => {
    if (error) {
      console.error('Error:', error);
      return;
    }

    if (handledTransactions.has(eventData.transactionHash)) return;
    handledTransactions.add(eventData.transactionHash);

    if (factoryContractEventHandlers[eventData.event]) {
      try {
        await factoryContractEventHandlers[eventData.event](eventData);
      } catch (error) {
        console.log(error);
      }
    }
  })
  .on('connected', (subscriptionId) => {
    console.log('Subscribed. Listening to factory contract', factoryContractAddress, 'with subscription ID:', subscriptionId);
  })
  .on('changed', (event) => {
    console.log('Event changed:', event.returnValues);
  })
  .on('error', (error) => {
    console.error('Subscription error:', error);
  })
}

const activeContracts = {}

const addNewContract = (contractOwner, contractAddress) => {
  console.log(`Adding new address ${contractAddress}`)
  contracts.push({
    contractAddress: contractAddress.toLowerCase(),
    ownerAddress: contractOwner.toLowerCase(),
  })
  contractAddressToOwnerObj[contractAddress.toLowerCase()] = contractOwner;
  const contractInstance = new web3.eth.Contract(CampusElectionABI.abi, contractAddress);
  activeContracts[contractAddress] = contractInstance
  listenToContractEvents(contractAddress, contractInstance)
  putContractAddressInDatabase(contracts);
}

const start = async() => {
  contracts = await fetchContractAddressesFromDatabase();
  for (const contract of contracts) {
    contractAddressToOwnerObj[contract.contractAddress] = contract.ownerAddress;
  }

  var contractsToListenTo = [...contracts]
  contractsToListenTo = contractsToListenTo.map(contract => contract.contractAddress)
  console.log(`Amount of election contracts: ${contractsToListenTo.length}`)
  contractsToListenTo.forEach(async (votingContractAddress) => {
    const votingContractInstance = new web3.eth.Contract(CampusElectionABI.abi, votingContractAddress);
    activeContracts[votingContractAddress] = votingContractInstance;
    listenToContractEvents(votingContractAddress, votingContractInstance);
  });
  
  listenToFactoryContractEvents();
}

start();

module.exports = {
  activeContracts,
  contractAddressToOwnerObj
}