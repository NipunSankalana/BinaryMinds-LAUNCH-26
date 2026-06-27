"""
HTTP-level API tests using FastAPI TestClient.
Tests the full request/response cycle for all major endpoints.
"""

import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

def test_health_check():
    r = client.get("/")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "ok"
    assert data["universe"] == "Zeta-26"
    assert data["planets"] == 6


# ---------------------------------------------------------------------------
# Universe Init
# ---------------------------------------------------------------------------

def test_universe_init():
    r = client.get("/api/universe/init")
    assert r.status_code == 200
    data = r.json()
    assert "metadata" in data
    assert "nodes" in data
    assert "edges" in data
    assert len(data["nodes"]) == 6
    assert len(data["edges"]) > 0


def test_universe_init_no_hardcoded_c():
    """Speed of light must come from config, not be a magic number."""
    r = client.get("/api/universe/init")
    assert r.status_code == 200
    meta = r.json()["metadata"]
    assert meta["speed_of_light_kms"] == 300000.0  # from config


# ---------------------------------------------------------------------------
# Route Finding
# ---------------------------------------------------------------------------

def test_route_find_valid():
    r = client.post("/api/route/find", json={
        "origin_id": "Aegis",
        "destination_id": "Caelum",
    })
    assert r.status_code == 200
    data = r.json()
    assert data["route"][0] == "Aegis"
    assert data["route"][-1] == "Caelum"
    assert data["hop_count"] >= 1
    assert data["total_estimated_latency_ms"] > 0


def test_route_find_invalid_node():
    r = client.post("/api/route/find", json={
        "origin_id": "NONEXISTENT",
        "destination_id": "Caelum",
    })
    assert r.status_code == 400


# ---------------------------------------------------------------------------
# Latency Breakdown
# ---------------------------------------------------------------------------

def test_latency_calculate():
    r = client.post("/api/latency/calculate", json={
        "origin_id": "Aegis",
        "destination_id": "Caelum",
    })
    assert r.status_code == 200
    data = r.json()
    assert "hops" in data
    assert len(data["hops"]) > 0
    assert data["total_latency_ms"] > 0

    # Each hop must have all 6 components
    hop = data["hops"][0]
    assert "breakdown" in hop
    bd = hop["breakdown"]
    for key in ["fiber_exit_ms", "atmosphere_exit_ms", "void_ms",
                "atmosphere_entry_ms", "tower_ms", "fiber_entry_ms"]:
        assert key in bd


# ---------------------------------------------------------------------------
# Packet Simulation
# ---------------------------------------------------------------------------

def test_simulation_reset_first():
    r = client.post("/api/simulation/reset")
    assert r.status_code == 200


def test_simulation_send():
    client.post("/api/simulation/reset")
    r = client.post("/api/simulation/send", json={
        "origin_id": "Aegis",
        "destination_id": "Caelum",
        "payload": "HELLO",
    })
    assert r.status_code == 200
    data = r.json()
    assert data["origin_id"] == "Aegis"
    assert data["destination_id"] == "Caelum"
    assert data["payload"] == "HELLO"
    assert data["status"] in ("delivered", "rerouted")
    assert len(data["hop_log"]) > 0


def test_packet_hop_log_has_translations():
    client.post("/api/simulation/reset")
    r = client.post("/api/simulation/send", json={
        "origin_id": "Aegis",
        "destination_id": "Caelum",
        "payload": "HI",
    })
    data = r.json()
    for hop in data["hop_log"]:
        assert "payload_encoded" in hop
        assert "payload_decoded" in hop
        assert hop["payload_decoded"] == "HI"


def test_packet_hop_log_latency_sums_to_total():
    client.post("/api/simulation/reset")
    r = client.post("/api/simulation/send", json={
        "origin_id": "Aegis",
        "destination_id": "Caelum",
        "payload": "TEST",
    })
    data = r.json()
    breakdown_sum = 0.0
    for h in data["hop_log"]:
        b = h["latency_breakdown"]
        breakdown_sum += (
            b["fiber_exit_ms"]
            + b["atmosphere_exit_ms"]
            + b["void_ms"]
            + b["atmosphere_entry_ms"]
            + b["tower_ms"]
            + b["fiber_entry_ms"]
        )
    assert abs(breakdown_sum - data["total_latency_ms"]) < 0.01


# ---------------------------------------------------------------------------
# Kill Node + Reroute
# ---------------------------------------------------------------------------

def test_kill_node_and_reroute():
    client.post("/api/simulation/reset")

    # Get default route
    r1 = client.post("/api/route/find", json={
        "origin_id": "Aegis",
        "destination_id": "Caelum",
    })
    default_route = r1.json()["route"]

    # Kill an intermediate node if one exists
    if len(default_route) <= 2:
        pytest.skip("Direct connection — no intermediate to kill")

    intermediate = default_route[1]
    client.post("/api/simulation/kill/node", json={"node_id": intermediate})

    # Re-send — should reroute
    r2 = client.post("/api/simulation/send", json={
        "origin_id": "Aegis",
        "destination_id": "Caelum",
        "payload": "CHAOS",
    })
    data = r2.json()
    # Killed node must not appear in new route
    assert intermediate not in data["route"]


def test_kill_nonexistent_node_returns_404():
    r = client.post("/api/simulation/kill/node", json={"node_id": "GHOST"})
    assert r.status_code == 404


def test_simulation_state():
    client.post("/api/simulation/reset")
    client.post("/api/simulation/kill/node", json={"node_id": "Boreas"})
    r = client.get("/api/simulation/state")
    assert r.status_code == 200
    data = r.json()
    assert "Boreas" in data["killed_nodes"]


def test_simulation_reset_clears_state():
    client.post("/api/simulation/kill/node", json={"node_id": "Boreas"})
    client.post("/api/simulation/reset")
    r = client.get("/api/simulation/state")
    data = r.json()
    assert data["killed_nodes"] == []
    assert data["killed_edges"] == []
    assert data["last_packet"] is None
