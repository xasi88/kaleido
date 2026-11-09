// Подбор ролика: какая тема следующая, без повторов, учёба на досмотрах.
// Без DOM и без памяти телефона: всё состояние в объекте st (его хранит pamyat.js). Тесты: tests/podbor.test.mjs.
import { TOPICS, TOPIC, GROUPS, PODBORKI, PTOPICS } from './topics.js?v=16a2ce29';

export const EXPLORE_EVERY = 3; // каждый третий ролик из новой темы
// Выдачи темы не кончаются: 0-3 поиск, дальше полки каналов (worker/src/roliki.js). Пустая выдача: тема кончилась.
export const WAIT = 3600000;    // тема упёрлась в лимит YouTube: час не выпадает
export const SPENT = 86400000; // тема кончилась: сутки не выпадает, потом полки с начала (новые ролики, новые каналы)
export const BAN = 2;           // «Меньше» два раза на роликах канала: канал больше не показывается
export const PAGES = 24;        // выдачи подряд, где всё уже показано (после смены языка, через сутки): лента листает их дальше
const SEEN_MAX = 5000;
const GROUP_IDS = [...Object.keys(GROUPS), ...Object.keys(PODBORKI)];

// Темы, из которых сейчас идёт лента: подборка (cfg.pod, кнопки слева) или обычные темы
export const topicsOf = st => (PODBORKI[st.cfg?.pod] ? PTOPICS.filter(t => t[1] === st.cfg.pod) : TOPICS);

// Цвет группы по кругу из шести цветов брендбука: 't1'...'t6'
export const color = (g, shift = 0) => 't' + ((GROUP_IDS.indexOf(g) + shift) % 6 + 1);

// cfg: настройки (выключенные темы, язык, вид роликов fmt: '' короткие, 'l' обычные, 'a' все; ru: «Строго», только на русском;
// pod: подборка или пусто). Страны в настройках нет с версии 0.8 (решение автора 2026-11-09): лента со всего мира.
// at: время записи, r: время «Начать заново»
export const fresh = () => ({
  n: 0, seen: {}, g: {}, t: {}, pools: {}, orders: {}, spent: {}, wait: {}, ban: {}, last: [], at: 0, r: 0,
  cfg: { off: [], lang: '', fmt: '', ru: false, pod: '', at: 0 },
});

const score = (o, id) => (o[id] ? o[id].s : 0);
const shows = (o, id) => (o[id] ? o[id].k : 0);
const one = (list, rnd) => list[Math.floor(rnd() * list.length)];
const isSpent = (st, id, now) => (st.spent[id] || 0) > now - SPENT;

export const isExplore = st => st.n % EXPLORE_EVERY === EXPLORE_EVERY - 1;

export function pickTopic(st, rnd = Math.random, force) {
  const lastIds = st.last.slice(-3);
  const lastGroup = st.last.length ? TOPIC[st.last[st.last.length - 1]]?.[1] : null;
  const off = new Set(st.cfg?.off || []);
  const now = Date.now();
  const pod = !!PODBORKI[st.cfg?.pod];
  const open = topicsOf(st).filter(t => !isSpent(st, t[0], now) && !off.has(t[0]) && !((st.wait?.[t[0]] || 0) > now - WAIT));
  // В подборке одна группа: правило «группа не два раза подряд» не действует
  let cand = open.filter(t => !lastIds.includes(t[0]) && (pod || t[1] !== lastGroup));
  if (!cand.length) cand = open;
  if (!cand.length) return { topic: null, why: null };

  if (force === 'new' || isExplore(st)) {
    const liked = cand.filter(t => score(st.g, t[1]) > -0.5);
    if (liked.length) cand = liked;
    const minG = Math.min(...cand.map(t => shows(st.g, t[1])));
    cand = cand.filter(t => shows(st.g, t[1]) === minG);
    const minT = Math.min(...cand.map(t => shows(st.t, t[0])));
    return { topic: one(cand.filter(t => shows(st.t, t[0]) === minT), rnd), why: 'new' };
  }

  const w = cand.map(t => Math.exp(2 * score(st.g, t[1]) + score(st.t, t[0])));
  let x = rnd() * w.reduce((a, b) => a + b, 0);
  let topic = cand[cand.length - 1];
  for (let i = 0; i < cand.length; i++) { x -= w[i]; if (x <= 0) { topic = cand[i]; break; } }
  return { topic, why: score(st.g, topic[1]) > 0.25 ? 'like' : 'random' };
}

// Оценка просмотра от -1 до 1. Обычный ролик (long): 3 минуты просмотра уже досмотр.
export function reward({ watched = 0, duration = 0, like, less, long }) {
  if (less) return -1;
  if (like) return 1;
  if (watched < 2.5) return -0.6;
  const full = long && duration > 0 ? Math.min(duration, 180) : duration;
  const part = full > 0 ? Math.min(watched / full, 1) : 0;
  return part >= 0.8 ? 0.7 : +(part - 0.3).toFixed(2);
}

export function learn(st, topicId, r) {
  const t = TOPIC[topicId];
  if (!t) return;
  const up = (o, id, a) => {
    const x = o[id] || (o[id] = { s: 0, k: 0 });
    x.s = +(x.s + a * (r - x.s)).toFixed(3);
  };
  up(st.t, topicId, 0.5);
  up(st.g, t[1], 0.25);
}

function shown(st, topicId, videoId) {
  const g = TOPIC[topicId][1];
  st.n++;
  st.seen[videoId] = 1;
  const keys = Object.keys(st.seen);
  if (keys.length > SEEN_MAX) delete st.seen[keys[0]];
  (st.t[topicId] || (st.t[topicId] = { s: 0, k: 0 })).k++;
  (st.g[g] || (st.g[g] = { s: 0, k: 0 })).k++;
  st.last = [...st.last, topicId].slice(-5);
}

function take(st, id) {
  const pool = st.pools[id] || [];
  while (pool.length) {
    const v = pool.shift();
    if (!st.seen[v.id] && (st.ban?.[v.ch] || 0) < BAN) return v;
  }
  return null;
}

function add(st, id, list, o) {
  const pool = st.pools[id] || (st.pools[id] = []);
  const have = new Set(pool.map(v => v.id));
  for (const v of list) if (!st.seen[v.id] && !have.has(v.id)) { pool.push(v); have.add(v.id); }
  st.orders[id] = o + 1;
}

// Следующий ролик: {v: {id, title, ch}, topic, why} или null, если темы кончились.
// fetchFn(id темы, порядок) → [{id, title, ch}]; ошибка «limit» уходит наверх.
// Лимит YouTube у одной темы: тема ждёт час, лента берёт другую. Лимит у всех попыток: ошибка «limit» наверх.
export async function nextItem(st, fetchFn, force, rnd = Math.random) {
  let limited = 0;
  let empty = 0;
  let pages = 0;
  // Попытка не удалась, только когда выдача пустая (тема кончилась). Тема с лимитом ждёт час и больше не выпадает.
  // Выдача, где всё уже показано: тема листает дальше, это не «темы кончились» (тест «после смены языка»).
  for (let i = 0; empty < 8 && pages < PAGES && i < 120; i++) {
    const { topic, why } = pickTopic(st, rnd, i === 0 ? force : undefined);
    if (!topic) break;
    const id = topic[0];
    let v = take(st, id);
    if (!v && !isSpent(st, id, Date.now())) {
      if (st.spent[id]) { delete st.spent[id]; st.orders[id] = 0; } // сутки прошли: выдачи темы с начала
      const o = st.orders[id] || 0;
      let list;
      try {
        list = await fetchFn(id, o);
      } catch (e) {
        if (e.message !== 'limit') throw e;
        const wait = st.wait || (st.wait = {});
        wait[id] = Date.now();
        // Посредник назвал темы с каналами: остальные темы тоже ждут, лента не перебирает их по одной
        if (e.ready) for (const t of topicsOf(st)) if (!e.ready.includes(t[0]) && !st.pools[t[0]]?.length) wait[t[0]] = Date.now();
        limited++;
        continue;
      }
      add(st, id, list, o);
      if (!list.length) st.spent[id] = Date.now();
      v = take(st, id);
      if (!v) { if (list.length) pages++; else empty++; }
    }
    if (v) { shown(st, id, v.id); return { v, topic, why: force === 'new' && i === 0 ? 'new' : why }; }
  }
  // Темы не кончились, а ждут после лимита: это лимит, а не «темы кончились»
  const now = Date.now();
  if (limited || topicsOf(st).some(t => (st.wait?.[t[0]] || 0) > now - WAIT)) throw new Error('limit');
  return null;
}

// «Меньше»: минус каналу. После BAN минусов ролики канала не показываются.
export function ban(st, ch) {
  if (!ch) return;
  const b = st.ban || (st.ban = {});
  b[ch] = (b[ch] || 0) + 1;
}

// Ролик из очереди не показан (кнопка «Новая тема»): вернуть его в тему
export function putBack(st, item) {
  delete st.seen[item.v.id];
  (st.pools[item.topic[0]] || (st.pools[item.topic[0]] = [])).unshift(item.v);
}

// Настройки, от которых зависят ролики темы. Обычная тема: язык, вид, «Строго». Тема подборки всегда на русском: только вид.
const feedKey = (c, pod) => (pod ? c.fmt || '' : [c.lang || '', c.fmt || '', c.ru ? 1 : 0].join('|'));

// Настройки стали другими: запас, выдачи и ожидание тем, которых это касается, начинаются заново
function drop(st, was, now) {
  for (const k of ['pools', 'orders', 'spent', 'wait']) {
    const o = (st[k] = { ...st[k] });
    for (const id of Object.keys(o)) {
      const pod = !!PODBORKI[TOPIC[id]?.[1]];
      if (feedKey(was, pod) !== feedKey(now, pod)) delete o[id];
    }
  }
}

// Новые настройки. Другой язык, вид или «Строго»: запас роликов и выдачи этих тем начинаются заново.
export function setCfg(st, next) {
  const was = st.cfg || fresh().cfg;
  st.cfg = { ...was, ...next, off: [...new Set(next.off || was.off)], at: Date.now() };
  drop(st, was, st.cfg);
}

// «Начать заново»: лента забывает показанные ролики и оценки, настройки остаются
export function restart(st) {
  const { cfg } = st;
  Object.assign(st, fresh(), { cfg, r: Date.now() });
}

// Память с другого устройства. Свежая запись главнее, показанные ролики складываются.
// «Начать заново» на одном устройстве: его память главнее старой памяти другого.
export function merge(local, cloud) {
  if (!cloud || !cloud.seen) return local;
  const rl = local.r || 0;
  const rc = cloud.r || 0;
  let a = (cloud.at || 0) > (local.at || 0) ? cloud : local;
  if (rl !== rc) a = rl > rc ? local : cloud;
  const b = a === local ? cloud : local;
  const out = { ...fresh(), ...a };
  if (rl === rc) out.seen = { ...b.seen, ...a.seen };
  const cfg = (cloud.cfg?.at || 0) > (local.cfg?.at || 0) ? cloud.cfg : local.cfg;
  if (cfg) { drop(out, out.cfg || fresh().cfg, cfg); out.cfg = cfg; }
  return out;
}

// «Что я смотрю»: группы по показам и оценке, любимые темы
export function stats(st) {
  const groups = GROUP_IDS.map(g => ({ g, k: shows(st.g, g), s: score(st.g, g) }))
    .filter(x => x.k > 0).sort((x, y) => y.s - x.s || y.k - x.k);
  const top = [...TOPICS, ...PTOPICS].map(t => ({ t, k: shows(st.t, t[0]), s: score(st.t, t[0]) }))
    .filter(x => x.k >= 2 && x.s > 0).sort((x, y) => y.s - x.s).slice(0, 5);
  return { n: st.n, groups, top };
}
