import React, { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { useWeb3 } from "../context/Web3Context";
import { TransactionReceipt } from "../components/TransactionReceipt";
import { computeSHA256 } from "../utils/crypto";
import { formatTimestamp, shortenAddress } from "../utils/formatters";
import {
  Flame,
  ShieldCheck,
  Upload,
  Copy,
  Check,
  Loader2,
  AlertCircle,
  RefreshCw,
  Clock,
  CheckCircle2,
  FileText,
  FileBadge2,
  X,
  ChevronRight,
  Info
} from "lucide-react";

interface IncidentRecord {
  incidentId: number;
  policyId: number;
  incidentDate: bigint;
  reportedAt: bigint;
  reportedBy: string;
  incidentReferenceHash: string;
  fireReportHash: string;
  verifiedBy: string;
  verifiedAt: bigint;
  verified: boolean;
}

export const FireOfficerDashboard: React.FC = () => {
  const { account, contract, readContract, refreshKey, triggerRefresh } = useWeb3();

  // Conditional Form Visibility State (Hidden by default)
  const [showVerifyForm, setShowVerifyForm] = useState<boolean>(false);
  const [selectedIncident, setSelectedIncident] = useState<IncidentRecord | null>(null);

  // Verification Form Inputs State
  const [incidentId, setIncidentId] = useState<string>("");
  const [fireReportHash, setFireReportHash] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [fileSize, setFileSize] = useState<string>("");
  const [hashingFile, setHashingFile] = useState<boolean>(false);
  const [copiedHash, setCopiedHash] = useState<boolean>(false);

  // Transaction State
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ethers.TransactionReceipt | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Incident Queue State
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [loadingIncidents, setLoadingIncidents] = useState<boolean>(false);

  // Auto-hash utility using Web Crypto API (crypto.subtle)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setFileSize((file.size / 1024).toFixed(1) + " KB");
    setActionError(null);

    try {
      setHashingFile(true);
      // Read file as ArrayBuffer and compute SHA-256 via crypto.subtle
      const buffer = await file.arrayBuffer();
      const hash = await computeSHA256(buffer);
      setFireReportHash(hash);
    } catch (err: any) {
      console.error("Offline auto-hashing failed:", err);
      setActionError("Failed to hash file locally: " + (err.message || String(err)));
    } finally {
      setHashingFile(false);
    }
  };

  const copyHashToClipboard = () => {
    if (!fireReportHash) return;
    navigator.clipboard.writeText(fireReportHash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  // Fetch all incidents from contract
  const fetchIncidents = useCallback(async () => {
    const activeContract = contract || readContract;
    if (!activeContract) return;

    try {
      setLoadingIncidents(true);
      const total = await activeContract.getTotalIncidents();
      const count = Number(total);
      const list: IncidentRecord[] = [];

      for (let i = 1; i <= count; i++) {
        try {
          const inc = await activeContract.getIncident(i);
          if (inc && inc.exists) {
            list.push({
              incidentId: Number(inc.incidentId),
              policyId: Number(inc.policyId),
              incidentDate: BigInt(inc.incidentDate.toString()),
              reportedAt: BigInt(inc.reportedAt.toString()),
              reportedBy: inc.reportedBy,
              incidentReferenceHash: inc.incidentReferenceHash,
              fireReportHash: inc.fireReportHash,
              verifiedBy: inc.verifiedBy,
              verifiedAt: BigInt(inc.verifiedAt.toString()),
              verified: Boolean(inc.verified)
            });
          }
        } catch (err) {
          console.warn(`Failed to fetch incident #${i}`, err);
        }
      }

      setIncidents(list.reverse()); // latest first
    } catch (err) {
      console.error("Error loading incidents:", err);
    } finally {
      setLoadingIncidents(false);
    }
  }, [contract, readContract]);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents, refreshKey]);

  // Open the verification form for a specific unverified incident
  const handleSelectIncident = (inc: IncidentRecord) => {
    setSelectedIncident(inc);
    setIncidentId(inc.incidentId.toString());
    setFireReportHash("");
    setFileName("");
    setFileSize("");
    setActionError(null);
    setShowVerifyForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Close the verification form
  const handleCloseForm = () => {
    setShowVerifyForm(false);
    setSelectedIncident(null);
    setIncidentId("");
    setFireReportHash("");
    setFileName("");
    setFileSize("");
    setActionError(null);
  };

  // Submit official verification on-chain
  const handleVerifyIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setReceipt(null);
    setSuccessMsg(null);

    const parsedId = parseInt(incidentId, 10);
    if (!incidentId || isNaN(parsedId) || parsedId <= 0) {
      setActionError("Please provide a valid numeric Incident ID.");
      return;
    }

    if (!fireReportHash || !/^0x[0-9a-fA-F]{64}$/.test(fireReportHash.trim())) {
      setActionError("Please upload an official fire report to generate a valid 32-byte SHA-256 hash (0x + 64 hex characters).");
      return;
    }

    if (!contract) {
      setActionError("Wallet not connected with signing capability.");
      return;
    }

    try {
      setSubmitting(true);
      const tx = await contract.verifyIncident(BigInt(parsedId), fireReportHash.trim());
      const minedReceipt = await tx.wait();
      setReceipt(minedReceipt);
      setSuccessMsg(`Incident #${parsedId} successfully certified and verified on-chain.`);
      setShowVerifyForm(false);
      setSelectedIncident(null);
      setIncidentId("");
      setFireReportHash("");
      setFileName("");
      setFileSize("");
      triggerRefresh();
    } catch (err: any) {
      console.error("Incident verification error:", err);
      const revertReason =
        err.reason ||
        err.data?.message ||
        err.shortMessage ||
        err.message ||
        "Verification transaction reverted.";
      setActionError(revertReason);
    } finally {
      setSubmitting(false);
    }
  };

  // Compute unverified count
  const pendingCount = incidents.filter((i) => !i.verified).length;

  return (
    <div className="space-y-8">
      {/* Banner */}
      <div className="bg-rose-950/40 border border-rose-800/80 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-rose-900/80 border border-rose-700 flex items-center justify-center text-rose-300 shadow-md">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Civic Fire Oracle Portal</h2>
            <p className="text-xs text-rose-300/80">
              Fire Officer: <span className="font-mono text-white">{shortenAddress(account)}</span> • Official Certification • Automated Client-Side SHA-256 Hashing
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchIncidents()}
            disabled={loadingIncidents}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingIncidents ? "animate-spin" : ""}`} />
            Refresh Queue
          </button>
        </div>
      </div>

      {/* Global Status Notifications */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs flex items-start gap-2.5 shadow-lg">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-400" />
          <span className="font-medium">{successMsg}</span>
        </div>
      )}

      {/* Mined Transaction Receipt Component */}
      {receipt && (
        <TransactionReceipt
          receipt={receipt}
          title="Incident Certified & Oracle Attestation Mined"
          onClose={() => setReceipt(null)}
        />
      )}

      {/* CONDITIONAL RENDERING: Verification Form (Only renders when explicitly selected) */}
      {showVerifyForm && selectedIncident && (
        <div className="bg-slate-900 border border-rose-800/80 rounded-2xl p-6 shadow-2xl space-y-5 animate-in fade-in duration-200">
          <div className="flex items-start justify-between border-b border-slate-800 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-rose-400" />
                <h3 className="text-base font-semibold text-white">
                  Certify Fire Incident #{selectedIncident.incidentId}
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-950 text-rose-300 border border-rose-800">
                  Policy #{selectedIncident.policyId}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Upload the official Fire Department report. The browser computes the 32-byte SHA-256 hash locally in memory using <span className="font-mono text-slate-300">crypto.subtle</span>. The raw document never leaves your machine.
              </p>
            </div>

            <button
              onClick={handleCloseForm}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Close verification form"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleVerifyIncident} className="space-y-5">
            {/* Incident Details Summary */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">Incident ID:</span>
                <span className="font-mono text-slate-200 font-bold">#{selectedIncident.incidentId}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Occurred On:</span>
                <span className="text-slate-300">{formatTimestamp(selectedIncident.incidentDate)}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Reported By Insurer:</span>
                <span className="font-mono text-slate-300">{shortenAddress(selectedIncident.reportedBy)}</span>
              </div>
            </div>

            {/* Offline Auto-Hashing File Input */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-300">
                Official Fire Department Certification PDF / Report <span className="text-rose-400">*</span>
              </label>
              <div className="border-2 border-dashed border-slate-800 hover:border-rose-600/60 rounded-xl p-5 text-center bg-slate-950/60 transition group cursor-pointer relative">
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                  onChange={handleFileChange}
                  disabled={submitting || hashingFile}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  required
                />
                <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 group-hover:border-rose-600/50 flex items-center justify-center text-slate-400 group-hover:text-rose-400 transition">
                    {hashingFile ? (
                      <Loader2 className="w-5 h-5 animate-spin text-rose-400" />
                    ) : (
                      <Upload className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-300">
                      {fileName ? (
                        <span className="text-rose-300 font-mono">{fileName} ({fileSize})</span>
                      ) : (
                        <>Click or drag file to <span className="text-rose-400 font-semibold">auto-generate SHA-256 fingerprint</span></>
                      )}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Evaluated client-side via native Web Crypto API (<code className="text-slate-400">crypto.subtle</code>)
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Computed Hash Display */}
            {fireReportHash && (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-medium flex items-center gap-1.5 text-rose-300">
                    <FileBadge2 className="w-4 h-4 text-rose-400" />
                    Calculated Cryptographic SHA-256 Digest:
                  </span>
                  <button
                    type="button"
                    onClick={copyHashToClipboard}
                    className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition"
                  >
                    {copiedHash ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="font-mono text-xs text-slate-200 break-all bg-slate-900/90 p-2.5 rounded-lg border border-slate-800/80">
                  {fireReportHash}
                </div>
              </div>
            )}

            {actionError && (
              <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <span className="font-mono">{actionError}</span>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting || !fireReportHash}
                className="px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-semibold text-sm transition shadow-lg shadow-rose-700/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Mining Oracle Verification...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    Commit Fire Verification On-Chain
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleCloseForm}
                disabled={submitting}
                className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Informational Prompt when form is closed */}
      {!showVerifyForm && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2.5">
            <Info className="w-4 h-4 text-rose-400 shrink-0" />
            <span>
              Select an unverified incident from the queue below to open the official verification and document hashing form.
            </span>
          </div>
          {pendingCount > 0 && (
            <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-950/80 text-rose-300 border border-rose-800">
              {pendingCount} Pending Verification
            </span>
          )}
        </div>
      )}

      {/* Incidents Queue Table (Always displayed first) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-rose-400" />
              Assigned Fire Incidents Queue
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Review and select pending fire incidents for official civic oracle certification
            </p>
          </div>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-800 text-slate-300">
            {incidents.length} Total {incidents.length === 1 ? "Incident" : "Incidents"}
          </span>
        </div>

        {loadingIncidents ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-rose-500" />
            <p className="text-xs">Querying blockchain incident ledgers...</p>
          </div>
        ) : incidents.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <Clock className="w-10 h-10 mx-auto text-slate-600" />
            <p className="text-sm font-medium text-slate-400">No Incidents Reported Yet</p>
            <p className="text-xs max-w-sm mx-auto text-slate-500">
              When an insurer reports or formalizes a fire incident on-chain, it will appear in this queue for civic verification.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3.5">Incident ID</th>
                  <th className="px-5 py-3.5">Policy ID</th>
                  <th className="px-5 py-3.5">Incident Date</th>
                  <th className="px-5 py-3.5">Reported By</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Fire Report Hash</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-mono">
                {incidents.map((inc) => (
                  <tr
                    key={inc.incidentId}
                    className={`transition ${
                      selectedIncident?.incidentId === inc.incidentId
                        ? "bg-rose-950/30 border-l-2 border-rose-500"
                        : "hover:bg-slate-800/40"
                    }`}
                  >
                    <td className="px-5 py-4 font-bold text-white">#{inc.incidentId}</td>
                    <td className="px-5 py-4 text-slate-300">#{inc.policyId}</td>
                    <td className="px-5 py-4 text-slate-400 font-sans">
                      {formatTimestamp(inc.incidentDate)}
                    </td>
                    <td className="px-5 py-4 text-slate-400 font-mono">
                      {shortenAddress(inc.reportedBy)}
                    </td>
                    <td className="px-5 py-4">
                      {inc.verified ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold border uppercase font-sans tracking-wide bg-emerald-950/80 text-emerald-300 border-emerald-800">
                          <CheckCircle2 className="w-3 h-3" />
                          Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold border uppercase font-sans tracking-wide bg-amber-950/80 text-amber-300 border-amber-800">
                          <Clock className="w-3 h-3" />
                          Pending Audit
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-slate-400 font-mono text-[11px]">
                      {inc.verified ? (
                        <span title={inc.fireReportHash}>
                          {shortenAddress(inc.fireReportHash, 8, 6)}
                        </span>
                      ) : (
                        <span className="text-slate-600 font-sans italic">Awaiting Certification</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {!inc.verified ? (
                        <button
                          onClick={() => handleSelectIncident(inc)}
                          className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-sans font-semibold text-xs transition flex items-center gap-1 ml-auto cursor-pointer shadow-md shadow-rose-700/20"
                        >
                          <span>Verify Now</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <span className="text-emerald-400 font-sans text-[11px] font-medium flex items-center gap-1 justify-end">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Certified
                        </span>
                      )}
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
