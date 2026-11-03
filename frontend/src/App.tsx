import React, { useState } from "react";
import { Web3Provider, useWeb3 } from "./context/Web3Context";
import { Navbar } from "./components/Navbar";
import { Dashboard } from "./pages/Dashboard";
import { PoliciesPage } from "./pages/PoliciesPage";
import { IncidentsPage } from "./pages/IncidentsPage";
import { ClaimsPage } from "./pages/ClaimsPage";
import { RolesPage } from "./pages/RolesPage";
import { AlertTriangle, X } from "lucide-react";

const MainContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const { error, setError } = useWeb3();

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Global Error Notification */}
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

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "dashboard" && <Dashboard setActiveTab={setActiveTab} />}
        {activeTab === "policies" && <PoliciesPage />}
        {activeTab === "incidents" && <IncidentsPage />}
        {activeTab === "claims" && <ClaimsPage />}
        {activeTab === "roles" && <RolesPage />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            FireChain &copy; 2026 — Decentralized Fire Insurance Claims Workflow Prototype.
          </div>
          <div className="flex items-center gap-4">
            <span>Solidity ^0.8.24</span>
            <span>•</span>
            <span>Ethers.js v6</span>
            <span>•</span>
            <span>OpenZeppelin Contracts v5</span>
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
