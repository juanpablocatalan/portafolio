/**
 * ==========================================================================
 * DIALEKTOGRAFÍA REALISTIC 3D FLIPBOOK ENGINE (PROJECT 02)
 * Dimensions: Single Page 29.41 x 21 cm | Open Spread 58.82 x 21 cm
 * Aspect Ratio: 1.400476 (Landscape / Apaisado) | Spread Ratio: 2.800952
 * Total Pages: 84 Pages (Sin título-2-01.jpg to Sin título-2-84.jpg)
 * Powered by StPageFlip + Web Audio API.
 * ==========================================================================
 */

(function () {
  'use strict';

  class DialektografiaMagazine {
    constructor(containerId) {
      this.container = document.getElementById(containerId);
      if (!this.container) return;

      this.bookElement = document.getElementById('heyzine-book') || this.container.querySelector('.heyzine-flipbook') || this.container.querySelector('.magazine-book');
      if (!this.bookElement) return;

      this.totalPages = 84;
      this.currentPage = 0;
      this.soundEnabled = false;
      this.audioCtx = null;
      this.pageFlip = null;

      // Determine asset paths based on folder depth
      const isSubdir = window.location.pathname.includes('/projects/');
      this.baseAssetPath = isSubdir ? '../assets/proyecto2/mockup/' : 'assets/proyecto2/mockup/';

      // UI Controls
      this.prevBtn = document.getElementById('mag-btn-prev');
      this.nextBtn = document.getElementById('mag-btn-next');
      this.indicator = document.getElementById('mag-page-indicator-text');
      this.scrubber = document.getElementById('mag-scrubber');
      this.scrubberFill = document.getElementById('mag-scrubber-fill');
      this.thumbToggleBtn = document.getElementById('mag-btn-thumbs');
      this.thumbDrawer = document.getElementById('mag-thumbnail-drawer');
      this.thumbCloseBtn = document.getElementById('mag-drawer-close');
      this.thumbGrid = document.getElementById('mag-thumb-grid');
      this.fullscreenBtn = document.getElementById('mag-btn-fullscreen');
      this.soundBtn = document.getElementById('mag-btn-sound');
      this.zoomBtn = document.getElementById('mag-btn-zoom');
      this.zoomModal = document.getElementById('mag-zoom-modal');
      this.zoomCloseBtn = document.getElementById('mag-zoom-close');
      this.zoomImg = document.getElementById('mag-zoom-img');

      this.init();
    }

    init() {
      this.initPageFlip();
      this.initEventListeners();
      this.initThumbnails();
      this.initHintTimer();
    }

    /* --------------------------------------------------------------------------
       Initialize StPageFlip Canvas Engine with Landscape Proportions (29.41 x 21 cm)
       -------------------------------------------------------------------------- */
    initPageFlip() {
      if (typeof St === 'undefined' || !St.PageFlip) {
        console.warn('St.PageFlip not loaded yet.');
        return;
      }

      // Exact aspect ratio: 29.41 / 21 = 1.40047619 (Spread: 58.82 / 21 = 2.800952)
      const pageRatio = 29.41 / 21;
      const viewportElem = this.container.querySelector('.magazine-viewport-landscape') || this.container;
      const containerWidth = viewportElem.offsetWidth || this.container.offsetWidth || window.innerWidth;
      const baseWidth = Math.max(320, Math.floor(containerWidth / 2));
      const baseHeight = Math.round(baseWidth / pageRatio);

      this.pageFlip = new St.PageFlip(this.bookElement, {
        width: baseWidth,
        height: baseHeight,
        size: 'stretch',
        minWidth: 260,
        maxWidth: 2400,
        minHeight: 185,
        maxHeight: 1600,
        maxShadowOpacity: 0.65,
        showCover: true,
        showPageCorners: true,
        usePortrait: true,
        drawShadow: true,
        flippingTime: 650,
        useMouseEvents: true,
        mobileScrollSupport: true,
        swipeDistance: 25,
        clickEventForward: true
      });

      this.bookElement.classList.add('is-cover');

      // Prepare 84 pages image list (Sin título-2-01.jpg .. Sin título-2-84.jpg)
      const customImgs = this.container.querySelectorAll('.mag-custom-page');
      let imageList = [];

      if (customImgs && customImgs.length > 0) {
        customImgs.forEach(img => {
          imageList.push(img.getAttribute('src') || img.getAttribute('data-src'));
        });
        this.totalPages = imageList.length;
      } else {
        for (let i = 1; i <= 84; i++) {
          let fileIndex = i;
          if (i === 2) fileIndex = 3;
          else if (i === 3) fileIndex = 2;
          const numStr = String(fileIndex).padStart(2, '0');
          imageList.push(`${this.baseAssetPath}Sin ti\u0301tulo-2-${numStr}.jpg`);
        }
        this.totalPages = imageList.length;
      }

      this.imageList = imageList;

      // Load into Canvas
      this.pageFlip.loadFromImages(imageList);

      // Event: Flip completed
      this.pageFlip.on('flip', (e) => {
        this.currentPage = e.data;
        this.updateControls();
        this.updateThumbnailsActiveState();
      });

      // Event: Init completed
      this.pageFlip.on('init', (e) => {
        this.currentPage = e.data.page || 0;
        this.updateControls();
      });

      // Event: Orientation changed (Portrait / Landscape)
      this.pageFlip.on('changeOrientation', () => {
        this.updateControls();
      });
    }

    /* --------------------------------------------------------------------------
       Update UI Controls & Page Indicator
       -------------------------------------------------------------------------- */
    updateControls() {
      if (!this.pageFlip) return;

      const page = this.currentPage;
      const total = this.totalPages;
      const orientation = this.pageFlip.getOrientation ? this.pageFlip.getOrientation() : 'landscape';

      // Button states
      if (this.prevBtn) this.prevBtn.disabled = page <= 0;
      if (this.nextBtn) this.nextBtn.disabled = page >= total - 1;

      // Helper for page label in dynamic layout
      const getPageLabel = (idx) => {
        const pNum = idx + 1;
        const numStr = String(pNum).padStart(2, '0');
        if (idx === 0) return 'PORTADA';
        if (idx === 1) return 'PÁG. 02';
        if (idx === total - 2) return `PÁG. ${String(total - 1).padStart(2, '0')}`;
        if (idx === total - 1) return 'CONTRAPORTADA';
        return `PÁG. ${numStr}`;
      };

      // Indicator Text
      if (this.indicator) {
        const totalStr = String(total).padStart(2, '0');
        if (page === 0) {
          this.indicator.innerHTML = `<span class="mag-current-page-num">PORTADA &bull; 01</span> / ${totalStr}`;
        } else if (page === total - 1) {
          this.indicator.innerHTML = `<span class="mag-current-page-num">CONTRAPORTADA &bull; ${totalStr}</span> / ${totalStr}`;
        } else if (orientation === 'portrait') {
          const lbl = getPageLabel(page);
          this.indicator.innerHTML = `<span class="mag-current-page-num">${lbl}</span> / ${totalStr}`;
        } else {
          // Double spread in landscape
          const leftIdx = page % 2 === 1 ? page : page - 1;
          const rightIdx = Math.min(total - 1, leftIdx + 1);
          const leftLbl = getPageLabel(leftIdx);
          const rightLbl = getPageLabel(rightIdx);
          this.indicator.innerHTML = `<span class="mag-current-page-num">${leftLbl} &mdash; ${rightLbl}</span> / ${totalStr}`;
        }
      }

      // Auto-center single cover and single backcover
      if (this.bookElement) {
        if (orientation === 'landscape') {
          if (page === 0) {
            this.bookElement.classList.add('is-cover');
            this.bookElement.classList.remove('is-backcover');
          } else if (page === total - 1) {
            this.bookElement.classList.add('is-backcover');
            this.bookElement.classList.remove('is-cover');
          } else {
            this.bookElement.classList.remove('is-cover', 'is-backcover');
          }
        } else {
          this.bookElement.classList.remove('is-cover', 'is-backcover');
        }
      }

      // Closed Cover Navigation Hint
      const hint = document.getElementById('mag-interaction-hint');
      if (hint) {
        clearTimeout(this.hintTimer);
        if (page === 0) {
          hint.style.opacity = '0';
          hint.style.transform = 'translateY(-50%) translateY(8px)';
          this.hintTimer = setTimeout(() => {
            if (this.currentPage === 0) {
              hint.style.opacity = '1';
              hint.style.transform = 'translateY(-50%) translateY(0)';
            }
          }, 3500);
        } else {
          hint.style.opacity = '0';
          hint.style.transform = 'translateY(-50%) translateY(8px)';
        }
      }
    }

    /* --------------------------------------------------------------------------
       Initial Cover Hint Timer
       -------------------------------------------------------------------------- */
    initHintTimer() {
      const hint = document.getElementById('mag-interaction-hint');
      if (!hint) return;

      this.hintTimer = setTimeout(() => {
        if (this.currentPage === 0) {
          hint.style.opacity = '1';
          hint.style.transform = 'translateY(-50%) translateY(0)';
        }
      }, 3500);
    }

    /* --------------------------------------------------------------------------
       Navigation Actions
       -------------------------------------------------------------------------- */
    next() {
      if (!this.pageFlip) return;
      this.pageFlip.flipNext();
    }

    prev() {
      if (!this.pageFlip) return;
      this.pageFlip.flipPrev();
    }

    jumpTo(pageIndex) {
      if (!this.pageFlip) return;
      const target = Math.max(0, Math.min(this.totalPages - 1, pageIndex));
      if (target === this.currentPage) return;
      this.pageFlip.flip(target);
    }

    /* --------------------------------------------------------------------------
       Web Audio API Procedural Paper Turn Synthesis
       -------------------------------------------------------------------------- */
    playFlipSound() {
      if (!this.soundEnabled) return;
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        if (!this.audioCtx) this.audioCtx = new AudioContext();
        if (this.audioCtx.state === 'suspended') this.audioCtx.resume();

        const bufferSize = this.audioCtx.sampleRate * 0.22;
        const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.audioCtx.sampleRate * 0.045));
        }

        const noise = this.audioCtx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.audioCtx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(950, this.audioCtx.currentTime);
        filter.Q.setValueAtTime(2.2, this.audioCtx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(320, this.audioCtx.currentTime + 0.2);

        const gainNode = this.audioCtx.createGain();
        gainNode.gain.setValueAtTime(0.35, this.audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.2);

        noise.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.audioCtx.destination);

        noise.start();
      } catch (err) {
        // Fallback silently if audio context is blocked
      }
    }

    toggleSound() {
      this.soundEnabled = !this.soundEnabled;
      if (this.soundBtn) {
        this.soundBtn.classList.toggle('muted', !this.soundEnabled);
        this.soundBtn.setAttribute('aria-label', this.soundEnabled ? 'Silenciar sonido' : 'Activar sonido');
        this.soundBtn.title = this.soundEnabled ? 'Silenciar sonido de páginas' : 'Activar sonido de páginas';
        this.soundBtn.innerHTML = this.soundEnabled ? '🔊' : '🔇';
      }
    }

    /* --------------------------------------------------------------------------
       Thumbnails Drawer Engine
       -------------------------------------------------------------------------- */
    initThumbnails() {
      if (!this.thumbGrid || !this.imageList) return;
      this.thumbGrid.innerHTML = '';

      // Cover (Page 01)
      this.createThumbItem(0, this.imageList[0], 'Portada • 01');

      // Spreads (Pages 02-03, 04-05, etc.)
      for (let i = 1; i < this.totalPages - 1; i += 2) {
        const leftPage = i;
        const rightPage = Math.min(this.totalPages - 2, i + 1);
        const label = `Pág. ${String(leftPage + 1).padStart(2, '0')}-${String(rightPage + 1).padStart(2, '0')}`;
        const imgSrc = this.imageList[leftPage];
        this.createThumbItem(leftPage, imgSrc, label);
      }

      // Backcover (Last Page)
      if (this.totalPages > 1) {
        this.createThumbItem(this.totalPages - 1, this.imageList[this.totalPages - 1], `Contraportada • ${String(this.totalPages).padStart(2, '0')}`);
      }

      this.updateThumbnailsActiveState();
    }

    createThumbItem(pageIndex, imgSrc, labelText) {
      const thumb = document.createElement('div');
      thumb.className = `mag-thumb-item ${pageIndex === this.currentPage ? 'active' : ''}`;
      thumb.setAttribute('data-page', pageIndex);
      thumb.setAttribute('role', 'button');
      thumb.setAttribute('aria-label', `Ir a ${labelText}`);

      thumb.innerHTML = `
        <img src="${imgSrc}" alt="${labelText}" loading="lazy">
        <span class="mag-thumb-label">${labelText}</span>
      `;

      thumb.addEventListener('click', () => {
        this.jumpTo(pageIndex);
        this.closeThumbnailDrawer();
      });

      this.thumbGrid.appendChild(thumb);
    }

    updateThumbnailsActiveState() {
      if (!this.thumbGrid) return;
      const thumbs = this.thumbGrid.querySelectorAll('.mag-thumb-item');
      thumbs.forEach((thumb) => {
        const p = parseInt(thumb.getAttribute('data-page'), 10);
        if (p === this.currentPage || (this.currentPage > 0 && p === this.currentPage - 1)) {
          thumb.classList.add('active');
        } else {
          thumb.classList.remove('active');
        }
      });
    }

    toggleThumbnailDrawer() {
      if (!this.thumbDrawer) return;
      this.thumbDrawer.classList.toggle('open');
    }

    closeThumbnailDrawer() {
      if (this.thumbDrawer) {
        this.thumbDrawer.classList.remove('open');
      }
    }

    /* --------------------------------------------------------------------------
       Fullscreen Experience
       -------------------------------------------------------------------------- */
    toggleFullscreen() {
      const elem = this.container;
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        if (elem.requestFullscreen) {
          elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) {
          elem.webkitRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        }
      }
    }

    /* --------------------------------------------------------------------------
       Zoom / High-Res Inspection Modal
       -------------------------------------------------------------------------- */
    openZoom() {
      if (!this.zoomModal) return;
      const zoomSrc = (this.imageList && this.imageList[this.currentPage])
        ? this.imageList[this.currentPage]
        : (this.imageList ? this.imageList[0] : `${this.baseAssetPath}Sin ti\u0301tulo-2-01.jpg`);

      if (this.zoomImg) {
        this.zoomImg.src = zoomSrc;
      }
      this.zoomModal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }

    closeZoom() {
      if (this.zoomModal) {
        this.zoomModal.classList.remove('active');
        document.body.style.overflow = '';
      }
    }

    /* --------------------------------------------------------------------------
       Event Listeners (Keyboard, Scrubber, Drawer, Fullscreen)
       -------------------------------------------------------------------------- */
    initEventListeners() {
      if (this.prevBtn) this.prevBtn.addEventListener('click', () => this.prev());
      if (this.nextBtn) this.nextBtn.addEventListener('click', () => this.next());

      if (this.scrubber) {
        this.scrubber.addEventListener('click', (e) => {
          const rect = this.scrubber.getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          const ratio = Math.max(0, Math.min(1, clickX / rect.width));
          const targetPage = Math.round(ratio * (this.totalPages - 1));
          this.jumpTo(targetPage);
        });
      }

      if (this.thumbToggleBtn) {
        this.thumbToggleBtn.addEventListener('click', () => this.toggleThumbnailDrawer());
      }
      if (this.thumbCloseBtn) {
        this.thumbCloseBtn.addEventListener('click', () => this.closeThumbnailDrawer());
      }

      if (this.fullscreenBtn) {
        this.fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
      }

      if (this.soundBtn) {
        this.soundBtn.addEventListener('click', () => this.toggleSound());
      }

      if (this.zoomBtn) {
        this.zoomBtn.addEventListener('click', () => this.openZoom());
      }
      if (this.zoomCloseBtn) {
        this.zoomCloseBtn.addEventListener('click', () => this.closeZoom());
      }
      if (this.zoomModal) {
        this.zoomModal.addEventListener('click', (e) => {
          if (e.target === this.zoomModal) this.closeZoom();
        });
      }

      // Keyboard navigation
      window.addEventListener('keydown', (e) => {
        if (this.zoomModal && this.zoomModal.classList.contains('active')) {
          if (e.key === 'Escape') this.closeZoom();
          return;
        }

        if (e.key === 'ArrowRight' || e.key === 'PageDown') {
          this.next();
        } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
          this.prev();
        } else if (e.key === 'Escape') {
          this.closeThumbnailDrawer();
        } else if (e.key === 'f' || e.key === 'F') {
          if (!['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
            this.toggleFullscreen();
          }
        }
      });
    }
  }

  // Auto-initialize on DOMContentLoaded
  document.addEventListener('DOMContentLoaded', () => {
    window.dialektografiaMagazine = new DialektografiaMagazine('dialektografia-magazine-container');
  });

})();
