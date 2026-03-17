/**
 * app.js
 * Main application orchestrator.
 * Boots all modules, renders grid, wires cart/wishlist drawers,
 * handles product detail page navigation (SPA-style).
 */

/* ═══════════════════════════════════════════════════════
   DETAIL PAGE
   ═══════════════════════════════════════════════════════ */
const DetailPage = {
  _product: null,
  _qty:     1,
  _color:   null,
  _view:    'photo', // 'photo' | '3d'

  show(product) {
    this._product = product;
    this._qty     = 1;
    this._color   = product.colors?.[0] || null;
    this._view    = 'photo';

    this._fill(product);
    this._renderThumbs(product);
    this._renderColors(product);
    this._resetQty();
    this._updateWishlistBtn();
    this._updateWhatsApp(product);
    Reviews.render(product.id);
    SEO.setProduct(product);
    Analytics.productView(product);
    Metrics.recordProductView(product.id);

    // Switch pages
    _showPage('pageDetail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  _fill(p) {
    document.getElementById('detailCategory').textContent = p.category   || '';
    document.getElementById('detailName').textContent     = p.name       || '';
    document.getElementById('detailDesc').textContent     = p.description|| '';
    document.getElementById('detailSize').textContent     = p.size       || '—';
    document.getElementById('detailMaterial').textContent = p.material   || '—';
    document.getElementById('detailFinish').textContent   = p.finish     || '—';
    document.getElementById('detailStock').textContent    = Inventory.label(p);
    document.getElementById('detailPrice').textContent    = Utils.formatPrice(p.price);

    const bigImg = document.getElementById('detailBigImg');
    bigImg.src = p.images?.[0] || p.image;
    bigImg.alt = p.name;
  },

  _renderThumbs(p) {
    const wrap = document.getElementById('detailThumbs');
    const imgs = p.images || [p.image];
    wrap.innerHTML = imgs.map((src, i) => `
      <div class="thumb${i===0?' active':''}" data-idx="${i}" data-src="${src}">
        <img src="${ImageOptimizer.optimizeUrl(src, 140)}" alt="View ${i+1}" loading="lazy"/>
      </div>
    `).join('');
    wrap.querySelectorAll('.thumb').forEach(t => {
      t.addEventListener('click', () => {
        wrap.querySelectorAll('.thumb').forEach(x => x.classList.remove('active'));
        t.classList.add('active');
        document.getElementById('detailBigImg').src = t.dataset.src;
        // If in 3D view, also update texture
        if (this._view === '3d') {
          Viewer3D.destroy();
          const p2 = { ...this._product, image: t.dataset.src };
          Viewer3D.mount('viewer3dCanvas', p2);
        }
      });
    });
  },

  _renderColors(p) {
    const COLOR_CSS = {
      White: '#f5f5f5', Black: '#1a1a1a', Gold: '#d4af37',
      Gray:  '#888',    Navy:  '#001f3f', Red:  '#c0392b',
    };
    const wrap  = document.getElementById('colorDots');
    const label = document.getElementById('selectedColorLabel');
    const colors = p.colors || [];
    this._color = colors[0] || null;
    if (label) label.textContent = this._color || '—';

    wrap.innerHTML = colors.map((c, i) => `
      <button class="color-dot${i===0?' active':''}" data-color="${c}"
        style="background:${COLOR_CSS[c]||c};${c==='White'?'border-color:#ccc':''}"
        title="${c}" aria-label="${c}"></button>
    `).join('');

    wrap.querySelectorAll('.color-dot').forEach(btn => {
      btn.addEventListener('click', () => {
        wrap.querySelectorAll('.color-dot').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this._color = btn.dataset.color;
        if (label) label.textContent = this._color;
      });
    });
  },

  _resetQty() {
    this._qty = 1;
    const el = document.getElementById('qtyVal');
    if (el) el.textContent = '1';
  },

  _updateWishlistBtn() {
    const btn = document.getElementById('detailWishlist');
    if (!btn || !this._product) return;
    btn.textContent = Wishlist.has(this._product.id) ? '♥ Wishlisted' : '♡ Wishlist';
  },

  _updateWhatsApp(p) {
    const link = document.getElementById('detailWhatsApp');
    if (!link) return;
    const msg = `Hello Pniktrix,\n\nI'm interested in "${p.name}" (${p.size}).\n\nCould you share more details?\n\nThank you!`;
    link.href = `https://wa.me/${Config.WHATSAPP}?text=${encodeURIComponent(msg)}`;
  },

  _bindOnce: false,

  bindEvents() {
    if (this._bindOnce) return;
    this._bindOnce = true;

    // Back button
    document.getElementById('backBtn')?.addEventListener('click', () => {
      _showPage('pageHome');
      SEO.resetToHome();
      Viewer3D.destroy();
    });

    // Qty
    document.getElementById('qtyInc')?.addEventListener('click', () => {
      this._qty = Math.min(99, this._qty + 1);
      document.getElementById('qtyVal').textContent = this._qty;
    });
    document.getElementById('qtyDec')?.addEventListener('click', () => {
      this._qty = Math.max(1, this._qty - 1);
      document.getElementById('qtyVal').textContent = this._qty;
    });

    // Add to cart
    document.getElementById('detailAddCart')?.addEventListener('click', () => {
      if (!this._product) return;
      if (!Inventory.canAdd(this._product)) { Utils.toast('Sorry, this item is out of stock.'); return; }
      Cart.add(this._product, this._qty, this._color);
      Metrics.recordAddToCart();
    });

    // Wishlist
    document.getElementById('detailWishlist')?.addEventListener('click', () => {
      if (!this._product) return;
      Wishlist.toggle(this._product);
      this._updateWishlistBtn();
    });

    // View toggle — photo ↔ 3D
    document.getElementById('tabPhoto')?.addEventListener('click', () => this._setView('photo'));
    document.getElementById('tab3d')?.addEventListener('click',    () => this._setView('3d'));
  },

  _setView(v) {
    this._view = v;
    const photoArea = document.getElementById('detailMainImg');
    const thumbsArea = document.getElementById('detailThumbs');
    const v3dWrap   = document.getElementById('viewer3dWrap');
    const tabPhoto  = document.getElementById('tabPhoto');
    const tab3d     = document.getElementById('tab3d');

    const is3d = v === '3d';
    photoArea?.classList.toggle('hidden', is3d);
    thumbsArea?.classList.toggle('hidden', is3d);
    v3dWrap?.classList.toggle('hidden', !is3d);
    tabPhoto?.classList.toggle('active', !is3d);
    tab3d?.classList.toggle('active', is3d);

    if (is3d && this._product) {
      Viewer3D.mount('viewer3dCanvas', this._product);
    } else {
      Viewer3D.destroy();
    }
  },
};

/* ═══════════════════════════════════════════════════════
   PAGE SWITCHER
   ═══════════════════════════════════════════════════════ */
function _showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById(id);
  if (target) target.classList.add('active');
}

/* ═══════════════════════════════════════════════════════
   PRODUCT GRID
   ═══════════════════════════════════════════════════════ */
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
    <article class="product-card" data-id="${p.id}" role="button" tabindex="0" aria-label="View ${p.name}">
      <div class="card-img-wrap">
        <img
          src="${ImageOptimizer.optimizeUrl(p.image, 400)}"
          alt="${p.name}"
          class="card-img"
          loading="lazy"
        />
      </div>
      <div class="card-body">
        <h3 class="card-name">${p.name}</h3>
        <p class="card-meta">${p.size} · ${p.finish}</p>
        <p class="card-price">${Utils.formatPrice(p.price)}</p>
        <div class="card-actions">
          <button class="btn-gold js-add-cart" data-id="${p.id}">Add to Cart</button>
          <button class="btn-wl js-wl${Wishlist.has(p.id)?' active':''}" data-id="${p.id}" aria-label="Wishlist">♡</button>
        </div>
      </div>
    </article>
  `).join('');

  // Observe new images for lazy load
  ImageOptimizer.observe();

  // Delegate: click card body → detail; click add-to-cart → cart; click wl → wishlist
  grid.addEventListener('click', _handleGridClick);
  grid.addEventListener('keydown', e => { if (e.key === 'Enter') _handleGridClick(e); });
}

function _handleGridClick(e) {
  // Add to cart button
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

  // Card → detail page
  const card = e.target.closest('.product-card');
  if (card) {
    const p = ProductManager.getById(card.dataset.id);
    if (p) DetailPage.show(p);
  }
}

/* ═══════════════════════════════════════════════════════
   CART DRAWER
   ═══════════════════════════════════════════════════════ */
function renderCartDrawer() {
  const body  = document.getElementById('cartItems');
  const items = Cart.getItems();
  if (!items.length) {
    body.innerHTML = '<p class="drawer-empty">Your cart is empty.</p>';
    document.getElementById('cartSubtotal').textContent = Utils.formatPrice(0);
    document.getElementById('cartShipping').textContent = 'Free';
    document.getElementById('cartTotal').textContent    = Utils.formatPrice(0);
    return;
  }

  body.innerHTML = items.map(it => `
    <div class="drawer-item" data-id="${it.id}" data-color="${it.color||''}">
      <img class="drawer-item-img js-item-detail" src="${it.image}" alt="${it.name}" data-id="${it.id}" loading="lazy"/>
      <div class="drawer-item-info">
        <p class="drawer-item-name js-item-detail" data-id="${it.id}">${it.name}</p>
        <p class="drawer-item-price">${Utils.formatPrice(it.price)}</p>
        <p class="drawer-item-meta">${it.color ? it.color : ''}${it.color ? ' · ' : ''}${Utils.formatPrice(it.price * it.qty)}</p>
        <div class="cart-item-qty">
          <button class="cq-btn js-cart-dec" data-id="${it.id}" data-color="${it.color||''}">−</button>
          <span class="cq-val">${it.qty}</span>
          <button class="cq-btn js-cart-inc" data-id="${it.id}" data-color="${it.color||''}">+</button>
        </div>
        <button class="drawer-item-remove js-cart-remove" data-id="${it.id}" data-color="${it.color||''}">Remove</button>
      </div>
    </div>
  `).join('');

  // Qty buttons
  body.querySelectorAll('.js-cart-inc').forEach(btn => {
    btn.addEventListener('click', () => {
      const it = Cart.getItems().find(i => i.id === Number(btn.dataset.id) && i.color === (btn.dataset.color||null));
      if (it) { Cart.setQty(it.id, it.color, it.qty + 1); renderCartDrawer(); }
    });
  });
  body.querySelectorAll('.js-cart-dec').forEach(btn => {
    btn.addEventListener('click', () => {
      const it = Cart.getItems().find(i => i.id === Number(btn.dataset.id) && i.color === (btn.dataset.color||null));
      if (it) { Cart.setQty(it.id, it.color, it.qty - 1); renderCartDrawer(); }
    });
  });
  body.querySelectorAll('.js-cart-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      Cart.remove(Number(btn.dataset.id), btn.dataset.color || null);
      renderCartDrawer();
    });
  });

  // Click image/name → go to product detail
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

  // Free shipping nudge
  const nudge = Monetization.freeShippingNudge(total);
  if (nudge) Utils.toast(nudge, 4000);
}

function openCart()  { renderCartDrawer(); document.getElementById('cartDrawer').classList.add('open'); document.body.style.overflow = 'hidden'; }
function closeCart() { document.getElementById('cartDrawer').classList.remove('open'); document.body.style.overflow = ''; }

/* ═══════════════════════════════════════════════════════
   WISHLIST DRAWER
   ═══════════════════════════════════════════════════════ */
function renderWishlistDrawer() {
  const body  = document.getElementById('wishlistItems');
  const items = Wishlist.getItems();
  if (!items.length) { body.innerHTML = '<p class="drawer-empty">Your wishlist is empty.</p>'; return; }

  body.innerHTML = items.map(it => `
    <div class="drawer-item">
      <img class="drawer-item-img js-wl-detail" src="${it.image}" alt="${it.name}" data-id="${it.id}" loading="lazy"/>
      <div class="drawer-item-info">
        <p class="drawer-item-name js-wl-detail" data-id="${it.id}">${it.name}</p>
        <p class="drawer-item-price">${Utils.formatPrice(it.price)}</p>
        <button class="drawer-item-remove js-wl-remove" data-id="${it.id}">Remove</button>
      </div>
    </div>
  `).join('');

  body.querySelectorAll('.js-wl-remove').forEach(btn => {
    btn.addEventListener('click', () => { Wishlist.remove(Number(btn.dataset.id)); renderWishlistDrawer(); });
  });

  // Click image/name → go to detail
  body.querySelectorAll('.js-wl-detail').forEach(el => {
    el.addEventListener('click', () => {
      const p = ProductManager.getById(el.dataset.id);
      if (p) { closeWishlist(); DetailPage.show(p); }
    });
  });
}

function openWishlist()  { renderWishlistDrawer(); document.getElementById('wishlistDrawer').classList.add('open'); document.body.style.overflow = 'hidden'; }
function closeWishlist() { document.getElementById('wishlistDrawer').classList.remove('open'); document.body.style.overflow = ''; }

/* ═══════════════════════════════════════════════════════
   CONTACT FORM
   ═══════════════════════════════════════════════════════ */
function bindContactForm() {
  document.getElementById('contactForm')?.addEventListener('submit', e => {
    e.preventDefault();
    const fd   = new FormData(e.target);
    const name = fd.get('name')?.trim(), email = fd.get('email')?.trim(), msg = fd.get('message')?.trim();
    if (!name || !email || !msg) { Utils.toast('Please fill in all fields.'); return; }
    Auth.setUser({ name, email });
    const text = `Hello Pniktrix 👋\n\nName: ${name}\nEmail: ${email}\n\nMessage:\n${msg}`;
    window.open(`https://wa.me/${Config.WHATSAPP}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
    e.target.reset();
    Utils.toast('Opening WhatsApp…');
  });
}

/* ═══════════════════════════════════════════════════════
   BOOT
   ═══════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Splash
  Splash.init();

  // 2. Load data
  const { products, banner } = await ProductManager.load();

  // 3. Banner
  Banner.render(banner);

  // 4. Render grid
  renderGrid(products);

  // 5. Filters
  Filters.init(products, filtered => renderGrid(filtered));

  // 6. Detail page events
  DetailPage.bindEvents();

  // 7. Cart drawer
  document.getElementById('cartToggle')?.addEventListener('click', openCart);
  document.getElementById('closeCart')?.addEventListener('click', closeCart);
  document.getElementById('cartOverlay')?.addEventListener('click', closeCart);
  document.getElementById('checkoutBtn')?.addEventListener('click', () => {
    Shiprocket.whatsappCheckout(Cart.getItems());
    Metrics.recordCheckout();
  });

  // 8. Wishlist drawer
  document.getElementById('wishlistToggle')?.addEventListener('click', openWishlist);
  document.getElementById('closeWishlist')?.addEventListener('click', closeWishlist);
  document.getElementById('wishlistOverlay')?.addEventListener('click', closeWishlist);

  // 9. Contact form
  bindContactForm();

  // 10. Hero CTA
  document.getElementById('heroCta')?.addEventListener('click', () => {
    document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
  });

  // 11. Logo → home
  document.getElementById('logoLink')?.addEventListener('click', e => {
    e.preventDefault();
    _showPage('pageHome');
    SEO.resetToHome();
    Viewer3D.destroy();
    window.scrollTo({ top: 0 });
  });

  // 12. Header scroll shadow
  window.addEventListener('scroll', () => {
    document.getElementById('siteHeader')?.classList.toggle('scrolled', window.scrollY > 10);
  }, { passive: true });

  // 13. Footer year
  const fy = document.getElementById('footerYear');
  if (fy) fy.textContent = new Date().getFullYear();

  // 14. A/B test hero CTA text
  const ctaVariant = ABTesting.assign('hero_cta', ['Explore Collection', 'Shop Now', 'View Prints']);
  const heroCta = document.getElementById('heroCta');
  if (heroCta) heroCta.textContent = ctaVariant;

  // 15. Handle ?product=ID deep link
  const qp = new URLSearchParams(window.location.search);
  if (qp.has('product')) {
    const p = ProductManager.getById(qp.get('product'));
    if (p) DetailPage.show(p);
  }

  // 16. Analytics
  Analytics.pageView();
  Metrics.recordPageView();

  console.log(`[Pniktrix] ✅ ${products.length} products loaded.`);
});
