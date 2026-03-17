/**
 * image-optimizer.js
 * Uses the browser's native loading="lazy" attribute only.
 * The previous IntersectionObserver implementation was removed because
 * it intercepted pointer/click events on img elements before they could
 * bubble up to the parent .product-card, breaking card navigation.
 */
const ImageOptimizer = {
  /**
   * No-op — native lazy loading is set directly on img[loading="lazy"] in HTML.
   * Kept as a hook for future CDN image transformation logic.
   */
  init() {},

  /**
   * Kept for calling from renderGrid — just a no-op now that observer is removed.
   */
  observe() {},

  /**
   * Append width/quality params to Unsplash URLs.
   * @param {string} url
   * @param {number} width
   * @returns {string}
   */
  optimizeUrl(url, width = 600) {
    if (!url) return '';
    if (url.includes('unsplash.com')) {
      return url.split('?')[0] + `?w=${width}&q=80&auto=format`;
    }
    return url;
  },
};