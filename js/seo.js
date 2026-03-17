/**
 * seo.js
 * Dynamically updates page <title>, meta description, and Open Graph tags.
 */
const SEO = {
  _base: document.title,

  setPage(title, description) {
    document.title = title ? `${title} — ${Config.BRAND}` : this._base;
    this._meta('description', description || 'Premium 3D Wall Art Prints. 100% Biodegradable. Ships across India.');
    this._og('title', document.title);
    this._og('description', description || '');
  },

  setProduct(product) {
    this.setPage(product.name, product.description.slice(0, 155));
    this._og('image', product.images?.[0] || product.image);
    this._og('type', 'product');
    const url = `${window.location.origin}${window.location.pathname}?product=${product.id}`;
    this._og('url', url);
    history.replaceState(null, '', url);
  },

  resetToHome() {
    this.setPage('', '');
    history.replaceState(null, '', window.location.pathname);
  },

  _meta(name, content) {
    let el = document.querySelector(`meta[name="${name}"]`);
    if (!el) { el = document.createElement('meta'); el.name = name; document.head.appendChild(el); }
    el.content = content;
  },

  _og(prop, content) {
    let el = document.querySelector(`meta[property="og:${prop}"]`);
    if (!el) { el = document.createElement('meta'); el.setAttribute('property', `og:${prop}`); document.head.appendChild(el); }
    el.content = content;
  },
};
