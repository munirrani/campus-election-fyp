const CampusElection = artifacts.require("CampusElection");
const assert = require('assert');
const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:7545"));


// TODO update unit tests with new contract methods

contract("CampusElection", accounts => {
  let contractInstance;
  const owner = accounts[0];
  const voters = [accounts[1], accounts[2], accounts[3]];
  const notRegisteredVoter = accounts[4];
  
  const sampleBallot = "U2FsdGVkX1/kP7yzTNFKAbJVgVXcy6FfJIEg9/hwPlo=";

  before(async () => {
    contractInstance = await CampusElection.new({from: owner});
  });

  it("should register voters", async () => {
    const estimatedFeePerVoter = web3.utils.toWei('0.002', 'ether');
    const totalFee = web3.utils.toBN(estimatedFeePerVoter).mul(web3.utils.toBN(voters.length));
    await contractInstance.storeRegisteredVoterAndSendFee(voters, {from: owner, value: totalFee});

    for (let i=0; i<voters.length; i++) {
      const isRegistered = await contractInstance.getRegistrationStatus({from: voters[i]});
      assert.equal(isRegistered, true, "Voter registration failed");
    }
  });

  it("should start the election", async () => {
    await contractInstance.startElection({from: owner});
    const status = await contractInstance.electionStatus();
    assert.equal(status, 1, "Election did not start correctly");
  });

  it("should store encrypted ballot", async () => {
    for (let i=0; i<voters.length; i++) {
      await contractInstance.storeEncryptedBallot(sampleBallot, {from: voters[i]});
      const isRegistered = await contractInstance.getRegistrationStatus({from: voters[i]});
      assert.equal(isRegistered, false, `Voter ${i+1} was not de-registered after voting`);
    }
  });

  it("should prevent unregistered voters from voting", async () => {
    try {
      await contractInstance.storeEncryptedBallot(sampleBallot, {from: notRegisteredVoter});
    } catch (error) {
      assert(error.message.indexOf('revert') >= 0, "Expected revert error, got '" + error + "' instead");
    }
  });

  it("should end the election", async () => {
    await contractInstance.stopElection("secretKeySample", {from: owner});
    const status = await contractInstance.electionStatus();
    assert.equal(status, 2, "Election did not end correctly");
  });

  it("should reset the election", async () => {
    await contractInstance.resetElection({from: owner});
    const totalVoteCount = await contractInstance.totalVoteCount();
    const status = await contractInstance.electionStatus();
    const encryptedBallotsSize = await contractInstance.getEncryptedBallotsCount();
    const voterAddressesSize = await contractInstance.getVoterAddressesCount();

    assert.equal(totalVoteCount, 0, "Vote count was not reset correctly");
    assert.equal(status, 0, "Election did not reset correctly");
    assert.equal(encryptedBallotsSize, 0, "Encrypted ballots were not reset correctly");
    assert.equal(voterAddressesSize, 0, "Voter addresses were not reset correctly")
  });
});
