/**
 * FitTracker API Bridge
 *
 * Loaded immediately after data.js.  Responsibilities:
 *   1. Check authentication → redirect to /login if not logged in.
 *   2. Fetch real training data from the backend into window.FT
 *      (SESSIONS, PENDING_SESSIONS, EX_LOG, WEEK, stats, AI_CACHE).
 *   3. Expose window.FTApi with helpers used by the screens. Every call that
 *      changes data reloads it afterwards and fires 'ft-data-updated'.
 */
(async function () {
  'use strict';

  // ── helpers ──────────────────────────────────────────────────────────────
  // JSON-Request; wirft mit dem Fehlertext des Backends (json.error), falls vorhanden
  const request = async (method, url, body) => {
    const r = await fetch(url, {
      method,
      credentials: 'same-origin',
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const json = await r.json().catch(() => ({}));
    if (!r.ok || json.ok === false) throw new Error(json.error || `${method} ${url} → HTTP ${r.status}`);
    return json;
  };
  const get = (url) => request('GET', url);
  const post = (url, body) => request('POST', url, body);

  // ── 1. Auth check ─────────────────────────────────────────────────────────
  let me;
  try {
    me = await get('/api/me');
  } catch (_) {
    // Backend nicht erreichbar (statischer Fileserver) → leere App anzeigen
    me = { loggedIn: true };
  }

  if (!me.loggedIn) {
    window.location.replace('/login');
    return;
  }

  // ── 2. Load real data ─────────────────────────────────────────────────────
  // Lädt Einheiten/Pending/KI-Cache vom Backend und baut EX_LOG + Woche neu auf.
  // Wird beim Start und nach jeder Änderung (Speichern, Bearbeiten, Löschen) aufgerufen.
  async function loadData() {
    const data = await get('/api/data');
    window.FT.SESSIONS = data.sessions || [];
    // Re-derive session.type from the exercises it contains, because the stored
    // training_day (dayGuess) is often wrong for weekend sessions.
    window.FT.SESSIONS.forEach((sess) => {
      if (!sess.exercises || !sess.exercises.length) return;
      const dayCounts = {};
      sess.exercises.forEach((ex) => {
        const def = (window.FT.EXERCISES || []).find((e) => e.name === ex.name);
        // „Allgemein" (Klimmzüge, Dips, …) wird an jedem Tag gemacht → bestimmt nicht den Split-Tag
        if (def && def.day && def.day !== 'Allgemein') dayCounts[def.day] = (dayCounts[def.day] || 0) + 1;
      });
      const entries = Object.entries(dayCounts);
      if (entries.length)
        sess.type = entries.reduce((a, b) => b[1] > a[1] ? b : a)[0];
    });
    window.FT.PENDING_SESSIONS = data.pending || [];
    window.FT.AI_CACHE = data.ai_cache || null;   // today's AI result from server

    // Build EX_LOG from real sessions (one entry per session and exercise).
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
    window.FT.EX_LOG_FULL = exLog;  // the zoomed chart reads the same data
    window.FT.WEEK = window.FT.computeWeek(window.FT.SESSIONS);
    if (typeof data.streak === 'number') {
      window.FT.stats = { streak: data.streak };
    }
    // Notify React app so it re-renders with the updated FT data
    document.dispatchEvent(new CustomEvent('ft-data-updated'));
  }

  try {
    await loadData();
  } catch (err) {
    console.warn('[FTApi] Backend nicht erreichbar – App startet ohne Daten.', err);
  }

  // ── 3. Expose FTApi ───────────────────────────────────────────────────────
  window.FTApi = {
    /** Trigger a Garmin sync. Returns { ok, pending: [...PENDING_SESSIONS entries] } */
    sync: () => post('/api/garmin/sync', {}),

    /** Send the pre-built coach prompt to the backend → OpenAI. Returns the raw response text. */
    aiComplete: async (prompt) => (await post('/api/ai', { prompt })).response,

    /**
     * Persist a finalised session to the database, then reload.
     * rawSession   – the GarminActivity / pending session object
     * assignments  – { day, groups: [{ex, setIds}], warmup: {setId: bool} }
     */
    saveSession: async (rawSession, assignments) => {
      try {
        await post('/api/sessions', { raw: rawSession, assignments });
        await loadData();
      } catch (err) {
        console.warn('[FTApi] Session konnte nicht gespeichert werden:', err);
      }
    },

    /** Gespeicherte Einheit ändern: exercises = [{name, muscle, sets:[{w,r,wu}]}] (leer → Einheit wird gelöscht). */
    updateSession: async (dbId, exercises) => {
      const res = await request('PUT', `/api/sessions/${dbId}`, { exercises });
      await loadData();
      return res;
    },

    /** Einheit löschen; requeue=true → Garmin-Aktivität taucht wieder im Sync zur Zuordnung auf. */
    deleteSession: async (dbId, requeue) => {
      const res = await request('DELETE', `/api/sessions/${dbId}${requeue ? '?requeue=1' : ''}`);
      await loadData();
      return res;
    },

    /** Log out and return to the login page. */
    logout: () =>
      post('/api/logout', {}).finally(() => {
        window.location.replace('/login');
      }),

    /** Discard a pending session (marks it as imported, removes from sync queue). */
    discardSession: (id) => request('DELETE', '/api/pending/' + encodeURIComponent(id)),

    /** Manuell erfasste Sätze speichern und neu laden. entry = { name, muscle, day, date_iso, w, reps, sets } */
    addManualSets: async (entry) => {
      const res = await post('/api/manual', entry);
      await loadData();
      return res;
    },

    /** Daten vom Backend neu laden (löst 'ft-data-updated' aus). */
    reload: loadData,

    /** Persist today's AI coaching result to the server (syncs across devices). */
    saveAiCache: (result) => post('/api/ai/cache', { result }),
  };
})();
