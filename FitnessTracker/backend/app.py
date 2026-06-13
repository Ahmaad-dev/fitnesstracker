"""FitTracker Backend – Flask app that serves the FitnessTracker frontend
and provides REST API endpoints for auth, data, Garmin sync and AI."""
from __future__ import annotations

import json
import logging
import os
import datetime
import sqlite3
import time

import bcrypt
from flask import (
    Flask, abort, jsonify, redirect, request, send_from_directory, session
)
from werkzeug.middleware.proxy_fix import ProxyFix

from models import db, TrainingSession, GarminActivity, AiCache

log = logging.getLogger(__name__)

# ── Paths ─────────────────────────────────────────────────────────────────────
FRONTEND_DIR = os.path.join(os.path.dirname(__file__), '..', 'frontend')
DATA_DIR = os.getenv('DATA_DIR', '/data')

# ── App factory ───────────────────────────────────────────────────────────────
app = Flask(__name__, static_folder=None)
app.wsgi_app = ProxyFix(app.wsgi_app)  # honour X-Forwarded headers in Docker

app.secret_key = os.environ['SECRET_KEY']

# SQLite on Azure File Share (SMB) doesn't support file locking.
# Use nolock=1 via a custom creator — safe with 1 worker + 1 replica.
_db_file = os.path.join(DATA_DIR, 'fitness.db')
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{_db_file}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    'creator': lambda: sqlite3.connect(f'file://{_db_file}?nolock=1', uri=True),
}
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['PERMANENT_SESSION_LIFETIME'] = datetime.timedelta(days=90)

_pw_env = os.environ.get('APP_PASSWORD_HASH', '')
APP_PASSWORD_HASH: bytes = _pw_env.encode() if _pw_env else b''

db.init_app(app)
with app.app_context():
    os.makedirs(DATA_DIR, exist_ok=True)
    db.create_all()
    # ── One-time migration: fix sessions whose date_iso defaulted to import day ──
    # If a TrainingSession has a garmin_activity_id, use the GarminActivity's
    # start_time as the authoritative date instead of today's date.
    try:
        fixed = 0
        for ts in TrainingSession.query.filter(
            TrainingSession.garmin_activity_id.isnot(None)
        ).all():
            ga = GarminActivity.query.filter_by(
                activity_id=ts.garmin_activity_id
            ).first()
            if ga and ga.start_time:
                correct = ga.start_time.date().isoformat()
                if ts.date_iso != correct:
                    ts.date_iso = correct
                    fixed += 1
        if fixed:
            db.session.commit()
            log.info('Migration: %d Session-Daten korrigiert', fixed)
    except Exception:
        db.session.rollback()
        log.exception('Migration fehlgeschlagen – ignoriert')


# ── Health check (für Container Apps Liveness/Readiness Probe) ──────────────

@app.route('/api/health')
def health():
    return jsonify({'status': 'ok'})


# ── Static / HTML serving ─────────────────────────────────────────────────────

@app.route('/login')
def login_page():
    return send_from_directory(FRONTEND_DIR, 'login.html')


@app.route('/')
def index():
    if not session.get('authed'):
        return redirect('/login')
    return send_from_directory(FRONTEND_DIR, 'FitTracker.html')


@app.route('/<path:filename>')
def static_files(filename: str):
    # API routes are handled separately; never serve them as static
    if filename.startswith('api/'):
        abort(404)
    # Public assets needed by the login page (login.html is served without auth)
    public = {'login.html'}
    if filename not in public and not session.get('authed'):
        return redirect('/login')
    return send_from_directory(FRONTEND_DIR, filename)


# ── Auth endpoints ────────────────────────────────────────────────────────────

@app.route('/api/login', methods=['POST'])
def api_login():
    data = request.get_json(force=True, silent=True) or {}
    pw: bytes = (data.get('password') or '').encode()
    if APP_PASSWORD_HASH:
        try:
            ok = bcrypt.checkpw(pw, APP_PASSWORD_HASH)
        except Exception:
            ok = False
    else:
        # No password configured → accept anything (development only)
        ok = bool(pw)
    if ok:
        session.permanent = True
        session['authed'] = True
        return jsonify({'ok': True})
    return jsonify({'ok': False}), 401


@app.route('/api/logout', methods=['POST'])
def api_logout():
    session.clear()
    return jsonify({'ok': True})


@app.route('/api/me')
def api_me():
    return jsonify({'loggedIn': bool(session.get('authed'))})


# ── Data endpoint ─────────────────────────────────────────────────────────────

@app.route('/api/data')
def api_data():
    if not session.get('authed'):
        abort(401)
    sessions_db = (
        TrainingSession.query
        .order_by(TrainingSession.date_iso.desc())
        .limit(30)
        .all()
    )
    sync_from = os.getenv('GARMIN_SYNC_FROM_DATE', '').strip()
    pending_q = GarminActivity.query.filter_by(imported=False)
    if sync_from:
        try:
            from_dt = datetime.datetime.fromisoformat(sync_from)
            pending_q = pending_q.filter(GarminActivity.start_time >= from_dt)
        except ValueError:
            pass
    pending_db = pending_q.order_by(GarminActivity.start_time.desc()).all()
    has_real = bool(sessions_db or pending_db)
    today_key = datetime.date.today().isoformat()
    ai_row = AiCache.query.get(today_key)
    ai_cache = {'date': today_key, 'data': json.loads(ai_row.result_json)} if ai_row else None
    return jsonify({
        'hasRealData': has_real,
        'sessions': [s.to_ft_dict() for s in sessions_db],
        'pending': [a.to_pending_dict() for a in pending_db],
        'streak': _compute_streak(sessions_db),
        'ai_cache': ai_cache,
    })


def _compute_streak(sessions: list) -> int:
    if not sessions:
        return 0
    dates = sorted(
        {s.date_iso for s in sessions if s.date_iso}, reverse=True
    )
    today = datetime.date.today()
    streak = 0
    for i, d in enumerate(dates):
        try:
            dt = datetime.date.fromisoformat(d)
        except ValueError:
            continue
        expected = today - datetime.timedelta(days=i)
        if dt == expected:
            streak += 1
        else:
            break
    return streak


# ── AI cache endpoint ────────────────────────────────────────────────────────

@app.route('/api/ai/cache', methods=['POST'])
def api_ai_cache_save():
    if not session.get('authed'):
        abort(401)
    body = request.get_json(force=True, silent=True) or {}
    result = body.get('result')
    if not result:
        return jsonify({'ok': False, 'error': 'missing result'}), 400
    today_key = datetime.date.today().isoformat()
    row = AiCache.query.get(today_key)
    if row:
        row.result_json = json.dumps(result, ensure_ascii=False)
    else:
        row = AiCache(date_key=today_key, result_json=json.dumps(result, ensure_ascii=False))
        db.session.add(row)
    db.session.commit()
    return jsonify({'ok': True})


# ── Discard pending session endpoint ─────────────────────────────────────────

@app.route('/api/pending/<pending_id>', methods=['DELETE'])
def api_discard_pending(pending_id):
    if not session.get('authed'):
        abort(401)
    act = GarminActivity.query.filter(
        (GarminActivity.pending_id == pending_id) |
        (GarminActivity.activity_id == str(pending_id))
    ).first()
    if act:
        act.imported = True
        db.session.commit()
    return jsonify({'ok': True})


# ── Garmin reset endpoint — marks activities as not-imported so they re-appear ─

@app.route('/api/garmin/reset', methods=['POST'])
def api_garmin_reset():
    if not session.get('authed'):
        abort(401)
    body = request.get_json(force=True, silent=True) or {}
    activity_id = body.get('activity_id')   # optional: reset only one
    if activity_id:
        acts = GarminActivity.query.filter_by(activity_id=str(activity_id)).all()
    else:
        acts = GarminActivity.query.filter_by(imported=True).all()
    count = 0
    for act in acts:
        act.imported = False
        count += 1
    db.session.commit()
    log.info('Garmin reset: %d Aktivitäten zurückgesetzt', count)
    return jsonify({'ok': True, 'reset': count})


# ── Garmin sync endpoint ──────────────────────────────────────────────────────

@app.route('/api/garmin/sync', methods=['POST'])
def api_garmin_sync():
    if not session.get('authed'):
        abort(401)
    try:
        from garmin import sync_garmin
        new_pending = sync_garmin()
        return jsonify({'ok': True, 'pending': new_pending})
    except Exception as exc:
        log.exception('Garmin sync fehlgeschlagen')
        return jsonify({'ok': False, 'error': str(exc), 'pending': []}), 502


# ── Save session endpoint ─────────────────────────────────────────────────────

@app.route('/api/sessions', methods=['POST'])
def api_save_session():
    if not session.get('authed'):
        abort(401)
    data = request.get_json(force=True, silent=True) or {}
    raw = data.get('raw') or {}
    assignments = data.get('assignments') or {}

    # Build per-exercise sets from assignment model
    exercises: list[dict] = []
    for g in (assignments.get('groups') or []):
        ex = g.get('ex')
        set_ids: list[str] = g.get('setIds') or []
        if not ex or not set_ids:
            continue
        ex_name = ex.get('name') if isinstance(ex, dict) else str(ex)
        ex_muscle = ex.get('muscle', '') if isinstance(ex, dict) else ''
        warmup_map: dict = assignments.get('warmup') or {}
        sets_data = []
        for sid in set_ids:
            raw_set = next(
                (s for s in (raw.get('sets') or []) if s.get('id') == sid), None
            )
            if raw_set:
                sets_data.append({
                    'w': raw_set.get('w', 0),
                    'r': raw_set.get('reps', 0),
                    'wu': bool(warmup_map.get(sid)),
                })
        exercises.append({'name': ex_name, 'muscle': ex_muscle, 'sets': sets_data})

    volume = sum(
        s.get('w', 0) * s.get('r', 0)
        for ex in exercises for s in ex.get('sets', [])
    )
    date_iso = raw.get('date_iso') or datetime.date.today().isoformat()
    training_day = assignments.get('day') or raw.get('dayGuess', 'Unbekannt')

    ts = TrainingSession(
        date_iso=date_iso,
        training_day=training_day,
        duration_min=raw.get('duration', 0),
        volume_kg=volume,
        exercises_json=json.dumps(exercises, ensure_ascii=False),
        garmin_activity_id=raw.get('garmin_activity_id'),
    )
    db.session.add(ts)

    # Mark the Garmin activity as imported so it leaves the pending queue
    pending_id = raw.get('id') or raw.get('garmin_activity_id')
    if pending_id:
        act = GarminActivity.query.filter(
            (GarminActivity.pending_id == pending_id) |
            (GarminActivity.activity_id == str(pending_id))
        ).first()
        if act:
            act.imported = True

    db.session.commit()
    return jsonify({'ok': True, 'id': ts.id})


# ── AI endpoint ───────────────────────────────────────────────────────────────

@app.route('/api/ai', methods=['POST'])
def api_ai():
    if not session.get('authed'):
        abort(401)
    data = request.get_json(force=True, silent=True) or {}
    prompt: str = data.get('prompt', '')
    if not prompt:
        return jsonify({'error': 'No prompt'}), 400

    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        return jsonify({'error': 'OpenAI API key not configured'}), 503

    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key)
        model = os.getenv('OPENAI_MODEL', 'gpt-4o-mini')
        resp = client.chat.completions.create(
            model=model,
            messages=[{'role': 'user', 'content': prompt}],
            max_tokens=2048,
            temperature=0.4,
        )
        text = resp.choices[0].message.content
        return jsonify({'response': text})
    except Exception as exc:
        log.exception('OpenAI call fehlgeschlagen')
        return jsonify({'error': str(exc)}), 502
