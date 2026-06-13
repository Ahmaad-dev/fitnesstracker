/* FitTracker — animierte Übungs-Demos ("GIFs" als CSS/SVG-Loops)
   Original, leichtgewichtig, erkennbar an der Bewegung statt am Namen. */

(function injectStyle() {
  if (document.getElementById('ft-demo-style')) return;
  const s = document.createElement('style');
  s.id = 'ft-demo-style';
  s.textContent = `
    .ft-demo { display:block; }
    .ft-demo svg { width:100%; height:100%; display:block; overflow:visible; }
    .ft-demo .body { stroke: var(--demo-body, #aeb4c0); stroke-width:5; stroke-linecap:round; stroke-linejoin:round; fill:none; }
    .ft-demo .limb { stroke: var(--demo-body, #aeb4c0); stroke-width:4.2; stroke-linecap:round; stroke-linejoin:round; fill:none; }
    .ft-demo .bar  { stroke: var(--accent); stroke-width:4.5; stroke-linecap:round; fill:none; }
    .ft-demo .wt   { fill: var(--accent); }
    .ft-demo .app  { stroke: var(--surface-3, #23272f); stroke-width:5; stroke-linecap:round; fill:none; }
    .ft-demo .head { fill: var(--demo-body, #aeb4c0); }
    .ft-demo g.anim { transform-box: view-box; }
    @media (prefers-reduced-motion: no-preference) {
      .ft-demo.play .pressV { animation: ftPressV 1.9s ease-in-out infinite; }
      .ft-demo.play .pullV  { animation: ftPullV  1.9s ease-in-out infinite; }
      .ft-demo.play .curl   { animation: ftCurl   1.7s ease-in-out infinite; }
      .ft-demo.play .raise  { animation: ftRaise  1.9s ease-in-out infinite; }
      .ft-demo.play .push   { animation: ftPush   1.7s ease-in-out infinite; }
      .ft-demo.play .hinge  { animation: ftHinge  2.2s ease-in-out infinite; }
      .ft-demo.play .squat  { animation: ftSquat  2.0s ease-in-out infinite; }
      .ft-demo.play .row    { animation: ftRow    1.7s ease-in-out infinite; }
      .ft-demo.play .legp   { animation: ftLegp   1.9s ease-in-out infinite; }
      .ft-demo.play .dips   { animation: ftDips   1.9s ease-in-out infinite; }
      .ft-demo.play .plank  { animation: ftPlank  2.6s ease-in-out infinite; }
    }
    @keyframes ftPressV { 0%,100%{transform:translateY(11px)} 50%{transform:translateY(0)} }
    @keyframes ftPullV  { 0%,100%{transform:translateY(0)}    50%{transform:translateY(12px)} }
    @keyframes ftCurl   { 0%,100%{transform:rotate(0deg)}     50%{transform:rotate(-118deg)} }
    @keyframes ftRaise  { 0%,100%{transform:rotate(0deg)}     50%{transform:rotate(-78deg)} }
    @keyframes ftPush   { 0%,100%{transform:rotate(-70deg)}   50%{transform:rotate(0deg)} }
    @keyframes ftHinge  { 0%,100%{transform:rotate(0deg)}     50%{transform:rotate(46deg)} }
    @keyframes ftSquat  { 0%,100%{transform:translateY(0)}    50%{transform:translateY(10px)} }
    @keyframes ftRow    { 0%,100%{transform:translateX(0)}    50%{transform:translateX(-9px)} }
    @keyframes ftLegp   { 0%,100%{transform:translateX(0)}    50%{transform:translateX(11px)} }
    @keyframes ftDips   { 0%,100%{transform:translateY(0)}    50%{transform:translateY(8px)} }
    @keyframes ftPlank  { 0%,100%{transform:translateY(0)}    50%{transform:translateY(-1.6px)} }
  `;
  document.head.appendChild(s);
})();

/* each scene draws into a 80x80 viewBox */
function DemoScene({ pattern }) {
  const O = (x, y) => ({ transformOrigin: `${x}px ${y}px` });
  switch (pattern) {
    case 'bench': return (
      <svg viewBox="0 0 80 80">
        <line className="app" x1="16" y1="58" x2="64" y2="58" />
        <circle className="head" cx="22" cy="50" r="5.5" />
        <line className="body" x1="27" y1="52" x2="50" y2="52" />
        <path className="limb" d="M50 52 L57 58 L57 50" />
        <g className="anim pressV">
          <line className="limb" x1="42" y1="52" x2="42" y2="34" />
          <line className="limb" x1="36" y1="52" x2="36" y2="34" />
          <line className="bar" x1="30" y1="32" x2="48" y2="32" />
          <circle className="wt" cx="30" cy="32" r="3.6" /><circle className="wt" cx="48" cy="32" r="3.6" />
        </g>
      </svg>
    );
    case 'overhead': return (
      <svg viewBox="0 0 80 80">
        <circle className="head" cx="40" cy="20" r="6" />
        <line className="body" x1="40" y1="26" x2="40" y2="50" />
        <path className="limb" d="M40 50 L33 64 L33 72" /><path className="limb" d="M40 50 L47 64 L47 72" />
        <g className="anim pressV">
          <line className="limb" x1="34" y1="28" x2="34" y2="14" /><line className="limb" x1="46" y1="28" x2="46" y2="14" />
          <line className="bar" x1="26" y1="12" x2="54" y2="12" />
          <circle className="wt" cx="26" cy="12" r="4" /><circle className="wt" cx="54" cy="12" r="4" />
        </g>
      </svg>
    );
    case 'pulldown': return (
      <svg viewBox="0 0 80 80">
        <circle className="head" cx="40" cy="30" r="6" />
        <line className="body" x1="40" y1="36" x2="40" y2="58" />
        <path className="limb" d="M40 58 L33 70 L33 76" /><path className="limb" d="M40 58 L47 70 L47 76" />
        <g className="anim pullV">
          <line className="limb" x1="34" y1="38" x2="31" y2="22" /><line className="limb" x1="46" y1="38" x2="49" y2="22" />
          <line className="bar" x1="24" y1="20" x2="56" y2="20" />
        </g>
      </svg>
    );
    case 'curl': return (
      <svg viewBox="0 0 80 80">
        <circle className="head" cx="40" cy="16" r="6" />
        <line className="body" x1="40" y1="22" x2="40" y2="48" />
        <path className="limb" d="M40 48 L33 68 L33 74" /><path className="limb" d="M40 48 L47 68 L47 74" />
        <line className="limb" x1="33" y1="25" x2="31" y2="42" /><line className="limb" x1="47" y1="25" x2="49" y2="42" />
        <g className="anim curl" style={O(31, 42)}>
          <line className="limb" x1="31" y1="42" x2="31" y2="56" /><circle className="wt" cx="31" cy="57" r="4" />
        </g>
        <g className="anim curl" style={O(49, 42)}>
          <line className="limb" x1="49" y1="42" x2="49" y2="56" /><circle className="wt" cx="49" cy="57" r="4" />
        </g>
      </svg>
    );
    case 'raise': return (
      <svg viewBox="0 0 80 80">
        <circle className="head" cx="40" cy="16" r="6" />
        <line className="body" x1="40" y1="22" x2="40" y2="48" />
        <path className="limb" d="M40 48 L33 68 L33 74" /><path className="limb" d="M40 48 L47 68 L47 74" />
        <g className="anim raise" style={O(34, 26)}>
          <line className="limb" x1="34" y1="26" x2="34" y2="44" /><circle className="wt" cx="34" cy="45" r="3.6" />
        </g>
        <g className="anim raise" style={{ transformOrigin: '46px 26px', animationName: 'ftRaiseR' }}>
          <line className="limb" x1="46" y1="26" x2="46" y2="44" /><circle className="wt" cx="46" cy="45" r="3.6" />
        </g>
        <style>{`@keyframes ftRaiseR{0%,100%{transform:rotate(0)}50%{transform:rotate(78deg)}}`}</style>
      </svg>
    );
    case 'pushdown': return (
      <svg viewBox="0 0 80 80">
        <circle className="head" cx="40" cy="16" r="6" />
        <line className="body" x1="40" y1="22" x2="40" y2="48" />
        <path className="limb" d="M40 48 L33 68 L33 74" /><path className="limb" d="M40 48 L47 68 L47 74" />
        <line className="bar" x1="22" y1="12" x2="22" y2="34" strokeWidth="2.4" />
        <line className="limb" x1="40" y1="25" x2="34" y2="38" />
        <g className="anim push" style={O(34, 38)}>
          <line className="limb" x1="34" y1="38" x2="30" y2="22" /><circle className="wt" cx="30" cy="21" r="3.4" />
        </g>
      </svg>
    );
    case 'hinge': return (
      <svg viewBox="0 0 80 80">
        <line className="limb" x1="40" y1="50" x2="36" y2="72" /><line className="limb" x1="40" y1="50" x2="44" y2="72" />
        <g className="anim hinge" style={O(40, 50)}>
          <line className="body" x1="40" y1="50" x2="40" y2="26" />
          <circle className="head" cx="40" cy="20" r="6" />
          <line className="limb" x1="40" y1="30" x2="40" y2="50" />
          <line className="bar" x1="33" y1="51" x2="47" y2="51" />
          <circle className="wt" cx="33" cy="51" r="3.6" /><circle className="wt" cx="47" cy="51" r="3.6" />
        </g>
      </svg>
    );
    case 'row': return (
      <svg viewBox="0 0 80 80">
        <g className="anim hinge" style={{ transformOrigin: '40px 50px', animationName: 'ftHingeHold', animationDuration: '0s' }} transform="rotate(38 40 50)">
          <circle className="head" cx="40" cy="20" r="6" />
          <line className="body" x1="40" y1="26" x2="40" y2="50" />
        </g>
        <line className="limb" x1="40" y1="50" x2="36" y2="72" /><line className="limb" x1="40" y1="50" x2="44" y2="72" />
        <g className="anim row">
          <line className="limb" x1="55" y1="38" x2="55" y2="56" /><line className="bar" x1="48" y1="57" x2="62" y2="57" />
          <circle className="wt" cx="48" cy="57" r="3.4" /><circle className="wt" cx="62" cy="57" r="3.4" />
        </g>
      </svg>
    );
    case 'legpress': return (
      <svg viewBox="0 0 80 80">
        <line className="app" x1="14" y1="30" x2="14" y2="62" />
        <circle className="head" cx="22" cy="40" r="5.5" />
        <line className="body" x1="20" y1="45" x2="34" y2="50" />
        <g className="anim legp">
          <path className="limb" d="M34 50 L46 44 L40 56" />
          <line className="app" x1="50" y1="36" x2="44" y2="60" />
        </g>
      </svg>
    );
    case 'dips': return (
      <svg viewBox="0 0 80 80">
        <line className="app" x1="20" y1="34" x2="20" y2="64" /><line className="app" x1="60" y1="34" x2="60" y2="64" />
        <g className="anim dips">
          <circle className="head" cx="40" cy="24" r="6" />
          <line className="body" x1="40" y1="30" x2="40" y2="50" />
          <path className="limb" d="M40 50 L36 60 L40 66" /><path className="limb" d="M40 50 L44 60 L40 66" />
          <path className="limb" d="M40 34 L28 40 L20 34" /><path className="limb" d="M40 34 L52 40 L60 34" />
        </g>
      </svg>
    );
    case 'plank': return (
      <svg viewBox="0 0 80 80">
        <line className="app" x1="12" y1="62" x2="68" y2="62" />
        <g className="anim plank">
          <circle className="head" cx="22" cy="44" r="5.5" />
          <line className="body" x1="26" y1="46" x2="56" y2="54" />
          <path className="limb" d="M30 47 L30 60" />
          <path className="limb" d="M56 54 L60 60" /><path className="limb" d="M56 54 L52 60" />
        </g>
      </svg>
    );
    case 'squat':
    default: return (
      <svg viewBox="0 0 80 80">
        <g className="anim squat">
          <circle className="head" cx="40" cy="16" r="6" />
          <line className="body" x1="40" y1="22" x2="40" y2="44" />
          <line className="bar" x1="30" y1="24" x2="50" y2="24" />
          <circle className="wt" cx="30" cy="24" r="3.6" /><circle className="wt" cx="50" cy="24" r="3.6" />
        </g>
        <path className="limb" d="M40 44 L31 54 L37 70" /><path className="limb" d="M40 44 L49 54 L43 70" />
      </svg>
    );
  }
}

function ExerciseDemo({ pattern, img, gif, name, size = 56, radius = 14, play = true, muscle, zoomable = true, style = {} }) {
  // resolve the animated GIF (explicit `gif` path, else lookup by name)
  const gifUrl = gif !== undefined
    ? (gif ? (/^https?:/.test(gif) ? gif : window.FT.GIF_BASE + gif + '.gif') : null)
    : (name ? window.FT.gifFor(name) : null);
  const tint = muscle ? window.FT.muscleColor(muscle) : 'var(--accent)';

  const [failed, setFailed] = React.useState(!gifUrl);
  React.useEffect(() => { setFailed(!gifUrl); }, [gifUrl]);

  const canZoom = zoomable && gifUrl && !failed;
  const openZoom = (e) => {
    if (!canZoom) return;
    e.stopPropagation(); e.preventDefault();
    document.dispatchEvent(new CustomEvent('ft-zoom', { detail: { url: gifUrl, name, muscle, pattern } }));
  };

  // CSS-figure fallback (no GIF / load error) — keeps the original animated stick-figure
  if (failed) {
    return (
      <div className={`ft-demo${play ? ' play' : ''}`} style={{
        width: size, height: size, borderRadius: radius, flexShrink: 0,
        background: 'var(--surface-2)', border: '1px solid var(--border)',
        position: 'relative', overflow: 'hidden', ...style,
      }}>
        <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(120% 90% at 50% 120%, ${tint}22, transparent 60%)`, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: '14%' }}><DemoScene pattern={pattern} /></div>
      </div>
    );
  }

  return (
    <div
      onClick={openZoom}
      title={canZoom ? 'Antippen zum Vergrößern' : undefined}
      style={{
        width: size, height: size, borderRadius: radius, flexShrink: 0,
        background: '#fff', border: '1px solid var(--border)',
        position: 'relative', overflow: 'hidden', cursor: canZoom ? 'zoom-in' : 'default', ...style,
      }}>
      <img src={gifUrl} alt={name || ''} draggable="false"
        onError={() => setFailed(true)}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      {/* corner tint chip to tie into the theme */}
      <span style={{ position: 'absolute', left: 5, bottom: 5, width: 7, height: 7, borderRadius: '50%', background: tint, boxShadow: '0 0 0 2px rgba(255,255,255,0.7)' }} />
    </div>
  );
}

/* ── Fullscreen GIF lightbox: opens on 'ft-zoom' events, closes on click/Esc ── */
function GifLightbox() {
  const [item, setItem] = React.useState(null);
  React.useEffect(() => {
    const onZoom = (e) => setItem(e.detail);
    const onKey = (e) => { if (e.key === 'Escape') setItem(null); };
    document.addEventListener('ft-zoom', onZoom);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('ft-zoom', onZoom); document.removeEventListener('keydown', onKey); };
  }, []);
  if (!item) return null;
  const tint = item.muscle ? window.FT.muscleColor(item.muscle) : 'var(--accent)';
  return (
    <div onClick={() => setItem(null)} style={{
      position: 'absolute', inset: 0, zIndex: 400,
      background: 'rgba(4,5,6,0.86)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 24, cursor: 'zoom-out',
    }}>
      <style>{`@keyframes ftZoomIn{from{transform:scale(.9);opacity:0}to{transform:none;opacity:1}}`}</style>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: 'min(86%, 320px)', animation: 'ftZoomIn .22s cubic-bezier(.2,.8,.2,1) both', cursor: 'default',
      }}>
        <div style={{ position: 'relative', width: '100%', height: 'min(86vw, 320px)', background: '#fff', borderRadius: 22, overflow: 'hidden', border: '1px solid var(--border-2)', boxShadow: '0 30px 80px -20px rgba(0,0,0,0.7)' }}>
          <img src={item.url} alt={item.name || ''} draggable="false" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          <span style={{ position: 'absolute', left: 12, bottom: 12, width: 11, height: 11, borderRadius: '50%', background: tint, boxShadow: '0 0 0 3px rgba(255,255,255,0.85)' }} />
        </div>
        {item.name && (
          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.01em' }}>{item.name}</div>
            {item.muscle && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 7, fontSize: 12.5, color: 'var(--text-dim)' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: tint }} />{item.muscle}
              </div>
            )}
          </div>
        )}
      </div>
      <button onClick={() => setItem(null)} style={{
        marginTop: 22, display: 'inline-flex', alignItems: 'center', gap: 7,
        background: 'var(--surface-2)', border: '1px solid var(--border-2)', color: 'var(--text-dim)',
        borderRadius: 999, padding: '9px 16px', font: 'inherit', fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
      }}>
        <Icon name="close" size={15} />Schließen
      </button>
    </div>
  );
}

Object.assign(window, { ExerciseDemo, GifLightbox });
