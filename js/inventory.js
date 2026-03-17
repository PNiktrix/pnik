/**
 * inventory.js
 * Checks stock levels and provides low-stock warnings.
 * Replace _fetch with a real inventory API when available.
 */
const Inventory = {
  LOW_STOCK_THRESHOLD: 5,

  /** Returns stock label string for a product */
  label(product) {
    if (!product.stock && product.stock !== 0) return 'In Stock';
    if (product.stock === 0)                    return 'Out of Stock';
    if (product.stock <= this.LOW_STOCK_THRESHOLD) return `Only ${product.stock} left!`;
    return 'In Stock';
  },

  /** Returns CSS class for stock label */
  cls(product) {
    if (!product.stock)                         return '';
    if (product.stock === 0)                    return 'stock-out';
    if (product.stock <= this.LOW_STOCK_THRESHOLD) return 'stock-low';
    return 'stock-ok';
  },

  /** Returns true if product can be added to cart */
  canAdd(product) {
    return product.stock !== 0;
  },
};
