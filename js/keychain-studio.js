/**
 * keychain-studio.js
 * ─────────────────────────────────────────────────────────
 * Parametric 3D Keychain Maker inspired by MakerWorld MakerLab.
 * Mobile-first, 100% client-side (ZERO backend needed).
 *
 * Features:
 *   1. Real-time 3D interactive preview with Three.js (touch & mouse orbit).
 *   2. Dual-color multi-material 3D printing simulation (Base plate + Raised text).
 *   3. 5 Parametric Base Shapes: Contour outline, Pill/Capsule, Rounded Tag, Hex Shield, Heart.
 *   4. Keyring loop with metallic split ring visualization.
 *   5. True 3MF client-side export with multi-material color metadata (Bambu Studio, OrcaSlicer, PrusaSlicer ready).
 *   6. Seamless WhatsApp order workflow (pre-filled design specs for ₹99).
 * ─────────────────────────────────────────────────────────
 */

const KeychainStudio = (() => {
  /* ── State ── */
  const state = {
    text:          'ALEX',
    fontKey:       'helvetiker',
    shape:         'contour',   // 'contour' | 'pill' | 'tag' | 'hex' | 'heart'
    baseColor:     '#1A1A1A',   // Matte Black
    textColor:     '#D4AF37',   // Silk Gold
    holePos:       'left',      // 'left' | 'top' | 'right' | 'none'
    sizePreset:    'standard',  // 'compact' (55mm) | 'standard' (75mm) | 'large' (95mm)
    baseThickness: 3.0,         // mm
    textHeight:    2.0,         // mm
    price:         99,          // ₹99
  };

  const FONTS_DATA = {};
  let _scene, _camera, _renderer;
  let _container, _canvasWrap;
  let _baseMesh, _textMesh, _ringMesh;
  let _isDragging = false;
  let _prevMouse = { x: 0, y: 0 };
  let _rot = { x: 0.35, y: -0.2 };
  let _targetRot = { x: 0.35, y: -0.2 };
  let _zoom = 85;
  let _targetZoom = 85;
  let _animId = null;
  let _isInitialized = false;

  const FONT_URLS = {
    helvetiker: 'data/fonts/helvetiker_bold.typeface.json',
    gentilis:   'data/fonts/gentilis_bold.typeface.json',
    optimer:    'data/fonts/optimer_bold.typeface.json',
  };

  /* ══════════════════════════════════════════════════════════
     INITIALIZATION
  ══════════════════════════════════════════════════════════ */
  async function init(containerId) {
    _container = document.getElementById(containerId);
    if (!_container) return;

    _canvasWrap = _container.querySelector('.kc-3d-wrap') || document.getElementById('kc3dStage');
    if (!_canvasWrap) return;

    // Load default font first
    await _loadFont('helvetiker');

    _initThree();
    _bindUI();
    _rebuildMesh();

    _isInitialized = true;
    console.log('[KeychainStudio] Initialized successfully');
  }

  async function _loadFont(key) {
    if (FONTS_DATA[key]) return FONTS_DATA[key];
    try {
      const res = await fetch(FONT_URLS[key]);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      FONTS_DATA[key] = json;
      return json;
    } catch (e) {
      console.warn(`[KeychainStudio] Failed loading font ${key}:`, e);
      return null;
    }
  }

  /* ══════════════════════════════════════════════════════════
     THREE.JS 3D SCENE SETUP
  ══════════════════════════════════════════════════════════ */
  function _initThree() {
    const W = _canvasWrap.clientWidth || 360;
    const H = _canvasWrap.clientHeight || 280;

    _scene = new THREE.Scene();
    _scene.background = new THREE.Color(0x131418);

    // Camera
    _camera = new THREE.PerspectiveCamera(40, W / H, 1, 1000);
    _camera.position.set(0, 0, _zoom);

    // Renderer
    _renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    _renderer.setSize(W, H);
    _renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    _renderer.shadowMap.enabled = true;
    _renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    _canvasWrap.innerHTML = '';
    _canvasWrap.appendChild(_renderer.domElement);

    // Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    _scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 0.85);
    keyLight.position.set(40, 60, 70);
    keyLight.castShadow = true;
    _scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xd4af37, 0.4);
    fillLight.position.set(-50, -30, 40);
    _scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.6);
    rimLight.position.set(0, -60, -40);
    _scene.add(rimLight);

    // Shadow plane
    const shadowGeo = new THREE.PlaneGeometry(240, 240);
    const shadowMat = new THREE.ShadowMaterial({ opacity: 0.35 });
    const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
    shadowPlane.position.z = -5;
    shadowPlane.receiveShadow = true;
    _scene.add(shadowPlane);

    // Controls: Touch and mouse orbit
    _bindControls(_canvasWrap);

    // Animation Loop
    _animate();

    window.addEventListener('resize', _onResize);
  }

  function _onResize() {
    if (!_canvasWrap || !_renderer || !_camera) return;
    const W = _canvasWrap.clientWidth;
    const H = _canvasWrap.clientHeight;
    if (!W || !H) return;
    _camera.aspect = W / H;
    _camera.updateProjectionMatrix();
    _renderer.setSize(W, H);
  }

  function _bindControls(dom) {
    dom.style.touchAction = 'none';

    dom.addEventListener('pointerdown', e => {
      _isDragging = true;
      _prevMouse = { x: e.clientX, y: e.clientY };
      dom.setPointerCapture?.(e.pointerId);
    });

    dom.addEventListener('pointermove', e => {
      if (!_isDragging) return;
      const dx = e.clientX - _prevMouse.x;
      const dy = e.clientY - _prevMouse.y;
      _targetRot.y += dx * 0.012;
      _targetRot.x += dy * 0.012;
      // Clamp vertical tilt
      _targetRot.x = Math.max(-0.6, Math.min(1.2, _targetRot.x));
      _prevMouse = { x: e.clientX, y: e.clientY };
    });

    const stopDrag = () => { _isDragging = false; };
    dom.addEventListener('pointerup', stopDrag);
    dom.addEventListener('pointercancel', stopDrag);

    // Mouse wheel zoom
    dom.addEventListener('wheel', e => {
      e.preventDefault();
      _targetZoom += e.deltaY * 0.05;
      _targetZoom = Math.max(45, Math.min(160, _targetZoom));
    }, { passive: false });

    // Touch pinch zoom
    let startDist = 0;
    dom.addEventListener('touchstart', e => {
      if (e.touches.length === 2) {
        startDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
      }
    }, { passive: true });

    dom.addEventListener('touchmove', e => {
      if (e.touches.length === 2) {
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const diff = (startDist - dist) * 0.25;
        _targetZoom = Math.max(45, Math.min(160, _targetZoom + diff));
        startDist = dist;
      }
    }, { passive: true });
  }

  function _animate() {
    _animId = requestAnimationFrame(_animate);

    // Smooth inertia
    _rot.x += (_targetRot.x - _rot.x) * 0.12;
    _rot.y += (_targetRot.y - _rot.y) * 0.12;
    _zoom  += (_targetZoom - _zoom) * 0.15;

    // Apply rotation around center
    const r = _zoom;
    _camera.position.x = r * Math.sin(_rot.y) * Math.cos(_rot.x);
    _camera.position.y = -r * Math.sin(_rot.x);
    _camera.position.z = r * Math.cos(_rot.y) * Math.cos(_rot.x);
    _camera.lookAt(0, 0, state.baseThickness * 0.5);

    _renderer.render(_scene, _camera);
  }

  /* ══════════════════════════════════════════════════════════
     PARAMETRIC 3D MESH GENERATOR
  ══════════════════════════════════════════════════════════ */
  function _rebuildMesh() {
    if (!_scene) return;

    // Remove old meshes
    if (_baseMesh) { _scene.remove(_baseMesh); _baseMesh.geometry.dispose(); }
    if (_textMesh) { _scene.remove(_textMesh); _textMesh.geometry.dispose(); }
    if (_ringMesh) { _scene.remove(_ringMesh); _ringMesh.geometry.dispose(); }

    const fontData = FONTS_DATA[state.fontKey] || FONTS_DATA['helvetiker'];
    if (!fontData) return;

    // ── 1. Build text shapes & calculate dimensions
    const textRaw = (state.text || 'PNIK').trim();
    const targetLengthMap = { compact: 55, standard: 75, large: 95 };
    const targetLength = targetLengthMap[state.sizePreset] || 75;

    const { textShapes, textBounds, textScale } = _generateTextShapes(textRaw, fontData, targetLength * 0.72);

    // ── 2. Build Base Plate Shape
    const baseShape = _generateBaseShape(textBounds, state.shape, state.holePos);

    // ── 3. Base Extrusion
    const baseExtrudeSettings = {
      depth: state.baseThickness,
      bevelEnabled: true,
      bevelThickness: 0.4,
      bevelSize: 0.3,
      bevelSegments: 2,
    };
    const baseGeo = new THREE.ExtrudeGeometry(baseShape, baseExtrudeSettings);
    baseGeo.computeVertexNormals();

    const baseMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(state.baseColor),
      roughness: 0.45,
      metalness: 0.1,
    });
    _baseMesh = new THREE.Mesh(baseGeo, baseMat);
    _baseMesh.castShadow = true;
    _baseMesh.receiveShadow = true;
    _scene.add(_baseMesh);

    // ── 4. Text Extrusion (Sits on top of base plate)
    if (textShapes.length > 0) {
      const textExtrudeSettings = {
        depth: state.textHeight,
        bevelEnabled: true,
        bevelThickness: 0.25,
        bevelSize: 0.18,
        bevelSegments: 2,
      };
      const textGeo = new THREE.ExtrudeGeometry(textShapes, textExtrudeSettings);
      textGeo.computeVertexNormals();

      // Center text horizontally & vertically on base, place on top (Z = baseThickness)
      const textOffsetZ = state.baseThickness + 0.05;
      textGeo.translate(0, 0, textOffsetZ);

      // Create silk / glossy filament material
      const isGold = state.textColor.toLowerCase() === '#d4af37' || state.textColor.toLowerCase() === '#ffd700';
      const textMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(state.textColor),
        roughness: isGold ? 0.25 : 0.38,
        metalness: isGold ? 0.45 : 0.08,
      });

      _textMesh = new THREE.Mesh(textGeo, textMat);
      _textMesh.castShadow = true;
      _scene.add(_textMesh);
    }

    // ── 5. Metallic Split Ring (visualization only)
    if (state.holePos !== 'none') {
      _ringMesh = _generateKeyringMesh(textBounds, state.shape, state.holePos);
      if (_ringMesh) _scene.add(_ringMesh);
    }

    // ── 6. Update Dimension Badges in UI
    _updateDimensionBadge(textBounds, state.holePos);
  }

  /* ── Text Glyph to ShapePath Parser ── */
  function _generateTextShapes(text, fontData, targetWidth) {
    let cursorX = 0;
    const resolution = fontData.resolution || 1000;
    const paths = [];

    // Calculate unscaled total advance
    let totalAdvance = 0;
    for (let i = 0; i < text.length; i++) {
      const glyph = fontData.glyphs[text[i]] || fontData.glyphs['?'] || { ha: 600 };
      totalAdvance += glyph.ha || 600;
    }
    if (totalAdvance === 0) totalAdvance = 1000;

    // Scale so text width matches targetWidth
    const scale = targetWidth / totalAdvance;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const glyph = fontData.glyphs[char] || fontData.glyphs['?'];
      if (glyph && glyph.o) {
        const shapePath = new THREE.ShapePath();
        const commands = glyph.o.split(' ');
        for (let j = 0; j < commands.length; ) {
          const action = commands[j++];
          if (action === 'm') {
            const x = (parseFloat(commands[j++]) * scale) + cursorX;
            const y = parseFloat(commands[j++]) * scale;
            shapePath.moveTo(x, y);
          } else if (action === 'l') {
            const x = (parseFloat(commands[j++]) * scale) + cursorX;
            const y = parseFloat(commands[j++]) * scale;
            shapePath.lineTo(x, y);
          } else if (action === 'q') {
            const x1 = (parseFloat(commands[j++]) * scale) + cursorX;
            const y1 = parseFloat(commands[j++]) * scale;
            const x = (parseFloat(commands[j++]) * scale) + cursorX;
            const y = parseFloat(commands[j++]) * scale;
            shapePath.quadraticCurveTo(x1, y1, x, y);
          } else if (action === 'b') {
            const x1 = (parseFloat(commands[j++]) * scale) + cursorX;
            const y1 = parseFloat(commands[j++]) * scale;
            const x2 = (parseFloat(commands[j++]) * scale) + cursorX;
            const y2 = parseFloat(commands[j++]) * scale;
            const x = (parseFloat(commands[j++]) * scale) + cursorX;
            const y = parseFloat(commands[j++]) * scale;
            shapePath.bezierCurveTo(x1, y1, x2, y2, x, y);
          }
        }
        paths.push(shapePath);
      }
      cursorX += (glyph.ha || 600) * scale;
    }

    // Convert ShapePaths to 2D Shapes (holes resolved automatically)
    const shapes = [];
    paths.forEach(sp => {
      const subShapes = sp.toShapes(true);
      shapes.push(...subShapes);
    });

    // Compute bounding box
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    shapes.forEach(s => {
      s.getPoints().forEach(p => {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
      });
    });

    if (minX === Infinity) { minX = -20; maxX = 20; minY = -6; maxY = 6; }

    const textWidth  = maxX - minX;
    const textHeight = maxY - minY;
    const centerX    = minX + textWidth / 2;
    const centerY    = minY + textHeight / 2;

    // Center shapes around origin
    shapes.forEach(s => {
      s.curves.forEach(c => {
        if (c.v1) { c.v1.x -= centerX; c.v1.y -= centerY; }
        if (c.v2) { c.v2.x -= centerX; c.v2.y -= centerY; }
        if (c.v0) { c.v0.x -= centerX; c.v0.y -= centerY; }
      });
      s.holes.forEach(h => {
        h.curves.forEach(c => {
          if (c.v1) { c.v1.x -= centerX; c.v1.y -= centerY; }
          if (c.v2) { c.v2.x -= centerX; c.v2.y -= centerY; }
          if (c.v0) { c.v0.x -= centerX; c.v0.y -= centerY; }
        });
      });
    });

    return {
      textShapes: shapes,
      textBounds: { width: textWidth, height: textHeight },
      textScale: scale
    };
  }

  /* ── Parametric Base Shape Generator ── */
  function _generateBaseShape(bounds, shapeType, holePos) {
    const shape = new THREE.Shape();
    const padX = 7.0;
    const padY = 6.0;
    const loopExtra = 11.0; // Extra room for keyring loop
    const holeRadius = 2.4; // 4.8mm hole for ring

    let W = Math.max(bounds.width + padX * 2, 42);
    let H = Math.max(bounds.height + padY * 2, 18);

    let leftShift = 0;
    let rightShift = 0;
    let topShift = 0;

    if (holePos === 'left')  leftShift = loopExtra;
    if (holePos === 'right') rightShift = loopExtra;
    if (holePos === 'top')   topShift = loopExtra * 0.8;

    const x0 = -W / 2 - leftShift;
    const x1 = W / 2 + rightShift;
    const y0 = -H / 2;
    const y1 = H / 2 + topShift;
    const radius = Math.min(H * 0.45, 9.0);

    if (shapeType === 'pill') {
      // Stadium / Capsule shape
      const r = (y1 - y0) / 2;
      shape.moveTo(x0 + r, y0);
      shape.lineTo(x1 - r, y0);
      shape.absarc(x1 - r, (y0 + y1) / 2, r, -Math.PI / 2, Math.PI / 2, false);
      shape.lineTo(x0 + r, y1);
      shape.absarc(x0 + r, (y0 + y1) / 2, r, Math.PI / 2, (3 * Math.PI) / 2, false);
    } else if (shapeType === 'hex') {
      // Hexagonal / Chamfered Shield Tag
      const ch = 8;
      shape.moveTo(x0 + ch, y0);
      shape.lineTo(x1 - ch, y0);
      shape.lineTo(x1, y0 + (y1 - y0) / 2);
      shape.lineTo(x1 - ch, y1);
      shape.lineTo(x0 + ch, y1);
      shape.lineTo(x0, y0 + (y1 - y0) / 2);
      shape.closePath();
    } else if (shapeType === 'heart') {
      // Heart Motif Tag
      const r = Math.min(W, H) / 2;
      shape.moveTo(0, y0);
      shape.bezierCurveTo(x0, y0 + H * 0.35, x0, y1, 0, y1 * 0.7);
      shape.bezierCurveTo(x1, y1, x1, y0 + H * 0.35, 0, y0);
    } else {
      // Contour / Rounded Tag (Default - makerworld style rounded rectangle with reinforced loop)
      shape.moveTo(x0 + radius, y0);
      shape.lineTo(x1 - radius, y0);
      shape.quadraticCurveTo(x1, y0, x1, y0 + radius);
      shape.lineTo(x1, y1 - radius);
      shape.quadraticCurveTo(x1, y1, x1 - radius, y1);
      shape.lineTo(x0 + radius, y1);
      shape.quadraticCurveTo(x0, y1, x0, y1 - radius);
      shape.lineTo(x0, y0 + radius);
      shape.quadraticCurveTo(x0, y0, x0 + radius, y0);
    }

    // Cut Hole for Keyring
    if (holePos !== 'none') {
      const hole = new THREE.Path();
      let hx = 0, hy = 0;
      if (holePos === 'left') {
        hx = x0 + 6.5;
        hy = (y0 + y1) / 2;
      } else if (holePos === 'right') {
        hx = x1 - 6.5;
        hy = (y0 + y1) / 2;
      } else if (holePos === 'top') {
        hx = (x0 + x1) / 2;
        hy = y1 - 6.5;
      }
      hole.absarc(hx, hy, holeRadius, 0, Math.PI * 2, true);
      shape.holes.push(hole);
    }

    return shape;
  }

  /* ── 3D Chrome Split Ring ── */
  function _generateKeyringMesh(bounds, shapeType, holePos) {
    let hx = 0, hy = 0;
    const W = Math.max(bounds.width + 14, 42);
    const H = Math.max(bounds.height + 12, 18);
    const leftShift = holePos === 'left' ? 11 : 0;
    const rightShift = holePos === 'right' ? 11 : 0;
    const topShift = holePos === 'top' ? 9 : 0;

    const x0 = -W / 2 - leftShift;
    const x1 = W / 2 + rightShift;
    const y0 = -H / 2;
    const y1 = H / 2 + topShift;

    if (holePos === 'left') {
      hx = x0 + 6.5;
      hy = (y0 + y1) / 2;
    } else if (holePos === 'right') {
      hx = x1 - 6.5;
      hy = (y0 + y1) / 2;
    } else if (holePos === 'top') {
      hx = (x0 + x1) / 2;
      hy = y1 - 6.5;
    } else {
      return null;
    }

    // Ring torus
    const ringGeo = new THREE.TorusGeometry(8.5, 1.2, 16, 40);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xe0e0e0,
      metalness: 0.95,
      roughness: 0.15,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.set(hx - 4, hy, state.baseThickness * 0.5);
    ring.rotation.y = Math.PI / 4;
    return ring;
  }

  function _updateDimensionBadge(bounds, holePos) {
    const extra = holePos === 'left' || holePos === 'right' ? 11 : 0;
    const w = Math.round(bounds.width + 14 + extra);
    const h = Math.round(bounds.height + 12);
    const z = (state.baseThickness + state.textHeight).toFixed(1);

    const el = document.getElementById('kcDimBadge');
    if (el) el.textContent = `${w} mm × ${h} mm × ${z} mm`;
  }

  /* ══════════════════════════════════════════════════════════
     CLIENT-SIDE 3MF EXPORT (ZERO BACKEND)
  ══════════════════════════════════════════════════════════ */
  async function export3MF() {
    if (!_baseMesh || !_textMesh) {
      Utils.toast('Please wait for 3D model to finish rendering.');
      return;
    }

    Utils.toast('Preparing 3MF multi-color file… ⏳');

    const baseGeo = _baseMesh.geometry.clone();
    const textGeo = _textMesh.geometry.clone();

    // ── Generate 3D/3dmodel.model XML
    const modelXml = _build3mfModelXml(baseGeo, textGeo, state.baseColor, state.textColor);

    const relsXml = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>
</Relationships>`;

    const contentTypesXml = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>
</Types>`;

    let blob;
    // Prefer JSZip if available
    if (window.JSZip) {
      const zip = new window.JSZip();
      zip.file('_rels/.rels', relsXml);
      zip.file('[Content_Types].xml', contentTypesXml);
      zip.file('3D/3dmodel.model', modelXml);
      blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.ms-package.3dmanufacturing-3dmodel+xml' });
    } else {
      // Pure JS fallback zip packer
      const zipBytes = _createPureZip([
        { name: '_rels/.rels', data: relsXml },
        { name: '[Content_Types].xml', data: contentTypesXml },
        { name: '3D/3dmodel.model', data: modelXml },
      ]);
      blob = new Blob([zipBytes], { type: 'application/vnd.ms-package.3dmanufacturing-3dmodel+xml' });
    }

    // Trigger instant browser download
    const cleanName = (state.text || 'Keychain').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `Keychain-${cleanName}.3mf`;

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    Utils.toast(`✅ Downloaded "${filename}"! Now send it in WhatsApp.`);
  }

  function _build3mfModelXml(baseGeo, textGeo, baseHex, textHex) {
    function geoToMesh(geo) {
      const pos = geo.attributes.position.array;
      const idx = geo.index ? geo.index.array : null;

      let vXml = '';
      for (let i = 0; i < pos.length; i += 3) {
        vXml += `          <vertex x="${pos[i].toFixed(3)}" y="${pos[i+1].toFixed(3)}" z="${pos[i+2].toFixed(3)}"/>\n`;
      }

      let tXml = '';
      if (idx) {
        for (let i = 0; i < idx.length; i += 3) {
          tXml += `          <triangle v1="${idx[i]}" v2="${idx[i+1]}" v3="${idx[i+2]}"/>\n`;
        }
      } else {
        const count = pos.length / 3;
        for (let i = 0; i < count; i += 3) {
          tXml += `          <triangle v1="${i}" v2="${i+1}" v3="${i+2}"/>\n`;
        }
      }

      return `<mesh>\n        <vertices>\n${vXml}        </vertices>\n        <triangles>\n${tXml}        </triangles>\n      </mesh>`;
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" xmlns:m="http://schemas.microsoft.com/3dmanufacturing/material/2015/02">
  <metadata name="Title">Pniktrix Custom 3D Keychain</metadata>
  <metadata name="Designer">Pniktrix Maker Studio</metadata>
  <resources>
    <m:colorgroup id="1">
      <m:color color="${baseHex.toUpperCase()}"/>
      <m:color color="${textHex.toUpperCase()}"/>
    </m:colorgroup>
    <object id="2" type="model" name="Keychain_Base" pid="1" pindex="0">
      ${geoToMesh(baseGeo)}
    </object>
    <object id="3" type="model" name="Keychain_Text" pid="1" pindex="1">
      ${geoToMesh(textGeo)}
    </object>
    <object id="4" type="model" name="Assembled_Keychain">
      <components>
        <component objectid="2"/>
        <component objectid="3"/>
      </components>
    </object>
  </resources>
  <build>
    <item objectid="4"/>
  </build>
</model>`;
  }

  /* ── Pure Client-side ZIP fallback (uncompressed STORE) ── */
  function _createPureZip(files) {
    const fileEntries = [];
    let offset = 0;
    const parts = [];

    const crcTable = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      crcTable[n] = c;
    }
    function crc32(str) {
      let crc = 0 ^ (-1);
      for (let i = 0; i < str.length; i++) {
        crc = (crc >>> 8) ^ crcTable[(crc ^ str.charCodeAt(i)) & 0xFF];
      }
      return (crc ^ (-1)) >>> 0;
    }

    const enc = new TextEncoder();

    files.forEach(f => {
      const nameBytes = enc.encode(f.name);
      const dataBytes = enc.encode(f.data);
      const crc = crc32(f.data);
      const size = dataBytes.length;

      const header = new Uint8Array(30);
      const v = new DataView(header.buffer);
      v.setUint32(0, 0x04034b50, true);
      v.setUint16(4, 20, true);
      v.setUint16(6, 0, true);
      v.setUint16(8, 0, true);
      v.setUint16(10, 0, true);
      v.setUint16(12, 0, true);
      v.setUint32(14, crc, true);
      v.setUint32(18, size, true);
      v.setUint32(22, size, true);
      v.setUint16(26, nameBytes.length, true);
      v.setUint16(28, 0, true);

      fileEntries.push({ nameBytes, crc, size, offset });
      parts.push(header, nameBytes, dataBytes);
      offset += 30 + nameBytes.length + size;
    });

    const cdStart = offset;
    let cdSize = 0;

    fileEntries.forEach(e => {
      const cd = new Uint8Array(46);
      const v = new DataView(cd.buffer);
      v.setUint32(0, 0x02014b50, true);
      v.setUint16(4, 20, true);
      v.setUint16(6, 20, true);
      v.setUint16(8, 0, true);
      v.setUint16(10, 0, true);
      v.setUint16(12, 0, true);
      v.setUint16(14, 0, true);
      v.setUint32(16, e.crc, true);
      v.setUint32(20, e.size, true);
      v.setUint32(24, e.size, true);
      v.setUint16(28, e.nameBytes.length, true);
      v.setUint16(30, 0, true);
      v.setUint16(32, 0, true);
      v.setUint16(34, 0, true);
      v.setUint16(36, 0, true);
      v.setUint32(38, 0, true);
      v.setUint32(42, e.offset, true);

      parts.push(cd, e.nameBytes);
      cdSize += 46 + e.nameBytes.length;
    });

    const eocd = new Uint8Array(22);
    const ev = new DataView(eocd.buffer);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(4, 0, true);
    ev.setUint16(6, 0, true);
    ev.setUint16(8, fileEntries.length, true);
    ev.setUint16(10, fileEntries.length, true);
    ev.setUint32(12, cdSize, true);
    ev.setUint32(16, cdStart, true);
    ev.setUint16(20, 0, true);
    parts.push(eocd);

    let totalLen = parts.reduce((acc, p) => acc + p.length, 0);
    const out = new Uint8Array(totalLen);
    let cur = 0;
    parts.forEach(p => { out.set(p, cur); cur += p.length; });
    return out;
  }

  /* ══════════════════════════════════════════════════════════
     WHATSAPP ORDER DISPATCHER
  ══════════════════════════════════════════════════════════ */
  function orderViaWhatsApp() {
    const cleanName = (state.text || 'Keychain').replace(/[^a-zA-Z0-9_-]/g, '_');
    const shapeNames = {
      contour: 'Contour Outline',
      pill:    'Pill / Capsule',
      tag:     'Rounded Tag',
      hex:     'Hexagon Shield',
      heart:   'Heart Badge',
    };
    const fontNames = {
      helvetiker: 'Modern Bold',
      gentilis:   'Futuristic Tech',
      optimer:    'Classic Sharp',
    };

    const msg = [
      `Hello Pniktrix! 🔑`,
      ``,
      `I just customized my 3D Keychain for *₹${state.price}*:`,
      `• *Custom Text:* ${state.text}`,
      `• *Shape Style:* ${shapeNames[state.shape] || state.shape}`,
      `• *Font:* ${fontNames[state.fontKey] || state.fontKey}`,
      `• *Base Colour:* ${state.baseColor}`,
      `• *Text Colour:* ${state.textColor}`,
      `• *Hole Position:* ${state.holePos}`,
      `• *Size Preset:* ${state.sizePreset}`,
      `• *Price:* ₹${state.price}`,
      ``,
      `📎 *Note:* I have downloaded the 3MF file (Keychain-${cleanName}.3mf) and am attaching it here!`,
      ``,
      `Please confirm payment and dispatch timeline. Thank you!`
    ].join('\n');

    const url = `https://wa.me/${Config.WHATSAPP}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    Utils.toast('Opening WhatsApp! Attach your downloaded .3MF file.');
  }

  /* ══════════════════════════════════════════════════════════
     UI BINDINGS & CONTROLS
  ══════════════════════════════════════════════════════════ */
  function _bindUI() {
    // Text input
    const textInput = document.getElementById('kcTextInput');
    textInput?.addEventListener('input', e => {
      state.text = e.target.value.trim() || 'PNIK';
      _rebuildMesh();
    });

    // Font selection
    document.querySelectorAll('.kc-font-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        document.querySelectorAll('.kc-font-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.fontKey = btn.dataset.font;
        await _loadFont(state.fontKey);
        _rebuildMesh();
      });
    });

    // Shape selection
    document.querySelectorAll('.kc-shape-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.kc-shape-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.shape = btn.dataset.shape;
        _rebuildMesh();
      });
    });

    // Base color swatches
    document.querySelectorAll('#kcBaseSwatches .kc-swatch').forEach(sw => {
      sw.addEventListener('click', () => {
        document.querySelectorAll('#kcBaseSwatches .kc-swatch').forEach(s => s.classList.remove('active'));
        sw.classList.add('active');
        state.baseColor = sw.dataset.color;
        if (_baseMesh) _baseMesh.material.color.set(state.baseColor);
      });
    });

    // Text color swatches
    document.querySelectorAll('#kcTextSwatches .kc-swatch').forEach(sw => {
      sw.addEventListener('click', () => {
        document.querySelectorAll('#kcTextSwatches .kc-swatch').forEach(s => s.classList.remove('active'));
        sw.classList.add('active');
        state.textColor = sw.dataset.color;
        if (_textMesh) {
          _textMesh.material.color.set(state.textColor);
          const isGold = state.textColor.toLowerCase() === '#d4af37' || state.textColor.toLowerCase() === '#ffd700';
          _textMesh.material.metalness = isGold ? 0.45 : 0.08;
          _textMesh.material.roughness = isGold ? 0.25 : 0.38;
        }
      });
    });

    // Swap Colors button
    document.getElementById('kcSwapColors')?.addEventListener('click', () => {
      const temp = state.baseColor;
      state.baseColor = state.textColor;
      state.textColor = temp;
      if (_baseMesh) _baseMesh.material.color.set(state.baseColor);
      if (_textMesh) _textMesh.material.color.set(state.textColor);
      _highlightActiveSwatches();
    });

    // Hole position
    document.querySelectorAll('.kc-hole-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.kc-hole-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.holePos = btn.dataset.pos;
        _rebuildMesh();
      });
    });

    // Size preset
    document.querySelectorAll('.kc-size-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.kc-size-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.sizePreset = btn.dataset.size;
        _rebuildMesh();
      });
    });

    // Camera view presets
    document.getElementById('kcView3D')?.addEventListener('click', () => {
      _targetRot = { x: 0.35, y: -0.2 };
      _targetZoom = 85;
    });
    document.getElementById('kcViewTop')?.addEventListener('click', () => {
      _targetRot = { x: 0, y: 0 };
      _targetZoom = 75;
    });

    // Action buttons
    document.getElementById('kcDownload3MF')?.addEventListener('click', export3MF);
    document.getElementById('kcOrderWhatsApp')?.addEventListener('click', () => {
      // Auto download 3MF first if not already downloaded, then open WhatsApp
      export3MF();
      setTimeout(orderViaWhatsApp, 1200);
    });

    // Tab switcher inside mobile controls
    document.querySelectorAll('.kc-subtab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.kc-subtab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.kc-tab-panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        const panelId = tab.dataset.panel;
        const panel = document.getElementById(panelId);
        if (panel) panel.classList.add('active');
      });
    });
  }

  function _highlightActiveSwatches() {
    document.querySelectorAll('#kcBaseSwatches .kc-swatch').forEach(s => {
      s.classList.toggle('active', s.dataset.color.toLowerCase() === state.baseColor.toLowerCase());
    });
    document.querySelectorAll('#kcTextSwatches .kc-swatch').forEach(s => {
      s.classList.toggle('active', s.dataset.color.toLowerCase() === state.textColor.toLowerCase());
    });
  }

  function show() {
    const sec = document.getElementById('keychainStudioSection');
    if (!sec) return;
    sec.classList.remove('hidden');
    sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => {
      _onResize();
      if (!_isInitialized) init('keychainStudioSection');
    }, 150);
  }

  function hide() {
    const sec = document.getElementById('keychainStudioSection');
    sec?.classList.add('hidden');
  }

  return { init, show, hide, export3MF, orderViaWhatsApp, getState: () => ({ ...state }) };
})();
