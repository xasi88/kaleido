// Облако: память ленты в Cloudflare (посредник, адрес /sync), общая для Surface и планшета.
// Ключ облака приходит один раз секретной ссылкой ...#kod=<код> и живёт в памяти устройства.
// Без ключа или без связи лента работает только с памятью устройства.
import { API } from './api.js?v=3c2ae583';

const KEY = 'kaleido.kod';
let kod = '';
try { kod = localStorage.getItem(KEY) || ''; } catch (e) { /* память закрыта */ }

const m = location.hash.match(/kod=([\w-]{16,64})/);
if (m) {
  kod = m[1];
  try { localStorage.setItem(KEY, kod); } catch (e) { /* память закрыта */ }
  history.replaceState(null, '', location.pathname + location.search); // код не остаётся в адресе
}

// at: время последнего обмена с облаком, err: '' | 'kod' (код не подошёл) | 'net' (нет связи)
export const status = { at: 0, err: '' };
export const on = () => !!kod && status.err !== 'kod';
export const link = () => location.origin + location.pathname + '#kod=' + kod;

async function call(opt) {
  try {
    const r = await fetch(API + 'sync', { ...opt, headers: { 'x-kod': kod, ...(opt.headers || {}) } });
    if (!r.ok) { status.err = r.status === 401 ? 'kod' : 'net'; return undefined; }
    status.err = '';
    status.at = Date.now();
    return await r.json();
  } catch (e) {
    status.err = 'net';
    return undefined;
  }
}

// Память из облака: объект, null (облако пустое) или undefined (ошибка)
export async function pull() {
  if (!on()) return undefined;
  return call({ signal: AbortSignal.timeout(8000) });
}

export async function push(st) {
  if (!on()) return false;
  const body = JSON.stringify(st);
  const r = await call({ method: 'PUT', headers: { 'content-type': 'application/json' }, body, keepalive: body.length < 60000 });
  return !!r;
}
