import React, { useCallback, useContext, useEffect, useState } from 'react';
import SideMenu from '../../components/SideMenu';
import { Web3Context } from '../../provider/Web3Provider';
import { useErrorModal } from '../../provider/ErrorModalProvider';
import { endpointUrlPublic } from '../../constants/endpoint';
import LoadingComponent from '../../components/LoadingComponent';
import { FiPlus } from 'react-icons/fi';
import { useNavigate } from 'react-router';
import { isAdmin, shortenAddress } from '../../utils/address';
import Breadcrumb from '../../components/Breadcrumb';
import { Link } from 'react-router-dom';
import { formatDate, getTimeDifferenceInDaysHoursMinutes } from '../../utils/date';

const Home = () => {

    const { authToken, currentWallet } = useContext(Web3Context);
    const [isLoading, setIsLoading] = useState(true);
    const [onGoingElectionInstances, setOnGoingElectionInstances] = useState([]);
    const [pastElectionInstances, setPastElectionInstances] = useState([]);
    const { showError } = useErrorModal();
    const navigate = useNavigate();

    const getAllElectionInstances = async () => {
        try {
            const response = await fetch(`${endpointUrlPublic}/api/elections/`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                },
            });
        
            const data = await response.json();
            const currentTime = Math.floor((new Date()).getTime() / 1000);
            // Filter based on currentTime
            const onGoingElectionInstances = data.filter(election => election.electionStartTimestamp <= (currentTime-60) && currentTime <= election.electionEndTimestamp);
            const pastElectionInstances = data.filter(election => election.hasPublishedResult);
            setOnGoingElectionInstances(onGoingElectionInstances);
            setPastElectionInstances(pastElectionInstances);
        } catch (error) {
            showError('Failed to fetch all election instances');
        }
        setIsLoading(false);
    }

    const createElectionOnClick = useCallback(() => navigate('/create'))

    useEffect(() => {
        setIsLoading(true);
        getAllElectionInstances();
    }, []);

    const MainContent = () => <div className="w-full m-4">
        <Breadcrumb items={[{ text: "Election", link: "/" }]} />
        <div className="m-4">

            {
                isAdmin(currentWallet) &&
                    <div className="flex flex-row rounded-lg mb-2 justify-end">
                        <button className="text-white bg-green-700 hover:bg-green-800 font-normal rounded-lg text-md px-3 py-2 my-2 text-center inline-flex items-center" type="button" onClick={createElectionOnClick}>
                            <FiPlus className="mr-2 text-lg" />
                            Create Election
                        </button>
                    </div>
            }

            <div className="flex flex-col bg-white shadow-md rounded-lg mb-6">
                <div className="flex flex-row m-5">
                    <p className="text-xl font-semibold">Ongoing Election</p>
                </div>
                <table className="text-gray-700 table-auto flex-grow m-6 rounded-lg overflow-hidden shadow-md">
                    <thead className="text-md text-white uppercase bg-blue-700">
                        <tr className="text-center">
                            <th className="py-3 px-4 font-semibold text-sm">Name</th>
                            <th className="py-3 px-4 font-semibold text-sm">Opened Since</th>
                            <th className="py-3 px-4 font-semibold text-sm">Will Close In</th>
                            <th className="py-3 px-4 font-semibold text-sm">Owner</th>
                            <th className="py-3 px-4 font-semibold text-sm">Contract Address</th>
                            <th className="py-3 px-4 font-semibold text-sm">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {onGoingElectionInstances.map((election, index) => {
                            return (
                                <tr key={index} className={`border-b border-slate-200 ${index % 2 === 0 ? 'bg-slate-50' : 'bg-white'} hover:bg-blue-100 transition-colors duration-200 ease-in`}>
                                    <td className="py-3 px-4 text-center">{election.electionName}</td>
                                    <td className="py-3 px-4 text-center">{getTimeDifferenceInDaysHoursMinutes(election.electionStartTimestamp)} ago</td>
                                    <td className="py-3 px-4 text-center">{getTimeDifferenceInDaysHoursMinutes(election.electionEndTimestamp)}</td>
                                    <td className="py-3 px-4 text-center">Admin</td>
                                    <td className="py-3 px-4 text-center">{shortenAddress(election.contractAddress)}</td>
                                    <td className="py-3 px-4 text-center">
                                        <Link to={`/election/${election.contractAddress}`}>
                                            <button className="text-white bg-blue-700 hover:bg-blue-800 font-medium rounded-lg text-md px-4 py-2.5 my-2 text-center inline-flex items-center" type="button">
                                            Vote
                                            </button>
                                        </Link>
                                    </td>
                                </tr>
                            )
                        })}
                        {
                            onGoingElectionInstances.length === 0 && (
                                <tr className="border-b border-gray-200 bg-white ">
                                    <td colSpan="7" className="py-6 text-center text-zinc-400">No election is running</td>
                                </tr>
                            )
                        }
                    </tbody>
                </table>
            </div>

            <div className="flex flex-col bg-white shadow-md rounded-lg">
                <div className="flex flex-row m-5">
                    <p className="text-xl font-semibold">Past Elections</p>
                </div>
                <table className="text-gray-700 table-auto flex-grow m-6 rounded-lg overflow-hidden shadow-md">
                    <thead className="text-md text-white uppercase bg-blue-700">
                        <tr className="text-center">
                            <th className="py-3 px-4 font-semibold text-sm">Name</th>
                            <th className="py-3 px-4 font-semibold text-sm">Opened In</th>
                            <th className="py-3 px-4 font-semibold text-sm">Closed In</th>
                            <th className="py-3 px-4 font-semibold text-sm">Owner</th>
                            <th className="py-3 px-4 font-semibold text-sm">Contract Address</th>
                            <th className="py-3 px-4 font-semibold text-sm">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pastElectionInstances.map((election, index) => {
                            return (
                                <tr key={index} className={`border-b border-slate-200 ${index % 2 === 0 ? 'bg-slate-50' : 'bg-white'} hover:bg-blue-100 transition-colors duration-200 ease-in`}>
                                    <td className="py-3 px-4 text-center">{election.electionName}</td>
                                    <td className="py-3 px-4 text-center">{formatDate(new Date(election.electionStartTimestamp*1000))}</td>
                                    <td className="py-3 px-4 text-center">{formatDate(new Date(election.electionEndTimestamp*1000))}</td>
                                    <td className="py-3 px-4 text-center">Admin</td>
                                    <td className="py-3 px-4 text-center">{shortenAddress(election.contractAddress)}</td>
                                    <td className="py-3 px-4 text-center">
                                        <Link to={`/result/${election.contractAddress}`}>
                                            <button className="text-white bg-blue-700 hover:bg-blue-800 font-medium rounded-lg text-md px-4 py-2.5 my-2 text-center inline-flex items-center" type="button">
                                                View Result
                                            </button>
                                        </Link>
                                    </td>
                                </tr>
                            )
                        })}
                        {
                            pastElectionInstances.length === 0 && (
                                <tr className="border-b border-gray-200 bg-white ">
                                    <td colSpan="7" className="py-6 text-center text-zinc-400">No past election</td>
                                </tr>
                            )
                        }
                    </tbody>
                </table>
            </div>

        </div>

    </div>
    
    return (
        <div className='flex h-screen flex-row '>
            <SideMenu />
            {
                isLoading ? <LoadingComponent /> : <MainContent />
            }
            
        </div>
    );
}

export default Home;
