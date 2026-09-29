# ──────────────────────────────────────────────────────────────
# Stage 1 – Builder: install Python deps into a clean layer
# ──────────────────────────────────────────────────────────────
FROM python:3.11-slim AS builder

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
# Stage 2 – Runtime: lean final image
# ──────────────────────────────────────────────────────────────
FROM python:3.11-slim AS runtime

WORKDIR /app

# Copy installed packages from builder stage
COPY --from=builder /install /usr/local

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
CMD ["uvicorn", "backend.app:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
