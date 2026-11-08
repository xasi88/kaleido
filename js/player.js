// Один плеер YouTube на весь экран под лентой. Лента едет поверх, плеер меняет ролик.
// Плеер не меняем: реклама и надписи YouTube остаются.
let yt = null;
let ready = false;
let want = null;
let onPlay = null;
let loops = 0;
let muted = true;

window.onYouTubeIframeAPIReady = () => {
  yt = new window.YT.Player('player', {
    width: '100%',
    height: '100%',
    playerVars: {
      autoplay: 1, controls: 0, playsinline: 1, rel: 0, fs: 0,
      disablekb: 1, iv_load_policy: 3, mute: 1, origin: location.origin,
    },
    events: { onReady, onStateChange, onError },
  });
};
const s = document.createElement('script');
s.src = 'https://www.youtube.com/iframe_api';
document.head.append(s);

function onReady() {
  ready = true;
  if (want) start(want);
}

// Ролик не играет вне YouTube или удалён (ошибки 100, 101, 150): лента его пропускает
let onBad = null;
export const onFail = cb => { onBad = cb; };
function onError() { if (onBad && want) onBad(want); }

function onStateChange(e) {
  const S = window.YT.PlayerState;
  if (e.data === S.PLAYING && onPlay) { onPlay(); onPlay = null; }
  if (e.data === S.ENDED) { loops++; yt.seekTo(0); yt.playVideo(); }
}

function start(id) {
  yt.loadVideoById(id);
  if (muted) yt.mute(); else yt.unMute();
}

export function play(id, cb) {
  want = id;
  onPlay = cb;
  loops = 0;
  if (ready) start(id);
}

// true: играет, false: пауза
export function toggle() {
  if (!ready) return true;
  if (yt.getPlayerState() === window.YT.PlayerState.PLAYING) { yt.pauseVideo(); return false; }
  yt.playVideo();
  return true;
}

export function pause() { if (ready) yt.pauseVideo(); }

export function unmute() {
  muted = false;
  if (ready) { yt.unMute(); yt.setVolume(100); }
}

export const isMuted = () => muted;
export const duration = () => (ready ? yt.getDuration() || 0 : 0);
export const watched = () => (ready ? loops * duration() + (yt.getCurrentTime() || 0) : 0);
export const progress = () => { const d = duration(); return d ? Math.min((yt.getCurrentTime() || 0) / d, 1) : 0; };
