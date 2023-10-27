// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

contract SpamTest {
    address private owner;
    uint256 public totalVoteCount;
    string[] public encryptedBallots;

    constructor() {
        owner = msg.sender;
        totalVoteCount = 0;
    }

    function storeEncryptedBallot(string memory ballot) public {
        require(msg.sender == owner, "You are not the contract owner");
        require(bytes(ballot).length <= 100, "Ballot is too long");
        require(bytes(ballot).length > 0, "Ballot is empty");

        encryptedBallots.push(ballot);
        totalVoteCount++;
    }
}
