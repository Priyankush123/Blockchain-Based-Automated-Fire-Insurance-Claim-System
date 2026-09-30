import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Coins, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Play, 
  FileText, 
  Flame, 
  Clock, 
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { Claim, FireEventItem, Policy } from '../types';
import { evaluateClaim } from '../services/api';

interface ClaimsViewProps {
  claims: Claim[];
  fireEvents: FireEventItem[];
  policies: Policy[];
  selectedEventId?: string;
  onRefresh: () => void;
}

export const ClaimsView: React.FC<ClaimsViewProps> = ({
  claims,
  fireEvents,
  policies,
  selectedEventId,
  onRefresh
}) => {
  const [activeEventId, setActiveEventId] = useState(selectedEventId || (fireEvents[0]?.id || ''));
  const [activePolicyId, setActivePolicyId] = useState(policies[0]?.id || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [evaluatedClaim, setEvaluatedClaim] = useState<Claim | null>(null);

  const selectedEvent = fireEvents.find(e => e.id === activeEventId);
  const selectedPolicy = policies.find(p => p.id === activePolicyId);

  // Conditions breakdown
  const isVerified = selectedEvent?.verified ?? false;
  const isTempOk = (selectedEvent && selectedPolicy) ? selectedEvent.temperature >= selectedPolicy.temperature_threshold : false;
  const isSmokeOk = (selectedEvent && selectedPolicy) ? selectedEvent.smoke_level >= selectedPolicy.smoke_threshold : false;
  const isFlameOk = selectedEvent?.flame_detected ?? false;

  const handleEvaluate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEventId || !activePolicyId) {
      setError('Please select both a fire event and an insurance policy');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await evaluateClaim({
        event_id: activeEventId,
        policy_id: activePolicyId
      });
      setEvaluatedClaim(res);
      onRefresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to evaluate claim');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Title */}
      <div>
        <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
          <ShieldCheck className="w-4 h-4" />
          <span>Parametric Smart Settlement</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
          Automated Claim Evaluation & Settlement
        </h2>
        <p className="text-slate-400 text-sm mt-1 max-w-3xl">
          Zero-human-touch claims processing. Select an on-chain fire event and a policy contract to execute algorithmic settlement. When all conditions match, funds are immediately cleared for payout.
        </p>
      </div>

      {/* Claim Evaluation Engine Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
        <h3 className="text-base font-bold text-white flex items-center space-x-2 border-b border-slate-800 pb-3">
          <Play className="w-4 h-4 text-emerald-400 fill-emerald-400" />
          <span>Execute Parametric Claim Evaluation</span>
        </h3>

        <form onSubmit={handleEvaluate} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Event Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                <Flame className="w-4 h-4 text-orange-400" />
                <span>Target Fire Event (On-Chain)</span>
              </label>
              {fireEvents.length === 0 ? (
                <div className="text-xs text-slate-500 bg-slate-950 p-3 rounded-lg border border-slate-800">
                  No fire events available. Simulate a fire in the IoT Simulator tab first.
                </div>
              ) : (
                <select
                  value={activeEventId}
                  onChange={e => setActiveEventId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  {fireEvents.map(ev => (
                    <option key={ev.id} value={ev.id}>
                      {ev.device_id} ({ev.property_id}) - {ev.temperature}°C, {ev.smoke_level} smoke, {ev.verified ? 'VERIFIED' : 'UNVERIFIED'} [{ev.id.slice(0, 8)}]
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Policy Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                <FileText className="w-4 h-4 text-cyan-400" />
                <span>Active Coverage Policy</span>
              </label>
              {policies.length === 0 ? (
                <div className="text-xs text-slate-500 bg-slate-950 p-3 rounded-lg border border-slate-800">
                  No active policies. Create one in the Policies tab.
                </div>
              ) : (
                <select
                  value={activePolicyId}
                  onChange={e => setActivePolicyId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  {policies.map(p => (
                    <option key={p.id} value={p.id}>
                      Policy {p.id.slice(0, 8)}: ≥{p.temperature_threshold}°C, ≥{p.smoke_threshold} smoke (${p.payout_amount.toLocaleString()})
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Real-time Pre-Flight Condition Verification Checklist */}
          {selectedEvent && selectedPolicy && (
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Pre-Flight Condition Assessment
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                {/* Check 1 */}
                <div className={`p-3 rounded-lg border ${isVerified ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300' : 'bg-rose-950/20 border-rose-500/30 text-rose-300'}`}>
                  <div className="flex items-center space-x-1.5 font-bold mb-1">
                    {isVerified ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-rose-400" />}
                    <span>AI / Oracle Verified</span>
                  </div>
                  <div className="text-[11px] opacity-80">
                    Status: {isVerified ? 'CONFIRMED' : 'REJECTED/NORMAL'}
                  </div>
                </div>

                {/* Check 2 */}
                <div className={`p-3 rounded-lg border ${isTempOk ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300' : 'bg-rose-950/20 border-rose-500/30 text-rose-300'}`}>
                  <div className="flex items-center space-x-1.5 font-bold mb-1">
                    {isTempOk ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-rose-400" />}
                    <span>Temperature Check</span>
                  </div>
                  <div className="text-[11px] opacity-80 font-mono">
                    {selectedEvent.temperature}°C ≥ {selectedPolicy.temperature_threshold}°C
                  </div>
                </div>

                {/* Check 3 */}
                <div className={`p-3 rounded-lg border ${isSmokeOk ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300' : 'bg-rose-950/20 border-rose-500/30 text-rose-300'}`}>
                  <div className="flex items-center space-x-1.5 font-bold mb-1">
                    {isSmokeOk ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-rose-400" />}
                    <span>Smoke Density Check</span>
                  </div>
                  <div className="text-[11px] opacity-80 font-mono">
                    {selectedEvent.smoke_level} ≥ {selectedPolicy.smoke_threshold} PPM
                  </div>
                </div>

                {/* Check 4 */}
                <div className={`p-3 rounded-lg border ${isFlameOk ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300' : 'bg-rose-950/20 border-rose-500/30 text-rose-300'}`}>
                  <div className="flex items-center space-x-1.5 font-bold mb-1">
                    {isFlameOk ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-rose-400" />}
                    <span>Flame Optical Check</span>
                  </div>
                  <div className="text-[11px] opacity-80">
                    Optical sensor: {isFlameOk ? 'DETECTED' : 'NOT DETECTED'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 text-xs">
              {error}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading || fireEvents.length === 0 || policies.length === 0}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center space-x-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Evaluating Claim Conditions...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Execute Claim Evaluation</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Claim Settlement Result Notification */}
        {evaluatedClaim && (
          <div className={`p-5 rounded-2xl border transition-all animate-fadeIn ${
            evaluatedClaim.status === 'approved'
              ? 'bg-emerald-950/30 border-emerald-500/50 glow-verified'
              : evaluatedClaim.status === 'rejected'
              ? 'bg-rose-950/30 border-rose-500/50'
              : 'bg-amber-950/30 border-amber-500/50'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center space-x-3">
                {evaluatedClaim.status === 'approved' && (
                  <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                )}
                {evaluatedClaim.status === 'rejected' && (
                  <div className="p-3 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                    <XCircle className="w-6 h-6" />
                  </div>
                )}
                {evaluatedClaim.status === 'manual_review' && (
                  <div className="p-3 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                )}

                <div>
                  <div className="text-xs text-slate-400">Claim Settlement Verdict:</div>
                  <div className="text-xl font-black text-white uppercase tracking-tight">
                    {evaluatedClaim.status}
                  </div>
                  <div className="text-xs text-slate-300 font-mono mt-0.5">
                    Claim ID: {evaluatedClaim.id}
                  </div>
                </div>
              </div>

              <div className="text-right sm:border-l sm:border-slate-800 sm:pl-6">
                <span className="text-xs text-slate-400 block">Indemnity Disbursed:</span>
                <span className="text-2xl font-black font-mono text-emerald-400">
                  ${evaluatedClaim.payout_amount.toLocaleString()} USD
                </span>
                <span className="text-[10px] text-slate-500 block">Parametric Immediate Credit</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Historical Claims Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center space-x-2">
            <Coins className="w-5 h-5 text-amber-400" />
            <span>Claims Settlement Ledger</span>
          </h3>
          <span className="text-xs text-slate-500">{claims.length} total claims evaluated</span>
        </div>

        {claims.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-xs">
            No claims recorded. Use the form above to evaluate a fire incident against an active policy.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/60 text-slate-400 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Claim ID</th>
                  <th className="py-3 px-4">Event Ref</th>
                  <th className="py-3 px-4">Policy Ref</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Payout Disbursed</th>
                  <th className="py-3 px-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {claims.map((cl) => (
                  <tr key={cl.id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-mono font-medium text-white">
                      {cl.id.slice(0, 10)}...
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {cl.event_id.slice(0, 8)}...
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {cl.policy_id.slice(0, 8)}...
                    </td>
                    <td className="py-3 px-4">
                      {cl.status === 'approved' && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                          APPROVED
                        </span>
                      )}
                      {cl.status === 'rejected' && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] bg-rose-500/20 text-rose-400 font-bold border border-rose-500/30">
                          REJECTED
                        </span>
                      )}
                      {cl.status === 'manual_review' && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30">
                          MANUAL REVIEW
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-400 text-sm">
                      ${cl.payout_amount.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                      {new Date(cl.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
