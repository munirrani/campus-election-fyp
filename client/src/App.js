import './App.css';
import Web3 from 'web3';
import { useEffect, useContext } from 'react';
import {
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import Register from './pages/Register';
import Vote from './pages/Vote';
import { Web3Context } from './provider/Web3Provider';
import LoginPage from './pages/LoginPage';
import Verification from './pages/Verification';
import ElectionResult from './pages/ElectionResult';
import NotFound from './pages/NotFound';
import FactoryContractABI from './constants/CampusElectionFactory.json'
import { endpointUrlPublic } from './constants/endpoint';
import { useErrorModal } from './provider/ErrorModalProvider';
import CreateElection from './pages/CreateElection';
import Home from './pages/Home';
import MyElection from './pages/MyElection';
import ManageElection from './pages/ManageElection';
import { isAdmin } from './utils/address';

function App() {

  const { 
    setWeb3, 
    setFactoryContract,
    setCurrentWallet, currentWallet, 
    setOnWrongNetwork, 
    chain, setChain, 
    setUserSignature,
    authToken, setAuthToken,
    setLoginMessage,
    setUsername,
    setMatrixNum,
    setEmail,
    logoutUser,
  } = useContext(Web3Context);

  const { showError } = useErrorModal();

  const fetchChain = async () => {
    const chainReq = await fetch(`${endpointUrlPublic}/api/chainInfo`);
    const chainRes = await chainReq.json();
    setChain(chainRes.chain);
  }
  
  const checkChainAndSetupContract = async (web3) => {
    const id = await web3.eth.getChainId();
    if (id == chain.chainId) {
      const factoryContract = new web3.eth.Contract(FactoryContractABI.abi, chain.factoryContractAddress);
      setFactoryContract(factoryContract);
      setOnWrongNetwork(false);
    } else {
      setOnWrongNetwork(true);
    }
  };

  const setupListeners = (web3) => {
    window.ethereum.on("chainChanged", async (chain) => {
      await checkChainAndSetupContract(web3);
    });

    window.ethereum.on("accountsChanged", handleAccountsChanged);
  };


  const handleAccountsChanged = (accounts) => {
    if (accounts.length === 0 || accounts[0].toLowerCase() != currentWallet.toLowerCase()) {
      logoutUser();
    }
  };
  
  const initializeWeb3 = async () => {
    if (window.ethereum || window.web3) {
      const web3 = new Web3(window.ethereum || window.web3.currentProvider);
      setWeb3(web3);
      await checkChainAndSetupContract(web3);
      setupListeners(web3);
    } else {
      showError('Non-Ethereum browser detected. You should consider trying MetaMask!')
    }
  };

  const loadWalletAddress = () => {
    const walletAddress = sessionStorage.getItem('walletAddress');
    if (walletAddress) {
      setCurrentWallet(walletAddress);
    }
  }

  const loadToken = () => {
    const token = sessionStorage.getItem('token');
    if (token) {
      setAuthToken(token);
    }
  }

  const loadSignature = () => {
    const signature = sessionStorage.getItem('userSignature');
    if (signature) {
      setUserSignature(signature);
    }
  }

  const loadLoginMessage = () => {
    const loginMessage = sessionStorage.getItem('loginMessage');
    if (loginMessage) {
      setLoginMessage(loginMessage);
    }
  }

  const loadUsername = () => {
    const username = sessionStorage.getItem('username');
    if (username) {
      setUsername(username);
    }
  }

  const loadMatrixNum = () => {
    const matrixNum = sessionStorage.getItem('matrixNum');
    if (matrixNum) {
      setMatrixNum(matrixNum);
    }
  }

  const loadEmail = () => {
    const email = sessionStorage.getItem('email');
    if (email) {
      setEmail(email);
    }
  }

  const checkTokenExpiry = () => {
    console.log("checkTokenExpiry")
    const tokenPayload = JSON.parse(atob(authToken.split('.')[1]));
    const expirationTime = tokenPayload.exp;
    const currentTime = Math.floor(Date.now() / 1000);

    if (expirationTime < currentTime) {
      logoutUser();
    }
  }

  useEffect(() => {
    fetchChain();
    loadWalletAddress();
    loadToken();
    loadSignature();
    loadLoginMessage();
    loadUsername();
    loadMatrixNum();
    loadEmail();
    authToken && checkTokenExpiry();
  }, []);

  useEffect(() => {
    if (chain) {
      initializeWeb3();
    }
  }, [chain]);
  

  return (
    <div className="bg-gray-100 h-max">
      <Routes>
        {
          !authToken &&  <>
            <Route exact path="/" element={<LoginPage />}/>
            <Route exact path="/adminLogin" element={<LoginPage admin={true} />}/>
            <Route path="/verify/:signatureHash" element={<Verification />} />
            <Route exact path="/register" element={<Register />} />
          </>
        }
        { authToken && (<>
          <Route exact path="/" element={<Home />}/>
          {
            isAdmin(currentWallet) && 
            <Route exact path="/my-election" element={<MyElection />}/>
          }
          {
            isAdmin(currentWallet) && 
            <Route exact path="/my-election/:contractAddress" element={<ManageElection />}/>
          }
          {
            isAdmin(currentWallet) && 
            <Route exact path="/create" element={<CreateElection />}/>
          }
          <Route exact path="/election/:contractAddress" element={<Vote />}/>
          <Route exact path="/result/:contractAddress" element={<ElectionResult />}/>
        </>)}
        <Route path="*" element={<NotFound />} />
      </Routes>
  </div>
  );
}

export default App;
