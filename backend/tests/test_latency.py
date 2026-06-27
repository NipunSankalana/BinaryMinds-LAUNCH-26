"""
Tests for services/latency.py
"""

import pytest
from models.universe import UniverseMetadata, NodeModel
from services.latency import (
    calc_void,
    calc_atmosphere,
    calc_fiber,
    calc_tower,
    calc_void_distance,
    calc_total_hop,
)


# ---------------------------------------------------------------------------
# Shared fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def metadata():
    return UniverseMetadata(
        system_name="TestSystem",
        speed_of_light_kms=300000.0,
        max_void_hop_distance_km=50_000_000.0,
        coordinate_scale_unit_km=100_000.0,
        tower_processing_delay_ms=7.0,
        fiber_speed_fraction=0.67,
    )


@pytest.fixture
def aegis():
    return NodeModel(
        id="Aegis", codex=8,
        x=0.0, y=0.0,
        radius_km=6371.0, active_towers=8,
        atmosphere_thickness_km=120.0, refraction_index=1.0003,
    )


@pytest.fixture
def dawn():
    return NodeModel(
        id="Dawn", codex=6,
        x=350.0, y=50.0,
        radius_km=1500.0, active_towers=6,
        atmosphere_thickness_km=30.0, refraction_index=1.011,
    )


# ---------------------------------------------------------------------------
# Unit tests
# ---------------------------------------------------------------------------

def test_calc_void_basic():
    ms = calc_void(300_000.0, 300_000.0)   # 1 second of travel
    assert abs(ms - 1000.0) < 0.001


def test_calc_void_zero():
    assert calc_void(0.0, 300_000.0) == 0.0


def test_calc_atmosphere_no_refraction():
    # n=1 (vacuum-like), h=300 km, c=300000 km/s → 1 ms
    ms = calc_atmosphere(300.0, 1.0, 300_000.0)
    assert abs(ms - 1.0) < 0.0001


def test_calc_fiber_basic():
    # r=300 km, ff=1.0, c=300000 → 1 ms
    ms = calc_fiber(300.0, 1.0, 300_000.0)
    assert abs(ms - 1.0) < 0.0001


def test_calc_tower_returns_delay(metadata):
    assert calc_tower(metadata.tower_processing_delay_ms) == 7.0


def test_void_distance_positive(aegis, dawn, metadata):
    d = calc_void_distance(aegis, dawn, metadata.coordinate_scale_unit_km)
    assert d > 0


def test_total_hop_components_sum(aegis, dawn, metadata):
    breakdown, total = calc_total_hop(aegis, dawn, metadata)
    component_sum = (
        breakdown.fiber_exit_ms
        + breakdown.atmosphere_exit_ms
        + breakdown.void_ms
        + breakdown.atmosphere_entry_ms
        + breakdown.tower_ms
        + breakdown.fiber_entry_ms
    )
    assert abs(component_sum - total) < 0.0001


def test_tower_only_once_per_hop(aegis, dawn, metadata):
    """Tower delay must appear exactly once (at the destination)."""
    breakdown, _ = calc_total_hop(aegis, dawn, metadata)
    assert breakdown.tower_ms == metadata.tower_processing_delay_ms


def test_total_hop_is_positive(aegis, dawn, metadata):
    _, total = calc_total_hop(aegis, dawn, metadata)
    assert total > 0
