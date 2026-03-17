/**
 * filters.js
 * Manages product filter dropdowns (size, finish, color) and search.
 */

// eslint-disable-next-line no-unused-vars
const Filters = (() => {
  let _active = { size: '', finish: '', color: '', search: '' };
  let _onChangeCallback = null;

  /* ── Setup ─────────────────────────────────────── */

  /**
   * Populate filter selects from the product list and bind change events.
   * @param {Object[]} products
   * @param {Function} onChange - called with filtered products on any change
   */
  function init(products, onChange) {
    _onChangeCallback = onChange;
    _populate('sizeFilter',   products, 'size');
    _populate('finishFilter', products, 'finish');
    _populate('colorFilter',  products, 'color');
    _bindEvents(products);
  }

  function _populate(selectId, products, key) {
    const select = document.getElementById(selectId);
    if (!select) return;
    const values = [...new Set(products.map(p => p[key]).filter(Boolean))].sort();
    values.forEach(v => {
      const opt = document.createElement('option');
      opt.value       = v;
      opt.textContent = v;
      select.appendChild(opt);
    });
  }

  function _bindEvents(products) {
    const run = () => _onChangeCallback && _onChangeCallback(apply(products));

    ['sizeFilter', 'finishFilter', 'colorFilter'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('change', e => {
        _active[id.replace('Filter', '').toLowerCase()] = e.target.value;
        run();
      });
    });

    const search = document.getElementById('searchInput');
    if (search) {
      search.addEventListener('input', Utils.debounce(e => {
        _active.search = e.target.value.trim().toLowerCase();
        run();
      }, 250));
    }

    const clear = document.getElementById('clearFilters');
    if (clear) clear.addEventListener('click', () => reset(products));
  }

  /* ── Filtering ──────────────────────────────────── */

  /**
   * Apply current active filters to a product list.
   * @param {Object[]} products
   * @returns {Object[]}
   */
  function apply(products) {
    return products.filter(p => {
      if (_active.size   && p.size   !== _active.size)   return false;
      if (_active.finish && p.finish !== _active.finish) return false;
      if (_active.color  && p.color  !== _active.color)  return false;
      if (_active.search) {
        const hay = `${p.name} ${p.description || ''}`.toLowerCase();
        if (!hay.includes(_active.search)) return false;
      }
      return true;
    });
  }

  /**
   * Reset all filters and re-render.
   * @param {Object[]} products
   */
  function reset(products) {
    _active = { size: '', finish: '', color: '', search: '' };
    ['sizeFilter', 'finishFilter', 'colorFilter'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    const search = document.getElementById('searchInput');
    if (search) search.value = '';
    _onChangeCallback && _onChangeCallback(products);
  }

  return { init, apply, reset };
})();
