/**
 * metrics.js
 * Tracks performance metrics and business KPIs in localStorage.
 * Useful for the admin dashboard to show basic analytics without a backend.
 */
const Metrics = (() => {
  const KEY = 'pniktrix_metrics';

  function _load() { return Utils.storageGet(KEY, { pageViews: 0, productViews: {}, addToCarts: 0, checkouts: 0, sessions: 0 }); }
  function _save(m) { Utils.storageSet(KEY, m); }

  function recordPageView() {
    const m = _load(); m.pageViews++; _save(m);
  }

  function recordProductView(productId) {
    const m = _load();
    m.productViews[productId] = (m.productViews[productId] || 0) + 1;
    _save(m);
  }

  function recordAddToCart() {
    const m = _load(); m.addToCarts++; _save(m);
  }

  function recordCheckout() {
    const m = _load(); m.checkouts++; _save(m);
  }

  function recordSession() {
    const m = _load(); m.sessions++; _save(m);
  }

  function getAll() { return _load(); }

  function reset() { _save({ pageViews: 0, productViews: {}, addToCarts: 0, checkouts: 0, sessions: 0 }); }

  // Auto-record session on load
  document.addEventListener('DOMContentLoaded', recordSession);

  return { recordPageView, recordProductView, recordAddToCart, recordCheckout, recordSession, getAll, reset };
})();
