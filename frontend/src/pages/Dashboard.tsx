import React, { useEffect, useState } from "react";
import { useWeb3 } from "../context/Web3Context";
import { StatCard } from "../components/StatCard";
import { FileHasher } from "../components/FileHasher";
import { Badge } from "../components/Badge";
import { formatPaise } from "../utils/formatters";
import { Shield, Flame, FileSpreadsheet, CheckCircle2, ArrowRight } from "lucide-react";

interface DashboardProps {
  setActiveTab: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ setActiveTab }) => {
  const { readContract, refreshKey } = useWeb3();

  const [stats, setStats] = useState({
    policies: 0,
    incidents: 0,
    claims: 0,
    assessments: 0,
    totalSettledPaise: 0n
  });

  const [recentClaims, setRecentClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadData() {
      if (!readContract) return;
      try {
        setLoading(true);
        const [pCount, iCount, cCount, aCount] = await Promise.all([
          readContract.getTotalPolicies(),
          readContract.getTotalIncidents(),
          readContract.getTotalClaims(),
          readContract.getTotalAssessments()
        ]);

        let settledSum = 0n;
        const claimsList = [];

        const totalClaimsNum = Number(cCount);
        for (let i = 1; i <= Math.min(totalClaimsNum, 5); i++) {
          try {
            const claim = await readContract.getClaim(i);
            claimsList.push(claim);
            if (claim.settledAmount) {
              settledSum += BigInt(claim.settledAmount);
            }
          } catch (e) {
            console.warn("Error fetching claim", i, e);
          }
        }

        if (active) {
          setStats({
            policies: Number(pCount),
            incidents: Number(iCount),
            claims: Number(cCount),
            assessments: Number(aCount),
            totalSettledPaise: settledSum
          });
          setRecentClaims(claimsList);
        }
      } catch (err) {
        console.warn("Could not query contract data", err);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadData();

    return () => {
      active = false;
    };
  }, [readContract, refreshKey]);

  return (
    <div className="space-y-8">
      {/* Hero Welcome & Quick Intro */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-900 to-flame-950/40 border border-slate-800 rounded-2xl p-6 sm:p-8">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-flame-950 text-flame-400 border border-flame-800/60 text-xs font-semibold mb-4">
            <Flame className="w-3.5 h-3.5" />
            Enterprise InsurTech Prototype
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">
            Decentralized Fire Insurance Claim Settlements
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            FireChain eliminates settlement fraud and delays by storing confidential evidence off-chain while anchoring verifiable cryptographic fingerprints, multi-party civic attestations, and loss assessments on the Ethereum blockchain.
          </p>
        </div>
      </div>

      {/* Stats Counter Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Policies"
          value={stats.policies}
          subtitle="Underwritten on-chain"
          icon={<Shield className="w-5 h-5 text-blue-400" />}
        />
        <StatCard
          title="Fire Incidents"
          value={stats.incidents}
          subtitle="Civic officer verified"
          icon={<Flame className="w-5 h-5 text-flame-400" />}
        />
        <StatCard
          title="Claims Processed"
          value={stats.claims}
          subtitle={`${stats.assessments} assessments filed`}
          icon={<FileSpreadsheet className="w-5 h-5 text-amber-400" />}
        />
        <StatCard
          title="Total Settled"
          value={formatPaise(stats.totalSettledPaise)}
          subtitle="Bank transfer attested"
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-400" />}
        />
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: 9-Step Workflow Visualizer & Recent Claims */}
        <div className="lg:col-span-2 space-y-6">
          {/* 9-Step Workflow Pipeline Guide */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-100 flex items-center gap-2">
                <span>Claims Pipeline Lifecycle</span>
              </h3>
              <span className="text-xs text-slate-400">Sequential multi-party attestation</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div
                onClick={() => setActiveTab("policies")}
                className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-lg hover:border-blue-500/50 cursor-pointer transition"
              >
                <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-1">
                  Phase 1 • Insurer
                </div>
                <div className="font-medium text-sm text-slate-200">Policy Issuance</div>
                <div className="text-xs text-slate-400 mt-1">Register policy terms & verify underwriting bounds.</div>
              </div>

              <div
                onClick={() => setActiveTab("incidents")}
                className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-lg hover:border-flame-500/50 cursor-pointer transition"
              >
                <div className="text-[10px] font-bold text-flame-400 uppercase tracking-wider mb-1">
                  Phase 2 • Fire Officer
                </div>
                <div className="font-medium text-sm text-slate-200">Incident Attestation</div>
                <div className="text-xs text-slate-400 mt-1">Civic fire officer verifies incident and commits report hash.</div>
              </div>

              <div
                onClick={() => setActiveTab("claims")}
                className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-lg hover:border-emerald-500/50 cursor-pointer transition"
              >
                <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-1">
                  Phase 3 & 4 • Surveyor
                </div>
                <div className="font-medium text-sm text-slate-200">Assessment & Settlement</div>
                <div className="text-xs text-slate-400 mt-1">Surveyor itemizes loss; Insurer approves & records payment.</div>
              </div>
            </div>
          </div>

          {/* Recent Claims Feed */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-100">Live Claims Registry</h3>
              <button
                onClick={() => setActiveTab("claims")}
                className="text-xs text-flame-400 hover:text-flame-300 font-medium flex items-center gap-1"
              >
                View all claims <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {loading ? (
              <div className="text-center py-8 text-slate-500 text-sm">Loading ledger records...</div>
            ) : recentClaims.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">
                No claims created yet. Go to <span className="text-slate-300 font-medium">Policies</span> and <span className="text-slate-300 font-medium">Incidents</span> to start a claim.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase font-semibold">
                    <tr>
                      <th className="p-3 rounded-l-lg">Claim ID</th>
                      <th className="p-3">Policy ID</th>
                      <th className="p-3">Incident ID</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Approved Amount</th>
                      <th className="p-3 rounded-r-lg">Settled Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {recentClaims.map((c) => {
                      const statuses = ["NONE", "SUBMITTED", "ASSESSED", "APPROVED", "REJECTED", "SETTLED"];
                      const st = statuses[Number(c.status)] || "UNKNOWN";
                      return (
                        <tr key={c.claimId.toString()} className="hover:bg-slate-800/40 transition">
                          <td className="p-3 font-mono font-medium text-slate-200">#{c.claimId.toString()}</td>
                          <td className="p-3 font-mono text-slate-400">#{c.policyId.toString()}</td>
                          <td className="p-3 font-mono text-slate-400">#{c.incidentId.toString()}</td>
                          <td className="p-3"><Badge status={st} type="claim" /></td>
                          <td className="p-3 font-semibold text-slate-200">{formatPaise(c.approvedAmount)}</td>
                          <td className="p-3 font-semibold text-emerald-400">{formatPaise(c.settledAmount)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Integrated Client-Side Document Hasher Tool */}
        <div className="space-y-6">
          <FileHasher />

          {/* Architecture Reminder Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 text-xs text-slate-400 space-y-2.5">
            <div className="font-semibold text-slate-200 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-flame-400" />
              Zero-PII On-Chain Guarantee
            </div>
            <p>
              Sensitive customer details (KYC, building blueprints, fire photos) remain within the insurer's enterprise storage.
            </p>
            <p>
              Only 32-byte cryptographic digests are published to the smart contract, ensuring absolute GDPR/DPDP compliance and non-repudiation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
