/**
 * recommendations.js
 * Returns related products based on shared category or color.
 */
const Recommendations = {
  /**
   * @param {Object} product - current product
   * @param {Object[]} all   - all products
   * @param {number} [limit]
   * @returns {Object[]}
   */
  get(product, all, limit = 4) {
    return all
      .filter(p => p.id !== product.id && (p.category === product.category || p.color === product.color))
      .slice(0, limit);
  },
};
