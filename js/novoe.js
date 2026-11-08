// Лист «Что нового»: версии из versions.js. Новая версия ещё не открыта: точка на кнопке настроек.
import { VERSIONS } from './versions.js?v=54b72f24';

const KEY = 'kaleido.ver';
const sheet = document.getElementById('sheet');
const list = document.getElementById('sheet-list');
const now = VERSIONS[0].v;

export function unseen() {
  try { return localStorage.getItem(KEY) !== now; } catch (e) { return false; }
}

function render() {
  list.textContent = '';
  for (const ver of VERSIONS) {
    const h = document.createElement('h3');
    h.textContent = `Версия ${ver.v}, ${ver.d}`;
    const ul = document.createElement('ul');
    for (const t of ver.items) {
      const li = document.createElement('li');
      li.textContent = t;
      ul.append(li);
    }
    list.append(h, ul);
  }
}

export function open() {
  if (!list.childElementCount) render();
  try { localStorage.setItem(KEY, now); } catch (e) { /* память закрыта */ }
  dispatchEvent(new Event('kaleido:seen'));
  sheet.hidden = false;
  requestAnimationFrame(() => requestAnimationFrame(() => sheet.classList.add('open')));
}

function close() {
  sheet.classList.remove('open');
  setTimeout(() => { sheet.hidden = true; }, 250);
}

sheet.addEventListener('click', e => { if (e.target.closest('[data-close]')) close(); });
addEventListener('keydown', e => { if (e.key === 'Escape' && !sheet.hidden) close(); });
