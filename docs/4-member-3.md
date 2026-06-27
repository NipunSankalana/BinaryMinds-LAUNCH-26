## Member 3 — AI Agent Work Brief

### Role 1: Integration Engineer

Own the glue between backend and frontend.

**Must do**

* Connect the frontend controls to the backend APIs.
* Make sure the universe initialization, route request, packet send, node kill, and reroute actions all work end to end.
* Keep request/response formats aligned with the packet schema and route output. The packet schema is mandatory in the brief.

**Caution**

* Do not let frontend and backend drift into different data formats.
* Test every API response shape before the demo.

---

### Role 2: QA / Test Engineer

Own correctness, edge cases, and bug hunting.

**Must do**

* Test the main flows:

  * valid route delivery
  * unreachable destination
  * max void-hop rejection
  * node failure reroute
  * payload translation at each hop
  * latency breakdown correctness
* Verify the system follows the rules from the brief and formula reference. The challenge explicitly emphasizes latency accuracy, resilience, routing efficiency, and baseline delivery.

**Caution**

* Do not wait until the end to test.
* Keep a small set of repeatable demo scenarios.

---

### Role 3: DevOps / Demo Builder

Own setup, execution, and “it runs on presentation day.”

**Must do**

* Prepare the repo so it can be run quickly from a clean machine.
* Create a simple startup flow for the judges.
* Ensure config loading works from `universe-config.json` without manual edits. The system must parse the config dynamically.
* Help produce the demo video milestones:

  * Universe Initialization
  * Multi-Hop Proof
  * Latency Breakdown
  * Chaos Test 

**Caution**

* No broken install steps.
* No hidden manual setup that only one person knows.

---

### Role 4: Documentation Engineer

Own the README and explanation layer.

**Must do**

* Write a clear README with:

  * project overview
  * setup steps
  * how to run frontend/backend
  * how config parsing works
  * how routing/latency/translation are computed
  * how failure simulation works
* Document the assumptions clearly, because the brief asks for technical accuracy and justification of assumed constants.

**Caution**

* Keep it short enough that a judge can skim it.
* Make sure the README matches the actual implementation.

---

### Role 5: Presentation / Demo Coordinator

Own the final story.

**Must do**

* Prepare the live demo script.
* Decide what each team member shows in sequence.
* Keep the demo focused on the judging criteria:

  * working delivery
  * correct latency
  * rerouting under failure
  * clean documentation. 

**Caution**

* Do not show extra features that distract from the scoring criteria.
* Keep one backup route and one backup failure case ready.

---

## Member 3 Deliverables

By the end, Member 3 should hand over:

* API integration wiring
* test checklist
* bug list and fixes
* startup/run instructions
* README draft
* demo script
* backup demo cases

---

## Definition of done

Member 3 is done only when:

* the backend and frontend talk to each other correctly,
* the main flows are tested,
* the demo can be run cleanly,
* the README is ready,
* and the team has a reliable presentation plan.