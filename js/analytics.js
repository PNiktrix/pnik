/**
 * analytics.js
 * Fires events to Facebook Pixel and Google Analytics 4.
 * Extend here for any other analytics provider.
 */
const Analytics = {
  _send(name, data = {}) {
    console.log('[Analytics]', name, data);
    if (typeof fbq === 'function') fbq('track', name, data);
    if (typeof gtag === 'function') gtag('event', name, data);
  },

  pageView(path = window.location.pathname) {
    this._send('PageView', { path });
  },

  productView(p) {
    this._send('ViewContent', { content_ids: [String(p.id)], content_name: p.name, value: p.price, currency: 'INR' });
  },

  addToCart(p, qty) {
    this._send('AddToCart', { content_ids: [String(p.id)], content_name: p.name, value: p.price * qty, currency: 'INR' });
  },

  addToWishlist(p) {
    this._send('AddToWishlist', { content_ids: [String(p.id)], content_name: p.name });
  },

  initiateCheckout(total, count) {
    this._send('InitiateCheckout', { value: total, currency: 'INR', num_items: count });
  },

  search(term) {
    this._send('Search', { search_string: term });
  },
};
