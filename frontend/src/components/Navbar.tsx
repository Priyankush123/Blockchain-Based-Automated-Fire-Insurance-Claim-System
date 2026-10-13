import React, { useState } from 'react';
import { 
  Flame, 
  LayoutDashboard, 
  FileText, 
  ShieldCheck, 
  Blocks, 
  BrainCircuit, 
  CheckCircle2, 
  XCircle, 
  Copy, 
  Check, 
  ExternalLink 
} from 'lucide-react';
import { HealthStatus } from '../types';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  health: HealthStatus | null;
  contractAddress: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  health,
  contractAddress,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(contractAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'simulator', label: 'IoT Telemetry & Simulator', icon: Flame },
    { id: 'policies', label: 'Policies', icon: FileText },
    { id: 'claims', label: 'Claims Settlement', icon: ShieldCheck },
    { id: 'blockchain', label: 'Blockchain Audit', icon: Blocks },
    { id: 'ai', label: 'AI Analytics', icon: BrainCircuit },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#0d121f]/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand & Logo */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-600 via-red-500 to-amber-400 flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Flame className="w-6 h-6 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                  PyroAegis
                </span>
                <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">
                  Parametric
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">Automated Fire Insurance Protocol</p>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-slate-800/90 text-white shadow-inner border border-slate-700/80'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-orange-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Status Badges & Smart Contract Pill */}
          <div className="flex items-center space-x-3">
            {/* AI Model Badge */}
            <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs">
              <BrainCircuit className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-slate-400">AI Engine:</span>
              <span className={health?.model_loaded ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                {health?.model_loaded ? 'Active' : 'Offline'}
              </span>
            </div>

            {/* Blockchain Node Status Badge */}
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
              <span className="text-slate-400 hidden sm:inline">EVM Node:</span>
              <span className="text-emerald-400 font-medium">8545</span>
            </div>

            {/* Smart Contract Pill with Copy */}
            <button
              onClick={handleCopy}
              title="Click to copy contract address"
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-800/70 hover:bg-slate-800 border border-slate-700 text-xs text-slate-300 font-mono transition-colors"
            >
              <Blocks className="w-3.5 h-3.5 text-cyan-400" />
              <span>{contractAddress ? `${contractAddress.slice(0, 6)}...${contractAddress.slice(-4)}` : 'Deploying...'}</span>
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="md:hidden flex overflow-x-auto py-2 space-x-1 border-t border-slate-800/80">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-slate-800 text-white border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-orange-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
