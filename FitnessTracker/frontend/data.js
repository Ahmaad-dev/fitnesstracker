/* FitTracker — mock data + domain helpers (plain JS, on window.FT)
   Personalisiert auf den 5er-Split des Nutzers: Brust · Rücken · Schulter · Arm · Beine */
(function () {
  // muscle groups → hue var
  const MUSCLES = {
    Brust:    { v: '--m-brust' },
    Schulter: { v: '--m-schulter' },
    Trizeps:  { v: '--m-trizeps' },
    Rücken:   { v: '--m-ruecken' },
    Bizeps:   { v: '--m-bizeps' },
    Trapez:   { v: '--m-trapez' },
    Beine:    { v: '--m-beine' },
    Core:     { v: '--m-core' },
  };

  // the user's real exercise catalog, grouped by training day
  const EXERCISES = [
    // Brusttag
    { name: 'Schrägbankdrücken (KH)', day: 'Brust', muscle: 'Brust', pattern: 'bench', img: 'Incline_Dumbbell_Press' },
    { name: 'Flachbankdrücken (KH)',  day: 'Brust', muscle: 'Brust', pattern: 'bench', img: 'Dumbbell_Bench_Press' },
    { name: 'Butterfly Maschine',     day: 'Brust', muscle: 'Brust', pattern: 'bench', img: 'Butterfly' },
    { name: 'Liegestütze',            day: 'Brust', muscle: 'Brust', pattern: 'dips',  img: 'Pushups' },
    // Rückentag
    { name: 'Latzug (mittelbreit)',   day: 'Rücken', muscle: 'Rücken', pattern: 'pulldown', img: 'Wide-Grip_Lat_Pulldown' },
    { name: 'Latzug (V-Bar)',         day: 'Rücken', muscle: 'Rücken', pattern: 'pulldown', img: 'V-Bar_Pulldown' },
    { name: 'Smith Bent Over Row',    day: 'Rücken', muscle: 'Rücken', pattern: 'row',      img: 'Bent_Over_Two-Arm_Long_Bar_Row', barTip: 'Stange nicht mitzählen' },
    { name: 'Lever Low Row',          day: 'Rücken', muscle: 'Rücken', pattern: 'row',      img: 'Seated_Cable_Rows' },
    { name: 'Rudern am Kabel',        day: 'Rücken', muscle: 'Rücken', pattern: 'row',      img: 'Seated_Cable_Rows' },
    { name: 'Shrugs',                 day: 'Rücken', muscle: 'Trapez', pattern: 'raise',    img: 'Dumbbell_Shrug' },
    // Schultertag
    { name: 'Schulterdrücken Maschine (seitliche Schulter)', day: 'Schulter', muscle: 'Schulter', pattern: 'overhead', img: 'Smith_Machine_Overhead_Shoulder_Press' },
    { name: 'Seitheben Maschine',     day: 'Schulter', muscle: 'Schulter', pattern: 'raise',    img: 'Side_Lateral_Raise' },
    { name: 'Reverse Butterfly',      day: 'Schulter', muscle: 'Schulter', pattern: 'raise',    img: 'Reverse_Machine_Flyes' },
    // Armtag
    { name: 'Bizeps Curls (SZ)',      day: 'Arm', muscle: 'Bizeps',  pattern: 'curl',     img: 'EZ-Bar_Curl', barTip: 'SZ-Stange mitzählen (~10 kg)' },
    { name: 'Trizepsdrücken (Kabel)', day: 'Arm', muscle: 'Trizeps', pattern: 'pushdown', img: 'Triceps_Pushdown' },
    { name: 'Scottcurls (einarmig)',  day: 'Arm', muscle: 'Bizeps',  pattern: 'curl',     img: 'One_Arm_Dumbbell_Preacher_Curl' },
    { name: 'Trizeps einarmig steh.', day: 'Arm', muscle: 'Trizeps', pattern: 'pushdown', img: 'Cable_One_Arm_Tricep_Extension' },
    { name: 'Hammercurls (Kabel)',    day: 'Arm', muscle: 'Bizeps',  pattern: 'curl',     img: 'Cable_Hammer_Curls_-_Rope_Attachment' },
    { name: 'Trizeps Pushdown (Seil)',day: 'Arm', muscle: 'Trizeps', pattern: 'pushdown', img: 'Triceps_Pushdown_-_Rope_Attachment' },
    // Legday
    { name: 'Squats (Langhantel)',    day: 'Beine', muscle: 'Beine', pattern: 'squat',    img: 'Barbell_Squat', barTip: 'Stange mitzählen (20 kg)' },
    { name: 'Sled Hack Squat',        day: 'Beine', muscle: 'Beine', pattern: 'squat',    img: 'Leg_Press' },
    { name: '45° Beinpresse',         day: 'Beine', muscle: 'Beine', pattern: 'legpress', img: 'Leg_Press' },
    { name: 'Leg Extension (1-bein.)',day: 'Beine', muscle: 'Beine', pattern: 'legpress', img: 'Leg_Extensions' },
    { name: 'Leg Curl',               day: 'Beine', muscle: 'Beine', pattern: 'hinge',    img: 'Lying_Leg_Curls' },
    { name: 'Adduktorenmaschine sitzend', day: 'Beine', muscle: 'Beine', pattern: 'legpress', img: 'Thigh_Adductor' },
    { name: 'Wadenheben Maschine (stehend)', day: 'Beine', muscle: 'Beine', pattern: 'raise', img: 'Standing_Calf_Raises' },
  ];

  // training history — start empty; real data comes from api-bridge.js
  const SESSIONS = [];

  // recovery — derived from real sessions, start empty
  const RECOVERY = [];

  // AI recommendation — the user picks the exercise; the AI recommends the LOAD.
  // Today it surfaces Rückentag (longest rested) with progressive-overload loads.
  const RECOMMENDATION = {
    day: 'Rücken',
    headline: 'Rückentag',
    reason: 'Rücken & Trapez sind seit 6 Tagen erholt – am längsten nicht trainiert. Brust (gestern) und Beine sind noch in Erholung.',
    facts: [
      { k: 'Rücken zuletzt',  v: 'vor 6 Tagen' },
      { k: 'Brust zuletzt',   v: 'gestern' },
      { k: 'Beine zuletzt',   v: 'vor 3 Tagen' },
    ],
    // loads computed from the user's last Rückentag sets
    weights: [
      { name: 'Latzug (mittelbreit)',  muscle: 'Rücken', last: '65 kg × 9',  suggest: 67.5, delta: 2.5, reps: '8–10',  note: 'Beide Arbeitssätze sauber → +2,5 kg.' },
      { name: 'Latzug (V-Bar)',        muscle: 'Rücken', last: '60 kg × 9',  suggest: 62.5, delta: 2.5, reps: '8–10',  note: 'Obere Wdh-Grenze erreicht → steigern.' },
      { name: 'Smith Bent Over Row',   muscle: 'Rücken', last: '50 kg × 10', suggest: 52.5, delta: 2.5, reps: '10–12', note: 'Alle Sätze ≥10 Wdh → erhöhen.' },
      { name: 'Lever Low Row',         muscle: 'Rücken', last: '55 kg × 10', suggest: 57.5, delta: 2.5, reps: '10–12', note: 'Saubere Ausführung → +2,5 kg.' },
      { name: 'Rudern am Kabel',       muscle: 'Rücken', last: '60 kg × 10', suggest: 62.5, delta: 2.5, reps: '10–12', note: 'Obere Wdh-Grenze → steigern.' },
      { name: 'Shrugs',                muscle: 'Trapez', last: '34 kg × 12', suggest: 36,   delta: 2,   reps: '12–15', note: '12 saubere Wdh → kleine Steigerung.' },
    ],
  };

  // ── animierte Übungs-GIFs (jsDelivr-CDN, kein API-Key, lädt direkt als <img>) ──
  // Quelle: github.com/JahelCuadrado/ExerciseGymGifsDB (ExerciseDB-GIF-Set)
  // Wert = "<muskel-ordner>/<slug>" → volle URL via gifFor(name)
  const GIF_BASE = 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/';
  const GIF_MAP = {
    'Schrägbankdrücken (KH)': 'pectorals/dumbbell-incline-bench-press',
    'Flachbankdrücken (KH)':  'pectorals/dumbbell-bench-press',
    'Butterfly Maschine':     'pectorals/lever-seated-fly',
    'Liegestütze':            'pectorals/push-up',
    'Latzug (mittelbreit)':   'lats/cable-pulldown',
    'Latzug (V-Bar)':         'lats/cable-lateral-pulldown-with-v-bar',
    'Smith Bent Over Row':    'upper-back/smith-bent-over-row',
    'Lever Low Row':          'upper-back/lever-seated-row',
    'Rudern am Kabel':        'upper-back/cable-seated-row',
    'Shrugs':                 'traps/dumbbell-shrug',
    'Schulterdrücken Maschine (seitliche Schulter)': 'delts/lever-shoulder-press-v-2',
    'Seitheben Maschine':     'delts/lever-lateral-raise',
    'Reverse Butterfly':      'delts/lever-seated-reverse-fly',
    'Bizeps Curls (SZ)':      'biceps/ez-barbell-curl',
    'Trizepsdrücken (Kabel)': 'triceps/cable-pushdown',
    'Scottcurls (einarmig)':  'biceps/dumbbell-one-arm-zottman-preacher-curl',
    'Trizeps einarmig steh.': 'triceps/dumbbell-standing-one-arm-extension',
    'Hammercurls (Kabel)':    'biceps/cable-hammer-curl-with-rope',
    'Trizeps Pushdown (Seil)':'triceps/cable-pushdown-with-rope-attachment',
    'Squats (Langhantel)':    'glutes/barbell-full-squat',
    'Sled Hack Squat':        'glutes/sled-hack-squat',
    '45° Beinpresse':         'glutes/sled-45-leg-press',
    'Leg Extension (1-bein.)':'quads/lever-leg-extension',
    'Leg Curl':               'hamstrings/lever-lying-leg-curl',
    'Adduktorenmaschine sitzend':    'adductors/lever-seated-hip-adduction',
    'Wadenheben Maschine (stehend)': 'calves/lever-standing-calf-raise',
  };

  // detected sets from a watch sync (no exercise known yet)
  const DETECTED_SETS = [
    { id: 'd1', reps: 12, dur: 40, rest: 95,  hr: 132 },
    { id: 'd2', reps: 10, dur: 34, rest: 110, hr: 140 },
    { id: 'd3', reps: 9,  dur: 31, rest: 120, hr: 146 },
    { id: 'd4', reps: 10, dur: 36, rest: 90,  hr: 138 },
    { id: 'd5', reps: 9,  dur: 33, rest: 105, hr: 142 },
    { id: 'd6', reps: 12, dur: 39, rest: 85,  hr: 134 },
    { id: 'd7', reps: 15, dur: 42, rest: 75,  hr: 129 },
    { id: 'd8', reps: 12, dur: 37, rest: 0,   hr: 133 },
  ];

  // ── mehrere erkannte Trainingseinheiten (z. B. 3 Tage nicht gesynct) ──
  // jede Einheit hat eigene erkannte Sätze; der Nutzer ordnet sie einzeln zu.
  const mkSets = (prefix, arr) => arr.map((s, i) => ({ id: `${prefix}${i + 1}`, reps: s[0], dur: s[1], rest: s[2], hr: s[3] }));
  const PENDING_SESSIONS = [
    {
      id: 'p1', date: 'Di, 2. Juni', weekday: 'Dienstag', dayGuess: 'Schulter',
      sets: mkSets('a', [[15, 38, 70, 124], [12, 35, 95, 132], [11, 33, 100, 136], [15, 40, 80, 128], [12, 36, 105, 134], [11, 34, 110, 138], [15, 41, 75, 126], [12, 37, 0, 130]]),
    },
    {
      id: 'p2', date: 'Mi, 3. Juni', weekday: 'Mittwoch', dayGuess: 'Brust',
      sets: mkSets('b', [[12, 42, 90, 128], [9, 36, 115, 140], [8, 33, 120, 146], [8, 32, 120, 148], [10, 38, 100, 138], [9, 35, 110, 142], [10, 40, 95, 136], [20, 44, 105, 130], [16, 40, 0, 132]]),
    },
    {
      id: 'p3', date: 'Do, 4. Juni', weekday: 'Donnerstag', dayGuess: 'Arm',
      sets: mkSets('c', [[12, 36, 80, 122], [10, 33, 100, 130], [9, 31, 105, 134], [12, 35, 90, 128], [10, 32, 100, 132], [12, 37, 85, 126], [10, 34, 95, 130]]),
    },
  ];

  // weekly activity (Mon..Sun, current week) — sets per day, null = no training
  const WEEK = [
    { d: 'Mo', sets: 21, type: 'Beine' },
    { d: 'Di', sets: null },
    { d: 'Mi', sets: 13, type: 'Brust' },
    { d: 'Do', sets: null },
    { d: 'Fr', sets: null },
    { d: 'Sa', sets: null },
    { d: 'So', sets: null },
  ];

  // ── per-exercise training log (oldest→newest) for the Verlauf progression charts ──
  const DAY_DATES = {
    Brust:    ['8. Mai', '15. Mai', '22. Mai', '29. Mai', '3. Juni'],
    Rücken:   ['1. Mai', '8. Mai', '15. Mai', '22. Mai', '29. Mai'],
    Schulter: ['2. Mai', '9. Mai', '16. Mai', '23. Mai', '30. Mai'],
    Arm:      ['3. Mai', '10. Mai', '17. Mai', '24. Mai', '31. Mai'],
    Beine:    ['4. Mai', '11. Mai', '18. Mai', '25. Mai', '1. Juni'],
  };
  // spec per exercise: [topWeights×5, workingReps, warmup?, repsSeries?(bodyweight)]
  const LOG_SPEC = {
    'Schrägbankdrücken (KH)': [[22, 24, 26, 26, 28], [10, 9, 8], true],
    'Flachbankdrücken (KH)':  [[28, 28, 30, 30, 32], [10, 9, 8], true],
    'Butterfly Maschine':     [[50, 52.5, 55, 55, 60], [12, 10, 10], false],
    'Liegestütze':            [[0, 0, 0, 0, 0], [20, 16, 14], false, [16, 18, 18, 20, 22]],
    'Latzug (mittelbreit)':   [[57.5, 60, 62.5, 62.5, 65], [12, 10, 9], true],
    'Latzug (V-Bar)':         [[55, 55, 57.5, 57.5, 60], [10, 10, 9], false],
    'Smith Bent Over Row':    [[40, 45, 45, 47.5, 50], [12, 10, 10], true],
    'Lever Low Row':          [[40, 45, 50, 50, 55], [12, 10, 10], false],
    'Rudern am Kabel':        [[50, 55, 55, 57.5, 60], [12, 10, 10], false],
    'Shrugs':                 [[28, 30, 32, 32, 34], [15, 12], false],
    'Schulterdrücken Maschine (seitliche Schulter)': [[40, 45, 45, 47.5, 50], [12, 10, 8], true],
    'Seitheben Maschine':     [[20, 22.5, 25, 27.5, 30], [15, 12, 11], false],
    'Reverse Butterfly':      [[25, 30, 32.5, 35, 32.5], [15, 12, 12], false],
    'Bizeps Curls (SZ)':      [[10, 10, 12.5, 12.5, 15], [12, 10, 9], true],
    'Trizepsdrücken (Kabel)': [[25, 27.5, 30, 30, 32.5], [12, 10, 9], false],
    'Scottcurls (einarmig)':  [[10, 12, 12, 12, 14], [10, 9], false],
    'Trizeps einarmig steh.': [[12.5, 12.5, 15, 15, 17.5], [12, 11], false],
    'Hammercurls (Kabel)':    [[18, 20, 20, 22, 24], [12, 10], false],
    'Trizeps Pushdown (Seil)':[[27.5, 30, 32.5, 32.5, 35], [12, 10], false],
    'Squats (Langhantel)':    [[85, 90, 95, 95, 100], [8, 6, 6], true],
    'Sled Hack Squat':        [[60, 70, 80, 80, 90], [12, 10, 9], true],
    '45° Beinpresse':         [[180, 200, 200, 210, 220], [12, 10], false],
    'Leg Extension (1-bein.)':[[30, 30, 32.5, 32.5, 35], [12, 11, 12], false],
    'Leg Curl':               [[35, 40, 40, 42.5, 45], [12, 10, 10], false],
    'Adduktorenmaschine sitzend':    [[40, 45, 45, 50, 50], [15, 12, 12], false],
    'Wadenheben Maschine (stehend)': [[70, 80, 80, 90, 90], [15, 12, 12], false],
  };
  const EX_LOG = {};
  EXERCISES.forEach((ex) => {
    const spec = LOG_SPEC[ex.name]; if (!spec) return;
    const [tops, reps, wu, repsSeries] = spec;
    const dates = DAY_DATES[ex.day];
    const bw = tops.every((t) => t === 0);
    EX_LOG[ex.name] = tops.map((top, i) => {
      if (bw) {
        const rs = repsSeries[i];
        const sets = [0, 4, 6].map((off) => ({ w: 0, r: Math.max(6, rs - off) }));
        return { date: dates[i], w: 0, topReps: rs, bw: true, sets };
      }
      const sets = [];
      if (wu && top > 0) sets.push({ w: Math.max(2.5, Math.round((top * 0.6) / 2.5) * 2.5), r: 12, wu: true });
      reps.forEach((r) => sets.push({ w: top, r }));
      return { date: dates[i], w: top, topReps: reps[0], bw: false, sets };
    });
  });

  // metadata per training day for the Verlauf group list
  const DAY_COLOR = { Brust: 'Brust', Rücken: 'Rücken', Schulter: 'Schulter', Arm: 'Bizeps', Beine: 'Beine' };
  const dayMeta = (d) => {
    const exs = EXERCISES.filter((e) => e.day === d);
    // Use EX_LOG (built from real exercise data) instead of session.type —
    // session.type is unreliable because dayGuess often assigns the wrong day.
    const log = (window.FT && window.FT.EX_LOG) || {};
    let latestDate = null;
    let latestIso  = null;
    exs.forEach((ex) => {
      const entries = log[ex.name];
      if (!entries || !entries.length) return;
      const last = entries[entries.length - 1]; // EX_LOG is oldest→newest
      const iso = last.date_iso || '';
      if (!latestIso || iso > latestIso) {
        latestIso  = iso;
        latestDate = last.date;
      }
    });
    return { day: d, count: exs.length, last: latestDate || '—', colorMuscle: DAY_COLOR[d] };
  };

  // ── erweiterte Verlaufsreihe: 15 Einheiten pro Übung (für das vergrößerte Diagramm) ──
  // Die letzten 5 entsprechen EX_LOG; davor 10 ältere, niedrigere Werte (organischer Anstieg).
  const FULL_N = 15;
  const fmtDE = (dt) => `${dt.getDate()}.${dt.getMonth() + 1}.`;
  const EX_LOG_FULL = {};
  EXERCISES.forEach((ex) => {
    const log = EX_LOG[ex.name]; if (!log || !log.length) return;
    const bw = log[0].bw;
    const known = log.map((p) => (bw ? p.topReps : p.w));   // 5 jüngste Werte
    const first = known[0];
    const back = bw ? 6 : (first > 120 ? 45 : first > 60 ? 22 : first > 20 ? 11 : 5);
    const step = bw ? 1 : 2.5;
    const olderCount = FULL_N - known.length;
    const older = [];
    for (let k = 0; k < olderCount; k++) {
      const frac = k / olderCount;                          // 0 → ältester, ~1 → kurz vor first
      let v = first - back * (1 - frac);
      if (k % 4 === 1) v -= step;                           // kleine organische Delle
      v = bw ? Math.max(6, Math.round(v)) : Math.max(step, Math.round(v / step) * step);
      older.push(v);
    }
    const series = older.concat(known);                     // 15 Werte
    const base = new Date(2026, 5, 4);                       // endet 4. Juni 2026
    EX_LOG_FULL[ex.name] = series.map((v, i) => {
      const dt = new Date(base); dt.setDate(base.getDate() - (FULL_N - 1 - i) * 7);
      return { date: fmtDE(dt), w: bw ? 0 : v, topReps: bw ? v : null, bw };
    });
  });

  // ── manuell erfasste Sätze: persistieren + beim Laden wieder einspielen ──
  // Nebenfeature (ohne Uhr/Sync). Hängt einen „Heute"-Punkt an EX_LOG + EX_LOG_FULL.
  const MANUAL_KEY = 'ft_manual_v1';
  const readManual = () => { try { return JSON.parse(localStorage.getItem(MANUAL_KEY) || '[]'); } catch (e) { return []; } };
  const applyManual = (name, w, reps) => {
    const ref = (window.FT ? window.FT.EX_LOG[name] : null) || EX_LOG[name];
    const bw = ref && ref.length ? ref[0].bw : (Number(w) === 0);
    const W = bw ? 0 : Number(w), R = Number(reps);
    const entry = { date: 'Heute', w: W, topReps: R, bw, manual: true, sets: [{ w: W, r: R }] };
    // Update closure (for initial replay before window.FT is ready)
    if (EX_LOG[name]) EX_LOG[name].push(entry); else EX_LOG[name] = [entry];
    if (EX_LOG_FULL[name]) EX_LOG_FULL[name].push({ date: 'Heute', w: W, topReps: bw ? R : null, bw });
    // Also update window.FT.EX_LOG/EX_LOG_FULL when already initialized (live adds)
    if (window.FT) {
      const wl = window.FT.EX_LOG;
      if (wl[name]) wl[name].push(entry); else wl[name] = [entry];
      const wf = window.FT.EX_LOG_FULL;
      if (wf[name]) wf[name].push({ date: 'Heute', w: W, topReps: bw ? R : null, bw });
      else wf[name] = [{ date: 'Heute', w: W, topReps: bw ? R : null, bw }];
    }
  };
  readManual().forEach((m) => applyManual(m.name, m.w, m.reps));

  window.FT = {
    MUSCLES, EXERCISES, SESSIONS, RECOVERY, RECOMMENDATION, DETECTED_SETS, PENDING_SESSIONS, WEEK,
    EX_LOG: {}, EX_LOG_FULL: {}, // start empty; populated from real backend data
    DAYS: ['Brust', 'Rücken', 'Schulter', 'Arm', 'Beine'],
    dayLabel: (d) => ({ Brust: 'Brust', Rücken: 'Rücken', Schulter: 'Schulter', Arm: 'Arme', Beine: 'Beine' }[d] || d),
    dayMeta,
    PROFILE_DEFAULTS: {
      name: 'Alex', age: 28, weight: 78, height: 182, sex: 'Männlich',
      goal: 'Muskelaufbau', level: 'Fortgeschritten',
      unit: 'kg', weekGoal: 5, watch: 'vívoactive 6', aiEnabled: true,
    },
    stats: { streak: 3 },
    weekSessions: () => (window.FT.WEEK || WEEK).filter((d) => d.sets != null).length,
    todayLabel: (() => {
      const DAYS_DE   = ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];
      const MONTHS_DE = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
      const n = new Date();
      return `${DAYS_DE[n.getDay()]}, ${n.getDate()}. ${MONTHS_DE[n.getMonth()]}`;
    })(),
    muscleColor: (m) => `var(${(MUSCLES[m] || {}).v || '--text-dim'})`,
    patternFor: (name) => (EXERCISES.find((e) => e.name === name) || {}).pattern || 'squat',
    imgFor: (name) => (EXERCISES.find((e) => e.name === name) || {}).img || null,
    GIF_BASE,
    gifFor: (name) => (GIF_MAP[name] ? GIF_BASE + GIF_MAP[name] + '.gif' : null),
    barTipFor: (name) => (EXERCISES.find((e) => e.name === name) || {}).barTip || null,
    IMG_BASE: 'https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises/',
    // ── KI helpers ──
    // last working weight logged for an exercise (always reads live window.FT.EX_LOG)
    lastWeight: (name) => { const l = window.FT.EX_LOG[name]; return l && l.length ? l[l.length - 1].w : null; },
    lastReps: (name) => { const l = window.FT.EX_LOG[name]; return l && l.length ? l[l.length - 1].topReps : null; },
    // compact payload of the last sessions per exercise, for the AI request
    recentData: () => EXERCISES.map((e) => ({
      name: e.name, tag: e.day, muscle: e.muscle,
      bodyweight: (window.FT.EX_LOG[e.name] || [{}])[0].bw || false,
      sessions: (window.FT.EX_LOG[e.name] || []).map((s) => ({ date: s.date, kg: s.w, topReps: s.topReps })),
    })),
    // local calendar day key — recommendations reset when this changes (midnight)
    todayKey: () => new Date().toLocaleDateString('en-CA'),
    // ── nächste fällige Muskelgruppe (für „Gewichte für heute") ──
    // letzte erfasste Gruppe (per Datum, inkl. manuell erfasster Sätze) → nächste im Split
    lastTrainedDay: () => {
      // Use EX_LOG (same source as dayMeta/Fortschritt) — avoids broken date-string
      // parsing ("jun" not in MONTHS) and wrong session.type from dayGuess.
      const log = (window.FT && window.FT.EX_LOG) || {};
      let bestDay = null, bestIso = '';
      EXERCISES.forEach((ex) => {
        const entries = log[ex.name];
        if (!entries || !entries.length) return;
        const last = entries[entries.length - 1];  // EX_LOG is oldest→newest
        const iso = last.date_iso || '';
        if (iso > bestIso) { bestIso = iso; bestDay = ex.day; }
      });
      if (bestDay) return bestDay;
      // fallback: manuell erfasste Sätze
      const manual = readManual();
      if (manual.length) {
        const lastM = manual.reduce((a, b) => (b.t > a.t ? b : a));
        const ex = EXERCISES.find((e) => e.name === lastM.name);
        if (ex) return ex.day;
      }
      return null;
    },
    nextDay: function () {
      const order = ['Brust', 'Rücken', 'Schulter', 'Arm', 'Beine'];
      const last = this.lastTrainedDay();
      const i = order.indexOf(last);
      return i < 0 ? order[0] : order[(i + 1) % order.length];
    },
    // ── manuelles Logging (Nebenfeature) ──
    // speichert einen manuell erfassten Satz, hängt ihn live an die Verläufe und persistiert ihn
    addManualSet: (name, w, reps) => {
      applyManual(name, w, reps);
      const list = readManual(); list.push({ name, w: Number(w), reps: Number(reps), t: Date.now() });
      try { localStorage.setItem(MANUAL_KEY, JSON.stringify(list)); } catch (e) {}
    },
    manualToday: () => readManual(),
  };
})();
