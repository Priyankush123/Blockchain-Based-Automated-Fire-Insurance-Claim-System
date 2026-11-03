import React from 'react';
import { 
  ShieldAlert, 
  FileText, 
  ShieldCheck, 
  Coins, 
  Flame, 
  ArrowRight, 
  Zap, 
  Blocks, 
  CheckCircle2, 
  AlertTriangle, 
  Activity, 
  ExternalLink 
} from 'lucide-react';
import { FireEventItem, Policy, Claim, HealthStatus } from '../types';

interface DashboardViewProps {
  policies: Policy[];
  fireEvents: FireEventItem[];
  claims: Claim[];
  health: HealthStatus | null;
  setActiveTab: (tab: string) => void;
  onSelectEventForClaim?: (eventId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  policies,
  fireEvents,
  claims,
  health,
  setActiveTab,
  onSelectEventForClaim
}) => {
  const verifiedEvents = fireEvents.filter(e => e.verified);
  const approvedClaims = claims.filter(c => c.status === 'approved');
  const totalPayout = approvedClaims.reduce((acc, c) => acc + c.payout_amount, 0);
  const approvalRate = claims.length > 0 ? Math.round((approvedClaims.length / claims.length) * 100) : 0;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Banner / Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 p-6 sm:p-8">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-orange-500/10 via-amber-500/5 to-transparent pointer-events-none"></div>
        <div className="max-w-3xl relative z-10 space-y-3">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-semibold">
            <Zap className="w-3.5 h-3.5" />
            <span>Autonomous Smart-Contract Insurance Settlement</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Decentralized Parametric <span className="bg-gradient-to-r from-orange-400 to-amber-300 bg-clip-text text-transparent">Fire Protection</span>
          </h1>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Eliminating traditional claim processing delays. IoT sensors continuously feed telemetry to an AI arbitration engine; confirmed events are immutably signed to the Ethereum blockchain, triggering parametric payouts within seconds.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={() => setActiveTab('simulator')}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-medium text-sm shadow-lg shadow-orange-500/20 transition-all cursor-pointer"
            >
              <Flame className="w-4 h-4" />
              <span>Launch Fire Simulator</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setActiveTab('policies')}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-medium text-sm transition-all cursor-pointer"
            >
              <FileText className="w-4 h-4 text-cyan-400" />
              <span>Manage Policies ({policies.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('blockchain')}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-medium text-sm transition-all cursor-pointer"
            >
              <Blocks className="w-4 h-4 text-emerald-400" />
              <span>Smart Contract Ledger</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Policies */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Parametric Policies</span>
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-white">{policies.length}</span>
            <span className="text-xs text-slate-400">active coverage contracts</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between border-t border-slate-800/80 pt-2">
            <span>Avg Payout:</span>
            <span className="text-slate-300 font-mono font-medium">
              ${policies.length > 0 ? Math.round(policies.reduce((a, b) => a + b.payout_amount, 0) / policies.length).toLocaleString() : 0}
            </span>
          </div>
        </div>

        {/* Card 2: Fire Events Logged */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Incidents Logged</span>
            <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400">
              <Flame className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-white">{fireEvents.length}</span>
            <span className="text-xs text-emerald-400 font-medium">({verifiedEvents.length} Verified)</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between border-t border-slate-800/80 pt-2">
            <span>Blockchain Sync:</span>
            <span className="text-emerald-400 font-medium flex items-center space-x-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>100% On-Chain</span>
            </span>
          </div>
        </div>

        {/* Card 3: Claims Evaluated */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Claims Settled</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-white">{claims.length}</span>
            <span className="text-xs text-emerald-400 font-medium">
              {approvalRate}% Approved
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between border-t border-slate-800/80 pt-2">
            <span>Pending Review:</span>
            <span className="text-amber-400 font-medium font-mono">
              {claims.filter(c => c.status === 'manual_review').length}
            </span>
          </div>
        </div>

        {/* Card 4: Total Payout */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Disbursed Payout</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <Coins className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-white">${totalPayout.toLocaleString()}</span>
            <span className="text-xs text-slate-400">USD</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between border-t border-slate-800/80 pt-2">
            <span>Settlement SLA:</span>
            <span className="text-cyan-400 font-mono font-medium">&lt; 3.0 sec</span>
          </div>
        </div>
      </div>

      {/* Visual Parametric Flow Diagram Card */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6">
        <h2 className="text-lg font-bold text-white mb-1 flex items-center space-x-2">
          <Activity className="w-5 h-5 text-orange-400" />
          <span>Automated Parametric Pipeline Architecture</span>
        </h2>
        <p className="text-xs text-slate-400 mb-6">
          How real-world sensor data flows through the trustless oracle and smart contract payout mechanism.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
          {/* Step 1 */}
          <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-4 space-y-2 relative">
            <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs">
              1
            </div>
            <h3 className="text-sm font-semibold text-white">IoT Sensor Telemetry</h3>
            <p className="text-xs text-slate-400">
              Temperature, smoke level, flame optical detectors, and GPS coordinates continuously ingested.
            </p>
            <div className="text-[11px] text-blue-400 font-mono">POST /api/fire/verify</div>
          </div>

          {/* Step 2 */}
          <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-4 space-y-2">
            <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-xs">
              2
            </div>
            <h3 className="text-sm font-semibold text-white">Hybrid AI Arbitration</h3>
            <p className="text-xs text-slate-400">
              Deterministic rule threshold coupled with Random Forest ML inference to prevent false positives.
            </p>
            <div className="text-[11px] text-purple-400 font-mono">Rule Engine + AI Confidence</div>
          </div>

          {/* Step 3 */}
          <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-4 space-y-2">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xs">
              3
            </div>
            <h3 className="text-sm font-semibold text-white">On-Chain Smart Contract</h3>
            <p className="text-xs text-slate-400">
              Verified fire events are cryptographically recorded to the Ethereum contract with unique event ID.
            </p>
            <div className="text-[11px] text-cyan-400 font-mono">FireInsurance.sol: registerEvent()</div>
          </div>

          {/* Step 4 */}
          <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-4 space-y-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
              4
            </div>
            <h3 className="text-sm font-semibold text-white">Instant Parametric Claim</h3>
            <p className="text-xs text-slate-400">
              Policy parameters are verified against on-chain event data; approved payouts disburse immediately.
            </p>
            <div className="text-[11px] text-emerald-400 font-mono">Status: APPROVED ($ Payout)</div>
          </div>
        </div>
      </div>

      {/* Two Column Section: Recent Incidents & Recent Claims */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Incidents Table */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Flame className="w-5 h-5 text-orange-400" />
              <h2 className="text-base font-bold text-white">Recent Fire Events</h2>
            </div>
            <button
              onClick={() => setActiveTab('simulator')}
              className="text-xs text-orange-400 hover:text-orange-300 font-medium flex items-center space-x-1"
            >
              <span>Simulate New</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {fireEvents.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              No fire events recorded yet. Click "Launch Fire Simulator" above to generate a reading.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800/60 text-slate-400 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Device / Prop</th>
                    <th className="py-2.5 px-3">Temp</th>
                    <th className="py-2.5 px-3">Smoke</th>
                    <th className="py-2.5 px-3">Flame</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {fireEvents.slice(-5).reverse().map((ev) => (
                    <tr key={ev.id} className="hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-mono font-medium text-slate-200">
                        {ev.device_id}
                        <span className="block text-[10px] text-slate-500">{ev.property_id}</span>
                      </td>
                      <td className="py-2.5 px-3 font-mono">
                        <span className={ev.temperature >= 60 ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                          {ev.temperature.toFixed(1)}°C
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono">
                        <span className={ev.smoke_level >= 400 ? 'text-amber-400 font-bold' : 'text-slate-300'}>
                          {ev.smoke_level}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        {ev.flame_detected ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-500/20 text-red-400 font-semibold border border-red-500/30">
                            YES
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400">
                            NO
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        {ev.verified ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-medium">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            <span>VERIFIED</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-400 border border-slate-700">
                            <span>NORMAL</span>
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <button
                          onClick={() => {
                            if (onSelectEventForClaim) onSelectEventForClaim(ev.id);
                            setActiveTab('claims');
                          }}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-cyan-400 font-medium transition-colors"
                        >
                          Claim
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Claims Table */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h2 className="text-base font-bold text-white">Settled Claims</h2>
            </div>
            <button
              onClick={() => setActiveTab('claims')}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center space-x-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {claims.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              No claims processed yet. Go to Claims Settlement to evaluate an event against a policy.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800/60 text-slate-400 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Claim ID</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Payout</th>
                    <th className="py-2.5 px-3">Evaluated At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {claims.slice(-5).reverse().map((cl) => (
                    <tr key={cl.id} className="hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-mono font-medium text-slate-300">
                        {cl.id.slice(0, 8)}...
                      </td>
                      <td className="py-2.5 px-3">
                        {cl.status === 'approved' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30">
                            APPROVED
                          </span>
                        )}
                        {cl.status === 'rejected' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-500/20 text-rose-400 font-semibold border border-rose-500/30">
                            REJECTED
                          </span>
                        )}
                        {cl.status === 'manual_review' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-400 font-semibold border border-amber-500/30">
                            MANUAL REVIEW
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-white">
                        ${cl.payout_amount.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">
                        {new Date(cl.created_at).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
