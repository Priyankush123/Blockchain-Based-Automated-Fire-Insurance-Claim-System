import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { ethers, Contract, JsonRpcProvider, BrowserProvider, Signer } from "ethers";
import { DEFAULT_CONTRACT_ADDRESS, FIRE_INSURANCE_ABI } from "../config/contract";
import { HARDHAT_PERSONAS, Persona } from "../config/accounts";

interface RoleStatus {
  isAdmin: boolean;
  isInsurer: boolean;
  isFireOfficer: boolean;
  isSurveyor: boolean;
}

export const SUPPORTED_NETWORKS = {
  LOCALHOST: {
    chainIdHex: "0x7a69", // 31337
    chainIdDecimal: 31337,
    name: "Hardhat Localhost (31337)",
    rpcUrl: "http://127.0.0.1:8545",
    currency: { name: "Local ETH", symbol: "ETH", decimals: 18 }
  },
  SEPOLIA: {
    chainIdHex: "0xaa36a7", // 11155111
    chainIdDecimal: 11155111,
    name: "Sepolia Testnet",
    rpcUrl: "https://rpc.sepolia.org",
    currency: { name: "Sepolia ETH", symbol: "ETH", decimals: 18 },
    blockExplorer: "https://sepolia.etherscan.io"
  }
};

interface Web3ContextType {
  account: string;
  persona: Persona | null;
  isMetaMask: boolean;
  balance: string;
  chainId: string | null;
  networkName: string;
  isCorrectNetwork: boolean;
  role: RoleStatus;
  contract: Contract | null;
  readContract: Contract | null;
  contractAddress: string;
  setContractAddress: (addr: string) => void;
  switchPersona: (personaId: string) => void;
  connectMetaMask: () => Promise<void>;
  disconnectMetaMask: () => void;
  switchNetwork: (chainIdHex: string) => Promise<void>;
  triggerRefresh: () => void;
  refreshKey: number;
  loading: boolean;
  error: string | null;
  setError: (err: string | null) => void;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

const LOCAL_RPC = "http://127.0.0.1:8545";

export const Web3Provider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [contractAddress, setContractAddress] = useState<string>(() => {
    return localStorage.getItem("firechain_contract_address") || DEFAULT_CONTRACT_ADDRESS;
  });

  const [isMetaMask, setIsMetaMask] = useState<boolean>(() => {
    return localStorage.getItem("firechain_auth_mode") === "metamask";
  });

  const [selectedPersona, setSelectedPersona] = useState<Persona>(HARDHAT_PERSONAS[1]);
  const [account, setAccount] = useState<string>("");
  const [balance, setBalance] = useState<string>("0.00");
  const [chainId, setChainId] = useState<string | null>(null);
  const [contract, setContract] = useState<Contract | null>(null);
  const [readContract, setReadContract] = useState<Contract | null>(null);
  const [role, setRole] = useState<RoleStatus>({
    isAdmin: false,
    isInsurer: false,
    isFireOfficer: false,
    isSurveyor: false
  });

  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const triggerRefresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  useEffect(() => {
    localStorage.setItem("firechain_contract_address", contractAddress);
  }, [contractAddress]);

  useEffect(() => {
    localStorage.setItem("firechain_auth_mode", isMetaMask ? "metamask" : "dev_persona");
  }, [isMetaMask]);

  // MetaMask network switcher with auto-add fallback
  const switchNetwork = async (chainIdHex: string) => {
    if (!(window as any).ethereum) {
      setError("MetaMask is not installed.");
      return;
    }
    setError(null);
    try {
      await (window as any).ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: chainIdHex }]
      });
      triggerRefresh();
    } catch (switchError: any) {
      // 4902 error code means the chain has not been added to MetaMask yet
      if (switchError.code === 4902) {
        try {
          const net =
            chainIdHex === SUPPORTED_NETWORKS.LOCALHOST.chainIdHex
              ? SUPPORTED_NETWORKS.LOCALHOST
              : SUPPORTED_NETWORKS.SEPOLIA;

          await (window as any).ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: net.chainIdHex,
                chainName: net.name,
                rpcUrls: [net.rpcUrl],
                nativeCurrency: net.currency
              }
            ]
          });
          triggerRefresh();
        } catch (addError: any) {
          setError(addError.message || "Failed to add network to MetaMask");
        }
      } else {
        setError(switchError.message || "Failed to switch network in MetaMask");
      }
    }
  };

  // Connect MetaMask
  const connectMetaMask = async () => {
    if (!(window as any).ethereum) {
      setError("MetaMask extension not detected. Please install MetaMask.");
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const browserProvider = new BrowserProvider((window as any).ethereum);
      const accounts = await browserProvider.send("eth_requestAccounts", []);
      if (accounts && accounts[0]) {
        setIsMetaMask(true);
        triggerRefresh();
      }
    } catch (err: any) {
      setError(err.message || "Failed to connect MetaMask");
    } finally {
      setLoading(false);
    }
  };

  const disconnectMetaMask = () => {
    setIsMetaMask(false);
    setSelectedPersona(HARDHAT_PERSONAS[1]);
    triggerRefresh();
  };

  const switchPersona = (personaId: string) => {
    const found = HARDHAT_PERSONAS.find(p => p.id === personaId);
    if (found) {
      setIsMetaMask(false);
      setSelectedPersona(found);
      setAccount(found.address);
      triggerRefresh();
    }
  };

  // MetaMask Event Listeners (Account switch and Network switch)
  useEffect(() => {
    if ((window as any).ethereum) {
      const handleAccounts = (accounts: string[]) => {
        if (accounts.length > 0) {
          triggerRefresh();
        } else {
          setIsMetaMask(false);
          triggerRefresh();
        }
      };

      const handleChain = (newChainId: string) => {
        setChainId(newChainId);
        triggerRefresh();
      };

      (window as any).ethereum.on("accountsChanged", handleAccounts);
      (window as any).ethereum.on("chainChanged", handleChain);

      return () => {
        (window as any).ethereum.removeListener("accountsChanged", handleAccounts);
        (window as any).ethereum.removeListener("chainChanged", handleChain);
      };
    }
  }, [triggerRefresh]);

  // Main Web3 Initialization
  useEffect(() => {
    let active = true;

    async function initWeb3() {
      try {
        setLoading(true);
        setError(null);

        // Read-only contract
        const rpcProvider = new JsonRpcProvider(LOCAL_RPC);
        const rContract = new Contract(contractAddress, FIRE_INSURANCE_ABI, rpcProvider);
        if (active) setReadContract(rContract);

        let signer: Signer;
        let currentAccount = "";

        if (isMetaMask && (window as any).ethereum) {
          const browserProvider = new BrowserProvider((window as any).ethereum);
          signer = await browserProvider.getSigner();
          currentAccount = await signer.getAddress();

          // Get network info and ETH balance from MetaMask
          const network = await browserProvider.getNetwork();
          const currentChainHex = `0x${network.chainId.toString(16)}`;
          if (active) setChainId(currentChainHex);

          try {
            const rawBalance = await browserProvider.getBalance(currentAccount);
            if (active) setBalance(parseFloat(ethers.formatEther(rawBalance)).toFixed(4));
          } catch {
            if (active) setBalance("0.00");
          }
        } else {
          // Dev Persona Mode
          signer = new ethers.Wallet(selectedPersona.privateKey, rpcProvider);
          currentAccount = selectedPersona.address;
          if (active) {
            setChainId(SUPPORTED_NETWORKS.LOCALHOST.chainIdHex);
            setBalance("10000.00");
          }
        }

        if (active) setAccount(currentAccount);

        const wContract = new Contract(contractAddress, FIRE_INSURANCE_ABI, signer);
        if (active) setContract(wContract);

        // Fetch verified roles from smart contract
        try {
          const [adminRole, insurerRole, fireOfficerRole, surveyorRole] = await Promise.all([
            rContract.DEFAULT_ADMIN_ROLE(),
            rContract.INSURER_ROLE(),
            rContract.FIRE_OFFICER_ROLE(),
            rContract.SURVEYOR_ROLE()
          ]);

          const [isAdmin, isInsurer, isFireOfficer, isSurveyor] = await Promise.all([
            rContract.hasRole(adminRole, currentAccount),
            rContract.hasRole(insurerRole, currentAccount),
            rContract.hasRole(fireOfficerRole, currentAccount),
            rContract.hasRole(surveyorRole, currentAccount)
          ]);

          if (active) {
            setRole({
              isAdmin,
              isInsurer,
              isFireOfficer,
              isSurveyor
            });
          }
        } catch (roleErr: any) {
          console.warn("Could not query contract roles:", roleErr.message);
        }
      } catch (err: any) {
        if (active) {
          console.error("Web3 init error:", err);
          // If MetaMask failed to connect, fallback to dev persona
          if (isMetaMask) {
            setIsMetaMask(false);
          }
          setError(err.message || "Failed to initialize Web3");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    initWeb3();

    return () => {
      active = false;
    };
  }, [contractAddress, selectedPersona, isMetaMask, refreshKey]);

  let networkName = "Unknown Network";
  let isCorrectNetwork = true;
  if (chainId) {
    const lower = chainId.toLowerCase();
    if (lower === SUPPORTED_NETWORKS.LOCALHOST.chainIdHex.toLowerCase() || chainId === "31337" || chainId === "0x7a69") {
      networkName = SUPPORTED_NETWORKS.LOCALHOST.name;
    } else if (lower === SUPPORTED_NETWORKS.SEPOLIA.chainIdHex.toLowerCase() || chainId === "11155111" || chainId === "0xaa36a7") {
      networkName = SUPPORTED_NETWORKS.SEPOLIA.name;
    } else {
      networkName = `Chain ID ${chainId}`;
      isCorrectNetwork = false;
    }
  }

  return (
    <Web3Context.Provider
      value={{
        account,
        persona: isMetaMask ? null : selectedPersona,
        isMetaMask,
        balance,
        chainId,
        networkName,
        isCorrectNetwork,
        role,
        contract,
        readContract,
        contractAddress,
        setContractAddress,
        switchPersona,
        connectMetaMask,
        disconnectMetaMask,
        switchNetwork,
        triggerRefresh,
        refreshKey,
        loading,
        error,
        setError
      }}
    >
      {children}
    </Web3Context.Provider>
  );
};

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (!context) throw new Error("useWeb3 must be used within a Web3Provider");
  return context;
};
