import React, { useState, useEffect, useCallback, useMemo } from "react";
import { ethers } from "ethers";
import { useWeb3 } from "../context/Web3Context";
import { TransactionReceipt } from "../components/TransactionReceipt";
import { computeSHA256 } from "../utils/crypto";
import { formatPaise, rupeesToPaise, shortenAddress } from "../utils/formatters";
import { CLAIM_STATUS_MAP } from "../config/contract";
import {
  Scale,
  ShieldCheck,
  FileCheck2,
  Upload,
  Copy,
  Check,
  Loader2,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  Clock,
  Calculator,
  Building,
  Box,
  Cpu,
  Trash2,
  CheckCircle2,
  FileBadge2,
  X,
  ChevronRight,
  Info
} from "lucide-react";

interface ClaimRecord {
  claimId: number;
  policyId: number;
  incidentId: number;
  claimant: string;
  assignedSurveyor: string;
  assessmentId: number;
  approvedAmount: bigint;
  settledAmount: bigint;
  status: number;
}

export const SurveyorDashboard: React.FC = () => {
  const { account, contract, readContract, refreshKey, triggerRefresh } = useWeb3();

  // Conditional Form Rendering State (Hidden by default)
  const [showAssessmentForm, setShowAssessmentForm] = useState<boolean>(false);
  const [selectedClaim, setSelectedClaim] = useState<ClaimRecord | null>(null);

  // Assessment Form State
  const [claimId, setClaimId] = useState<string>("");
  const [buildingLoss, setBuildingLoss] = useState<string>("");
  const [contentsLoss, setContentsLoss] = useState<string>("");
  const [machineryLoss, setMachineryLoss] = useState<string>("");
  const [salvageValue, setSalvageValue] = useState<string>("");
  const [reportHash, setReportHash] = useState<string>("");

  // Offline Auto-Hashing State
  const [fileName, setFileName] = useState<string>("");
  const [fileSize, setFileSize] = useState<string>("");
  const [hashingFile, setHashingFile] = useState<boolean>(false);
  const [copiedHash, setCopiedHash] = useState<boolean>(false);

  // Transaction State
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ethers.TransactionReceipt | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Claims Queue State
  const [claims, setClaims] = useState<ClaimRecord[]>([]);
  const [loadingClaims, setLoadingClaims] = useState<boolean>(false);

  // Dynamic Loss Calculations (in Rupees)
  const numBuilding = parseFloat(buildingLoss) || 0;
  const numContents = parseFloat(contentsLoss) || 0;
  const numMachinery = parseFloat(machineryLoss) || 0;
  const numSalvage = parseFloat(salvageValue) || 0;

  const totalQuantifiedLoss = useMemo(() => {
    return numBuilding + numContents + numMachinery;
  }, [numBuilding, numContents, numMachinery]);

  const netGrossLoss = useMemo(() => {
    return Math.max(totalQuantifiedLoss - numSalvage, 0);
  }, [totalQuantifiedLoss, numSalvage]);

  // Client-Side Math Guardrail: salvage cannot exceed total loss
  const isSalvageViolation = useMemo(() => {
    if (numSalvage <= 0) return false;
    return numSalvage > totalQuantifiedLoss;
  }, [numSalvage, totalQuantifiedLoss]);

  // Auto-hash utility using Web Crypto API (crypto.subtle)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setFileSize((file.size / 1024).toFixed(1) + " KB");
    setActionError(null);

    try {
      setHashingFile(true);
      const buffer = await file.arrayBuffer();
      const hash = await computeSHA256(buffer);
      setReportHash(hash);
    } catch (err: any) {
      console.error("Survey report auto-hashing failed:", err);
      setActionError("Failed to hash appraisal report: " + (err.message || String(err)));
    } finally {
      setHashingFile(false);
    }
  };

  const copyHashToClipboard = () => {
    if (!reportHash) return;
    navigator.clipboard.writeText(reportHash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  // Fetch all claims to show assigned surveyor tasks
  const fetchClaims = useCallback(async () => {
    const activeContract = contract || readContract;
    if (!activeContract) return;

    try {
      setLoadingClaims(true);
      const total = await activeContract.getTotalClaims();
      const count = Number(total);
      const list: ClaimRecord[] = [];

      for (let i = 1; i <= count; i++) {
        try {
          const c = await activeContract.getClaim(i);
          if (c && c.exists) {
            list.push({
              claimId: Number(c.claimId),
              policyId: Number(c.policyId),
              incidentId: Number(c.incidentId),
              claimant: c.claimant,
              assignedSurveyor: c.assignedSurveyor,
              assessmentId: Number(c.assessmentId),
              approvedAmount: BigInt(c.approvedAmount.toString()),
              settledAmount: BigInt(c.settledAmount.toString()),
              status: Number(c.status)
            });
          }
        } catch (err) {
          console.warn(`Failed to fetch claim #${i}`, err);
        }
      }

      setClaims(list.reverse());
    } catch (err) {
      console.error("Error loading claims queue:", err);
    } finally {
      setLoadingClaims(false);
    }
  }, [contract, readContract]);

  useEffect(() => {
    fetchClaims();
  }, [fetchClaims, refreshKey]);

  // Open the assessment form for a specific claim
  const handleSelectClaimForAssessment = (c: ClaimRecord) => {
    setSelectedClaim(c);
    setClaimId(c.claimId.toString());
    setBuildingLoss("");
    setContentsLoss("");
    setMachineryLoss("");
    setSalvageValue("");
    setReportHash("");
    setFileName("");
    setFileSize("");
    setActionError(null);
    setShowAssessmentForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Close the assessment form
  const handleCloseForm = () => {
    setShowAssessmentForm(false);
    setSelectedClaim(null);
    setClaimId("");
    setBuildingLoss("");
    setContentsLoss("");
    setMachineryLoss("");
    setSalvageValue("");
    setReportHash("");
    setFileName("");
    setFileSize("");
    setActionError(null);
  };

  // Submit loss assessment on-chain
  const handleSubmitAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setReceipt(null);
    setSuccessMsg(null);

    const parsedClaimId = parseInt(claimId, 10);
    if (!claimId || isNaN(parsedClaimId) || parsedClaimId <= 0) {
      setActionError("Please provide a valid numeric Claim ID.");
      return;
    }

    if (totalQuantifiedLoss <= 0) {
      setActionError("Total loss must be greater than zero. Enter itemized losses.");
      return;
    }

    // Enforce Client-Side Guardrail
    if (isSalvageViolation) {
      setActionError("Salvage Guardrail: Salvage value cannot exceed total loss.");
      return;
    }

    if (!reportHash || !/^0x[0-9a-fA-F]{64}$/.test(reportHash.trim())) {
      setActionError("Please upload a formal survey assessment report to generate the required 32-byte SHA-256 hash.");
      return;
    }

    if (!contract) {
      setActionError("Wallet not connected with signing capability.");
      return;
    }

    try {
      setSubmitting(true);

      // Convert INR Rupees to integer paise for smart contract arithmetic
      const bLoss = rupeesToPaise(buildingLoss);
      const cLoss = rupeesToPaise(contentsLoss);
      const mLoss = rupeesToPaise(machineryLoss);
      const sVal = rupeesToPaise(salvageValue);

      const tx = await contract.submitAssessment(
        BigInt(parsedClaimId),
        bLoss,
        cLoss,
        mLoss,
        sVal,
        reportHash.trim()
      );

      const minedReceipt = await tx.wait();
      setReceipt(minedReceipt);
      setSuccessMsg(`Assessment for Claim #${parsedClaimId} successfully recorded on-chain.`);
      setShowAssessmentForm(false);
      setSelectedClaim(null);
      setClaimId("");
      setBuildingLoss("");
      setContentsLoss("");
      setMachineryLoss("");
      setSalvageValue("");
      setReportHash("");
      setFileName("");
      setFileSize("");
      triggerRefresh();
    } catch (err: any) {
      console.error("Assessment submission error:", err);
      const revertReason =
        err.reason ||
        err.data?.message ||
        err.shortMessage ||
        err.message ||
        "Assessment transaction reverted.";
      setActionError(revertReason);
    } finally {
      setSubmitting(false);
    }
  };

  // Count claims awaiting survey
  const pendingSurveyCount = claims.filter((c) => c.status === 3).length;

  return (
    <div className="space-y-8">
      {/* Banner */}
      <div className="bg-amber-950/40 border border-amber-800/80 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-900/80 border border-amber-700 flex items-center justify-center text-amber-300 shadow-md">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Independent Surveyor Portal</h2>
            <p className="text-xs text-amber-300/80">
              Surveyor: <span className="font-mono text-white">{shortenAddress(account)}</span> • Itemized Damage Quantification • Enforced Mathematical Guardrails
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchClaims()}
            disabled={loadingClaims}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingClaims ? "animate-spin" : ""}`} />
            Refresh Queue
          </button>
        </div>
      </div>

      {/* Global Status Notifications */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs flex items-start gap-2.5 shadow-lg">
          <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5 text-emerald-400" />
          <span className="font-medium">{successMsg}</span>
        </div>
      )}

      {/* Mined Transaction Receipt Component */}
      {receipt && (
        <TransactionReceipt
          receipt={receipt}
          title="Loss Assessment Committed to Blockchain"
          onClose={() => setReceipt(null)}
        />
      )}

      {/* CONDITIONAL RENDERING: Assessment Form (Only renders when explicitly clicked) */}
      {showAssessmentForm && selectedClaim && (
        <div className="bg-slate-900 border border-amber-700/80 rounded-2xl p-6 shadow-2xl space-y-6 animate-in fade-in duration-200">
          <div className="flex items-start justify-between border-b border-slate-800 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-semibold text-white">
                  Quantify Losses for Claim #{selectedClaim.claimId}
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-800">
                  Incident #{selectedClaim.incidentId} • Policy #{selectedClaim.policyId}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Enter itemized physical damage amounts in INR (₹). Enforced guardrails prevent salvage deductions from exceeding total loss.
              </p>
            </div>

            <button
              onClick={handleCloseForm}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Close assessment form"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmitAssessment} className="space-y-6">
            {/* Selected Claim Summary Pill */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">Claim ID:</span>
                <span className="font-mono text-white font-bold">#{selectedClaim.claimId}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Claimant / Policyholder:</span>
                <span className="font-mono text-slate-300">{shortenAddress(selectedClaim.claimant)}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Assigned Surveyor:</span>
                <span className="font-mono text-slate-300">{shortenAddress(selectedClaim.assignedSurveyor)}</span>
              </div>
            </div>

            {/* Itemized Loss Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Building Loss */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-300 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-blue-400" />
                  Building Loss (₹) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0.00"
                  value={buildingLoss}
                  onChange={(e) => setBuildingLoss(e.target.value)}
                  disabled={submitting}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-4 py-2.5 text-sm text-white font-mono placeholder-slate-600 focus:outline-none transition"
                  required
                />
              </div>

              {/* Contents Loss */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-300 flex items-center gap-1.5">
                  <Box className="w-3.5 h-3.5 text-purple-400" />
                  Contents Loss (₹) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0.00"
                  value={contentsLoss}
                  onChange={(e) => setContentsLoss(e.target.value)}
                  disabled={submitting}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-4 py-2.5 text-sm text-white font-mono placeholder-slate-600 focus:outline-none transition"
                  required
                />
              </div>

              {/* Machinery Loss */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-300 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                  Machinery Loss (₹) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0.00"
                  value={machineryLoss}
                  onChange={(e) => setMachineryLoss(e.target.value)}
                  disabled={submitting}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-4 py-2.5 text-sm text-white font-mono placeholder-slate-600 focus:outline-none transition"
                  required
                />
              </div>

              {/* Salvage Value */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-300 flex items-center gap-1.5">
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  Salvage Value (₹) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0.00"
                  value={salvageValue}
                  onChange={(e) => setSalvageValue(e.target.value)}
                  disabled={submitting}
                  className={`w-full bg-slate-950 border ${
                    isSalvageViolation ? "border-rose-500 text-rose-300" : "border-slate-800 focus:border-amber-500 text-white"
                  } rounded-xl px-4 py-2.5 text-sm font-mono placeholder-slate-600 focus:outline-none transition`}
                  required
                />
              </div>
            </div>

            {/* Real-time Math Summary Card */}
            <div className="bg-slate-950 border border-slate-800/90 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <span className="text-[11px] text-slate-400 font-medium">Total Quantified Loss:</span>
                <div className="text-base font-bold font-mono text-slate-200">
                  {formatPaise(rupeesToPaise(totalQuantifiedLoss))}
                </div>
                <p className="text-[10px] text-slate-500">Building + Contents + Machinery</p>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] text-slate-400 font-medium">Salvage Deduction:</span>
                <div className={`text-base font-bold font-mono ${isSalvageViolation ? "text-rose-400" : "text-amber-300"}`}>
                  - {formatPaise(rupeesToPaise(numSalvage))}
                </div>
                <p className="text-[10px] text-slate-500">Recovered salvage value</p>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] text-slate-400 font-medium">Net Gross Loss:</span>
                <div className="text-base font-bold font-mono text-emerald-400">
                  {formatPaise(rupeesToPaise(netGrossLoss))}
                </div>
                <p className="text-[10px] text-slate-500">Pre-deductible baseline</p>
              </div>
            </div>

            {/* Client-Side Guardrail Warning */}
            {isSalvageViolation && (
              <div className="p-4 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs flex items-start gap-3 shadow-lg">
                <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold text-rose-300 block uppercase tracking-wide text-[11px]">
                    Salvage Math Guardrail Violation
                  </span>
                  <p>
                    Salvage value ({formatPaise(rupeesToPaise(numSalvage))}) strictly cannot exceed total quantified loss ({formatPaise(rupeesToPaise(totalQuantifiedLoss))}). The smart contract enforces <code className="font-mono bg-rose-900/60 px-1 py-0.5 rounded">require(salvageValue &lt;= totalLoss)</code> and will revert this transaction.
                  </p>
                </div>
              </div>
            )}

            {/* Offline Auto-Hashing File Input */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-300">
                Surveyor Technical Damage Appraisal Report <span className="text-rose-400">*</span>
              </label>
              <div className="border-2 border-dashed border-slate-800 hover:border-amber-600/60 rounded-xl p-5 text-center bg-slate-950/60 transition group cursor-pointer relative">
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                  onChange={handleFileChange}
                  disabled={submitting || hashingFile}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  required
                />
                <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 group-hover:border-amber-600/50 flex items-center justify-center text-slate-400 group-hover:text-amber-400 transition">
                    {hashingFile ? (
                      <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
                    ) : (
                      <Upload className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-300">
                      {fileName ? (
                        <span className="text-amber-300 font-mono">{fileName} ({fileSize})</span>
                      ) : (
                        <>Click or drop appraisal report to <span className="text-amber-400 font-semibold">auto-generate SHA-256</span></>
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
            {reportHash && (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-medium flex items-center gap-1.5 text-amber-300">
                    <FileBadge2 className="w-4 h-4 text-amber-400" />
                    Calculated SHA-256 Appraisal Hash:
                  </span>
                  <button
                    type="button"
                    onClick={copyHashToClipboard}
                    className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition cursor-pointer"
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
                  {reportHash}
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
                disabled={submitting || !claimId || isSalvageViolation || !reportHash || totalQuantifiedLoss <= 0}
                className="px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-semibold text-sm transition shadow-lg shadow-amber-700/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Mining Loss Assessment...
                  </>
                ) : (
                  <>
                    <Scale className="w-4 h-4" />
                    Commit Loss Assessment On-Chain
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
      {!showAssessmentForm && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2.5">
            <Info className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Click the orange <strong className="text-amber-300">"Assess Claim"</strong> button on any ready claim in the ledger below to launch the itemized loss assessment form.
            </span>
          </div>
          {pendingSurveyCount > 0 && (
            <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-950/80 text-amber-300 border border-amber-800">
              {pendingSurveyCount} Awaiting Assessment
            </span>
          )}
        </div>
      )}

      {/* Assigned Survey Queue & Claims Ledger (Always displayed first) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-amber-400" />
              Assigned Survey Queue & Claims Ledger
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Review assigned fire insurance claims requiring physical loss appraisal
            </p>
          </div>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-800 text-slate-300">
            {claims.length} Total {claims.length === 1 ? "Claim" : "Claims"}
          </span>
        </div>

        {loadingClaims ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-amber-500" />
            <p className="text-xs">Loading smart contract claims queue...</p>
          </div>
        ) : claims.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <Clock className="w-10 h-10 mx-auto text-slate-600" />
            <p className="text-sm font-medium text-slate-400">No Claims Awaiting Survey</p>
            <p className="text-xs max-w-sm mx-auto text-slate-500">
              When an insurer assigns a surveyor to an active fire incident, it will appear here for physical loss quantification.
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
                  <th className="px-5 py-3.5">Assigned Surveyor</th>
                  <th className="px-5 py-3.5">Current Status</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-mono">
                {claims.map((c) => {
                  const isAssignedToMe = account && c.assignedSurveyor.toLowerCase() === account.toLowerCase();
                  const isReadyForAssessment = c.status === 3; // SUBMITTED
                  const isAssessed = c.status >= 4;
                  const isSelected = selectedClaim?.claimId === c.claimId;

                  return (
                    <tr
                      key={c.claimId}
                      className={`transition ${
                        isSelected
                          ? "bg-amber-950/30 border-l-2 border-amber-500"
                          : "hover:bg-slate-800/40"
                      }`}
                    >
                      <td className="px-5 py-4 font-bold text-white">#{c.claimId}</td>
                      <td className="px-5 py-4 text-slate-300">#{c.policyId}</td>
                      <td className="px-5 py-4 text-slate-400">#{c.incidentId}</td>
                      <td className="px-5 py-4 text-slate-300">
                        {c.assignedSurveyor !== ethers.ZeroAddress ? (
                          <span className={isAssignedToMe ? "text-amber-400 font-bold" : "text-slate-400"}>
                            {shortenAddress(c.assignedSurveyor)} {isAssignedToMe && "(You)"}
                          </span>
                        ) : (
                          <span className="text-slate-600 font-sans italic">Unassigned</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-block px-2.5 py-1 rounded-md text-[10px] font-bold border uppercase font-sans tracking-wide bg-slate-800 text-slate-300 border-slate-700">
                          {CLAIM_STATUS_MAP[c.status] || `STATE_${c.status}`}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        {isReadyForAssessment ? (
                          <button
                            onClick={() => handleSelectClaimForAssessment(c)}
                            className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-sans font-semibold text-xs transition flex items-center gap-1 ml-auto cursor-pointer shadow-md shadow-amber-700/20"
                          >
                            <span>Assess Claim</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        ) : isAssessed ? (
                          <span className="text-emerald-400 font-sans text-[11px] font-medium flex items-center gap-1 justify-end">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Assessed
                          </span>
                        ) : (
                          <span className="text-slate-500 font-sans text-[11px]">Pending Verification</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
