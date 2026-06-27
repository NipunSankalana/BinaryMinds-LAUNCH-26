import React, { useEffect } from 'react';
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  useNodesState,
  useEdgesState,
} from 'reactflow';
import type { Edge, Node } from 'reactflow';
import 'reactflow/dist/style.css';
import { PlanetNode } from './PlanetNode';
import { LaserEdge } from './LaserEdge';
import type { UniverseConfig, RouteResult } from '../utils/math';
import { ShieldAlert, Zap } from 'lucide-react';

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

const nodeTypes = {
  planet: PlanetNode,
};

const edgeTypes = {
  laser: LaserEdge,
};

export const StarMap: React.FC<StarMapProps> = ({
  config,
  selectedOrigin,
  selectedDest,
  onSelectOrigin,
  onSelectDest,
  killedNodes,
  onToggleNodeKilled,
  activeRoute,
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const scale = config?.universe_metadata?.coordinate_scale_unit_km ?? 100000;
  const maxVoidHop = config?.universe_metadata?.max_void_hop_distance_km ?? 50000000;

  // React Flow node positioning scaling
  const mapCoords = (x: number, y: number) => {
    return {
      x: x * 1.6 + 250,
      y: -y * 1.3 + 300, // Invert Y and offset
    };
  };

  // Synchronize config nodes with React Flow nodes state
  useEffect(() => {
    if (!config) return;

    const flowNodes: Node[] = config.nodes.map((n) => {
      const pos = mapCoords(n.x, n.y);
      const isOrigin = selectedOrigin === n.id;
      const isDest = selectedDest === n.id;
      const isKilled = killedNodes.has(n.id);
      const isRoute = activeRoute ? activeRoute.path.includes(n.id) : false;

      return {
        id: n.id,
        type: 'planet',
        position: pos,
        data: {
          id: n.id,
          name: n.id,
          codex: n.codex,
          radius_km: n.radius_km,
          active_towers: n.active_towers,
          atmosphere_thickness_km: n.atmosphere_thickness_km,
          refraction_index: n.refraction_index,
          isOrigin,
          isDest,
          isKilled,
          isRoute,
        },
      };
    });

    setNodes(flowNodes);
  }, [config, selectedOrigin, selectedDest, killedNodes, activeRoute, setNodes]);

  // Synchronize links with React Flow edges state
  useEffect(() => {
    if (!config) return;

    const flowEdges: Edge[] = [];

    for (let i = 0; i < config.nodes.length; i++) {
      const nA = config.nodes[i];
      for (let j = i + 1; j < config.nodes.length; j++) {
        const nB = config.nodes[j];

        // Calculate void distance in km
        const dx = nA.x - nB.x;
        const dy = nA.y - nB.y;
        const distCenters = Math.sqrt(dx * dx + dy * dy) * scale;
        const voidDist = distCenters - (nA.radius_km + nA.atmosphere_thickness_km) - (nB.radius_km + nB.atmosphere_thickness_km);

        if (voidDist <= maxVoidHop) {
          // Link exists
          const isKilled = killedNodes.has(nA.id) || killedNodes.has(nB.id);
          
          // Check if this edge is active in the routing path
          let isActive = false;
          if (activeRoute && activeRoute.path.includes(nA.id) && activeRoute.path.includes(nB.id)) {
            const idxA = activeRoute.path.indexOf(nA.id);
            const idxB = activeRoute.path.indexOf(nB.id);
            isActive = Math.abs(idxA - idxB) === 1;
          }

          flowEdges.push({
            id: `${nA.id}-${nB.id}`,
            source: nA.id,
            target: nB.id,
            type: 'laser',
            data: {
              isActive,
              isKilled,
              voidDist,
            },
            animated: isActive && !isKilled,
          });
        }
      }
    }

    setEdges(flowEdges);
  }, [config, killedNodes, activeRoute, scale, maxVoidHop, setEdges]);

  // Click handler to toggle killed status, or select origin/dest with modifier keys
  const handleNodeClick = (event: React.MouseEvent, node: Node) => {
    if (event.shiftKey) {
      onSelectOrigin(node.id);
    } else if (event.ctrlKey || event.metaKey) {
      onSelectDest(node.id);
    } else {
      onToggleNodeKilled(node.id);
    }
  };

  if (!config) {
    return (
      <div className="glass-panel w-full h-[500px] flex flex-col items-center justify-center text-center p-8">
        <Zap className="w-12 h-12 text-cyber-cyan animate-pulse mb-4" />
        <h3 className="text-xl text-slate-300 font-semibold tracking-wider font-display">Tactical Star Map Offline</h3>
        <p className="text-sm text-slate-500 max-w-sm mt-2 font-sans">
          Initialize the universe config to establish local telemetry links and map the star system.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-panel w-full h-[580px] flex flex-col relative border-cyber-cyan/10">
      {/* HUD Header */}
      <div className="px-5 py-3.5 border-b border-solid border-white/5 bg-slate-950/40 flex justify-between items-center z-10">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-cyber-cyan animate-pulse" />
          <h3 className="text-xs font-bold uppercase text-[#00f2fe] tracking-widest font-display">
            Zeta-26 Space Grid Telemetry Map
          </h3>
        </div>
        <div className="flex gap-4 text-[0.65rem] font-mono text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyber-green inline-block"></span>
            <span>Origin</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyber-purple inline-block"></span>
            <span>Dest</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyber-orange inline-block"></span>
            <span>Active Hop</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyber-red inline-block"></span>
            <span>Killed</span>
          </div>
        </div>
      </div>

      {/* React Flow Container */}
      <div className="flex-grow w-full h-full bg-[#020408]/90 relative">
        {/* Terminal Scanline overlay */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-white/[0.008] to-transparent bg-[size:100%_4px] z-10"></div>
        
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodeClick={handleNodeClick}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          zoomOnScroll={false}
          panOnDrag={true}
          preventScrolling={true}
          nodesConnectable={false}
          nodesDraggable={true}
        >
          <Background color="#1e293b" gap={18} size={1} variant={BackgroundVariant.Lines} />
          <Controls className="react-flow-controls-custom bg-slate-900 border border-white/10 text-white fill-white" />
        </ReactFlow>
      </div>

      {/* Floating Instructions HUD */}
      <div className="absolute bottom-4 left-4 z-10 glass-panel bg-slate-950/80 px-3.5 py-2.5 border-white/5 pointer-events-auto">
        <h4 className="text-[0.65rem] font-bold text-cyber-cyan font-display mb-1 flex items-center gap-1">
          <ShieldAlert className="w-3.5 h-3.5" /> GRID CONTROL MANUAL
        </h4>
        <ul className="text-[0.55rem] font-mono text-slate-400 list-disc list-inside space-y-0.5">
          <li>Click node: Toggle online/offline (Chaos).</li>
          <li>Shift + Click: Set node as Origin.</li>
          <li>Ctrl + Click: Set node as Destination.</li>
        </ul>
      </div>
    </div>
  );
};
