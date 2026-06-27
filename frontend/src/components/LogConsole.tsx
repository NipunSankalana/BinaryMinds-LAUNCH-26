import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  const [showRawSchema, setShowRawSchema] = useState<boolean>(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Scroll only inside the log box, not the page
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // Determine console header status based on log state
  let statusText = 'READY';
  let statusColor = 'text-slate-400';
  let statusIcon = <Activity className="w-3.5 h-3.5 text-slate-400" />;

  if (isSimulating) {
    statusText = 'TRANSMITTING';
    statusColor = 'text-[#00f2fe] animate-pulse';
    statusIcon = <Activity className="w-3.5 h-3.5 text-[#00f2fe] animate-spin" />;
  } else if (logs.length > 0) {
    if (logs.some(l => l.type === 'error')) {
      statusText = 'ERROR';
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

      {/* Terminal log output — scroll container is scoped to this div only */}
      <div
        ref={scrollContainerRef}
        className="terminal-layout flex-grow overflow-y-auto pr-1 flex flex-col gap-2 h-[410px]"
      >
        {/* Render real-time console log messages */}
        <div className="flex flex-col gap-2 font-mono text-[0.78rem] select-text">
          {logs.map((log, idx) => {
            let colorClass = 'text-slate-300';
            if (log.type === 'info') colorClass = 'text-[#00f2fe]';
            if (log.type === 'success') colorClass = 'text-[#05ffb0]';
            if (log.type === 'warning') colorClass = 'text-[#f59e0b]';
            if (log.type === 'error') colorClass = 'text-[#ff3366] font-bold';
            if (log.type === 'purple') colorClass = 'text-[#c084fc]';
            return (
              <div key={idx} className={`${colorClass} whitespace-pre-wrap leading-relaxed`}>
                {log.text}
              </div>
            );
          })}
        </div>
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
