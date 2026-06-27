import React, { useEffect, useRef } from 'react';
import { Terminal } from 'lucide-react';

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
    alert('Logs copied to clipboard!');
  };

  return (
    <div className="glass-panel p-5 border border-solid w-full">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-xs uppercase font-semibold text-[#00f2fe] tracking-wider flex items-center gap-1.5 font-display">
          <Terminal className="w-4 h-4" /> Codex Translation & Hop Logs
        </h3>
        <div className="flex gap-2">
          <button
            onClick={copyLogs}
            className="text-[0.65rem] border border-solid border-slate-700 hover:border-slate-500 rounded px-2 py-0.5 text-slate-400 hover:text-slate-300 font-mono transition-colors"
          >
            Copy Terminal
          </button>
          <button
            onClick={onClearLogs}
            className="text-[0.65rem] border border-solid border-slate-700 hover:border-slate-500 rounded px-2 py-0.5 text-slate-400 hover:text-slate-300 font-mono transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="terminal-box h-[220px] terminal-font text-xs flex flex-col gap-1 border border-solid bg-[#030509]">
        {logs.length === 0 ? (
          <div className="text-slate-600 italic select-none py-4 text-center">
            SYSTEM IDLE. Awaiting transmission commands...
          </div>
        ) : (
          logs.map((log, idx) => {
            let colorClass = 'text-slate-300';
            if (log.type === 'info') colorClass = 'text-[#00f2fe]';
            else if (log.type === 'success') colorClass = 'text-[#05ffb0]';
            else if (log.type === 'error') colorClass = 'text-[#ff3366]';
            else if (log.type === 'warning') colorClass = 'text-[#f59e0b]';
            else if (log.type === 'purple') colorClass = 'text-[#c084fc]';

            return (
              <div key={idx} className={`whitespace-pre-wrap ${colorClass}`}>
                {log.text}
              </div>
            );
          })
        )}
        <div ref={terminalEndRef} />
      </div>
    </div>
  );
};
