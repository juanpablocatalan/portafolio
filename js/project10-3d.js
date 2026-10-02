/**
 * ============================================================================
 * PROJECT 10 — 3D RHINO MODEL INTERACTIVE STUDIO ENGINE
 * Model: assets/proyecto10/modelosrhinoctm/untitled.glb
 * Author: Juan Pablo Portfolio
 * Supports direct file:// protocol (via Base64 buffer) and http/https URL loading.
 * ============================================================================
 */

(function () {
  'use strict';

  if (typeof THREE === 'undefined') {
    console.error('Three.js is not loaded');
    return;
  }

  const stageWrapper = document.getElementById('project10-3d-stage');
  const canvas = document.getElementById('project10-3d-canvas');
  if (!stageWrapper || !canvas) return;

  // Path resolution
  const isSubdir = window.location.pathname.includes('/projects/');
  const modelUrl = isSubdir
    ? '../assets/proyecto10/modelosrhinoctm/untitled.glb'
    : 'assets/proyecto10/modelosrhinoctm/untitled.glb';

  // State
  let scene, camera, renderer, modelGroup, originalMesh, currentMaterialType = 'chrome';
  let isDragging = false;
  let prevPointer = { x: 0, y: 0 };
  let targetRotation = { x: 0.45, y: -0.65 };
  let currentRotation = { x: 0.45, y: -0.65 };
  let targetDistance = 3.6;
  let currentDistance = 3.6;
  let autoRotate = true;
  let autoRotateSpeed = 0.0035;
  let lightsGroup;

  // Helper: Base64 to ArrayBuffer for zero-CORS file:// protocol support
  function base64ToArrayBuffer(base64) {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  // Materials definition (with DoubleSide to guarantee visibility of all faces)
  const materials = {
    chrome: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.95,
      roughness: 0.15,
      envMapIntensity: 1.8,
      side: THREE.DoubleSide
    }),
    graphite: new THREE.MeshStandardMaterial({
      color: 0x222328,
      metalness: 0.6,
      roughness: 0.35,
      side: THREE.DoubleSide
    }),
    ceramic: new THREE.MeshStandardMaterial({
      color: 0xf4f4f6,
      metalness: 0.1,
      roughness: 0.3,
      side: THREE.DoubleSide
    }),
    legoYellow: new THREE.MeshStandardMaterial({
      color: 0xffcc00,
      metalness: 0.15,
      roughness: 0.2,
      side: THREE.DoubleSide
    }),
    wireframe: new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
      side: THREE.DoubleSide
    })
  };

  function init() {
    // Scene setup
    scene = new THREE.Scene();
    scene.background = null;

    // Camera setup
    const rect = stageWrapper.getBoundingClientRect();
    const width = rect.width || window.innerWidth;
    const height = rect.height || 600;
    camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0, currentDistance);

    // Renderer setup
    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    if (renderer.outputEncoding) {
      renderer.outputEncoding = THREE.sRGBEncoding;
    }

    // Studio Lighting
    lightsGroup = new THREE.Group();

    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    lightsGroup.add(ambientLight);

    // Key Light
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
    keyLight.position.set(6, 8, 7);
    lightsGroup.add(keyLight);

    // Fill Light
    const fillLight = new THREE.DirectionalLight(0xa5c4f5, 1.3);
    fillLight.position.set(-7, -2, 5);
    lightsGroup.add(fillLight);

    // Rim / Edge Light
    const rimLight = new THREE.DirectionalLight(0xffffff, 2.0);
    rimLight.position.set(0, 7, -7);
    lightsGroup.add(rimLight);

    // Bottom Bounce
    const bounceLight = new THREE.DirectionalLight(0x666677, 0.6);
    bounceLight.position.set(0, -6, 0);
    lightsGroup.add(bounceLight);

    scene.add(lightsGroup);

    // Procedural Studio Environment Reflection Map
    createStudioEnvironment();

    // Model Container Pivot
    modelGroup = new THREE.Group();
    scene.add(modelGroup);

    // Load Model (Base64 or URL)
    loadModel();

    // Bind Interaction Events
    setupEventListeners();

    // Setup Toolbar Controls
    setupUIControls();

    // Animation Loop
    animate();
  }

  function createStudioEnvironment() {
    const envCanvas = document.createElement('canvas');
    envCanvas.width = 512;
    envCanvas.height = 256;
    const ctx = envCanvas.getContext('2d');

    const grad = ctx.createLinearGradient(0, 0, 0, envCanvas.height);
    grad.addColorStop(0.0, '#ffffff');
    grad.addColorStop(0.25, '#94a3b8');
    grad.addColorStop(0.5, '#1e293b');
    grad.addColorStop(0.8, '#0f172a');
    grad.addColorStop(1.0, '#020617');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, envCanvas.width, envCanvas.height);

    // Studio softbox highlights
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(80, 25, 140, 90);
    ctx.fillRect(320, 45, 110, 80);

    const envTexture = new THREE.CanvasTexture(envCanvas);
    envTexture.mapping = THREE.EquirectangularReflectionMapping;
    if (envTexture.encoding) envTexture.encoding = THREE.sRGBEncoding;

    scene.environment = envTexture;
    materials.chrome.envMap = envTexture;
    materials.graphite.envMap = envTexture;
    materials.ceramic.envMap = envTexture;
    materials.legoYellow.envMap = envTexture;
  }

  function setupLoadedScene(root) {
    // Compute Bounding Box & Center Geometry
    const bbox = new THREE.Box3().setFromObject(root);
    const center = bbox.getCenter(new THREE.Vector3());
    const size = bbox.getSize(new THREE.Vector3());

    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const targetScale = 2.2 / maxDim;

    // Center pivot
    root.position.x = -center.x * targetScale;
    root.position.y = -center.y * targetScale;
    root.position.z = -center.z * targetScale;
    root.scale.setScalar(targetScale);

    // Apply materials and compute normals
    root.traverse(function (child) {
      if (child.isMesh) {
        originalMesh = child;
        child.geometry.computeVertexNormals();
        child.material = materials[currentMaterialType];
      }
    });

    modelGroup.add(root);

    // Hide Loading Screen
    const loadingStatus = document.getElementById('p10-loading-status');
    if (loadingStatus) {
      loadingStatus.style.opacity = '0';
      setTimeout(() => { loadingStatus.style.display = 'none'; }, 400);
    }

    // Activate Controls HUD
    const controlsHud = document.getElementById('p10-controls-hud');
    if (controlsHud) controlsHud.classList.add('active');

    // Update Triangles Count
    const polyDisplay = document.getElementById('p10-poly-count');
    if (polyDisplay && originalMesh && originalMesh.geometry) {
      const index = originalMesh.geometry.index;
      const triCount = index ? (index.count / 3) : (originalMesh.geometry.attributes.position.count / 3);
      polyDisplay.textContent = `${Math.round(triCount).toLocaleString()} tris`;
    }
  }

  function loadModel() {
    const loadingStatus = document.getElementById('p10-loading-status');
    if (loadingStatus) loadingStatus.textContent = 'Cargando geometría 3D...';

    const loader = new THREE.GLTFLoader();

    // Priority 1: Check embedded Base64 (instant, zero CORS, works directly when double clicking file)
    if (window.MODEL_PROJECT_10_GLB_B64) {
      try {
        const arrayBuf = base64ToArrayBuffer(window.MODEL_PROJECT_10_GLB_B64);
        loader.parse(
          arrayBuf,
          '',
          function (gltf) {
            setupLoadedScene(gltf.scene || gltf.scenes[0]);
          },
          function (err) {
            console.warn('Error parsing Base64 GLB, trying URL fallback:', err);
            loadViaUrl(loader);
          }
        );
        return;
      } catch (e) {
        console.warn('Base64 parse exception:', e);
      }
    }

    // Priority 2: Load via HTTP URL
    loadViaUrl(loader);
  }

  function loadViaUrl(loader) {
    const loadingStatus = document.getElementById('p10-loading-status');
    loader.load(
      modelUrl,
      function (gltf) {
        setupLoadedScene(gltf.scene || gltf.scenes[0]);
      },
      function (xhr) {
        if (xhr.lengthComputable && loadingStatus) {
          const percent = Math.round((xhr.loaded / xhr.total) * 100);
          loadingStatus.textContent = `Cargando 3D (${percent}%)...`;
        }
      },
      function (error) {
        console.error('Error loading GLB via URL:', error);
        if (loadingStatus) {
          loadingStatus.textContent = 'Error al cargar el archivo 3D.';
        }
      }
    );
  }

  function setMaterial(type) {
    currentMaterialType = type;
    if (originalMesh && materials[type]) {
      originalMesh.material = materials[type];
      originalMesh.material.needsUpdate = true;
    }

    document.querySelectorAll('.p10-mat-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mat === type);
    });
  }

  function setupUIControls() {
    document.querySelectorAll('.p10-mat-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        setMaterial(btn.dataset.mat);
      });
    });

    const btnReset = document.getElementById('p10-btn-reset');
    if (btnReset) {
      btnReset.addEventListener('click', () => {
        targetRotation.x = 0.45;
        targetRotation.y = -0.65;
        targetDistance = 3.6;
      });
    }

    const btnTop = document.getElementById('p10-btn-top');
    if (btnTop) {
      btnTop.addEventListener('click', () => {
        targetRotation.x = Math.PI / 2;
        targetRotation.y = 0;
      });
    }

    const btnFront = document.getElementById('p10-btn-front');
    if (btnFront) {
      btnFront.addEventListener('click', () => {
        targetRotation.x = 0;
        targetRotation.y = 0;
      });
    }

    const btnAutoRotate = document.getElementById('p10-btn-autorotate');
    if (btnAutoRotate) {
      btnAutoRotate.addEventListener('click', () => {
        autoRotate = !autoRotate;
        btnAutoRotate.classList.toggle('active', autoRotate);
      });
    }
  }

  function setupEventListeners() {
    stageWrapper.addEventListener('pointerdown', (e) => {
      isDragging = true;
      stageWrapper.style.cursor = 'grabbing';
      prevPointer.x = e.clientX;
      prevPointer.y = e.clientY;
      autoRotate = false;
      const btnAuto = document.getElementById('p10-btn-autorotate');
      if (btnAuto) btnAuto.classList.remove('active');
    });

    window.addEventListener('pointermove', (e) => {
      if (!isDragging) return;
      const deltaX = e.clientX - prevPointer.x;
      const deltaY = e.clientY - prevPointer.y;

      targetRotation.y += deltaX * 0.008;
      targetRotation.x += deltaY * 0.008;

      targetRotation.x = Math.max(-Math.PI * 0.45, Math.min(Math.PI * 0.45, targetRotation.x));

      prevPointer.x = e.clientX;
      prevPointer.y = e.clientY;
    });

    window.addEventListener('pointerup', () => {
      if (isDragging) {
        isDragging = false;
        stageWrapper.style.cursor = 'grab';
      }
    });

    window.addEventListener('pointercancel', () => {
      isDragging = false;
      stageWrapper.style.cursor = 'grab';
    });

    stageWrapper.addEventListener('wheel', (e) => {
      e.preventDefault();
      targetDistance += e.deltaY * 0.003;
      targetDistance = Math.max(1.5, Math.min(7.0, targetDistance));
    }, { passive: false });

    window.addEventListener('resize', onWindowResize);
  }

  function onWindowResize() {
    if (!stageWrapper || !renderer || !camera) return;
    const rect = stageWrapper.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height || 600;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  function animate() {
    requestAnimationFrame(animate);

    if (autoRotate && !isDragging) {
      targetRotation.y += autoRotateSpeed;
    }

    currentRotation.x += (targetRotation.x - currentRotation.x) * 0.08;
    currentRotation.y += (targetRotation.y - currentRotation.y) * 0.08;
    currentDistance += (targetDistance - currentDistance) * 0.1;

    if (modelGroup) {
      modelGroup.rotation.x = currentRotation.x;
      modelGroup.rotation.y = currentRotation.y;
    }

    if (camera) {
      camera.position.z = currentDistance;
    }

    renderer.render(scene, camera);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
