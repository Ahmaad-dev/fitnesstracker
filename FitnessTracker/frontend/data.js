/* FitTracker — Übungskatalog + Domain-Helfer (plain JS, auf window.FT).
   Echte Daten (Einheiten, Verläufe, offene Garmin-Einheiten) lädt api-bridge.js.
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

  // Gewichts-Konvention (Hinweis "barTip" — wird im Verlauf, beim Zuordnen und an die KI gezeigt):
  //   • 2 Kurzhanteln gleichzeitig  → Gewicht EINER Hantel eintragen (nicht ×2)
  //   • Scheiben links + rechts      → beide Seiten ADDIEREN (Langhantel/SZ inkl. Stange, Maschinen ohne Schlitten/Hebel)
  //   • Steckgewicht / Kabel         → Zahl am Gewichtsblock
  //   • Körpergewicht                → 0 kg, nur Zusatzgewicht eintragen
  const TIP_KH  = 'Gewicht einer Hantel eintragen (nicht ×2)';
  const TIP_SUM = 'Scheiben beider Seiten addieren';
  const TIP_BW  = 'Körpergewicht = 0 kg · nur Zusatzgewicht eintragen';

  // the user's real exercise catalog, grouped by training day
  const EXERCISES = [
    // Allgemein (Körpergewicht, an jedem Tag möglich — nicht Teil des 5er-Splits)
    { name: 'Klimmzüge',              day: 'Allgemein', muscle: 'Rücken',  pattern: 'pulldown', img: 'Pullups', barTip: TIP_BW },
    { name: 'Liegestütze',            day: 'Allgemein', muscle: 'Brust',   pattern: 'dips',     img: 'Pushups', barTip: TIP_BW },
    { name: 'Dips',                   day: 'Allgemein', muscle: 'Trizeps', pattern: 'dips',     img: 'Dips_-_Chest_Version', barTip: TIP_BW },
    // Brusttag
    { name: 'Schrägbankdrücken (KH)', day: 'Brust', muscle: 'Brust', pattern: 'bench', img: 'Incline_Dumbbell_Press', barTip: TIP_KH },
    { name: 'Flachbankdrücken (KH)',  day: 'Brust', muscle: 'Brust', pattern: 'bench', img: 'Dumbbell_Bench_Press', barTip: TIP_KH },
    { name: 'Butterfly Maschine',     day: 'Brust', muscle: 'Brust', pattern: 'bench', img: 'Butterfly' },
    // Rückentag
    { name: 'Latzug (mittelbreit)',   day: 'Rücken', muscle: 'Rücken', pattern: 'pulldown', img: 'Wide-Grip_Lat_Pulldown' },
    { name: 'Latzug (V-Bar)',         day: 'Rücken', muscle: 'Rücken', pattern: 'pulldown', img: 'V-Bar_Pulldown' },
    { name: 'Smith Bent Over Row',    day: 'Rücken', muscle: 'Rücken', pattern: 'row',      img: 'Bent_Over_Two-Arm_Long_Bar_Row', barTip: 'Scheiben beider Seiten addieren · Stange nicht mitzählen' },
    { name: 'Lever Low Row',          day: 'Rücken', muscle: 'Rücken', pattern: 'row',      img: 'Seated_Cable_Rows', barTip: TIP_SUM },
    { name: 'High Row Maschine',      day: 'Rücken', muscle: 'Rücken', pattern: 'row',      img: 'Leverage_High_Row', barTip: TIP_SUM },
    { name: 'Rudern am Kabel',        day: 'Rücken', muscle: 'Rücken', pattern: 'row',      img: 'Seated_Cable_Rows' },
    { name: 'Shrugs',                 day: 'Rücken', muscle: 'Trapez', pattern: 'raise',    img: 'Dumbbell_Shrug', barTip: TIP_KH },
    // Schultertag
    { name: 'Schulterdrücken Maschine (seitliche Schulter)', day: 'Schulter', muscle: 'Schulter', pattern: 'overhead', img: 'Smith_Machine_Overhead_Shoulder_Press' },
    { name: 'Seitheben Maschine',     day: 'Schulter', muscle: 'Schulter', pattern: 'raise',    img: 'Side_Lateral_Raise' },
    { name: 'Reverse Butterfly',      day: 'Schulter', muscle: 'Schulter', pattern: 'raise',    img: 'Reverse_Machine_Flyes' },
    { name: 'Frontheben einarmig (KH)', day: 'Schulter', muscle: 'Schulter', pattern: 'raise',  img: 'Front_Dumbbell_Raise', barTip: 'Gewicht der einen Hantel eintragen' },
    // Armtag
    { name: 'Bizeps Curls (SZ)',      day: 'Arm', muscle: 'Bizeps',  pattern: 'curl',     img: 'EZ-Bar_Curl', barTip: 'Scheiben beider Seiten + SZ-Stange (~10 kg) addieren' },
    { name: 'Trizepsdrücken (Kabel)', day: 'Arm', muscle: 'Trizeps', pattern: 'pushdown', img: 'Triceps_Pushdown' },
    { name: 'Scottcurls (einarmig)',  day: 'Arm', muscle: 'Bizeps',  pattern: 'curl',     img: 'One_Arm_Dumbbell_Preacher_Curl' },
    { name: 'Trizeps einarmig steh.', day: 'Arm', muscle: 'Trizeps', pattern: 'pushdown', img: 'Cable_One_Arm_Tricep_Extension' },
    { name: 'Hammercurls (Kabel)',    day: 'Arm', muscle: 'Bizeps',  pattern: 'curl',     img: 'Cable_Hammer_Curls_-_Rope_Attachment' },
    { name: 'Trizeps Pushdown (Seil)',day: 'Arm', muscle: 'Trizeps', pattern: 'pushdown', img: 'Triceps_Pushdown_-_Rope_Attachment' },
    { name: 'Bizeps Curls auf Schrägbank (beidarmig)', day: 'Arm', muscle: 'Bizeps',  pattern: 'curl',     img: 'Incline_Dumbbell_Curl', barTip: TIP_KH },
    // Legday
    { name: 'Squats (Langhantel)',    day: 'Beine', muscle: 'Beine', pattern: 'squat',    img: 'Barbell_Squat', barTip: 'Scheiben beider Seiten + Stange (20 kg) addieren' },
    { name: 'Sled Hack Squat',        day: 'Beine', muscle: 'Beine', pattern: 'squat',    img: 'Leg_Press', barTip: 'Scheiben beider Seiten addieren (Schlitten nicht)' },
    { name: '45° Beinpresse',         day: 'Beine', muscle: 'Beine', pattern: 'legpress', img: 'Leg_Press', barTip: 'Scheiben beider Seiten addieren (Schlitten nicht)' },
    { name: 'Leg Extension (1-bein.)',day: 'Beine', muscle: 'Beine', pattern: 'legpress', img: 'Leg_Extensions' },
    { name: 'Leg Curl',               day: 'Beine', muscle: 'Beine', pattern: 'hinge',    img: 'Lying_Leg_Curls' },
    { name: 'Rumänisches Kreuzheben (LH)', day: 'Beine', muscle: 'Beine', pattern: 'hinge', img: 'Romanian_Deadlift', barTip: 'Scheiben beider Seiten + Stange (20 kg) addieren' },
    { name: 'Adduktorenmaschine sitzend', day: 'Beine', muscle: 'Beine', pattern: 'legpress', img: 'Thigh_Adductor' },
    { name: 'Abduktorenmaschine sitzend (nach außen)', day: 'Beine', muscle: 'Beine', pattern: 'legpress', img: 'Thigh_Abductor' },
    { name: 'Wadenheben Maschine (stehend)', day: 'Beine', muscle: 'Beine', pattern: 'raise', img: 'Standing_Calf_Raises' },
  ];

  // ── animierte Übungs-GIFs (jsDelivr-CDN, kein API-Key, lädt direkt als <img>) ──
  // Quelle: github.com/JahelCuadrado/ExerciseGymGifsDB (ExerciseDB-GIF-Set)
  // Wert = "<muskel-ordner>/<slug>" → volle URL via gifFor(name)
  const GIF_BASE = 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/';
  const GIF_MAP = {
    'Schrägbankdrücken (KH)': 'pectorals/dumbbell-incline-bench-press',
    'Flachbankdrücken (KH)':  'pectorals/dumbbell-bench-press',
    'Butterfly Maschine':     'pectorals/lever-seated-fly',
    'Klimmzüge':              'lats/pull-up',
    'Liegestütze':            'pectorals/push-up',
    'Dips':                   'pectorals/chest-dip',
    'Latzug (mittelbreit)':   'lats/cable-pulldown',
    'Latzug (V-Bar)':         'lats/cable-lateral-pulldown-with-v-bar',
    'Smith Bent Over Row':    'upper-back/smith-bent-over-row',
    'Lever Low Row':          'upper-back/lever-seated-row',
    'High Row Maschine':      'upper-back/lever-high-row',
    'Rudern am Kabel':        'upper-back/cable-seated-row',
    'Shrugs':                 'traps/dumbbell-shrug',
    'Schulterdrücken Maschine (seitliche Schulter)': 'delts/lever-shoulder-press-v-2',
    'Seitheben Maschine':     'delts/lever-lateral-raise',
    'Reverse Butterfly':      'delts/lever-seated-reverse-fly',
    'Frontheben einarmig (KH)': 'delts/dumbbell-front-raise',
    'Bizeps Curls (SZ)':      'biceps/ez-barbell-curl',
    'Trizepsdrücken (Kabel)': 'triceps/cable-pushdown',
    'Scottcurls (einarmig)':  'biceps/dumbbell-one-arm-zottman-preacher-curl',
    'Trizeps einarmig steh.': 'triceps/dumbbell-standing-one-arm-extension',
    'Hammercurls (Kabel)':    'biceps/cable-hammer-curl-with-rope',
    'Trizeps Pushdown (Seil)':'triceps/cable-pushdown-with-rope-attachment',
    'Bizeps Curls auf Schrägbank (beidarmig)': 'biceps/dumbbell-incline-biceps-curl',
    'Squats (Langhantel)':    'glutes/barbell-full-squat',
    'Sled Hack Squat':        'glutes/sled-hack-squat',
    '45° Beinpresse':         'glutes/sled-45-leg-press',
    'Leg Extension (1-bein.)':'quads/lever-leg-extension',
    'Leg Curl':               'hamstrings/lever-lying-leg-curl',
    'Rumänisches Kreuzheben (LH)': 'glutes/barbell-romanian-deadlift',
    'Adduktorenmaschine sitzend':    'adductors/lever-seated-hip-adduction',
    'Abduktorenmaschine sitzend (nach außen)': 'abductors/lever-seated-hip-abduction',
    'Wadenheben Maschine (stehend)': 'calves/lever-standing-calf-raise',
  };

  // ── Trainingsmodus „4er-Plan": Oberkörper/Unterkörper, rotierend, jeder Muskel ~2×/Woche ──
  // Der klassische 5er-Split (Brust · Rücken · Schulter · Arm · Beine) bleibt unverändert als Modus „classic".
  // Pro Übung: sets, reps [unten, oben] (null = so viele wie möglich), start = Startgewicht (kg),
  // inc = Steigerungsschritt (kg), ss = Supersatz-Gruppe (gleiche Kennung = direkt nacheinander).
  const OTHER = 'Weitere';
  const PLAN = {
    name: 'Oberkörper / Unterkörper · 4× pro Woche',
    days: ['OK A', 'UK A', 'OK B', 'UK B'],
    labels: { 'OK A': 'Oberkörper A', 'UK A': 'Unterkörper A', 'OK B': 'Oberkörper B', 'UK B': 'Unterkörper B' },
    focus: { 'OK A': 'Brust & Rücken schwer', 'UK A': 'Quadrizeps-Fokus', 'OK B': 'Rücken breit & hintere Schulter', 'UK B': 'Beinbeuger & Po' },
    color: { 'OK A': 'Brust', 'UK A': 'Beine', 'OK B': 'Rücken', 'UK B': 'Beine' },
    items: {
      'OK A': [
        { name: 'Schrägbankdrücken (KH)', sets: 3, reps: [8, 12], start: 22, inc: 2 },
        { name: 'Latzug (mittelbreit)', sets: 3, reps: [8, 12], start: 70, inc: 2.5 },
        { name: 'Schulterdrücken Maschine (seitliche Schulter)', sets: 3, reps: [8, 12], start: 65, inc: 2.5 },
        { name: 'Rudern am Kabel', sets: 3, reps: [8, 12], start: 60, inc: 2.5 },
        { name: 'Seitheben Maschine', sets: 3, reps: [10, 15], start: 46, inc: 2.5 },
        { name: 'Bizeps Curls (SZ)', sets: 2, reps: [8, 12], start: 30, inc: 2.5, ss: 'a' },
        { name: 'Trizepsdrücken (Kabel)', sets: 2, reps: [8, 12], start: 27.5, inc: 2.5, ss: 'a' },
        { name: 'Liegestütze', sets: 1, reps: null, start: 0, inc: 0 },
      ],
      'UK A': [
        { name: 'Squats (Langhantel)', sets: 3, reps: [6, 10], start: 30, inc: 5 },
        { name: 'Leg Extension (1-bein.)', sets: 3, reps: [10, 15], start: 49.5, inc: 2.5 },
        { name: 'Leg Curl', sets: 3, reps: [10, 15], start: 41.5, inc: 2.5 },
        { name: 'Wadenheben Maschine (stehend)', sets: 3, reps: [10, 15], start: 100, inc: 5 },
        { name: 'Hammercurls (Kabel)', sets: 2, reps: [10, 15], start: 21, inc: 2.5, ss: 'a' },
        { name: 'Trizeps Pushdown (Seil)', sets: 2, reps: [10, 15], start: 17.5, inc: 2.5, ss: 'a' },
      ],
      'OK B': [
        { name: 'Flachbankdrücken (KH)', sets: 3, reps: [8, 12], start: 20, inc: 2 },
        { name: 'Latzug (V-Bar)', sets: 3, reps: [8, 12], start: 70, inc: 2.5 },
        { name: 'Smith Bent Over Row', sets: 3, reps: [8, 12], start: 30, inc: 2.5 },
        { name: 'Butterfly Maschine', sets: 2, reps: [10, 15], start: 33, inc: 2.5 },
        { name: 'Lever Low Row', sets: 2, reps: [10, 12], start: 40, inc: 2.5 },
        { name: 'Reverse Butterfly', sets: 2, reps: [12, 15], start: 45, inc: 2.5, ss: 'a' },
        { name: 'Seitheben Maschine', sets: 2, reps: [12, 15], start: 44, inc: 2.5, ss: 'a' },
        { name: 'Bizeps Curls auf Schrägbank (beidarmig)', sets: 2, reps: [10, 15], start: 12, inc: 2 },
      ],
      'UK B': [
        { name: 'Sled Hack Squat', sets: 3, reps: [8, 12], start: 70, inc: 5 },
        { name: 'Rumänisches Kreuzheben (LH)', sets: 3, reps: [8, 10], start: 40, inc: 5 },
        { name: '45° Beinpresse', sets: 2, reps: [10, 15], start: 120, inc: 5 },
        { name: 'Leg Curl', sets: 3, reps: [10, 15], start: 41.5, inc: 2.5 },
        { name: 'Adduktorenmaschine sitzend', sets: 2, reps: [10, 15], start: 63, inc: 2.5 },
        { name: 'Wadenheben Maschine (stehend)', sets: 3, reps: [10, 15], start: 100, inc: 5, ss: 'a' },
        { name: 'Shrugs', sets: 2, reps: [10, 15], start: 100, inc: 2, ss: 'a' },
        { name: 'Scottcurls (einarmig)', sets: 2, reps: [10, 15], start: 14, inc: 2, ss: 'b' },
        { name: 'Trizeps einarmig steh.', sets: 2, reps: [10, 15], start: 12, inc: 2, ss: 'b' },
      ],
    },
  };
  const PLAN_NAMES = new Set(PLAN.days.flatMap((d) => PLAN.items[d].map((it) => it.name)));
  const exByName = (n) => EXERCISES.find((e) => e.name === n);
  const isPlanMode = () => window.FT.MODE === 'plan';
  // Plan-Eintrag einer Übung (bevorzugt am angegebenen Tag, sonst erster Tag, an dem sie vorkommt)
  const planItem = (name, day) => {
    const days = day && PLAN.items[day] ? [day, ...PLAN.days] : PLAN.days;
    for (const d of days) {
      const it = PLAN.items[d].find((x) => x.name === name);
      if (it) return { ...it, day: d };
    }
    return null;
  };
  const planDaysOf = (name) => PLAN.days.filter((d) => PLAN.items[d].some((x) => x.name === name));
  // Übungen einer Gruppe — Plan-Tag (OK A …), „Weitere" (nicht im Plan) oder klassischer Split-Tag
  const exercisesOf = (key) => {
    if (PLAN.items[key]) return PLAN.items[key].map((it) => exByName(it.name)).filter(Boolean);
    if (key === OTHER) return EXERCISES.filter((e) => !PLAN_NAMES.has(e.name));
    return EXERCISES.filter((e) => e.day === key);
  };

  // Einheit → klassischer Split-Tag (Mehrheit der Übungen; „Allgemein" zählt nicht)
  const sessionTypeClassic = (sess) => {
    const counts = {};
    (sess.exercises || []).forEach((ex) => {
      const def = exByName(ex.name);
      if (def && def.day && def.day !== 'Allgemein') counts[def.day] = (counts[def.day] || 0) + 1;
    });
    const entries = Object.entries(counts);
    return entries.length ? entries.reduce((a, b) => (b[1] > a[1] ? b : a))[0] : sess.storedType;
  };
  // Einheit → Plan-Tag mit den meisten übereinstimmenden Übungen (null, wenn keine passt)
  const sessionPlanDay = (sess) => {
    const names = new Set((sess.exercises || []).map((e) => e.name));
    let best = null, bestScore = 0;
    PLAN.days.forEach((d) => {
      const score = PLAN.items[d].filter((it) => names.has(it.name)).length;
      if (score > bestScore) { best = d; bestScore = score; }
    });
    return best;
  };

  // Doppelte Progression für den Plan-Modus: Schafft das Top-Gewicht der letzten Einheit in ALLEN Sätzen
  // das obere Ende des Wdh-Bereichs → steigern; liegen alle Sätze unter dem unteren Ende → senken; sonst halten.
  // Liefert { status: 'up'|'hold'|'down'|'new', next, unit, text, item } oder null (Übung nicht im Plan).
  const progress = (name, day) => {
    const it = planItem(name, day);
    if (!it) return null;
    const log = (window.FT.EX_LOG || {})[name] || [];
    const last = log[log.length - 1];
    const fmt = (v) => String(+v.toFixed(2)).replace('.', ',');
    if (!it.reps) {
      const top = last ? last.topReps : 0;
      return { status: 'hold', next: top ? top + 1 : null, unit: 'Wdh', item: it,
        text: top ? `Zuletzt ${top} Wdh – heute mindestens ${top + 1}` : 'So viele saubere Wdh wie möglich' };
    }
    const [lo, hi] = it.reps;
    if (!last) return { status: 'new', next: it.start, unit: 'kg', item: it, text: `Startgewicht laut Plan` };
    if (last.bw) {
      const top = last.topReps;
      return { status: top >= hi ? 'up' : 'hold', next: top + 1, unit: 'Wdh', item: it,
        text: top >= hi ? `${top} Wdh geschafft – Zusatzgewicht nehmen` : `Ziel ${hi} Wdh, zuletzt ${top}` };
    }
    const topSets = (last.sets || []).filter((s) => s.w === last.w);
    const reps = topSets.map((s) => s.r);
    if (reps.length && reps.every((r) => r >= hi)) {
      return { status: 'up', next: +(last.w + it.inc).toFixed(2), unit: 'kg', item: it,
        text: `Alle Sätze ≥ ${hi} Wdh – Gewicht erhöhen (+${fmt(it.inc)} kg)` };
    }
    if (reps.length && reps.every((r) => r < lo)) {
      return { status: 'down', next: Math.max(0, +(last.w - it.inc).toFixed(2)), unit: 'kg', item: it,
        text: `Alle Sätze unter ${lo} Wdh – Gewicht leicht senken` };
    }
    const missing = reps.filter((r) => r < hi).length;
    return { status: 'hold', next: last.w, unit: 'kg', item: it,
      text: `Gewicht halten – noch ${missing} ${missing === 1 ? 'Satz' : 'Sätze'} bis ${hi} Wdh` };
  };

  // metadata per training day for the Verlauf group list
  const DAY_COLOR = { Allgemein: 'Core', Brust: 'Brust', Rücken: 'Rücken', Schulter: 'Schulter', Arm: 'Bizeps', Beine: 'Beine', [OTHER]: 'Core', ...PLAN.color };
  const dayMeta = (d) => {
    const exs = exercisesOf(d);
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

  // ── Wochenübersicht (Mo–So der aktuellen Woche) aus echten Einheiten ──
  const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  const emptyWeek = () => WEEKDAYS.map((d) => ({ d, sets: null }));
  const computeWeek = (sessions) => {
    const now = new Date();
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
    return WEEKDAYS.map((d, i) => {
      const iso = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i).toLocaleDateString('en-CA');
      const today = (sessions || []).filter((s) => s.date_iso === iso);
      if (!today.length) return { d, sets: null };
      const main = today.reduce((a, b) => ((b.sets || 0) > (a.sets || 0) ? b : a));
      return { d, sets: today.reduce((n, s) => n + (s.sets || 0), 0) || null, type: main.type };
    });
  };

  window.FT = {
    MUSCLES, EXERCISES,
    // werden von api-bridge.js mit echten Daten befüllt
    SESSIONS: [], PENDING_SESSIONS: [], WEEK: emptyWeek(), EX_LOG: {}, EX_LOG_FULL: {}, AI_CACHE: null,
    computeWeek,
    // DAYS = alle Bereiche (Anzeige-Reihenfolge), SPLIT = nur der rotierende 5er-Split (Modus „classic")
    DAYS: ['Allgemein', 'Brust', 'Rücken', 'Schulter', 'Arm', 'Beine'],
    SPLIT: ['Brust', 'Rücken', 'Schulter', 'Arm', 'Beine'],
    dayLabel: (d) => ({ Allgemein: 'Allgemein', Brust: 'Brust', Rücken: 'Rücken', Schulter: 'Schulter', Arm: 'Arme', Beine: 'Beine', [OTHER]: 'Weitere Übungen', ...PLAN.labels }[d] || d),
    dayMeta,
    // ── Trainingsmodus: 'classic' (5er-Split) | 'plan' (4er-Plan OK/UK). Wird von app.jsx aus dem Profil gesetzt.
    MODE: 'classic',
    PLAN, OTHER,
    isPlanMode,
    planItem, planDaysOf, exercisesOf, progress,
    // Gruppen für Fortschritt/KI-Liste und die rotierenden Trainingstage — je nach Modus
    groupKeys: () => (isPlanMode() ? [...PLAN.days, OTHER] : window.FT.DAYS),
    splitDays: () => (isPlanMode() ? PLAN.days : window.FT.SPLIT),
    sessionType: (sess) => (isPlanMode() ? sessionPlanDay(sess) || sessionTypeClassic(sess) : sessionTypeClassic(sess)),
    // kompakte Daten für den KI-Prompt im Plan-Modus: heute fällige Übungen zuerst, max. 6 letzte Einheiten mit allen Arbeitssätzen
    planAIData: () => {
      const due = window.FT.nextDay();
      const seen = new Set();
      const out = [];
      [due, ...PLAN.days.filter((d) => d !== due)].forEach((d) => PLAN.items[d].forEach((it) => {
        if (seen.has(it.name)) return;
        seen.add(it.name);
        const ex = exByName(it.name) || {};
        const log = (window.FT.EX_LOG || {})[it.name] || [];
        const pr = progress(it.name, d);
        out.push({
          n: it.name,
          tage: planDaysOf(it.name),
          ziel: it.reps ? `${it.sets}×${it.reps[0]}-${it.reps[1]}` : `${it.sets}×max`,
          inc: it.inc,
          gewichtsangabe: ex.barTip || 'Zahl am Gewichtsblock/Kabel',
          koerpergewicht: !it.reps || !!(log[0] && log[0].bw),
          regel: pr ? { status: pr.status, next: pr.next } : null,
          verlauf: log.slice(-6).map((e) => ({ d: e.date_iso, s: (e.sets || []).map((s) => `${s.w}x${s.r}`).join(',') })),
        });
      }));
      return out;
    },
    PROFILE_DEFAULTS: {
      name: 'Alex', age: 28, weight: 78, height: 182, sex: 'Männlich',
      goal: 'Muskelaufbau', level: 'Fortgeschritten',
      unit: 'kg', weekGoal: 5, watch: 'vívoactive 6', aiEnabled: true,
      trainingMode: 'classic',   // 'classic' = 5er-Split · 'plan' = 4er-Plan Oberkörper/Unterkörper
    },
    stats: { streak: 0 },
    weekSessions: () => (window.FT.WEEK || []).filter((d) => d.sets != null).length,
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
      gewichtsangabe: e.barTip || 'Zahl am Gewichtsblock/Kabel',
      bodyweight: (window.FT.EX_LOG[e.name] || [{}])[0].bw || false,
      sessions: (window.FT.EX_LOG[e.name] || []).map((s) => ({ date: s.date, kg: s.w, topReps: s.topReps })),
    })),
    // local calendar day key — recommendations reset when this changes (midnight)
    todayKey: () => new Date().toLocaleDateString('en-CA'),
    // ── nächste fällige Muskelgruppe (für „Gewichte für heute") ──
    // letzte erfasste Gruppe (per Datum, inkl. manuell erfasster Sätze) → nächste im Split
    lastTrainedDay: () => {
      if (isPlanMode()) {
        // jüngste Einheit, die sich einem Plan-Tag zuordnen lässt
        let bestDay = null, bestIso = '';
        (window.FT.SESSIONS || []).forEach((s) => {
          const d = sessionPlanDay(s);
          if (d && (s.date_iso || '') > bestIso) { bestIso = s.date_iso || ''; bestDay = d; }
        });
        return bestDay;
      }
      // Use EX_LOG (same source as dayMeta/Fortschritt) — avoids broken date-string
      // parsing ("jun" not in MONTHS) and wrong session.type from dayGuess.
      const log = (window.FT && window.FT.EX_LOG) || {};
      let bestDay = null, bestIso = '';
      EXERCISES.forEach((ex) => {
        if (ex.day === 'Allgemein') return;          // Allgemein zählt nicht für die Split-Rotation
        const entries = log[ex.name];
        if (!entries || !entries.length) return;
        const last = entries[entries.length - 1];  // EX_LOG is oldest→newest
        const iso = last.date_iso || '';
        if (iso > bestIso) { bestIso = iso; bestDay = ex.day; }
      });
      return bestDay;
    },
    nextDay: function () {
      const order = this.splitDays();
      const last = this.lastTrainedDay();
      const i = order.indexOf(last);
      return i < 0 ? order[0] : order[(i + 1) % order.length];
    },
  };
})();
