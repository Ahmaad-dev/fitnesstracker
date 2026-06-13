/* FitTracker — KI-Coach: echte Analyse via window.claude, Zustände + Darstellung */

function DeltaBadge({ delta, unit = 'kg', big }) {
  const up = delta > 0, down = delta < 0;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      fontSize: big ? 13 : 11.5, fontWeight: 800, fontFamily: 'var(--mono)',
      color: up ? 'var(--accent)' : (down ? 'var(--hot)' : 'var(--text-dim)'),
      background: up ? 'var(--accent-dim)' : (down ? 'rgba(255,107,87,0.14)' : 'var(--surface-3)'),
      border: up ? '1px solid var(--accent-border)' : (down ? '1px solid rgba(255,107,87,0.4)' : '1px solid var(--border)'),
      borderRadius: 999, padding: big ? '4px 10px' : '3px 8px',
    }}>
      {up ? `+${+delta.toFixed(1)}` : (down ? `${+delta.toFixed(1)}` : '±0')} {unit}
    </span>
  );
}

/* one recommended exercise row — photo, last, suggested load, delta, always-visible reason */
function RecExerciseRow({ x, compact, last: isLast }) {
  const bw = x.bw;
  const unit = bw ? 'Wdh' : 'kg';
  const lastVal = bw ? window.FT.lastReps(x.name) : x.last;
  return (
    <div style={{ borderBottom: isLast ? 'none' : '1px solid var(--border)', padding: compact ? '10px 2px' : '12px 2px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <ExerciseDemo name={x.name} pattern={window.FT.patternFor(x.name)} muscle={x.muscle} size={compact ? 40 : 44} radius={11} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 700, lineHeight: 1.15 }}>{x.name}</div>
          <div className="mono" style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>
            zuletzt {lastVal != null ? `${lastVal} ${unit}` : '—'}{x.reps ? ` · Ziel ${x.reps}` : ''}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, justifyContent: 'flex-end' }}>
            <span className="mono tnum" style={{ fontSize: 19, fontWeight: 800 }}>{x.suggest}</span>
            <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{unit}</span>
          </div>
        </div>
        <DeltaBadge delta={x.delta} unit={unit} />
      </div>
      {x.note && (
        <div style={{ display: 'flex', gap: 7, alignItems: 'flex-start', padding: compact ? '7px 0 1px 52px' : '8px 0 1px 56px' }}>
          <Icon name="sparkle" size={12} color="var(--accent)" style={{ marginTop: 2, flexShrink: 0 }} />
          <p style={{ fontSize: 12, lineHeight: 1.45, color: 'var(--text-dim)', textWrap: 'pretty' }}>{x.note}</p>
        </div>
      )}
    </div>
  );
}

function KiBadge() {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--accent-border)', borderRadius: 999, padding: '5px 11px', fontSize: 12.5, fontWeight: 700 }}>
      <Icon name="sparkle" size={13} />KI-COACH
    </span>
  );
}

function Spinner({ size = 22 }) {
  return (
    <span style={{ width: size, height: size, display: 'inline-block', borderRadius: '50%', border: '2.5px solid var(--surface-3)', borderTopColor: 'var(--accent)', animation: 'ftSpin .8s linear infinite' }}>
      <style>{`@keyframes ftSpin{to{transform:rotate(360deg)}}`}</style>
    </span>
  );
}

/* ── Dashboard KI card ── */
function RecCard({ variant = 'kompakt', ai, onCta, onDetails }) {
  const Shell = ({ children }) => (
    <div className="card fade-in" style={{ position: 'relative', overflow: 'hidden', padding: 20, background: 'var(--accent-surface)', border: '1px solid var(--accent-border)' }}>
      {children}
    </div>
  );
  const Header = ({ right }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <KiBadge />
        <span className="eyebrow" style={{ color: 'var(--text-dim)' }}>{right || 'heute'}</span>
      </div>
    </div>
  );

  if (!ai || ai.status === 'none') {
    return (
      <Shell>
        <Header />
        <h2 style={{ fontSize: 21, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 6 }}>Noch keine Empfehlung heute</h2>
        <p style={{ fontSize: 13.5, lineHeight: 1.5, color: 'var(--text-dim)', marginBottom: 16 }}>
          Lass deine letzten Einheiten analysieren und hol dir Feedback samt nächster Gewichte.
        </p>
        <button className="btn btn-primary btn-block" onClick={onCta}>
          <Icon name="sparkle" size={18} />KI-Analyse starten
        </button>
      </Shell>
    );
  }
  if (ai.status === 'loading') {
    return (
      <Shell>
        <Header right="analysiert …" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '8px 0 4px' }}>
          <Spinner size={26} />
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Analysiere deine Daten …</div>
            <div className="mono" style={{ fontSize: 11.5, color: 'var(--text-faint)', marginTop: 3 }}>letzte Einheiten · Progression</div>
          </div>
        </div>
      </Shell>
    );
  }
  if (ai.status === 'error') {
    return (
      <Shell>
        <Header right="Fehler" />
        <h2 style={{ fontSize: 19, fontWeight: 800, marginBottom: 6 }}>Analyse fehlgeschlagen</h2>
        <p style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--text-dim)', marginBottom: 16 }}>{ai.error}</p>
        <button className="btn btn-primary btn-block" onClick={onCta}><Icon name="sync" size={17} />Erneut versuchen</button>
      </Shell>
    );
  }

  // ready
  const R = ai.data;
  const nextDay = window.FT.nextDay();
  const focus = R.exercises.filter((e) => e.day === nextDay);
  const pool = focus.length ? focus : R.exercises;
  const top = pool.slice(0, 3);

  return (
    <Shell>
      <Header right="aktualisiert heute" />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <h2 style={{ fontSize: 21, fontWeight: 800, letterSpacing: '-0.02em' }}>Gewichte für heute</h2>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-dim)', border: '1px solid var(--accent-border)', borderRadius: 999, padding: '3px 9px' }}>{window.FT.dayLabel(nextDay)}</span>
      </div>
      {R.summary && <p style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--text-dim)', marginBottom: 14 }}>{R.summary}</p>}

      {variant === 'fokus' && top[0] ? (
        <div style={{ background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--border)', padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
            <span className="dot" style={{ width: 9, height: 9, borderRadius: '50%', background: window.FT.muscleColor(top[0].muscle) }} />
            <span style={{ fontSize: 14.5, fontWeight: 700 }}>{top[0].name}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
            <span className="mono tnum" style={{ fontSize: 46, fontWeight: 800, lineHeight: 0.95, letterSpacing: '-0.03em' }}>{top[0].suggest}</span>
            <span style={{ fontSize: 16, color: 'var(--text-dim)', fontWeight: 700, marginBottom: 5 }}>{top[0].bw ? 'Wdh' : 'kg'}</span>
            <div style={{ marginBottom: 8, marginLeft: 'auto' }}><DeltaBadge delta={top[0].delta} unit={top[0].bw ? 'Wdh' : 'kg'} big /></div>
          </div>
          {top[0].note && (
            <div style={{ display: 'flex', gap: 7, alignItems: 'flex-start', marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
              <Icon name="sparkle" size={13} color="var(--accent)" style={{ marginTop: 2, flexShrink: 0 }} />
              <p style={{ fontSize: 12.5, lineHeight: 1.45, color: 'var(--text-dim)', textWrap: 'pretty' }}>{top[0].note}</p>
            </div>
          )}
        </div>
      ) : (
        <div style={{ background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--border)', padding: '2px 14px' }}>
          {top.map((x, i) => <RecExerciseRow key={x.name} x={x} compact last={i === top.length - 1} />)}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => onDetails(nextDay)}>Alle Gewichte<Icon name="arrowR" size={18} /></button>
      </div>
    </Shell>
  );
}

/* ── KI tab — full screen ── */
function RecommendScreen({ variant, ai, onTrigger, go }) {
  const status = ai ? ai.status : 'none';

  // empty / first run
  if (status === 'none' || status === 'error') {
    return (
      <div className="ft-scroll">
        <ScreenHeader eyebrow="Persönlicher Coach" title="KI-Coach" />
        <div className="ft-pad">
          <div className="card" style={{ padding: 24, textAlign: 'center' }}>
            <div style={{ width: 76, height: 76, borderRadius: 24, background: 'var(--accent-surface)', border: '1px solid var(--accent-border)', display: 'grid', placeItems: 'center', margin: '0 auto 18px' }}>
              <Icon name="sparkle" size={34} color="var(--accent)" />
            </div>
            <h2 style={{ fontSize: 21, fontWeight: 800, marginBottom: 8 }}>Analyse starten</h2>
            <p style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--text-dim)', marginBottom: 18 }}>
              Der KI-Coach wertet deine letzten Einheiten aus und gibt dir Feedback plus die nächsten empfohlenen Gewichte – pro Übung.
            </p>
            {status === 'error' && (
              <p style={{ fontSize: 12.5, color: 'var(--hot)', background: 'rgba(255,107,87,0.12)', border: '1px solid rgba(255,107,87,0.3)', borderRadius: 10, padding: '10px 12px', marginBottom: 16 }}>{ai.error}</p>
            )}
            <button className="btn btn-primary btn-block" onClick={onTrigger}>
              <Icon name="sparkle" size={18} />{status === 'error' ? 'Erneut versuchen' : 'KI-Analyse starten'}
            </button>
          </div>
          <div className="card" style={{ marginTop: 14, padding: 6 }}>
            {[['Daten sammeln', 'Letzte Einheiten je Übung'], ['Feedback', 'Kurze, sachliche Einschätzung'], ['Gewichte', 'Empfehlung pro Übung im Verlauf']].map(([k, v], i, a) => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', borderBottom: i < a.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <span style={{ width: 26, height: 26, borderRadius: 8, background: 'var(--surface-2)', display: 'grid', placeItems: 'center', flexShrink: 0 }}><span className="mono" style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)' }}>{i + 1}</span></span>
                <div><div style={{ fontSize: 14, fontWeight: 650 }}>{k}</div><div style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>{v}</div></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (status === 'loading') {
    return (
      <div className="ft-scroll">
        <ScreenHeader eyebrow="Persönlicher Coach" title="KI-Coach" />
        <div className="ft-pad">
          <div className="card" style={{ padding: 36, textAlign: 'center' }}>
            <div style={{ display: 'grid', placeItems: 'center', marginBottom: 20 }}><Spinner size={44} /></div>
            <h2 style={{ fontSize: 19, fontWeight: 800, marginBottom: 8 }}>Analysiere deine Einheiten …</h2>
            <p style={{ fontSize: 13.5, color: 'var(--text-dim)', lineHeight: 1.5 }}>Die KI prüft Progression, Erholung und Wiederholungen.</p>
          </div>
        </div>
      </div>
    );
  }

  // ready
  const R = ai.data;
  const ups = R.exercises.filter((e) => e.delta > 0).length;
  const holds = R.exercises.filter((e) => e.delta === 0).length;
  const days = window.FT.DAYS.filter((d) => R.exercises.some((e) => e.day === d));

  return (
    <div className="ft-scroll">
      <div className="ft-top ft-pad" style={{ paddingBottom: 14, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 6 }}>Aktualisiert heute</div>
          <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.05 }}>KI-Coach</h1>
        </div>
        <button onClick={onTrigger} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-dim)', borderRadius: 999, padding: '8px 13px', font: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          <Icon name="sync" size={15} />Neu
        </button>
      </div>

      <div className="ft-pad">
        {/* feedback */}
        <div className="card fade-in" style={{ padding: 18, background: 'var(--accent-surface)', border: '1px solid var(--accent-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <KiBadge />
            {R.focusDay && <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)' }}>Heute: {window.FT.dayLabel(R.focusDay)}</span>}
          </div>
          <p style={{ fontSize: 14.5, lineHeight: 1.55, color: 'var(--text)' }}>{R.summary}</p>
        </div>

        <div style={{ display: 'flex', gap: 12, margin: '16px 0 22px' }}>
          <div className="card" style={{ flex: 1, padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--accent)' }}><Icon name="bolt" size={16} /><span className="mono tnum" style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>{ups}</span></div>
            <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 4 }}>Steigerungen</div>
          </div>
          <div className="card" style={{ flex: 1, padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--text-dim)' }}><Icon name="target" size={16} /><span className="mono tnum" style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>{holds}</span></div>
            <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 4 }}>Gewicht halten</div>
          </div>
        </div>

        {/* per-day weight recommendations */}
        {days.map((d) => (
          <div key={d} style={{ marginBottom: 20 }}>
            <SectionHeader title={window.FT.dayLabel(d)} />
            <div className="card" style={{ padding: '2px 14px' }}>
              {R.exercises.filter((e) => e.day === d).map((x, i, arr) => (
                <RecExerciseRow key={x.name} x={x} last={i === arr.length - 1} />
              ))}
            </div>
          </div>
        ))}

        <p style={{ textAlign: 'center', fontSize: 11.5, color: 'var(--text-faint)', marginTop: 6, lineHeight: 1.5 }}>
          Empfehlungen bleiben bis zur nächsten Analyse.<br />Um Mitternacht setzt der Coach zurück.
        </p>
      </div>
    </div>
  );
}

Object.assign(window, { RecCard, RecommendScreen, RecExerciseRow, DeltaBadge });
