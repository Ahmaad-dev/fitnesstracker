/* FitTracker — Dashboard (3 variants) */

function Greeting({ compact }) {
  const { profile } = useProfile();
  return (
    <div style={{ marginBottom: compact ? 16 : 20 }}>
      <div className="eyebrow" style={{ marginBottom: 6 }}>{window.FT.todayLabel}</div>
      <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.05 }}>
        Hallo {profile.name}.
      </h1>
    </div>
  );
}

function QuickActions({ go, pendingCount = 0 }) {
  const A = ({ icon, label, sub, onClick, primary, badge }) => (
    <button onClick={onClick} style={{
      flex: 1, cursor: 'pointer', font: 'inherit', textAlign: 'left', position: 'relative',
      background: primary ? 'var(--accent)' : 'var(--surface)',
      color: primary ? 'var(--accent-ink)' : 'var(--text)',
      border: primary ? 'none' : '1px solid var(--border)',
      borderRadius: 'var(--r-lg)', padding: 16, boxShadow: 'var(--shadow-card)',
    }}>
      <Icon name={icon} size={22} color={primary ? 'var(--accent-ink)' : 'var(--accent)'} />
      {badge > 0 && (
        <span className="mono tnum" style={{ position: 'absolute', top: 12, right: 12, minWidth: 22, height: 22, padding: '0 6px', borderRadius: 999, background: primary ? 'var(--accent-ink)' : 'var(--accent)', color: primary ? 'var(--accent)' : 'var(--accent-ink)', fontSize: 12, fontWeight: 800, display: 'grid', placeItems: 'center' }}>{badge}</span>
      )}
      <div style={{ fontSize: 15, fontWeight: 700, marginTop: 18 }}>{label}</div>
      <div style={{ fontSize: 12, opacity: primary ? 0.7 : 1, color: primary ? 'inherit' : 'var(--text-faint)', marginTop: 2 }}>{sub}</div>
    </button>
  );
  return (
    <div style={{ display: 'flex', gap: 12 }}>
      <A icon="sync" label="Synchronisieren" sub={pendingCount > 0 ? `${pendingCount} Einheiten offen` : 'Daten von der Uhr'} onClick={() => go('sync')} primary badge={pendingCount} />
      <A icon="history" label="Fortschritt" sub="Deine Entwicklung" onClick={() => go('history')} />
    </div>
  );
}

/* weekly activity bars */
function WeekActivity() {
  const week = window.FT.WEEK;
  const max = Math.max(...week.map((d) => d.sets || 0));
  const { profile } = useProfile();
  const done = window.FT.weekSessions();
  return (
    <div className="card" style={{ padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontSize: 14, fontWeight: 700 }}>Diese Woche</span>
        <span className="mono tnum" style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>
          <span style={{ color: 'var(--accent)' }}>{done}</span> / {profile.weekGoal} Einheiten
        </span>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 76 }}>
        {week.map((d) => (
          <div key={d.d} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
            <div style={{ width: '100%', height: 60, display: 'flex', alignItems: 'flex-end' }}>
              <div style={{
                width: '100%', borderRadius: 6,
                height: d.sets ? `${Math.max(14, (d.sets / max) * 100)}%` : 4,
                background: d.sets ? (d.type ? window.FT.muscleColor(window.FT.SESSIONS.find(s=>s.type===d.type)?.muscles[0] || 'Core') : 'var(--accent)') : 'var(--surface-3)',
                opacity: d.sets ? 0.9 : 1,
              }} />
            </div>
            <span style={{ fontSize: 11, color: d.sets ? 'var(--text-dim)' : 'var(--text-faint)', fontWeight: d.sets ? 700 : 500 }}>{d.d}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* stat pills row */
function StatPills() {
  const { profile } = useProfile();
  const done = window.FT.weekSessions();
  const pct = Math.round((done / profile.weekGoal) * 100);
  return (
    <div style={{ display: 'flex', gap: 12 }}>
      <div className="card" style={{ flex: 1, padding: '15px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--hot)' }}>
          <Icon name="flame" size={17} /><span className="mono tnum" style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>{window.FT.stats.streak}</span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 4 }}>Wochen-Streak</div>
      </div>
      <div className="card" style={{ flex: 1, padding: '15px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--accent)' }}>
          <Icon name="target" size={17} /><span className="mono tnum" style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>{pct}%</span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 4 }}>Wochenziel</div>
      </div>
    </div>
  );
}

function DashboardScreen({ variant = 'fokus', recVariant, ai, go, onOpen, onStart, onOpenDay, pendingCount = 0 }) {
  const sessions = window.FT.SESSIONS;

  return (
    <div className="ft-scroll">
      <div className="ft-top ft-pad">
        <Greeting />

        {variant === 'uebersicht' && (<><StatPills /><div style={{ height: 16 }} /></>)}
        {variant === 'aktivitaet' && (<><WeekActivity /><div style={{ height: 16 }} /></>)}

        <RecCard variant={recVariant} ai={ai} onCta={() => go('recommend')} onDetails={(d) => (onOpenDay ? onOpenDay(d) : go('recommend'))} />

        <div style={{ height: 22 }} />
        <QuickActions go={go} pendingCount={pendingCount} />
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 10 }}><ManualLogLink /></div>

        <div style={{ height: 26 }} />

        <SectionHeader title="Zuletzt trainiert" action="Alle" onAction={() => go('history')} />
        {sessions.length === 0 ? (
          <div className="card" style={{ padding: '22px 18px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <Icon name="history" size={28} color="var(--text-faint)" />
            <p style={{ fontSize: 13.5, color: 'var(--text-dim)', lineHeight: 1.5, margin: 0 }}>
              Noch keine Trainingseinheiten gespeichert.
            </p>
            <p style={{ fontSize: 12.5, color: 'var(--text-faint)', margin: 0 }}>
              Synchronisiere deine Uhr, um Einheiten zu importieren.
            </p>
            <button onClick={onStart} style={{
              marginTop: 4, padding: '9px 20px', borderRadius: 12, border: 'none', cursor: 'pointer',
              background: 'var(--accent)', color: 'var(--accent-ink)', fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
            }}>Jetzt synchronisieren</button>
          </div>
        ) : variant === 'fokus' ? (
          <div className="card" style={{ padding: '2px 14px' }}>
            {sessions.slice(0, 4).map((s, i) => (
              <SessionMiniRow key={s.id} s={s} onOpen={onOpen} last={i === 3} />
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {sessions.slice(0, 2).map((s) => <SessionCard key={s.id} s={s} onOpen={onOpen} />)}
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { DashboardScreen });
