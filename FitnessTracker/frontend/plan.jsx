/* FitTracker — Bausteine für den Trainingsmodus „4er-Plan" (Oberkörper/Unterkörper)
   • ProgressHint   – Badge „Gewicht erhöhen / halten / senken" aus FT.progress()
   • PlanTargetLine – Plan-Ziel (Sätze × Wdh), nächstes Gewicht und Begründung für eine Übung
   • PlanTodayCard  – Dashboard-Karte: heute fälliger Plan-Tag mit allen Übungen */

const HINT_STYLE = {
  up:   { label: 'Gewicht erhöhen', color: 'var(--accent)', bg: 'var(--accent-dim)', border: 'var(--accent-border)' },
  down: { label: 'Gewicht senken',  color: 'var(--hot)',    bg: 'rgba(255,107,87,0.14)', border: 'rgba(255,107,87,0.4)' },
  hold: { label: 'Halten',          color: 'var(--text-dim)', bg: 'var(--surface-3)', border: 'var(--border)' },
  new:  { label: 'Start',           color: 'var(--text-dim)', bg: 'var(--surface-3)', border: 'var(--border)' },
};

const fmtNum = (v) => String(+(+v).toFixed(2)).replace('.', ',');
const planTarget = (it) => (it.reps ? `${it.sets} × ${it.reps[0]}–${it.reps[1]}` : `${it.sets} × max`);

function ProgressHint({ pr }) {
  if (!pr) return null;
  const st = HINT_STYLE[pr.status] || HINT_STYLE.hold;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0,
      fontSize: 11, fontWeight: 800, color: st.color, background: st.bg, border: `1px solid ${st.border}`,
      borderRadius: 999, padding: '3px 8px', whiteSpace: 'nowrap',
    }}>
      {pr.status === 'up' && <Icon name="bolt" size={11} color={st.color} />}
      {st.label}
    </span>
  );
}

/* Zeile unter dem Übungsnamen im Fortschritt: Plan-Ziel + nächstes Gewicht + Regel-Begründung */
function PlanTargetLine({ name, day }) {
  const pr = window.FT.progress(name, day);
  if (!pr) return null;
  const it = pr.item;
  return (
    <div style={{ padding: '11px 12px', marginBottom: 14, background: pr.status === 'up' ? 'var(--accent-surface)' : 'var(--surface-2)', border: `1px solid ${pr.status === 'up' ? 'var(--accent-border)' : 'var(--border)'}`, borderRadius: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Icon name="target" size={16} color={pr.status === 'up' ? 'var(--accent)' : 'var(--text-faint)'} style={{ flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700 }}>
            Plan: {planTarget(it)}{window.FT.planDaysOf(name).length > 1 ? ` · ${window.FT.planDaysOf(name).join(' & ')}` : ` · ${it.day}`}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 2, lineHeight: 1.4 }}>{pr.text}</div>
        </div>
        {pr.next != null && (
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <span className="mono tnum" style={{ fontSize: 16, fontWeight: 800, color: pr.status === 'up' ? 'var(--accent)' : 'var(--text)' }}>{fmtNum(pr.next)}</span>
            <span style={{ fontSize: 10.5, color: 'var(--text-dim)', marginLeft: 2 }}>{pr.unit}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* Dashboard: heute fälliger Plan-Tag mit Ziel, nächstem Gewicht und Steigerungs-Hinweis je Übung */
function PlanTodayCard({ onOpenDay }) {
  const FT = window.FT;
  const due = FT.nextDay();
  const items = FT.PLAN.items[due] || [];
  const ups = items.filter((it) => (FT.progress(it.name, due) || {}).status === 'up').length;
  const rotation = FT.PLAN.days;
  return (
    <div className="card fade-in" style={{ padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span className="eyebrow">Heute laut Plan</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {rotation.map((d) => (
            <span key={d} className="mono" style={{
              fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 6,
              background: d === due ? 'var(--accent)' : 'var(--surface-3)', color: d === due ? 'var(--accent-ink)' : 'var(--text-faint)',
            }}>{d}</span>
          ))}
        </div>
      </div>
      <h2 style={{ fontSize: 21, fontWeight: 800, letterSpacing: '-0.02em' }}>{FT.dayLabel(due)}</h2>
      <p style={{ fontSize: 12.5, color: 'var(--text-dim)', margin: '3px 0 12px' }}>
        {FT.PLAN.focus[due]} · {items.length} Übungen{ups ? ` · ${ups}× Gewicht erhöhen` : ''}
      </p>
      <div style={{ background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--border)', padding: '2px 12px' }}>
        {items.map((it, i) => {
          const pr = FT.progress(it.name, due);
          const prevSs = i > 0 && items[i - 1].ss && items[i - 1].ss === it.ss;
          const nextSs = i < items.length - 1 && it.ss && items[i + 1].ss === it.ss;
          return (
            <div key={it.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: i === items.length - 1 ? 'none' : '1px solid var(--border)' }}>
              <span title={it.ss ? 'Supersatz: direkt nacheinander, dann Pause' : ''} style={{
                width: 4, alignSelf: 'stretch', borderRadius: 3, flexShrink: 0,
                background: it.ss ? 'var(--accent)' : 'transparent', opacity: it.ss ? 0.7 : 0,
                marginTop: prevSs ? -10 : 0, marginBottom: nextSs ? -10 : 0,
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, lineHeight: 1.2 }}>{it.name}</div>
                <div className="mono" style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>
                  {planTarget(it)}{it.ss ? ' · Supersatz' : ''}
                </div>
              </div>
              {pr && pr.next != null && (
                <span className="mono tnum" style={{ fontSize: 15, fontWeight: 800, flexShrink: 0 }}>
                  {fmtNum(pr.next)}<span style={{ fontSize: 10.5, color: 'var(--text-faint)', fontWeight: 600, marginLeft: 2 }}>{pr.unit}</span>
                </span>
              )}
              <ProgressHint pr={pr} />
            </div>
          );
        })}
      </div>
      <p style={{ fontSize: 11.5, color: 'var(--text-faint)', lineHeight: 1.45, margin: '10px 2px 0' }}>
        Regel: Schaffst du in allen Sätzen das obere Ende des Bereichs, nächstes Mal Gewicht erhöhen. 1–2 Wdh vor dem Versagen aufhören (Isolation 0–1).
      </p>
      {onOpenDay && (
        <button className="btn btn-ghost btn-block" style={{ marginTop: 12 }} onClick={() => onOpenDay(due)}>
          Verlauf dieser Einheit<Icon name="arrowR" size={17} />
        </button>
      )}
    </div>
  );
}

Object.assign(window, { ProgressHint, PlanTargetLine, PlanTodayCard });
