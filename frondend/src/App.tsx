import { useState, useEffect } from 'react';
import { StarMap } from './components/StarMap';
import { ControlPanel } from './components/ControlPanel';
import { LogConsole } from './components/LogConsole';
import { LatencyMetrics } from './components/LatencyMetrics';
import {
  findShortestPath,
  encodeToBaseX
} from './utils/math';
import type { UniverseConfig, RouteResult } from './utils/math';
import { Activity, Cpu } from 'lucide-react';

interface LogMessage {
  text: string;
  type: 'info' | 'success' | 'error' | 'warning' | 'purple' | 'plain';
}

const DEFAULT_UNIVERSE: UniverseConfig = {
  universe_metadata: {
    speed_of_light_kms: 300000.0,
    tower_processing_delay_ms: 7.0,
    max_void_hop_distance_km: 1100000.0, // Forced multi-hop for Aegis -> Dawn -> Caelum
    coordinate_scale_unit_km: 100000.0,
    fiber_speed_fraction: 0.67
  },
  nodes: [
    {
      id: "Aegis",
      codex: 8,
      x: 0.0,
      y: 10.0,
      radius_km: 6000.0,
      active_towers: 8,
      atmosphere_thickness_km: 200.0,
      refraction_index: 1.2
    },
    {
      id: "Dawn",
      codex: 5,
      x: 8.0,
      y: 4.0,
      radius_km: 5000.0,
      active_towers: 6,
      atmosphere_thickness_km: 150.0,
      refraction_index: 1.1
    },
    {
      id: "Boreas",
      codex: 10,
      x: -6.0,
      y: 4.0,
      radius_km: 5500.0,
      active_towers: 6,
      atmosphere_thickness_km: 180.0,
      refraction_index: 1.15
    },
    {
      id: "Elysium",
      codex: 12,
      x: -3.0,
      y: -2.0,
      radius_km: 6200.0,
      active_towers: 8,
      atmosphere_thickness_km: 220.0,
      refraction_index: 1.25
    },
    {
      id: "Caelum",
      codex: 14,
      x: 8.0,
      y: -2.0,
      radius_km: 5800.0,
      active_towers: 8,
      atmosphere_thickness_km: 190.0,
      refraction_index: 1.18
    }
  ]
};

function App() {
  const [config, setConfig] = useState<UniverseConfig | null>(DEFAULT_UNIVERSE);
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
      const route = findShortestPath(
        config,
        selectedOrigin,
        selectedDest,
        killedNodes,
        killedLinks,
        startTower,
        endTower
      );
      setActiveRoute(route);
    } else {
      setActiveRoute(null);
    }
  }, [config, selectedOrigin, selectedDest, startTower, endTower, killedNodes, killedLinks]);

  // Initial welcome logs on startup
  useEffect(() => {
    setLogs([
      { text: "=== RELIC RING CORE PROTOCOL CONSOLE ===", type: "info" },
      { text: "System initialized. Default Zeta-26 configuration loaded.", type: "success" },
      { text: "Ready to route laser packets across star system legacy grid.", type: "plain" }
    ]);
  }, []);

  const addLog = (text: string, type: LogMessage['type'] = 'plain') => {
    setLogs((prev) => [...prev, { text, type }]);
  };

  const handleToggleNodeKilled = (id: string) => {
    if (id === selectedOrigin || id === selectedDest) {
      alert("Cannot disable the selected origin or destination node during simulation setup.");
      return;
    }
    const newKilled = new Set(killedNodes);
    if (newKilled.has(id)) {
      newKilled.delete(id);
      addLog(`[CHAOS ENG] Planet ${id} online. Hardware links restored.`, 'info');
    } else {
      newKilled.add(id);
      addLog(`[CHAOS ENG] ALERT: Planet ${id} is offline (KILLED). Links severed.`, 'error');
    }
    setKilledNodes(newKilled);
  };

  const handleLoadDefaultUniverse = () => {
    setConfig(DEFAULT_UNIVERSE);
    setKilledNodes(new Set());
    setKilledLinks(new Set());
    setSelectedOrigin('Aegis');
    setSelectedDest('Caelum');
    setStartTower(0);
    setEndTower(0);
    setPayloadText('Hello world');
    setLogs([
      { text: "=== RELIC RING CORE PROTOCOL CONSOLE ===", type: "info" },
      { text: "Zeta-26 Core configuration reloaded.", type: "success" }
    ]);
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

    const path = activeRoute.path;
    const hopLogs = activeRoute.hop_logs;
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
        addLog(`\n[SUCCESS] Packet safely delivered. Total latency: ${activeRoute.total_latency_ms.toFixed(3)} ms.`, 'success');
        setIsSimulating(false);
        setPacketProgress(null);
        return;
      }

      const currentPlanetId = path[hopIdx];
      const nextPlanetId = path[hopIdx + 1];
      const currentPlanet = config.nodes.find(n => n.id === currentPlanetId)!;
      const nextPlanet = config.nodes.find(n => n.id === nextPlanetId)!;
      const hopInfo = hopLogs[hopIdx];

      addLog(`\n[HOP ${hopIdx + 1}] Origin: ${currentPlanetId} (Base ${currentPlanet.codex}) → Destination: ${nextPlanetId} (Base ${nextPlanet.codex})`, 'plain');
      
      // Step 1: Codex Dialect Conversion
      const encodedPayload = encodeToBaseX(payloadText, nextPlanet.codex);
      addLog(`[ENC] Translating payload to next hop dialect (Base ${nextPlanet.codex}): [${encodedPayload.join(', ')}]`, 'purple');
      addLog(`[TX] Serialized payload to binary laser stream. Beaming from Tower ${hopInfo.exit_tower} to Tower ${hopInfo.entry_tower}.`, 'info');

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
          addLog(`[RX] Signal received at ${nextPlanetId} Tower ${hopInfo.entry_tower}.`, 'success');
          addLog(`[DEC] Decoded Base ${nextPlanet.codex} back to ASCII: "${payloadText}"`, 'success');
          addLog(`[LATENCY] Hop void transmission: ${hopInfo.void_latency_ms.toFixed(2)}ms. Internal transit + processing: ${(hopInfo.internal_transit_latency_ms + hopInfo.tower_delay_ms).toFixed(2)}ms.`, 'warning');

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
