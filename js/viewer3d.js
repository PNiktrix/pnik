/**
 * viewer3d.js
 * ─────────────────────────────────────────────────────────
 * 3D viewer for the product detail page.
 *
 * Strategy
 *   1. If product.model (a .glb path) exists → use <model-viewer>
 *      web component (Google's official viewer). Provides:
 *        - Full orbit with no vertical limits
 *        - Auto-rotate
 *        - Touch / mouse drag + pinch zoom
 *        - Materials API for frame colour changes
 *   2. If no GLB → fall back to Three.js:
 *        - Renders a textured frame box with the product image
 *        - Mouse / touch drag to rotate (full 360 horizontal,
 *          clamped ±60° vertical)
 *        - Scroll to zoom
 *        - Frame colour via material.color.setStyle()
 *
 * Public API
 *   Viewer3D.mount(containerId, product)
 *   Viewer3D.destroy()
 *   Viewer3D.setWallColor(cssColor)   — called from detail-page.js wall swatches
 *   Viewer3D.setFrameColor(cssHex)    — called from detail-page.js frame swatches
 * ─────────────────────────────────────────────────────────
 */

const Viewer3D = (() => {

  /* ── Shared state ──────────────────────────────────────── */
  let _mode       = null;   // 'mv' | 'three' | null
  let _container  = null;   // HTMLElement
  let _wallColor  = '#F5F0E8';
  let _frameColor = '#1A1714';

  // Three.js state
  let _scene, _camera, _renderer, _frameBox, _raf;
  let _isDrag = false;
  let _prev   = { x: 0, y: 0 };
  let _rot    = { x: 0.1, y: 0 };
  let _zoom   = 4.5;

  /* ══════════════════════════════════════════════════════════
     PUBLIC: mount
  ══════════════════════════════════════════════════════════ */
  function mount(containerId, product) {
    destroy(); // clean up any previous instance

    _container = document.getElementById(containerId);
    if (!_container) {
      console.error('[Viewer3D] Container not found:', containerId);
      return;
    }

    // Set wall background on the container
    _container.style.background = _wallColor;

    if (product.model) {
      _mountModelViewer(product);
    } else {
      _mountThreeJS(product);
    }
  }

  /* ══════════════════════════════════════════════════════════
     PUBLIC: destroy
  ══════════════════════════════════════════════════════════ */
  function destroy() {
    // Stop Three.js loop
    if (_raf)      { cancelAnimationFrame(_raf); _raf = null; }
    if (_renderer) { _renderer.dispose();        _renderer = null; }
    _scene = _camera = _frameBox = null;
    _rot   = { x: 0.1, y: 0 };
    _zoom  = 4.5;
    _isDrag = false;

    // Clear container
    if (_container) _container.innerHTML = _hintHTML();
    _container = null;
    _mode      = null;
  }

  /* ══════════════════════════════════════════════════════════
     PUBLIC: setWallColor
  ══════════════════════════════════════════════════════════ */
  function setWallColor(cssColor) {
    _wallColor = cssColor;
    if (_container) _container.style.background = cssColor;
    // Also update Three.js wall mesh if active
    if (_mode === 'three' && _scene) {
      _scene.traverse(obj => {
        if (obj.userData.isWall && obj.material) {
          obj.material.color.setStyle(cssColor);
        }
      });
    }
  }

  /* ══════════════════════════════════════════════════════════
     PUBLIC: setFrameColor
  ══════════════════════════════════════════════════════════ */
  function setFrameColor(cssHex) {
    _frameColor = cssHex;

    if (_mode === 'mv') {
      // model-viewer: apply via Materials API
      const mv = _container?.querySelector('model-viewer');
      if (mv) _applyMVColor(mv, cssHex);
    } else if (_mode === 'three' && _frameBox) {
      // Three.js: direct material colour
      _frameBox.material.color.setStyle(cssHex);
    }
  }

  /* ══════════════════════════════════════════════════════════
     model-viewer branch
  ══════════════════════════════════════════════════════════ */
  function _mountModelViewer(product) {
    _mode = 'mv';

    const mv = document.createElement('model-viewer');
    mv.setAttribute('src',              product.model);
    mv.setAttribute('alt',              product.name);
    mv.setAttribute('camera-controls', '');
    mv.setAttribute('auto-rotate',      '');
    mv.setAttribute('auto-rotate-delay','0');
    mv.setAttribute('shadow-intensity', '1');
    mv.setAttribute('exposure',         '0.8');

    // Full orbit — remove default vertical clamp
    mv.setAttribute('min-camera-orbit', 'auto auto auto');
    mv.setAttribute('max-camera-orbit', 'auto auto auto');
    // Start slightly elevated so the art looks natural
    mv.setAttribute('camera-orbit',     '0deg 75deg auto');

    mv.style.cssText = 'width:100%;height:100%;background:transparent;--poster-color:transparent;';

    // Apply frame colour once model loads
    mv.addEventListener('load', () => _applyMVColor(mv, _frameColor), { once: true });

    // Clear the hint text and append
    _container.innerHTML = '';
    _container.appendChild(mv);
    _container.insertAdjacentHTML('beforeend', `<p class="dp-3d-hint">Drag to rotate · Scroll to zoom</p>`);
  }

  function _applyMVColor(mv, hex) {
    const model = mv.model;
    if (!model) return;
    const [r, g, b] = _hexToLinear(hex);
    model.materials.forEach(mat => {
      mat.pbrMetallicRoughness.setBaseColorFactor([r, g, b, 1]);
    });
  }

  /* ══════════════════════════════════════════════════════════
     Three.js fallback branch
  ══════════════════════════════════════════════════════════ */
  function _mountThreeJS(product) {
    if (typeof THREE === 'undefined') {
      _container.innerHTML = '<p style="color:#888;padding:32px;text-align:center">3D viewer unavailable</p>';
      return;
    }
    _mode = 'three';

    // Create a canvas inside the container
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'display:block;width:100%;height:100%;';
    _container.innerHTML = '';
    _container.appendChild(canvas);
    _container.insertAdjacentHTML('beforeend', `<p class="dp-3d-hint">Drag to rotate · Scroll to zoom</p>`);

    const W = _container.clientWidth  || 480;
    const H = _container.clientHeight || 480;

    // Scene
    _scene = new THREE.Scene();
    _scene.background = new THREE.Color(_wallColor);

    // Camera
    _camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 100);
    _camera.position.set(0, 0, _zoom);

    // Renderer
    _renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    _renderer.setSize(W, H);
    _renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    _renderer.shadowMap.enabled = true;

    // Lighting — directional from top-right for depth
    _scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const sun = new THREE.DirectionalLight(0xffffff, 0.9);
    sun.position.set(4, 6, 6); sun.castShadow = true; _scene.add(sun);
    const fill = new THREE.DirectionalLight(0xffffff, 0.25);
    fill.position.set(-4, -2, 4); _scene.add(fill);

    // Wall plane
    const wallMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(18, 14),
      new THREE.MeshLambertMaterial({ color: new THREE.Color(_wallColor) })
    );
    wallMesh.position.z     = -3;
    wallMesh.userData.isWall = true;
    _scene.add(wallMesh);

    // Frame (box)
    const frameGeo = new THREE.BoxGeometry(2.9, 3.7, 0.14);
    const frameMat = new THREE.MeshPhongMaterial({
      color:     new THREE.Color(_frameColor),
      shininess: 60,
    });
    const group = new THREE.Group();
    _frameBox   = new THREE.Mesh(frameGeo, frameMat);
    _frameBox.castShadow = true;
    group.add(_frameBox);

    // Print surface (image texture)
    const imgSrc = product.images?.[0] || product.image || '';
    const tex = new THREE.TextureLoader().load(imgSrc, () => { /* loaded */ });
    tex.colorSpace = THREE.SRGBColorSpace || 3001; // THREE r152+; safe for older
    const printMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(2.35, 3.15),
      new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })
    );
    printMesh.position.z = 0.075;
    group.add(printMesh);

    _scene.add(group);
    Object.defineProperty(group, '_frameRef', { value: group });

    // Controls
    _bindThreeControls(canvas, group);

    // Animation loop
    _loop(group);
  }

  function _loop(group) {
    _raf = requestAnimationFrame(() => _loop(group));
    group.rotation.y = _rot.y;
    group.rotation.x = _rot.x;
    _camera.position.z = _zoom;
    _renderer.render(_scene, _camera);
  }

  function _bindThreeControls(canvas, group) {
    // Mouse drag
    canvas.addEventListener('mousedown',  e => { _isDrag = true;  _prev = { x: e.clientX, y: e.clientY }; });
    window.addEventListener('mouseup',    ()  => { _isDrag = false; });
    window.addEventListener('mousemove',  e  => {
      if (!_isDrag) return;
      _rot.y += (e.clientX - _prev.x) * 0.009;
      _rot.x  = _clamp(_rot.x + (e.clientY - _prev.y) * 0.009, -1.05, 1.05);
      _prev   = { x: e.clientX, y: e.clientY };
    });

    // Touch drag
    canvas.addEventListener('touchstart', e => { _isDrag = true;  _prev = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }, { passive: true });
    canvas.addEventListener('touchend',   ()  => { _isDrag = false; });
    canvas.addEventListener('touchmove',  e  => {
      if (!_isDrag) return;
      _rot.y += (e.touches[0].clientX - _prev.x) * 0.009;
      _rot.x  = _clamp(_rot.x + (e.touches[0].clientY - _prev.y) * 0.009, -1.05, 1.05);
      _prev   = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }, { passive: true });

    // Scroll zoom
    canvas.addEventListener('wheel', e => {
      _zoom = _clamp(_zoom + e.deltaY * 0.005, 2.5, 9);
      e.preventDefault();
    }, { passive: false });
  }

  /* ══════════════════════════════════════════════════════════
     Helpers
  ══════════════════════════════════════════════════════════ */
  function _hintHTML() {
    return `<p class="dp-3d-hint">Drag to rotate · Scroll to zoom</p>`;
  }

  function _clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  // Convert sRGB hex → linear float [r, g, b] for model-viewer Materials API
  function _hexToLinear(hex) {
    const h  = hex.replace('#', '');
    const p  = s => parseInt(h.slice(s, s + 2), 16) / 255;
    const toL = c => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    return [toL(p(0)), toL(p(2)), toL(p(4))];
  }

  /* ── Public API ──────────────────────────────────────────── */
  return { mount, destroy, setWallColor, setFrameColor };

})();