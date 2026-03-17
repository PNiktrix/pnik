/**
 * admin.js
 * Simple client-side admin dashboard — accessible via ?admin=1 in URL.
 * Shows metrics, cart data, and quick actions. Password-protected via prompt.
 *
 * In production, replace with a proper backend admin panel.
 */
const Admin = {
  ADMIN_PASS: 'pniktrix2025', // Change before going live!

  init() {
    const params = new URLSearchParams(window.location.search);
    if (!params.has('admin')) return;

    const pass = prompt('Admin password:');
    if (pass !== this.ADMIN_PASS) { alert('Incorrect password.'); return; }

    this._render();
  },

  _render() {
    const m = Metrics.getAll();
    const panel = document.createElement('div');
    panel.style.cssText = `
      position:fixed;top:0;right:0;width:360px;height:100vh;
      background:#111;color:#fff;z-index:99999;overflow-y:auto;
      padding:24px;font-family:monospace;font-size:13px;
      border-left:2px solid #d4af37;box-shadow:-8px 0 32px rgba(0,0,0,.5);
    `;
    panel.innerHTML = `
      <h3 style="color:#d4af37;margin-bottom:16px;font-size:16px">PNIKTRIX ADMIN</h3>
      <hr style="border-color:#333;margin-bottom:16px"/>

      <p style="color:#888;font-size:11px;margin-bottom:8px">METRICS (this device)</p>
      <p>Sessions: <b style="color:#d4af37">${m.sessions}</b></p>
      <p>Page Views: <b style="color:#d4af37">${m.pageViews}</b></p>
      <p>Add to Carts: <b style="color:#d4af37">${m.addToCarts}</b></p>
      <p>Checkouts: <b style="color:#d4af37">${m.checkouts}</b></p>

      <hr style="border-color:#333;margin:16px 0"/>
      <p style="color:#888;font-size:11px;margin-bottom:8px">TOP VIEWED PRODUCTS</p>
      ${Object.entries(m.productViews).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([id,v])=>`<p>Product #${id}: <b style="color:#d4af37">${v} views</b></p>`).join('') || '<p>No data yet</p>'}

      <hr style="border-color:#333;margin:16px 0"/>
      <p style="color:#888;font-size:11px;margin-bottom:8px">CURRENT CART</p>
      ${Cart.getItems().map(i=>`<p>${i.name} ×${i.qty} — ${Utils.formatPrice(i.price*i.qty)}</p>`).join('') || '<p>Cart empty</p>'}
      <p style="margin-top:8px"><b>Total: ${Utils.formatPrice(Cart.getTotal())}</b></p>

      <hr style="border-color:#333;margin:16px 0"/>
      <p style="color:#888;font-size:11px;margin-bottom:8px">ACTIONS</p>
      <button onclick="Metrics.reset();location.reload()" style="background:#d4af37;color:#111;border:none;padding:8px 14px;border-radius:4px;cursor:pointer;margin-bottom:8px;width:100%">Reset Metrics</button>
      <button onclick="Cart.clear();location.reload()" style="background:#e74c3c;color:#fff;border:none;padding:8px 14px;border-radius:4px;cursor:pointer;width:100%">Clear Cart</button>

      <hr style="border-color:#333;margin:16px 0"/>
      <p style="color:#888;font-size:11px">AB Tests</p>
      ${JSON.stringify(Utils.storageGet('pniktrix_ab',{}), null, 2).split('\n').map(l=>`<p>${l}</p>`).join('')}

      <button onclick="this.parentElement.remove()" style="margin-top:24px;background:none;border:1px solid #444;color:#888;padding:8px 14px;border-radius:4px;cursor:pointer;width:100%">Close</button>
    `;
    document.body.appendChild(panel);
  },
};

document.addEventListener('DOMContentLoaded', () => Admin.init());
