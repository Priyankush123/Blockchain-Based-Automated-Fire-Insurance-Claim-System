from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager
import sys
import os

# Add root directory to path to import ai module
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from ai.inference.ai_service import load_artifacts
from backend.models.db import init_db

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load model on startup
    try:
        load_artifacts()
        init_db()
        app.state.model_loaded = True
    except Exception as e:
        print(f"Failed to load AI model artifacts: {e}")
        app.state.model_loaded = False
        raise RuntimeError(f"Failed to load AI model artifacts: {e}")
    yield
    # Cleanup

from backend.routes.sensor_routes import router as sensor_router
from backend.routes.fire_routes import router as fire_router
from backend.routes.claim_routes import router as claim_router

app = FastAPI(title="Fire Insurance Claim API", lifespan=lifespan)

# Enable CORS for all origins during development and production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sensor_router)
app.include_router(fire_router)
app.include_router(claim_router)

@app.get("/health")
def health_check():
    return {"status": "ok", "model_loaded": getattr(app.state, "model_loaded", False)}

# Mount static frontend build if it exists
frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'frontend', 'dist'))
if os.path.exists(frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Don't intercept API routes
        if full_path.startswith("api") or full_path.startswith("health") or full_path.startswith("docs") or full_path.startswith("openapi.json"):
            return None
        file_path = os.path.join(frontend_dist, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist, "index.html"))
