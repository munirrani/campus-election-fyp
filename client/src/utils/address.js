
const shortenAddress = (address) => {
    return `${address.slice(0, 7)}...${address.slice(address.length - 5,address.length)}`;
}

const getAdminAddress = () => '0x78203242133155cad847957206fc140b6b154e7b'

const isAdmin = (address) => {
  return address.toLowerCase() == getAdminAddress()
}


export { shortenAddress, isAdmin, getAdminAddress};