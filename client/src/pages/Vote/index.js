import React, { useState, useEffect, useContext, useCallback } from 'react'
import { Web3Context } from '../../provider/Web3Provider';
import { facultiesObj } from '../../constants/faculties';
import personPlaceHolderImg from "../../assets/img-person-placeholder.jpg"
import { endpointUrlPublic } from '../../constants/endpoint';
import LoadingComponent from '../../components/LoadingComponent';
import TransactionSubmittingLoadingModal from '../../components/TransactionSubmittingLoadingModal';
import TransactionApprovedModal from '../../components/TransactionApprovedModal';
import WrongNetworkComponent from '../../components/WrongNetworkComponent';
import { useErrorModal } from '../../provider/ErrorModalProvider';
import { useParams } from 'react-router';
import CampusElectionABI from '../../constants/CampusElection.json';
import SideMenu from '../../components/SideMenu';
import Breadcrumb from '../../components/Breadcrumb';
import { shortenAddress } from '../../utils/address';
import { formatDateText, formatTimeRemaining } from '../../utils/date';

export default function Vote() {

  const { web3, currentWallet, onWrongNetwork, chain, authToken } = useContext(Web3Context);
  const { showError } = useErrorModal()  

  const [votingContract, setVotingContract] = useState(null);
  const [shouldUpdate, setShouldUpdate] = useState(false);
  const [electionInfo, setElectionInfo] = useState([{}]);
  const [facultyCandidates, setFacultyCandidates] = useState([]);
  const [selectedFacultyCandidate, setSelectedFacultyCandidate] = useState("");
  const [generalCandidates, setGeneralCandidates] = useState([]);
  const [selectedGeneralCandidate, setSelectedGeneralCandidate] = useState("");
  const [electionStatus, setElectionStatus] = useState(0);
  const [voterProfile, setVoterProfile] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [voterHasVoted, setVoterHasVoted] = useState(false);
  const [isSubmittingTransaction, setIsSubmittingTransaction] = useState(false);
  const [transactionHash, setTransactionHash] = useState("");
  const [transactionHashModal, setTransactionHashModal] = useState("");
  const { contractAddress } = useParams();
    
  const voteForCandidate = useCallback(async () => {
    if (!selectedFacultyCandidate || !selectedGeneralCandidate) {
      showError("Please select a candidate for both categories");
      return;
    }
  
    try {
      const encryptedData = await encryptVote(selectedFacultyCandidate, selectedGeneralCandidate);
      await submitVote(encryptedData);
    } catch (error) {
      showError("Failed to vote for candidate");
    }
  }, [selectedFacultyCandidate, selectedGeneralCandidate]);
  
  const encryptVote = async (facultyCandidate, generalCandidate) => {
    const message = `${facultyCandidate},${generalCandidate}`;
  
    const url = `${endpointUrlPublic}/api/encrypt`;
    const data = {
      message: message,
    };
  
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${authToken}`
      },
      body: JSON.stringify(data),
    });
  
    if (response.ok) {
      const json = await response.json();
      return json.cipherText;
    } else {
      throw new Error('Encryption failed');
    }
  };
  
  const submitVote = async (encryptedData) => {
    setIsSubmittingTransaction(true);
  
    const gasPrice = await web3.eth.getGasPrice();
    const gasLimit = await votingContract.methods.storeEncryptedBallot(encryptedData).estimateGas({
      from: currentWallet,
    });
  
    return votingContract.methods.storeEncryptedBallot(encryptedData).send({
      from: currentWallet,
      gasPrice: gasPrice,
      gasLimit: gasLimit
    })
    .on("error", (error) => {
      setIsSubmittingTransaction(false);
      throw error;
    })
    .then((result) => {
      setIsSubmittingTransaction(false);
      setTransactionHashModal(result.transactionHash);
      setTimeout(() => {
        setTransactionHashModal("");
        setShouldUpdate(prevState => !prevState);
        setVoterHasVoted(true);
        setIsLoading(true);
      }, 5000);
    });
  };  

  useEffect(() => {
    const fetchData = async () => {

      const votingContract = new web3.eth.Contract(CampusElectionABI.abi, contractAddress);
      setVotingContract(votingContract);
      try {
        const electionStatus = await votingContract.methods.getElectionStatus().call();
        setElectionStatus(electionStatus);

        if (electionStatus == 1) {
          const voterProfileRes = await fetch(`${endpointUrlPublic}/api/voter-profile/${currentWallet}`, {
            headers: {
              "Authorization": `Bearer ${authToken}`,
            },
          });
          const voterProfileData = await voterProfileRes.json();
          setVoterProfile(voterProfileData);

          const voterVotedRes = await fetch(`${endpointUrlPublic}/api/voted/${contractAddress.toLowerCase()}/${currentWallet}`, {
            headers: {
              "Authorization": `Bearer ${authToken}`,
            },
          });
          const voterVotedData = await voterVotedRes.json();
          setVoterHasVoted(voterVotedData.hasVoted);
          setTransactionHash(voterVotedData.transactionHash);

          const electionInfoRes = await fetch(`${endpointUrlPublic}/api/election-info/${contractAddress.toLowerCase()}`, {
            headers: {
              "Authorization": `Bearer ${authToken}`,
            },
          });
          const electionInfoData = await electionInfoRes.json();
          setElectionInfo(electionInfoData);

          if (!voterVotedData.hasVoted && voterProfileData) {

            const facultyCandidatesRes = await fetch(`${endpointUrlPublic}/api/candidates/${contractAddress.toLowerCase()}/${voterProfileData.faculty}`, {
              headers: {
                "Authorization": `Bearer ${authToken}`,
              },
            });
            const facultyCandidatesData = await facultyCandidatesRes.json();
            setFacultyCandidates(facultyCandidatesData);

            const generalCandidatesRes = await fetch(`${endpointUrlPublic}/api/candidates/${contractAddress.toLowerCase()}/` + "gen", {
              headers: {
                "Authorization": `Bearer ${authToken}`,
              },
            });
            const generalCandidatesData = await generalCandidatesRes.json();
            setGeneralCandidates(generalCandidatesData);
          }
        }
      } catch (error) {
        showError("Failed to fetch election data")
      }
      setIsLoading(false);
    };

    if (currentWallet) {
      fetchData();
    }

  }, [currentWallet, shouldUpdate]);

  const breadcrumbItems = [
    { text: "Election", link: "/" },
    { text: `${electionInfo.electionName} (${shortenAddress(contractAddress)})`, link: `/election/${contractAddress}` },
  ];

  if (isLoading) {
    return <LoadingComponent />
  } else if (onWrongNetwork) {
    return <WrongNetworkComponent />
  }
  
  return (
    <div className='flex h-screen flex-row'>
      <SideMenu />
      {
          isLoading && <LoadingComponent />
      }
      {
        !isLoading && <div className='w-full m-4'>
          <Breadcrumb items={breadcrumbItems} />
          {
            isSubmittingTransaction && <TransactionSubmittingLoadingModal />
          }
          {
            transactionHashModal && <TransactionApprovedModal transactionHash={transactionHashModal} />
          }
          <div className="flex flex-col m-5 bg-white shadow-md rounded-lg">
              {
                electionStatus == 0 &&
                  <div className="p-5 bg-blue-50 rounded-lg border-blue-200 border m-5">
                    <p className="text-lg font-medium"> 
                        Election session is not yet open.
                    </p>
                  </div>
              }

              {
                voterHasVoted && (
                  <div className="p-5 bg-blue-50 rounded-lg border-blue-200 border m-5">
                    <p className="text-lg font-medium">
                      You have voted. Verify your transaction <a href={`${chain.explorerUrl}/tx/${transactionHash}`} target="_blank" rel="noreferrer" className="text-blue-700 underline underline-offset-1">here</a>.
                    </p>
                  </div>
                )
              }

              {
                electionStatus == 1 && !voterHasVoted &&
                <div className="p-5 bg-blue-50 rounded-lg border-blue-200 border m-5">
                    <p className="text-lg font-medium mb-2">
                      Election started at: <span className="text-blue-700">{formatDateText(new Date(electionInfo.electionStartTimestamp*1000))}</span>
                    </p>
                    <p className="text-lg font-medium">
                      Time remaining to vote: <span className="text-blue-700">{formatTimeRemaining(electionInfo.electionEndTimestamp)}</span>
                    </p>
                </div>
              }

          </div>
          
          { electionStatus == 1 && !voterHasVoted && (
            <div className="flex flex-col m-5 bg-white shadow-md rounded-lg">

              <div className="flex flex-col m-4">
                <h1 className="font-medium text-lg mb-4 ">Faculty Zone ({voterProfile && facultiesObj[voterProfile.faculty].name})</h1>
                <div className="mb-6 flex flex-col overflow-x-auto">
                  <table className="w-full table-auto flex-grow mb-6 rounded-lg overflow-hidden shadow-md bg-blue-700">
                    <thead className="text-md uppercase text-white">
                      <tr className="text-center">
                        <th className="py-3 px-4 font-semibold text-sm"></th>
                        <th className="py-3 px-4 font-semibold text-sm">Name</th>
                        <th className="py-3 px-4 font-semibold text-sm">Party</th>
                        <th className="py-3 px-4 font-semibold text-sm">Code</th>
                        <th className="py-3 px-4 font-semibold text-sm">Select</th>
                      </tr>
                    </thead>
                    <tbody>
                      {facultyCandidates.map((candidate, index) => {
                        return (
                          <tr key={index} className={`border-b border-slate-200 ${index % 2 === 0 ? 'bg-slate-50' : 'bg-white'} hover:bg-blue-100 transition-colors duration-200 ease-in`}>
                            <td className="py-3 px-4"><img className="w-[150px] h-[150px] object-cover rounded-lg"  src={candidate.profile_image_url ? candidate.profile_image_url : personPlaceHolderImg} alt="profile" /></td>
                            <td className="py-3 px-4 text-center uppercase">{candidate.full_name}</td>
                            <td className="py-3 px-4 text-center">{candidate.party}</td>
                            <td className="py-3 px-4 text-center">{candidate.code}</td>
                            <td className="py-3 px-4 text-center">
                              <input 
                                type="radio" 
                                name="facultyCandidateSelection" 
                                id={candidate.code} 
                                value={candidate.code}
                                checked={selectedFacultyCandidate === candidate.code} 
                                onChange={(e) => setSelectedFacultyCandidate(e.target.value)} />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              
                <h1 className="font-medium text-lg mb-4">General Zone</h1>
                <div className="mb-6 flex flex-col overflow-x-auto">
                  <table className="w-full table-auto flex-grow mb-6 rounded-lg overflow-hidden shadow-md bg-blue-700">
                    <thead className="text-md uppercase text-white">
                      <tr className="text-center">
                        <th className="py-3 px-4 font-semibold text-sm"></th>
                        <th className="py-3 px-4 font-semibold text-sm">Name</th>
                        <th className="py-3 px-4 font-semibold text-sm">Party</th>
                        <th className="py-3 px-4 font-semibold text-sm">Code</th>
                        <th className="py-3 px-4 font-semibold text-sm">Select</th>
                      </tr>
                    </thead>
                    <tbody>
                      {generalCandidates.map((candidate, index) => {
                        return (
                          <tr key={index} className={`border-b border-slate-200 ${index % 2 === 0 ? 'bg-slate-50' : 'bg-white'} hover:bg-blue-100 transition-colors duration-200 ease-in`}>
                            <td className="py-3 px-4"><img className="w-[150px] h-[150px] object-cover rounded-lg"  src={candidate.profile_image_url ? candidate.profile_image_url : personPlaceHolderImg} alt="profile" /></td>
                            <td className="py-3 px-4 text-center uppercase">{candidate.full_name}</td>
                            <td className="py-3 px-4 text-center">{candidate.party}</td>
                            <td className="py-3 px-4 text-center">{candidate.code}</td>
                            <td className="py-3 px-4 text-center">
                              <input 
                                type="radio" 
                                name="generalCandidateSelection" 
                                id={candidate.code} 
                                value={candidate.code}
                                checked={selectedGeneralCandidate === candidate.code} 
                                onChange={(e) => setSelectedGeneralCandidate(e.target.value)} />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                <button className='max-w-[250px] self-center bg-blue-700 hover:bg-blue-800 text-white font-medium px-4 py-2 rounded' onClick={voteForCandidate}>Vote for Candidate</button>
              
              </div>
            </div>
          )}
        </div>
      }

      </div>
    );
}
