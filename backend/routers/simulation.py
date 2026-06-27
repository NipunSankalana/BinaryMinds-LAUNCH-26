"""
Simulation router — the main demo engine.
Controls packet sending, node/link killing, rerouting, and state inspection.

State is held in-process (module-level sets). For a hackathon this is perfect;
no database needed. State resets on server restart.
"""

from __future__ import annotations
from typing import List, Optional, Set, Tuple

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from models.packet import Packet
from services.parser import get_universe
from services.packet import simulate_delivery

router = APIRouter(prefix="/simulation", tags=["Simulation"])


# ---------------------------------------------------------------------------
# In-process simulation state
# ---------------------------------------------------------------------------

_killed_nodes: Set[str] = set()
_killed_edges: Set[Tuple[str, str]] = set()
_last_packet: Optional[Packet] = None


# ---------------------------------------------------------------------------
# Request / response schemas
# ---------------------------------------------------------------------------

class SendPacketRequest(BaseModel):
    origin_id: str
    destination_id: str
    payload: str = "HELLO"


class KillNodeRequest(BaseModel):
    node_id: str


class KillEdgeRequest(BaseModel):
    source_id: str
    target_id: str


class SimulationStateResponse(BaseModel):
    killed_nodes: List[str]
    killed_edges: List[Tuple[str, str]]
    last_packet: Optional[Packet] = None


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/send", response_model=Packet, summary="Send Packet")
def send_packet(req: SendPacketRequest) -> Packet:
    """
    Simulate a full packet delivery from origin to destination.
    Automatically uses the current killed nodes/edges for rerouting if needed.

    Returns the full Packet with hop_log, per-hop latency, and codex translations.
    """
    global _last_packet

    config = get_universe()

    packet = simulate_delivery(
        config=config,
        origin=req.origin_id,
        destination=req.destination_id,
        payload=req.payload,
        killed_nodes=_killed_nodes.copy(),
        killed_edges=_killed_edges.copy(),
    )

    _last_packet = packet
    return packet


@router.post("/kill/node", response_model=SimulationStateResponse, summary="Kill a Node")
def kill_node(req: KillNodeRequest) -> SimulationStateResponse:
    """
    Mark a planet node as dead. It will be excluded from all future routing.
    Triggers automatic rerouting in subsequent /send calls.
    """
    config = get_universe()
    node_ids = {n.id for n in config.nodes}

    if req.node_id not in node_ids:
        raise HTTPException(
            status_code=404,
            detail=f"Node '{req.node_id}' not found in universe config.",
        )

    _killed_nodes.add(req.node_id)

    return SimulationStateResponse(
        killed_nodes=list(_killed_nodes),
        killed_edges=list(_killed_edges),
        last_packet=_last_packet,
    )


@router.post("/kill/link", response_model=SimulationStateResponse, summary="Kill a Link")
def kill_link(req: KillEdgeRequest) -> SimulationStateResponse:
    """
    Mark a direct link between two planets as dead.
    Both directions are excluded from routing.
    """
    edge: Tuple[str, str] = (req.source_id, req.target_id)
    _killed_edges.add(edge)

    return SimulationStateResponse(
        killed_nodes=list(_killed_nodes),
        killed_edges=list(_killed_edges),
        last_packet=_last_packet,
    )


@router.post("/toggle/link", response_model=SimulationStateResponse, summary="Toggle a Link (kill or restore)")
def toggle_link(req: KillEdgeRequest) -> SimulationStateResponse:
    """
    Toggle the operational state of a link between two planets.
    - If the link is currently DEAD → it is restored (removed from killed set).
    - If the link is currently ALIVE → it is killed (added to killed set).
    Both (A, B) and (B, A) orderings are treated as the same edge.
    """
    edge_ab: Tuple[str, str] = (req.source_id, req.target_id)
    edge_ba: Tuple[str, str] = (req.target_id, req.source_id)

    if edge_ab in _killed_edges:
        _killed_edges.discard(edge_ab)
    elif edge_ba in _killed_edges:
        _killed_edges.discard(edge_ba)
    else:
        # Normalize to alphabetical order for consistent key
        _killed_edges.add(edge_ab)

    return SimulationStateResponse(
        killed_nodes=list(_killed_nodes),
        killed_edges=list(_killed_edges),
        last_packet=_last_packet,
    )


@router.post("/restore/link", response_model=SimulationStateResponse, summary="Restore a Link")
def restore_link(req: KillEdgeRequest) -> SimulationStateResponse:
    """
    Restore a previously killed link between two planets.
    Handles both edge orderings (A→B and B→A).
    """
    edge_ab: Tuple[str, str] = (req.source_id, req.target_id)
    edge_ba: Tuple[str, str] = (req.target_id, req.source_id)
    _killed_edges.discard(edge_ab)
    _killed_edges.discard(edge_ba)

    return SimulationStateResponse(
        killed_nodes=list(_killed_nodes),
        killed_edges=list(_killed_edges),
        last_packet=_last_packet,
    )


@router.post("/reset", response_model=SimulationStateResponse, summary="Reset Simulation")
def reset_simulation() -> SimulationStateResponse:
    """
    Restore all killed nodes and links. Clears the last packet log.
    Use this to return the universe to its initial state for a fresh demo.
    """
    global _last_packet
    _killed_nodes.clear()
    _killed_edges.clear()
    _last_packet = None

    return SimulationStateResponse(
        killed_nodes=[],
        killed_edges=[],
        last_packet=None,
    )


@router.get("/state", response_model=SimulationStateResponse, summary="Get Simulation State")
def get_state() -> SimulationStateResponse:
    """
    Return the current simulation state:
    - Which nodes are dead
    - Which links are dead
    - The most recent packet result
    """
    return SimulationStateResponse(
        killed_nodes=list(_killed_nodes),
        killed_edges=list(_killed_edges),
        last_packet=_last_packet,
    )
