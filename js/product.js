/**
 * product.js
 * Loads and provides access to product data from data/products.json.
 */

// eslint-disable-next-line no-unused-vars
const ProductManager = (() => {
  /** @type {Object[]} */
  let _products = [];

  /**
   * Fetch and cache all products.
   * @returns {Promise<Object[]>}
   */
  async function load() {
    try {
      const res = await fetch(Config.PRODUCTS_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      // Support both { products: [...] } and plain array
      _products = Array.isArray(json) ? json : (json.products || []);
      return _products;
    } catch (err) {
      console.error('[ProductManager] Failed to load products:', err);
      return [];
    }
  }

  /**
   * @param {number|string} id
   * @returns {Object|undefined}
   */
  function getById(id) {
    return _products.find(p => p.id === Number(id));
  }

  /** @returns {Object[]} */
  function getAll() { return [..._products]; }

  return { load, getById, getAll };
})();
