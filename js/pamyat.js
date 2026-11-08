// Память телефона: что показано и что нравится. Без памяти (частный режим) лента тоже работает.
import { fresh } from './podbor.js?v=82c3da53';

const KEY = 'kaleido.v1';

export function load() {
  try {
    const st = JSON.parse(localStorage.getItem(KEY));
    if (st && st.seen) return { ...fresh(), ...st };
  } catch (e) { /* пустая память */ }
  return fresh();
}

export function save(st) {
  try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* память закрыта или полна */ }
}
