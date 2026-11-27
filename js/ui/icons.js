/* Baseerah — shared SVG icons.
 * Text glyphs (▶ ⏸ ✕ ✓ 🔁 emoji) render differently on every phone font and are
 * never optically centered in a circle. These SVGs are drawn on a 24×24 grid and
 * centered, so every icon sits exactly in the middle of its button. */

const svg = (inner, size = 20, extra = "") =>
  `<svg class="ui-icon" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true" focusable="false" ${extra}>${inner}</svg>`;

const stroke = 'fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"';

export const Icons = {
  // Play triangle is shifted 1px right so it looks optically centered in a circle.
  play: (s = 20) => svg('<path d="M8.5 5.6v12.8a1 1 0 0 0 1.52.85l10.2-6.4a1 1 0 0 0 0-1.7l-10.2-6.4A1 1 0 0 0 8.5 5.6z" fill="currentColor"/>', s),
  pause: (s = 20) => svg('<rect x="6.5" y="5" width="4" height="14" rx="1.2" fill="currentColor"/><rect x="13.5" y="5" width="4" height="14" rx="1.2" fill="currentColor"/>', s),
  close: (s = 18) => svg(`<path ${stroke} d="M6 6l12 12M18 6L6 18"/>`, s),
  check: (s = 16) => svg(`<path ${stroke} d="M5 12.5l4.2 4.2L19 7"/>`, s),
  circle: (s = 16) => svg(`<circle ${stroke} cx="12" cy="12" r="7.5"/>`, s),
  repeat: (s = 18) => svg(`<path ${stroke} d="M17 2.5l3 3-3 3"/><path ${stroke} d="M4 11V9.5a4 4 0 0 1 4-4h12"/><path ${stroke} d="M7 21.5l-3-3 3-3"/><path ${stroke} d="M20 13v1.5a4 4 0 0 1-4 4H4"/>`, s),
  book: (s = 18) => svg(`<path ${stroke} d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5z"/><path ${stroke} d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>`, s),
  info: (s = 18) => svg(`<circle ${stroke} cx="12" cy="12" r="9.5"/><path ${stroke} d="M12 11v6M12 7.5v.01"/>`, s),
  pin: (s = 16) => svg(`<path ${stroke} d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle ${stroke} cx="12" cy="10" r="2.3"/>`, s),
  search: (s = 20) => svg(`<circle ${stroke} cx="11" cy="11" r="7"/><path ${stroke} d="M20.5 20.5L16 16"/>`, s),
  bookmark: (s = 20) => svg(`<path ${stroke} d="M18 21l-6-4.5L6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2z"/>`, s),
  download: (s = 16) => svg(`<path ${stroke} d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/>`, s),
  hourglass: (s = 16) => svg(`<path ${stroke} d="M6.5 3h11M6.5 21h11M7.5 3c0 4.5 4.5 6 4.5 9s-4.5 4.5-4.5 9M16.5 3c0 4.5-4.5 6-4.5 9s4.5 4.5 4.5 9"/>`, s),
  mic: (s = 18) => svg(`<rect ${stroke} x="9" y="3" width="6" height="11" rx="3"/><path ${stroke} d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>`, s),
  type: (s = 18) => svg(`<path ${stroke} d="M5 7V5h14v2M12 5v14M9 19h6"/>`, s),
  trash: (s = 16) => svg(`<path ${stroke} d="M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/>`, s),
  key: (s = 16) => svg(`<circle ${stroke} cx="8" cy="14" r="4"/><path ${stroke} d="M11 11l9-9M16.5 5.5l2.5 2.5"/>`, s),
  warning: (s = 16) => svg(`<path ${stroke} d="M12 3.5L2.5 20h19z"/><path ${stroke} d="M12 10v4.5M12 17.5v.01"/>`, s),
  backspace: (s = 22) => svg(`<path ${stroke} d="M21 5H9l-6 7 6 7h12z"/><path ${stroke} d="M17 9.5l-5 5M12 9.5l5 5"/>`, s),
  shield: (s = 18) => svg(`<path ${stroke} d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/>`, s),
  external: (s = 12) => svg(`<path ${stroke} d="M14 4h6v6M20 4l-9 9M18 14v5H5V6h5"/>`, s),
  arrowRight: (s = 16) => svg(`<path ${stroke} d="M5 12h14M13 6l6 6-6 6"/>`, s),
  mosque: (s = 20) => svg(`<path ${stroke} d="M12 3c2.6 2 4.2 3.9 4.2 6.4H7.8C7.8 6.9 9.4 5 12 3z"/><path ${stroke} d="M6 21V11.5h12V21"/><path ${stroke} d="M10.2 21v-3.6a1.8 1.8 0 0 1 3.6 0V21"/><path ${stroke} d="M3 21h18M3.5 21V9M20.5 21V9"/>`, s),
  settings: (s = 20) => svg(`<circle ${stroke} cx="12" cy="12" r="3"/><path ${stroke} d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>`, s),
  share: (s = 18) => svg(`<circle ${stroke} cx="18" cy="5" r="2.6"/><circle ${stroke} cx="6" cy="12" r="2.6"/><circle ${stroke} cx="18" cy="19" r="2.6"/><path ${stroke} d="M8.3 10.7l7.4-4.3M8.3 13.3l7.4 4.3"/>`, s),
  qr: (s = 18) => svg(`<rect ${stroke} x="3.5" y="3.5" width="6.5" height="6.5" rx="1"/><rect ${stroke} x="14" y="3.5" width="6.5" height="6.5" rx="1"/><rect ${stroke} x="3.5" y="14" width="6.5" height="6.5" rx="1"/><path ${stroke} d="M14 14h2.5v2.5H14zM18 18h2.5v2.5H18zM18 14h2.5M14 18v2.5"/>`, s),
  compass: (s = 20) => svg(`<circle ${stroke} cx="12" cy="12" r="9.5"/><path ${stroke} d="M15.5 8.5l-2 5-5 2 2-5z"/>`, s),
  beads: (s = 20) => svg(`<circle ${stroke} cx="12" cy="5" r="2.2"/><circle ${stroke} cx="6.5" cy="8.5" r="2.2"/><circle ${stroke} cx="17.5" cy="8.5" r="2.2"/><circle ${stroke} cx="6.5" cy="14.5" r="2.2"/><circle ${stroke} cx="17.5" cy="14.5" r="2.2"/><path ${stroke} d="M12 17v4.5"/><circle ${stroke} cx="12" cy="17" r="1.4"/>`, s),
  cards: (s = 20) => svg(`<rect ${stroke} x="3" y="6" width="13" height="15" rx="2.2"/><path ${stroke} d="M8 3h10.8A2.2 2.2 0 0 1 21 5.2V17"/>`, s),
  calendar: (s = 20) => svg(`<rect ${stroke} x="3.5" y="5" width="17" height="15.5" rx="2.2"/><path ${stroke} d="M3.5 10h17M8 3v4M16 3v4"/><path ${stroke} d="M8.5 15l2 2 4-4"/>`, s),
  flame: (s = 16) => svg(`<path ${stroke} d="M12 21c-3.9 0-7-2.8-7-6.6 0-3.1 2.1-5.1 3.6-6.9.4 1.9 1.4 3 2.6 3.6-.2-3.4 1.4-6.4 4-8.1-.3 2.9 1.2 4.6 2.6 6.3 1.1 1.4 2.2 2.9 2.2 5.1 0 3.8-3.1 6.6-8 6.6z"/>`, s),
  moon: (s = 20) => svg(`<path ${stroke} d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/>`, s),
  bell: (s = 18) => svg(`<path ${stroke} d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/>`, s)
};
