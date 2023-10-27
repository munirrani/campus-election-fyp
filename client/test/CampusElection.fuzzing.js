const CampusElection = artifacts.require("CampusElection");

contract("CampusElection", (accounts) => {
    let contractInstance;
    
    let ownerIndex = Math.floor(Math.random() * accounts.length);
    let owner = accounts[ownerIndex];

    let errorCount = 0;
    let randomTestRuns = 4000;

    before(async () => {
        contractInstance = await CampusElection.new({from: owner});
    })

    const min = 0;
    const max = 10000000000000000;    

    console.log("Owner: " + owner)

    function getRandomInput() {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
        const size = Math.floor(Math.random() * 1001);
        let result = '';
      
        for (let i = 0; i < size; i++) {
          const randomIndex = Math.floor(Math.random() * characters.length);
          result += characters[randomIndex];
        }
      
        return result;
      }
      
    // TODO update fuzzing with new contract methods
    
    async function test () {
        console.log("Running " + randomTestRuns + " random tests...")
        for(let i = 0; i < randomTestRuns; i++) {
            let randomAddressIndex = Math.floor(Math.random() * accounts.length);
            let randomAddress = accounts[randomAddressIndex];
            let randomEthValue = Math.floor(Math.random() * (max - min + 1)) + min;
            
            let randomNumOfVoters = Math.floor(Math.random() * accounts.length);
            let randomVoters = accounts.slice(0, randomNumOfVoters);

            let randomFunc = Math.floor(Math.random() * 5);
            const randomFuncNames = ["storeRegisteredVoterAndSendFee()", "startElection()", "stopElection()", "storeEncryptedBallot()", "reset()"]

            const randomInput = getRandomInput()
            try {
    
                switch(randomFunc) {
                    case 0:
                        await contractInstance.storeRegisteredVoterAndSendFee(randomVoters, {from: randomAddress, value: randomEthValue});
                        break;
                    case 1:
                        await contractInstance.startElection({from: randomAddress});
                        break;
                    case 2:
                        await contractInstance.stopElection(randomInput, {from: randomAddress});
                        break;
                    case 3:
                        await contractInstance.storeEncryptedBallot(randomInput, {from: randomAddress});
                        break;
                    case 4:
                        await contractInstance.resetElection({from: randomAddress});
                        break;
                }
                // const addressToShow = randomAddress == owner ? "owner" : randomAddress;
                // if (randomFunc == 2 || randomFunc == 3) {
                //      // Has random input passed in
                //     console.log("Iteration", i+1,"success: Calling function " + randomFuncNames[randomFunc] + " with wei value " + randomEthValue + " by " + addressToShow + " with randomInput " + randomInput + " succeeded." + "\n")
                // } else if (randomFunc == 0) {
                //     // Has random voters passed in
                //     console.log("Iteration", i+1,"success: Calling function " + randomFuncNames[randomFunc] + " with wei value " + randomEthValue + " by " + addressToShow + " with randomVoters [" + randomVoters.toString() + "] succeeded." + "\n")
                // } else {
                //     console.log("Iteration", i+1,"success: Calling function " + randomFuncNames[randomFunc] + " with wei value " + randomEthValue + " by " + addressToShow + " succeeded." + "\n")
                // }
            } catch (error) {
                // const addressToShow = randomAddress == owner ? "owner" : randomAddress;
                // if (randomFunc == 2 || randomFunc == 3) {
                //     // Has random input passed in
                //     console.log("Iteration", i+1,"error catch: Calling function " + randomFuncNames[randomFunc] + " with wei value " + randomEthValue + " by " + addressToShow + " with randomInput " + randomInput + " failed." + "\n")
                // } else if (randomFunc == 0) {
                //     // Has random voters passed in 
                //     console.log("Iteration", i+1,"error catch: Calling function " + randomFuncNames[randomFunc] + " with wei value " + randomEthValue + " by " + addressToShow + " with randomVoters [" + randomVoters.toString() + "] failed." + "\n")
                // } else {
                //     console.log("Iteration", i+1,"error catch: Calling function " + randomFuncNames[randomFunc] + " with wei value " + randomEthValue + " by " + addressToShow + " failed." + "\n")
                // }
                errorCount++;
            }
        }
    }

    it("should run random tests", async () => {
        await test();
        console.log("Total errors: " + errorCount)
        console.log("Total non-errors: " + (randomTestRuns - errorCount))
    })
});
