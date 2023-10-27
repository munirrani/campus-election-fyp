import React, { useContext, useEffect, useState } from 'react'
import LoadingComponent from '../../components/LoadingComponent';
import personPlaceHolderImg from "../../assets/img-person-placeholder.jpg"
import { Web3Context } from '../../provider/Web3Provider';
import { endpointUrlPublic } from '../../constants/endpoint';
import { facultiesObj } from '../../constants/faculties';
import { useErrorModal } from '../../provider/ErrorModalProvider';
import { useParams } from 'react-router';
import Breadcrumb from '../../components/Breadcrumb';
import { shortenAddress } from '../../utils/address';
import SideMenu from '../../components/SideMenu';
import { formatDate, formatDateText } from '../../utils/date';
import { FiCopy } from "react-icons/fi";

export default function ElectionResult() {

    const { chain, authToken, currentWallet } = useContext(Web3Context)
    const { showError } = useErrorModal();

    const [candidates, setCandidates] = useState([])
    const [electionDetails, setElectionDetails] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [voterTransactionInfo, setVoterTransactionInfo] = useState({})

    const { contractAddress } = useParams()

    useEffect(() => {
        const fetchData = async () => {
            try {
                const electionResultsReq = await fetch(`${endpointUrlPublic}/api/election-result/${contractAddress}`, {
                    headers: {
                        "Authorization": `Bearer ${authToken}`
                    }
                });
                const data = await electionResultsReq.json();
                setElectionDetails(data.electionData);
                setCandidates(data.candidates);

                const voterVotedRes = await fetch(`${endpointUrlPublic}/api/voted/${contractAddress.toLowerCase()}/${currentWallet}`, {
                    headers: {
                      "Authorization": `Bearer ${authToken}`,
                    },
                  });
                const voterVotedData = await voterVotedRes.json();
                setVoterTransactionInfo(voterVotedData);
            } catch(error) {
                showError("Failed to fetch election results")
            } finally {
                setIsLoading(false);
            }
        }
      
        fetchData();
    }, []);
      
    // TODO chain.contractAddress get from database

    if (isLoading) {
        return <LoadingComponent />
    }

    const copyToClipboard = async () => {
        try {
          await navigator.clipboard.writeText(electionDetails.electionCommitteeSecret);
        } catch (err) {
          console.error('Failed to copy text: ', err);
        }
    };

    const getBreadcrumbItems = (name) => {
        return [
            { text: "Election", link: "/" },
            { text: `${name} (${shortenAddress(contractAddress)})`, link: `/result/${contractAddress}` },
        ];
    }

    return (
        <div className='flex h-auto flex-row'>
            <SideMenu />
            <div className='m-4 w-full'>
                <Breadcrumb items={getBreadcrumbItems(electionDetails.electionName)} />
                {
                    candidates.length > 0 && (
                        <>
                            <div className="flex flex-col m-5 bg-white shadow-md rounded-lg">
                                <div className="p-5 bg-blue-50 rounded-lg border border-blue-200 m-5 mb-2.5">
                                    <p className="text-lg font-medium">
                                        Started at: <span className="text-blue-700">{formatDateText(new Date(electionDetails.electionStartTimestamp*1000))}</span>
                                    </p>
                                    <p className="text-lg font-medium">
                                        End at: <span className="text-blue-700">{formatDateText(new Date(electionDetails.electionEndTimestamp*1000))}</span>
                                    </p>
                                    <p className="text-lg font-medium">
                                        Received vote count: <span className="text-blue-700">{electionDetails.totalVoteCount}</span>
                                    </p>
                                </div>
                                <div className="p-5 bg-blue-50 rounded-lg border border-blue-200 m-5 mt-2.5">
                                    <p className="text-lg font-medium">
                                        Contract address: <a href={`${chain.explorerUrl}/address/${contractAddress}`}><span className="text-blue-700 underline">{contractAddress}</span></a>
                                    </p>
                                    <p className="text-lg font-medium">
                                        Your transaction: <a href={`${chain.explorerUrl}/tx/${voterTransactionInfo.transactionHash}`} target="_blank" rel="noreferrer" className="text-blue-700 underline underline-offset-1">ballot</a>
                                    </p>
                                    <div className="flex flex-row items-center">
                                        <p className="text-lg font-medium">
                                        Election secret key:
                                            <span className="ml-2 text-blue-700">
                                                {electionDetails.electionCommitteeSecret.substring(0, 5) + "..."}
                                            </span>
                                        </p>
                                        <button
                                        onClick={copyToClipboard}
                                        className="text-blue-700 hover:bg-blue-200 p-2 rounded"
                                        >
                                            <FiCopy />
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col m-5 bg-white shadow-md rounded-lg">
                                <table className="w-full text-gray-700 table-auto flex-grow mb-6 rounded-lg overflow-hidden">
                                <thead className="text-md text-white uppercase bg-blue-700">
                                    <tr className="text-center">
                                    <th className="py-3 px-4 font-semibold text-sm"></th>
                                    <th className="py-3 px-4 font-semibold text-sm">Zone</th>
                                    <th className="py-3 px-4 font-semibold text-sm">Code</th>
                                    <th className="py-3 px-4 font-semibold text-sm">Candidate</th>
                                    <th className="py-3 px-4 font-semibold text-sm">Party</th>
                                    <th className="py-3 px-4 font-semibold text-sm">Vote Count</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {
                                    candidates.flatMap((faculty, index) => {
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
                            </div>
                        </>
                    )
                }
                {
                    candidates.length === 0 && (
                        <div className="flex flex-col m-5 bg-white shadow-md rounded-lg">
                            <div className="p-5 bg-yellow-50 rounded-lg border border-yellow-200 m-5 mb-5">
                                <p className="text-lg font-medium">
                                    Election results not available. Please wait for the election committee to count the votes.
                                </p>
                            </div>
                        </div>
                    )
                }
            </div>
        </div>
    )
}
