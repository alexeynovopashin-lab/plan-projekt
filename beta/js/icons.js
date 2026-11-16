// Line icons in the spirit of SF Symbols, 24×24, stroke = currentColor.
// Keys are SF Symbol names, so projects.yml `icon:` maps 1:1 to Swift later.
const P = {
  // UI
  "plus": '<path d="M12 5v14M5 12h14"/>',
  "arrow.up.arrow.down": '<path d="M7 20V4M3.5 7.5 7 4l3.5 3.5M17 4v16M13.5 16.5 17 20l3.5-3.5"/>',
  "magnifyingglass": '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 20 20"/>',
  "chevron.right": '<path d="m9 5 7 7-7 7"/>',
  "chevron.left": '<path d="m15 5-7 7 7 7"/>',
  "chevron.down": '<path d="m6 9 6 6 6-6"/>',
  "ellipsis": '<circle cx="5" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="19" cy="12" r="1.3" fill="currentColor"/>',
  "xmark": '<path d="M6 6l12 12M18 6 6 18"/>',
  "checkmark": '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  "camera": '<path d="M4 8h3.2L9 5.5h6L16.8 8H20a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.6"/>',
  "photo": '<rect x="3" y="5" width="18" height="14" rx="2.5"/><circle cx="8.5" cy="10" r="1.6"/><path d="m3.5 17 5-5 4 4 2.5-2.5L20.5 18"/>',
  "number": '<path d="M9.5 4 8 20M16 4l-1.5 16M4.5 9h15M4 15h15"/>',
  "calendar": '<rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  "tray": '<path d="M3.5 13.5 6 5.5h12l2.5 8V18a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 18z"/><path d="M3.5 13.5H8.5a3.5 3.5 0 0 0 7 0h5"/>',
  "clock": '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  "gearshape": '<circle cx="12" cy="12" r="3"/><path d="M10.3 3.5h3.4l.5 2.4 1.6.9 2.3-.8 1.7 2.9-1.8 1.6v1.9l1.8 1.6-1.7 2.9-2.3-.8-1.6.9-.5 2.4h-3.4l-.5-2.4-1.6-.9-2.3.8-1.7-2.9 1.8-1.6v-1.9L4.2 8.9l1.7-2.9 2.3.8 1.6-.9z"/>',
  "arrow.up": '<path d="M12 19V5M6 11l6-6 6 6"/>',
  "flag": '<path d="M5.5 21V4M5.5 4.5h11l-2 4 2 4h-11"/>',
  "trash": '<path d="M4.5 6.5h15M9.5 6.5V4.5h5v2M6.5 6.5l1 13h9l1-13"/>',
  "doc.on.doc": '<rect x="8" y="8" width="11" height="13" rx="2"/><path d="M5 16V5a2 2 0 0 1 2-2h8"/>',
  "folder": '<path d="M3.5 7.5a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/>',
  "arrow.uturn.backward": '<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
  "text.alignleft": '<path d="M4 6h16M4 10h10M4 14h16M4 18h10"/>',
  "square.grid.2x2": '<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/>',
  "list.bullet": '<circle cx="5" cy="7" r="1.2" fill="currentColor"/><circle cx="5" cy="12" r="1.2" fill="currentColor"/><circle cx="5" cy="17" r="1.2" fill="currentColor"/><path d="M9 7h11M9 12h11M9 17h11"/>',
  "bubble": '<path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 3.5V17A2.5 2.5 0 0 1 4 14.5z"/>',
  "paperplane": '<path d="M21 3 3 10.5l7 2.5 2.5 7z"/><path d="M10 13 21 3"/>',
  "link": '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  "circle.half": '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17a8.5 8.5 0 0 0 0-17z" fill="currentColor"/>',
  // project glyphs
  "sun.max": '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/>',
  "calendar.badge": '<rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="m9 15 2 2 4-4"/>',
  "building.2": '<path d="M4 21V7l7-3v17M11 21V9l9 3v9M3 21h18M7 10v1M7 14v1M15 14v1M15 17v1"/>',
  "camera.aperture": '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5 15 12M20.5 12 12 15M12 20.5 9 12M3.5 12 12 9"/>',
  "location.north": '<circle cx="12" cy="12" r="8.5"/><path d="m12 6 3 8-3-1.6L9 14z" fill="currentColor"/>',
  "theatermasks": '<path d="M4 5c2.5 1 5.5 1 8 0v6a4 4 0 0 1-8 0z"/><path d="M12 9c2.5 1 5.5 1 8 0v6a4 4 0 0 1-8 0"/>',
  "shield": '<path d="M12 3 5 6v5.5c0 4.5 3 7.7 7 9.5 4-1.8 7-5 7-9.5V6z"/>',
  "paintpalette": '<path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.3 0 1.8-1 1.3-2.1-.6-1.2.2-2.4 1.6-2.4h1.9a3.7 3.7 0 0 0 3.7-3.7C20.5 7.2 16.7 3.5 12 3.5z"/><circle cx="8" cy="10" r="1.1" fill="currentColor"/><circle cx="12" cy="7.5" r="1.1" fill="currentColor"/><circle cx="16" cy="10" r="1.1" fill="currentColor"/>',
  "mic": '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>',
  "square.stack": '<rect x="5" y="9" width="14" height="11" rx="2.5"/><path d="M7 6h10M9 3h6"/>',
  "books": '<path d="M5 4h4v16H5zM10 4h4v16h-4z"/><path d="m15 5 3.6-1 3 15.5-3.6 1z"/>',
  "globe": '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.5 3.5 5.5 3.5 8.5s-1 6-3.5 8.5c-2.5-2.5-3.5-5.5-3.5-8.5s1-6 3.5-8.5z"/>',
  "lightbulb": '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/>',
  "ant": '<ellipse cx="12" cy="15" rx="3.5" ry="4.5"/><circle cx="12" cy="7.5" r="2.5"/><path d="M8.5 13H5M8.5 16.5 5.5 19M15.5 13H19M15.5 16.5l3 2.5M10.5 5.5 9 3M13.5 5.5 15 3"/>',
  "heart": '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/>',
  "star": '<path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>',
  "house": '<path d="M4 11 12 4l8 7M6 9.5V20h12V9.5"/>',
  "cart": '<path d="M3 4h2.5l2 11h10l2-8H6.5"/><circle cx="9" cy="19.5" r="1.4"/><circle cx="16.5" cy="19.5" r="1.4"/>',
  "film": '<rect x="3.5" y="4" width="17" height="16" rx="2.5"/><path d="M7.5 4v16M16.5 4v16M3.5 9h4M3.5 15h4M16.5 9h4M16.5 15h4"/>',
  "music.note": '<path d="M9 18V5.5l10-2V16"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>',
  "map": '<path d="m3.5 6 5.5-2 6 2 5.5-2v14l-5.5 2-6-2-5.5 2z"/><path d="M9 4v14M15 6v14"/>',
  "person": '<circle cx="12" cy="8" r="3.8"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/>',
  "hammer": '<path d="m14 7-9.5 9.5 3 3L17 10"/><path d="m12 5 3-2 6 6-2 3z"/>',
  "leaf": '<path d="M5 19c0-8 5-13 15-14-1 10-6 15-14 15M5 19l7-7"/>',
  "bolt": '<path d="M13 3 5 13.5h6L10 21l8-10.5h-6z"/>'
};

export const PROJECT_ICONS = [
  "list.bullet", "sun.max", "calendar.badge", "building.2", "camera.aperture", "location.north",
  "theatermasks", "shield", "paintpalette", "mic", "square.stack", "books", "globe", "lightbulb",
  "ant", "heart", "star", "house", "cart", "film", "music.note", "map", "person", "hammer", "leaf", "bolt"
];

export const COLORS = ["red", "orange", "yellow", "green", "mint", "teal", "cyan", "blue", "indigo", "purple", "pink", "brown", "gray"];

export function icon(name, cls = "") {
  const body = P[name] || P["list.bullet"];
  return `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}
