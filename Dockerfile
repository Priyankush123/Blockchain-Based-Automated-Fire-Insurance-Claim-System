# ──────────────────────────────────────────────────────────────
# Stage 1 – Frontend Builder: Build React SPA
# ──────────────────────────────────────────────────────────────
FROM node:20-slim AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# ──────────────────────────────────────────────────────────────
# Stage 2 – Python Builder: install Python dependencies
# ──────────────────────────────────────────────────────────────
FROM python:3.11-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        gcc \
        libssl-dev \
        libffi-dev \
        curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements-docker.txt .
RUN pip install --upgrade pip && \
    pip install --prefix=/install --no-cache-dir -r requirements-docker.txt

# ──────────────────────────────────────────────────────────────
# Stage 3 – Runtime: lean production image
# ──────────────────────────────────────────────────────────────
FROM python:3.11-slim AS runtime

WORKDIR /app

# Copy installed Python packages from builder stage
COPY --from=builder /install /usr/local


# Copy compiled frontend from frontend-builder
COPY --from=frontend-builder /app/frontend/dist frontend/dist

# Copy application source code
COPY backend/   backend/
COPY ai/        ai/
COPY data/      data/

# Ensure SQLite storage directory exists
RUN mkdir -p backend/storage

# Expose FastAPI port
EXPOSE 8000

# Health-check
HEALTHCHECK --interval=15s --timeout=5s --retries=5 \
    CMD curl -sf http://localhost:8000/health || exit 1

# Run the FastAPI app
CMD ["uvicorn", "backend.app:app", "--host", "0.0.0.0", "--port", "8000"]

