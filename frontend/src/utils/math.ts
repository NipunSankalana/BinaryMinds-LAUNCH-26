export interface Planet {
  id: string;
  codex: number;
  x: number;
  y: number;
  radius_km: number;
  active_towers: number;
  atmosphere_thickness_km: number;
  refraction_index: number;
}

export interface UniverseMetadata {
  speed_of_light_kms?: number;
  tower_processing_delay_ms?: number;
  max_void_hop_distance_km?: number;
  coordinate_scale_unit_km?: number;
  fiber_speed_fraction?: number;
}

export interface UniverseConfig {
  universe_metadata: UniverseMetadata;
  nodes: Planet[];
}

export interface HopLogEntry {
  hop: number;
  from_planet: string;
  to_planet: string;
  exit_tower: number;
  entry_tower: number;
  void_distance_km: number;
  void_latency_ms: number;
  internal_transit_distance_km: number;
  internal_transit_latency_ms: number;
  tower_delay_ms: number;
  hop_total_latency_ms: number;
  payload_sent_codex: string;
  payload_received_ascii: string;
  binary_stream?: string;  // flat bit-stream for laser transmission
  src_tower_delay_ms?: number;
  dst_tower_delay_ms?: number;
}

export interface RouteResult {
  path: string[];
  total_latency_ms: number;
  hop_logs: HopLogEntry[];
  error?: string;
}

// Default constants if not provided in metadata
export const DEFAULT_SPEED_OF_LIGHT = 300000; // km/s
export const DEFAULT_TOWER_DELAY = 7; // ms
export const DEFAULT_MAX_VOID_HOP = 50000000; // km
export const DEFAULT_SCALE_UNIT = 100000; // km
export const DEFAULT_FIBER_SPEED_FRACTION = 0.67;

/**
 * Calculates coordinates for Tower i on Planet P.
 * Towers are placed at equal angular intervals starting from the top (positive y-axis) clockwise.
 */
export function getTowerCoordinates(
  planet: Planet,
  towerIndex: number,
  scale: number
): { x: number; y: number } {
  const N = planet.active_towers;
  const R = planet.radius_km;
  // Angle starting from top (y-axis) and going clockwise:
  // theta = pi/2 - i * 2pi/N
  const theta = Math.PI / 2 - (towerIndex * 2 * Math.PI) / N;
  
  return {
    x: planet.x * scale + R * Math.cos(theta),
    y: planet.y * scale + R * Math.sin(theta),
  };
}

/**
 * Finds the tower pair (one on each planet) that minimizes straight-line distance.
 */
export function findClosestTowerPair(
  planetA: Planet,
  planetB: Planet,
  scale: number
): { towerA: number; towerB: number; distance: number } {
  let minDistance = Infinity;
  let bestA = 0;
  let bestB = 0;

  for (let i = 0; i < planetA.active_towers; i++) {
    const coordA = getTowerCoordinates(planetA, i, scale);
    for (let j = 0; j < planetB.active_towers; j++) {
      const coordB = getTowerCoordinates(planetB, j, scale);
      const dist = Math.sqrt(
        Math.pow(coordA.x - coordB.x, 2) + Math.pow(coordA.y - coordB.y, 2)
      );
      if (dist < minDistance) {
        minDistance = dist;
        bestA = i;
        bestB = j;
      }
    }
  }

  return { towerA: bestA, towerB: bestB, distance: minDistance };
}

/**
 * Calculates Void Distance (L)
 */
export function calculateVoidDistance(
  planetA: Planet,
  planetB: Planet,
  scale: number
): number {
  const dx = planetA.x - planetB.x;
  const dy = planetA.y - planetB.y;
  const centerDist = Math.sqrt(dx * dx + dy * dy) * scale;
  
  const bufferA = planetA.radius_km + planetA.atmosphere_thickness_km;
  const bufferB = planetB.radius_km + planetB.atmosphere_thickness_km;
  
  return centerDist - bufferA - bufferB;
}

/**
 * Calculates Void Travel Time (Tv) in milliseconds
 */
export function calculateVoidTravelTime(
  planetA: Planet,
  planetB: Planet,
  voidDist: number,
  speedOfLight: number
): number {
  const h1 = planetA.atmosphere_thickness_km;
  const n1 = planetA.refraction_index;
  const h2 = planetB.atmosphere_thickness_km;
  const n2 = planetB.refraction_index;
  
  // Tv = ((h1 * n1) + (h2 * n2) + L) / C (in seconds)
  const timeSec = (h1 * n1 + h2 * n2 + voidDist) / speedOfLight;
  return timeSec * 1000; // in milliseconds
}

/**
 * Calculates Crust Transit Time and Tower Delay (Tp) in milliseconds
 */
export function calculateCrustTransitTime(
  planet: Planet,
  entryTower: number,
  exitTower: number,
  fiberSpeedFraction: number,
  speedOfLight: number,
  towerDelay: number
): { fiberTimeMs: number; towerDelayMs: number; totalTransitMs: number; segments: number; towersHit: number } {
  const N = planet.active_towers;
  const r = planet.radius_km;
  
  // Number of segments s
  const s = Math.min(Math.abs(entryTower - exitTower), N - Math.abs(entryTower - exitTower));
  // Number of distinct towers hit m
  const m = s === 0 ? 1 : s + 1;
  
  // Fiber arc distance in km
  const segmentDistance = (2 * Math.PI * r * s) / N;
  const fiberSpeed = fiberSpeedFraction * speedOfLight;
  
  const fiberTimeSec = segmentDistance / fiberSpeed;
  const fiberTimeMs = fiberTimeSec * 1000;
  const towerDelayMs = m * towerDelay;
  
  return {
    fiberTimeMs,
    towerDelayMs,
    totalTransitMs: fiberTimeMs + towerDelayMs,
    segments: s,
    towersHit: m,
  };
}

/**
 * Codex conversion logic: Convert text character-by-character to Base-X
 */
export function encodeToBaseX(text: string, base: number): string[] {
  return Array.from(text).map((char) => {
    const code = char.charCodeAt(0);
    return code.toString(base).toUpperCase();
  });
}

/**
 * Serialize an ASCII payload into a flat binary bit-stream for laser void transmission.
 *
 * Bit-packing standard (mirrors backend translator.py):
 *   Each character's ASCII ordinal is packed into a fixed-width binary field.
 *   Width = max(8, ceil(log2(codexBase))) bits per symbol.
 *   Symbols are concatenated with no delimiter — the receiver knows the frame size.
 *
 * @param payload    - ASCII text to serialize
 * @param codexBase  - destination planet codex (determines bit-width)
 * @returns flat binary string e.g. "0100100001100101..."
 */
export function serializeToBinaryStream(payload: string, codexBase: number): string {
  if (!payload) return '';
  const bitsPerSymbol = Math.max(8, codexBase > 2 ? Math.ceil(Math.log2(codexBase)) : 8);
  return Array.from(payload)
    .map(ch => ch.charCodeAt(0).toString(2).padStart(bitsPerSymbol, '0'))
    .join('');
}

/**
 * Codex conversion logic: Decode Base-X strings back to ASCII text
 */
export function decodeFromBaseX(encodedArray: string[], base: number): string {
  try {
    return encodedArray
      .map((str) => {
        const code = parseInt(str, base);
        if (isNaN(code)) return '?';
        return String.fromCharCode(code);
      })
      .join('');
  } catch {
    return 'Decoding Error';
  }
}

/**
 * Standard base conversion from Base A to Base B
 */
export function convertBase(value: string, fromBase: number, toBase: number): string {
  const num = parseInt(value, fromBase);
  if (isNaN(num)) return 'NaN';
  return num.toString(toBase).toUpperCase();
}

/**
 * Dijkstra Shortest Latency Path Finder
 */
export function findShortestPath(
  config: UniverseConfig,
  originId: string,
  destId: string,
  killedNodes: Set<string>,
  killedLinks: Set<string>,
  startTower: number = 0,
  endTower: number = 0,
  payloadText: string = 'Hello world'
): RouteResult {
  const metadata = config.universe_metadata;
  const nodes = config.nodes;
  
  const speedOfLight = metadata.speed_of_light_kms ?? DEFAULT_SPEED_OF_LIGHT;
  const towerDelay = metadata.tower_processing_delay_ms ?? DEFAULT_TOWER_DELAY;
  const maxVoidHop = metadata.max_void_hop_distance_km ?? DEFAULT_MAX_VOID_HOP;
  const scale = metadata.coordinate_scale_unit_km ?? DEFAULT_SCALE_UNIT;
  const fiberSpeedFraction = metadata.fiber_speed_fraction ?? DEFAULT_FIBER_SPEED_FRACTION;
  
  const originNode = nodes.find((n) => n.id === originId);
  const destNode = nodes.find((n) => n.id === destId);
  
  if (!originNode || !destNode) {
    return { path: [], total_latency_ms: 0, hop_logs: [], error: 'Origin or destination planet not found.' };
  }
  
  if (killedNodes.has(originId)) {
    return { path: [], total_latency_ms: 0, hop_logs: [], error: `Origin planet ${originId} is currently disabled (KILLED).` };
  }
  if (killedNodes.has(destId)) {
    return { path: [], total_latency_ms: 0, hop_logs: [], error: `Destination planet ${destId} is currently disabled (KILLED).` };
  }
  
  // dist[u] stores the shortest time in ms to reach node u, ending at u's receiving tower.
  const dist: Record<string, number> = {};
  const parent: Record<string, string> = {};
  // entryTower[u] stores the receiving tower index on node u from its predecessor.
  const entryTower: Record<string, number> = {};
  // exitTower[u] stores the sending tower index on node u to its successor.
  const exitTower: Record<string, number> = {};
  
  const activeNodes = nodes.filter((n) => !killedNodes.has(n.id));
  
  activeNodes.forEach((n) => {
    dist[n.id] = Infinity;
  });
  
  dist[originId] = 0;
  entryTower[originId] = startTower;
  
  const visited = new Set<string>();
  
  while (visited.size < activeNodes.length) {
    // Find unvisited node with minimum distance
    let u: string | null = null;
    let minDist = Infinity;
    
    activeNodes.forEach((n) => {
      if (!visited.has(n.id) && dist[n.id] < minDist) {
        minDist = dist[n.id];
        u = n.id;
      }
    });
    
    if (u === null || minDist === Infinity) break;
    
    visited.add(u);
    
    if (u === destId) break;
    
    const nodeU = nodes.find((n) => n.id === u)!;
    const entryTowerU = entryTower[u];
    
    // Check all neighbors
    for (const nodeV of activeNodes) {
      if (visited.has(nodeV.id) || nodeV.id === u) continue;
      
      // Check if link is killed
      const linkKey1 = `${u}-${nodeV.id}`;
      const linkKey2 = `${nodeV.id}-${u}`;
      if (killedLinks.has(linkKey1) || killedLinks.has(linkKey2)) continue;
      
      // Calculate void distance
      const voidDist = calculateVoidDistance(nodeU, nodeV, scale);
      
      // Check max void hop constraint
      if (voidDist > maxVoidHop || voidDist < 0) continue;
      
      // Find closest tower pair
      const { towerA: exitTowerU, towerB: entryTowerV } = findClosestTowerPair(nodeU, nodeV, scale);
      
      // Calculate transit through U: from entryTowerU to exitTowerU
      const transitU = calculateCrustTransitTime(
        nodeU,
        entryTowerU,
        exitTowerU,
        fiberSpeedFraction,
        speedOfLight,
        towerDelay
      );
      
      // Calculate void travel time from U to V
      const voidTime = calculateVoidTravelTime(nodeU, nodeV, voidDist, speedOfLight);
      
      const alt = dist[u] + transitU.totalTransitMs + voidTime;
      
      if (alt < dist[nodeV.id]) {
        dist[nodeV.id] = alt;
        parent[nodeV.id] = u;
        entryTower[nodeV.id] = entryTowerV;
        exitTower[u] = exitTowerU;
      }
    }
  }
  
  if (dist[destId] === Infinity) {
    return { path: [], total_latency_ms: 0, hop_logs: [], error: `No viable path exists within maximum hop distance (${(maxVoidHop/1e6).toFixed(1)}M km) or links are down.` };
  }
  
  // Reconstruct path
  const path: string[] = [];
  let curr: string | undefined = destId;
  while (curr !== undefined) {
    path.unshift(curr);
    curr = parent[curr];
  }
  
  // Final transit at destination: from entryTower[destId] to endTower
  const destEntryTower = entryTower[destId];
  exitTower[destId] = endTower;
  
  const destTransit = calculateCrustTransitTime(
    destNode,
    destEntryTower,
    endTower,
    fiberSpeedFraction,
    speedOfLight,
    towerDelay
  );
  
  const total_latency_ms = dist[destId] + destTransit.totalTransitMs;
  
  // Generate Hop Logs
  const hop_logs: HopLogEntry[] = [];
  for (let i = 0; i < path.length - 1; i++) {
    const fromId = path[i];
    const toId = path[i + 1];
    
    const nodeFrom = nodes.find((n) => n.id === fromId)!;
    const nodeTo = nodes.find((n) => n.id === toId)!;
    
    const entryT = entryTower[fromId];
    const exitT = exitTower[fromId];
    const nextEntryT = entryTower[toId];
    
    const voidD = calculateVoidDistance(nodeFrom, nodeTo, scale);
    const voidL = calculateVoidTravelTime(nodeFrom, nodeTo, voidD, speedOfLight);
    
    const crustT = calculateCrustTransitTime(
      nodeFrom,
      entryT,
      exitT,
      fiberSpeedFraction,
      speedOfLight,
      towerDelay
    );
    
    // Payloads for logging
    // Original payload is ASCII text. 
    // In transit, it's encoded into the NEXT HOP's codex.
    // So payload_sent_codex is in nodeTo's codex.
    // Upon arrival, nodeTo decodes it back to ASCII.
    const encoded = encodeToBaseX(payloadText, nodeTo.codex).join(' ');
    
    hop_logs.push({
      hop: i + 1,
      from_planet: fromId,
      to_planet: toId,
      exit_tower: exitT,
      entry_tower: nextEntryT,
      void_distance_km: voidD,
      void_latency_ms: voidL,
      internal_transit_distance_km: (2 * Math.PI * nodeFrom.radius_km * crustT.segments) / nodeFrom.active_towers,
      internal_transit_latency_ms: crustT.fiberTimeMs,
      tower_delay_ms: crustT.towerDelayMs,
      hop_total_latency_ms: crustT.totalTransitMs + voidL,
      payload_sent_codex: encoded,
      payload_received_ascii: payloadText,
    });
  }
  
  return {
    path,
    total_latency_ms,
    hop_logs,
  };
}
