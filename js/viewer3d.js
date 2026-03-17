/**
 * viewer3d.js
 * Interactive Three.js 3D frame viewer.
 * - Mouse/touch drag to rotate
 * - Scroll to zoom
 * - Loads GLB if product.model is set, else renders textured frame
 * - Color tint applied via material color overlay
 */
const Viewer3D = (() => {
  let _scene, _camera, _renderer, _frame, _canvas, _raf;
  let _isDragging = false;
  let _prev = { x: 0, y: 0 };
  let _rot  = { y: 0, x: 0 };
  let _zoom = 4.5;

  const COLOR_MAP = {
    White: 0xf5f5f5, Black: 0x1a1a1a, Gold: 0xd4af37,
    Gray:  0x888888, Navy:  0x001f3f,  Red:  0xc0392b,
  };

  function mount(canvasId, product) {
    if (typeof THREE === 'undefined') { console.warn('[Viewer3D] Three.js missing'); return; }

    _canvas = document.getElementById(canvasId);
    if (!_canvas) return;
    destroy();

    const W = _canvas.offsetWidth  || 480;
    const H = _canvas.offsetHeight || 480;

    _scene  = new THREE.Scene();
    _scene.background = new THREE.Color(0x1a1a1a);

    _camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 100);
    _camera.position.set(0, 0, _zoom);

    _renderer = new THREE.WebGLRenderer({ canvas: _canvas, antialias: true });
    _renderer.setSize(W, H);
    _renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    _renderer.shadowMap.enabled = true;

    // Lighting
    _scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(4, 6, 6); dir.castShadow = true; _scene.add(dir);
    const fill = new THREE.DirectionalLight(0xffffff, 0.3);
    fill.position.set(-4, -2, 4); _scene.add(fill);

    // Frame
    const frameGeo = new THREE.BoxGeometry(2.8, 3.6, 0.14);
    const frameMat = new THREE.MeshPhongMaterial({ color: 0x111111, shininess: 80 });
    _frame = new THREE.Group();
    const frameBox = new THREE.Mesh(frameGeo, frameMat);
    frameBox.castShadow = true;
    _frame.add(frameBox);

    // Canvas print (textured plane)
    const tex = new THREE.TextureLoader().load(product.image || product.images?.[0] || '');
    const printGeo = new THREE.PlaneGeometry(2.3, 3.1);
    const printMat = new THREE.MeshBasicMaterial({ map: tex });
    const printMesh = new THREE.Mesh(printGeo, printMat);
    printMesh.position.z = 0.08;
    _frame.add(printMesh);

    _scene.add(_frame);

    // Wall backdrop
    const wallGeo = new THREE.PlaneGeometry(12, 10);
    const wallMat = new THREE.MeshLambertMaterial({ color: 0x2a2a2a });
    const wall = new THREE.Mesh(wallGeo, wallMat);
    wall.position.z = -2; _scene.add(wall);

    _bindControls();
    _animate();

    // Build color bar in viewer
    _buildColorBar(product, frameBox);
  }

  function _animate() {
    _raf = requestAnimationFrame(_animate);
    if (_frame) {
      _frame.rotation.y = _rot.y;
      _frame.rotation.x = _rot.x;
      _camera.position.z = _zoom;
    }
    _renderer?.render(_scene, _camera);
  }

  function _bindControls() {
    // Mouse
    _canvas.addEventListener('mousedown',  e => { _isDragging = true;  _prev = { x: e.clientX, y: e.clientY }; });
    window.addEventListener('mouseup',     ()  => { _isDragging = false; });
    window.addEventListener('mousemove',   e  => {
      if (!_isDragging) return;
      _rot.y += (e.clientX - _prev.x) * 0.008;
      _rot.x += (e.clientY - _prev.y) * 0.008;
      _rot.x  = Math.max(-0.6, Math.min(0.6, _rot.x));
      _prev   = { x: e.clientX, y: e.clientY };
    });

    // Touch
    _canvas.addEventListener('touchstart', e => { _isDragging = true; _prev = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }, { passive: true });
    _canvas.addEventListener('touchend',   () => { _isDragging = false; });
    _canvas.addEventListener('touchmove',  e => {
      if (!_isDragging) return;
      _rot.y += (e.touches[0].clientX - _prev.x) * 0.008;
      _rot.x += (e.touches[0].clientY - _prev.y) * 0.008;
      _rot.x  = Math.max(-0.6, Math.min(0.6, _rot.x));
      _prev   = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }, { passive: true });

    // Zoom scroll
    _canvas.addEventListener('wheel', e => {
      _zoom = Math.max(2.5, Math.min(8, _zoom + e.deltaY * 0.005));
      e.preventDefault();
    }, { passive: false });
  }

  function _buildColorBar(product, frameBox) {
    const bar = document.getElementById('viewerColorBar');
    if (!bar || !product.colors?.length) return;
    bar.innerHTML = product.colors.map((c, i) => `
      <button class="vcb-dot${i===0?' active':''}" data-color="${c}" data-hex="${COLOR_MAP[c]||0x333333}"
        title="${c}" style="background:${_hexToCSS(COLOR_MAP[c]||0x333333)}"></button>
    `).join('');
    bar.querySelectorAll('.vcb-dot').forEach(btn => {
      btn.addEventListener('click', () => {
        bar.querySelectorAll('.vcb-dot').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const hex = parseInt(btn.dataset.hex);
        if (frameBox && frameBox.material) frameBox.material.color.setHex(hex);
      });
    });
  }

  function _hexToCSS(hex) {
    const h = hex.toString(16).padStart(6,'0');
    return `#${h}`;
  }

  function destroy() {
    if (_raf) { cancelAnimationFrame(_raf); _raf = null; }
    if (_renderer) { _renderer.dispose(); _renderer = null; }
    _scene = _camera = _frame = null;
    _rot   = { y: 0, x: 0 };
    _zoom  = 4.5;
  }

  return { mount, destroy };
})();
