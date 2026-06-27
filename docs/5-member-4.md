## Member 4 — AI Agent Work Brief

### Role 1: Deployment Engineer

Own the final running version.

**Must do**

* Prepare the app for clean setup and execution on a fresh machine.
* Make sure backend, frontend, and config loading all start without manual fixes.
* Confirm `universe-config.json` is loaded dynamically and the system behaves exactly from config, not hardcoded values.

**Caution**

* Do not leave “works on my machine” problems.
* Avoid any hidden steps only one person knows.

---

### Role 2: Demo Video Producer

Own the 10–15 minute proof video.

**Must do**

* Record the required milestones:

  * Universe Initialization
  * Multi-Hop Proof
  * Latency Breakdown
  * Chaos Test 
* Show the packet path clearly, including route changes after failure.
* Keep the video short, clean, and easy for judges to follow.

**Caution**

* Do not spend too long on intro screens.
* Show the real proof, not only slides.

---

### Role 3: Documentation / Submission Lead

Own the final submission package.

**Must do**

* Finalize the README.
* Add clear setup instructions.
* Explain the routing, latency, translation, and failure handling logic.
* Document all assumptions, because the brief asks for technical accuracy and justification of assumed constants.

**Caution**

* Keep the wording simple and judge-friendly.
* Make sure documentation matches the actual build.

---

### Role 4: UI/Visual Polish Engineer

Own the final look and clarity.

**Must do**

* Improve the dashboard visuals.
* Make the route, packet, and failure states visually obvious.
* Polish labels, spacing, and status indicators.
* Keep the design clean enough for a live demo.

**Caution**

* Do not add clutter.
* Do not hide technical proof behind decoration.

---

### Role 5: Backup / Recovery Planner

Own the safety net.

**Must do**

* Prepare fallback demo routes.
* Prepare one backup failure scenario.
* Keep a backup build/repo snapshot ready.
* Make sure the team can still present if one feature breaks.

**Caution**

* Never rely on one single demo path.
* Always have a backup plan for route failure or UI failure.

---

## Member 4 Deliverables

By the end, Member 4 should hand over:

* deployment-ready build
* demo video
* polished README
* submission checklist
* backup demo cases
* final presentation assets

---

## Definition of done

Member 4 is done only when:

* the project runs cleanly,
* the demo can be recorded smoothly,
* the README is ready,
* the UI is polished,
* and the team has a backup plan for presentation day.