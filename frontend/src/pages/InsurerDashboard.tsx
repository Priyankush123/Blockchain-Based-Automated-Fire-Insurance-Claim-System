import React, { useState, useEffect, useCallback, useMemo } from "react";
import { ethers } from "ethers";
import { useWeb3 } from "../context/Web3Context";
import { TransactionReceipt } from "../components/TransactionReceipt";
import { computeSHA256, hashString } from "../utils/crypto";
import { formatPaise, rupeesToPaise, shortenAddress } from "../utils/formatters";
import {
  FileText,
  Flame,
  UserCheck,
  CheckCircle2,
  Banknote,
  Loader2,
  AlertCircle,
  RefreshCw,
  ShieldCheck,
  Search,
  MoreVertical,
  X,
  Clock,
  ChevronDown,
  ChevronUp
} from "lucide-react";

export interface InsurerQueueItem {
  claimId: number;
  policyId: number;
  incidentId: number;
  incidentRef: string;
  claimant: string;
  assignedSurveyor: string;
  assessmentId: number;
  approvedAmount: bigint;
  settledAmount: bigint;
  status: number;
  incidentVerified: boolean;
  incidentDate: bigint;
  lastUpdated: number;
  stateNumber: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  statusDisplay: string;
  actionRequired: boolean;
  actionType: "formalize" | "assign" | "approve" | "settle" | null;
  actionLabel: string;
}

export const InsurerDashboard: React.FC = () => {
  const { account, contract, readContract, refreshKey, triggerRefresh } = useWeb3();

  // Issue Policy Panel Collapse Toggle (Permanently available at top)
  const [issuePanelOpen, setIssuePanelOpen] = useState<boolean>(true);

  // Global Transaction Notification States
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ethers.TransactionReceipt | null>(null);

  // Issue Policy Form State
  const [policyRef, setPolicyRef] = useState<string>("POLICY-FIRE-2026-00" + Math.floor(1 + Math.random() * 99));
  const [propertyRef, setPropertyRef] = useState<string>("PROP-REG-COMMERCIAL-01");
  const [holderRef, setHolderRef] = useState<string>("HOLDER-KYC-VERIFIED-01");
  const [termsRef, setTermsRef] = useState<string>("TERMS-STD-FIRE-2026-V1");
  const [sumInsured, setSumInsured] = useState<string>("5000000"); // 50 Lakhs
  const [deductible, setDeductible] = useState<string>("50000"); // 50K
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState<string>(
    new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [fireCovered, setFireCovered] = useState<boolean>(true);
  const [policyDocHash, setPolicyDocHash] = useState<string>(
    "0x7c493c0d8b4e72462e75e6d07d1ebfa06b6b3e34b1227546a16584c3c3a445d9"
  );
  const [docFileName, setDocFileName] = useState<string>("");
  const [hashingDoc, setHashingDoc] = useState<boolean>(false);
  const [verifyPolicyId, setVerifyPolicyId] = useState<string>("");

  // Notification Queue & Search State
  const [queueItems, setQueueItems] = useState<InsurerQueueItem[]>([]);
  const [loadingQueue, setLoadingQueue] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [discardedIds, setDiscardedIds] = useState<number[]>([]);
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);

  // Global counts
  const [policyCount, setPolicyCount] = useState<number>(0);
  const [incidentCount, setIncidentCount] = useState<number>(0);
  const [claimCount, setClaimCount] = useState<number>(0);

  // Inline Action Modal State
  const [activeModal, setActiveModal] = useState<{
    type: "formalize" | "assign" | "approve" | "settle";
    item: InsurerQueueItem;
  } | null>(null);

  // Modal Form Inputs
  const [formalizeDate, setFormalizeDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [formalizeRef, setFormalizeRef] = useState<string>("");
  const [assignSurveyorAddr, setAssignSurveyorAddr] = useState<string>("");
  const [approveAmountInput, setApproveAmountInput] = useState<string>("");
  const [settleAmountInput, setSettleAmountInput] = useState<string>("");
  const [settlePaymentRef, setSettlePaymentRef] = useState<string>("");

  // Track recent local update timestamps to ensure dynamically updated items jump to the front
  const [recentUpdates, setRecentUpdates] = useState<Record<number, number>>({});

  const clearNotifications = () => {
    setActionError(null);
    setSuccessMsg(null);
    setReceipt(null);
  };

  // Document Auto-Hashing via crypto.subtle for Policy Registration
  const handleDocFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setDocFileName(file.name);
    try {
      setHashingDoc(true);
      const buffer = await file.arrayBuffer();
      const hash = await computeSHA256(buffer);
      setPolicyDocHash(hash);
    } catch (err) {
      console.error("Policy doc hashing error:", err);
    } finally {
      setHashingDoc(false);
    }
  };

  // Fetch Queue Data and Map to States 1 to 6
  const fetchQueueData = useCallback(async () => {
    const activeContract = contract || readContract;
    if (!activeContract) return;

    try {
      setLoadingQueue(true);

      const [policies, incidents, claims] = await Promise.all([
        activeContract.getTotalPolicies(),
        activeContract.getTotalIncidents(),
        activeContract.getTotalClaims()
      ]);

      const pCount = Number(policies);
      const iCount = Number(incidents);
      const cCount = Number(claims);

      setPolicyCount(pCount);
      setIncidentCount(iCount);
      setClaimCount(cCount);

      // Pre-fetch incidents
      const incidentMap = new Map<number, any>();
      for (let i = 1; i <= iCount; i++) {
        try {
          const inc = await activeContract.getIncident(i);
          if (inc && inc.exists) {
            incidentMap.set(i, inc);
          }
        } catch (err) {
          console.warn(`Could not fetch incident #${i}`, err);
        }
      }

      // Build Notification Queue Items
      const items: InsurerQueueItem[] = [];

      for (let i = 1; i <= cCount; i++) {
        try {
          const c = await activeContract.getClaim(i);
          if (!c || !c.exists) continue;

          const cid = Number(c.claimId);
          const pid = Number(c.policyId);
          const iid = Number(c.incidentId);
          const status = Number(c.status);

          const inc = iid > 0 ? incidentMap.get(iid) : null;
          const incidentVerified = inc ? Boolean(inc.verified) : false;
          const incidentDate = inc ? BigInt(inc.incidentDate.toString()) : 0n;
          const incRef = inc ? inc.incidentReferenceHash : `REF-CLAIM-${cid}`;

          // Calculate dynamic update timestamp for sorting
          let calculatedTimestamp = recentUpdates[cid] || 0;
          if (!calculatedTimestamp) {
            if (inc && inc.verifiedAt > 0n) {
              calculatedTimestamp = Number(inc.verifiedAt) * 1000;
            } else if (inc && inc.reportedAt > 0n) {
              calculatedTimestamp = Number(inc.reportedAt) * 1000;
            } else {
              calculatedTimestamp = cid * 10000;
            }
          }

          let stateNumber: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 = 1;
          let statusDisplay = "";
          let actionRequired = false;
          let actionType: "formalize" | "assign" | "approve" | "settle" | null = null;
          let actionLabel = "";

          // State 1: Claimer Lodges Complaint
          if (status === 1) {
            stateNumber = 1;
            statusDisplay = "Action Required: Formalize Complaint";
            actionRequired = true;
            actionType = "formalize";
            actionLabel = "Formalize Incident";
          }
          // State 2: After Formalization (Waiting for Fire Officer)
          else if (status === 2 && !incidentVerified) {
            stateNumber = 2;
            statusDisplay = "Pending work of Fire Officer";
            actionRequired = false;
            actionType = null;
            actionLabel = "";
          }
          // State 3: Fire Officer Verifies Incident
          else if (status === 2 && incidentVerified) {
            stateNumber = 3;
            statusDisplay = "Action Required: Assign Surveyor";
            actionRequired = true;
            actionType = "assign";
            actionLabel = "Assign Surveyor";
          }
          // State 4: After Surveyor Assigned (Waiting for Assessment)
          else if (status === 3) {
            stateNumber = 4;
            statusDisplay = "Pending work of Surveyor";
            actionRequired = false;
            actionType = null;
            actionLabel = "";
          }
          // State 5: Surveyor Submits Assessment
          else if (status === 4) {
            stateNumber = 5;
            statusDisplay = "Action Required: Approve Claim";
            actionRequired = true;
            actionType = "approve";
            actionLabel = "Approve Claim";
          }
          // State 6: Claim Approved (Pending Payout)
          else if (status === 5) {
            stateNumber = 6;
            statusDisplay = "Action Required: Record Settlement";
            actionRequired = true;
            actionType = "settle";
            actionLabel = "Record Settlement";
          }
          // State 7: Settled
          else if (status === 7) {
            stateNumber = 7;
            statusDisplay = "Claim Settled";
            actionRequired = false;
            actionType = null;
            actionLabel = "";
          }
          // State 8: Rejected
          else if (status === 6) {
            stateNumber = 8;
            statusDisplay = "Claim Rejected";
            actionRequired = false;
            actionType = null;
            actionLabel = "";
          }

          items.push({
            claimId: cid,
            policyId: pid,
            incidentId: iid,
            incidentRef: incRef,
            claimant: c.claimant,
            assignedSurveyor: c.assignedSurveyor,
            assessmentId: Number(c.assessmentId),
            approvedAmount: BigInt(c.approvedAmount.toString()),
            settledAmount: BigInt(c.settledAmount.toString()),
            status,
            incidentVerified,
            incidentDate,
            lastUpdated: calculatedTimestamp,
            stateNumber,
            statusDisplay,
            actionRequired,
            actionType,
            actionLabel
          });
        } catch (err) {
          console.warn(`Failed to process claim #${i} for queue:`, err);
        }
      }

      // Sort dynamically: Most recently updated item is brought to the absolute front (top)
      items.sort((a, b) => b.lastUpdated - a.lastUpdated);

      setQueueItems(items);
    } catch (err) {
      console.warn("Error fetching insurer queue:", err);
    } finally {
      setLoadingQueue(false);
    }
  }, [contract, readContract, recentUpdates]);

  useEffect(() => {
    fetchQueueData();
  }, [fetchQueueData, refreshKey]);

  // Search/Filter Pipeline
  const filteredQueue = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return queueItems
      .filter((item) => !discardedIds.includes(item.claimId))
      .filter((item) => {
        if (!q) return true;
        return (
          item.claimId.toString().includes(q) ||
          item.policyId.toString().includes(q) ||
          item.incidentRef.toLowerCase().includes(q)
        );
      });
  }, [queueItems, discardedIds, searchQuery]);

  // Discard Notification Action
  const handleDiscard = (claimId: number) => {
    setDiscardedIds((prev) => [...prev, claimId]);
    setOpenDropdownId(null);
  };

  const handleRestoreDiscarded = () => {
    setDiscardedIds([]);
  };

  // Open Inline Action Modal
  const openActionModal = (item: InsurerQueueItem) => {
    if (!item.actionType) return;
    setOpenDropdownId(null);
    clearNotifications();

    if (item.actionType === "formalize") {
      setFormalizeDate(new Date().toISOString().split("T")[0]);
      setFormalizeRef(`INCIDENT-FIRE-POL-${item.policyId}-${Math.floor(100 + Math.random() * 900)}`);
    } else if (item.actionType === "assign") {
      setAssignSurveyorAddr("");
    } else if (item.actionType === "approve") {
      setApproveAmountInput("");
    } else if (item.actionType === "settle") {
      const rupees = Number(item.approvedAmount) / 100;
      setSettleAmountInput(rupees > 0 ? rupees.toString() : "");
      setSettlePaymentRef(`UTR-HDFC-${Math.floor(100000000 + Math.random() * 900000000)}`);
    }

    setActiveModal({ type: item.actionType, item });
  };

  // 1. Submit Register Policy
  const handleRegisterPolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    clearNotifications();

    if (!contract) {
      setActionError("Wallet not connected with signing capability.");
      return;
    }

    try {
      setSubmitting(true);
      const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000);
      const endTimestamp = Math.floor(new Date(endDate).getTime() / 1000);

      if (endTimestamp <= startTimestamp) {
        setActionError("Policy end date must be after start date.");
        setSubmitting(false);
        return;
      }

      const input = {
        policyReferenceHash: hashString(policyRef),
        propertyReferenceHash: hashString(propertyRef),
        policyholderReferenceHash: hashString(holderRef),
        policyDocumentHash: hashString(policyDocHash),
        termsHash: hashString(termsRef),
        sumInsured: rupeesToPaise(sumInsured),
        deductible: rupeesToPaise(deductible),
        startDate: BigInt(startTimestamp),
        endDate: BigInt(endTimestamp),
        fireCovered
      };

      const tx = await contract.registerPolicy(input);
      const mined = await tx.wait();
      setReceipt(mined);
      setSuccessMsg(`Policy successfully registered on-chain with reference ${policyRef}.`);
      triggerRefresh();
    } catch (err: any) {
      console.error("Register policy failed:", err);
      setActionError(err.reason || err.data?.message || err.shortMessage || err.message || "Registration failed.");
    } finally {
      setSubmitting(false);
    }
  };

  // Quick Action: Verify Policy
  const handleVerifyPolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    clearNotifications();
    const pid = parseInt(verifyPolicyId, 10);
    if (isNaN(pid) || pid <= 0) {
      setActionError("Please enter a valid Policy ID to verify.");
      return;
    }
    if (!contract) return;

    try {
      setSubmitting(true);
      const tx = await contract.verifyPolicy(BigInt(pid));
      const mined = await tx.wait();
      setReceipt(mined);
      setSuccessMsg(`Policy #${pid} successfully marked verified and active on-chain.`);
      setVerifyPolicyId("");
      triggerRefresh();
    } catch (err: any) {
      setActionError(err.reason || err.data?.message || err.shortMessage || err.message || "Policy verification failed.");
    } finally {
      setSubmitting(false);
    }
  };

  // 2. Submit Formalize Incident Action
  const handleExecuteFormalize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModal || !contract) return;
    clearNotifications();

    const pid = activeModal.item.policyId;
    const cid = activeModal.item.claimId;

    try {
      setSubmitting(true);
      const incidentTimestamp = Math.floor(new Date(formalizeDate).getTime() / 1000);
      const incRefHash = hashString(formalizeRef);

      const tx = await contract.reportFire(
        BigInt(pid),
        BigInt(incidentTimestamp),
        incRefHash
      );

      const mined = await tx.wait();
      setReceipt(mined);
      setSuccessMsg(`Fire incident successfully formalized on-chain for Claim #${cid}.`);
      setRecentUpdates((prev) => ({ ...prev, [cid]: Date.now() }));
      setActiveModal(null);
      triggerRefresh();
    } catch (err: any) {
      console.error("Incident formalization error:", err);
      setActionError(err.reason || err.data?.message || err.shortMessage || err.message || "Incident reporting failed.");
    } finally {
      setSubmitting(false);
    }
  };

  // 3. Submit Assign Surveyor Action
  const handleExecuteAssignSurveyor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModal || !contract) return;
    clearNotifications();

    const iid = activeModal.item.incidentId;
    const cid = activeModal.item.claimId;

    if (!ethers.isAddress(assignSurveyorAddr)) {
      setActionError("Please enter a valid Ethereum address (0x...) for the independent surveyor.");
      return;
    }

    try {
      setSubmitting(true);
      const checksumSurveyor = ethers.getAddress(assignSurveyorAddr);
      const tx = await contract.assignSurveyor(BigInt(iid), checksumSurveyor);
      const mined = await tx.wait();
      setReceipt(mined);
      setSuccessMsg(`Surveyor ${shortenAddress(checksumSurveyor)} assigned to Incident #${iid}.`);
      setRecentUpdates((prev) => ({ ...prev, [cid]: Date.now() }));
      setActiveModal(null);
      triggerRefresh();
    } catch (err: any) {
      console.error("Assign surveyor error:", err);
      setActionError(err.reason || err.data?.message || err.shortMessage || err.message || "Surveyor assignment failed.");
    } finally {
      setSubmitting(false);
    }
  };

  // 4. Submit Approve Claim Action
  const handleExecuteApproveClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModal || !contract) return;
    clearNotifications();

    const cid = activeModal.item.claimId;
    const amtRupees = parseFloat(approveAmountInput);
    if (isNaN(amtRupees) || amtRupees <= 0) {
      setActionError("Please enter a valid approved amount in Rupees.");
      return;
    }

    try {
      setSubmitting(true);
      const amtPaise = rupeesToPaise(amtRupees);
      const tx = await contract.approveClaim(BigInt(cid), amtPaise);
      const mined = await tx.wait();
      setReceipt(mined);
      setSuccessMsg(`Claim #${cid} approved on-chain for ${formatPaise(amtPaise)}.`);
      setRecentUpdates((prev) => ({ ...prev, [cid]: Date.now() }));
      setActiveModal(null);
      triggerRefresh();
    } catch (err: any) {
      console.error("Approve claim error:", err);
      setActionError(err.reason || err.data?.message || err.shortMessage || err.message || "Claim approval failed.");
    } finally {
      setSubmitting(false);
    }
  };

  // 5. Submit Record Settlement Action
  const handleExecuteRecordSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModal || !contract) return;
    clearNotifications();

    const cid = activeModal.item.claimId;
    const amtRupees = parseFloat(settleAmountInput);
    if (isNaN(amtRupees) || amtRupees <= 0) {
      setActionError("Please enter a valid settlement amount in Rupees.");
      return;
    }

    if (!settlePaymentRef.trim()) {
      setActionError("Please provide a valid bank payment reference hash (UTR/NEFT).");
      return;
    }

    try {
      setSubmitting(true);
      const amtPaise = rupeesToPaise(amtRupees);
      const payRefHash = hashString(settlePaymentRef);
      const tx = await contract.recordSettlement(BigInt(cid), amtPaise, payRefHash);
      const mined = await tx.wait();
      setReceipt(mined);
      setSuccessMsg(`Settlement of ${formatPaise(amtPaise)} recorded on-chain for Claim #${cid}.`);
      setRecentUpdates((prev) => ({ ...prev, [cid]: Date.now() }));
      setActiveModal(null);
      triggerRefresh();
    } catch (err: any) {
      console.error("Record settlement error:", err);
      setActionError(err.reason || err.data?.message || err.shortMessage || err.message || "Settlement attestation failed.");
    } finally {
      setSubmitting(false);
    }
  };

  // Helper Badge Color Styling based on State
  const getStateBadgeStyle = (stateNumber: number) => {
    switch (stateNumber) {
      case 1:
        return "bg-amber-950/80 text-amber-300 border-amber-800";
      case 2:
        return "bg-sky-950/80 text-sky-300 border-sky-800";
      case 3:
        return "bg-rose-950/80 text-rose-300 border-rose-800";
      case 4:
        return "bg-blue-950/80 text-blue-300 border-blue-800";
      case 5:
        return "bg-purple-950/80 text-purple-300 border-purple-800";
      case 6:
        return "bg-emerald-950/80 text-emerald-300 border-emerald-800";
      case 7:
        return "bg-slate-800 text-slate-300 border-slate-700";
      case 8:
        return "bg-rose-950/50 text-rose-400 border-rose-900";
      default:
        return "bg-slate-800 text-slate-400 border-slate-700";
    }
  };

  return (
    <div className="space-y-8">
      {/* Banner */}
      <div className="bg-blue-950/40 border border-blue-800/80 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-900/80 border border-blue-700 flex items-center justify-center text-blue-300 shadow-md">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Insurer Desk & Workflow Queue</h2>
            <p className="text-xs text-blue-300/80">
              Insurer: <span className="font-mono text-white">{shortenAddress(account)}</span> • Real-Time Dynamic Lifecycle Queue
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-3 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-400">
            <span>Policies: <strong className="text-white font-mono">{policyCount}</strong></span>
            <span>•</span>
            <span>Incidents: <strong className="text-white font-mono">{incidentCount}</strong></span>
            <span>•</span>
            <span>Claims: <strong className="text-white font-mono">{claimCount}</strong></span>
          </div>
          <button
            onClick={() => fetchQueueData()}
            disabled={loadingQueue}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingQueue ? "animate-spin" : ""}`} />
            Refresh Queue
          </button>
        </div>
      </div>

      {/* Global Status Notifications */}
      {actionError && (
        <div className="p-4 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs flex items-start gap-2.5 shadow-lg">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
          <span className="font-mono">{actionError}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs flex items-start gap-2.5 shadow-lg">
          <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Mined Transaction Receipt Component */}
      {receipt && (
        <TransactionReceipt
          receipt={receipt}
          title="Insurer Workflow Operation Mined"
          onClose={() => setReceipt(null)}
        />
      )}

      {/* SECTION 1: Permanently Visible "Issue Policy" Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div
          onClick={() => setIssuePanelOpen(!issuePanelOpen)}
          className="p-5 border-b border-slate-800 flex items-center justify-between cursor-pointer hover:bg-slate-800/30 transition select-none"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-950 border border-blue-800/80 flex items-center justify-center text-blue-400">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                Underwrite & Issue Fire Insurance Policy
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-900">
                  Permanent Issuance Desk
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Commit immutable policy parameters, coverage dates, and cryptographic document hashes to the blockchain.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-slate-400">
            <span className="text-xs hidden sm:inline">{issuePanelOpen ? "Collapse Panel" : "Expand Panel"}</span>
            {issuePanelOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>

        {issuePanelOpen && (
          <div className="p-6 space-y-6 animate-in fade-in duration-200">
            <form onSubmit={handleRegisterPolicy} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Policy Reference ID <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={policyRef}
                    onChange={(e) => setPolicyRef(e.target.value)}
                    disabled={submitting}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Property Reference <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={propertyRef}
                    onChange={(e) => setPropertyRef(e.target.value)}
                    disabled={submitting}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Policyholder Reference <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={holderRef}
                    onChange={(e) => setHolderRef(e.target.value)}
                    disabled={submitting}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Terms Reference <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={termsRef}
                    onChange={(e) => setTermsRef(e.target.value)}
                    disabled={submitting}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Sum Insured (₹) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={sumInsured}
                    onChange={(e) => setSumInsured(e.target.value)}
                    disabled={submitting}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white font-mono"
                    required
                  />
                  <span className="text-[10px] text-slate-500 font-sans mt-0.5 block truncate">
                    {formatPaise(rupeesToPaise(sumInsured))}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Deductible (₹) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={deductible}
                    onChange={(e) => setDeductible(e.target.value)}
                    disabled={submitting}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white font-mono"
                    required
                  />
                  <span className="text-[10px] text-slate-500 font-sans mt-0.5 block truncate">
                    {formatPaise(rupeesToPaise(deductible))}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Start Date <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    disabled={submitting}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    End Date <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    disabled={submitting}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white font-mono"
                    required
                  />
                </div>
              </div>

              {/* Policy Document Offline Hashing */}
              <div className="border border-slate-800 bg-slate-950/60 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleDocFileChange}
                    disabled={submitting || hashingDoc}
                    className="text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
                  />
                  {docFileName && (
                    <span className="text-xs text-blue-300 font-mono truncate max-w-xs">{docFileName}</span>
                  )}
                </div>
                <div className="font-mono text-[11px] text-slate-400 truncate w-full sm:w-auto text-right">
                  SHA-256: {shortenAddress(policyDocHash, 10, 8)}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-1">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="fireCovered"
                    checked={fireCovered}
                    onChange={(e) => setFireCovered(e.target.checked)}
                    disabled={submitting}
                    className="rounded border-slate-700 text-blue-600 focus:ring-blue-500 w-4 h-4 bg-slate-950 cursor-pointer"
                  />
                  <label htmlFor="fireCovered" className="text-xs font-medium text-slate-300 cursor-pointer">
                    Standard Fire & Special Perils Endorsement Covered
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-xs transition shadow-lg shadow-blue-700/20 flex items-center gap-2 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Mining Policy...
                    </>
                  ) : (
                    <>
                      <FileText className="w-3.5 h-3.5" />
                      Issue Policy On-Chain
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Quick Verify Policy Sub-Panel */}
            <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="text-slate-400">
                <span className="text-slate-300 font-medium">Verify Issued Policy: </span>
                Activate a registered policy to accept complaints.
              </div>
              <form onSubmit={handleVerifyPolicy} className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="number"
                  min="1"
                  placeholder="Policy ID"
                  value={verifyPolicyId}
                  onChange={(e) => setVerifyPolicyId(e.target.value)}
                  disabled={submitting}
                  className="w-28 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                  required
                />
                <button
                  type="submit"
                  disabled={submitting || !verifyPolicyId}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium text-xs transition cursor-pointer"
                >
                  Verify
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 2: Dynamic Notification Queue & Search Feed */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl space-y-0">
        {/* Queue Header & Global Metrics */}
        <div className="p-6 border-b border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Live Notification Queue
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {filteredQueue.length} Active {filteredQueue.length === 1 ? "Item" : "Items"}
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Dynamic lifecycle feed tracking all fire insurance claims mapped to this Insurer. Sorted with latest activity first.
              </p>
            </div>

            {discardedIds.length > 0 && (
              <button
                onClick={handleRestoreDiscarded}
                className="text-xs text-slate-400 hover:text-white underline transition"
              >
                Restore {discardedIds.length} hidden notification{discardedIds.length === 1 ? "" : "s"}
              </button>
            )}
          </div>

          {/* Search / Filter Bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search by Claim ID, Policy ID, or Incident Reference..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none transition font-mono"
            />
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
              <Search className="w-4 h-4" />
            </div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Queue Items List */}
        {loadingQueue ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500" />
            <p className="text-xs">Querying blockchain state machine...</p>
          </div>
        ) : filteredQueue.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <Clock className="w-10 h-10 mx-auto text-slate-600" />
            <p className="text-sm font-medium text-slate-400">No Items in Notification Queue</p>
            <p className="text-xs max-w-sm mx-auto text-slate-500">
              {searchQuery
                ? "No claims match your search query."
                : "When policyholders lodge complaints or progress claims, actionable lifecycle notifications will appear here sorted dynamically."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {filteredQueue.map((item) => (
              <div
                key={item.claimId}
                className="p-5 hover:bg-slate-800/30 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Left: Metadata & Identifiers */}
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-white text-sm">
                      Claim #{item.claimId}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      (Policy #{item.policyId})
                    </span>
                    {item.incidentId > 0 && (
                      <span className="text-xs font-mono text-slate-500">
                        • Incident #{item.incidentId}
                      </span>
                    )}

                    {/* Dynamic Status Badge matching States 1-6 */}
                    <span
                      className={`text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-full border ${getStateBadgeStyle(
                        item.stateNumber
                      )}`}
                    >
                      {item.statusDisplay}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                    <span className="truncate max-w-xs font-mono text-[11px]">
                      Ref: {shortenAddress(item.incidentRef, 12, 8)}
                    </span>
                    <span>•</span>
                    <span>
                      Claimant: <span className="font-mono text-slate-300">{shortenAddress(item.claimant)}</span>
                    </span>
                    {item.approvedAmount > 0n && (
                      <>
                        <span>•</span>
                        <span className="text-purple-300 font-medium">
                          Approved: {formatPaise(item.approvedAmount)}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Right: Action Button & Dropdown Menu */}
                <div className="flex items-center gap-2 relative shrink-0">
                  {item.actionRequired ? (
                    <button
                      onClick={() => openActionModal(item)}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-700/20 transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Action: {item.actionLabel}</span>
                    </button>
                  ) : (
                    <span className="px-3 py-1.5 rounded-xl bg-slate-950 text-slate-400 border border-slate-800 text-xs font-medium">
                      {item.statusDisplay}
                    </span>
                  )}

                  {/* Dropdown Toggle Button */}
                  <div className="relative">
                    <button
                      onClick={() =>
                        setOpenDropdownId(openDropdownId === item.claimId ? null : item.claimId)
                      }
                      className="p-2 rounded-xl bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                      title="More options"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {/* Dropdown Menu */}
                    {openDropdownId === item.claimId && (
                      <div className="absolute right-0 mt-2 w-48 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl z-20 py-1.5 animate-in fade-in duration-150">
                        {item.actionRequired && (
                          <button
                            onClick={() => openActionModal(item)}
                            className="w-full text-left px-4 py-2 text-xs font-medium text-white hover:bg-blue-600/20 hover:text-blue-300 transition flex items-center gap-2 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                            {item.actionLabel}
                          </button>
                        )}
                        <button
                          onClick={() => handleDiscard(item.claimId)}
                          className="w-full text-left px-4 py-2 text-xs font-medium text-rose-400 hover:bg-rose-950/40 transition flex items-center gap-2 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          Discard Notification
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 3: Inline Action Modals (Formalize, Assign, Approve, Settle) */}
      {activeModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-950 border border-blue-800/80 flex items-center justify-center text-blue-400">
                  {activeModal.type === "formalize" && <Flame className="w-5 h-5 text-rose-400" />}
                  {activeModal.type === "assign" && <UserCheck className="w-5 h-5 text-amber-400" />}
                  {activeModal.type === "approve" && <CheckCircle2 className="w-5 h-5 text-purple-400" />}
                  {activeModal.type === "settle" && <Banknote className="w-5 h-5 text-emerald-400" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {activeModal.type === "formalize" && "Formalize Fire Incident"}
                    {activeModal.type === "assign" && "Assign Independent Surveyor"}
                    {activeModal.type === "approve" && "Approve Assessed Claim"}
                    {activeModal.type === "settle" && "Record Bank Settlement Proof"}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Executing on-chain for Claim #{activeModal.item.claimId} (Policy #{activeModal.item.policyId})
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveModal(null)}
                disabled={submitting}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Error Banner */}
            {actionError && (
              <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <span className="font-mono">{actionError}</span>
              </div>
            )}

            {/* FORM 1: Formalize Incident */}
            {activeModal.type === "formalize" && (
              <form onSubmit={handleExecuteFormalize} className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Policy ID
                    </label>
                    <input
                      type="number"
                      value={activeModal.item.policyId}
                      disabled
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-400 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Incident Date <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="date"
                      value={formalizeDate}
                      onChange={(e) => setFormalizeDate(e.target.value)}
                      disabled={submitting}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Incident Reference Tag <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={formalizeRef}
                      onChange={(e) => setFormalizeRef(e.target.value)}
                      disabled={submitting}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white font-mono"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    disabled={submitting}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-rose-700/20 transition flex items-center gap-1.5"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Mining Incident...
                      </>
                    ) : (
                      <>
                        <Flame className="w-3.5 h-3.5" />
                        Formalize Incident
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* FORM 2: Assign Surveyor */}
            {activeModal.type === "assign" && (
              <form onSubmit={handleExecuteAssignSurveyor} className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Incident ID (Oracle Verified)
                    </label>
                    <input
                      type="number"
                      value={activeModal.item.incidentId}
                      disabled
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-400 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Surveyor Ethereum Address (0x...) <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="0x..."
                      value={assignSurveyorAddr}
                      onChange={(e) => setAssignSurveyorAddr(e.target.value)}
                      disabled={submitting}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white font-mono"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    disabled={submitting}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !assignSurveyorAddr}
                    className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-amber-700/20 transition flex items-center gap-1.5"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Assigning Surveyor...
                      </>
                    ) : (
                      <>
                        <UserCheck className="w-3.5 h-3.5" />
                        Assign Surveyor
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* FORM 3: Approve Claim */}
            {activeModal.type === "approve" && (
              <form onSubmit={handleExecuteApproveClaim} className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Claim ID (Assessed)
                    </label>
                    <input
                      type="number"
                      value={activeModal.item.claimId}
                      disabled
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-400 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Approved Amount in Rupees (₹) <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="any"
                      placeholder="e.g. 3850000"
                      value={approveAmountInput}
                      onChange={(e) => setApproveAmountInput(e.target.value)}
                      disabled={submitting}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white font-mono"
                      required
                    />
                    {approveAmountInput && (
                      <span className="text-[10px] text-slate-400 font-sans mt-1 block">
                        Denominated: {formatPaise(rupeesToPaise(approveAmountInput))}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    disabled={submitting}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !approveAmountInput}
                    className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-purple-700/20 transition flex items-center gap-1.5"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Mining Approval...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Approve Claim
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* FORM 4: Record Settlement */}
            {activeModal.type === "settle" && (
              <form onSubmit={handleExecuteRecordSettlement} className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Claim ID (Approved)
                    </label>
                    <input
                      type="number"
                      value={activeModal.item.claimId}
                      disabled
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-400 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Settled Amount in Rupees (₹) <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="any"
                      placeholder="Must match approved amount"
                      value={settleAmountInput}
                      onChange={(e) => setSettleAmountInput(e.target.value)}
                      disabled={submitting}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white font-mono"
                      required
                    />
                    {settleAmountInput && (
                      <span className="text-[10px] text-slate-400 font-sans mt-1 block">
                        Denominated: {formatPaise(rupeesToPaise(settleAmountInput))}
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Bank UTR / NEFT Reference <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. UTR-AXIS-9923841"
                      value={settlePaymentRef}
                      onChange={(e) => setSettlePaymentRef(e.target.value)}
                      disabled={submitting}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white font-mono"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    disabled={submitting}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !settleAmountInput || !settlePaymentRef}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-emerald-700/20 transition flex items-center gap-1.5"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Mining Settlement Proof...
                      </>
                    ) : (
                      <>
                        <Banknote className="w-3.5 h-3.5" />
                        Record Settlement Proof
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
