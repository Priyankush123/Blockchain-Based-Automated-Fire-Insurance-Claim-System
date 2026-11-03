from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
import uuid

class SensorData(BaseModel):
    device_id: str
    property_id: str
    temperature: float = Field(..., ge=-50, le=500)
    smoke_level: int = Field(..., ge=0, le=4095)
    flame_detected: bool
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    timestamp: datetime

class StoredSensorData(SensorData):
    reading_id: str
