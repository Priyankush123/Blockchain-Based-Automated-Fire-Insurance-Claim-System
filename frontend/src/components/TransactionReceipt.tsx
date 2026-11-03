import React, { useState } from "react";
import { ethers } from "ethers";
import { CheckCircle2, Copy, Check, Blocks, Fuel, Hash, ShieldCheck, X } from "lucide-react";

interface TransactionReceiptProps {
  receipt: ethers.TransactionReceipt | null;
  title?: string;
  onClose?: () => void;
}

export const TransactionReceipt: React.FC<TransactionReceiptProps> = ({
  receipt,
  title = "Transaction Successfully Mined",
  onClose
}) => {
  const [copiedHash, setCopiedHash] = useState(false);

  if (!receipt) return null;

  const handleCopyHash = () => {
    navigator.clipboard.writeText(receipt.hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const isSuccess = receipt.status === 1;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-700/60 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
              {title}
              <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold border ${
                isSuccess
                  ? "bg-emerald-950/60 text-emerald-300 border-emerald-800"
                  : "bg-rose-950/60 text-rose-300 border-rose-800"
              }`}>
                {isSuccess ? "Confirmed" : "Reverted"}
              </span>
            </h4>
            <p className="text-[11px] text-slate-400">
              Verified & committed to EVM local blockchain state
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition"
            title="Dismiss receipt"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Grid of Transaction Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Block Number */}
        <div className="bg-slate-950 border border-slate-800/90 rounded-xl p-3">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium flex items-center gap-1.5">
              <Blocks className="w-3.5 h-3.5 text-cyan-400" />
              Block Number
            </span>
            <span className="text-[10px] uppercase font-mono px-1 rounded bg-slate-800 text-slate-400">
              Mined
            </span>
          </div>
          <div className="text-base font-bold font-mono text-cyan-300">
            #{receipt.blockNumber.toString()}
          </div>
        </div>

        {/* Gas Used */}
        <div className="bg-slate-950 border border-slate-800/90 rounded-xl p-3">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium flex items-center gap-1.5">
              <Fuel className="w-3.5 h-3.5 text-amber-400" />
              Gas Consumed
            </span>
            <span className="text-[10px] uppercase font-mono px-1 rounded bg-slate-800 text-slate-400">
              Units
            </span>
          </div>
          <div className="text-base font-bold font-mono text-amber-300">
            {receipt.gasUsed.toLocaleString()}
          </div>
        </div>

        {/* Cumulative Gas / Effective Gas Price */}
        <div className="bg-slate-950 border border-slate-800/90 rounded-xl p-3">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Consensus
            </span>
            <span className="text-[10px] uppercase font-mono px-1 rounded bg-slate-800 text-slate-400">
              EVM
            </span>
          </div>
          <div className="text-base font-bold font-mono text-emerald-300">
            100% Finalized
          </div>
        </div>
      </div>

      {/* Transaction Hash */}
      <div className="bg-slate-950 border border-slate-800/90 rounded-xl p-3 space-y-1.5">
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5 font-medium">
            <Hash className="w-3.5 h-3.5 text-flame-400" />
            Transaction Hash
          </span>
          <button
            onClick={handleCopyHash}
            className="flex items-center gap-1 text-[11px] text-slate-300 hover:text-white transition"
          >
            {copiedHash ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-semibold">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Copy Hash</span>
              </>
            )}
          </button>
        </div>

        <div className="font-mono text-xs text-slate-200 break-all bg-slate-900/60 p-2 rounded-lg border border-slate-800">
          {receipt.hash}
        </div>
      </div>

      {/* Contract / Target Address Footer */}
      {(receipt.to || receipt.contractAddress) && (
        <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 pt-1">
          <span>
            {receipt.contractAddress ? "Created Contract:" : "Target Contract:"}
          </span>
          <span className="font-mono text-slate-300">
            {receipt.contractAddress || receipt.to}
          </span>
        </div>
      )}
    </div>
  );
};
