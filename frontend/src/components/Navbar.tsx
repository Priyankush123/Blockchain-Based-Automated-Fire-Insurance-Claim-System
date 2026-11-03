import React, { useState } from "react";
import { useWeb3 } from "../context/Web3Context";
import { shortenAddress } from "../utils/formatters";
import { Flame, Settings, RefreshCw, LogOut, Wallet } from "lucide-react";

export const Navbar: React.FC = () => {
  const {
    account,
    userRole,
    balance,
    connectWallet,
    disconnectWallet,
    contractAddress,
    setContractAddress,
    triggerRefresh,
    loading,
    isConnecting
  } = useWeb3();

  const [showConfig, setShowConfig] = useState(false);
  const [tempAddress, setTempAddress] = useState(contractAddress);

  const getRoleBadgeColor = () => {
    switch (userRole) {
      case "ADMIN": return "bg-purple-950 text-purple-300 border-purple-800";
      case "INSURER": return "bg-blue-950 text-blue-300 border-blue-800";
      case "FIRE_OFFICER": return "bg-rose-950 text-rose-300 border-rose-800";
      case "SURVEYOR": return "bg-amber-950 text-amber-300 border-amber-800";
      case "CLAIMER": return "bg-emerald-950 text-emerald-300 border-emerald-800";
      default: return "bg-slate-800 text-slate-400 border-slate-700";
    }
  };

  return (
    <>
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-flame-600 to-amber-500 flex items-center justify-center shadow-lg shadow-flame-500/20">
                <Flame className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                  FireChain
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-flame-950 text-flame-400 border border-flame-700/50 uppercase font-mono">
                    Decentralized
                  </span>
                </span>
                <span className="text-[11px] text-slate-400 block -mt-1">
                  On-Chain Fire Insurance Claims DApp
                </span>
              </div>
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-3">
              {/* Refresh State Button */}
              <button
                onClick={triggerRefresh}
                className={`p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition ${
                  loading ? "animate-spin text-flame-400" : ""
                }`}
                title="Refresh blockchain state"
              >
                <RefreshCw className="w-4 h-4" />
              </button>

              {/* Target Contract Settings Toggle */}
              <button
                onClick={() => setShowConfig(!showConfig)}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                title="Contract settings"
              >
                <Settings className="w-4 h-4" />
              </button>

              {/* MetaMask Web3 Account Pill or Connect Button */}
              {!account ? (
                <button
                  onClick={connectWallet}
                  disabled={isConnecting}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-flame-600 hover:bg-flame-500 text-white transition shadow-sm disabled:opacity-50"
                >
                  <Wallet className="w-4 h-4" />
                  <span>{isConnecting ? "Connecting..." : "Connect MetaMask"}</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="font-mono text-slate-200">
                      {shortenAddress(account)}
                    </span>
                    <span className="text-slate-400 hidden sm:inline">
                      ({balance} ETH)
                    </span>
                    <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${getRoleBadgeColor()}`}>
                      {userRole}
                    </span>
                  </div>

                  <button
                    onClick={disconnectWallet}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 transition border border-transparent hover:border-rose-900"
                    title="Disconnect Wallet"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Contract Address Drawer */}
        {showConfig && (
          <div className="bg-slate-950 border-b border-slate-800 p-4">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex-1 w-full">
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Active FireInsurance Smart Contract Address
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tempAddress}
                    onChange={(e) => setTempAddress(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-flame-500"
                    placeholder="0x..."
                  />
                  <button
                    onClick={() => {
                      setContractAddress(tempAddress.trim());
                      setShowConfig(false);
                      triggerRefresh();
                    }}
                    className="px-4 py-1.5 bg-flame-600 hover:bg-flame-500 text-white rounded-lg text-xs font-medium transition"
                  >
                    Save & Reconnect
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </header>
    </>
  );
};
