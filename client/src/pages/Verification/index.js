import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import LoadingComponent from '../../components/LoadingComponent';
import { endpointUrlPublic } from '../../constants/endpoint';
import { useErrorModal } from '../../provider/ErrorModalProvider';

const Verification = () => {
  const [verificationResult, setVerificationResult] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const { signatureHash } = useParams();

  const navigate = useNavigate(); 
  const { showError } = useErrorModal();

  useEffect(() => {
    const fetchVerificationResult = async () => {
      try {
        const verificationRequest = await fetch(`${endpointUrlPublic}/api/verify/${signatureHash}`)
        const verificationResult = await verificationRequest.json()
        setVerificationResult(verificationResult)
        setIsLoading(false)
      } catch(error) {
        showError("Failed to fetch verification result")
        setIsLoading(false)
      }
    }
    fetchVerificationResult();
  }, [signatureHash]);

  if (isLoading) {
    return <LoadingComponent />;
  }

  return (
    <div className="p-10 bg-white rounded shadow-md">
    <h1 className="text-2xl font-bold mb-5 text-blue-600">Verification Result</h1>
    {verificationResult && (
        <div className="p-5 bg-blue-50 rounded-lg border-blue-200 border">
            <p className="mb-2 text-lg text-blue-800">Valid: 
                <span className={verificationResult.valid ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                    {verificationResult.valid ? ' Yes' : ' No'}
                </span>
            </p>
            <p className="text-lg text-blue-800">Message: {verificationResult.message}</p>
        </div>
    )}
    <button
        onClick={() => navigate('/')}
        className="mt-5 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
    >
        Go back to home page
    </button>
</div>

  );
};

export default Verification;
