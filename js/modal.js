/**
 * modal.js
 * Product detail modal — open/close, view toggle (photo ↔ 3D), colour & qty selectors.
 */

// eslint-disable-next-line no-unused-vars
const Modal = (() => {
  const COLOR_MAP = {
    White: '#ffffff', Black: '#1a1a1a', Gold: '#d4af37',
    Gray: '#888888', Navy: '#001f3f', Red: '#c0392b',
  };

  let _currentProduct = null;
  let _currentView    = 'image';

  /* ── Open ──────────────────────────────────────── */
  function open(product) {
    _currentProduct = product;
    _currentView    = 'image';

    // Populate fields
    document.getElementById('modalProductName').textContent    = product.name;
    document.getElementById('modalProductDescription').textContent = product.description || '';
    document.getElementById('modaltype').textContent           = product.type     || '—';
    document.getElementById('modalMaterial').textContent       = product.material || '—';
    document.getElementById('modalFinish').textContent         = product.finish   || '—';
    document.getElementById('modalPrice').textContent          = Utils.formatPrice(product.price || 0);
    document.getElementById('mainImage').src                   = product.image;
    document.getElementById('qtyInput').value                  = 1;

    _setupColors(product.colors || []);
    _showView('image');
    _setupCartBtn(product);
    _setupWishlistBtn(product);

    document.getElementById('productModal').classList.add('active');
    document.body.style.overflow = 'hidden';

    Analytics.trackProductView(product);
  }

  function close() {
    document.getElementById('productModal').classList.remove('active');
    document.body.style.overflow = '';
    Viewer3D.destroy();
    _currentProduct = null;
  }

  /* ── View toggle ─────────────────────────────── */
  function _showView(view) {
    _currentView = view;
    const imgContainer = document.getElementById('imageContainer');
    const viewer       = document.getElementById('viewer3d');
    const btnPhoto     = document.getElementById('btnViewPhoto');
    const btn3d        = document.getElementById('btnView3d');

    const isImg = view === 'image';

    imgContainer.classList.toggle('hidden', !isImg);
    viewer.classList.toggle('hidden', isImg);
    btnPhoto.classList.toggle('active', isImg);
    btn3d.classList.toggle('active', !isImg);

    if (!isImg && _currentProduct) {
      Viewer3D.mount('viewer3d', _currentProduct.image);
    } else {
      Viewer3D.destroy();
    }
  }

  /* ── Colour selector ─────────────────────────── */
  function _setupColors(colors) {
    const container = document.getElementById('colorOptions');
    container.innerHTML = '';

    colors.forEach((color, i) => {
      const btn = document.createElement('button');
      btn.className           = `color-option${i === 0 ? ' selected' : ''}`;
      btn.dataset.color       = color;
      btn.title               = color;
      btn.style.backgroundColor = COLOR_MAP[color] || color;
      btn.setAttribute('aria-label', color);
      btn.addEventListener('click', () => {
        container.querySelectorAll('.color-option').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      });
      container.appendChild(btn);
    });
  }

  /* ── Add to cart button ──────────────────────── */
  function _setupCartBtn(product) {
    const btn = document.getElementById('addToCartBtn');
    btn.onclick = () => {
      const color = document.querySelector('.color-option.selected')?.dataset.color || null;
      const qty   = Math.max(1, parseInt(document.getElementById('qtyInput').value, 10) || 1);
      Cart.addItem(product, qty, color);
    };
  }

  /* ── Wishlist button ─────────────────────────── */
  function _setupWishlistBtn(product) {
    const btn = document.getElementById('addToWishlistBtn');
    btn.textContent = Wishlist.has(product.id) ? '♥ Wishlisted' : '♡ Wishlist';
    btn.onclick = () => {
      Wishlist.toggle(product);
      btn.textContent = Wishlist.has(product.id) ? '♥ Wishlisted' : '♡ Wishlist';
    };
  }

  /* ── Qty controls ────────────────────────────── */
  function _bindQty() {
    document.getElementById('qtyInc')?.addEventListener('click', () => {
      const inp = document.getElementById('qtyInput');
      inp.value = Math.min(99, parseInt(inp.value, 10) + 1);
    });
    document.getElementById('qtyDec')?.addEventListener('click', () => {
      const inp = document.getElementById('qtyInput');
      inp.value = Math.max(1, parseInt(inp.value, 10) - 1);
    });
  }

  /* ── Close / overlay ─────────────────────────── */
  function _bindClose() {
    document.getElementById('closeModal')?.addEventListener('click', close);
    document.getElementById('modalOverlay')?.addEventListener('click', close);
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') close();
    });
  }

  /* ── View toggle buttons ─────────────────────── */
  function _bindViewToggle() {
    document.getElementById('btnViewPhoto')?.addEventListener('click', () => _showView('image'));
    document.getElementById('btnView3d')?.addEventListener('click',    () => _showView('3d'));
  }

  function init() {
    _bindClose();
    _bindQty();
    _bindViewToggle();
  }

  return { init, open, close };
})();
