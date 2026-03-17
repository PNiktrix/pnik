/**
 * product.js
 * Loads products.json and provides access methods.
 */
const ProductManager = (() => {
  let _products = [];
  let _banner   = [];

  async function load() {
    try {
      const res  = await fetch(Config.PRODUCTS_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      _products  = Array.isArray(json) ? json : (json.products || []);
      _banner    = json.banner || [];
      return { products: _products, banner: _banner };
    } catch (e) {
      console.error('[ProductManager] Load failed:', e);
      return { products: [], banner: [] };
    }
  }

  function getById(id)  { return _products.find(p => p.id === Number(id)); }
  function getAll()     { return [..._products]; }
  function getBanner()  { return [..._banner]; }

  return { load, getById, getAll, getBanner };
})();
