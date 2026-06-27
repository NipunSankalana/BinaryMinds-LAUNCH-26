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

        # Codex translation
        encoded, decoded = translate_hop(
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
        entry_tower_dst = entry_tower_map[dst_id]

        is_last_hop = (i == len(route) - 2)

        if is_last_hop:
            # At the final destination, packet travels to tower 0 (the "ground station")
            exit_tower_dst = exit_tower_map[dst_id]  # set to 0 by find_route_tower
            transit_dst = calculate_crust_transit_time(
                dst_node, entry_tower_dst, exit_tower_dst, ff, c, td
            )
        else:
            # ── INTERMEDIATE RELAY PLANET ───────────────────────────────────
            # The packet arrives at dst via entry_tower_dst (closest to src's egress).
            # It must cross the ring to the egress tower facing the NEXT hop planet.
            next_id   = route[i + 2]
            next_node = _node_by_id(config, next_id)

            # Egress tower on dst facing next_hop planet
            exit_tower_dst, _, _ = find_closest_tower_pair(dst_node, next_node, scale)

            # Crust transit: ingress → egress across the equatorial fiber ring
            transit_dst = calculate_crust_transit_time(
                dst_node, entry_tower_dst, exit_tower_dst, ff, c, td
            )

            # Update the entry_tower_map so the next iteration uses the correct
            # ingress tower for the relay planet when it becomes 'src'
            entry_tower_map[dst_id] = exit_tower_dst
            exit_tower_map[dst_id]  = exit_tower_dst

        # ------------------------------------------------------------------ #
        # Void gap physics
        # ------------------------------------------------------------------ #
        void_dist = calc_void_distance(src_node, dst_node, scale)

        fiber_exit_ms      = transit_src["fiber_time_ms"]
        atmosphere_exit_ms = (src_node.atmosphere_thickness_km * src_node.refraction_index / c) * 1000.0
        void_ms            = (void_dist / c) * 1000.0
        atmosphere_entry_ms = (dst_node.atmosphere_thickness_km * dst_node.refraction_index / c) * 1000.0
        tower_ms           = transit_src["tower_delay_ms"] + transit_dst["tower_delay_ms"]
        fiber_entry_ms     = transit_dst["fiber_time_ms"]

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

        hop_entry = HopEntry(
            from_node=src_id,
            to_node=dst_id,
            void_distance_km=round(void_dist, 3),
            payload_encoded=encoded,
            payload_decoded=decoded,
            source_codex=src_node.codex,
            dest_codex=dst_node.codex,
            latency_breakdown=breakdown,
            total_hop_latency_ms=round(hop_latency_ms, 6),
        )
        hop_log.append(hop_entry)
        current_payload = decoded

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
