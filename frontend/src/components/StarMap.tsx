import React, { useState, useMemo } from 'react';
import type { Planet, UniverseConfig, RouteResult } from '../utils/math';
import { Power, Activity } from 'lucide-react';

interface StarMapProps {
  config: UniverseConfig | null;
  selectedOrigin: string | null;
  selectedDest: string | null;
  onSelectOrigin: (id: string | null) => void;
  onSelectDest: (id: string | null) => void;
  killedNodes: Set<string>;
  onToggleNodeKilled: (id: string) => void;
  killedLinks: Set<string>;
  onToggleLinkKilled: (from: string, to: string) => void;
  activeRoute: RouteResult | null;
  packetProgress: { currentHopIndex: number; progress: number } | null;
  onSelectPlanet?: (id: string) => void;
}

export const StarMap: React.FC<StarMapProps> = ({
  config,
  selectedOrigin,
  selectedDest,
  onSelectOrigin,
  onSelectDest,
  killedNodes,
  onToggleNodeKilled,
  killedLinks,
  onToggleLinkKilled,
  activeRoute,
  packetProgress,
  onSelectPlanet,
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
      minX: minX - dx * 0.12,
      maxX: maxX + dx * 0.12,
      minY: minY - dy * 0.12,
      maxY: maxY + dy * 0.12,
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
        <h3 className="text-xl text-slate-400 font-medium font-display">Star Map Offline</h3>
        <p className="text-sm text-slate-500 max-w-sm mt-2">
          Initialize the universe config to scan and map the star system.
        </p>
      </div>
    );
  }

  // Draw grid lines
  const verticalGridVals: number[] = [];
  const horizontalGridVals: number[] = [];
  const gridDivs = 10;
  const { minX, maxX, minY, maxY } = bounds;
  for (let i = 1; i < gridDivs; i++) {
    verticalGridVals.push(minX + (i * (maxX - minX)) / gridDivs);
    horizontalGridVals.push(minY + (i * (maxY - minY)) / gridDivs);
  }

  // Helper: is a link between two planet IDs currently killed?
  const isLinkKilledFn = (a: string, b: string) =>
    killedLinks.has(`${a}-${b}`) || killedLinks.has(`${b}-${a}`);

  // Draw links between planets that are within void hop distance
  const links: { from: string; to: string; x1: number; y1: number; x2: number; y2: number; distKm: number; active: boolean; isKilled: boolean; isLinkKilled: boolean }[] = [];
  for (let i = 0; i < config.nodes.length; i++) {
    const nA = config.nodes[i];
    const posA = toScreen(nA.x, nA.y);
    for (let j = i + 1; j < config.nodes.length; j++) {
      const nB = config.nodes[j];
      const posB = toScreen(nB.x, nB.y);

      const dx = nA.x - nB.x;
      const dy = nA.y - nB.y;
      const distCenters = Math.sqrt(dx * dx + dy * dy) * scale;
      const voidDist = distCenters - (nA.radius_km + nA.atmosphere_thickness_km) - (nB.radius_km + nB.atmosphere_thickness_km);

      if (voidDist <= maxVoidHop) {
        const active = !!(activeRoute?.path.includes(nA.id) && activeRoute?.path.includes(nB.id) && Math.abs(activeRoute.path.indexOf(nA.id) - activeRoute.path.indexOf(nB.id)) === 1);
        const isKilled = killedNodes.has(nA.id) || killedNodes.has(nB.id);
        const isLinkKilledVal = isLinkKilledFn(nA.id, nB.id);

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
          isLinkKilled: isLinkKilledVal,
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

        packetX = fromPos.x + (toPos.x - fromPos.x) * progress;
        packetY = fromPos.y + (toPos.y - fromPos.y) * progress;
        showPacketDot = true;
      }
    }
  }

  const handlePlanetClick = (planet: Planet) => {
    if (onSelectPlanet) {
      onSelectPlanet(planet.id);
    }

    if (killedNodes.has(planet.id)) {
      onToggleNodeKilled(planet.id); // Toggle it back to active
      return;
    }

    // Toggle origin/destination selection
    if (selectedOrigin === planet.id) {
      onSelectOrigin(null);
    } else if (selectedDest === planet.id) {
      onSelectDest(null);
    } else if (!selectedOrigin) {
      onSelectOrigin(planet.id);
    } else if (!selectedDest) {
      onSelectDest(planet.id);
    } else {
      // Both selected, clear destination and change origin
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
        y: rect.top - mapContainer.top - 120,
      });
    }
    setHoveredNode(planet);
  };

  // Base colors mapping for typography below nodes
  const getBaseColor = (name: string) => {
    const n = name.toLowerCase();
    if (n === 'aegis') return '#5b9dff';
    if (n === 'boreas') return '#ff5b5b';
    if (n === 'dawn') return '#00e5ff';
    if (n === 'fenix') return '#d885ff';
    if (n === 'elysium') return '#ff9b44';
    if (n === 'caelum') return '#ffd85b';
    return '#8b9dff';
  };

  return (
    <div className="glass-panel flex flex-col relative w-full border border-solid p-6 overflow-hidden map-container flex-grow h-full">
      {/* Tactical Canvas */}
      <div className="bg-[#030509] rounded-lg border border-solid border-[#00f2fe]/10 overflow-hidden relative flex-grow h-[470px]">
        <svg width="100%" height="100%" viewBox={`0 0 ${svgWidth} ${svgHeight}`} preserveAspectRatio="xMidYMid meet">
          <defs>
            <filter id="glow-cyan" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glow-green" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glow-red" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* 3D Planet Gradients */}
            <radialGradient id="planet-aegis" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#8bc4ff" />
              <stop offset="60%" stopColor="#0055ff" />
              <stop offset="100%" stopColor="#001155" />
            </radialGradient>
            <radialGradient id="planet-boreas" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#ff9b9b" />
              <stop offset="60%" stopColor="#cc1111" />
              <stop offset="100%" stopColor="#440000" />
            </radialGradient>
            <radialGradient id="planet-dawn" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#8ef5ff" />
              <stop offset="60%" stopColor="#0ca1b8" />
              <stop offset="100%" stopColor="#023b45" />
            </radialGradient>
            <radialGradient id="planet-fenix" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#fbcffe" />
              <stop offset="60%" stopColor="#a83cd4" />
              <stop offset="100%" stopColor="#400459" />
            </radialGradient>
            <radialGradient id="planet-elysium" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#ffe1b3" />
              <stop offset="60%" stopColor="#ea580c" />
              <stop offset="100%" stopColor="#601802" />
            </radialGradient>
            <radialGradient id="planet-caelum" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#fff0ab" />
              <stop offset="60%" stopColor="#d98902" />
              <stop offset="100%" stopColor="#543500" />
            </radialGradient>

            {/* Dead Planet Gradient */}
            <radialGradient id="planet-dead" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#7a2b2b" />
              <stop offset="70%" stopColor="#300d0d" />
              <stop offset="100%" stopColor="#120404" />
            </radialGradient>
          </defs>

          {/* Grid Background */}
          {verticalGridVals.map((xVal, idx) => {
            const screenPos = toScreen(xVal, minY);
            return (
              <line
                key={`v-${idx}`}
                x1={screenPos.x}
                y1={0}
                x2={screenPos.x}
                y2={svgHeight}
                stroke="rgba(0, 242, 254, 0.015)"
                strokeWidth="1"
              />
            );
          })}
          {horizontalGridVals.map((yVal, idx) => {
            const screenPos = toScreen(minX, yVal);
            return (
              <line
                key={`h-${idx}`}
                x1={0}
                y1={screenPos.y}
                x2={svgWidth}
                y2={screenPos.y}
                stroke="rgba(0, 242, 254, 0.015)"
                strokeWidth="1"
              />
            );
          })}

          {/* Connectors (Links) — clickable to toggle kill state */}
          {links.map((link, idx) => {
            const isRouteEdge = activeRoute?.path.includes(link.from) && activeRoute?.path.includes(link.to) && Math.abs(activeRoute.path.indexOf(link.from) - activeRoute.path.indexOf(link.to)) === 1;
            const midX = (link.x1 + link.x2) / 2;
            const midY = (link.y1 + link.y2) / 2;

            return (
              <g
                key={idx}
                className="cursor-pointer"
                onClick={() => onToggleLinkKilled(link.from, link.to)}
              >
                {/* Wide transparent hit area for easy clicking */}
                <line
                  x1={link.x1} y1={link.y1}
                  x2={link.x2} y2={link.y2}
                  stroke="transparent"
                  strokeWidth="16"
                />

                {link.isLinkKilled ? (
                  // ── SEVERED LINK — red broken line
                  <>
                    <line
                      x1={link.x1} y1={link.y1}
                      x2={link.x2} y2={link.y2}
                      stroke="#ff3366"
                      strokeWidth="2"
                      strokeDasharray="6 5"
                      opacity="0.85"
                      filter="url(#glow-red)"
                    />
                    {/* ✕ badge at midpoint */}
                    <circle cx={midX} cy={midY} r="8" fill="#1a0008" stroke="#ff3366" strokeWidth="1.5" />
                    <text x={midX} y={midY + 4} textAnchor="middle" fill="#ff3366" fontSize="9" fontWeight="bold">✕</text>
                  </>
                ) : isRouteEdge ? (
                  // ── ACTIVE ROUTE — glowing cyan laser
                  <line
                    x1={link.x1} y1={link.y1}
                    x2={link.x2} y2={link.y2}
                    stroke={link.isKilled ? '#ff3366' : '#00f2fe'}
                    strokeWidth="3"
                    className="laser-beam"
                    filter={link.isKilled ? 'url(#glow-red)' : 'url(#glow-cyan)'}
                  />
                ) : (
                  // ── NORMAL LINK
                  <line
                    x1={link.x1} y1={link.y1}
                    x2={link.x2} y2={link.y2}
                    stroke={link.isKilled ? 'rgba(255,51,102,0.06)' : 'rgba(255,255,255,0.035)'}
                    strokeWidth="1.2"
                    strokeDasharray="4 6"
                  />
                )}
              </g>
            );
          })}

          {/* Planets rendering */}
          {config.nodes.map((planet) => {
            const pos = toScreen(planet.x, planet.y);
            const isOrigin = selectedOrigin === planet.id;
            const isDest = selectedDest === planet.id;
            const isKilled = killedNodes.has(planet.id);
            const rPx = 25 + planet.radius_km / 1200; 
            const atmosPx = rPx + 8 + planet.atmosphere_thickness_km / 35;

            let strokeColor = 'transparent';
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
                {/* Outer active path highlight ring */}
                {(isOrigin || isDest) && (
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={atmosPx + 3}
                    fill="transparent"
                    stroke={isOrigin ? '#00f2fe' : '#05ffb0'}
                    strokeWidth="1.5"
                    opacity="0.8"
                    filter={isOrigin ? 'url(#glow-cyan)' : 'url(#glow-green)'}
                  />
                )}

                {/* Atmosphere ring halo */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={atmosPx}
                  fill="transparent"
                  stroke={isKilled ? 'rgba(255, 51, 102, 0.2)' : isOrigin ? 'rgba(0, 242, 254, 0.25)' : isDest ? 'rgba(5, 255, 176, 0.25)' : 'rgba(255, 255, 255, 0.05)'}
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />

                {/* Planet 3D Sphere */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={rPx}
                  fill={isKilled ? 'url(#planet-dead)' : `url(#planet-${planet.id.toLowerCase()})`}
                  stroke={strokeColor}
                  strokeWidth={isOrigin || isDest || isKilled ? 2 : 0}
                  filter={glowFilter}
                />

                {/* Star Map node labels below planet */}
                <text
                  x={pos.x}
                  y={pos.y + rPx + 20}
                  textAnchor="middle"
                  fill={isKilled ? '#ff3366' : '#ffffff'}
                  className="text-xs tracking-wider uppercase font-bold font-display"
                >
                  {planet.id}
                </text>

                <text
                  x={pos.x}
                  y={pos.y + rPx + 32}
                  textAnchor="middle"
                  fill={isKilled ? 'rgba(255, 51, 102, 0.6)' : getBaseColor(planet.id)}
                  className="text-[0.62rem] font-display font-semibold uppercase tracking-widest"
                >
                  Base-{planet.codex}
                </text>
              </g>
            );
          })}

          {/* Beaming glowing packet pulse */}
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

        {/* Tactical overlay indicators */}
        <div className="absolute top-3 right-4 text-[0.6rem] font-mono text-slate-500 bg-black/60 px-2 py-1 rounded border border-solid border-slate-800 text-right">
          <div>SYS: Zeta-26</div>
          <div>SCALE: 1U = 100,000KM</div>
          <div>LMAX: 50,000,000KM</div>
        </div>

        {/* Hover info Card */}
        {hoveredNode && (
          <div
            className="absolute z-50 glass-panel p-4 w-60 rounded pointer-events-auto border border-solid border-[#00f2fe]/30 shadow-2xl transition-all text-left"
            style={{
              left: Math.min(Math.max(10, tooltipPos.x - 120), svgWidth - 250),
              top: Math.max(10, tooltipPos.y - 120),
            }}
          >
            <div className="flex justify-between items-center border-b border-solid pb-1 mb-2 border-slate-800">
              <span className="font-display text-xs font-bold tracking-wider text-white uppercase">
                {hoveredNode.id}
              </span>
              <span
                className="font-mono text-[0.55rem] px-1.5 py-0.5 rounded font-semibold"
                style={{
                  backgroundColor: `${getBaseColor(hoveredNode.id)}20`,
                  color: getBaseColor(hoveredNode.id),
                }}
              >
                CODEX BASE {hoveredNode.codex}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-y-1 gap-x-2 text-[0.65rem] text-slate-400 font-sans">
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

            <div className="flex gap-2 mt-3 pt-2 border-t border-solid border-slate-800">
              <button
                className={`text-[0.6rem] font-display font-semibold w-full py-1 rounded transition-colors ${
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
                    <Power className="w-2.5 h-2.5" /> RESTORE NODE
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-1">
                    <Power className="w-2.5 h-2.5" /> DISABLE NODE
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
