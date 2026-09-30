import React, { useState } from 'react';
import { 
  FileText, 
  Plus, 
  Trash2, 
  Shield, 
  Thermometer, 
  Wind, 
  Clock, 
  Coins, 
  CheckCircle2, 
  Sparkles, 
  X 
} from 'lucide-react';
import { Policy, PolicyCreateInput } from '../types';
import { createPolicy, deletePolicy } from '../services/api';

interface PoliciesViewProps {
  policies: Policy[];
  onRefresh: () => void;
}

export const PoliciesView: React.FC<PoliciesViewProps> = ({ policies, onRefresh }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<PolicyCreateInput>({
    temperature_threshold: 60.0,
    smoke_threshold: 400,
    required_duration_seconds: 5,
    payout_amount: 100000.0
  });

  const templates = [
    {
      name: 'High-Risk Chemical Facility',
      desc: 'Rapid trigger, lower smoke threshold, highest indemnity',
      data: {
        temperature_threshold: 50.0,
        smoke_threshold: 300,
        required_duration_seconds: 3,
        payout_amount: 250000.0
      }
    },
    {
      name: 'Commercial Enterprise Standard',
      desc: 'Balanced parameters for office buildings & shopping centers',
      data: {
        temperature_threshold: 60.0,
        smoke_threshold: 400,
        required_duration_seconds: 5,
        payout_amount: 100000.0
      }
    },
    {
      name: 'Residential Condominium',
      desc: 'Higher threshold to prevent nuisance kitchen alarms',
      data: {
        temperature_threshold: 65.0,
        smoke_threshold: 450,
        required_duration_seconds: 5,
        payout_amount: 50000.0
      }
    }
  ];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await createPolicy(formData);
      setModalOpen(false);
      onRefresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create policy');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this policy contract?')) return;
    try {
      await deletePolicy(id);
      onRefresh();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete policy');
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Title & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-cyan-400">
            <Shield className="w-4 h-4" />
            <span>Parametric Underwriting</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
            Active Insurance Policies
          </h2>
          <p className="text-slate-400 text-sm mt-1 max-w-2xl">
            Parametric policies define the deterministic oracle triggers. Once a verified fire event satisfies these specific thresholds, claims are guaranteed instant algorithmic disbursement.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold text-sm shadow-lg shadow-cyan-500/20 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Policy Contract</span>
        </button>
      </div>

      {/* Policies Grid */}
      {policies.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/60 border border-slate-800 rounded-2xl p-8 space-y-4">
          <FileText className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-lg font-bold text-slate-300">No Active Policies Configured</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Create your first parametric policy contract by clicking the button above or selecting one of our standardized industrial risk templates.
          </p>
          <button
            onClick={() => setModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold"
          >
            Create Policy Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {policies.map((policy) => (
            <div
              key={policy.id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 space-y-4 transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-mono text-slate-400">
                        ID: {policy.id.slice(0, 10)}...
                      </div>
                      <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
                        Active Coverage
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(policy.id)}
                    title="Delete Policy"
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 flex items-center space-x-1.5">
                      <Thermometer className="w-3.5 h-3.5 text-rose-400" />
                      <span>Temp Trigger:</span>
                    </span>
                    <span className="font-mono font-bold text-white">
                      ≥ {policy.temperature_threshold}°C
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 flex items-center space-x-1.5">
                      <Wind className="w-3.5 h-3.5 text-amber-400" />
                      <span>Smoke Trigger:</span>
                    </span>
                    <span className="font-mono font-bold text-white">
                      ≥ {policy.smoke_threshold} PPM
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 flex items-center space-x-1.5">
                      <Clock className="w-3.5 h-3.5 text-blue-400" />
                      <span>Sustained Time:</span>
                    </span>
                    <span className="font-mono font-bold text-white">
                      ≥ {policy.required_duration_seconds} sec
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400 flex items-center space-x-1">
                  <Coins className="w-3.5 h-3.5 text-amber-400" />
                  <span>Max Payout:</span>
                </span>
                <span className="text-sm font-black text-amber-400 font-mono">
                  ${policy.payout_amount.toLocaleString()} USD
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Policy Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <FileText className="w-5 h-5 text-cyan-400" />
                <span>Issue Parametric Policy Contract</span>
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Presets */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-300 flex items-center space-x-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Quick Template Fill</span>
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {templates.map((tpl, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setFormData(tpl.data)}
                    className="p-2 text-left rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs hover:border-cyan-500/50 cursor-pointer"
                  >
                    <div className="font-bold text-slate-200 truncate">{tpl.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">${tpl.data.payout_amount.toLocaleString()}</div>
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Temperature Trigger Threshold (°C)
                </label>
                <input
                  type="number"
                  step="0.5"
                  required
                  value={formData.temperature_threshold}
                  onChange={e => setFormData({ ...formData, temperature_threshold: parseFloat(e.target.value) })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Smoke Density Threshold (PPM / ADC)
                </label>
                <input
                  type="number"
                  step="1"
                  required
                  value={formData.smoke_threshold}
                  onChange={e => setFormData({ ...formData, smoke_threshold: parseInt(e.target.value) })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Required Duration (seconds)
                </label>
                <input
                  type="number"
                  step="1"
                  required
                  value={formData.required_duration_seconds}
                  onChange={e => setFormData({ ...formData, required_duration_seconds: parseInt(e.target.value) })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Parametric Payout Indemnity ($ USD)
                </label>
                <input
                  type="number"
                  step="1000"
                  required
                  value={formData.payout_amount}
                  onChange={e => setFormData({ ...formData, payout_amount: parseFloat(e.target.value) })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              {error && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 text-xs">
                  {error}
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Deploy Policy Contract'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
