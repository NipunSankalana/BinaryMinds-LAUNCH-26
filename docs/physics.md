# Physics & Latency Model

All values come from `universe-config.json`. Nothing is hardcoded.

---

## Coordinate → Distance

Grid coordinates are in abstract units. Convert to km:

```
real_km = coordinate_unit × coordinate_scale_unit_km
```

**Example:** Aegis at (0, 0), Dawn at (350, 50)  
```
Δx = 350 × 100,000 = 35,000,000 km
Δy =  50 × 100,000 =  5,000,000 km
center_to_center = √(35,000,000² + 5,000,000²) = 35,353,000 km
```

---

## Void Distance

The empty space between two planet surfaces (and atmospheres):

```
d_void = center_to_center − r_A − atm_A − r_B − atm_B
```

Where `r` = radius, `atm` = atmosphere thickness.  
Clamped to 0 if planets are physically touching.

> If `d_void > max_void_hop_distance_km` → the edge is **rejected**. No direct connection.

---

## Latency Components

Each hop has **6 independent components** — never combined or approximated:

### 1. Void Travel — `T_void`
```
T_void = (d_void / c) × 1000   [ms]
```
Signal travels at speed of light `c` through vacuum.

### 2. Atmosphere Transit — `T_atm`
```
T_atm = (h / (c / n)) × 1000   [ms]
```
`h` = atmosphere thickness, `n` = refraction index.  
Applied **twice per hop**: once on exit (source) and once on entry (destination).

### 3. Fiber / Crust Transit — `T_fiber`
```
T_fiber = (radius / (c × fiber_fraction)) × 1000   [ms]
```
Signal travels through the planet body at reduced speed.  
Applied **twice per hop**: exit (source crust) and entry (destination crust).

### 4. Tower Processing — `T_tower`
```
T_tower = tower_processing_delay_ms   [ms, flat]
```
Applied **once per planet visited** (at the destination of each hop).  
Do **not** apply to the origin on departure.

---

## Total Hop Latency

```
T_hop = T_fiber_exit + T_atm_exit + T_void + T_atm_entry + T_tower + T_fiber_entry
```

---

## Rules

| Rule | Detail |
|------|--------|
| One `T_void` per hop | Not per planet |
| One `T_tower` per planet entered | Not on departure |
| One `T_atm` exit + one `T_atm` entry per hop | Both sides of the void |
| One `T_fiber` exit + one `T_fiber` entry per hop | Both planets' crusts |

---

## Codex Translation

Each planet communicates in its own numerical base (codex).  
Before a void hop, the payload is re-encoded into the destination planet's base.

```
ASCII payload
  → ordinal of each character
  → convert ordinal to dest_base string
  → space-join tokens
  → transmit
  → parse tokens as dest_base integers
  → chr() each → ASCII
```

**Example: "HELLO" from Aegis (base-8) → Dawn (base-6)**
```
H=72 → base-6: 200
E=69 → base-6: 153
L=76 → base-6: 204
L=76 → base-6: 204
O=79 → base-6: 211

Encoded: "200 153 204 204 211"
Decoded at Dawn: "HELLO"
```

Round-trip guarantee: `decode(encode(text, base), base) == text` for any base ≥ 2.

---

## Edge Weight (for Dijkstra)

Each edge weight = `T_hop` total in ms.  
Dijkstra minimises total weight → finds the **lowest-latency** path, not the shortest geometric path.
