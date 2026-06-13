/* FitTracker — manuelles Logging (Nebenfeature, ohne Uhr/Sync)
   Öffnet als Bottom-Sheet via CustomEvent('ft-manual-open', {detail:{name?}}).
   Speichert über FT.addManualSet → hängt einen „Heute"-Punkt an die Verläufe an. */

function MLStepper({ label, unit, value, setValue, step, min }) {
  const Btn = ({ d, children }) => (
    <button onClick={() => setValue(Math.max(min, +(value + d).toFixed(2)))} style={{
      width: 46, height: 46, flexShrink: 0, borderRadius: 14, cursor: 'pointer',
      background: 'var(--surface-2)', border: '1px solid var(--border-2)', color: 'var(--text)',
      font: 'inherit', display: 'grid', placeItems: 'center',
    }}>{children}</button>
  );
  const isBw = unit === 'kg' && value === 0;
  return (
    <div>
      <div style={{ fontSize: 12.5, color: 'var(--text-faint)', marginBottom: 8, fontWeight: 600 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Btn d={-step}><Icon name="chevD" size={18} /></Btn>
        <div style={{ flex: 1, textAlign: 'center', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 14, padding: '9px 6px' }}>
          {isBw ? (
            <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-dim)' }}>Körpergewicht</span>
          ) : (
            <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 5 }}>
              <span className="mono tnum" style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.02em' }}>{value}</span>
              <span style={{ fontSize: 14, color: 'var(--text-faint)', fontWeight: 600 }}>{unit}</span>
            </span>
          )}
        </div>
        <Btn d={step}><span style={{ transform: 'rotate(180deg)', display: 'grid' }}><Icon name="chevD" size={18} /></span></Btn>
      </div>
    </div>
  );
}

function ManualLogSheet({ onChanged }) {
  const [open, setOpen] = React.useState(false);
  const [ex, setEx] = React.useState(null);
  const [w, setW] = React.useState(20);
  const [reps, setReps] = React.useState(10);
  const [saved, setSaved] = React.useState(null); // {name, w, reps, bw}

  const reset = () => { setEx(null); setSaved(null); };

  const pick = React.useCallback((name) => {
    const lw = window.FT.lastWeight(name);
    const lr = window.FT.lastReps(name);
    const e = window.FT.EXERCISES.find((x) => x.name === name) || { name };
    setEx(e);
    setW(lw != null ? lw : 20);
    setReps((lr != null && lr) || (window.FT.EX_LOG[name] || [{}]).slice(-1)[0].topReps || 10);
    setSaved(null);
  }, []);

  React.useEffect(() => {
    const onOpen = (e) => {
      reset();
      setOpen(true);
      const name = e.detail && e.detail.name;
      if (name) pick(name); else { setW(20); setReps(10); }
    };
    document.addEventListener('ft-manual-open', onOpen);
    return () => document.removeEventListener('ft-manual-open', onOpen);
  }, [pick]);

  const close = () => { setOpen(false); };

  const save = () => {
    if (!ex) return;
    window.FT.addManualSet(ex.name, w, reps);
    const bw = (window.FT.EX_LOG[ex.name] || [{}])[0].bw;
    setSaved({ name: ex.name, w, reps, bw });
    setEx(null);
    if (onChanged) onChanged();
  };

  const bwSel = ex ? (window.FT.EX_LOG[ex.name] || [{}])[0].bw : false;

  return (
    <Sheet open={open} onClose={close} title="Satz manuell erfassen">
      {/* success state */}
      {saved && (
        <div className="fade-in" style={{ textAlign: 'center', padding: '6px 0 4px' }}>
          <div style={{ width: 62, height: 62, borderRadius: '50%', background: 'var(--accent-dim)', border: '1px solid var(--accent-border)', display: 'grid', placeItems: 'center', margin: '0 auto 14px' }}>
            <Icon name="check" size={30} color="var(--accent)" />
          </div>
          <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 4 }}>Gespeichert</div>
          <div className="mono" style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 4 }}>{saved.name}</div>
          <div className="mono tnum" style={{ fontSize: 14, color: 'var(--text)', marginBottom: 20 }}>
            {saved.bw || !saved.w ? `${saved.reps} Wdh` : `${saved.w} kg × ${saved.reps}`}
          </div>
          <p style={{ fontSize: 12.5, color: 'var(--text-faint)', lineHeight: 1.5, marginBottom: 18 }}>
            Im Verlauf taucht der Satz als heutiger Punkt auf.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setSaved(null)}><Icon name="plus" size={17} />Weiteren</button>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={close}>Fertig</button>
          </div>
        </div>
      )}

      {/* pick exercise */}
      {!saved && !ex && (
        <div>
          <p style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.5, marginBottom: 16 }}>
            Kein Sync zur Hand? Erfasse einen Satz direkt — wähle die Übung.
          </p>
          <ExercisePicker onPick={(e) => pick(e.name)} />
        </div>
      )}

      {/* enter weight + reps */}
      {!saved && ex && (
        <div className="fade-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <ExerciseDemo name={ex.name} pattern={ex.pattern} muscle={ex.muscle} size={48} radius={12} zoomable={false} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15.5, fontWeight: 700, lineHeight: 1.15 }}>{ex.name}</div>
              <button onClick={() => setEx(null)} style={{ background: 'none', border: 'none', color: 'var(--accent)', font: 'inherit', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', padding: '3px 0 0' }}>Übung ändern</button>
            </div>
          </div>
          {ex.barTip && <div style={{ marginBottom: 16 }}><BarTip tip={ex.barTip} /></div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginBottom: 22 }}>
            {!bwSel && <MLStepper label="Gewicht" unit="kg" value={w} setValue={setW} step={2.5} min={0} />}
            <MLStepper label="Wiederholungen" unit="Wdh" value={reps} setValue={setReps} step={1} min={1} />
          </div>
          <button className="btn btn-primary btn-block" onClick={save}><Icon name="check" size={18} />Satz speichern</button>
        </div>
      )}
    </Sheet>
  );
}

/* quiet, low-emphasis entry point — opens the manual log sheet */
function ManualLogLink({ style = {} }) {
  return (
    <button onClick={() => document.dispatchEvent(new CustomEvent('ft-manual-open'))} style={{
      display: 'inline-flex', alignItems: 'center', gap: 7, margin: '0 auto', cursor: 'pointer',
      background: 'none', border: 'none', color: 'var(--text-faint)', font: 'inherit', fontSize: 13, fontWeight: 600,
      padding: '6px 10px', ...style,
    }}>
      <Icon name="plus" size={14} color="var(--text-faint)" />Satz manuell erfassen
    </button>
  );
}

Object.assign(window, { ManualLogSheet, ManualLogLink });
