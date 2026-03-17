/**
 * wishlist.js
 * Wishlist — persisted in localStorage.
 */

// eslint-disable-next-line no-unused-vars
const Wishlist = (() => {
  const STORAGE_KEY = 'pniktrix_wishlist';

  /** @type {{ id: number, name: string, price: number, image: string }[]} */
  let _items = Utils.storageGet(STORAGE_KEY, []);

  /* ── Private helpers ───────────────────────────── */
  function _save() {
    Utils.storageSet(STORAGE_KEY, _items);
    _updateBadge();
  }

  function _updateBadge() {
    const el = document.getElementById('wishlistCount');
    if (el) el.textContent = _items.length;
  }

  /* ── Public API ────────────────────────────────── */
  function toggle(product) {
    if (has(product.id)) {
      remove(product.id);
      Utils.toast(`"${product.name}" removed from wishlist`);
      return false;
    }
    _items.push({
      id:    product.id,
      name:  product.name,
      price: product.price,
      image: product.image,
    });
    _save();
    Analytics.trackAddToWishlist(product);
    Utils.toast(`"${product.name}" added to wishlist`);
    return true;
  }

  function add(product) {
    if (!has(product.id)) {
      _items.push({ id: product.id, name: product.name, price: product.price, image: product.image });
      _save();
      Analytics.trackAddToWishlist(product);
      Utils.toast(`"${product.name}" added to wishlist`);
      return true;
    }
    return false;
  }

  function remove(productId) {
    _items = _items.filter(i => i.id !== productId);
    _save();
  }

  function has(productId)  { return _items.some(i => i.id === productId); }
  function getItems()      { return [..._items]; }
  function getCount()      { return _items.length; }

  document.addEventListener('DOMContentLoaded', _updateBadge);

  return { toggle, add, remove, has, getItems, getCount };
})();
