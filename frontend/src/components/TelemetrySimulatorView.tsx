import React, { useState } from 'react';
import { 
  Flame, 
  Thermometer, 
  Wind, 
  Eye, 
  Clock, 
  Send, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Copy, 
  Check, 
  Blocks, 
  BrainCircuit, 
  ArrowRight, 
  RefreshCw,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { SensorReading, FireVerifyResponse } from '../types';
import { verifyFireSensor } from '../services/api';

interface TelemetrySimulatorViewProps {
  onVerificationSuccess: (res: FireVerifyResponse) => void;
  onProceedToClaim: (eventId: string) => void;
}

export const TelemetrySimulatorView: React.FC<TelemetrySimulatorViewProps> = ({
  onVerificationSuccess,
  onProceedToClaim
}) => {
  const [formData, setFormData] = useState<SensorReading>({
    device_id: 'ESP32_BLD_01',
    property_id: 'PROP_SECTOR_7',
    temperature: 92.5,
    smoke_level: 820,
    flame_detected: true,
    latitude: 37.7749,
    longitude: -122.4194,
    timestamp: new Date().toISOString().slice(0, 19),
    duration_seconds: 6
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FireVerifyResponse | null>(null);
  const [copiedTx, setCopiedTx] = useState(false);
  const [copiedEvent, setCopiedEvent] = useState(false);

  // Preset testing scenarios
  const scenarios = [
    {
      name: 'Safe Ambient Office',
      icon: '🟢',
      desc: 'Normal everyday conditions',
      data: {
        device_id: 'ESP32_OFFICE_01',
        property_id: 'PROP_SECTOR_1',
        temperature: 24.0,
        smoke_level: 45,
        flame_detected: false,
        duration_seconds: 1
      }
    },
    {
      name: 'Kitchen / Dense Cooking Smoke',
      icon: '🟡',
      desc: 'Moderate heat & smoke, no flame detected',
      data: {
        device_id: 'ESP32_KITCHEN_03',
        property_id: 'PROP_SECTOR_2',
        temperature: 58.0,
        smoke_level: 460,
        flame_detected: false,
        duration_seconds: 4
      }
    },
    {
      name: 'Localized Heating Element',
      icon: '🟠',
      desc: 'High heat, negligible smoke & no flame',
      data: {
        device_id: 'ESP32_BOILER_02',
        property_id: 'PROP_SECTOR_4',
        temperature: 82.0,
        smoke_level: 60,
        flame_detected: false,
        duration_seconds: 2
      }
    },
    {
      name: 'Major Structural Blaze',
      icon: '🔴',
      desc: 'Critical temperature, heavy smoke & active flames',
      data: {
        device_id: 'ESP32_WAREHOUSE_09',
        property_id: 'PROP_SECTOR_7',
        temperature: 95.0,
        smoke_level: 880,
        flame_detected: true,
        duration_seconds: 8
      }
    },
    {
      name: 'Sensor Fault / Glitch',
      icon: '⚠️',
      desc: 'Extreme 150°C heat with zero smoke (contradiction)',
      data: {
        device_id: 'ESP32_FAULTY_01',
        property_id: 'PROP_SECTOR_9',
        temperature: 150.0,
        smoke_level: 0,
        flame_detected: false,
        duration_seconds: 2
      }
    }
  ];

  const applyScenario = (scenarioData: Partial<SensorReading>) => {
    setFormData(prev => ({
      ...prev,
      ...scenarioData,
      timestamp: new Date().toISOString().slice(0, 19)
    }));
    setResult(null);
    setError(null);
  };

  const handleTransmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await verifyFireSensor({
        ...formData,
        timestamp: new Date().toISOString().slice(0, 19)
      });
      setResult(response);
      onVerificationSuccess(response);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error during verification';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, type: 'tx' | 'event') => {
    navigator.clipboard.writeText(text);
    if (type === 'tx') {
      setCopiedTx(true);
      setTimeout(() => setCopiedTx(false), 2000);
    } else {
      setCopiedEvent(true);
      setTimeout(() => setCopiedEvent(false), 2000);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-orange-400">
          <Flame className="w-4 h-4" />
          <span>Real-Time IoT Telemetry Ingestion</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
          Sensor Telemetry & Fire Verification Simulator
        </h2>
        <p className="text-slate-400 text-sm mt-1 max-w-3xl">
          Simulate IoT sensor nodes streaming environmental conditions. The FastAPI engine routes the payload through a hybrid deterministic rule engine and a Random Forest ML model, writing verified incidents to the Hardhat Ethereum smart contract.
        </p>
      </div>

      {/* Preset Scenarios Selector */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Quick Test Scenarios (1-Click Presets)</span>
          </span>
          <span className="text-xs text-slate-500">Select any scenario to populate sensor sliders</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {scenarios.map((sc, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => applyScenario(sc.data)}
              className="text-left p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-orange-500/40 transition-all cursor-pointer group"
            >
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-base">{sc.icon}</span>
                <span className="text-xs font-bold text-slate-200 group-hover:text-orange-400 transition-colors">
                  {sc.name}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">{sc.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Telemetry Controls vs Live Arbitration Results */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Sensor Controls Form */}
        <div className="lg:col-span-6 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Thermometer className="w-5 h-5 text-orange-400" />
              <span>IoT Node Parameters</span>
            </h3>
            <span className="text-xs font-mono text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/40">
              Protocol: MQTT/HTTP
            </span>
          </div>

          <form onSubmit={handleTransmit} className="space-y-5">
            {/* Device & Property ID */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Device ID (Node)</label>
                <input
                  type="text"
                  value={formData.device_id}
                  onChange={e => setFormData({ ...formData, device_id: e.target.value })}
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Property ID</label>
                <input
                  type="text"
                  value={formData.property_id}
                  onChange={e => setFormData({ ...formData, property_id: e.target.value })}
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            {/* Slider 1: Temperature */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                  <Thermometer className="w-4 h-4 text-rose-400" />
                  <span>Ambient Temperature (°C)</span>
                </label>
                <span className={`text-sm font-mono font-bold px-2 py-0.5 rounded ${
                  formData.temperature >= 60 ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-slate-800 text-slate-300'
                }`}>
                  {formData.temperature.toFixed(1)} °C
                </span>
              </div>
              <input
                type="range"
                min="-20"
                max="150"
                step="0.5"
                value={formData.temperature}
                onChange={e => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>-20°C (Freezing)</span>
                <span className="text-amber-500/70">60°C (Threshold)</span>
                <span>150°C (Inferno)</span>
              </div>
            </div>

            {/* Slider 2: Smoke Level */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                  <Wind className="w-4 h-4 text-amber-400" />
                  <span>Optical Smoke Density (ADC / PPM)</span>
                </label>
                <span className={`text-sm font-mono font-bold px-2 py-0.5 rounded ${
                  formData.smoke_level >= 400 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-slate-800 text-slate-300'
                }`}>
                  {formData.smoke_level} PPM
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1023"
                step="1"
                value={formData.smoke_level}
                onChange={e => setFormData({ ...formData, smoke_level: parseInt(e.target.value) })}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>0 (Clean Air)</span>
                <span className="text-amber-500/70">400 (Fire Threshold)</span>
                <span>1023 (Heavy Smoke)</span>
              </div>
            </div>

            {/* Flame Detection Toggle Switch */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/80">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${formData.flame_detected ? 'bg-red-500/20 text-red-400' : 'bg-slate-700 text-slate-400'}`}>
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">IR Flame Sensor Status</div>
                  <div className="text-[11px] text-slate-400">Infrared optical wavelength flicker detection</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, flame_detected: !formData.flame_detected })}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                  formData.flame_detected 
                    ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30' 
                    : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                }`}
              >
                {formData.flame_detected ? '🔥 FLAME ACTIVE' : 'NO FLAME'}
              </button>
            </div>

            {/* Duration Input */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Sustained Duration (sec)</span>
                </label>
                <input
                  type="number"
                  min="0"
                  max="120"
                  value={formData.duration_seconds || 0}
                  onChange={e => setFormData({ ...formData, duration_seconds: parseInt(e.target.value) || 0 })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">GPS Coordinates</label>
                <div className="text-xs font-mono text-slate-400 bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-2">
                  {formData.latitude?.toFixed(4)}, {formData.longitude?.toFixed(4)}
                </div>
              </div>
            </div>

            {/* Transmit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-bold text-sm shadow-xl shadow-orange-500/25 flex items-center justify-center space-x-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Running AI Inference & Smart Contract TX...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Transmit Telemetry & Verify Incident</span>
                </>
              )}
            </button>
          </form>

          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-start space-x-2">
              <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Transmission Error:</span> {error}
              </div>
            </div>
          )}
        </div>

        {/* Right: Live Arbitration & Blockchain Verification Output */}
        <div className="lg:col-span-6 space-y-6">
          {!result && !loading && (
            <div className="h-full min-h-[400px] border border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center p-8 text-center text-slate-500 space-y-3">
              <div className="p-4 rounded-full bg-slate-800/50 text-slate-400">
                <BrainCircuit className="w-8 h-8" />
              </div>
              <h4 className="text-base font-bold text-slate-300">Ready for Telemetry Ingestion</h4>
              <p className="text-xs max-w-sm">
                Adjust sensor sliders on the left or select a preset scenario, then click "Transmit Telemetry" to watch the hybrid AI arbitration and blockchain execution.
              </p>
            </div>
          )}

          {result && (
            <div className="space-y-5 animate-fadeIn">
              {/* Verdict Banner */}
              <div className={`p-6 rounded-2xl border transition-all ${
                result.verification_status === 'CONFIRMED_FIRE'
                  ? 'bg-red-950/40 border-red-500/50 glow-fire'
                  : result.verification_status === 'POSSIBLE_FIRE'
                  ? 'bg-amber-950/40 border-amber-500/50'
                  : result.verification_status === 'MANUAL_REVIEW'
                  ? 'bg-orange-950/30 border-orange-500/40'
                  : 'bg-emerald-950/30 border-emerald-500/40'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Arbitration Verdict</span>
                  <span className="text-xs font-mono text-slate-400">Event ID: {result.fire_event_id.slice(0, 8)}...</span>
                </div>

                <div className="mt-3 flex items-center space-x-3">
                  {result.verification_status === 'CONFIRMED_FIRE' && (
                    <div className="p-3 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30">
                      <Flame className="w-8 h-8 animate-bounce" />
                    </div>
                  )}
                  {result.verification_status === 'POSSIBLE_FIRE' && (
                    <div className="p-3 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      <AlertTriangle className="w-8 h-8" />
                    </div>
                  )}
                  {result.verification_status === 'MANUAL_REVIEW' && (
                    <div className="p-3 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30">
                      <AlertTriangle className="w-8 h-8" />
                    </div>
                  )}
                  {result.verification_status === 'NORMAL' && (
                    <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                  )}

                  <div>
                    <h3 className="text-2xl font-black tracking-tight text-white">
                      {result.verification_status.replace('_', ' ')}
                    </h3>
                    <p className="text-xs text-slate-300 mt-0.5">{result.verification.reason}</p>
                  </div>
                </div>
              </div>

              {/* Side-by-Side: Rule Engine vs AI Model */}
              <div className="grid grid-cols-2 gap-4">
                {/* Rule Engine */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Rule Engine</span>
                  <div className="text-sm font-extrabold text-white">
                    {result.verification.rule_verdict}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Thresholds: Temp ≥ 60°C & Smoke ≥ 400 & Flame
                  </div>
                </div>

                {/* AI Classifier */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400">AI Confidence</span>
                    <span className="text-xs font-mono font-bold text-white">
                      {(result.verification.ai_result.fire_confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        result.verification.ai_result.fire_confidence > 0.6 ? 'bg-red-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${result.verification.ai_result.fire_confidence * 100}%` }}
                    ></div>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Class: <span className="font-semibold text-slate-200">{result.verification.ai_result.classification}</span>
                  </div>
                </div>
              </div>

              {/* Ethereum Smart Contract Receipt */}
              <div className="bg-slate-900 border border-cyan-900/40 rounded-2xl p-5 space-y-3 relative overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center space-x-2">
                    <Blocks className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Ethereum Smart Contract Proof
                    </span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono font-medium">
                    STATUS: MINED
                  </span>
                </div>

                {/* Tx Hash */}
                <div className="space-y-1">
                  <span className="text-[11px] text-slate-400">Transaction Hash:</span>
                  <div className="flex items-center justify-between bg-slate-950 px-3 py-2 rounded-lg border border-slate-800">
                    <span className="text-xs font-mono text-cyan-300 truncate mr-2">
                      {result.blockchain.tx_hash}
                    </span>
                    <button
                      onClick={() => copyToClipboard(result.blockchain.tx_hash, 'tx')}
                      className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
                      title="Copy Tx Hash"
                    >
                      {copiedTx ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Event ID */}
                <div className="space-y-1">
                  <span className="text-[11px] text-slate-400">Smart Contract Event ID (keccak256):</span>
                  <div className="flex items-center justify-between bg-slate-950 px-3 py-2 rounded-lg border border-slate-800">
                    <span className="text-xs font-mono text-emerald-300 truncate mr-2">
                      {result.blockchain.event_id}
                    </span>
                    <button
                      onClick={() => copyToClipboard(result.blockchain.event_id, 'event')}
                      className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
                      title="Copy Event ID"
                    >
                      {copiedEvent ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Proceed to claim button */}
                <div className="pt-2">
                  <button
                    onClick={() => onProceedToClaim(result.fire_event_id)}
                    className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-lg shadow-cyan-600/20"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Evaluate Claim for This Fire Event</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
