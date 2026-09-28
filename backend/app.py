from fastapi import FastAPI
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
app.include_router(sensor_router)
app.include_router(fire_router)
app.include_router(claim_router)

@app.get("/health")
def health_check():
    return {"status": "ok", "model_loaded": app.state.model_loaded}
