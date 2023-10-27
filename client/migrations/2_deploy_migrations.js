// Help Truffle find `TruffleTutorial.sol` in the `/contracts` directory
const CampusElectionFactory = artifacts.require("CampusElectionFactory");

module.exports = function(deployer) {
  deployer.deploy(CampusElectionFactory)
};