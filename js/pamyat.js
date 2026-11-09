// Память ленты: что показано, что нравится, настройки. Лежит на устройстве и в облаке (oblako.js).
// Без памяти устройства (частный режим) лента тоже работает.
import { fresh, merge } from './podbor.js?v=16a2ce29';
import * as cloud from './oblako.js?v=16a2ce29';

const KEY = 'kaleido.v1';
const EVERY = 60000; // в облако не чаще раза в минуту: лимит записей Cloudflare KV
let timer = 0;
let dirty = false;
// Память устройства пишется в паузу, а не во время листания: вся память до 200 КБ, запись на телефоне даёт рывок (версия 0.8)
const later = window.requestIdleCallback ? f => requestIdleCallback(f, { timeout: 2000 }) : f => setTimeout(f, 500);

function read() {
  try {
    const st = JSON.parse(localStorage.getItem(KEY));
    if (st && st.seen) return { ...fresh(), ...st, cfg: { ...fresh().cfg, ...st.cfg } };
  } catch (e) { /* пустая память */ }
  return fresh();
}

export const st = read();

function local() {
  dirty = false;
  try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* память закрыта или полна */ }
}
const flush = () => { if (dirty) local(); };

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

// now: сразу на устройство и в облако (настройки, «Начать заново»). Иначе на устройство в паузу, в облако раз в минуту.
export function save(now) {
  st.at = Date.now();
  if (now) local();
  else if (!dirty) { dirty = true; later(flush); }
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

// Лента ушла с экрана: несохранённое сразу на устройство и в облако
document.addEventListener('visibilitychange', () => { if (!document.hidden) return; flush(); if (timer) push(); });
addEventListener('pagehide', flush);
