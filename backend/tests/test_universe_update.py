from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_universe_update_and_revert():
    # 1. Get initial configuration
    r1 = client.get("/api/universe/init")
    initial_data = r1.json()
    assert len(initial_data["nodes"]) > 0

    # 2. Modify one node's radius in config
    modified_config = {
        "universe_metadata": initial_data["metadata"],
        "nodes": [

            {
                "id": "CustomPlanet",
                "codex": 10,
                "x": 100.0,
                "y": 100.0,
                "radius_km": 5000.0,
                "active_towers": 8,
                "atmosphere_thickness_km": 100.0,
                "refraction_index": 1.12,
            }
        ]
    }

    # 3. Post to /update
    r2 = client.post("/api/universe/update", json=modified_config)
    print("RESPONSE BODY:", r2.json())
    assert r2.status_code == 200

    updated_data = r2.json()
    assert len(updated_data["nodes"]) == 1
    assert updated_data["nodes"][0]["id"] == "CustomPlanet"

    # 4. Re-check /init returns the modified config
    r3 = client.get("/api/universe/init")
    assert r3.json()["nodes"][0]["id"] == "CustomPlanet"

    # 5. Clean up by resetting / reloading
    client.post("/api/universe/reset")
    r4 = client.get("/api/universe/init")
    assert len(r4.json()["nodes"]) > 1  # Should be back to default Zeta-26 core nodes

