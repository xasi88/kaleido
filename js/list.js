// Нижний лист (css/list.css): «Настройки» и «Что нового». Один порядок для обоих листов.
// Фон и кнопки data-close закрывают лист, Escape закрывает верхний. before: что сделать перед закрытием.
const stack = [];

export function sheet(el, before) {
  const s = {
    open() {
      if (!stack.includes(s)) stack.push(s);
      el.hidden = false;
      requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('open')));
    },
    close() {
      const i = stack.indexOf(s);
      if (i < 0) return;
      stack.splice(i, 1);
      if (before) before();
      el.classList.remove('open');
      setTimeout(() => { if (!stack.includes(s)) el.hidden = true; }, 250);
    },
  };
  el.addEventListener('click', e => { if (e.target.closest('[data-close]')) s.close(); });
  return s;
}

// Открыт хотя бы один лист: клавиши листания ленты молчат (lenta.js)
export const anyOpen = () => stack.length > 0;

addEventListener('keydown', e => { if (e.key === 'Escape' && stack.length) stack[stack.length - 1].close(); });
