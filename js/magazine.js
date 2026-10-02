/**
 * ==========================================================================
 * FRONTEO HEYZINE-STYLE REALISTIC 3D FLIPBOOK ENGINE
 * Real-time Corner Grab, Drag-to-Flip Physics, Single Cover & Back Cover,
 * Spine Shadow Lighting, Procedural Audio & Controls.
 * Powered by StPageFlip + Web Audio API.
 * ==========================================================================
 */

(function () {
  'use strict';

  class HeyzineMagazine {
    constructor(containerId) {
      this.container = document.getElementById(containerId);
      if (!this.container) return;

      this.bookElement = document.getElementById('heyzine-book') || this.container.querySelector('.heyzine-flipbook') || this.container.querySelector('.magazine-book');
      if (!this.bookElement) return;

      this.totalPages = 106;
      this.currentPage = 0;
      this.soundEnabled = true;
      this.audioCtx = null;
      this.pageFlip = null;

      // Determine asset paths based on folder depth
      const isSubdir = window.location.pathname.includes('/projects/');
      this.baseAssetPath = isSubdir ? '../assets/alta/' : 'assets/alta/';
      this.sampleAssetPath = isSubdir ? '../assets/projects/' : 'assets/projects/';

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
       Initialize StPageFlip Canvas Engine (Heyzine Real-time Physics)
       -------------------------------------------------------------------------- */
    initPageFlip() {
      if (typeof St === 'undefined' || !St.PageFlip) {
        console.warn('St.PageFlip not loaded yet.');
        return;
      }

      // Calculate base responsive sizing (aspect ratio 1365x1800 => ~0.758)
      const containerWidth = this.container.offsetWidth || 1100;
      const baseWidth = Math.min(620, Math.max(340, Math.floor(containerWidth / 2) - 20));
      const baseHeight = Math.round(baseWidth / 0.758);

      this.pageFlip = new St.PageFlip(this.bookElement, {
        width: baseWidth,
        height: baseHeight,
        size: 'stretch',
        minWidth: 300,
        maxWidth: 900,
        minHeight: 400,
        maxHeight: 1200,
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

      // Prepare 106 pages image list:
      // 0: Portada
      // 1: Reverso Portada
      // 2..11: Página 3 .. Página 12
      // 12, 13: Página 12a, Página 12b
      // 14..81: Página 13 .. Página 80
      // 82, 83: Página 80a, Página 80b
      // 84..103: Página 81 .. Página 100
      // 104: Reverso Contraportada
      // 105: Contraportada
      const customImgs = this.container.querySelectorAll('.mag-custom-page');
      let imageList = [];

      if (customImgs && customImgs.length > 0) {
        customImgs.forEach(img => {
          imageList.push(img.getAttribute('src') || img.getAttribute('data-src'));
        });
        this.totalPages = imageList.length;
      } else {
        // Page 0: Portada
        imageList.push(`${this.baseAssetPath}01portada.jpg`);

        // Page 1: Reverso Portada
        imageList.push(`${this.baseAssetPath}02portada.jpg`);

        // Pages 2 through 11: Página 3 .. Página 12
        for (let i = 3; i <= 12; i++) {
          imageList.push(`${this.baseAssetPath}pagina${i}.jpg`);
        }

        // Foldout 12a & 12b
        imageList.push(`${this.baseAssetPath}pagina12a.jpg`);
        imageList.push(`${this.baseAssetPath}pagina12b.jpg`);

        // Pages 14 through 81: Página 13 .. Página 80
        for (let i = 13; i <= 80; i++) {
          imageList.push(`${this.baseAssetPath}pagina${i}.jpg`);
        }

        // Foldout 80a & 80b
        imageList.push(`${this.baseAssetPath}pagina80a.jpg`);
        imageList.push(`${this.baseAssetPath}pagina80b.jpg`);

        // Pages 84 through 103: Página 81 .. Página 100
        for (let i = 81; i <= 100; i++) {
          imageList.push(`${this.baseAssetPath}pagina${i}.jpg`);
        }

        // Page 104: Reverso Contraportada
        imageList.push(`${this.baseAssetPath}zcontraportada01.jpg`);

        // Page 105: Contraportada
        imageList.push(`${this.baseAssetPath}zcontraportada02.jpg`);

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
        if (page === 0) {
          this.indicator.innerHTML = `<span class="mag-current-page-num">PORTADA &bull; 01</span> / ${total}`;
        } else if (page === total - 1) {
          this.indicator.innerHTML = `<span class="mag-current-page-num">CONTRAPORTADA &bull; ${total}</span> / ${total}`;
        } else if (orientation === 'portrait') {
          const lbl = getPageLabel(page);
          this.indicator.innerHTML = `<span class="mag-current-page-num">${lbl}</span> / ${total}`;
        } else {
          // Double spread in landscape
          const leftIdx = page % 2 === 1 ? page : page - 1;
          const rightIdx = Math.min(total - 1, leftIdx + 1);
          const leftLbl = getPageLabel(leftIdx);
          const rightLbl = getPageLabel(rightIdx);
          this.indicator.innerHTML = `<span class="mag-current-page-num">${leftLbl} &mdash; ${rightLbl}</span> / ${total}`;
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

      // 1. Closed Cover Navigation Hint (Original Position: left clamp(4rem, 14vw, 20rem))
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

      // 2. Distinct Element: Special Page Tag (Equidistant Centered between Page Edge and Magazine)
      const specialTag = document.getElementById('mag-special-page-tag');
      if (specialTag) {
        const specialData = this.getSpecialPageData(page);
        if (specialData) {
          const titleEl = specialTag.querySelector('.mag-special-title');
          const descEl = specialTag.querySelector('.mag-special-desc');
          if (titleEl && specialData.title) titleEl.innerHTML = specialData.title;
          if (descEl && specialData.desc) descEl.textContent = specialData.desc;

          this.updateSpecialTagPosition();
          specialTag.classList.add('active');
        } else {
          specialTag.classList.remove('active');
        }
      }

      // Scrubber Fill
      if (this.scrubberFill) {
        const progress = (page / (total - 1)) * 100;
        this.scrubberFill.style.width = `${progress}%`;
      }
    }

    /* --------------------------------------------------------------------------
       Get special page metadata (Title, Description & Detail Image) by page index
       -------------------------------------------------------------------------- */
    getSpecialPageData(page) {
      const isSubdir = window.location.pathname.includes('/projects/');
      const cajaqlPath = isSubdir ? '../assets/cajaql/' : 'assets/cajaql/';

      // Pág. 2-3 (índices 1 y 2) -> IMG_0476.jpg
      if (page >= 1 && page <= 2) {
        return {
          title: '<span class="part-pagina">página</span><span class="part-especial">*especial</span>',
          desc: 'Esta página, a diferencia de la mayoría de la revista, fue generada con una impresión de negro sobre cartulina negra.',
          img: `${cajaqlPath}IMG_0476.jpg`
        };
      }
      // Pág. 4-5 (índices 3 y 4) -> IMG_0473.jpg
      if (page >= 3 && page <= 4) {
        return {
          title: '<span class="part-pagina">página</span><span class="part-especial">*especial</span>',
          desc: 'Esta página, a diferencia de la mayoría de la revista, fue generada con una impresión de negro sobre cartulina negra.',
          img: `${cajaqlPath}IMG_0473.jpg`
        };
      }
      // Pág. 6-7 (índices 5 y 6)
      if (page >= 5 && page <= 6) {
        return {
          title: '<span class="part-pagina">página</span><span class="part-especial">*especial</span>',
          desc: 'Esta página, a diferencia de la mayoría de la revista, fue generada con una impresión de negro sobre cartulina negra.',
          img: `${cajaqlPath}IMG_0473.jpg`
        };
      }
      // Pág. 12-13 (índices 11 al 14) -> IMG_0480.jpg
      if (page >= 11 && page <= 14) {
        return {
          title: '<span class="part-pagina">página</span><span class="part-especial">*especial</span>',
          desc: 'Se incorporó una página en papel vegetal para generar un juego de transparencias que anticipa el diseño de la hoja siguiente. Asimismo, los agradecimientos se ubicaron deliberadamente en el reverso, manteniéndolos en un segundo plano para no restar protagonismo a la narrativa visual de la revista.',
          img: `${cajaqlPath}IMG_0480.jpg`
        };
      }
      // Pág. 82-83 (índices 81 al 84) -> IMG_0515.jpg
      if (page >= 81 && page <= 84) {
        return {
          title: '<span class="part-pagina">página</span><span class="part-especial">*especial</span>',
          desc: 'Se incorporó una página en papel vegetal para generar un juego de transparencias que anticipa el diseño de la hoja siguiente, una elección con un propósito netamente estético.',
          img: `${cajaqlPath}IMG_0515.jpg`
        };
      }
      // Pág. 100-101, 102-103, 104-105 (índices 99 al 104)
      if (page >= 99 && page <= 104) {
        return {
          title: '<span class="part-pagina">página</span><span class="part-especial">*especial</span>',
          desc: 'Mantiene el mismo diseño e impresión que las páginas 3 a 6, pero resuelto sobre papel brillante plateado.'
        };
      }
      return null;
    }

    /* --------------------------------------------------------------------------
       Check if page index corresponds to a special page / spread
       -------------------------------------------------------------------------- */
    isSpecialPage(page) {
      return this.getSpecialPageData(page) !== null;
    }

    /* --------------------------------------------------------------------------
       Update Special Page Tag Centering (Equidistant between Left Margin and Magazine)
       -------------------------------------------------------------------------- */
    updateSpecialTagPosition() {
      const specialTag = document.getElementById('mag-special-page-tag');
      const viewport = this.container ? this.container.querySelector('.magazine-viewport') : null;
      if (!specialTag || !viewport || !this.container) return;

      const containerRect = this.container.getBoundingClientRect();
      const viewportRect = viewport.getBoundingClientRect();

      // Exact midpoint between container left edge (screen margin) and magazine left edge
      const leftSpace = Math.max(0, viewportRect.left - containerRect.left);
      const centerX = leftSpace / 2;

      specialTag.style.left = `${centerX}px`;
      const targetMaxWidth = Math.min(280, Math.max(180, leftSpace - 36));
      specialTag.style.maxWidth = `${targetMaxWidth}px`;
    }

    /* --------------------------------------------------------------------------
       3.5-Second Arrival & Closure Delay for Interaction Hint
       -------------------------------------------------------------------------- */
    initHintTimer() {
      const hint = document.getElementById('mag-interaction-hint');
      const specialTag = document.getElementById('mag-special-page-tag');
      if (!this.container) return;

      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Closed cover arrival (page 0)
            if (this.currentPage === 0 && hint) {
              clearTimeout(this.hintTimer);
              this.hintTimer = setTimeout(() => {
                if (this.currentPage === 0) {
                  hint.style.opacity = '1';
                  hint.style.transform = 'translateY(-50%) translateY(0)';
                }
              }, 3500); // 3.5 seconds delay
            } else if (this.isSpecialPage(this.currentPage) && specialTag) {
              const specialData = this.getSpecialPageData(this.currentPage);
              if (specialData) {
                const titleEl = specialTag.querySelector('.mag-special-title');
                const descEl = specialTag.querySelector('.mag-special-desc');
                if (titleEl && specialData.title) titleEl.innerHTML = specialData.title;
                if (descEl && specialData.desc) descEl.textContent = specialData.desc;
              }
              this.updateSpecialTagPosition();
              specialTag.classList.add('active');
            }
          } else {
            // User scrolled away
            clearTimeout(this.hintTimer);
            if (this.currentPage === 0 && hint) {
              hint.style.opacity = '0';
              hint.style.transform = 'translateY(-50%) translateY(8px)';
            }
          }
        });
      }, {
        threshold: 0.25
      });

      observer.observe(this.container);
      window.addEventListener('resize', () => {
        if (this.isSpecialPage(this.currentPage)) {
          this.updateSpecialTagPosition();
        }
      });
    }

    /* --------------------------------------------------------------------------
       Navigation Methods
       -------------------------------------------------------------------------- */
    next() {
      if (!this.pageFlip) return;
      this.pageFlip.flipNext('bottom');
    }

    prev() {
      if (!this.pageFlip) return;
      this.pageFlip.flipPrev('bottom');
    }

    jumpTo(pageIndex) {
      if (!this.pageFlip) return;
      const target = Math.max(0, Math.min(this.totalPages - 1, pageIndex));
      this.pageFlip.flip(target, 'bottom');
    }

    playFlipSound() {
      // Sound disabled
    }

    toggleSound() {
      // Sound disabled
    }

    /* --------------------------------------------------------------------------
       Thumbnails Drawer System (54 Items for 106 Pages)
       -------------------------------------------------------------------------- */
    initThumbnails() {
      if (!this.thumbGrid || !this.imageList || this.imageList.length === 0) return;

      this.thumbGrid.innerHTML = '';
      const total = this.imageList.length;
      
      // Spread 0: Portada (Page 0 / 01)
      this.createThumbItem(0, 'PORTADA (01)', this.imageList[0]);

      // Double spreads
      for (let idx = 1; idx < total - 1; idx += 2) {
        const leftPage = idx + 1;
        const rightPage = idx + 2;
        const p1Str = String(leftPage).padStart(2, '0');
        const p2Str = String(rightPage).padStart(2, '0');
        
        let label = `${p1Str} — ${p2Str}`;
        if (idx === 1) {
          label = `PÁG. 02 — ${p2Str}`;
        } else if (idx === total - 3) {
          label = `${p1Str} — PÁG. ${p2Str}`;
        }

        const thumbSrc = this.imageList[idx];
        this.createThumbItem(idx, label, thumbSrc);
      }

      // Final Spread: Contraportada
      this.createThumbItem(total - 1, `CONTRAPORTADA (${String(total).padStart(2, '0')})`, this.imageList[total - 1]);
    }

    createThumbItem(pageIndex, labelText, imgSrc) {
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
    openZoom(customSrc) {
      if (!this.zoomModal) return;
      const zoomSrc = customSrc || (this.imageList && this.imageList[this.currentPage]
        ? this.imageList[this.currentPage]
        : (this.imageList ? this.imageList[0] : `${this.baseAssetPath}01portada.jpg`));

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

      const specialMoreBtn = document.getElementById('mag-special-more-btn');
      if (specialMoreBtn) {
        specialMoreBtn.addEventListener('click', () => {
          const specialData = this.getSpecialPageData(this.currentPage);
          if (specialData && specialData.img) {
            this.openZoom(specialData.img);
          } else {
            this.openZoom();
          }
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
    window.fronteoMagazine = new HeyzineMagazine('fronteo-magazine-container');
  });

})();
