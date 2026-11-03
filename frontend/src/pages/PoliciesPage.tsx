import React, { useEffect, useState } from "react";
import { useWeb3 } from "../context/Web3Context";
import { Badge } from "../components/Badge";
import { formatPaise, formatTimestamp, shortenAddress, rupeesToPaise } from "../utils/formatters";
import { hashString } from "../utils/crypto";
import { Shield, Plus, Check, Ban, Search, FileText, AlertCircle } from "lucide-react";

export const PoliciesPage: React.FC = () => {
  const { contract, readContract, role, refreshKey, triggerRefresh, setError } = useWeb3();

  const [policies, setPolicies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Form State
  const [form, setForm] = useState({
    policyRef: "FIRECHAIN-POLICY-" + Math.floor(100 + Math.random() * 900),
    propertyRef: "PROP-MUMBAI-COMMERCIAL-" + Math.floor(10 + Math.random() * 90),
    holderRef: "CORP-CLIENT-" + Math.floor(1000 + Math.random() * 9000),
    docHash: "0xa591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e",
    termsHash: "0x892a0e234858a74e54a434195159048a9726b2bbbbcd66f545a90d40fa4459f4",
    sumInsuredRupees: "5000000",
    deductibleRupees: "25000",
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split("T")[0],
    fireCovered: true
  });

  useEffect(() => {
    let active = true;

    async function loadPolicies() {
      if (!readContract) return;
      try {
        setLoading(true);
        const count = await readContract.getTotalPolicies();
        const list = [];
        for (let i = 1; i <= Number(count); i++) {
          try {
            const p = await readContract.getPolicy(i);
            list.push(p);
          } catch (e) {
            console.warn("Failed to get policy", i, e);
          }
        }
        if (active) setPolicies(list);
      } catch (err: any) {
        console.warn("Failed to fetch policies:", err.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadPolicies();

    return () => {
      active = false;
    };
  }, [readContract, refreshKey]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contract) {
      setError("Connect your wallet or select an Insurer persona");
      return;
    }
    try {
      setSubmitting(true);
      setError(null);

      const startUnix = BigInt(Math.floor(new Date(form.startDate).getTime() / 1000));
      const endUnix = BigInt(Math.floor(new Date(form.endDate).getTime() / 1000));

      const input = {
        policyReferenceHash: hashString(form.policyRef),
        propertyReferenceHash: hashString(form.propertyRef),
        policyholderReferenceHash: hashString(form.holderRef),
        policyDocumentHash: hashString(form.docHash),
        termsHash: hashString(form.termsHash),
        sumInsured: rupeesToPaise(form.sumInsuredRupees),
        deductible: rupeesToPaise(form.deductibleRupees),
        startDate: startUnix,
        endDate: endUnix,
        fireCovered: form.fireCovered
      };

      const tx = await contract.registerPolicy(input);
      await tx.wait();
      setShowModal(false);
      triggerRefresh();
    } catch (err: any) {
      setError(err.reason || err.message || "Failed to register policy");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async (policyId: bigint | number) => {
    if (!contract) return;
    try {
      setError(null);
      const tx = await contract.verifyPolicy(policyId);
      await tx.wait();
      triggerRefresh();
    } catch (err: any) {
      setError(err.reason || err.message || "Verification failed");
    }
  };

  const handleCancel = async (policyId: bigint | number) => {
    if (!contract) return;
    try {
      setError(null);
      const tx = await contract.cancelPolicy(policyId);
      await tx.wait();
      triggerRefresh();
    } catch (err: any) {
      setError(err.reason || err.message || "Cancellation failed");
    }
  };

  const filtered = policies.filter((p) => {
    const idMatch = p.policyId.toString().includes(searchTerm);
    const hashMatch = p.policyReferenceHash.toLowerCase().includes(searchTerm.toLowerCase());
    return idMatch || hashMatch;
  });

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-400" />
            Underwritten Policies Registry
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Browse registered insurance policies or underwrite new coverage.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search policy ID or hash..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 w-52 sm:w-64"
            />
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Underwrite New Policy
          </button>
        </div>
      </div>

      {!role.isInsurer && (
        <div className="bg-amber-950/40 border border-amber-800/60 rounded-xl p-3.5 flex items-center gap-3 text-xs text-amber-300">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>
            You are currently viewing as a non-insurer. Switch persona to <strong>Apex Fire Insurance Co. (Insurer)</strong> in the top navbar to register, verify, or cancel policies.
          </span>
        </div>
      )}

      {/* Policies Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        {loading ? (
          <div className="text-center py-12 text-slate-500 text-sm">Loading policies from blockchain...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">
            No policies found. Click "Underwrite New Policy" to register the first one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3.5">ID</th>
                  <th className="p-3.5">Insurer</th>
                  <th className="p-3.5">Coverage (Sum Insured)</th>
                  <th className="p-3.5">Deductible</th>
                  <th className="p-3.5">Policy Validity Window</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filtered.map((p) => {
                  const isCancelled = Number(p.cancelledAt) > 0;
                  const isVerified = p.verified;
                  const statusLabel = isCancelled ? "CANCELLED" : isVerified ? "VERIFIED" : "PENDING";

                  return (
                    <tr key={p.policyId.toString()} className="hover:bg-slate-800/40 transition">
                      <td className="p-3.5 font-mono font-bold text-slate-200">
                        #{p.policyId.toString()}
                      </td>
                      <td className="p-3.5 font-mono text-slate-400" title={p.insurer}>
                        {shortenAddress(p.insurer)}
                      </td>
                      <td className="p-3.5 font-semibold text-slate-100">
                        {formatPaise(p.sumInsured)}
                      </td>
                      <td className="p-3.5 text-slate-300">
                        {formatPaise(p.deductible)}
                      </td>
                      <td className="p-3.5 text-slate-300">
                        <div>{formatTimestamp(p.startDate)}</div>
                        <div className="text-[10px] text-slate-500">to {formatTimestamp(p.endDate)}</div>
                      </td>
                      <td className="p-3.5">
                        <Badge status={statusLabel} type="policy" />
                      </td>
                      <td className="p-3.5 text-right space-x-2">
                        {!isVerified && !isCancelled && (
                          <button
                            onClick={() => handleVerify(p.policyId)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600/90 hover:bg-emerald-500 text-white rounded text-[11px] font-medium transition"
                            title="Verify policy underwriting"
                          >
                            <Check className="w-3 h-3" /> Verify
                          </button>
                        )}
                        {isVerified && !isCancelled && (
                          <button
                            onClick={() => handleCancel(p.policyId)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-950/80 hover:bg-rose-900 border border-rose-800/60 text-rose-300 rounded text-[11px] font-medium transition"
                            title="Cancel policy (preserves pre-cancellation coverage)"
                          >
                            <Ban className="w-3 h-3" /> Cancel
                          </button>
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

      {/* Modal: Underwrite New Policy */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" />
                Underwrite & Register Policy
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-200 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleRegister} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Policy Identifier / Tag</label>
                  <input
                    type="text"
                    required
                    value={form.policyRef}
                    onChange={(e) => setForm({ ...form, policyRef: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Property Reference</label>
                  <input
                    type="text"
                    required
                    value={form.propertyRef}
                    onChange={(e) => setForm({ ...form, propertyRef: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Policyholder / Corporate Client Ref</label>
                <input
                  type="text"
                  required
                  value={form.holderRef}
                  onChange={(e) => setForm({ ...form, holderRef: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Sum Insured (₹ INR)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={form.sumInsuredRupees}
                    onChange={(e) => setForm({ ...form, sumInsuredRupees: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Deductible (₹ INR)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={form.deductibleRupees}
                    onChange={(e) => setForm({ ...form, deductibleRupees: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Policy Document SHA-256 Fingerprint</label>
                <input
                  type="text"
                  required
                  value={form.docHash}
                  onChange={(e) => setForm({ ...form, docHash: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 font-mono text-[11px]"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="fireCovered"
                  checked={form.fireCovered}
                  onChange={(e) => setForm({ ...form, fireCovered: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-950 text-flame-600 focus:ring-0"
                />
                <label htmlFor="fireCovered" className="text-slate-300">
                  Fire peril covered under section 1
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded text-xs font-semibold"
                >
                  {submitting ? "Submitting to Blockchain..." : "Confirm & Register"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

