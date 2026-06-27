import React, { useRef } from 'react';
import { DEFAULT_SPEED_OF_LIGHT, DEFAULT_TOWER_DELAY, DEFAULT_MAX_VOID_HOP, DEFAULT_SCALE_UNIT, DEFAULT_FIBER_SPEED_FRACTION } from '../utils/math';
import type { UniverseConfig } from '../utils/math';
import { Upload, Play, RefreshCw, Layers, Cpu, Compass, Settings, CircleAlert } from 'lucide-react';

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
      <div className="glass-panel p-5 border border-solid border-white/5 bg-slate-950/40 relative">
        {/* Futuristic top-corner visual line */}
        <div className="absolute top-0 right-0 w-8 h-1 bg-cyber-cyan shadow-[0_0_10px_#00f2fe]"></div>

        <h3 className="text-xs uppercase font-bold text-[#00f2fe] tracking-widest mb-4 flex items-center gap-2 font-display">
          <Layers className="w-4 h-4 text-cyber-cyan" /> Config Ingestion
        </h3>
        
        <div className="flex flex-col gap-4">
          <div className="flex gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn-secondary flex-1 flex items-center justify-center gap-2 py-2.5 text-[0.7rem]"
              disabled={isSimulating}
            >
              <Upload className="w-3.5 h-3.5 text-slate-400" /> Upload JSON
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
              className="btn-primary text-[0.7rem] flex-1 flex items-center justify-center gap-2 py-2.5"
              disabled={isSimulating}
            >
              <Cpu className="w-3.5 h-3.5" /> Load Zeta-26
            </button>
          </div>
          
          {config && (
            <div className="bg-[#020408] border border-solid border-white/5 rounded-lg p-3 text-[0.7rem] text-slate-400 font-mono flex flex-col gap-1.5 shadow-inner">
              <div className="text-slate-300 font-bold border-b border-solid border-white/5 pb-1 mb-1.5 flex items-center gap-1.5">
                <Settings className="w-3 h-3 text-cyber-cyan" /> System Constants:
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Speed of Light (c):</span>
                <span className="text-[#05ffb0] font-semibold">
                  {(config.universe_metadata?.speed_of_light_kms ?? DEFAULT_SPEED_OF_LIGHT).toLocaleString()} km/s
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tower Delay (Δt):</span>
                <span className="text-[#05ffb0] font-semibold">
                  {config.universe_metadata?.tower_processing_delay_ms ?? DEFAULT_TOWER_DELAY} ms
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Max Hop Limit:</span>
                <span className="text-[#05ffb0] font-semibold">
                  {((config.universe_metadata?.max_void_hop_distance_km ?? DEFAULT_MAX_VOID_HOP) / 1000000).toFixed(0)}M km
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Coordinate Scale:</span>
                <span className="text-[#05ffb0] font-semibold">
                  {(config.universe_metadata?.coordinate_scale_unit_km ?? DEFAULT_SCALE_UNIT).toLocaleString()} km
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Fiber speed factor:</span>
                <span className="text-[#05ffb0] font-semibold">
                  {config.universe_metadata?.fiber_speed_fraction ?? DEFAULT_FIBER_SPEED_FRACTION} c
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Packet Transmission Form */}
      {config && (
        <div className="glass-panel p-5 border border-solid border-white/5 bg-slate-950/40 flex flex-col gap-4 relative">
          <div className="absolute top-0 right-0 w-8 h-1 bg-cyber-orange shadow-[0_0_10px_#f59e0b]"></div>

          <h3 className="text-xs uppercase font-bold text-cyber-orange tracking-widest flex items-center gap-2 font-display">
            <Compass className="w-4 h-4 text-cyber-orange" /> Laser Beam Setup
          </h3>

          <div className="flex flex-col gap-1.5">
            <label className="text-[0.65rem] uppercase tracking-wider text-slate-400 font-semibold font-display">
              Origin Star Planet
            </label>
            <select
              value={selectedOrigin || ''}
              onChange={(e) => {
                onSelectOrigin(e.target.value || null);
                setStartTower(0);
              }}
              disabled={isSimulating}
              className="w-full text-xs bg-slate-950/80 border border-white/10 rounded-lg text-slate-300 py-2.5 px-3 focus:border-cyber-cyan"
            >
              <option value="">-- Select Origin --</option>
              {config.nodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.id} (Base {n.codex})
                </option>
              ))}
            </select>
          </div>

          {originNode && (
            <div className="flex flex-col gap-1.5 animate-fadeIn">
              <label className="text-[0.65rem] uppercase tracking-wider text-slate-400 font-semibold font-display">
                Origin Start Tower
              </label>
              <select
                value={startTower}
                onChange={(e) => setStartTower(parseInt(e.target.value))}
                disabled={isSimulating}
                className="w-full text-xs font-mono bg-slate-950/80 border border-white/10 rounded-lg text-slate-300 py-2.5 px-3 focus:border-cyber-cyan"
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
            <label className="text-[0.65rem] uppercase tracking-wider text-slate-400 font-semibold font-display">
              Destination Star Planet
            </label>
            <select
              value={selectedDest || ''}
              onChange={(e) => {
                onSelectDest(e.target.value || null);
                setEndTower(0);
              }}
              disabled={isSimulating}
              className="w-full text-xs bg-slate-950/80 border border-white/10 rounded-lg text-slate-300 py-2.5 px-3 focus:border-cyber-cyan"
            >
              <option value="">-- Select Destination --</option>
              {config.nodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.id} (Base {n.codex})
                </option>
              ))}
            </select>
          </div>

          {destNode && (
            <div className="flex flex-col gap-1.5 animate-fadeIn">
              <label className="text-[0.65rem] uppercase tracking-wider text-slate-400 font-semibold font-display">
                Destination Exit Tower
              </label>
              <select
                value={endTower}
                onChange={(e) => setEndTower(parseInt(e.target.value))}
                disabled={isSimulating}
                className="w-full text-xs font-mono bg-slate-950/80 border border-white/10 rounded-lg text-slate-300 py-2.5 px-3 focus:border-cyber-cyan"
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
            <label className="text-[0.65rem] uppercase tracking-wider text-slate-400 font-semibold font-display">
              Payload Message (ASCII)
            </label>
            <input
              type="text"
              value={payloadText}
              onChange={(e) => setPayloadText(e.target.value)}
              disabled={isSimulating}
              className="text-xs bg-slate-950/80 border border-white/10 rounded-lg text-slate-300 py-2.5 px-3 focus:border-cyber-cyan"
              placeholder="e.g. Hello world"
            />
          </div>

          {selectedOrigin && selectedDest && selectedOrigin === selectedDest && (
            <div className="flex items-center gap-2 p-2 bg-cyber-red/10 border border-cyber-red/30 rounded-lg text-[0.65rem] text-cyber-red font-mono">
              <CircleAlert className="w-4 h-4 shrink-0" />
              <span>Origin and Destination cannot be the same.</span>
            </div>
          )}

          <div className="flex gap-3 mt-3">
            <button
              onClick={onRunSimulation}
              disabled={isSimulating || !selectedOrigin || !selectedDest || selectedOrigin === selectedDest}
              className="btn-primary flex-1 py-3 flex items-center justify-center gap-2 text-xs"
            >
              <Play className="w-3.5 h-3.5 fill-black" /> Fire Laser Pulse
            </button>
            <button
              onClick={onResetSimulation}
              className="btn-secondary py-3 flex items-center justify-center px-4 hover:border-cyber-red hover:text-cyber-red hover:bg-cyber-red/5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
