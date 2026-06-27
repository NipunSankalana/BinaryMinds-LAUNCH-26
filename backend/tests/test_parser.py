"""
Tests for services/parser.py
"""

import pytest
from services.parser import get_universe, reload_universe


def test_universe_loads():
    config = reload_universe()
    assert config is not None


def test_metadata_fields():
    config = reload_universe()
    m = config.universe_metadata
    assert m.speed_of_light_kms > 0
    assert m.max_void_hop_distance_km > 0
    assert m.coordinate_scale_unit_km > 0
    assert m.tower_processing_delay_ms >= 0
    assert 0 < m.fiber_speed_fraction < 1


def test_nodes_present():
    config = reload_universe()
    assert len(config.nodes) > 0


def test_all_nodes_have_required_fields():
    config = reload_universe()
    for node in config.nodes:
        assert node.id, "Node must have an id"
        assert node.codex >= 2, "Codex must be a valid base"
        assert node.radius_km > 0
        assert node.atmosphere_thickness_km >= 0
        assert node.refraction_index >= 1.0


def test_no_hardcoded_values(tmp_path, monkeypatch):
    """Parser must use whatever values are in the file, not hardcode anything."""
    import json
    custom = {
        "universe_metadata": {
            "system_name": "TestUniverse",
            "speed_of_light_kms": 100000.0,
            "max_void_hop_distance_km": 10000000.0,
            "coordinate_scale_unit_km": 50000.0,
            "tower_processing_delay_ms": 5.0,
            "fiber_speed_fraction": 0.5,
        },
        "nodes": [
            {
                "id": "Alpha",
                "codex": 10,
                "x": 0.0, "y": 0.0,
                "radius_km": 1000.0,
                "active_towers": 2,
                "atmosphere_thickness_km": 50.0,
                "refraction_index": 1.01,
            },
            {
                "id": "Beta",
                "codex": 16,
                "x": 10.0, "y": 0.0,
                "radius_km": 800.0,
                "active_towers": 2,
                "atmosphere_thickness_km": 30.0,
                "refraction_index": 1.005,
            },
        ],
    }
    config_file = tmp_path / "universe-config.json"
    config_file.write_text(json.dumps(custom))
    monkeypatch.setenv("UNIVERSE_CONFIG_PATH", str(config_file))

    cfg = reload_universe()
    assert cfg.universe_metadata.speed_of_light_kms == 100000.0
    assert cfg.universe_metadata.system_name == "TestUniverse"
    assert len(cfg.nodes) == 2

    # Reset for other tests
    reload_universe()
