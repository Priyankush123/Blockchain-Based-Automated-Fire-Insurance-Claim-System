import React, { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { useWeb3 } from "../context/Web3Context";
import { TransactionReceipt } from "../components/TransactionReceipt";
import { ROLE_ENUM } from "../config/contract";
import {
  ShieldAlert,
  UserPlus,
  Loader2,
  AlertCircle,
  FileText,
  Flame,
  FileCheck2,
  RefreshCw,
  Layers,
  CheckCircle2,
  UserMinus
} from "lucide-react";
import { shortenAddress } from "../utils/formatters";

interface GlobalMetrics {
  totalPolicies: number;
  totalIncidents: number;
  totalClaims: number;
  totalAssessments: number;
}

export const AdminDashboard: React.FC = () => {
  const { contract, readContract, refreshKey, triggerRefresh } = useWeb3();

  // Metrics state
  const [metrics, setMetrics] = useState<GlobalMetrics>({
    totalPolicies: 0,
    totalIncidents: 0,
    totalClaims: 0,
    totalAssessments: 0
  });
  const [loadingMetrics, setLoadingMetrics] = useState<boolean>(false);

  // Registration Form State
  const [targetAddress, setTargetAddress] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<number>(ROLE_ENUM.INSURER);
  const [registering, setRegistering] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ethers.TransactionReceipt | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Revocation Form State
  const [revokeAddress, setRevokeAddress] = useState<string>("");
  const [revokeRole, setRevokeRole] = useState<number>(ROLE_ENUM.INSURER);
  const [revoking, setRevoking] = useState<boolean>(false);
  const [revokeError, setRevokeError] = useState<string | null>(null);
  const [revokeReceipt, setRevokeReceipt] = useState<ethers.TransactionReceipt | null>(null);

  // Fetch Global Metrics from Smart Contract
  const fetchMetrics = useCallback(async () => {
    const activeContract = contract || readContract;
    if (!activeContract) return;

    try {
      setLoadingMetrics(true);
      const [policies, incidents, claims, assessments] = await Promise.all([
        activeContract.getTotalPolicies(),
        activeContract.getTotalIncidents(),
        activeContract.getTotalClaims(),
        activeContract.getTotalAssessments()
      ]);

      setMetrics({
        totalPolicies: Number(policies),
        totalIncidents: Number(incidents),
        totalClaims: Number(claims),
        totalAssessments: Number(assessments)
      });
    } catch (err) {
      console.error("Error fetching global contract metrics:", err);
    } finally {
      setLoadingMetrics(false);
    }
  }, [contract, readContract]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics, refreshKey]);

  // Handle Stakeholder Registration
  const handleRegisterStakeholder = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setReceipt(null);
    setSuccessMessage(null);

    if (!ethers.isAddress(targetAddress)) {
      setFormError("Please enter a valid Ethereum address (0x...)");
      return;
    }

    if (!contract) {
      setFormError("Smart contract signer not connected.");
      return;
    }

    try {
      setRegistering(true);
      const checksumAddress = ethers.getAddress(targetAddress);
      const tx = await contract.registerStakeholder(checksumAddress, selectedRole);
      const minedReceipt = await tx.wait();
      setReceipt(minedReceipt);
      setSuccessMessage(`Address ${shortenAddress(checksumAddress)} successfully registered.`);
      setTargetAddress("");
      triggerRefresh();
    } catch (err: any) {
      console.error("Stakeholder registration error:", err);
      const revertReason =
        err.reason ||
        err.data?.message ||
        err.shortMessage ||
        err.message ||
        "Registration failed.";
      setFormError(revertReason);
    } finally {
      setRegistering(false);
    }
  };

  // Handle Stakeholder Revocation
  const handleRevokeStakeholder = async (e: React.FormEvent) => {
    e.preventDefault();
    setRevokeError(null);
    setRevokeReceipt(null);

    if (!ethers.isAddress(revokeAddress)) {
      setRevokeError("Please enter a valid Ethereum address (0x...)");
      return;
    }

    if (!contract) {
      setRevokeError("Smart contract signer not connected.");
      return;
    }

    try {
      setRevoking(true);
      const checksumAddress = ethers.getAddress(revokeAddress);
      const tx = await contract.revokeStakeholder(checksumAddress, revokeRole);
      const minedReceipt = await tx.wait();
      setRevokeReceipt(minedReceipt);
      setRevokeAddress("");
      triggerRefresh();
    } catch (err: any) {
      console.error("Stakeholder revocation error:", err);
      const revertReason =
        err.reason ||
        err.data?.message ||
        err.shortMessage ||
        err.message ||
        "Revocation failed.";
      setRevokeError(revertReason);
    } finally {
      setRevoking(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Banner */}
      <div className="bg-purple-950/40 border border-purple-800/80 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-purple-900/80 border border-purple-700 flex items-center justify-center text-purple-300 shadow-md">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Admin Governance Portal</h2>
            <p className="text-xs text-purple-300/80">
              Role-Based Access Control (RBAC) Management • Global Contract Ledger Status
            </p>
          </div>
        </div>
        <button
          onClick={() => fetchMetrics()}
          disabled={loadingMetrics}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingMetrics ? "animate-spin" : ""}`} />
          Refresh Stats
        </button>
      </div>

      {/* Contract Global Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-blue-400" />
              Total Policies
            </span>
            <span className="text-[10px] font-mono uppercase bg-blue-950/60 text-blue-300 border border-blue-900 px-1.5 py-0.5 rounded">
              Active
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {metrics.totalPolicies}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Registered & verified policies
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-rose-400" />
              Total Incidents
            </span>
            <span className="text-[10px] font-mono uppercase bg-rose-950/60 text-rose-300 border border-rose-900 px-1.5 py-0.5 rounded">
              Oracle
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {metrics.totalIncidents}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Formalized fire incidents
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium flex items-center gap-1.5">
              <FileCheck2 className="w-4 h-4 text-emerald-400" />
              Total Claims
            </span>
            <span className="text-[10px] font-mono uppercase bg-emerald-950/60 text-emerald-300 border border-emerald-900 px-1.5 py-0.5 rounded">
              Settlements
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {metrics.totalClaims}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Complaints & formal claims
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-amber-400" />
              Total Assessments
            </span>
            <span className="text-[10px] font-mono uppercase bg-amber-950/60 text-amber-300 border border-amber-900 px-1.5 py-0.5 rounded">
              Surveyor
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {metrics.totalAssessments}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Itemized loss appraisals
          </div>
        </div>
      </div>

      {/* Stakeholder Registration Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
        <div className="border-b border-slate-800 pb-3">
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-purple-400" />
            Register Stakeholder Role
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Assign on-chain cryptographic roles to wallet addresses using OpenZeppelin AccessControl.
          </p>
        </div>

        <form onSubmit={handleRegisterStakeholder} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Stakeholder Wallet Address <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                placeholder="0x..."
                value={targetAddress}
                onChange={(e) => setTargetAddress(e.target.value)}
                disabled={registering}
                className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono transition"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Select Stakeholder Role <span className="text-rose-400">*</span>
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(Number(e.target.value))}
                disabled={registering}
                className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500 transition cursor-pointer"
              >
                <option value={ROLE_ENUM.INSURER}>Insurer (Underwriting & Claims)</option>
                <option value={ROLE_ENUM.FIRE_OFFICER}>Fire Officer (Civic Oracle)</option>
                <option value={ROLE_ENUM.SURVEYOR}>Surveyor (Independent Loss Assessor)</option>
                <option value={ROLE_ENUM.CLAIMER}>Claimer (Policyholder / Complainant)</option>
              </select>
            </div>
          </div>

          {formError && (
            <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span className="font-mono">{formError}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={registering || !targetAddress}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold text-sm transition shadow-lg shadow-purple-700/20 flex items-center justify-center gap-2"
          >
            {registering ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Registering On-Chain...
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                Register Stakeholder
              </>
            )}
          </button>
        </form>
      </div>

      {/* Mined Transaction Receipt Component */}
      {receipt && (
        <TransactionReceipt
          receipt={receipt}
          title="Stakeholder Registered On-Chain"
          onClose={() => setReceipt(null)}
        />
      )}

      {/* Stakeholder Revocation Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
        <div className="border-b border-slate-800 pb-3">
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <UserMinus className="w-4 h-4 text-rose-400" />
            Revoke Stakeholder Role
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Strip on-chain authority from an address by calling <code className="text-slate-300 font-mono">revokeStakeholder</code>.
          </p>
        </div>

        <form onSubmit={handleRevokeStakeholder} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Stakeholder Wallet Address <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                placeholder="0x..."
                value={revokeAddress}
                onChange={(e) => setRevokeAddress(e.target.value)}
                disabled={revoking}
                className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-rose-500 font-mono transition"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Role to Revoke <span className="text-rose-400">*</span>
              </label>
              <select
                value={revokeRole}
                onChange={(e) => setRevokeRole(Number(e.target.value))}
                disabled={revoking}
                className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-rose-500 transition cursor-pointer"
              >
                <option value={ROLE_ENUM.INSURER}>InsURER</option>
                <option value={ROLE_ENUM.FIRE_OFFICER}>FIRE_OFFICER</option>
                <option value={ROLE_ENUM.SURVEYOR}>SURVEYOR</option>
                <option value={ROLE_ENUM.CLAIMER}>CLAIMER</option>
              </select>
            </div>
          </div>

          {revokeError && (
            <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span className="font-mono">{revokeError}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={revoking || !revokeAddress}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-semibold text-sm transition shadow-lg shadow-rose-700/20 flex items-center justify-center gap-2"
          >
            {revoking ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Revoking On-Chain...
              </>
            ) : (
              <>
                <UserMinus className="w-4 h-4" />
                Revoke Role
              </>
            )}
          </button>
        </form>

        {revokeReceipt && (
          <TransactionReceipt
            receipt={revokeReceipt}
            title="Stakeholder Revoked On-Chain"
            onClose={() => setRevokeReceipt(null)}
          />
        )}
      </div>
    </div>
  );
};

