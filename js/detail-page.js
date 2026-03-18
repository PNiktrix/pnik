/**
 * detail-page.js
 * ─────────────────────────────────────────────────────────
 * Self-contained module for the Product Detail Page.
 *
 * Responsibilities
 *   • Populate all product fields (name, desc, specs, price, stock)
 *   • Photo gallery: main image + thumbnail strip, click to swap
 *   • Photo ↔ 3D tab toggle
 *   • 3D viewer: wall-colour swatches + frame-colour swatches
 *     - Uses model-viewer (<model-viewer>) when product.model (GLB) exists
 *     - Falls back to Three.js textured frame when no GLB
 *   • Colour selector for the print order
 *   • Quantity stepper
 *   • Add to Cart, Wishlist, WhatsApp-order buttons
 *   • Reviews section render
 *
 * Used by: app.js (DetailPage.show(product) called on card click)
 * ─────────────────────────────────────────────────────────
 */

const DetailPage = (() => {

  /* ── State ─────────────────────────────────────────────── */
  let _product  = null;
  let _qty      = 1;
  let _color    = null;
  let _view     = 'photo'; // 'photo' | '3d'
  let _bound    = false;   // static event bindings done once

  /* ── Colour maps ────────────────────────────────────────── */
  const COLOUR_CSS = {
    White: '#f5f5f5', Black: '#1a1a1a', Gold: '#d4af37',
    Gray:  '#888888', Navy:  '#001f3f', Red:  '#c0392b',
  };

  /* ══════════════════════════════════════════════════════════
     PUBLIC: show(product)
     Called every time a product card is clicked.
  ══════════════════════════════════════════════════════════ */
  function show(product) {
    if (!product) {
      console.error('[DetailPage] show() — product is null');
      return;
    }

    _product = product;
    _qty     = 1;
    _color   = product.colors?.[0] || null;
    _view    = 'photo';

    // ── 1. Fill every text field synchronously
    _fillFields(product);

    // ── 2. Photo gallery
    _renderMainImage(product);
    _renderThumbnails(product);

    // ── 3. Right-side controls
    _renderColourDots(product);
    _resetQty();
    _refreshWishlistBtn();
    _setWhatsAppLink(product);

    // ── 4. Ensure photo panel is shown, 3D hidden
    _switchView('photo');

    // ── 5. Customer reviews
    try { Reviews.render(product.id); } catch (_) {}

    // ── 6. Show the page — this is the critical step
    _showPage('pageDetail');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // ── 7. Non-critical analytics (never allowed to throw)
    try { SEO.setProduct(product);          } catch (_) {}
    try { Analytics.productView(product);  } catch (_) {}
    try { Metrics.recordProductView(product.id); } catch (_) {}
  }

  /* ══════════════════════════════════════════════════════════
     FIELD POPULATION
  ══════════════════════════════════════════════════════════ */
  function _fillFields(p) {
    _setText('detailCategory', p.category    || '');
    _setText('detailName',     p.name        || '');
    _setText('detailDesc',     p.description || '');
    _setText('detailType',     p.type        || '—');
    _setText('detailMaterial', p.material    || '—');
    _setText('detailFinish',   p.finish      || '—');
    _setText('detailPrice',    Utils.formatPrice(p.price));

    // Stock label + colour class
    const stockEl = document.getElementById('detailStock');
    if (stockEl) {
      stockEl.textContent  = Inventory.label(p);
      stockEl.className    = 'dp-stock ' + Inventory.cls(p);
    }
  }

  function _setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
    else console.warn('[DetailPage] Missing element:', id);
  }

  /* ══════════════════════════════════════════════════════════
     PHOTO GALLERY
  ══════════════════════════════════════════════════════════ */
  function _renderMainImage(p) {
    const img = document.getElementById('detailBigImg');
    if (!img) return;
    img.src = p.images?.[0] || p.image || '';
    img.alt = p.name || '';
  }

  function _renderThumbnails(p) {
    const wrap = document.getElementById('detailThumbs');
    if (!wrap) return;
    const imgs = p.images?.length ? p.images : [p.image];

    wrap.innerHTML = imgs.map((src, i) => `
      <div class="dp-thumb${i === 0 ? ' active' : ''}" data-src="${src}">
        <img src="${ImageOptimizer.optimizeUrl(src, 140)}"
             alt="View ${i + 1}"
             loading="lazy"
             style="pointer-events:none"/>
      </div>
    `).join('');

    wrap.querySelectorAll('.dp-thumb').forEach(thumb => {
      thumb.addEventListener('click', () => {
        wrap.querySelectorAll('.dp-thumb').forEach(t => t.classList.remove('active'));
        thumb.classList.add('active');
        const bigImg = document.getElementById('detailBigImg');
        if (bigImg) {
          bigImg.style.opacity = '0';
          setTimeout(() => {
            bigImg.src = thumb.dataset.src;
            bigImg.style.opacity = '1';
          }, 150);
        }
        // If 3D is active, reload viewer with new texture
        if (_view === '3d') {
          Viewer3D.destroy();
          Viewer3D.mount('dp3dStage', { ..._product, image: thumb.dataset.src });
        }
      });
    });
  }

  /* ══════════════════════════════════════════════════════════
     VIEW TOGGLE — photo vs 3D
  ══════════════════════════════════════════════════════════ */
  function _switchView(v) {
    _view = v;
    const is3d = v === '3d';

    document.getElementById('dpPhotoPanel')?.classList.toggle('hidden', is3d);
    document.getElementById('dp3dPanel')?.classList.toggle('hidden', !is3d);
    document.getElementById('tabPhoto')?.classList.toggle('active', !is3d);
    document.getElementById('tab3d')?.classList.toggle('active',    is3d);

    if (is3d && _product) {
      // Small delay so the panel is visible before Three.js reads dimensions
      setTimeout(() => Viewer3D.mount('dp3dStage', _product), 50);
    } else {
      Viewer3D.destroy();
    }
  }

  /* ══════════════════════════════════════════════════════════
     COLOUR DOTS (print colour selector)
  ══════════════════════════════════════════════════════════ */
  function _renderColourDots(p) {
    const wrap  = document.getElementById('colorDots');
    const label = document.getElementById('selectedColorLabel');
    if (!wrap) return;

    const colours = p.colors || [];
    _color = colours[0] || null;
    if (label) label.textContent = _color || '—';

    wrap.innerHTML = colours.map((c, i) => `
      <button
        class="dp-colour-dot${i === 0 ? ' active' : ''}"
        data-color="${c}"
        style="background:${COLOUR_CSS[c] || c}${c === 'White' ? ';border-color:#ccc' : ''}"
        title="${c}"
        aria-label="${c}"
      ></button>
    `).join('');

    wrap.querySelectorAll('.dp-colour-dot').forEach(btn => {
      btn.addEventListener('click', () => {
        wrap.querySelectorAll('.dp-colour-dot').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        _color = btn.dataset.color;
        if (label) label.textContent = _color;
      });
    });
  }

  /* ══════════════════════════════════════════════════════════
     QUANTITY STEPPER
  ══════════════════════════════════════════════════════════ */
  function _resetQty() {
    _qty = 1;
    const el = document.getElementById('qtyVal');
    if (el) el.textContent = '1';
  }

  function _setQty(n) {
    _qty = Math.max(1, Math.min(99, n));
    const el = document.getElementById('qtyVal');
    if (el) el.textContent = _qty;
  }

  /* ══════════════════════════════════════════════════════════
     WISHLIST BUTTON STATE
  ══════════════════════════════════════════════════════════ */
  function _refreshWishlistBtn() {
    const btn = document.getElementById('detailWishlist');
    if (!btn || !_product) return;
    const inList = Wishlist.has(_product.id);
    btn.textContent  = inList ? '♥ Wishlisted' : '♡ Wishlist';
    btn.style.color  = inList ? 'var(--gold)' : '';
  }

  /* ══════════════════════════════════════════════════════════
     WHATSAPP LINK
  ══════════════════════════════════════════════════════════ */
  function _setWhatsAppLink(p) {
    const link = document.getElementById('detailWhatsApp');
    if (!link) return;
    const msg = [
      `Hello Pniktrix 👋`,
      ``,
      `I'm interested in ordering:`,
      `• *${p.name}*`,
      `  Type: ${p.type}`,
      `  Material: ${p.material}`,
      `  Finish: ${p.finish}`,
      ``,
      `Could you please confirm availability and share payment details?`,
      `Thank you!`,
    ].join('\n');
    link.href = `https://wa.me/${Config.WHATSAPP}?text=${encodeURIComponent(msg)}`;
  }

  /* ══════════════════════════════════════════════════════════
     STATIC EVENT BINDINGS — called once at boot
  ══════════════════════════════════════════════════════════ */
  function bindEvents() {
    if (_bound) return;
    _bound = true;

    /* Back button */
    document.getElementById('backBtn')?.addEventListener('click', () => {
      _showPage('pageHome');
      Viewer3D.destroy();
      try { SEO.resetToHome(); } catch (_) {}
      window.scrollTo({ top: 0 });
    });

    /* Photo / 3D tabs */
    document.getElementById('tabPhoto')?.addEventListener('click', () => _switchView('photo'));
    document.getElementById('tab3d')?.addEventListener('click',    () => _switchView('3d'));

    /* Qty stepper */
    document.getElementById('qtyInc')?.addEventListener('click', () => _setQty(_qty + 1));
    document.getElementById('qtyDec')?.addEventListener('click', () => _setQty(_qty - 1));

    /* Add to Cart */
    document.getElementById('detailAddCart')?.addEventListener('click', () => {
      if (!_product) return;
      if (!Inventory.canAdd(_product)) {
        Utils.toast('Sorry — this item is out of stock.');
        return;
      }
      Cart.add(_product, _qty, _color);
      Metrics.recordAddToCart();
    });

    /* Wishlist */
    document.getElementById('detailWishlist')?.addEventListener('click', () => {
      if (!_product) return;
      Wishlist.toggle(_product);
      _refreshWishlistBtn();
    });

    /* 3D wall-colour swatches */
    document.getElementById('dpWallSwatches')?.addEventListener('click', e => {
      const btn = e.target.closest('.dp-wall-btn');
      if (!btn) return;
      document.querySelectorAll('.dp-wall-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      Viewer3D.setWallColor(btn.dataset.wall);
    });

    /* 3D frame-colour swatches */
    document.getElementById('dpModelSwatches')?.addEventListener('click', e => {
      const btn = e.target.closest('.dp-swatch');
      if (!btn) return;
      document.querySelectorAll('.dp-swatch').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      Viewer3D.setFrameColor(btn.dataset.color);
    });
  }

  /* ── Internal helper ─────────────────────────────────────── */
  function _showPage(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
    else console.error('[DetailPage] _showPage — not found:', id);
  }

  /* ── Public API ──────────────────────────────────────────── */
  return { show, bindEvents };

})();
