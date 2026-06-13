/* FitTracker — schlankes Onboarding (Erst-Start, automatisch)
   4 Schritte: Willkommen → Smartwatch → Profil & Ziel → Fertig.
   Übungen/Split entsprechen der Basis (kein Split-Editor). Auf „App starten"
   ruft onDone(draft) → app.jsx übernimmt die Werte ins Profil + setzt das Flag. */

function OnbDots({ step, total }) {
  return (
    <div style={{ display: 'flex', gap: 7, justifyContent: 'center' }}>
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} style={{
          width: i === step ? 22 : 7, height: 7, borderRadius: 999,
          background: i === step ? 'var(--accent)' : (i < step ? 'var(--accent-dim)' : 'var(--surface-3)'),
          transition: 'width .25s, background .25s',
        }} />
      ))}
    </div>
  );
}

function OnbPills({ value, options, onChange }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {options.map((o) => {
        const on = o === value;
        return (
          <button key={o} onClick={() => onChange(o)} style={{
            padding: '10px 15px', borderRadius: 999, cursor: 'pointer', font: 'inherit', fontSize: 14, fontWeight: 600,
            background: on ? 'var(--accent-dim)' : 'var(--surface)', color: on ? 'var(--accent)' : 'var(--text-dim)',
            border: `1px solid ${on ? 'var(--accent-border)' : 'var(--border)'}`, transition: 'background .15s',
          }}>{o}</button>
        );
      })}
    </div>
  );
}

function OnbStepShell({ eyebrow, title, sub, children }) {
  return (
    <div className="fade-in" style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
      <div className="eyebrow" style={{ marginBottom: 8 }}>{eyebrow}</div>
      <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.08, marginBottom: sub ? 8 : 18 }}>{title}</h1>
      {sub && <p style={{ fontSize: 14.5, lineHeight: 1.55, color: 'var(--text-dim)', marginBottom: 22 }}>{sub}</p>}
      {children}
    </div>
  );
}

function OnboardingFlow({ onDone }) {
  const D = window.FT.PROFILE_DEFAULTS;
  const [step, setStep] = React.useState(0);
  const [name, setName] = React.useState('');
  const [watch, setWatch] = React.useState(D.watch);
  const [goal, setGoal] = React.useState(D.goal);
  const [level, setLevel] = React.useState(D.level);
  const [weekGoal, setWeekGoal] = React.useState(D.weekGoal);

  const WATCHES = ['vívoactive 6', 'Forerunner 265', 'fēnix 7', 'Apple Watch', 'Andere'];
  const TOTAL = 4;
  const next = () => setStep((s) => Math.min(TOTAL - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));
  const finish = () => onDone({ name: name.trim() || 'Athlet', watch, goal, level, weekGoal, aiEnabled: true });

  const Loop = ({ n, icon, title, sub }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 44, height: 44, flexShrink: 0, borderRadius: 14, background: 'var(--accent-surface)', border: '1px solid var(--accent-border)', display: 'grid', placeItems: 'center' }}>
        <Icon name={icon} size={20} color="var(--accent)" />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>{title}</div>
        <div style={{ fontSize: 12.5, color: 'var(--text-faint)', marginTop: 2, lineHeight: 1.4 }}>{sub}</div>
      </div>
    </div>
  );

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 300, background: 'var(--bg)',
      display: 'flex', flexDirection: 'column',
      padding: 'calc(env(safe-area-inset-top) + 64px) 24px calc(env(safe-area-inset-bottom) + 26px)',
    }}>
      {/* top: back + dots */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 28, minHeight: 24 }}>
        <div style={{ width: 60 }}>
          {step > 0 && (
            <button onClick={back} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: 'none', border: 'none', color: 'var(--text-dim)', font: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer', padding: 4, marginLeft: -4 }}>
              <Icon name="chevL" size={16} />Zurück
            </button>
          )}
        </div>
        <div style={{ flex: 1 }}><OnbDots step={step} total={TOTAL} /></div>
        <div style={{ width: 60 }} />
      </div>

      {/* ── Step 0: Willkommen ── */}
      {step === 0 && (
        <OnbStepShell
          eyebrow="Willkommen"
          title={<>Tracke smarter,<br />nicht mehr.</>}
          sub="FitTracker dreht das Logging um: Deine Uhr erfasst die Arbeit, du sagst nur, welche Übung es war — die KI empfiehlt die Last.">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 4 }}>
            <Loop n={1} icon="watch" title="Uhr erkennt deine Sätze" sub="Wiederholungen, Pausen und Puls — automatisch." />
            <Loop n={2} icon="grip" title="Du ordnest die Übung zu" sub="Ein Tipp pro erkanntem Satz, fertig." />
            <Loop n={3} icon="sparkle" title="KI empfiehlt das Gewicht" sub="Progressive Overload pro Übung." />
          </div>
        </OnbStepShell>
      )}

      {/* ── Step 1: Smartwatch ── */}
      {step === 1 && (
        <OnbStepShell
          eyebrow="Schritt 1 von 3"
          title="Smartwatch koppeln"
          sub="Wähle deine Uhr — sie erkennt Sätze, Wiederholungen und Pausen automatisch.">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {WATCHES.map((wv) => {
              const on = wv === watch;
              return (
                <button key={wv} onClick={() => setWatch(wv)} style={{
                  display: 'flex', alignItems: 'center', gap: 13, padding: '14px 16px', cursor: 'pointer', textAlign: 'left',
                  background: on ? 'var(--accent-dim)' : 'var(--surface)', border: `1px solid ${on ? 'var(--accent-border)' : 'var(--border)'}`,
                  borderRadius: 14, font: 'inherit', color: 'var(--text)',
                }}>
                  <Icon name="watch" size={20} color={on ? 'var(--accent)' : 'var(--text-faint)'} />
                  <span style={{ flex: 1, fontSize: 15, fontWeight: on ? 700 : 500 }}>{wv}</span>
                  {on && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 700, color: 'var(--accent)' }}><Icon name="check" size={15} color="var(--accent)" stroke={2.6} />verbunden</span>}
                </button>
              );
            })}
          </div>
        </OnbStepShell>
      )}

      {/* ── Step 2: Profil & Ziel ── */}
      {step === 2 && (
        <OnbStepShell
          eyebrow="Schritt 2 von 3"
          title="Dein Profil"
          sub="Damit der KI-Coach realistische Gewichte empfiehlt.">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            <div>
              <div style={{ fontSize: 12.5, color: 'var(--text-faint)', marginBottom: 8, fontWeight: 600 }}>Name</div>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Dein Name" style={{
                width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12,
                padding: '13px 14px', color: 'var(--text)', font: 'inherit', fontSize: 16, outline: 'none',
              }} />
            </div>
            <div>
              <div style={{ fontSize: 12.5, color: 'var(--text-faint)', marginBottom: 10, fontWeight: 600 }}>Trainingsziel</div>
              <OnbPills value={goal} options={['Muskelaufbau', 'Maximalkraft', 'Abnehmen', 'Allgemeine Fitness']} onChange={setGoal} />
            </div>
            <div>
              <div style={{ fontSize: 12.5, color: 'var(--text-faint)', marginBottom: 10, fontWeight: 600 }}>Erfahrung</div>
              <OnbPills value={level} options={['Anfänger', 'Fortgeschritten', 'Profi']} onChange={setLevel} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>Wochenziel</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-faint)', marginTop: 1 }}>Trainingseinheiten / Woche</div>
              </div>
              <Stepper value={weekGoal} min={1} max={7} step={1} onChange={setWeekGoal} />
            </div>
          </div>
        </OnbStepShell>
      )}

      {/* ── Step 3: Fertig ── */}
      {step === 3 && (
        <OnbStepShell eyebrow="Fertig" title={`Alles bereit${name.trim() ? ', ' + name.trim() : ''}.`} sub="Dein 5er-Split (Brust · Rücken · Schulter · Arm · Beine) ist eingerichtet. Synchronisiere nach dem Training — den Rest übernimmt die KI.">
          <div style={{ display: 'grid', placeItems: 'center', flex: 1 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 92, height: 92, borderRadius: '50%', background: 'var(--accent-dim)', border: '1px solid var(--accent-border)', display: 'grid', placeItems: 'center', margin: '0 auto 18px' }}>
                <Icon name="check" size={46} color="var(--accent)" stroke={2.4} />
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13, color: 'var(--text-dim)' }}>
                <Icon name="watch" size={15} color="var(--accent)" />{watch} verbunden
              </div>
            </div>
          </div>
        </OnbStepShell>
      )}

      {/* bottom CTA */}
      <div style={{ paddingTop: 18 }}>
        {step === 0 && <button className="btn btn-primary btn-block" onClick={next}>Los geht’s<Icon name="arrowR" size={18} /></button>}
        {step === 1 && <button className="btn btn-primary btn-block" onClick={next}>Koppeln &amp; weiter<Icon name="arrowR" size={18} /></button>}
        {step === 2 && <button className="btn btn-primary btn-block" onClick={next}>Weiter<Icon name="arrowR" size={18} /></button>}
        {step === 3 && <button className="btn btn-primary btn-block" onClick={finish}><Icon name="check" size={18} />App starten</button>}
      </div>
    </div>
  );
}

Object.assign(window, { OnboardingFlow });
