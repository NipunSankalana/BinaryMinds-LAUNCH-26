Here is the clean plan for **today** 🚀

**1) Lock the team and ownership.**
Make sure you have the required **3–6 members from the same university**, and pick **one team leader** as the only contact person. That is explicitly part of the rules. 

**2) Build only the core MVP first.**
The challenge wants a system that reads **`universe-config.json` dynamically**, uses the given universe constants, and does **not hardcode planetary values**. The key physics/settings in the config include **speed of light = 300,000 km/s**, **max void hop distance = 50,000,000 km**, **coordinate scale = 100,000 km**, **tower delay = 7 ms**, and **fiber speed fraction = 0.67**.

**3) Implement the 4 things they will judge hardest.**
Focus on: **correct route finding**, **latency calculation** (fiber, towers, atmosphere, void), **codex/base translation at each hop**, and **rerouting when a node/link is killed**. Those are exactly the high-value criteria in the brief.

**4) Prepare the demo in the order they want to see it.**
Your video should prove: **Universe Initialization**, **Multi-Hop Proof**, **Latency Breakdown**, and **Chaos Test**. That is the safest checklist for today’s work. 

**5) Use a simple winning route for the demo.**
From the provided universe config, a clean demo path is **Aegis → Dawn → Caelum**. It is a good 2-hop route to show translation, hop logging, and rerouting logic without overcomplicating the demo. 

So, for **today**, do this in order: **build the parser, get one route working, show latency per hop, then simulate one failure and reroute**. Everything else is secondary.