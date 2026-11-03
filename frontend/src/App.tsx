import React from "react";
import { Web3Provider, useWeb3 } from "./context/Web3Context";
import { Navbar } from "./components/Navbar";
import { AdminDashboard } from "./pages/AdminDashboard";
import { ClaimerDashboard } from "./pages/ClaimerDashboard";
import { InsurerDashboard } from "./pages/InsurerDashboard";
import { FireOfficerDashboard } from "./pages/FireOfficerDashboard";
import { SurveyorDashboard } from "./pages/SurveyorDashboard";
import {
  Wallet,
  Lock,
  Loader2,
  AlertTriangle,
  X,
  ShieldAlert
} from "lucide-react";
import { shortenAddress } from "./utils/formatters";

// -------------------------------------------------------------------
// Main Shell with Protected Role-Based Routing
// -------------------------------------------------------------------

const MainContent: React.FC = () => {
  const { account, userRole, connectWallet, isConnecting, loading, error, setError, contractAddress } = useWeb3();

  // Screen 1: Wallet Not Connected Landing Screen
  if (!account) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-orange-950/70 border border-orange-700/60 flex items-center justify-center mx-auto text-orange-500 shadow-xl shadow-orange-600/10">
              <Wallet className="w-8 h-8 text-orange-400" />
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Connect MetaMask</h2>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                FireChain requires Web3 wallet identity. Connect your MetaMask wallet to verify your role and access your authorized portal.
              </p>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs text-left flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <span className="font-mono break-all leading-normal">{error}</span>
              </div>
            )}

            <button
              onClick={connectWallet}
              disabled={isConnecting}
              className="w-full flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold text-sm transition shadow-lg shadow-orange-600/25 disabled:opacity-50 cursor-pointer"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Requesting MetaMask Approval...</span>
                </>
              ) : (
                <>
                  <Wallet className="w-4 h-4" />
                  <span>Connect Wallet via MetaMask</span>
                </>
              )}
            </button>

            <div className="text-[11px] text-slate-500 pt-3 border-t border-slate-800/80">
              Target Contract: <span className="font-mono text-slate-400">{shortenAddress(contractAddress)}</span>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Screen 2: Loading State — Validating Smart Contract Roles On-Chain
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="text-center space-y-4">
            <Loader2 className="w-10 h-10 animate-spin text-orange-500 mx-auto" />
            <p className="text-sm font-medium text-slate-300">
              Validating smart contract role permissions on-chain...
            </p>
            <p className="text-xs font-mono text-slate-500">
              Connected: {shortenAddress(account)}
            </p>
          </div>
        </main>
      </div>
    );
  }

  // Screen 3: Strict Unauthorized Screen (userRole === 'NONE')
  if (userRole === "NONE") {
    return (
      <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-slate-900 border border-rose-900/60 rounded-3xl p-8 text-center shadow-2xl space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-rose-950/70 border border-rose-800 flex items-center justify-center mx-auto text-rose-400">
              <Lock className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Unauthorized Access</h2>
              <p className="text-xs text-rose-300 mt-1 font-mono font-semibold">
                Your wallet is not registered on-chain
              </p>
              <p className="text-xs text-slate-400 mt-3 leading-relaxed">
                Connected address <span className="font-mono text-slate-200 bg-slate-800 px-2 py-0.5 rounded">{account}</span> does not possess any authorized stakeholder role (Admin, Insurer, Fire Officer, Surveyor, or Claimer) on smart contract <span className="font-mono text-slate-200">{shortenAddress(contractAddress)}</span>.
              </p>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-left text-xs text-slate-400 space-y-2">
              <div className="font-semibold text-slate-300 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                Resolution:
              </div>
              <p>
                To access this decentralized system, an Admin must register your wallet address using the <code className="text-slate-300 font-mono">registerStakeholder</code> function.
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Screen 4: Conditionally Render Strictly Authorized Dashboard
  const renderDashboardByRole = () => {
    switch (userRole) {
      case "ADMIN":
        return <AdminDashboard />;
      case "INSURER":
        return <InsurerDashboard />;
      case "FIRE_OFFICER":
        return <FireOfficerDashboard />;
      case "SURVEYOR":
        return <SurveyorDashboard />;
      case "CLAIMER":
        return <ClaimerDashboard />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <Navbar />

      {/* Global Error Banner */}
      {error && (
        <div className="bg-rose-950/90 border-b border-rose-800 text-rose-200 px-4 py-3 flex items-center justify-between text-xs sticky top-16 z-40 backdrop-blur">
          <div className="flex items-center gap-2 max-w-4xl">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="font-mono break-all">{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-rose-400 hover:text-rose-200 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Role Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderDashboardByRole()}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            FireChain &copy; 2026 — Decentralized Fire Insurance Claims Protocol.
          </div>
          <div className="flex items-center gap-4">
            <span>Solidity ^0.8.24</span>
            <span>•</span>
            <span>Ethers.js v6</span>
            <span>•</span>
            <span>OpenZeppelin AccessControl</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <Web3Provider>
      <MainContent />
    </Web3Provider>
  );
}
