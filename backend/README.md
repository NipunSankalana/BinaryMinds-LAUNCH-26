# 🛰️ BinaryMinds — Backend (FastAPI)

Interplanetary packet routing engine for universe **Zeta-26**.  
Reads `universe-config.json` dynamically, computes latency, translates codex payloads, and serves REST API endpoints to the frontend.

---

## 📁 Project Structure

```
backend/
├── main.py                  # FastAPI app entry point
├── requirements.txt         # Python dependencies
├── universe-config.json     # Universe definition (loaded at runtime, NOT hardcoded)
│
├── routers/
│   ├── routing.py           # Route-finding endpoints
│   ├── latency.py           # Latency breakdown endpoints
│   └── simulation.py        # Packet send / kill node / reroute endpoints
│
├── services/
│   ├── parser.py            # Loads and validates universe-config.json
│   ├── dijkstra.py          # Graph construction + shortest-latency pathfinding (NetworkX)
│   ├── latency.py           # Latency component calculations
│   ├── translator.py        # Codex base conversion (ASCII ↔ planet codex)
│   └── packet.py            # Packet lifecycle management
│
└── models/
    ├── universe.py          # Universe & metadata Pydantic models
    ├── node.py              # Planet node model
    ├── edge.py              # Link/edge model
    └── packet.py            # Packet schema (origin_id, destination_id, current_id, payload, hop_log)
```

---

## ⚙️ Environment Setup

### Prerequisites

| Tool | Version |
|------|---------|
| Python | **3.12** (recommended) |
| pip | latest |

---

### 🐍 Setting Up with Python 3.12 (Recommended)

If Python 3.12 is installed on your machine, use the following steps to create an isolated virtual environment.

#### Windows (PowerShell)

```powershell
# 1. Navigate to the backend directory
cd BinaryMinds-LAUNCH-26\backend

# 2. Create a virtual environment using Python 3.12 explicitly
py -3.12 -m venv venv

# 3. Activate the virtual environment
.\venv\Scripts\Activate.ps1

# If you get a script execution policy error, run this first:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# 4. Confirm Python version
python --version   # Should print: Python 3.12.x

# 5. Install dependencies
pip install -r requirements.txt
```

#### macOS / Linux (Bash)

```bash
# 1. Navigate to the backend directory
cd BinaryMinds-LAUNCH-26/backend

# 2. Create a virtual environment using Python 3.12 explicitly
python3.12 -m venv venv

# 3. Activate the virtual environment
source venv/bin/activate

# 4. Confirm Python version
python --version   # Should print: Python 3.12.x

# 5. Install dependencies
pip install -r requirements.txt
```

---

### ▶️ Running the Backend

Make sure your virtual environment is **activated** before running.

```bash
# Start the FastAPI dev server (hot reload enabled)
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at:

| URL | Description |
|-----|-------------|
| `http://localhost:8000` | Root / health check |
| `http://localhost:8000/docs` | Swagger UI (interactive API docs) |
| `http://localhost:8000/redoc` | ReDoc API documentation |

---

### 🔴 Deactivating the Environment

```bash
deactivate
```

---

## 🌐 API Endpoints (Planned)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/universe/init` | Load and return the universe graph from config |
| `POST` | `/route/find` | Find the lowest-latency route between two nodes |
| `POST` | `/packet/send` | Simulate packet delivery with full hop log |
| `POST` | `/simulation/kill` | Kill a node or link, trigger reroute |
| `GET` | `/packet/log` | Return the current hop log and latency breakdown |

---

## 📦 Dependencies

```
fastapi
uvicorn[standard]
networkx
pydantic
```

Install all at once:

```bash
pip install -r requirements.txt
```

---

## 📐 Key Rules (DO NOT violate)

- ❌ **Never hardcode** speed of light, tower delay, hop distance limits, or any planet data.  
  All values must be read from `universe-config.json` at runtime.
- ❌ **Never mix** backend logic with UI logic.
- ✅ Packet schema must always contain: `origin_id`, `destination_id`, `current_id`, `payload`, `hop_log`.
- ✅ Latency must be broken down per component: **void**, **atmosphere**, **fiber/crust**, **tower delay**.
- ✅ Any void hop exceeding `max_void_hop_distance_km` must be **rejected**.
- ✅ A killed node/link must trigger **automatic rerouting**.

---

## 🧮 Latency Components

Each hop latency is computed from these independent functions:

| Function | What it computes |
|----------|-----------------|
| `calculate_void()` | Void travel time: center-to-center minus radii and atmospheres, at speed of light |
| `calculate_atmosphere()` | Atmosphere transit: thickness `h` at refracted light speed |
| `calculate_fiber()` | Internal crust transit: at `fiber_speed_fraction × c` |
| `calculate_tower()` | Tower processing delay: `tower_processing_delay_ms` per planet visited |

> ⚠️ Apply **one** `T_tower` per planet visited, **one** `T_void` per void hop. Do not double-count.

---

## 🔤 Codex Translation

At each hop, the payload is re-encoded into the **destination planet's codex** (numerical base) before transmission:

```
ASCII → source codex (base N) → binary stream → void hop → decode → destination codex (base M) → ASCII
```

Supported bases from config: `5`, `6`, `8`, `10`, `14`, `16`

---

## 🗺️ Universe Config Location

The config file must be placed at the **project root** (one level above `backend/`):

```
BinaryMinds-LAUNCH-26/
├── backend/
│   └── ...
├── frontend/
│   └── ...
└── universe-config.json   ← here
```

The parser loads it using a relative path. **Do not duplicate or hardcode** the config inside `backend/`.

---

## 👤 Member Ownership

This backend is the primary responsibility of **Member 1** (algorithms, routing, latency, translation).  
Integration wiring to the frontend is coordinated by **Member 3**.
