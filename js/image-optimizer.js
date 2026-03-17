/**
 * image-optimizer.js
 * Lazy-loads images using IntersectionObserver and adds WebP hints.
 * Also sets up low-quality placeholder swap (LQIP pattern).
 */
const ImageOptimizer = {
  _observer: null,

  init() {
    if (!('IntersectionObserver' in window)) return; // fallback: images load normally
    this._observer = new IntersectionObserver(this._onIntersect.bind(this), {
      rootMargin: '200px',
      threshold:  0,
    });
    this.observe();
  },

  observe() {
    document.querySelectorAll('img[loading="lazy"]').forEach(img => {
      this._observer?.observe(img);
    });
  },

  _onIntersect(entries) {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const img = entry.target;
      if (img.dataset.src) {
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
      }
      img.classList.add('img-loaded');
      this._observer.unobserve(img);
    });
  },

  /**
   * Append width/quality params to Unsplash URLs for responsive sizing.
   * @param {string} url
   * @param {number} width
   * @returns {string}
   */
  optimizeUrl(url, width = 600) {
    if (!url) return '';
    if (url.includes('unsplash.com')) {
      const base = url.split('?')[0];
      return `${base}?w=${width}&q=80&auto=format`;
    }
    return url;
  },
};

document.addEventListener('DOMContentLoaded', () => ImageOptimizer.init());
