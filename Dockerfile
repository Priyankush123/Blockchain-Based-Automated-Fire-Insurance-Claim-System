# Single-stage build — simpler, more reliable
FROM python:3.11-slim

WORKDIR /app

# Install system build tools needed by web3, cryptography, cffi, etc.
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        gcc \
        libssl-dev \
        libffi-dev \
        curl \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip first
RUN pip install --upgrade pip

# Copy and install minimal runtime requirements
COPY requirements-docker.txt .
RUN pip install --no-cache-dir -r requirements-docker.txt

# Copy application source code
COPY backend/   backend/
COPY ai/        ai/
COPY data/      data/

# Ensure the SQLite storage directory exists
RUN mkdir -p backend/storage

# Expose FastAPI port
EXPOSE 8000

# Health-check
HEALTHCHECK --interval=15s --timeout=5s --retries=5 \
    CMD curl -sf http://localhost:8000/health || exit 1

# Run the FastAPI app
CMD ["uvicorn", "backend.app:app", "--host", "0.0.0.0", "--port", "8000"]
