/**
 * product.js
 * Loads products.json and provides access and search methods.
 * Resilient to folder moves with automatic path normalization.
 */
const ProductManager = (() => {
  let _products = [];
  let _banner   = [];

  function _normalizeUrl(url) {
    if (!url || typeof url !== 'string') return url;
    // Fix legacy data/Art... paths moved to data/home decor/Art...
    if (url.startsWith('data/Art') && !url.startsWith('data/home decor/')) {
      return url.replace('data/Art', 'data/home decor/Art');
    }
    return url;
  }

  function _normalizeProduct(p) {
    const norm = { ...p };
    norm.image = _normalizeUrl(norm.image);
    if (Array.isArray(norm.images)) {
      norm.images = norm.images.map(_normalizeUrl);
    }
    if (norm.model) {
      norm.model = _normalizeUrl(norm.model);
    }
    // Calculate discount percentage if originalPrice exists
    if (norm.originalPrice && norm.originalPrice > norm.price) {
      norm.discountPercent = Math.round(((norm.originalPrice - norm.price) / norm.originalPrice) * 100);
      norm.isOnSale = true;
    } else {
      norm.isOnSale = false;
    }
    return norm;
  }

  async function load() {
    try {
      let res = await fetch(Config.PRODUCTS_URL);
      if (!res.ok) {
        // Fallback to home decor catalog
        res = await fetch('data/home decor/products.json');
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const rawProducts = Array.isArray(json) ? json : (json.products || []);
      _products = rawProducts.map(_normalizeProduct);
      _banner   = json.banner || [];
      return { products: _products, banner: _banner };
    } catch (e) {
      console.error('[ProductManager] Load failed:', e);
      return { products: [], banner: [] };
    }
  }

  function getById(id)          { return _products.find(p => p.id === Number(id)); }
  function getAll()             { return [..._products]; }
  function getByCategory(cat)   {
    if (!cat || cat.toLowerCase() === 'all') return [..._products];
    return _products.filter(p => 
      (p.mainCategory && p.mainCategory.toLowerCase() === cat.toLowerCase()) ||
      (p.category && p.category.toLowerCase() === cat.toLowerCase())
    );
  }
  function getOnSale()          { return _products.filter(p => p.isOnSale); }
  function getBanner()          { return [..._banner]; }

  return { load, getById, getAll, getByCategory, getOnSale, getBanner };
})();
