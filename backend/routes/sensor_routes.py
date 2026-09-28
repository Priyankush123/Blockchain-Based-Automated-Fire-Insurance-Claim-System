from fastapi import APIRouter, HTTPException
from backend.models.sensor_data import SensorData, StoredSensorData
from backend.storage.memory_store import store
import uuid

router = APIRouter(prefix="/api/sensors", tags=["Sensors"])

@router.post("/data", response_model=StoredSensorData, status_code=201)
def receive_sensor_data(data: SensorData):
    reading_id = str(uuid.uuid4())
    stored_data = StoredSensorData(reading_id=reading_id, **data.model_dump())
    store.save(stored_data)
    return stored_data
