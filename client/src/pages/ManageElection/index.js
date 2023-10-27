import React, { useContext, useEffect, useState, useCallback } from 'react'
import { useParams } from 'react-router';
import SideMenu from '../../components/SideMenu';
import LoadingComponent from '../../components/LoadingComponent';
import Breadcrumb from '../../components/Breadcrumb';
import personPlaceHolderImg from "../../assets/img-person-placeholder.jpg"
import { facultiesObj } from '../../constants/faculties';
import { endpointUrlPublic } from '../../constants/endpoint';
import Papa from 'papaparse';
import { Web3Context } from '../../provider/Web3Provider';
import { useErrorModal } from '../../provider/ErrorModalProvider';
import { formatDate, getTimeDifferenceInDaysHoursMinutes } from '../../utils/date';
import VotingContractABI from '../../constants/CampusElection.json'
import TransactionSubmittingLoadingModal from '../../components/TransactionSubmittingLoadingModal';
import TransactionApprovedModal from '../../components/TransactionApprovedModal';
import { shortenAddress } from '../../utils/address';
import ApprovedModal from '../../components/ApprovedModal';
import TimeWindowBar from '../../components/TimeWindowBar';

export default function ManageElection() {

    const { authToken, currentWallet, web3 } = useContext(Web3Context);

    const [isLoading, setIsLoading] = useState(false);
    const [electionDetails, setElectionDetails] = useState({});
    const [shouldUpdate, setShouldUpdate] = useState(false);
    const [candidates, setCandidates] = useState([]);
    const [voters, setVoters] = useState([]);
    const { contractAddress } = useParams();
    const { showError } = useErrorModal();
    const [isSubmittingTransaction, setIsSubmittingTransaction] = useState(false);
    const [transactionHashModal, setTransactionHashModal] = useState("");
    const [results, setResults] = useState([]);
    const [electionStatus, setElectionStatus] = useState(0);
    const [showModal, setShowModal] = useState(false);
    const [isUploadingCSV, setIsUploadingCSV] = useState(false);
    
    useEffect(() => {
        setIsLoading(true);
        const getElectionStatusFromContract = async () => {
            const votingContract = new web3.eth.Contract(VotingContractABI.abi, contractAddress);
            const registered = await votingContract.methods.getElectionStatus().call();
            setElectionStatus(registered);
        }

        const fetchElectionDetails = async () => {
            try {
                const response = await fetch(`${endpointUrlPublic}/api/admin/election-details/${currentWallet}/${contractAddress}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                        'Content-Type': 'application/json',
                    },
                });

                const data = await response.json();
                setElectionDetails(data);
            } catch (error) {
                showError('Failed to fetch user election instances');
            }
        }
        const fetchCandidates = async () => {
            try {
                const response = await fetch(`${endpointUrlPublic}/api/admin/candidates/${currentWallet}/${contractAddress}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                        'Content-Type': 'application/json',
                    },
                });

                const data = await response.json();
                setCandidates(data);
            } catch (error) {
                showError('Failed to fetch candidates');
            }
        }
        const fetchVoters = async () => {
            try {
                const response = await fetch(`${endpointUrlPublic}/api/admin/get-voters/${currentWallet}/${contractAddress}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                        'Content-Type': 'application/json',
                    },
                });

                const data = await response.json();
                setVoters(data);
            } catch (error) {
                showError('Failed to fetch candidates');
            }
        }

        const getElectionResultsFromDatabase = async() => {
            const res = await fetch(`${endpointUrlPublic}/api/admin/election-results/${currentWallet}/${contractAddress}`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
            const data = await res.json();
            (electionStatus == 2) && setResults(data);
        }

        const fetchData = async () => {
            await getElectionStatusFromContract()
            await Promise.all([fetchElectionDetails(), fetchCandidates(), fetchVoters(), getElectionResultsFromDatabase()])
            setIsLoading(false)
        }

        fetchData();
        
    }, [shouldUpdate]);

    const handleCSVUpload = async (file) => {
        setIsUploadingCSV(true);
        const text = await file.text();
        
        Papa.parse(text, {
            header: true,
            skipEmptyLines: true,
            complete: async function(results) {
                const candidates = results.data;
                const candidateList = [];
    
                for (const candidate of candidates) {
                    const { "Candidate Name": full_name, "Candidate Party": party, "Candidate Faculty": faculty, "Candidate Profile Image": googleDriveUrl} = candidate;
                    candidateList.push({full_name, party, faculty, googleDriveUrl});
                }
    
                try {
                    const body = {candidates: candidateList, contractOwner: currentWallet, contractAddress: contractAddress.toLowerCase()};
                    const response = await fetch(`${endpointUrlPublic}/api/admin/add-candidate`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${authToken}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(body)
                    });
    
                    
                    const { message } = await response.json();
                    if (!response.ok) {
                        throw new Error(message);
                    }
                    if (message == "Candidate added successfully.") {
                        setShowModal(true);
                    }
                } catch (error) {
                    console.error('Failed to upload candidates:', error);
                    setIsUploadingCSV(false);
                }
            }
        });
    }
    

    const handleCSVFileChange = (e) => {
        const file = e.target.files[0];
        handleCSVUpload(file)
    };

    const calculateTotalFee = (count) => {
        const fee = web3.utils.toWei("0.002", "ether");
        return parseInt(fee) * count;
    };

    const sendVotingFeeTransaction = useCallback((voters) => {
        const votingContract = new web3.eth.Contract(VotingContractABI.abi, contractAddress);
        setIsSubmittingTransaction(true);

        return votingContract.methods.registerVoterAndSendVotingFee(voters).send({
            from: currentWallet,
            value: calculateTotalFee(voters.length),
        })
        .on("error", (error) => {
          setIsSubmittingTransaction(false);
          throw error;
        })
        .then((receipt) => {
          setIsSubmittingTransaction(false);
          setTransactionHashModal(receipt.transactionHash);
          setTimeout(() => {
            setTransactionHashModal("");
            setShouldUpdate(prevState => !prevState);
            setIsLoading(true);
          }, 5000);
        });
    }, [voters, contractAddress, currentWallet, web3])

    const sendVotingFee = useCallback(async (voters) => {
        if (electionStatus == 2) {
            showError("Election has already ended");
            return
        }
        
        if (voters.length == 0) {
            showError("Voter is empty");            
            return;
        }

        try {
          await sendVotingFeeTransaction(voters);
        } catch (error) {
          showError("Failed to start election");
        }
    }, []);

    const handleCountVotes = useCallback(async () => {
        try {
          const response = await fetch(`${endpointUrlPublic}/api/admin/count-votes`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({contractAddress, contractOwner: currentWallet}),
          });
      
          if (!response.ok) {
            throw new Error('Failed to count votes.');
          }
      
          await response.json();
          setShouldUpdate(prevState => !prevState);
          setIsLoading(true);
        } catch (error) {
          showError("Failed to count votes");
        }
      }, [endpointUrlPublic, authToken, shouldUpdate, isLoading]);

      const handlePublishResult = useCallback(async () => {
        try {
            const response = await fetch(`${endpointUrlPublic}/api/admin/publish-result`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({contractAddress, contractOwner: currentWallet}),
            });

            if (!response.ok) {
                showError('Failed to publish result.');
            }
            await response.json();
            setShouldUpdate(prevState => !prevState);
            setIsLoading(true);
        } catch (error) {
            showError("Failed to publish result")
        }
    })

    const breadcrumbItems = [
        { text: "Election", link: "/" },
        { text: "My Elections", link: "/my-election" },
        { text: `${electionDetails.electionName} (${shortenAddress(contractAddress)})`, link: `/my-election/${contractAddress}` },
    ];

    const electionStatusTitle = ["Not Started", "Ongoing", "Ended"]

    return (
        <div className='flex h-screen flex-row'>
            <SideMenu />
            {
                isLoading && <LoadingComponent />
            }
            {
                !isLoading && <div className='flex flex-col m-4 w-full'>
                    {
                        isSubmittingTransaction && <TransactionSubmittingLoadingModal />
                    }
                    {
                        transactionHashModal && <TransactionApprovedModal transactionHash={transactionHashModal} />
                    }
                    {
                        showModal && <ApprovedModal 
                            title="Candidates uploaded" 
                            message="Candidates added successfully" 
                            onClose={() => {setShowModal(false); setIsUploadingCSV(false); setShouldUpdate(prevState => !prevState); setIsLoading(true);}}
                            />
                    }
                    <Breadcrumb items={breadcrumbItems} />
                    <div className="flex flex-col m-5 bg-white shadow-md rounded-lg">
                        <div className="p-5">
                            <p className="text-xl mb-3"><b>Election name: </b>{electionDetails.electionName}</p>
                            <p className="text-xl mb-3"><b>Start time: </b>{formatDate(new Date(electionDetails.electionStartTimestamp * 1000))} {electionStatus == 1 && `${getTimeDifferenceInDaysHoursMinutes(electionDetails.electionStartTimestamp)} ago`}</p>
                            <p className="text-xl mb-3"><b>End time: </b>{formatDate(new Date(electionDetails.electionEndTimestamp * 1000))} {electionStatus == 1 && `${getTimeDifferenceInDaysHoursMinutes(electionDetails.electionEndTimestamp)} remaining`}</p>
                            <div className="text-xl mb-3"><b>Status: </b>
                                <p className={"text-yellow-500 font-bold inline text-xl"}>{electionStatusTitle[electionStatus]}</p>
                            </div>
                            <p className="text-xl"><b>Vote turnout: </b>{electionDetails.totalVoteCount}</p>
                        </div>
                        {
                            electionStatus == 0 && 
                            <div className='p-5 pt-0 flex flex-row items-center'>
                                <label htmlFor="electionCandidates" className="font-medium text-gray-900 mr-4">Update Candidates:</label>
                                <input 
                                    type="file" 
                                    accept=".csv" 
                                    name="electionCandidates"
                                    onChange={handleCSVFileChange} />
                                {
                                    isUploadingCSV && <p className="text-sm text-slate-300">Uploading candidates...</p>
                                }
                            </div>
                        }
                        <div className='p-5 pt-0'>
                            {
                                !electionDetails.hasSentVotingFee &&
                                <button className="mr-2 px-5 py-2.5 font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg text-sm w-50" onClick={() => sendVotingFee(voters)}>Send Voting Fee</button>
                            }
                            {
                                electionStatus == 2 && !electionDetails.hasCountedResult &&
                                <button className="mr-2 px-5 py-2.5 font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg text-sm w-50" onClick={handleCountVotes}>Count Results</button>
                            }
                            {
                                electionStatus == 2 && !electionDetails.hasPublishedResult && electionDetails.hasCountedResult &&
                                <button className="px-5 py-2.5 font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg text-sm w-50" onClick={handlePublishResult}>Publish Results</button>
                            }
                        </div>
                    </div>
                    <div className="flex flex-col m-5 bg-white shadow-md rounded-lg">
                        <div className="p-5">
                            <p className="text-xl mb-3"><b>Candidates</b></p>
                        </div>
                        {
                            !electionDetails.hasCountedResult && 
                            <table className=" text-gray-700 table-auto mb-6 rounded-lg overflow-hidden shadow-md mx-4">
                                <thead className="text-md text-white uppercase bg-blue-700">
                                    <tr className="text-center">
                                        <th className="py-3 px-4 font-semibold text-sm"></th>
                                        <th className="py-3 px-4 font-semibold text-sm">Name</th>
                                        <th className="py-3 px-4 font-semibold text-sm">Faculty</th>
                                        <th className="py-3 px-4 font-semibold text-sm">Party</th>
                                        <th className="py-3 px-4 font-semibold text-sm">Code</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {candidates.map((candidate, index) => {
                                        return (
                                            <tr key={index} className={`border-b border-slate-200 ${index % 2 === 0 ? 'bg-slate-50' : 'bg-white'} hover:bg-blue-100 transition-colors duration-200 ease-in`}>
                                                <td className="py-3 px-4"><img className="w-[150px] h-[150px] object-cover rounded-lg"  src={candidate.profile_image_url ? candidate.profile_image_url : personPlaceHolderImg} alt="profile" /></td>
                                                <td className="py-3 px-4 text-center uppercase">{candidate.full_name}</td>
                                                <td className="py-3 px-4 text-center">{facultiesObj[candidate.faculty].name}</td>
                                                <td className="py-3 px-4 text-center">{candidate.party}</td>
                                                <td className="py-3 px-4 text-center">{candidate.code}</td>
                                            </tr>
                                        )
                                    })}
                                    {candidates.length === 0 && (
                                        <tr className="border-b border-gray-200 bg-white ">
                                            <td colSpan="7" className="py-6 text-center">No candidates registered yet</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        }
                        {
                            electionDetails.hasCountedResult && 
                            <table className="text-gray-700 table-auto flex-grow mb-6 rounded-lg overflow-hidden mx-4">
                                <thead className="text-md text-white uppercase bg-blue-700">
                                    <tr className="text-center">
                                    <th className="py-3 px-4 font-semibold text-sm"></th>
                                    <th className="py-3 px-4 font-semibold text-sm">Zone</th>
                                    <th className="py-3 px-4 font-semibold text-sm">Code</th>
                                    <th className="py-3 px-4 font-semibold text-sm">Name</th>
                                    <th className="py-3 px-4 font-semibold text-sm">Party</th>
                                    <th className="py-3 px-4 font-semibold text-sm">Vote Count</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {
                                    results.flatMap((faculty, index) => {
                                        return faculty.candidates.map((candidate, candidate_index) => {
                                        return (
                                            <tr key={index + "" + candidate_index} className={`border-b border-slate-200 ${index % 2 === 0 ? 'bg-slate-50' : 'bg-white'} hover:bg-blue-100 transition-colors duration-200 ease-in`}>
                                            <td className="py-3 px-4"><img className="w-[150px] h-[150px] object-cover rounded-lg"  src={candidate.profile_image_url ? candidate.profile_image_url : personPlaceHolderImg} alt="profile" /></td>
                                            <th scope="row" className="py-3 px-4 font-medium text-center">{facultiesObj[faculty.name].name}</th>
                                            <td className="py-3 px-4 text-center">{candidate.code}</td>
                                            <td className="py-3 px-4 text-center uppercase">{candidate.full_name}</td>
                                            <td className="py-3 px-4 text-center">{candidate.party}</td>
                                            <td className="py-3 px-4 text-center">{candidate.vote_count}</td>
                                            </tr>
                                        )
                                        })
                                    })
                                    }
                                </tbody>
                            </table>
                        }
                    </div>

                </div>
            }
        </div>
    )
}
