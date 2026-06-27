import React, { useState, useEffect } from 'react';
import type { UniverseConfig } from '../utils/math';
import { Network } from 'lucide-react';

interface PlanetTowersMapProps {
  config: UniverseConfig | null;
  activeHop: {
    planetId: string;
    receivingTower: number;
    sendingTower: number;
  } | null;
  isSimulating: boolean;
}

export const PlanetTowersMap: React.FC<PlanetTowersMapProps> = ({
  config,
  activeHop,
  isSimulating,
}) => {
  // Manual interactive state when simulation is not running
  const [selectedPlanetId, setSelectedPlanetId] = useState<string>('Aegis');
  const [receivingTowerIndex, setReceivingTowerIndex] = useState<number>(0);
  const [sendingTowerIndex, setSendingTowerIndex] = useState<number>(4);

  // Auto-sync manual selection to active simulating planet/towers
  useEffect(() => {
    if (activeHop) {
      setSelectedPlanetId(activeHop.planetId);
      setReceivingTowerIndex(activeHop.receivingTower);
      setSendingTowerIndex(activeHop.sendingTower);
    }
  }, [activeHop]);

  // If config is not loaded, show offline card
  if (!config) return null;

  const currentPlanet = config.nodes.find((n) => n.id === selectedPlanetId) || config.nodes[0];
  if (!currentPlanet) return null;

  // Visual parameters
  const planetCenterX = 140;
  const planetCenterY = 100;
  const planetVisualRadius = 65;
  const numTowers = 8;
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
    <div className="panel-card border-slate-800">
      <h3 className="panel-title flex items-center gap-2 border-b border-solid border-slate-800 pb-2 mb-3">
        <Network className="w-3.5 h-3.5 text-[#00f2fe]" />
        INTERNAL FIBER TRANSIT
        {isSimulating && (
          <span className="ml-auto text-[0.55rem] font-mono text-[#05ffb0] font-bold bg-[#05ffb0]/10 px-1.5 py-0.5 rounded border border-[#05ffb0]/20 animate-pulse">
            LIVE SIMULATION
          </span>
        )}
      </h3>

      {/* Selector controls for planet & towers when not simulating */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="form-group col-span-1">
          <label className="form-label text-[0.55rem]">PLANET</label>
          <select
            value={selectedPlanetId}
            onChange={(e) => {
              setSelectedPlanetId(e.target.value);
            }}
            disabled={isSimulating}
            className="form-select text-[0.7rem] py-1 px-1.5 h-7"
          >
            {config.nodes.map((n) => (
              <option key={n.id} value={n.id}>
                {n.id}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group col-span-1">
          <label className="form-label text-[0.55rem]">RECEIVING (A)</label>
          <select
            value={receivingTowerIndex}
            onChange={(e) => setReceivingTowerIndex(parseInt(e.target.value))}
            disabled={isSimulating}
            className="form-select text-[0.7rem] py-1 px-1.5 h-7 border-emerald-500/20 focus:border-emerald-500"
          >
            {[...Array(8)].map((_, i) => (
              <option key={i} value={i}>
                T_{i}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group col-span-1">
          <label className="form-label text-[0.55rem]">SENDING (B)</label>
          <select
            value={sendingTowerIndex}
            onChange={(e) => setSendingTowerIndex(parseInt(e.target.value))}
            disabled={isSimulating}
            className="form-select text-[0.7rem] py-1 px-1.5 h-7 border-orange-500/20 focus:border-orange-500"
          >
            {[...Array(8)].map((_, i) => (
              <option key={i} value={i}>
                T_{i}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* SVG Canvas for Planet Towers representation */}
      <div className="bg-[#030509] rounded-lg border border-solid border-[#00f2fe]/5 overflow-hidden relative aspect-video flex justify-center items-center py-2">
        <svg width="100%" height="100%" viewBox="0 0 280 200" preserveAspectRatio="xMidYMid meet">
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
              <feGaussianBlur stdDeviation="2" result="blur" />
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
              animation: fiber-pulse 1s linear infinite;
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
                strokeWidth="4"
                opacity="0.35"
                filter="url(#glow-fiber)"
              />
              {/* Core animated fiber path */}
              <path
                d={arcPath}
                fill="none"
                stroke="#00f2fe"
                strokeWidth="1.8"
                className="fiber-pulse-arc"
              />
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
            const labelY = planetCenterY - textOffset * Math.cos(coords.theta) + 3; // +3 to center text heightwise

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

        {/* Small legend indicators */}
        <div className="absolute bottom-2 left-3 flex gap-3 text-[0.52rem] font-mono text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-[#05ffb0] rounded-sm"></span> RX (Entry)
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-[#ff9b44] rounded-sm"></span> TX (Exit)
          </div>
        </div>
      </div>

      {/* Transit details summary below the SVG canvas */}
      <div className="mt-3 grid grid-cols-2 gap-2 text-[0.62rem] font-mono text-slate-400 border-t border-solid border-slate-900 pt-2.5">
        <div>Transit Mode:</div>
        <div className="text-right text-slate-200">
          {receivingTowerIndex === sendingTowerIndex ? (
            'None (Local Node)'
          ) : (
            <span className="flex items-center justify-end gap-1">
              {isClockwise ? 'Clockwise ↻' : 'Counter-Clockwise ↺'}
            </span>
          )}
        </div>

        <div>Angular distance:</div>
        <div className="text-right text-slate-200">{angleDegrees.toFixed(1)}°</div>

        <div>Sectors traversed:</div>
        <div className="text-right text-slate-200">
          {receivingTowerIndex === sendingTowerIndex
            ? '0'
            : `${Math.round(angleDegrees / 45)} / 8 segments`}
        </div>
      </div>
    </div>
  );
};
