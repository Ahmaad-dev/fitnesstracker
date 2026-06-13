"""Garmin Connect Integration – holt Krafttraining-Aktivitäten und parst die FIT-Daten."""
from __future__ import annotations

import datetime
import io
import json
import logging
import os
import zipfile

log = logging.getLogger(__name__)

TOKEN_DIR = os.getenv('GARMIN_TOKEN_DIR', '/data/garmin_tokens')


def _get_api():
    """Gib eine eingeloggte Garmin-Instanz zurück (Token-Cache bevorzugt)."""
    from garminconnect import Garmin, GarminConnectAuthenticationError

    email    = os.environ.get('GARMIN_EMAIL', '')
    password = os.environ.get('GARMIN_PASSWORD', '')

    if not email or not password:
        raise ValueError(
            'GARMIN_EMAIL und GARMIN_PASSWORD müssen in app.env gesetzt sein.'
        )

    os.makedirs(TOKEN_DIR, exist_ok=True)
    api = Garmin(email=email, password=password, is_cn=False, return_on_mfa=True)

    try:
        api.login(TOKEN_DIR)
        log.info('Garmin: Token-Cache-Login OK')
        return api
    except (FileNotFoundError, GarminConnectAuthenticationError, Exception):
        pass

    result = api.login()
    if isinstance(result, tuple) and result[0] == 'needs_mfa':
        raise RuntimeError(
            'Garmin MFA ist aktiv – bitte in deinem Garmin-Konto deaktivieren.'
        )
    try:
        api.garth.dump(TOKEN_DIR)
    except Exception:
        pass
    log.info('Garmin: Frischer Login OK')
    return api


def sync_garmin(since_days: int = 30) -> list[dict]:
    """
    Authentifiziert bei Garmin Connect, lädt Krafttraining-Aktivitäten der letzten
    `since_days` Tage herunter, parst die FIT-Daten und speichert neue Aktivitäten
    in der Datenbank.

    Gibt eine Liste von PENDING_SESSIONS-Dicts (FitnessTracker-Format) zurück.
    """
    from models import db, GarminActivity

    api = _get_api()

    end_dt = datetime.date.today()

    # GARMIN_SYNC_FROM_DATE überschreibt since_days (Format: YYYY-MM-DD)
    env_from = os.getenv('GARMIN_SYNC_FROM_DATE', '').strip()
    if env_from:
        try:
            start_dt = datetime.date.fromisoformat(env_from)
        except ValueError:
            log.warning('GARMIN_SYNC_FROM_DATE ungültiges Format: %s — verwende since_days', env_from)
            start_dt = end_dt - datetime.timedelta(days=since_days)
    else:
        start_dt = end_dt - datetime.timedelta(days=since_days)

    # Krafttraining-Typen (Garmin verwendet je nach Gerät/Einstellung verschiedene typeKeys)
    STRENGTH_TYPES = {
        'strength_training', 'strength', 'fitness_equipment',
        'gym_and_fitness_equipment',
    }
    # Fetch only strength_training at API level to avoid hitting the 20-activity page limit
    # when the user has many other activity types (HIIT, Bouldern, etc.)
    activities = api.get_activities_by_date(
        start_dt.isoformat(), end_dt.isoformat(),
        activitytype='strength_training',
    ) or []
    log.info('Garmin: %d strength_training-Aktivitäten von API erhalten', len(activities))

    # Collect typeKeys for debugging
    all_types = {(a.get('activityType', {}).get('typeKey') or 'unknown').lower() for a in activities}
    if all_types:
        log.info('Garmin: typeKeys in Ergebnis: %s', all_types)

    strength_acts = [
        a for a in activities
        if (a.get('activityType', {}).get('typeKey') or '').lower()
        in STRENGTH_TYPES
        or 'kraft' in (a.get('activityName') or '').lower()
    ]
    log.info('Garmin: %d Krafttraining-Aktivitäten gefunden', len(strength_acts))

    new_pending: list[dict] = []

    for act in strength_acts:
        act_id = str(act.get('activityId', ''))
        if not act_id:
            continue

        existing = GarminActivity.query.filter_by(activity_id=act_id).first()
        if existing:
            if not existing.imported:
                new_pending.append(existing.to_pending_dict())
            continue   # already known

        # Download and parse the .fit file
        try:
            fit_bytes = api.download_activity(
                act_id,
                dl_fmt=api.ActivityDownloadFormat.ORIGINAL,
            )
            sets = _parse_fit_sets(fit_bytes)
        except Exception as exc:
            log.warning('FIT-Download für Aktivität %s fehlgeschlagen: %s', act_id, exc)
            sets = []

        start_str = act.get('startTimeLocal', '')
        try:
            start_time = datetime.datetime.fromisoformat(
                start_str.replace('Z', '+00:00')
            )
        except Exception:
            start_time = datetime.datetime.now()

        # Generate a short, stable pending_id
        count = GarminActivity.query.count()
        pending_id = f'g{count + 1}'

        ga = GarminActivity(
            activity_id=act_id,
            pending_id=pending_id,
            name=act.get('activityName', 'Krafttraining'),
            start_time=start_time,
            duration_sec=int(act.get('duration', 0)),
            avg_hr=act.get('averageHR'),
            sets_json=json.dumps(sets, ensure_ascii=False),
            imported=False,
        )
        db.session.add(ga)
        db.session.flush()   # assign id so to_pending_dict works immediately

        new_pending.append(ga.to_pending_dict())

    db.session.commit()
    return new_pending


# ── FIT file parsing ──────────────────────────────────────────────────────────

def _unwrap_fit(blob: bytes) -> bytes:
    """Garmin ORIGINAL-Download ist ein ZIP mit einer .fit-Datei darin."""
    if blob[:4] == b'PK\x03\x04':
        with zipfile.ZipFile(io.BytesIO(blob)) as zf:
            fit_names = [n for n in zf.namelist() if n.lower().endswith('.fit')]
            if not fit_names:
                fit_names = zf.namelist()[:1]
            if not fit_names:
                raise ValueError('ZIP enthält keine .fit-Datei.')
            return zf.read(fit_names[0])
    return blob


def _parse_fit_sets(fit_bytes: bytes) -> list[dict]:
    """
    Parst eine Garmin FIT-Datei und gibt eine Liste aktiver Sätze zurück.

    Jedes Element:
      { reps, weight_kg, duration_sec, avg_hr, _timestamp_offset }
    """
    try:
        import fitparse
    except ImportError:
        log.warning('fitparse nicht installiert – überspringe FIT-Parsing.')
        return []

    fit_bytes = _unwrap_fit(fit_bytes)
    try:
        fit = fitparse.FitFile(io.BytesIO(fit_bytes), check_crc=False)
    except Exception as exc:
        log.warning('FitFile konnte nicht gelesen werden: %s', exc)
        return []

    session_start: datetime.datetime | None = None
    avg_hr_session: int | None = None

    try:
        for msg in fit.get_messages('session'):
            fields = {f.name: f.value for f in msg.fields if f.value is not None}
            ts = fields.get('start_time')
            if isinstance(ts, datetime.datetime):
                session_start = ts
            avg_hr_session = fields.get('avg_heart_rate')
    except Exception as exc:
        log.warning('FIT session-Parse fehlgeschlagen: %s', exc)

    active_sets: list[dict] = []
    try:
        set_messages = list(fit.get_messages('set'))
    except Exception as exc:
        log.warning('FIT set-Parse fehlgeschlagen: %s', exc)
        return []

    for msg in set_messages:
        try:
            fields = {f.name: f.value for f in msg.fields if f.value is not None}
        except Exception:
            continue

        raw_type = fields.get('set_type')
        is_active = (str(raw_type) == 'active' or raw_type == 1)
        if not is_active:
            continue

        reps       = fields.get('repetitions', 0) or 0
        raw_weight = fields.get('weight')
        weight_kg  = float(raw_weight) if raw_weight else 0.0

        duration   = int(fields.get('duration') or 0)
        set_hr     = fields.get('avg_heart_rate') or avg_hr_session

        # Compute seconds-since-session-start for rest-time estimation
        ts_val = fields.get('timestamp')
        offset: float | None = None
        if isinstance(ts_val, datetime.datetime) and session_start:
            offset = (ts_val - session_start).total_seconds()

        active_sets.append({
            'reps':               int(reps),
            'weight_kg':          round(weight_kg, 2),
            'duration_sec':       duration,
            'avg_hr':             set_hr,
            '_timestamp_offset':  offset,
        })

    return active_sets
