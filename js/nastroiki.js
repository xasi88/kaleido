// Настройки (админка ленты): язык, страна, темы, «Что я смотрю», облако, приложение, «Начать заново».
// Язык, страна и темы копятся в черновике. Лист закрылся и черновик другой: событие kaleido:cfg, его ловит lenta.js.
import { TOPICS, GROUPS } from './topics.js?v=54b72f24';
import { LANGS, COUNTRIES } from './strany.js?v=54b72f24';
import { VERSIONS } from './versions.js?v=54b72f24';
import * as P from './podbor.js?v=54b72f24';
import { st, save } from './pamyat.js?v=54b72f24';
import * as cloud from './oblako.js?v=54b72f24';
import * as app from './ustanovka.js?v=54b72f24';
import * as novoe from './novoe.js?v=54b72f24';
import { ICON } from './icons.js?v=54b72f24';

const sheet = document.getElementById('nast');
const body = document.getElementById('nast-body');
const btn = document.getElementById('nastr');
let draft = null;

btn.innerHTML = ICON.gear;
for (const b of document.querySelectorAll('.top [data-install]')) b.innerHTML = ICON.down + 'Установить';

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};
const note = text => el('p', 'note', text);
const word = (n, one, few, many) => {
  const a = n % 10;
  const b = n % 100;
  return a === 1 && b !== 11 ? one : a >= 2 && a <= 4 && (b < 12 || b > 14) ? few : many;
};
function part(title) {
  const s = el('section', 'ns');
  s.append(el('h3', '', title));
  body.append(s);
  return s;
}

// Один вариант из списка: язык, страна
function pick(box, list, key) {
  const wrap = el('div', 'opts');
  for (const [v, name] of list) {
    const b = el('button', 'opt', name);
    b.setAttribute('aria-pressed', String(draft[key] === v));
    b.onclick = () => {
      draft[key] = v;
      for (const x of wrap.children) x.setAttribute('aria-pressed', String(x === b));
    };
    wrap.append(b);
  }
  box.append(wrap);
}

function topics(box) {
  const off = new Set(draft.off);
  const fills = [];
  const head = note('');
  const all = el('button', 'opt', 'Включить все');
  const upd = () => {
    draft.off = [...off];
    const on = TOPICS.length - off.size;
    head.textContent = on ? `Включено ${on} из ${TOPICS.length}. Коснитесь группы, чтобы выбрать темы.` : 'Все темы выключены: лента остановится.';
    fills.forEach(f => f());
  };
  all.onclick = () => { off.clear(); upd(); };
  box.append(head, all);

  for (const [g, name] of Object.entries(GROUPS)) {
    const list = TOPICS.filter(t => t[1] === g);
    const d = el('details', 'grp');
    d.style.setProperty('--c', `var(--${P.color(g)})`);
    const sum = el('summary');
    const cnt = el('span', 'cnt');
    sum.append(el('span', '', name), cnt);
    const wrap = el('div', 'opts');
    const whole = el('button', 'opt', 'Вся группа');
    whole.onclick = () => {
      const turnOn = list.some(t => off.has(t[0]));
      for (const t of list) { if (turnOn) off.delete(t[0]); else off.add(t[0]); }
      upd();
    };
    wrap.append(whole);
    const chips = list.map(t => {
      const b = el('button', 'opt topic', t[2]);
      b.onclick = () => { if (off.has(t[0])) off.delete(t[0]); else off.add(t[0]); upd(); };
      wrap.append(b);
      return [t[0], b];
    });
    d.append(sum, wrap);
    box.append(d);
    fills.push(() => {
      const n = list.filter(t => !off.has(t[0])).length;
      cnt.textContent = `${n} из ${list.length}`;
      whole.setAttribute('aria-pressed', String(n === list.length));
      for (const [id, b] of chips) b.setAttribute('aria-pressed', String(!off.has(id)));
    });
  }
  upd();
}

function watched(box) {
  const s = P.stats(st);
  box.append(note(s.n ? `Показано ${s.n} ${word(s.n, 'ролик', 'ролика', 'роликов')}. Полоса длиннее: группа нравится больше.` : 'Вы ещё ничего не посмотрели.'));
  for (const x of s.groups) {
    const row = el('div', 'stat');
    row.style.setProperty('--c', `var(--${P.color(x.g)})`);
    row.style.setProperty('--w', Math.round((x.s + 1) * 50) + '%');
    row.append(el('span', '', GROUPS[x.g]), el('span', 'cnt', `${x.k} ${word(x.k, 'ролик', 'ролика', 'роликов')}`), el('i'));
    box.append(row);
  }
  if (s.top.length) box.append(note('Любимые темы: ' + s.top.map(x => x.t[2]).join(', ') + '.'));
}

function oblako(box) {
  const s = cloud.status;
  const time = t => new Date(t).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
  if (!cloud.on()) {
    box.append(note(s.err === 'kod'
      ? 'Код облака не подошёл. Откройте секретную ссылку ещё раз.'
      : 'Облако не подключено. Откройте секретную ссылку один раз на этом устройстве.'));
    return;
  }
  box.append(note(s.err === 'net' ? 'Нет связи с облаком. Память сохранится, когда связь вернётся.'
    : s.at ? `Память ленты в облаке. Последний обмен в ${time(s.at)}.` : 'Облако подключено.'));
  const b = el('button', 'opt', 'Скопировать ссылку для другого устройства');
  b.onclick = async () => {
    try { await navigator.clipboard.writeText(cloud.link()); b.textContent = 'Ссылка скопирована'; } catch (e) { b.textContent = 'Не скопировалось'; }
  };
  box.append(b, note('Ссылка секретная: она открывает вашу память ленты. Отправляйте её только себе.'));
}

function prilozhenie(box) {
  const v = VERSIONS[0];
  box.append(note(`Версия ${v.v} от ${v.d}.`));
  const row = el('div', 'opts');
  const nw = el('button', 'opt' + (novoe.unseen() ? ' hot' : ''), 'Что нового');
  nw.onclick = () => { novoe.open(); nw.classList.remove('hot'); };
  row.append(nw);
  if (app.can()) {
    const b = el('button', 'opt hot', 'Установить');
    b.dataset.install = '';
    row.append(b);
  }
  box.append(row, note(app.installed() ? 'Лента открыта как приложение.'
    : app.can() ? 'Значок появится на рабочем столе, лента откроется в своём окне.'
      : 'Установка: меню Chrome, пункт «Установить приложение» или «Добавить на главный экран».'));
}

function zanovo(box) {
  box.append(note('Лента забудет показанные ролики и оценки. Темы, язык и страна останутся.'));
  const b = el('button', 'opt danger', 'Начать заново');
  let armed = 0;
  b.onclick = async () => {
    if (Date.now() - armed > 4000) { armed = Date.now(); b.textContent = 'Точно? Коснитесь ещё раз'; return; }
    b.disabled = true;
    b.textContent = 'Начинаю заново';
    P.restart(st);
    await save(true);
    location.reload();
  };
  box.append(b);
}

function render() {
  body.textContent = '';
  const lang = part('Язык роликов');
  pick(lang, LANGS, 'lang');
  lang.append(note('«Любой»: ролики со всего мира. Язык: YouTube ищет ролики на этом языке.'));
  const reg = part('Страна');
  pick(reg, COUNTRIES, 'reg');
  reg.append(note('YouTube покажет ролики, которые смотрят в этой стране.'));
  topics(part('Темы'));
  watched(part('Что я смотрю'));
  oblako(part('Облако'));
  prilozhenie(part('Приложение'));
  zanovo(part('Начать заново'));
}

export function open() {
  draft = { off: [...st.cfg.off], lang: st.cfg.lang, reg: st.cfg.reg };
  render();
  sheet.hidden = false;
  body.parentElement.scrollTop = 0;
  requestAnimationFrame(() => requestAnimationFrame(() => sheet.classList.add('open')));
}

function close() {
  if (!draft) return;
  const was = st.cfg;
  const same = draft.lang === was.lang && draft.reg === was.reg
    && draft.off.length === was.off.length && draft.off.every(x => was.off.includes(x));
  if (!same) dispatchEvent(new CustomEvent('kaleido:cfg', { detail: draft }));
  draft = null;
  sheet.classList.remove('open');
  setTimeout(() => { sheet.hidden = true; }, 250);
}

const dot = () => btn.classList.toggle('dot', novoe.unseen());
btn.addEventListener('click', open);
sheet.addEventListener('click', e => { if (e.target.closest('[data-close]')) close(); });
addEventListener('keydown', e => { if (e.key === 'Escape' && !sheet.hidden && document.getElementById('sheet').hidden) close(); });
addEventListener('kaleido:seen', dot);
dot();
