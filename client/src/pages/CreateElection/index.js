import React, { useContext, useEffect, useState, useCallback } from 'react'
import { Web3Context } from '../../provider/Web3Provider'
import { useErrorModal } from '../../provider/ErrorModalProvider';
import { endpointUrlPublic } from '../../constants/endpoint';
import TransactionSubmittingLoadingModal from '../../components/TransactionSubmittingLoadingModal';
import TransactionApprovedModal from '../../components/TransactionApprovedModal';
import LoadingComponent from '../../components/LoadingComponent';
import SideMenu from '../../components/SideMenu';
import Breadcrumb from '../../components/Breadcrumb';
import Papa from 'papaparse';
import { useNavigate } from 'react-router';
import ApprovedModal from '../../components/ApprovedModal';

export default function CreateElection() {

  const { factoryContract, authToken, currentWallet, web3 } = useContext(Web3Context);

  const [isSubmittingTransaction, setIsSubmittingTransaction] = useState(false);
  const [transactionHashModal, setTransactionHashModal] = useState("");
  const [contractAddress, setContractAddress] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [electionStartTimestamp, setElectionStartTimestamp] = useState('');
  const [electionEndTimestamp, setElectionEndTimestamp] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [isUploadingCSV, setIsUploadingCSV] = useState(false);
  const navigate = useNavigate();

  const [electionInfo, setElectionInfo] = useState({
    electionName: '',
    electionStartTimestamp: '',
    electionEndTimestamp: '',
    electionCandidates: '',
  })

  const { showError } = useErrorModal();

  const handleCSVUpload = async () => {
    setIsUploadingCSV(true);
    const file = electionInfo.electionCandidates;
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



  const submitTransaction = async (electionName, electionStartTimestamp, electionEndTimestamp) => {
    setIsSubmittingTransaction(true);
    
    try {
      const gasPrice = await web3.eth.getGasPrice();
      const gasLimit = await factoryContract.methods.createInstance(electionName, electionStartTimestamp, electionEndTimestamp).estimateGas({
        from: currentWallet,
      });
    
      const transaction = await factoryContract.methods.createInstance(electionName, electionStartTimestamp, electionEndTimestamp).send({ from: currentWallet, gasPrice: gasPrice, gasLimit: gasLimit });
      setIsSubmittingTransaction(false);
      setTransactionHashModal(transaction.transactionHash);
      setContractAddress(transaction.events.ContractInstantiated.returnValues.contractAddress);
      setTimeout(() => {
        setTransactionHashModal("");
      }, 5000);
    } catch (error) {
      setIsSubmittingTransaction(false);
      showError('Failed to create election');
    }
  }

  const createElection = async () => {
    if (!validateForm()) {
      return;
    }
    const startTime = new Date(electionInfo.electionStartTimestamp).getTime() / 1000
    const endTime = new Date(electionInfo.electionEndTimestamp).getTime() / 1000
    try {
      await submitTransaction(electionInfo.electionName, startTime, endTime);
    } catch (error) {
      console.error(error);
    }
  };

  const breadcrumbItems = [
    { text: "Election", link: "/" },
    { text: "My Elections", link: "/my-election" },
    { text: "Create Election", link: "/create" },
  ];

  // TODO form validation for text inpput, date input & CSV

  const validateForm = () => {
    let errors = {};
    let formIsValid = true;

    // if (!registrationInfo.siswamail || registrationInfo.siswamail.trim() === '') {
    //     formIsValid = false;
    //     errors["siswamail"] = "*Please enter your name.";
    // } else if (!registrationInfo.siswamail.endsWith("@siswa.um.edu.my")) {
    //     formIsValid = false;
    //     errors["siswamail"] = "*Please enter a correct siswamail address.";
    // }

    // if (!registrationInfo.matrixNum || registrationInfo.matrixNum.trim() === '') {
    //     formIsValid = false;
    //     errors["matrixNum"] = "*Please enter your matrix number.";
    // } else if (!registrationInfo.matrixNum.match(/^((1\d|2\d)\d{6}(\/\d)?|U\d{7}|u\d{7})$/i)) {
    //     formIsValid = false;
    //     errors["matrixNum"] = "*Please enter a correct matrix number.";
    // }

    // if (registrationInfo.faculty === 'undefined' || !registrationInfo.faculty || registrationInfo.faculty.trim() === 'def') {
    //     formIsValid = false;
    //     errors["faculty"] = "*Please select your faculty.";
    // }

    setFormErrors(errors);
    return formIsValid;
  }


  const handleElectionInfoChange = (e) => {
    if (e.target.name == 'electionCandidates') {
      const file = e.target.files[0];
      setElectionInfo({...electionInfo, [e.target.name]: file});
    } else {
      setElectionInfo({...electionInfo, [e.target.name]: e.target.value});
    }
  };

  useEffect(() => {
    contractAddress && handleCSVUpload();
  }, [contractAddress]);

  return (
    <div className='flex h-screen flex-row'>
      <SideMenu />
      
      <div className="w-full m-4">
      {
        isSubmittingTransaction && <TransactionSubmittingLoadingModal />
      }
      {
        transactionHashModal && <TransactionApprovedModal transactionHash={transactionHashModal} />
      }
      {
        showModal && <ApprovedModal 
            title="Election created" 
            message="Election created successfully" 
            onClose={() => {setShowModal(false); setIsUploadingCSV(false); navigate('/my-election');}}
            />
        }
      <Breadcrumb items={breadcrumbItems} />
      <div className="flex flex-col m-5 bg-white shadow-md rounded-lg p-5">
        {/* Part 1 */}
        <div className='mb-6'>
          <label htmlFor="electionName" className="block mb-2 text-sm font-bold text-gray-900">Election Name</label>
          <input 
            type="text"
            name="electionName"
            placeholder="Election Name"
            onChange={handleElectionInfoChange}
            value={electionInfo.electionName}
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5" 
          />
          {formErrors.electionName && <span className="text-red-500">{formErrors.electionName}</span>}
        </div>
        <div className='mb-6'>
          <label htmlFor="electionDate" className="block mb-2 text-sm font-bold text-gray-900">Election Start Date</label>
          <input 
            type="datetime-local"
            name="electionStartTimestamp"
            value={electionInfo.electionStartTimestamp}
            onChange={handleElectionInfoChange}
          />
          {formErrors.electionStartTimestamp && <span className="text-red-500">{formErrors.electionStartTimestamp}</span>}
        </div>
        <div className='mb-6'>
          <label htmlFor="electionDate" className="block mb-2 text-sm font-bold text-gray-900">Election End Date</label>
          <input 
            type="datetime-local"
            name="electionEndTimestamp"
            value={electionInfo.electionEndTimestamp}
            onChange={handleElectionInfoChange}
          />
          {formErrors.electionEndTimestamp && <span className="text-red-500">{formErrors.electionEndTimestamp}</span>}
        </div>
        <div className='mb-6'>
          <label htmlFor="electionCandidates" className="block mb-2 text-sm font-bold text-gray-900">Candidates</label>
          <input 
              type="file" 
              accept=".csv" 
              name="electionCandidates"
              onChange={handleElectionInfoChange} />
          {
              isUploadingCSV && <p className="text-sm mt-3 text-slate-400">Uploading candidates...</p>
          }
          {formErrors.electionCandidates && <span className="text-red-500">{formErrors.electionCandidates}</span>}
          {candidates.length > 0 && (
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Other Field</th>
                  {/* Add more table headers here */}
                </tr>
              </thead>
              <tbody>
                {candidates.map((candidate, index) => (
                  <tr key={index}>
                    <td>{candidate.Name}</td>
                    <td>{candidate.OtherField}</td>
                    {/* Add more table columns here */}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="mb-6">
          <button
            className="mr-2 px-5 py-2.5 font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg text-sm w-50"
            onClick={() => createElection()}
          >
            Create Election
          </button>
        </div>
      </div>
    </div>

    </div>
  )
}
