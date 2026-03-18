/**
 * shiprocket.js
 * Full Shiprocket API integration.
 * Handles: auth token, create order, get shipping rates, track shipment.
 *
 * SETUP:
 *  1. Set Config.SHIPROCKET_EMAIL and Config.SHIPROCKET_PASS in config.js
 *  2. Token is fetched automatically and cached for 24h in localStorage
 *
 * NOTE: Shiprocket API has CORS restrictions for browser calls.
 *       In production, proxy these calls through your own backend or
 *       a Cloudflare Worker / Vercel serverless function.
 *       For WhatsApp-first model, createOrder() can be called after
 *       the customer confirms via WhatsApp.
 */
const Shiprocket = (() => {
  const BASE     = Config.SHIPROCKET_BASE;
  const TOKEN_KEY = 'sr_token';
  const TOKEN_EXP = 'sr_token_exp';

  /* ── Auth ────────────────────────────────────────── */

  async function _getToken() {
    const cached = localStorage.getItem(TOKEN_KEY);
    const exp    = parseInt(localStorage.getItem(TOKEN_EXP) || '0');
    if (cached && Date.now() < exp) return cached;

    try {
      const res = await fetch(`${BASE}/auth/login`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: Config.SHIPROCKET_EMAIL, password: Config.SHIPROCKET_PASS }),
      });
      if (!res.ok) throw new Error(`Auth failed: ${res.status}`);
      const data  = await res.json();
      const token = data.token;
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(TOKEN_EXP, String(Date.now() + 23 * 60 * 60 * 1000)); // 23h
      return token;
    } catch (e) {
      console.error('[Shiprocket] Auth error:', e);
      return null;
    }
  }

  async function _headers() {
    const token = await _getToken();
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  }

  /* ── Create Order ────────────────────────────────── */

  /**
   * Create a Shiprocket order after WhatsApp confirmation.
   * @param {Object} orderData
   * @param {string} orderData.orderId       - your unique order id
   * @param {string} orderData.customerName
   * @param {string} orderData.customerEmail
   * @param {string} orderData.customerPhone
   * @param {string} orderData.address       - full shipping address
   * @param {string} orderData.city
   * @param {string} orderData.state
   * @param {string} orderData.pincode
   * @param {Object[]} orderData.items       - cart items
   * @param {number} orderData.total
   * @returns {Promise<Object|null>}
   */
  async function createOrder(orderData) {
    try {
      const headers = await _headers();
      const payload = {
        order_id:          orderData.orderId || `PNK-${Utils.uid()}`,
        order_date:        new Date().toISOString().slice(0, 10),
        pickup_location:   'Primary',

        billing_customer_name:    orderData.customerName,
        billing_last_name:        '',
        billing_address:          orderData.address,
        billing_city:             orderData.city,
        billing_pincode:          orderData.pincode,
        billing_state:            orderData.state,
        billing_country:          'India',
        billing_email:            orderData.customerEmail,
        billing_phone:            orderData.customerPhone,

        shipping_is_billing:      true,

        order_items: orderData.items.map(i => ({
          name:         i.name,
          sku:          `SKU-${i.id}`,
          units:        i.qty,
          selling_price: i.price,
          discount:     0,
          tax:          0,
          hsn:          '4911', // printed matter HSN code
        })),

        payment_method:   'COD',  // change to 'Prepaid' if online payment
        sub_total:        orderData.total,
        length:           30,
        breadth:          25,
        height:           3,
        weight:           0.5,
      };

      const res  = await fetch(`${BASE}/orders/create/adhoc`, { method: 'POST', headers, body: JSON.stringify(payload) });
      const data = await res.json();

      if (data.order_id) {
        console.log('[Shiprocket] Order created:', data.order_id);
        Utils.toast('Order placed successfully! 🎉');
      } else {
        console.warn('[Shiprocket] Order response:', data);
      }
      return data;
    } catch (e) {
      console.error('[Shiprocket] createOrder error:', e);
      return null;
    }
  }

  /* ── Shipping Rates ──────────────────────────────── */

  /**
   * Get available courier rates for a pincode.
   * @param {string} pincode  - destination pincode
   * @param {number} weight   - package weight in kg
   * @returns {Promise<Object[]>}
   */
  async function getRates(pincode, weight = 0.5) {
    try {
      const headers = await _headers();
      const url = `${BASE}/courier/serviceability/?pickup_postcode=400001&delivery_postcode=${pincode}&weight=${weight}&cod=0`;
      const res  = await fetch(url, { headers });
      const data = await res.json();
      return data.data?.available_courier_companies || [];
    } catch (e) {
      console.error('[Shiprocket] getRates error:', e);
      return [];
    }
  }

  /* ── Track Shipment ──────────────────────────────── */

  /**
   * Track a shipment by AWB code or order id.
   * @param {string} awb - AWB tracking number
   * @returns {Promise<Object|null>}
   */
  async function track(awb) {
    try {
      const headers = await _headers();
      const res  = await fetch(`${BASE}/courier/track/awb/${awb}`, { headers });
      const data = await res.json();
      return data.tracking_data || null;
    } catch (e) {
      console.error('[Shiprocket] track error:', e);
      return null;
    }
  }

  /* ── Cancel Order ────────────────────────────────── */

  /**
   * Cancel a Shiprocket order by order ids array.
   * @param {number[]} orderIds
   * @returns {Promise<Object|null>}
   */
  async function cancelOrder(orderIds) {
    try {
      const headers = await _headers();
      const res  = await fetch(`${BASE}/orders/cancel`, {
        method: 'POST', headers, body: JSON.stringify({ ids: orderIds }),
      });
      const data = await res.json();
      console.log('[Shiprocket] Cancelled:', data);
      return data;
    } catch (e) {
      console.error('[Shiprocket] cancelOrder error:', e);
      return null;
    }
  }

  /* ── Generate WhatsApp Checkout Payload ──────────── */

  /**
   * Builds a WhatsApp order message and opens wa.me link.
   * This is the primary checkout flow (no payment gateway).
   * @param {Object[]} cartItems
   */
  function whatsappCheckout(cartItems) {
    if (!cartItems.length) { Utils.toast('Cart is empty!'); return; }
    const lines = cartItems.map(i =>
      `• ${i.name} × ${i.qty}${i.color ? ' (' + i.color + ')' : ''} — ${Utils.formatPrice(i.price * i.qty)}`
    ).join('\n');
    const total = Cart.getTotal();
    const msg   = `Hello Pniktrix 👋\n\nI'd like to order:\n\n${lines}\n\ncan you share more details.`;
    const url   = `https://wa.me/${Config.WHATSAPP}?text=${encodeURIComponent(msg)}`;
    Analytics.initiateCheckout(total, Cart.getCount());
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  return { createOrder, getRates, track, cancelOrder, whatsappCheckout };
})();
