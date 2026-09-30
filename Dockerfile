# ──────────────────────────────────────────────────────────────
# Stage 1 – Frontend Builder: Build React 19 UI
# ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS frontend-builder

WORKDIR /frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# ──────────────────────────────────────────────────────────────
# Stage 2 – Python Builder: install Python deps into a clean layer
# ──────────────────────────────────────────────────────────────
FROM python:3.12-slim AS python-builder

WORKDIR /app

# Install build tools needed by some packages (e.g. cryptography, cffi)
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        gcc \
        libssl-dev \
        libffi-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies first (better layer caching)
COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install --prefix=/install --no-cache-dir -r requirements.txt

# ──────────────────────────────────────────────────────────────
# Stage 3 – Runtime: lean production image
# ──────────────────────────────────────────────────────────────
FROM python:3.12-slim AS runtime

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    WEB3_RPC_URL=http://hardhat-node:8545 \
    FI_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3 \
    FI_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# Copy installed Python packages from python-builder stage
COPY --from=python-builder /install /usr/local

# Copy compiled React frontend assets
COPY --from=frontend-builder /frontend/dist frontend/dist

# Copy application source code
COPY backend/   backend/
COPY ai/        ai/
COPY data/      data/

# Ensure the SQLite storage directory exists
RUN mkdir -p backend/storage

# Expose FastAPI port
EXPOSE 8000

# Health-check so Docker / compose knows when the API is ready
HEALTHCHECK --interval=15s --timeout=5s --retries=5 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"

# Run the FastAPI app with Uvicorn
CMD ["uvicorn", "backend.app:app", "--host", "0.0.0.0", "--port", "8000"]
