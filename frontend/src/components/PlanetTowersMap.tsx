import React, { useState, useEffect } from 'react';
import type { UniverseConfig, RouteResult } from '../utils/math';
import { Network, Lock, Sliders, Globe, ShieldAlert } from 'lucide-react';

interface PlanetTowersMapProps {
  config: UniverseConfig | null;
  inspectedPlanetId: string;
  onSelectPlanet: (id: string) => void;
  activeRoute: RouteResult | null;
  activeHop: {
    planetId: string;
    receivingTower: number;
    sendingTower: number;
  } | null;
  isSimulating: boolean;
}

export const PlanetTowersMap: React.FC<PlanetTowersMapProps> = ({
  config,
  inspectedPlanetId,
  onSelectPlanet,
  activeRoute,
  activeHop,
  isSimulating,
}) => {
  // Manual interactive state when not override by active route
  const [manualReceivingIndex, setManualReceivingIndex] = useState<number>(0);
  const [manualSendingIndex, setManualSendingIndex] = useState<number>(4);

  const currentPlanet = config?.nodes.find((n) => n.id === inspectedPlanetId) || config?.nodes[0];
  const numTowers = currentPlanet?.active_towers ?? 8;

  // Clamp manual choices when planet changes to avoid index out of bounds warnings
  useEffect(() => {
    if (manualReceivingIndex >= numTowers) {
      setManualReceivingIndex(0);
    }
    if (manualSendingIndex >= numTowers) {
      setManualSendingIndex(Math.min(4, numTowers - 1));
    }
  }, [inspectedPlanetId, numTowers]);

  // If config or planet is not loaded, return null (placed after hooks to prevent violations)
  if (!config || !currentPlanet) return null;

  // Check if this planet is part of the active route path
  let receivingTowerIndex = manualReceivingIndex;
  let sendingTowerIndex = manualSendingIndex;
  let hasRouteDetails = false;
  let activeHopIndex = -1;

  if (isSimulating && activeHop && activeHop.planetId === currentPlanet.id) {
    receivingTowerIndex = activeHop.receivingTower;
    sendingTowerIndex = activeHop.sendingTower;
    hasRouteDetails = true;
  } else if (activeRoute && activeRoute.path && activeRoute.path.includes(currentPlanet.id)) {
    const path = activeRoute.path;
    const hopLogs = activeRoute.hop_logs;
    const planetIdx = path.indexOf(currentPlanet.id);
    hasRouteDetails = true;
    activeHopIndex = planetIdx;

    if (planetIdx === 0) {
      // Origin node: start at center / internal, egress via hop 0 exit_tower
      receivingTowerIndex = 0; // Default origin start anchor
      sendingTowerIndex = hopLogs.length > 0 ? hopLogs[0].exit_tower : 0;
    } else if (planetIdx === path.length - 1) {
      // Destination node: ingress via last hop entry_tower, end at center
      receivingTowerIndex = hopLogs.length > 0 ? hopLogs[hopLogs.length - 1].entry_tower : 0;
      sendingTowerIndex = 0; // Default destination end anchor
    } else if (planetIdx > 0 && planetIdx < path.length - 1) {
      // Intermediate relay node: ingress via previous hop entry_tower, egress via current exit_tower
      receivingTowerIndex = hopLogs[planetIdx - 1].entry_tower;
      sendingTowerIndex = hopLogs[planetIdx].exit_tower;
    }
  }

  // Ensure tower indices are clamped within range (in case active_towers changes per planet)
  receivingTowerIndex = Math.min(Math.max(0, receivingTowerIndex), numTowers - 1);
  sendingTowerIndex = Math.min(Math.max(0, sendingTowerIndex), numTowers - 1);

  // Visual parameters
  const planetCenterX = 150;
  const planetCenterY = 110;
  const planetVisualRadius = 75;
  const angularSpacing = (2 * Math.PI) / numTowers;

  // Calculate coordinates for tower placing
  const getTowerCoords = (index: number) => {
    const theta = index * angularSpacing;
    return {
      x: planetCenterX + planetVisualRadius * Math.sin(theta),
      y: planetCenterY - planetVisualRadius * Math.cos(theta),
      theta,
    };
  };

  // Calculate standard layout angles (where 0 radians is at 3 o'clock / right vertical)
  const alphaStart = receivingTowerIndex * angularSpacing - Math.PI / 2;
  const alphaEnd = sendingTowerIndex * angularSpacing - Math.PI / 2;

  // Shortest path difference
  let diff = alphaEnd - alphaStart;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;

  const isClockwise = diff >= 0;
  const sweepFlag = isClockwise ? 1 : 0;
  const largeArcFlag = 0; // Shortest path is always <= PI, so largeArcFlag is always 0.
  const angleDegrees = Math.abs(diff) * (180 / Math.PI);

  // Path data for active arc
  const xStart = planetCenterX + planetVisualRadius * Math.cos(alphaStart);
  const yStart = planetCenterY + planetVisualRadius * Math.sin(alphaStart);
  const xEnd = planetCenterX + planetVisualRadius * Math.cos(alphaEnd);
  const yEnd = planetCenterY + planetVisualRadius * Math.sin(alphaEnd);

  const arcPath =
    receivingTowerIndex === sendingTowerIndex
      ? ''
      : `M ${xStart} ${yStart} A ${planetVisualRadius} ${planetVisualRadius} 0 ${largeArcFlag} ${sweepFlag} ${xEnd} ${yEnd}`;

  // Fiber latency calculation
  const c = config.universe_metadata?.speed_of_light_kms ?? 300000;
  const fraction = config.universe_metadata?.fiber_speed_fraction ?? 0.67;
  const fiberSpeed = c * fraction;
  const fiberDistanceKm = currentPlanet.radius_km * Math.abs(diff);
  const fiberLatencyMs = (fiberDistanceKm / fiberSpeed) * 1000;

  // Color mapping based on planet names
  const getPlanetBaseColor = (name: string) => {
    const n = name.toLowerCase();
    if (n === 'aegis') return '#5b9dff';
    if (n === 'boreas') return '#ff5b5b';
    if (n === 'dawn') return '#00e5ff';
    if (n === 'fenix') return '#d885ff';
    if (n === 'elysium') return '#ff9b44';
    if (n === 'caelum') return '#ffd85b';
    return '#8b9dff';
  };

  const planetColor = getPlanetBaseColor(currentPlanet.id);

  return (
    <div className="glass-panel border-slate-800 p-5 mt-4">
      <h3 className="panel-title flex items-center gap-2 border-b border-solid border-slate-800 pb-2 mb-4">
        <Network className="w-4 h-4 text-[#00f2fe]" />
        INTERNAL PLANET TRANSIT: <span className="text-white glow-text-cyan">{currentPlanet.id.toUpperCase()}</span>
        {isSimulating && activeHop && activeHop.planetId === currentPlanet.id ? (
          <span className="ml-auto text-[0.55rem] font-mono text-[#05ffb0] font-bold bg-[#05ffb0]/10 px-1.5 py-0.5 rounded border border-[#05ffb0]/20 animate-pulse uppercase">
            SIM ACTIVE
          </span>
        ) : hasRouteDetails ? (
          <span className="ml-auto text-[0.55rem] font-mono text-[#c084fc] font-bold bg-[#c084fc]/10 px-1.5 py-0.5 rounded border border-[#c084fc]/20 uppercase">
            ROUTED PATH
          </span>
        ) : (
          <span className="ml-auto text-[0.55rem] font-mono text-slate-400 font-bold bg-slate-800/40 px-1.5 py-0.5 rounded border border-slate-700/30 uppercase">
            MANUAL INSPECTION
          </span>
        )}
      </h3>

      <div className="flex flex-col lg:flex-row gap-6 items-stretch">
        {/* Left Side: SVG Visualizer (300px width limit) */}
        <div className="w-full lg:w-[320px] shrink-0 bg-[#030509] rounded-lg border border-solid border-[#00f2fe]/5 overflow-hidden relative aspect-video lg:aspect-square flex justify-center items-center py-2 shadow-inner">
          <svg width="100%" height="100%" viewBox="0 0 300 220" preserveAspectRatio="xMidYMid meet">
            <defs>
              <radialGradient id="transit-planet-grad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#080e1c" />
                <stop offset="85%" stopColor="#04070f" />
                <stop offset="100%" stopColor="#0a152d" />
              </radialGradient>

              <filter id="glow-fiber" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>

              <filter id="glow-tower-active" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            <style>{`
              @keyframes fiber-pulse {
                from { stroke-dashoffset: 20; }
                to { stroke-dashoffset: 0; }
              }
              .fiber-pulse-arc {
                stroke-dasharray: 6 4;
                animation: fiber-pulse 1.2s linear infinite;
              }
              .ping-pulse {
                transform-origin: center;
                animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
              }
              @keyframes ping {
                75%, 100% {
                  transform: scale(2.2);
                  opacity: 0;
                }
              }
            `}</style>

            {/* Atmosphere ring halo */}
            <circle
              cx={planetCenterX}
              cy={planetCenterY}
              r={planetVisualRadius + 5}
              fill="transparent"
              stroke="rgba(255, 255, 255, 0.03)"
              strokeWidth="1"
            />

            {/* Planet Visual Circle */}
            <circle
              cx={planetCenterX}
              cy={planetCenterY}
              r={planetVisualRadius}
              fill="url(#transit-planet-grad)"
              stroke={planetColor}
              strokeWidth="1.5"
              opacity="0.9"
            />

            {/* Planet Inner Core Dot */}
            <circle cx={planetCenterX} cy={planetCenterY} r="2.5" fill="#1e293b" />

            {/* Subsurface Fiber Transit Arc (Active/Highlighted Path) */}
            {arcPath && (
              <g>
                {/* Outer Glow */}
                <path
                  d={arcPath}
                  fill="none"
                  stroke={planetColor}
                  strokeWidth="4.5"
                  opacity="0.35"
                  filter="url(#glow-fiber)"
                />
                {/* Core animated fiber path */}
                <path
                  d={arcPath}
                  fill="none"
                  stroke="#00f2fe"
                  strokeWidth="2"
                  className="fiber-pulse-arc"
                />
                {/* Animated data transfer packet dot */}
                <circle r="4.5" fill="#05ffb0" filter="url(#glow-tower-active)">
                  <animateMotion
                    dur="2s"
                    repeatCount="indefinite"
                    path={arcPath}
                  />
                </circle>
              </g>
            )}

            {/* Towers Placement */}
            {[...Array(numTowers)].map((_, i) => {
              const coords = getTowerCoords(i);
              const isReceiving = i === receivingTowerIndex;
              const isSending = i === sendingTowerIndex;
              const isActive = isReceiving || isSending;

              // Labels positions offset radially outwards
              const textOffset = planetVisualRadius + 14;
              const labelX = planetCenterX + textOffset * Math.sin(coords.theta);
              const labelY = planetCenterY - textOffset * Math.cos(coords.theta) + 3;

              // Colors based on tower status
              let towerStroke = 'rgba(255, 255, 255, 0.3)';
              let towerFill = '#0a101d';
              let labelColor = '#475569';

              if (isReceiving && isSending) {
                towerStroke = '#c084fc';
                towerFill = '#c084fc';
                labelColor = '#c084fc';
              } else if (isReceiving) {
                towerStroke = '#05ffb0';
                towerFill = '#05ffb0';
                labelColor = '#05ffb0';
              } else if (isSending) {
                towerStroke = '#ff9b44';
                towerFill = '#ff9b44';
                labelColor = '#ff9b44';
              } else {
                labelColor = '#64748b';
              }

              return (
                <g key={i}>
                  {/* Active tower ping waves */}
                  {isActive && (
                    <g transform={`translate(${coords.x}, ${coords.y})`}>
                      <rect
                        x="-6"
                        y="-6"
                        width="12"
                        height="12"
                        fill="none"
                        stroke={isReceiving ? '#05ffb0' : '#ff9b44'}
                        strokeWidth="1"
                        className="ping-pulse"
                      />
                    </g>
                  )}

                  {/* Rotated Square representing the Tower */}
                  <rect
                    x={coords.x - 3.5}
                    y={coords.y - 3.5}
                    width="7"
                    height="7"
                    transform={`rotate(45, ${coords.x}, ${coords.y})`}
                    fill={towerFill}
                    stroke={towerStroke}
                    strokeWidth="1.2"
                    filter={isActive ? 'url(#glow-tower-active)' : undefined}
                  />

                  {/* Tower Index label */}
                  <text
                    x={labelX}
                    y={labelY}
                    textAnchor="middle"
                    fill={labelColor}
                    className="text-[0.55rem] font-mono font-bold"
                  >
                    T{i}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Legend indicators */}
          <div className="absolute bottom-2 left-3 flex gap-3 text-[0.52rem] font-mono text-slate-500">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-[#05ffb0] rounded-sm"></span> RX (Entry)
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-[#ff9b44] rounded-sm"></span> TX (Exit)
            </div>
          </div>
        </div>

        {/* Right Side: Selectors & Details */}
        <div className="flex-grow flex flex-col justify-between py-1.5">
          <div>
            {/* Top row: Planet Selector & Locking details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="form-group">
                <label className="form-label text-[0.55rem]">INSPECTED PLANET</label>
                <select
                  value={inspectedPlanetId}
                  onChange={(e) => onSelectPlanet(e.target.value)}
                  disabled={isSimulating}
                  className="form-select text-[0.72rem] h-8 bg-slate-900 border-slate-800"
                >
                  {config.nodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.id} ({n.active_towers} Towers)
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label text-[0.55rem] flex justify-between">
                  <span>RECEIVING TOWER A</span>
                  {hasRouteDetails && <Lock className="w-2.5 h-2.5 text-[#c084fc]" />}
                </label>
                <select
                  value={receivingTowerIndex}
                  onChange={(e) => setManualReceivingIndex(parseInt(e.target.value))}
                  disabled={hasRouteDetails || isSimulating}
                  className={`form-select text-[0.72rem] h-8 ${
                    hasRouteDetails 
                      ? 'bg-slate-900/50 border-purple-500/10 text-purple-400 font-bold' 
                      : 'bg-slate-900 border-slate-800 text-emerald-400'
                  }`}
                >
                  {[...Array(numTowers)].map((_, i) => (
                    <option key={i} value={i}>
                      T_{i} {i === receivingTowerIndex && hasRouteDetails ? '(Ingress)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label text-[0.55rem] flex justify-between">
                  <span>SENDING TOWER B</span>
                  {hasRouteDetails && <Lock className="w-2.5 h-2.5 text-[#c084fc]" />}
                </label>
                <select
                  value={sendingTowerIndex}
                  onChange={(e) => setManualSendingIndex(parseInt(e.target.value))}
                  disabled={hasRouteDetails || isSimulating}
                  className={`form-select text-[0.72rem] h-8 ${
                    hasRouteDetails 
                      ? 'bg-slate-900/50 border-purple-500/10 text-purple-400 font-bold' 
                      : 'bg-slate-900 border-slate-800 text-orange-400'
                  }`}
                >
                  {[...Array(numTowers)].map((_, i) => (
                    <option key={i} value={i}>
                      T_{i} {i === sendingTowerIndex && hasRouteDetails ? '(Egress)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Path Lock Notification Badge */}
            {hasRouteDetails && (
              <div className="flex items-center gap-2 text-[0.62rem] font-mono text-purple-400 bg-purple-950/20 border border-purple-500/20 p-2 rounded mb-4">
                <Lock className="w-3 h-3 shrink-0" />
                <span>
                  {isSimulating 
                    ? `Live packet traversal on ${currentPlanet.id}. Controls locked to active route.`
                    : `Inspected planet is part of active route (Hop ${activeHopIndex + 1}). Towers configured automatically.`
                  }
                </span>
              </div>
            )}

            {/* Metadata Stats Layout */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-950/40 border border-solid border-slate-900 p-3 rounded-lg text-[0.65rem] font-mono">
              <div className="flex flex-col">
                <span className="text-[0.52rem] text-slate-500 uppercase tracking-widest mb-0.5">PLANET RADIUS</span>
                <span className="text-white font-semibold">{currentPlanet.radius_km.toLocaleString()} km</span>
              </div>

              <div className="flex flex-col">
                <span className="text-[0.52rem] text-slate-500 uppercase tracking-widest mb-0.5">TOTAL TOWERS</span>
                <span className="text-white font-semibold">{numTowers} Nodes</span>
              </div>

              <div className="flex flex-col">
                <span className="text-[0.52rem] text-slate-500 uppercase tracking-widest mb-0.5">CODEX LANGUAGE</span>
                <span className="text-[#c084fc] font-semibold">Base-{currentPlanet.codex}</span>
              </div>

              <div className="flex flex-col">
                <span className="text-[0.52rem] text-slate-500 uppercase tracking-widest mb-0.5">ATMOSPHERE</span>
                <span className="text-white font-semibold">{currentPlanet.atmosphere_thickness_km} km</span>
              </div>
            </div>
          </div>

          {/* Bottom stats row: mathematical calculation feedback */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 border-t border-solid border-slate-900 pt-3 text-[0.62rem] font-mono text-slate-400">
            <div>
              <span className="text-slate-500">Transit Mode:</span>
              <div className="text-white font-semibold mt-0.5">
                {receivingTowerIndex === sendingTowerIndex ? (
                  'Local Termination'
                ) : (
                  <span>{isClockwise ? 'Clockwise ↻' : 'Counter-Clockwise ↺'}</span>
                )}
              </div>
            </div>

            <div>
              <span className="text-slate-500">Angular Sweep:</span>
              <div className="text-white font-semibold mt-0.5">{angleDegrees.toFixed(1)}°</div>
            </div>

            <div>
              <span className="text-slate-500">Fiber Path Dist:</span>
              <div className="text-[#00f2fe] font-semibold mt-0.5">
                {receivingTowerIndex === sendingTowerIndex ? '0 km' : `${Math.round(fiberDistanceKm).toLocaleString()} km`}
              </div>
            </div>

            <div>
              <span className="text-slate-500">Fiber Latency:</span>
              <div className="text-[#05ffb0] font-semibold mt-0.5">
                {receivingTowerIndex === sendingTowerIndex ? '0.00 ms' : `${fiberLatencyMs.toFixed(3)} ms`}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
