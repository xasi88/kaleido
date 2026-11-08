// Память ленты: что показано, что нравится, настройки. Лежит на устройстве и в облаке (oblako.js).
// Без памяти устройства (частный режим) лента тоже работает.
import { fresh, merge } from './podbor.js?v=3e4e8503';
import * as cloud from './oblako.js?v=3e4e8503';

const KEY = 'kaleido.v1';
const EVERY = 60000; // в облако не чаще раза в минуту: лимит записей Cloudflare KV
let timer = 0;

function read() {
  try {
    const st = JSON.parse(localStorage.getItem(KEY));
    if (st && st.seen) return { ...fresh(), ...st, cfg: { ...fresh().cfg, ...st.cfg } };
  } catch (e) { /* пустая память */ }
  return fresh();
}

export const st = read();

function local() {
  try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* память закрыта или полна */ }
}

function take(c) {
  const m = merge(st, c);
  for (const k of Object.keys(st)) delete st[k];
  Object.assign(st, m);
  local();
}

// Облако: сначала взять память другого устройства, потом записать общую
async function push() {
  clearTimeout(timer);
  timer = 0;
  const c = await cloud.pull();
  if (c === undefined) return false;
  if (c) take(c);
  return cloud.push(st);
}

// now: сразу в облако (настройки, «Начать заново»), иначе раз в минуту
export function save(now) {
  st.at = Date.now();
  local();
  if (!cloud.on()) return Promise.resolve(false);
  if (now) return push();
  if (!timer) timer = setTimeout(push, EVERY);
  return Promise.resolve(true);
}

// Начало работы: память из облака. Облако пустое: положить туда память устройства.
export async function pull() {
  const c = await cloud.pull();
  if (c) take(c);
  if (c === null) await cloud.push(st);
}

// Лента ушла с экрана: несохранённое сразу в облако
document.addEventListener('visibilitychange', () => { if (document.hidden && timer) push(); });
