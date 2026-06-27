import React, { useState } from 'react';
import type { UniverseConfig } from '../utils/math';
import { Upload, HelpCircle, Activity, ShieldAlert, Cpu, RefreshCw, Zap, Skull } from 'lucide-react';

interface ControlPanelProps {
  config: UniverseConfig | null;
  onConfigChange: (config: UniverseConfig) => void;
  selectedOrigin: string | null;
  selectedDest: string | null;
  onSelectOrigin: (id: string | null) => void;
  onSelectDest: (id: string | null) => void;
  payloadText: string;
  setPayloadText: (txt: string) => void;
  onRunSimulation: () => void;
  onResetSimulation: () => void;
  isSimulating: boolean;
  onLoadDefaultUniverse: () => void;
  killedNodes: Set<string>;
  onToggleNodeKilled: (id: string) => void;
  onRepairAll: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  config,
  onConfigChange,
  selectedOrigin,
  selectedDest,
  onSelectOrigin,
  onSelectDest,
  payloadText,
  setPayloadText,
  onRunSimulation,
  onResetSimulation,
  isSimulating,
  onLoadDefaultUniverse,
  killedNodes,
  onToggleNodeKilled,
  onRepairAll,
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [selectedChaosNode, setSelectedChaosNode] = useState<string>('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string) as UniverseConfig;
        if (parsed.nodes && Array.isArray(parsed.nodes)) {
          onConfigChange(parsed);
        } else {
          alert("Invalid configuration structure.");
        }
      } catch (err) {
        alert("Failed to parse JSON.");
      }
    };
    reader.readAsText(file);
  };

  const handleToggleChaos = () => {
    if (!selectedChaosNode) return;
    onToggleNodeKilled(selectedChaosNode);
    setSelectedChaosNode('');
  };

  return (
    <div className="flex flex-col gap-4">
      {/* 1. ROUTING UPLINK CARD */}
      <div className="panel-card">
        <h3 className="panel-title">
          <Zap className="w-3.5 h-3.5" /> ROUTING UPLINK
        </h3>

        {config ? (
          <div className="flex flex-col gap-3">
            <div className="form-group">
              <label className="form-label">ORIGIN NODE</label>
              <select
                value={selectedOrigin || ''}
                onChange={(e) => onSelectOrigin(e.target.value || null)}
                disabled={isSimulating}
                className="form-select"
              >
                <option value="">Select node...</option>
                {config.nodes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.id}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">DESTINATION NODE</label>
              <select
                value={selectedDest || ''}
                onChange={(e) => onSelectDest(e.target.value || null)}
                disabled={isSimulating}
                className="form-select"
              >
                <option value="">Select node...</option>
                {config.nodes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.id}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">PAYLOAD</label>
              <input
                type="text"
                value={payloadText}
                onChange={(e) => setPayloadText(e.target.value)}
                disabled={isSimulating}
                className="form-input"
                placeholder="Message details..."
              />
            </div>

            <button
              onClick={onRunSimulation}
              disabled={isSimulating || !selectedOrigin || !selectedDest}
              className="btn-transmit mt-2"
            >
              <Zap className="w-3.5 h-3.5 fill-current" /> TRANSMIT
            </button>
          </div>
        ) : (
          <div className="text-xs text-slate-500 italic py-4 text-center">
            Upload configuration file to map coordinates.
          </div>
        )}
      </div>

      {/* 2. CHAOS ENGINE CARD */}
      <div className="panel-card panel-card-red">
        <h3 className="panel-title panel-title-red">
          <Skull className="w-3.5 h-3.5" /> CHAOS ENGINE
        </h3>

        {config ? (
          <div className="flex flex-col gap-3">
            <div className="form-group">
              <label className="form-label">DISABLE NODE</label>
              <div className="flex gap-2">
                <select
                  value={selectedChaosNode}
                  onChange={(e) => setSelectedChaosNode(e.target.value)}
                  disabled={isSimulating}
                  className="form-select border-rose-500/20 focus:border-rose-500"
                >
                  <option value="">Select node...</option>
                  {config.nodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.id} {killedNodes.has(n.id) ? '(Disabled)' : ''}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleToggleChaos}
                  disabled={!selectedChaosNode || isSimulating}
                  className="bg-rose-600 hover:bg-rose-500 text-white rounded p-2 transition-colors flex items-center justify-center shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Skull className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* System Status and Repair */}
            <div className="flex justify-between items-center mt-2 border-t border-solid border-rose-950/40 pt-3">
              <div className="flex flex-col">
                <span className="text-[0.58rem] text-slate-500 font-display uppercase tracking-wider">
                  SYSTEM STATUS
                </span>
                <span className={`text-xs font-semibold font-mono ${
                  killedNodes.size > 0 ? 'text-[#ff3366]' : 'text-[#05ffb0]'
                }`}>
                  {killedNodes.size > 0 
                    ? `${killedNodes.size} node(s) offline`
                    : 'All systems nominal'
                  }
                </span>
              </div>
              <button
                onClick={onRepairAll}
                disabled={killedNodes.size === 0 || isSimulating}
                className="text-[0.62rem] font-display font-semibold border border-solid border-slate-700 hover:border-slate-500 rounded px-2.5 py-1 text-slate-400 hover:text-slate-300 transition-all uppercase flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <RefreshCw className="w-2.5 h-2.5" /> REPAIR ALL
              </button>
            </div>
          </div>
        ) : (
          <div className="text-xs text-slate-500 italic py-2 text-center">
            Upload configuration file to map coordinates.
          </div>
        )}
      </div>

      {/* 3. SETTINGS & REBUILD CARD */}
      <div className="panel-card border-slate-800">
        <h3 className="panel-title text-slate-400 border-slate-800">
          <Upload className="w-3.5 h-3.5 text-slate-500" /> SYSTEM CONFIG
        </h3>
        
        <div className="flex gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-[0.62rem] font-display font-semibold border border-solid border-slate-700 hover:border-slate-500 rounded flex-1 py-2 text-slate-400 hover:text-slate-300 transition-all flex items-center justify-center gap-1.5"
            disabled={isSimulating}
          >
            <Upload className="w-3.5 h-3.5" /> UPLOAD JSON
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            accept=".json"
          />
          <button
            onClick={onLoadDefaultUniverse}
            className="text-[0.62rem] font-display font-semibold border border-solid border-slate-700 hover:border-slate-500 rounded flex-1 py-2 text-slate-400 hover:text-slate-300 transition-all flex items-center justify-center gap-1.5"
            disabled={isSimulating}
          >
            <Cpu className="w-3.5 h-3.5" /> DEFAULT CORE
          </button>
        </div>
      </div>
    </div>
  );
};
