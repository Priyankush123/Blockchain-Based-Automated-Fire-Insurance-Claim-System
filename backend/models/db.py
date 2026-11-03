'''Database connection utilities using SQLModel (SQLite)'''

from pathlib import Path
from sqlmodel import SQLModel, create_engine, Session

from .tables import *
DATABASE_FILE = Path(__file__).resolve().parent.parent / "storage" / "database.db"

# Ensure the storage directory exists
DATABASE_FILE.parent.mkdir(parents=True, exist_ok=True)

# Create the engine; echo=False for less noisy logging
engine = create_engine(f"sqlite:///{DATABASE_FILE}", echo=False)

def init_db() -> None:
    """Create DB tables if they do not exist.
    Call this at application startup.
    """
    SQLModel.metadata.create_all(engine)

def get_session() -> Session:
    """FastAPI dependency that yields a DB session.
    Usage:
        def endpoint(..., session: Session = Depends(get_session)):
            ...
    """
    with Session(engine) as session:
        yield session
