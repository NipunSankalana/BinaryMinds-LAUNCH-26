@echo off
echo =====================================================================
echo 🌌 Zeta-26 Interplanetary Tactical Routing Engine - Startup
echo =====================================================================
echo.

echo [1/2] Launching FastAPI Backend on http://localhost:8000...
start "FastAPI Backend" cmd /k "cd backend && call .venv\Scripts\activate && uvicorn main:app --reload --host 0.0.0.0 --port 8000"

echo.
echo [2/2] Launching Vite Frontend on http://localhost:5173...
start "Vite Frontend" cmd /k "cd frondend && npm run dev"

echo.
echo =====================================================================
echo ✅ Startup triggers completed!
echo.
echo - Backend: http://localhost:8000 (Swagger docs at /docs)
echo - Frontend: http://localhost:5173
echo =====================================================================
echo.
pause
