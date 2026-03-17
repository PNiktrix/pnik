/**
 * cart.js
 * Shopping cart — persisted in localStorage.
 * No payment processing on-site; checkout redirects to WhatsApp.
 */

// eslint-disable-next-line no-unused-vars
const Cart = (() => {
  const STORAGE_KEY = 'pniktrix_cart';

  /** @type {{ id: number, name: string, price: number, image: string, qty: number, color: string|null }[]} */
  let _items = Utils.storageGet(STORAGE_KEY, []);

  /* ── Private helpers ───────────────────────────── */
  function _save() {
    Utils.storageSet(STORAGE_KEY, _items);
    _updateBadge();
  }

  function _updateBadge() {
    const el = document.getElementById('cartCount');
    if (el) el.textContent = getCount();
  }

  function _find(productId, color) {
    return _items.find(i => i.id === productId && i.color === (color || null));
  }

  /* ── Public API ────────────────────────────────── */
  function addItem(product, qty = 1, color = null) {
    const existing = _find(product.id, color);
    if (existing) {
      existing.qty += qty;
    } else {
      _items.push({
        id:    product.id,
        name:  product.name,
        price: product.price,
        image: product.image,
        qty,
        color: color || null,
      });
    }
    _save();
    Analytics.trackAddToCart(product, qty);
    Utils.toast(`"${product.name}" added to cart`);
  }

  function removeItem(productId, color = null) {
    _items = _items.filter(i => !(i.id === productId && i.color === (color || null)));
    _save();
  }

  function updateQty(productId, color, newQty) {
    const item = _find(productId, color);
    if (!item) return;
    if (newQty < 1) { removeItem(productId, color); return; }
    item.qty = newQty;
    _save();
  }

  function getItems()  { return [..._items]; }
  function getCount()  { return _items.reduce((s, i) => s + i.qty, 0); }
  function getTotal()  { return _items.reduce((s, i) => s + i.price * i.qty, 0); }
  function isEmpty()   { return _items.length === 0; }

  function clear() {
    _items = [];
    _save();
  }

  // Update badge on load
  document.addEventListener('DOMContentLoaded', _updateBadge);

  return { addItem, removeItem, updateQty, getItems, getCount, getTotal, isEmpty, clear };
})();
