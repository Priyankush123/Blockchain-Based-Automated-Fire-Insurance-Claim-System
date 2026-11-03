import React, { useEffect, useState } from "react";
import { useWeb3 } from "../context/Web3Context";
import { HARDHAT_PERSONAS } from "../config/accounts";
import { ROLE_ENUM } from "../config/contract";
import { shortenAddress } from "../utils/formatters";
import { ShieldAlert, UserPlus, Sparkles, CheckCircle2, XCircle } from "lucide-react";

export const RolesPage: React.FC = () => {
  const { contract, readContract, role, refreshKey, triggerRefresh, setError } = useWeb3();

  const [stakeholderStatus, setStakeholderStatus] = useState<Record<string, { insurer: boolean; officer: boolean; surveyor: boolean; admin: boolean }>>({});
  const [submitting, setSubmitting] = useState(false);

  // Form for custom role assignment
  const [customAddress, setCustomAddress] = useState("");
  const [selectedRole, setSelectedRole] = useState<number>(0);

  useEffect(() => {
    let active = true;

    async function checkRoles() {
      if (!readContract) return;
      try {
        const [adminRole, insurerRole, officerRole, surveyorRole] = await Promise.all([
          readContract.DEFAULT_ADMIN_ROLE(),
          readContract.INSURER_ROLE(),
          readContract.FIRE_OFFICER_ROLE(),
          readContract.SURVEYOR_ROLE()
        ]);

        const statusMap: Record<string, any> = {};

        for (const p of HARDHAT_PERSONAS) {
          const [isAdmin, isInsurer, isOfficer, isSurveyor] = await Promise.all([
            readContract.hasRole(adminRole, p.address),
            readContract.hasRole(insurerRole, p.address),
            readContract.hasRole(officerRole, p.address),
            readContract.hasRole(surveyorRole, p.address)
          ]);

          statusMap[p.address.toLowerCase()] = {
            admin: isAdmin,
            insurer: isInsurer,
            officer: isOfficer,
            surveyor: isSurveyor
          };
        }

        if (active) setStakeholderStatus(statusMap);
      } catch (err: any) {
        console.warn("Failed to check stakeholder roles", err);
      }
    }

    checkRoles();

    return () => {
      active = false;
    };
  }, [readContract, refreshKey]);

  // 1-Click Seed All Demo Roles
  const handleSeedAllRoles = async () => {
    if (!contract) return;
    try {
      setSubmitting(true);
      setError(null);

      // Insurer #1
      try {
        const tx1 = await contract.registerStakeholder(HARDHAT_PERSONAS[1].address, ROLE_ENUM.INSURER);
        await tx1.wait();
      } catch (e: any) {
        console.log("Insurer already registered or error:", e.message);
      }

      // Fire Officer #2
      try {
        const tx2 = await contract.registerStakeholder(HARDHAT_PERSONAS[2].address, ROLE_ENUM.FIRE_OFFICER);
        await tx2.wait();
      } catch (e: any) {
        console.log("Fire Officer already registered or error:", e.message);
      }

      // Surveyor #3
      try {
        const tx3 = await contract.registerStakeholder(HARDHAT_PERSONAS[3].address, ROLE_ENUM.SURVEYOR);
        await tx3.wait();
      } catch (e: any) {
        console.log("Surveyor already registered or error:", e.message);
      }

      triggerRefresh();
    } catch (err: any) {
      setError(err.reason || err.message || "Failed to seed demo roles");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGrantRole = async (accountAddr: string, roleEnumVal: number) => {
    if (!contract) return;
    try {
      setSubmitting(true);
      setError(null);
      const tx = await contract.registerStakeholder(accountAddr.trim(), roleEnumVal);
      await tx.wait();
      triggerRefresh();
    } catch (err: any) {
      setError(err.reason || err.message || "Role registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevokeRole = async (accountAddr: string, roleEnumVal: number) => {
    if (!contract) return;
    try {
      setSubmitting(true);
      setError(null);
      const tx = await contract.revokeStakeholder(accountAddr.trim(), roleEnumVal);
      await tx.wait();
      triggerRefresh();
    } catch (err: any) {
      setError(err.reason || err.message || "Role revocation failed");
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
            <ShieldAlert className="w-5 h-5 text-purple-400" />
            Stakeholder Role-Based Access Control (RBAC)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Admin console for managing cryptographic roles and permissions for Insurers, Fire Officers, and Surveyors.
          </p>
        </div>

        <button
          onClick={handleSeedAllRoles}
          disabled={submitting || !role.isAdmin}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-sm transition"
        >
          <Sparkles className="w-4 h-4" />
          1-Click Seed All Demo Roles
        </button>
      </div>

      {!role.isAdmin && (
        <div className="bg-purple-950/40 border border-purple-800/60 rounded-xl p-3.5 text-xs text-purple-300">
          <strong>Admin Privileges Required:</strong> Only the deployer / admin account can register or revoke stakeholder roles. Switch to <strong>Admin / Deployer</strong> in the top navbar to execute role changes.
        </div>
      )}

      {/* Stakeholder Audit Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {HARDHAT_PERSONAS.slice(0, 4).map((p) => {
          const st = stakeholderStatus[p.address.toLowerCase()] || {
            admin: false,
            insurer: false,
            officer: false,
            surveyor: false
          };

          return (
            <div key={p.id} className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-white text-sm">{p.name}</h3>
                  <div className="text-[11px] text-slate-400">{p.roleTitle}</div>
                </div>
                <code className="text-[10px] font-mono text-slate-500 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                  {shortenAddress(p.address)}
                </code>
              </div>

              <div className="pt-2 border-t border-slate-800 space-y-1.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Default Admin:</span>
                  {st.admin ? (
                    <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Assigned</span>
                  ) : (
                    <span className="text-slate-600 flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> None</span>
                  )}
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Insurer Role:</span>
                  {st.insurer ? (
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Assigned</span>
                      {role.isAdmin && (
                        <button
                          onClick={() => handleRevokeRole(p.address, ROLE_ENUM.INSURER)}
                          className="text-[10px] text-rose-400 hover:text-rose-300"
                        >
                          Revoke
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-600 flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> None</span>
                      {role.isAdmin && (
                        <button
                          onClick={() => handleGrantRole(p.address, ROLE_ENUM.INSURER)}
                          className="text-[10px] text-blue-400 hover:text-blue-300"
                        >
                          Grant
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Fire Officer Role:</span>
                  {st.officer ? (
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Assigned</span>
                      {role.isAdmin && (
                        <button
                          onClick={() => handleRevokeRole(p.address, ROLE_ENUM.FIRE_OFFICER)}
                          className="text-[10px] text-rose-400 hover:text-rose-300"
                        >
                          Revoke
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-600 flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> None</span>
                      {role.isAdmin && (
                        <button
                          onClick={() => handleGrantRole(p.address, ROLE_ENUM.FIRE_OFFICER)}
                          className="text-[10px] text-flame-400 hover:text-flame-300"
                        >
                          Grant
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Surveyor Role:</span>
                  {st.surveyor ? (
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Assigned</span>
                      {role.isAdmin && (
                        <button
                          onClick={() => handleRevokeRole(p.address, ROLE_ENUM.SURVEYOR)}
                          className="text-[10px] text-rose-400 hover:text-rose-300"
                        >
                          Revoke
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-600 flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> None</span>
                      {role.isAdmin && (
                        <button
                          onClick={() => handleGrantRole(p.address, ROLE_ENUM.SURVEYOR)}
                          className="text-[10px] text-cyan-400 hover:text-cyan-300"
                        >
                          Grant
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Manual Role Grant / Revoke Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 max-w-xl">
        <h3 className="font-semibold text-white text-sm mb-2 flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-purple-400" />
          Assign Role to Custom Address
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          Authorize arbitrary external Ethereum accounts or multi-sig contracts.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleGrantRole(customAddress, selectedRole);
          }}
          className="space-y-3 text-xs"
        >
          <div>
            <label className="block text-slate-400 mb-1">Target Account Address</label>
            <input
              type="text"
              required
              placeholder="0x..."
              value={customAddress}
              onChange={(e) => setCustomAddress(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 font-mono text-[11px]"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Role Type</label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200"
            >
              <option value={ROLE_ENUM.INSURER}>INSURER_ROLE (Underwriting & Claims)</option>
              <option value={ROLE_ENUM.FIRE_OFFICER}>FIRE_OFFICER_ROLE (Civic Verification)</option>
              <option value={ROLE_ENUM.SURVEYOR}>SURVEYOR_ROLE (Loss Adjustment)</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={submitting || !role.isAdmin}
            className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded text-xs font-semibold"
          >
            {submitting ? "Registering..." : "Assign Role On-Chain"}
          </button>
        </form>
      </div>
    </div>
  );
};
