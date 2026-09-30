import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { TelemetrySimulatorView } from './components/TelemetrySimulatorView';
import { PoliciesView } from './components/PoliciesView';
import { ClaimsView } from './components/ClaimsView';
import { BlockchainLedgerView } from './components/BlockchainLedgerView';
import { AIModelView } from './components/AIModelView';
import { 
  Policy, 
  FireEventItem, 
  Claim, 
  HealthStatus, 
  FireVerifyResponse 
} from './types';
import { 
  fetchHealth, 
  fetchPolicies, 
  fetchFireEvents, 
  fetchClaims 
} from './services/api';
import { Flame, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [fireEvents, setFireEvents] = useState<FireEventItem[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [selectedEventIdForClaim, setSelectedEventIdForClaim] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<{ title: string; text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Contract Address deployed to local Hardhat node
  const contractAddress = '0x5FbDB2315678afecb367f032d93F642f64180aa3';

  const showToast = (title: string, text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ title, text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadAllData = async () => {
    try {
      const [h, p, fe, c] = await Promise.allSettled([
        fetchHealth(),
        fetchPolicies(),
        fetchFireEvents(),
        fetchClaims()
      ]);

      if (h.status === 'fulfilled') setHealth(h.value);
      if (p.status === 'fulfilled') setPolicies(p.value);
      if (fe.status === 'fulfilled') setFireEvents(fe.value);
      if (c.status === 'fulfilled') setClaims(c.value);
    } catch (e) {
      console.error('Failed to load system data:', e);
    }
  };

  useEffect(() => {
    loadAllData();
    const interval = setInterval(loadAllData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleVerificationSuccess = (res: FireVerifyResponse) => {
    loadAllData();
    if (res.verification_status === 'CONFIRMED_FIRE') {
      showToast(
        'Fire Verified & Recorded On-Chain!',
        `Tx Hash: ${res.blockchain.tx_hash.slice(0, 10)}... Event ID: ${res.blockchain.event_id.slice(0, 8)}...`,
        'success'
      );
    } else {
      showToast(
        `Arbitration: ${res.verification_status}`,
        res.verification.reason,
        'info'
      );
    }
  };

  const handleProceedToClaim = (eventId: string) => {
    setSelectedEventIdForClaim(eventId);
    setActiveTab('claims');
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans selection:bg-orange-500 selection:text-white">
      {/* Navbar Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        health={health}
        contractAddress={contractAddress}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <DashboardView
            policies={policies}
            fireEvents={fireEvents}
            claims={claims}
            health={health}
            setActiveTab={setActiveTab}
            onSelectEventForClaim={handleProceedToClaim}
          />
        )}

        {activeTab === 'simulator' && (
          <TelemetrySimulatorView
            onVerificationSuccess={handleVerificationSuccess}
            onProceedToClaim={handleProceedToClaim}
          />
        )}

        {activeTab === 'policies' && (
          <PoliciesView
            policies={policies}
            onRefresh={loadAllData}
          />
        )}

        {activeTab === 'claims' && (
          <ClaimsView
            claims={claims}
            fireEvents={fireEvents}
            policies={policies}
            selectedEventId={selectedEventIdForClaim}
            onRefresh={loadAllData}
          />
        )}

        {activeTab === 'blockchain' && (
          <BlockchainLedgerView
            contractAddress={contractAddress}
            fireEvents={fireEvents}
          />
        )}

        {activeTab === 'ai' && (
          <AIModelView />
        )}
      </main>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-slideUp">
          <div className={`flex items-start space-x-3 p-4 rounded-xl border shadow-2xl backdrop-blur-md ${
            toastMessage.type === 'success' 
              ? 'bg-emerald-950/90 border-emerald-500/50 text-white' 
              : toastMessage.type === 'error'
              ? 'bg-rose-950/90 border-rose-500/50 text-white'
              : 'bg-slate-900/90 border-slate-700 text-white'
          }`}>
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <div className="text-xs font-bold">{toastMessage.title}</div>
              <div className="text-[11px] text-slate-300 font-mono mt-0.5">{toastMessage.text}</div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#070a12] py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <Flame className="w-4 h-4 text-orange-500" />
            <span className="font-semibold text-slate-400">PyroAegis Protocol</span>
            <span>&bull;</span>
            <span>Blockchain-Based Automated Fire Insurance Claim System</span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="font-mono text-[11px] text-slate-400">
              Contract: {contractAddress.slice(0, 8)}...{contractAddress.slice(-6)}
            </span>
            <span>&bull;</span>
            <span>FastAPI + Solidity + Web3.py + Random Forest</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
