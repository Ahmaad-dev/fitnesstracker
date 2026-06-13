/* FitTracker — Uhr-Synchronisation (Multi-Session-Flow) */

function PulseRings({ active, done }) {
  return (
    <div style={{ position: 'relative', width: 150, height: 150, display: 'grid', placeItems: 'center', margin: '0 auto' }}>
      <style>{`
        @keyframes pulseRing { 0%{transform:scale(.6);opacity:.55} 100%{transform:scale(1.5);opacity:0} }
      `}</style>
      {active && [0, 1, 2].map((i) => (
        <div key={i} style={{
          position: 'absolute', width: 110, height: 110, borderRadius: '50%',
          border: '2px solid var(--accent)',
          animation: `pulseRing 2.1s cubic-bezier(.2,.7,.3,1) ${i * 0.7}s infinite`,
        }} />
      ))}
      <div style={{
        width: 96, height: 96, borderRadius: 30, position: 'relative',
        background: done ? 'var(--accent)' : 'var(--surface-2)',
        border: done ? 'none' : '1px solid var(--border-2)',
        display: 'grid', placeItems: 'center',
        transition: 'background .3s ease', zIndex: 1,
        boxShadow: done ? '0 0 40px rgba(var(--accent-rgb),0.45)' : 'none',
      }}>
        <Icon name={done ? 'check' : 'watch'} size={42} color={done ? 'var(--accent-ink)' : 'var(--accent)'} stroke={done ? 2.6 : 2} />
      </div>
    </div>
  );
}

/* one detected (unassigned) training session — tap to assign its sets */
function PendingSessionCard({ s, onPick, onDiscard }) {
  const color = window.FT.muscleColor(s.dayGuess === 'Arm' ? 'Bizeps' : s.dayGuess);
  return (
    <div className="card" style={{ width: '100%', display: 'flex', alignItems: 'center', padding: 15, gap: 0 }}>
      <button onClick={() => onPick(s)} style={{
        flex: 1, display: 'flex', alignItems: 'center', gap: 13,
        background: 'none', border: 'none', cursor: 'pointer',
        font: 'inherit', color: 'var(--text)', textAlign: 'left', padding: 0,
      }}>
        <span style={{ width: 44, height: 44, borderRadius: 13, background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          <Icon name="watch" size={20} color="var(--accent)" />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15.5, fontWeight: 700 }}>{s.weekday}</div>
          <div className="mono" style={{ fontSize: 11.5, color: 'var(--text-faint)', marginTop: 2 }}>{s.date} · {s.sets.length} Sätze erkannt</div>
        </div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--text-dim)', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 999, padding: '4px 10px', flexShrink: 0 }}>
          <span className="dot" style={{ width: 7, height: 7, borderRadius: '50%', background: color }} />offen
        </span>
        <Icon name="chevR" size={18} color="var(--text-faint)" style={{ marginLeft: 4 }} />
      </button>
      {onDiscard && (
        <button onClick={() => onDiscard(s.id)} title="Verwerfen" style={{
          background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)',
          padding: '6px 4px 6px 10px', display: 'grid', placeItems: 'center', flexShrink: 0,
        }}>
          <Icon name="close" size={17} color="var(--text-faint)" />
        </button>
      )}
    </div>
  );
}

function SyncScreen({ pending = [], synced, setSynced, onPick, onDiscard, go }) {
  const { profile } = useProfile();
  // phases: idle, connecting, syncing, found — if already synced, jump straight to the list
  const [phase, setPhase] = React.useState(synced ? 'found' : 'idle');
  const [pct, setPct] = React.useState(0);
  const timers = React.useRef([]);
  const ivRef = React.useRef(null);

  const totalSets = pending.reduce((n, s) => n + s.sets.length, 0);

  const clear = () => {
    timers.current.forEach(clearTimeout); timers.current = [];
    if (ivRef.current) { clearInterval(ivRef.current); ivRef.current = null; }
  };
  React.useEffect(() => clear, []);

  const start = () => {
    clear(); setPct(0); setPhase('connecting');
    timers.current.push(setTimeout(() => setPhase('syncing'), 1100));
    timers.current.push(setTimeout(() => {
      const t0 = Date.now(); const DUR = 1700;
      const tick = () => {
        const p = Math.min(100, Math.round(((Date.now() - t0) / DUR) * 100));
        setPct(p);
        if (p >= 100) {
          clearInterval(ivRef.current); ivRef.current = null;
          timers.current.push(setTimeout(() => { setPhase('found'); setSynced && setSynced(true); }, 350));
        }
      };
      ivRef.current = setInterval(tick, 120);
    }, 1150));
  };

  const active = phase === 'connecting' || phase === 'syncing';
  const allDone = pending.length === 0;
  const statusText = {
    idle: 'Bereit zum Synchronisieren',
    connecting: 'Verbinde mit Uhr …',
    syncing: 'Übertrage Trainingsdaten …',
    found: allDone ? 'Alles zugeordnet' : `${pending.length} Einheiten erkannt`,
  }[phase];
  const statusSub = {
    idle: 'Garmin-Daten werden aus der Cloud synchronisiert.',
    connecting: `${profile.watch} · Cloud-Check`,

    syncing: `${pct}%`,
    found: allDone ? 'Alle erkannten Einheiten wurden zugeordnet.' : `${totalSets} Sätze · noch keiner Übung zugeordnet`,
  }[phase];

  return (
    <div className="ft-scroll" style={{ display: 'flex', flexDirection: 'column' }}>
      <ScreenHeader eyebrow="Smartwatch" title="Synchronisieren" />

      <div className="ft-pad" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* status hero */}
        <div className="card" style={{ padding: '30px 20px 26px', textAlign: 'center' }}>
          <PulseRings active={active} done={phase === 'found'} />
          <div style={{ marginTop: 22 }}>
            <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-0.01em', color: phase === 'found' ? 'var(--accent)' : 'var(--text)' }}>{statusText}</div>
            <div className="mono" style={{ fontSize: 12.5, color: 'var(--text-faint)', marginTop: 6 }}>{statusSub}</div>
          </div>

          {phase === 'syncing' && (
            <div style={{ marginTop: 18, height: 6, borderRadius: 999, background: 'var(--surface-3)', overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: 'var(--accent)', borderRadius: 999, transition: 'width .13s linear' }} />
            </div>
          )}

          {phase === 'idle' && (
            <button className="btn btn-primary btn-block" style={{ marginTop: 22 }} onClick={start}>
              <Icon name="sync" size={18} />Mit Uhr synchronisieren
            </button>
          )}
          {active && (
            <button className="btn btn-ghost btn-block" style={{ marginTop: 22 }} onClick={() => { clear(); setPhase('idle'); }}>
              Abbrechen
            </button>
          )}
        </div>

        {/* detected sessions — assign each individually */}
        {phase === 'found' && (
          <div className="fade-in" style={{ marginTop: 22 }}>
            {allDone ? (
              <>
                <div className="card" style={{ padding: 24, textAlign: 'center' }}>
                  <div style={{ width: 64, height: 64, borderRadius: 20, background: 'var(--accent-dim)', border: '1px solid var(--accent-border)', display: 'grid', placeItems: 'center', margin: '0 auto 14px' }}>
                    <Icon name="check" size={32} color="var(--accent)" stroke={2.6} />
                  </div>
                  <h2 style={{ fontSize: 19, fontWeight: 800, marginBottom: 6 }}>Alle Einheiten zugeordnet</h2>
                  <p style={{ fontSize: 13.5, color: 'var(--text-dim)', lineHeight: 1.5 }}>Deine Trainingsdaten sind gespeichert und im Fortschritt sichtbar.</p>
                </div>
                <button className="btn btn-primary btn-block" style={{ marginTop: 16 }} onClick={() => go('dashboard')}>
                  Zum Start<Icon name="arrowR" size={18} />
                </button>
              </>
            ) : (
              <>
                <SectionHeader title="Erkannte Einheiten" />
                <p style={{ fontSize: 12.5, color: 'var(--text-faint)', margin: '-4px 0 14px', lineHeight: 1.5 }}>
                  {pending.length} Trainingstage seit dem letzten Sync. Tippe eine Einheit an, ordne die Sätze den Übungen zu und finalisiere sie.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {pending.map((s) => <PendingSessionCard key={s.id} s={s} onPick={onPick} onDiscard={onDiscard} />)}
                </div>
                <button className="btn btn-ghost btn-block" style={{ marginTop: 16 }} onClick={() => { setSynced && setSynced(false); setPhase('idle'); }}>
                  Erneut synchronisieren
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { SyncScreen });
