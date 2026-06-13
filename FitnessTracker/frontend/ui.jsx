/* FitTracker — shared UI primitives */

function MuscleTag({ muscle, subtle }) {
  const c = window.FT.muscleColor(muscle);
  return (
    <span className="tag" style={subtle ? {} : { color: 'var(--text)' }}>
      <span className="dot" style={{ background: c }} />{muscle}
    </span>
  );
}

function IntensityDot({ level }) {
  const map = { Hoch: 'var(--hot)', Mittel: 'var(--warn)', Locker: 'var(--accent)' };
  return (
    <span className="tag">
      <span className="dot" style={{ background: map[level] || 'var(--text-dim)' }} />{level}
    </span>
  );
}

function SectionHeader({ title, action, onAction }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '0 0 12px' }}>
      <h2 style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-0.01em' }}>{title}</h2>
      {action && (
        <button onClick={onAction} style={{
          background: 'none', border: 'none', color: 'var(--accent)', font: 'inherit',
          fontWeight: 600, fontSize: 14, cursor: 'pointer', padding: 4, marginRight: -4,
        }}>{action}</button>
      )}
    </div>
  );
}

/* big screen header with eyebrow + title (clears status bar) */
function ScreenHeader({ eyebrow, title, right }) {
  return (
    <div className="ft-top ft-pad" style={{ paddingBottom: 14, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
      <div>
        {eyebrow && <div className="eyebrow" style={{ marginBottom: 6 }}>{eyebrow}</div>}
        <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.05 }}>{title}</h1>
      </div>
      {right}
    </div>
  );
}

/* readiness / recovery bar */
function RecoveryBar({ muscle, ready, days, showLabel = true }) {
  const c = window.FT.muscleColor(muscle);
  const fresh = ready >= 85;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      {showLabel && (
        <div style={{ width: 78, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 7 }}>
          <span className="dot" style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />
          <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>{muscle}</span>
        </div>
      )}
      <div style={{ flex: 1, height: 8, borderRadius: 999, background: 'var(--surface-3)', overflow: 'hidden' }}>
        <div style={{ width: `${ready}%`, height: '100%', borderRadius: 999, background: c, opacity: fresh ? 1 : 0.55, transition: 'width .6s cubic-bezier(.2,.7,.3,1)' }} />
      </div>
      <div className="mono tnum" style={{ width: 58, textAlign: 'right', fontSize: 12, color: fresh ? 'var(--accent)' : 'var(--text-faint)' }}>
        {fresh ? 'bereit' : `${days}T`}
      </div>
    </div>
  );
}

/* bottom sheet modal */
function Sheet({ open, onClose, title, children, maxH = '78%' }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{
      position: 'absolute', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)',
      display: 'flex', alignItems: 'flex-end',
    }}>
      <style>{`@keyframes sheetUp{from{transform:translateY(16px)}to{transform:none}}`}</style>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: '100%', maxHeight: maxH, background: 'var(--bg-2)',
        borderTopLeftRadius: 26, borderTopRightRadius: 26,
        border: '1px solid var(--border)', borderBottom: 'none',
        padding: '10px 20px calc(20px + env(safe-area-inset-bottom))',
        display: 'flex', flexDirection: 'column',
        animation: 'sheetUp .3s cubic-bezier(.2,.8,.2,1) both',
        boxShadow: '0 -20px 60px rgba(0,0,0,0.5)',
      }}>
        <div style={{ width: 38, height: 5, borderRadius: 999, background: 'var(--surface-3)', margin: '4px auto 14px' }} />
        {title && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700 }}>{title}</h3>
            <button onClick={onClose} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 999, width: 32, height: 32, display: 'grid', placeItems: 'center', cursor: 'pointer', color: 'var(--text-dim)' }}>
              <Icon name="close" size={16} />
            </button>
          </div>
        )}
        <div style={{ overflowY: 'auto', minHeight: 0 }}>{children}</div>
      </div>
    </div>
  );
}

/* tiny elegant hint for bar-loaded exercises: count the bar or not */
function BarTip({ tip, style = {} }) {
  if (!tip) return null;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 11, fontWeight: 500, color: 'var(--text-faint)',
      background: 'var(--surface-2)', border: '1px solid var(--border)',
      borderRadius: 999, padding: '3px 9px 3px 7px', lineHeight: 1.25, whiteSpace: 'nowrap',
      ...style,
    }}>
      <Icon name="info" size={11} color="var(--text-faint)" />{tip}
    </span>
  );
}

Object.assign(window, { MuscleTag, IntensityDot, SectionHeader, ScreenHeader, RecoveryBar, Sheet, BarTip });
