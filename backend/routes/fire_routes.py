from fastapi import APIRouter, HTTPException
from backend.models.sensor_data import SensorData, StoredSensorData
from backend.services.verification_service import verify_fire
from backend.storage.memory_store import store
import uuid
import json
from backend.config import settings
import os

router = APIRouter(prefix="/api", tags=["Fire Verification"])

@router.post("/fire/verify")
def verify_fire_endpoint(data: SensorData):
    reading_id = str(uuid.uuid4())
    stored_data = StoredSensorData(reading_id=reading_id, **data.model_dump())
    store.save(stored_data)
    
    result = verify_fire(stored_data)
    # The output is required to have:
    # input reading, rule verdict, AI confidence + classification, final verification_status, reason
    # My verify_fire returns exactly this shape
    return result

@router.get("/model/info")
def get_model_info():
    try:
        base_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
        path = os.path.join(base_path, settings.metadata_path)
        with open(path, 'r') as f:
            metadata = json.load(f)
        return metadata
    except Exception as e:
        raise HTTPException(status_code=500, detail="Could not load model metadata")
