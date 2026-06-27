"""
Packet simulation service.
Orchestrates the full packet delivery lifecycle using the tower-based routing model.
"""

from __future__ import annotations
from typing import List, Optional, Set, Tuple

import networkx as nx

from models.packet import Packet, HopEntry, LatencyBreakdown
from models.universe import UniverseConfig, NodeModel
from services.dijkstra import find_route_tower
from services.latency import (
    calc_void_distance,
    calc_void_travel_time,
    calculate_crust_transit_time,
    find_closest_tower_pair,
)
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
    killed_nodes = killed_nodes or set()
    killed_edges = killed_edges or set()

    # ------------------------------------------------------------------ #
    # Step 1 — Route finding using Tower-based Dijkstra
    # ------------------------------------------------------------------ #
    try:
        route, total_latency_ms, entry_tower_map, exit_tower_map = find_route_tower(
            config=config,
            origin_id=origin,
            dest_id=destination,
            killed_nodes=killed_nodes,
            killed_edges=killed_edges,
        )
    except nx.NetworkXNoPath as exc:
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
    c = metadata.speed_of_light_kms
    ff = metadata.fiber_speed_fraction
    td = metadata.tower_processing_delay_ms
    scale = metadata.coordinate_scale_unit_km

    hop_log: List[HopEntry] = []
    current_payload = payload

    for i in range(len(route) - 1):
        src_id = route[i]
        dst_id = route[i + 1]

        src_node = _node_by_id(config, src_id)
        dst_node = _node_by_id(config, dst_id)

        # Codex translation + binary stream serialization
        encoded, decoded, binary_stream = translate_hop(
            payload=current_payload,
            source_codex=src_node.codex,
            dest_codex=dst_node.codex,
        )

        # --- Source planet: ingress tower → egress tower ---
        entry_tower_src = entry_tower_map[src_id]
        exit_tower_src  = exit_tower_map[src_id]
        transit_src = calculate_crust_transit_time(
            src_node, entry_tower_src, exit_tower_src, ff, c, td
        )

        # --- Destination planet ---
        is_last_hop = (i == len(route) - 2)

        if is_last_hop:
            entry_tower_dst = entry_tower_map[dst_id]
            exit_tower_dst  = exit_tower_map[dst_id] # this is end_tower (usually 0)
            transit_dst = calculate_crust_transit_time(
                dst_node, entry_tower_dst, exit_tower_dst, ff, c, td
            )
        else:
            # Relay destination is charged 0 in this hop; it's computed as src in next hop.
            transit_dst = {
                "fiber_time_ms": 0.0,
                "tower_delay_ms": 0.0,
                "total_transit_ms": 0.0,
                "segments": 0,
                "towers_hit": 0,
            }

        # ------------------------------------------------------------------ #
        # Void gap physics
        # ------------------------------------------------------------------ #
        void_dist = calc_void_distance(src_node, dst_node, scale)

        fiber_exit_ms      = transit_src["fiber_time_ms"]
        atmosphere_exit_ms = (src_node.atmosphere_thickness_km * src_node.refraction_index / c) * 1000.0
        void_ms            = (void_dist / c) * 1000.0
        atmosphere_entry_ms = (dst_node.atmosphere_thickness_km * dst_node.refraction_index / c) * 1000.0
        
        fiber_entry_ms     = transit_dst["fiber_time_ms"]
        tower_ms           = transit_src["tower_delay_ms"] + transit_dst["tower_delay_ms"]

        hop_latency_ms = (
            atmosphere_exit_ms
            + void_ms
            + atmosphere_entry_ms
        )

        breakdown = LatencyBreakdown(
            fiber_exit_ms=round(fiber_exit_ms, 6),
            atmosphere_exit_ms=round(atmosphere_exit_ms, 6),
            void_ms=round(void_ms, 6),
            atmosphere_entry_ms=round(atmosphere_entry_ms, 6),
            tower_ms=round(tower_ms, 6),
            fiber_entry_ms=round(fiber_entry_ms, 6),
            src_tower_delay_ms=round(transit_src["tower_delay_ms"], 6),
            dst_tower_delay_ms=round(transit_dst["tower_delay_ms"], 6),
        )

        hop_entry = HopEntry(
            from_node=src_id,
            to_node=dst_id,
            void_distance_km=round(void_dist, 3),
            payload_encoded=encoded,
            payload_decoded=decoded,
            binary_stream=binary_stream,
            source_codex=src_node.codex,
            dest_codex=dst_node.codex,
            latency_breakdown=breakdown,
            total_hop_latency_ms=round(hop_latency_ms, 6),
        )
        hop_log.append(hop_entry)
        current_payload = decoded

    # Calculate Grand Total Latency dynamically: Sum(Tp_nodes) + Sum(T_void_hops)
    total_latency_ms = 0.0
    for entry in hop_log:
        total_latency_ms += entry.latency_breakdown.atmosphere_exit_ms + entry.latency_breakdown.void_ms + entry.latency_breakdown.atmosphere_entry_ms
    for node_id in route:
        node = _node_by_id(config, node_id)
        transit = calculate_crust_transit_time(
            node, entry_tower_map[node_id], exit_tower_map[node_id], ff, c, td
        )
        total_latency_ms += transit["total_transit_ms"]

    # ------------------------------------------------------------------ #
    # Step 3 — Assemble packet
    # ------------------------------------------------------------------ #
    status = "delivered"
    if killed_nodes or killed_edges:
        status = "rerouted"

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
