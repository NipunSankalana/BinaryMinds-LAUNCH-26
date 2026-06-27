import React, { useEffect, useRef } from 'react';
import { Terminal, Copy, Trash2 } from 'lucide-react';

interface LogMessage {
  text: string;
  type: 'info' | 'success' | 'error' | 'warning' | 'purple' | 'plain';
}

interface LogConsoleProps {
  logs: LogMessage[];
  onClearLogs: () => void;
}

export const LogConsole: React.FC<LogConsoleProps> = ({ logs, onClearLogs }) => {
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const copyLogs = () => {
    const text = logs.map(l => l.text).join('\n');
    navigator.clipboard.writeText(text);
    alert('Logs copied to tactical database clipboard!');
  };

  // Helper to colorize specific parts of log strings (e.g. Base numbers, binary arrays)
  const formatLogText = (text: string) => {
    // Highlight "Base X"
    let formatted: React.ReactNode[] = [text];
    
    const baseRegex = /(Base \d+)/g;
    const binaryRegex = /(\[\d+(?:,\s*\d+)*\])/g;

    // We can do simple highlights
    if (baseRegex.test(text)) {
      const parts = text.split(baseRegex);
      return parts.map((part, i) => {
        if (baseRegex.test(part)) {
          return <span key={i} className="text-cyber-purple font-bold glow-text-cyan">{part}</span>;
        }
        return part;
      });
    }

    if (binaryRegex.test(text)) {
      const parts = text.split(binaryRegex);
      return parts.map((part, i) => {
        if (binaryRegex.test(part)) {
          return <span key={i} className="text-cyber-green font-bold font-mono">{part}</span>;
        }
        return part;
      });
    }

    return text;
  };

  return (
    <div className="glass-panel p-5 border border-solid border-white/5 bg-slate-950/40 w-full relative">
      <div className="absolute top-0 right-0 w-8 h-1 bg-cyber-cyan shadow-[0_0_10px_#00f2fe]"></div>

      <div className="flex justify-between items-center mb-3">
        <h3 className="text-xs uppercase font-bold text-cyber-cyan tracking-widest flex items-center gap-1.5 font-display">
          <Terminal className="w-4 h-4 text-cyber-cyan" /> Codex Translation & Hop Logs
        </h3>
        <div className="flex gap-2">
          <button
            onClick={copyLogs}
            className="flex items-center gap-1 text-[0.6rem] border border-solid border-white/10 hover:border-cyber-cyan rounded-md px-2.5 py-1 text-slate-400 hover:text-cyber-cyan font-mono transition-all"
          >
            <Copy className="w-3 h-3" /> COPY HUD
          </button>
          <button
            onClick={onClearLogs}
            className="flex items-center gap-1 text-[0.6rem] border border-solid border-white/10 hover:border-cyber-red rounded-md px-2.5 py-1 text-slate-400 hover:text-cyber-red font-mono transition-all"
          >
            <Trash2 className="w-3 h-3" /> CLEAR
          </button>
        </div>
      </div>

      {/* Terminal Screen Container */}
      <div className="terminal-box h-[230px] terminal-font text-xs flex flex-col gap-1.5 border border-solid border-white/5 bg-[#010204] relative overflow-hidden shadow-inner p-4 rounded-xl">
        {/* Futuristic scanline and grid background overlays */}
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_4px,3px_100%] z-10"></div>
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(0,242,254,0.03)_0%,transparent_100%)] z-10"></div>

        <div className="flex-grow overflow-y-auto relative z-20 space-y-1.5 pr-2">
          {logs.length === 0 ? (
            <div className="text-slate-700 italic select-none py-10 text-center font-mono text-[0.7rem] uppercase tracking-wider animate-pulse">
              [SYSTEM IDLE] Awaiting laser transmission telemetry...
            </div>
          ) : (
            logs.map((log, idx) => {
              let colorClass = 'text-slate-400';
              if (log.type === 'info') colorClass = 'text-cyber-cyan';
              else if (log.type === 'success') colorClass = 'text-cyber-green font-bold';
              else if (log.type === 'error') colorClass = 'text-cyber-red font-bold animate-pulse';
              else if (log.type === 'warning') colorClass = 'text-cyber-orange';
              else if (log.type === 'purple') colorClass = 'text-cyber-purple';

              return (
                <div key={idx} className={`whitespace-pre-wrap leading-relaxed border-l-2 pl-2 border-white/5 hover:border-white/20 transition-colors ${colorClass} animate-fadeIn`}>
                  <span className="text-[0.6rem] text-slate-600 mr-2 font-sans select-none">
                    [{new Date().toLocaleTimeString()}]
                  </span>
                  {formatLogText(log.text)}
                </div>
              );
            })
          )}
          <div ref={terminalEndRef} />
        </div>
      </div>
    </div>
  );
};
