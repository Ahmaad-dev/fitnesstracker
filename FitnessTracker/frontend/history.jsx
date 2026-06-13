/* FitTracker — Trainingshistorie + Detail */

function TypePill({ type }) {
  return (
    <span style={{
      fontSize: 12, fontWeight: 800, letterSpacing: '0.06em',
      color: 'var(--text)', background: 'var(--surface-3)',
      borderRadius: 8, padding: '4px 9px', textTransform: 'uppercase',
    }}>{type}</span>
  );
}

/* full session card (history + dashboard) */
function SessionCard({ s, onOpen }) {
  return (
    <button onClick={() => onOpen(s)} style={{
      width: '100%', textAlign: 'left', cursor: 'pointer',
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--r-lg)', padding: 16, font: 'inherit', color: 'var(--text)',
      display: 'block', boxShadow: 'var(--shadow-card)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <TypePill type={s.type} />
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{s.day}</div>
            <div className="mono" style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>{s.date}</div>
          </div>
        </div>
        <Icon name="chevR" size={18} color="var(--text-faint)" />
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 14 }}>
        {s.muscles.map((m) => <MuscleTag key={m} muscle={m} />)}
      </div>

      <div style={{ display: 'flex', gap: 18 }}>
        <Stat icon="clock" v={`${s.duration}`} u="min" />
        <Stat icon="dumbbell" v={`${s.sets}`} u="Sätze" />
        <Stat icon="bolt" v={`${(s.volume / 1000).toFixed(1)}k`} u="kg Vol." />
        <div style={{ flex: 1 }} />
        <IntensityDot level={s.intensity} />
      </div>
    </button>
  );
}

function Stat({ icon, v, u }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <Icon name={icon} size={15} color="var(--text-faint)" />
      <span className="mono tnum" style={{ fontSize: 14, fontWeight: 600 }}>{v}</span>
      <span style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>{u}</span>
    </div>
  );
}

/* compact one-line session row (dashboard 'fokus') */
function SessionMiniRow({ s, onOpen, last }) {
  return (
    <button onClick={() => onOpen(s)} style={{
      width: '100%', display: 'flex', alignItems: 'center', gap: 12,
      padding: '13px 4px', background: 'none', border: 'none', cursor: 'pointer',
      borderBottom: last ? 'none' : '1px solid var(--border)', font: 'inherit', color: 'var(--text)',
    }}>
      <div style={{ display: 'flex', gap: 3 }}>
        {s.muscles.slice(0, 3).map((m) => <span key={m} style={{ width: 7, height: 22, borderRadius: 4, background: window.FT.muscleColor(m) }} />)}
      </div>
      <div style={{ flex: 1, textAlign: 'left' }}>
        <div style={{ fontSize: 14.5, fontWeight: 700 }}>{window.FT.dayLabel(s.type)}</div>
        <div className="mono" style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>{s.day} · {s.date}</div>
      </div>
      <span className="mono tnum" style={{ fontSize: 13, color: 'var(--text-dim)' }}>{s.sets} Sätze</span>
      <Icon name="chevR" size={16} color="var(--text-faint)" />
    </button>
  );
}

/* mini progression line chart (weight, or reps for bodyweight) */
function ProgressChart({ log, color, height = 92, big = false }) {
  const bw = log[0].bw;
  const vals = log.map((p) => (bw ? p.topReps : p.w));
  const n = log.length;
  if (!n) return null;
  const W = big ? 660 : 300, H = height, padX = big ? 30 : 24, padTop = 20, padBot = 22;
  const min = Math.min(...vals), max = Math.max(...vals);
  const span = (max - min) || 1;
  const x = (i) => n < 2 ? W / 2 : padX + (i * (W - 2 * padX)) / (n - 1);
  const y = (v) => padTop + (1 - (v - min) / span) * (H - padTop - padBot);
  const pts = vals.map((v, i) => [x(i), y(v)]);
  const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const area = `M${pts[0][0].toFixed(1)} ${H - padBot} ` + pts.map((p) => `L${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ') + ` L${pts[pts.length - 1][0].toFixed(1)} ${H - padBot} Z`;
  // label density: for long series, thin out value + date labels
  const dense = n > 8;
  const showVal = (i) => !dense || i === n - 1 || i === 0 || i % 3 === 0;
  const showDate = (i) => !dense || i % 3 === 0 || i === n - 1;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
      <path d={area} style={{ fill: color, opacity: 0.13 }} />
      <path d={line} fill="none" strokeWidth={big ? 3 : 2.5} strokeLinecap="round" strokeLinejoin="round" style={{ stroke: color }} />
      {pts.map((p, i) => {
        const lastOne = i === pts.length - 1;
        return (
          <g key={i}>
            <circle cx={p[0]} cy={p[1]} r={lastOne ? (big ? 5 : 4.5) : (dense ? 2.4 : 3)} strokeWidth="2" style={{ fill: lastOne ? color : 'var(--bg-2)', stroke: color }} />
            {showVal(i) && <text x={p[0]} y={p[1] - (big ? 10 : 8)} textAnchor="middle" fontSize={big ? 12 : 11.5} fontWeight="700" style={{ fill: 'var(--text)', fontFamily: 'var(--mono)' }}>{vals[i]}</text>}
            {showDate(i) && <text x={p[0]} y={H - 6} textAnchor="middle" fontSize={big ? 10 : 8.5} style={{ fill: 'var(--text-faint)' }}>{log[i].date.replace('. ', '.')}</text>}
          </g>
        );
      })}
    </svg>
  );
}

/* fullscreen expanded chart: last 15 sessions; opens on 'ft-chart-zoom', closes on click/Esc */
function ChartLightbox() {
  const [item, setItem] = React.useState(null);
  React.useEffect(() => {
    const onZoom = (e) => setItem(e.detail);
    const onKey = (e) => { if (e.key === 'Escape') setItem(null); };
    document.addEventListener('ft-chart-zoom', onZoom);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('ft-chart-zoom', onZoom); document.removeEventListener('keydown', onKey); };
  }, []);
  if (!item) return null;
  const full = (window.FT.EX_LOG_FULL[item.name] || []).slice(-10);
  if (!full.length) return null;
  const bw = full[0].bw;
  const vals = full.map((p) => (bw ? p.topReps : p.w));
  const unit = bw ? 'Wdh' : 'kg';
  const first = vals[0], last = vals[vals.length - 1];
  const delta = +(last - first).toFixed(1);
  const peak = Math.max(...vals);
  return (
    <div onClick={() => setItem(null)} style={{
      position: 'absolute', inset: 0, zIndex: 400,
      background: 'rgba(4,5,6,0.86)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20, cursor: 'zoom-out',
    }}>
      <style>{`@keyframes ftZoomIn{from{transform:scale(.94);opacity:0}to{transform:none;opacity:1}}`}</style>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(92%, 360px)', animation: 'ftZoomIn .22s cubic-bezier(.2,.8,.2,1) both', cursor: 'default' }}>
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: item.color }} />
            <span style={{ fontSize: 16, fontWeight: 800 }}>{item.name}</span>
          </div>
          <div className="mono" style={{ fontSize: 11.5, color: 'var(--text-faint)', marginBottom: 12 }}>Letzte {full.length} Einheiten</div>
          <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 14, padding: '8px 4px 2px' }}>
            <ProgressChart log={full} color={item.color} height={170} big />
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            {[['Start', `${first} ${unit}`], ['Aktuell', `${last} ${unit}`], ['Spitze', `${peak} ${unit}`]].map(([k, v]) => (
              <div key={k} style={{ flex: 1, textAlign: 'center', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 6px' }}>
                <div className="mono tnum" style={{ fontSize: 15, fontWeight: 800 }}>{v}</div>
                <div style={{ fontSize: 10.5, color: 'var(--text-faint)', marginTop: 3 }}>{k}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 14, fontSize: 13, color: delta >= 0 ? 'var(--accent)' : 'var(--hot)', fontWeight: 700 }}>
            <Icon name="bolt" size={15} color={delta >= 0 ? 'var(--accent)' : 'var(--hot)'} />
            {delta >= 0 ? '+' : ''}{delta} {unit} über {full.length} Einheiten
          </div>
        </div>
      </div>
      <button onClick={() => setItem(null)} style={{
        marginTop: 18, display: 'inline-flex', alignItems: 'center', gap: 7,
        background: 'var(--surface-2)', border: '1px solid var(--border-2)', color: 'var(--text-dim)',
        borderRadius: 999, padding: '9px 16px', font: 'inherit', fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
      }}>
        <Icon name="close" size={15} />Schließen
      </button>
    </div>
  );
}

/* one exercise: photo + progression chart + latest sets (+ older sets) */
function ExerciseProgressCard({ ex, ai, goKI }) {
  const log = window.FT.EX_LOG[ex.name];
  const [open, setOpen] = React.useState(false);
  const color = window.FT.muscleColor(ex.muscle);
  if (!log || !log.length) {
    return (
      <div className="card" style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <ExerciseDemo name={ex.name} pattern={ex.pattern} img={ex.img} muscle={ex.muscle} size={48} radius={12} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15.5, fontWeight: 700, lineHeight: 1.15 }}>{ex.name}</div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 3 }}>noch keine Einheiten</div>
          </div>
        </div>
        {ex.barTip && <div style={{ marginBottom: 12, marginTop: -4 }}><BarTip tip={ex.barTip} /></div>}
        <div style={{ background: 'var(--bg-2)', border: '1px dashed var(--border-2)', borderRadius: 14, padding: '26px 20px', textAlign: 'center' }}>
          <Icon name="history" size={22} color="var(--text-faint)" />
          <p style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.5, margin: '10px 0 16px', textWrap: 'pretty' }}>
            Zu dieser Übung wurden noch keine Einheiten erfasst.
          </p>
          <button className="btn btn-ghost" onClick={() => document.dispatchEvent(new CustomEvent('ft-manual-open', { detail: { name: ex.name } }))} style={{ margin: '0 auto' }}>
            <Icon name="plus" size={16} />Satz erfassen
          </button>
        </div>
      </div>
    );
  }
  const latest = log[log.length - 1];
  const prev = log.length > 1 ? log[log.length - 2] : null;
  const bw = latest.bw;
  const delta = prev ? (bw ? latest.topReps - prev.topReps : latest.w - prev.w) : 0;
  const unit = bw ? 'Wdh' : 'kg';
  const ki = ai && ai.status === 'ready' && ai.data.byName ? ai.data.byName[ex.name] : null;

  const SetRows = ({ entry }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {entry.sets.map((st, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5 }}>
          <span className="mono" style={{ width: 18, color: 'var(--text-faint)', fontSize: 12 }}>{i + 1}</span>
          {st.wu
            ? <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--warn)', background: 'rgba(var(--warn-rgb),0.16)', borderRadius: 5, padding: '2px 6px' }}>WARM-UP</span>
            : <span style={{ width: 0 }} />}
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <span className="mono tnum" style={{ color: 'var(--text-dim)' }}>
            {st.w > 0 ? `${st.w} kg × ${st.r}` : `${st.r} Wdh`}
          </span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <ExerciseDemo name={ex.name} pattern={ex.pattern} img={ex.img} muscle={ex.muscle} size={48} radius={12} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15.5, fontWeight: 700, lineHeight: 1.15 }}>{ex.name}</div>
          <div className="mono" style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 3 }}>{log.length} Einheiten</div>
        </div>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 12, fontWeight: 800, fontFamily: 'var(--mono)',
          color: delta > 0 ? 'var(--accent)' : (delta < 0 ? 'var(--hot)' : 'var(--text-dim)'),
          background: delta > 0 ? 'var(--accent-dim)' : (delta < 0 ? 'rgba(255,107,87,0.14)' : 'var(--surface-3)'),
          border: delta > 0 ? '1px solid var(--accent-border)' : (delta < 0 ? '1px solid rgba(255,107,87,0.4)' : '1px solid var(--border)'),
          borderRadius: 999, padding: '4px 10px',
        }} title="Differenz zur vorletzten Einheit">{delta > 0 ? `+${+delta.toFixed(1)}` : (delta < 0 ? `${+delta.toFixed(1)}` : '±0')} {unit}</span>
      </div>

      {ex.barTip && <div style={{ marginBottom: 12, marginTop: -4 }}><BarTip tip={ex.barTip} /></div>}

      {/* progression chart — tap to expand to last 10 sessions */}
      <div
        onClick={() => document.dispatchEvent(new CustomEvent('ft-chart-zoom', { detail: { name: ex.name, color } }))}
        title="Antippen für die letzten 10 Einheiten"
        style={{ position: 'relative', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 14, padding: '6px 4px 2px', marginBottom: 14, cursor: 'zoom-in' }}>
        <ProgressChart log={log} color={color} />
        <span style={{ position: 'absolute', top: 8, left: 9, display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 9.5, fontWeight: 600, color: 'var(--text-faint)', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 999, padding: '2px 7px' }}>
          <Icon name="search" size={10} color="var(--text-faint)" />10
        </span>
      </div>

      {/* KI recommendation for this exercise */}
      {ki ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 12px', marginBottom: 14, background: 'var(--accent-surface)', border: '1px solid var(--accent-border)', borderRadius: 12 }}>
          <Icon name="sparkle" size={16} color="var(--accent)" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, lineHeight: 1.4, color: 'var(--text)' }}>{ki.note || 'Empfehlung verfügbar'}</div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <span className="mono tnum" style={{ fontSize: 16, fontWeight: 800, color: 'var(--accent)' }}>{ki.suggest}</span>
            <span style={{ fontSize: 10.5, color: 'var(--text-dim)', marginLeft: 2 }}>{bw ? 'Wdh' : 'kg'}</span>
          </div>
        </div>
      ) : (
        <button onClick={goKI} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', marginBottom: 14, background: 'var(--surface-2)', border: '1px dashed var(--border-2)', borderRadius: 12, cursor: 'pointer', font: 'inherit', color: 'var(--text-faint)' }}>
          <Icon name="sparkle" size={14} color="var(--text-faint)" />
          <span style={{ fontSize: 12.5 }}>Noch keine KI-Empfehlung – unter „KI“ starten</span>
        </button>
      )}

      {/* latest session sets */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)' }}>Letzte Einheit</span>
        <span className="mono" style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>{latest.date}</span>
      </div>
      <SetRows entry={latest} />

      {/* older sessions */}
      {log.length > 1 && (
        <>
          <button onClick={() => setOpen(!open)} style={{
            marginTop: 14, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 0',
            color: 'var(--text-dim)', font: 'inherit', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
          }}>
            {open ? 'Frühere Einheiten ausblenden' : `Frühere Einheiten (${log.length - 1})`}
            <span style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s', display: 'inline-flex' }}><Icon name="chevD" size={14} /></span>
          </button>
          {open && (
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {log.slice(0, -1).reverse().map((entry) => (
                <div key={entry.date}>
                  <div className="mono" style={{ fontSize: 11.5, color: 'var(--text-faint)', marginBottom: 8 }}>{entry.date}</div>
                  <SetRows entry={entry} />
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

const DAY_TITLE = { Brust: 'Brust', Rücken: 'Rücken', Schulter: 'Schulter', Arm: 'Arme', Beine: 'Beine' };

/* Verlauf level 1 — muscle-group cards */
function HistoryScreen({ onOpenDay }) {
  return (
    <div className="ft-scroll">
      <ScreenHeader eyebrow="Nach Muskelgruppe" title="Fortschritt" />
      <div className="ft-pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {window.FT.DAYS.map((d, i) => {
          const m = window.FT.dayMeta(d);
          const color = window.FT.muscleColor(m.colorMuscle);
          return (
            <button key={d} onClick={() => onOpenDay(d)} className="card fade-in" style={{
              animationDelay: `${i * 0.04}s`, width: '100%', textAlign: 'left', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 14, padding: 16, font: 'inherit', color: 'var(--text)',
            }}>
              <span style={{ width: 6, height: 42, borderRadius: 4, background: color, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{DAY_TITLE[d]}</div>
                <div className="mono" style={{ fontSize: 11.5, color: 'var(--text-faint)', marginTop: 3 }}>{m.count} Übungen · zuletzt {m.last}</div>
              </div>
              <Icon name="chevR" size={20} color="var(--text-faint)" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* Verlauf level 2 — exercises of one group with progression */
function DayDetailScreen({ day, ai, onBack, goKI }) {
  const exs = window.FT.EXERCISES.filter((e) => e.day === day);
  const color = window.FT.muscleColor(window.FT.dayMeta(day).colorMuscle);
  return (
    <div className="ft-scroll">
      <div className="ft-top ft-pad" style={{ paddingBottom: 12 }}>
        <button onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-dim)', borderRadius: 999, padding: '8px 14px 8px 10px', font: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 16 }}>
          <Icon name="chevL" size={16} />Fortschritt
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em' }}>{DAY_TITLE[day]}</h1>
        </div>
        <p style={{ fontSize: 13.5, color: 'var(--text-dim)', marginTop: 6 }}>{exs.length} Übungen · Gewicht & Sätze über die letzten Einheiten</p>
      </div>
      <div className="ft-pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {exs.map((ex, i) => (
          <div key={ex.name} className="fade-in" style={{ animationDelay: `${i * 0.04}s` }}>
            <ExerciseProgressCard ex={ex} ai={ai} goKI={goKI} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* session detail */
function DetailScreen({ session, onBack }) {
  const s = session;
  return (
    <div className="ft-scroll">
      <div className="ft-top ft-pad" style={{ paddingBottom: 10 }}>
        <button onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-dim)', borderRadius: 999, padding: '8px 14px 8px 10px', font: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 18 }}>
          <Icon name="chevL" size={16} />Zurück
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <TypePill type={s.type} />
          <IntensityDot level={s.intensity} />
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em' }}>{s.day}, {s.date}</h1>
      </div>

      <div className="ft-pad">
        <div className="card" style={{ display: 'flex', padding: '16px 8px', marginBottom: 22 }}>
          {[['Dauer', `${s.duration}`, 'min'], ['Sätze', `${s.sets}`, ''], ['Volumen', `${(s.volume/1000).toFixed(1)}k`, 'kg'], ['Übungen', `${s.exercises.length}`, '']].map(([k, v, u], i) => (
            <div key={k} style={{ flex: 1, textAlign: 'center', borderLeft: i ? '1px solid var(--border)' : 'none' }}>
              <div className="mono tnum" style={{ fontSize: 21, fontWeight: 700 }}>{v}<span style={{ fontSize: 11, color: 'var(--text-faint)', marginLeft: 2 }}>{u}</span></div>
              <div style={{ fontSize: 11.5, color: 'var(--text-faint)', marginTop: 2 }}>{k}</div>
            </div>
          ))}
        </div>

        <SectionHeader title="Übungen" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {s.exercises.map((ex) => (
            <div key={ex.name} className="card" style={{ padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 12 }}>
                <ExerciseDemo name={ex.name} pattern={window.FT.patternFor(ex.name)} muscle={ex.muscle} size={44} radius={11} />
                <span style={{ fontSize: 16, fontWeight: 700, flex: 1 }}>{ex.name}</span>
                <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>{ex.sets.length} Sätze</span>
              </div>
              {window.FT.barTipFor(ex.name) && <div style={{ marginBottom: 12, marginTop: -2 }}><BarTip tip={window.FT.barTipFor(ex.name)} /></div>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {ex.sets.map((st, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5 }}>
                    <span className="mono" style={{ width: 22, color: 'var(--text-faint)', fontSize: 12 }}>{i + 1}</span>
                    {st.wu
                      ? <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--warn)', background: 'rgba(var(--warn-rgb),0.16)', borderRadius: 5, padding: '2px 6px' }}>WARM-UP</span>
                      : <span style={{ width: 0 }} />}
                    <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                    <span className="mono tnum" style={{ color: 'var(--text-dim)' }}>
                      {st.w > 0 ? `${st.w} kg ×` : ''} {st.r}{st.w > 0 ? '' : (ex.muscle === 'Core' ? ' s' : ' Wdh')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { SessionCard, SessionMiniRow, HistoryScreen, DayDetailScreen, ExerciseProgressCard, ProgressChart, ChartLightbox, DetailScreen, TypePill, Stat });
