const Web3 = require('web3');
const dotenv = require('dotenv');
const chains = require('../../constants/chains');
const CampusElectionABI = require('../../abi/CampusElection.json');
const CampusElectionFactoryABI = require('../../abi/CampusElectionFactory.json');

dotenv.config();

const CHAIN_SELECTION = process.env.CHAIN_SELECTION

const web3 = new Web3(new Web3.providers.WebsocketProvider(chains[CHAIN_SELECTION].websocketUrl, {
  timeout: 10000, // ms
  clientConfig: {
    keepalive: true,
    keepaliveInterval: 20000 // ms
  },
  reconnect: {
    auto: true,
    delay: 5000, // ms
    maxAttempts: 5,
    onTimeout: false
  }
}))

const contractAddress = chains[CHAIN_SELECTION].contractAddress
const factoryContractAddress = chains[CHAIN_SELECTION].factoryContractAddress
const factoryContract = new web3.eth.Contract(CampusElectionFactoryABI.abi, factoryContractAddress);

module.exports = {
  web3,
  factoryContract,
  contractAddress,
  factoryContractAddress
}
