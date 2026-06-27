# 🌌 Relic Ring Protocol — Interplanetary Routing System (Zeta-26)

Welcome to the **BinaryMinds** submission for **Launch 26 (Phase 1)**.

The **Relic Ring Protocol** is an interplanetary packet routing simulator for the Zeta-26 star system. It finds the lowest-latency path across a fragmented legacy network of underground fiber cables and laser transceivers, re-encoding payload dialects at each hop, and dynamically rerouting traffic when hardware nodes fail.

---

## 🚀 Quick Start (Windows)

To start both the backend and frontend concurrently, run the startup script at the root:

```cmd
start.bat
```

This will automatically open two separate Command Prompt windows:
1. **FastAPI Backend** — runs on `http://localhost:8000` (Swagger UI at `/docs`)
2. **React/Vite Frontend** — runs on `http://localhost:5173`

*Prerequisites: Python 3.12, Node.js (LTS), and npm.*

---

## 📁 Repository Structure

```
Project/
├── start.bat                # Windows concurrent startup script
├── universe-config.json     # Dynamic system configuration parameters
├── backend/                 # FastAPI (Python) routing & math services
│   ├── main.py              # Application entry point
│   ├── services/            # Dijkstra, Latency calculation, & Codex engines
│   └── tests/               # 100% pass-rate pytest test suite
└── frontend/                # React (TypeScript) tactical star map visualization
    ├── src/
    │   ├── App.tsx          # Main layout and simulation runner
    │   ├── utils/api.ts     # Client fetch wrappers for backend REST endpoints
    │   └── components/      # Star map, metrics dashboard, log console
```

---

## 🧮 Latency Mathematical Model

The protocol calculates latency for each hop (source $\rightarrow$ destination) based on four components:

1. **Subsurface Fiber Transit ($T_{\text{fiber}}$)**:
   Data travels along the equatorial crust (radius $R$) at a fraction of the speed of light:
   $$T_{\text{fiber}} = \frac{R}{c \times \text{fiber\_speed\_fraction}} \times 1000 \text{ ms}$$
   *Applied once at departure (exit) and once at destination (entry).*

2. **Tower Processing Delay ($T_{\text{tower}}$)**:
   Every planet entered incurs a flat processing penalty:
   $$T_{\text{tower}} = \Delta t = 7.0 \text{ ms}$$
   *Applied once per planet entered (excluding the original departure node).*

3. **Atmospheric Refraction ($T_{\text{atm}}$)**:
   Signals piercing the atmosphere shell ($h$) are slowed by the local refraction index ($n$):
   $$T_{\text{atm}} = \frac{h}{\frac{c}{n}} \times 1000 = \frac{h \times n}{c} \times 1000 \text{ ms}$$
   *Applied once on exit (source) and once on entry (destination).*

4. **Vacuum Void Transmission ($T_{\text{void}}$)**:
   Laser signals crossing the vacuum between planets travel at the speed of light ($c$). The void distance ($L$) is calculated center-to-center minus radii and atmosphere shells:
   $$L = \text{CenterDistance} - (R_1 + h_1) - (R_2 + h_2)$$
   $$T_{\text{void}} = \frac{L}{c} \times 1000 \text{ ms}$$

---

## 🔤 Codex Translation & Encoding

Planets communicate using distinct numerical bases (codices). Before crossing the void, the ASCII message is converted into the destination planet's base, serialized into binary, transmitted, and decoded back into ASCII upon arrival:

*   **Aegis** $\rightarrow$ Base 8 (Octal)
*   **Boreas** $\rightarrow$ Base 5
*   **Dawn** $\rightarrow$ Base 6
*   **Elysium** $\rightarrow$ Base 10 (Decimal)
*   **Fenix** $\rightarrow$ Base 16 (Hexadecimal)
*   **Caelum** $\rightarrow$ Base 14

*Example (Hop Aegis $\rightarrow$ Dawn)*:  
Character `'H'` (ASCII 72) is converted to Base 6 $\rightarrow$ `[2, 0, 0]`, shown in transit as `"200"`.

---

## 🛡️ Resilience & Chaos Testing

- **Void Threshold ($L_{\max}$)**: If the void distance ($L$) between two planets exceeds $50,000,000$ km, the link is discarded. Packets must route through intermediate planets.
- **Failures**: Users can manually disable planet nodes (e.g. Dawn). The backend instantly updates the network topology and Dijkstra algorithm calculates the new lowest-latency path (e.g. Aegis $\rightarrow$ Elysium $\rightarrow$ Caelum).
