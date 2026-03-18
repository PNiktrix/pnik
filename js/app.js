/**
 * app.js — Main application orchestrator.
 *
 * DetailPage logic lives in detail-page.js (loaded before this file).
 * Viewer3D logic lives in viewer3d.js.
 * This file handles: boot sequence, grid rendering, cart/wishlist/filter
 * drawers, contact form, header scroll, and all button wiring.
 *
 * CLICK BUG NOTE
 * ─────────────
 * The grid listener is bound ONCE on #productsGrid at boot via
 * _bindGridListener(). renderGrid() only sets innerHTML — it never
 * touches event listeners. Cart and wishlist buttons call
 * e.stopPropagation() so their clicks never also trigger card navigation.
 */

/* ══════════════════════════════════════════════════════════
   PAGE SWITCHER  (also used by detail-page.js via global scope)
══════════════════════════════════════════════════════════ */
function _showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
  else console.error('[App] _showPage: not found →', id);
}

/* ══════════════════════════════════════════════════════════
   PRODUCT GRID
   renderGrid() sets innerHTML only. Never binds listeners.
══════════════════════════════════════════════════════════ */
function renderGrid(products) {
  const grid    = document.getElementById('productsGrid');
  const noRes   = document.getElementById('noResults');
  const counter = document.getElementById('productCount');
  if (!grid) return;

  if (counter) counter.textContent = `${products.length} print${products.length !== 1 ? 's' : ''}`;

  if (!products.length) {
    grid.innerHTML = '';
    noRes?.classList.remove('hidden');
    return;
  }
  noRes?.classList.add('hidden');

  grid.innerHTML = products.map(p => `
    <article
      class="product-card"
      data-id="${p.id}"
      role="button"
      tabindex="0"
      aria-label="View ${p.name}"
    >
      <div class="card-img-wrap">
        <img
          src="${ImageOptimizer.optimizeUrl(p.image, 400)}"
          alt="${p.name}"
          loading="lazy"
          style="pointer-events:none"
        />
      </div>
      <div class="card-body">
        <h3 class="card-name">${p.name}</h3>
        <p class="card-meta">${p.type} · ${p.finish}</p>
        <p class="card-price">${Utils.formatPrice(p.price)}</p>
        <div class="card-actions" style="position:relative;z-index:2">
          <button class="btn-gold js-add-cart" data-id="${p.id}">Add to Cart</button>
          <button
            class="btn-wl js-wl${Wishlist.has(p.id) ? ' active' : ''}"
            data-id="${p.id}"
            aria-label="Wishlist"
          >♡</button>
        </div>
      </div>
    </article>
  `).join('');
}

/* ── Grid click listener — bound ONCE at boot ── */
function _bindGridListener() {
  const grid = document.getElementById('productsGrid');
  if (!grid) { console.error('[App] #productsGrid not found'); return; }

  grid.addEventListener('click', e => {

    // Add to Cart button
    const addBtn = e.target.closest('.js-add-cart');
    if (addBtn) {
      e.stopPropagation();
      const p = ProductManager.getById(addBtn.dataset.id);
      if (p) {
        if (!Inventory.canAdd(p)) { Utils.toast('Out of stock.'); return; }
        Cart.add(p, 1, p.colors?.[0] || null);
        Metrics.recordAddToCart();
      }
      return;
    }

    // Wishlist button
    const wlBtn = e.target.closest('.js-wl');
    if (wlBtn) {
      e.stopPropagation();
      const p = ProductManager.getById(wlBtn.dataset.id);
      if (p) {
        Wishlist.toggle(p);
        wlBtn.classList.toggle('active', Wishlist.has(p.id));
      }
      return;
    }

    // Card → product detail page
    const card = e.target.closest('.product-card');
    if (card) {
      const p = ProductManager.getById(card.dataset.id);
      if (p) DetailPage.show(p);
      else console.error('[App] Product not found:', card.dataset.id);
    }
  });

  // Keyboard accessibility
  grid.addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const card = e.target.closest('.product-card');
    if (card) {
      e.preventDefault();
      const p = ProductManager.getById(card.dataset.id);
      if (p) DetailPage.show(p);
    }
  });
}

/* ══════════════════════════════════════════════════════════
   CART DRAWER
══════════════════════════════════════════════════════════ */
function renderCartDrawer() {
  const body  = document.getElementById('cartItems');
  const items = Cart.getItems();
  if (!body) return;

  if (!items.length) {
    body.innerHTML = '<p class="drawer-empty">Your cart is empty.</p>';
    document.getElementById('cartSubtotal').textContent = Utils.formatPrice(0);
    document.getElementById('cartShipping').textContent = 'Free';
    document.getElementById('cartTotal').textContent    = Utils.formatPrice(0);
    return;
  }

  body.innerHTML = items.map(it => `
    <div class="drawer-item">
      <img
        class="drawer-item-img js-item-detail"
        src="${it.image}" alt="${it.name}"
        data-id="${it.id}" loading="lazy"
        style="cursor:pointer"
      />
      <div class="drawer-item-info">
        <p class="drawer-item-name js-item-detail" data-id="${it.id}" style="cursor:pointer">${it.name}</p>
        <p class="drawer-item-price">${Utils.formatPrice(it.price)}</p>
        <p class="drawer-item-meta">${it.color ? it.color + ' · ' : ''}${Utils.formatPrice(it.price * it.qty)}</p>
        <div class="cart-item-qty">
          <button class="cq-btn js-cart-dec" data-id="${it.id}" data-color="${it.color || ''}">−</button>
          <span class="cq-val">${it.qty}</span>
          <button class="cq-btn js-cart-inc" data-id="${it.id}" data-color="${it.color || ''}">+</button>
        </div>
        <button class="drawer-item-remove js-cart-remove" data-id="${it.id}" data-color="${it.color || ''}">
          Remove
        </button>
      </div>
    </div>
  `).join('');

  body.querySelectorAll('.js-cart-inc').forEach(btn => {
    btn.addEventListener('click', () => {
      const col = btn.dataset.color || null;
      const it  = Cart.getItems().find(i => i.id === Number(btn.dataset.id) && i.color === col);
      if (it) { Cart.setQty(it.id, it.color, it.qty + 1); renderCartDrawer(); }
    });
  });
  body.querySelectorAll('.js-cart-dec').forEach(btn => {
    btn.addEventListener('click', () => {
      const col = btn.dataset.color || null;
      const it  = Cart.getItems().find(i => i.id === Number(btn.dataset.id) && i.color === col);
      if (it) { Cart.setQty(it.id, it.color, it.qty - 1); renderCartDrawer(); }
    });
  });
  body.querySelectorAll('.js-cart-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      Cart.remove(Number(btn.dataset.id), btn.dataset.color || null);
      renderCartDrawer();
    });
  });
  body.querySelectorAll('.js-item-detail').forEach(el => {
    el.addEventListener('click', () => {
      const p = ProductManager.getById(el.dataset.id);
      if (p) { closeCart(); DetailPage.show(p); }
    });
  });

  const total    = Cart.getTotal();
  const freeShip = total >= Config.FREE_SHIPPING_MIN;
  document.getElementById('cartSubtotal').textContent = Utils.formatPrice(total);
  document.getElementById('cartShipping').textContent = freeShip ? 'Free 🎉' : Utils.formatPrice(Config.SHIPPING_CHARGE);
  document.getElementById('cartTotal').textContent    = Utils.formatPrice(total + (freeShip ? 0 : Config.SHIPPING_CHARGE));

  const nudge = Monetization.freeShippingNudge(total);
  if (nudge) Utils.toast(nudge, 4000);
}

function openCart()  { renderCartDrawer(); document.getElementById('cartDrawer').classList.add('open'); document.body.style.overflow = 'hidden'; }
function closeCart() { document.getElementById('cartDrawer').classList.remove('open'); document.body.style.overflow = ''; }

/* ══════════════════════════════════════════════════════════
   WISHLIST DRAWER
══════════════════════════════════════════════════════════ */
function renderWishlistDrawer() {
  const body  = document.getElementById('wishlistItems');
  const items = Wishlist.getItems();
  if (!body) return;

  if (!items.length) { body.innerHTML = '<p class="drawer-empty">Your wishlist is empty.</p>'; return; }

  body.innerHTML = items.map(it => `
    <div class="drawer-item">
      <img
        class="drawer-item-img js-wl-detail"
        src="${it.image}" alt="${it.name}"
        data-id="${it.id}" loading="lazy" style="cursor:pointer"
      />
      <div class="drawer-item-info">
        <p class="drawer-item-name js-wl-detail" data-id="${it.id}" style="cursor:pointer">${it.name}</p>
        <p class="drawer-item-price">${Utils.formatPrice(it.price)}</p>
        <button class="drawer-item-remove js-wl-remove" data-id="${it.id}">Remove</button>
      </div>
    </div>
  `).join('');

  body.querySelectorAll('.js-wl-remove').forEach(btn => {
    btn.addEventListener('click', () => { Wishlist.remove(Number(btn.dataset.id)); renderWishlistDrawer(); });
  });
  body.querySelectorAll('.js-wl-detail').forEach(el => {
    el.addEventListener('click', () => {
      const p = ProductManager.getById(el.dataset.id);
      if (p) { closeWishlist(); DetailPage.show(p); }
    });
  });
}

function openWishlist()  { renderWishlistDrawer(); document.getElementById('wishlistDrawer').classList.add('open'); document.body.style.overflow = 'hidden'; }
function closeWishlist() { document.getElementById('wishlistDrawer').classList.remove('open'); document.body.style.overflow = ''; }

/* ══════════════════════════════════════════════════════════
   FILTER DRAWER
══════════════════════════════════════════════════════════ */
function openFilterDrawer()  { document.getElementById('filterDrawer').classList.add('open'); document.body.style.overflow = 'hidden'; }
function closeFilterDrawer() { document.getElementById('filterDrawer').classList.remove('open'); document.body.style.overflow = ''; }

function _updateFilterIcon() {
  const hasActive = ['catFilter','typeFilter','finishFilter','colorFilter'].some(id => {
    const el = document.getElementById(id);
    return el && el.value !== '';
  });
  const priceEl     = document.getElementById('priceFilter');
  const priceActive = priceEl && Number(priceEl.value) < 2500;
  const on = hasActive || priceActive;
  document.getElementById('filterToggle')?.classList.toggle('has-filters', on);
  document.getElementById('filterBadge')?.classList.toggle('hidden', !on);
}

/* ══════════════════════════════════════════════════════════
   CONTACT FORM
══════════════════════════════════════════════════════════ */
function _bindContactForm() {
  document.getElementById('contactForm')?.addEventListener('submit', e => {
    e.preventDefault();
    const fd    = new FormData(e.target);
    const name  = (fd.get('name')    || '').trim();
    const email = (fd.get('email')   || '').trim();
    const msg   = (fd.get('message') || '').trim();
    if (!name || !email || !msg) { Utils.toast('Please fill in all fields.'); return; }
    try { Auth.setUser({ name, email }); } catch (_) {}
    const text = `Hello Pniktrix 👋\n\nName: ${name}\nEmail: ${email}\n\nMessage:\n${msg}`;
    window.open(`https://wa.me/${Config.WHATSAPP}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
    e.target.reset();
    Utils.toast('Opening WhatsApp…');
  });
}

/* ══════════════════════════════════════════════════════════
   BOOT
══════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {

  // 1. Splash
  try { Splash.init(); } catch (e) { console.error('[Boot] Splash:', e); }

  // 2. Banner (marquee + image slider from banner.json)
  try { await Banner.init(); } catch (e) { console.error('[Boot] Banner:', e); }

  // 3. Load products
  let products = [];
  try {
    const data = await ProductManager.load();
    products   = Array.isArray(data) ? data : (data.products || []);
  } catch (e) { console.error('[Boot] ProductManager:', e); }

  // 4. Render initial grid (HTML only — no listeners yet)
  renderGrid(products);

  // 5. Bind grid click listener ONCE on the container
  _bindGridListener();

  // 6. Filters
  try {
    Filters.init(products, filtered => {
      renderGrid(filtered);
      _updateFilterIcon();
    });
  } catch (e) { console.error('[Boot] Filters:', e); }

  // 7. Detail page — bind all static button listeners once
  DetailPage.bindEvents();

  // 8. Filter drawer
  document.getElementById('filterToggle')?.addEventListener('click', openFilterDrawer);
  document.getElementById('closeFilter')?.addEventListener('click', closeFilterDrawer);
  document.getElementById('filterOverlay')?.addEventListener('click', closeFilterDrawer);

  // 9. Cart drawer
  document.getElementById('cartToggle')?.addEventListener('click', openCart);
  document.getElementById('closeCart')?.addEventListener('click', closeCart);
  document.getElementById('cartOverlay')?.addEventListener('click', closeCart);
  document.getElementById('checkoutBtn')?.addEventListener('click', () => {
    Shiprocket.whatsappCheckout(Cart.getItems());
    Metrics.recordCheckout();
  });

  // 10. Wishlist drawer
  document.getElementById('wishlistToggle')?.addEventListener('click', openWishlist);
  document.getElementById('closeWishlist')?.addEventListener('click', closeWishlist);
  document.getElementById('wishlistOverlay')?.addEventListener('click', closeWishlist);

  // 11. Contact form
  _bindContactForm();

  // 12. Logo → home
  document.getElementById('logoLink')?.addEventListener('click', e => {
    e.preventDefault();
    _showPage('pageHome');
    Viewer3D.destroy();
    try { SEO.resetToHome(); } catch (_) {}
    window.scrollTo({ top: 0 });
  });

  // 13. Header scroll shadow
  window.addEventListener('scroll', () => {
    document.getElementById('siteHeader')?.classList.toggle('scrolled', window.scrollY > 10);
  }, { passive: true });

  // 14. Footer year
  const fy = document.getElementById('footerYear');
  if (fy) fy.textContent = new Date().getFullYear();

  // 15. Deep link: ?product=ID
  const qp = new URLSearchParams(window.location.search);
  if (qp.has('product')) {
    const p = ProductManager.getById(qp.get('product'));
    if (p) DetailPage.show(p);
  }

  // 16. Analytics
  try { Analytics.pageView(); Metrics.recordPageView(); } catch (_) {}

  console.log(`[Pniktrix] ✅ Boot complete — ${products.length} products.`);
});