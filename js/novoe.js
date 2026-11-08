// Лист «Что нового»: версии из versions.js.
import { VERSIONS } from './versions.js?v=82c3da53';

const sheet = document.getElementById('sheet');
const list = document.getElementById('sheet-list');

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

function open() {
  if (!list.childElementCount) render();
  sheet.hidden = false;
  requestAnimationFrame(() => requestAnimationFrame(() => sheet.classList.add('open')));
}

function close() {
  sheet.classList.remove('open');
  setTimeout(() => { sheet.hidden = true; }, 250);
}

document.getElementById('novoe').addEventListener('click', open);
sheet.addEventListener('click', e => { if (e.target.closest('[data-close]')) close(); });
addEventListener('keydown', e => { if (e.key === 'Escape' && !sheet.hidden) close(); });
