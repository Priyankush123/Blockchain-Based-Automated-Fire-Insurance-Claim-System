"""Tests for Policy and Claim endpoints."""

import pytest
import sys
import os
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

# Mock blockchain service before importing app to avoid requiring a live node
mock_bc = MagicMock(return_value={"tx_hash": "0xabc", "event_id": "0xdef", "receipt": {}})

with patch("backend.services.blockchain_service.w3") as mock_w3, \
     patch("backend.services.blockchain_service.contract") as mock_contract:
    mock_w3.is_connected.return_value = True
    from backend.app import app

client = TestClient(app)

POLICY_PAYLOAD = {
    "temperature_threshold": 60.0,
    "smoke_threshold": 400,
    "required_duration_seconds": 5,
    "payout_amount": 100000.0
}

FIRE_PAYLOAD = {
    "device_id": "ESP32_TEST",
    "property_id": "PROP_TEST",
    "temperature": 90.0,
    "smoke_level": 800,
    "flame_detected": True,
    "timestamp": "2026-09-28T14:00:00"
}


def test_create_policy():
    with TestClient(app) as c:
        response = c.post("/api/policies", json=POLICY_PAYLOAD)
        assert response.status_code == 201
        data = response.json()
        assert "id" in data
        assert data["payout_amount"] == 100000.0


def test_list_policies():
    with TestClient(app) as c:
        c.post("/api/policies", json=POLICY_PAYLOAD)
        response = c.get("/api/policies")
        assert response.status_code == 200
        assert isinstance(response.json(), list)


def test_get_policy_not_found():
    with TestClient(app) as c:
        response = c.get("/api/policies/nonexistent-id")
        assert response.status_code == 404


def test_claim_evaluation_approved():
    with TestClient(app) as c, \
         patch("backend.routes.fire_routes.register_event", return_value={"tx_hash": "0xabc", "event_id": "0xdef", "receipt": {}}):
        # Create policy
        policy_resp = c.post("/api/policies", json=POLICY_PAYLOAD)
        policy_id = policy_resp.json()["id"]

        # Create fire event
        fire_resp = c.post("/api/fire/verify", json=FIRE_PAYLOAD)
        event_id = fire_resp.json()["fire_event_id"]

        # Evaluate claim
        claim_resp = c.post("/api/claims", json={"event_id": event_id, "policy_id": policy_id})
        assert claim_resp.status_code == 201
        claim = claim_resp.json()
        assert claim["status"] in ["approved", "manual_review"]


def test_claim_not_found():
    with TestClient(app) as c:
        response = c.get("/api/claims/nonexistent-id")
        assert response.status_code == 404


def test_list_claims():
    with TestClient(app) as c:
        response = c.get("/api/claims")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
