import React, { createContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const Web3Context = createContext();

export const Web3Provider = ({ children }) => {
  const [web3, setWeb3] = useState(null);
  const [currentWallet, setCurrentWallet] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [votingContract, setVotingContract] = useState(null);
  const [factoryContract, setFactoryContract] = useState(null);
  const [onWrongNetwork, setOnWrongNetwork] = useState(false);
  const [chain, setChain] = useState({});
  const [userSignature, setUserSignature] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginMessage, setLoginMessage] = useState('');
  const [username, setUsername] = useState('');
  const [matrixNum, setMatrixNum] = useState('');
  const [email, setEmail] = useState('');

  const navigate = useNavigate();

  const logoutUser = () => {
    setWeb3(null);
    setFactoryContract(null);
    setOnWrongNetwork(false);    
    setCurrentWallet(null);
    setAuthToken('');
    setUserSignature('');
    setLoginMessage('');
    setUsername('');
    setMatrixNum('');
    setEmail('');
    sessionStorage.removeItem('walletAddress');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('userSignature');
    sessionStorage.removeItem('loginMessage');
    sessionStorage.removeItem('username');
    navigate('/');
    window.location.reload();
  }

  return (
    <Web3Context.Provider value={{ 
      web3, setWeb3, 
      currentWallet, setCurrentWallet, 
      authToken, setAuthToken,
      votingContract, setVotingContract, 
      factoryContract, setFactoryContract,
      onWrongNetwork, setOnWrongNetwork, 
      chain, setChain,
      userSignature, setUserSignature,
      isLoggingIn, setIsLoggingIn,
      loginMessage, setLoginMessage,
      logoutUser,
      username, setUsername,
      matrixNum, setMatrixNum,
      email, setEmail,
      }}>
      {children}
    </Web3Context.Provider>
  );
};
