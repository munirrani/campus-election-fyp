import React from 'react';
import Modal from 'react-modal';
import { useErrorModal } from '../provider/ErrorModalProvider';

Modal.setAppElement('#root')

const ErrorModal = () => {

  const { modalIsOpen, setModalIsOpen, modalMessage } = useErrorModal();
  const onRequestClose = () => setModalIsOpen(false);

  return (
    <Modal
      isOpen={modalIsOpen}
      onRequestClose={onRequestClose}
      className="flex items-center justify-center fixed inset-0 z-50 bg-black bg-opacity-60"
      overlayClassName="Overlay"
      contentLabel="Error Modal"
    >
      <div className="relative bg-white w-11/12 md:max-w-md mx-auto rounded shadow-lg py-4 text-left px-4 md:px-10" role="alert">
        <div className="py-8 text-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 text-red-400" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12.001 2C6.48 2 2 6.48 2 12s4.48 10 10.001 10C17.52 22 22 17.52 22 12S17.52 2 12.001 2zm0 18c-4.41 0-7.999-3.589-7.999-8s3.589-8 7.999-8c4.411 0 8 3.589 8 8s-3.589 8-8 8zm1-13h-2v6h2V7zm0 8h-2v2h2v-2z"/>
        </svg>
        <p className="text-2xl font-semibold text-gray-700 mb-4">Error</p>
        <p className="text-gray-700">{modalMessage}</p>
        </div>
        <div className="px-4 pb-4">
          <button className="w-full py-2 text-sm font-semibold text-white bg-red-500 rounded hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-50 transition-colors" onClick={onRequestClose}>Close</button>
        </div>
      </div>
    </Modal>)
};

export default ErrorModal;
