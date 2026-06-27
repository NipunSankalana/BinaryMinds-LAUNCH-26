import React, { useRef } from 'react';
import { UniverseConfig, Planet, DEFAULT_SPEED_OF_LIGHT, DEFAULT_TOWER_DELAY, DEFAULT_MAX_VOID_HOP, DEFAULT_SCALE_UNIT, DEFAULT_FIBER_SPEED_FRACTION } from '../utils/math';
import { Upload, Play, RefreshCw, Layers, ShieldAlert, Cpu } from 'lucide-react';

interface ControlPanelProps {
  config: UniverseConfig | null;
  onConfigChange: (config: UniverseConfig) => void;
  selectedOrigin: string | null;
  selectedDest: string | null;
  onSelectOrigin: (id: string | null) => void;
  onSelectDest: (id: string | null) => void;
  startTower: number;
  setStartTower: (idx: number) => void;
  endTower: number;
  setEndTower: (idx: number) => void;
  payloadText: string;
  setPayloadText: (txt: string) => void;
  onRunSimulation: () => void;
  onResetSimulation: () => void;
  isSimulating: boolean;
  onLoadDefaultUniverse: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  config,
  onConfigChange,
  selectedOrigin,
  selectedDest,
  onSelectOrigin,
  onSelectDest,
  startTower,
  setStartTower,
  endTower,
  setEndTower,
  payloadText,
  setPayloadText,
  onRunSimulation,
  onResetSimulation,
  isSimulating,
  onLoadDefaultUniverse,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

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
          alert("Invalid configuration structure. Must contain 'nodes' array.");
        }
      } catch (err) {
        alert("Failed to parse JSON configuration file.");
      }
    };
    reader.readAsText(file);
  };

  const originNode = config?.nodes.find(n => n.id === selectedOrigin);
  const destNode = config?.nodes.find(n => n.id === selectedDest);

  return (
    <div className="flex flex-col gap-6">
      {/* Configuration Loading Panel */}
      <div className="glass-panel p-5 border border-solid">
        <h3 className="text-xs uppercase font-semibold text-[#00f2fe] tracking-wider mb-4 flex items-center gap-1.5 font-display">
          <Layers className="w-4 h-4" /> Config Ingestion
        </h3>
        
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn-secondary flex-1 flex items-center justify-center gap-2 py-2"
              disabled={isSimulating}
            >
              <Upload className="w-4 h-4" /> Upload JSON
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
              className="btn-primary text-xs flex-1 flex items-center justify-center gap-2 py-2"
              disabled={isSimulating}
            >
              <Cpu className="w-4 h-4" /> Default Zeta-26
            </button>
          </div>
          
          {config && (
            <div className="bg-[#05070c] border border-solid rounded p-3 text-[0.7rem] text-slate-400 font-mono flex flex-col gap-1">
              <div className="text-slate-300 font-semibold border-b border-solid pb-1 mb-1">
                Universe Constants:
              </div>
              <div className="flex justify-between">
                <span>Speed of Light:</span>
                <span className="text-[#05ffb0]">
                  {(config.universe_metadata?.speed_of_light_kms ?? DEFAULT_SPEED_OF_LIGHT).toLocaleString()} km/s
                </span>
              </div>
              <div className="flex justify-between">
                <span>Tower Penalty:</span>
                <span className="text-[#05ffb0]">
                  {config.universe_metadata?.tower_processing_delay_ms ?? DEFAULT_TOWER_DELAY} ms
                </span>
              </div>
              <div className="flex justify-between">
                <span>Max Void Hop:</span>
                <span className="text-[#05ffb0]">
                  {((config.universe_metadata?.max_void_hop_distance_km ?? DEFAULT_MAX_VOID_HOP) / 1000000).toFixed(0)}M km
                </span>
              </div>
              <div className="flex justify-between">
                <span>Coordinate Scale:</span>
                <span className="text-[#05ffb0]">
                  {(config.universe_metadata?.coordinate_scale_unit_km ?? DEFAULT_SCALE_UNIT).toLocaleString()} km
                </span>
              </div>
              <div className="flex justify-between">
                <span>Fiber Speed:</span>
                <span className="text-[#05ffb0]">
                  {config.universe_metadata?.fiber_speed_fraction ?? DEFAULT_FIBER_SPEED_FRACTION} c
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Packet Transmission Form */}
      {config && (
        <div className="glass-panel p-5 border border-solid flex flex-col gap-4">
          <h3 className="text-xs uppercase font-semibold text-[#00f2fe] tracking-wider flex items-center gap-1.5 font-display">
            <Play className="w-4 h-4" /> Beam Setup
          </h3>

          <div className="flex flex-col gap-1.5">
            <label className="text-[0.7rem] uppercase tracking-wider text-slate-400 font-medium font-display">
              Origin Planet
            </label>
            <select
              value={selectedOrigin || ''}
              onChange={(e) => {
                onSelectOrigin(e.target.value || null);
                setStartTower(0);
              }}
              disabled={isSimulating}
              className="w-full text-xs"
            >
              <option value="">-- Choose Origin --</option>
              {config.nodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.id} (Base {n.codex})
                </option>
              ))}
            </select>
          </div>

          {originNode && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[0.7rem] uppercase tracking-wider text-slate-400 font-medium font-display">
                Origin Start Tower
              </label>
              <select
                value={startTower}
                onChange={(e) => setStartTower(parseInt(e.target.value))}
                disabled={isSimulating}
                className="w-full text-xs font-mono"
              >
                {Array.from({ length: originNode.active_towers }).map((_, idx) => (
                  <option key={idx} value={idx}>
                    Tower {idx} (Clockwise)
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-[0.7rem] uppercase tracking-wider text-slate-400 font-medium font-display">
              Destination Planet
            </label>
            <select
              value={selectedDest || ''}
              onChange={(e) => {
                onSelectDest(e.target.value || null);
                setEndTower(0);
              }}
              disabled={isSimulating}
              className="w-full text-xs"
            >
              <option value="">-- Choose Destination --</option>
              {config.nodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.id} (Base {n.codex})
                </option>
              ))}
            </select>
          </div>

          {destNode && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[0.7rem] uppercase tracking-wider text-slate-400 font-medium font-display">
                Destination Exit Tower
              </label>
              <select
                value={endTower}
                onChange={(e) => setEndTower(parseInt(e.target.value))}
                disabled={isSimulating}
                className="w-full text-xs font-mono"
              >
                {Array.from({ length: destNode.active_towers }).map((_, idx) => (
                  <option key={idx} value={idx}>
                    Tower {idx} (Clockwise)
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-[0.7rem] uppercase tracking-wider text-slate-400 font-medium font-display">
              Message Payload (ASCII)
            </label>
            <input
              type="text"
              value={payloadText}
              onChange={(e) => setPayloadText(e.target.value)}
              disabled={isSimulating}
              className="text-xs"
              placeholder="e.g. Hello world"
            />
          </div>

          <div className="flex gap-2 mt-2">
            <button
              onClick={onRunSimulation}
              disabled={isSimulating || !selectedOrigin || !selectedDest}
              className="btn-primary flex-1 py-2.5 flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-black" /> Send Laser
            </button>
            <button
              onClick={onResetSimulation}
              className="btn-secondary py-2.5 flex items-center justify-center px-4"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
