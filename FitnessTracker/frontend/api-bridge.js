/**
 * FitTracker API Bridge
 *
 * Loaded immediately after data.js.  Responsibilities:
 *   1. Check authentication → redirect to /login if not logged in.
 *   2. Fetch real training data from the backend and merge it into window.FT.
 *   3. Expose window.FTApi with helpers used by app.jsx:
 *        sync()         – trigger Garmin sync, returns { pending }
 *        aiComplete()   – send AI prompt to backend, returns raw text
 *        saveSession()  – persist a finalised assignment to the DB
 *        logout()       – clear server session and redirect to /login
 *
 * Everything is async; failures fall back to mock data silently so
 * the app still works without a backend (Figma / static preview).
 */
(async function () {
  'use strict';

  // ── helpers ──────────────────────────────────────────────────────────────
  const get = (url) =>
    fetch(url, { credentials: 'same-origin' }).then((r) => {
      if (!r.ok) throw new Error(`GET ${url} → ${r.status}`);
      return r.json();
    });

  const post = (url, body) =>
    fetch(url, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then((r) => {
      if (!r.ok) throw new Error(`POST ${url} → ${r.status}`);
      return r.json();
    });

  const del = (url) =>
    fetch(url, { method: 'DELETE', credentials: 'same-origin' }).then((r) => {
      if (!r.ok) throw new Error(`DELETE ${url} → ${r.status}`);
      return r.json();
    });

  // ── 1. Auth check ─────────────────────────────────────────────────────────
  let me;
  try {
    me = await get('/api/me');
  } catch (_) {
    // Backend unreachable (static file server / Figma) → run in mock mode
    me = { loggedIn: true };
  }

  if (!me.loggedIn) {
    window.location.replace('/login');
    return;
  }

  // ── 2. Load real data ─────────────────────────────────────────────────────
  // When the backend is reachable, always use real (possibly empty) DB data.
  // Mock data is only kept when the backend cannot be reached at all (offline/preview).
  try {
    const data = await get('/api/data');
    // Replace mock sessions with real data (empty array = clean slate)
    window.FT.SESSIONS = data.sessions || [];
    // Re-derive session.type from the exercises it contains, because the stored
    // training_day (dayGuess) is often wrong for weekend sessions.
    window.FT.SESSIONS.forEach((sess) => {
      if (!sess.exercises || !sess.exercises.length) return;
      const dayCounts = {};
      sess.exercises.forEach((ex) => {
        const def = (window.FT.EXERCISES || []).find((e) => e.name === ex.name);
        if (def && def.day) dayCounts[def.day] = (dayCounts[def.day] || 0) + 1;
      });
      const entries = Object.entries(dayCounts);
      if (entries.length)
        sess.type = entries.reduce((a, b) => b[1] > a[1] ? b : a)[0];
    });
    window.FT.PENDING_SESSIONS = data.pending || [];
    window.FT.AI_CACHE = data.ai_cache || null;   // today's AI result from server

    // Build EX_LOG + EX_LOG_FULL from real sessions.
    // Only working sets (wu != true) are used; chart value = max weight per session.
    const exLog = {};
    // Sessions arrive newest-first; reverse to get oldest→newest for charts.
    const sorted = [...window.FT.SESSIONS].reverse();
    sorted.forEach((sess) => {
      (sess.exercises || []).forEach((ex) => {
        const workingSets = (ex.sets || []).filter((s) => !s.wu);
        if (!workingSets.length) return;
        const bw = workingSets.every((s) => (s.w || 0) === 0);
        const maxW = bw ? 0 : Math.max(...workingSets.map((s) => s.w || 0));
        const topSet = bw
          ? workingSets.reduce((best, s) => (s.r || 0) > (best.r || 0) ? s : best, workingSets[0])
          : workingSets.find((s) => (s.w || 0) === maxW) || workingSets[0];
        const entry = {
          date:     sess.date,
          date_iso: sess.date_iso,
          w:        bw ? 0 : maxW,
          topReps:  topSet ? (topSet.r || 0) : 0,
          bw,
          sets:     workingSets.map((s) => ({ w: s.w || 0, r: s.r || 0 })),
        };
        if (!exLog[ex.name]) exLog[ex.name] = [];
        exLog[ex.name].push(entry);
      });
    });
    window.FT.EX_LOG = exLog;
    window.FT.EX_LOG_FULL = exLog;  // same data; both read by charts
    // Clear the mock weekly overview; it will fill once real sessions exist
    window.FT.WEEK = [
      { d: 'Mo', sets: null }, { d: 'Di', sets: null }, { d: 'Mi', sets: null },
      { d: 'Do', sets: null }, { d: 'Fr', sets: null },
      { d: 'Sa', sets: null }, { d: 'So', sets: null },
    ];
    if (typeof data.streak === 'number') {
      window.FT.stats = { streak: data.streak };
    }
    // Notify React app so it re-renders with the updated FT data
    document.dispatchEvent(new CustomEvent('ft-data-updated'));
  } catch (err) {
    console.warn('[FTApi] Backend nicht erreichbar – Mock-Daten werden verwendet.', err);
  }

  // ── 3. Expose FTApi ───────────────────────────────────────────────────────
  window.FTApi = {
    /**
     * Trigger a Garmin sync.
     * Returns { ok, pending: [...PENDING_SESSIONS entries] }
     */
    sync: () => post('/api/garmin/sync', {}),

    /**
     * Send the pre-built coach prompt to the backend → OpenAI.
     * Returns the raw response string (same as window.claude.complete would).
     */
    aiComplete: async (prompt) => {
      const result = await post('/api/ai', { prompt });
      return result.response;  // raw text from the model
    },

    /**
     * Persist a finalised session to the database.
     * rawSession   – the GarminActivity / pending session object
     * assignments  – { day, groups: [{ex, setIds}], warmup: {setId: bool} }
     */
    saveSession: (rawSession, assignments) =>
      post('/api/sessions', { raw: rawSession, assignments }).catch((err) => {
        console.warn('[FTApi] Session konnte nicht gespeichert werden:', err);
      }),

    /** Log out and return to the login page. */
    logout: () =>
      post('/api/logout', {}).finally(() => {
        window.location.replace('/login');
      }),

    /** Discard a pending session (marks it as imported, removes from sync queue). */
    discardSession: (id) => del('/api/pending/' + encodeURIComponent(id)),

    /** Persist today's AI coaching result to the server (syncs across devices). */
    saveAiCache: (result) => post('/api/ai/cache', { result }),
  };
})();
