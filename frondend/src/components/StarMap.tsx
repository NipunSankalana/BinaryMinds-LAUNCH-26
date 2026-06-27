import React, { useState, useMemo } from 'react';
import { Planet, UniverseConfig, RouteResult, getTowerCoordinates } from '../utils/math';
import { Power, Circle, Radio, Activity, Eye, ShieldAlert } from 'lucide-react';

interface StarMapProps {
  config: UniverseConfig | null;
  selectedOrigin: string | null;
  selectedDest: string | null;
  onSelectOrigin: (id: string | null) => void;
  onSelectDest: (id: string | null) => void;
  killedNodes: Set<string>;
  onToggleNodeKilled: (id: string) => void;
  activeRoute: RouteResult | null;
  packetProgress: { currentHopIndex: number; progress: number } | null;
}

export const StarMap: React.FC<StarMapProps> = ({
  config,
  selectedOrigin,
  selectedDest,
  onSelectOrigin,
  onSelectDest,
  killedNodes,
  onToggleNodeKilled,
  activeRoute,
  packetProgress,
}) => {
  const [hoveredNode, setHoveredNode] = useState<Planet | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const scale = config?.universe_metadata?.coordinate_scale_unit_km ?? 100000;
  const maxVoidHop = config?.universe_metadata?.max_void_hop_distance_km ?? 50000000;

  // Width and Height of visual StarMap area
  const svgWidth = 800;
  const svgHeight = 550;
  const padding = 70;

  // Auto-scale coordinates to fit viewbox
  const bounds = useMemo(() => {
    if (!config || config.nodes.length === 0) {
      return { minX: -10, maxX: 10, minY: -10, maxY: 10 };
    }
    const xs = config.nodes.map((n) => n.x);
    const ys = config.nodes.map((n) => n.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    // Add some buffer to bounds
    const dx = maxX - minX || 2;
    const dy = maxY - minY || 2;
    return {
      minX: minX - dx * 0.15,
      maxX: maxX + dx * 0.15,
      minY: minY - dy * 0.15,
      maxY: maxY + dy * 0.15,
    };
  }, [config]);

  // Convert Cartesian to Screen coords
  const toScreen = (x: number, y: number) => {
    const { minX, maxX, minY, maxY } = bounds;
    const rx = (x - minX) / (maxX - minX);
    const ry = (y - minY) / (maxY - minY);

    return {
      x: padding + rx * (svgWidth - 2 * padding),
      y: svgHeight - (padding + ry * (svgHeight - 2 * padding)), // Invert Y
    };
  };

  if (!config) {
    return (
      <div className="glass-panel w-full h-[400px] flex flex-col items-center justify-center text-center p-8">
        <Activity className="w-12 h-12 text-slate-500 animate-pulse mb-4" />
        <h3 className="text-xl text-slate-400 font-medium">Star Map Offline</h3>
        <p className="text-sm text-slate-500 max-w-sm mt-2">
          Initialize the universe config to scan and map the star system.
        </p>
      </div>
    );
  }

  // Draw grid lines
  const gridLines = [];
  const gridDivs = 10;
  const { minX, maxX, minY, maxY } = bounds;
  for (let i = 1; i < gridDivs; i++) {
    const xVal = minX + (i * (maxX - minX)) / gridDivs;
    const yVal = minY + (i * (maxY - minY)) / gridDivs;
    gridLines.push({ x: toScreen(xVal, minY), type: 'v', value: xVal });
    gridLines.push({ y: toScreen(minX, yVal), type: 'h', value: yVal });
  }

  // Draw links between planets that are within void hop distance
  const links: { from: string; to: string; x1: number; y1: number; x2: number; y2: number; distKm: number; active: boolean; isKilled: boolean }[] = [];
  for (let i = 0; i < config.nodes.length; i++) {
    const nA = config.nodes[i];
    const posA = toScreen(nA.x, nA.y);
    for (let j = i + 1; j < config.nodes.length; j++) {
      const nB = config.nodes[j];
      const posB = toScreen(nB.x, nB.y);

      // Check distance in km
      const dx = nA.x - nB.x;
      const dy = nA.y - nB.y;
      const distCenters = Math.sqrt(dx * dx + dy * dy) * scale;
      const voidDist = distCenters - (nA.radius_km + nA.atmosphere_thickness_km) - (nB.radius_km + nB.atmosphere_thickness_km);

      if (voidDist <= maxVoidHop) {
        // Link exists
        const linkKey1 = `${nA.id}-${nB.id}`;
        const linkKey2 = `${nB.id}-${nA.id}`;
        const active = !!(activeRoute?.path.includes(nA.id) && activeRoute?.path.includes(nB.id) && Math.abs(activeRoute.path.indexOf(nA.id) - activeRoute.path.indexOf(nB.id)) === 1);
        const isKilled = killedNodes.has(nA.id) || killedNodes.has(nB.id);

        links.push({
          from: nA.id,
          to: nB.id,
          x1: posA.x,
          y1: posA.y,
          x2: posB.x,
          y2: posB.y,
          distKm: voidDist,
          active,
          isKilled,
        });
      }
    }
  }

  // Animating packet dot coordinates
  let packetX = 0;
  let packetY = 0;
  let showPacketDot = false;

  if (packetProgress && activeRoute && activeRoute.path.length > 1) {
    const { currentHopIndex, progress } = packetProgress;
    if (currentHopIndex < activeRoute.path.length - 1) {
      const fromNodeId = activeRoute.path[currentHopIndex];
      const toNodeId = activeRoute.path[currentHopIndex + 1];
      const fromNode = config.nodes.find((n) => n.id === fromNodeId);
      const toNode = config.nodes.find((n) => n.id === toNodeId);

      if (fromNode && toNode) {
        const fromPos = toScreen(fromNode.x, fromNode.y);
        const toPos = toScreen(toNode.x, toNode.y);

        // Linear interpolation of coordinate positions
        packetX = fromPos.x + (toPos.x - fromPos.x) * progress;
        packetY = fromPos.y + (toPos.y - fromPos.y) * progress;
        showPacketDot = true;
      }
    }
  }

  const handlePlanetClick = (planet: Planet) => {
    // If it's killed, we should alert
    if (killedNodes.has(planet.id)) {
      onToggleNodeKilled(planet.id); // Toggle it back to active
      return;
    }

    if (!selectedOrigin) {
      onSelectOrigin(planet.id);
    } else if (!selectedDest && selectedOrigin !== planet.id) {
      onSelectDest(planet.id);
    } else {
      onSelectOrigin(planet.id);
      onSelectDest(null);
    }
  };

  const showTooltip = (e: React.MouseEvent, planet: Planet) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mapContainer = e.currentTarget.closest('.map-container')?.getBoundingClientRect();
    if (mapContainer) {
      setTooltipPos({
        x: rect.left - mapContainer.left + rect.width / 2,
        y: rect.top - mapContainer.top - 100,
      });
    }
    setHoveredNode(planet);
  };

  return (
    <div className="glass-panel flex flex-col relative w-full border border-solid p-6 overflow-hidden map-container">
      {/* StarMap Header */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-[#00f2fe]" />
          <h2 className="text-md uppercase font-semibold text-[#00f2fe]">Zeta-26 Tactical Overlay</h2>
        </div>
        <div className="flex gap-4 text-xs font-medium text-slate-400">
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 bg-[#00f2fe] rounded-full inline-block"></span> Origin
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 bg-[#05ffb0] rounded-full inline-block"></span> Destination
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 bg-[#ff3366] rounded-full inline-block"></span> Offline (Killed)
          </div>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="bg-[#04060b] rounded-lg border border-solid overflow-hidden relative" style={{ height: svgHeight }}>
        <svg width="100%" height="100%" viewBox={`0 0 ${svgWidth} ${svgHeight}`} preserveAspectRatio="xMidYMid meet">
          {/* Defs for gradients, filters, shadows */}
          <defs>
            <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glow-green" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glow-red" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Grid Background */}
          {gridLines.map((line, idx) => (
            <React.Fragment key={idx}>
              {line.type === 'v' ? (
                <line
                  x1={line.x.x}
                  y1={0}
                  x2={line.x.x}
                  y2={svgHeight}
                  stroke="rgba(255,255,255,0.02)"
                  strokeWidth="1"
                />
              ) : (
                <line
                  x1={0}
                  y1={line.y.y}
                  x2={svgWidth}
                  y2={line.y.y}
                  stroke="rgba(255,255,255,0.02)"
                  strokeWidth="1"
                />
              )}
            </React.Fragment>
          ))}

          {/* Links */}
          {links.map((link, idx) => {
            const isRouteEdge = activeRoute?.path.includes(link.from) && activeRoute?.path.includes(link.to) && Math.abs(activeRoute.path.indexOf(link.from) - activeRoute.path.indexOf(link.to)) === 1;

            return (
              <g key={idx}>
                {isRouteEdge ? (
                  // Laser Link (Active Path)
                  <line
                    x1={link.x1}
                    y1={link.y1}
                    x2={link.x2}
                    y2={link.y2}
                    stroke={link.isKilled ? '#ff3366' : '#05ffb0'}
                    strokeWidth="3.5"
                    className="laser-beam"
                    filter="url(#glow-green)"
                  />
                ) : (
                  // Inactive / Void limit link
                  <line
                    x1={link.x1}
                    y1={link.y1}
                    x2={link.x2}
                    y2={link.y2}
                    stroke={link.isKilled ? 'rgba(255,51,102,0.1)' : 'rgba(255,255,255,0.05)'}
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                  />
                )}
              </g>
            );
          })}

          {/* Planets and Atmos */}
          {config.nodes.map((planet) => {
            const pos = toScreen(planet.x, planet.y);
            const isOrigin = selectedOrigin === planet.id;
            const isDest = selectedDest === planet.id;
            const isKilled = killedNodes.has(planet.id);
            const rPx = 18 + planet.radius_km / 1200; // Visual radius mapping
            const atmosPx = rPx + 6 + planet.atmosphere_thickness_km / 40;

            let strokeColor = 'rgba(255,255,255,0.15)';
            let fillGrad = 'url(#grad-planet-norm)';
            let glowFilter = '';

            if (isOrigin) {
              strokeColor = '#00f2fe';
              glowFilter = 'url(#glow-cyan)';
            } else if (isDest) {
              strokeColor = '#05ffb0';
              glowFilter = 'url(#glow-green)';
            } else if (isKilled) {
              strokeColor = '#ff3366';
              glowFilter = 'url(#glow-red)';
            }

            return (
              <g
                key={planet.id}
                className="cursor-pointer select-none group"
                onClick={() => handlePlanetClick(planet)}
                onMouseEnter={(e) => showTooltip(e, planet)}
                onMouseLeave={() => setHoveredNode(null)}
              >
                {/* Orbit/Atmosphere Halo Ring */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={atmosPx}
                  fill="transparent"
                  stroke={isKilled ? 'rgba(255, 51, 102, 0.15)' : isOrigin ? 'rgba(0, 242, 254, 0.15)' : isDest ? 'rgba(5, 255, 176, 0.15)' : 'rgba(255,255,255,0.03)'}
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                />

                {/* Subsurface Fiber Ring */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={rPx + 1}
                  fill="transparent"
                  stroke={isKilled ? 'rgba(255,51,102,0.3)' : 'rgba(255,255,255,0.1)'}
                  strokeWidth="1"
                />

                {/* Planet Sphere */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={rPx}
                  fill={isKilled ? 'rgba(30,10,20,0.8)' : 'rgba(17,24,39,0.9)'}
                  stroke={strokeColor}
                  strokeWidth={isOrigin || isDest || isKilled ? 2 : 1}
                  filter={glowFilter}
                />

                {/* Draw Towers as small dots on the surface ring */}
                {Array.from({ length: planet.active_towers }).map((_, tIdx) => {
                  // Angle
                  const N = planet.active_towers;
                  const theta = Math.PI / 2 - (tIdx * 2 * Math.PI) / N;
                  const tx = pos.x + rPx * Math.cos(theta);
                  const ty = pos.y + rPx * Math.sin(theta);

                  return (
                    <circle
                      key={tIdx}
                      cx={tx}
                      cy={ty}
                      r="2"
                      fill={isKilled ? '#ff3366' : '#94a3b8'}
                      opacity={isKilled ? 0.4 : 0.8}
                    />
                  );
                })}

                {/* Planet Label */}
                <text
                  x={pos.x}
                  y={pos.y + rPx + 20}
                  textAnchor="middle"
                  fill={isKilled ? '#ff3366' : isOrigin ? '#00f2fe' : isDest ? '#05ffb0' : '#e2e8f0'}
                  className="text-[0.65rem] tracking-wider uppercase font-semibold font-display"
                >
                  {planet.id}
                </text>

                {/* Codex Label Indicator */}
                <text
                  x={pos.x}
                  y={pos.y - rPx - 8}
                  textAnchor="middle"
                  fill="#64748b"
                  className="text-[0.55rem] font-mono"
                >
                  B{planet.codex}
                </text>
              </g>
            );
          })}

          {/* Packet Dot */}
          {showPacketDot && (
            <circle
              cx={packetX}
              cy={packetY}
              r="6.5"
              fill="#05ffb0"
              filter="url(#glow-green)"
              className="animate-ping"
            />
          )}
        </svg>

        {/* Floating Tooltip / Info Card */}
        {hoveredNode && (
          <div
            className="absolute z-50 glass-panel glass-panel-accent-cyan p-4 w-64 rounded-md pointer-events-auto shadow-2xl transition-all select-none text-left"
            style={{
              left: Math.min(Math.max(10, tooltipPos.x - 128), svgWidth - 270),
              top: Math.max(10, tooltipPos.y - 120),
            }}
          >
            <div className="flex justify-between items-center border-b border-solid pb-1 mb-2">
              <span className="font-display text-sm font-semibold tracking-wider text-[#00f2fe] uppercase">
                {hoveredNode.id}
              </span>
              <span className="font-mono text-[0.65rem] bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">
                CODEX BASE {hoveredNode.codex}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-y-1 gap-x-2 text-[0.7rem] text-slate-400 font-sans">
              <div>Coordinates:</div>
              <div className="text-right text-slate-200 font-mono">
                ({hoveredNode.x}, {hoveredNode.y})
              </div>
              
              <div>Radius:</div>
              <div className="text-right text-slate-200 font-mono">
                {hoveredNode.radius_km.toLocaleString()} km
              </div>

              <div>Active Towers:</div>
              <div className="text-right text-slate-200 font-mono">
                {hoveredNode.active_towers}
              </div>

              <div>Atmosphere Thickness:</div>
              <div className="text-right text-slate-200 font-mono">
                {hoveredNode.atmosphere_thickness_km} km
              </div>

              <div>Refraction Index (n):</div>
              <div className="text-right text-slate-200 font-mono">
                {hoveredNode.refraction_index}
              </div>
            </div>

            <div className="flex gap-2 mt-3 pt-2 border-t border-solid">
              <button
                className={`text-[0.65rem] font-display w-full py-1 rounded transition-colors ${
                  killedNodes.has(hoveredNode.id)
                    ? 'bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-500/30 text-emerald-400'
                    : 'bg-rose-950/60 hover:bg-rose-900 border border-rose-500/30 text-[#ff3366]'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleNodeKilled(hoveredNode.id);
                }}
              >
                {killedNodes.has(hoveredNode.id) ? (
                  <span className="flex items-center justify-center gap-1">
                    <Power className="w-2.5 h-2.5" /> Restore Node
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-1">
                    <Power className="w-2.5 h-2.5" /> Kill Planet
                  </span>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
