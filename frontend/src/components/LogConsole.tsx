import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { RouteResult, UniverseConfig } from '../utils/math';
import {
  Terminal, ShieldCheck, AlertCircle, Activity,
  ChevronRight, ChevronDown,
  Zap, Globe, Radio, ArrowRight, CheckCircle2,
  Cpu, Binary, AlertTriangle, Send, Radar
} from 'lucide-react';

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

// ─── Parse a log line into structured visual parts ──────────────────────────

interface ParsedLine {
  badge: string;
  badgeStyle: React.CSSProperties;
  icon: React.ReactNode;
  textStyle: React.CSSProperties;
  rowStyle: React.CSSProperties;
  body: string;
  isHeader: boolean;
  isSeparator: boolean;
}

function parseLine(text: string, type: LogMessage['type']): ParsedLine {
  const trimmed = text.trim();

  // ── Section headers (lines starting with ===)
  if (trimmed.startsWith('===')) {
    return {
      badge: '',
      badgeStyle: {},
      icon: <Radar className="w-3 h-3" style={{ color: '#00f2fe' }} />,
      textStyle: { color: '#00f2fe', fontWeight: 700, letterSpacing: '0.08em', textShadow: '0 0 8px rgba(0,242,254,0.6)' },
      rowStyle: { background: 'rgba(0,242,254,0.06)', borderLeft: '3px solid #00f2fe', borderRadius: '4px', padding: '8px 12px', marginBottom: '4px' },
      body: trimmed.replace(/===/g, '').trim(),
      isHeader: true,
      isSeparator: false,
    };
  }

  // ── Blank line separator
  if (trimmed === '') {
    return {
      badge: '', badgeStyle: {}, icon: null,
      textStyle: {}, rowStyle: { height: '10px' },
      body: '', isHeader: false, isSeparator: true,
    };
  }

  // ── HOP n header
  const hopMatch = trimmed.match(/^\[HOP\s(\d+)\]\s(.+)$/);
  if (hopMatch) {
    return {
      badge: `HOP ${hopMatch[1]}`,
      badgeStyle: { background: 'rgba(0,242,254,0.15)', color: '#00f2fe', border: '1px solid rgba(0,242,254,0.4)' },
      icon: <ArrowRight className="w-3 h-3" style={{ color: '#00f2fe' }} />,
      textStyle: { color: '#e2e8f0', fontWeight: 600 },
      rowStyle: { background: 'rgba(0,242,254,0.04)', borderLeft: '3px solid #00f2fe', borderRadius: '4px', padding: '7px 12px', marginTop: '8px' },
      body: hopMatch[2],
      isHeader: false,
      isSeparator: false,
    };
  }

  // ── [ENC] — encoding / codex conversion
  if (trimmed.includes('[ENC]')) {
    const body = trimmed.replace(/▶\s*\[ENC\]/, '').trim();
    return {
      badge: 'ENC',
      badgeStyle: { background: 'rgba(192,132,252,0.15)', color: '#c084fc', border: '1px solid rgba(192,132,252,0.4)' },
      icon: <Binary className="w-3 h-3" style={{ color: '#c084fc' }} />,
      textStyle: { color: '#c084fc' },
      rowStyle: { borderLeft: '2px solid rgba(192,132,252,0.4)', paddingLeft: '10px', paddingTop: '4px', paddingBottom: '4px' },
      body,
      isHeader: false,
      isSeparator: false,
    };
  }

  // ── [DEC] — decoding
  if (trimmed.includes('[DEC]')) {
    const body = trimmed.replace(/▶?\s*\[DEC\]/, '').trim();
    return {
      badge: 'DEC',
      badgeStyle: { background: 'rgba(192,132,252,0.15)', color: '#c084fc', border: '1px solid rgba(192,132,252,0.4)' },
      icon: <Cpu className="w-3 h-3" style={{ color: '#c084fc' }} />,
      textStyle: { color: '#c084fc' },
      rowStyle: { borderLeft: '2px solid rgba(192,132,252,0.4)', paddingLeft: '10px', paddingTop: '4px', paddingBottom: '4px' },
      body,
      isHeader: false,
      isSeparator: false,
    };
  }

  // ── [SPACE] — void / atmosphere events
  if (trimmed.includes('[SPACE]')) {
    const body = trimmed.replace(/▶?\s*\[SPACE\]/, '').trim();
    const isVoid = body.toLowerCase().includes('void');
    return {
      badge: isVoid ? 'VOID' : 'ATMO',
      badgeStyle: { background: 'rgba(0,242,254,0.10)', color: '#67e8f9', border: '1px solid rgba(103,232,249,0.35)' },
      icon: <Radio className="w-3 h-3" style={{ color: '#67e8f9' }} />,
      textStyle: { color: '#67e8f9' },
      rowStyle: { borderLeft: '2px solid rgba(103,232,249,0.4)', paddingLeft: '12px', paddingTop: '6px', paddingBottom: '6px' },
      body,
      isHeader: false,
      isSeparator: false,
    };
  }

  // ── [PLANET X] — planetary surface events
  const planetMatch = trimmed.match(/▶?\s*\[PLANET\s([^\]]+)\]\s(.+)/);
  if (planetMatch) {
    return {
      badge: planetMatch[1],
      badgeStyle: { background: 'rgba(5,255,176,0.10)', color: '#05ffb0', border: '1px solid rgba(5,255,176,0.35)' },
      icon: <Globe className="w-3 h-3" style={{ color: '#05ffb0' }} />,
      textStyle: { color: '#a7f3d0' },
      rowStyle: { borderLeft: '2px solid rgba(5,255,176,0.4)', paddingLeft: '12px', paddingTop: '6px', paddingBottom: '6px' },
      body: planetMatch[2],
      isHeader: false,
      isSeparator: false,
    };
  }

  // ── ✓ Hop latency total
  if (trimmed.startsWith('✓')) {
    return {
      badge: 'LATENCY',
      badgeStyle: { background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.4)' },
      icon: <Zap className="w-3 h-3" style={{ color: '#f59e0b' }} />,
      textStyle: { color: '#f59e0b', fontWeight: 600 },
      rowStyle: { background: 'rgba(245,158,11,0.04)', borderLeft: '3px solid rgba(245,158,11,0.7)', borderRadius: '4px', padding: '7px 12px', marginTop: '4px' },
      body: trimmed.replace('✓', '').trim(),
      isHeader: false,
      isSeparator: false,
    };
  }

  // ── [SUCCESS] delivery confirmation
  if (trimmed.includes('[SUCCESS]')) {
    return {
      badge: 'DELIVERED',
      badgeStyle: { background: 'rgba(5,255,176,0.15)', color: '#05ffb0', border: '1px solid rgba(5,255,176,0.5)' },
      icon: <CheckCircle2 className="w-3.5 h-3.5" style={{ color: '#05ffb0' }} />,
      textStyle: { color: '#05ffb0', fontWeight: 700, textShadow: '0 0 8px rgba(5,255,176,0.5)' },
      rowStyle: { background: 'rgba(5,255,176,0.07)', border: '1px solid rgba(5,255,176,0.25)', borderRadius: '6px', padding: '9px 14px', marginTop: '8px' },
      body: trimmed.replace('[SUCCESS]', '').trim(),
      isHeader: false,
      isSeparator: false,
    };
  }

  // ── [SIM ERROR] / error type
  if (type === 'error' || trimmed.includes('[SIM ERROR]') || trimmed.includes('[CHAOS ENG]') && trimmed.includes('ALERT')) {
    return {
      badge: 'ERROR',
      badgeStyle: { background: 'rgba(255,51,102,0.15)', color: '#ff3366', border: '1px solid rgba(255,51,102,0.5)' },
      icon: <AlertCircle className="w-3 h-3" style={{ color: '#ff3366' }} />,
      textStyle: { color: '#ff6b8a', fontWeight: 600 },
      rowStyle: { background: 'rgba(255,51,102,0.06)', borderLeft: '3px solid #ff3366', borderRadius: '4px', padding: '7px 12px' },
      body: trimmed.replace(/\[SIM ERROR\]|\[CHAOS ENG\]/g, '').trim(),
      isHeader: false,
      isSeparator: false,
    };
  }

  // ── [CHAOS ENG] informational (node killed/restored)
  if (trimmed.includes('[CHAOS ENG]')) {
    const isKill = trimmed.toLowerCase().includes('offline') || trimmed.toLowerCase().includes('killed');
    return {
      badge: 'CHAOS',
      badgeStyle: { background: isKill ? 'rgba(255,51,102,0.12)' : 'rgba(5,255,176,0.10)', color: isKill ? '#ff3366' : '#05ffb0', border: `1px solid ${isKill ? 'rgba(255,51,102,0.4)' : 'rgba(5,255,176,0.4)'}` },
      icon: <AlertTriangle className="w-3 h-3" style={{ color: isKill ? '#ff3366' : '#05ffb0' }} />,
      textStyle: { color: isKill ? '#ff6b8a' : '#a7f3d0' },
      rowStyle: { borderLeft: `2px solid ${isKill ? 'rgba(255,51,102,0.5)' : 'rgba(5,255,176,0.4)'}`, paddingLeft: '12px', paddingTop: '6px', paddingBottom: '6px' },
      body: trimmed.replace('[CHAOS ENG]', '').trim(),
      isHeader: false,
      isSeparator: false,
    };
  }

  // ── Payload line
  if (trimmed.startsWith('Payload:')) {
    return {
      badge: 'PAYLOAD',
      badgeStyle: { background: 'rgba(255,255,255,0.06)', color: '#cbd5e1', border: '1px solid rgba(255,255,255,0.15)' },
      icon: <Send className="w-3 h-3" style={{ color: '#cbd5e1' }} />,
      textStyle: { color: '#e2e8f0' },
      rowStyle: { borderLeft: '2px solid rgba(255,255,255,0.2)', paddingLeft: '12px', paddingTop: '6px', paddingBottom: '6px' },
      body: trimmed,
      isHeader: false,
      isSeparator: false,
    };
  }

  // ── Generic fallback by type
  const fallbacks: Record<string, { color: string; border: string }> = {
    success: { color: '#05ffb0', border: 'rgba(5,255,176,0.3)' },
    info:    { color: '#67e8f9', border: 'rgba(103,232,249,0.25)' },
    warning: { color: '#f59e0b', border: 'rgba(245,158,11,0.3)' },
    purple:  { color: '#c084fc', border: 'rgba(192,132,252,0.3)' },
    error:   { color: '#ff6b8a', border: 'rgba(255,51,102,0.3)' },
    plain:   { color: '#94a3b8', border: 'rgba(255,255,255,0.08)' },
  };
  const fb = fallbacks[type] ?? fallbacks.plain;

  return {
    badge: '',
    badgeStyle: {},
    icon: null,
    textStyle: { color: fb.color },
    rowStyle: { borderLeft: `2px solid ${fb.border}`, paddingLeft: '12px', paddingTop: '4px', paddingBottom: '4px' },
    body: trimmed,
    isHeader: false,
    isSeparator: false,
  };
}

// ─── Component ───────────────────────────────────────────────────────────────

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

  // Scroll only inside the log box
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // Header status indicator
  let statusText = 'READY';
  let statusColor = '#94a3b8';
  let statusIcon = <Activity className="w-3.5 h-3.5" style={{ color: '#94a3b8' }} />;

  if (isSimulating) {
    statusText = 'TRANSMITTING';
    statusColor = '#00f2fe';
    statusIcon = <Activity className="w-3.5 h-3.5 animate-spin" style={{ color: '#00f2fe' }} />;
  } else if (logs.length > 0) {
    if (logs.some(l => l.type === 'error')) {
      statusText = 'ERROR';
      statusColor = '#ff3366';
      statusIcon = <AlertCircle className="w-3.5 h-3.5" style={{ color: '#ff3366' }} />;
    } else if (logs.some(l => l.text.includes('delivered') || l.text.includes('SUCCESS'))) {
      statusText = 'DELIVERED';
      statusColor = '#05ffb0';
      statusIcon = <ShieldCheck className="w-3.5 h-3.5" style={{ color: '#05ffb0' }} />;
    }
  }

  // Raw packet schema
  const rawPacketSchema = useMemo(() => {
    if (!selectedOrigin || !selectedDest) return null;
    return {
      origin_id: selectedOrigin,
      destination_id: selectedDest,
      current_id: packetProgress && activeRoute ? activeRoute.path[packetProgress.currentHopIndex] : selectedOrigin,
      payload: "Hello world (ASCII)",
      hop_log: activeRoute ? activeRoute.hop_logs.map(h => `Tower ${h.exit_tower} @ ${h.from_planet} -> Tower ${h.entry_tower} @ ${h.to_planet}`) : []
    };
  }, [selectedOrigin, selectedDest, packetProgress, activeRoute]);

  return (
    <div className="glass-panel p-5 border border-solid flex flex-col h-full flex-grow relative">
      {/* ── Header */}
      <div className="flex justify-between items-center border-b border-solid border-slate-800 pb-2.5 mb-3 select-none">
        <h3 className="text-xs uppercase font-semibold tracking-wider flex items-center gap-1.5 font-display"
            style={{ color: '#e2e8f0' }}>
          <Terminal className="w-4 h-4" style={{ color: '#00f2fe' }} />
          TRANSMISSION LOG
        </h3>
        <div className="flex items-center gap-1.5 text-[0.68rem] font-display font-semibold uppercase tracking-wider"
             style={{ color: statusColor, textShadow: `0 0 8px ${statusColor}60` }}>
          {statusIcon}
          <span className={isSimulating ? 'animate-pulse' : ''}>{statusText}</span>
          {isSimulating && (
            <span className="inline-flex gap-[3px] ml-1">
              <span className="w-1 h-1 rounded-full bg-current animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1 h-1 rounded-full bg-current animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1 h-1 rounded-full bg-current animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
          )}
        </div>
      </div>

      {/* ── Log output */}
      <div
        ref={scrollContainerRef}
        className="terminal-layout flex-grow overflow-y-auto pr-1 h-[410px]"
        style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}
      >
        {logs.length === 0 && (
          <div style={{ color: '#334155', fontFamily: 'var(--font-mono)', fontSize: '0.76rem', marginTop: 'auto', marginBottom: 'auto', textAlign: 'center', opacity: 0.6 }}>
            — Awaiting transmission —
          </div>
        )}

        {logs.map((log, idx) => {
          const p = parseLine(log.text, log.type);

          if (p.isSeparator) return <div key={idx} style={{ height: '6px' }} />;

          return (
            <div
              key={idx}
              className="flex items-start gap-2"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                lineHeight: '1.55',
                ...p.rowStyle,
              }}
            >
              {/* Icon */}
              {p.icon && (
                <span style={{ marginTop: '2px', flexShrink: 0 }}>{p.icon}</span>
              )}

              {/* Badge */}
              {p.badge && (
                <span
                  style={{
                    fontSize: '0.55rem',
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    padding: '1px 5px',
                    borderRadius: '3px',
                    flexShrink: 0,
                    marginTop: '2px',
                    lineHeight: '14px',
                    ...p.badgeStyle,
                  }}
                >
                  {p.badge}
                </span>
              )}

              {/* Body text */}
              <span style={{ whiteSpace: 'pre-wrap', flex: 1, ...p.textStyle }}>
                {p.body}
              </span>
            </div>
          );
        })}
      </div>

      {/* ── Raw Packet Schema */}
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

// Helper stubs (kept for compatibility, not used internally)
function getCodexForPlanet(planetId: string, config: UniverseConfig | null): number {
  if (!config) return 0;
  const p = config.nodes.find(n => n.id === planetId);
  return p ? p.codex : 0;
}

function configNodes(planetId: string, config: UniverseConfig | null): string {
  if (!config) return '';
  const p = config.nodes.find(n => n.id === planetId);
  return p ? p.id : '';
}
