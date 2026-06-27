"""
Latency router — compute per-hop and total latency for a route without full packet simulation.
"""

from __future__ import annotations
from typing import List, Optional, Set, Tuple

import networkx as nx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from models.packet import LatencyBreakdown
from services.parser import get_universe
from services.dijkstra import find_route_tower
from services.latency import (
    calc_void_distance,
    calculate_crust_transit_time,
)

router = APIRouter(prefix="/latency", tags=["Latency"])


class LatencyRequest(BaseModel):
    origin_id: str
    destination_id: str
    killed_nodes: Optional[List[str]] = []
    killed_edges: Optional[List[Tuple[str, str]]] = []


class HopLatency(BaseModel):
    from_node: str
    to_node: str
    void_distance_km: float
    breakdown: LatencyBreakdown
    total_hop_latency_ms: float


class LatencyResponse(BaseModel):
    route: List[str]
    hops: List[HopLatency]
    total_latency_ms: float


@router.post("/calculate", response_model=LatencyResponse, summary="Calculate Latency Breakdown")
def calculate_latency(req: LatencyRequest) -> LatencyResponse:
    """
    Return the per-hop latency breakdown for the best route between two planets.
    Each hop shows: fiber_exit, atmosphere_exit, void, atmosphere_entry, tower, fiber_entry.
    """
    config = get_universe()

    killed_nodes: Set[str] = set(req.killed_nodes or [])
    killed_edges: Set[Tuple[str, str]] = set(
        tuple(e) for e in (req.killed_edges or [])  # type: ignore[misc]
    )

    try:
        route, total_latency_ms, entry_tower_map, exit_tower_map = find_route_tower(
            config=config,
            origin_id=req.origin_id,
            dest_id=req.destination_id,
            killed_nodes=killed_nodes,
            killed_edges=killed_edges,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except nx.NetworkXNoPath as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    metadata = config.universe_metadata
    c = metadata.speed_of_light_kms
    ff = metadata.fiber_speed_fraction
    td = metadata.tower_processing_delay_ms
    scale = metadata.coordinate_scale_unit_km

    node_map = {n.id: n for n in config.nodes}
    hops: List[HopLatency] = []

    for i in range(len(route) - 1):
        src_id = route[i]
        dst_id = route[i + 1]
        src_node = node_map[src_id]
        dst_node = node_map[dst_id]

        entry_tower_src = entry_tower_map[src_id]
        exit_tower_src = exit_tower_map[src_id]
        entry_tower_dst = entry_tower_map[dst_id]

        transit_src = calculate_crust_transit_time(src_node, entry_tower_src, exit_tower_src, ff, c, td)

        is_last_hop = (i == len(route) - 2)
        if is_last_hop:
            exit_tower_dst = exit_tower_map[dst_id]
            transit_dst = calculate_crust_transit_time(dst_node, entry_tower_dst, exit_tower_dst, ff, c, td)
        else:
            transit_dst = {"fiber_time_ms": 0.0, "tower_delay_ms": 0.0, "total_transit_ms": 0.0}

        void_dist = calc_void_distance(src_node, dst_node, scale)

        fiber_exit_ms = transit_src["fiber_time_ms"]
        atmosphere_exit_ms = (src_node.atmosphere_thickness_km * src_node.refraction_index / c) * 1000.0
        void_ms = (void_dist / c) * 1000.0
        atmosphere_entry_ms = (dst_node.atmosphere_thickness_km * dst_node.refraction_index / c) * 1000.0
        tower_ms = transit_src["tower_delay_ms"] + transit_dst["tower_delay_ms"]
        fiber_entry_ms = transit_dst["fiber_time_ms"]

        hop_latency_ms = (
            fiber_exit_ms
            + atmosphere_exit_ms
            + void_ms
            + atmosphere_entry_ms
            + tower_ms
            + fiber_entry_ms
        )

        breakdown = LatencyBreakdown(
            fiber_exit_ms=round(fiber_exit_ms, 6),
            atmosphere_exit_ms=round(atmosphere_exit_ms, 6),
            void_ms=round(void_ms, 6),
            atmosphere_entry_ms=round(atmosphere_entry_ms, 6),
            tower_ms=round(tower_ms, 6),
            fiber_entry_ms=round(fiber_entry_ms, 6),
        )

        hops.append(
            HopLatency(
                from_node=src_id,
                to_node=dst_id,
                void_distance_km=round(void_dist, 3),
                breakdown=breakdown,
                total_hop_latency_ms=round(hop_latency_ms, 6),
            )
        )

    return LatencyResponse(
        route=route,
        hops=hops,
        total_latency_ms=round(total_latency_ms, 6),
    )
