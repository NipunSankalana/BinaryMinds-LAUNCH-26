"""
Universe-level Pydantic models.
All values come from universe-config.json — nothing is hardcoded here.
"""

from __future__ import annotations
from typing import List
from pydantic import BaseModel, Field


class UniverseMetadata(BaseModel):
    system_name: str
    speed_of_light_kms: float = Field(..., gt=0)
    max_void_hop_distance_km: float = Field(..., gt=0)
    coordinate_scale_unit_km: float = Field(..., gt=0)
    tower_processing_delay_ms: float = Field(..., ge=0)
    fiber_speed_fraction: float = Field(..., gt=0, lt=1)


class NodeModel(BaseModel):
    id: str
    codex: int = Field(..., ge=2)           # numerical base used by this planet
    x: float                                # grid coordinate (multiply by scale for km)
    y: float
    radius_km: float = Field(..., gt=0)
    active_towers: int = Field(..., ge=0)
    atmosphere_thickness_km: float = Field(..., ge=0)
    refraction_index: float = Field(..., ge=1.0)


class UniverseConfig(BaseModel):
    universe_metadata: UniverseMetadata
    nodes: List[NodeModel]
