# Demo Guide

A focused script for the judging demo. Four required milestones, in order.

---

## Pre-Demo Checklist

```bash
# Terminal 1 — backend
cd backend
source venv/Scripts/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2 — frontend
cd frontend
npm run dev
```

Confirm:
- [ ] `http://localhost:8000` returns `{ "status": "ok" }`
- [ ] `http://localhost:5173` loads the dashboard
- [ ] Universe graph renders all 6 planets

---

## Milestone 1 — Universe Initialization

**What to show:** The system reads `universe-config.json` dynamically and builds the graph.

**Steps:**
1. Open the dashboard
2. Click **Initialize Universe**
3. Show the planet graph with all 6 nodes and their connections

**What to say:**  
> "The universe is loaded entirely from config — no values are hardcoded.  
> Edges are computed dynamically based on void hop distance limits."

**API call:** `GET /api/universe/init`

---

## Milestone 2 — Multi-Hop Proof

**What to show:** A packet travels through multiple hops with codex translation at each one.

**Steps:**
1. Set origin: **Aegis**, destination: **Caelum**, payload: `HELLO`
2. Click **Send Packet**
3. Show the animated route: Aegis → Dawn → Caelum
4. Open the Packet Viewer and show hop log

**What to point out:**
- Route taken: `Aegis → Dawn → Caelum`
- Hop 1 translation: `HELLO` → base-6 → `200 153 204 204 211` → decoded back to `HELLO`
- Hop 2 translation: `HELLO` → base-14 → `52 4D 56 56 59` → decoded back to `HELLO`

**API call:** `POST /api/simulation/send`

---

## Milestone 3 — Latency Breakdown

**What to show:** Every latency component is calculated and displayed separately.

**Steps:**
1. Stay on the same delivery result (or trigger another send)
2. Switch to the **Latency Breakdown** panel
3. Walk through the chart for Hop 1 (Aegis → Dawn)

**Component values for Aegis → Dawn:**
| Component | Value |
|-----------|-------|
| Fiber exit (Aegis crust) | 31.70 ms |
| Atmosphere exit | 0.40 ms |
| Void travel | 117,824.39 ms |
| Atmosphere entry | 0.10 ms |
| Tower processing | 7.00 ms |
| Fiber entry (Dawn crust) | 7.46 ms |
| **Hop total** | **117,871.05 ms** |

**What to say:**  
> "Each component is computed independently from the config constants.  
> Tower delay is applied once per planet entered, not on departure."

**API call:** `POST /api/latency/calculate`

---

## Milestone 4 — Chaos Test

**What to show:** A node is killed mid-simulation, and the system automatically reroutes.

**Steps:**
1. Click **Kill Node → Dawn**
2. Resend the same packet: **Aegis → Caelum**, payload `HELLO`
3. Show the new route in the animation

**Expected reroute:** `Aegis → Elysium → Caelum`

**What to point out:**
- Dawn is visually removed / marked dead on the graph
- The new route avoids Dawn entirely
- The system still delivers the packet successfully
- Status in response: `"rerouted"`

**API call sequence:**
```
POST /api/simulation/kill/node  { "node_id": "Dawn" }
POST /api/simulation/send       { "origin_id": "Aegis", "destination_id": "Caelum", "payload": "HELLO" }
```

---

## Reset Between Demos

```
POST /api/simulation/reset
```

Or click **Reset Simulation** in the UI.  
All nodes and links are restored, last packet is cleared.

---

## Backup Routes

If the primary demo path has issues:

| Primary | Backup |
|---------|--------|
| Aegis → Caelum | Aegis → Fenix |
| Kill Dawn | Kill Boreas |

Always test at least one backup before the live demo.

---

## Judging Criteria Mapping

| Criterion | Where it's shown |
|-----------|-----------------|
| Correct route finding | Milestone 2 — route matches Dijkstra output |
| Latency accuracy | Milestone 3 — 6-component breakdown |
| Codex translation | Milestone 2 — Packet Viewer per-hop encoding |
| Rerouting under failure | Milestone 4 — Chaos Test |
| Config-driven (no hardcoding) | Milestone 1 — Universe Init |
