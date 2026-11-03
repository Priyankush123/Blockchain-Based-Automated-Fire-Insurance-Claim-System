import React, { useState } from "react";
import { useWeb3, SUPPORTED_NETWORKS } from "../context/Web3Context";
import { Badge } from "./Badge";
import { Copy, Check, ExternalLink, Network, Wallet, AlertTriangle } from "lucide-react";

interface MetaMaskModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MetaMaskModal: React.FC<MetaMaskModalProps> = ({ isOpen, onClose }) => {
  const {
    account,
    balance,
    networkName,
    isCorrectNetwork,
    isMetaMask,
    role,
    connectMetaMask,
    disconnectMetaMask,
    switchNetwork
  } = useWeb3();

  const [copied, setCopied] = useState(false);
  const [switching, setSwitching] = useState(false);

  if (!isOpen) return null;

  const copyAddress = () => {
    if (!account) return;
    navigator.clipboard.writeText(account);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNetworkSwitch = async (hex: string) => {
    try {
      setSwitching(true);
      await switchNetwork(hex);
    } finally {
      setSwitching(false);
    }
  };

  const hasMetaMaskExtension = typeof window !== "undefined" && !!(window as any).ethereum;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <svg className="w-5 h-5" viewBox="0 0 318.6 318.6" fill="none">
                <path d="M274.1 35.5L174.6 109.4L193 65.8L274.1 35.5Z" fill="#E2761B" stroke="#E2761B" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M44.4 35.5L143.5 109.9L125.6 65.8L44.4 35.5Z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M238.3 206.8L211.8 247.4L268.5 263L284.8 207.7L238.3 206.8Z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M33.9 207.7L50.1 263L106.8 247.4L80.3 206.8L33.9 207.7Z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M103.6 138.2L87.8 162.1L144.1 164.6L142.2 104.1L103.6 138.2Z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M214.9 138.2L175.9 103.5L174.6 164.6L230.8 162.1L214.9 138.2Z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M106.8 247.4L140.6 230.9L111.4 208.1L106.8 247.4Z" fill="#D7C1B3" stroke="#D7C1B3" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M177.9 230.9L211.8 247.4L207.1 208.1L177.9 230.9Z" fill="#D7C1B3" stroke="#D7C1B3" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M211.8 247.4L177.9 230.9L180.6 253L180.3 262.3L211.8 247.4Z" fill="#233447" stroke="#233447" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M106.8 247.4L138.3 262.3L138 253L140.6 230.9L106.8 247.4Z" fill="#233447" stroke="#233447" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M143.5 109.9L124.9 64.7L159.3 20L193.7 64.7L175.1 109.9L159.3 118.8L143.5 109.9Z" fill="#CD6116" stroke="#CD6116" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">MetaMask Web3 Wallet</h3>
              <p className="text-[11px] text-slate-400">
                {isMetaMask ? "Connected via Browser Extension" : "Not connected to MetaMask"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 text-lg leading-none">
            &times;
          </button>
        </div>

        {/* Content */}
        {!hasMetaMaskExtension ? (
          <div className="p-4 bg-amber-950/40 border border-amber-800/50 rounded-xl text-center space-y-3">
            <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
            <h4 className="font-bold text-white text-xs">MetaMask Extension Not Detected</h4>
            <p className="text-[11px] text-slate-300">
              Please install MetaMask in Chrome, Edge, or Brave browser to interact using your Web3 wallet.
            </p>
            <a
              href="https://metamask.io/download/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-semibold"
            >
              <span>Download MetaMask</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        ) : !isMetaMask ? (
          <div className="space-y-4">
            <p className="text-xs text-slate-300">
              You are currently using <strong>Local Dev Persona Mode</strong>. Connect MetaMask to sign transactions directly from your browser extension or deploy to Sepolia.
            </p>
            <button
              onClick={async () => {
                await connectMetaMask();
                onClose();
              }}
              className="w-full py-2.5 bg-flame-600 hover:bg-flame-500 text-white rounded-lg text-xs font-semibold shadow-md transition flex items-center justify-center gap-2"
            >
              <Wallet className="w-4 h-4" />
              <span>Connect MetaMask Wallet</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4 text-xs">
            {/* Account Info Box */}
            <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Connected Address</span>
                <button
                  onClick={copyAddress}
                  className="flex items-center gap-1 text-[11px] text-flame-400 hover:text-flame-300"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <div className="font-mono text-slate-200 text-xs break-all bg-slate-900 p-2 rounded border border-slate-800">
                {account}
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-400">ETH Balance</span>
                <span className="font-bold text-white text-sm">{balance} ETH</span>
              </div>
            </div>

            {/* Network Selector */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="flex items-center gap-1.5 font-medium">
                  <Network className="w-3.5 h-3.5" />
                  Active Network
                </span>
                <span className={`text-[11px] font-semibold ${isCorrectNetwork ? "text-emerald-400" : "text-amber-400"}`}>
                  {networkName}
                </span>
              </div>

              {!isCorrectNetwork && (
                <div className="p-2.5 bg-amber-950/40 border border-amber-800/60 rounded text-[11px] text-amber-300">
                  ⚠️ Your MetaMask is connected to an unsupported network. Please switch below:
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => handleNetworkSwitch(SUPPORTED_NETWORKS.LOCALHOST.chainIdHex)}
                  disabled={switching}
                  className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-left transition"
                >
                  <div className="font-bold text-slate-200">Hardhat Local</div>
                  <div className="text-[10px] text-slate-500 font-mono">Chain ID: 31337</div>
                </button>

                <button
                  onClick={() => handleNetworkSwitch(SUPPORTED_NETWORKS.SEPOLIA.chainIdHex)}
                  disabled={switching}
                  className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-left transition"
                >
                  <div className="font-bold text-slate-200">Sepolia Testnet</div>
                  <div className="text-[10px] text-slate-500 font-mono">Chain ID: 11155111</div>
                </button>
              </div>
            </div>

            {/* Smart Contract Roles Detected */}
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
              <span className="text-slate-400 font-medium block">On-Chain Roles Detected</span>
              <div className="flex flex-wrap gap-1.5">
                {role.isAdmin && <Badge status="ADMIN" type="role" />}
                {role.isInsurer && <Badge status="INSURER" type="role" />}
                {role.isFireOfficer && <Badge status="FIRE OFFICER" type="role" />}
                {role.isSurveyor && <Badge status="SURVEYOR" type="role" />}
                {!role.isAdmin && !role.isInsurer && !role.isFireOfficer && !role.isSurveyor && (
                  <span className="text-[11px] text-slate-500">
                    No authorized stakeholder roles assigned yet. Register or grant roles via the Admin console.
                  </span>
                )}
              </div>
            </div>

            {/* Disconnect Action */}
            <button
              onClick={() => {
                disconnectMetaMask();
                onClose();
              }}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition"
            >
              Switch back to Local Dev Personas
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
