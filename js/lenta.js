// Лента: карточки роликов поверх плеера, листание, кнопки, учёба подбора.
import { GROUPS } from './topics.js?v=82c3da53';
import * as P from './podbor.js?v=82c3da53';
import { load, save } from './pamyat.js?v=82c3da53';
import { fetchTopic } from './api.js?v=82c3da53';
import * as player from './player.js?v=82c3da53';
import { ICON } from './icons.js?v=82c3da53';
import './novoe.js?v=82c3da53';

const AHEAD = 2; // сколько роликов держать готовыми впереди
const st = load();
const feed = document.getElementById('feed');
const hint = document.getElementById('hint');
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
const items = [];
let cur = -1;
let stopped = false;
let wantNew = false;
let filling = Promise.resolve();

const WHY = {
  new: () => 'Новая тема',
  like: g => 'Вам нравится: ' + GROUPS[g].toLowerCase(),
  random: () => 'Случайная тема',
};
const STOP = {
  limit: 'Лимит YouTube на сегодня кончился. Лента вернётся завтра.',
  net: 'Нет связи с YouTube. Проверьте VPN и обновите страницу.',
  empty: 'Вы посмотрели все темы. Новые темы придут с новой версией.',
};

hint.innerHTML = ICON.sound + 'Звук: коснитесь экрана';

function slide(it) {
  const g = it.topic[1];
  const el = document.createElement('section');
  el.className = 'slide';
  el.style.setProperty('--c', `var(--${P.color(g)})`);
  el.style.setProperty('--c2', `var(--${P.color(g, 1)})`);
  el.innerHTML = `
    <div class="thumb" style="background-image:url(https://i.ytimg.com/vi/${it.v.id}/hqdefault.jpg)"></div>
    <div class="shade"></div>
    <div class="pp">${ICON.play}</div>
    <div class="side">
      <button class="act" data-a="like"><i>${ICON.heart}</i>Ещё такое</button>
      <button class="act" data-a="less"><i>${ICON.less}</i>Меньше</button>
      <button class="act" data-a="new"><i>${ICON.dice}</i>Новая тема</button>
      <a class="act" data-a="out" href="https://www.youtube.com/shorts/${it.v.id}" target="_blank" rel="noopener"><i>${ICON.out}</i>В YouTube</a>
    </div>
    <div class="info">
      <div class="chips"><span class="chip"></span><span class="chip"></span></div>
      <p class="ttl"></p><p class="ch"></p><p class="why"></p>
    </div>
    <div class="bar"><i></i></div>`;
  const [c1, c2] = el.querySelectorAll('.chip');
  c1.textContent = GROUPS[g];
  c2.textContent = it.topic[2];
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
  el.innerHTML = '<p></p><button class="main">Обновить</button>';
  el.querySelector('p').textContent = STOP[kind];
  el.querySelector('button').onclick = () => location.reload();
  feed.append(el);
}

async function run() {
  try {
    while (!stopped && items.length - 1 - Math.max(cur, 0) < AHEAD) {
      const it = await P.nextItem(st, fetchTopic, wantNew ? 'new' : undefined);
      wantNew = false;
      save(st);
      if (!it) { stop('empty'); break; }
      it.el = slide(it);
      items.push(it);
      feed.append(it.el);
      watch.observe(it.el);
      document.querySelector('.wait')?.remove();
    }
  } catch (e) {
    stop(e.message === 'limit' ? 'limit' : 'net');
  }
}

function fill() {
  filling = filling.then(run);
  return filling;
}

function leave() {
  const it = items[cur];
  if (!it) return;
  if (!it.done && !it.like && !it.less) {
    P.learn(st, it.topic[0], P.reward({ watched: player.watched(), duration: player.duration() }));
  }
  it.done = true;
  it.el.classList.remove('live', 'paused');
  save(st);
}

function activate(i) {
  if (i === cur) return;
  leave();
  cur = i;
  const it = items[i];
  player.play(it.v.id, () => it.el.classList.add('live'));
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

async function newTopic() {
  await filling;
  for (const it of items.splice(cur + 1)) { P.putBack(st, it); watch.unobserve(it.el); it.el.remove(); }
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

feed.addEventListener('click', e => {
  const b = e.target.closest('[data-a]');
  const first = sound();
  const it = items[cur];
  if (!b) {
    if (it && !first && !e.target.closest('.msg')) it.el.classList.toggle('paused', !player.toggle());
    return;
  }
  const own = items.find(x => x.el.contains(b));
  const a = b.dataset.a;
  if (a === 'like') {
    own.like = !own.like;
    b.classList.toggle('on', own.like);
    if (own.like) { P.learn(st, own.topic[0], 1); save(st); }
  }
  if (a === 'less') { own.less = true; P.learn(st, own.topic[0], -1); save(st); go(cur + 1); }
  if (a === 'new') newTopic();
  if (a === 'out') player.pause();
});

addEventListener('keydown', e => {
  if (e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); go(cur + 1); }
  if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); go(cur - 1); }
  if (e.key === ' ' && items[cur]) { e.preventDefault(); sound() || items[cur].el.classList.toggle('paused', !player.toggle()); }
});

document.addEventListener('visibilitychange', () => { if (document.hidden) player.pause(); });

setInterval(() => {
  const bar = items[cur]?.el.querySelector('.bar i');
  if (bar) bar.style.transform = `scaleX(${player.progress()})`;
}, 250);

fill();
