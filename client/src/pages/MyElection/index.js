import React, { useContext, useEffect, useState, useCallback } from 'react'
import SideMenu from '../../components/SideMenu'
import { Web3Context } from '../../provider/Web3Provider';
import { useErrorModal } from '../../provider/ErrorModalProvider';
import { endpointUrlPublic } from '../../constants/endpoint';
import LoadingComponent from '../../components/LoadingComponent';
import { shortenAddress } from '../../utils/address';
import { Link, useNavigate } from 'react-router-dom';
import { FiPlus } from 'react-icons/fi';
import Breadcrumb from '../../components/Breadcrumb';
import { formatDate } from '../../utils/date';

export default function MyElection() {

    const { authToken, currentWallet } = useContext(Web3Context);
    const [isLoading, setIsLoading] = useState(true);
    const [userElectionInstances, setUserElectionInstances] = useState([]);
    const { showError } = useErrorModal(); 
    const navigate = useNavigate();

    const getUserElectionInstances = async () => {
        try {
            const response = await fetch(`${endpointUrlPublic}/api/election-of-user/${currentWallet}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                },
            });
        
            const data = await response.json();
            console.log(data);
            setUserElectionInstances(data);
        } catch (error) {
            showError('Failed to fetch user election instances');
        }
        setIsLoading(false);
    }

    const createElectionOnClick = useCallback(() => navigate('/create'))

    const buttonTitle = ['Manage', 'Manage', 'View Result']

    useEffect(() => {
        setIsLoading(true);
        getUserElectionInstances();
    }, []);

    const breadcrumbItems = [
        { text: "Election", link: "/" },
        { text: "My Elections", link: "/my-election" },
    ];

    const getElectionStatusNumber = (electionStartTimestamp, electionEndTimestamp) => {
        const currentTime = Math.floor((new Date()).getTime() / 1000);
        if (currentTime < electionStartTimestamp) {
            return 0;
        } else if (electionStartTimestamp <= currentTime && currentTime <= electionEndTimestamp) {
            return 1;
        } else { 
            return 2;
        }
    }

    const MainContent = () => <div className="w-full m-4">
        <Breadcrumb items={breadcrumbItems} />
        <div className="m-4">
            <div className="flex flex-row rounded-lg mb-2 justify-end">
                <button className="text-white bg-green-700 hover:bg-green-800 font-normal rounded-lg text-md px-3 py-2 my-2 text-center inline-flex items-center" type="button" onClick={createElectionOnClick}>
                    <FiPlus className="mr-2 text-lg" />
                    Create Election
                </button>
            </div>
            <table className="text-gray-700 table-auto flex-grow mb-6 rounded-lg overflow-hidden shadow-md w-full">
                <thead className="text-md text-white uppercase bg-blue-700">
                    <tr className="text-center">
                        <th className="py-3 px-4 font-semibold text-sm">Name</th>
                        <th className="py-3 px-4 font-semibold text-sm">Start Time</th>
                        <th className="py-3 px-4 font-semibold text-sm">End Time</th>
                        <th className="py-3 px-4 font-semibold text-sm">Contract Address</th>
                        <th className="py-3 px-4 font-semibold text-sm">Action</th>
                    </tr>
                </thead>
                <tbody>
                    {userElectionInstances.map((election, index) => {
                        return (
                            <tr key={index} className={`border-b border-slate-200 ${index % 2 === 0 ? 'bg-slate-50' : 'bg-white'} hover:bg-blue-100 transition-colors duration-200 ease-in`}>
                                <td className="py-3 px-4 text-center">{election.electionName}</td>
                                <td className="py-3 px-4 text-center">{formatDate(new Date(election.electionStartTimestamp*1000))}</td>
                                <td className="py-3 px-4 text-center">{formatDate(new Date(election.electionEndTimestamp*1000))}</td>
                                <td className="py-3 px-4 text-center">{shortenAddress(election.contractAddress)}</td>
                                <td className="py-3 px-4 text-center">
                                    {
                                        election.hasPublishedResult && 
                                        <Link to={getElectionStatusNumber(election.electionStartTimestamp, election.electionEndTimestamp) == 2 ? `/result/${election.contractAddress}` : `/my-election/${election.contractAddress}`}>
                                            <button className="text-white bg-blue-700 hover:bg-blue-800 font-medium rounded-lg text-md px-4 py-2.5 my-2 text-center inline-flex items-center" type="button">
                                                View Result
                                            </button>
                                        </Link>
                                    }
                                    {
                                        !election.hasPublishedResult &&
                                        <Link to={`/my-election/${election.contractAddress}`}>
                                            <button className="text-white bg-blue-700 hover:bg-blue-800 font-medium rounded-lg text-md px-4 py-2.5 my-2 text-center inline-flex items-center" type="button">
                                                Manage
                                            </button>
                                        </Link>
                                    }
                                </td>
                            </tr>
                        )
                    })}
                    {
                        userElectionInstances.length === 0 && (
                            <tr className="border-b border-gray-200 bg-white ">
                                <td colSpan="7" className="py-6 text-center">No election sessions set up</td>
                            </tr>
                        )
                    }
                </tbody>
            </table>

        </div>
    </div>

    return (
        <div className='flex h-screen flex-row'>
            <SideMenu />
            {
                isLoading && <LoadingComponent />
            }
            {
                !isLoading && <MainContent />
            }
        </div>
    )
}
