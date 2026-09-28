"""CRUD routes for Policy and Claim management."""

from fastapi import APIRouter, HTTPException, Depends
from sqlmodel import Session, select
from backend.models.db import get_session
from backend.models.tables import Policy, Claim, FireEvent
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api", tags=["Policies & Claims"])


# ── Policy endpoints ────────────────────────────────────────────────

class PolicyCreate(BaseModel):
    temperature_threshold: float = 60.0
    smoke_threshold: int = 400
    required_duration_seconds: int = 5
    payout_amount: float = 100000.0


@router.post("/policies", response_model=Policy, status_code=201)
def create_policy(data: PolicyCreate, session: Session = Depends(get_session)):
    policy = Policy(**data.model_dump())
    session.add(policy)
    session.commit()
    session.refresh(policy)
    return policy


@router.get("/policies")
def list_policies(session: Session = Depends(get_session)):
    return session.exec(select(Policy)).all()


@router.get("/policies/{policy_id}")
def get_policy(policy_id: str, session: Session = Depends(get_session)):
    policy = session.get(Policy, policy_id)
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
    return policy


@router.delete("/policies/{policy_id}", status_code=204)
def delete_policy(policy_id: str, session: Session = Depends(get_session)):
    policy = session.get(Policy, policy_id)
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
    session.delete(policy)
    session.commit()


# ── Claim endpoints ─────────────────────────────────────────────────

class ClaimCreate(BaseModel):
    event_id: str
    policy_id: str


@router.post("/claims", response_model=Claim, status_code=201)
def evaluate_claim(data: ClaimCreate, session: Session = Depends(get_session)):
    """Evaluate a fire event against a policy and create a Claim record."""
    event = session.get(FireEvent, data.event_id)
    if not event:
        raise HTTPException(status_code=404, detail="FireEvent not found")

    policy = session.get(Policy, data.policy_id)
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")

    # Claim evaluation logic
    temp_ok = event.temperature >= policy.temperature_threshold
    smoke_ok = event.smoke_level >= policy.smoke_threshold
    flame_ok = event.flame_detected

    if event.verified and temp_ok and smoke_ok and flame_ok:
        status = "approved"
        payout = policy.payout_amount
    elif not event.verified:
        status = "rejected"
        payout = 0.0
    else:
        status = "manual_review"
        payout = 0.0

    claim = Claim(
        event_id=data.event_id,
        policy_id=data.policy_id,
        status=status,
        payout_amount=payout,
    )
    session.add(claim)
    session.commit()
    session.refresh(claim)
    return claim


@router.get("/claims")
def list_claims(session: Session = Depends(get_session)):
    return session.exec(select(Claim)).all()


@router.get("/claims/{claim_id}")
def get_claim(claim_id: str, session: Session = Depends(get_session)):
    claim = session.get(Claim, claim_id)
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    return claim
