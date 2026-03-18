/**
 * filters.js
 * Manages category, type, finish, color, and PRICE range filters + search.
 */
const Filters = (() => {
  let _state    = { cat: '', type: '', finish: '', color: '', price: 2500, search: '' };
  let _onChange = null;
  let _all      = [];

  function init(products, onChange) {
    _all      = products;
    _onChange = onChange;
    _populate('catFilter',    products, 'category');
    _populate('typeFilter',   products, 'type');
    _populate('finishFilter', products, 'finish');
    _populate('colorFilter',  products, 'color');
    _bindEvents();
  }

  function _populate(id, products, key) {
    const el = document.getElementById(id);
    if (!el) return;
    [...new Set(products.map(p => p[key]).filter(Boolean))].sort().forEach(v => {
      const o = document.createElement('option'); o.value = o.textContent = v; el.appendChild(o);
    });
  }

  function _bindEvents() {
    const run = () => _onChange && _onChange(apply(_all));

    [['catFilter','cat'],['typeFilter','type'],['finishFilter','finish'],['colorFilter','color']].forEach(([id, key]) => {
      document.getElementById(id)?.addEventListener('change', e => { _state[key] = e.target.value; run(); });
    });

    const price = document.getElementById('priceFilter');
    const label = document.getElementById('priceLabel');
    price?.addEventListener('input', e => {
      _state.price = Number(e.target.value);
      if (label) label.textContent = Utils.formatPrice(_state.price);
      run();
    });

    const search = document.getElementById('searchInput');
    search?.addEventListener('input', Utils.debounce(e => {
      _state.search = e.target.value.trim().toLowerCase();
      Analytics.search(_state.search);
      run();
    }, 250));

    document.getElementById('clearFilters')?.addEventListener('click', () => reset());
  }

  function apply(products) {
    return products.filter(p => {
      if (_state.cat    && p.category !== _state.cat)    return false;
      if (_state.type   && p.type     !== _state.type)   return false;
      if (_state.finish && p.finish   !== _state.finish) return false;
      if (_state.color  && p.color    !== _state.color)  return false;
      if (p.price > _state.price)                        return false;
      if (_state.search) {
        const hay = `${p.name} ${p.description} ${p.tags?.join(' ')||''}`.toLowerCase();
        if (!hay.includes(_state.search)) return false;
      }
      return true;
    });
  }

  function reset() {
    _state = { cat: '', type: '', finish: '', color: '', price: 2500, search: '' };
    ['catFilter','typeFilter','finishFilter','colorFilter'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    const price = document.getElementById('priceFilter');
    if (price) price.value = 2500;
    const label = document.getElementById('priceLabel');
    if (label) label.textContent = Utils.formatPrice(2500);
    const search = document.getElementById('searchInput');
    if (search) search.value = '';
    _onChange && _onChange(_all);
  }

  return { init, apply, reset };
})();
