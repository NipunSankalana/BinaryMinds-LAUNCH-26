import { useState, useEffect } from 'react';
import { StarMap } from './components/StarMap';
import { ControlPanel } from './components/ControlPanel';
import { LogConsole } from './components/LogConsole';
import { LatencyMetrics } from './components/LatencyMetrics';
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
            void_latency_ms: hop.latency_breakdown.void_ms + hop.latency_breakdown.atmosphere_exit_ms + hop.latency_breakdown.atmosphere_entry_ms,
            internal_transit_distance_km: fromNode.radius_km,
            internal_transit_latency_ms: hop.latency_breakdown.fiber_exit_ms + hop.latency_breakdown.fiber_entry_ms,
            tower_delay_ms: hop.latency_breakdown.tower_ms,
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

  // Load universe config on startup
  useEffect(() => {
    setLogs([
      { text: "=== RELIC RING CORE PROTOCOL CONSOLE ===", type: "info" },
      { text: "Connecting to tactical star grid backend...", type: "plain" }
    ]);
    api.initializeUniverse()
      .then(res => {
        setConfig({
          universe_metadata: res.metadata,
          nodes: res.nodes
        });
        addLog("System initialized. Core Zeta-26 configuration loaded from backend.", "success");
        addLog("Ready to route laser packets across star system legacy grid.", "plain");
      })
      .catch(err => {
        addLog(`❌ FAILED TO INITIALIZE UNIVERSE: ${err.message}`, "error");
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

  const handleRunSimulation = () => {
    if (!config || !selectedOrigin || !selectedDest || !activeRoute) return;
    if (activeRoute.error) {
      addLog(`[SIM ERROR] ${activeRoute.error}`, 'error');
      return;
    }

    setIsSimulating(true);
    setLogs([
      { text: `=== STARTING SIMULATION: ${selectedOrigin} TO ${selectedDest} ===`, type: 'info' },
      { text: `Payload: "${payloadText}"`, type: 'plain' }
    ]);

    api.sendPacket(selectedOrigin, selectedDest, payloadText)
      .then(packet => {
        if (packet.status === 'failed') {
          addLog(`[SIM ERROR] ${packet.error || 'Delivery failed'}`, 'error');
          setIsSimulating(false);
          return;
        }

        const path = packet.route;
        const hopLogs = packet.hop_log;
        let hopIdx = 0;
        
        setPacketProgress({ currentHopIndex: 0, progress: 0 });

        const animateHop = () => {
          if (hopIdx >= path.length - 1) {
            // Simulation Completed successfully
            const destNode = config.nodes.find(n => n.id === selectedDest)!;
            const encodedArray = encodeToBaseX(payloadText, destNode.codex);
            
            addLog(`\n[HOP ${hopIdx + 1}] Destination reached: ${selectedDest} (Base ${destNode.codex})`, 'success');
            addLog(`[DEC] Received payload in Base ${destNode.codex}: [${encodedArray.join(', ')}]`, 'purple');
            addLog(`[DEC] Decoded successfully to ASCII: "${payloadText}"`, 'success');
            addLog(`\n[SUCCESS] Packet safely delivered. Total latency: ${packet.total_latency_ms.toFixed(3)} ms.`, 'success');
            setIsSimulating(false);
            setPacketProgress(null);
            return;
          }

          const currentPlanetId = path[hopIdx];
          const nextPlanetId = path[hopIdx + 1];
          const currentPlanet = config.nodes.find(n => n.id === currentPlanetId)!;
          const nextPlanet = config.nodes.find(n => n.id === nextPlanetId)!;
          const hopInfo = hopLogs[hopIdx];
          
          const { towerA, towerB } = findClosestTowerPair(currentPlanet, nextPlanet, config.universe_metadata.coordinate_scale_unit_km || 100000);

          addLog(`\n[HOP ${hopIdx + 1}] Origin: ${currentPlanetId} (Base ${currentPlanet.codex}) → Destination: ${nextPlanetId} (Base ${nextPlanet.codex})`, 'plain');
          
          // Step 1: Codex Dialect Conversion
          const encodedPayload = encodeToBaseX(payloadText, nextPlanet.codex);
          addLog(`[ENC] Translating payload to next hop dialect (Base ${nextPlanet.codex}): [${encodedPayload.join(', ')}]`, 'purple');
          addLog(`[TX] Serialized payload to binary laser stream. Beaming from Tower ${towerA} to Tower ${towerB}.`, 'info');

          // Step 2: Animate progress
          let p = 0;
          const duration = 1800; // ms
          const intervalTime = 30; // ms
          const steps = duration / intervalTime;
          const delta = 1 / steps;

          const progressInterval = setInterval(() => {
            p += delta;
            if (p >= 1) {
              clearInterval(progressInterval);
              setPacketProgress({ currentHopIndex: hopIdx, progress: 1 });
              
              // Hop finished
              addLog(`[RX] Signal received at ${nextPlanetId} Tower ${towerB}.`, 'success');
              addLog(`[DEC] Decoded Base ${nextPlanet.codex} back to ASCII: "${payloadText}"`, 'success');
              addLog(`[LATENCY] Hop void transmission: ${hopInfo.latency_breakdown.void_ms.toFixed(2)}ms. Internal transit + processing: ${(hopInfo.latency_breakdown.fiber_exit_ms + hopInfo.latency_breakdown.fiber_entry_ms + hopInfo.latency_breakdown.tower_ms).toFixed(2)}ms.`, 'warning');

              // Next hop
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
        addLog(`[SIM ERROR] ${err.message}`, 'error');
        setIsSimulating(false);
      });
  };

  return (
    <div className="min-height-vh flex flex-col font-sans select-none pb-8">
      {/* Navbar / Header */}
      <header className="glass-panel border-b border-solid px-6 py-4 rounded-none mb-6">
        <div className="max-w-[1600px] margin-auto flex justify-between items-center w-full">
          <div className="flex items-center gap-3">
            <div className="bg-[#00f2fe]/10 p-2 rounded-lg border border-[#00f2fe]/30 animate-pulse">
              <Activity className="w-6 h-6 text-[#00f2fe]" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-widest uppercase glow-text-cyan font-display">
                Relic Ring Protocol
              </h1>
              <p className="text-[0.65rem] text-slate-400 font-medium uppercase tracking-wider">
                Zeta-26 Interplanetary Tactical Routing Engine
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleLoadDefaultUniverse}
              className="text-xs btn-secondary flex items-center gap-1.5 py-1.5 px-3"
            >
              <Cpu className="w-3.5 h-3.5" /> Reset Grid
            </button>
          </div>
        </div>
      </header>

      {/* Main Grid Layout */}
      <main className="dashboard-grid flex-grow">
        {/* Left Side: Map and Terminal Logs */}
        <div className="flex flex-col gap-6">
          {/* Tactical Star Map */}
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
          />

          {/* Terminal Logs */}
          <LogConsole logs={logs} onClearLogs={() => setLogs([])} />
        </div>

        {/* Right Side: Setup Form and Timing Metrics */}
        <div className="flex flex-col gap-6">
          <ControlPanel
            config={config}
            onConfigChange={setConfig}
            selectedOrigin={selectedOrigin}
            selectedDest={selectedDest}
            onSelectOrigin={setSelectedOrigin}
            onSelectDest={setSelectedDest}
            startTower={startTower}
            setStartTower={setStartTower}
            endTower={endTower}
            setEndTower={setEndTower}
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
          />

          <LatencyMetrics activeRoute={activeRoute} />
        </div>
      </main>
    </div>
  );
}

export default App;
