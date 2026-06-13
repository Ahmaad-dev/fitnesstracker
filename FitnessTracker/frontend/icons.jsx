/* FitTracker — minimal line-icon set */
function Icon({ name, size = 22, stroke = 2, color = 'currentColor', style = {} }) {
  const p = { fill: 'none', stroke: color, strokeWidth: stroke, strokeLinecap: 'round', strokeLinejoin: 'round' };
  const paths = {
    home: <><path d="M3 10.5 12 3l9 7.5" {...p} /><path d="M5 9.5V20h14V9.5" {...p} /></>,
    history: <><circle cx="12" cy="12" r="9" {...p} /><path d="M12 7v5l3.5 2" {...p} /></>,
    sparkle: <><path d="M12 3l1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6L12 3Z" {...p} /></>,
    sync: <><path d="M20 12a8 8 0 0 1-13.7 5.6M4 12A8 8 0 0 1 17.7 6.4" {...p} /><path d="M17.5 3v3.5H14M6.5 21v-3.5H10" {...p} /></>,
    watch: <><rect x="6" y="6" width="12" height="12" rx="3.5" {...p} /><path d="M8.5 6 9 2.5h6L15.5 6M8.5 18 9 21.5h6l.5-3.5" {...p} /></>,
    user: <><circle cx="12" cy="8" r="3.6" {...p} /><path d="M5 20c0-3.6 3.1-5.6 7-5.6s7 2 7 5.6" {...p} /></>,
    chevR: <path d="M9 5l7 7-7 7" {...p} />,
    chevL: <path d="M15 5l-7 7 7 7" {...p} />,
    chevD: <path d="M5 9l7 7 7-7" {...p} />,
    plus: <><path d="M12 5v14M5 12h14" {...p} /></>,
    check: <path d="M4 12.5 9.5 18 20 6.5" {...p} />,
    flame: <path d="M12 3c.5 3-2.5 4-2.5 7a2.5 2.5 0 0 0 5 0c0-.8-.3-1.4-.3-1.4.8.5 2.3 2 2.3 4.4a4.5 4.5 0 1 1-9 0C7.5 8.5 12 7 12 3Z" {...p} />,
    dumbbell: <><path d="M3 9v6M6 7v10M18 7v10M21 9v6M6 12h12" {...p} /></>,
    clock: <><circle cx="12" cy="12" r="8.5" {...p} /><path d="M12 7.5V12l3 1.8" {...p} /></>,
    bolt: <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" {...p} />,
    grip: <><circle cx="9" cy="7" r="1.4" fill={color} stroke="none" /><circle cx="15" cy="7" r="1.4" fill={color} stroke="none" /><circle cx="9" cy="12" r="1.4" fill={color} stroke="none" /><circle cx="15" cy="12" r="1.4" fill={color} stroke="none" /><circle cx="9" cy="17" r="1.4" fill={color} stroke="none" /><circle cx="15" cy="17" r="1.4" fill={color} stroke="none" /></>,
    heart: <path d="M12 20S4 14.5 4 8.8A4.3 4.3 0 0 1 12 6a4.3 4.3 0 0 1 8 2.8C20 14.5 12 20 12 20Z" {...p} />,
    arrowR: <path d="M5 12h14M13 6l6 6-6 6" {...p} />,
    close: <path d="M6 6l12 12M18 6 6 18" {...p} />,
    search: <><circle cx="11" cy="11" r="6.5" {...p} /><path d="m16 16 4 4" {...p} /></>,
    target: <><circle cx="12" cy="12" r="8.5" {...p} /><circle cx="12" cy="12" r="4" {...p} /><circle cx="12" cy="12" r="0.6" fill={color} stroke="none" /></>,
    info: <><circle cx="12" cy="12" r="8.5" {...p} /><path d="M12 11v5M12 7.6v.2" {...p} /></>,
    calendar: <><rect x="4" y="5.5" width="16" height="15" rx="3" {...p} /><path d="M4 10h16M8 3.5v3.5M16 3.5v3.5" {...p} /></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={style} aria-hidden="true">
      {paths[name] || null}
    </svg>
  );
}
Object.assign(window, { Icon });
