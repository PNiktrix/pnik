/**
 * banner.js
 * Handles two separate banner elements:
 *  1. Top marquee strip — text items from banner.json "marquee" array
 *  2. Hero image slider — 16:9 YouTube-banner-ratio slides from banner.json "slides" array
 *
 * Data source: data/banner.json (separate from products.json)
 */
const Banner = {
  _slides:   [],
  _current:  0,
  _timer:    null,
  _interval: 4000,

  /* ── Load ──────────────────────────────────────── */
  async load() {
    try {
      const res  = await fetch('data/banner.json');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      console.error('[Banner] Failed to load banner.json:', e);
      return { slides: [], marquee: [], autoplay: true, interval: 4000 };
    }
  },

  /* ── Init ──────────────────────────────────────── */
  async init() {
    const data     = await this.load();
    this._slides   = data.slides   || [];
    this._interval = data.interval || 4000;

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
    // Duplicate for seamless infinite loop
    const doubled = [...items, ...items];
    track.innerHTML = doubled.map(t => `<span class="marquee-item">${t}</span>`).join('');
  },

  /* ── Image Slider (16:9) ───────────────────────── */
  _renderSlider() {
    const wrap = document.getElementById('heroSlider');
    if (!wrap || !this._slides.length) return;

    wrap.innerHTML = this._slides.map((s, i) => `
      <div class="slide${i === 0 ? ' active' : ''}" data-idx="${i}">
        <img src="${s.image}" alt="${s.alt}" loading="${i === 0 ? 'eager' : 'lazy'}"/>
      </div>
    `).join('');

    // Dots
    const dotsWrap = document.getElementById('sliderDots');
    if (dotsWrap && this._slides.length > 1) {
      dotsWrap.innerHTML = this._slides.map((_, i) =>
        `<button class="slider-dot${i === 0 ? ' active' : ''}" data-idx="${i}" aria-label="Slide ${i + 1}"></button>`
      ).join('');
      dotsWrap.querySelectorAll('.slider-dot').forEach(btn => {
        btn.addEventListener('click', () => this.goTo(parseInt(btn.dataset.idx)));
      });
    }

    // Arrows
    document.getElementById('sliderPrev')?.addEventListener('click', () => {
      this.goTo((this._current - 1 + this._slides.length) % this._slides.length);
    });
    document.getElementById('sliderNext')?.addEventListener('click', () => {
      this.goTo((this._current + 1) % this._slides.length);
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