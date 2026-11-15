"""Trainings-Analyse für FitTracker — liefert die Kennzahlen für TRAINING-JOURNAL.md.

Liest eine Kopie der SQLite-Datenbank (fitness.db) und gibt einen Markdown-Bericht aus:
Frequenz, Wochenvolumen pro Muskel, Trainingshäufigkeit pro Muskel, Wiederholungsmuster
und Progression je Übung. Immer mit demselben Skript auswerten, damit Zeiträume vergleichbar sind.

Aufruf:
    python tools/analyze_training.py <fitness.db> [--from YYYY-MM-DD] [--to YYYY-MM-DD]

Datenbank aus Azure holen (nur lesend, legt eine lokale Kopie an):
    KEY=$(az storage account keys list -g rg-fittracker -n fittrackerstorage --query "[0].value" -o tsv)
    az storage file download --share-name fitdata -p fitness.db --dest ./fitness.db \
        --account-name fittrackerstorage --account-key "$KEY"
"""
from __future__ import annotations

import argparse
import collections
import datetime as dt
import json
import sqlite3
import statistics
import sys

# Übung → {Muskel: Anteil}. 1 = direkt trainiert, 0.5 = indirekt mittrainiert (fraktionale Sätze).
# Neue Übungen im App-Katalog (frontend/data.js) hier ergänzen.
MUSCLES: dict[str, dict[str, float]] = {
    'Schrägbankdrücken (KH)': {'Brust': 1, 'vord. Schulter': .5, 'Trizeps': .5},
    'Flachbankdrücken (KH)': {'Brust': 1, 'vord. Schulter': .5, 'Trizeps': .5},
    'Butterfly Maschine': {'Brust': 1},
    'Liegestütze': {'Brust': 1, 'Trizeps': .5},
    'Dips': {'Trizeps': 1, 'Brust': .5},
    'Klimmzüge': {'Rücken': 1, 'Bizeps': .5},
    'Sit-Ups Schrägbank (mit Gewicht)': {'Bauch': 1},
    'Latzug (mittelbreit)': {'Rücken': 1, 'Bizeps': .5},
    'Latzug (V-Bar)': {'Rücken': 1, 'Bizeps': .5},
    'Smith Bent Over Row': {'Rücken': 1, 'Bizeps': .5, 'hint. Schulter': .5},
    'Lever Low Row': {'Rücken': 1, 'Bizeps': .5, 'hint. Schulter': .5},
    'High Row Maschine': {'Rücken': 1, 'Bizeps': .5, 'hint. Schulter': .5},
    'Rudern am Kabel': {'Rücken': 1, 'Bizeps': .5, 'hint. Schulter': .5},
    'Shrugs': {'Trapez': 1},
    'Schulterdrücken Maschine (seitliche Schulter)': {'vord. Schulter': 1, 'seitl. Schulter': .5, 'Trizeps': .5},
    'Seitheben Maschine': {'seitl. Schulter': 1},
    'Frontheben einarmig (KH)': {'vord. Schulter': 1},
    'Reverse Butterfly': {'hint. Schulter': 1},
    'Bizeps Curls (SZ)': {'Bizeps': 1},
    'Scottcurls (einarmig)': {'Bizeps': 1},
    'Hammercurls (Kabel)': {'Bizeps': 1},
    'Bizeps Curls auf Schrägbank (beidarmig)': {'Bizeps': 1},
    'Trizepsdrücken (Kabel)': {'Trizeps': 1},
    'Trizeps einarmig steh.': {'Trizeps': 1},
    'Trizeps Pushdown (Seil)': {'Trizeps': 1},
    'Squats (Langhantel)': {'Quadrizeps': 1, 'Gesäß': .5},
    'Sled Hack Squat': {'Quadrizeps': 1, 'Gesäß': .5},
    '45° Beinpresse': {'Quadrizeps': 1, 'Gesäß': .5},
    'Leg Extension (1-bein.)': {'Quadrizeps': 1},
    'Leg Curl': {'Beinbeuger': 1},
    'Rumänisches Kreuzheben (LH)': {'Beinbeuger': 1, 'Gesäß': 1},
    'Adduktorenmaschine sitzend': {'Adduktoren': 1},
    'Abduktorenmaschine sitzend (nach außen)': {'Abduktoren': 1},
    'Wadenheben Maschine (stehend)': {'Waden': 1},
}
MUSCLE_ORDER = ['Brust', 'Rücken', 'vord. Schulter', 'seitl. Schulter', 'hint. Schulter', 'Trapez',
                'Bizeps', 'Trizeps', 'Quadrizeps', 'Beinbeuger', 'Gesäß', 'Waden', 'Adduktoren', 'Abduktoren', 'Bauch']


def load_sessions(db: str, start: dt.date | None, end: dt.date | None) -> list[dict]:
    con = sqlite3.connect(f'file:{db}?mode=ro', uri=True)
    out = []
    for date_iso, duration, ex_json in con.execute(
            'select date_iso, duration_min, exercises_json from training_sessions order by date_iso'):
        d = dt.date.fromisoformat(date_iso)
        if (start and d < start) or (end and d > end):
            continue
        work = [(e['name'], s) for e in json.loads(ex_json or '[]') for s in e.get('sets', [])
                if not s.get('wu') and (s.get('r') or 0) > 0]
        out.append({'date': d, 'duration': duration or 0, 'work': work})
    return out


def report(sessions: list[dict], start: dt.date | None, end: dt.date | None) -> str:
    if not sessions:
        return 'Keine Einheiten im Zeitraum.'
    first, last = sessions[0]['date'], sessions[-1]['date']
    p_start, p_end = start or first, end or last
    weeks = ((p_end - p_start).days + 1) / 7
    lines: list[str] = []
    w = lines.append

    w(f'## Zeitraum {p_start} bis {p_end} ({weeks:.1f} Wochen)\n')
    dates = sorted({s['date'] for s in sessions})
    gaps = [(dates[i + 1] - dates[i]).days for i in range(len(dates) - 1)]
    per_week = collections.Counter(d.isocalendar()[:2] for d in dates)
    durations = [s['duration'] for s in sessions if s['duration']]
    w('| Kennzahl | Wert |\n|---|---|')
    w(f'| Einheiten | {len(sessions)} an {len(dates)} Trainingstagen |')
    w(f'| **Ø Einheiten pro Woche** | **{len(dates) / weeks:.2f}** |')
    w(f'| Wochen mit ≥ 4 Einheiten | {sum(1 for v in per_week.values() if v >= 4)} von {weeks:.0f} |')
    w(f'| Längste Pause | {max(gaps) if gaps else 0} Tage |')
    w(f'| Ø Dauer | {statistics.mean(durations):.0f} min |' if durations else '| Ø Dauer | – |')
    w('')

    # Wochenvolumen (fraktionale Sätze) und Häufigkeit (Einheiten mit ≥ 1 direktem Satz) pro Muskel
    vol: collections.Counter = collections.Counter()
    hits: collections.Counter = collections.Counter()
    unknown: set[str] = set()
    for s in sessions:
        direct = set()
        for name, _ in s['work']:
            m = MUSCLES.get(name)
            if m is None:
                unknown.add(name)
                continue
            for muscle, f in m.items():
                vol[muscle] += f
                if f >= 1:
                    direct.add(muscle)
        for muscle in direct:
            hits[muscle] += 1
    w('### Pro Muskel (Ø pro Woche)\n')
    w('| Muskel | Sätze/Woche (fraktional) | Trainiert ×/Woche |\n|---|---|---|')
    for m in MUSCLE_ORDER:
        if vol[m] or hits[m]:
            w(f'| {m} | {vol[m] / weeks:.1f} | {hits[m] / weeks:.1f} |')
    if unknown:
        w(f'\n_Nicht zugeordnete Übungen (in MUSCLES ergänzen): {", ".join(sorted(unknown))}_')
    w('')

    reps = [st.get('r', 0) for s in sessions for _, st in s['work']]
    top = collections.Counter(reps).most_common(5)
    w('### Wiederholungsmuster\n')
    w(f'- Arbeitssätze: {len(reps)}')
    w(f'- Anteil genau 10 Wdh: **{reps.count(10) / len(reps):.0%}** (Ziel: kein fester Stopp bei glatten Zahlen)')
    w(f'- Häufigste Wdh-Zahlen: {", ".join(f"{r}× {n}" for r, n in top)}\n')

    # Progression: Ø geschätztes 1RM (Epley) der ersten 3 vs. letzten 3 Einheiten im Zeitraum
    per_ex: dict[str, list] = collections.defaultdict(list)
    for s in sessions:
        by: dict[str, list] = collections.defaultdict(list)
        for name, st in s['work']:
            by[name].append(st)
        for name, sets in by.items():
            e1rm = max(st['w'] * (1 + st['r'] / 30) for st in sets)
            per_ex[name].append((s['date'], max(st['w'] for st in sets), e1rm))
    w('### Progression je Übung (erste 3 vs. letzte 3 Einheiten im Zeitraum)\n')
    w('| Übung | Einheiten | Top-Gewicht | geschätztes 1RM | Änderung |\n|---|---|---|---|---|')
    for name in sorted(per_ex, key=lambda n: list(MUSCLES).index(n) if n in MUSCLES else 999):
        v = per_ex[name]
        if len(v) < 2:
            w(f'| {name} | {len(v)} | {v[-1][1]:g} kg | – | zu wenig Daten |')
            continue
        k = min(3, len(v) // 2)
        a = statistics.mean(x[2] for x in v[:k])
        b = statistics.mean(x[2] for x in v[-k:])
        change = f'{(b / a - 1) * 100:+.0f} %' if a else '– (Körpergewicht)'
        w(f'| {name} | {len(v)} | {v[0][1]:g} → {v[-1][1]:g} kg | {a:.1f} → {b:.1f} | {change} |')
    return '\n'.join(lines)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('db')
    ap.add_argument('--from', dest='start', type=dt.date.fromisoformat)
    ap.add_argument('--to', dest='end', type=dt.date.fromisoformat)
    args = ap.parse_args()
    sys.stdout.reconfigure(encoding='utf-8')   # Windows-Konsole: Umlaute und Sonderzeichen
    print(report(load_sessions(args.db, args.start, args.end), args.start, args.end))


if __name__ == '__main__':
    main()
