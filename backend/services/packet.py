"""
Packet simulation service.
Orchestrates the full packet delivery lifecycle:
  1. Find the best route (Dijkstra)
  2. For each hop: encode payload → compute latency → build HopEntry
  3. Return a complete Packet with hop_log and total latency.

This is the main integration point that calls dijkstra, latency, and translator.
"""

from __future__ import annotations
from typing import List, Optional, Set, Tuple

import networkx as nx

from models.packet import Packet, HopEntry
from models.universe import UniverseConfig, NodeModel
from services.dijkstra import find_route, estimate_route_latency
from services.latency import calc_total_hop, calc_void_distance
from services.translator import translate_hop


def _node_by_id(config: UniverseConfig, node_id: str) -> NodeModel:
    """Helper to retrieve a NodeModel by its id."""
    for node in config.nodes:
        if node.id == node_id:
            return node
    raise ValueError(f"Node '{node_id}' not found in config.")


def simulate_delivery(
    config: UniverseConfig,
    origin: str,
    destination: str,
    payload: str,
    killed_nodes: Optional[Set[str]] = None,
    killed_edges: Optional[Set[Tuple[str, str]]] = None,
) -> Packet:
    """
    Simulate a full packet delivery from origin to destination.

    Steps:
      - Find the lowest-latency route (excludes killed nodes/edges).
      - For each consecutive pair in the route, compute:
          * Codex translation (encode before hop, decode on arrival)
          * Latency breakdown (fiber, atmosphere, void, tower)
          * HopEntry record
      - Sum total latency.
      - Return a Packet with all mandatory fields.

    Args:
        config:        Universe configuration (parsed from json).
        origin:        Source planet ID.
        destination:   Target planet ID.
        payload:       ASCII message to transmit.
        killed_nodes:  Set of dead planet IDs.
        killed_edges:  Set of dead (src, dst) link tuples.

    Returns:
        A fully populated Packet object.

    Raises:
        ValueError: Bad node IDs or config issues.
        nx.NetworkXNoPath: No route exists.
    """
    killed_nodes = killed_nodes or set()
    killed_edges = killed_edges or set()

    # ------------------------------------------------------------------ #
    # Step 1 — Route finding
    # ------------------------------------------------------------------ #
    try:
        route: List[str] = find_route(
            config=config,
            origin=origin,
            destination=destination,
            killed_nodes=killed_nodes,
            killed_edges=killed_edges,
        )
    except nx.NetworkXNoPath as exc:
        # Return a failed packet rather than crashing the API
        return Packet(
            origin_id=origin,
            destination_id=destination,
            current_id=origin,
            payload=payload,
            hop_log=[],
            total_latency_ms=0.0,
            route=[],
            status="failed",
            error=str(exc),
        )
    except ValueError as exc:
        return Packet(
            origin_id=origin,
            destination_id=destination,
            current_id=origin,
            payload=payload,
            hop_log=[],
            total_latency_ms=0.0,
            route=[],
            status="failed",
            error=str(exc),
        )

    # ------------------------------------------------------------------ #
    # Step 2 — Hop-by-hop simulation
    # ------------------------------------------------------------------ #
    metadata = config.universe_metadata
    hop_log: List[HopEntry] = []
    total_latency_ms = 0.0
    current_payload = payload    # always the ASCII original; encoding is per-hop

    for i in range(len(route) - 1):
        src_id = route[i]
        dst_id = route[i + 1]

        src_node = _node_by_id(config, src_id)
        dst_node = _node_by_id(config, dst_id)

        # Codex translation
        encoded, decoded = translate_hop(
            payload=current_payload,
            source_codex=src_node.codex,
            dest_codex=dst_node.codex,
        )

        # Latency calculation
        breakdown, hop_latency_ms = calc_total_hop(src_node, dst_node, metadata)
        void_dist = calc_void_distance(src_node, dst_node, metadata.coordinate_scale_unit_km)

        hop_entry = HopEntry(
            from_node=src_id,
            to_node=dst_id,
            void_distance_km=round(void_dist, 3),
            payload_encoded=encoded,
            payload_decoded=decoded,
            source_codex=src_node.codex,
            dest_codex=dst_node.codex,
            latency_breakdown=breakdown,
            total_hop_latency_ms=hop_latency_ms,
        )
        hop_log.append(hop_entry)
        total_latency_ms += hop_latency_ms
        current_payload = decoded   # carry forward (should equal original)

    # ------------------------------------------------------------------ #
    # Step 3 — Assemble packet
    # ------------------------------------------------------------------ #
    status = "delivered"
    if killed_nodes or killed_edges:
        status = "rerouted"   # flag that chaos was active during this delivery

    return Packet(
        origin_id=origin,
        destination_id=destination,
        current_id=destination,
        payload=payload,
        hop_log=hop_log,
        total_latency_ms=round(total_latency_ms, 6),
        route=route,
        status=status,
        error=None,
    )
