import React from 'react';
import { useNavigate } from 'react-router-dom';

const NotFound = () => {

    const navigate = useNavigate();

    return (
    <div className="flex items-center justify-center h-screen">
        <div className="p-10 bg-white rounded shadow-lg">
        <h1 className="text-2xl font-bold mb-5 text-blue-700">404</h1>
        <p className="text-gray-700 mb-5">Oops! The page you are looking for does not exist.</p>
        <button onClick={() => navigate('/')} className="px-4 py-2 text-white bg-blue-700 rounded hover:bg-blue-800">
            Go Home
        </button>
        </div>
    </div>
    );
};

export default NotFound;
