from fastapi.testclient import TestClient
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
from backend.app import app

# TestClient handles startup/lifespan events, but we need to ensure the lifespan manager completes
def test_health():
    with TestClient(app) as client:
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok", "model_loaded": True}

def test_receive_sensor_data_valid():
    with TestClient(app) as client:
        payload = {
            "device_id": "ESP32_001",
            "property_id": "PROP_001",
            "temperature": 82.5,
            "smoke_level": 730,
            "flame_detected": True,
            "latitude": 28.6139,
            "longitude": 77.2090,
            "timestamp": "2026-09-25T15:30:00"
        }
        response = client.post("/api/sensors/data", json=payload)
        assert response.status_code == 201
        data = response.json()
        assert "reading_id" in data
        assert data["temperature"] == 82.5

def test_receive_sensor_data_invalid():
    with TestClient(app) as client:
        payload = {
            "device_id": "ESP32_001",
            "temperature": "not a float",
        }
        response = client.post("/api/sensors/data", json=payload)
        assert response.status_code == 422

def test_model_info():
    with TestClient(app) as client:
        response = client.get("/api/model/info")
        assert response.status_code == 200
        assert "model_type" in response.json()

# Scenario 1: Clean normal
def test_verify_clean_normal():
    with TestClient(app) as client:
        payload = {
            "device_id": "ESP32_001",
            "property_id": "PROP_001",
            "temperature": 25.0,
            "smoke_level": 50,
            "flame_detected": False,
            "timestamp": "2026-09-25T15:30:00"
        }
        response = client.post("/api/fire/verify", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["verification_status"] == "NORMAL"

# Scenario 2: High temp only, no smoke/flame
def test_verify_high_temp_only():
    with TestClient(app) as client:
        payload = {
            "device_id": "ESP32_002",
            "property_id": "PROP_001",
            "temperature": 80.0,
            "smoke_level": 50,
            "flame_detected": False,
            "timestamp": "2026-09-25T15:30:00"
        }
        response = client.post("/api/fire/verify", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["verification_status"] == "MANUAL_REVIEW"

# Scenario 3: High temp + high smoke, no flame
def test_verify_high_temp_high_smoke():
    with TestClient(app) as client:
        payload = {
            "device_id": "ESP32_003",
            "property_id": "PROP_001",
            "temperature": 75.0,
            "smoke_level": 450,
            "flame_detected": False,
            "timestamp": "2026-09-25T15:30:00"
        }
        response = client.post("/api/fire/verify", json=payload)
        assert response.status_code == 200
        data = response.json()
        # rule -> POSSIBLE_FIRE. AI -> POSSIBLE_FIRE or ANOMALY
        # verification_status -> POSSIBLE_FIRE or MANUAL_REVIEW
        assert data["verification_status"] in ["POSSIBLE_FIRE", "MANUAL_REVIEW"]

# Scenario 4: Confirmed fire
def test_verify_confirmed_fire():
    with TestClient(app) as client:
        payload = {
            "device_id": "ESP32_004",
            "property_id": "PROP_001",
            "temperature": 90.0,
            "smoke_level": 800,
            "flame_detected": True,
            "timestamp": "2026-09-25T15:30:00"
        }
        response = client.post("/api/fire/verify", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["verification_status"] == "CONFIRMED_FIRE"

# Scenario 5: Contradictory combination
def test_verify_contradictory():
    with TestClient(app) as client:
        payload = {
            "device_id": "ESP32_005",
            "property_id": "PROP_001",
            "temperature": 150.0,
            "smoke_level": 0,
            "flame_detected": False,
            "timestamp": "2026-09-25T15:30:00"
        }
        response = client.post("/api/fire/verify", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["verification_status"] == "MANUAL_REVIEW"
