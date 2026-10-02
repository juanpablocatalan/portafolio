/**
 * ============================================================================
 * PROJECT 01 — 4 CLOSED 3D MAGAZINE MOCKUPS ENGINE
 * Direct 1:1 image color rendering (MeshBasicMaterial + LinearEncoding)
 * Allows dragging, 360° rotation, and quick angle switching for all 4 volumes.
 * ============================================================================
 */

(function () {
  'use strict';

  if (typeof THREE === 'undefined') return;

  const textureLoader = new THREE.TextureLoader();

  // Shared procedural paper edge texture
  function createPaperTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 2048;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#f5f2eb';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let y = 0; y < canvas.height; y += 4) {
      const alpha = 0.05 + Math.random() * 0.12;
      ctx.fillStyle = `rgba(50, 45, 40, ${alpha})`;
      ctx.fillRect(0, y, canvas.width, 1 + (Math.random() > 0.7 ? 1 : 0));
    }
    const grad = ctx.createLinearGradient(0, 0, canvas.width, 0);
    grad.addColorStop(0, 'rgba(0,0,0,0.28)');
    grad.addColorStop(0.15, 'rgba(0,0,0,0.04)');
    grad.addColorStop(0.85, 'rgba(0,0,0,0.03)');
    grad.addColorStop(1, 'rgba(0,0,0,0.22)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.encoding = THREE.LinearEncoding;
    return tex;
  }

  // Shared contact shadow texture
  function createShadowTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(256, 256, 30, 256, 256, 240);
    grad.addColorStop(0, 'rgba(0,0,0,0.7)');
    grad.addColorStop(0.35, 'rgba(0,0,0,0.42)');
    grad.addColorStop(0.75, 'rgba(0,0,0,0.08)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);
    const tex = new THREE.CanvasTexture(canvas);
    tex.encoding = THREE.LinearEncoding;
    return tex;
  }

  const paperTexture = createPaperTexture();
  const shadowTexture = createShadowTexture();

  const isSubdir = window.location.pathname.includes('/projects/');
  const basePath = isSubdir ? '../assets/mockup3d/' : 'assets/mockup3d/';

  function getVolumeData(volKey, fallbackFront, fallbackSpine, fallbackBack) {
    if (window.MOCKUP_3D_TEXTURES && window.MOCKUP_3D_TEXTURES[volKey]) {
      return window.MOCKUP_3D_TEXTURES[volKey];
    }
    return {
      front: basePath + fallbackFront,
      spine: basePath + fallbackSpine,
      back: basePath + fallbackBack
    };
  }

  const VOLUMES = [
    getVolumeData('vol1', 'vol1/portadas-11.jpg', 'vol1/portadas-15.jpg', 'vol1/contrapor_Mesa de trabajo 4 copia 10.jpg'),
    getVolumeData('vol2', 'vol2/portadas-08.jpg', 'vol2/portadas.jpg', 'vol2/contrapor_Mesa de trabajo 4 copia 7.jpg'),
    getVolumeData('vol3', 'vol3/portadas-09.jpg', 'vol3/portadas-14.jpg', 'vol3/contrapor_Mesa de trabajo 4 copia 8.jpg'),
    getVolumeData('vol4', 'vol4/portadas-10.jpg', 'vol4/portadas-13.jpg', 'vol4/contrapor_Mesa de trabajo 4 copia 9.jpg')
  ];

  class ProjectMockupStage {
    constructor(container, data) {
      this.container = container;
      this.data = data;
      // Scaled down 20% from center (exact 1188 x 1553 px ratio) for balanced top & bottom breathing room
      this.width = 3.52;
      this.height = 4.60;
      this.thickness = 0.18;

      this.scene = null;
      this.camera = null;
      this.renderer = null;
      this.magazineGroup = null;
      this.pivotGroup = null;

      this.isDragging = false;
      this.prevMouse = { x: 0, y: 0 };
      this.dragRot = { x: 0.0, y: 0.0 };
      this.targetRot = { x: 0.0, y: 0.0 };
      this.currRot = { x: 0.0, y: 0.0 };
      this.autoSpin = false;

      this.init();
    }

    computeOptimalDistance(aspect) {
      const halfFovRad = (36 / 2) * Math.PI / 180;
      const fitH = (this.height / 2) / Math.tan(halfFovRad) * 1.18;
      const fitW = (this.width / 2) / (Math.tan(halfFovRad) * aspect) * 1.08;
      return Math.max(fitH, fitW, 9.2);
    }

    init() {
      const rect = this.container.getBoundingClientRect();
      const w = rect.width || this.container.clientWidth || 360;
      const h = rect.height || this.container.clientHeight || 600;

      this.scene = new THREE.Scene();
      const aspect = w / h;
      this.camera = new THREE.PerspectiveCamera(36, aspect, 0.1, 100);
      this.camera.position.set(0, 0, this.computeOptimalDistance(aspect));

      this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
      this.renderer.setSize(w, h);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.setClearColor(0x000000, 0);
      this.renderer.outputEncoding = THREE.LinearEncoding;
      this.renderer.toneMapping = THREE.NoToneMapping;

      this.container.appendChild(this.renderer.domElement);

      this.buildModel();
      this.bindEvents();
      this.animate();
    }

    buildModel() {
      this.pivotGroup = new THREE.Group();
      this.scene.add(this.pivotGroup);

      this.magazineGroup = new THREE.Group();
      this.pivotGroup.add(this.magazineGroup);

      const frontTex = textureLoader.load(encodeURI(this.data.front));
      frontTex.encoding = THREE.LinearEncoding;

      const backTex = textureLoader.load(encodeURI(this.data.back));
      backTex.encoding = THREE.LinearEncoding;

      const spineTex = textureLoader.load(encodeURI(this.data.spine));
      spineTex.encoding = THREE.LinearEncoding;

      // Pure 1:1 MeshBasicMaterial — 100% exact original JPG image colors without any lighting alterations
      const paperMat = new THREE.MeshBasicMaterial({ map: paperTexture });
      const spineMat = new THREE.MeshBasicMaterial({ map: spineTex });
      const frontMat = new THREE.MeshBasicMaterial({ map: frontTex });
      const backMat = new THREE.MeshBasicMaterial({ map: backTex });

      const materials = [paperMat, spineMat, paperMat, paperMat, frontMat, backMat];
      const bookGeo = new THREE.BoxGeometry(this.width, this.height, this.thickness);
      const bookMesh = new THREE.Mesh(bookGeo, materials);
      this.magazineGroup.add(bookMesh);
    }

    setPresetAngle(angle) {
      this.autoSpin = false;
      switch (angle) {
        case 'portada':
          this.dragRot = { x: 0.0, y: 0.0 };
          break;
        case 'lomo':
          this.dragRot = { x: 0.0, y: Math.PI / 2 + 0.05 };
          break;
        case 'contraportada':
          this.dragRot = { x: 0.0, y: Math.PI };
          break;
        case 'isometric':
          this.dragRot = { x: 0.22, y: -0.55 };
          break;
        default:
          this.dragRot = { x: 0.0, y: 0.0 };
          break;
      }
    }

    toggleSpin() {
      this.autoSpin = !this.autoSpin;
      return this.autoSpin;
    }

    bindEvents() {
      const el = this.container;

      const onDown = (e) => {
        this.isDragging = true;
        this.prevMouse = {
          x: e.clientX || (e.touches && e.touches[0].clientX) || 0,
          y: e.clientY || (e.touches && e.touches[0].clientY) || 0
        };
      };

      const onMove = (e) => {
        if (!this.isDragging) return;
        const cx = e.clientX || (e.touches && e.touches[0].clientX) || 0;
        const cy = e.clientY || (e.touches && e.touches[0].clientY) || 0;

        const dx = cx - this.prevMouse.x;
        this.dragRot.y += dx * 0.008;

        this.prevMouse = { x: cx, y: cy };
      };

      const onUp = () => {
        this.isDragging = false;
      };

      el.addEventListener('mousedown', onDown);
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);

      el.addEventListener('touchstart', onDown, { passive: true });
      window.addEventListener('touchmove', onMove, { passive: true });
      window.addEventListener('touchend', onUp);

      const handleResize = () => {
        if (!this.container || !this.renderer || !this.camera) return;
        const rect = this.container.getBoundingClientRect();
        const w = rect.width || this.container.clientWidth;
        const h = rect.height || this.container.clientHeight;
        if (w && h) {
          const aspect = w / h;
          this.camera.aspect = aspect;
          this.camera.position.set(0, 0, this.computeOptimalDistance(aspect));
          this.camera.updateProjectionMatrix();
          this.renderer.setSize(w, h);
        }
      };

      window.addEventListener('resize', handleResize);

      if (window.ResizeObserver) {
        const ro = new ResizeObserver(handleResize);
        ro.observe(this.container);
      }
    }

    animate() {
      requestAnimationFrame(() => this.animate());

      // Exact 1:1 Anchored Y-Axis Rotation (Like Home Smiley)
      // When the magazine is in the vertical center of the screen, angle is exactly 0.0 (Front Cover)
      const rect = this.container.getBoundingClientRect();
      const viewportCenter = window.innerHeight / 2;
      const elementCenter = rect.top + rect.height / 2;
      const distanceFromCenter = elementCenter - viewportCenter;

      // Solid, direct linear mapping to vertical scroll position
      const scrollRotY = -distanceFromCenter * 0.0032;

      const targetY = this.dragRot.y + scrollRotY;

      // Solid, responsive tracking without floaty inertia or wobbling
      const lerp = 0.18;
      this.currRot.y += (targetY - this.currRot.y) * lerp;

      if (this.magazineGroup) {
        // Strictly Y-axis rotation, perfectly upright (X = 0, Z = 0)
        this.magazineGroup.rotation.set(0, this.currRot.y, 0);
      }

      this.renderer.render(this.scene, this.camera);
    }
  }

  function initProjectMockups() {
    const instances = [];
    const stageIds = ['proj-mockup-01', 'proj-mockup-02', 'proj-mockup-03', 'proj-mockup-04'];

    stageIds.forEach((id, idx) => {
      const el = document.getElementById(id);
      if (el) {
        const inst = new ProjectMockupStage(el, VOLUMES[idx]);
        instances.push(inst);
      }
    });

    document.querySelectorAll('.proj-angle-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const stageIdx = parseInt(btn.dataset.stage, 10);
        const angle = btn.dataset.angle;
        if (instances[stageIdx]) {
          if (angle === 'spin') {
            const isSpin = instances[stageIdx].toggleSpin();
            btn.classList.toggle('active', isSpin);
          } else {
            instances[stageIdx].setPresetAngle(angle);
          }
        }
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initProjectMockups);
  } else {
    initProjectMockups();
  }
})();
