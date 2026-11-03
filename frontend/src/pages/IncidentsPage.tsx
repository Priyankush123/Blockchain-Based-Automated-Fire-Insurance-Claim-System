import React, { useEffect, useState } from "react";
import { useWeb3 } from "../context/Web3Context";
import { Badge } from "../components/Badge";
import { formatTimestamp, shortenAddress } from "../utils/formatters";
import { hashString } from "../utils/crypto";
import { Flame, Plus, ShieldCheck, FileCheck2, UserCheck } from "lucide-react";

export const IncidentsPage: React.FC = () => {
  const { contract, readContract, refreshKey, triggerRefresh, setError } = useWeb3();

  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showReportModal, setShowReportModal] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [selectedIncidentId, setSelectedIncidentId] = useState<bigint | number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Report Incident Form
  const [reportForm, setReportForm] = useState({
    policyId: "1",
    incidentDate: new Date().toISOString().split("T")[0],
    incidentRef: "INCIDENT-FIRE-00" + Math.floor(1 + Math.random() * 9),
    evidenceHash: "0x4b78c4a1796b3438a0c2049e917d595c25e87a2d480eeefcbe073c66f4e648bf"
  });

  // Verify Incident Form (Fire Officer)
  const [verifyForm, setVerifyForm] = useState({
    fireReportHash: "0x98f6bcd4621d373cade4e832627b4f621e257ebc238b72e01be7a13c3ad70bcf"
  });

  useEffect(() => {
    let active = true;

    async function loadIncidents() {
      if (!readContract) return;
      try {
        setLoading(true);
        const count = await readContract.getTotalIncidents();
        const list = [];
        for (let i = 1; i <= Number(count); i++) {
          try {
            const inc = await readContract.getIncident(i);
            list.push(inc);
          } catch (e) {
            console.warn("Failed to get incident", i, e);
          }
        }
        if (active) setIncidents(list);
      } catch (err: any) {
        console.warn("Failed to fetch incidents:", err.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadIncidents();

    return () => {
      active = false;
    };
  }, [readContract, refreshKey]);

  const handleReportFire = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contract) {
      setError("Connect your wallet or select an Insurer persona");
      return;
    }
    try {
      setSubmitting(true);
      setError(null);

      const incidentUnix = BigInt(Math.floor(new Date(reportForm.incidentDate).getTime() / 1000));
      const tx = await contract.reportFire(
        BigInt(reportForm.policyId),
        incidentUnix,
        hashString(reportForm.incidentRef),
        hashString(reportForm.evidenceHash)
      );
      await tx.wait();
      setShowReportModal(false);
      triggerRefresh();
    } catch (err: any) {
      setError(err.reason || err.message || "Failed to report fire incident");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contract || selectedIncidentId === null) return;
    try {
      setSubmitting(true);
      setError(null);

      const tx = await contract.verifyIncident(
        BigInt(selectedIncidentId),
        hashString(verifyForm.fireReportHash)
      );
      await tx.wait();
      setShowVerifyModal(false);
      setSelectedIncidentId(null);
      triggerRefresh();
    } catch (err: any) {
      setError(err.reason || err.message || "Incident verification failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Flame className="w-5 h-5 text-flame-400" />
            Fire Incidents & Civic Verification Desk
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Incidents reported by insurers and independently authenticated by authorized Civic Fire Officers.
          </p>
        </div>

        <button
          onClick={() => setShowReportModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-flame-600 hover:bg-flame-500 text-white rounded-lg text-xs font-semibold shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          Report Fire Incident
        </button>
      </div>

      {/* Role Helper Banners */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg flex items-center gap-2.5">
          <UserCheck className="w-4 h-4 text-blue-400 shrink-0" />
          <span className="text-slate-300">
            <strong>Insurer Role:</strong> Reports fire incidents with evidence digests & initiates claim.
          </span>
        </div>
        <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg flex items-center gap-2.5">
          <ShieldCheck className="w-4 h-4 text-flame-400 shrink-0" />
          <span className="text-slate-300">
            <strong>Fire Officer Role:</strong> Civic oracle who verifies dispatch & attaches official fire report.
          </span>
        </div>
      </div>

      {/* Incidents Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        {loading ? (
          <div className="text-center py-12 text-slate-500 text-sm">Loading incident registry...</div>
        ) : incidents.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">
            No incidents reported yet. Click "Report Fire Incident" to log an incident.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3.5">Incident ID</th>
                  <th className="p-3.5">Policy ID</th>
                  <th className="p-3.5">Incident Date</th>
                  <th className="p-3.5">Reported By</th>
                  <th className="p-3.5">Civic Status</th>
                  <th className="p-3.5">Fire Report Fingerprint</th>
                  <th className="p-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {incidents.map((inc) => {
                  const isVerified = inc.verified;
                  return (
                    <tr key={inc.incidentId.toString()} className="hover:bg-slate-800/40 transition">
                      <td className="p-3.5 font-mono font-bold text-slate-200">
                        #{inc.incidentId.toString()}
                      </td>
                      <td className="p-3.5 font-mono text-slate-400">
                        #{inc.policyId.toString()}
                      </td>
                      <td className="p-3.5 text-slate-300">
                        {formatTimestamp(inc.incidentDate)}
                      </td>
                      <td className="p-3.5 font-mono text-slate-400" title={inc.reportedBy}>
                        {shortenAddress(inc.reportedBy)}
                      </td>
                      <td className="p-3.5">
                        <Badge status={isVerified ? "VERIFIED" : "PENDING"} type="general" />
                      </td>
                      <td className="p-3.5 font-mono text-[11px] text-amber-300">
                        {isVerified ? shortenAddress(inc.fireReportHash, 10, 8) : "Awaiting Fire Officer"}
                      </td>
                      <td className="p-3.5 text-right">
                        {!isVerified ? (
                          <button
                            onClick={() => {
                              setSelectedIncidentId(inc.incidentId);
                              setShowVerifyModal(true);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-flame-600 hover:bg-flame-500 text-white rounded text-[11px] font-medium transition"
                            title="Fire Officer civic certification"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" /> Verify Incident
                          </button>
                        ) : (
                          <span className="text-emerald-400 text-xs flex items-center justify-end gap-1">
                            <FileCheck2 className="w-3.5 h-3.5" /> Certified
                          </span>
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

      {/* Modal: Report Incident */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Flame className="w-4 h-4 text-flame-400" />
                Report Fire Incident (Insurer)
              </h3>
              <button onClick={() => setShowReportModal(false)} className="text-slate-400 hover:text-slate-200">
                &times;
              </button>
            </div>

            <form onSubmit={handleReportFire} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Target Policy ID (Must be verified & active)</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={reportForm.policyId}
                  onChange={(e) => setReportForm({ ...reportForm, policyId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Incident Date & Time</label>
                <input
                  type="date"
                  required
                  value={reportForm.incidentDate}
                  onChange={(e) => setReportForm({ ...reportForm, incidentDate: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Incident Reference / Docket ID</label>
                <input
                  type="text"
                  required
                  value={reportForm.incidentRef}
                  onChange={(e) => setReportForm({ ...reportForm, incidentRef: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Evidence Package Fingerprint (Photos/Videos SHA-256)</label>
                <input
                  type="text"
                  required
                  value={reportForm.evidenceHash}
                  onChange={(e) => setReportForm({ ...reportForm, evidenceHash: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 font-mono text-[11px]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 bg-flame-600 hover:bg-flame-500 disabled:opacity-50 text-white rounded text-xs font-semibold"
                >
                  {submitting ? "Logging Incident..." : "Report Incident"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Fire Officer Incident Verification */}
      {showVerifyModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-flame-400" />
                Civic Fire Department Certification
              </h3>
              <button onClick={() => setShowVerifyModal(false)} className="text-slate-400 hover:text-slate-200">
                &times;
              </button>
            </div>

            <p className="text-xs text-slate-400">
              As an authorized Fire Department Officer, commit the cryptographic hash of the official signed emergency dispatch / fire incident report.
            </p>

            <form onSubmit={handleVerifyIncident} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Official Fire Report SHA-256 Digest</label>
                <input
                  type="text"
                  required
                  value={verifyForm.fireReportHash}
                  onChange={(e) => setVerifyForm({ ...verifyForm, fireReportHash: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 font-mono text-[11px]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowVerifyModal(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded text-xs font-semibold"
                >
                  {submitting ? "Certifying on Blockchain..." : "Commit Civic Certification"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
