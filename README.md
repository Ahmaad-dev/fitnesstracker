# FitTracker

Personal fitness tracking web app with Garmin Connect sync, AI coaching, and progressive overload tracking. Designed as a mobile-first PWA running on Azure Container Apps.

## Features

- **Garmin Sync** — Import strength training sessions directly from Garmin Connect
- **Progressive Overload Charts** — Per-exercise progression graphs across all sessions
- **AI Coach** — GPT-powered weight recommendations based on your training history
- **5-Day Split Tracking** — Chest · Back · Shoulders · Arms · Legs
- **Session Assignment** — Drag-and-drop set assignment to exercises after sync

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 (UMD), Babel Standalone, plain CSS |
| Backend | Python 3.12, Flask, SQLAlchemy, SQLite |
| Garmin | `garminconnect` + `fitparse` for FIT file parsing |
| AI | OpenAI API (`gpt-4o-mini`) |
| Hosting | Azure Container Apps + Azure Container Registry |
| Storage | Azure File Share (SMB mount for SQLite + Garmin tokens) |

## Setup

### 1. Clone & configure

```bash
git clone https://github.com/Ahmaad-dev/fitnesstracker.git
cd fitnesstracker/FitnessTracker
cp app.env.example app.env
# Edit app.env with your credentials
```

### 2. Run locally

```bash
docker compose up
```

App is available at `http://localhost:8080`

### 3. Deploy to Azure

Prerequisites: Docker, Azure CLI, access to the ACR.

```powershell
docker build -t fittrackercr.azurecr.io/fittracker:latest .
docker push fittrackercr.azurecr.io/fittracker:latest
az containerapp update -n fit-app -g rg-fittracker --image fittrackercr.azurecr.io/fittracker:latest
```

## Environment Variables

See `app.env.example` for all required variables:

| Variable | Description |
|---|---|
| `SECRET_KEY` | Flask session secret (random 32+ char string) |
| `APP_PASSWORD_HASH` | bcrypt hash of the login password |
| `GARMIN_EMAIL` | Garmin Connect email |
| `GARMIN_PASSWORD` | Garmin Connect password |
| `GARMIN_SYNC_FROM_DATE` | Only import activities from this date (YYYY-MM-DD) |
| `OPENAI_API_KEY` | OpenAI API key (leave empty to disable AI) |
| `OPENAI_MODEL` | Model to use, default `gpt-4o-mini` |

Generate a password hash:
```bash
docker run --rm python:3.12-slim python -c \
  "import bcrypt; print(bcrypt.hashpw(b'YOUR_PASSWORD', bcrypt.gensalt()).decode())"
```

## Project Structure

```
FitnessTracker/
├── backend/
│   ├── app.py          # Flask routes & API endpoints
│   ├── garmin.py       # Garmin Connect sync + FIT parsing
│   ├── models.py       # SQLAlchemy models
│   └── wsgi.py         # Gunicorn entry point
├── frontend/
│   ├── FitTracker.html # App shell
│   ├── app.jsx         # Root component & navigation
│   ├── api-bridge.js   # Backend API client + data loading
│   ├── data.js         # Exercise catalog & domain helpers
│   ├── history.jsx     # Progression charts (Fortschritt)
│   ├── sync.jsx        # Garmin sync screen
│   ├── assign.jsx      # Set assignment drag & drop
│   ├── recommend.jsx   # AI recommendations
│   └── ...
├── Dockerfile
├── docker-compose.yml
└── app.env.example
```
