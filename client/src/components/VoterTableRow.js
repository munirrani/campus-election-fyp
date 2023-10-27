import React, { useContext, useState, useCallback } from 'react'
import useOnclickOutside from "react-cool-onclickoutside";
import { Web3Context } from '../provider/Web3Provider';
import { endpointUrlPublic } from '../constants/endpoint';
import { useErrorModal } from '../provider/ErrorModalProvider';
import { shortenAddress } from '../utils/address';

export default function VoterTableRow({explorerUrl, account, setShouldUpdate}) {

    const [copied, setCopied] = useState(false);
    const { authToken } = useContext(Web3Context)
    const { showError } = useErrorModal(); 

    const DropdownButton = ({ title, ethereumAddress }) => {
        const [isOpen, setIsOpen] = useState(false);
    
        const toggleDropdown = useCallback(() => {
            setIsOpen(prevIsOpen => !prevIsOpen);
        }, []);
    
        const ref = useOnclickOutside(() => {
            setIsOpen(false);
        });
    
        const handleRemoveAccount = useCallback(async () => {
            const confirmed = window.confirm('Are you sure you want to remove the account?');
    
            if (confirmed) {
                try {
                    const response = await fetch(`${endpointUrlPublic}/api/admin/remove-account/${ethereumAddress}`, {
                        method: 'DELETE',
                        headers: {
                            "Authorization": `Bearer ${authToken}`,
                        },
                    });
    
                    if (!response.ok) {
                        throw new Error(`Failed to remove account. HTTP status: ${response.status}`);
                    }
    
                    setShouldUpdate(prevState => !prevState);
                } catch (error) {
                    showError("Failed to remove account");
                }
            }
        }, [ethereumAddress, authToken, setShouldUpdate]);
    
        const blockExplorerLink = `${explorerUrl}/address/${ethereumAddress}`;
    
        return (
            <div>
                <button ref={ref} id="dropdownDefaultButton" onClick={toggleDropdown} data-dropdown-toggle="dropdown" className="text-white bg-blue-700 hover:bg-blue-800 font-medium rounded-lg text-md px-4 py-2.5 my-2 text-center inline-flex items-center" type="button">
                    {title}
                    <svg className="w-4 h-4 ml-2" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7">
                        </path>
                    </svg>
                </button>
                {
                    isOpen && (
                        <div ref={ref} id="dropdown" className="absolute z-10 mt-2 bg-white divide-y divide-gray-100 rounded-lg shadow-lg w-44">
                            <ul className="text-sm text-slate-600" aria-labelledby="dropdownDefaultButton">
                                <li>
                                    <a href="#" onClick={handleRemoveAccount} className="block px-4 py-2 hover:bg-gray-100">Remove</a>
                                </li>
                                <li>
                                    <a href={blockExplorerLink} target="_blank" rel="noopener noreferrer" className="block px-4 py-2 hover:bg-gray-100">View in block explorer</a>
                                </li>
                            </ul>
                        </div>
                    )
                }
            </div>
        );
    };

    const handleCopyClick = useCallback(() => {
        navigator.clipboard.writeText(account.ethereumAddress);
        setCopied(true);
        setTimeout(() => {
            setCopied(false);
        }, 1000);
    }, [copied])

    return (
        <>
            <td className="px-6 py-3 relative cursor-pointer" title={account.ethereumAddress} onClick={() => handleCopyClick(account.ethereumAddress)}>
                {shortenAddress(account.ethereumAddress)}
                {
                    copied && 
                    <div className="absolute top-1/2 -right-20 transform -translate-y-1/2 bg-slate-50 rounded-lg py-2 px-4 text-black border border-gray-300">
                        Copied!
                    </div>
                }
            </td>
            <td className="px-6 py-3">{account.email}</td>
            <td className="px-6 py-3">{account.matrixNum}</td>
            <td className="px-6 py-3"><p className={account.verified ? "text-green-400" : "text-yellow-400"}>{account.verified ? "Verified" : "Pending"}</p></td>
            <td className=""><DropdownButton title="Manage" ethereumAddress={account.ethereumAddress} /></td>
        </>
    )
}
