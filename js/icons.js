// Значки ленты: линия 2, круглые концы (брендбук, «Части»). Без плюса, крестов и звёзд.
const svg = d => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;

export const ICON = {
  heart: svg('<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/>'),
  less: svg('<path d="M10 15v4a2 2 0 0 0 2 2l3-7V4H7.5a2 2 0 0 0-2 1.7l-1.3 7A2 2 0 0 0 6.2 15Z"/><path d="M15 4h3a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-3"/>'),
  dice: svg('<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="9" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="15" cy="15" r="1" fill="currentColor"/>'),
  out: svg('<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>'),
  play: svg('<path d="M8 5v14l11-7Z"/>'),
  sound: svg('<path d="M4 9v6h4l5 4V5L8 9Z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>'),
};
