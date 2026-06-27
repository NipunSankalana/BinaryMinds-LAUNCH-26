"""
Latency engine — physics calculations for each hop component.
All formulas use values from UniverseMetadata; nothing is hardcoded.
"""

from __future__ import annotations
import math
from models.universe import UniverseMetadata, NodeModel
from models.packet import LatencyBreakdown


# ---------------------------------------------------------------------------
# Pure calculation functions (legacy / compatibility)
# ---------------------------------------------------------------------------

def calc_void(void_distance_km: float, speed_of_light_kms: float) -> float:
    """Void travel time in milliseconds."""
    if void_distance_km <= 0:
        return 0.0
    return (void_distance_km / speed_of_light_kms) * 1000.0


def calc_atmosphere(
    atmosphere_thickness_km: float,
    refraction_index: float,
    speed_of_light_kms: float,
) -> float:
    """One-way atmosphere transit time in milliseconds."""
    effective_speed = speed_of_light_kms / refraction_index
    return (atmosphere_thickness_km / effective_speed) * 1000.0


def calc_fiber(
    radius_km: float,
    fiber_speed_fraction: float,
    speed_of_light_kms: float,
) -> float:
    """Crust / internal fiber transit time in milliseconds."""
    fiber_speed = speed_of_light_kms * fiber_speed_fraction
    return (radius_km / fiber_speed) * 1000.0


def calc_tower(tower_processing_delay_ms: float) -> float:
    """Tower processing delay in milliseconds."""
    return tower_processing_delay_ms


# ---------------------------------------------------------------------------
# Tower-based calculation functions
# ---------------------------------------------------------------------------

def get_tower_coordinates(
    node: NodeModel,
    tower_index: int,
    scale: float,
) -> tuple[float, float]:
    """
    Calculates coordinates for Tower i on Planet P.
    Towers are placed at equal angular intervals starting from the top (positive y-axis) clockwise.
    """
    N = node.active_towers
    R = node.radius_km
    theta = math.pi / 2.0 - (tower_index * 2.0 * math.pi) / N
    x = node.x * scale + R * math.cos(theta)
    y = node.y * scale + R * math.sin(theta)
    return x, y


def find_closest_tower_pair(
    planetA: NodeModel,
    planetB: NodeModel,
    scale: float,
) -> tuple[int, int, float]:
    """
    Finds the tower pair (one on each planet) that minimizes straight-line distance.
    """
    min_distance = float('inf')
    best_a = 0
    best_b = 0

    for i in range(planetA.active_towers):
        coord_a = get_tower_coordinates(planetA, i, scale)
        for j in range(planetB.active_towers):
            coord_b = get_tower_coordinates(planetB, j, scale)
            dist = math.sqrt((coord_a[0] - coord_b[0]) ** 2 + (coord_a[1] - coord_b[1]) ** 2)
            if dist < min_distance:
                min_distance = dist
                best_a = i
                best_b = j

    return best_a, best_b, min_distance


def calc_void_distance(
    source: NodeModel,
    dest: NodeModel,
    coordinate_scale_unit_km: float,
) -> float:
    """
    Euclidean void distance between two planets (km).
    center_to_center = sqrt((Δx*scale)² + (Δy*scale)²)
    void_distance    = center_to_center − r_source − atm_source − r_dest − atm_dest
    """
    dx = source.x - dest.x
    dy = source.y - dest.y
    center_to_center = math.sqrt(dx ** 2 + dy ** 2) * coordinate_scale_unit_km
    void_dist = (
        center_to_center
        - source.radius_km
        - source.atmosphere_thickness_km
        - dest.radius_km
        - dest.atmosphere_thickness_km
    )
    return max(void_dist, 0.0)


def calc_void_travel_time(
    source: NodeModel,
    dest: NodeModel,
    void_dist: float,
    speed_of_light: float,
) -> float:
    """
    Calculates Atmosphere transit + Void Travel Time in milliseconds.
    """
    h1 = source.atmosphere_thickness_km
    n1 = source.refraction_index
    h2 = dest.atmosphere_thickness_km
    n2 = dest.refraction_index
    time_sec = (h1 * n1 + h2 * n2 + void_dist) / speed_of_light
    return time_sec * 1000.0


def calculate_crust_transit_time(
    node: NodeModel,
    entry_tower: int,
    exit_tower: int,
    fiber_speed_fraction: float,
    speed_of_light: float,
    tower_delay: float,
) -> dict:
    """
    Calculates Crust Transit Time and Tower Delay in milliseconds.
    """
    N = node.active_towers
    r = node.radius_km
    s = min(abs(exit_tower - entry_tower), N - abs(exit_tower - entry_tower))
    if entry_tower == exit_tower:
        m = 1
    else:
        m = s + 1
    segment_distance = (2.0 * math.pi * r * s) / N
    fiber_speed = fiber_speed_fraction * speed_of_light
    fiber_time_ms = (segment_distance / fiber_speed) * 1000.0
    tower_delay_ms = m * tower_delay

    return {
        "fiber_time_ms": fiber_time_ms,
        "tower_delay_ms": tower_delay_ms,
        "total_transit_ms": fiber_time_ms + tower_delay_ms,
        "segments": s,
        "towers_hit": m,
    }


# ---------------------------------------------------------------------------
# Composite: total hop latency
# ---------------------------------------------------------------------------

def calc_total_hop(
    source: NodeModel,
    dest: NodeModel,
    metadata: UniverseMetadata,
) -> tuple[LatencyBreakdown, float]:
    """
    Compute the full latency breakdown for a single hop (source → dest).
    Assumes entry_tower = 0 for source and exit_tower = 0 for dest.
    """
    c = metadata.speed_of_light_kms
    scale = metadata.coordinate_scale_unit_km
    ff = metadata.fiber_speed_fraction
    td = metadata.tower_processing_delay_ms

    best_a, best_b, _ = find_closest_tower_pair(source, dest, scale)
    void_dist = calc_void_distance(source, dest, scale)

    transit_src = calculate_crust_transit_time(source, 0, best_a, ff, c, td)
    transit_dst = calculate_crust_transit_time(dest, best_b, 0, ff, c, td)

    fiber_exit_ms = transit_src["fiber_time_ms"]
    atmosphere_exit_ms = (source.atmosphere_thickness_km * source.refraction_index / c) * 1000.0
    void_ms = (void_dist / c) * 1000.0
    atmosphere_entry_ms = (dest.atmosphere_thickness_km * dest.refraction_index / c) * 1000.0
    tower_ms = transit_src["tower_delay_ms"] + transit_dst["tower_delay_ms"]
    fiber_entry_ms = transit_dst["fiber_time_ms"]

    breakdown = LatencyBreakdown(
        fiber_exit_ms=round(fiber_exit_ms, 6),
        atmosphere_exit_ms=round(atmosphere_exit_ms, 6),
        void_ms=round(void_ms, 6),
        atmosphere_entry_ms=round(atmosphere_entry_ms, 6),
        tower_ms=round(tower_ms, 6),
        fiber_entry_ms=round(fiber_entry_ms, 6),
    )

    total_ms = (
        fiber_exit_ms
        + atmosphere_exit_ms
        + void_ms
        + atmosphere_entry_ms
        + tower_ms
        + fiber_entry_ms
    )

    return breakdown, round(total_ms, 6)
