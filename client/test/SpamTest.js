
const SpamTest = artifacts.require('SpamTest');

module.exports = async function(callback) {
  try {
    let contractAddress = '0x3748d286c218ad11a0b5751A6bB73F629bCf5FE1';
    let instance = await SpamTest.at(contractAddress);

    let sampleBallot = 'U2FsdGVkX1/kP7yzTNFKAbJVgVXcy6FfJIEg9/hwPlo=';

    let ownerAddress = '0x78203242133155Cad847957206Fc140b6B154E7b';
    
    const COUNT = 100;
    
    let startTime = new Date().getTime();
    
    // calling storeEncryptedBallot method COUNT times
    for (let i = 0; i < COUNT; i++) {
      let tx = await instance.storeEncryptedBallot(sampleBallot, {from: ownerAddress});
      console.log(`Transaction ${i+1} done: `, tx.tx);
    }
    
    let endTime = new Date().getTime();
    let timeDiff = endTime - startTime;
    let timeDiffSeconds = timeDiff / 1000;
    console.log(`Time taken to store ${COUNT} encrypted ballots: ${timeDiffSeconds} seconds`);
    
    callback();
  } catch (e) {
    console.error(e);
    callback(e);
  }
};
