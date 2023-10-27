import React, { useContext } from 'react'
import { Web3Context } from '../provider/Web3Provider';

export default function WrongNetworkComponent() {
  const { chain } = useContext(Web3Context)
  return (
    <div className="w-full text-center">
    <br></br>
    <p>Wrong network. Please use {chain.chainName}</p>
</div>
  )
}