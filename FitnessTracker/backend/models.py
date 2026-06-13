"""SQLAlchemy-Modelle für FitTracker."""
from __future__ import annotations

import datetime
import json

from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

_WEEKDAYS_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
_WEEKDAYS_LONG  = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag']
_MONTHS_DE      = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']

# Weekday → typical training day in a Mo-Fr 5er split
_DAY_GUESS = {0: 'Brust', 1: 'Rücken', 2: 'Schulter', 3: 'Arm', 4: 'Beine'}


class TrainingSession(db.Model):
    __tablename__ = 'training_sessions'

    id              = db.Column(db.Integer, primary_key=True)
    date_iso        = db.Column(db.String(10), nullable=False, index=True)
    training_day    = db.Column(db.String(20), nullable=False)
    duration_min    = db.Column(db.Integer, default=0)
    volume_kg       = db.Column(db.Float, default=0.0)
    exercises_json  = db.Column(db.Text, default='[]')
    garmin_activity_id = db.Column(db.String(50), nullable=True)
    created_at      = db.Column(db.DateTime, default=datetime.datetime.utcnow)

    def to_ft_dict(self) -> dict:
        """Return a dict matching the FitnessTracker SESSIONS entry format."""
        exercises: list[dict] = json.loads(self.exercises_json or '[]')
        muscles   = list(dict.fromkeys(               # preserve order, deduplicate
            e.get('muscle', '') for e in exercises if e.get('muscle')
        ))
        total_sets = sum(len(e.get('sets', [])) for e in exercises)

        try:
            dt = datetime.date.fromisoformat(self.date_iso)
        except ValueError:
            dt = datetime.date.today()

        today   = datetime.date.today()
        days_ago = (today - dt).days
        if days_ago == 0:
            day_label = 'Heute'
        elif days_ago == 1:
            day_label = 'Gestern'
        else:
            day_label = _WEEKDAYS_SHORT[dt.weekday()]

        date_str = f"{dt.day}. {_MONTHS_DE[dt.month - 1]}"

        spm = total_sets / max(self.duration_min or 1, 1)
        intensity = 'Hoch' if spm > 0.3 else ('Mittel' if spm > 0.2 else 'Niedrig')

        return {
            'id':        f's{self.id}',
            'day':       day_label,
            'date':      date_str,
            'date_iso':  self.date_iso,
            'type':      self.training_day,
            'duration':  self.duration_min or 0,
            'intensity': intensity,
            'volume':    int(self.volume_kg or 0),
            'muscles':   muscles,
            'sets':      total_sets,
            'exercises': exercises,
        }


class GarminActivity(db.Model):
    __tablename__ = 'garmin_activities'

    id          = db.Column(db.Integer, primary_key=True)
    activity_id = db.Column(db.String(50), unique=True, nullable=False)
    pending_id  = db.Column(db.String(20))   # short id used in FT: 'g1', 'g2', …
    name        = db.Column(db.String(200))
    start_time  = db.Column(db.DateTime)
    duration_sec = db.Column(db.Integer, default=0)
    avg_hr      = db.Column(db.Integer, nullable=True)
    sets_json   = db.Column(db.Text, default='[]')
    imported    = db.Column(db.Boolean, default=False, index=True)
    created_at  = db.Column(db.DateTime, default=datetime.datetime.utcnow)

    def to_pending_dict(self) -> dict:
        """Return a dict matching the FitnessTracker PENDING_SESSIONS entry format."""
        raw_sets: list[dict] = json.loads(self.sets_json or '[]')
        dt: datetime.datetime = self.start_time or datetime.datetime.now()

        weekday_long  = _WEEKDAYS_LONG[dt.weekday()]
        weekday_short = _WEEKDAYS_SHORT[dt.weekday()]
        date_str = f"{weekday_short}, {dt.day}. {_MONTHS_DE[dt.month - 1]}"
        pid = self.pending_id or f'g{self.id}'

        # Build FT-style set objects
        ft_sets: list[dict] = []
        prev_ts: float | None = None
        for i, s in enumerate(raw_sets):
            ts_val = s.get('_timestamp_offset', None)
            if prev_ts is not None and ts_val is not None:
                rest = max(0, int(ts_val - prev_ts - (raw_sets[i - 1].get('duration_sec', 0))))
            else:
                rest = 0
            ft_sets.append({
                'id':   f'{pid}_{i + 1}',
                'reps': s.get('reps', 0),
                'dur':  s.get('duration_sec', 30),
                'rest': rest,
                'hr':   s.get('avg_hr') or self.avg_hr or 130,
                'w':    s.get('weight_kg', 0),
                # original garmin id so the backend can resolve it on save
                'garmin_activity_id': self.activity_id,
            })
            prev_ts = ts_val

        day_guess = _DAY_GUESS.get(dt.weekday(), 'Brust')

        return {
            'id':                  pid,
            'garmin_activity_id':  self.activity_id,
            'date':                date_str,
            'date_iso':            dt.date().isoformat(),
            'weekday':             weekday_long,
            'dayGuess':            day_guess,
            'sets':                ft_sets,
        }


class AiCache(db.Model):
    """Stores the latest AI coaching result per day (shared across all devices)."""
    __tablename__ = 'ai_cache'

    date_key    = db.Column(db.String(10), primary_key=True)   # ISO date e.g. '2026-06-12'
    result_json = db.Column(db.Text, nullable=False)
    created_at  = db.Column(db.DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
