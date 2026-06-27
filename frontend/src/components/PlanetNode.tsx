import React from 'react';
import { Handle, Position } from 'reactflow';

interface PlanetNodeData {
  id: string;
  name: string;
  codex: number;
  radius_km: number;
  active_towers: number;
  atmosphere_thickness_km: number;
  refraction_index: number;
  isOrigin: boolean;
  isDest: boolean;
  isKilled: boolean;
  isRoute: boolean;
}

export const PlanetNode: React.FC<{ data: PlanetNodeData }> = ({ data }) => {
  const {
    name,
    codex,
    radius_km,
    active_towers,
    atmosphere_thickness_km,
    refraction_index,
    isOrigin,
    isDest,
    isKilled,
    isRoute,
  } = data;

  // Visual scaling factors for rendering rings nicely
  const radiusScale = 0.005; // map 1000km to pixels
  const atmosScale = 0.08;

  const planetRadius = Math.max(16, radius_km * radiusScale);
  const atmosThickness = Math.max(4, atmosphere_thickness_km * atmosScale);

  // Border colors based on state
  let glowColor = 'rgba(0, 242, 254, 0.4)';
  let borderColor = 'border-cyber-cyan';
  let textColor = 'text-cyber-cyan';

  if (isKilled) {
    glowColor = 'rgba(255, 51, 102, 0.5)';
    borderColor = 'border-cyber-red';
    textColor = 'text-cyber-red';
  } else if (isOrigin) {
    glowColor = 'rgba(5, 255, 176, 0.6)';
    borderColor = 'border-cyber-green';
    textColor = 'text-cyber-green';
  } else if (isDest) {
    glowColor = 'rgba(189, 94, 255, 0.6)';
    borderColor = 'border-cyber-purple';
    textColor = 'text-cyber-purple';
  } else if (isRoute) {
    glowColor = 'rgba(245, 158, 11, 0.5)';
    borderColor = 'border-cyber-orange';
    textColor = 'text-cyber-orange';
  }

  return (
    <div className={`relative flex flex-col items-center justify-center select-none`}>
      {/* Handles for React Flow connections */}
      <Handle type="target" position={Position.Top} className="opacity-0" />
      <Handle type="source" position={Position.Bottom} className="opacity-0" />

      {/* Atmospheric Outer Shell Ring */}
      {!isKilled && (
        <div
          style={{
            width: `${(planetRadius + atmosThickness) * 2}px`,
            height: `${(planetRadius + atmosThickness) * 2}px`,
            border: '1px dashed rgba(255, 255, 255, 0.15)',
            boxShadow: `0 0 15px ${glowColor}`,
          }}
          className="absolute rounded-full animate-[spin_40s_linear_infinite]"
        />
      )}

      {/* Main Bounding Planet Circle */}
      <div
        style={{
          width: `${planetRadius * 2}px`,
          height: `${planetRadius * 2}px`,
          boxShadow: isKilled ? 'none' : `inset 0 0 12px ${glowColor}, 0 0 10px ${glowColor}`,
          backgroundColor: isKilled ? 'rgba(255, 51, 102, 0.1)' : 'rgba(8, 14, 28, 0.8)',
        }}
        className={`rounded-full border-2 border-solid ${borderColor} flex items-center justify-center transition-all duration-300 ${
          isKilled ? 'animate-pulse border-dashed' : ''
        }`}
      >
        {/* Core Dot */}
        <div
          style={{
            width: '6px',
            height: '6px',
            backgroundColor: isKilled ? '#ff3366' : isOrigin ? '#05ffb0' : isDest ? '#bd5eff' : '#00f2fe',
          }}
          className="rounded-full"
        />
      </div>

      {/* Cyber/Arwes Mechanical Tag HUD */}
      <div
        className={`mt-3 px-2 py-1 rounded border border-solid backdrop-blur-md flex flex-col items-center min-w-[90px] ${
          isKilled 
            ? 'bg-cyber-red/10 border-cyber-red/30' 
            : isOrigin 
            ? 'bg-cyber-green/10 border-cyber-green/30'
            : isDest 
            ? 'bg-cyber-purple/10 border-cyber-purple/30'
            : 'bg-space-card border-white/5'
        }`}
      >
        <span className={`text-[0.7rem] font-bold tracking-wider font-display uppercase ${textColor}`}>
          {name}
        </span>
        <span className="text-[0.55rem] font-mono text-slate-400 mt-0.5">
          BASE {codex} · {active_towers} TWR
        </span>
        {!isKilled && (
          <span className="text-[0.5rem] font-mono text-slate-500">
            ATM: {atmosphere_thickness_km}km (n:{refraction_index.toFixed(3)})
          </span>
        )}
        {isKilled && (
          <span className="text-[0.55rem] font-mono text-cyber-red font-bold animate-pulse mt-0.5">
            OFFLINE
          </span>
        )}
      </div>
    </div>
  );
};
