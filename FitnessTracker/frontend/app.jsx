/* FitTracker — App root: routing, tweaks, mount */

const ACCENTS = [
  { hex: '#7CFF3D', ink: '#0b1206' },  // lime
  { hex: '#2D7FF9', ink: '#f2f7ff' },  // blue
  { hex: '#FF5A3D', ink: '#fff3f0' },  // coral
  { hex: '#A98BFF', ink: '#120a26' },  // violet
  { hex: '#1FD6B5', ink: '#04140f' },  // teal
];
const inkFor = (hex) => (ACCENTS.find((a) => a.hex.toLowerCase() === String(hex).toLowerCase()) || { ink: '#0b1206' }).ink;
const hexRgb = (hex) => {
  const h = String(hex).replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const rgbStr = (hex) => hexRgb(hex).join(',');
// blend accent into the base surface for a solid, screenshot-safe tinted card bg
const tintSurface = (hex, amt) => {
  const [r, g, b] = hexRgb(hex); const base = [22, 24, 29];
  return `rgb(${base.map((c, i) => Math.round(c * (1 - amt) + [r, g, b][i] * amt)).join(',')})`;
};

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#7CFF3D",
  "dashboard": "fokus",
  "recommend": "kompakt",
  "assign": "auto"
}/*EDITMODE-END*/;

const AI_KEY = 'ft_ai_v5';   // v5: detailliertes summary mit Begründung + Ausblick
const PROFILE_KEY = 'ft_profile_v1';
const ONBOARDED_KEY = 'ft_onboarded_v1';   // Erst-Start-Onboarding nur einmal automatisch zeigen

// Profil-Store: gemerkte persönliche Daten + Einstellungen, via Context an alle Screens
const ProfileContext = React.createContext(null);
const useProfile = () => React.useContext(ProfileContext);
Object.assign(window, { ProfileContext, useProfile });

// robustly pull a JSON object out of the model's reply — salvages truncated arrays
function parseAI(text) {
  let s = String(text).trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const a = s.indexOf('{');
  if (a > 0) s = s.slice(a);
  try { return JSON.parse(s); } catch (e) { /* try salvage */ }
  const lastObj = s.lastIndexOf('}');
  if (lastObj > 0) {
    let t = s.slice(0, lastObj + 1);
    const opensArr = (t.match(/\[/g) || []).length, closeArr = (t.match(/\]/g) || []).length;
    const opensObj = (t.match(/{/g) || []).length, closeObj = (t.match(/}/g) || []).length;
    t += ']'.repeat(Math.max(0, opensArr - closeArr));
    t += '}'.repeat(Math.max(0, opensObj - closeObj));
    try { return JSON.parse(t); } catch (e) { /* fall through */ }
  }
  throw new Error('Antwort der KI konnte nicht gelesen werden. Bitte erneut versuchen.');
}

// enrich AI exercises with locally-known last weight + delta + muscle, build a name lookup
function enrichAI(data) {
  const raw = Array.isArray(data.exercises) ? data.exercises : (Array.isArray(data.ex) ? data.ex : []);
  const byName = {};
  const out = [];
  raw.forEach((x) => {
    const name = x.name || x.n;
    const ex = window.FT.EXERCISES.find((e) => e.name === name);
    if (!ex) return;
    const last = window.FT.lastWeight(name);
    const bw = (window.FT.EX_LOG[name] || [{}])[0].bw;
    const suggest = typeof (x.suggest ?? x.s) === 'number' ? (x.suggest ?? x.s) : (last || 0);
    const item = { name, muscle: ex.muscle, day: ex.day, last, bw, suggest, reps: x.reps || x.r || '', note: x.note || x.t || '' };
    item.delta = (last != null && !bw) ? +(suggest - last).toFixed(1) : (bw ? +(suggest - (window.FT.lastReps(name) || 0)).toFixed(1) : 0);
    byName[name] = item; out.push(item);
  });
  return { summary: data.summary || '', focusDay: data.focusDay || data.focus || '', exercises: out, byName };
}

async function requestAI(profile) {
  const hasApi = window.FTApi && typeof window.FTApi.aiComplete === 'function';
  if (!hasApi && (!window.claude || !window.claude.complete)) {
    throw new Error('KI ist in dieser Umgebung nicht verfügbar.');
  }
  const data = window.FT.recentData();
  const names = window.FT.EXERCISES.map((e) => e.name);
  const p = profile || window.FT.PROFILE_DEFAULTS;
  const athlete = { alter: p.age, gewicht_kg: p.weight, groesse_cm: p.height, geschlecht: p.sex, ziel: p.goal, erfahrung: p.level };
  const dueDay = window.FT.nextDay();
  const prompt =
`Du bist ein erfahrener, sachlicher Kraft-Coach. Analysiere die Trainingshistorie eines Nutzers (5er-Split: Brust, Rücken, Schulter, Arm, Beine). Pro Übung sind die letzten Einheiten als JSON gegeben (kg = Arbeitssatz-Gewicht, topReps = Wdh im Top-Satz; bodyweight=true heißt Körpergewicht, dann zählen Wdh statt kg).

Nutzerprofil (relevant für realistische Steigerungen — Alter, Gewicht, Größe, Geschlecht, Ziel und Erfahrung berücksichtigen):
${JSON.stringify(athlete)}

Trainingsdaten:
${JSON.stringify(data)}

Aufgabe:
1) Detailliertes Coach-Feedback im Feld "summary" (4–6 Sätze, Deutsch, direkte Ansprache "du", sachlich aber motivierend):
   – Bewerte kurz den aktuellen Trainingsstand und erkennbare Progressionstrends.
   – Begründe, warum heute **${dueDay}** dran ist (Split-Logik, Erholungsstand).
   – Gib 1–2 konkrete Hinweise für die heutige Einheit (Intensität, Technik, Volumen).
   – Schreibe einen kurzen Ausblick: Was ergibt sich aus dem aktuellen Trend in den nächsten 2–3 Wochen, wenn konsequent trainiert wird?
   – Beziehe Ziel ("${p.goal}") und Erfahrungslevel ("${p.level}") sinnvoll ein.
2) Heute ist **${dueDay}** dran — die nächste Gruppe im 5er-Split nach der zuletzt erfassten Einheit. Setze focusDay="${dueDay}" und richte das Gesamt-Feedback an diesem Tag aus (nicht nach Erholung umsortieren).
3) Für JEDE Übung: nächstes Arbeitsgewicht (kg, Schritte 2,5/5 kg; bei Körpergewicht stattdessen Ziel-Wdh als Zahl), Ziel-Wdh-Bereich und eine konkrete, datenbasierte Begründung "t" (Deutsch, max ~9 Wörter): beziehe dich auf die tatsächlichen letzten Werte — z. B. "Top-Satz 3× über 10 Wdh, Zeit zu steigern", "letzte Einheit gehalten — jetzt +2,5 kg", "Wdh leicht gesunken, Gewicht halten", "stabile Progression, nächster Schritt sinnvoll". KEINE Floskeln ohne Datenbezug.

WICHTIG: Antworte NUR mit kompaktem, minified JSON (kein Markdown, keine Leerzeilen). "summary" darf mehrere Sätze lang sein. Halte "t" bei den Übungen kompakt (max ~9 Wörter). Form:
{"summary":"...","focusDay":"Brust|Rücken|Schulter|Arm|Beine","ex":[{"n":"<exakt aus Liste>","s":<zahl>,"r":"8-10","t":"<kurz>"}]}
Decke alle Übungen ab. Namen EXAKT aus dieser Liste:
${JSON.stringify(names)}`;
  const res = hasApi
    ? await window.FTApi.aiComplete(prompt)
    : await window.claude.complete({ messages: [{ role: 'user', content: prompt }] });
  return enrichAI(parseAI(res));
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [route, setRoute] = React.useState('dashboard');
  const [session, setSession] = React.useState(null);
  const [day, setDay] = React.useState('Brust');
  // KI state: status none|loading|ready|error
  const [ai, setAi] = React.useState({ status: 'none', data: null, at: null, error: '' });

  // ── Profil-Store (persistiert) ──
  const [profile, setProfileState] = React.useState(() => {
    try { const raw = localStorage.getItem(PROFILE_KEY); if (raw) return { ...window.FT.PROFILE_DEFAULTS, ...JSON.parse(raw) }; } catch (e) {}
    return { ...window.FT.PROFILE_DEFAULTS };
  });
  const setProfile = React.useCallback((patch) => {
    setProfileState((p) => { const next = { ...p, ...patch }; try { localStorage.setItem(PROFILE_KEY, JSON.stringify(next)); } catch (e) {} return next; });
  }, []);
  const profileRef = React.useRef(profile);
  React.useEffect(() => { profileRef.current = profile; }, [profile]);

  // ── Onboarding (Erst-Start, automatisch) ──
  const [onboarded, setOnboarded] = React.useState(() => {
    try { return localStorage.getItem(ONBOARDED_KEY) === '1'; } catch (e) { return false; }
  });
  const finishOnboarding = React.useCallback((draft) => {
    setProfile(draft);
    try { localStorage.setItem(ONBOARDED_KEY, '1'); } catch (e) {}
    setOnboarded(true);
    setRoute('dashboard');
  }, [setProfile]);
  // vom Tweak-Panel auslösbar: Onboarding erneut zeigen (Demo/Reset)
  React.useEffect(() => {
    const replay = () => { try { localStorage.removeItem(ONBOARDED_KEY); } catch (e) {} setOnboarded(false); };
    document.addEventListener('ft-onboarding-replay', replay);
    return () => document.removeEventListener('ft-onboarding-replay', replay);
  }, []);

  // ── Multi-Session-Sync: noch nicht zugeordnete Einheiten ──
  const [pending, setPending] = React.useState(() => window.FT.PENDING_SESSIONS);
  const [activeSync, setActiveSync] = React.useState(null);
  const [synced, setSynced] = React.useState(false);
  // bumps when manual sets are logged OR when api-bridge updates FT data
  const [, setDataVersion] = React.useState(0);
  React.useEffect(() => {
    const handler = () => {
      setDataVersion((v) => v + 1);
      // If server returned today's AI result, apply it immediately (cross-device sync)
      const cache = window.FT && window.FT.AI_CACHE;
      if (cache && cache.date === window.FT.todayKey() && cache.data) {
        setAi((prev) => prev.status === 'ready' ? prev : { status: 'ready', data: cache.data, at: cache.date, error: '' });
      }
    };
    document.addEventListener('ft-data-updated', handler);
    return () => document.removeEventListener('ft-data-updated', handler);
  }, []);

  React.useEffect(() => {
    try {
      // Prefer server-cached AI result (shared across all devices)
      const cache = window.FT && window.FT.AI_CACHE;
      if (cache && cache.date === window.FT.todayKey() && cache.data) {
        setAi({ status: 'ready', data: cache.data, at: cache.date, error: '' });
        return;
      }
      // Fall back to localStorage (offline / first load before api-bridge completes)
      const raw = localStorage.getItem(AI_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (p.date === window.FT.todayKey() && p.data) setAi({ status: 'ready', data: p.data, at: p.date, error: '' });
      }
    } catch (e) { /* ignore */ }
  }, []);

  const triggerAI = React.useCallback(async () => {
    setAi((a) => ({ ...a, status: 'loading', error: '' }));
    try {
      const data = await requestAI(profileRef.current);
      try { localStorage.setItem(AI_KEY, JSON.stringify({ date: window.FT.todayKey(), data })); } catch (e) {}
      // Save to server so all devices see the same result
      if (window.FTApi && window.FTApi.saveAiCache) {
        window.FTApi.saveAiCache(data).catch(() => {});
      }
      setAi({ status: 'ready', data, at: window.FT.todayKey(), error: '' });
    } catch (e) {
      setAi((a) => ({ ...a, status: 'error', error: String((e && e.message) || e) }));
    }
  }, []);

  React.useEffect(() => {
    document.documentElement.style.setProperty('--accent', t.accent);
    document.documentElement.style.setProperty('--accent-rgb', rgbStr(t.accent));
    document.documentElement.style.setProperty('--accent-ink', inkFor(t.accent));
    document.documentElement.style.setProperty('--accent-surface', tintSurface(t.accent, 0.10));
  }, [t.accent]);

  const go = (name) => { setRoute(name); };
  const openSession = (s) => { setSession(s); setRoute('detail'); };
  const openDay = (d) => { setDay(d); setRoute('historyDay'); };
  // einzelne erkannte Einheit zur Zuordnung öffnen
  const openAssign = (sess) => { setActiveSync(sess); setRoute('assign'); };
  // Einheit finalisiert → aus der Pending-Liste entfernen, persistieren, zurück zur Sync-Liste
  const finalizeSession = (sessId, assignments) => {
    if (window.FTApi && activeSync) {
      window.FTApi.saveSession(activeSync, assignments || {});
    }
    setPending((list) => list.filter((s) => s.id !== sessId));
    setActiveSync(null);
    setRoute('sync');
  };
  // Garmin-Sync anstoßen, neue Einheiten in pending mergen, dann Sync-Screen öffnen
  const handleDiscard = React.useCallback(async (sessionId) => {
    setPending((list) => list.filter((s) => s.id !== sessionId));
    if (window.FTApi && window.FTApi.discardSession) {
      window.FTApi.discardSession(sessionId).catch((e) => console.warn('[FT] discard failed', e));
    }
  }, []);
  const handleSync = React.useCallback(async () => {
    if (window.FTApi) {
      try {
        const result = await window.FTApi.sync();
        if (result && result.pending && result.pending.length) {
          setPending((prev) => {
            const existingIds = new Set(prev.map((p) => p.id));
            const fresh = result.pending.filter((p) => !existingIds.has(p.id));
            return [...fresh, ...prev];
          });
        }
      } catch (_) { /* Fehler ignorieren – Sync-Screen trotzdem öffnen */ }
    }
    go('sync');
  }, []);

  let screen;
  switch (route) {
    case 'history':    screen = <HistoryScreen onOpenDay={openDay} />; break;
    case 'historyDay': screen = <DayDetailScreen day={day} ai={ai} onBack={() => go('history')} goKI={() => go('recommend')} />; break;
    case 'detail':     screen = <DetailScreen session={session} onBack={() => go('dashboard')} />; break;
    case 'recommend':  screen = <RecommendScreen variant={t.recommend} ai={ai} onTrigger={triggerAI} go={go} />; break;
    case 'sync':       screen = <SyncScreen pending={pending} synced={synced} setSynced={setSynced} onPick={openAssign} onDiscard={handleDiscard} go={go} />; break;
    case 'assign':     screen = <AssignScreen variant={t.assign} session={activeSync} onSaved={finalizeSession} go={go} />; break;
    case 'profile':    screen = <ProfileScreen />; break;
    default:           screen = <DashboardScreen variant={t.dashboard} recVariant={t.recommend} ai={ai} go={go} onOpen={openSession} onStart={handleSync} onOpenDay={openDay} pendingCount={pending.length} />;
  }

  return (
    <ProfileContext.Provider value={{ profile, setProfile }}>
    <div className="ft-app">
      {!onboarded ? (
        <OnboardingFlow onDone={finishOnboarding} />
      ) : (
        <>
          <div key={route} style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {screen}
          </div>
          <TabBar route={route} go={go} pendingCount={pending.length} />
          <GifLightbox />
          <ChartLightbox />
          <ManualLogSheet onChanged={() => setDataVersion((v) => v + 1)} />
        </>
      )}

      <TweaksPanel>
        <TweakSection label="Marke" />
        <TweakColor label="Akzentfarbe" value={t.accent}
          options={ACCENTS.map((a) => a.hex)}
          onChange={(v) => setTweak('accent', v)} />

        <TweakSection label="Varianten" />
        <TweakRadio label="Dashboard" value={t.dashboard}
          options={['fokus', 'uebersicht', 'aktivitaet']}
          onChange={(v) => { setTweak('dashboard', v); go('dashboard'); }} />
        <TweakRadio label="KI-Empfehlung" value={t.recommend}
          options={['kompakt', 'fokus', 'tabelle']}
          onChange={(v) => setTweak('recommend', v)} />
        <TweakRadio label="Satz-Zuordnung" value={t.assign}
          options={['dnd', 'tap', 'auto']}
          onChange={(v) => { setTweak('assign', v); go('assign'); }} />
        <div style={{ fontSize: 11, color: 'var(--text-faint)', padding: '2px 2px 0', lineHeight: 1.4 }}>
          dnd = Drag &amp; Drop · tap = Tippen · auto = Auto-Blöcke
        </div>

        <TweakSection label="Demo" />
        <TweakButton label="Onboarding erneut zeigen" secondary
          onClick={() => document.dispatchEvent(new CustomEvent('ft-onboarding-replay'))} />
      </TweaksPanel>
    </div>
    </ProfileContext.Provider>
  );
}

Object.assign(window, { App });
