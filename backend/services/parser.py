"""
Universe config parser.
Loads universe-config.json from disk dynamically — no values are hardcoded here.
Raises a clear RuntimeError on startup if the file is missing or malformed.
"""

from __future__ import annotations
import json
import os
from functools import lru_cache
from pathlib import Path

from models.universe import UniverseConfig


def _find_config() -> Path:
    """
    Search for universe-config.json relative to this file's location AND
    relative to the current working directory (important when running pytest
    from within the backend/ folder).

    Priority order:
      1. UNIVERSE_CONFIG_PATH env var (highest priority)
      2. CWD / universe-config.json
      3. CWD parent / universe-config.json
      4. CWD parent parent / universe-config.json
      5. File-relative paths (services/../ etc.)
    """
    here = Path(__file__).resolve().parent        # services/
    cwd  = Path.cwd().resolve()                   # wherever pytest / uvicorn is launched from

    candidates = [
        cwd / "universe-config.json",                    # backend/universe-config.json
        cwd.parent / "universe-config.json",             # BinaryMinds/universe-config.json
        cwd.parent.parent / "universe-config.json",      # Desktop/universe-config.json (fallback)
        here.parent.parent / "universe-config.json",     # BinaryMinds/ (file-relative)
        here.parent / "universe-config.json",            # backend/ (file-relative)
        here / "universe-config.json",                   # services/ (file-relative)
    ]

    # Env var overrides everything
    env_path = os.environ.get("UNIVERSE_CONFIG_PATH")
    if env_path:
        p = Path(env_path)
        if p.exists():
            return p

    for path in candidates:
        if path.exists():
            return path

    raise FileNotFoundError(
        "universe-config.json not found. "
        "Place it at the project root (BinaryMinds/) or set the "
        "UNIVERSE_CONFIG_PATH environment variable."
    )


@lru_cache(maxsize=1)
def get_universe() -> UniverseConfig:
    """
    Load and validate universe-config.json exactly once (cached singleton).
    Call this from any service or router — they all share the same object.

    Raises:
        FileNotFoundError: if the config file cannot be located
        ValueError: if the JSON is malformed or missing required fields
    """
    config_path = _find_config()

    try:
        raw = config_path.read_text(encoding="utf-8")
    except OSError as exc:
        raise RuntimeError(f"Failed to read config file at {config_path}: {exc}") from exc

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ValueError(f"universe-config.json is not valid JSON: {exc}") from exc

    try:
        universe = UniverseConfig(**data)
    except Exception as exc:
        raise ValueError(
            f"universe-config.json has invalid structure: {exc}"
        ) from exc

    return universe


def reload_universe() -> UniverseConfig:
    """Force a fresh load (clears the cache). Useful for testing."""
    get_universe.cache_clear()
    return get_universe()
