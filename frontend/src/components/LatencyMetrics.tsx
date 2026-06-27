import React from 'react';
import type { RouteResult } from '../utils/math';
import { Clock, ShieldAlert, BarChart } from 'lucide-react';

interface LatencyMetricsProps {
  activeRoute: RouteResult | null;
}

export const LatencyMetrics: React.FC<LatencyMetricsProps> = ({ activeRoute }) => {
  if (!activeRoute) return null;

  if (activeRoute.error) {
    return (
      <div className="glass-panel p-5 border border-[#ff3366]/30 bg-[#ff3366]/5 rounded-xl w-full flex items-center gap-3">
        <ShieldAlert className="w-10 h-10 text-[#ff3366] shrink-0" />
        <div>
          <h4 className="text-sm font-semibold uppercase text-[#ff3366] font-display">
            Routing Failure
          </h4>
          <p className="text-xs text-slate-400 mt-1">
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
    
    // Atmospheric delay is built into Void travel time Tv in the formula:
    // Tv = ((h1*n1) + (h2*n2) + L) / C
    // The atmospheric portion of Tv (in ms) is ((h1*n1) + (h2*n2)) / C * 1000.
    // Let's extract it for visualization purposes.
    // Wait, let's verify if we can extract Tv_atmosphere.
    // From Tv = ((h1*n1 + h2*n2) + L) / C, the atmos time is (h1*n1 + h2*n2)/C.
    // The pure void travel time (vacuum portion) is L/C.
    // Let's compute them for the visual bar chart!
  });

  // Calculate the atmos component ofTv and pure void component of Tv
  let pureVoidMs = 0;
  let atmosMs = 0;
  activeRoute.hop_logs.forEach((hop) => {
    // Total Tv = hop.void_latency_ms
    // Let's see: how did we compute Tv? Tv = ((h1*n1) + (h2*n2) + L)/C * 1000
    // Let's approximate the ratio, or compute it exactly if we have the nodes.
    // In hop_logs, we already have the raw numbers. Let's make an exact ratio:
    // Let's estimate: since we know void_latency_ms, let's calculate the pure vacuum part:
    // L / C * 1000, and the rest is atmosphere.
    // Let's do that!
    // Wait, hop_logs contains void_distance_km, which is L.
    // So pure vacuum time = L / 300,000 * 1000.
    // And atmos delay = hop.void_latency_ms - pure vacuum time.
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

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Latency Summary Header */}
      <div className="glass-panel p-5 border border-solid flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xs uppercase font-semibold text-[#00f2fe] tracking-wider flex items-center gap-1.5 font-display">
            <Clock className="w-4 h-4" /> Latency Analysis
          </h3>
          <span className="font-mono text-xl font-bold text-[#05ffb0] glow-text-green">
            {grandTotal.toFixed(3)} ms
          </span>
        </div>

        {/* Stacked Latency Bar Chart */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-[0.65rem] text-slate-400 font-display">
            <span>Latency Budget Breakdown</span>
            <span>Total: {grandTotal.toFixed(1)}ms</span>
          </div>
          
          <div className="w-full h-4 bg-slate-900 rounded-full overflow-hidden flex border border-solid border-slate-800">
            {pureVoidMs > 0 && (
              <div
                style={{ width: `${pctVoid}%` }}
                className="bg-[#00f2fe] h-full"
                title={`Vacuum Void Transmission: ${pureVoidMs.toFixed(2)}ms (${pctVoid.toFixed(0)}%)`}
              />
            )}
            {atmosMs > 0 && (
              <div
                style={{ width: `${pctAtmos}%` }}
                className="bg-[#f59e0b] h-full"
                title={`Atmospheric Refraction: ${atmosMs.toFixed(2)}ms (${pctAtmos.toFixed(0)}%)`}
              />
            )}
            {totalFiberMs > 0 && (
              <div
                style={{ width: `${pctFiber}%` }}
                className="bg-[#c084fc] h-full"
                title={`Subsurface Fiber Transit: ${totalFiberMs.toFixed(2)}ms (${pctFiber.toFixed(0)}%)`}
              />
            )}
            {totalTowerMs > 0 && (
              <div
                style={{ width: `${pctTower}%` }}
                className="bg-[#ff3366] h-full"
                title={`Tower Processing Delay: ${totalTowerMs.toFixed(2)}ms (${pctTower.toFixed(0)}%)`}
              />
            )}
          </div>

          {/* Color Legends */}
          <div className="grid grid-cols-2 gap-2 mt-2 text-[0.65rem] font-mono text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-[#00f2fe] rounded-sm inline-block"></span>
              <span>Vacuum Void: {pureVoidMs.toFixed(1)}ms</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-[#f59e0b] rounded-sm inline-block"></span>
              <span>Atmos Refraction: {atmosMs.toFixed(1)}ms</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-[#c084fc] rounded-sm inline-block"></span>
              <span>Crust Fiber: {totalFiberMs.toFixed(1)}ms</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-[#ff3366] rounded-sm inline-block"></span>
              <span>Tower processing: {totalTowerMs.toFixed(1)}ms</span>
            </div>
          </div>
        </div>
      </div>

      {/* Hop by Hop Table */}
      <div className="glass-panel p-5 border border-solid">
        <h3 className="text-xs uppercase font-semibold text-[#00f2fe] tracking-wider mb-4 flex items-center gap-1.5 font-display">
          <BarChart className="w-4 h-4" /> Hop-by-Hop Breakdown
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[0.65rem] font-mono">
            <thead>
              <tr className="border-b border-solid border-slate-800 text-slate-400 uppercase tracking-wider">
                <th className="pb-2">Hop</th>
                <th className="pb-2">Path</th>
                <th className="pb-2 text-right">Towers</th>
                <th className="pb-2 text-right">Void Dist</th>
                <th className="pb-2 text-right">Fiber L.</th>
                <th className="pb-2 text-right">Void L.</th>
                <th className="pb-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {activeRoute.hop_logs.map((hop) => (
                <tr key={hop.hop} className="border-b border-solid border-slate-900/60 hover:bg-slate-900/40 text-slate-300">
                  <td className="py-2 text-[#00f2fe]">{hop.hop}</td>
                  <td className="py-2 font-display text-[0.7rem]">
                    {hop.from_planet} <span className="text-slate-500 font-sans">→</span> {hop.to_planet}
                  </td>
                  <td className="py-2 text-right text-slate-400">
                    T{hop.exit_tower} <span className="text-slate-600">→</span> T{hop.entry_tower}
                  </td>
                  <td className="py-2 text-right">
                    {(hop.void_distance_km / 1000).toFixed(0)}k km
                  </td>
                  <td className="py-2 text-right text-[#c084fc]">
                    {hop.internal_transit_latency_ms.toFixed(1)}ms
                  </td>
                  <td className="py-2 text-right text-[#00f2fe]">
                    {hop.void_latency_ms.toFixed(1)}ms
                  </td>
                  <td className="py-2 text-right text-[#05ffb0] font-semibold">
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
