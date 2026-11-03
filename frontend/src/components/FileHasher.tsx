import React, { useState } from "react";
import { computeSHA256 } from "../utils/crypto";
import { UploadCloud, Copy, Check, FileCheck, ShieldCheck } from "lucide-react";

export const FileHasher: React.FC = () => {
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
          isDragging ? "border-flame-500 bg-flame-950/20" : "border-slate-700 hover:border-slate-600 bg-slate-950/40"
        }`}
        onClick={() => document.getElementById("file-input")?.click()}
      >
        <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-2" />
        <span className="text-sm font-medium text-slate-200">
          Click to select or drag and drop any file
        </span>
        <p className="text-xs text-slate-400 mt-1">
          PDF policy, incident scene photos, fire report, or surveyor assessment sheet
        </p>
        <input
          id="file-input"
          type="file"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])}
        />
      </div>

      {sha256Hash && (
        <div className="mt-4 p-3.5 bg-slate-950/80 border border-slate-800 rounded-lg">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
            <span className="flex items-center gap-1.5 text-slate-200 font-medium truncate max-w-xs">
              <FileCheck className="w-4 h-4 text-emerald-400" />
              {fileName} ({fileSize})
            </span>
            <span className="text-emerald-400 text-xs">SHA-256 Ready</span>
          </div>

          <div className="flex items-center gap-2">
            <code className="text-xs text-amber-300 font-mono bg-slate-900 px-2.5 py-1.5 rounded flex-1 select-all break-all border border-slate-800">
              {sha256Hash}
            </code>
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded transition"
              title="Copy 0x hash to clipboard"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

