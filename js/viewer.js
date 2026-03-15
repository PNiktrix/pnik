// ============================================================
// viewer.js — ImageViewer
// ============================================================
// Image viewer popup with:
//   - Horizontal sliding strip (not fade) — feels like real slider
//   - Pinch-to-zoom on each image independently
//   - Image validation — broken images are silently skipped
//   - Dots only shown when more than 1 valid image exists
//   - Dot becomes pill shape when active (not just a colour change)
//   - Add to Order / Remove from Order toggles cart
//   - Tap blank overlay or X Close to dismiss
// ============================================================

class ImageViewer {
  constructor(overlayId, cart, onCartChange) {
    this._overlay     = document.getElementById(overlayId);
    this._imgWrap     = document.getElementById("zv-img-wrap");
    this._dotsEl      = document.getElementById("zv-dots");
    this._nameEl      = document.getElementById("zv-name");
    this._addBtn      = document.getElementById("zv-add-btn");
    this.cart         = cart;
    this.onCartChange = onCartChange;

    this._product    = null;   // currently open product
    this._validImgs  = [];     // images that actually loaded (404s filtered out)
    this._idx        = 0;      // current slide index
    this._strip      = null;   // the inner sliding div

    // Pinch zoom state per-slide
    this._pinch = { active: false, startDist: 0, scale: 1, el: null };
  }

  // ── Public API ────────────────────────────────────────────

  // Open viewer immediately — no waiting for image validation
  open(product) {
    this._product   = product;
    this._idx       = 0;

    // Use zoomImages directly — show overlay right away
    // If an image fails to load the browser shows nothing for that slide
    // which is better than making the user wait
    this._validImgs = (product.zoomImages || product.cardImages || [product.image])
      .filter(Boolean);

    if (!this._validImgs.length) return;

    this._buildStrip();
    this._buildDots();
    this._nameEl.textContent = product.name;
    this._syncAddBtn();

    // Show overlay immediately — no async delay
    this._overlay.classList.add("show");
    document.body.style.overflow = "hidden";
  }

  close() {
    this._overlay.classList.remove("show");
    document.body.style.overflow = "";
    // Reset any zoom on close
    this._resetZoom();
  }

  // Called from HTML onclick on Add to Order button
  addToCart() {
    if (!this._product) return;
    this.cart.toggle(this._product.id);
    this.onCartChange(this._product.id);
    this._syncAddBtn();
    // Close with slight delay so user sees button state change
    setTimeout(() => this.close(), 300);
  }

  // ── Private: image building ───────────────────────────────

  _buildStrip() {
    this._imgWrap.innerHTML = `<div class="zv-strip" id="zv-strip">${
      this._validImgs.map((src, i) =>
        `<div class="zv-slide" data-i="${i}">
          <img src="${src}" alt="View ${i + 1}" loading="${i === 0 ? "eager" : "lazy"}"/>
        </div>`
      ).join("")
    }</div>`;

    this._strip = document.getElementById("zv-strip");

    // Snap to first slide instantly with no animation
    this._strip.style.transform = "translateX(0)";

    // Bind swipe and pinch immediately — width measured on first touch
    // so it is always accurate regardless of animation state
    this._bindSwipe();
    this._bindPinch();
  }

  _buildDots() {
    // No dots if only 1 image — nothing to navigate
    if (this._validImgs.length <= 1) {
      this._dotsEl.innerHTML = "";
      return;
    }

    this._dotsEl.innerHTML = this._validImgs.map((_, i) =>
      `<span class="zv-dot${i === 0 ? " on" : ""}" data-i="${i}"></span>`
    ).join("");

    // Dot tap navigation
    this._dotsEl.querySelectorAll(".zv-dot").forEach(d =>
      d.addEventListener("click", () => this._goTo(+d.dataset.i))
    );
  }

  // ── Private: navigation ───────────────────────────────────

  _goTo(i, animate = true) {
    if (!this._strip) return;
    this._idx = Math.max(0, Math.min(i, this._validImgs.length - 1));

    // Measure width fresh each time — overlay is visible so it is accurate
    const w = this._imgWrap.getBoundingClientRect().width || 300;

    if (!animate) {
      this._strip.classList.add("dragging");
      this._strip.style.transform = `translateX(-${this._idx * w}px)`;
      this._strip.offsetHeight;
      this._strip.classList.remove("dragging");
    } else {
      this._strip.classList.remove("dragging");
      this._strip.style.transform = `translateX(-${this._idx * w}px)`;
    }

    this._dotsEl.querySelectorAll(".zv-dot").forEach((d, j) =>
      d.classList.toggle("on", j === this._idx)
    );
    this._resetZoom();
  }

  // ── Private: swipe ────────────────────────────────────────
  // Strip follows the finger in real time — feels like a real photo gallery

  _bindSwipe() {
    let startX     = 0;
    let startY     = 0;
    let curX       = 0;
    let isDragging = false;
    let isHoriz    = false;
    let w          = 0;

    const snap = () => {
      this._strip.classList.remove("dragging");
      const dx    = curX - startX;
      const total = this._validImgs.length;
      if (Math.abs(dx) > w * 0.2) {
        dx < 0
          ? this._goTo(Math.min(this._idx + 1, total - 1))
          : this._goTo(Math.max(this._idx - 1, 0));
      } else {
        this._goTo(this._idx);
      }
    };

    this._imgWrap.addEventListener("touchstart", e => {
      if (e.touches.length !== 1) return;
      // Measure width at start of each swipe — overlay is visible so accurate
      w          = this._imgWrap.getBoundingClientRect().width || 300;
      startX     = e.touches[0].clientX;
      startY     = e.touches[0].clientY;
      curX       = startX;
      isDragging = true;
      isHoriz    = false;
    }, { passive: true });

    this._imgWrap.addEventListener("touchmove", e => {
      if (!isDragging || e.touches.length !== 1) return;
      curX = e.touches[0].clientX;
      const dx = curX - startX;
      const dy = e.touches[0].clientY - startY;

      if (!isHoriz && Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
      if (!isHoriz) {
        isHoriz = Math.abs(dx) > Math.abs(dy);
        if (!isHoriz) { isDragging = false; return; }
      }

      e.preventDefault();
      const liveOffset = (this._idx * w) - dx;
      this._strip.classList.add("dragging");
      this._strip.style.transform = `translateX(-${liveOffset}px)`;
    }, { passive: false });

    this._imgWrap.addEventListener("touchend", e => {
      if (!isDragging) return;
      isDragging = false;
      snap();
    }, { passive: true });

    this._imgWrap.addEventListener("touchcancel", () => {
      isDragging = false;
      snap();
    }, { passive: true });
  }

  // ── Private: pinch zoom ───────────────────────────────────
  // Pinch zoom applies only to the current slide image
  // The image scales in place — strip sliding still works normally

  _bindPinch() {
    this._imgWrap.addEventListener("touchstart", e => {
      if (e.touches.length !== 2) return;

      // Two fingers — start pinch
      this._pinch.active    = true;
      this._pinch.startDist = this._touchDist(e.touches);
      // Target the image inside the active slide
      const activeSlide = this._strip?.querySelector(`.zv-slide[data-i="${this._idx}"] img`);
      this._pinch.el = activeSlide;
    }, { passive: true });

    this._imgWrap.addEventListener("touchmove", e => {
      if (!this._pinch.active || e.touches.length !== 2) return;
      e.preventDefault();  // prevent page scroll during pinch

      const dist  = this._touchDist(e.touches);
      const ratio = dist / this._pinch.startDist;
      // Clamp scale: min 1x (no zoom out below natural), max 4x
      this._pinch.scale = Math.min(Math.max(ratio, 1), 4);

      if (this._pinch.el) {
        this._pinch.el.style.transform = `scale(${this._pinch.scale})`;
        this._pinch.el.style.cursor    = this._pinch.scale > 1 ? "zoom-out" : "zoom-in";
      }
    }, { passive: false });

    this._imgWrap.addEventListener("touchend", e => {
      // End pinch when fingers lift — keep zoom level
      if (e.touches.length < 2) this._pinch.active = false;
    }, { passive: true });

    // Double tap to reset zoom
    let lastTap = 0;
    this._imgWrap.addEventListener("touchend", e => {
      const now = Date.now();
      if (now - lastTap < 300) this._resetZoom();
      lastTap = now;
    }, { passive: true });
  }

  _resetZoom() {
    if (this._pinch.el) {
      this._pinch.el.style.transform = "scale(1)";
      this._pinch.el.style.cursor    = "zoom-in";
    }
    this._pinch = { active: false, startDist: 0, scale: 1, el: null };
  }

  // Distance between two touch points
  _touchDist(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // ── Private: image validation ─────────────────────────────
  // Loads each image URL — if it errors (404 or broken) it is excluded
  // Returns array of only valid image URLs

  _validateImages(urls) {
    const checks = (urls || []).map(src =>
      new Promise(resolve => {
        const img = new Image();
        img.onload  = () => resolve(src);    // valid — keep it
        img.onerror = () => resolve(null);   // broken — exclude it
        img.src = src;
      })
    );
    return Promise.all(checks).then(results =>
      results.filter(Boolean)  // remove nulls (failed images)
    );
  }

  // ── Private: sync button ──────────────────────────────────

  _syncAddBtn() {
    if (!this._product || !this._addBtn) return;
    const inCart = this.cart.has(this._product.id);
    this._addBtn.textContent = inCart ? "Remove from Order" : "Add to Order";
    this._addBtn.classList.toggle("in-cart", inCart);
  }
}