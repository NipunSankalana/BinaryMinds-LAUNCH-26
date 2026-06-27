## Member 1 — AI Agent Work Brief

### Role 1: Backend Developer

Own the backend structure and API layer.

**Must do**

* Load `universe-config.json` dynamically, with no hardcoded planet data or constants. The config contains `universe_metadata` and node fields like `id`, `codex`, `x`, `y`, `radius_km`, `active_towers`, `atmosphere_thickness_km`, and `refraction_index`. 
* Expose backend endpoints for:

  * initializing the universe
  * finding a route
  * simulating packet delivery
  * killing a node/link
  * returning hop logs and latency breakdown
* Keep the packet schema exactly aligned with the brief: `origin_id`, `destination_id`, `current_id`, `payload`, `hop_log`. 

**Caution**

* Do **not** hardcode speed of light, tower delay, or hop distance limits. They must come from metadata or the stated defaults.
* Do **not** mix backend logic with UI logic.

---

### Role 2: Routing / Graph Algorithm Engineer

Own the pathfinding logic.

**Must do**

* Build the universe as a graph from the config.
* Calculate edge weights using the latency model, then choose the **lowest-latency route**.
* Respect the **maximum void hop distance** rule: any single void hop above the limit must be rejected or routed through intermediates.
* Support rerouting when a node or link becomes unavailable. The brief explicitly asks for **dynamic rerouting** and resilience under failure.

**Caution**

* Don’t assume the shortest geometric path is the best path; the system must optimize for **latency**, not just distance.
* Make the algorithm deterministic for demo consistency.

---

### Role 3: Physics / Latency Engine

Own the math.

**Must do**

* Implement the latency components described in the formula reference:

  * void distance
  * void travel time
  * internal crust transit time
  * tower processing delay
* Use the provided simplifications:

  * atmosphere distance is treated as exactly `h`
  * void distance is center-to-center minus radii and atmospheres
  * tower positions affect tower choice and internal routing, but not void distance itself
* Return a clear breakdown per hop and total latency. The demo must visibly show latency per component. 

**Caution**

* Keep units consistent.
* Do not double-count tower delay.
* Apply the “one `T_p` per planet visited, one `T_v` per void hop” rule exactly.

---

### Role 4: Translation / Encoding Engine

Own codex conversion.

**Must do**

* Convert payloads from ASCII into the next planet’s codex before each void hop, then decode on arrival.
* Preserve the packet content through each hop so the demo can show the active conversion. The brief explicitly expects visible encoding translations at each hop.
* Handle bases like 5, 8, 14, 16, etc.

**Caution**

* Verify base conversions carefully.
* Avoid losing leading-zero-style representations if your UI needs to display them cleanly.

---

### Role 5: Integration / QA Engineer

Own correctness and edge cases.

**Must do**

* Test:

  * normal route success
  * unreachable destinations
  * node failure reroute
  * void-hop limit violation
  * malformed packet input
  * missing/invalid config fields
* Validate the output against the rules in the brief and the formulas file.

**Caution**

* Don’t wait until the end to test.
* Build a few scripted demo cases early.

---

## Member 1 Deliverables

By the end, Member 1 should hand over:

* backend API
* route engine
* latency engine
* translation engine
* failure simulation hooks
* sample JSON response for the frontend
* test cases / demo scenarios
* short backend README

---

## Definition of done

Member 1 is done only when:

* the backend reads the config dynamically,
* route selection works,
* latency is computed and broken down,
* payload translation happens at each hop,
* a failed node/link causes rerouting,
* and the API returns a clean hop log for the UI.