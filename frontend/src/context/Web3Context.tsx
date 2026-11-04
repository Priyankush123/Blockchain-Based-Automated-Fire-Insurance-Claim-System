import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { ethers, Contract, BrowserProvider, JsonRpcProvider, JsonRpcSigner } from "ethers";
import { DEFAULT_CONTRACT_ADDRESS, FIRE_INSURANCE_ABI } from "../config/contract";

export type UserRole = "ADMIN" | "INSURER" | "FIRE_OFFICER" | "SURVEYOR" | "CLAIMER" | "NONE";

export interface RolePermissions {
  isAdmin: boolean;
  isInsurer: boolean;
  isFireOfficer: boolean;
  isSurveyor: boolean;
  isClaimer: boolean;
}

interface Web3ContextType {
  account: string;
  provider: BrowserProvider | null;
  signer: JsonRpcSigner | null;
  contract: Contract | null;
  readContract: Contract | null;
  userRole: UserRole;
  role: RolePermissions;
  rolePermissions: RolePermissions;
  chainId: string | null;
  balance: string;
  contractAddress: string;
  setContractAddress: (addr: string) => void;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  triggerRefresh: () => void;
  refreshKey: number;
  isConnecting: boolean;
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

  const [account, setAccount] = useState<string>("");
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);
  const [contract, setContract] = useState<Contract | null>(null);
  const [readContract, setReadContract] = useState<Contract | null>(null);
  const [userRole, setUserRole] = useState<UserRole>("NONE");
  const [rolePermissions, setRolePermissions] = useState<RolePermissions>({
    isAdmin: false,
    isInsurer: false,
    isFireOfficer: false,
    isSurveyor: false,
    isClaimer: false
  });

  const [chainId, setChainId] = useState<string | null>(null);
  const [balance, setBalance] = useState<string>("0.00");
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  const triggerRefresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  useEffect(() => {
    localStorage.setItem("firechain_contract_address", contractAddress);
  }, [contractAddress]);

  const connectWallet = async () => {
    if (typeof window === "undefined" || !(window as any).ethereum) {
      setError("MetaMask extension not detected. Please install MetaMask to access FireChain.");
      return;
    }

    try {
      setIsConnecting(true);
      setError(null);

      const accounts: string[] = await (window as any).ethereum.request({
        method: "eth_requestAccounts"
      });

      if (accounts && accounts.length > 0) {
        setAccount(ethers.getAddress(accounts[0]));
        triggerRefresh();
      }
    } catch (err: any) {
      if (err.code === 4001) {
        setError("Connection rejected. You must connect your MetaMask wallet to proceed.");
      } else {
        setError(err.message || "Failed to connect MetaMask");
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setAccount("");
    setProvider(null);
    setSigner(null);
    setContract(null);
    setUserRole("NONE");
    setRolePermissions({
      isAdmin: false,
      isInsurer: false,
      isFireOfficer: false,
      isSurveyor: false,
      isClaimer: false
    });
    setBalance("0.00");
  };

  useEffect(() => {
    if (typeof window === "undefined" || !(window as any).ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length > 0) {
        setAccount(ethers.getAddress(accounts[0]));
        triggerRefresh();
      } else {
        disconnectWallet();
      }
    };

    const handleChainChanged = (_newChainId: string) => {
      triggerRefresh();
    };

    (window as any).ethereum.on("accountsChanged", handleAccountsChanged);
    (window as any).ethereum.on("chainChanged", handleChainChanged);

    return () => {
      (window as any).ethereum.removeListener("accountsChanged", handleAccountsChanged);
      (window as any).ethereum.removeListener("chainChanged", handleChainChanged);
    };
  }, [triggerRefresh]);

  useEffect(() => {
    async function checkExistingAccounts() {
      if (typeof window !== "undefined" && (window as any).ethereum) {
        try {
          const accounts: string[] = await (window as any).ethereum.request({
            method: "eth_accounts"
          });
          if (accounts && accounts.length > 0) {
            setAccount(ethers.getAddress(accounts[0]));
          }
        } catch (err) {
          console.warn("Could not retrieve active accounts:", err);
        }
      }
    }
    checkExistingAccounts();
  }, []);

  useEffect(() => {
    let active = true;

    async function initWeb3() {
      try {
        const rpcProvider = new JsonRpcProvider(LOCAL_RPC);
        const rContract = new Contract(contractAddress, FIRE_INSURANCE_ABI, rpcProvider);
        if (active) setReadContract(rContract);
      } catch (e) {
        console.warn("Read-only contract init notice:", e);
      }

      if (!account || typeof window === "undefined" || !(window as any).ethereum) {
        if (active) {
          setProvider(null);
          setSigner(null);
          setContract(null);
          setUserRole("NONE");
          setRolePermissions({
            isAdmin: false,
            isInsurer: false,
            isFireOfficer: false,
            isSurveyor: false,
            isClaimer: false
          });
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const browserProvider = new BrowserProvider((window as any).ethereum);
        const userSigner = await browserProvider.getSigner();
        const userAddress = await userSigner.getAddress();
        const contractInstance = new Contract(contractAddress, FIRE_INSURANCE_ABI, userSigner);

        if (active) {
          setProvider(browserProvider);
          setSigner(userSigner);
          setContract(contractInstance);
        }

        const network = await browserProvider.getNetwork();
        if (active) {
          setChainId(`0x${network.chainId.toString(16)}`);
        }

        try {
          const rawBal = await browserProvider.getBalance(userAddress);
          if (active) {
            setBalance(parseFloat(ethers.formatEther(rawBal)).toFixed(4));
          }
        } catch {
          if (active) setBalance("0.00");
        }

        try {
          const adminRole = "0x0000000000000000000000000000000000000000000000000000000000000000";
          const insurerRole = ethers.id("INSURER_ROLE");
          const fireOfficerRole = ethers.id("FIRE_OFFICER_ROLE");
          const surveyorRole = ethers.id("SURVEYOR_ROLE");
          const claimerRole = ethers.id("CLAIMER_ROLE");

          const [isAdmin, isInsurer, isFireOfficer, isSurveyor, isClaimer] = await Promise.all([
            contractInstance.hasRole(adminRole, userAddress),
            contractInstance.hasRole(insurerRole, userAddress),
            contractInstance.hasRole(fireOfficerRole, userAddress),
            contractInstance.hasRole(surveyorRole, userAddress),
            contractInstance.hasRole(claimerRole, userAddress)
          ]);

          let verifiedRole: UserRole = "NONE";
          if (isAdmin) verifiedRole = "ADMIN";
          else if (isInsurer) verifiedRole = "INSURER";
          else if (isFireOfficer) verifiedRole = "FIRE_OFFICER";
          else if (isSurveyor) verifiedRole = "SURVEYOR";
          else if (isClaimer) verifiedRole = "CLAIMER";

          if (active) {
            setUserRole(verifiedRole);
            setRolePermissions({
              isAdmin,
              isInsurer,
              isFireOfficer,
              isSurveyor,
              isClaimer
            });
          }
        } catch (roleErr: any) {
          console.error("Failed to query on-chain roles:", roleErr);
          if (active) {
            setUserRole("NONE");
            setError(`Could not verify roles on contract at ${contractAddress}: ${roleErr.message}`);
          }
        }
      } catch (err: any) {
        console.error("Web3 initialization error:", err);
        if (active) {
          setError(err.message || "Failed to initialize Web3 provider");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    initWeb3();

    return () => {
      active = false;
    };
  }, [account, contractAddress, refreshKey]);

  return (
    <Web3Context.Provider
      value={{
        account,
        provider,
        signer,
        contract,
        readContract,
        userRole,
        role: rolePermissions,
        rolePermissions,
        chainId,
        balance,
        contractAddress,
        setContractAddress,
        connectWallet,
        disconnectWallet,
        triggerRefresh,
        refreshKey,
        isConnecting,
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