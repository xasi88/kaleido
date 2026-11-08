// Установка как приложение: помощник sw.js (без него Chrome не ставит приложение) и кнопка «Установить».
// Кнопки с data-install видны, только когда Chrome готов поставить приложение. Событие kaleido:app: вид поменялся.
let prompt = null;

export const installed = () =>
  matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: window-controls-overlay)').matches;
export const can = () => !!prompt;

function show() {
  for (const b of document.querySelectorAll('[data-install]')) b.hidden = !prompt;
  dispatchEvent(new Event('kaleido:app'));
}

export async function install() {
  if (!prompt) return false;
  const p = prompt;
  prompt = null;
  p.prompt();
  const r = await p.userChoice.catch(() => ({}));
  show();
  return r.outcome === 'accepted';
}

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => { /* без помощника лента тоже работает */ });

addEventListener('beforeinstallprompt', e => {
  e.preventDefault(); // своя кнопка вместо полоски Chrome
  prompt = e;
  show();
});
addEventListener('appinstalled', () => { prompt = null; show(); });
document.addEventListener('click', e => { if (e.target.closest('[data-install]')) install(); });
