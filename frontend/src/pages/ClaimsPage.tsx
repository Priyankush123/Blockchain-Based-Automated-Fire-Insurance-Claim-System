import React, { useEffect, useState } from "react";
import { useWeb3 } from "../context/Web3Context";
import { Badge } from "../components/Badge";
import { formatPaise, shortenAddress, rupeesToPaise } from "../utils/formatters";
import { hashString } from "../utils/crypto";
import { CLAIM_STATUS_MAP } from "../config/contract";
import { HARDHAT_PERSONAS } from "../config/accounts";
import {
  FileSpreadsheet,
  UserPlus,
  Calculator,
  CheckCircle,
  XCircle,
  Banknote
} from "lucide-react";

export const ClaimsPage: React.FC = () => {
  const { contract, readContract, refreshKey, triggerRefresh, setError } = useWeb3();

  const [claims, setClaims] = useState<any[]>([]);
  const [assessments, setAssessments] = useState<Record<string, any>>({});
  const [policies, setPolicies] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  // Modals
  const [activeModal, setActiveModal] = useState<
    "assign" | "assess" | "approve" | "reject" | "settle" | null
  >(null);
  const [selectedClaim, setSelectedClaim] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Forms
  const [assignForm, setAssignForm] = useState({
    incidentId: "1",
    surveyorAddress: HARDHAT_PERSONAS[3].address // Independent Surveyor
  });

  const [assessForm, setAssessForm] = useState({
    buildingLossRupees: "1200000",
    contentsLossRupees: "600000",
    machineryLossRupees: "400000",
    salvageValueRupees: "100000",
    reportHash: "0xc8f936f469ef79ef8839ca17b2b643fa3097c6d67b7e3e9d8c47b56d39d91dfc"
  });

  const [approveAmountRupees, setApproveAmountRupees] = useState("");
  const [rejectionReason, setRejectionReason] = useState("Policy condition 4.2 breach: arson or unapproved structural hazard");
  const [paymentRef, setPaymentRef] = useState("BANK-NEFT-UTR-20261103-" + Math.floor(100000 + Math.random() * 900000));

  useEffect(() => {
    let active = true;

    async function loadClaims() {
      if (!readContract) return;
      try {
        setLoading(true);
        const count = await readContract.getTotalClaims();
        const claimsList = [];
        const assessMap: Record<string, any> = {};
        const policyMap: Record<string, any> = {};

        for (let i = 1; i <= Number(count); i++) {
          try {
            const c = await readContract.getClaim(i);
            claimsList.push(c);

            // Fetch policy info
            const pId = c.policyId.toString();
            if (!policyMap[pId]) {
              policyMap[pId] = await readContract.getPolicy(c.policyId);
            }

            // Fetch assessment if exists
            if (c.assessmentId && Number(c.assessmentId) > 0) {
              const aId = c.assessmentId.toString();
              assessMap[aId] = await readContract.getAssessment(c.assessmentId);
            }
          } catch (e) {
            console.warn("Failed to load claim record", i, e);
          }
        }

        if (active) {
          setClaims(claimsList);
          setAssessments(assessMap);
          setPolicies(policyMap);
        }
      } catch (err: any) {
        console.warn("Failed to load claims:", err.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadClaims();

    return () => {
      active = false;
    };
  }, [readContract, refreshKey]);

  // Handle Assign Surveyor (Insurer)
  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contract) return;
    try {
      setSubmitting(true);
      setError(null);
      const tx = await contract.assignSurveyor(
        BigInt(assignForm.incidentId),
        assignForm.surveyorAddress.trim()
      );
      await tx.wait();
      setActiveModal(null);
      triggerRefresh();
    } catch (err: any) {
      setError(err.reason || err.message || "Failed to assign surveyor");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Submit Assessment (Surveyor)
  const handleAssess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contract || !selectedClaim) return;
    try {
      setSubmitting(true);
      setError(null);
      const bPaise = rupeesToPaise(assessForm.buildingLossRupees);
      const cPaise = rupeesToPaise(assessForm.contentsLossRupees);
      const mPaise = rupeesToPaise(assessForm.machineryLossRupees);
      const sPaise = rupeesToPaise(assessForm.salvageValueRupees);

      const tx = await contract.submitAssessment(
        selectedClaim.claimId,
        bPaise,
        cPaise,
        mPaise,
        sPaise,
        hashString(assessForm.reportHash)
      );
      await tx.wait();
      setActiveModal(null);
      setSelectedClaim(null);
      triggerRefresh();
    } catch (err: any) {
      setError(err.reason || err.message || "Failed to submit loss assessment");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Approve Claim (Insurer)
  const handleApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contract || !selectedClaim) return;
    try {
      setSubmitting(true);
      setError(null);
      const paise = rupeesToPaise(approveAmountRupees);
      const tx = await contract.approveClaim(selectedClaim.claimId, paise);
      await tx.wait();
      setActiveModal(null);
      setSelectedClaim(null);
      triggerRefresh();
    } catch (err: any) {
      setError(err.reason || err.message || "Failed to approve claim");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Reject Claim (Insurer)
  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contract || !selectedClaim) return;
    try {
      setSubmitting(true);
      setError(null);
      const reasonHash = hashString(rejectionReason);
      const tx = await contract.rejectClaim(selectedClaim.claimId, reasonHash);
      await tx.wait();
      setActiveModal(null);
      setSelectedClaim(null);
      triggerRefresh();
    } catch (err: any) {
      setError(err.reason || err.message || "Failed to reject claim");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Record Settlement (Insurer)
  const handleSettle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contract || !selectedClaim) return;
    try {
      setSubmitting(true);
      setError(null);
      const refHash = hashString(paymentRef);
      const tx = await contract.recordSettlement(
        selectedClaim.claimId,
        selectedClaim.approvedAmount,
        refHash
      );
      await tx.wait();
      setActiveModal(null);
      setSelectedClaim(null);
      triggerRefresh();
    } catch (err: any) {
      setError(err.reason || err.message || "Failed to record settlement");
    } finally {
      setSubmitting(false);
    }
  };

  // Live Math calculations for the assessment form
  const bNum = parseFloat(assessForm.buildingLossRupees) || 0;
  const cNum = parseFloat(assessForm.contentsLossRupees) || 0;
  const mNum = parseFloat(assessForm.machineryLossRupees) || 0;
  const sNum = parseFloat(assessForm.salvageValueRupees) || 0;

  const totalLoss = bNum + cNum + mNum;
  const grossLoss = Math.max(totalLoss - sNum, 0);

  const curPolicy = selectedClaim ? policies[selectedClaim.policyId.toString()] : null;
  const deductibleRupees = curPolicy ? Number(curPolicy.deductible) / 100 : 0;
  const sumInsuredRupees = curPolicy ? Number(curPolicy.sumInsured) / 100 : 0;

  const eligibleLoss = Math.min(
    Math.max(grossLoss - deductibleRupees, 0),
    sumInsuredRupees
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-amber-400" />
            Claims Settlement & Surveying Desk
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Manage loss assessments, approvals guarded by eligible bounds, and bank disbursement attestations.
          </p>
        </div>

        <button
          onClick={() => setActiveModal("assign")}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold shadow-sm transition"
        >
          <UserPlus className="w-4 h-4" />
          Assign Surveyor (New Claim)
        </button>
      </div>

      {/* Claims List Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        {loading ? (
          <div className="text-center py-12 text-slate-500 text-sm">Loading claims data...</div>
        ) : claims.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">
            No claims recorded yet. Click "Assign Surveyor" to initialize a claim for a verified incident.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3.5">Claim ID</th>
                  <th className="p-3.5">Policy / Incident</th>
                  <th className="p-3.5">Assigned Surveyor</th>
                  <th className="p-3.5">Assessment Status</th>
                  <th className="p-3.5">Approved Amount</th>
                  <th className="p-3.5">Settlement (Disbursed)</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {claims.map((c) => {
                  const statusNum = Number(c.status);
                  const statusStr = CLAIM_STATUS_MAP[statusNum] || "UNKNOWN";
                  const aData = c.assessmentId ? assessments[c.assessmentId.toString()] : null;

                  return (
                    <tr key={c.claimId.toString()} className="hover:bg-slate-800/40 transition">
                      <td className="p-3.5 font-mono font-bold text-slate-200">
                        #{c.claimId.toString()}
                      </td>
                      <td className="p-3.5 text-slate-300">
                        <div>Policy #{c.policyId.toString()}</div>
                        <div className="text-[10px] text-slate-500">Incident #{c.incidentId.toString()}</div>
                      </td>
                      <td className="p-3.5 font-mono text-slate-400" title={c.assignedSurveyor}>
                        {shortenAddress(c.assignedSurveyor)}
                      </td>
                      <td className="p-3.5">
                        <Badge status={statusStr} type="claim" />
                        {aData && (
                          <div className="text-[10px] text-amber-400/90 font-medium mt-0.5">
                            Eligible: {formatPaise(aData.eligibleAmount)}
                          </div>
                        )}
                      </td>
                      <td className="p-3.5 font-semibold text-slate-200">
                        {c.approvedAmount > 0n ? formatPaise(c.approvedAmount) : "—"}
                      </td>
                      <td className="p-3.5 font-semibold text-emerald-400">
                        {c.settledAmount > 0n ? (
                          <div>
                            <div>{formatPaise(c.settledAmount)}</div>
                            <div className="text-[10px] font-mono text-slate-500" title={c.paymentReferenceHash}>
                              UTR: {shortenAddress(c.paymentReferenceHash, 8, 6)}
                            </div>
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                        {/* Status: SUBMITTED -> Surveyor can assess, Insurer can reject */}
                        {statusNum === 1 && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedClaim(c);
                                setActiveModal("assess");
                              }}
                              className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-[11px] font-medium"
                              title="Surveyor submits itemized damages"
                            >
                              Assess Loss
                            </button>
                            <button
                              onClick={() => {
                                setSelectedClaim(c);
                                setActiveModal("reject");
                              }}
                              className="px-2.5 py-1 bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-300 rounded text-[11px]"
                            >
                              Reject
                            </button>
                          </>
                        )}

                        {/* Status: ASSESSED -> Insurer can approve or reject */}
                        {statusNum === 2 && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedClaim(c);
                                if (aData) {
                                  setApproveAmountRupees((Number(aData.eligibleAmount) / 100).toString());
                                }
                                setActiveModal("approve");
                              }}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-medium"
                              title="Insurer approves claim within bounds"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                setSelectedClaim(c);
                                setActiveModal("reject");
                              }}
                              className="px-2.5 py-1 bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-300 rounded text-[11px]"
                            >
                              Reject
                            </button>
                          </>
                        )}

                        {/* Status: APPROVED -> Insurer records bank settlement */}
                        {statusNum === 3 && (
                          <button
                            onClick={() => {
                              setSelectedClaim(c);
                              setActiveModal("settle");
                            }}
                            className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded text-[11px] font-medium"
                            title="Insurer records bank payment attestation"
                          >
                            Record Settlement
                          </button>
                        )}

                        {/* Status: SETTLED */}
                        {statusNum === 5 && (
                          <span className="text-emerald-400 text-xs font-medium">✓ Settled</span>
                        )}

                        {/* Status: REJECTED */}
                        {statusNum === 4 && (
                          <span className="text-rose-400 text-xs font-medium">✕ Rejected</span>
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

      {/* Modal: Assign Surveyor */}
      {activeModal === "assign" && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-amber-400" />
                Assign Independent Surveyor (Create Claim)
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-200">
                &times;
              </button>
            </div>

            <form onSubmit={handleAssign} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Target Incident ID (Must be Verified by Fire Officer)</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={assignForm.incidentId}
                  onChange={(e) => setAssignForm({ ...assignForm, incidentId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Authorized Surveyor Ethereum Address</label>
                <input
                  type="text"
                  required
                  value={assignForm.surveyorAddress}
                  onChange={(e) => setAssignForm({ ...assignForm, surveyorAddress: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 font-mono text-[11px]"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Default: Veritas Loss Adjusters ({shortenAddress(HARDHAT_PERSONAS[3].address)})
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded text-xs font-semibold"
                >
                  {submitting ? "Assigning..." : "Assign & Initialize Claim"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Surveyor Loss Assessment Calculator */}
      {activeModal === "assess" && selectedClaim && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Calculator className="w-4 h-4 text-cyan-400" />
                Itemized Loss Evaluation (Claim #{selectedClaim.claimId.toString()})
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-200">
                &times;
              </button>
            </div>

            <form onSubmit={handleAssess} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Building Loss (₹ INR)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={assessForm.buildingLossRupees}
                    onChange={(e) => setAssessForm({ ...assessForm, buildingLossRupees: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Contents Loss (₹ INR)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={assessForm.contentsLossRupees}
                    onChange={(e) => setAssessForm({ ...assessForm, contentsLossRupees: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Machinery Loss (₹ INR)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={assessForm.machineryLossRupees}
                    onChange={(e) => setAssessForm({ ...assessForm, machineryLossRupees: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Salvage Value (₹ INR)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={assessForm.salvageValueRupees}
                    onChange={(e) => setAssessForm({ ...assessForm, salvageValueRupees: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200"
                  />
                </div>
              </div>

              {/* Live Math Calculation Box */}
              <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-lg space-y-1 text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Damage:</span>
                  <span>₹{totalLoss.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Gross Loss (Damage - Salvage):</span>
                  <span>₹{grossLoss.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between font-semibold text-emerald-400 border-t border-slate-800 pt-1">
                  <span>Calculated Eligible Bound:</span>
                  <span>₹{eligibleLoss.toLocaleString("en-IN")}</span>
                </div>
                <div className="text-[10px] text-slate-500">
                  Formula: min(max(grossLoss - deductible, 0), sumInsured)
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Surveyor Loss Report SHA-256 Digest</label>
                <input
                  type="text"
                  required
                  value={assessForm.reportHash}
                  onChange={(e) => setAssessForm({ ...assessForm, reportHash: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 font-mono text-[11px]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded text-xs font-semibold"
                >
                  {submitting ? "Submitting..." : "Submit Assessment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Insurer Approve Claim */}
      {activeModal === "approve" && selectedClaim && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                Approve Claim #{selectedClaim.claimId.toString()}
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-200">
                &times;
              </button>
            </div>

            <form onSubmit={handleApprove} className="space-y-3.5 text-xs">
              <div className="p-3 bg-slate-950 rounded-lg text-slate-300 text-xs space-y-1">
                <div>
                  Contract enforces that approved amount cannot exceed the calculated eligible loss.
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Approved Payout Amount (₹ INR)</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={approveAmountRupees}
                  onChange={(e) => setApproveAmountRupees(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 font-semibold"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded text-xs font-semibold"
                >
                  {submitting ? "Approving..." : "Confirm Approval"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Insurer Reject Claim */}
      {activeModal === "reject" && selectedClaim && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <XCircle className="w-4 h-4 text-rose-400" />
                Reject Claim #{selectedClaim.claimId.toString()}
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-200">
                &times;
              </button>
            </div>

            <form onSubmit={handleReject} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Rejection Reason (Will be hashed on-chain)</label>
                <textarea
                  required
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded text-xs font-semibold"
                >
                  {submitting ? "Rejecting..." : "Confirm Rejection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Record Bank Settlement */}
      {activeModal === "settle" && selectedClaim && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Banknote className="w-4 h-4 text-purple-400" />
                Record Bank Settlement Attestation
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-200">
                &times;
              </button>
            </div>

            <form onSubmit={handleSettle} className="space-y-3.5 text-xs">
              <div className="p-3 bg-slate-950 rounded-lg text-slate-300 text-xs space-y-1">
                <div>
                  Approved Amount to Settle: <strong className="text-emerald-400">{formatPaise(selectedClaim.approvedAmount)}</strong>
                </div>
                <div className="text-[11px] text-slate-500">
                  The smart contract enforces that the recorded settlement amount strictly matches the approved figure.
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Bank Payment Reference / UTR Number</label>
                <input
                  type="text"
                  required
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 font-mono text-[11px]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded text-xs font-semibold"
                >
                  {submitting ? "Attesting..." : "Confirm & Settle Claim"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
