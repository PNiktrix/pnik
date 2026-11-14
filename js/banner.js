/**
 * banner.js
 * Handles two separate banner elements:
 *  1. Top marquee strip — text items from banner.json "marquee" array
 *  2. Compact Hero image slider with sales tags & CTA links
 *
 * Resilient loader with automatic fallback and hover pause.
 */
const Banner = {
  _slides:   [],
  _current:  0,
  _timer:    null,
  _interval: 4500,

  _normalizeUrl(url) {
    if (!url || typeof url !== 'string') return url;
    if (url.toLowerCase().includes('banner1.jpg') && !url.includes('home decor')) {
      return 'data/home decor/banner1.jpg';
    }
    return url;
  },

  /* ── Load ──────────────────────────────────────── */
  async load() {
    try {
      let res = await fetch('data/banner.json');
      if (!res.ok) {
        res = await fetch('data/home decor/banner.json');
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      console.warn('[Banner] Using fallback banner data:', e);
      return {
        slides: [
          {
            id: 1,
            image: "data/home decor/banner1.jpg",
            alt: "Precision 3D Printed Home Decor, Flashcards & Keychains",
            title: "Precision 3D Printed Collections",
            tag: "NEW ARRIVALS · UP TO 45% OFF",
            link: "#products"
          }
        ],
        marquee: [
          "🌱 100% Eco-Friendly Biodegradable PLA",
          "⚡ Precision 0.16mm Layer 3D Printing",
          "🔥 LAUNCH SALE: Up to 50% OFF All Collections",
          "✨ Custom 3D Printing on Demand (WhatsApp Us)"
        ],
        autoplay: true,
        interval: 4500
      };
    }
  },

  /* ── Init ──────────────────────────────────────── */
  async init() {
    const data     = await this.load();
    this._slides   = (data.slides || []).map(s => ({
      ...s,
      image: this._normalizeUrl(s.image)
    }));
    this._interval = Math.max(data.interval || 4500, 3500);

    this._renderMarquee(data.marquee || []);
    this._renderSlider();

    if (data.autoplay && this._slides.length > 1) {
      this._startAutoplay();
    }
  },

  /* ── Marquee strip ─────────────────────────────── */
  _renderMarquee(items) {
    const track = document.getElementById('marqueeTrack');
    if (!track || !items.length) return;
    const doubled = [...items, ...items];
    track.innerHTML = doubled.map(t => `<span class="marquee-item">${t}</span>`).join('');
  },

  /* ── Image Slider ──────────────────────────────── */
  _renderSlider() {
    const wrap = document.getElementById('heroSlider');
    if (!wrap || !this._slides.length) return;

    wrap.innerHTML = this._slides.map((s, i) => `
      <div class="slide${i === 0 ? ' active' : ''}" data-idx="${i}">
        <img src="${s.image}" alt="${s.alt || ''}" loading="${i === 0 ? 'eager' : 'lazy'}"/>
        ${(s.title || s.tag) ? `
          <div class="slide-overlay">
            ${s.tag ? `<span class="slide-tag">${s.tag}</span>` : ''}
            ${s.title ? `<h2 class="slide-title">${s.title}</h2>` : ''}
            ${s.link ? `
              <a href="${s.link}" class="slide-cta btn-gold js-banner-link" data-link="${s.link}">
                ${s.link === '#keychainStudio' ? '🎨 Design in 3D (₹99)' : 'Explore Collection'}
              </a>
            ` : ''}
          </div>
        ` : ''}
      </div>
    `).join('');

    // Dots
    const dotsWrap = document.getElementById('sliderDots');
    if (dotsWrap) {
      if (this._slides.length > 1) {
        dotsWrap.innerHTML = this._slides.map((_, i) =>
          `<button class="slider-dot${i === 0 ? ' active' : ''}" data-idx="${i}" aria-label="Slide ${i + 1}"></button>`
        ).join('');
        dotsWrap.querySelectorAll('.slider-dot').forEach(btn => {
          btn.addEventListener('click', () => this.goTo(parseInt(btn.dataset.idx)));
        });
      } else {
        dotsWrap.innerHTML = '';
      }
    }

    // Arrows
    const prevBtn = document.getElementById('sliderPrev');
    const nextBtn = document.getElementById('sliderNext');
    if (this._slides.length <= 1) {
      if (prevBtn) prevBtn.style.display = 'none';
      if (nextBtn) nextBtn.style.display = 'none';
    } else {
      prevBtn?.addEventListener('click', () => {
        this.goTo((this._current - 1 + this._slides.length) % this._slides.length);
      });
      nextBtn?.addEventListener('click', () => {
        this.goTo((this._current + 1) % this._slides.length);
      });
    }

    // Pause on hover
    const parentWrap = wrap.closest('.hero-slider-wrap');
    if (parentWrap) {
      parentWrap.addEventListener('mouseenter', () => clearInterval(this._timer));
      parentWrap.addEventListener('mouseleave', () => this._restartAutoplay());
    }

    // Banner CTA clicks
    wrap.querySelectorAll('.js-banner-link').forEach(btn => {
      btn.addEventListener('click', e => {
        const link = btn.dataset.link;
        if (link === '#keychainStudio') {
          e.preventDefault();
          document.getElementById('keychainStudioTabBtn')?.click();
        } else if (link === '#customOrderSection') {
          e.preventDefault();
          document.getElementById('customOrderTabBtn')?.click();
        }
      });
    });

    // Touch swipe
    this._bindSwipe(wrap);
  },

  goTo(idx) {
    const wrap = document.getElementById('heroSlider');
    const dots = document.getElementById('sliderDots');
    if (!wrap) return;
    wrap.querySelectorAll('.slide').forEach((s, i) => s.classList.toggle('active', i === idx));
    dots?.querySelectorAll('.slider-dot').forEach((d, i) => d.classList.toggle('active', i === idx));
    this._current = idx;
    this._restartAutoplay();
  },

  _startAutoplay() {
    clearInterval(this._timer);
    this._timer = setInterval(() => {
      this.goTo((this._current + 1) % this._slides.length);
    }, this._interval);
  },

  _restartAutoplay() {
    clearInterval(this._timer);
    if (this._slides.length > 1) this._startAutoplay();
  },

  _bindSwipe(el) {
    let startX = 0;
    el.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
    el.addEventListener('touchend',   e => {
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) < 40) return;
      this.goTo(dx < 0
        ? (this._current + 1) % this._slides.length
        : (this._current - 1 + this._slides.length) % this._slides.length
      );
    }, { passive: true });
  },
};
