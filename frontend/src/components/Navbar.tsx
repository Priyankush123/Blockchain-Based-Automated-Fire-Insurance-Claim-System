import React, { useState } from 'react';
import { 
  Flame, 
  LayoutDashboard, 
  FileText, 
  ShieldCheck, 
  Blocks, 
  BrainCircuit, 
  Copy, 
  Check 
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
    { id: 'dashboard', label: 'Dashboard', shortLabel: 'Dashboard', icon: LayoutDashboard },
    { id: 'simulator', label: 'Telemetry Simulator', shortLabel: 'Simulator', icon: Flame },
    { id: 'policies', label: 'Policies', shortLabel: 'Policies', icon: FileText },
    { id: 'claims', label: 'Claims Settlement', shortLabel: 'Claims', icon: ShieldCheck },
    { id: 'blockchain', label: 'Blockchain Audit', shortLabel: 'Blockchain', icon: Blocks },
    { id: 'ai', label: 'AI Analytics', shortLabel: 'AI Model', icon: BrainCircuit },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#0d121f]/95 backdrop-blur-md border-b border-slate-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3 lg:gap-6">
          {/* Brand & Logo */}
          <div 
            className="flex items-center space-x-3 cursor-pointer shrink-0 select-none" 
            onClick={() => setActiveTab('dashboard')}
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-600 via-red-500 to-amber-400 flex items-center justify-center shadow-md shadow-orange-500/20 shrink-0">
              <Flame className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div className="flex flex-col justify-center">
              <div className="flex items-center space-x-1.5 leading-tight">
                <span className="font-extrabold text-base lg:text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                  PyroAegis
                </span>
                <span className="text-[9px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">
                  Parametric
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden xl:block leading-none mt-0.5">Automated Fire Insurance Protocol</p>
            </div>
          </div>

          {/* Navigation Items (Single Line, Perfectly Centered and Aligned) */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-1.5 shrink-0">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center space-x-2 px-3 h-9 rounded-lg text-xs lg:text-sm font-medium whitespace-nowrap shrink-0 transition-all ${
                    isActive
                      ? 'bg-slate-800 text-white shadow-sm border border-slate-700/90 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-orange-400' : 'text-slate-400'}`} />
                  <span className="hidden xl:inline">{item.label}</span>
                  <span className="inline xl:hidden">{item.shortLabel}</span>
                </button>
              );
            })}
          </nav>

          {/* Status Badges & Smart Contract Pill */}
          <div className="flex items-center space-x-2 lg:space-x-3 shrink-0">
            {/* AI Model Badge */}
            <div className="hidden xl:flex items-center space-x-1.5 px-2.5 h-8 rounded-full bg-slate-900 border border-slate-800 text-xs shrink-0 whitespace-nowrap">
              <BrainCircuit className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span className="text-slate-400">AI Engine:</span>
              <span className={health?.model_loaded ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                {health?.model_loaded ? 'Active' : 'Offline'}
              </span>
            </div>

            {/* Blockchain Node Status Badge */}
            <div className="hidden sm:flex items-center space-x-1.5 px-2.5 h-8 rounded-full bg-slate-900 border border-slate-800 text-xs shrink-0 whitespace-nowrap">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></div>
              <span className="text-slate-400">EVM:</span>
              <span className="text-emerald-400 font-medium">8545</span>
            </div>

            {/* Smart Contract Pill with Copy */}
            <button
              onClick={handleCopy}
              title="Click to copy contract address"
              className="flex items-center space-x-1.5 px-2.5 h-8 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-xs text-slate-300 font-mono transition-colors shrink-0 whitespace-nowrap"
            >
              <Blocks className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>{contractAddress ? `${contractAddress.slice(0, 6)}...${contractAddress.slice(-4)}` : 'Deploying...'}</span>
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="md:hidden flex overflow-x-auto py-2 space-x-1.5 border-t border-slate-800/80 no-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center space-x-1.5 px-3 h-8 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                  isActive
                    ? 'bg-slate-800 text-white border border-slate-700 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-orange-400' : 'text-slate-400'}`} />
                <span>{item.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
