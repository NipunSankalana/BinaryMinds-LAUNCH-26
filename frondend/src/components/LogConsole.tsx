import React, { useState, useMemo } from 'react';
import type { RouteResult, UniverseConfig } from '../utils/math';
import { Terminal, ShieldCheck, AlertCircle, ArrowDown, ChevronRight, ChevronDown, Activity } from 'lucide-react';

interface LogMessage {
  text: string;
  type: 'info' | 'success' | 'error' | 'warning' | 'purple' | 'plain';
}

interface LogConsoleProps {
  config: UniverseConfig | null;
  logs: LogMessage[];
  onClearLogs: () => void;
  activeRoute: RouteResult | null;
  packetProgress: { currentHopIndex: number; progress: number } | null;
  isSimulating: boolean;
  selectedOrigin: string | null;
  selectedDest: string | null;
}

export const LogConsole: React.FC<LogConsoleProps> = ({
  config,
  logs,
  onClearLogs,
  activeRoute,
  packetProgress,
  isSimulating,
  selectedOrigin,
  selectedDest,
}) => {
  const [showRawSchema, setShowRawSchema] = useState(false);

  // Status mapping
  let statusText = 'IDLE';
  let statusColor = 'text-slate-400';
  let statusIcon = <Terminal className="w-3.5 h-3.5" />;

  if (isSimulating) {
    statusText = 'IN TRANSIT';
    statusColor = 'text-[#f59e0b]';
    statusIcon = <Activity className="w-3.5 h-3.5 animate-pulse text-[#f59e0b]" />;
  } else if (activeRoute) {
    if (activeRoute.error) {
      statusText = 'FAILED';
      statusColor = 'text-[#ff3366]';
      statusIcon = <AlertCircle className="w-3.5 h-3.5 text-[#ff3366]" />;
    } else if (logs.some(l => l.text.includes('delivered') || l.text.includes('SUCCESS'))) {
      statusText = 'SUCCESS';
      statusColor = 'text-[#05ffb0]';
      statusIcon = <ShieldCheck className="w-3.5 h-3.5 text-[#05ffb0]" />;
    }
  }

  // Get visible hops based on simulation progress
  const visibleHops = useMemo(() => {
    if (!activeRoute || activeRoute.error) return [];
    if (!isSimulating && logs.some(l => l.text.includes('delivered'))) {
      // Completed, show all
      return activeRoute.hop_logs;
    }
    if (packetProgress) {
      // Show up to current hop index
      return activeRoute.hop_logs.slice(0, packetProgress.currentHopIndex + 1);
    }
    return [];
  }, [activeRoute, packetProgress, isSimulating, logs]);

  // JSON representation of raw packet schema (as required by the brief)
  const rawPacketSchema = useMemo(() => {
    if (!selectedOrigin || !selectedDest) return null;
    return {
      origin_id: selectedOrigin,
      destination_id: selectedDest,
      current_id: packetProgress && activeRoute ? activeRoute.path[packetProgress.currentHopIndex] : selectedOrigin,
      payload: logs.some(l => l.text.includes('Translating')) 
        ? "Base-X Encoded stream"
        : "Hello world (ASCII)",
      hop_log: activeRoute ? activeRoute.hop_logs.map(h => `Tower ${h.exit_tower} @ ${h.from_planet} -> Tower ${h.entry_tower} @ ${h.to_planet}`) : []
    };
  }, [selectedOrigin, selectedDest, packetProgress, activeRoute, logs]);

  return (
    <div className="glass-panel p-5 border border-solid flex flex-col h-full flex-grow relative">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-solid border-slate-800 pb-2.5 mb-3 select-none">
        <h3 className="text-xs uppercase font-semibold text-[#e2e8f0] tracking-wider flex items-center gap-1.5 font-display">
          <Terminal className="w-4 h-4 text-[#00f2fe]" /> TRANSMISSION LOG
        </h3>
        <div className={`flex items-center gap-1 text-[0.68rem] font-display font-semibold uppercase tracking-wider ${statusColor}`}>
          {statusIcon} {statusText}
        </div>
      </div>

      {/* Terminal log output */}
      <div className="terminal-layout flex-grow overflow-y-auto pr-1 flex flex-col gap-2 h-[410px]">
        {/* Step 1: Calculation details */}
        {activeRoute && (
          <div className="text-[0.68rem] text-slate-500 font-mono flex flex-col gap-0.5">
            <div>&gt; INITIALIZING ROUTE CALCULATION...</div>
            <div>&gt; ORIGIN: {selectedOrigin}</div>
            <div>&gt; DESTINATION: {selectedDest}</div>
            <div>&gt; COMPUTING SHORT PATH VIA DIJKSTRA... DONE</div>
            {activeRoute.error ? (
              <div className="text-[#ff3366] font-semibold">&gt; ROUTING ERROR: {activeRoute.error}</div>
            ) : (
              <div>&gt; COMMENCING PACKET TRANSMISSION</div>
            )}
          </div>
        )}

        {/* Step 2: Hop log cards */}
        {visibleHops.map((hop, idx) => {
          const isCurrentHop = packetProgress && idx === packetProgress.currentHopIndex;
          const isFinalHop = hop.to_planet === selectedDest;
          const destCodex = getCodexForPlanet(hop.to_planet, config);
          const srcCodex = getCodexForPlanet(hop.from_planet, config);

          return (
            <React.Fragment key={hop.hop}>
              <div className="terminal-hop-box">
                {/* Header */}
                <div className="terminal-hop-header">
                  <span>HOP {hop.hop}: {hop.to_planet}</span>
                  <span className="text-xs text-[#00f2fe]">
                    {isCurrentHop ? 'BEAMING...' : `Lat: +${hop.hop_total_latency_ms.toFixed(2)}ms`}
                  </span>
                </div>
                {/* Body */}
                <div className="terminal-hop-body font-mono text-[0.65rem] text-slate-400">
                  <div className="text-[#05ffb0] font-semibold">
                    {isFinalHop ? (
                      `ACTION[Arrive: decode Base-${destCodex} -> ASCII -> deliver payload]`
                    ) : (
                      `ACTION[Transit: decode Base-${srcCodex} -> ASCII -> re-encode Base-${destCodex} -> void -> Planet ${hop.to_planet}]`
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }} className="font-mono select-none">
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.62rem', fontWeight: 600 }}>CODEX BASE</span>
                    <span style={{ color: 'var(--accent-cyan)', fontSize: '0.62rem', fontWeight: 600 }}>Base-{destCodex}</span>
                  </div>

                  <div className="grid grid-cols-1 gap-1.5 mt-1">
                    <div className="terminal-payload-box">
                      <div className="text-[0.58rem] text-[#c084fc] font-semibold uppercase tracking-wider mb-0.5">
                        PAYLOAD (BASE-{destCodex})
                      </div>
                      <div className="text-[#e2e8f0] tracking-wider word-break-all">
                        {hop.payload_sent_codex}
                      </div>
                    </div>

                    <div className="terminal-payload-box">
                      <div className="text-[0.58rem] text-[#00f2fe] font-semibold uppercase tracking-wider mb-0.5">
                        DECODED (ASCII)
                      </div>
                      <div className="text-[#05ffb0] tracking-wider">
                        {hop.payload_received_ascii}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Show Arrow if not the last hop in route */}
              {idx < visibleHops.length - 1 && (
                <div className="flex justify-center text-slate-700 py-1">
                  <ArrowDown className="w-4 h-4 animate-bounce" />
                </div>
              )}
            </React.Fragment>
          );
        })}

        {/* Step 3: Destination reached status */}
        {!isSimulating && activeRoute && !activeRoute.error && logs.some(l => l.text.includes('delivered')) && (
          <div className="mt-2 border-t border-solid border-slate-900 pt-3 flex flex-col gap-2">
            <div className="text-[#05ffb0] uppercase font-bold font-display text-[0.72rem] tracking-wider">
              &gt; DESTINATION REACHED
            </div>
            
            <div className="bg-black/60 border border-solid border-slate-900 p-3 rounded text-[0.7rem] text-slate-400 font-mono flex flex-col gap-1.5">
              <div className="flex justify-between">
                <span>TOTAL LATENCY:</span>
                <span className="text-[#05ffb0] font-bold">{activeRoute.total_latency_ms.toFixed(3)}ms</span>
              </div>
              <div className="flex justify-between">
                <span>HOPS REQUIRED:</span>
                <span className="text-white font-bold">{activeRoute.path.length - 1}</span>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Fallback / idle */}
        {logs.length === 0 && (
          <div className="text-slate-600 italic select-none py-12 text-center text-xs">
            SYSTEM IDLE. Awaiting transmission commands...
          </div>
        )}
      </div>

      {/* Raw Packet Schema button at bottom */}
      {rawPacketSchema && (
        <div className="mt-3 select-none">
          <button
            onClick={() => setShowRawSchema(!showRawSchema)}
            className="text-[0.62rem] font-display font-semibold w-full border border-solid border-slate-800 hover:border-slate-600 rounded py-2 text-slate-400 hover:text-slate-300 transition-colors uppercase flex items-center justify-center gap-1"
          >
            {showRawSchema ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            VIEW RAW PACKET SCHEMA
          </button>
          
          {showRawSchema && (
            <pre className="bg-black/80 border border-solid border-slate-800 p-3.5 rounded mt-2 text-[0.58rem] text-slate-300 font-mono overflow-auto max-h-[140px] text-left select-text">
              {JSON.stringify(rawPacketSchema, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
};

// Helper to lookup codex values
function getCodexForPlanet(planetId: string, config: UniverseConfig | null): number {
  if (!config) return 0;
  const p = config.nodes.find(n => n.id === planetId);
  return p ? p.codex : 0;
}

// Helper to lookup config nodes
function configNodes(planetId: string, config: UniverseConfig | null): string {
  if (!config) return '';
  const p = config.nodes.find(n => n.id === planetId);
  return p ? p.id : '';
}
