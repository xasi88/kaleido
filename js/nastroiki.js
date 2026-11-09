// Настройки ленты (версия 0.8, 6 разделов вместо 9): вид роликов, язык («Строго» только у русского), темы,
// это устройство (версия, установка, облако), «Что я смотрю», «Начать заново». Подборка включена: сверху строка о ней.
// Вид, язык, темы и подборка копятся в черновике. Лист закрылся и черновик другой: событие kaleido:cfg, его ловит lenta.js.
import { TOPICS, GROUPS, NAMES, PODBORKI } from './topics.js?v=3c2ae583';
import { LANGS } from './strany.js?v=3c2ae583';
import { VERSIONS } from './versions.js?v=3c2ae583';
import * as P from './podbor.js?v=3c2ae583';
import { st, save } from './pamyat.js?v=3c2ae583';
import * as cloud from './oblako.js?v=3c2ae583';
import * as app from './ustanovka.js?v=3c2ae583';
import * as novoe from './novoe.js?v=3c2ae583';
import { sheet } from './list.js?v=3c2ae583';

const FORMATS = [['', 'Короткие'], ['l', 'Обычные'], ['a', 'Все']];
const body = document.getElementById('nast-body');
const box = sheet(document.getElementById('nast'), apply);
let draft = null;

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

// Один вариант из списка. change: что ещё сделать после выбора.
function pick(box, list, key, change) {
  const wrap = el('div', 'opts');
  for (const [v, name] of list) {
    const b = el('button', 'opt', name);
    b.setAttribute('aria-pressed', String(draft[key] === v));
    b.onclick = () => {
      draft[key] = v;
      for (const x of wrap.children) x.setAttribute('aria-pressed', String(x === b));
      if (change) change();
    };
    wrap.append(b);
  }
  box.append(wrap);
}

// Подборка не слушает язык и темы: лист говорит об этом прямо
function podborka(box) {
  box.append(note(`Сейчас идёт подборка «${PODBORKI[draft.pod]}». Она всегда на русском. Из настроек ниже на неё действует только вид роликов.`));
  const b = el('button', 'opt hot', 'Включить обычную ленту');
  b.onclick = () => { draft.pod = ''; render(); };
  box.append(b);
}

function vid(box) {
  pick(box, FORMATS, 'fmt');
  box.append(note('Короткие: вертикальные, до 3 минут. Обычные: экран лёжа, во всю ширину. Все: через один.'));
}

// «Строго» только у русского (решение автора 2026-11-09): раньше «Только на русском» был отдельной кнопкой и спорил с языком
function yazyk(box) {
  const strict = el('div', 'strict');
  const sw = el('button', 'opt', 'Строго: только русская речь');
  sw.onclick = () => { draft.ru = !draft.ru; sw.setAttribute('aria-pressed', String(draft.ru)); };
  strict.append(sw, note('Ролики на других языках не придут. Роликов будет меньше.'));
  const upd = () => {
    if (draft.lang !== 'ru') draft.ru = false;
    strict.hidden = draft.lang !== 'ru';
    sw.setAttribute('aria-pressed', String(draft.ru));
  };
  pick(box, LANGS, 'lang', upd);
  box.append(note('«Любой»: ролики со всего мира. Другой язык: YouTube ищет ролики на нём.'), strict);
  upd();
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
    all.hidden = !off.size;
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

// Это устройство: версия и «Что нового», установка, облако. Раньше три места: «Облако» и «Приложение».
function ustrojstvo(box) {
  const s = cloud.status;
  const time = t => new Date(t).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
  const v = VERSIONS[0];
  const lines = [`Версия ${v.v} от ${v.d}.`];
  if (!cloud.on()) {
    lines.push(s.err === 'kod' ? 'Код облака не подошёл: откройте секретную ссылку ещё раз.'
      : 'Облако не подключено: откройте секретную ссылку один раз на этом устройстве.');
  } else {
    lines.push(s.err === 'net' ? 'Нет связи с облаком: память сохранится, когда связь вернётся.'
      : s.at ? `Память ленты в облаке, последний обмен в ${time(s.at)}.` : 'Память ленты в облаке.');
  }
  if (!app.installed() && !app.can()) lines.push('Установка: меню Chrome, «Установить приложение» или «Добавить на главный экран».');

  const row = el('div', 'opts');
  const nw = el('button', 'opt' + (novoe.unseen() ? ' hot' : ''), 'Что нового');
  nw.onclick = () => { novoe.open(); nw.classList.remove('hot'); };
  row.append(nw);
  if (app.can()) {
    const b = el('button', 'opt hot', 'Установить');
    b.dataset.install = '';
    row.append(b);
  }
  if (cloud.on()) {
    const b = el('button', 'opt', 'Скопировать ссылку для другого устройства');
    b.onclick = async () => {
      try { await navigator.clipboard.writeText(cloud.link()); b.textContent = 'Ссылка скопирована'; } catch (e) { b.textContent = 'Не скопировалось'; }
    };
    row.append(b);
  }
  box.append(note(lines.join(' ')), row);
  if (cloud.on()) box.append(note('Ссылка секретная: она открывает вашу память ленты. Отправляйте её только себе.'));
}

function watched(box) {
  const s = P.stats(st);
  box.append(note(s.n ? `Показано ${s.n} ${word(s.n, 'ролик', 'ролика', 'роликов')}. Полоса длиннее: группа нравится больше.` : 'Вы ещё ничего не посмотрели.'));
  for (const x of s.groups) {
    const row = el('div', 'stat');
    row.style.setProperty('--c', `var(--${P.color(x.g)})`);
    row.style.setProperty('--w', Math.round((x.s + 1) * 50) + '%');
    row.append(el('span', '', NAMES[x.g]), el('span', 'cnt', `${x.k} ${word(x.k, 'ролик', 'ролика', 'роликов')}`), el('i'));
    box.append(row);
  }
  if (s.top.length) box.append(note('Любимые темы: ' + s.top.map(x => x.t[2]).join(', ') + '.'));
}

function zanovo(box) {
  box.append(note('Лента забудет показанные ролики, оценки и каналы после «Меньше». Настройки останутся.'));
  const b = el('button', 'opt danger', 'Начать заново');
  let armed = 0;
  b.onclick = async () => {
    if (Date.now() - armed > 4000) { armed = Date.now(); b.textContent = 'Точно? Коснитесь ещё раз'; return; }
    b.disabled = true;
    b.textContent = 'Начинаю заново';
    P.setCfg(st, draft); // правки этого листа не теряются: страница сейчас перезагрузится
    P.restart(st);
    await save(true);
    location.reload();
  };
  box.append(b);
}

function render() {
  body.textContent = '';
  if (PODBORKI[draft.pod]) podborka(part('Подборка'));
  vid(part('Вид роликов'));
  yazyk(part('Язык роликов'));
  topics(part('Темы'));
  ustrojstvo(part('Это устройство'));
  watched(part('Что я смотрю'));
  zanovo(part('Начать заново'));
}

export function open() {
  const c = st.cfg;
  draft = { off: [...c.off], lang: c.lang || '', fmt: c.fmt || '', ru: !!c.ru, pod: PODBORKI[c.pod] ? c.pod : '' };
  render();
  box.open();
  body.parentElement.scrollTop = 0; // после open: скрытый лист прокрутку не принимает
}

// Лист закрылся: черновик другой, событие для ленты
function apply() {
  if (!draft) return;
  const c = st.cfg;
  const same = draft.lang === (c.lang || '') && draft.fmt === (c.fmt || '') && draft.ru === !!c.ru
    && draft.pod === (PODBORKI[c.pod] ? c.pod : '')
    && draft.off.length === c.off.length && draft.off.every(x => c.off.includes(x));
  if (!same) dispatchEvent(new CustomEvent('kaleido:cfg', { detail: draft }));
  draft = null;
}

// Новая версия ещё не открыта: точка на кнопке «Настройки» у каждого ролика (lenta.css, html.unseen)
const dot = () => document.documentElement.classList.toggle('unseen', novoe.unseen());
addEventListener('kaleido:seen', dot);
dot();
