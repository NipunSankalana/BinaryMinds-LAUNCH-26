import React, { useState } from 'react';
import type { RouteResult } from '../utils/math';
import { Clock, ShieldAlert, BarChart, Info } from 'lucide-react';

interface LatencyMetricsProps {
  activeRoute: RouteResult | null;
}

export const LatencyMetrics: React.FC<LatencyMetricsProps> = ({ activeRoute }) => {
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);

  if (!activeRoute) return null;

  if (activeRoute.error) {
    return (
      <div className="glass-panel p-5 border border-cyber-red/30 bg-cyber-red/5 rounded-xl w-full flex items-center gap-3 animate-[shake_0.5s_ease-in-out]">
        <ShieldAlert className="w-10 h-10 text-cyber-red shrink-0 animate-pulse" />
        <div>
          <h4 className="text-xs font-bold uppercase text-cyber-red font-display tracking-widest">
            Routing Vector Severed
          </h4>
          <p className="text-[0.7rem] text-slate-400 font-mono mt-1 leading-normal">
            {activeRoute.error}
          </p>
        </div>
      </div>
    );
  }

  // Calculate totals per category
  let totalVoidMs = 0;
  let totalFiberMs = 0;
  let totalTowerMs = 0;

  activeRoute.hop_logs.forEach((hop) => {
    totalVoidMs += hop.void_latency_ms;
    totalFiberMs += hop.internal_transit_latency_ms;
    totalTowerMs += hop.tower_delay_ms;
  });

  // Calculate the atmosphere component and pure void component
  let pureVoidMs = 0;
  let atmosMs = 0;
  activeRoute.hop_logs.forEach((hop) => {
    // Pure vacuum time = L / 300,000 * 1000
    const pureVac = (hop.void_distance_km / 300000) * 1000;
    pureVoidMs += Math.max(0, pureVac);
    atmosMs += Math.max(0, hop.void_latency_ms - pureVac);
  });

  const grandTotal = activeRoute.total_latency_ms;

  // Percentages for the stacked bar
  const pctVoid = grandTotal > 0 ? (pureVoidMs / grandTotal) * 100 : 0;
  const pctAtmos = grandTotal > 0 ? (atmosMs / grandTotal) * 100 : 0;
  const pctFiber = grandTotal > 0 ? (totalFiberMs / grandTotal) * 100 : 0;
  const pctTower = grandTotal > 0 ? (totalTowerMs / grandTotal) * 100 : 0;

  // Dictionary containing mathematical formulas & explanations for each latency category
  const segmentInfo: Record<string, { title: string; formula: string; explanation: string; variables: string; color: string }> = {
    void: {
      title: 'Vacuum Void Transmission',
      formula: 'T_void = L / c',
      explanation: 'Signal traveling through space vacuum at the speed of light.',
      variables: 'L = distance center-to-center minus planet radii and atmospheric shells; c = 300,000 km/s',
      color: 'text-cyber-cyan',
    },
    atmos: {
      title: 'Atmospheric Refraction',
      formula: 'T_atm = (h * n) / c',
      explanation: 'Laser propagation delay caused by refraction through planetary atmospheres.',
      variables: 'h = atmosphere thickness; n = refraction index (e.g. Aegis: 1.20, Elysium: 1.25)',
      color: 'text-cyber-orange',
    },
    fiber: {
      title: 'Subsurface Fiber Transit',
      formula: 'T_fiber = r / (c * f)',
      explanation: 'Transit delay inside the planet\'s internal optic fiber core.',
      variables: 'r = planetary radius; f = fiber speed fraction (constant: 0.67)',
      color: 'text-cyber-purple',
    },
    tower: {
      title: 'Tower Processing Delay',
      formula: 'T_tower = 7.0 ms',
      explanation: 'Flat delay incurred for signal serialization, dialection encoding, and routing at each entered planet.',
      variables: 'Δt = 7.0 ms (constant delay per node entered, excluding starting node)',
      color: 'text-cyber-red',
    },
  };

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Latency Summary Header */}
      <div className="glass-panel p-5 border border-solid border-white/5 bg-slate-950/40 flex flex-col gap-4 relative">
        <div className="absolute top-0 right-0 w-8 h-1 bg-cyber-cyan shadow-[0_0_10px_#00f2fe]"></div>

        <div className="flex justify-between items-center">
          <h3 className="text-xs uppercase font-bold text-cyber-cyan tracking-widest flex items-center gap-1.5 font-display">
            <Clock className="w-4 h-4 text-cyber-cyan animate-pulse" /> Latency Analysis
          </h3>
          <span className="font-mono text-xl font-bold text-cyber-green glow-text-green">
            {grandTotal.toFixed(3)} ms
          </span>
        </div>

        {/* Stacked Latency Bar Chart */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between text-[0.65rem] text-slate-400 font-display">
            <span>Latency Budget Breakdown</span>
            <span className="font-mono">Budget Allocated</span>
          </div>
          
          <div className="w-full h-5 bg-slate-950 rounded-lg overflow-hidden flex border border-solid border-white/10 p-0.5 shadow-inner">
            {pureVoidMs > 0 && (
              <div
                style={{ width: `${pctVoid}%` }}
                className="bg-cyber-cyan h-full rounded-l-md transition-all duration-500 cursor-help"
                onMouseEnter={() => setHoveredSegment('void')}
                onMouseLeave={() => setHoveredSegment(null)}
              />
            )}
            {atmosMs > 0 && (
              <div
                style={{ width: `${pctAtmos}%` }}
                className="bg-cyber-orange h-full transition-all duration-500 cursor-help"
                onMouseEnter={() => setHoveredSegment('atmos')}
                onMouseLeave={() => setHoveredSegment(null)}
              />
            )}
            {totalFiberMs > 0 && (
              <div
                style={{ width: `${pctFiber}%` }}
                className="bg-cyber-purple h-full transition-all duration-500 cursor-help"
                onMouseEnter={() => setHoveredSegment('fiber')}
                onMouseLeave={() => setHoveredSegment(null)}
              />
            )}
            {totalTowerMs > 0 && (
              <div
                style={{ width: `${pctTower}%` }}
                className="bg-cyber-red h-full rounded-r-md transition-all duration-500 cursor-help"
                onMouseEnter={() => setHoveredSegment('tower')}
                onMouseLeave={() => setHoveredSegment(null)}
              />
            )}
          </div>

          {/* Color Legends with Hover Activation */}
          <div className="grid grid-cols-2 gap-2 mt-1 text-[0.6rem] font-mono text-slate-400 border-t border-white/5 pt-2">
            <div 
              className={`flex items-center justify-between p-1.5 rounded transition-colors cursor-help ${hoveredSegment === 'void' ? 'bg-cyber-cyan/5 text-cyber-cyan' : ''}`}
              onMouseEnter={() => setHoveredSegment('void')}
              onMouseLeave={() => setHoveredSegment(null)}
            >
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-cyber-cyan rounded-full inline-block"></span>
                <span>Vacuum Void:</span>
              </div>
              <span className="font-semibold">{pureVoidMs.toFixed(1)} ms</span>
            </div>
            <div 
              className={`flex items-center justify-between p-1.5 rounded transition-colors cursor-help ${hoveredSegment === 'atmos' ? 'bg-cyber-orange/5 text-cyber-orange' : ''}`}
              onMouseEnter={() => setHoveredSegment('atmos')}
              onMouseLeave={() => setHoveredSegment(null)}
            >
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-cyber-orange rounded-full inline-block"></span>
                <span>Atmos Refraction:</span>
              </div>
              <span className="font-semibold">{atmosMs.toFixed(1)} ms</span>
            </div>
            <div 
              className={`flex items-center justify-between p-1.5 rounded transition-colors cursor-help ${hoveredSegment === 'fiber' ? 'bg-cyber-purple/5 text-cyber-purple' : ''}`}
              onMouseEnter={() => setHoveredSegment('fiber')}
              onMouseLeave={() => setHoveredSegment(null)}
            >
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-cyber-purple rounded-full inline-block"></span>
                <span>Crust Fiber:</span>
              </div>
              <span className="font-semibold">{totalFiberMs.toFixed(1)} ms</span>
            </div>
            <div 
              className={`flex items-center justify-between p-1.5 rounded transition-colors cursor-help ${hoveredSegment === 'tower' ? 'bg-cyber-red/5 text-cyber-red' : ''}`}
              onMouseEnter={() => setHoveredSegment('tower')}
              onMouseLeave={() => setHoveredSegment(null)}
            >
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-cyber-red rounded-full inline-block"></span>
                <span>Tower Penalty:</span>
              </div>
              <span className="font-semibold">{totalTowerMs.toFixed(1)} ms</span>
            </div>
          </div>
        </div>

        {/* Telemetry Equation Formula HUD card when segment is hovered */}
        {hoveredSegment && (
          <div className="mt-2 p-3 bg-[#020408] border border-solid border-white/10 rounded-lg animate-fadeIn text-[0.62rem] font-mono leading-relaxed">
            <div className="flex items-center gap-1 mb-1">
              <Info className={`w-3.5 h-3.5 ${segmentInfo[hoveredSegment].color}`} />
              <span className={`font-bold ${segmentInfo[hoveredSegment].color}`}>
                {segmentInfo[hoveredSegment].title.toUpperCase()}
              </span>
            </div>
            <div className="text-slate-200 font-bold mb-1">
              Formula: <span className="text-[#05ffb0]">{segmentInfo[hoveredSegment].formula}</span>
            </div>
            <div className="text-slate-400 mb-1">
              {segmentInfo[hoveredSegment].explanation}
            </div>
            <div className="text-slate-500 italic">
              Variables: {segmentInfo[hoveredSegment].variables}
            </div>
          </div>
        )}
      </div>

      {/* Hop by Hop Table */}
      <div className="glass-panel p-5 border border-solid border-white/5 bg-slate-950/40 flex flex-col gap-4 relative">
        <div className="absolute top-0 right-0 w-8 h-1 bg-cyber-purple shadow-[0_0_10px_#bd5eff]"></div>

        <h3 className="text-xs uppercase font-bold text-cyber-purple tracking-widest mb-1 flex items-center gap-1.5 font-display">
          <BarChart className="w-4 h-4 text-cyber-purple" /> Hop-by-Hop Breakdown
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[0.65rem] font-mono">
            <thead>
              <tr className="border-b border-solid border-white/10 text-slate-400 uppercase tracking-widest">
                <th className="pb-2.5">Hop</th>
                <th className="pb-2.5">Path</th>
                <th className="pb-2.5 text-right">Towers</th>
                <th className="pb-2.5 text-right">Void Dist</th>
                <th className="pb-2.5 text-right">Fiber L.</th>
                <th className="pb-2.5 text-right">Void L.</th>
                <th className="pb-2.5 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {activeRoute.hop_logs.map((hop) => (
                <tr key={hop.hop} className="border-b border-solid border-white/5 hover:bg-white/[0.02] text-slate-300 transition-colors">
                  <td className="py-2.5 text-cyber-cyan font-bold">{hop.hop}</td>
                  <td className="py-2.5 font-display text-[0.7rem] font-semibold text-slate-200">
                    {hop.from_planet} <span className="text-slate-500 font-sans">→</span> {hop.to_planet}
                  </td>
                  <td className="py-2.5 text-right text-slate-400 font-semibold">
                    T{hop.exit_tower} <span className="text-slate-600">→</span> T{hop.entry_tower}
                  </td>
                  <td className="py-2.5 text-right text-slate-300">
                    {(hop.void_distance_km / 1000).toFixed(0)}k km
                  </td>
                  <td className="py-2.5 text-right text-cyber-purple">
                    {hop.internal_transit_latency_ms.toFixed(1)}ms
                  </td>
                  <td className="py-2.5 text-right text-cyber-cyan">
                    {hop.void_latency_ms.toFixed(1)}ms
                  </td>
                  <td className="py-2.5 text-right text-cyber-green font-bold">
                    {hop.hop_total_latency_ms.toFixed(2)}ms
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
