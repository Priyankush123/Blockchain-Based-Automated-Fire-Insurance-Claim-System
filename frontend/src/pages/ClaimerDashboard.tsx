import React, { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { useWeb3 } from "../context/Web3Context";
import { TransactionReceipt } from "../components/TransactionReceipt";
import { CLAIM_STATUS_MAP } from "../config/contract";
import {
  ShieldCheck,
  Send,
  Loader2,
  AlertCircle,
  FileCheck2,
  Clock,
  RefreshCw,
  Hash
} from "lucide-react";
import { formatINRPaise } from "../utils/formatters";

interface UserClaim {
  claimId: number;
  policyId: number;
  incidentId: number;
  claimant: string;
  assignedSurveyor: string;
  approvedAmount: bigint;
  settledAmount: bigint;
  status: number;
}

export const ClaimerDashboard: React.FC = () => {
  const { account, contract, readContract, refreshKey, triggerRefresh } = useWeb3();

  const [policyId, setPolicyId] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ethers.TransactionReceipt | null>(null);

  const [claims, setClaims] = useState<UserClaim[]>([]);
  const [loadingClaims, setLoadingClaims] = useState<boolean>(false);

  // Fetch all claims belonging to the connected claimer address
  const fetchMyClaims = useCallback(async () => {
    const activeContract = contract || readContract;
    if (!activeContract || !account) return;

    try {
      setLoadingClaims(true);
      const total = await activeContract.getTotalClaims();
      const count = Number(total);
      const userList: UserClaim[] = [];

      for (let i = 1; i <= count; i++) {
        try {
          const c = await activeContract.getClaim(i);
          if (c && c.claimant && c.claimant.toLowerCase() === account.toLowerCase()) {
            userList.push({
              claimId: Number(c.claimId),
              policyId: Number(c.policyId),
              incidentId: Number(c.incidentId),
              claimant: c.claimant,
              assignedSurveyor: c.assignedSurveyor,
              approvedAmount: BigInt(c.approvedAmount.toString()),
              settledAmount: BigInt(c.settledAmount.toString()),
              status: Number(c.status)
            });
          }
        } catch (err) {
          console.warn(`Failed to fetch claim #${i}`, err);
        }
      }

      setClaims(userList.reverse()); // most recent first
    } catch (err) {
      console.error("Error loading user claims:", err);
    } finally {
      setLoadingClaims(false);
    }
  }, [account, contract, readContract]);

  useEffect(() => {
    fetchMyClaims();
  }, [fetchMyClaims, refreshKey]);

  // Handle complaint submission
  const handleLodgeComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setReceipt(null);

    const parsedId = parseInt(policyId, 10);
    if (!policyId || isNaN(parsedId) || parsedId <= 0) {
      setActionError("Please enter a valid numeric Policy ID.");
      return;
    }

    if (!contract) {
      setActionError("Wallet not connected or contract unavailable.");
      return;
    }

    try {
      setSubmitting(true);
      const tx = await contract.lodgeComplaint(BigInt(parsedId));
      const minedReceipt = await tx.wait();
      setReceipt(minedReceipt);
      setPolicyId("");
      triggerRefresh();
    } catch (err: any) {
      console.error("Lodge complaint error:", err);
      const revertReason =
        err.reason ||
        err.data?.message ||
        err.shortMessage ||
        err.message ||
        "Transaction failed.";
      setActionError(revertReason);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (statusNum: number) => {
    const label = CLAIM_STATUS_MAP[statusNum] || `STATUS_${statusNum}`;
    switch (label) {
      case "COMPLAINT_LODGED":
        return "bg-amber-950/80 text-amber-300 border-amber-800";
      case "INITIALIZED":
        return "bg-sky-950/80 text-sky-300 border-sky-800";
      case "SUBMITTED":
        return "bg-blue-950/80 text-blue-300 border-blue-800";
      case "ASSESSED":
        return "bg-indigo-950/80 text-indigo-300 border-indigo-800";
      case "APPROVED":
        return "bg-purple-950/80 text-purple-300 border-purple-800";
      case "SETTLED":
        return "bg-emerald-950/80 text-emerald-300 border-emerald-800";
      case "REJECTED":
        return "bg-rose-950/80 text-rose-300 border-rose-800";
      default:
        return "bg-slate-800 text-slate-400 border-slate-700";
    }
  };

  return (
    <div className="space-y-8">
      {/* Banner */}
      <div className="bg-emerald-950/40 border border-emerald-800/80 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-900/80 border border-emerald-700 flex items-center justify-center text-emerald-300 shadow-md">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Claimer Dashboard</h2>
            <p className="text-xs text-emerald-300/80">
              Direct On-Chain Fire Incident Complaint Lodging • Zero Hashes Required
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchMyClaims()}
            disabled={loadingClaims}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingClaims ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Lodge Complaint Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="border-b border-slate-800 pb-3">
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <Send className="w-4 h-4 text-emerald-400" />
            Lodge Fire Insurance Complaint
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Submit your Policy ID to formally initiate a fire claim. The insurer and civic fire oracle will verify the incident on-chain.
          </p>
        </div>

        <form onSubmit={handleLodgeComplaint} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Verified Policy ID <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                step="1"
                placeholder="e.g. 1"
                value={policyId}
                onChange={(e) => setPolicyId(e.target.value)}
                disabled={submitting}
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono transition"
                required
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-500">
                <Hash className="w-4 h-4" />
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Ensure the policy has been verified by the insurer before lodging a complaint.
            </p>
          </div>

          {actionError && (
            <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span className="font-mono">{actionError}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !policyId}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-sm transition shadow-lg shadow-emerald-700/20 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Mining Transaction...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Lodge Complaint On-Chain
              </>
            )}
          </button>
        </form>
      </div>

      {/* Mined Transaction Receipt Component */}
      {receipt && (
        <TransactionReceipt
          receipt={receipt}
          title="Fire Complaint Registered On-Chain"
          onClose={() => setReceipt(null)}
        />
      )}

      {/* Read-Only Table of Claims */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl space-y-0">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-emerald-400" />
              My Complaints & Claims Tracking
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Live read-only status ledger for wallet: <span className="font-mono text-slate-300">{account}</span>
            </p>
          </div>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-800 text-slate-300">
            {claims.length} {claims.length === 1 ? "Record" : "Records"}
          </span>
        </div>

        {loadingClaims ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-500" />
            <p className="text-xs">Querying smart contract claim states...</p>
          </div>
        ) : claims.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <Clock className="w-10 h-10 mx-auto text-slate-600" />
            <p className="text-sm font-medium text-slate-400">No Complaints Lodged Yet</p>
            <p className="text-xs max-w-sm mx-auto text-slate-500">
              When you lodge a complaint using a valid Policy ID above, your complaint and its live progression will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3.5">Claim ID</th>
                  <th className="px-5 py-3.5">Policy ID</th>
                  <th className="px-5 py-3.5">Incident ID</th>
                  <th className="px-5 py-3.5">Approved Amount</th>
                  <th className="px-5 py-3.5">Settled Amount</th>
                  <th className="px-5 py-3.5">Current Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-mono">
                {claims.map((c) => (
                  <tr key={c.claimId} className="hover:bg-slate-800/40 transition">
                    <td className="px-5 py-4 font-bold text-white">#{c.claimId}</td>
                    <td className="px-5 py-4 text-slate-300">#{c.policyId}</td>
                    <td className="px-5 py-4 text-slate-400">
                      {c.incidentId > 0 ? `#${c.incidentId}` : <span className="text-slate-600 font-sans italic">Pending Formalization</span>}
                    </td>
                    <td className="px-5 py-4 text-purple-300 font-sans">
                      {c.approvedAmount > 0n ? formatINRPaise(c.approvedAmount) : "—"}
                    </td>
                    <td className="px-5 py-4 text-emerald-300 font-sans">
                      {c.settledAmount > 0n ? formatINRPaise(c.settledAmount) : "—"}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-bold border uppercase font-sans tracking-wide ${getStatusBadge(
                          c.status
                        )}`}
                      >
                        {CLAIM_STATUS_MAP[c.status] || `STATE_${c.status}`}
                      </span>
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

