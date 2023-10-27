import React, {useContext, useState, useEffect, useCallback, useReducer} from 'react'
import UMCECLogo from '../../assets/umcec-logo.png';
import '../../App.css';
import { Web3Context } from '../../provider/Web3Provider';
import LoggingInLoadingModal from '../../components/LoggingInLoadingModal';
import { formatDate } from  '../../utils/date';
import { useErrorModal } from '../../provider/ErrorModalProvider';
import { endpointUrlPublic } from '../../constants/endpoint';
import { useNavigate } from 'react-router';

export default function LoginPage({ admin }) {

  const {
    web3,
    currentWallet,
    setCurrentWallet,
    chain,
    setOnWrongNetwork,
    setUserSignature,
    setAuthToken,
    isLoggingIn,
    setIsLoggingIn,
    setLoginMessage,
    setUsername,
    setMatrixNum,
    setEmail,
  } = useContext(Web3Context);

  const { showError } = useErrorModal();
  const navigation = useNavigate();
  const [buttonPressed, setButtonPressed] = useState(false);

  const fetchNonce = async (wallet) => {
    const url = `${endpointUrlPublic}/api/nonce?wallet=${wallet}`;
    const response = await fetch(url);
    const data = await response.json();
    return data.nonce;
  };

  const fetchUserDetails = async (wallet) => {
    const url = `${endpointUrlPublic}/api/user/user-details?currentWallet=${wallet}`;
    const response = await fetch(url);
    const data = await response.json();
    return data;
  }
  
  const signNonce = async (web3, nonce, wallet) => {
    const message = `I want to login at UM Campus Election website at ${formatDate(new Date())} with the given nonce: ${nonce.toString()}`
    return  { signature: await web3.eth.personal.sign(message, wallet), message };
  };
  
  const authenticateUserRequest = async (wallet, signature, message) => {
    const authReq = await fetch(`${endpointUrlPublic}/api/authenticate?wallet=${encodeURIComponent(wallet)}&message=${encodeURIComponent(message)}`, {
      method: 'GET',
      headers: {
        'x-signature': signature,
      },
    });
    const authRes = await authReq.json();
    return authRes.token;
  };

  const checkIfUserAlreadyRegistered = async(currentWallet) => {
    try {
      const url = `${endpointUrlPublic}/api/check-if-registered?wallet=${currentWallet}`
      const request = await fetch(url)
      const response = await request.json();
      return { registered: response.registered, verified: response.verified}
    } catch(error) {
      showError("Failed to check if user is registered")
    }
  }
  
  const checkRegistrationAndVerification = async (currentWallet) => {
    const { registered, verified } = await checkIfUserAlreadyRegistered(currentWallet);
    if (!registered && !verified) {
      navigation('/register');
      return false;
    }
    if (registered && !verified) {
      showError("Please verify your account");
      setCurrentWallet(null);
      return false;
    }
    return true;
  }
  
  const loginUser = async (web3, currentWallet) => {
    try {
      if (!await checkRegistrationAndVerification(currentWallet)) {
        return;
      }
      const userDetails = await fetchUserDetails(currentWallet);
      setIsLoggingIn(true);
      const nonce = await fetchNonce(currentWallet);
      const { signature, message } = await signNonce(web3, nonce, currentWallet);
      const token = await authenticateUserRequest(currentWallet, signature, message);
      handleSuccessfulLogin({signature, message, token, userDetails});
    } catch (error) {
      handleLoginError(error);
    } finally {
      setIsLoggingIn(false);
    }
  };
  
  const handleSuccessfulLogin = ({signature, message, token, userDetails}) => {
    setUserSignature(signature);
    setLoginMessage(message);
    setAuthToken(token);
    setUsername(userDetails.fullname);
    setMatrixNum(userDetails.matrixNum);
    setEmail(userDetails.email);
    sessionStorage.setItem('userSignature', signature);
    sessionStorage.setItem('loginMessage', message);
    sessionStorage.setItem('token', token);
    sessionStorage.setItem('username', userDetails.username);
    sessionStorage.setItem('matrixNum', userDetails.matrixNum);
    sessionStorage.setItem('email', userDetails.email);
    setIsLoggingIn(false);
    if (admin) {
      navigation('/');
    }
  };
  
  const handleLoginError = (error) => {
    setIsLoggingIn(false);
    showError(error.message);
  };

  const checkNetworkId = async (web3, currentWallet) => {
    const chainId = await web3.eth.getChainId();
    if (chainId !== chain.chainId) {
      await addNetworkDetailsToUserWallet(web3, chain); // Prompt user to switch network after connecting to Metamask
    } else {
      setOnWrongNetwork(false);
      await loginUser(web3, currentWallet);
    }
  };
  
  const connectToMetamask = useCallback(async () => {
    const ethereum = window.ethereum;
    if (!ethereum) {
      showError('Non-Ethereum browser detected. You should consider trying MetaMask!');
      return;
    }
  
    setButtonPressed(true)

    try {
      const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
      setCurrentWallet(accounts[0]);
      sessionStorage.setItem('walletAddress', accounts[0]);
    } catch (error) {
      showError(error.message);
    }
  }, []);
  
  const addNetworkDetailsToUserWallet = async (web3, chain) => {
    let ethereum = window.ethereum;
    if (ethereum) {
      try {
        const res = await ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: '0x' + chain.chainId.toString(16),
              chainName: chain.chainName,
              nativeCurrency: {
                name: chain.currencySymbol,
                symbol: chain.currencySymbol,
                decimals: 18
              },
              rpcUrls: [chain.rpcUrl],
              blockExplorerUrls: [chain.explorerUrl],
            },
          ],
        })
        const newNetworkVersion = await ethereum.request({ method: 'net_version' });
        if (newNetworkVersion !== chain.chainId.toString()) {
          throw new Error();
        } else {
          setOnWrongNetwork(false);
          await loginUser(web3, currentWallet);
        }
      } catch (error) {
        setOnWrongNetwork(true); 
        showError('Failed to change network')
      }
    } else {
      showError('Non-Ethereum browser detected. You should consider trying MetaMask!')
    }
  }

  useEffect(() => {
    if (currentWallet && web3 && chain && buttonPressed) {
      checkNetworkId(web3, currentWallet);
    }
  }, [currentWallet, web3, chain, buttonPressed]);
  return (
    <div className={"flex items-center justify-center min-h-screen bg-gradient-to-br " + (admin ? "fluid-gradient-admin" : "fluid-gradient")}>
      {
        isLoggingIn && <LoggingInLoadingModal />
      }
      <div className="sm:p-10 p-4 bg-white rounded-lg flex flex-col items-center space-y-5 sm:space-y-5 shadow-2xl sm:w-1/3 w-full mx-4">
        <div className="bg-gray-100 sm:h-36 h-24 sm:w-36 w-24 rounded-full flex items-center justify-center">
          <img src={UMCECLogo} alt="UMCEC Logo" className="w-full h-full"/>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-700 text-center">{admin ? "Welcome Admin!" : "Welcome to UM Campus Election!"}</h1>
        <p className="text-sm sm:text-md font-medium text-gray-700 text-center pb-2">Connect your wallet to login</p>
        <button title="Connect Wallet" className={`${admin ? "bg-gray-600 hover:bg-gray-700" : "bg-green-600 hover:bg-green-700"} text-white text-md font-medium py-2 px-6 rounded m-2 w-full`} onClick={() => connectToMetamask()}>Connect Wallet</button>
      </div>
    </div>
  )
}
