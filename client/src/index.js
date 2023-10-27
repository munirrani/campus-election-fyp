import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { BrowserRouter } from 'react-router-dom'
import { Web3Provider } from './provider/Web3Provider';
import { ErrorModalProvider } from './provider/ErrorModalProvider';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <BrowserRouter>
      <ErrorModalProvider>
        <Web3Provider>
          <App />
        </Web3Provider>
      </ErrorModalProvider>
    </BrowserRouter>
);
