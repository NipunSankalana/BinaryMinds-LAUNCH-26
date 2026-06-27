"""
Dijkstra / Graph Engine.
Builds the universe as a NetworkX graph, computes edge weights from the latency model,
and finds the lowest-latency path between two planets.

Edge rule:
  Two planets are directly connectable if and only if their void distance
  does NOT exceed universe_metadata.max_void_hop_distance_km.
  Edges are computed dynamically — they are NOT in universe-config.json.

Routing:
  Dijkstra's algorithm (via NetworkX) is used to find the minimum-weight path.
  Edge weight = total estimated hop latency (ms).
  This means the algorithm optimises for latency, NOT geometric distance.
"""

from __future__ import annotations
from typing import List, Optional, Set, Tuple

import networkx as nx

from models.universe import UniverseConfig, NodeModel
from models.edge import EdgeModel
from services.latency import calc_void_distance, calc_total_hop


# ---------------------------------------------------------------------------
# Graph construction
# ---------------------------------------------------------------------------

def build_graph(
    config: UniverseConfig,
    killed_nodes: Optional[Set[str]] = None,
    killed_edges: Optional[Set[Tuple[str, str]]] = None,
) -> nx.Graph:
    """
    Build a NetworkX undirected weighted graph from the universe config.

    Args:
        config:        The parsed universe configuration.
        killed_nodes:  Set of node IDs to exclude from the graph.
        killed_edges:  Set of (source, target) tuples to exclude.

    Returns:
        A NetworkX Graph with nodes and latency-weighted edges.
    """
    killed_nodes = killed_nodes or set()
    killed_edges = killed_edges or set()

    G = nx.Graph()
    metadata = config.universe_metadata

    # Add all active nodes
    active_nodes = [n for n in config.nodes if n.id not in killed_nodes]
    for node in active_nodes:
        G.add_node(node.id, data=node)

    # Add edges between every pair of active nodes that are within hop range
    for i, src in enumerate(active_nodes):
        for dst in active_nodes[i + 1:]:
            # Skip killed edges (check both directions)
            edge_key = (src.id, dst.id)
            edge_key_rev = (dst.id, src.id)
            if edge_key in killed_edges or edge_key_rev in killed_edges:
                continue

            void_dist = calc_void_distance(src, dst, metadata.coordinate_scale_unit_km)

            # Reject edges that exceed the max void hop distance
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
    """
    Return all valid (non-filtered) edges for the universe.
    Used by the /universe/init endpoint to send graph topology to the frontend.
    """
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


# ---------------------------------------------------------------------------
# Pathfinding
# ---------------------------------------------------------------------------

def find_route(
    config: UniverseConfig,
    origin: str,
    destination: str,
    killed_nodes: Optional[Set[str]] = None,
    killed_edges: Optional[Set[Tuple[str, str]]] = None,
) -> List[str]:
    """
    Find the lowest-latency route from origin to destination.

    Args:
        config:        Universe configuration.
        origin:        Source planet ID.
        destination:   Target planet ID.
        killed_nodes:  Planets to exclude (failure simulation).
        killed_edges:  Links to exclude (failure simulation).

    Returns:
        Ordered list of planet IDs forming the best route.

    Raises:
        ValueError: If origin or destination node does not exist in the config.
        nx.NetworkXNoPath: If no path exists between origin and destination.
    """
    killed_nodes = killed_nodes or set()
    killed_edges = killed_edges or set()

    # Validate node IDs
    node_ids = {n.id for n in config.nodes}
    if origin not in node_ids:
        raise ValueError(f"Origin node '{origin}' not found in universe config.")
    if destination not in node_ids:
        raise ValueError(f"Destination node '{destination}' not found in universe config.")
    if origin in killed_nodes:
        raise ValueError(f"Origin node '{origin}' is currently dead.")
    if destination in killed_nodes:
        raise ValueError(f"Destination node '{destination}' is currently dead.")

    G = build_graph(config, killed_nodes=killed_nodes, killed_edges=killed_edges)

    if origin not in G or destination not in G:
        raise nx.NetworkXNoPath(
            f"No path from '{origin}' to '{destination}' (nodes not in active graph)."
        )

    try:
        path: List[str] = nx.dijkstra_path(G, origin, destination, weight="weight")
    except nx.NetworkXNoPath:
        raise nx.NetworkXNoPath(
            f"No path exists from '{origin}' to '{destination}' "
            f"with current node/link failures."
        )

    return path


def estimate_route_latency(
    config: UniverseConfig,
    route: List[str],
) -> float:
    """
    Sum the edge weights along a given route to get total estimated latency (ms).
    Used for quick route comparison without simulating the full packet.
    """
    G = build_graph(config)
    total = 0.0
    for i in range(len(route) - 1):
        edge_data = G.get_edge_data(route[i], route[i + 1])
        if edge_data is None:
            raise ValueError(
                f"Edge {route[i]} → {route[i+1]} does not exist in the current graph."
            )
        total += edge_data["weight"]
    return round(total, 6)
