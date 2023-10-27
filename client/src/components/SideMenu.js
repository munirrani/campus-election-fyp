import React, { useContext, useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import UMCECLogo from '../assets/umcec-logo.png';
import { TfiMenu, TfiClose } from "react-icons/tfi";
import { endpointUrlPublic } from '../constants/endpoint';
import { Web3Context } from '../provider/Web3Provider';
import { useErrorModal } from '../provider/ErrorModalProvider';
import { isAdmin } from '../utils/address';

const SideMenu = () => {
  const { currentWallet, userSignature, loginMessage, logoutUser, username, email, matrixNum } = useContext(Web3Context);
  const [isHovered, setIsHovered] = useState(false);
  const { showError } = useErrorModal();

  // TODO sidemenu text of selected page should be highlighted

  const logoutUserRequest = async (wallet, signature, message) => {
    const logoutReq = await fetch(`${endpointUrlPublic}/api/logout?wallet=${encodeURIComponent(wallet)}&message=${encodeURIComponent(message)}`, {
      method: 'GET',
      headers: {
        'x-signature': signature,
      },
    });
    const logoutRes = await logoutReq.json();
    return logoutRes;
  }

  const disconnectFromMetamask = useCallback(async() => {
    try {
      if (window.ethereum) {
        const logout = await logoutUserRequest(currentWallet, userSignature, loginMessage);
        if (logout.valid) {
          logoutUser();
        }
      } else {
        showError('Non-Ethereum browser detected. You should consider trying MetaMask!')
      }    
    } catch(error) {
        showError(error.message)
    } 
  }, [currentWallet, userSignature, loginMessage])

  return (
    <div className="flex h-auto bg-gray-100">
      <div 
        className="group flex flex-col w-16 hover:w-64 bg-white transition-all duration-300" 
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="flex-shrink-0 p-6">
          {isHovered ? <TfiClose className="text-xl" /> : <TfiMenu className="text-xl" />}
        </div>
        <div className="flex-grow overflow-y-auto space-y-4">
          <div className="transform translate-x-full group-hover:translate-x-0 transition-all duration-300">
            <div className='w-full flex items-center justify-center'>
              <img src={UMCECLogo} alt="UMCEC Logo" className="w-36 h-36 -translate-y-6"/>
            </div>
            <div className="text-center font-medium mb-1">Welcome {username}!</div>
            <div className="text-center text-sm text-gray-500 mb-1">{email}</div>
            <div className="text-center text-sm text-gray-500">{matrixNum}</div>
            <hr className="my-4" />
            <div>
              <div className="font-bold text-lg px-4">Elections</div>
              <Link to="/" className="block px-8 py-2 font-medium">All Elections</Link>
              {
                isAdmin(currentWallet) &&
                  <Link to="/my-election" className="block px-8 py-2 font-medium">My Elections</Link>
              }
            </div>
            <div>
              <div className="font-bold text-lg px-4">Account</div>
              <p onClick={() => disconnectFromMetamask()} className="block px-8 py-2 text-red-500 cursor-pointer font-medium">Logout</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SideMenu;
