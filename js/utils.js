/**
 * utils.js — shared helpers used by all other modules.
 */
const Utils = {
  formatPrice(n) { return '₹' + Number(n).toLocaleString('en-IN'); },

  uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); },

  debounce(fn, ms = 300) {
    let t;
    return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  },

  toast(msg, dur = 2600) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), dur);
  },

  storageGet(k, fb = null) {
    try { const v = localStorage.getItem(k); return v !== null ? JSON.parse(v) : fb; }
    catch { return fb; }
  },

  storageSet(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch {}
  },

  /** Navigate to the detail page for a given product id. */
  goToDetail(productId) {
    const p = ProductManager.getById(productId);
    if (p) DetailPage.show(p);
  },
};
