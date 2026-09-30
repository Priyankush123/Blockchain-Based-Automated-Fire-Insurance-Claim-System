from fastapi import APIRouter, HTTPException, Depends
import uuid
import json
import os
from sqlmodel import Session, select
from backend.models.db import get_session
from backend.models.tables import FireEvent, Claim, Policy
from backend.models.sensor_data import SensorData, StoredSensorData
from backend.services.verification_service import verify_fire
from backend.storage.memory_store import store
from backend.services.blockchain_service import register_event
from backend.config import settings

router = APIRouter(prefix="/api", tags=["Fire Verification"])

@router.post("/fire/verify")
def verify_fire_endpoint(data: SensorData, session: Session = Depends(get_session)):
    # Create a stored reading ID
    reading_id = str(uuid.uuid4())
    stored_data = StoredSensorData(reading_id=reading_id, **data.model_dump())
    # Keep in-memory store for backward compatibility
    store.save(stored_data)

    # Run verification (rule + AI)
    result = verify_fire(stored_data)
    status = result["verification_status"]
    verified_flag = status in ["CONFIRMED_FIRE", "POSSIBLE_FIRE"]

    # Persist the event to the DB
    fire_event = FireEvent(
        device_id=stored_data.device_id,
        property_id=stored_data.property_id,
        temperature=stored_data.temperature,
        smoke_level=stored_data.smoke_level,
        flame_detected=stored_data.flame_detected,
        latitude=stored_data.latitude,
        longitude=stored_data.longitude,
        timestamp=stored_data.timestamp,
        verified=verified_flag,
    )
    session.add(fire_event)
    session.commit()
    session.refresh(fire_event)

    # Register event on blockchain
    try:
        bc_res = register_event({
            "device_id": fire_event.device_id,
            "property_id": fire_event.property_id,
            "temperature": fire_event.temperature,
            "smoke_level": fire_event.smoke_level,
            "flame_detected": fire_event.flame_detected,
            "verified": fire_event.verified,
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Blockchain registration failed: {e}")

    return {
        "verification": result,
        "verification_status": status,
        "fire_event_id": fire_event.id,
        "blockchain": bc_res,
    }

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

# CRUD endpoints for fire events
@router.get("/fire/events")
def list_events(session: Session = Depends(get_session)):
    events = session.exec(select(FireEvent)).all()
    return events

@router.get("/fire/events/{event_id}")
def get_event(event_id: str, session: Session = Depends(get_session)):
    event = session.get(FireEvent, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event
