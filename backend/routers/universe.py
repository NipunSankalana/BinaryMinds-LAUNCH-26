"""
Universe router — the first endpoint the frontend calls.
Returns the full universe metadata, node list, and dynamically computed edge list.
"""

from __future__ import annotations
from typing import List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from models.universe import UniverseMetadata, NodeModel, UniverseConfig
from models.edge import EdgeModel
from services.parser import get_universe
from services.dijkstra import get_all_edges

router = APIRouter(prefix="/universe", tags=["Universe"])


class UniverseInitResponse(BaseModel):
    metadata: UniverseMetadata
    nodes: List[NodeModel]
    edges: List[EdgeModel]


@router.get("/init", response_model=UniverseInitResponse, summary="Initialize Universe")
def init_universe() -> UniverseInitResponse:
    """
    Load the universe from config and return the full graph topology.
    This is the bootstrap call — the frontend uses it to render the node graph.

    Returns:
        metadata : Universe constants (speed of light, max hop, etc.)
        nodes    : All planet definitions
        edges    : Dynamically computed valid connections with latency weights
    """
    try:
        config = get_universe()
    except (FileNotFoundError, ValueError, RuntimeError) as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    edges = get_all_edges(config)

    return UniverseInitResponse(
        metadata=config.universe_metadata,
        nodes=config.nodes,
        edges=edges,
    )


@router.post("/update", response_model=UniverseInitResponse, summary="Update Universe Config")
def update_universe(config: UniverseConfig) -> UniverseInitResponse:
    """
    Update the active universe configuration in-memory.
    Recalculates all edges and returns the new topology.
    """
    try:
        from services.parser import set_universe
        set_universe(config)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    edges = get_all_edges(config)

    return UniverseInitResponse(
        metadata=config.universe_metadata,
        nodes=config.nodes,
        edges=edges,
    )


@router.post("/reset", response_model=UniverseInitResponse, summary="Reset Universe to Config file")
def reset_universe_endpoint() -> UniverseInitResponse:
    """Reset the universe configuration to the universe-config.json file on disk."""
    try:
        from services.parser import reload_universe
        config = reload_universe()
    except (FileNotFoundError, ValueError, RuntimeError) as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    edges = get_all_edges(config)

    return UniverseInitResponse(
        metadata=config.universe_metadata,
        nodes=config.nodes,
        edges=edges,
    )


