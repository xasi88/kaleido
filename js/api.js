// Запрос к посреднику kaleido-api (worker/). Ключа YouTube здесь нет: он только в посреднике.
export const API = 'https://kaleido-api.gmarbigm.workers.dev/';

// cfg: язык и страна из настроек (strany.js), пусто: весь мир
export async function fetchTopic(id, o, cfg = {}) {
  const q = new URLSearchParams({ t: id, o });
  if (cfg.lang) q.set('l', cfg.lang);
  if (cfg.reg) q.set('r', cfg.reg);
  let r;
  try { r = await fetch(API + '?' + q); } catch (e) { throw new Error('net'); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.err === 'limit' ? 'limit' : 'net');
  return (j.v || [])
    .filter(([vid]) => /^[\w-]{11}$/.test(vid))
    .map(([vid, title, ch]) => ({ id: vid, title, ch }));
}
