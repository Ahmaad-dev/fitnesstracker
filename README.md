# FitTracker

Personal fitness tracking web app with Garmin Connect sync, AI coaching, and progressive overload tracking. Designed as a mobile-first PWA running on Azure Container Apps.

> **Analysing training progress? Start with `TRAINING-JOURNAL.md` in the repository root.**
> It records every major change to the training plan, the app and the data: what changed, why, the baseline
> metrics before the change, the goals, and when the next review is due. Compute metrics with
> [`tools/analyze_training.py`](tools/analyze_training.py) so periods stay comparable, and add new analyses to the journal.
>
> The journal contains personal training data and is **kept local only** (listed in `.gitignore`, not on GitHub).
> If it is missing, ask the owner for it instead of starting from scratch. Local notes such as credentials live in `LOCAL-NOTES.md` (also git-ignored).

## Current state (2026-11-15)

- **Training plan:** switched from a 5-day split to a 4-day **upper/lower plan** (every muscle ~2× per week). Details and reasoning: journal entry 2026-11-15 in `TRAINING-JOURNAL.md`.
- **App 3.1.0:** two switchable training modes (*Profile → Trainingsmodus*). The 5-day split is unchanged; the 4-day plan adds the due plan day, progression hints and a plan-specific AI prompt.
- **App 3.0.1:** session duration is stored from the Garmin activity (it was always 0 before).
- **Data cleanup 2026-11-15:** misassigned sets removed and durations backfilled; a backup of the database before the cleanup is on the file share.

## Features

- **Garmin Sync**: import strength training sessions directly from Garmin Connect (FIT file parsing).
- **Set Assignment**: assign the detected sets to exercises after a sync (drag & drop, tap or auto blocks) and mark warm-up sets.
- **Training modes**, switchable in *Profile → Trainingsmodus*:
  - *5er-Split*: Chest · Back · Shoulders · Arms · Legs, rotating.
  - *4er-Plan*: Upper A → Lower A → Upper B → Lower B, with sets × rep ranges, start weights and supersets per exercise (`PLAN` in `frontend/data.js`). The dashboard shows "Heute laut Plan", and every exercise gets a **double progression hint** (increase / hold / decrease weight).
- **Progression charts**: per-exercise progression across the full history, grouped by muscle group (5-day split) or plan day (4-day plan).
- **AI Coach**: OpenAI recommendations for the due day and next weights. Each mode has its own prompt. The 4-day plan prompt receives rep targets and the last 6 sessions with all working sets, and the progression rule is computed in code. Responses use JSON mode.
- **Edit / delete sessions**: fix sets of saved sessions, or delete a session and send it back to the sync queue.
- **Manual logging**: log sets without the watch.
- **Daily database backups** (`/data/backups`, last 14 days by default); "today" follows the local timezone (`APP_TZ`).

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 (UMD) + plain CSS. Locally Babel compiles JSX in the browser; the Docker build precompiles with esbuild (`frontend-build/`) |
| Backend | Python 3.12, Flask, SQLAlchemy, SQLite |
| Garmin | `garminconnect` + `fitparse` for FIT file parsing |
| AI | OpenAI API (`gpt-4o-mini` by default) |
| Hosting | Azure Container Apps + Azure Container Registry |
| Storage | Azure File Share `fitdata` (SMB mount for SQLite, backups and Garmin tokens) |

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

Images are versioned (`fittracker:<version>`, e.g. `3.1.0`). Building in the registry needs no local Docker:

```bash
cd FitnessTracker
az acr build -r fittrackercr -t fittracker:<version> -t fittracker:latest .
az containerapp update -n fit-app -g rg-fittracker --image fittrackercr.azurecr.io/fittracker:<version>
```

Alternatively with local Docker:

```powershell
docker build -t fittrackercr.azurecr.io/fittracker:<version> .
docker push fittrackercr.azurecr.io/fittracker:<version>
az containerapp update -n fit-app -g rg-fittracker --image fittrackercr.azurecr.io/fittracker:<version>
```

Record app changes that affect training or data in `TRAINING-JOURNAL.md` together with the deployed version.

## Environment Variables

See `app.env.example`:

| Variable | Description |
|---|---|
| `SECRET_KEY` | Flask session secret (random 32+ char string) |
| `APP_PASSWORD_HASH` | bcrypt hash of the login password |
| `GARMIN_EMAIL` | Garmin Connect email |
| `GARMIN_PASSWORD` | Garmin Connect password |
| `GARMIN_TOKEN_DIR` | Garmin token cache, default `/data/garmin_tokens` |
| `GARMIN_SYNC_FROM_DATE` | Only import activities from this date (YYYY-MM-DD) |
| `OPENAI_API_KEY` | OpenAI API key (leave empty to disable AI) |
| `OPENAI_MODEL` | Model to use, default `gpt-4o-mini` |
| `APP_TZ` | Timezone for "today" (streak, AI cache, manual sets), default `Europe/Vienna` |
| `BACKUP_KEEP` | Number of daily DB backups to keep, default `14` |
| `DATA_DIR` | Data directory (SQLite, backups), default `/data` |

Generate a password hash:
```bash
docker run --rm python:3.12-slim python -c \
  "import bcrypt; print(bcrypt.hashpw(b'YOUR_PASSWORD', bcrypt.gensalt()).decode())"
```

## Analysing Progress

1. Read `TRAINING-JOURNAL.md` (local only): open reviews, latest entry, baseline and goals.
2. Download a copy of the database (read-only; the command is in the journal). Never commit it.
3. Run `python tools/analyze_training.py fitness.db --from YYYY-MM-DD --to YYYY-MM-DD` for the new period and for the baseline period.
4. Add the result as a new journal entry (template at the end of the journal).

## Project Structure

```
TRAINING-JOURNAL.md     # (local only) History of plan/app/data changes, baselines, goals, reviews
tools/
└── analyze_training.py # Metrics for the journal (frequency, volume per muscle, progression)
FitnessTracker/
├── backend/
│   ├── app.py          # Flask routes & API endpoints, daily backups, OpenAI call
│   ├── garmin.py       # Garmin Connect sync + FIT parsing
│   ├── models.py       # SQLAlchemy models, local timezone helpers
│   └── wsgi.py         # Gunicorn entry point
├── frontend/
│   ├── FitTracker.html # App shell
│   ├── app.jsx         # Root component, navigation, training mode, AI prompts
│   ├── api-bridge.js   # Backend API client + data loading
│   ├── data.js         # Exercise catalog, 4-day PLAN, progression rule, domain helpers
│   ├── plan.jsx        # 4-day plan UI: "Heute laut Plan", progression hints
│   ├── dashboard.jsx   # Start screen
│   ├── history.jsx     # Progression charts (Fortschritt), session detail/edit
│   ├── recommend.jsx   # AI coach
│   ├── sync.jsx        # Garmin sync screen
│   ├── assign.jsx      # Set assignment
│   ├── profile.jsx     # Profile & settings (training mode)
│   └── ...
├── frontend-build/     # esbuild production build (runs inside the Docker build)
├── Dockerfile
├── docker-compose.yml
└── app.env.example
```
