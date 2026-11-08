// Запрос к посреднику kaleido-api (worker/). Ключа YouTube здесь нет: он только в посреднике.
export const API = 'https://kaleido-api.gmarbigm.workers.dev/';

export async function fetchTopic(id, o) {
  let r;
  try { r = await fetch(`${API}?t=${encodeURIComponent(id)}&o=${o}`); } catch (e) { throw new Error('net'); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.err === 'limit' ? 'limit' : 'net');
  return (j.v || [])
    .filter(([vid]) => /^[\w-]{11}$/.test(vid))
    .map(([vid, title, ch]) => ({ id: vid, title, ch }));
}
