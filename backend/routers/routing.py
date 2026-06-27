"""
Routing router — find the best path between two planets.
"""

from __future__ import annotations
from typing import List, Optional, Set, Tuple

import networkx as nx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.parser import get_universe
from services.dijkstra import find_route, estimate_route_latency

router = APIRouter(prefix="/route", tags=["Routing"])


class RouteRequest(BaseModel):
    origin_id: str
    destination_id: str
    killed_nodes: Optional[List[str]] = []
    killed_edges: Optional[List[Tuple[str, str]]] = []


class RouteResponse(BaseModel):
    origin_id: str
    destination_id: str
    route: List[str]
    hop_count: int
    total_estimated_latency_ms: float


@router.post("/find", response_model=RouteResponse, summary="Find Lowest-Latency Route")
def route_find(req: RouteRequest) -> RouteResponse:
    """
    Find the lowest-latency route between two planets using Dijkstra.

    - Respects killed_nodes and killed_edges for failure simulation.
    - Returns 404 if no path exists.
    - Returns 400 if node IDs are invalid.
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

    total_ms = estimate_route_latency(config, route)

    return RouteResponse(
        origin_id=req.origin_id,
        destination_id=req.destination_id,
        route=route,
        hop_count=len(route) - 1,
        total_estimated_latency_ms=total_ms,
    )
