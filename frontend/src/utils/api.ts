const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface BackendMetadata {
  system_name: string;
  speed_of_light_kms: number;
  max_void_hop_distance_km: number;
  coordinate_scale_unit_km: number;
  tower_processing_delay_ms: number;
  fiber_speed_fraction: number;
}

export interface BackendNode {
  id: string;
  codex: number;
  x: number;
  y: number;
  radius_km: number;
  active_towers: number;
  atmosphere_thickness_km: number;
  refraction_index: number;
}

export interface BackendEdge {
  source: string;
  target: string;
  void_distance_km: number;
  weight_ms: number;
}

export interface UniverseInitResponse {
  metadata: BackendMetadata;
  nodes: BackendNode[];
  edges: BackendEdge[];
}

export interface RouteRequest {
  origin_id: string;
  destination_id: string;
  killed_nodes?: string[];
  killed_edges?: [string, string][];
}

export interface RouteResponse {
  origin_id: string;
  destination_id: string;
  route: string[];
  hop_count: number;
  total_estimated_latency_ms: number;
}

export interface LatencyBreakdown {
  fiber_exit_ms: number;
  atmosphere_exit_ms: number;
  void_ms: number;
  atmosphere_entry_ms: number;
  tower_ms: number;
  fiber_entry_ms: number;
}

export interface HopEntry {
  from_node: string;
  to_node: string;
  void_distance_km: number;
  payload_encoded: string;
  payload_decoded: string;
  source_codex: number;
  dest_codex: number;
  latency_breakdown: LatencyBreakdown;
  total_hop_latency_ms: number;
}

export interface HopLatency {
  from_node: string;
  to_node: string;
  void_distance_km: number;
  breakdown: LatencyBreakdown;
  total_hop_latency_ms: number;
}

export interface Packet {
  origin_id: string;
  destination_id: string;
  current_id: string;
  payload: string;
  hop_log: HopEntry[];
  total_latency_ms: number;
  route: string[];
  status: string;
  error?: string;
}

export interface SimulationStateResponse {
  killed_nodes: string[];
  killed_edges: [string, string][];
  last_packet?: Packet;
}

// ---------------------------------------------------------------------------
// API Client Functions
// ---------------------------------------------------------------------------

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });

  if (!response.ok) {
    let message = `API Error ${response.status}`;
    try {
      const errBody = await response.json();
      if (errBody && errBody.detail) {
        message = errBody.detail;
      }
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export const api = {
  initializeUniverse: () => 
    request<UniverseInitResponse>('/api/universe/init'),

  findRoute: (req: RouteRequest) => 
    request<RouteResponse>('/api/route/find', {
      method: 'POST',
      body: JSON.stringify(req),
    }),

  calculateLatency: (req: RouteRequest) => 
    request<{ route: string[]; hops: HopLatency[]; total_latency_ms: number }>('/api/latency/calculate', {
      method: 'POST',
      body: JSON.stringify(req),
    }),

  sendPacket: (originId: string, destinationId: string, payload: string) => 
    request<Packet>('/api/simulation/send', {
      method: 'POST',
      body: JSON.stringify({ origin_id: originId, destination_id: destinationId, payload }),
    }),

  killNode: (nodeId: string) => 
    request<SimulationStateResponse>('/api/simulation/kill/node', {
      method: 'POST',
      body: JSON.stringify({ node_id: nodeId }),
    }),

  killLink: (sourceId: string, targetId: string) => 
    request<SimulationStateResponse>('/api/simulation/kill/link', {
      method: 'POST',
      body: JSON.stringify({ source_id: sourceId, target_id: targetId }),
    }),

  toggleLink: (sourceId: string, targetId: string) =>
    request<SimulationStateResponse>('/api/simulation/toggle/link', {
      method: 'POST',
      body: JSON.stringify({ source_id: sourceId, target_id: targetId }),
    }),

  restoreLink: (sourceId: string, targetId: string) =>
    request<SimulationStateResponse>('/api/simulation/restore/link', {
      method: 'POST',
      body: JSON.stringify({ source_id: sourceId, target_id: targetId }),
    }),

  resetSimulation: () => 
    request<SimulationStateResponse>('/api/simulation/reset', {
      method: 'POST',
    }),

  getSimulationState: () => 
    request<SimulationStateResponse>('/api/simulation/state'),
};
