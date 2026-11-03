import React, { useState } from "react";
import { computeSHA256 } from "../utils/crypto";
import { UploadCloud, Copy, Check, FileCheck, ShieldCheck } from "lucide-react";

interface FileHasherProps {
  onHashCalculated?: (hash: string) => void;
}

export const FileHasher: React.FC<FileHasherProps> = ({ onHashCalculated }) => {
  const [fileName, setFileName] = useState<string>("");
  const [fileSize, setFileSize] = useState<string>("");
  const [sha256Hash, setSha256Hash] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const processFile = async (file: File) => {
    setFileName(file.name);
    setFileSize((file.size / 1024).toFixed(1) + " KB");
    try {
      const buffer = await file.arrayBuffer();
      const hash = await computeSHA256(buffer);
      setSha256Hash(hash);
      if (onHashCalculated) {
        onHashCalculated(hash);
      }
    } catch (err) {
      console.error("Hashing failed", err);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const copyToClipboard = () => {
    if (!sha256Hash) return;
    navigator.clipboard.writeText(sha256Hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg">
      <div className="flex items-center gap-2 mb-3">
        <ShieldCheck className="w-5 h-5 text-emerald-400" />
        <h3 className="font-semibold text-slate-100">Cryptographic Document Hasher</h3>
      </div>
      <p className="text-xs text-slate-400 mb-4">
        FireChain follows the <span className="text-slate-200 font-medium">Hash-on-Chain</span> architecture. Compute 32-byte SHA-256 digests locally in your browser. Files are never uploaded over the network.
      </p>

      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition ${
          isDragging ? "border-emerald-500 bg-emerald-950/20" : "border-slate-700 hover:border-slate-600 bg-slate-950/40"
        }`}
        onClick={() => document.getElementById("file-input")?.click()}
      >
        <input
          id="file-input"
          type="file"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              processFile(e.target.files[0]);
            }
          }}
        />
        <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-2" />
        <p className="text-xs font-medium text-slate-300">
          Click to upload or drag & drop document
        </p>
        <p className="text-[11px] text-slate-500 mt-1">
          PDF, PNG, JPG, or TXT
        </p>
      </div>

      {sha256Hash && (
        <div className="mt-4 p-3 bg-slate-950 border border-slate-800 rounded-lg">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="flex items-center gap-1.5 font-medium text-slate-300">
              <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
              {fileName} ({fileSize})
            </span>
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 font-medium"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied" : "Copy Hash"}
            </button>
          </div>
          <div className="font-mono text-[11px] text-emerald-300 break-all bg-emerald-950/30 p-2 rounded border border-emerald-900/50">
            {sha256Hash}
          </div>
        </div>
      )}
    </div>
  );
};
