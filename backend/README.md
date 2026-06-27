# 🛰️ BinaryMinds — Backend (FastAPI)

Interplanetary packet routing engine for universe **Zeta-26**.  
Reads `universe-config.json` dynamically, computes latency, translates codex payloads, and serves REST API endpoints to the frontend.

> ⚠️ **Shell**: All commands below are written for **Git Bash on Windows**.  
> Do **not** use PowerShell or CMD — the activation path is different there.

---

## 📁 Project Structure

```
backend/
├── main.py                  # FastAPI app entry point
├── requirements.txt         # Python dependencies
├── conftest.py              # pytest config (auto-finds universe-config.json)
├── sample_response.json     # Sample API output for frontend reference
│
├── models/
│   ├── universe.py          # UniverseMetadata, NodeModel, UniverseConfig
│   ├── packet.py            # Packet, HopEntry, LatencyBreakdown
│   └── edge.py              # EdgeModel (computed dynamically)
│
├── services/
│   ├── parser.py            # Loads & validates universe-config.json
│   ├── dijkstra.py          # Graph construction + Dijkstra pathfinding (NetworkX)
│   ├── latency.py           # Physics latency calculations
│   ├── translator.py        # Codex base conversion (ASCII ↔ planet codex)
│   └── packet.py            # Packet lifecycle / delivery simulation
│
├── routers/
│   ├── universe.py          # GET  /api/universe/init
│   ├── routing.py           # POST /api/route/find
│   ├── latency.py           # POST /api/latency/calculate
│   └── simulation.py        # POST /api/simulation/send|kill|reset  GET /state
│
└── tests/
    ├── test_parser.py
    ├── test_dijkstra.py
    ├── test_latency.py
    ├── test_translator.py
    └── test_api.py
```

---

## ⚙️ Environment Setup (Git Bash on Windows)

### Prerequisites

| Tool | Version | Check |
|------|---------|-------|
| Python | **3.12** | `py -3.12 --version` |
| Git Bash | any | comes with Git for Windows |

---

### 🐍 Create & Activate Virtual Environment

```bash
# 1. Navigate into the backend directory
cd backend

# 2. Create the virtual environment using Python 3.12
py -3.12 -m venv venv

# 3. Activate it — Git Bash uses the Scripts/activate script (NOT the .ps1 file)
source venv/Scripts/activate

# 4. Confirm Python version inside the env
python --version
# Expected: Python 3.12.x

# 5. Install all dependencies
pip install -r requirements.txt
```

> **Why `venv/Scripts/activate` and not `venv/bin/activate`?**  
> On Windows, Python creates `Scripts/` instead of `bin/` even inside Git Bash.  
> The `source` prefix is what Git Bash needs to activate it correctly.

---

### ▶️ Running the Backend

Make sure the virtual environment is **active** (you should see `(venv)` in your prompt).

```bash
# Start the FastAPI dev server with hot reload
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at:

| URL | Description |
|-----|-------------|
| `http://localhost:8000` | Root / health check |
| `http://localhost:8000/docs` | Swagger UI (interactive API docs) |
| `http://localhost:8000/redoc` | ReDoc API documentation |

---

### 🧪 Running Tests

```bash
# Make sure venv is active first
source venv/Scripts/activate

# Run all tests with verbose output
python -m pytest tests/ -v
```

Expected result: **64 passed**

---

### 🔴 Deactivating the Environment

```bash
deactivate
```

---

### 🔁 Full Setup from Scratch (copy-paste)

```bash
cd backend
py -3.12 -m venv venv
source venv/Scripts/activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

---

## 🌐 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`  | `/` | Health check — confirms server + universe loaded |
| `GET`  | `/api/universe/init` | Full graph: metadata + nodes + edges |
| `POST` | `/api/route/find` | Find lowest-latency route between two planets |
| `POST` | `/api/latency/calculate` | Per-hop latency breakdown for a route |
| `POST` | `/api/simulation/send` | Simulate full packet delivery (hop log + translations) |
| `POST` | `/api/simulation/kill/node` | Mark a planet as dead → triggers rerouting |
| `POST` | `/api/simulation/kill/link` | Mark a link as dead → triggers rerouting |
| `POST` | `/api/simulation/reset` | Restore all nodes/links, clear packet log |
| `GET`  | `/api/simulation/state` | Current killed nodes/links + last packet result |

---

## 📦 Dependencies

```
fastapi
uvicorn[standard]
networkx
pydantic
python-multipart
pytest
httpx
```

---

## 📐 Key Rules (DO NOT violate)

- ❌ **Never hardcode** speed of light, tower delay, hop distance limits, or any planet data.  
  All values must be read from `universe-config.json` at runtime.
- ❌ **Never mix** backend logic with UI logic.
- ✅ Packet schema must always contain: `origin_id`, `destination_id`, `current_id`, `payload`, `hop_log`.
- ✅ Latency must be broken down per component: **void**, **atmosphere**, **fiber/crust**, **tower delay**.
- ✅ Any void hop exceeding `max_void_hop_distance_km` must be **rejected** from the graph.
- ✅ A killed node/link must trigger **automatic rerouting**.

---

## 🧮 Latency Components

| Component | Formula |
|-----------|---------|
| Void | `(d_void / c) × 1000` ms |
| Atmosphere | `(h / (c / n)) × 1000` ms — once per planet, each side |
| Fiber/Crust | `(radius / (c × fiber_fraction)) × 1000` ms |
| Tower | `tower_processing_delay_ms` — flat, once per planet visited |

> Rule: **one `T_tower`** per planet visited · **one `T_void`** per void hop. No double-counting.

---

## 🗺️ Config File Location

`universe-config.json` must be at the **project root** (one level above `backend/`):

```
BinaryMinds/
├── backend/
├── frontend/
└── universe-config.json   ← here
```

The parser finds it automatically. Do **not** copy it inside `backend/`.

---

## 🔍 Demo Routes (Verified)

| Scenario | Route |
|----------|-------|
| Normal delivery | `Aegis → Dawn → Caelum` |
| Chaos (Dawn killed) | `Aegis → Elysium → Caelum` |

---

## 👤 Member Ownership

Backend owned by **Member 1**.  
API integration with frontend coordinated by **Member 3**.
