/**
 * monetization.js
 * Revenue-related helpers: coupon codes, upsell prompts, free-shipping nudge.
 */
const Monetization = {
  _coupons: {
    'WELCOME10': { type: 'percent', value: 10, label: '10% off' },
    'FLAT200':   { type: 'flat',    value: 200, label: '₹200 off' },
    'FREE':      { type: 'flat',    value: 0,   label: 'Free gift' },
  },

  /**
   * Validate and apply a coupon code.
   * @param {string} code
   * @param {number} subtotal
   * @returns {{ discount: number, label: string, valid: boolean, message: string }}
   */
  applyCoupon(code, subtotal) {
    const c = this._coupons[code?.toUpperCase()];
    if (!c) return { discount: 0, valid: false, message: 'Invalid coupon code.' };
    const discount = c.type === 'percent' ? Math.round(subtotal * c.value / 100) : c.value;
    return { discount, label: c.label, valid: true, message: `Coupon applied: ${c.label}` };
  },

  /**
   * Show a nudge if cart total is just below free-shipping threshold.
   * @param {number} total
   * @returns {string|null} message or null
   */
  freeShippingNudge(total) {
    const diff = Config.FREE_SHIPPING_MIN - total;
    if (diff > 0 && diff < 600) {
      return `Add ${Utils.formatPrice(diff)} more for free shipping! 🚚`;
    }
    return null;
  },

  /**
   * Suggest an upsell product when user adds to cart.
   * @param {Object} product   - current product
   * @param {Object[]} all     - all products
   * @returns {Object|null}
   */
  upsell(product, all) {
    return all.find(p => p.id !== product.id && p.price > product.price && p.category === product.category) || null;
  },
};
