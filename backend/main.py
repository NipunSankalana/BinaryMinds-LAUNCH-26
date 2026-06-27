"""
BinaryMinds — Zeta-26 Interplanetary Routing System
FastAPI application entry point.

Start with:
    uvicorn main:app --reload --host 0.0.0.0 --port 8000

Swagger UI:  http://localhost:8000/docs
ReDoc:       http://localhost:8000/redoc
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from services.parser import get_universe
from routers import universe, routing, latency, simulation


# ---------------------------------------------------------------------------
# Lifespan — replaces deprecated @app.on_event("startup")
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Validate universe config at startup. Fail loudly if broken."""
    try:
        config = get_universe()
        print(f"[OK] Universe loaded: {config.universe_metadata.system_name} - {len(config.nodes)} planets ready.")
    except (FileNotFoundError, ValueError, RuntimeError) as exc:
        print(f"[FAIL] STARTUP FAILED: {exc}")
        raise RuntimeError(f"Cannot start server: {exc}") from exc
    yield   # server runs here

# ---------------------------------------------------------------------------
# App init
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Zeta-26 Routing API",
    description=(
        "Interplanetary packet routing system for universe Zeta-26.\n\n"
        "Routes packets between planets, calculates multi-component latency, "
        "translates payloads between codex bases, and simulates node/link failures."
    ),
    version="1.0.0",
    contact={"name": "BinaryMinds", "url": "https://github.com/BinaryMinds"},
    license_info={"name": "MIT"},
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# CORS — allow the Vite frontend on port 5173 (and any other local origin)
# ---------------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",   # Vite dev server
        "http://localhost:3000",   # CRA / Next.js fallback
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------

app.include_router(universe.router, prefix="/api")
app.include_router(routing.router, prefix="/api")
app.include_router(latency.router, prefix="/api")
app.include_router(simulation.router, prefix="/api")


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/", tags=["Health"], summary="Health Check")
async def health_check() -> dict:
    """
    Confirms the server is running and the universe config is loaded.
    """
    config = get_universe()
    return {
        "status": "ok",
        "universe": config.universe_metadata.system_name,
        "planets": len(config.nodes),
        "version": "1.0.0",
    }
