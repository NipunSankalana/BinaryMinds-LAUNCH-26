"""
Edge model — computed dynamically from node geometry.
Edges are NOT in universe-config.json; they are derived at runtime.
"""

from pydantic import BaseModel, Field


class EdgeModel(BaseModel):
    source: str                          # planet id
    target: str                          # planet id
    void_distance_km: float = Field(..., ge=0)
    weight_ms: float = Field(..., ge=0)  # precomputed latency used as Dijkstra edge weight
