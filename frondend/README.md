# 🌌 BinaryMinds — Frontend (React + Vite + TypeScript)

Interactive visualization dashboard for the interplanetary packet routing system **Zeta-26**.  
Connects to the FastAPI backend, renders the universe graph, animates packet movement, displays codex translations, and allows live failure simulation.

> ⚠️ **Shell**: All commands below are written for **Git Bash on Windows**.  
> Do **not** use PowerShell or CMD for these commands.

---

## 📁 Project Structure

```
frondend/
├── index.html               # App entry point (Vite)
├── package.json             # Node dependencies and scripts
├── tsconfig.json            # TypeScript configuration
├── vite.config.ts           # Vite build configuration
├── .env                     # Local env variables (create from .env.example)
│
├── public/
│   └── universe-config.json # (optional) static fallback config
│
└── src/
    ├── main.tsx             # React root mount
    ├── App.tsx              # App shell + routing
    ├── index.css            # Global styles
    │
    ├── pages/
    │   ├── Dashboard.tsx        # Main overview page
    │   ├── Simulation.tsx       # Live packet simulation view
    │   ├── PacketViewer.tsx     # Hop log and payload inspector
    │   ├── LatencyBreakdown.tsx # Per-hop latency charts
    │   └── FailureSimulation.tsx# Kill node / reroute controls
    │
    ├── components/
    │   ├── UniverseGraph.tsx    # React Flow network graph
    │   ├── PacketAnimation.tsx  # Animated packet movement
    │   ├── HopLog.tsx           # Live hop-by-hop log display
    │   ├── LatencyChart.tsx     # Recharts stacked latency bar
    │   ├── CodexInspector.tsx   # Payload translation viewer
    │   └── ControlPanel.tsx     # Send / Kill / Reroute / Reset buttons
    │
    ├── api/
    │   └── client.ts           # Fetch wrappers for backend API calls
    │
    ├── store/
    │   └── universeStore.ts    # Global state (Zustand or React Context)
    │
    └── types/
        ├── Packet.ts           # Packet type (origin_id, destination_id, etc.)
        ├── Node.ts             # Planet node type
        └── Universe.ts         # Universe metadata type
```

---

## ⚙️ Environment Setup (Git Bash on Windows)

### Prerequisites

| Tool | Version | Check |
|------|---------|-------|
| Node.js | **18+** (LTS) | `node --version` |
| npm | **9+** | `npm --version` |
| Git Bash | any | comes with Git for Windows |

If Node is not installed, download it from [https://nodejs.org](https://nodejs.org) and run the installer.  
After installing, **restart Git Bash** so `node` and `npm` are on PATH.

---

### 📦 Installing Dependencies

```bash
# Navigate into the frontend directory
cd frondend

# Install all packages listed in package.json
npm install
```

---

### 🔧 Environment Variables

The frontend needs to know where the backend is running.  
Create a `.env` file in the `frondend/` directory:

```bash
# Inside frondend/
echo 'VITE_API_BASE_URL=http://localhost:8000' > .env
```

Or create it manually with this content:

```env
VITE_API_BASE_URL=http://localhost:8000
```

> All API calls read `VITE_API_BASE_URL` from this file.  
> **Never hardcode** the backend URL directly in components.

---

### ▶️ Running the Development Server

Make sure the **backend is already running** on port 8000 before starting the frontend.

```bash
# Start the Vite dev server
npm run dev
```

The app will be available at:

| URL | Description |
|-----|-------------|
| `http://localhost:5173` | Vite dev server (default port) |

The dev server supports **hot module replacement (HMR)** — changes appear instantly without full reload.

---

### 🏗️ Building for Production

```bash
npm run build
```

Output goes to `dist/`. To preview the production build locally:

```bash
npm run preview
```

---

### 🔁 Full Setup from Scratch (copy-paste)

```bash
# From the project root (BinaryMinds-LAUNCH-26/)
cd frondend
npm install
echo 'VITE_API_BASE_URL=http://localhost:8000' > .env
npm run dev
```

---

## 🔌 Backend Connection

The frontend talks to the FastAPI backend over REST.  
**Start the backend first**, then the frontend:

```bash
# Terminal 1 — backend
cd backend
source venv/Scripts/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2 — frontend
cd frondend
npm run dev
```

---

## 📐 Tech Stack

| Layer | Library | Purpose |
|-------|---------|---------|
| Framework | **React 18 + Vite** | Fast dev server, component tree |
| Language | **TypeScript** | Type safety across the app |
| Styling | **Tailwind CSS** | Utility-first CSS |
| UI Components | **shadcn/ui** | Accessible, pre-built components |
| Graph Visualization | **React Flow** | Node/edge graph, packet path animation |
| Charts | **Recharts** | Latency breakdown bar charts |
| Animation | **Framer Motion** | Packet movement, state transitions |
| HTTP Client | **Axios** | Backend API calls |
| State | **Zustand** | Universe and simulation state |

---

## 🖼️ Key Pages

| Page | What it shows |
|------|--------------|
| Dashboard | Universe graph — all nodes + links |
| Simulation | Animated packet hop-by-hop with translation + latency live |
| Packet Viewer | Full hop log — payload in source and destination codex at each hop |
| Latency Breakdown | Stacked bar chart per hop (fiber, atmosphere, tower, void) |
| Failure Simulation | Kill node/link → graph updates → route recalculates |

---

## 🎮 Control Panel

| Button | Action |
|--------|--------|
| `Initialize Universe` | Load config → render graph |
| `Send Packet` | Start packet animation on best route |
| `Kill Node / Link` | Remove from graph, trigger reroute |
| `Reroute` | Recalculate path around failure |
| `Reset Simulation` | Restore full graph, clear state |

---

## 🔤 Codex Translation Display

The Codex Inspector shows the payload at every hop:

```
Hop 1: Aegis (base-8) → Dawn (base-6)
  Original:          HELLO
  Encoded (base-6):  200 153 204 204 211
  Decoded at Dawn:   HELLO

Hop 2: Dawn (base-6) → Caelum (base-14)
  Original:          HELLO
  Encoded (base-14): 52 4D 56 56 59
  Decoded at Caelum: HELLO
```

> Judges must see **both** encoded and decoded payload at every hop — never just the final result.

---

## 📐 Key Rules (DO NOT violate)

- ❌ Do **not** hardcode any universe values or API URLs in components.
- ❌ Do **not** hide technical proof (latency numbers, codex output) behind decoration.
- ❌ Do **not** over-animate — smooth, not slow.
- ✅ Every button must do exactly **one** obvious thing.
- ✅ Node failure must be **visually obvious** (color change, red state).
- ✅ The UI must be stable for a **live demo** — no broken states allowed.

---

## 👤 Member Ownership

Frontend owned by **Member 2** (UI, graph, packet inspector, latency display).  
API wiring and testing coordinated by **Member 3**.
