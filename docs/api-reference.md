# API Reference

Base URL: `http://localhost:8000`  
All routes are prefixed with `/api`.  
Interactive docs: `http://localhost:8000/docs`

---

## Health

### `GET /`

Confirms the server is running and the universe config is loaded.

**Response**
```json
{
  "status": "ok",
  "universe": "Zeta-26",
  "planets": 6,
  "version": "1.0.0"
}
```

---

## Universe

### `GET /api/universe/init`

Returns the full graph topology. **Call this first** — the frontend uses it to render the node map.

**Response**
```json
{
  "metadata": {
    "system_name": "Zeta-26",
    "speed_of_light_kms": 300000.0,
    "max_void_hop_distance_km": 50000000.0,
    "coordinate_scale_unit_km": 100000.0,
    "tower_processing_delay_ms": 7.0,
    "fiber_speed_fraction": 0.67
  },
  "nodes": [
    {
      "id": "Aegis",
      "codex": 8,
      "x": 0.0, "y": 0.0,
      "radius_km": 6371.0,
      "active_towers": 8,
      "atmosphere_thickness_km": 120.0,
      "refraction_index": 1.0003
    }
  ],
  "edges": [
    {
      "source": "Aegis",
      "target": "Dawn",
      "void_distance_km": 35347318.059,
      "weight_ms": 117871.053955
    }
  ]
}
```

---

## Routing

### `POST /api/route/find`

Find the lowest-latency route between two planets.

**Request**
```json
{
  "origin_id": "Aegis",
  "destination_id": "Caelum",
  "killed_nodes": [],
  "killed_edges": []
}
```

**Response**
```json
{
  "origin_id": "Aegis",
  "destination_id": "Caelum",
  "route": ["Aegis", "Dawn", "Caelum"],
  "hop_count": 2,
  "total_estimated_latency_ms": 229780.056393
}
```

**Errors**
| Code | Reason |
|------|--------|
| `400` | Invalid node ID |
| `404` | No path exists |

---

## Latency

### `POST /api/latency/calculate`

Per-hop latency breakdown without full packet simulation.

**Request**
```json
{
  "origin_id": "Aegis",
  "destination_id": "Caelum"
}
```

**Response**
```json
{
  "route": ["Aegis", "Dawn", "Caelum"],
  "hops": [
    {
      "from_node": "Aegis",
      "to_node": "Dawn",
      "void_distance_km": 35347318.059,
      "breakdown": {
        "fiber_exit_ms": 31.696517,
        "atmosphere_exit_ms": 0.40012,
        "void_ms": 117824.393531,
        "atmosphere_entry_ms": 0.1011,
        "tower_ms": 7.0,
        "fiber_entry_ms": 7.462687
      },
      "total_hop_latency_ms": 117871.053955
    }
  ],
  "total_latency_ms": 229780.056393
}
```

---

## Simulation

### `POST /api/simulation/send`

Full packet delivery with hop log, codex translations, and latency breakdown.

**Request**
```json
{
  "origin_id": "Aegis",
  "destination_id": "Caelum",
  "payload": "HELLO"
}
```

**Response**
```json
{
  "origin_id": "Aegis",
  "destination_id": "Caelum",
  "current_id": "Caelum",
  "payload": "HELLO",
  "route": ["Aegis", "Dawn", "Caelum"],
  "status": "delivered",
  "total_latency_ms": 229780.056393,
  "hop_log": [
    {
      "from_node": "Aegis",
      "to_node": "Dawn",
      "void_distance_km": 35347318.059,
      "source_codex": 8,
      "dest_codex": 6,
      "payload_encoded": "200 153 204 204 211",
      "payload_decoded": "HELLO",
      "latency_breakdown": { "...": "..." },
      "total_hop_latency_ms": 117871.053955
    }
  ],
  "error": null
}
```

**Status values:** `delivered` · `rerouted` · `failed`

---

### `POST /api/simulation/kill/node`

Mark a planet as dead. Excluded from all future routing.

**Request**
```json
{ "node_id": "Dawn" }
```

**Response:** `SimulationStateResponse` (see below)  
**Error:** `404` if node ID not found.

---

### `POST /api/simulation/kill/link`

Mark a direct link between two planets as dead.

**Request**
```json
{ "source_id": "Aegis", "target_id": "Dawn" }
```

**Response:** `SimulationStateResponse`

---

### `POST /api/simulation/reset`

Restore all nodes and links. Clears the last packet.

**Response:** `SimulationStateResponse` with empty sets.

---

### `GET /api/simulation/state`

Current simulation state.

**Response**
```json
{
  "killed_nodes": ["Dawn"],
  "killed_edges": [],
  "last_packet": { "...": "..." }
}
```

---

## Packet Schema (Mandatory)

The `Packet` object always contains these fields — as required by the challenge spec:

| Field | Type | Description |
|-------|------|-------------|
| `origin_id` | string | Source planet |
| `destination_id` | string | Target planet |
| `current_id` | string | Last planet the packet reached |
| `payload` | string | Original ASCII message |
| `hop_log` | list | Per-hop translation + latency entries |
| `total_latency_ms` | float | Sum of all hop latencies |
| `route` | list | Ordered node IDs |
| `status` | string | `delivered` / `rerouted` / `failed` |
| `error` | string\|null | Error message if status is `failed` |
