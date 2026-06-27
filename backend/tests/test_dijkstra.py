"""
Tests for services/dijkstra.py
"""

import pytest
import networkx as nx

from services.parser import reload_universe
from services.dijkstra import build_graph, find_route, estimate_route_latency, get_all_edges


@pytest.fixture(autouse=True)
def config():
    return reload_universe()


def test_graph_has_nodes(config):
    G = build_graph(config)
    assert G.number_of_nodes() == len(config.nodes)


def test_graph_has_edges(config):
    G = build_graph(config)
    assert G.number_of_edges() > 0


def test_all_edge_weights_positive(config):
    G = build_graph(config)
    for _, _, data in G.edges(data=True):
        assert data["weight"] > 0


def test_no_edge_exceeds_max_hop(config):
    G = build_graph(config)
    max_dist = config.universe_metadata.max_void_hop_distance_km
    for _, _, data in G.edges(data=True):
        assert data["void_distance_km"] <= max_dist


def test_route_aegis_to_caelum(config):
    route = find_route(config, "Aegis", "Caelum")
    assert route[0] == "Aegis"
    assert route[-1] == "Caelum"
    assert len(route) >= 2


def test_route_is_list_of_node_ids(config):
    route = find_route(config, "Aegis", "Dawn")
    node_ids = {n.id for n in config.nodes}
    for node_id in route:
        assert node_id in node_ids


def test_killed_node_excluded(config):
    """Route must not pass through a killed node."""
    # First get the default route
    default_route = find_route(config, "Aegis", "Caelum")

    # Kill the first intermediate node (if any)
    if len(default_route) > 2:
        killed = {default_route[1]}
        rerouted = find_route(config, "Aegis", "Caelum", killed_nodes=killed)
        assert default_route[1] not in rerouted


def test_invalid_origin_raises(config):
    with pytest.raises(ValueError, match="not found"):
        find_route(config, "UNKNOWN_PLANET", "Caelum")


def test_invalid_destination_raises(config):
    with pytest.raises(ValueError, match="not found"):
        find_route(config, "Aegis", "UNKNOWN_PLANET")


def test_estimate_route_latency_positive(config):
    route = find_route(config, "Aegis", "Caelum")
    total = estimate_route_latency(config, route)
    assert total > 0


def test_get_all_edges_returns_list(config):
    edges = get_all_edges(config)
    assert isinstance(edges, list)
    assert len(edges) > 0
    for edge in edges:
        assert edge.weight_ms > 0
        assert edge.void_distance_km >= 0
