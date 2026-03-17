/**
 * wishlist.js
 * Wishlist with localStorage persistence.
 */
const Wishlist = (() => {
  const KEY = 'pniktrix_wishlist';
  let _items = Utils.storageGet(KEY, []);

  function _save() { Utils.storageSet(KEY, _items); _badge(); }

  function _badge() {
    const el = document.getElementById('wishlistCount');
    if (el) el.textContent = _items.length;
  }

  function toggle(product) {
    if (has(product.id)) {
      _items = _items.filter(i => i.id !== product.id);
      _save();
      Utils.toast(`"${product.name}" removed from wishlist`);
      return false;
    }
    _items.push({ id: product.id, name: product.name, price: product.price, image: product.image });
    _save();
    Analytics.addToWishlist(product);
    Utils.toast(`"${product.name}" added to wishlist ♡`);
    return true;
  }

  function remove(id)    { _items = _items.filter(i => i.id !== id); _save(); }
  function has(id)       { return _items.some(i => i.id === id); }
  function getItems()    { return [..._items]; }
  function getCount()    { return _items.length; }

  document.addEventListener('DOMContentLoaded', _badge);
  return { toggle, remove, has, getItems, getCount };
})();
