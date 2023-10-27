import React, { useContext, useEffect, useState } from 'react'
import '../../App.css';
import { endpointUrlPublic } from '../../constants/endpoint';
import { Web3Context } from '../../provider/Web3Provider';
import { facultiesObj } from '../../constants/faculties';
import LoadingComponent from '../../components/LoadingComponent';
import MessageApprovedModal from '../../components/MessageApprovedModal';
import MessageSigningLoadingModal from '../../components/MessageSigningLoadingModal';
import WrongNetworkComponent from '../../components/WrongNetworkComponent';
import { useErrorModal } from '../../provider/ErrorModalProvider';
import { useNavigate } from 'react-router';

export default function Register() {

  const { chain, currentWallet, onWrongNetwork, logoutUser } = useContext(Web3Context);
  const { showError } = useErrorModal();

  const [registrationInfo, setRegistrationInfo] = useState({})
  const [formErrors, setFormErrors] = useState({});
  
  const [valid, setValid] = useState(false)
  const [isChecked, setIsChecked] = useState(false);

  const [isSigningMessage, setIsSigningMessage] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const info = { ...registrationInfo };

    const fullnameValue = sessionStorage.getItem('fullnameValue');
    if (fullnameValue) {
      info.fullname = fullnameValue;
    }

    const siswaMailValue = sessionStorage.getItem('siswaMailValue');
    if (siswaMailValue) {
      info.siswamail = siswaMailValue;
    }

    const matrixNumValue = sessionStorage.getItem('matrixNumValue');
    if (matrixNumValue) {
      info.matrixNum = matrixNumValue;
    }

    const facultyValue = sessionStorage.getItem('facultyValue');
    if (facultyValue) {
      info.faculty = facultyValue;
    }
    setRegistrationInfo(info);

  }, [currentWallet]);

  useEffect(() => {
    if (registrationInfo.fullname) {
      sessionStorage.setItem('fullnameValue', registrationInfo.fullname);
    }
  }, [registrationInfo.fullname]);

  useEffect(() => {
    if (registrationInfo.siswamail) {
      sessionStorage.setItem('siswaMailValue', registrationInfo.siswamail);
    }
  }, [registrationInfo.siswamail]);

  useEffect(() => {
    if (registrationInfo.matrixNum) {
      sessionStorage.setItem('matrixNumValue', registrationInfo.matrixNum);
    }
  }, [registrationInfo.matrixNum]);

  useEffect(() => {
    if (registrationInfo.faculty) {
      sessionStorage.setItem('facultyValue', registrationInfo.faculty);
    }
  }, [registrationInfo.faculty]);

  const checkIfInfoExistsInDatabase = async () => {
    const request= await fetch(endpointUrlPublic + '/api/user/check-info-exists?siswamail=' + registrationInfo.siswamail + '&matrixNum=' + registrationInfo.matrixNum, {
      method: 'GET',
    })
    const response = await request.json();
    if (response) {
      setFormErrors(response);
    }
    return Object.keys(response).length !== 0;
  }

  const handleChange = (event) => {
    if (event.target.name === "checkbox") {
      setIsChecked(!isChecked);
      return
    }
    setRegistrationInfo({...registrationInfo, [event.target.name]: event.target.value});
  };

  const validateForm = () => {
    let errors = {};
    let formIsValid = true;

    if (!registrationInfo.fullname || registrationInfo.fullname.trim() === '') {
        formIsValid = false;
        errors["siswamail"] = "*Please enter your full name.";
    }

    if (!registrationInfo.siswamail || registrationInfo.siswamail.trim() === '') {
        formIsValid = false;
        errors["siswamail"] = "*Please enter your siswamail.";
    } else if (!registrationInfo.siswamail.endsWith("@siswa.um.edu.my")) {
        formIsValid = false;
        errors["siswamail"] = "*Please enter a correct siswamail address.";
    }

    if (!registrationInfo.matrixNum || registrationInfo.matrixNum.trim() === '') {
        formIsValid = false;
        errors["matrixNum"] = "*Please enter your matrix number.";
    } else if (!registrationInfo.matrixNum.match(/^((1\d|2\d)\d{6}(\/\d)?|U\d{7}|u\d{7})$/i)) {
        formIsValid = false;
        errors["matrixNum"] = "*Please enter a correct matrix number.";
    }

    if (registrationInfo.faculty === 'undefined' || !registrationInfo.faculty || registrationInfo.faculty.trim() === 'def') {
        formIsValid = false;
        errors["faculty"] = "*Please select your faculty.";
    }

    setFormErrors(errors);
    return formIsValid;
  }

  const onSubmit = async(event) => {
      event.preventDefault();
      if (validateForm()) {
        const infoExits = await checkIfInfoExistsInDatabase();
        if (!infoExits) {
          signMessage();
        }
      }
  }
  
  const registerVote = async (signature) => {
    const url = `${endpointUrlPublic}/api/register`;
    const data = {
      ethereumAddress: currentWallet.toLowerCase(),
      fullname: registrationInfo.fullname,
      email: registrationInfo.siswamail,
      matrixNum: registrationInfo.matrixNum,
      faculty: registrationInfo.faculty,
      signature: signature,
      zone: facultiesObj[registrationInfo.faculty].code
    };
  
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });
      if (response.ok) {
        setValid(true);
      } else {
        const responseJson = await response.json();
        showError("Failed to register: " + responseJson)
      }
    } catch (error) {
      showError("Failed to register")
    } finally { 
      setIsSigningMessage(false);
    }
  }
  
  const signMessage = async() => {
    const msgParams = {
      domain: {
        chainId: chain.chainId,
        name: 'UMCEC',
        verifyingContract: chain.factoryContractAddress,
        version: '1',
      },
      message: {
        fullname: registrationInfo.fullname,
        siswamail: registrationInfo.siswamail,
        matrixNum: registrationInfo.matrixNum,
        faculty: facultiesObj[registrationInfo.faculty].name,
      },
      primaryType: 'LoginElectionSystem',
      types: {
        EIP712Domain: [
          { name: 'name', type: 'string' },
          { name: 'version', type: 'string' },
          { name: 'chainId', type: 'uint256' },
          { name: 'verifyingContract', type: 'address' },
        ],
        LoginElectionSystem: [
          { name: 'fullname', type: 'string' },
          { name: 'siswamail', type: 'string' },
          { name: 'matrixNum', type: 'string' },
          { name: 'faculty', type: 'string' },
        ],
      },
    };
  
    setIsSigningMessage(true);
  
    try {
      const signature = await window.ethereum.request({
        method: 'eth_signTypedData_v4',
        from: currentWallet,
        params: [currentWallet, JSON.stringify(msgParams)],
      });
  
      await registerVote(signature);
  
      setTimeout(() => {
        setValid(false);
        // Return to home page
        logoutUser();
        navigate('/');
      }, 5000);
    } catch (error) {
      setIsSigningMessage(false);
      showError("Failed to sign message");
    }
  }

  if (onWrongNetwork) {
      return <WrongNetworkComponent />
  }

  return (
    <div className="flex flex-col m-5 bg-white shadow-md rounded-lg">

      {
        isSigningMessage && <MessageSigningLoadingModal />
      }
      { valid &&
        <MessageApprovedModal />
      }

      
      <form className="m-4" onSubmit={onSubmit}>
          <span className="text-2xl font-bold">Register</span>
          <div className="mb-6 mt-6">
              <label htmlFor="fullname" className="block mb-2 text-sm font-medium text-gray-900">Full Name</label>
              <input type="text" value={registrationInfo.fullname} name="fullname" onChange={handleChange} id="fullname" className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5" placeholder="Ali bin Abu"/>
              {formErrors.fullname && <span className="text-red-500">{formErrors.fullname}</span>}
          </div> 

          <div className="mb-6">
              <label htmlFor="siswamail" className="block mb-2 text-sm font-medium text-gray-900">SiswaMail Address</label>
              <input type="email" value={registrationInfo.siswamail} name="siswamail" onChange={handleChange} id="siswamail" className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5" placeholder="u2001001@siswa.um.edu.my"/>
              {formErrors.siswamail && <span className="text-red-500">{formErrors.siswamail}</span>}
          </div> 
          <div className="mb-6">
              <label htmlFor="matrixNum" className="block mb-2 text-sm font-medium text-gray-900">Matrix Number</label>
              <input type="text" value={registrationInfo.matrixNum} name="matrixNum" onChange={handleChange} id="matrixNum" className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5" placeholder="U2001001"/>
              {formErrors.matrixNum && <span className="text-red-500">{formErrors.matrixNum}</span>}
          </div> 
          <label htmlFor="faculty" className="block mb-2 text-sm font-medium text-gray-900 ">Faculty</label>
          <select id="faculty" value={registrationInfo.faculty} name="faculty" defaultValue={"def"} onChange={handleChange} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5">
              {
                Object.keys(facultiesObj).map((facultyValue, index) => {
                  if (index === 1) {
                    return null
                  }
                  return (
                      <option key={index} value={facultyValue}>{facultiesObj[facultyValue].name}</option>
                  )
              })
              }
          </select>
          {formErrors.faculty && <span className="text-red-500">{formErrors.faculty}</span>}
          <div className="mb-6"></div>

          <label htmlFor="checkbox" className="flex items-center mb-3">
            <input
              type="checkbox"
              name="checkbox"
              id="checkbox"
              checked={isChecked}
              value={isChecked}
              onChange={handleChange}
              className="mr-2"
            />
            <span className="text-sm">
              By signing, you adhere that the information provided is true
            </span>
          </label>

        <button
          type="submit"
          className={`mb-6 text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm w-full sm:w-auto px-5 py-2.5 text-center ${isChecked ? '' : 'opacity-50 pointer-events-none'}`}
        >
          Sign & Submit
        </button>
      </form>

    </div>
  )
}
