import React, { useState, useEffect } from "react";
import { useWeb3 } from "../context/Web3Context";
import { FileHasher } from "../components/FileHasher";
import { COMPLAINT_STATUS_MAP } from "../config/contract";
import { ShieldAlert, Send, Clock, CheckCircle2, AlertCircle } from "lucide-react";

export const ClaimerPortal: React.FC = () => {
  const { account, contract, readContract, triggerRefresh, refreshKey, setError } = useWeb3();

  const [policyId, setPolicyId] = useState<string>("");
  const [evidenceHash, setEvidenceHash] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [txSuccess, setTxSuccess] = useState<string | null>(null);

  const [complaints, setComplaints] = useState<any[]>([]);
  const [loadingComplaints, setLoadingComplaints] = useState<boolean>(false);

  // Fetch complaints lodged by this account
  useEffect(() => {
    async function loadComplaints() {
      if (!readContract || !account) return;
      try {
        setLoadingComplaints(true);
        const total = await readContract.getTotalComplaints();
        const count = Number(total);
        const list: any[] = [];

        for (let i = 1; i <= count; i++) {
          try {
            const comp = await readContract.getComplaint(i);
            if (comp.claimer.toLowerCase() === account.toLowerCase()) {
              list.push({
                complaintId: Number(comp.complaintId),
                policyId: Number(comp.policyId),
                claimer: comp.claimer,
                evidenceHash: comp.evidenceHash,
                lodgedAt: Number(comp.lodgedAt),
                status: Number(comp.status),
                incidentId: Number(comp.incidentId)
              });
            }
          } catch {
            // Skip invalid
          }
        }
        setComplaints(list.reverse());
      } catch (err: any) {
        console.warn("Error loading claimer complaints:", err.message);
      } finally {
        setLoadingComplaints(false);
      }
    }

    loadComplaints();
  }, [readContract, account, refreshKey]);

  const handleLodgeComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contract) {
      setError("Please ensure your wallet is connected.");
      return;
    }
    if (!policyId || !evidenceHash) {
      setError("Please provide a valid Policy ID and Evidence Hash.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      setTxSuccess(null);

      const tx = await contract.lodgeComplaint(BigInt(policyId), evidenceHash);
      await tx.wait();

      setTxSuccess(`Complaint successfully lodged on-chain! Transaction: ${tx.hash.slice(0, 10)}...`);
      setPolicyId("");
      setEvidenceHash("");
      triggerRefresh();
    } catch (err: any) {
      setError(err.reason || err.message || "Failed to lodge complaint");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <ShieldAlert className="w-7 h-7 text-emerald-400" />
          Claimer Incident Portal
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Lodge fire incident complaints on-chain using your verified policy reference and cryptographic damage evidence.
        </p>
      </div>

      {txSuccess && (
        <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{txSuccess}</span>
        </div>
      )}

      {/* Lodge Complaint Form */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-base font-semibold text-white mb-4">Lodge New Fire Complaint</h2>
          <form onSubmit={handleLodgeComplaint} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Verified Policy ID
              </label>
              <input
                type="number"
                min="1"
                required
                value={policyId}
                onChange={(e) => setPolicyId(e.target.value)}
                placeholder="e.g. 1"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Damage Evidence SHA-256 Fingerprint
              </label>
              <input
                type="text"
                required
                value={evidenceHash}
                onChange={(e) => setEvidenceHash(e.target.value)}
                placeholder="0x..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Compute the cryptographic SHA-256 hash using the document hasher on the right.
              </span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? "Broadcasting to Blockchain..." : "Submit Complaint to Blockchain"}</span>
            </button>
          </form>
        </div>

        {/* Offline Evidence Hasher */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-base font-semibold text-white mb-4">Cryptographic Evidence Hasher</h2>
          <p className="text-xs text-slate-400 mb-4">
            Calculate the 32-byte SHA-256 hash of photos or incident reports locally in your browser. Original files are never uploaded to any server.
          </p>
          <FileHasher onHashCalculated={(hash) => setEvidenceHash(hash)} />
        </div>
      </div>

      {/* Lodged Complaints Feed */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-slate-400" />
          My Lodged Complaints & Status Tracking
        </h2>

        {loadingComplaints ? (
          <p className="text-xs text-slate-500 py-4">Querying blockchain complaint ledger...</p>
        ) : complaints.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500">
            <AlertCircle className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            No complaints lodged by this wallet yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800 bg-slate-950/40">
                <tr>
                  <th className="py-3 px-4">Complaint ID</th>
                  <th className="py-3 px-4">Policy ID</th>
                  <th className="py-3 px-4">Evidence Hash</th>
                  <th className="py-3 px-4">Lodged At</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Linked Incident</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {complaints.map((c) => (
                  <tr key={c.complaintId} className="hover:bg-slate-850/50">
                    <td className="py-3 px-4 font-mono text-slate-300">#{c.complaintId}</td>
                    <td className="py-3 px-4 font-mono text-slate-300">Policy #{c.policyId}</td>
                    <td className="py-3 px-4 font-mono text-slate-400 truncate max-w-xs">{c.evidenceHash}</td>
                    <td className="py-3 px-4 text-slate-400">{new Date(c.lodgedAt * 1000).toLocaleString()}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                        c.status === 1
                          ? "bg-amber-950/60 text-amber-300 border-amber-800"
                          : c.status === 2
                          ? "bg-emerald-950/60 text-emerald-300 border-emerald-800"
                          : "bg-slate-800 text-slate-400 border-slate-700"
                      }`}>
                        {COMPLAINT_STATUS_MAP[c.status] || "UNKNOWN"}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">
                      {c.incidentId > 0 ? `Incident #${c.incidentId}` : "Pending Admin Review"}
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

