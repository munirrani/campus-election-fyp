import React, { createContext, useState, useContext } from "react";
import ErrorModal from "../components/ErrorModal";

const ErrorModalContext = createContext();

export const ErrorModalProvider = ({ children }) => {
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState('');

  const showError = (message) => {
    setModalMessage(message);
    setModalIsOpen(true);
  }

  return (
    <ErrorModalContext.Provider value={{ modalIsOpen, setModalIsOpen, modalMessage, setModalMessage, showError }}>
      <ErrorModal />
      {children}
    </ErrorModalContext.Provider>
  );
};

export const useErrorModal = () => useContext(ErrorModalContext);
