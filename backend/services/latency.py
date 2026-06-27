"""
Latency engine — physics calculations for each hop component.
All formulas use values from UniverseMetadata; nothing is hardcoded.

Per-hop latency components:
  T_fiber_exit    : crust transit leaving source planet
  T_atm_exit      : atmosphere exit on source side
  T_void          : void travel (speed of light, no medium)
  T_atm_entry     : atmosphere entry on destination side
  T_tower         : tower processing delay at destination (flat, once per planet visited)
  T_fiber_entry   : crust transit entering destination planet

Rule: one T_tower per planet VISITED, one T_void per void HOP.
      Do NOT apply T_tower to the origin on departure — only to each planet the packet
      enters (i.e., every node after the first one in the route).
"""

from __future__ import annotations
import math
from models.universe import UniverseMetadata, NodeModel
from models.packet import LatencyBreakdown


# ---------------------------------------------------------------------------
# Pure calculation functions
# ---------------------------------------------------------------------------

def calc_void(void_distance_km: float, speed_of_light_kms: float) -> float:
    """
    Void travel time in milliseconds.
      T_void = (d_void / c) * 1000
    """
    if void_distance_km <= 0:
        return 0.0
    return (void_distance_km / speed_of_light_kms) * 1000.0


def calc_atmosphere(
    atmosphere_thickness_km: float,
    refraction_index: float,
    speed_of_light_kms: float,
) -> float:
    """
    One-way atmosphere transit time in milliseconds.
    Atmosphere distance is treated as exactly h (the thickness).
      T_atm = (h / (c / n)) * 1000
    Applied once on exit (source) and once on entry (destination) per hop.
    """
    effective_speed = speed_of_light_kms / refraction_index
    return (atmosphere_thickness_km / effective_speed) * 1000.0


def calc_fiber(
    radius_km: float,
    fiber_speed_fraction: float,
    speed_of_light_kms: float,
) -> float:
    """
    Crust / internal fiber transit time in milliseconds.
    Packet travels through the planet body from tower to core and out.
      T_fiber = (radius / (c * fiber_fraction)) * 1000
    Applied once on exit (source) and once on entry (destination) per hop.
    """
    fiber_speed = speed_of_light_kms * fiber_speed_fraction
    return (radius_km / fiber_speed) * 1000.0


def calc_tower(tower_processing_delay_ms: float) -> float:
    """
    Tower processing delay in milliseconds — flat constant per planet visited.
    Read from universe_metadata; never hardcoded.
    """
    return tower_processing_delay_ms


# ---------------------------------------------------------------------------
# Composite: total hop latency
# ---------------------------------------------------------------------------

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
    dx = (dest.x - source.x) * coordinate_scale_unit_km
    dy = (dest.y - source.y) * coordinate_scale_unit_km
    center_to_center = math.sqrt(dx ** 2 + dy ** 2)
    void_dist = (
        center_to_center
        - source.radius_km
        - source.atmosphere_thickness_km
        - dest.radius_km
        - dest.atmosphere_thickness_km
    )
    return max(void_dist, 0.0)   # clamp: planets touching = 0 void gap


def calc_total_hop(
    source: NodeModel,
    dest: NodeModel,
    metadata: UniverseMetadata,
) -> tuple[LatencyBreakdown, float]:
    """
    Compute the full latency breakdown for a single hop (source → dest).

    Returns:
        (LatencyBreakdown, total_ms)
    """
    c = metadata.speed_of_light_kms
    scale = metadata.coordinate_scale_unit_km
    ff = metadata.fiber_speed_fraction
    td = metadata.tower_processing_delay_ms

    void_dist = calc_void_distance(source, dest, scale)

    fiber_exit_ms       = calc_fiber(source.radius_km, ff, c)
    atmosphere_exit_ms  = calc_atmosphere(source.atmosphere_thickness_km, source.refraction_index, c)
    void_ms             = calc_void(void_dist, c)
    atmosphere_entry_ms = calc_atmosphere(dest.atmosphere_thickness_km, dest.refraction_index, c)
    tower_ms            = calc_tower(td)
    fiber_entry_ms      = calc_fiber(dest.radius_km, ff, c)

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
