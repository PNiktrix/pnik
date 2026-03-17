/**
 * debug.js
 * Debug panel — active only when ?debug=1 is in the URL.
 * Shows console errors, localStorage state, and module status.
 */
const Debug = {
  init() {
    if (!new URLSearchParams(window.location.search).has('debug')) return;
    console.log('[Debug] Debug mode ON');
    this._intercept();
    this._panel();
  },

  _logs: [],

  _intercept() {
    const orig = { log: console.log, warn: console.warn, error: console.error };
    ['log','warn','error'].forEach(level => {
      console[level] = (...args) => {
        this._logs.push({ level, msg: args.join(' '), ts: new Date().toLocaleTimeString() });
        orig[level](...args);
        this._refreshLogs();
      };
    });
  },

  _refreshLogs() {
    const el = document.getElementById('_dbg_logs');
    if (!el) return;
    const colors = { log: '#aaa', warn: '#f39c12', error: '#e74c3c' };
    el.innerHTML = this._logs.slice(-30).reverse().map(l =>
      `<p style="color:${colors[l.level]};margin:2px 0;font-size:11px">[${l.ts}] ${l.msg}</p>`
    ).join('');
  },

  _panel() {
    const p = document.createElement('div');
    p.style.cssText = `position:fixed;bottom:0;left:0;right:0;max-height:220px;background:#0a0a0a;
      color:#aaa;z-index:99999;overflow-y:auto;padding:12px 16px;font-family:monospace;
      border-top:2px solid #d4af37;font-size:12px`;
    p.innerHTML = `
      <div style="display:flex;justify-content:space-between;margin-bottom:8px;align-items:center">
        <span style="color:#d4af37;font-size:13px;font-weight:bold">🐛 DEBUG</span>
        <div style="display:flex;gap:8px">
          <button onclick="Debug._storagePanel()" style="background:#222;color:#d4af37;border:1px solid #333;padding:3px 8px;border-radius:3px;cursor:pointer;font-size:11px">Storage</button>
          <button onclick="document.getElementById('_dbg_panel').remove()" style="background:#222;color:#aaa;border:1px solid #333;padding:3px 8px;border-radius:3px;cursor:pointer;font-size:11px">Close</button>
        </div>
      </div>
      <div id="_dbg_logs"></div>
    `;
    p.id = '_dbg_panel';
    document.body.appendChild(p);
    console.log('[Debug] Panel ready. Cart items:', Cart.getCount(), '| Wishlist:', Wishlist.getCount());
  },

  _storagePanel() {
    const keys = ['pniktrix_cart','pniktrix_wishlist','pniktrix_user','pniktrix_metrics','pniktrix_ab'];
    const data = Object.fromEntries(keys.map(k => [k, Utils.storageGet(k)]));
    console.log('[Debug] localStorage:', JSON.stringify(data, null, 2));
  },
};

document.addEventListener('DOMContentLoaded', () => Debug.init());
