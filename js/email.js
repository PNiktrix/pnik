/**
 * email.js
 * Email notification helpers.
 * Uses mailto: links as a zero-cost fallback.
 * Replace with EmailJS or Mailchimp API for automated sending.
 *
 * EmailJS setup (free tier, 200 emails/month):
 *  1. Sign up at https://emailjs.com
 *  2. Create a service and template
 *  3. Set EMAILJS_SERVICE_ID, TEMPLATE_ID, PUBLIC_KEY below
 */
const Email = {
  // EmailJS credentials (optional)
  SERVICE_ID:  'YOUR_SERVICE_ID',
  TEMPLATE_ID: 'YOUR_TEMPLATE_ID',
  PUBLIC_KEY:  'YOUR_PUBLIC_KEY',

  /**
   * Send order confirmation email via EmailJS.
   * Falls back to mailto: if EmailJS not configured.
   * @param {Object} order - { name, email, items, total }
   */
  async sendOrderConfirmation(order) {
    if (typeof emailjs !== 'undefined' && this.SERVICE_ID !== 'YOUR_SERVICE_ID') {
      try {
        await emailjs.send(this.SERVICE_ID, this.TEMPLATE_ID, {
          to_name:   order.name,
          to_email:  order.email,
          order_id:  order.id || Utils.uid(),
          items:     order.items.map(i => `${i.name} ×${i.qty}`).join(', '),
          total:     Utils.formatPrice(order.total),
        }, this.PUBLIC_KEY);
        console.log('[Email] Order confirmation sent to', order.email);
      } catch (e) {
        console.error('[Email] EmailJS error:', e);
      }
    } else {
      // Fallback: open mailto
      const subject = `Order Confirmation — ${Config.BRAND}`;
      const body    = `Hi ${order.name},\n\nThank you for your order!\n\nTotal: ${Utils.formatPrice(order.total)}\n\nWe'll be in touch shortly.\n\n— ${Config.BRAND} Team`;
      window.open(`mailto:${order.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
    }
  },

  /**
   * Subscribe an email to mailing list.
   * Replace with Mailchimp API endpoint when ready.
   * @param {string} email
   */
  subscribe(email) {
    console.log('[Email] Subscribe:', email);
    Utils.toast('Subscribed! Thank you 🎉');
    // TODO: POST to Mailchimp or your backend
  },
};
