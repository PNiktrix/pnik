/**
 * app.js
 * Main application — bootstraps all modules and wires up the UI.
 */

const App = (() => {
  /* ── Boot ──────────────────────────────────────── */
  async function init() {
    // 1. Splash
    _hideSplash();

    // 2. Load products
    const products = await ProductManager.load();

    // 3. Render grid
    renderGrid(products);

    // 4. Filters
    Filters.init(products, filtered => renderGrid(filtered));

    // 5. Modal
    Modal.init();

    // 6. Cart & wishlist drawers
    _bindCartDrawer();
    _bindWishlistDrawer();

    // 7. Hero CTA
    document.getElementById('heroCta')?.addEventListener('click', () => {
      document.getElementById('products').scrollIntoView({ behavior: 'smooth' });
    });

    // 8. Contact form
    _bindContactForm();

    // 9. Header scroll effect
    _bindHeaderScroll();

    // 10. Footer year
    const fy = document.getElementById('footerYear');
    if (fy) fy.textContent = new Date().getFullYear();

    // 11. Analytics
    Analytics.trackPageView();
  }

  /* ── Splash ────────────────────────────────────── */
  function _hideSplash() {
    window.addEventListener('load', () => {
      setTimeout(() => {
        const s = document.getElementById('splashScreen');
        if (s) s.classList.add('hidden');
      }, 1800);
    });
  }

  /* ── Product grid ──────────────────────────────── */
  function renderGrid(products) {
    const grid     = document.getElementById('productsGrid');
    const noResults = document.getElementById('noResults');
    if (!grid) return;

    if (!products.length) {
      grid.innerHTML = '';
      noResults?.classList.remove('hidden');
      return;
    }
    noResults?.classList.add('hidden');

    grid.innerHTML = products.map(p => `
      <article class="product-card" data-id="${p.id}">
        <img
          class="product-card-image"
          src="${p.image}"
          alt="${p.name}"
          loading="lazy"
        />
        <div class="product-card-body">
          <h3 class="product-card-name">${p.name}</h3>
          <p class="product-card-price">${Utils.formatPrice(p.price)}</p>
          <div class="product-card-actions">
            <button class="btn-primary js-view-detail" data-id="${p.id}">View Details</button>
            <button
              class="btn-wishlist js-toggle-wishlist${Wishlist.has(p.id) ? ' active' : ''}"
              data-id="${p.id}"
              aria-label="Add to wishlist"
            >♡</button>
          </div>
        </div>
      </article>
    `).join('');

    // Delegate card events
    grid.addEventListener('click', _handleGridClick, { once: false });
  }

  let _gridListenerAttached = false;
  function _handleGridClick(e) {
    // View detail
    const detailBtn = e.target.closest('.js-view-detail');
    if (detailBtn) {
      const product = ProductManager.getById(detailBtn.dataset.id);
      if (product) Modal.open(product);
      return;
    }
    // Wishlist toggle
    const wishBtn = e.target.closest('.js-toggle-wishlist');
    if (wishBtn) {
      const product = ProductManager.getById(wishBtn.dataset.id);
      if (product) {
        Wishlist.toggle(product);
        wishBtn.classList.toggle('active', Wishlist.has(product.id));
      }
    }
  }

  /* ── Cart drawer ───────────────────────────────── */
  function _bindCartDrawer() {
    document.getElementById('cartToggle')?.addEventListener('click', openCart);
    document.getElementById('closeCartBtn')?.addEventListener('click', closeCart);
    document.getElementById('cartOverlay')?.addEventListener('click', closeCart);
    document.getElementById('checkoutBtn')?.addEventListener('click', _checkout);
  }

  function openCart() {
    _renderCartDrawer();
    document.getElementById('cartDrawer').classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeCart() {
    document.getElementById('cartDrawer').classList.remove('active');
    document.body.style.overflow = '';
  }

  function _renderCartDrawer() {
    const container = document.getElementById('cartItems');
    const items     = Cart.getItems();

    if (!items.length) {
      container.innerHTML = '<p class="drawer-empty">Your cart is empty.</p>';
      document.getElementById('cartSubtotal').textContent = Utils.formatPrice(0);
      document.getElementById('cartTotal').textContent    = Utils.formatPrice(0);
      document.getElementById('cartShipping').textContent = 'Free';
      return;
    }

    container.innerHTML = items.map(item => `
      <div class="drawer-item">
        <img src="${item.image}" alt="${item.name}" />
        <div class="drawer-item-info">
          <p class="drawer-item-name">${item.name}</p>
          <p class="drawer-item-price">${Utils.formatPrice(item.price)}</p>
          <p class="drawer-item-qty">Qty: ${item.qty}${item.color ? ` · ${item.color}` : ''}</p>
          <button class="drawer-item-remove js-cart-remove" data-id="${item.id}" data-color="${item.color || ''}">
            Remove
          </button>
        </div>
      </div>
    `).join('');

    // Remove buttons
    container.querySelectorAll('.js-cart-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        Cart.removeItem(Number(btn.dataset.id), btn.dataset.color || null);
        _renderCartDrawer();
      });
    });

    const total    = Cart.getTotal();
    const shipping = total >= Config.FREE_SHIPPING_MIN ? 'Free' : Utils.formatPrice(99);
    document.getElementById('cartSubtotal').textContent = Utils.formatPrice(total);
    document.getElementById('cartShipping').textContent = shipping;
    document.getElementById('cartTotal').textContent    = Utils.formatPrice(
      total + (shipping === 'Free' ? 0 : 99)
    );
  }

  /* ── Checkout → WhatsApp ───────────────────────── */
  function _checkout() {
    const items = Cart.getItems();
    if (!items.length) { Utils.toast('Your cart is empty!'); return; }

    const lines  = items.map(i => `• ${i.name} (Qty: ${i.qty}${i.color ? ', ' + i.color : ''})`).join('\n');
    const total  = Utils.formatPrice(Cart.getTotal());
    const text   = `Hello Pniktrix,\n\nI'd like to order the following prints:\n\n${lines}\n\nTotal: ${total}\n\nPlease assist with the order. Thank you.`;
    const url    = `https://wa.me/${Config.WHATSAPP}?text=${encodeURIComponent(text)}`;

    Analytics.trackInitiateCheckout(Cart.getTotal(), Cart.getCount());
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  /* ── Wishlist drawer ───────────────────────────── */
  function _bindWishlistDrawer() {
    document.getElementById('wishlistToggle')?.addEventListener('click', openWishlist);
    document.getElementById('closeWishlistBtn')?.addEventListener('click', closeWishlist);
    document.getElementById('wishlistOverlay')?.addEventListener('click', closeWishlist);
  }

  function openWishlist() {
    _renderWishlistDrawer();
    document.getElementById('wishlistDrawer').classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeWishlist() {
    document.getElementById('wishlistDrawer').classList.remove('active');
    document.body.style.overflow = '';
  }

  function _renderWishlistDrawer() {
    const container = document.getElementById('wishlistItems');
    const items     = Wishlist.getItems();

    if (!items.length) {
      container.innerHTML = '<p class="drawer-empty">Your wishlist is empty.</p>';
      return;
    }

    container.innerHTML = items.map(item => `
      <div class="drawer-item">
        <img src="${item.image}" alt="${item.name}" />
        <div class="drawer-item-info">
          <p class="drawer-item-name">${item.name}</p>
          <p class="drawer-item-price">${Utils.formatPrice(item.price)}</p>
          <button class="drawer-item-remove js-wl-remove" data-id="${item.id}">Remove</button>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('.js-wl-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        Wishlist.remove(Number(btn.dataset.id));
        _renderWishlistDrawer();
      });
    });
  }

  /* ── Contact form ──────────────────────────────── */
  function _bindContactForm() {
    document.getElementById('contactForm')?.addEventListener('submit', e => {
      e.preventDefault();
      const data  = new FormData(e.target);
      const name  = data.get('name')?.trim();
      const email = data.get('email')?.trim();
      const msg   = data.get('message')?.trim();

      if (!name || !email || !msg) {
        Utils.toast('Please fill in all fields.');
        return;
      }

      const text = `Hello Pniktrix,\n\nName: ${name}\nEmail: ${email}\n\nMessage:\n${msg}`;
      const url  = `https://wa.me/${Config.WHATSAPP}?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
      e.target.reset();
      Utils.toast('Opening WhatsApp…');
    });
  }

  /* ── Header scroll shadow ──────────────────────── */
  function _bindHeaderScroll() {
    const header = document.getElementById('siteHeader');
    if (!header) return;
    window.addEventListener('scroll', () => {
      header.classList.toggle('scrolled', window.scrollY > 20);
    }, { passive: true });
  }

  /* ── Start ─────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', init);

  return { renderGrid, openCart, closeCart, openWishlist, closeWishlist };
})();
