// Подбор ролика: какая тема следующая, без повторов, учёба на досмотрах.
// Без DOM и без памяти телефона: всё состояние в объекте st (его хранит pamyat.js). Тесты: tests/podbor.test.mjs.
import { TOPICS, TOPIC, GROUPS } from './topics.js?v=554576d3';

export const EXPLORE_EVERY = 3; // каждый третий ролик из новой темы
export const ORDERS = 4;        // сколько разных выдач у одной темы (порядок в worker/src/index.js)
const SEEN_MAX = 5000;
const GROUP_IDS = Object.keys(GROUPS);

// Цвет группы по кругу из шести цветов брендбука: 't1'...'t6'
export const color = (g, shift = 0) => 't' + ((GROUP_IDS.indexOf(g) + shift) % 6 + 1);

export const fresh = () => ({ n: 0, seen: {}, g: {}, t: {}, pools: {}, orders: {}, spent: {}, last: [] });

const score = (o, id) => (o[id] ? o[id].s : 0);
const shows = (o, id) => (o[id] ? o[id].k : 0);
const one = (list, rnd) => list[Math.floor(rnd() * list.length)];

export const isExplore = st => st.n % EXPLORE_EVERY === EXPLORE_EVERY - 1;

export function pickTopic(st, rnd = Math.random, force) {
  const lastIds = st.last.slice(-3);
  const lastGroup = st.last.length ? TOPIC[st.last[st.last.length - 1]]?.[1] : null;
  let cand = TOPICS.filter(t => !st.spent[t[0]] && !lastIds.includes(t[0]) && t[1] !== lastGroup);
  if (!cand.length) cand = TOPICS.filter(t => !st.spent[t[0]]);
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

// Оценка просмотра от -1 до 1
export function reward({ watched = 0, duration = 0, like, less }) {
  if (less) return -1;
  if (like) return 1;
  if (watched < 2.5) return -0.6;
  const part = duration > 0 ? Math.min(watched / duration, 1) : 0;
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
    if (!st.seen[v.id]) return v;
  }
  if ((st.orders[id] || 0) >= ORDERS) st.spent[id] = 1;
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
export async function nextItem(st, fetchFn, force, rnd = Math.random) {
  for (let i = 0; i < 8; i++) {
    const { topic, why } = pickTopic(st, rnd, i === 0 ? force : undefined);
    if (!topic) return null;
    const id = topic[0];
    let v = take(st, id);
    if (!v && !st.spent[id]) {
      const o = st.orders[id] || 0;
      add(st, id, await fetchFn(id, o), o);
      v = take(st, id);
    }
    if (v) { shown(st, id, v.id); return { v, topic, why: force === 'new' && i === 0 ? 'new' : why }; }
  }
  return null;
}

// Ролик из очереди не показан (кнопка «Новая тема»): вернуть его в тему
export function putBack(st, item) {
  delete st.seen[item.v.id];
  (st.pools[item.topic[0]] || (st.pools[item.topic[0]] = [])).unshift(item.v);
}
