import React, { useState } from "react";
import { useWeb3 } from "../context/Web3Context";
import { HARDHAT_PERSONAS } from "../config/accounts";
import { shortenAddress } from "../utils/formatters";
import { MetaMaskModal } from "./MetaMaskModal";
import { Flame, Settings, RefreshCw } from "lucide-react";

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const {
    account,
    persona,
    isMetaMask,
    balance,
    isCorrectNetwork,
    role,
    switchPersona,
    connectMetaMask,
    contractAddress,
    setContractAddress,
    triggerRefresh,
    loading
  } = useWeb3();

  const [showConfig, setShowConfig] = useState(false);
  const [showMetaMaskModal, setShowMetaMaskModal] = useState(false);
  const [tempAddress, setTempAddress] = useState(contractAddress);

  const tabs = [
    { id: "dashboard", label: "Dashboard" },
    { id: "policies", label: "Policies" },
    { id: "incidents", label: "Incidents" },
    { id: "claims", label: "Claims & Assessments" },
    { id: "roles", label: "Roles (Admin)" }
  ];

  return (
    <>
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Navigation */}
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setActiveTab("dashboard")}>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-flame-600 to-amber-500 flex items-center justify-center shadow-lg shadow-flame-500/20">
                  <Flame className="w-6 h-6 text-white" />
                </div>
                <div>
                  <span className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                    FireChain
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-flame-950 text-flame-400 border border-flame-700/50 uppercase font-mono">
                      v1.0
                    </span>
                  </span>
                  <span className="text-[11px] text-slate-400 block -mt-1">
                    Decentralized Claims Prototype
                  </span>
                </div>
              </div>

              {/* Nav Tabs */}
              <nav className="hidden md:flex space-x-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                      activeTab === tab.id
                        ? "bg-slate-800 text-white border border-slate-700 shadow-sm"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-3">
              {/* Refresh Button */}
              <button
                onClick={triggerRefresh}
                className={`p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition ${
                  loading ? "animate-spin text-flame-400" : ""
                }`}
                title="Refresh ledger state"
              >
                <RefreshCw className="w-4 h-4" />
              </button>

              {/* Contract Config Toggle */}
              <button
                onClick={() => setShowConfig(!showConfig)}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                title="Contract settings"
              >
                <Settings className="w-4 h-4" />
              </button>

              {/* Dedicated MetaMask Trigger Button */}
              <button
                onClick={() => {
                  if (!isMetaMask) {
                    connectMetaMask();
                  } else {
                    setShowMetaMaskModal(true);
                  }
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                  isMetaMask
                    ? "bg-amber-950/40 border-amber-600/60 text-amber-300 hover:bg-amber-950/70"
                    : "bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600"
                }`}
                title="MetaMask Web3 Wallet"
              >
                {/* MetaMask Fox Icon */}
                <svg className="w-4 h-4" viewBox="0 0 318.6 318.6" fill="none">
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
                {isMetaMask ? (
                  <span>MetaMask ({balance} ETH)</span>
                ) : (
                  <span>Connect MetaMask</span>
                )}
              </button>

              {/* Dev Persona Switcher Dropdown */}
              <div className="relative">
                <select
                  aria-label="Select active stakeholder persona"
                  value={persona ? persona.id : "metamask"}
                  onChange={(e) => {
                    if (e.target.value === "metamask") {
                      connectMetaMask();
                    } else {
                      switchPersona(e.target.value);
                    }
                  }}
                  className="bg-slate-800 border border-slate-700 text-xs text-slate-200 rounded-lg px-2.5 py-2 pr-7 focus:outline-none focus:ring-1 focus:ring-flame-500 font-medium cursor-pointer"
                >
                  <optgroup label="Hardhat Test Personas">
                    {HARDHAT_PERSONAS.map((p) => (
                      <option key={p.id} value={p.id}>
                        👤 {p.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="External Wallet">
                    <option value="metamask">🦊 MetaMask Extension</option>
                  </optgroup>
                </select>
              </div>

              {/* Active Role & Address Indicator */}
              <div
                onClick={() => isMetaMask && setShowMetaMaskModal(true)}
                className={`hidden lg:flex items-center gap-2 px-3 py-1.5 bg-slate-900 border rounded-lg text-xs ${
                  isMetaMask ? "border-amber-600/40 cursor-pointer hover:border-amber-500" : "border-slate-800"
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${isCorrectNetwork ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`}></div>
                <span className="font-mono text-slate-300">
                  {shortenAddress(account)}
                </span>
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {role.isAdmin ? "Admin" : role.isInsurer ? "Insurer" : role.isFireOfficer ? "Fire Officer" : role.isSurveyor ? "Surveyor" : "Guest"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Contract Settings Drawer */}
        {showConfig && (
          <div className="bg-slate-950 border-b border-slate-800 p-4">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex-1 w-full">
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Deployed FireInsurance Smart Contract Address
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
                    Save & Connect
                  </button>
                </div>
              </div>
              <div className="text-xs text-slate-400">
                Default local node: <code className="text-slate-300 font-mono">0x5FbDB2315678afecb367f032d93F642f64180aa3</code>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* MetaMask Connection & Network Modal */}
      <MetaMaskModal
        isOpen={showMetaMaskModal}
        onClose={() => setShowMetaMaskModal(false)}
      />
    </>
  );
};
