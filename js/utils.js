/**
 * utils.js
 * Shared utility helpers used across all modules.
 */

// eslint-disable-next-line no-unused-vars
const Utils = {
  /**
   * Debounce a function.
   * @param {Function} fn
   * @param {number} delay
   * @returns {Function}
   */
  debounce(fn, delay = 300) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  },

  /**
   * Format a number as Indian rupee string.
   * @param {number} amount
   * @returns {string}
   */
  formatPrice(amount) {
    return '₹' + Number(amount).toLocaleString('en-IN');
  },

  /**
   * Generate a short unique ID.
   * @returns {string}
   */
  uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  },

  /**
   * Show the global toast notification.
   * @param {string} message
   * @param {number} [duration=2500]
   */
  toast(message, duration = 2500) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.classList.remove('show'), duration);
  },

  /**
   * Safely parse JSON from localStorage.
   * @param {string} key
   * @param {*} fallback
   * @returns {*}
   */
  storageGet(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  },

  /**
   * Safely save JSON to localStorage.
   * @param {string} key
   * @param {*} value
   */
  storageSet(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage full or unavailable — fail silently
    }
  },
};
