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
from services.dijkstra import find_route
from services.latency import calc_total_hop, calc_void_distance

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
        route = find_route(
            config=config,
            origin=req.origin_id,
            destination=req.destination_id,
            killed_nodes=killed_nodes,
            killed_edges=killed_edges,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except nx.NetworkXNoPath as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    metadata = config.universe_metadata
    node_map = {n.id: n for n in config.nodes}

    hops: List[HopLatency] = []
    total_ms = 0.0

    for i in range(len(route) - 1):
        src = node_map[route[i]]
        dst = node_map[route[i + 1]]
        breakdown, hop_ms = calc_total_hop(src, dst, metadata)
        void_dist = calc_void_distance(src, dst, metadata.coordinate_scale_unit_km)

        hops.append(
            HopLatency(
                from_node=src.id,
                to_node=dst.id,
                void_distance_km=round(void_dist, 3),
                breakdown=breakdown,
                total_hop_latency_ms=hop_ms,
            )
        )
        total_ms += hop_ms

    return LatencyResponse(
        route=route,
        hops=hops,
        total_latency_ms=round(total_ms, 6),
    )
