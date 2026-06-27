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
    max_void_hop_distance_km: 1100000.0, // Force multi-hop for Aegis -> Dawn -> Caelum
    coordinate_scale_unit_km: 100000.0,
    fiber_speed_fraction: 0.67
  },
  nodes: [
    {
      id: "Aegis",
      codex: 8,
      x: -8.0,
      y: 3.0,
      radius_km: 6000.0,
      active_towers: 8,
      atmosphere_thickness_km: 200.0,
      refraction_index: 1.2
    },
    {
      id: "Boreas",
      codex: 5,
      x: -4.0,
      y: 0.0,
      radius_km: 5500.0,
      active_towers: 6,
      atmosphere_thickness_km: 180.0,
      refraction_index: 1.15
    },
    {
      id: "Dawn",
      codex: 6,
      x: 0.0,
      y: 2.0,
      radius_km: 5000.0,
      active_towers: 6,
      atmosphere_thickness_km: 150.0,
      refraction_index: 1.1
    },
    {
      id: "Fenix",
      codex: 16,
      x: 4.0,
      y: 6.0,
      radius_km: 5800.0,
      active_towers: 8,
      atmosphere_thickness_km: 190.0,
      refraction_index: 1.18
    },
    {
      id: "Elysium",
      codex: 12,
      x: -1.0,
      y: -7.0,
      radius_km: 6200.0,
      active_towers: 8,
      atmosphere_thickness_km: 220.0,
      refraction_index: 1.25
    },
    {
      id: "Caelum",
      codex: 14,
      x: 8.0,
      y: -3.0,
      radius_km: 5700.0,
      active_towers: 8,
      atmosphere_thickness_km: 170.0,
      refraction_index: 1.12
    }
  ]
};

function App() {
  const [config, setConfig] = useState<UniverseConfig | null>(DEFAULT_UNIVERSE);
  const [selectedOrigin, setSelectedOrigin] = useState<string | null>('Boreas');
  const [selectedDest, setSelectedDest] = useState<string | null>('Elysium');
  const [startTower, setStartTower] = useState<number>(0);
  const [endTower, setEndTower] = useState<number>(0);
  const [payloadText, setPayloadText] = useState<string>('Hello world');

  const [killedNodes, setKilledNodes] = useState<Set<string>>(new Set());
  const [killedLinks, setKilledLinks] = useState<Set<string>>(new Set());

  const [activeRoute, setActiveRoute] = useState<RouteResult | null>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [packetProgress, setPacketProgress] = useState<{ currentHopIndex: number; progress: number } | null>(null);
  const [logs, setLogs] = useState<LogMessage[]>([]);

  // Auto-calculate route on config, selection, or chaos updates
  useEffect(() => {
    if (config && selectedOrigin && selectedDest) {
      const route = findShortestPath(
        config,
        selectedOrigin,
        selectedDest,
        killedNodes,
        killedLinks,
        startTower,
        endTower,
        payloadText
      );
      setActiveRoute(route);
    } else {
      setActiveRoute(null);
    }
  }, [config, selectedOrigin, selectedDest, startTower, endTower, killedNodes, killedLinks, payloadText]);

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
      alert("Cannot disable the active origin or destination node.");
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

  const handleRepairAll = () => {
    setKilledNodes(new Set());
    setKilledLinks(new Set());
    addLog(`[CHAOS ENG] All systems repaired. Entire grid is nominal.`, 'success');
  };

  const handleLoadDefaultUniverse = () => {
    setConfig(DEFAULT_UNIVERSE);
    setKilledNodes(new Set());
    setKilledLinks(new Set());
    setSelectedOrigin('Boreas');
    setSelectedDest('Elysium');
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
        // Completed
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
      
      const encodedPayload = encodeToBaseX(payloadText, nextPlanet.codex);
      addLog(`[ENC] Translating payload to next hop dialect (Base ${nextPlanet.codex}): [${encodedPayload.join(', ')}]`, 'purple');
      addLog(`[TX] Beaming signal from Tower ${hopInfo.exit_tower} to Tower ${hopInfo.entry_tower}.`, 'info');

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
          
          addLog(`[RX] Signal received at ${nextPlanetId} Tower ${hopInfo.entry_tower}.`, 'success');
          addLog(`[DEC] Decoded Base ${nextPlanet.codex} back to ASCII: "${payloadText}"`, 'success');
          addLog(`[LATENCY] Void transmission time: ${hopInfo.void_latency_ms.toFixed(2)}ms. Internal transit + processing: ${(hopInfo.internal_transit_latency_ms + hopInfo.tower_delay_ms).toFixed(2)}ms.`, 'warning');

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
            setSelectedOrigin('Boreas');
            setSelectedDest('Elysium');
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
