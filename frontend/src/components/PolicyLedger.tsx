import React, { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { RefreshCw, Database, Shield, AlertCircle } from "lucide-react";

export interface PolicyRecord {
  id: number;
  policyholderRef: string;
  sumInsured: string;
  startDate: string;
  endDate: string;
  status: "Active" | "Claimed" | "Expired";
}

export interface PolicyLedgerProps {
  contract: ethers.Contract | null;
}

/**
 * Format INR paise into localized currency representation (e.g. ₹50,00,000.00).
 */
const formatINR = (paiseVal: bigint | number | string): string => {
  try {
    const paise = BigInt(paiseVal);
    const rupees = Number(paise) / 100;
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2
    }).format(rupees);
  } catch {
    return "₹0.00";
  }
};

/**
 * Convert Unix timestamp (seconds) to local date string.
 */
const formatDate = (unixSec: bigint | number | string): string => {
  const ts = Number(unixSec);
  if (!ts || ts === 0) return "—";
  return new Date(ts * 1000).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
};

/**
 * Truncate 32-byte cryptographic hash for cleaner visual display.
 */
const truncateHash = (hash: string): string => {
  if (!hash || hash === ethers.ZeroHash) return "—";
  if (hash.length <= 16) return hash;
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
};

export const PolicyLedger: React.FC<PolicyLedgerProps> = ({ contract }) => {
  const [policies, setPolicies] = useState<PolicyRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [filter, setFilter] = useState<string>("All");
  const [error, setError] = useState<string | null>(null);

  const fetchPolicies = useCallback(async () => {
    if (!contract) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Call contract's getTotalPolicies()
      const totalCountBn = await contract.getTotalPolicies();
      const totalPolicies = Number(totalCountBn);
      const fetched: PolicyRecord[] = [];
      const currentUnix = Math.floor(Date.now() / 1000);

      // Wrap contract helper if policyToActiveClaimId getter isn't directly bound in main ABI
      let claimMappingContract: ethers.Contract = contract;
      if (typeof contract.policyToActiveClaimId !== "function") {
        const addr = await contract.getAddress();
        claimMappingContract = new ethers.Contract(
          addr,
          ["function policyToActiveClaimId(uint256) view returns (uint256)"],
          contract.runner
        );
      }

      // 2. Loop from 1 to total policies
      for (let i = 1; i <= totalPolicies; i++) {
        try {
          const [p, activeClaimIdBn] = await Promise.all([
            contract.getPolicy(i),
            claimMappingContract.policyToActiveClaimId(i).catch(() => 0n)
          ]);

          if (p && p.exists) {
            const activeClaimId = Number(activeClaimIdBn);
            const endUnix = Number(p.endDate);

            // 3. Derive status: 'Claimed' | 'Expired' | 'Active'
            let status: "Active" | "Claimed" | "Expired" = "Active";
            if (activeClaimId > 0) {
              status = "Claimed";
            } else if (currentUnix > endUnix) {
              status = "Expired";
            } else {
              status = "Active";
            }

            fetched.push({
              id: Number(p.policyId),
              policyholderRef: p.policyholderReferenceHash,
              sumInsured: formatINR(p.sumInsured),
              startDate: formatDate(p.startDate),
              endDate: formatDate(p.endDate),
              status
            });
          }
        } catch (fetchErr) {
          console.warn(`Failed to fetch policy record #${i}:`, fetchErr);
        }
      }

      // 4. Reverse array so newest policies appear first
      fetched.reverse();
      setPolicies(fetched);
    } catch (err: any) {
      console.error("Error fetching policies for ledger:", err);
      setError(err?.message || "Failed to sync policies from blockchain.");
    } finally {
      setLoading(false);
    }
  }, [contract]);

  // Initial fetch when contract becomes available
  useEffect(() => {
    if (contract) {
      fetchPolicies();
    }
  }, [contract, fetchPolicies]);

  // Filtered policies based on selected dropdown
  const filteredPolicies = policies.filter((p) => {
    if (filter === "All") return true;
    return p.status === filter;
  });

  const getStatusBadge = (status: "Active" | "Claimed" | "Expired") => {
    switch (status) {
      case "Active":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-800">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            Active
          </span>
        );
      case "Claimed":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-950/80 text-amber-300 border border-amber-800">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
            Claimed
          </span>
        );
      case "Expired":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-950/80 text-rose-300 border border-rose-800">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
            Expired
          </span>
        );
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl text-slate-200">
      {/* Header & Controls */}
      <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-950/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-950 border border-blue-800 flex items-center justify-center text-blue-400 shadow-inner">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              Blockchain Policy Ledger
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                {policies.length} {policies.length === 1 ? "Record" : "Records"}
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Live On-Chain Policy Registry & Claim Status Tracker
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Status Filter Dropdown */}
          <div className="flex items-center gap-2">
            <label htmlFor="policy-status-filter" className="text-xs text-slate-400 hidden sm:inline">
              Filter:
            </label>
            <select
              id="policy-status-filter"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Claimed">Claimed</option>
              <option value="Expired">Expired</option>
            </select>
          </div>

          {/* Sync from Blockchain Button */}
          <button
            onClick={fetchPolicies}
            disabled={loading || !contract}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/20 disabled:opacity-50 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Syncing..." : "Sync from Blockchain"}
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="m-4 p-3.5 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span className="font-mono">{error}</span>
        </div>
      )}

      {/* Table Visualizer */}
      <div className="overflow-x-auto">
        <table width="100%" className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/70 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <th className="py-3.5 px-4">Policy ID</th>
              <th className="py-3.5 px-4">Policyholder Ref</th>
              <th className="py-3.5 px-4">Sum Insured</th>
              <th className="py-3.5 px-4">Start Date</th>
              <th className="py-3.5 px-4">End Date</th>
              <th className="py-3.5 px-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-xs text-slate-300">
            {filteredPolicies.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-500">
                  <Shield className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="font-medium text-slate-400">
                    {loading ? "Fetching policy records from contract..." : "No policies match the selected filter."}
                  </p>
                  {!contract && (
                    <p className="text-[11px] text-amber-400/80 mt-1">
                      Connect wallet with an active contract instance to sync.
                    </p>
                  )}
                </td>
              </tr>
            ) : (
              filteredPolicies.map((p) => (
                <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-white">
                    #{p.id}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-300">
                    <span
                      title={p.policyholderRef}
                      className="cursor-help underline decoration-dotted decoration-slate-600"
                    >
                      {truncateHash(p.policyholderRef)}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-semibold text-emerald-400">
                    {p.sumInsured}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[11px] text-slate-300">
                    {p.startDate}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[11px] text-slate-300">
                    {p.endDate}
                  </td>
                  <td className="py-3.5 px-4">
                    {getStatusBadge(p.status)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PolicyLedger;

