/**
 * analytics.js
 * Lightweight analytics layer.
 * Fires console events in development; hook into Facebook Pixel or GA4 here.
 */

// eslint-disable-next-line no-unused-vars
const Analytics = {
  /**
   * Fire a named event with optional payload.
   * @param {string} name
   * @param {Object} [data]
   */
  track(name, data = {}) {
    const payload = { event: name, ts: new Date().toISOString(), ...data };
    console.log('[Analytics]', payload);

    // Facebook Pixel
    if (typeof fbq === 'function') {
      fbq('trackCustom', name, data);
    }

    // Google Analytics 4
    if (typeof gtag === 'function') {
      gtag('event', name, data);
    }
  },

  trackPageView() {
    this.track('PageView', { path: window.location.pathname });
  },

  trackProductView(product) {
    this.track('ViewContent', {
      content_ids:  [String(product.id)],
      content_name: product.name,
      content_type: 'product',
      value:        product.price,
      currency:     'INR',
    });
  },

  trackAddToCart(product, qty = 1) {
    this.track('AddToCart', {
      content_ids:  [String(product.id)],
      content_name: product.name,
      value:        product.price * qty,
      currency:     'INR',
    });
  },

  trackAddToWishlist(product) {
    this.track('AddToWishlist', {
      content_ids:  [String(product.id)],
      content_name: product.name,
    });
  },

  trackInitiateCheckout(total, itemCount) {
    this.track('InitiateCheckout', {
      value:        total,
      currency:     'INR',
      num_items:    itemCount,
    });
  },
};
