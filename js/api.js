// Запрос к посреднику kaleido-api (worker/). Ключа YouTube здесь нет: он только в посреднике.
export const API = 'https://kaleido-api.gmarbigm.workers.dev/';

import { TOPIC, PODBORKI } from './topics.js?v=16a2ce29';

// cfg: язык из настроек (strany.js), пусто: любой. fmt: вид роликов, ru: «Строго», только на русском (worker/src/russkij.js)
// Тема подборки (topics.js, PODBORKI): всегда только на русском. Страны нет с версии 0.8: лента со всего мира.
export async function fetchTopic(id, o, cfg = {}) {
  const pod = !!PODBORKI[TOPIC[id]?.[1]];
  const q = new URLSearchParams({ t: id, o });
  if (cfg.lang) q.set('l', cfg.lang);
  if (cfg.fmt) q.set('f', cfg.fmt);
  if (cfg.ru || pod) { q.set('l', 'ru'); q.set('s', '1'); }
  let r;
  try { r = await fetch(API + '?' + q); } catch (e) { throw new Error('net'); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const e = new Error(j.err === 'limit' ? 'limit' : 'net');
    if (Array.isArray(j.ready)) e.ready = j.ready.filter(x => typeof x === 'string'); // темы, где каналы уже есть
    throw e;
  }
  return (j.v || [])
    .filter(([vid]) => /^[\w-]{11}$/.test(vid))
    .map(([vid, title, ch, l]) => (l ? { id: vid, title, ch, l: 1 } : { id: vid, title, ch })); // l: обычный ролик 16:9
}
