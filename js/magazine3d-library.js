/**
 * ============================================================================
 * 3D CLOSED MAGAZINE MOCKUP LIBRARY ENGINE
 * Three.js Real-Time Physical 3D Book & Editorial Catalog Mockups
 * Features:
 * - Direct image mapping for real Portada, Lomo & Contraportada from assets/mockup3d/
 * - Exact aspect ratio & thickness calibration (1188 x 1553 px, 45 px spine)
 * - Scroll-driven continuous 360° rotation (Front -> Spine -> Back)
 * - Micro-layered procedural paper edge textures (102 pages)
 * - Interactive angle presets (📕 Portada, 📖 Lomo, 📗 Contraportada, 📐 3D Isométrico)
 * - Interactive 360° mouse & touch orbit with inertia damping
 * - Turntable auto-rotation mode
 * ============================================================================
 */

(function () {
  'use strict';

  // Helper: Create a realistic procedural paper edge texture (micro-lines for pages)
  function createPaperEdgeTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 2048;
    const ctx = canvas.getContext('2d');

    // Warm book paper tone (#f5f2eb)
    ctx.fillStyle = '#f5f2eb';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle paper edge sheet striations
    for (let y = 0; y < canvas.height; y += 4) {
      const alpha = 0.05 + Math.random() * 0.12;
      ctx.fillStyle = `rgba(50, 45, 40, ${alpha})`;
      ctx.fillRect(0, y, canvas.width, 1 + (Math.random() > 0.7 ? 1 : 0));
    }

    // Depth shadow along inner book fold
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0.28)');
    gradient.addColorStop(0.15, 'rgba(0, 0, 0, 0.04)');
    gradient.addColorStop(0.85, 'rgba(0, 0, 0, 0.03)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.22)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  // Helper: Create soft radial contact shadow texture
  function createContactShadowTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(256, 256, 30, 256, 256, 240);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.7)');
    grad.addColorStop(0.35, 'rgba(0, 0, 0, 0.42)');
    grad.addColorStop(0.75, 'rgba(0, 0, 0, 0.08)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    return new THREE.CanvasTexture(canvas);
  }

  const textureLoader = new THREE.TextureLoader();
  const sharedPaperTexture = createPaperEdgeTexture();
  const sharedShadowTexture = createContactShadowTexture();

  /**
   * Class: ClosedMagazineExhibit
   * Manages a single 3D interactive stage with scroll rotation & orbit physics.
   */
  class ClosedMagazineExhibit {
    constructor(container, options = {}) {
      this.container = container;
      this.options = Object.assign({
        frontCover: 'assets/mockup3d/vol1/portadas-11.jpg',
        spineImage: 'assets/mockup3d/vol1/portadas-15.jpg',
        backCover: 'assets/mockup3d/vol1/contrapor_Mesa de trabajo 4 copia 10.jpg',
        title: 'FRONTEO 2000–2010',
        vol: 'VOL. 01',
        // Proportions matching 1188 x 1553 px (ratio ~0.765) and 45 px spine
        height: 5.2,
        width: 3.98,
        thickness: 0.22,
        scrollRotationMultiplier: 3.6,
        autoRotate: false,
        autoRotateSpeed: 0.01,
        enableScroll: true
      }, options);

      this.scene = null;
      this.camera = null;
      this.renderer = null;
      this.magazineGroup = null;
      this.pivotGroup = null;
      this.shadowMesh = null;

      // Interaction State
      this.isDragging = false;
      this.previousMousePosition = { x: 0, y: 0 };
      this.dragRotation = { x: 0.12, y: -0.35, z: 0.0 };
      this.targetRotation = { x: 0.12, y: -0.35, z: 0.0 };
      this.currentRotation = { x: 0.12, y: -0.35, z: 0.0 };
      this.lastUserInteraction = 0;
      this.mouseParallax = { x: 0, y: 0 };
      this.autoSpinActive = !!this.options.autoRotate;
      this.activePreset = null;

      this.init();
    }

    init() {
      const rect = this.container.getBoundingClientRect();
      const width = rect.width || this.container.clientWidth || 600;
      const height = rect.height || this.container.clientHeight || 480;

      // 1. Three.js Scene & Camera
      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 100);
      this.camera.position.set(0, 0, 10.2);

      // 2. WebGL Renderer
      this.renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance'
      });
      this.renderer.setSize(width, height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.setClearColor(0x000000, 0);

      this.renderer.outputEncoding = THREE.LinearEncoding;
      this.renderer.toneMapping = THREE.NoToneMapping;

      this.container.appendChild(this.renderer.domElement);

      // 4. Build 3D Magazine Geometry
      this.buildMagazine();

      // 5. Attach Event Listeners
      this.bindEvents();

      // 6. Start Render Loop
      this.animate();
    }

    buildMagazine() {
      const W = this.options.width;
      const H = this.options.height;
      const T = this.options.thickness;

      this.pivotGroup = new THREE.Group();
      this.scene.add(this.pivotGroup);

      this.magazineGroup = new THREE.Group();
      this.pivotGroup.add(this.magazineGroup);

      // Load Real Textures from assets/mockup3d/
      const frontTex = textureLoader.load(this.options.frontCover);
      frontTex.encoding = THREE.LinearEncoding;

      const backTex = textureLoader.load(this.options.backCover);
      backTex.encoding = THREE.LinearEncoding;

      const spineTex = textureLoader.load(this.options.spineImage);
      spineTex.encoding = THREE.LinearEncoding;

      // Pure 1:1 MeshBasicMaterial — 100% exact original JPG image colors without any lighting alterations
      const paperMat = new THREE.MeshBasicMaterial({
        map: sharedPaperTexture
      });

      const spineMat = new THREE.MeshBasicMaterial({
        map: spineTex
      });

      const frontMat = new THREE.MeshBasicMaterial({
        map: frontTex
      });

      const backMat = new THREE.MeshBasicMaterial({
        map: backTex
      });

      const materials = [
        paperMat, // +X: Paper edge (right side)
        spineMat, // -X: Spine (left side)
        paperMat, // +Y: Paper edge (top)
        paperMat, // -Y: Paper edge (bottom)
        frontMat, // +Z: Front Cover (Portada)
        backMat   // -Z: Back Cover (Contraportada)
      ];

      const bookGeo = new THREE.BoxGeometry(W, H, T, 4, 8, 2);
      const bookMesh = new THREE.Mesh(bookGeo, materials);
      this.magazineGroup.add(bookMesh);
    }

    setPresetAngle(presetName) {
      this.activePreset = presetName;
      this.lastUserInteraction = Date.now();
      this.autoSpinActive = false;

      switch (presetName) {
        case 'portada':
          // Front cover view with subtle dynamic tilt
          this.dragRotation = { x: 0.04, y: -0.08, z: 0.0 };
          break;
        case 'lomo':
          // Snapped straight to the spine (-X face turned to camera)
          this.dragRotation = { x: 0.02, y: Math.PI / 2 + 0.08, z: 0.0 };
          break;
        case 'contraportada':
          // Back cover view (-Z face turned to camera)
          this.dragRotation = { x: 0.04, y: Math.PI + 0.08, z: 0.0 };
          break;
        case 'isometric':
          // 3D Isometric / 3/4 angle showing front, spine, and top edge
          this.dragRotation = { x: 0.28, y: -0.55, z: -0.06 };
          break;
        case 'top':
          // Top edge view looking down at page block
          this.dragRotation = { x: 1.25, y: -0.3, z: 0.0 };
          break;
        default:
          this.dragRotation = { x: 0.12, y: -0.35, z: 0.0 };
          break;
      }
    }

    toggleAutoSpin() {
      this.autoSpinActive = !this.autoSpinActive;
      this.lastUserInteraction = Date.now();
      return this.autoSpinActive;
    }

    bindEvents() {
      const el = this.container;

      // Mouse & Touch Dragging Orbit Controls
      const onPointerDown = (e) => {
        this.isDragging = true;
        this.autoSpinActive = false;
        this.activePreset = null;
        this.previousMousePosition = {
          x: e.clientX || (e.touches && e.touches[0].clientX) || 0,
          y: e.clientY || (e.touches && e.touches[0].clientY) || 0
        };
        this.lastUserInteraction = Date.now();
      };

      const onPointerMove = (e) => {
        const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
        const clientY = e.clientY || (e.touches && e.touches[0].clientY) || 0;

        // Subtle hover parallax when not dragging
        if (!this.isDragging) {
          const rect = el.getBoundingClientRect();
          const normX = ((clientX - rect.left) / rect.width) * 2 - 1;
          const normY = ((clientY - rect.top) / rect.height) * 2 - 1;
          this.mouseParallax.x = normX * 0.12;
          this.mouseParallax.y = -normY * 0.1;
          return;
        }

        const deltaX = clientX - this.previousMousePosition.x;
        const deltaY = clientY - this.previousMousePosition.y;

        this.dragRotation.y += deltaX * 0.008;
        this.dragRotation.x += deltaY * 0.008;

        this.previousMousePosition = { x: clientX, y: clientY };
        this.lastUserInteraction = Date.now();
      };

      const onPointerUp = () => {
        this.isDragging = false;
      };

      el.addEventListener('mousedown', onPointerDown);
      window.addEventListener('mousemove', onPointerMove);
      window.addEventListener('mouseup', onPointerUp);

      el.addEventListener('touchstart', onPointerDown, { passive: true });
      window.addEventListener('touchmove', onPointerMove, { passive: true });
      window.addEventListener('touchend', onPointerUp);

      // Window Resize Listener
      window.addEventListener('resize', () => this.handleResize());
    }

    handleResize() {
      if (!this.container || !this.renderer || !this.camera) return;
      const rect = this.container.getBoundingClientRect();
      const w = rect.width || this.container.clientWidth || 600;
      const h = rect.height || this.container.clientHeight || 480;

      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();

      this.renderer.setSize(w, h);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    }

    updatePhysics() {
      const rect = this.container.getBoundingClientRect();
      const winHeight = window.innerHeight || document.documentElement.clientHeight;

      // Auto-turntable spin
      if (this.autoSpinActive) {
        this.dragRotation.y += this.options.autoRotateSpeed;
        this.targetRotation.x = 0.15;
        this.targetRotation.y = this.dragRotation.y;
        this.targetRotation.z = 0;
      } else {
        const timeSinceDrag = Date.now() - this.lastUserInteraction;
        const isManualInteracting = this.isDragging || this.activePreset !== null || timeSinceDrag < 2200;

        if (!isManualInteracting && this.options.enableScroll) {
          // Calculate scroll progress through this exhibit (0 when at bottom of viewport, 1 at top)
          const centerY = rect.top + rect.height / 2;
          const progress = (winHeight - centerY) / winHeight;

          // Continuous scroll rotation: turns front -> spine -> back as you scroll!
          const scrollAngleY = (progress - 0.5) * Math.PI * this.options.scrollRotationMultiplier;
          const scrollAngleX = Math.sin(progress * Math.PI) * 0.22;
          const scrollAngleZ = Math.cos(progress * Math.PI) * 0.1;

          this.targetRotation.x = scrollAngleX + this.mouseParallax.y;
          this.targetRotation.y = scrollAngleY + this.mouseParallax.x;
          this.targetRotation.z = scrollAngleZ;

          this.dragRotation.x *= 0.96;
          this.dragRotation.y *= 0.96;
        } else {
          // Dragging or Preset mode
          this.targetRotation.x = this.dragRotation.x + this.mouseParallax.y;
          this.targetRotation.y = this.dragRotation.y + this.mouseParallax.x;
          this.targetRotation.z = 0;
        }
      }

      // Smooth Lerp Damping
      const lerpFactor = 0.085;
      this.currentRotation.x += (this.targetRotation.x - this.currentRotation.x) * lerpFactor;
      this.currentRotation.y += (this.targetRotation.y - this.currentRotation.y) * lerpFactor;
      this.currentRotation.z += (this.targetRotation.z - this.currentRotation.z) * lerpFactor;

      // Apply to 3D Magazine Group
      if (this.magazineGroup) {
        this.magazineGroup.rotation.x = this.currentRotation.x;
        this.magazineGroup.rotation.y = this.currentRotation.y;
        this.magazineGroup.rotation.z = this.currentRotation.z;

        // Floating hover bobbing
        const time = performance.now() * 0.0015;
        this.magazineGroup.position.y = Math.sin(time) * 0.06;
      }

      // Dynamic shadow scale & opacity based on angle
      if (this.shadowMesh) {
        const tiltIntensity = Math.abs(Math.cos(this.currentRotation.y));
        this.shadowMesh.scale.x = 0.85 + tiltIntensity * 0.35;
        this.shadowMesh.material.opacity = 0.35 + tiltIntensity * 0.25;
      }
    }

    animate() {
      requestAnimationFrame(() => this.animate());
      this.updatePhysics();
      this.renderer.render(this.scene, this.camera);
    }
  }

  // ==========================================================================
  // INITIALIZE ALL 3D EXHIBITS & ATTACH TOOLBAR CONTROLS
  // ==========================================================================
  function initLibrary() {
    const exhibits = [];

    // Helper: Wire up angle buttons for a stage
    function setupToolbar(stageId, exhibitInstance) {
      const parent = document.getElementById(stageId)?.closest('.exhibit-stage-col');
      if (!parent) return;

      const buttons = parent.querySelectorAll('.stage-angle-btn');
      buttons.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const action = btn.dataset.angle;
          if (action === 'spin') {
            const isSpinning = exhibitInstance.toggleAutoSpin();
            btn.classList.toggle('active', isSpinning);
          } else {
            // Remove active from others
            buttons.forEach(b => { if (b.dataset.angle !== 'spin') b.classList.remove('active'); });
            btn.classList.add('active');
            exhibitInstance.setPresetAngle(action);
          }
        });
      });
    }

    function getLibTex(key, defaultFront, defaultSpine, defaultBack) {
      if (window.MOCKUP_3D_TEXTURES && window.MOCKUP_3D_TEXTURES[key]) {
        return window.MOCKUP_3D_TEXTURES[key];
      }
      return { front: defaultFront, spine: defaultSpine, back: defaultBack };
    }

    const t1 = getLibTex('vol1', 'assets/mockup3d/vol1/portadas-11.jpg', 'assets/mockup3d/vol1/portadas-15.jpg', 'assets/mockup3d/vol1/contrapor_Mesa de trabajo 4 copia 10.jpg');
    const t2 = getLibTex('vol2', 'assets/mockup3d/vol2/portadas-08.jpg', 'assets/mockup3d/vol2/portadas.jpg', 'assets/mockup3d/vol2/contrapor_Mesa de trabajo 4 copia 7.jpg');
    const t3 = getLibTex('vol3', 'assets/mockup3d/vol3/portadas-09.jpg', 'assets/mockup3d/vol3/portadas-14.jpg', 'assets/mockup3d/vol3/contrapor_Mesa de trabajo 4 copia 8.jpg');
    const t4 = getLibTex('vol4', 'assets/mockup3d/vol4/portadas-10.jpg', 'assets/mockup3d/vol4/portadas-13.jpg', 'assets/mockup3d/vol4/contrapor_Mesa de trabajo 4 copia 9.jpg');

    // 1. Exhibit 01: Fronteo 2000–2010 (Nike Air Max)
    const stage1 = document.getElementById('stage-mag-01');
    if (stage1) {
      const ex1 = new ClosedMagazineExhibit(stage1, {
        frontCover: t1.front,
        spineImage: t1.spine,
        backCover: t1.back,
        title: 'FRONTEO 2000–2010',
        vol: 'VOL. 01',
        scrollRotationMultiplier: 3.5
      });
      exhibits.push(ex1);
      setupToolbar('stage-mag-01', ex1);
    }

    // 2. Exhibit 02: Fronteo 2000–2010 (Gold Chains & Bling)
    const stage2 = document.getElementById('stage-mag-02');
    if (stage2) {
      const ex2 = new ClosedMagazineExhibit(stage2, {
        frontCover: t2.front,
        spineImage: t2.spine,
        backCover: t2.back,
        title: 'FRONTEO 2000–2010',
        vol: 'VOL. 02',
        scrollRotationMultiplier: 3.8
      });
      exhibits.push(ex2);
      setupToolbar('stage-mag-02', ex2);
    }

    // 3. Exhibit 03: Fronteo 2010–2020 (Iconografía & Joyas)
    const stage3 = document.getElementById('stage-mag-03');
    if (stage3) {
      const ex3 = new ClosedMagazineExhibit(stage3, {
        frontCover: t3.front,
        spineImage: t3.spine,
        backCover: t3.back,
        title: 'FRONTEO 2010–2020',
        vol: 'VOL. 03',
        scrollRotationMultiplier: 3.6
      });
      exhibits.push(ex3);
      setupToolbar('stage-mag-03', ex3);
    }

    // 4. Exhibit 04: Fronteo 2020–2030 (Mercedes-Benz 190E)
    const stage4 = document.getElementById('stage-mag-04');
    if (stage4) {
      const ex4 = new ClosedMagazineExhibit(stage4, {
        frontCover: t4.front,
        spineImage: t4.spine,
        backCover: t4.back,
        title: 'FRONTEO 2020–2030',
        vol: 'VOL. 04',
        scrollRotationMultiplier: 3.4
      });
      exhibits.push(ex4);
      setupToolbar('stage-mag-04', ex4);
    }

    // Comparative Shelf Grid Stages (using real files from assets/mockup3d/)
    const gridStages = document.querySelectorAll('.grid-card-stage');
    gridStages.forEach((el) => {
      const front = el.dataset.front || 'assets/mockup3d/vol1/portadas-11.jpg';
      const spine = el.dataset.spine || 'assets/mockup3d/vol1/portadas-15.jpg';
      const back = el.dataset.back || 'assets/mockup3d/vol1/contrapor_Mesa de trabajo 4 copia 10.jpg';
      const title = el.dataset.title || 'FRONTEO ARCHIVE';
      const vol = el.dataset.vol || 'VOL. 01';

      new ClosedMagazineExhibit(el, {
        frontCover: front,
        spineImage: spine,
        backCover: back,
        title: title,
        vol: vol,
        width: 3.6,
        height: 4.7,
        thickness: 0.22,
        scrollRotationMultiplier: 2.2
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLibrary);
  } else {
    initLibrary();
  }
})();
