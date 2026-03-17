/**
 * viewer3d.js
 * Three.js 3D frame viewer — renders a wall-art frame with a texture.
 * Falls back gracefully if Three.js is not available.
 */

// eslint-disable-next-line no-unused-vars
const Viewer3D = (() => {
  let _renderer = null;
  let _animId   = null;
  let _active   = false;

  /**
   * Start the 3D viewer with the given image URL as texture.
   * @param {string} containerId
   * @param {string} imageUrl
   */
  function mount(containerId, imageUrl) {
    if (typeof THREE === 'undefined') {
      console.warn('[Viewer3D] Three.js not loaded.');
      return;
    }

    const container = document.getElementById(containerId);
    if (!container) return;

    destroy(); // clean up any previous instance

    const W = container.clientWidth  || 400;
    const H = container.clientHeight || 360;

    // Scene
    const scene    = new THREE.Scene();
    scene.background = new THREE.Color(0xf0ede8);

    // Camera
    const camera   = new THREE.PerspectiveCamera(45, W / H, 0.1, 100);
    camera.position.set(0, 0, 4.5);

    // Renderer
    _renderer = new THREE.WebGLRenderer({ antialias: true });
    _renderer.setSize(W, H);
    _renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(_renderer.domElement);

    // Frame mesh (thin box)
    const frameGeo  = new THREE.BoxGeometry(2.6, 3.4, 0.12);
    const frameMat  = new THREE.MeshPhongMaterial({ color: 0x1a1a1a });
    const frame     = new THREE.Mesh(frameGeo, frameMat);
    scene.add(frame);

    // Canvas print (slightly in front of frame)
    const canvasGeo = new THREE.PlaneGeometry(2.2, 3.0);
    const texture   = new THREE.TextureLoader().load(imageUrl);
    const canvasMat = new THREE.MeshBasicMaterial({ map: texture });
    const canvas    = new THREE.Mesh(canvasGeo, canvasMat);
    canvas.position.z = 0.07;
    scene.add(canvas);

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(3, 4, 5);
    scene.add(dirLight);

    // Subtle auto-rotate
    _active = true;
    let angle = 0;

    function animate() {
      if (!_active) return;
      _animId = requestAnimationFrame(animate);
      angle += 0.004;
      frame.rotation.y  = Math.sin(angle) * 0.25;
      canvas.rotation.y = Math.sin(angle) * 0.25;
      _renderer.render(scene, camera);
    }
    animate();
  }

  /**
   * Stop the animation loop and remove the canvas.
   */
  function destroy() {
    _active = false;
    if (_animId) { cancelAnimationFrame(_animId); _animId = null; }
    if (_renderer) {
      _renderer.dispose();
      if (_renderer.domElement.parentNode) {
        _renderer.domElement.parentNode.removeChild(_renderer.domElement);
      }
      _renderer = null;
    }
  }

  return { mount, destroy };
})();
