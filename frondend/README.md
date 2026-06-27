# 🌌 BinaryMinds — Frontend (React + Vite + TypeScript)

Interactive visualization dashboard for the interplanetary packet routing system **Zeta-26**.  
Connects to the FastAPI backend, renders the universe graph, animates packet movement, displays codex translations, and allows live failure simulation.

---

## 📁 Project Structure

```
frondend/
├── index.html               # App entry point (Vite)
├── package.json             # Node dependencies and scripts
├── tsconfig.json            # TypeScript configuration
├── vite.config.ts           # Vite build configuration
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
    │   └── client.ts           # Axios/fetch wrappers for backend API calls
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

## ⚙️ Environment Setup

### Prerequisites

| Tool | Version |
|------|---------|
| Node.js | **18+** (LTS recommended) |
| npm | **9+** (bundled with Node) |

Check your versions:

```bash
node --version
npm --version
```

> If Node is not installed, download it from [https://nodejs.org](https://nodejs.org)

---

### 📦 Installing Dependencies

```bash
# Navigate to the frontend directory
cd BinaryMinds-LAUNCH-26/frondend

# Install all packages from package.json
npm install
```

---

### ▶️ Running the Development Server

```bash
npm run dev
```

The app will be available at:

| URL | Description |
|-----|-------------|
| `http://localhost:5173` | Vite dev server (default port) |

> The dev server supports **hot module replacement (HMR)** — changes reflect instantly without full reload.

---

### 🏗️ Building for Production

```bash
npm run build
```

Output goes to `dist/`. Preview the production build locally:

```bash
npm run preview
```

---

## 🔌 Backend Connection

The frontend communicates with the FastAPI backend over REST.  
Set the backend base URL in your environment file:

```bash
# Create a local environment file
cp .env.example .env
```

`.env` contents:

```env
VITE_API_BASE_URL=http://localhost:8000
```

> All API calls in `src/api/client.ts` use this variable. **Never hardcode** the backend URL directly in components.

Make sure the **backend is running** before starting the frontend:

```bash
# Backend must be up first (see backend/README.md)
# http://localhost:8000 must be reachable
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
| State | **Zustand** *(or React Context)* | Universe and simulation state |

---

## 🖼️ Key Pages & What They Do

### Dashboard
- Shows the universe graph (all nodes + links)
- Entry point for the live demo

### Simulation
- Animates packet traversal hop by hop
- Lights up each visited node
- Shows translation and latency at each hop in real time

### Packet Viewer
- Displays the full hop log
- Shows payload in both raw and translated codex form at every hop

### Latency Breakdown
- Stacked bar chart (fiber, atmosphere, tower, void) per hop
- Total route latency displayed at the bottom

### Failure Simulation
- "Kill Node" or "Kill Link" buttons
- Graph updates visually, route recalculates, packet continues

---

## 🎮 Control Panel Buttons

| Button | Action |
|--------|--------|
| `Initialize Universe` | Loads config and renders graph |
| `Send Packet` | Starts packet animation along the best route |
| `Kill Node / Link` | Removes selected node/link from graph |
| `Reroute` | Recalculates path around failure |
| `Reset Simulation` | Restores full graph and clears state |

---

## 🔤 Codex Translation Display

At every hop, the **Codex Inspector** panel shows:

```
Hop 1: Aegis → Boreas
  Raw payload:         HELLO
  Encoded (base-8):    110 105 114 114 117
  Transmitted (base-5) 420 410 424 424 432
  Decoded at Boreas:   HELLO
```

> The judge must see **both** the encoded and decoded payload at every hop — never just the final output.

---

## 📐 Key Rules (DO NOT violate)

- ❌ Do **not** hardcode any universe values or API URLs in components.
- ❌ Do **not** hide technical proof behind decoration — latency numbers and codex output must be readable.
- ❌ Do **not** over-animate — keep it smooth but not slow.
- ✅ Every button must do exactly **one** obvious thing.
- ✅ Node failure must be **visually obvious** (color change, strikethrough, red state).
- ✅ The UI must be fully functional for a **live demo** — no broken states.

---

## 👤 Member Ownership

This frontend is the primary responsibility of **Member 2** (UI, visualization, packet inspector, latency display).  
API wiring and testing integration is coordinated by **Member 3**.
