import { useContext } from "react";
import { NavLink } from "react-router-dom";
import { Web3Context } from "../provider/Web3Provider";
import { isAdmin} from "../utils/address";

const Breadcrumb = ({ items }) => {
  const { email, username, currentWallet } = useContext(Web3Context);


  return (
    <nav className="text-black font-bold flex flex-row justify-between items-center" aria-label="Breadcrumb">
      <ol className="list-none p-0 inline-flex items-center">
        {items.map((item, index) => (<>
          <NavLink key={index} to={item.link} className={({ isActive }) => "inline-block border rounded-lg py-2 px-6 font-bold " + (isActive ? " bg-blue-700  text-white" : "border-gray-100  text-blue-700 font-semibold")}>
            <li key={"list"+index}>
              {item.text}
            </li>
          </NavLink>
            {index < items.length - 1 && (
              <svg key={"svg"+index} className="fill-current w-4 h-4 mx-3 -rotate-90" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512">
                <path d="M31.3 192l128 128c9.4 9.4 24.6 9.4 33.9 0l128-128c9.4-9.4 9.4-24.6 0-33.9l-22.6-22.6c-9.4-9.4-24.6-9.4-33.9 0L192 233.7 89.3 135.5c-9.4-9.4-24.6-9.4-33.9 0L32.9 158c-9.4 9.3-9.4 24.5 0 33.9z"/>
              </svg>
            )}
        </>))}
      </ol>
      <span className={"text-sm text-white rounded-lg py-3 px-6 mr-4 " + (isAdmin(currentWallet) ? "bg-gray-700" : "bg-blue-700")}>
          <span className="text-white font-semibold">
            {`${isAdmin(currentWallet) ? "Admin" : username} (${email})`}
            </span>
      </span>
    </nav>
  );
};

export default Breadcrumb