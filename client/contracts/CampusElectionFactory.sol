// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

contract CampusElectionFactory {
    mapping(address => address[]) public ownerToContractInstances;

    event ContractInstantiated(
        address indexed contractOwner,
        address contractAddress,
        string electionName,
        uint256 electionStartTimestamp,
        uint256 electionEndTimestamp
    );

    function createInstance(
        string memory electionName,
        uint256 electionStartTimestamp,
        uint256 electionEndTimestamp
    ) public {
        uint nameLength = bytes(electionName).length;
        require(nameLength > 0 && nameLength <= 100, "Election name is empty");
        require(
            electionStartTimestamp > block.timestamp,
            "Start time is invalid"
        );
        require(electionEndTimestamp > block.timestamp, "End time is invalid");
        require(
            electionEndTimestamp > electionStartTimestamp,
            "End time is invalid"
        );
        address newContract = address(
            new CampusElection(
                electionName,
                electionStartTimestamp,
                electionEndTimestamp,
                msg.sender
            )
        );
        address contractOwner = msg.sender;
        ownerToContractInstances[contractOwner].push(newContract);
        emit ContractInstantiated(
            contractOwner,
            newContract,
            electionName,
            electionStartTimestamp,
            electionEndTimestamp
        );
    }

    function getContractInstances() public view returns (address[] memory) {
        return ownerToContractInstances[msg.sender];
    }
}

contract CampusElection {
    address public owner;
    mapping(address => bool) private registeredVoter;

    string public electionName;
    uint256 public electionStartTimestamp;
    uint256 public electionEndTimestamp;
    uint256 public totalVoteCount;
    string[] public encryptedBallots;
    address[] private voterAddresses;

    event encryptedVoteCasted(address sender, string ballot);
    event votingFeeSent();

    constructor(
        string memory _electionName,
        uint256 _electionStartTimestamp,
        uint256 _electionEndTimestamp,
        address _owner
    ) {
        uint nameLength = bytes(_electionName).length;
        require(nameLength > 0 && nameLength <= 100, "Election name is empty");
        require(
            _electionStartTimestamp > block.timestamp,
            "Start time is invalid"
        );
        require(_electionEndTimestamp > block.timestamp, "End time is invalid");
        require(
            _electionEndTimestamp > _electionStartTimestamp,
            "End time is invalid"
        );
        electionName = _electionName;
        electionStartTimestamp = _electionStartTimestamp;
        electionEndTimestamp = _electionEndTimestamp;
        owner = _owner;
        totalVoteCount = 0;
    }

    function getRegistrationStatus() public view returns (bool) {
        return registeredVoter[msg.sender];
    }

    function getEncryptedBallotsCount() public view returns (uint) {
        return encryptedBallots.length;
    }

    function getVoterAddressesCount() public view returns (uint) {
        return voterAddresses.length;
    }

    function getElectionStatus() public view returns (uint) {
        if (electionStartTimestamp > block.timestamp) {
            return 0;
        } else if (
            electionStartTimestamp <= block.timestamp &&
            electionEndTimestamp >= block.timestamp
        ) {
            return 1;
        } else {
            return 2;
        }
    }

    function registerVoterAndSendVotingFee(
        address[] memory _addresses
    ) public payable {
        uint estimatedFeePerVoter = 2000000 gwei; // 0.002 ETH
        require(msg.sender == owner, "You are not the contract owner");
        uint256 totalVoters = _addresses.length;
        require(totalVoters > 0, "Addresses cannot be empty");
        uint256 feeAmount = msg.value;
        require(
            feeAmount >= estimatedFeePerVoter * totalVoters,
            "Amount is not enough to pay fee for all voters"
        );
        for (uint256 i = 0; i < totalVoters; i++) {
            registeredVoter[_addresses[i]] = true;
            voterAddresses.push(_addresses[i]);
            payable(_addresses[i]).transfer(estimatedFeePerVoter);
        }
        emit votingFeeSent();
    }

    function storeEncryptedBallot(string memory ballot) public {
        require(
            block.timestamp >= electionStartTimestamp &&
                block.timestamp <= electionEndTimestamp,
            "Outside election timeframe"
        );
        require(msg.sender != owner, "You are the contract owner");
        require(registeredVoter[msg.sender], "You are not registered to vote");
        require(bytes(ballot).length <= 100, "Ballot is too long");
        require(bytes(ballot).length > 0, "Ballot is empty");

        registeredVoter[msg.sender] = false; // de-register voter from this contract
        encryptedBallots.push(ballot);
        totalVoteCount++;
        emit encryptedVoteCasted(msg.sender, ballot);
    }

    function resetElection() public {
        require(msg.sender == owner, "You are not the contract owner");
        totalVoteCount = 0;

        for (uint256 i = 0; i < voterAddresses.length; i++) {
            registeredVoter[voterAddresses[i]] = false;
        }

        for (uint256 i = 0; i < encryptedBallots.length; i++) {
            delete encryptedBallots[i];
        }

        for (uint256 i = 0; i < voterAddresses.length; i++) {
            delete voterAddresses[i];
        }

        encryptedBallots = new string[](0);
        voterAddresses = new address[](0);
    }
}
