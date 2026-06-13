/* FitTracker — Profil (Apple-Style, editierbar) + TabBar */

/* ── kleine iOS-artige Steuerelemente ── */
function IOSSwitch({ on, onChange }) {
  return (
    <button onClick={() => onChange(!on)} aria-pressed={on} style={{
      width: 50, height: 30, borderRadius: 999, border: 'none', cursor: 'pointer', padding: 2, flexShrink: 0,
      background: on ? 'var(--accent)' : 'var(--surface-3)', transition: 'background .2s', display: 'flex',
    }}>
      <span style={{ width: 26, height: 26, borderRadius: '50%', background: '#fff', transform: on ? 'translateX(20px)' : 'none', transition: 'transform .2s', boxShadow: '0 1px 3px rgba(0,0,0,0.4)' }} />
    </button>
  );
}

function Stepper({ value, onChange, min, max, step = 1, unit }) {
  const clamp = (v) => Math.min(max, Math.max(min, +v.toFixed(1)));
  const Btn = ({ d, label }) => (
    <button onClick={() => onChange(clamp(value + d))} disabled={(d < 0 && value <= min) || (d > 0 && value >= max)} style={{
      width: 34, height: 32, border: 'none', cursor: 'pointer', background: 'none', color: 'var(--accent)',
      fontSize: 19, fontWeight: 700, display: 'grid', placeItems: 'center', opacity: ((d < 0 && value <= min) || (d > 0 && value >= max)) ? 0.3 : 1,
    }}>{label}</button>
  );
  return (
    <div style={{ display: 'flex', alignItems: 'center', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, flexShrink: 0 }}>
      <Btn d={-step} label="−" />
      <span className="mono tnum" style={{ minWidth: 64, textAlign: 'center', fontSize: 14.5, fontWeight: 700 }}>{value}{unit ? ` ${unit}` : ''}</span>
      <Btn d={step} label="+" />
    </div>
  );
}

function Segmented({ value, options, onChange }) {
  return (
    <div style={{ display: 'flex', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: 2, gap: 2, flexShrink: 0 }}>
      {options.map((o) => (
        <button key={o} onClick={() => onChange(o)} style={{
          padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', font: 'inherit', fontSize: 13, fontWeight: 600,
          background: o === value ? 'var(--accent)' : 'transparent', color: o === value ? 'var(--accent-ink)' : 'var(--text-dim)', transition: 'background .15s',
        }}>{o}</button>
      ))}
    </div>
  );
}

/* row scaffolds */
function Row({ label, sub, children, last }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 2px', borderBottom: last ? 'none' : '1px solid var(--border)', minHeight: 34 }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 15 }}>{label}</div>
        {sub && <div style={{ fontSize: 11.5, color: 'var(--text-faint)', marginTop: 1 }}>{sub}</div>}
      </div>
      {children}
    </div>
  );
}

function TapRow({ label, value, onClick, last }) {
  return (
    <button onClick={onClick} style={{
      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '13px 2px',
      borderBottom: last ? 'none' : '1px solid var(--border)', background: 'none', border: 'none', font: 'inherit', color: 'var(--text)', cursor: 'pointer', textAlign: 'left',
    }}>
      <span style={{ fontSize: 15 }}>{label}</span>
      <span style={{ fontSize: 14, color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 6 }}>{value}<Icon name="chevR" size={15} color="var(--text-faint)" /></span>
    </button>
  );
}

/* text editor inside the sheet (local state, commit on save) */
function TextEditSheet({ initial, placeholder, onSave }) {
  const [v, setV] = React.useState(initial || '');
  return (
    <div style={{ paddingBottom: 6 }}>
      <input autoFocus value={v} onChange={(e) => setV(e.target.value)} placeholder={placeholder}
        onKeyDown={(e) => { if (e.key === 'Enter' && v.trim()) onSave(v.trim()); }}
        style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, padding: '13px 14px', color: 'var(--text)', font: 'inherit', fontSize: 16, outline: 'none', marginBottom: 14 }} />
      <button className="btn btn-primary btn-block" disabled={!v.trim()} onClick={() => v.trim() && onSave(v.trim())} style={{ opacity: v.trim() ? 1 : 0.4 }}>
        <Icon name="check" size={18} />Speichern
      </button>
    </div>
  );
}

function ProfileScreen() {
  const { profile, setProfile } = useProfile();
  const totalSessions = window.FT.SESSIONS.length;
  const weekDone = window.FT.weekSessions();
  const [sheet, setSheet] = React.useState(null); // {kind:'select'|'text', field, title, options?}

  const openSelect = (field, title, options) => setSheet({ kind: 'select', field, title, options });
  const openText = (field, title) => setSheet({ kind: 'text', field, title });
  const commit = (field, value) => { setProfile({ [field]: value }); setSheet(null); };

  return (
    <div className="ft-scroll">
      <ScreenHeader eyebrow="Profil" title={profile.name} />
      <div className="ft-pad">
        {/* identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, background: 'linear-gradient(150deg, var(--accent), var(--surface-3))', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 26, color: 'var(--accent-ink)' }}>
            {(profile.name || '?')[0].toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{profile.name}</div>
            <div style={{ fontSize: 13, color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
              <Icon name="watch" size={14} color="var(--accent)" />{profile.watch} verbunden
            </div>
          </div>
        </div>

        {/* stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 24 }}>
          {[['Streak', window.FT.stats.streak, 'Wochen'], ['Einheiten', totalSessions, 'gesamt'], ['Diese Woche', weekDone, 'Einheiten']].map(([k, v, s]) => (
            <div key={k} className="card" style={{ padding: '15px 12px', textAlign: 'center' }}>
              <div className="mono tnum" style={{ fontSize: 24, fontWeight: 700 }}>{v}</div>
              <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 3 }}>{k}</div>
            </div>
          ))}
        </div>

        {/* persönliche Daten */}
        <SectionHeader title="Persönliche Daten" />
        <p style={{ fontSize: 11.5, color: 'var(--text-faint)', margin: '-4px 0 12px', lineHeight: 1.5 }}>
          Alter, Gewicht & Co. fließen in die KI-Empfehlungen ein.
        </p>
        <div className="card" style={{ padding: '4px 14px', marginBottom: 22 }}>
          <TapRow label="Name" value={profile.name} onClick={() => openText('name', 'Name')} />
          <TapRow label="Geschlecht" value={profile.sex} onClick={() => openSelect('sex', 'Geschlecht', ['Männlich', 'Weiblich', 'Divers'])} />
          <Row label="Alter"><Stepper value={profile.age} min={14} max={90} step={1} unit="J." onChange={(v) => setProfile({ age: v })} /></Row>
          <Row label="Größe"><Stepper value={profile.height} min={130} max={220} step={1} unit="cm" onChange={(v) => setProfile({ height: v })} /></Row>
          <Row label="Gewicht" last><Stepper value={profile.weight} min={35} max={200} step={0.5} unit={profile.unit} onChange={(v) => setProfile({ weight: v })} /></Row>
        </div>

        {/* Training */}
        <SectionHeader title="Training" />
        <div className="card" style={{ padding: '4px 14px', marginBottom: 22 }}>
          <TapRow label="Trainingsziel" value={profile.goal} onClick={() => openSelect('goal', 'Trainingsziel', ['Muskelaufbau', 'Maximalkraft', 'Abnehmen', 'Allgemeine Fitness'])} />
          <TapRow label="Erfahrung" value={profile.level} onClick={() => openSelect('level', 'Erfahrung', ['Anfänger', 'Fortgeschritten', 'Profi'])} />
          <Row label="Wochenziel" sub="Trainingseinheiten / Woche" last><Stepper value={profile.weekGoal} min={1} max={7} step={1} onChange={(v) => setProfile({ weekGoal: v })} /></Row>
        </div>

        {/* App */}
        <SectionHeader title="Einstellungen" />
        <div className="card" style={{ padding: '4px 14px' }}>
          <Row label="Einheit"><Segmented value={profile.unit} options={['kg', 'lb']} onChange={(v) => setProfile({ unit: v })} /></Row>
          <TapRow label="Smartwatch" value={profile.watch} onClick={() => openSelect('watch', 'Smartwatch', ['vívoactive 6', 'Forerunner 265', 'fēnix 7', 'Apple Watch', 'Andere'])} />
          <Row label="KI-Empfehlungen" last><IOSSwitch on={profile.aiEnabled} onChange={(v) => setProfile({ aiEnabled: v })} /></Row>
        </div>

        <p style={{ textAlign: 'center', fontSize: 11.5, color: 'var(--text-faint)', marginTop: 22 }}>FitTracker · Prototyp</p>
      </div>

      {/* editor sheet */}
      <Sheet open={!!sheet} onClose={() => setSheet(null)} title={sheet ? sheet.title : ''}>
        {sheet && sheet.kind === 'select' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 6 }}>
            {sheet.options.map((o) => {
              const active = profile[sheet.field] === o;
              return (
                <button key={o} onClick={() => commit(sheet.field, o)} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '14px 16px', cursor: 'pointer',
                  background: active ? 'var(--accent-dim)' : 'var(--surface)', border: `1px solid ${active ? 'var(--accent-border)' : 'var(--border)'}`,
                  borderRadius: 12, font: 'inherit', color: active ? 'var(--accent)' : 'var(--text)', textAlign: 'left', fontSize: 15.5, fontWeight: active ? 700 : 500,
                }}>
                  {o}{active && <Icon name="check" size={18} color="var(--accent)" stroke={2.6} />}
                </button>
              );
            })}
          </div>
        )}
        {sheet && sheet.kind === 'text' && (
          <TextEditSheet initial={profile[sheet.field]} placeholder={sheet.title} onSave={(v) => commit(sheet.field, v)} />
        )}
      </Sheet>
    </div>
  );
}

function TabBar({ route, go, pendingCount = 0 }) {
  const tabs = [
    { key: 'dashboard', icon: 'home', label: 'Start' },
    { key: 'history', icon: 'history', label: 'Fortschritt' },
    { key: '_sync', icon: 'sync', label: 'Sync' },
    { key: 'recommend', icon: 'sparkle', label: 'KI' },
    { key: 'profile', icon: 'user', label: 'Profil' },
  ];
  const isActive = (k) => k === route || (k === 'history' && (route === 'detail' || route === 'historyDay')) || (k === '_sync' && (route === 'sync' || route === 'assign'));

  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 100,
      paddingBottom: 26, paddingTop: 10,
      background: 'linear-gradient(to top, var(--bg) 55%, transparent)',
    }}>
      <div style={{
        margin: '0 14px', height: 64, borderRadius: 26,
        background: 'rgba(22,24,29,0.86)',
        backdropFilter: 'blur(20px) saturate(160%)', WebkitBackdropFilter: 'blur(20px) saturate(160%)',
        border: '1px solid var(--border-2)', boxShadow: '0 12px 40px -8px rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '0 6px',
      }}>
        {tabs.map((t) => {
          if (t.key === '_sync') {
            return (
              <button key={t.key} onClick={() => go('sync')} aria-label="Synchronisieren" style={{
                width: 54, height: 54, borderRadius: 18, marginTop: -22, cursor: 'pointer', position: 'relative',
                background: 'var(--accent)',
                border: '4px solid var(--bg)', display: 'grid', placeItems: 'center',
                boxShadow: '0 8px 22px -4px rgba(var(--accent-rgb),0.55)',
              }}>
                <Icon name="sync" size={24} color="var(--accent-ink)" stroke={2.4} />
                {pendingCount > 0 && (
                  <span className="mono tnum" style={{ position: 'absolute', top: -4, right: -4, minWidth: 20, height: 20, padding: '0 5px', borderRadius: 999, background: 'var(--hot)', color: '#fff', fontSize: 11, fontWeight: 800, display: 'grid', placeItems: 'center', border: '2px solid var(--bg)' }}>{pendingCount}</span>
                )}
              </button>
            );
          }
          const active = isActive(t.key);
          return (
            <button key={t.key} onClick={() => go(t.key)} style={{
              flex: 1, background: 'none', border: 'none', cursor: 'pointer', padding: '6px 0',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              color: active ? 'var(--accent)' : 'var(--text-faint)',
            }}>
              <Icon name={t.icon} size={22} stroke={active ? 2.4 : 2} />
              <span style={{ fontSize: 10, fontWeight: active ? 700 : 500 }}>{t.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

Object.assign(window, { ProfileScreen, TabBar, IOSSwitch, Stepper, Segmented });
