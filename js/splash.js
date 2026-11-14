/**
 * splash.js
 * Animated particle canvas splash screen with branded text.
 * Fast, non-intrusive, and skippable on click or tap.
 */
const Splash = {
  _particles: [],
  _raf:       null,
  _canvas:    null,
  _ctx:       null,

  init() {
    // If already seen in this session, hide immediately without delay
    if (sessionStorage.getItem('pniktrix_splashed')) {
      const el = document.getElementById('splashScreen');
      el?.remove();
      return;
    }

    this._canvas = document.getElementById('splashCanvas');
    if (!this._canvas) return;
    this._ctx    = this._canvas.getContext('2d');
    this._resize();
    this._spawnParticles(50);
    this._loop();

    const splashEl = document.getElementById('splashScreen');
    // Click or tap anywhere to immediately skip
    splashEl?.addEventListener('click', () => this._hide());
    splashEl?.addEventListener('touchstart', () => this._hide(), { passive: true });

    window.addEventListener('resize', () => this._resize());
    // Max duration: 1100ms (fast & engaging)
    setTimeout(() => this._hide(), 1100);
  },

  _resize() {
    if (!this._canvas) return;
    this._canvas.width  = window.innerWidth;
    this._canvas.height = window.innerHeight;
  },

  _spawnParticles(n) {
    for (let i = 0; i < n; i++) {
      this._particles.push({
        x:     Math.random() * window.innerWidth,
        y:     Math.random() * window.innerHeight,
        r:     Math.random() * 2 + .5,
        dx:    (Math.random() - .5) * .6,
        dy:    (Math.random() - .5) * .6,
        alpha: Math.random() * .5 + .2,
        gold:  Math.random() > .5,
      });
    }
  },

  _loop() {
    if (!this._canvas || !this._ctx) return;
    const ctx = this._ctx;
    const W   = this._canvas.width;
    const H   = this._canvas.height;
    ctx.clearRect(0, 0, W, H);

    this._particles.forEach(p => {
      p.x += p.dx; p.y += p.dy;
      if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.gold
        ? `rgba(212,175,55,${p.alpha})`
        : `rgba(255,255,255,${p.alpha * .5})`;
      ctx.fill();
    });

    this._raf = requestAnimationFrame(() => this._loop());
  },

  _hide() {
    sessionStorage.setItem('pniktrix_splashed', '1');
    const el = document.getElementById('splashScreen');
    if (!el || el.classList.contains('out')) return;
    el.classList.add('out');
    setTimeout(() => {
      if (this._raf) cancelAnimationFrame(this._raf);
      el?.remove();
    }, 450);
  },
};
