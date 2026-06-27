# Architecture

---

## System Diagram

```
┌─────────────────────────────────────────┐
│           React Frontend                │
│  Dashboard · Simulation · Packet Viewer │
│  Latency Chart · Failure Controls       │
└──────────────┬──────────────────────────┘
               │ REST (JSON)
               │ http://localhost:8000/api
┌──────────────▼──────────────────────────┐
│           FastAPI Backend               │
│                                         │
│  /universe/init   /route/find           │
│  /latency/calculate                     │
│  /simulation/send|kill|reset|state      │
│                                         │
│  ┌──────────┐  ┌──────────┐  ┌───────┐ │
│  │ Dijkstra │  │ Latency  │  │Codex  │ │
│  │ (NetworkX│  │ Engine   │  │Engine │ │
│  └──────────┘  └──────────┘  └───────┘ │
│                    │                   │
│             universe-config.json       │
└─────────────────────────────────────────┘
```

---

## Backend Layer Breakdown

### `models/`
Pydantic data contracts shared across all layers.

| File | Purpose |
|------|---------|
| `universe.py` | `UniverseMetadata`, `NodeModel`, `UniverseConfig` |
| `packet.py` | `Packet`, `HopEntry`, `LatencyBreakdown` |
| `edge.py` | `EdgeModel` (computed, not from config) |

### `services/`
Business logic — each file owns exactly one concern.

| File | Responsibility |
|------|---------------|
| `parser.py` | Load & validate `universe-config.json` (cached singleton) |
| `dijkstra.py` | Build graph, compute edges, run Dijkstra |
| `latency.py` | Four pure physics functions + hop total |
| `translator.py` | Encode/decode ASCII ↔ planet codex (any base) |
| `packet.py` | Orchestrate full packet delivery lifecycle |

### `routers/`
Thin HTTP layer — delegates to services, no logic.

| File | Endpoints |
|------|-----------|
| `universe.py` | `GET /api/universe/init` |
| `routing.py` | `POST /api/route/find` |
| `latency.py` | `POST /api/latency/calculate` |
| `simulation.py` | `POST /api/simulation/send|kill|reset` · `GET /state` |

---

## Frontend Layer Breakdown

### Pages

| Page | Role |
|------|------|
| `Dashboard` | Universe graph entry point |
| `Simulation` | Live animated packet delivery |
| `PacketViewer` | Hop log + codex translation display |
| `LatencyBreakdown` | Per-hop stacked bar chart |
| `FailureSimulation` | Kill controls + reroute trigger |

### Key Components

| Component | Role |
|-----------|------|
| `UniverseGraph` | React Flow node/edge graph |
| `PacketAnimation` | Framer Motion packet movement |
| `CodexInspector` | Shows encoded + decoded payload per hop |
| `LatencyChart` | Recharts stacked bar (fiber/atm/void/tower) |
| `ControlPanel` | Initialize · Send · Kill · Reset buttons |

---

## Data Flow — Packet Delivery

```
1. Frontend calls POST /api/simulation/send
        { origin_id, destination_id, payload }

2. Backend: find_route() → Dijkstra → ordered node list

3. For each hop (src → dst):
   a. encode(payload, dest.codex)      → payload_encoded
   b. calc_total_hop(src, dst, meta)   → LatencyBreakdown
   c. append HopEntry to hop_log

4. Return Packet:
        { origin_id, destination_id, current_id,
          payload, hop_log, total_latency_ms,
          route, status }

5. Frontend animates route, renders hop log + charts
```

---

## Config Loading

```
parser.py searches in order:
  1. UNIVERSE_CONFIG_PATH env var (if set)
  2. CWD/universe-config.json
  3. CWD/../universe-config.json
  4. File-relative fallback paths

Result: cached UniverseConfig singleton
```

---

## Simulation State (In-Process)

The server holds killed nodes/edges in module-level sets.  
State resets on server restart. No database needed.

```python
_killed_nodes: Set[str] = set()
_killed_edges: Set[Tuple[str, str]] = set()
_last_packet: Optional[Packet] = None
```

All `/simulation/*` endpoints read/write these sets.
