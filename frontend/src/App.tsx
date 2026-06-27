import { useState, useEffect, useMemo } from 'react';
import { StarMap } from './components/StarMap';
import { ControlPanel } from './components/ControlPanel';
import { LogConsole } from './components/LogConsole';
import { LatencyMetrics } from './components/LatencyMetrics';
import { PlanetTowersMap } from './components/PlanetTowersMap';
import {
  findClosestTowerPair,
  encodeToBaseX
} from './utils/math';
import type { UniverseConfig, RouteResult } from './utils/math';
import { api } from './utils/api';
import { Activity, Cpu } from 'lucide-react';

interface LogMessage {
  text: string;
  type: 'info' | 'success' | 'error' | 'warning' | 'purple' | 'plain';
}

function App() {
  const [config, setConfig] = useState<UniverseConfig | null>(null);
  const [selectedOrigin, setSelectedOrigin] = useState<string | null>('Aegis');
  const [selectedDest, setSelectedDest] = useState<string | null>('Caelum');
  const [startTower, setStartTower] = useState<number>(0);
  const [endTower, setEndTower] = useState<number>(0);
  const [payloadText, setPayloadText] = useState<string>('Hello world');

  const [killedNodes, setKilledNodes] = useState<Set<string>>(new Set());
  const [killedLinks, setKilledLinks] = useState<Set<string>>(new Set());

  const [activeRoute, setActiveRoute] = useState<RouteResult | null>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [packetProgress, setPacketProgress] = useState<{ currentHopIndex: number; progress: number } | null>(null);
  const [logs, setLogs] = useState<LogMessage[]>([]);

  // Derive active hop details for the PlanetTowersMap visualizer
  const activeHop = useMemo(() => {
    if (!packetProgress || !activeRoute || !config) return null;
    const { currentHopIndex, progress } = packetProgress;
    const path = activeRoute.path;
    const hopLogs = activeRoute.hop_logs;

    if (currentHopIndex >= path.length - 1 || currentHopIndex >= hopLogs.length) return null;

    const currentHop = hopLogs[currentHopIndex];
    const fromPlanetId = currentHop.from_planet;
    const toPlanetId = currentHop.to_planet;

    if (progress < 0.5) {
      // Source planet egress
      const receivingTower = currentHopIndex > 0 ? hopLogs[currentHopIndex - 1].entry_tower : currentHop.exit_tower;
      return {
        planetId: fromPlanetId,
        receivingTower: receivingTower,
        sendingTower: currentHop.exit_tower,
      };
    } else {
      // Destination planet ingress
      const sendingTower = currentHopIndex < path.length - 2 && currentHopIndex + 1 < hopLogs.length
        ? hopLogs[currentHopIndex + 1].exit_tower
        : currentHop.entry_tower;
      return {
        planetId: toPlanetId,
        receivingTower: currentHop.entry_tower,
        sendingTower: sendingTower,
      };
    }
  }, [packetProgress, activeRoute, config]);

  const [inspectedPlanetId, setInspectedPlanetId] = useState<string>('Aegis');

  // Sync inspected planet with selected origin
  useEffect(() => {
    if (selectedOrigin) {
      setInspectedPlanetId(selectedOrigin);
    }
  }, [selectedOrigin]);

  // Sync inspected planet with active hop during simulation
  useEffect(() => {
    if (isSimulating && activeHop) {
      setInspectedPlanetId(activeHop.planetId);
    }
  }, [isSimulating, activeHop]);

  // Auto-calculate route on configuration, endpoints or chaos changes
  useEffect(() => {
    if (config && selectedOrigin && selectedDest) {
      api.calculateLatency({
        origin_id: selectedOrigin,
        destination_id: selectedDest,
        killed_nodes: Array.from(killedNodes),
        killed_edges: Array.from(killedLinks).map(k => k.split('-') as [string, string])
      }).then(res => {
        const frontendHopLogs = res.hops.map((hop, idx) => {
          const fromNode = config.nodes.find(n => n.id === hop.from_node)!;
          const toNode = config.nodes.find(n => n.id === hop.to_node)!;
          const { towerA, towerB } = findClosestTowerPair(fromNode, toNode, config.universe_metadata.coordinate_scale_unit_km || 100000);
          return {
            hop: idx + 1,
            from_planet: hop.from_node,
            to_planet: hop.to_node,
            exit_tower: towerA,
            entry_tower: towerB,
            void_distance_km: hop.void_distance_km,
            void_latency_ms: hop.breakdown.void_ms + hop.breakdown.atmosphere_exit_ms + hop.breakdown.atmosphere_entry_ms,
            internal_transit_distance_km: fromNode.radius_km,
            internal_transit_latency_ms: hop.breakdown.fiber_exit_ms + hop.breakdown.fiber_entry_ms,
            tower_delay_ms: hop.breakdown.tower_ms,
            hop_total_latency_ms: hop.total_hop_latency_ms,
            payload_sent_codex: "",
            payload_received_ascii: "",
          };
        });

        setActiveRoute({
          path: res.route,
          total_latency_ms: res.total_latency_ms,
          hop_logs: frontendHopLogs
        });
      }).catch(err => {
        setActiveRoute({
          path: [],
          total_latency_ms: 0,
          hop_logs: [],
          error: err.message
        });
      });
    } else {
      setActiveRoute(null);
    }
  }, [config, selectedOrigin, selectedDest, killedNodes, killedLinks]);

  // Load universe config on startup — always reset backend state first
  useEffect(() => {
    setLogs([
      { text: "=== RELIC RING CORE PROTOCOL CONSOLE ===", type: "info" },
      { text: "Connecting to tactical star grid backend...", type: "plain" }
    ]);
    // Reset any stale killed-node state from a previous session
    api.resetSimulation().catch(() => {/* ignore if already clean */}).finally(() => {
      api.initializeUniverse()
        .then(res => {
          setConfig({
            universe_metadata: res.metadata,
            nodes: res.nodes
          });
          setKilledNodes(new Set());
          setKilledLinks(new Set());
          setLogs(prev => [
            ...prev,
            { text: "System initialized. Core Zeta-26 configuration loaded from backend.", type: "success" },
            { text: "Ready to route laser packets across star system legacy grid.", type: "plain" }
          ]);
        })
        .catch(err => {
          setLogs(prev => [...prev, { text: `❌ FAILED TO INITIALIZE UNIVERSE: ${err.message}`, type: "error" }]);
        });
    });
  }, []);

  const addLog = (text: string, type: LogMessage['type'] = 'plain') => {
    setLogs((prev) => [...prev, { text, type }]);
  };

  const handleToggleNodeKilled = (id: string) => {
    if (id === selectedOrigin || id === selectedDest) {
      alert("Cannot disable the selected origin or destination node during simulation setup.");
      return;
    }
    const isCurrentlyKilled = killedNodes.has(id);
    
    if (isCurrentlyKilled) {
      // Unkill requires resetting simulation and re-killing all other nodes
      api.resetSimulation().then(() => {
        const otherNodesToKill = Array.from(killedNodes).filter(nid => nid !== id);
        const promises = otherNodesToKill.map(nid => api.killNode(nid));
        return Promise.all(promises);
      }).then(() => {
        const newKilled = new Set(killedNodes);
        newKilled.delete(id);
        setKilledNodes(newKilled);
        addLog(`[CHAOS ENG] Planet ${id} online. Hardware links restored.`, 'info');
      }).catch(err => {
        addLog(`[CHAOS ENG] Error restoring node: ${err.message}`, 'error');
      });
    } else {
      // Kill node
      api.killNode(id).then(() => {
        const newKilled = new Set(killedNodes);
        newKilled.add(id);
        setKilledNodes(newKilled);
        addLog(`[CHAOS ENG] ALERT: Planet ${id} is offline (KILLED). Links severed.`, 'error');
      }).catch(err => {
        addLog(`[CHAOS ENG] Error killing node: ${err.message}`, 'error');
      });
    }
  };

  const handleLoadDefaultUniverse = () => {
    api.resetSimulation().then(() => {
      setKilledNodes(new Set());
      setKilledLinks(new Set());
      setSelectedOrigin('Aegis');
      setSelectedDest('Caelum');
      setStartTower(0);
      setEndTower(0);
      setPayloadText('Hello world');
      setLogs([
        { text: "=== RELIC RING CORE PROTOCOL CONSOLE ===", type: "info" },
        { text: "Zeta-26 Core configuration reloaded and reset.", type: "success" }
      ]);
    }).catch(err => {
      addLog(`Error resetting simulation: ${err.message}`, 'error');
    });
  };

  const handleRepairAll = () => {
    api.resetSimulation().then(() => {
      setKilledNodes(new Set());
      setKilledLinks(new Set());
      addLog(`[CHAOS ENG] All systems repaired. Entire grid is nominal.`, 'success');
    }).catch(err => {
      addLog(`[CHAOS ENG] Error repairing grid: ${err.message}`, 'error');
    });
  };

  const handleRunSimulation = () => {
    if (!config || !selectedOrigin || !selectedDest || !activeRoute) return;
    if (activeRoute.error) {
      addLog(`[SIM ERROR] ${activeRoute.error}`, 'error');
      return;
    }

    setIsSimulating(true);
    // Reset logs to initial state
    setLogs([
      { text: `=== STARTING SIMULATION: ${selectedOrigin} TO ${selectedDest} ===`, type: 'info' },
      { text: `Payload: "${payloadText}"`, type: 'plain' },
    ]);

    api.sendPacket(selectedOrigin, selectedDest, payloadText)
      .then(packet => {
        if (packet.status === 'failed') {
          setLogs(prev => [...prev, { text: `[SIM ERROR] ${packet.error || 'Delivery failed'}`, type: 'error' }]);
          setIsSimulating(false);
          return;
        }

        const path = packet.route;
        const hopLogs = packet.hop_log;
        let hopIdx = 0;

        setPacketProgress({ currentHopIndex: 0, progress: 0 });

        const appendLog = (text: string, type: LogMessage['type']) => {
          setLogs(prev => [...prev, { text, type }]);
        };

        const animateHop = () => {
          if (hopIdx >= path.length - 1) {
            const destNode = config.nodes.find(n => n.id === selectedDest)!;
            const encodedArray = encodeToBaseX(payloadText, destNode.codex);
            appendLog(`\n[HOP ${hopIdx + 1}] Destination reached: ${selectedDest} (Base ${destNode.codex})`, 'success');
            appendLog(`  ▶ [DEC] Received in Base ${destNode.codex}: [${encodedArray.join(', ')}]`, 'purple');
            appendLog(`  ▶ [DEC] Decoded successfully to ASCII: "${payloadText}"`, 'success');
            appendLog(`\n[SUCCESS] Packet safely delivered. Total latency: ${packet.total_latency_ms.toFixed(3)} ms.`, 'success');
            setIsSimulating(false);
            setPacketProgress(null);
            return;
          }

          const currentPlanetId = path[hopIdx];
          const nextPlanetId = path[hopIdx + 1];
          const currentPlanet = config.nodes.find(n => n.id === currentPlanetId)!;
          const nextPlanet = config.nodes.find(n => n.id === nextPlanetId)!;
          const hopInfo = hopLogs[hopIdx];
          const lb = hopInfo.latency_breakdown;

          const { towerA, towerB } = findClosestTowerPair(
            currentPlanet, nextPlanet,
            config.universe_metadata.coordinate_scale_unit_km || 100000
          );

          const encodedPayload = encodeToBaseX(payloadText, nextPlanet.codex);

          appendLog(`\n[HOP ${hopIdx + 1}] ${currentPlanetId} → ${nextPlanetId}`, 'plain');
          appendLog(`  ▶ [ENC] Translate payload (ASCII → Base ${nextPlanet.codex}): [${encodedPayload.join(', ')}]`, 'purple');
          appendLog(`  ▶ [PLANET ${currentPlanetId}] Subsurface fiber: Center → Egress Tower ${towerA}  (+${lb.fiber_exit_ms.toFixed(2)} ms)`, 'plain');
          appendLog(`  ▶ [SPACE] Egress atmosphere at ${currentPlanetId}  (+${lb.atmosphere_exit_ms.toFixed(2)} ms)`, 'info');
          appendLog(`  ▶ [SPACE] Void laser transit: ${hopInfo.void_distance_km.toLocaleString()} km  (+${lb.void_ms.toFixed(2)} ms)`, 'info');

          let p = 0;
          const duration = 1800;
          const intervalTime = 30;
          const steps = duration / intervalTime;
          const delta = 1 / steps;

          const progressInterval = setInterval(() => {
            p += delta;
            if (p >= 1) {
              clearInterval(progressInterval);
              setPacketProgress({ currentHopIndex: hopIdx, progress: 1 });

              appendLog(`  ▶ [SPACE] Ingress atmosphere at ${nextPlanetId}  (+${lb.atmosphere_entry_ms.toFixed(2)} ms)`, 'info');
              appendLog(`  ▶ [PLANET ${nextPlanetId}] Ingress Tower ${towerB}: signal received & processed  (+${lb.tower_ms.toFixed(2)} ms)`, 'success');

              if (hopIdx === path.length - 2) {
                appendLog(`  ▶ [PLANET ${nextPlanetId}] Subsurface fiber: Tower ${towerB} → client endpoint  (+${lb.fiber_entry_ms.toFixed(2)} ms)`, 'plain');
              } else {
                appendLog(`  ▶ [PLANET ${nextPlanetId}] Internal relay: Tower ${towerB} → next egress tower  (+${lb.fiber_entry_ms.toFixed(2)} ms)`, 'plain');
              }

              appendLog(`  ▶ [DEC] Decoded Base ${nextPlanet.codex} → ASCII: "${payloadText}"`, 'success');
              appendLog(`  ✓ Hop latency total: ${hopInfo.total_hop_latency_ms.toFixed(2)} ms`, 'warning');

              hopIdx++;
              if (hopIdx < path.length - 1) {
                setPacketProgress({ currentHopIndex: hopIdx, progress: 0 });
              }
              setTimeout(animateHop, 400);
            } else {
              setPacketProgress({ currentHopIndex: hopIdx, progress: p });
            }
          }, intervalTime);
        };

        setTimeout(animateHop, 300);
      })
      .catch(err => {
        setLogs(prev => [...prev, { text: `[SIM ERROR] ${err.message}`, type: 'error' }]);
        setIsSimulating(false);
      });
  };

  return (
    <div className="min-h-screen flex flex-col font-sans select-none pb-4">
      {/* Header Layout matching screenshot */}
      <header className="app-header">
        <div className="flex items-center gap-3">
          <div className="bg-[#00f2fe]/10 p-2 rounded border border-[#00f2fe]/30 animate-pulse">
            <Activity className="w-5 h-5 text-[#00f2fe]" />
          </div>
          <div className="flex items-baseline gap-2">
            <h1 className="text-sm font-black tracking-widest uppercase glow-text-cyan font-display">
              Relic Ring Protocol
            </h1>
            <span className="text-[0.62rem] text-slate-500 font-bold uppercase tracking-wider font-display">
              &gt; Mission Control
            </span>
          </div>
        </div>
        <div className="flex gap-4 text-[0.65rem] font-display font-bold tracking-wider text-slate-400">
          <span className="cursor-pointer hover:text-white transition-colors border-b-2 border-solid border-[#00f2fe] pb-1">MISSION CONTROL</span>
          <span className="cursor-pointer hover:text-white transition-colors pb-1">CODEX / SPECS</span>
        </div>
      </header>

      {/* Main Grid Layout */}
      <main className="main-layout flex-grow">
        {/* Left Sidebar: Controls & Chaos */}
        <div className="flex flex-col gap-4">
          <ControlPanel
            config={config}
            onConfigChange={setConfig}
            selectedOrigin={selectedOrigin}
            selectedDest={selectedDest}
            onSelectOrigin={setSelectedOrigin}
            onSelectDest={setSelectedDest}
            payloadText={payloadText}
            setPayloadText={setPayloadText}
            onRunSimulation={handleRunSimulation}
            onResetSimulation={() => {
              setSelectedOrigin('Aegis');
              setSelectedDest('Caelum');
              setStartTower(0);
              setEndTower(0);
              setPayloadText('Hello world');
              setPacketProgress(null);
              setIsSimulating(false);
              setLogs([
                { text: "=== CONSOLE RESET ===", type: "info" },
                { text: "Ready.", type: "plain" }
              ]);
            }}
            isSimulating={isSimulating}
            onLoadDefaultUniverse={handleLoadDefaultUniverse}
            killedNodes={killedNodes}
            onToggleNodeKilled={handleToggleNodeKilled}
            onRepairAll={handleRepairAll}
          />
        </div>

        {/* Center Canvas & Metrics */}
        <div className="flex flex-col h-full overflow-hidden">
          <StarMap
            config={config}
            selectedOrigin={selectedOrigin}
            selectedDest={selectedDest}
            onSelectOrigin={setSelectedOrigin}
            onSelectDest={setSelectedDest}
            killedNodes={killedNodes}
            onToggleNodeKilled={handleToggleNodeKilled}
            activeRoute={activeRoute}
            packetProgress={packetProgress}
            onSelectPlanet={setInspectedPlanetId}
          />
          
          <PlanetTowersMap
            config={config}
            inspectedPlanetId={inspectedPlanetId}
            onSelectPlanet={setInspectedPlanetId}
            activeRoute={activeRoute}
            activeHop={activeHop}
            isSimulating={isSimulating}
          />
          
          <LatencyMetrics activeRoute={activeRoute} />
        </div>

        {/* Right Sidebar: Transmission Console */}
        <LogConsole
          config={config}
          logs={logs}
          onClearLogs={() => setLogs([])}
          activeRoute={activeRoute}
          packetProgress={packetProgress}
          isSimulating={isSimulating}
          selectedOrigin={selectedOrigin}
          selectedDest={selectedDest}
        />
      </main>
    </div>
  );
}

export default App;
