# ── FitTracker Backend + Frontend ───────────────────────────────────────────
# Stage 1 (node): kompiliert das Frontend (JSX → JS, Prod-React) — siehe frontend-build/build.mjs
# Stage 2 (python): Flask-Backend, liefert das kompilierte Frontend aus.
# Data directory is mounted as a Docker volume at /data.
# ─────────────────────────────────────────────────────────────────────────────

FROM node:20-alpine AS frontend
WORKDIR /build
COPY frontend-build/package.json ./
RUN npm install --no-audit --no-fund
COPY frontend-build/build.mjs ./
COPY frontend/ /src/frontend/
RUN node build.mjs /src/frontend /out/frontend

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

# ── Frontend (kompiliert aus Stage 1) ────────────────────────────────────────
COPY --from=frontend /out/frontend/ /app/frontend/

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
