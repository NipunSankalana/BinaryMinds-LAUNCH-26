"""
pytest conftest.py — shared fixtures and test configuration.

Sets UNIVERSE_CONFIG_PATH so all tests can find universe-config.json
regardless of where pytest is invoked from.
"""

import os
from pathlib import Path
import pytest


def pytest_configure(config):
    """
    Called before any test collection.
    Sets the UNIVERSE_CONFIG_PATH environment variable to the known
    location of universe-config.json at the project root.
    """
    # BinaryMinds-LAUNCH-26/backend/conftest.py → walk up to BinaryMinds/
    backend_dir = Path(__file__).resolve().parent          # backend/
    project_root = backend_dir.parent.parent               # BinaryMinds/
    config_path = project_root / "universe-config.json"

    if config_path.exists():
        os.environ["UNIVERSE_CONFIG_PATH"] = str(config_path)
    else:
        # Fallback: try the same level as backend/
        alt = backend_dir.parent / "universe-config.json"
        if alt.exists():
            os.environ["UNIVERSE_CONFIG_PATH"] = str(alt)

    # Clear lru_cache so the env var is picked up on first access
    from services.parser import get_universe
    get_universe.cache_clear()
