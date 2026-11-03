import React, { useState } from 'react';
import { 
  Blocks, 
  Copy, 
  Check, 
  ExternalLink, 
  Shield, 
  Terminal, 
  Code, 
  CheckCircle2, 
  Flame, 
  Lock 
} from 'lucide-react';
import { FireEventItem } from '../types';

interface BlockchainLedgerViewProps {
  contractAddress: string;
  fireEvents: FireEventItem[];
}

export const BlockchainLedgerView: React.FC<BlockchainLedgerViewProps> = ({
  contractAddress,
  fireEvents
}) => {
  const [copiedContract, setCopiedContract] = useState(false);
  const [activeTab, setActiveTab] = useState<'events' | 'abi'>('events');

  const copyContract = () => {
    navigator.clipboard.writeText(contractAddress);
    setCopiedContract(true);
    setTimeout(() => setCopiedContract(false), 2000);
  };

  const sampleAbi = [
    {
      "name": "registerEvent",
      "type": "function",
      "stateMutability": "nonpayable",
      "inputs": [
        { "name": "deviceId", "type": "string" },
        { "name": "propertyId", "type": "string" },
        { "name": "temperature", "type": "int256" },
        { "name": "smokeLevel", "type": "uint256" },
        { "name": "flameDetected", "type": "bool" },
        { "name": "verified", "type": "bool" }
      ],
      "outputs": [{ "name": "eventId", "type": "bytes32" }]
    },
    {
      "name": "EventRegistered",
      "type": "event",
      "inputs": [
        { "name": "eventId", "type": "bytes32", "indexed": true },
        { "name": "approved", "type": "bool", "indexed": false }
      ]
    },
    {
      "name": "getEvent",
      "type": "function",
      "stateMutability": "view",
      "inputs": [{ "name": "id", "type": "bytes32" }],
      "outputs": [
        {
          "components": [
            { "name": "timestamp", "type": "uint256" },
            { "name": "deviceId", "type": "string" },
            { "name": "propertyId", "type": "string" },
            { "name": "temperature", "type": "int256" },
            { "name": "smokeLevel", "type": "uint256" },
            { "name": "flameDetected", "type": "bool" },
            { "name": "verified", "type": "bool" }
          ],
          "type": "tuple"
        }
      ]
    }
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Title */}
      <div>
        <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-cyan-400">
          <Blocks className="w-4 h-4" />
          <span>Decentralized Ledger</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
          Smart Contract & Blockchain Audit
        </h2>
        <p className="text-slate-400 text-sm mt-1 max-w-3xl">
          Verified fire incidents are immutably registered into the Ethereum Virtual Machine via <span className="font-mono text-cyan-400">FireInsurance.sol</span>. Inspect smart contract telemetry, contract ABI, and cryptographic transaction proofs.
        </p>
      </div>

      {/* Network & Smart Contract Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Contract Address */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Contract Address
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-mono">
              Solidity 0.8.24
            </span>
          </div>
          <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-xs text-white">
            <span className="truncate mr-2">{contractAddress || '0x5FbDB2315678afecb367f032d93F642f64180aa3'}</span>
            <button
              onClick={copyContract}
              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
            >
              {copiedContract ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <div className="text-[11px] text-slate-500 flex items-center justify-between">
            <span>Target Contract:</span>
            <span className="font-mono text-slate-300">FireInsurance.sol</span>
          </div>
        </div>

        {/* Network Parameters */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              EVM Network
            </span>
            <span className="flex items-center space-x-1 text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>SYNCHRONIZED</span>
            </span>
          </div>
          <div className="space-y-1.5 text-xs text-slate-300">
            <div className="flex justify-between py-1 border-b border-slate-800/80">
              <span className="text-slate-500">RPC Endpoint:</span>
              <span className="font-mono text-cyan-400">http://127.0.0.1:8545</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/80">
              <span className="text-slate-500">Chain ID:</span>
              <span className="font-mono text-white">31337 (Hardhat Local)</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Consensus Engine:</span>
              <span className="font-mono text-slate-300">Proof of Authority / Local</span>
            </div>
          </div>
        </div>

        {/* Security & Immutability */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Security Guarantee
            </span>
            <Shield className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Cryptographic tamper-proofing guarantees that fire incident timestamps and sensor readings cannot be retroactively falsified or manipulated by claimants or underwriters.
          </p>
          <div className="text-[11px] text-emerald-400 font-mono flex items-center space-x-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Cryptographic keccak256 indexing</span>
          </div>
        </div>
      </div>

      {/* Tabs: On-Chain Records vs Contract ABI */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="flex border-b border-slate-800 bg-slate-950/50 px-6 pt-3 space-x-4">
          <button
            onClick={() => setActiveTab('events')}
            className={`pb-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'events'
                ? 'border-cyan-400 text-white'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            Registered Fire Events ({fireEvents.length})
          </button>
          <button
            onClick={() => setActiveTab('abi')}
            className={`pb-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'abi'
                ? 'border-cyan-400 text-white'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            Contract Interface (ABI)
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'events' ? (
            <div>
              {fireEvents.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-xs">
                  No events on-chain yet. Transmit a reading in the Telemetry Simulator to write to the blockchain.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-800/60 text-slate-400 uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Event Ref ID</th>
                        <th className="py-3 px-4">Device Node</th>
                        <th className="py-3 px-4">Property</th>
                        <th className="py-3 px-4">Temp</th>
                        <th className="py-3 px-4">Smoke</th>
                        <th className="py-3 px-4">Flame</th>
                        <th className="py-3 px-4">Verification</th>
                        <th className="py-3 px-4">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {fireEvents.map((ev) => (
                        <tr key={ev.id} className="hover:bg-slate-800/40">
                          <td className="py-3 px-4 font-mono font-bold text-cyan-300">
                            {ev.id.slice(0, 10)}...
                          </td>
                          <td className="py-3 px-4 font-mono text-white">
                            {ev.device_id}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-400">
                            {ev.property_id}
                          </td>
                          <td className="py-3 px-4 font-mono">
                            <span className={ev.temperature >= 60 ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                              {ev.temperature.toFixed(1)}°C
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono">
                            <span className={ev.smoke_level >= 400 ? 'text-amber-400 font-bold' : 'text-slate-300'}>
                              {ev.smoke_level}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {ev.flame_detected ? (
                              <span className="px-2 py-0.5 rounded text-[10px] bg-red-500/20 text-red-400 font-bold">
                                YES
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400">
                                NO
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {ev.verified ? (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>ON-CHAIN VERIFIED</span>
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-400 border border-slate-700">
                                UNVERIFIED
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                            {new Date(ev.timestamp).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Solidity JSON ABI Interface</span>
                <span className="font-mono text-cyan-400">FireInsurance.json</span>
              </div>
              <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono text-emerald-300 overflow-x-auto max-h-96">
                {JSON.stringify(sampleAbi, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
