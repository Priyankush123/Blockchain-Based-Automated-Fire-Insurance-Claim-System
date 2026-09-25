# AGENT PROMPT — FASTAPI FIRE VERIFICATION SERVICE

============================================================
ROLE
============================================================

You are a backend engineer building the FastAPI service that
exposes the fire verification + AI confidence logic for an
academic prototype: a **Blockchain-Based Automated Fire
Insurance Claim System**.

The AI model, its preprocessing pipeline, and the
`predict_fire_confidence()` function already exist (built in a
prior task — see PRIOR ARTIFACTS below). Your job is to build
the FastAPI layer around it: receive sensor data, run rule-based
verification, call the AI model, merge both verdicts into one
response, and serve it over HTTP.

============================================================
SCOPE (READ CAREFULLY)
============================================================

IN SCOPE:
- Sensor data ingestion endpoint
- Fire verification endpoint (rules + AI merge)
- Request/response validation, error handling, config, tests
- A health/status endpoint

OUT OF SCOPE — do not build these, even if tempted:
- Blockchain / hashing / smart contract calls
- Policy or claim management endpoints
- Authentication/user management (stub only if something must
  reference a user — do not build real auth)
- The React dashboard or any frontend
- Retraining or modifying the AI model itself

If a request seems to need something out of scope, stop and
flag it rather than building it.

============================================================
PRIOR ARTIFACTS (ASSUME THESE EXIST — DO NOT REBUILD)
============================================================

From the completed AI pipeline task:

- `model/best_model.pkl` — trained model (Isolation Forest or
  supervised baseline, whichever was selected)
- `model/preprocessing_pipeline.pkl` — fitted feature
  transformer
- `model/model_metadata.json` — model type, hyperparameters,
  test metrics
- `inference/ai_service.py` — contains:

  ```python
  def predict_fire_confidence(sensor_data: dict) -> dict:
      # returns {"fire_confidence": float, "classification": str}
  ```

If any of these paths differ from what's actually on disk,
adapt the imports/paths — do not regenerate the model.

============================================================
DATA CONTRACT
============================================================

Incoming sensor reading (matches the IoT payload from the
project spec):

```json
{
    "device_id": "ESP32_001",
    "property_id": "PROP_001",
    "temperature": 82.5,
    "smoke_level": 730,
    "flame_detected": true,
    "latitude": 28.6139,
    "longitude": 77.2090,
    "timestamp": "2026-09-25T15:30:00"
}
```

Define this as a Pydantic model with proper types and
validation (temperature/smoke_level as bounded numerics,
timestamp as a real datetime, lat/long optional).

============================================================
REQUIRED ENDPOINTS
============================================================

### 1. `GET /health`

Simple liveness check. Returns service status and confirms the
model loaded successfully at startup (don't reload it per
request — load once at app startup).

### 2. `POST /api/sensors/data`

- Accepts one sensor reading (the schema above).
- Validates it, stores it (in-memory list or SQLite is fine for
  the prototype — do not stand up PostgreSQL for this task).
- Returns 201 with the stored reading and a generated
  `reading_id`.
- Reject malformed payloads with a clear 422 error, not a stack
  trace.

### 3. `POST /api/fire/verify`

This is the core endpoint. Given a sensor reading (or a
`device_id` to look up recent readings — your call, state which
you chose and why):

1. Run the rule-based check (temperature/smoke/flame thresholds
   + duration, loaded from a config file — do NOT hardcode
   thresholds in route code).
2. Call `predict_fire_confidence()` from the AI service.
3. Merge both into one `verification_status`: `CONFIRMED_FIRE`,
   `POSSIBLE_FIRE`, `NORMAL`, or `MANUAL_REVIEW`, following the
   same decision table you used when building the AI merge
   logic (rules pass + high AI confidence → CONFIRMED; rules and
   AI disagree, or AI confidence is moderate → MANUAL_REVIEW;
   etc.). Document this decision table explicitly in a
   docstring or comment — this is the core logic of the whole
   service.
4. Return a response containing: the input reading, rule verdict,
   AI confidence + classification, final `verification_status`,
   and a human-readable `reason` string (e.g. "Conflicting
   sensor evidence" per the project spec's manual-review demo).

### 4. `GET /api/model/info`

Returns the loaded model's metadata (type, version/training
date, key metrics) from `model_metadata.json` — useful for the
dashboard team and for demoing that this isn't a black box.

============================================================
CONFIG
============================================================

Use a `config.py` or `.env` + `pydantic-settings` for:
- verification thresholds (temperature_threshold,
  smoke_threshold, required_duration_seconds)
- model artifact paths
- storage backend (in-memory vs SQLite path)

No thresholds or paths hardcoded inline in route/service files.

============================================================
ERROR HANDLING
============================================================

Handle explicitly, with clean JSON error responses (never a raw
traceback):
- Malformed/missing sensor fields
- Model file missing or fails to load at startup (fail fast with
  a clear error, don't silently serve broken predictions)
- Out-of-range sensor values
- Duplicate readings from the same device within an
  implausibly short window (basic idempotency — log and note it,
  full duplicate-protection logic can stay simple for the
  prototype)

============================================================
TESTING
============================================================

Use FastAPI's `TestClient`. Cover:

1. `GET /health` returns 200 and model-loaded confirmation
2. Valid sensor reading → 201 on `/api/sensors/data`
3. Malformed reading → 422 with a useful error message
4. The six verification scenarios from the AI testing phase
   (normal / high-temp-only / temp+smoke / confirmed fire /
   contradictory data / edge cases) run through
   `/api/fire/verify` end-to-end and produce the expected
   `verification_status`
5. `GET /api/model/info` returns the metadata correctly

Run the tests and show real pass/fail output — don't just write
them.

============================================================
DELIVERABLES
============================================================

```
backend/
├── app.py                    # FastAPI app, startup model load
├── config.py                 # settings via pydantic-settings
├── routes/
│   ├── sensor_routes.py      # POST /api/sensors/data
│   └── fire_routes.py        # POST /api/fire/verify, GET /api/model/info
├── services/
│   ├── fire_detection.py     # rule engine (may already exist — reuse/adapt)
│   └── verification_service.py  # merges rules + AI into verification_status
├── models/
│   └── sensor_data.py        # Pydantic schemas (request + response)
├── storage/
│   └── memory_store.py       # or sqlite_store.py — simple prototype storage
└── tests/
    └── test_fire_verify.py
```

============================================================
WORKING STYLE
============================================================

Build incrementally and prove each step works before adding the
next:

1. `GET /health` alone, running, confirmed with curl/Swagger UI.
2. `POST /api/sensors/data` with storage, tested.
3. Rule engine wired in standalone (no AI yet), tested against
   the four report scenarios.
4. AI service wired in, `POST /api/fire/verify` returning the
   merged `verification_status`, tested against all six
   scenarios.
5. `GET /api/model/info`.
6. Error handling and edge cases last.

Show real output (curl responses or Swagger screenshots
described in text, and actual test run output) at each step. Do
not write the whole service in one pass. Stop once all endpoints
work and tests pass — do not start on blockchain, hashing, or
claims logic; that is a separate, later task.
