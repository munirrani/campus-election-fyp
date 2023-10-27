const CampusElectionABI = require('../abi/CampusElection.json');
const CampusElectionFactoryABI = require('../abi/CampusElectionFactory.json');

const chains = [
    {
      chainName: "Polygon zkEVM Testnet",
      //contractAddress: CampusElectionABI.networks["1442"].address,
      factoryContractAddress: CampusElectionFactoryABI.networks["1442"].address,
      websocketUrl: ""
      chainId: 1442,
      currencySymbol: "ETH",
      rpcUrl: "https://polygon-zkevm-testnet.rpc.thirdweb.com",
      explorerUrl: "https://testnet-zkevm.polygonscan.com"
    },
    {
      chainName: "Milkomeda C1 Testnet",
      //contractAddress: CampusElectionABI.networks["200101"].address,
      factoryContractAddress: CampusElectionFactoryABI.networks["200101"].address,
      websocketUrl: "wss://rpc-devnet-cardano-evm.c1.milkomeda.com",
      chainId: 200101,
      currencySymbol: "mTADA",
      rpcUrl: "https://rpc-devnet-cardano-evm.c1.milkomeda.com",
      explorerUrl: "https://explorer-devnet-cardano-evm.c1.milkomeda.com"
    }
]

module.exports = chains