import React from 'react';
import type { RouteResult } from '../utils/math';
import { Clock } from 'lucide-react';

interface LatencyMetricsProps {
  activeRoute: RouteResult | null;
  speedOfLight?: number; // km/s from universe metadata (default: 299792.458)
}

export const LatencyMetrics: React.FC<LatencyMetricsProps> = ({ activeRoute, speedOfLight = 299792.458 }) => {
  if (!activeRoute || activeRoute.error || activeRoute.hop_logs.length === 0) return null;

  // Accumulate raw float components across all hops
  let totalFiberMs = 0;
  let totalTowerMs = 0;
  let pureVoidMs   = 0;
  let atmosMs      = 0;

  activeRoute.hop_logs.forEach((hop) => {
    totalFiberMs += hop.internal_transit_latency_ms;
    totalTowerMs += hop.tower_delay_ms;

    // Re-derive pure vacuum time from void_distance_km using the actual speed-of-light
    // void_latency_ms = (void + atmos_exit + atmos_entry) / c * 1000
    // pureVac = void_distance_km / c * 1000
    const pureVac = (hop.void_distance_km / speedOfLight) * 1000;
    pureVoidMs += Math.max(0, pureVac);
    // Remainder is atmospheric refraction on both sides
    atmosMs    += Math.max(0, hop.void_latency_ms - pureVac);
  });

  // Grand total is the exact sum of all hop sub-components —
  // this guarantees the breakdown rows always add up to what's displayed in the header.
  const grandTotal = totalFiberMs + totalTowerMs + pureVoidMs + atmosMs;

  const pctVoid  = grandTotal > 0 ? (pureVoidMs   / grandTotal) * 100 : 0;
  const pctAtmos = grandTotal > 0 ? (atmosMs       / grandTotal) * 100 : 0;
  const pctFiber = grandTotal > 0 ? (totalFiberMs  / grandTotal) * 100 : 0;
  const pctTower = grandTotal > 0 ? (totalTowerMs  / grandTotal) * 100 : 0;

  return (
    <div className="glass-panel p-4 border border-solid border-[#00f2fe]/10 flex flex-col gap-3 w-full select-none mt-4">
      <div className="flex justify-between items-center">
        <h3 className="text-xs uppercase font-semibold text-[#00f2fe] tracking-wider flex items-center gap-1.5 font-display">
          <Clock className="w-3.5 h-3.5" /> Propagation Budget Breakdown
        </h3>
        <span className="font-mono text-xs font-semibold text-[#05ffb0] bg-[#05ffb0]/10 px-2 py-0.5 rounded">
          {grandTotal.toFixed(3)} ms
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        {/* Stacked bar */}
        <div className="w-full h-3.5 bg-[#05070c] rounded overflow-hidden flex border border-solid border-slate-800">
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
        <div className="grid grid-cols-4 gap-1.5 mt-1 text-[0.58rem] font-mono text-slate-400 text-center">
          <div className="flex items-center justify-center gap-1.5 bg-[#00f2fe]/5 py-1 rounded">
            <span className="w-2 h-2 bg-[#00f2fe] rounded-sm inline-block"></span>
            <span>VOID: {pureVoidMs.toFixed(3)}ms</span>
          </div>
          <div className="flex items-center justify-center gap-1.5 bg-[#f59e0b]/5 py-1 rounded">
            <span className="w-2 h-2 bg-[#f59e0b] rounded-sm inline-block"></span>
            <span>ATMOS: {atmosMs.toFixed(3)}ms</span>
          </div>
          <div className="flex items-center justify-center gap-1.5 bg-[#c084fc]/5 py-1 rounded">
            <span className="w-2 h-2 bg-[#c084fc] rounded-sm inline-block"></span>
            <span>FIBER: {totalFiberMs.toFixed(3)}ms</span>
          </div>
          <div className="flex items-center justify-center gap-1.5 bg-[#ff3366]/5 py-1 rounded">
            <span className="w-2 h-2 bg-[#ff3366] rounded-sm inline-block"></span>
            <span>TOWER: {totalTowerMs.toFixed(3)}ms</span>
          </div>
        </div>
      </div>
    </div>
  );
};
