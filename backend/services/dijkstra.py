"""
Dijkstra / Graph Engine with Tower-based Routing.
"""

from __future__ import annotations
from typing import List, Optional, Set, Tuple

import networkx as nx

from models.universe import UniverseConfig, NodeModel
from models.edge import EdgeModel
from services.latency import (
    calc_void_distance,
    calc_void_travel_time,
    calculate_crust_transit_time,
    find_closest_tower_pair,
    calc_total_hop,
)


def find_route_tower(
    config: UniverseConfig,
    origin_id: str,
    dest_id: str,
    killed_nodes: Set[str],
    killed_edges: Set[Tuple[str, str]],
    start_tower: int = 0,
    end_tower: int = 0,
) -> tuple[List[str], float, dict[str, int], dict[str, int]]:
    metadata = config.universe_metadata
    nodes = config.nodes
    
    speed_of_light = metadata.speed_of_light_kms
    tower_delay = metadata.tower_processing_delay_ms
    max_void_hop = metadata.max_void_hop_distance_km
    scale = metadata.coordinate_scale_unit_km
    fiber_speed_fraction = metadata.fiber_speed_fraction

    node_map = {n.id: n for n in nodes}
    if origin_id not in node_map or dest_id not in node_map:
        raise ValueError("Origin or destination planet not found.")
        
    if origin_id in killed_nodes:
        raise ValueError(f"Origin planet {origin_id} is currently dead.")
    if dest_id in killed_nodes:
        raise ValueError(f"Destination planet {dest_id} is currently dead.")

    dist = {}
    parent = {}
    entry_tower = {}
    exit_tower = {}

    active_nodes = [n for n in active_nodes_list if n.id not in killed_nodes] if 'active_nodes_list' in locals() else [n for n in nodes if n.id not in killed_nodes]
    for n in active_nodes:
        dist[n.id] = float('inf')

    dist[origin_id] = 0.0
    entry_tower[origin_id] = start_tower

    visited = set()

    while len(visited) < len(active_nodes):
        u = None
        min_dist = float('inf')
        for n in active_nodes:
            if n.id not in visited and dist[n.id] < min_dist:
                min_dist = dist[n.id]
                u = n.id
        
        if u is None or min_dist == float('inf'):
            break

        visited.add(u)

        if u == dest_id:
            break

        node_u = node_map[u]
        entry_tower_u = entry_tower[u]

        for node_v in active_nodes:
            if node_v.id in visited or node_v.id == u:
                continue

            if (u, node_v.id) in killed_edges or (node_v.id, u) in killed_edges:
                continue

            void_dist = calc_void_distance(node_u, node_v, scale)

            if void_dist > max_void_hop or void_dist < 0:
                continue

            exit_tower_u, entry_tower_v, _ = find_closest_tower_pair(node_u, node_v, scale)

            # Crust transit on u from entry to exit facing v
            transit_u = calculate_crust_transit_time(
                node_u,
                entry_tower_u,
                exit_tower_u,
                fiber_speed_fraction,
                speed_of_light,
                tower_delay
            )

            void_time = calc_void_travel_time(node_u, node_v, void_dist, speed_of_light)

            # The cost to reach v's ingress tower is the cost to reach u's ingress, plus
            # transit across u, plus void travel to v.
            alt = dist[u] + transit_u["total_transit_ms"] + void_time

            if alt < dist[node_v.id]:
                dist[node_v.id] = alt
                parent[node_v.id] = u
                entry_tower[node_v.id] = entry_tower_v
                exit_tower[u] = exit_tower_u

    if dist.get(dest_id, float('inf')) == float('inf'):
        raise nx.NetworkXNoPath(f"No path exists from '{origin_id}' to '{dest_id}'")

    path = []
    curr = dest_id
    while curr is not None:
        path.insert(0, curr)
        curr = parent.get(curr)

    # Re-populate exit_tower for the chosen path to ensure they are correct
    for i in range(len(path) - 1):
        u = path[i]
        v = path[i + 1]
        exit_tower[u], _, _ = find_closest_tower_pair(node_map[u], node_map[v], scale)

    dest_node = node_map[dest_id]
    dest_entry_tower = entry_tower[dest_id]
    exit_tower[dest_id] = end_tower

    dest_transit = calculate_crust_transit_time(
        dest_node,
        dest_entry_tower,
        end_tower,
        fiber_speed_fraction,
        speed_of_light,
        tower_delay
    )

    total_latency_ms = dist[dest_id] + dest_transit["total_transit_ms"]

    return path, total_latency_ms, entry_tower, exit_tower


def build_graph(
    config: UniverseConfig,
    killed_nodes: Optional[Set[str]] = None,
    killed_edges: Optional[Set[Tuple[str, str]]] = None,
) -> nx.Graph:
    killed_nodes = killed_nodes or set()
    killed_edges = killed_edges or set()

    G = nx.Graph()
    metadata = config.universe_metadata

    active_nodes = [n for n in config.nodes if n.id not in killed_nodes]
    for node in active_nodes:
        G.add_node(node.id, data=node)

    for i, src in enumerate(active_nodes):
        for dst in active_nodes[i + 1:]:
            edge_key = (src.id, dst.id)
            edge_key_rev = (dst.id, src.id)
            if edge_key in killed_edges or edge_key_rev in killed_edges:
                continue

            void_dist = calc_void_distance(src, dst, metadata.coordinate_scale_unit_km)

            if void_dist > metadata.max_void_hop_distance_km:
                continue

            _, weight_ms = calc_total_hop(src, dst, metadata)

            G.add_edge(
                src.id,
                dst.id,
                weight=weight_ms,
                void_distance_km=void_dist,
            )

    return G


def get_all_edges(config: UniverseConfig) -> List[EdgeModel]:
    G = build_graph(config)
    edges: List[EdgeModel] = []
    for src, dst, data in G.edges(data=True):
        edges.append(
            EdgeModel(
                source=src,
                target=dst,
                void_distance_km=round(data["void_distance_km"], 3),
                weight_ms=round(data["weight"], 6),
            )
        )
    return edges


def find_route(
    config: UniverseConfig,
    origin: str,
    destination: str,
    killed_nodes: Optional[Set[str]] = None,
    killed_edges: Optional[Set[Tuple[str, str]]] = None,
) -> List[str]:
    killed_nodes = killed_nodes or set()
    killed_edges = killed_edges or set()
    path, _, _, _ = find_route_tower(config, origin, destination, killed_nodes, killed_edges)
    return path


def estimate_route_latency(
    config: UniverseConfig,
    route: List[str],
) -> float:
    if not route:
        return 0.0
    
    metadata = config.universe_metadata
    nodes = config.nodes
    speed_of_light = metadata.speed_of_light_kms
    tower_delay = metadata.tower_processing_delay_ms
    scale = metadata.coordinate_scale_unit_km
    fiber_speed_fraction = metadata.fiber_speed_fraction

    node_map = {n.id: n for n in nodes}

    dist = 0.0
    current_entry_tower = 0

    for i in range(len(route) - 1):
        u = route[i]
        v = route[i + 1]
        node_u = node_map[u]
        node_v = node_map[v]

        exit_tower_u, entry_tower_v, _ = find_closest_tower_pair(node_u, node_v, scale)
        transit_u = calculate_crust_transit_time(
            node_u,
            current_entry_tower,
            exit_tower_u,
            fiber_speed_fraction,
            speed_of_light,
            tower_delay
        )
        void_dist = calc_void_distance(node_u, node_v, scale)
        void_time = calc_void_travel_time(node_u, node_v, void_dist, speed_of_light)

        dist += transit_u["total_transit_ms"] + void_time
        current_entry_tower = entry_tower_v

    dest_node = node_map[route[-1]]
    dest_transit = calculate_crust_transit_time(
        dest_node,
        current_entry_tower,
        0,
        fiber_speed_fraction,
        speed_of_light,
        tower_delay
    )
    dist += dest_transit["total_transit_ms"]
    return round(dist, 6)
