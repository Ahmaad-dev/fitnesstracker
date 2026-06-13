/* FitTracker — Satz-Zuordnung (Drag&Drop + Tippen + Auto-Blöcke) */

const _byIdx = (D) => (a, b) => D.findIndex(d => d.id === a) - D.findIndex(d => d.id === b);

// Auto-Variante: Sätze nach Pausen (>100s) bzw. in Blöcken à max. 4 vorgruppieren
function autoGroups(D) {
  const groups = []; let cur = [];
  D.forEach((d) => {
    cur.push(d.id);
    if (d.rest > 100 || cur.length >= 4) { groups.push(cur); cur = []; }
  });
  if (cur.length) groups.push(cur);
  return groups.map((ids, i) => ({ id: 'g' + (i + 1), ex: null, setIds: ids }));
}

function initModel(variant, D) {
  if (variant === 'auto') {
    return { unassigned: [], warmup: D[0] ? { [D[0].id]: true } : {}, groups: autoGroups(D) };
  }
  return { unassigned: D.map(d => d.id), warmup: {}, groups: [{ id: 'g1', ex: null, setIds: [] }] };
}

/* exercise picker sheet content — visual grid grouped by training day */
function ExercisePicker({ onPick }) {
  const [q, setQ] = React.useState('');
  const all = window.FT.EXERCISES.filter(e => e.name.toLowerCase().includes(q.toLowerCase()));
  const days = window.FT.DAYS.filter(d => all.some(e => e.day === d));
  const Tile = ({ e }) => (
    <button key={e.name} onClick={() => onPick(e)} style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '12px 6px 10px', cursor: 'pointer',
      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, font: 'inherit', color: 'var(--text)',
    }}>
      <ExerciseDemo name={e.name} pattern={e.pattern} muscle={e.muscle} size={64} radius={14} zoomable={false} />
      <span style={{ fontSize: 11.5, fontWeight: 650, lineHeight: 1.15, textAlign: 'center' }}>{e.name}</span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--text-faint)' }}>
        <span className="dot" style={{ width: 6, height: 6, borderRadius: '50%', background: window.FT.muscleColor(e.muscle) }} />{e.muscle}
      </span>
    </button>
  );
  return (
    <div>
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}><Icon name="search" size={17} color="var(--text-faint)" /></span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Übung suchen (optional) …" style={{
          width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12,
          padding: '12px 14px 12px 40px', color: 'var(--text)', font: 'inherit', fontSize: 15, outline: 'none',
        }} />
      </div>
      {all.length === 0 && <div style={{ textAlign: 'center', color: 'var(--text-faint)', padding: 24, fontSize: 14 }}>Keine Treffer</div>}
      {days.map((d) => (
        <div key={d} style={{ marginBottom: 18 }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>{window.FT.dayLabel(d)}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            {all.filter(e => e.day === d).map((e) => <Tile key={e.name} e={e} />)}
          </div>
        </div>
      ))}
    </div>
  );
}

function AssignScreen({ variant = 'dnd', session, onSaved, go }) {
  const D = (session && session.sets) || window.FT.DETECTED_SETS;
  const sd = (id) => D.find(d => d.id === id);
  const sidx = (id) => D.findIndex(d => d.id === id) + 1;

  const [model, setModel] = React.useState(() => initModel(variant, D));
  React.useEffect(() => { setModel(initModel(variant, D)); }, [variant, session && session.id]);

  const [sheet, setSheet] = React.useState(null); // {mode:'exercise',groupId} | {mode:'assign',setId}
  const [drag, setDrag] = React.useState(null);    // {setId,x,y}
  const [hover, setHover] = React.useState(null);
  const dragRef = React.useRef(null);
  const [saved, setSaved] = React.useState(false);

  const total = D.length;
  const assignedCount = total - model.unassigned.length;
  const groupsWithSets = model.groups.filter(g => g.setIds.length);
  const canSave = model.unassigned.length === 0 && groupsWithSets.length > 0 && groupsWithSets.every(g => g.ex);

  // ---- model ops ----
  const moveSet = (setId, zone) => setModel((m) => {
    const groups = m.groups.map(g => ({ ...g, setIds: g.setIds.filter(x => x !== setId) }));
    let unassigned = m.unassigned.filter(x => x !== setId);
    if (zone === 'tray') unassigned = [...unassigned, setId].sort(_byIdx(D));
    else { const gi = groups.findIndex(g => g.id === zone); if (gi >= 0) groups[gi] = { ...groups[gi], setIds: [...groups[gi].setIds, setId].sort(_byIdx(D)) }; }
    return { ...m, groups, unassigned };
  });
  const addGroup = () => { const id = 'g' + Date.now(); setModel(m => ({ ...m, groups: [...m.groups, { id, ex: null, setIds: [] }] })); return id; };
  const setEx = (groupId, ex) => setModel(m => ({ ...m, groups: m.groups.map(g => g.id === groupId ? { ...g, ex } : g) }));
  const removeGroup = (groupId) => setModel(m => {
    const g = m.groups.find(x => x.id === groupId);
    const unassigned = [...m.unassigned, ...g.setIds].sort(_byIdx(D));
    return { ...m, unassigned, groups: m.groups.filter(x => x.id !== groupId) };
  });
  const toggleWU = (setId) => setModel(m => ({ ...m, warmup: { ...m.warmup, [setId]: !m.warmup[setId] } }));

  // ---- pointer drag (dnd variant) ----
  const appRect = () => (document.querySelector('.ft-app') || document.body).getBoundingClientRect();
  const zoneAt = (x, y) => {
    const el = document.elementFromPoint(x, y);
    const z = el && el.closest('[data-drop]');
    return z ? z.getAttribute('data-drop') : null;
  };
  const onMove = (e) => {
    const d = dragRef.current; if (!d) return;
    if (!d.started) { if (Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 6) return; d.started = true; }
    const r = appRect(); const sc = r.width / 402;
    setHover(zoneAt(e.clientX, e.clientY));
    setDrag({ setId: d.setId, x: (e.clientX - r.left) / sc, y: (e.clientY - r.top) / sc });
  };
  const onUp = (e) => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    const d = dragRef.current; dragRef.current = null;
    if (d && d.started) { const z = zoneAt(e.clientX, e.clientY); if (z && z !== d.from) moveSet(d.setId, z); }
    setDrag(null); setHover(null);
  };
  const dndOn = variant === 'dnd' || variant === 'auto';
  const startDrag = (e, setId, from) => {
    if (!dndOn) return;
    dragRef.current = { setId, from, sx: e.clientX, sy: e.clientY, started: false };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  // ---- tap / auto handlers ----
  const onSetTap = (setId) => {
    if (variant === 'tap') setSheet({ mode: 'assign', setId });
  };
  const pickFromSheet = (ex) => {
    if (sheet.mode === 'exercise') setEx(sheet.groupId, ex);
    setSheet(null);
  };
  const assignSetToGroup = (setId, groupId) => { moveSet(setId, groupId); setSheet(null); };
  const assignSetNewGroup = (setId) => { const id = addGroup(); moveSet(setId, id); setSheet({ mode: 'exercise', groupId: id }); };

  const doSave = () => {
    setSaved(true);
    const assignData = { day: session && session.dayGuess, groups: model.groups, warmup: model.warmup };
    setTimeout(() => onSaved && onSaved(session ? session.id : null, assignData), 1400);
  };

  // ============ render helpers ============
  const SetGlyph = ({ id, inGroup, from }) => {
    const d = sd(id); const wu = model.warmup[id]; const isDragging = drag && drag.setId === id;
    return (
      <div
        onPointerDown={(e) => startDrag(e, id, from)}
        onClick={() => onSetTap(id)}
        style={{
          display: 'flex', alignItems: 'center', gap: 9, padding: '9px 11px',
          background: wu ? 'linear-gradient(rgba(var(--warn-rgb),0.12),rgba(var(--warn-rgb),0.12)), var(--surface-2)' : 'var(--surface-2)',
          border: `1px solid ${wu ? 'rgba(var(--warn-rgb),0.40)' : 'var(--border-2)'}`,
          borderRadius: 12, cursor: dndOn ? 'grab' : 'pointer',
          touchAction: dndOn ? 'none' : 'auto',
          opacity: isDragging ? 0.3 : 1, userSelect: 'none',
        }}>
        {dndOn && <Icon name="grip" size={16} color="var(--text-faint)" />}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
            Satz {sidx(id)}
            {wu && <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--warn)', letterSpacing: '0.04em' }}>WARM-UP</span>}
          </div>
          <div className="mono" style={{ fontSize: 10.5, color: 'var(--text-faint)' }}>{d.reps} Wdh · {d.w} kg</div>
        </div>
        {inGroup && (
          <button onClick={(e) => { e.stopPropagation(); toggleWU(id); }} onPointerDown={(e) => e.stopPropagation()} title="Warm-up markieren" style={{
            width: 28, height: 28, borderRadius: 8, border: '1px solid var(--border)', cursor: 'pointer', flexShrink: 0,
            background: wu ? 'var(--warn)' : 'var(--surface-3)', display: 'grid', placeItems: 'center',
          }}>
            <Icon name="flame" size={14} color={wu ? '#1a1206' : 'var(--text-faint)'} />
          </button>
        )}
      </div>
    );
  };

  const GroupCard = ({ g }) => {
    const isHover = hover === g.id;
    return (
      <div data-drop={g.id} style={{
        background: 'var(--surface)', borderRadius: 'var(--r-lg)', padding: 14,
        border: `1.5px ${isHover ? 'dashed' : 'solid'} ${isHover ? 'var(--accent)' : 'var(--border)'}`,
        transition: 'border-color .12s, background .12s', boxShadow: 'var(--shadow-card)',
        ...(isHover ? { background: 'linear-gradient(rgba(var(--accent-rgb),0.09),rgba(var(--accent-rgb),0.09)), var(--surface)' } : {}),
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: g.setIds.length || variant !== 'auto' ? 12 : 0 }}>
          <button onClick={() => setSheet({ mode: 'exercise', groupId: g.id })} style={{
            flex: 1, display: 'flex', alignItems: 'center', gap: 11, padding: g.ex ? '6px 8px' : '8px 10px', cursor: 'pointer', textAlign: 'left',
            background: g.ex ? 'transparent' : 'var(--surface-2)', border: g.ex ? 'none' : '1px dashed var(--border-2)',
            borderRadius: 12, font: 'inherit', color: 'var(--text)',
          }}>
            {g.ex
              ? <><ExerciseDemo name={g.ex.name} pattern={g.ex.pattern} muscle={g.ex.muscle} size={46} radius={11} zoomable={false} />
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontSize: 15.5, fontWeight: 700 }}>{g.ex.name}</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-faint)' }}>
                      <span className="dot" style={{ width: 6, height: 6, borderRadius: '50%', background: window.FT.muscleColor(g.ex.muscle) }} />{g.ex.muscle} · ändern
                    </span>
                  </span></>
              : <><span style={{ width: 46, height: 46, borderRadius: 11, background: 'var(--surface-3)', display: 'grid', placeItems: 'center', flexShrink: 0 }}><Icon name="dumbbell" size={20} color="var(--accent)" /></span>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontSize: 14.5, fontWeight: 700 }}>Übung wählen</span>
                    <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>Bewegung antippen</span>
                  </span></>}
          </button>
          <span className="mono tnum" style={{ fontSize: 12, color: 'var(--text-faint)', flexShrink: 0 }}>{g.setIds.length} Sätze</span>
          {(variant !== 'auto' || g.setIds.length === 0) && (
            <button onClick={() => removeGroup(g.id)} title="Block entfernen" style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'grid', placeItems: 'center', cursor: 'pointer', flexShrink: 0 }}>
              <Icon name="close" size={14} color="var(--text-faint)" />
            </button>
          )}
        </div>

        {g.setIds.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {g.setIds.map((id) => <SetGlyph key={id} id={id} inGroup from={g.id} />)}
          </div>
        ) : dndOn ? (
          <div style={{ padding: '14px 0', textAlign: 'center', fontSize: 12.5, color: isHover ? 'var(--accent)' : 'var(--text-faint)', border: '1px dashed var(--border)', borderRadius: 12 }}>
            {isHover ? 'Hier loslassen' : 'Sätze hierher ziehen'}
          </div>
        ) : null}
      </div>
    );
  };

  // ============ saved overlay ============
  if (saved) {
    return (
      <div className="ft-scroll" style={{ display: 'grid', placeItems: 'center' }}>
        <div className="fade-in" style={{ textAlign: 'center', padding: 30 }}>
          <div style={{ width: 92, height: 92, borderRadius: 30, background: 'var(--accent)', display: 'grid', placeItems: 'center', margin: '0 auto 22px', boxShadow: '0 0 50px rgba(var(--accent-rgb),0.40)' }}>
            <Icon name="check" size={46} color="var(--accent-ink)" stroke={2.8} />
          </div>
          <h2 style={{ fontSize: 23, fontWeight: 800 }}>Einheit gespeichert</h2>
          <p style={{ fontSize: 14, color: 'var(--text-dim)', marginTop: 8 }}>{groupsWithSets.length} Übungen · {assignedCount} Sätze</p>
        </div>
      </div>
    );
  }

  const hint = { dnd: 'Ziehe jeden Satz in die passende Übung.', tap: 'Tippe einen Satz, um ihn einer Übung zuzuordnen.', auto: 'Sätze nach Pausen vorgruppiert. Benenne jede Übung – und ziehe Sätze bei Bedarf zwischen den Blöcken.' }[variant];

  return (
    <div className="ft-scroll">
      <div className="ft-top ft-pad" style={{ paddingBottom: 8 }}>
        <button onClick={() => go('sync')} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-dim)', borderRadius: 999, padding: '7px 13px 7px 9px', font: 'inherit', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', marginBottom: 16 }}>
          <Icon name="chevL" size={15} />Sync
        </button>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em' }}>Sätze zuordnen</h1>
        {session && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, marginTop: 8, fontSize: 12.5, color: 'var(--text-dim)', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 999, padding: '4px 11px' }}>
            <Icon name="watch" size={13} color="var(--accent)" />{session.weekday} · {session.date}
          </div>
        )}
        <p style={{ fontSize: 13.5, color: 'var(--text-dim)', marginTop: session ? 10 : 6 }}>{hint}</p>
      </div>

      {/* progress */}
      <div className="ft-pad" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, height: 6, borderRadius: 999, background: 'var(--surface-3)', overflow: 'hidden' }}>
            <div style={{ width: `${(assignedCount / total) * 100}%`, height: '100%', background: 'var(--accent)', borderRadius: 999, transition: 'width .3s' }} />
          </div>
          <span className="mono tnum" style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>{assignedCount}/{total} zugeordnet</span>
        </div>
      </div>

      {/* tray of unassigned sets (dnd + tap) */}
      {variant !== 'auto' && (
        <div className="ft-pad" style={{ marginBottom: 18 }}>
          <div data-drop="tray" style={{
            background: hover === 'tray' ? 'linear-gradient(rgba(var(--accent-rgb),0.09),rgba(var(--accent-rgb),0.09)), var(--bg-2)' : 'var(--bg-2)',
            border: `1px ${hover === 'tray' ? 'dashed var(--accent)' : 'solid var(--border)'}`, borderRadius: 'var(--r-lg)', padding: 13,
          }}>
            <div className="eyebrow" style={{ marginBottom: 11 }}>Erkannte Sätze · {model.unassigned.length}</div>
            {model.unassigned.length ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {model.unassigned.map((id) => <SetGlyph key={id} id={id} from="tray" />)}
              </div>
            ) : (
              <div style={{ padding: '10px 0', textAlign: 'center', fontSize: 13, color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                <Icon name="check" size={16} />Alle Sätze zugeordnet
              </div>
            )}
          </div>
        </div>
      )}

      {/* groups */}
      <div className="ft-pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <SectionHeader title="Übungen" />
        {model.groups.map((g) => <GroupCard key={g.id} g={g} />)}

        {variant !== 'auto' ? (
          <button onClick={addGroup} className="btn btn-ghost btn-block" style={{ borderStyle: 'dashed' }}>
            <Icon name="plus" size={18} />Übung hinzufügen
          </button>
        ) : (
          <button onClick={addGroup} className="btn btn-ghost btn-block" style={{ borderStyle: 'dashed' }}>
            <Icon name="plus" size={18} />Block hinzufügen
          </button>
        )}

        <button className="btn btn-primary btn-block" disabled={!canSave} onClick={doSave} style={{ marginTop: 8, opacity: canSave ? 1 : 0.4, cursor: canSave ? 'pointer' : 'not-allowed' }}>
          <Icon name="check" size={18} />Einheit speichern
        </button>
        {!canSave && <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-faint)', marginTop: -2 }}>
          {model.unassigned.length ? 'Ordne alle Sätze zu' : 'Wähle für jede Übung einen Namen'}
        </p>}
      </div>

      {/* drag clone */}
      {drag && (() => {
        const r = appRect(); const sc = r.width / 402; const d = sd(drag.setId);
        return (
          <div style={{
            position: 'fixed', left: r.left + drag.x * sc, top: r.top + drag.y * sc,
            transform: `translate(-50%,-50%) scale(${sc})`, transformOrigin: 'center', zIndex: 999, pointerEvents: 'none',
            background: 'var(--surface-3)', border: '1.5px solid var(--accent)', borderRadius: 12, padding: '9px 13px',
            boxShadow: '0 12px 30px rgba(0,0,0,0.5)', minWidth: 130,
          }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>Satz {sidx(drag.setId)}</div>
            <div className="mono" style={{ fontSize: 10.5, color: 'var(--text-faint)' }}>{d.reps} Wdh · {d.w} kg</div>
          </div>
        );
      })()}

      {/* sheets */}
      <Sheet open={sheet && sheet.mode === 'exercise'} onClose={() => setSheet(null)} title="Übung wählen">
        <ExercisePicker onPick={pickFromSheet} />
      </Sheet>

      <Sheet open={sheet && sheet.mode === 'assign'} onClose={() => setSheet(null)} title={sheet ? `Satz ${sidx(sheet.setId)} zuordnen` : ''}>
        {sheet && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 6 }}>
            {model.groups.filter(g => g.ex).map((g) => (
              <button key={g.id} onClick={() => assignSetToGroup(sheet.setId, g.id)} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 12px', cursor: 'pointer', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, font: 'inherit', color: 'var(--text)', textAlign: 'left' }}>
                <ExerciseDemo name={g.ex.name} pattern={g.ex.pattern} muscle={g.ex.muscle} size={40} radius={10} zoomable={false} />
                <span style={{ flex: 1, fontSize: 15, fontWeight: 600 }}>{g.ex.name}</span>
                <span className="mono tnum" style={{ fontSize: 12, color: 'var(--text-faint)' }}>{g.setIds.length} Sätze</span>
              </button>
            ))}
            <button onClick={() => assignSetNewGroup(sheet.setId)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 14px', cursor: 'pointer', background: 'var(--accent-dim)', border: '1px solid var(--accent-border)', borderRadius: 12, font: 'inherit', color: 'var(--accent)', fontWeight: 700 }}>
              <Icon name="plus" size={17} />Neue Übung
            </button>
          </div>
        )}
      </Sheet>
    </div>
  );
}

Object.assign(window, { AssignScreen, ExercisePicker });
