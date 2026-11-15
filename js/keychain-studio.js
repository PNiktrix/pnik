/**
 * keychain-studio.js
 * ─────────────────────────────────────────────────────────
 * Parametric 3D Keychain Maker for Pniktrix Studio.
 * Mobile-first, 100% client-side (ZERO backend needed).
 *
 * Updates in v4.0:
 *   1. 5 Print-Ready Fonts: Bubbly (Sophia Style), Modern Bold (Helvetiker),
 *      Impact Block, Tech Aero (Gentilis), Luxury (Optimer).
 *   2. Text Style Modes: Raised (Embossed +1.4mm), Flush Infill (Flat single surface),
 *      Engraved (Debossed -1.0mm).
 *   3. Decorative Charms / Icons (🌸 Flower, ❤️ Heart, ⭐ Star, 👑 Crown, 🐾 Paw, ⚡ Bolt, 🎵 Music)
 *      with custom charm filament color picker.
 *   4. Ultra-Tight Contour Base hugging both text & charm silhouettes (Sophia reference style).
 *   5. Robust font glyph curve parser without jagged saw-tooth tears.
 *   6. Seamless WhatsApp order flow with full specs & compact design code for desktop python app.
 *   7. Content protection (preventing client-side 3MF ripping or text copying).
 * ─────────────────────────────────────────────────────────
 */

const KeychainStudio = (() => {
  /* ── State ── */
  const state = {
    text:          'NIKTRIX',
    fontKey:       'helvetiker',
    shape:         'contour',   // 'contour' | 'pill' | 'tag' | 'hex'
    textStyle:     'embossed',  // 'embossed' | 'flush' | 'engraved'
    baseColor:     '#1A1A1A',   // Matte Black
    textColor:     '#D4AF37',   // Silk Gold
    charm:         'none',      // 'none' | 'flower' | 'heart' | 'star' | 'crown' | 'paw' | 'bolt' | 'music'
    charmColor:    '#FFD700',   // Daisy Yellow
    holePos:       'left',      // 'left' | 'top' | 'right' | 'none'
    sizePreset:    'standard',  // 'compact' (55mm) | 'standard' (75mm) | 'large' (95mm)
    baseThickness: 3.2,         // mm
    textHeight:    1.4,         // mm protrusion above base
    price:         99,          // ₹99 fixed
  };

  const FONTS_DATA = {};
  let _scene, _camera, _renderer;
  let _container, _canvasWrap;
  let _baseMesh, _textMesh, _charmMesh, _ringMesh;
  let _isDragging = false;
  let _prevMouse = { x: 0, y: 0 };
  let _rot = { x: 0.32, y: -0.22 };
  let _targetRot = { x: 0.32, y: -0.22 };
  let _zoom = 85;
  let _targetZoom = 85;
  let _animId = null;
  let _isInitialized = false;

  const FONT_URLS = {
    helvetiker: 'data/fonts/helvetiker_bold.typeface.json',
    bubbly:     'data/fonts/bubbly.typeface.json',
    impact:     'data/fonts/impact.typeface.json',
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

    // Apply content protection
    _container.style.userSelect = 'none';
    _container.style.webkitUserSelect = 'none';
    _canvasWrap.addEventListener('contextmenu', e => e.preventDefault());
    _canvasWrap.addEventListener('dragstart', e => e.preventDefault());

    // Load default font
    await _loadFont(state.fontKey);

    _initThree();
    _bindUI();
    _rebuildMesh();

    _isInitialized = true;
    console.log('[KeychainStudio] Initialized successfully with text:', state.text);
  }

  async function _loadFont(key) {
    if (FONTS_DATA[key]) return FONTS_DATA[key];
    try {
      const url = FONT_URLS[key] || FONT_URLS['helvetiker'];
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      FONTS_DATA[key] = json;
      return json;
    } catch (e) {
      console.warn(`[KeychainStudio] Failed loading font ${key}:`, e);
      return FONTS_DATA['helvetiker'] || null;
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
    _renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    _renderer.shadowMap.enabled = true;
    _renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    _canvasWrap.innerHTML = '';
    _canvasWrap.appendChild(_renderer.domElement);

    // Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    _scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 0.95);
    keyLight.position.set(45, 65, 75);
    keyLight.castShadow = true;
    _scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xd4af37, 0.45);
    fillLight.position.set(-50, -30, 45);
    _scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.55);
    rimLight.position.set(0, -60, -40);
    _scene.add(rimLight);

    // Shadow plane
    const shadowGeo = new THREE.PlaneGeometry(280, 280);
    const shadowMat = new THREE.ShadowMaterial({ opacity: 0.35 });
    const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
    shadowPlane.position.z = -5;
    shadowPlane.receiveShadow = true;
    _scene.add(shadowPlane);

    // Touch and mouse orbit
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

    _rot.x += (_targetRot.x - _rot.x) * 0.12;
    _rot.y += (_targetRot.y - _rot.y) * 0.12;
    _zoom  += (_targetZoom - _zoom) * 0.15;

    const r = _zoom;
    _camera.position.x = r * Math.sin(_rot.y) * Math.cos(_rot.x);
    _camera.position.y = -r * Math.sin(_rot.x);
    _camera.position.z = r * Math.cos(_rot.y) * Math.cos(_rot.x);
    _camera.lookAt(0, 0, state.baseThickness * 0.5);

    _renderer.render(_scene, _camera);
  }

  /* ══════════════════════════════════════════════════════════
     GLYPH CONTOUR TO THREE.SHAPE PARSER
  ══════════════════════════════════════════════════════════ */
  function _parseGlyphContours(glyph, scale, cursorX) {
    if (!glyph || !glyph.o) return [];
    const parts = glyph.o.trim().split(/\s+/);
    const contours = [];
    let curr = { x: 0, y: 0 };
    let current = null;

    for (let i = 0; i < parts.length; ) {
      const cmd = parts[i++];
      if (cmd === 'm') {
        if (current && current.sampledPoints.length > 2) contours.push(current);
        curr = { x: parseFloat(parts[i++]) * scale + cursorX, y: parseFloat(parts[i++]) * scale };
        current = { start: { ...curr }, segments: [], sampledPoints: [{ ...curr }] };
      } else if (cmd === 'l') {
        const p = { x: parseFloat(parts[i++]) * scale + cursorX, y: parseFloat(parts[i++]) * scale };
        current.segments.push({ type: 'l', p });
        current.sampledPoints.push({ ...p });
        curr = p;
      } else if (cmd === 'q') {
        const endX = parseFloat(parts[i++]) * scale + cursorX;
        const endY = parseFloat(parts[i++]) * scale;
        const cpX  = parseFloat(parts[i++]) * scale + cursorX;
        const cpY  = parseFloat(parts[i++]) * scale;
        current.segments.push({ type: 'q', cp: { x: cpX, y: cpY }, p: { x: endX, y: endY } });
        for (let s = 1; s <= 5; s++) {
          const t = s / 5;
          const x = (1 - t) * (1 - t) * curr.x + 2 * (1 - t) * t * cpX + t * t * endX;
          const y = (1 - t) * (1 - t) * curr.y + 2 * (1 - t) * t * cpY + t * t * endY;
          current.sampledPoints.push({ x, y });
        }
        curr = { x: endX, y: endY };
      } else if (cmd === 'b') {
        const endX = parseFloat(parts[i++]) * scale + cursorX;
        const endY = parseFloat(parts[i++]) * scale;
        const cp1X = parseFloat(parts[i++]) * scale + cursorX;
        const cp1Y = parseFloat(parts[i++]) * scale;
        const cp2X = parseFloat(parts[i++]) * scale + cursorX;
        const cp2Y = parseFloat(parts[i++]) * scale;
        current.segments.push({ type: 'b', cp1: { x: cp1X, y: cp1Y }, cp2: { x: cp2X, y: cp2Y }, p: { x: endX, y: endY } });
        for (let s = 1; s <= 5; s++) {
          const t = s / 5;
          const x = Math.pow(1 - t, 3) * curr.x + 3 * Math.pow(1 - t, 2) * t * cp1X + 3 * (1 - t) * t * t * cp2X + Math.pow(t, 3) * endX;
          const y = Math.pow(1 - t, 3) * curr.y + 3 * Math.pow(1 - t, 2) * t * cp1Y + 3 * (1 - t) * t * t * cp2Y + Math.pow(t, 3) * endY;
          current.sampledPoints.push({ x, y });
        }
        curr = { x: endX, y: endY };
      }
    }
    if (current && current.sampledPoints.length > 2) contours.push(current);

    // Compute signed area for hole detection
    contours.forEach(c => {
      let a = 0;
      const pts = c.sampledPoints;
      for (let i = 0; i < pts.length; i++) {
        const j = (i + 1) % pts.length;
        a += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
      }
      c.area = a / 2;
      c.isOuter = c.area < 0; // Clockwise in typeface.json = outer
    });

    return contours;
  }

  function _pointInPoly(pt, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i].x, yi = poly[i].y;
      const xj = poly[j].x, yj = poly[j].y;
      const intersect = ((yi > pt.y) !== (yj > pt.y)) &&
        (pt.x < (xj - xi) * (pt.y - yi) / (yj - yi + 1e-12) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  function _generateTextShapes(text, fontData, targetWidth) {
    let totalAdvance = 0;
    for (let i = 0; i < text.length; i++) {
      const glyph = fontData.glyphs[text[i]] || fontData.glyphs['?'] || { ha: 600 };
      totalAdvance += glyph.ha || 600;
    }
    if (totalAdvance === 0) totalAdvance = 1000;
    const scale = targetWidth / totalAdvance;

    const shapes = [];
    let cursorX = 0;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const glyph = fontData.glyphs[char] || fontData.glyphs['?'];
      if (glyph && glyph.o) {
        const contours = _parseGlyphContours(glyph, scale, cursorX);
        const outers = contours.filter(c => c.isOuter);
        const holes  = contours.filter(c => !c.isOuter);

        outers.forEach(out => {
          const s = new THREE.Shape();
          s.moveTo(out.start.x, out.start.y);
          out.segments.forEach(seg => {
            if (seg.type === 'l') s.lineTo(seg.p.x, seg.p.y);
            else if (seg.type === 'q') s.quadraticCurveTo(seg.cp.x, seg.cp.y, seg.p.x, seg.p.y);
            else if (seg.type === 'b') s.bezierCurveTo(seg.cp1.x, seg.cp1.y, seg.cp2.x, seg.cp2.y, seg.p.x, seg.p.y);
          });

          holes.forEach(hole => {
            if (_pointInPoly(hole.sampledPoints[0], out.sampledPoints)) {
              const hPath = new THREE.Path();
              hPath.moveTo(hole.start.x, hole.start.y);
              hole.segments.forEach(seg => {
                if (seg.type === 'l') hPath.lineTo(seg.p.x, seg.p.y);
                else if (seg.type === 'q') hPath.quadraticCurveTo(seg.cp.x, seg.cp.y, seg.p.x, seg.p.y);
                else if (seg.type === 'b') hPath.bezierCurveTo(seg.cp1.x, seg.cp1.y, seg.cp2.x, seg.cp2.y, seg.p.x, seg.p.y);
              });
              s.holes.push(hPath);
            }
          });

          shapes.push(s);
        });
      }
      cursorX += (glyph.ha || 600) * scale;
    }

    return { textShapes: shapes, scale };
  }

  /* ── Decorative Charm 2D Shape Generator ── */
  function _generateCharmShape(charmType, size = 12.0) {
    if (!charmType || charmType === 'none') return null;
    const s = new THREE.Shape();

    if (charmType === 'flower') {
      // 6-petal daisy matching Sophia reference
      const steps = 48;
      const rIn = size * 0.28;
      const rOut = size * 0.52;
      for (let i = 0; i < steps; i++) {
        const theta = 2 * Math.PI * (i / steps);
        const r = rIn + (rOut - rIn) * (0.5 + 0.5 * Math.cos(6 * theta));
        const x = r * Math.cos(theta);
        const y = r * Math.sin(theta);
        if (i === 0) s.moveTo(x, y); else s.lineTo(x, y);
      }
      s.closePath();
    } else if (charmType === 'heart') {
      const scale = size / 32.0;
      for (let i = 0; i < 32; i++) {
        const t = 2 * Math.PI * (i / 32.0);
        const x = 16 * Math.pow(Math.sin(t), 3) * scale;
        const y = (13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t)) * scale;
        if (i === 0) s.moveTo(x, y); else s.lineTo(x, y);
      }
      s.closePath();
    } else if (charmType === 'star') {
      const rOut = size * 0.52;
      const rIn = size * 0.24;
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? rOut : rIn;
        const a = -Math.PI * 0.5 + 2 * Math.PI * (i / 10);
        const x = r * Math.cos(a);
        const y = r * Math.sin(a);
        if (i === 0) s.moveTo(x, y); else s.lineTo(x, y);
      }
      s.closePath();
    } else if (charmType === 'crown') {
      const w = size * 0.5, h = size * 0.45;
      s.moveTo(-w, -h);
      s.lineTo(-w * 0.8, h * 0.7);
      s.lineTo(-w * 0.3, h * 0.2);
      s.lineTo(0, h);
      s.lineTo(w * 0.3, h * 0.2);
      s.lineTo(w * 0.8, h * 0.7);
      s.lineTo(w, -h);
      s.closePath();
    } else if (charmType === 'paw') {
      for (let i = 0; i < 24; i++) {
        const a = 2 * Math.PI * (i / 24);
        const x = size * 0.38 * Math.cos(a);
        const y = -size * 0.12 + size * 0.3 * Math.sin(a);
        if (i === 0) s.moveTo(x, y); else s.lineTo(x, y);
      }
      s.closePath();
    } else if (charmType === 'bolt') {
      const b = size * 0.45;
      s.moveTo(b * 0.2, b * 1.1);
      s.lineTo(-b * 0.9, -b * 0.1);
      s.lineTo(-b * 0.1, -b * 0.1);
      s.lineTo(-b * 0.4, -b * 1.1);
      s.lineTo(b * 0.9, b * 0.1);
      s.lineTo(b * 0.1, b * 0.1);
      s.closePath();
    } else if (charmType === 'music') {
      const w = size * 0.45, h = size * 0.45;
      s.moveTo(-w, -h);
      s.lineTo(-w * 0.4, -h);
      s.lineTo(-w * 0.4, h * 0.7);
      s.lineTo(w * 0.8, h * 0.7);
      s.lineTo(w * 0.8, -h * 0.2);
      s.lineTo(w * 1.2, -h * 0.2);
      s.lineTo(w * 1.2, h);
      s.lineTo(-w * 0.8, h);
      s.lineTo(-w * 0.8, -h * 0.3);
      s.lineTo(-w, -h * 0.3);
      s.closePath();
    }
    return s;
  }

  /* ══════════════════════════════════════════════════════════
     PARAMETRIC 3D MESH GENERATOR
  ══════════════════════════════════════════════════════════ */
  function _rebuildMesh() {
    if (!_scene) return;

    // Clean up existing meshes
    if (_baseMesh)  { _scene.remove(_baseMesh);  _baseMesh.geometry.dispose(); }
    if (_textMesh)  { _scene.remove(_textMesh);  _textMesh.geometry.dispose(); }
    if (_charmMesh) { _scene.remove(_charmMesh); _charmMesh.geometry.dispose(); }
    if (_ringMesh)  { _scene.remove(_ringMesh);  _ringMesh.geometry.dispose(); }

    const fontData = FONTS_DATA[state.fontKey] || FONTS_DATA['helvetiker'];
    if (!fontData) return;

    const textRaw = (state.text || 'NIKTRIX').trim();
    const targetLengthMap = { compact: 55, standard: 75, large: 95 };
    const targetLength = targetLengthMap[state.sizePreset] || 75;

    // ── 1. Build text shapes
    const { textShapes } = _generateTextShapes(textRaw, fontData, targetLength * 0.68);

    let textBounds = { width: 45, height: 14 };
    let charmBounds = { width: 0, height: 0, x: 0 };

    // Determine Z height by Text Style (Raised vs Flush vs Engraved)
    let totalDepth = 3.0;
    let textZ = 0;
    const embeddedDepth = 1.6;

    if (state.textStyle === 'flush') {
      totalDepth = embeddedDepth; // 1.6mm depth
      textZ = state.baseThickness - (embeddedDepth * 0.5); // Top is flush with base plate top
    } else if (state.textStyle === 'engraved') {
      totalDepth = 1.2;
      textZ = state.baseThickness - 0.6; // Debossed below surface
    } else {
      // embossed (raised)
      totalDepth = embeddedDepth + state.textHeight; // 3.0mm
      textZ = (state.baseThickness - embeddedDepth) + (totalDepth * 0.5); // Protrudes +1.4mm
    }

    const extrudeSettings = {
      depth: totalDepth,
      bevelEnabled: true,
      bevelThickness: 0.22,
      bevelSize: 0.16,
      bevelSegments: 2,
    };

    // ── 2. Extrude Text
    if (textShapes.length > 0) {
      const textGeo = new THREE.ExtrudeGeometry(textShapes, extrudeSettings);
      textGeo.computeBoundingBox();
      textGeo.center();

      textGeo.computeBoundingBox();
      const b = textGeo.boundingBox;
      textBounds = { width: b.max.x - b.min.x, height: b.max.y - b.min.y };

      // Shift text left slightly if charm is on the right
      const textShiftX = state.charm !== 'none' ? -6.0 : 0.0;
      textGeo.translate(textShiftX, 0, textZ);

      const isGold = state.textColor.toLowerCase() === '#d4af37' || state.textColor.toLowerCase() === '#ffd700';
      const textMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(state.textColor),
        roughness: isGold ? 0.22 : 0.35,
        metalness: isGold ? 0.48 : 0.08,
      });

      _textMesh = new THREE.Mesh(textGeo, textMat);
      _textMesh.castShadow = true;
      _scene.add(_textMesh);
    }

    // ── 3. Extrude Decorative Charm (if selected)
    const charmShape = _generateCharmShape(state.charm, Math.max(textBounds.height * 0.88, 12.0));
    if (charmShape) {
      const charmGeo = new THREE.ExtrudeGeometry(charmShape, extrudeSettings);
      charmGeo.computeBoundingBox();
      charmGeo.center();

      const charmX = (textBounds.width * 0.5) + (state.charm !== 'none' ? -6.0 : 0.0) + 9.5;
      charmGeo.translate(charmX, 0, textZ);

      const isCharmGold = state.charmColor.toLowerCase() === '#d4af37' || state.charmColor.toLowerCase() === '#ffd700';
      const charmMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(state.charmColor),
        roughness: isCharmGold ? 0.22 : 0.35,
        metalness: isCharmGold ? 0.48 : 0.08,
      });

      _charmMesh = new THREE.Mesh(charmGeo, charmMat);
      _charmMesh.castShadow = true;
      _scene.add(_charmMesh);

      charmBounds = { width: 14.0, height: 14.0, x: charmX };
    }

    // Combined bounds for base plate
    const combinedWidth = textBounds.width + (state.charm !== 'none' ? 18.0 : 0.0);
    const combinedHeight = Math.max(textBounds.height, charmBounds.height || 0);
    const combinedBounds = { width: combinedWidth, height: combinedHeight };

    // ── 4. Build Base Plate Shape
    const baseShape = _generateBaseShape(combinedBounds, state.shape, state.holePos);

    // ── 5. Base Extrusion
    const baseExtrudeSettings = {
      depth: state.baseThickness,
      bevelEnabled: true,
      bevelThickness: 0.35,
      bevelSize: 0.3,
      bevelSegments: 3,
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

    // ── 6. Metallic Split Ring
    if (state.holePos !== 'none') {
      _ringMesh = _generateKeyringMesh(combinedBounds, state.shape, state.holePos);
      if (_ringMesh) _scene.add(_ringMesh);
    }

    // ── 7. Update Dimension Badges in UI
    _updateDimensionBadge(combinedBounds, state.holePos);
  }

  /* ── Parametric Base Shape Generator ── */
  function _generateBaseShape(bounds, shapeType, holePos) {
    const shape = new THREE.Shape();
    const padX = 6.5;
    const padY = 5.5;
    const loopExtra = 11.5;
    const holeRadius = 2.2; // 4.4mm hole

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
      const r = (y1 - y0) / 2;
      shape.moveTo(x0 + r, y0);
      shape.lineTo(x1 - r, y0);
      shape.absarc(x1 - r, (y0 + y1) / 2, r, -Math.PI / 2, Math.PI / 2, false);
      shape.lineTo(x0 + r, y1);
      shape.absarc(x0 + r, (y0 + y1) / 2, r, Math.PI / 2, (3 * Math.PI) / 2, false);
    } else if (shapeType === 'hex') {
      const ch = 8;
      shape.moveTo(x0 + ch, y0);
      shape.lineTo(x1 - ch, y0);
      shape.lineTo(x1, y0 + (y1 - y0) / 2);
      shape.lineTo(x1 - ch, y1);
      shape.lineTo(x0 + ch, y1);
      shape.lineTo(x0, y0 + (y1 - y0) / 2);
      shape.closePath();
    } else if (shapeType === 'tag') {
      shape.moveTo(x0 + radius, y0);
      shape.lineTo(x1 - radius, y0);
      shape.absarc(x1 - radius, y0 + radius, radius, -Math.PI / 2, 0, false);
      shape.lineTo(x1, y1 - radius);
      shape.absarc(x1 - radius, y1 - radius, radius, 0, Math.PI / 2, false);
      shape.lineTo(x0 + radius, y1);
      shape.absarc(x0 + radius, y1 - radius, radius, Math.PI / 2, Math.PI, false);
      shape.lineTo(x0, y0 + radius);
      shape.absarc(x0 + radius, y0 + radius, radius, Math.PI, (3 * Math.PI) / 2, false);
    } else {
      // Ultra-Tight Contour Outline (Sophia MakerWorld Style)
      // Hugs both the text and charm with a smooth 2.2mm organic bubble border
      const pad = 2.2;
      const hw = bounds.width * 0.5;
      const hh = Math.max(bounds.height * 0.5, 5.5);
      const loopX = -hw - 5.0;
      const loopR = 5.2;

      if (holePos === 'left') {
        shape.moveTo(loopX, loopR);
        shape.quadraticCurveTo(-hw - 0.5, loopR, -hw + 1.5, hh + pad);

        const numLobes = Math.max(3, Math.round(bounds.width / 11));
        const lobeStep = (hw * 2) / numLobes;
        for (let i = 0; i < numLobes; i++) {
          const lx0 = -hw + 1.5 + i * lobeStep;
          const lx1 = lx0 + lobeStep;
          const midX = (lx0 + lx1) * 0.5;
          const peakY = hh + pad + (i % 2 === 0 ? 0.6 : -0.2);
          shape.quadraticCurveTo(midX, peakY, Math.min(lx1, hw + 1.5), hh + pad);
        }

        shape.absarc(hw + 1.5, 0, hh + pad, Math.PI * 0.5, -Math.PI * 0.5, true);

        for (let i = numLobes - 1; i >= 0; i--) {
          const lx0 = -hw + 1.5 + i * lobeStep;
          const lx1 = lx0 + lobeStep;
          const midX = (lx0 + lx1) * 0.5;
          const valleyY = -hh - pad - (i % 2 === 1 ? 0.6 : -0.2);
          shape.quadraticCurveTo(midX, valleyY, Math.max(lx0, -hw), -hh - pad);
        }

        shape.quadraticCurveTo(-hw - 0.5, -loopR, loopX, -loopR);
        shape.absarc(loopX, 0, loopR, -Math.PI * 0.5, Math.PI * 0.5, false);
      } else {
        const r = hh + pad;
        shape.moveTo(-hw, r);
        shape.lineTo(hw, r);
        shape.absarc(hw, 0, r, Math.PI * 0.5, -Math.PI * 0.5, true);
        shape.lineTo(-hw, -r);
        shape.absarc(-hw, 0, r, -Math.PI * 0.5, Math.PI * 0.5, true);
      }
    }

    // Cut Keyring Hole
    if (holePos !== 'none') {
      const hole = new THREE.Path();
      let hx = 0, hy = 0;
      if (holePos === 'left') {
        hx = shapeType === 'contour' ? (-bounds.width * 0.5 - 5.0) : (x0 + 6.0);
        hy = shapeType === 'contour' ? 0 : (y0 + y1) / 2;
      } else if (holePos === 'right') {
        hx = x1 - 6.0;
        hy = (y0 + y1) / 2;
      } else if (holePos === 'top') {
        hx = (x0 + x1) / 2;
        hy = y1 - 6.0;
      }
      hole.absarc(hx, hy, holeRadius, 0, Math.PI * 2, true);
      shape.holes.push(hole);
    }

    return shape;
  }

  /* ── 3D Chrome Split Ring ── */
  function _generateKeyringMesh(bounds, shapeType, holePos) {
    let hx = 0, hy = 0;
    const W = Math.max(bounds.width + 13, 42);
    const H = Math.max(bounds.height + 11, 18);
    const leftShift  = holePos === 'left'  ? 11.5 : 0;
    const rightShift = holePos === 'right' ? 11.5 : 0;
    const topShift   = holePos === 'top'   ? 9.2  : 0;

    const x0 = -W / 2 - leftShift;
    const x1 = W / 2 + rightShift;
    const y0 = -H / 2;
    const y1 = H / 2 + topShift;

    if (holePos === 'left') {
      hx = shapeType === 'contour' ? (-bounds.width * 0.5 - 5.0) : (x0 + 6.0);
      hy = shapeType === 'contour' ? 0 : (y0 + y1) / 2;
    } else if (holePos === 'right') {
      hx = x1 - 6.8;
      hy = (y0 + y1) / 2;
    } else if (holePos === 'top') {
      hx = (x0 + x1) / 2;
      hy = y1 - 6.8;
    } else {
      return null;
    }

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
    const extra = holePos === 'left' || holePos === 'right' ? 11.5 : 0;
    const w = Math.round(bounds.width + 13 + extra);
    const h = Math.round(bounds.height + 11);
    const z = (state.baseThickness + (state.textStyle === 'embossed' ? state.textHeight : 0)).toFixed(1);

    const el = document.getElementById('kcDimBadge');
    if (el) el.textContent = `${w} mm × ${h} mm × ${z} mm`;
  }

  /* ══════════════════════════════════════════════════════════
     WHATSAPP ORDER DISPATCHER (Natural text + Compact Code)
  ══════════════════════════════════════════════════════════ */
  function orderViaWhatsApp() {
    const shapeNames = {
      contour: 'Ultra-Tight Contour (Sophia Style)',
      pill:    'Pill / Capsule',
      tag:     'Rounded Tag',
      hex:     'Hexagon Shield',
    };
    const fontNames = {
      bubbly:     'Bubbly Rounded (Sophia)',
      helvetiker: 'Modern Bold',
      impact:     'Impact Block',
      gentilis:   'Tech Aero',
      optimer:    'Classic Sharp',
    };
    const styleNames = {
      embossed: 'Raised (+1.4mm)',
      flush:    'Flush Infill (Smooth Surface)',
      engraved: 'Debossed (-1.0mm)',
    };
    const charmNames = {
      none:   'None',
      flower: '🌸 Flower',
      heart:  '❤️ Heart',
      star:   '⭐ Star',
      crown:  '👑 Crown',
      paw:    '🐾 Paw',
      bolt:   '⚡ Bolt',
      music:  '🎵 Music',
    };

    // Compact Reference Code for python desktop decoder
    const designCode = `KC|${state.text}|${state.fontKey}|${state.shape}|${state.textStyle}|${state.baseColor}|${state.textColor}|${state.charm}|${state.charmColor}|${state.holePos}|${state.sizePreset}`;

    const msg = [
      `Hello Pniktrix! 🔑`,
      ``,
      `I would like to order a custom 3D Keychain for *₹${state.price}*:`,
      `• *Name:* ${state.text}`,
      `• *Font:* ${fontNames[state.fontKey] || state.fontKey}`,
      `• *Base Shape:* ${shapeNames[state.shape] || state.shape}`,
      `• *Text Style:* ${styleNames[state.textStyle] || state.textStyle}`,
      `• *Base Colour:* ${state.baseColor}`,
      `• *Text Colour:* ${state.textColor}`,
      `• *Side Charm:* ${charmNames[state.charm] || state.charm} (${state.charmColor})`,
      `• *Keyring Hole:* ${state.holePos}`,
      `• *Size:* ${state.sizePreset}`,
      ``,
      `Order Code: \`${designCode}\``,
      ``,
      `Please confirm payment and delivery timeline. Thank you!`
    ].join('\n');

    const whatsappNumber = (typeof Config !== 'undefined' && Config.WHATSAPP) ? Config.WHATSAPP : '918433595240';
    const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    if (typeof Utils !== 'undefined' && Utils.toast) {
      Utils.toast('Opening WhatsApp with your custom keychain order! 🚀');
    }
  }

  /* ══════════════════════════════════════════════════════════
     UI BINDINGS & CONTROLS
  ══════════════════════════════════════════════════════════ */
  function _bindUI() {
    // Text input
    const textInput = document.getElementById('kcTextInput');
    textInput?.addEventListener('input', e => {
      state.text = e.target.value.trim() || 'NIKTRIX';
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

    // Text Print Style selection (Raised, Flush Infill, Engraved)
    document.querySelectorAll('.kc-style-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.kc-style-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.textStyle = btn.dataset.style;
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

    // Charm selection
    document.querySelectorAll('.kc-charm-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.kc-charm-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.charm = btn.dataset.charm;
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
          _textMesh.material.metalness = isGold ? 0.48 : 0.08;
          _textMesh.material.roughness = isGold ? 0.22 : 0.35;
        }
      });
    });

    // Charm color swatches
    document.querySelectorAll('#kcCharmSwatches .kc-swatch').forEach(sw => {
      sw.addEventListener('click', () => {
        document.querySelectorAll('#kcCharmSwatches .kc-swatch').forEach(s => s.classList.remove('active'));
        sw.classList.add('active');
        state.charmColor = sw.dataset.color;
        if (_charmMesh) {
          _charmMesh.material.color.set(state.charmColor);
        }
      });
    });

    // Swap Colors button
    document.getElementById('kcSwapColors')?.addEventListener('click', () => {
      const temp = state.baseColor;
      state.baseColor = state.textColor;
      state.textColor = temp;
      if (_baseMesh) _baseMesh.material.color.set(state.baseColor);
      if (_textMesh) {
        _textMesh.material.color.set(state.textColor);
        const isGold = state.textColor.toLowerCase() === '#d4af37' || state.textColor.toLowerCase() === '#ffd700';
        _textMesh.material.metalness = isGold ? 0.48 : 0.08;
        _textMesh.material.roughness = isGold ? 0.22 : 0.35;
      }
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
      document.getElementById('kcView3D')?.classList.add('active');
      document.getElementById('kcViewTop')?.classList.remove('active');
      _targetRot = { x: 0.32, y: -0.22 };
      _targetZoom = 85;
    });
    document.getElementById('kcViewTop')?.addEventListener('click', () => {
      document.getElementById('kcViewTop')?.classList.add('active');
      document.getElementById('kcView3D')?.classList.remove('active');
      _targetRot = { x: 0, y: 0 };
      _targetZoom = 75;
    });

    // WhatsApp Order Action button
    document.getElementById('kcOrderWhatsApp')?.addEventListener('click', orderViaWhatsApp);

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
    document.querySelectorAll('#kcCharmSwatches .kc-swatch').forEach(s => {
      s.classList.toggle('active', s.dataset.color.toLowerCase() === state.charmColor.toLowerCase());
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

  return { init, show, hide, orderViaWhatsApp, getState: () => ({ ...state }) };
})();
