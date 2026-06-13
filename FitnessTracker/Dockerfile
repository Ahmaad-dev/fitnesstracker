# ── FitTracker Backend + Frontend ───────────────────────────────────────────
# Single-stage Python 3.12 image.
# Frontend (static JS/HTML/CSS) is served directly by Flask.
# Data directory is mounted as a Docker volume at /data.
# ─────────────────────────────────────────────────────────────────────────────

FROM python:3.12-slim

# Install system deps needed by some wheels (garth / cryptography)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libffi-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ── Python dependencies ───────────────────────────────────────────────────────
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

# ── Backend source ────────────────────────────────────────────────────────────
COPY backend/ /app/backend/

# ── Frontend source ───────────────────────────────────────────────────────────
COPY frontend/ /app/frontend/

# ── Runtime ───────────────────────────────────────────────────────────────────
VOLUME /data
ENV DATA_DIR=/data
EXPOSE 8080

# 1 worker: SQLite on Azure File Share doesn't support concurrent writes
# timeout 120s: OpenAI API calls can take 30-90s
CMD ["gunicorn", \
     "--workers", "1", \
     "--timeout", "120", \
     "--bind", "0.0.0.0:8080", \
     "--chdir", "/app/backend", \
     "wsgi:app"]
