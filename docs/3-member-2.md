## Member 2 — AI Agent Work Brief

### Role 1: Frontend Developer

Own the full user interface and the visual story of the system.

**Must do**

* Build the main dashboard UI.
* Show the **universe graph/map**, nodes, links, and the current packet path.
* Display the packet state clearly: origin, destination, current node, payload, and hop log. The packet schema is mandatory in the brief. 
* Make the UI responsive enough for a live demo.

**Caution**

* Do not hide important technical data behind pretty visuals.
* Keep the UI simple, readable, and demo-safe.

---

### Role 2: Visualization / Interaction Engineer

Own the live network simulation view.

**Must do**

* Animate packet movement from node to node.
* Highlight the active hop and visited hops.
* Show route changes when a node/link fails.
* Visually prove the full packet path, because the brief explicitly expects users to **visualize the full packet path taken and interact directly with nodes**. 
* Provide click or hover interactions for nodes to show metadata like codex, towers, radius, atmosphere, and refraction.

**Caution**

* Do not over-animate and slow the app down.
* Keep failure states obvious, not confusing.

---

### Role 3: Translation Display / Packet Inspector

Own how codex conversion is shown to the user.

**Must do**

* Display payload transformations at each hop.
* Show the packet in a readable way when it changes between bases/codices.
* Show both the raw payload and the translated payload during transit, because the demo must visibly prove the encoding translations at each hop.
* Make base changes understandable, especially when moving through planets with different codex values.

**Caution**

* Never show only the final output; the judge needs to see the transformation process.
* Make sure numbers are formatted cleanly for each base.

---

### Role 4: Latency UI / Metrics Presenter

Own the visual breakdown of timing.

**Must do**

* Show per-hop latency breakdown:

  * fiber / internal transit
  * tower processing
  * atmosphere
  * void transmission
* Show total latency for the full route.
* Present the numbers in a way that matches the formulas and simplifications from the reference document.
* Add a simple chart or stacked display if time allows.

**Caution**

* Do not invent extra latency components.
* Keep the numbers synced with the backend exactly.

---

### Role 5: Demo / UX Engineer

Own the presentation quality.

**Must do**

* Build the control panel for:

  * initialize universe
  * send packet
  * kill node/link
  * reroute
  * reset simulation
* Make the flow match the four required demo milestones:

  * Universe Initialization
  * Multi-Hop Proof
  * Latency Breakdown
  * Chaos Test 
* Add clear labels and status indicators for live demo use.

**Caution**

* Avoid clutter.
* Every button must do one obvious thing.

---

## Member 2 Deliverables

By the end, Member 2 should hand over:

* the full frontend UI
* interactive graph/map
* packet animation
* payload translation viewer
* latency breakdown panel
* failure simulation controls
* polished demo flow

---

## Definition of done

Member 2 is done only when:

* the system visually shows the route,
* packet movement is obvious,
* translation is visible at each hop,
* latency is readable,
* node failure is interactive,
* and the UI is ready for the live demo.