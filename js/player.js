// Два плеера YouTube на весь экран под лентой. Один играет, второй заранее грузит следующий ролик без звука и ждёт на паузе.
// Листание: плееры меняются местами, ролик идёт сразу. Замер 2026-11-08: с одним плеером ролик ждали 3,3-3,5 с (docs/zamer).
// Плеер не меняем: реклама и надписи YouTube остаются.
const VARS = { autoplay: 1, controls: 0, playsinline: 1, rel: 0, fs: 0, disablekb: 1, iv_load_policy: 3, mute: 1, origin: location.origin };
const WAIT = 10000; // ролик не пошёл за 10 с и молчит: лента его пропускает, а не стоит

const P = [...document.querySelectorAll('.player-box')].map(box => ({ box, yt: null, ready: false, id: '', long: false, state: -1, loops: 0, bad: false, warm: false }));
let cur = P[0];
let muted = true;
let onPlay = null;
let onBad = null;
let onEnd = null;
let timer = 0;
const other = () => (cur === P[0] ? P[1] : P[0]);
cur.box.classList.add('on');

// Плеер создаётся, когда нужен: второй только для запаса, после первого заигравшего ролика.
// Так на старте YouTube грузится один раз, а не два одновременно.
let api = false;
function make(p) {
  if (p.yt || !api) return;
  p.yt = new window.YT.Player(p.box.firstElementChild, {
    width: '100%',
    height: '100%',
    playerVars: VARS,
    events: { onReady: () => { p.ready = true; if (p.id) start(p); }, onStateChange: e => change(p, e.data), onError: () => fail(p) },
  });
}
window.onYouTubeIframeAPIReady = () => {
  api = true;
  for (const p of P) if (p === cur || p.id) make(p);
};
const s = document.createElement('script');
s.src = 'https://www.youtube.com/iframe_api';
document.head.append(s);

// Ролик в плеер p. Запасной плеер грузит без звука.
function start(p) {
  p.state = -1;
  p.loops = 0;
  p.bad = false;
  p.warm = false;
  p.yt.mute();
  p.yt.loadVideoById(p.id);
  if (p === cur && !muted) { p.yt.unMute(); p.yt.setVolume(100); }
}

function put(p, id, long) {
  p.id = id;
  p.long = !!long;
  p.box.classList.toggle('l', p.long); // обычный ролик 16:9: плеер во всю ширину
  if (p.ready) start(p); else make(p);
}

function change(p, st) {
  const S = window.YT.PlayerState;
  p.state = st;
  if (st === S.PLAYING) {
    if (p !== cur) { p.yt.pauseVideo(); p.warm = true; return; } // запас готов: стоит на паузе в начале
    clearTimeout(timer);
    if (onPlay) { const f = onPlay; onPlay = null; f(); }
  }
  if (st === S.ENDED && p === cur) {
    if (p.long && onEnd) onEnd(); // обычный ролик кончился: следующий
    else { p.loops++; p.yt.seekTo(0); p.yt.playVideo(); } // короткий идёт по кругу
  }
}

// Ролик не играет вне YouTube или удалён (ошибки 100, 101, 150): лента его пропускает
function fail(p) {
  p.bad = true;
  if (p === cur && onBad) { clearTimeout(timer); onBad(p.id); }
}

export const onFail = cb => { onBad = cb; };
export const onEnded = cb => { onEnd = cb; };

// Ролик на экран. cb: ролик пошёл. Запасной плеер уже держит этот ролик: плееры меняются местами.
export function play(id, cb, long) {
  onPlay = cb;
  clearTimeout(timer);
  const o = other();
  if (o.id === id && o.long === !!long) {
    if (cur.ready) { cur.yt.pauseVideo(); cur.yt.mute(); }
    cur.box.classList.remove('on');
    cur = o;
    cur.box.classList.add('on');
    if (cur.bad) { fail(cur); return; }
    if (cur.ready) {
      if (!muted) { cur.yt.unMute(); cur.yt.setVolume(100); }
      if (cur.warm) { cur.yt.seekTo(0, true); cur.yt.playVideo(); }
    }
  } else {
    put(cur, id, long);
  }
  // Сторож: YouTube загружен, а ролик молчит. Без YouTube (нет VPN) лента не листает сама.
  timer = setTimeout(() => { if (cur.ready && cur.id === id && cur.state !== window.YT.PlayerState.PLAYING) fail(cur); }, WAIT);
}

// Следующий ролик в запасной плеер. Звать, когда текущий уже играет: запас не мешает ему грузиться.
export function preload(id, long) {
  const o = other();
  if (id && (o.id !== id || o.long !== !!long)) put(o, id, long);
}

// true: играет, false: пауза
export function toggle() {
  if (!cur.ready) return true;
  if (cur.yt.getPlayerState() === window.YT.PlayerState.PLAYING) { cur.yt.pauseVideo(); return false; }
  cur.yt.playVideo();
  return true;
}

export function pause() { if (cur.ready) cur.yt.pauseVideo(); }

export function unmute() {
  muted = false;
  if (cur.ready) { cur.yt.unMute(); cur.yt.setVolume(100); }
}

export const isMuted = () => muted;
export const duration = () => (cur.ready ? cur.yt.getDuration() || 0 : 0);
export const watched = () => (cur.ready ? cur.loops * duration() + (cur.yt.getCurrentTime() || 0) : 0);
export const progress = () => { const d = duration(); return d ? Math.min((cur.yt.getCurrentTime() || 0) / d, 1) : 0; };
