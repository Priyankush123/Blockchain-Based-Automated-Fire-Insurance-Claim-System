'''ORM definitions for the fire‑insurance system using SQLModel'''

from datetime import datetime
from typing import Optional
from sqlmodel import Field, SQLModel

class FireEvent(SQLModel, table=True):
    """A verified fire‑event that will be recorded on‑chain and used for claim evaluation."""
    id: str = Field(default_factory=lambda: __import__('uuid').uuid4().hex, primary_key=True)
    device_id: str
    property_id: str
    temperature: float = Field(..., ge=-50, le=500)
    smoke_level: int = Field(..., ge=0, le=4095)
    flame_detected: bool
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    verified: bool = False  # set by verification service

class Policy(SQLModel, table=True):
    """Simple policy rule set – can be extended later."""
    id: str = Field(default_factory=lambda: __import__('uuid').uuid4().hex, primary_key=True)
    temperature_threshold: float = 60.0
    smoke_threshold: int = 400
    required_duration_seconds: int = 5
    payout_amount: float = 0.0  # default – can be configured per policy

class Claim(SQLModel, table=True):
    """Result of evaluating a FireEvent against a Policy."""
    id: str = Field(default_factory=lambda: __import__('uuid').uuid4().hex, primary_key=True)
    event_id: str = Field(foreign_key="fireevent.id")
    policy_id: str = Field(foreign_key="policy.id")
    status: str = Field(description="approved / rejected / manual_review")
    payout_amount: float = 0.0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
