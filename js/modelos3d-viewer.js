/**
 * ============================================================================
 * MODELOS 3D — DUAL INTERACTIVE STUDIO VIEWERS (Three.js WebGL)
 * Powers independent 3D viewports for:
 * 1. Pieza CAD de Ensamble (untitled.glb)
 * 2. Minifigura Lego Tridimensional (monitolego2.glb)
 * ============================================================================
 */

(function () {
  'use strict';

  function create3DStage(config) {
    const stageWrapper = document.getElementById(config.stageId);
    const canvas = document.getElementById(config.canvasId);
    const loadingOverlay = document.getElementById(config.loadingId);
    if (!stageWrapper || !canvas || typeof THREE === 'undefined') return null;

    // Relative path resolving
    const isSubdir = window.location.pathname.includes('/projects/');
    const getPath = (p) => (isSubdir ? '../' + p : p);
    const resolvedUrl = getPath(config.modelPath);

    // State
    let scene, camera, renderer, modelGroup;
    let currentMaterialType = config.defaultMaterial || 'chrome';
    let isDragging = false;
    let prevPointer = { x: 0, y: 0 };
    let targetRotation = { x: config.initRotX || 0.35, y: config.initRotY || -0.55 };
    let currentRotation = { x: config.initRotX || 0.35, y: config.initRotY || -0.55 };
    let targetDistance = config.defaultDistance || 3.6;
    let currentDistance = config.defaultDistance || 3.6;
    let autoRotate = true;
    let autoRotateSpeed = 0.0035;

    // Materials definition (DoubleSided)
    const materials = {
      chrome: new THREE.MeshStandardMaterial({
        color: 0xf5f7fb,
        metalness: 0.95,
        roughness: 0.16,
        envMapIntensity: 2.2,
        side: THREE.DoubleSide
      }),
      graphite: new THREE.MeshStandardMaterial({
        color: 0x1a1b1f,
        metalness: 0.75,
        roughness: 0.32,
        side: THREE.DoubleSide
      }),
      ceramic: new THREE.MeshStandardMaterial({
        color: 0xf4f4f8,
        metalness: 0.08,
        roughness: 0.28,
        side: THREE.DoubleSide
      }),
      emerald: new THREE.MeshStandardMaterial({
        color: 0x059669,
        metalness: 0.15,
        roughness: 0.12,
        side: THREE.DoubleSide
      }),
      amber: new THREE.MeshStandardMaterial({
        color: 0xd97706,
        metalness: 0.15,
        roughness: 0.12,
        side: THREE.DoubleSide
      }),
      cobalt: new THREE.MeshStandardMaterial({
        color: 0x1d4ed8,
        metalness: 0.15,
        roughness: 0.12,
        side: THREE.DoubleSide
      }),
      frosted: new THREE.MeshStandardMaterial({
        color: 0xe2e8f0,
        metalness: 0.05,
        roughness: 0.55,
        side: THREE.DoubleSide
      }),
      legoYellow: new THREE.MeshStandardMaterial({
        color: 0xffcc00,
        metalness: 0.12,
        roughness: 0.22,
        side: THREE.DoubleSide
      }),
      wireframe: new THREE.MeshBasicMaterial({
        color: 0x00f0ff,
        wireframe: true,
        side: THREE.DoubleSide
      })
    };

    // Check if user has calibrated custom colors in the studio (v2)
    let customSavedMaterials = null;
    try {
      const saved = localStorage.getItem('lego_studio_config_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.parts) {
          customSavedMaterials = {};
          const rough = (parsed.material && parsed.material.roughness !== undefined) ? parsed.material.roughness : 0.16;
          const metal = (parsed.material && parsed.material.metalness !== undefined) ? parsed.material.metalness : 0.12;
          Object.keys(parsed.parts).forEach((part) => {
            customSavedMaterials[part] = new THREE.MeshStandardMaterial({
              color: new THREE.Color(parsed.parts[part]),
              roughness: rough,
              metalness: metal,
              side: THREE.DoubleSide
            });
          });
          customSavedMaterials.other = new THREE.MeshStandardMaterial({
            color: new THREE.Color(parsed.parts.other || '#cccccc'),
            roughness: rough,
            metalness: metal,
            side: THREE.DoubleSide
          });
        }
      }
    } catch (e) {}

    // 8-Part Distinct Color Palette (Exact Studio Calibration)
    const multicolorMaterials = {
      casco: new THREE.MeshStandardMaterial({ color: 0x2563EB, metalness: 0.12, roughness: 0.16, side: THREE.DoubleSide }),
      cara: new THREE.MeshStandardMaterial({ color: 0xFFD000, metalness: 0.12, roughness: 0.16, side: THREE.DoubleSide }),
      airtank: new THREE.MeshStandardMaterial({ color: 0xF2F3F2, metalness: 0.12, roughness: 0.16, side: THREE.DoubleSide }),
      torso: new THREE.MeshStandardMaterial({ color: 0xC91A09, metalness: 0.12, roughness: 0.16, side: THREE.DoubleSide }),
      brazos: new THREE.MeshStandardMaterial({ color: 0x10B981, metalness: 0.12, roughness: 0.16, side: THREE.DoubleSide }),
      manos: new THREE.MeshStandardMaterial({ color: 0xFFD000, metalness: 0.12, roughness: 0.16, side: THREE.DoubleSide }),
      coxis: new THREE.MeshStandardMaterial({ color: 0x8B5CF6, metalness: 0.12, roughness: 0.16, side: THREE.DoubleSide }),
      piernas: new THREE.MeshStandardMaterial({ color: 0x0055BF, metalness: 0.12, roughness: 0.16, side: THREE.DoubleSide }),
      other: new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.12, roughness: 0.16, side: THREE.DoubleSide })
    };

    // Classic Spaceman Palette
    const classicLegoMaterials = {
      casco: new THREE.MeshStandardMaterial({ color: 0x0055BF, metalness: 0.12, roughness: 0.16, side: THREE.DoubleSide }),
      cara: new THREE.MeshStandardMaterial({ color: 0xFFD000, metalness: 0.12, roughness: 0.16, side: THREE.DoubleSide }),
      airtank: new THREE.MeshStandardMaterial({ color: 0x0055BF, metalness: 0.12, roughness: 0.16, side: THREE.DoubleSide }),
      torso: new THREE.MeshStandardMaterial({ color: 0x0055BF, metalness: 0.12, roughness: 0.16, side: THREE.DoubleSide }),
      brazos: new THREE.MeshStandardMaterial({ color: 0x0055BF, metalness: 0.12, roughness: 0.16, side: THREE.DoubleSide }),
      manos: new THREE.MeshStandardMaterial({ color: 0xFFD000, metalness: 0.12, roughness: 0.16, side: THREE.DoubleSide }),
      coxis: new THREE.MeshStandardMaterial({ color: 0x0055BF, metalness: 0.12, roughness: 0.16, side: THREE.DoubleSide }),
      piernas: new THREE.MeshStandardMaterial({ color: 0x0055BF, metalness: 0.12, roughness: 0.16, side: THREE.DoubleSide }),
      other: new THREE.MeshStandardMaterial({ color: 0x0055BF, metalness: 0.12, roughness: 0.16, side: THREE.DoubleSide })
    };

    function getPartCategory(mesh) {
      let cur = mesh;
      while (cur && cur !== modelGroup && cur !== scene) {
        const name = (cur.name || '').toLowerCase();
        if (name.includes('casco')) return 'casco';
        if (name.includes('cara') || name.includes('head') || name.includes('cabeza')) return 'cara';
        if (name.includes('airtank') || name.includes('tank') || name.includes('mochila')) return 'airtank';
        if (name.includes('torso') || name.includes('chest') || name.includes('cuerpo')) return 'torso';
        if (name.includes('brazo') || name.includes('arm')) return 'brazos';
        if (name.includes('mano') || name.includes('hand')) return 'manos';
        if (name.includes('coxis') || name.includes('cadera') || name.includes('hip') || name.includes('waist')) return 'coxis';
        if (name.includes('pierna') || name.includes('leg')) return 'piernas';
        cur = cur.parent;
      }
      return 'other';
    }

    // 1. Scene Setup
    scene = new THREE.Scene();
    scene.background = null;

    const width = stageWrapper.clientWidth || 800;
    const height = stageWrapper.clientHeight || 560;

    camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 0, currentDistance);

    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);

    if (renderer.outputColorSpace) {
      renderer.outputColorSpace = THREE.SRGBColorSpace;
    } else if (renderer.outputEncoding) {
      renderer.outputEncoding = THREE.sRGBEncoding;
    }
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = config.stageId === 'stage-lego-figure' ? 0.3 : 1.15;

    // 2. Studio Lighting (Configured per stage)
    const lightsGroup = new THREE.Group();
    scene.add(lightsGroup);

    const ambientLight = new THREE.AmbientLight(0xffffff, config.stageId === 'stage-lego-figure' ? 1.1 : 0.45);
    lightsGroup.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, config.stageId === 'stage-lego-figure' ? 0.0 : 2.2);
    if (config.stageId === 'stage-lego-figure') {
      keyLight.position.set(-7, -2.5, 4);
    } else {
      keyLight.position.set(-4, 5, 4);
    }
    lightsGroup.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xcbd5e1, config.stageId === 'stage-lego-figure' ? 0.65 : 1.1);
    if (config.stageId === 'stage-lego-figure') {
      fillLight.position.set(10, -2, 3);
    } else {
      fillLight.position.set(4, -2, 3);
    }
    lightsGroup.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, config.stageId === 'stage-lego-figure' ? 3.9 : 1.8);
    rimLight.position.set(0, 4, -4);
    lightsGroup.add(rimLight);

    if (config.stageId !== 'stage-lego-figure') {
      const underLight = new THREE.DirectionalLight(0x334455, 0.4);
      underLight.position.set(0, -4, 0);
      lightsGroup.add(underLight);
    }

    // 3. Model Hierarchy
    modelGroup = new THREE.Group();
    scene.add(modelGroup);

    function applyMaterial() {
      modelGroup.traverse((child) => {
        if (child.isMesh) {
          if (currentMaterialType === 'multicolor') {
            const cat = getPartCategory(child);
            child.material = (customSavedMaterials && customSavedMaterials[cat]) || multicolorMaterials[cat] || multicolorMaterials.other;
          } else if (currentMaterialType === 'classicLego') {
            const cat = getPartCategory(child);
            child.material = classicLegoMaterials[cat] || classicLegoMaterials.other;
          } else if (materials[currentMaterialType]) {
            child.material = materials[currentMaterialType];
          }
          child.material.needsUpdate = true;
        }
      });
    }

    function base64ToArrayBuffer(base64) {
      const binaryString = window.atob(base64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes.buffer;
    }

    function loadModel() {
      if (loadingOverlay) {
        loadingOverlay.style.opacity = '1';
        loadingOverlay.style.display = 'block';
      }

      if (typeof THREE.GLTFLoader === 'undefined') {
        if (loadingOverlay) loadingOverlay.textContent = 'Error: GLTFLoader no disponible';
        return;
      }

      const loader = new THREE.GLTFLoader();

      function onLoaded(gltf) {
        const rawScene = gltf.scene;

        const box = new THREE.Box3().setFromObject(rawScene);
        const center = new THREE.Vector3();
        const size = new THREE.Vector3();
        box.getCenter(center);
        box.getSize(size);

        rawScene.position.x = -center.x;
        rawScene.position.y = -center.y;
        rawScene.position.z = -center.z;

        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        const targetScale = (2.2 / maxDim) * (config.scaleMultiplier || 1.0);
        modelGroup.scale.set(targetScale, targetScale, targetScale);

        modelGroup.add(rawScene);
        applyMaterial();

        if (loadingOverlay) {
          loadingOverlay.style.opacity = '0';
          setTimeout(() => {
            loadingOverlay.style.display = 'none';
          }, 350);
        }
      }

      function onError(err) {
        console.warn('Error loading GLB from:', resolvedUrl, err);
        if (config.altPath) {
          const altResolved = getPath(config.altPath);
          loader.load(altResolved, onLoaded, undefined, (err2) => {
            handleFinalError(err2);
          });
          return;
        }
        handleFinalError(err);
      }

      function handleFinalError(err) {
        if (config.base64Fallback && typeof window.MODEL_P10_GLB_BASE64 === 'string') {
          try {
            const buffer = base64ToArrayBuffer(window.MODEL_P10_GLB_BASE64);
            loader.parse(buffer, '', onLoaded, (e) => {
              if (loadingOverlay) loadingOverlay.textContent = 'Error al procesar modelo';
            });
            return;
          } catch (e) {
            console.error(e);
          }
        }
        if (loadingOverlay) loadingOverlay.textContent = 'No se pudo cargar el archivo 3D';
      }

      loader.load(resolvedUrl, onLoaded, undefined, onError);
    }

    loadModel();

    // 4. Pointer & Drag Interaction (Orbit controls)
    stageWrapper.addEventListener('pointerdown', (e) => {
      isDragging = true;
      autoRotate = false;
      const autoRotateBtn = stageWrapper.querySelector('.p10-btn-autorotate');
      if (autoRotateBtn) autoRotateBtn.classList.remove('active');

      prevPointer.x = e.clientX;
      prevPointer.y = e.clientY;
      stageWrapper.setPointerCapture(e.pointerId);
    });

    stageWrapper.addEventListener('pointermove', (e) => {
      if (!isDragging) return;

      const deltaX = e.clientX - prevPointer.x;
      const deltaY = e.clientY - prevPointer.y;

      prevPointer.x = e.clientX;
      prevPointer.y = e.clientY;

      targetRotation.y += deltaX * 0.0085;
      targetRotation.x += deltaY * 0.0085;

      // Clamp vertical rotation
      targetRotation.x = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, targetRotation.x));
    });

    function endDrag(e) {
      if (isDragging) {
        isDragging = false;
        try {
          stageWrapper.releasePointerCapture(e.pointerId);
        } catch (err) {}
      }
    }

    stageWrapper.addEventListener('pointerup', endDrag);
    stageWrapper.addEventListener('pointercancel', endDrag);

    // Zoom on wheel
    stageWrapper.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY * 0.0025;
      targetDistance = Math.max(1.6, Math.min(7.5, targetDistance + zoomFactor));
    }, { passive: false });

    // 5. Controls Hookup within this stage's toolbar
    const toolbar = stageWrapper.querySelector('.p10-hud-bottom');
    if (toolbar) {
      // Materials
      toolbar.querySelectorAll('.p10-mat-btn').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const mat = btn.getAttribute('data-mat');
          if (!mat) return;
          if (!materials[mat] && mat !== 'multicolor' && mat !== 'classicLego') return;

          currentMaterialType = mat;
          toolbar.querySelectorAll('.p10-mat-btn').forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');

          applyMaterial();
        });
      });

      // Reset
      const btnReset = toolbar.querySelector('.p10-btn-reset');
      if (btnReset) {
        btnReset.addEventListener('click', () => {
          targetRotation.x = config.initRotX || 0.35;
          targetRotation.y = config.initRotY || -0.55;
          targetDistance = config.defaultDistance || 3.6;
        });
      }

      // Top
      const btnTop = toolbar.querySelector('.p10-btn-top');
      if (btnTop) {
        btnTop.addEventListener('click', () => {
          targetRotation.x = Math.PI / 2 - 0.02;
          targetRotation.y = 0;
        });
      }

      // Front
      const btnFront = toolbar.querySelector('.p10-btn-front');
      if (btnFront) {
        btnFront.addEventListener('click', () => {
          targetRotation.x = 0;
          targetRotation.y = 0;
        });
      }

      // AutoRotate toggle
      const btnAutoRotate = toolbar.querySelector('.p10-btn-autorotate');
      if (btnAutoRotate) {
        btnAutoRotate.addEventListener('click', () => {
          autoRotate = !autoRotate;
          btnAutoRotate.classList.toggle('active', autoRotate);
        });
      }
    }

    // 5.1 Quick In-Place Live Tuner Wiring (if present in stage)
    const btnToggleTuner = stageWrapper.querySelector('#btn-toggle-tuner-figure');
    const tunerBox = stageWrapper.querySelector('#p10-figure-tuner');
    const btnCloseTuner = stageWrapper.querySelector('#btn-close-tuner');

    if (btnToggleTuner && tunerBox) {
      btnToggleTuner.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const isHidden = tunerBox.style.display === 'none';
        tunerBox.style.display = isHidden ? 'block' : 'none';
        btnToggleTuner.classList.toggle('active', isHidden);
      });

      if (btnCloseTuner) {
        btnCloseTuner.addEventListener('click', (e) => {
          e.preventDefault();
          tunerBox.style.display = 'none';
          btnToggleTuner.classList.remove('active');
        });
      }

      // Slider Key Light
      const sliderKey = tunerBox.querySelector('#slider-tuner-key');
      const valKey = tunerBox.querySelector('#val-tuner-key');
      if (sliderKey && keyLight) {
        sliderKey.addEventListener('input', (e) => {
          const val = parseFloat(e.target.value);
          keyLight.intensity = val;
          if (valKey) valKey.textContent = val.toFixed(2);
        });
      }

      // Slider Fill Light
      const sliderFill = tunerBox.querySelector('#slider-tuner-fill');
      const valFill = tunerBox.querySelector('#val-tuner-fill');
      if (sliderFill && fillLight) {
        sliderFill.addEventListener('input', (e) => {
          const val = parseFloat(e.target.value);
          fillLight.intensity = val;
          if (valFill) valFill.textContent = val.toFixed(2);
        });
      }

      // Slider Rim Light
      const sliderRim = tunerBox.querySelector('#slider-tuner-rim');
      const valRim = tunerBox.querySelector('#val-tuner-rim');
      if (sliderRim && rimLight) {
        sliderRim.addEventListener('input', (e) => {
          const val = parseFloat(e.target.value);
          rimLight.intensity = val;
          if (valRim) valRim.textContent = val.toFixed(2);
        });
      }

      // Slider Ambient Light
      const sliderAmbient = tunerBox.querySelector('#slider-tuner-ambient');
      const valAmbient = tunerBox.querySelector('#val-tuner-ambient');
      if (sliderAmbient && ambientLight) {
        sliderAmbient.addEventListener('input', (e) => {
          const val = parseFloat(e.target.value);
          ambientLight.intensity = val;
          if (valAmbient) valAmbient.textContent = val.toFixed(2);
        });
      }

      // Slider Exposure
      const sliderExposure = tunerBox.querySelector('#slider-tuner-exposure');
      const valExposure = tunerBox.querySelector('#val-tuner-exposure');
      if (sliderExposure && renderer) {
        sliderExposure.addEventListener('input', (e) => {
          const val = parseFloat(e.target.value);
          renderer.toneMappingExposure = val;
          if (valExposure) valExposure.textContent = val.toFixed(2);
        });
      }

      // Slider Roughness
      const sliderRoughness = tunerBox.querySelector('#slider-tuner-roughness');
      const valRoughness = tunerBox.querySelector('#val-tuner-roughness');
      if (sliderRoughness) {
        sliderRoughness.addEventListener('input', (e) => {
          const val = parseFloat(e.target.value);
          Object.values(multicolorMaterials).forEach((m) => {
            if (m.roughness !== undefined) m.roughness = val;
          });
          Object.values(classicLegoMaterials).forEach((m) => {
            if (m.roughness !== undefined) m.roughness = val;
          });
          if (valRoughness) valRoughness.textContent = val.toFixed(2);
          applyMaterial();
        });
      }

      // Reset Tuner
      const btnTunerReset = tunerBox.querySelector('#btn-tuner-reset');
      if (btnTunerReset) {
        btnTunerReset.addEventListener('click', () => {
          if (keyLight) { keyLight.intensity = 0.0; keyLight.position.set(-7, -2.5, 4); }
          if (fillLight) { fillLight.intensity = 0.65; fillLight.position.set(10, -2, 3); }
          if (rimLight) { rimLight.intensity = 3.9; rimLight.position.set(0, 4, -4); }
          if (ambientLight) ambientLight.intensity = 1.1;
          if (renderer) renderer.toneMappingExposure = 0.3;
          if (sliderKey) sliderKey.value = 0.0;
          if (sliderFill) sliderFill.value = 0.65;
          if (sliderRim) sliderRim.value = 3.9;
          if (sliderAmbient) sliderAmbient.value = 1.1;
          if (sliderExposure) sliderExposure.value = 0.3;
          if (sliderRoughness) sliderRoughness.value = 0.16;
          if (valKey) valKey.textContent = '0.00';
          if (valFill) valFill.textContent = '0.65';
          if (valRim) valRim.textContent = '3.90';
          if (valAmbient) valAmbient.textContent = '1.10';
          if (valExposure) valExposure.textContent = '0.30';
          if (valRoughness) valRoughness.textContent = '0.16';
          Object.values(multicolorMaterials).forEach((m) => { if (m.roughness !== undefined) { m.roughness = 0.16; m.metalness = 0.12; } });
          applyMaterial();
        });
      }

      // Save Tuner
      const btnTunerSave = tunerBox.querySelector('#btn-tuner-save');
      if (btnTunerSave) {
        btnTunerSave.addEventListener('click', () => {
          try {
            const configToSave = {
              lights: {
                key: { color: '#ffffff', intensity: keyLight ? keyLight.intensity : 0.0, x: -7, y: -2.5, z: 4 },
                fill: { color: '#cbd5e1', intensity: fillLight ? fillLight.intensity : 0.65, x: 10, y: -2, z: 3 },
                rim: { color: '#ffffff', intensity: rimLight ? rimLight.intensity : 3.9, x: 0, y: 4, z: -4 },
                ambient: { color: '#ffffff', intensity: ambientLight ? ambientLight.intensity : 1.1 },
                exposure: renderer ? renderer.toneMappingExposure : 0.3
              },
              material: {
                roughness: sliderRoughness ? parseFloat(sliderRoughness.value) : 0.16,
                metalness: 0.12
              }
            };
            localStorage.setItem('lego_studio_config_v1', JSON.stringify(configToSave));
            btnTunerSave.textContent = '¡Guardado!';
            setTimeout(() => { btnTunerSave.textContent = 'Guardar'; }, 1800);
          } catch (err) {}
        });
      }
    }

    // 6. Responsive Resize
    function handleResize() {
      if (!stageWrapper || !renderer || !camera) return;
      const w = stageWrapper.clientWidth;
      const h = stageWrapper.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    }

    window.addEventListener('resize', handleResize);

    // 7. Animation Loop
    let isVisible = true;
    document.addEventListener('visibilitychange', () => {
      isVisible = !document.hidden;
    });

    function animate() {
      requestAnimationFrame(animate);
      if (!isVisible) return;

      if (autoRotate && !isDragging) {
        targetRotation.y += autoRotateSpeed;
      }

      currentRotation.x += (targetRotation.x - currentRotation.x) * 0.085;
      currentRotation.y += (targetRotation.y - currentRotation.y) * 0.085;
      currentDistance += (targetDistance - currentDistance) * 0.085;

      camera.position.z = currentDistance;
      modelGroup.rotation.x = currentRotation.x;
      modelGroup.rotation.y = currentRotation.y;

      renderer.render(scene, camera);
    }

    animate();
  }

  function initAllViewers() {
    // 1. Viewer for the CAD Brick / Assembly piece
    create3DStage({
      stageId: 'stage-lego-brick',
      canvasId: 'canvas-lego-brick',
      loadingId: 'loading-lego-brick',
      modelPath: 'assets/proyecto10/modelosrhinoctm/untitled.glb',
      base64Fallback: true,
      defaultDistance: 3.6,
      scaleMultiplier: 1.0,
      initRotX: 0.35,
      initRotY: -0.55
    });

    // 2. Viewer for the Lego Minifigure (monitolego2.glb)
    create3DStage({
      stageId: 'stage-lego-figure',
      canvasId: 'canvas-lego-figure',
      loadingId: 'loading-lego-figure',
      modelPath: 'assets/models/monitolego2.glb',
      altPath: 'assets/modelos 3d/monitolego2.glb',
      base64Fallback: false,
      defaultDistance: 3.8,
      defaultMaterial: 'multicolor',
      scaleMultiplier: 1.05,
      initRotX: 0.20,
      initRotY: -0.35
    });

    // 3. Viewer for the Industrial Bottle CAD (botellade.glb)
    create3DStage({
      stageId: 'stage-bottle',
      canvasId: 'canvas-bottle',
      loadingId: 'loading-bottle',
      modelPath: 'assets/models/botellade.glb',
      altPath: 'assets/modelos 3d/botellade.glb',
      base64Fallback: false,
      defaultDistance: 3.4,
      defaultMaterial: 'emerald',
      scaleMultiplier: 1.15,
      initRotX: 0.15,
      initRotY: -0.45
    });

    // 4. Viewer for the Industrial Wave Machine CAD (ola.glb)
    create3DStage({
      stageId: 'stage-wave',
      canvasId: 'canvas-wave',
      loadingId: 'loading-wave',
      modelPath: 'assets/models/ola.glb',
      altPath: 'assets/modelos 3d/ola.glb',
      base64Fallback: false,
      defaultDistance: 3.5,
      defaultMaterial: 'graphite',
      scaleMultiplier: 1.15,
      initRotX: 0.25,
      initRotY: -0.60
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAllViewers);
  } else {
    initAllViewers();
  }
})();
