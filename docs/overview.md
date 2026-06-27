# Zeta-26 — Project Overview

**BinaryMinds** | Launch 26 · Phase 1

---

## What This Is

An interplanetary packet routing system for universe **Zeta-26**.  
The system finds the lowest-latency path between planets, translates packet payloads between planetary codices at each hop, and reroutes automatically when nodes or links fail.

---

## Planets (Nodes)

| Planet | Codex (Base) | Coordinate (x, y) |
|--------|-------------|-------------------|
| Aegis | 8 | (0, 0) |
| Boreas | 5 | (150, 100) |
| Dawn | 6 | (350, 50) |
| Elysium | 10 | (300, 350) |
| Fenix | 16 | (500, −100) |
| Caelum | 14 | (650, 200) |

Edges are computed dynamically — any two planets within `max_void_hop_distance_km` are connectable.

---

## Universe Constants (from config)

| Constant | Value |
|----------|-------|
| Speed of light | 300,000 km/s |
| Max void hop distance | 50,000,000 km |
| Coordinate scale | 100,000 km/unit |
| Tower processing delay | 7 ms |
| Fiber speed fraction | 0.67 |

> All values are loaded from `universe-config.json` at runtime. Nothing is hardcoded.

---

## Key Features

- **Dynamic routing** — Dijkstra on a latency-weighted graph
- **Latency breakdown** — void, atmosphere, fiber, tower per hop
- **Codex translation** — payload re-encoded at each hop into destination base
- **Failure simulation** — kill a node or link, system reroutes automatically
- **Live demo UI** — animated packet path, hop log, latency charts

---

## Verified Demo Routes

| Scenario | Path |
|----------|------|
| Normal delivery | Aegis → Dawn → Caelum |
| Chaos (Dawn killed) | Aegis → Elysium → Caelum |

---

## Docs Index

| File | Contents |
|------|----------|
| [architecture.md](architecture.md) | System design and component map |
| [api-reference.md](api-reference.md) | All backend endpoints |
| [physics.md](physics.md) | Latency formulas |
| [demo-guide.md](demo-guide.md) | Judging demo script |
