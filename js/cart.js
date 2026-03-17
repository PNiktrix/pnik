/**
 * cart.js
 * Shopping cart with localStorage persistence.
 * Each item: { id, name, price, image, qty, color }
 */
const Cart = (() => {
  const KEY = 'pniktrix_cart';
  let _items = Utils.storageGet(KEY, []);

  function _save() { Utils.storageSet(KEY, _items); _badge(); }

  function _badge() {
    const el = document.getElementById('cartCount');
    if (el) el.textContent = getCount();
  }

  function _find(id, color) {
    return _items.find(i => i.id === id && i.color === (color || null));
  }

  function add(product, qty = 1, color = null) {
    const ex = _find(product.id, color);
    if (ex) { ex.qty += qty; }
    else {
      _items.push({ id: product.id, name: product.name, price: product.price, image: product.image, qty, color: color || null });
    }
    _save();
    Analytics.addToCart(product, qty);
    Utils.toast(`"${product.name}" added to cart 🛒`);
  }

  function remove(id, color = null) {
    _items = _items.filter(i => !(i.id === id && i.color === (color || null)));
    _save();
  }

  function setQty(id, color, qty) {
    if (qty < 1) { remove(id, color); return; }
    const it = _find(id, color);
    if (it) { it.qty = qty; _save(); }
  }

  function getItems()  { return [..._items]; }
  function getCount()  { return _items.reduce((s, i) => s + i.qty, 0); }
  function getTotal()  { return _items.reduce((s, i) => s + i.price * i.qty, 0); }
  function isEmpty()   { return _items.length === 0; }
  function clear()     { _items = []; _save(); }

  document.addEventListener('DOMContentLoaded', _badge);
  return { add, remove, setQty, getItems, getCount, getTotal, isEmpty, clear };
})();
