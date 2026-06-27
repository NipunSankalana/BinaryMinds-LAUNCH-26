"""
Packet models — mandatory schema from the challenge brief.
Every packet must carry: origin_id, destination_id, current_id, payload, hop_log.
"""

from __future__ import annotations
from typing import List, Optional
from pydantic import BaseModel


class LatencyBreakdown(BaseModel):
    """Per-hop latency split into its independent components (ms)."""
    fiber_exit_ms: float       # crust transit leaving source planet
    atmosphere_exit_ms: float  # atmosphere exit on source side
    void_ms: float             # void travel time (center-to-center minus radii + atms)
    atmosphere_entry_ms: float # atmosphere entry on destination side
    tower_ms: float            # tower processing delay at destination
    fiber_entry_ms: float      # crust transit entering destination planet
    src_tower_delay_ms: Optional[float] = 0.0
    dst_tower_delay_ms: Optional[float] = 0.0


class HopEntry(BaseModel):
    """A single hop in the packet's journey."""
    from_node: str
    to_node: str
    void_distance_km: float
    payload_encoded: str       # payload encoded in destination planet's codex (before hop)
    payload_decoded: str       # payload decoded back to ASCII at destination
    binary_stream: str         # flat binary bit-stream serialized for laser void transmission
    source_codex: int          # base used by source planet
    dest_codex: int            # base used by destination planet
    latency_breakdown: LatencyBreakdown
    total_hop_latency_ms: float


class Packet(BaseModel):
    """
    The packet schema exactly as required by the challenge brief.
    origin_id, destination_id, current_id, payload, hop_log are all mandatory.
    """
    origin_id: str
    destination_id: str
    current_id: str            # last node the packet reached
    payload: str               # original ASCII payload
    hop_log: List[HopEntry]
    total_latency_ms: float
    route: List[str]           # ordered list of node ids in the chosen path
    status: str                # "delivered" | "failed" | "rerouted"
    error: Optional[str] = None
