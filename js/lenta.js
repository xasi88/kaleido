// Лента: карточки роликов поверх плеера, листание, кнопки, учёба подбора.
// Вид «Меньше и гаснет» (брендбук, журнал 2026-11-08): шапки нет, подписи гаснут через 3 с, касание показывает их снова.
import { NAMES, PODBORKI } from './topics.js?v=3c2ae583';
import * as P from './podbor.js?v=3c2ae583';
import { st, save, pull } from './pamyat.js?v=3c2ae583';
import { fetchTopic } from './api.js?v=3c2ae583';
import * as player from './player.js?v=3c2ae583';
import { ICON } from './icons.js?v=3c2ae583';
import './ustanovka.js?v=3c2ae583';
import * as nastroiki from './nastroiki.js?v=3c2ae583';
import { anyOpen } from './list.js?v=3c2ae583';

window.kaleido = 1; // лента загрузилась (index.html, kaleidoFail)
const AHEAD = 2; // сколько роликов держать готовыми впереди
const HIDE = 3000; // подписи гаснут через 3 с
const feed = document.getElementById('feed');
const hint = document.getElementById('hint');
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
const items = [];
let cur = -1;
let stopped = false;
let wantNew = false;
let filling = Promise.resolve();
let hideT = 0;

const WHY = {
  new: () => 'Новая тема',
  like: g => 'Вам нравится: ' + NAMES[g].toLowerCase(),
  random: () => 'Случайная тема',
};
const STOP = {
  limit: 'Лимит YouTube на сегодня кончился. Лента вернётся завтра.',
  limitRu: 'Русских роликов сейчас нет: лимит YouTube. Выключите «Строго» в настройках, раздел «Язык роликов», или зайдите завтра.',
  net: 'Нет связи с YouTube. Проверьте VPN и обновите страницу.',
  empty: 'Темы кончились или выключены. Включите темы или выберите другой язык в настройках.',
  pod: p => `В подборке «${PODBORKI[p]}» пока нет роликов.`,
  podLimit: p => `В подборке «${PODBORKI[p]}» сейчас нет роликов: лимит YouTube. Загляните позже.`,
};
// Подборки слева (просьба автора 2026-11-08): подпись под кнопкой и значок
const POD = { islam: 'Ислам', ai: 'AI', fun: 'Развлечения' };
const pods = () => Object.keys(PODBORKI).map(p => `<button class="act pod${st.cfg.pod === p ? ' on' : ''}" data-a="pod" data-p="${p}" aria-pressed="${st.cfg.pod === p}" aria-label="Подборка ${PODBORKI[p]}"><i>${ICON[p]}</i>${POD[p]}</button>`).join('');

hint.innerHTML = ICON.sound + 'Звук: коснитесь экрана';

// Широкий экран (Surface, планшет лёжа): поля сбоку от ролика 9:16 от 240 точек, подписи встают в левое поле
const wide = () => document.documentElement.classList.toggle('wide', innerWidth - innerHeight * 9 / 16 >= 480);
wide();
addEventListener('resize', wide);

function slide(it) {
  const g = it.topic[1];
  const el = document.createElement('section');
  el.className = 'slide' + (it.v.l ? ' l' : '');
  el.style.setProperty('--c', `var(--${P.color(g)})`);
  el.style.setProperty('--c2', `var(--${P.color(g, 1)})`);
  // Картинка до начала ролика: короткий 4:3 обрезается по экрану, обычный 16:9 целиком
  const pic = it.v.l ? 'mqdefault' : 'hqdefault';
  const out = it.v.l ? 'watch?v=' : 'shorts/';
  el.innerHTML = `
    <div class="thumb" style="background-image:url(https://i.ytimg.com/vi/${it.v.id}/${pic}.jpg)"></div>
    <div class="shade"></div>
    <div class="pp">${ICON.play}</div>
    <div class="side pods">${pods()}</div>
    <div class="side">
      <button class="act" data-a="nastr"><i>${ICON.gear}</i>Настройки</button>
      <button class="act" data-a="like"><i>${ICON.heart}</i>Ещё такое</button>
      <button class="act" data-a="less"><i>${ICON.less}</i>Меньше</button>
      <button class="act" data-a="new"><i>${ICON.dice}</i>Новая тема</button>
      <a class="act" data-a="out" href="https://www.youtube.com/${out}${it.v.id}" target="_blank" rel="noopener"><i>${ICON.out}</i>В YouTube</a>
    </div>
    <div class="info">
      <p class="ttl"></p><p class="why"></p>
      <p class="line"><span class="chip g"></span><span class="chip t"></span><span class="ch"></span></p>
    </div>
    <div class="bar"><i></i></div>`;
  el.querySelector('.chip.g').textContent = NAMES[g];
  el.querySelector('.chip.t').textContent = it.topic[2];
  el.querySelector('.ttl').textContent = it.v.title;
  el.querySelector('.ch').textContent = it.v.ch;
  el.querySelector('.why').textContent = WHY[it.why](g);
  return el;
}

function stop(kind) {
  stopped = true;
  document.querySelector('.wait')?.remove();
  const el = document.createElement('section');
  el.className = 'slide msg';
  el.innerHTML = '<p></p>';
  const pod = PODBORKI[st.cfg.pod] ? st.cfg.pod : '';
  el.querySelector('p').textContent = pod && kind !== 'net' ? STOP[kind.startsWith('limit') ? 'podLimit' : 'pod'](pod) : STOP[kind];
  // Выход в настройки есть всегда: без него «лимит» с фильтром «только на русском» запирал ленту (автор 2026-11-08)
  const btn = (text, cls, fn) => {
    const b = document.createElement('button');
    b.className = cls;
    b.textContent = text;
    b.onclick = fn;
    el.append(b);
  };
  const reload = () => location.reload();
  // В подборке выход всегда один: обычная лента
  if (pod) { btn('Обычная лента', 'main', () => setPod('')); btn('Обновить', 'sec', reload); feed.append(el); return; }
  if (kind === 'empty' || kind === 'limitRu') btn('Настройки', 'main', nastroiki.open);
  else btn('Обновить', 'main', reload);
  if (kind === 'limitRu') btn('Обновить', 'sec', reload);
  if (kind === 'limit' || kind === 'net') btn('Настройки', 'sec', nastroiki.open);
  feed.append(el);
}

// Следующий ролик в запасной плеер, когда текущий уже играет
function warm() {
  const n = items[cur + 1];
  if (n && items[cur]?.el.classList.contains('live')) player.preload(n.v.id, n.v.l);
}

async function run() {
  try {
    while (!stopped && items.length - 1 - Math.max(cur, 0) < AHEAD) {
      const it = await P.nextItem(st, (id, o) => fetchTopic(id, o, st.cfg), wantNew ? 'new' : undefined);
      wantNew = false;
      save();
      if (!it) { stop('empty'); break; }
      it.el = slide(it);
      items.push(it);
      feed.append(it.el);
      watch.observe(it.el);
      document.querySelector('.wait')?.remove();
    }
  } catch (e) {
    stop(e.message !== 'limit' ? 'net' : st.cfg.ru ? 'limitRu' : 'limit');
  }
  warm();
}

function fill() {
  filling = filling.then(run);
  return filling;
}

// Подписи: видны 3 с, потом гаснут. На паузе видны всегда.
function show(it) {
  if (!it) return;
  it.el.classList.remove('calm');
  clearTimeout(hideT);
  hideT = setTimeout(() => { if (!it.el.classList.contains('paused')) it.el.classList.add('calm'); }, HIDE);
}

function leave() {
  const it = items[cur];
  if (!it) return;
  if (!it.done && !it.rated && !it.less && !it.bad) {
    P.learn(st, it.topic[0], P.reward({ watched: player.watched(), duration: player.duration(), long: it.v.l }));
  }
  it.done = true;
  it.el.classList.remove('live', 'paused');
  save();
}

function activate(i) {
  if (i === cur) return;
  leave();
  cur = i;
  const it = items[i];
  show(it);
  player.play(it.v.id, () => { it.el.classList.add('live'); warm(); }, it.v.l);
  fill();
}

const watch = new IntersectionObserver(es => {
  for (const e of es) {
    if (!e.isIntersecting) continue;
    const i = items.findIndex(x => x.el === e.target);
    if (i >= 0) activate(i);
  }
}, { threshold: 0.6 });

const go = i => items[i]?.el.scrollIntoView({ behavior: calm ? 'auto' : 'smooth' });

// Ролик не играет (запрещён вне YouTube, удалён, молчит 10 с): сразу следующий, тема без минуса
player.onFail(id => {
  const it = items[cur];
  if (it && it.v.id === id && !it.bad) { it.bad = true; go(cur + 1); }
});
// Обычный ролик кончился: следующий
player.onEnded(() => go(cur + 1));

// Убрать ролики, которые ждут впереди: они вернутся в запас своих тем
function dropAhead() {
  for (const it of items.splice(cur + 1)) { P.putBack(st, it); watch.unobserve(it.el); it.el.remove(); }
}

// Новые настройки (лист «Настройки» или кнопки подборок): ролик на экране остаётся, следующие уже по новым настройкам.
// Подборка стала другой: лента сразу листает к её первому ролику.
async function apply(next) {
  await filling;
  dropAhead();
  const was = st.cfg.pod;
  P.setCfg(st, next);
  save(true);
  const p = st.cfg.pod;
  for (const b of feed.querySelectorAll('.act.pod')) {
    b.classList.toggle('on', b.dataset.p === p);
    b.setAttribute('aria-pressed', String(b.dataset.p === p));
  }
  for (const m of feed.querySelectorAll('.slide.msg')) m.remove();
  stopped = false;
  if (p !== was) wantNew = true;
  await fill();
  if (cur < 0 && items[0]) activate(0); else if (p !== was) go(cur + 1);
}

// Подборка (кнопки слева): нажали: лента идёт в подборку, ещё раз: обычная лента
const setPod = p => apply({ pod: p });
addEventListener('kaleido:cfg', e => apply(e.detail));

async function newTopic() {
  await filling;
  dropAhead();
  wantNew = true;
  await fill();
  go(cur + 1);
}

function sound() {
  if (!player.isMuted()) return false;
  player.unmute();
  hint.hidden = true;
  return true;
}

hint.addEventListener('click', sound);

// Касание ролика: подписи погасли или звук ещё не включён, сначала они. Иначе пауза.
function tap() {
  const it = items[cur];
  const first = sound();
  if (!it) return;
  if (first || it.el.classList.contains('calm')) { show(it); return; }
  const on = player.toggle();
  it.el.classList.toggle('paused', !on);
  if (on) show(it); else clearTimeout(hideT);
}

feed.addEventListener('click', e => {
  const b = e.target.closest('[data-a]');
  if (!b) { if (!e.target.closest('.msg')) tap(); return; }
  sound();
  const own = items.find(x => x.el.contains(b));
  const a = b.dataset.a;
  if (a === 'nastr') nastroiki.open();
  // «Ещё такое»: плюс теме один раз. Сняли и нажали снова: второго плюса нет, досмотр тоже не считается.
  if (a === 'like') {
    own.like = !own.like;
    b.classList.toggle('on', own.like);
    if (own.like && !own.rated) { own.rated = true; P.learn(st, own.topic[0], 1); save(); }
  }
  if (a === 'less') { own.less = true; P.learn(st, own.topic[0], -1); P.ban(st, own.v.ch); save(); go(cur + 1); }
  if (a === 'new') newTopic();
  if (a === 'pod') setPod(st.cfg.pod === b.dataset.p ? '' : b.dataset.p);
  if (a === 'out') player.pause();
});

addEventListener('keydown', e => {
  if (anyOpen()) return;
  if (e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); go(cur + 1); }
  if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); go(cur - 1); }
  if (e.key === ' ' && items[cur]) { e.preventDefault(); tap(); }
});

document.addEventListener('visibilitychange', () => { if (document.hidden) player.pause(); });

setInterval(() => {
  if (document.hidden) return;
  const bar = items[cur]?.el.querySelector('.bar i');
  if (bar) bar.style.transform = `scaleX(${player.progress()})`;
}, 250);

// Память с другого устройства. Облако молчит дольше 1,5 с: лента начинает с памятью устройства, облако догонит.
await Promise.race([pull(), new Promise(r => setTimeout(r, 1500))]);
fill();
