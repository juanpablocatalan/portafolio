/**
 * JUAN PABLO — PORTFOLIO INTERACTIONS
 * Single-screen interactive index + project switcher
 */

// Desactivar la restauración automática de scroll del navegador para que al recargar la página siempre inicie arriba (top: 0)
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}

window.scrollTo(0, 0);

window.addEventListener('beforeunload', () => {
  window.scrollTo(0, 0);
});

window.addEventListener('pageshow', () => {
  window.scrollTo(0, 0);
});

document.addEventListener('DOMContentLoaded', () => {
  window.scrollTo(0, 0);
  initMobileNotice();
  syncProjectsWithAdminState();
  initSiteMenuDrawer();
  initProjectSwitcher();
  initPreviewMeshGradient();
  initScrollReveals();
  initVideoViewportAutoplay();
  initCustomCursorHook();
  initContactToggle();
  initPageTransitions();
  initBioDepixelation();
  initPixelDecoders();
  initAlternatingShowcases();
  initImageLightbox();
  initNextProjectBlink();
});

function initMobileNotice() {
  const closeBtn = document.getElementById('mobile-notice-close');
  const notice = document.getElementById('mobile-notice');
  if (closeBtn && notice) {
    closeBtn.onclick = function () {
      notice.classList.add('is-hidden');
      document.body.classList.add('notice-dismissed');
    };
  }
}

window.addEventListener('load', () => {
  window.scrollTo(0, 0);
});

/**
 * 0. Sincronización con el Centro de Control (LocalStorage)
 * Si hay proyectos configurados o con visibilidad modificada, sincroniza la vista.
 */
function syncProjectsWithAdminState() {
  const STORAGE_KEY = 'jp_portfolio_projects_data_v3';
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return;

  try {
    const projects = JSON.parse(stored);
    if (!Array.isArray(projects) || projects.length === 0) return;

    const previewStage = document.getElementById('preview-stage');
    const projectList = document.getElementById('project-list');
    if (!previewStage || !projectList) return;

    // Filtrar solo proyectos visibles y ordenados
    const visibleProjects = projects
      .filter(p => p.visible)
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    if (visibleProjects.length === 0) return;

    // 1. Reconstruir cards de vista previa izquierda
    let previewHtml = '';
    visibleProjects.forEach((p, idx) => {
      const targetId = idx + 1;
      const isProject3 = (p.url && p.url.includes('project-03')) || (p.title && p.title.toLowerCase().includes('catalán'));
      const hasImage = !!(p.cover && p.cover.trim() !== '');
      previewHtml += `
        <article class="preview-card" id="preview-${targetId}" data-project-target="${targetId}">
          <a href="${p.url}" class="preview-media-anchor media-frame" aria-label="Ver ${p.title}">
            ${isProject3 ? '<canvas class="preview-mesh-canvas" id="preview-3-mesh-canvas"></canvas><div class="preview-logo-overlay"><img src="assets/catalanycia/logo.svg" alt="Catalán y Cía. Logo" class="preview-logo-img"></div>' : ''}
            ${hasImage ? `<img src="${p.cover}" alt="${p.title}" class="preview-media-img" onerror="this.src='assets/projects/project-01.jpg'">` : ''}
          </a>
          <div class="preview-meta-caption">
            <span class="preview-meta-title">${p.num || (targetId < 10 ? '0' + targetId : targetId)} ${p.title}</span>
            <span class="preview-meta-category">${p.categoryFull || p.category}</span>
          </div>
        </article>
      `;
    });
    previewStage.innerHTML = previewHtml;

    // 2. Reconstruir listado de la columna derecha
    let listHtml = '';
    visibleProjects.forEach((p, idx) => {
      const targetId = idx + 1;
      listHtml += `
        <li class="project-index-item" data-project="${targetId}">
          <a href="${p.url}" class="project-index-link">
            <div class="index-item-left">
              <span class="index-item-num">${p.num || (targetId < 10 ? '0' + targetId : targetId)}</span>
              <span class="index-item-title">${p.title}</span>
            </div>
            <div class="index-item-right">
              <span class="index-item-cat">${p.category}</span>
              <span class="index-item-year">${p.year}</span>
              <span class="index-item-arrow" aria-hidden="true">&rarr;</span>
            </div>
          </a>
        </li>
      `;
    });
    projectList.innerHTML = listHtml;
    initPreviewMeshGradient();

  } catch (e) {
    console.error('Error sincronizando proyectos desde el Centro de Control:', e);
  }
}

/**
 * 1. Project Switcher (Right list hover -> Left visual stage swap)
 */
function initProjectSwitcher() {
  const projectItems = document.querySelectorAll('.project-index-item');
  const previewCards = document.querySelectorAll('.preview-card');
  const projectList = document.getElementById('project-list');

  if (!projectItems.length || !previewCards.length) return;

  let currentActiveIndex = null;

  function setActiveProject(projectId) {
    currentActiveIndex = parseInt(projectId, 10);
    if (String(projectId) !== '5') {
      document.body.classList.add('has-active-project');
    } else {
      document.body.classList.remove('has-active-project');
    }

    // Update right list items
    projectItems.forEach(item => {
      if (item.getAttribute('data-project') === String(projectId)) {
        item.classList.add('is-active');
      } else {
        item.classList.remove('is-active');
      }
    });

    // Update left preview cards
    previewCards.forEach(card => {
      if (card.getAttribute('data-project-target') === String(projectId)) {
        card.classList.add('is-active');
      } else {
        card.classList.remove('is-active');
      }
    });
  }

  function clearActiveProject() {
    currentActiveIndex = null;
    document.body.classList.remove('has-active-project');
    projectItems.forEach(item => item.classList.remove('is-active'));
    previewCards.forEach(card => card.classList.remove('is-active'));
  }

  // Hover & Focus listeners on each individual project item
  projectItems.forEach(item => {
    const projectId = item.getAttribute('data-project');

    item.addEventListener('mouseenter', () => {
      setActiveProject(projectId);
    });

    item.addEventListener('mouseleave', () => {
      clearActiveProject();
    });

    item.addEventListener('focusin', () => {
      setActiveProject(projectId);
    });

    item.addEventListener('focusout', () => {
      clearActiveProject();
    });
  });

  // 3-Blink Yellow Flash upon clicking any project link before navigating
  const projectLinks = document.querySelectorAll('.project-index-link');
  projectLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetHref = link.getAttribute('href');
      if (!targetHref) return;

      const parentItem = link.closest('.project-index-item');
      if (parentItem) {
        setActiveProject(parentItem.getAttribute('data-project'));
      }

      link.classList.add('is-blinking');

      setTimeout(() => {
        link.classList.remove('is-blinking');
        window.location.href = targetHref;
      }, 680);
    });
  });

  // Clear when mouse leaves the project list container
  if (projectList) {
    projectList.addEventListener('mouseleave', () => {
      clearActiveProject();
    });
  }

  // Keyboard navigation support (ArrowUp, ArrowDown)
  window.addEventListener('keydown', (e) => {
    if (document.body.classList.contains('home-locked')) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIndex = (currentActiveIndex === null || currentActiveIndex >= projectItems.length) ? 1 : currentActiveIndex + 1;
        setActiveProject(nextIndex);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIndex = (currentActiveIndex === null || currentActiveIndex <= 1) ? projectItems.length : currentActiveIndex - 1;
        setActiveProject(prevIndex);
      } else if (e.key === 'Escape') {
        clearActiveProject();
      }
    }
  });
}

/**
 * 2. Intersection Observer for Scroll Reveals (Used in project case study & about pages)
 */
function initScrollReveals() {
  const revealElements = document.querySelectorAll('.reveal');

  if (!revealElements.length) return;

  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -20px 0px'
    });

    revealElements.forEach(el => revealObserver.observe(el));
  } else {
    revealElements.forEach(el => el.classList.add('is-visible'));
  }
}

/**
 * 3. Video Viewport Autoplay Observer
 */
function initVideoViewportAutoplay() {
  const videos = document.querySelectorAll('video[autoplay]');
  if (!videos.length || !('IntersectionObserver' in window)) return;

  const videoObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const video = entry.target;
      if (entry.isIntersecting) {
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
  }, {
    threshold: 0.25
  });

  videos.forEach(video => videoObserver.observe(video));
}

/**
 * 4. Custom Yellow Circle Cursor
 */
function initCustomCursorHook() {
  function setupCursor() {
    let wrapper = document.getElementById('custom-cursor-wrapper');
    if (!wrapper) {
      wrapper = document.createElement('div');
      wrapper.className = 'custom-cursor-wrapper';
      wrapper.id = 'custom-cursor-wrapper';
      wrapper.setAttribute('aria-hidden', 'true');

      const dot = document.createElement('div');
      dot.className = 'custom-cursor-dot';
      dot.id = 'custom-cursor-dot';

      wrapper.appendChild(dot);
      (document.body || document.documentElement).appendChild(wrapper);
    }

    let mouseX = -100, mouseY = -100;
    let isVisible = false;

    const updateCursorPos = (e) => {
      if (e.pointerType === 'touch') return;
      mouseX = e.clientX;
      mouseY = e.clientY;
      wrapper.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;
      if (!isVisible) {
        isVisible = true;
        wrapper.classList.add('is-visible');
        document.documentElement.classList.add('has-custom-cursor');
      }
    };

    window.addEventListener('pointermove', updateCursorPos, { passive: true, capture: true });
    window.addEventListener('mousemove', updateCursorPos, { passive: true, capture: true });

    const interactiveSelector = 'a, button, input, select, textarea, [role="button"], label, .project-index-item, .project-index-link, .contact-sublink, .stage-footer-link, .media-frame, .mag-btn, .ig-pill-btn, .ig-icon-btn, .ig-story-node, .dynamic-island, .button, .alternating-frame, .lightbox-close, .lightbox-nav-btn, .clickable';

    document.addEventListener('mouseover', (e) => {
      if (e.target && e.target.closest && e.target.closest(interactiveSelector)) {
        wrapper.classList.add('is-hovering');
      }
    }, { passive: true, capture: true });

    document.addEventListener('mouseout', (e) => {
      if (e.target && e.target.closest && e.target.closest(interactiveSelector)) {
        if (!e.relatedTarget || !e.relatedTarget.closest || !e.relatedTarget.closest(interactiveSelector)) {
          wrapper.classList.remove('is-hovering');
        }
      }
    }, { passive: true, capture: true });

    document.addEventListener('mousedown', () => {
      wrapper.classList.add('is-clicking');
    }, { capture: true });

    document.addEventListener('mouseup', () => {
      wrapper.classList.remove('is-clicking');
    }, { capture: true });

    document.addEventListener('mouseleave', () => {
      isVisible = false;
      wrapper.classList.remove('is-visible');
    });

    document.addEventListener('mouseenter', () => {
      isVisible = true;
      wrapper.classList.add('is-visible');
      document.documentElement.classList.add('has-custom-cursor');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupCursor);
  } else {
    setupCursor();
  }
}

// Auto-run custom cursor setup immediately
initCustomCursorHook();

/**
 * 5. Contact Drawer Toggle with Calibrated Sequential Depixelating Decoder
 */
function initContactToggle() {
  const trigger = document.getElementById('contact-trigger');
  const drawer = document.getElementById('contact-drawer');
  const links = drawer ? drawer.querySelectorAll('.contact-sublink') : [];

  if (!trigger || !drawer) return;

  const glyphSet = '█▓▒░■□▪▫#&%$X801!/?:';
  let activeIntervals = [];

  function clearAllDecoders() {
    activeIntervals.forEach(interval => clearInterval(interval));
    activeIntervals = [];
  }

  function decodeLink(el, targetText, speed = 14, callback = null) {
    let iteration = 0;
    const maxIterations = targetText.length * 1.6;

    const interval = setInterval(() => {
      el.innerText = targetText
        .split('')
        .map((char, idx) => {
          if (char === ' ') return ' ';
          if (idx < iteration / 1.6) {
            return targetText[idx];
          }
          return glyphSet[Math.floor(Math.random() * glyphSet.length)];
        })
        .join('');

      iteration++;
      if (iteration >= maxIterations) {
        clearInterval(interval);
        el.innerText = targetText;
        if (callback) callback();
      }
    }, speed);

    activeIntervals.push(interval);
  }

  function runSequentialDepixelation() {
    clearAllDecoders();
    links.forEach(link => {
      link.innerText = '';
    });

    const items = [
      { el: links[0], text: 'EMAIL' },
      { el: links[1], text: 'LINKED IN' },
      { el: links[2], text: 'INSTAGRAM' }
    ];

    if (items[0].el) {
      decodeLink(items[0].el, items[0].text, 14, () => {
        if (items[1].el) {
          decodeLink(items[1].el, items[1].text, 14, () => {
            if (items[2].el) {
              decodeLink(items[2].el, items[2].text, 14);
            }
          });
        }
      });
    }
  }

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = drawer.classList.toggle('is-open');
    trigger.classList.toggle('is-active', isOpen);
    trigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    drawer.setAttribute('aria-hidden', isOpen ? 'false' : 'true');

    if (isOpen) {
      runSequentialDepixelation();
    } else {
      clearAllDecoders();
    }
  });

  // 3-Blink Yellow Flash upon clicking any contact option
  links.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetHref = link.getAttribute('href');
      const isExternal = link.getAttribute('target') === '_blank';

      link.classList.add('is-blinking');

      setTimeout(() => {
        link.classList.remove('is-blinking');
        if (isExternal) {
          window.open(targetHref, '_blank', 'noopener,noreferrer');
        } else {
          window.location.href = targetHref;
        }
      }, 680);
    });
  });

  // Close when clicking outside
  document.addEventListener('click', (e) => {
    if (!drawer.contains(e.target) && e.target !== trigger) {
      drawer.classList.remove('is-open');
      trigger.classList.remove('is-active');
      trigger.setAttribute('aria-expanded', 'false');
      drawer.setAttribute('aria-hidden', 'true');
      clearAllDecoders();
    }
  });

  // Close on Escape key
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer.classList.contains('is-open')) {
      drawer.classList.remove('is-open');
      trigger.classList.remove('is-active');
      trigger.setAttribute('aria-expanded', 'false');
      drawer.setAttribute('aria-hidden', 'true');
      clearAllDecoders();
    }
  });
}

/**
 * Global Top Bar Navigation Drawer (Inicio, Sobre Mí, Contacto)
 */
function ensureSiteMenuDrawer() {
  let drawer = document.getElementById('site-menu-drawer');
  if (!drawer) {
    const isInsideProjects = window.location.pathname.includes('/projects/') || document.querySelector('link[href^="../css/"]');
    const rootPath = isInsideProjects ? '../' : '';

    drawer = document.createElement('div');
    drawer.className = 'site-menu-drawer';
    drawer.id = 'site-menu-drawer';
    drawer.setAttribute('aria-hidden', 'true');
    drawer.innerHTML = `
      <div class="menu-drawer-backdrop" id="menu-drawer-backdrop"></div>
      <div class="menu-drawer-panel">
        <div class="menu-drawer-top">
          <span class="menu-drawer-badge">MENÚ</span>
          <button type="button" class="menu-drawer-close" id="menu-drawer-close" aria-label="Cerrar menú">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <nav class="menu-drawer-nav" aria-label="Navegación principal">
          <ul class="menu-drawer-list">
            <li><a href="${rootPath}index.html" class="menu-drawer-link">INICIO</a></li>
            <li><a href="${rootPath}sobremi.html" class="menu-drawer-link">SOBRE MÍ</a></li>
            <li class="menu-drawer-item-contact">
              <button type="button" class="menu-drawer-link menu-drawer-contact-toggle" id="menu-drawer-contact-toggle" aria-expanded="false" onclick="event.stopPropagation(); window.toggleMenuContactSub && window.toggleMenuContactSub(event);">
                CONTACTO <span class="contact-chevron">&darr;</span>
              </button>
              <div class="menu-drawer-contact-sub" id="menu-drawer-contact-sub">
                <a href="mailto:juan-pablo.catalan@uc.cl" class="menu-contact-item">EMAIL</a>
                <a href="https://www.linkedin.com/in/jp-catalan/" target="_blank" rel="noopener noreferrer" class="menu-contact-item">LINKEDIN</a>
                <a href="https://www.instagram.com/jp.catalan/" target="_blank" rel="noopener noreferrer" class="menu-contact-item">INSTAGRAM</a>
              </div>
            </li>
          </ul>
        </nav>
        <div class="menu-drawer-footer">
          <span>JUAN-PABLO CATALÁN</span>
          <span>&copy; 2026</span>
        </div>
      </div>
    `;
    const siteHeader = document.getElementById('site-header');
    if (siteHeader && siteHeader.nextSibling) {
      siteHeader.parentNode.insertBefore(drawer, siteHeader.nextSibling);
    } else if (siteHeader) {
      siteHeader.parentNode.appendChild(drawer);
    } else {
      document.body.appendChild(drawer);
    }
  }
  return drawer;
}

let _lastMenuToggleTimestamp = 0;

window.openSiteMenuDrawer = function (e) {
  if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
  _lastMenuToggleTimestamp = Date.now();
  const drawer = ensureSiteMenuDrawer();
  drawer.classList.add('is-open');
  drawer.setAttribute('aria-hidden', 'false');
  document.querySelectorAll('.menu-toggle-btn').forEach(btn => {
    btn.classList.add('is-active');
    btn.setAttribute('aria-expanded', 'true');
  });
};

window.closeSiteMenuDrawer = function (e) {
  if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
  _lastMenuToggleTimestamp = Date.now();
  const drawer = document.getElementById('site-menu-drawer');
  if (drawer) {
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
  }
  document.querySelectorAll('.menu-toggle-btn').forEach(btn => {
    btn.classList.remove('is-active');
    btn.setAttribute('aria-expanded', 'false');
  });
};

window.toggleSiteMenuDrawer = function (e) {
  if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
  const now = Date.now();
  if (now - _lastMenuToggleTimestamp < 250) {
    return;
  }
  _lastMenuToggleTimestamp = now;

  const drawer = ensureSiteMenuDrawer();
  if (drawer.classList.contains('is-open')) {
    window.closeSiteMenuDrawer();
  } else {
    window.openSiteMenuDrawer();
  }
};

let _lastContactToggleTimestamp = 0;

window.toggleMenuContactSub = function (e) {
  if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
  const now = Date.now();
  if (now - _lastContactToggleTimestamp < 250) return;
  _lastContactToggleTimestamp = now;

  const contactSub = document.getElementById('menu-drawer-contact-sub');
  const contactToggle = document.getElementById('menu-drawer-contact-toggle') || document.querySelector('.menu-drawer-contact-toggle');
  if (contactSub) {
    const isExpanded = contactSub.classList.toggle('is-expanded');
    if (contactToggle) {
      contactToggle.classList.toggle('is-expanded', isExpanded);
      contactToggle.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
    }
  }
};

function initSiteMenuDrawer() {
  ensureSiteMenuDrawer();

  // Document-level delegated listeners (immune to DOM re-renders or timing)
  if (!document.__siteMenuDelegated) {
    document.__siteMenuDelegated = true;

    document.addEventListener('click', (e) => {
      const toggleBtn = e.target.closest('#menu-toggle-btn, .menu-toggle-btn');
      if (toggleBtn) {
        e.preventDefault();
        e.stopPropagation();
        window.toggleSiteMenuDrawer(e);
        return;
      }

      const closeBtn = e.target.closest('#menu-drawer-close, .menu-drawer-close, #menu-drawer-backdrop, .menu-drawer-backdrop');
      if (closeBtn) {
        e.preventDefault();
        e.stopPropagation();
        window.closeSiteMenuDrawer(e);
        return;
      }

      const contactToggle = e.target.closest('#menu-drawer-contact-toggle, .menu-drawer-contact-toggle');
      if (contactToggle) {
        e.preventDefault();
        e.stopPropagation();
        window.toggleMenuContactSub(e);
        return;
      }

      // Close when clicking navigation links inside drawer
      const navLink = e.target.closest('.menu-drawer-link[href], .menu-contact-item');
      if (navLink) {
        window.closeSiteMenuDrawer();
      }
    });

    // Close on Escape
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        window.closeSiteMenuDrawer();
      }
    });
  }
}

/**
 * 6. Seamless View Transitions, 3-Blink Yellow Pulse & Header/Footer Morphing
 */
function initPageTransitions() {
  const transitionLinks = document.querySelectorAll(
    'a[href="sobremi.html"], a[href="about.html"], a[href="index.html"], a[href="../sobremi.html"], a[href="../about.html"], a[href="../index.html"], a.static-header-label, .stage-footer-link:not(#contact-trigger), .nav-link, .back-link, .site-header a, .footer-link, .site-footer a, .menu-drawer-link, .header-logo-link'
  );

  transitionLinks.forEach(link => {
    if (link.dataset.hasTransitionBound) return;
    link.dataset.hasTransitionBound = 'true';

    link.addEventListener('click', (e) => {
      const targetUrl = link.getAttribute('href');
      if (!targetUrl || targetUrl.startsWith('#')) return;

      const isLogoLink = link.classList.contains('header-center-logo') || link.classList.contains('header-logo-link');

      // Handle mailto and target="_blank" links with 3-blink feedback
      if (targetUrl.startsWith('mailto:') || link.getAttribute('target') === '_blank') {
        if (!isLogoLink) link.classList.add('is-blinking');
        setTimeout(() => {
          if (!isLogoLink) link.classList.remove('is-blinking');
        }, isLogoLink ? 0 : 680);
        return;
      }

      e.preventDefault();
      if (!isLogoLink) link.classList.add('is-blinking');

      const runNavigation = () => {
        if (!isLogoLink) link.classList.remove('is-blinking');

        const currentStaticHeader = document.getElementById('site-header-static');
        const isStandardStaticPage = !!currentStaticHeader && (targetUrl === 'sobremi.html' || targetUrl === 'about.html' || targetUrl === 'index.html');

        if (document.startViewTransition && isStandardStaticPage) {
          fetch(targetUrl)
            .then(res => res.text())
            .then(htmlText => {
              const parser = new DOMParser();
              const newDoc = parser.parseFromString(htmlText, 'text/html');

              document.startViewTransition(() => {
                document.title = newDoc.title;
                document.body.className = newDoc.body.className;

                const currentNotice = document.getElementById('mobile-notice');
                const newNotice = newDoc.getElementById('mobile-notice');
                if (currentNotice && newNotice) {
                  currentNotice.replaceWith(newNotice);
                } else if (!currentNotice && newNotice) {
                  document.body.insertAdjacentElement('afterbegin', newNotice);
                } else if (currentNotice && !newNotice) {
                  currentNotice.remove();
                }

                const currentNav = document.getElementById('site-header');
                const newNav = newDoc.getElementById('site-header');
                if (currentNav && newNav) {
                  currentNav.replaceWith(newNav);
                } else if (!currentNav && newNav) {
                  document.body.insertAdjacentElement('afterbegin', newNav);
                } else if (currentNav && !newNav) {
                  currentNav.remove();
                }

                const currentMain = document.getElementById('main-content');
                const newMain = newDoc.getElementById('main-content');
                if (currentMain && newMain) {
                  currentMain.replaceWith(newMain);
                }

                const currentHeader = document.getElementById('site-header-static');
                const newHeader = newDoc.getElementById('site-header-static');
                if (currentHeader && newHeader) {
                  currentHeader.innerHTML = newHeader.innerHTML;
                }

                window.history.pushState({}, '', targetUrl);

                initMobileNotice();
                initSiteMenuDrawer();
                initProjectSwitcher();
                initContactToggle();
                initScrollReveals();
                initPageTransitions();
                initBioDepixelation();
                initPixelDecoders();
                initAlternatingShowcases();
                initImageLightbox();

                // Re-initialize 3D Smiley Face if canvas is present in newly swapped page
                if (document.getElementById('smiley-3d-canvas') && typeof window.initSmiley3D === 'function') {
                  window.initSmiley3D();
                }

                window.scrollTo(0, 0);
              });
            })
            .catch(() => {
              window.location.href = targetUrl;
            });
        } else {
          window.location.href = targetUrl;
        }
      };

      if (isLogoLink) {
        runNavigation();
      } else {
        setTimeout(runNavigation, 680);
      }
    });
  });

  // Dedicated blink for .footer-link (EMAIL, LINKED IN, INSTAGRAM in site footer)
  document.querySelectorAll('.footer-link').forEach(link => {
    link.addEventListener('click', (e) => {
      const targetUrl = link.getAttribute('href');
      if (!targetUrl) return;

      e.preventDefault();
      link.classList.add('is-blinking');

      setTimeout(() => {
        link.classList.remove('is-blinking');
        if (link.getAttribute('target') === '_blank') {
          window.open(targetUrl, '_blank', 'noopener,noreferrer');
        } else {
          window.location.href = targetUrl;
        }
      }, 680);
    });
  });

  window.addEventListener('popstate', () => {
    window.location.reload();
  });
}

/**
 * 7. Biography Progressive Depixelating Decoder (Cascading across all paragraphs)
 */
function initBioDepixelation() {
  const bioElements = document.querySelectorAll('.about-bio');
  if (!bioElements.length) return;

  const glyphSet = '█▓▒░■□▪▫#&%$X801!/?:';

  bioElements.forEach((bioEl, elIndex) => {
    const originalText = bioEl.getAttribute('data-original-text') || bioEl.innerText.trim();
    bioEl.setAttribute('data-original-text', originalText);
    bioEl.innerText = '';

    let iteration = 0;
    const totalLength = originalText.length;
    const charsPerFrame = 3;

    setTimeout(() => {
      const interval = setInterval(() => {
        let output = '';
        for (let i = 0; i < totalLength; i++) {
          const targetChar = originalText[i];
          if (targetChar === ' ' || targetChar === '\n') {
            output += targetChar;
          } else if (i < iteration) {
            output += targetChar;
          } else if (i < iteration + 14) {
            output += glyphSet[Math.floor(Math.random() * glyphSet.length)];
          } else {
            output += '';
          }
        }

        bioEl.innerText = output;
        iteration += charsPerFrame;

        if (iteration >= totalLength + 14) {
          clearInterval(interval);
          bioEl.innerText = originalText;
        }
      }, 16);
    }, elIndex * 240);
  });
}

/**
 * 8. Element Pixelated Text Decoder (Used for titles and interactive headings)
 */
function initPixelDecoders() {
  const decoders = document.querySelectorAll('.pixel-decode, [data-decode="true"]');
  if (!decoders.length) return;

  const glyphSet = '█▓▒░■□▪▫#&%$X801!/?:';

  function decodeElement(el, targetText, speed = 14, callback = null) {
    if (el._decodeInterval) {
      clearInterval(el._decodeInterval);
    }

    let iteration = 0;
    const maxIterations = targetText.length * 1.6;
    el.classList.add('is-decoding');

    function renderFrame() {
      el.innerText = targetText
        .split('')
        .map((char, idx) => {
          if (char === ' ') return ' ';
          if (idx < iteration / 1.6) {
            return targetText[idx];
          }
          return glyphSet[Math.floor(Math.random() * glyphSet.length)];
        })
        .join('');

      iteration++;
      if (iteration >= maxIterations) {
        if (el._decodeInterval) {
          clearInterval(el._decodeInterval);
          el._decodeInterval = null;
        }
        el.innerText = targetText;
        el.classList.remove('is-decoding');
        if (callback) callback();
      }
    }

    renderFrame();
    el._decodeInterval = setInterval(renderFrame, speed);
  }

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const text = el.getAttribute('data-text') || el.innerText.trim();
          el.setAttribute('data-text', text);
          setTimeout(() => {
            decodeElement(el, text, 14);
          }, 80);
          obs.unobserve(el);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -20px 0px'
    });

    decoders.forEach(el => observer.observe(el));
  } else {
    decoders.forEach(el => {
      const text = el.getAttribute('data-text') || el.innerText.trim();
      decodeElement(el, text, 14);
    });
  }
}

/**
 * 9. Alternating Image Showcase (Carousel / Cycling across multi-column grids)
 */
function initAlternatingShowcases() {
  const showcases = document.querySelectorAll('.alternating-showcase');
  if (!showcases.length) return;

  showcases.forEach(showcase => {
    if (showcase._hasAlternator) return;
    showcase._hasAlternator = true;

    const frames = Array.from(showcase.querySelectorAll('.alternating-frame'));
    if (!frames.length) return;

    // Collect all unique image sources present in the frames or data attributes
    const imageListAttr = showcase.getAttribute('data-images');
    let pool = [];
    if (imageListAttr) {
      try {
        pool = JSON.parse(imageListAttr);
      } catch (e) {
        pool = imageListAttr.split(',').map(s => s.trim());
      }
    } else {
      const foundImgs = showcase.querySelectorAll('img');
      const set = new Set();
      foundImgs.forEach(img => {
        const src = img.getAttribute('src');
        if (src) set.add(src);
      });
      pool = Array.from(set);
    }

    // Ensure pool has only unique URLs
    pool = Array.from(new Set(pool.filter(Boolean)));
    if (pool.length < 2) return;

    const intervalTime = parseInt(showcase.getAttribute('data-interval'), 10) || 1000;

    // Initial distinct indices for each frame
    const frameIndices = [];
    const usedInitial = new Set();
    frames.forEach((frame, i) => {
      let initialIdx = parseInt(frame.getAttribute('data-index'), 10);
      if (isNaN(initialIdx) || usedInitial.has(initialIdx % pool.length)) {
        for (let k = 0; k < pool.length; k++) {
          if (!usedInitial.has(k)) {
            initialIdx = k;
            break;
          }
        }
      } else {
        initialIdx = initialIdx % pool.length;
      }
      usedInitial.add(initialIdx);
      frameIndices.push(initialIdx);
    });

    // Sync initial images in DOM
    frames.forEach((frame, i) => {
      const currentIdx = frameIndices[i];
      const activeImg = frame.querySelector('.alt-img-active') || frame.querySelector('img');
      if (activeImg && pool[currentIdx]) {
        activeImg.src = pool[currentIdx];
      }
    });

    function advanceFrame(frameIdx, manualNextIndex = null) {
      const frame = frames[frameIdx];
      if (!frame) return;

      let nextIdx;
      if (manualNextIndex !== null && manualNextIndex !== undefined) {
        nextIdx = manualNextIndex % pool.length;
      } else {
        // Find next index that is NOT currently displayed by any other frame
        const otherIndices = new Set(frameIndices.filter((_, idx) => idx !== frameIdx));
        let candidate = (frameIndices[frameIdx] + 1) % pool.length;
        let attempts = 0;
        while (otherIndices.has(candidate) && attempts < pool.length) {
          candidate = (candidate + 1) % pool.length;
          attempts++;
        }
        nextIdx = candidate;
      }

      frameIndices[frameIdx] = nextIdx;

      let imgActive = frame.querySelector('.alt-img-active');
      let imgNext = frame.querySelector('.alt-img-next');

      if (!imgActive || !imgNext) {
        const singleImg = frame.querySelector('img');
        if (singleImg) {
          singleImg.src = pool[nextIdx];
        }
        return;
      }

      // Preload next image and swap instantly without transition
      imgNext.src = pool[nextIdx];
      imgNext.classList.remove('alt-img-next');
      imgNext.classList.add('alt-img-active');
      imgActive.classList.remove('alt-img-active');
      imgActive.classList.add('alt-img-next');
    }

    let isPaused = false;
    let timer = null;
    let baseOffset = frameIndices[0];

    function startTimer() {
      if (timer) clearInterval(timer);
      timer = setInterval(() => {
        if (isPaused) return;
        baseOffset = (baseOffset + 1) % pool.length;
        frames.forEach((_, i) => {
          const targetIdx = (baseOffset + i) % pool.length;
          advanceFrame(i, targetIdx);
        });
      }, intervalTime);
    }

    // Pause on hover
    showcase.addEventListener('mouseenter', () => { isPaused = true; });
    showcase.addEventListener('mouseleave', () => { isPaused = false; });

    // Listen to lightbox events to pause/resume
    document.addEventListener('lightbox:opened', () => { isPaused = true; });
    document.addEventListener('lightbox:closed', () => { isPaused = false; });

    // Start cycling
    startTimer();
  });
}

/**
 * 10. Universal Image Lightbox Modal (with Full Gallery Navigation)
 */
function initImageLightbox() {
  let modal = document.getElementById('image-lightbox-modal');

  if (!modal) {
    modal = document.createElement('div');
    modal.className = 'image-lightbox-modal';
    modal.id = 'image-lightbox-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-hidden', 'true');
    modal.innerHTML = `
      <div class="lightbox-top-bar">
        <span class="lightbox-counter" id="lightbox-counter"></span>
        <button type="button" class="lightbox-close" id="lightbox-close" aria-label="Cerrar imagen">&times;</button>
      </div>
      <button type="button" class="lightbox-nav-btn lightbox-prev" id="lightbox-prev" aria-label="Imagen anterior" title="Imagen anterior (←)">
        &larr;
      </button>
      <div class="lightbox-content">
        <img src="" alt="Vista previa ampliada" id="lightbox-img">
      </div>
      <button type="button" class="lightbox-nav-btn lightbox-next" id="lightbox-next" aria-label="Imagen siguiente" title="Imagen siguiente (→)">
        &rarr;
      </button>
    `;
    document.body.appendChild(modal);
  }

  const lightboxImg = modal.querySelector('#lightbox-img');
  const closeBtn = modal.querySelector('#lightbox-close');
  const prevBtn = modal.querySelector('#lightbox-prev');
  const nextBtn = modal.querySelector('#lightbox-next');
  const counterEl = modal.querySelector('#lightbox-counter');

  let currentGallery = [];
  let currentIndex = 0;

  function updateDisplay() {
    if (!currentGallery.length) {
      if (prevBtn) prevBtn.style.display = 'none';
      if (nextBtn) nextBtn.style.display = 'none';
      if (counterEl) counterEl.textContent = '';
      return;
    }

    if (currentGallery.length > 1) {
      if (prevBtn) prevBtn.style.display = 'flex';
      if (nextBtn) nextBtn.style.display = 'flex';
      const numStr = String(currentIndex + 1).padStart(2, '0');
      const totalStr = String(currentGallery.length).padStart(2, '0');
      if (counterEl) counterEl.innerHTML = `<span class="mag-current-page-num">${numStr}</span> / ${totalStr}`;
    } else {
      if (prevBtn) prevBtn.style.display = 'none';
      if (nextBtn) nextBtn.style.display = 'none';
      if (counterEl) counterEl.innerHTML = '';
    }

    const currentSrc = currentGallery[currentIndex];
    if (currentSrc) {
      lightboxImg.style.opacity = '0.3';
      const temp = new Image();
      temp.onload = () => {
        lightboxImg.src = currentSrc;
        lightboxImg.style.opacity = '1';
      };
      temp.onerror = () => {
        lightboxImg.src = currentSrc;
        lightboxImg.style.opacity = '1';
      };
      temp.src = currentSrc;
    }
  }

  function goToIndex(index) {
    if (!currentGallery.length) return;
    currentIndex = (index + currentGallery.length) % currentGallery.length;
    updateDisplay();
  }

  function openLightbox(src, alt = 'Vista ampliada', gallery = null, startIndex = 0) {
    if (!src && (!gallery || !gallery.length)) return;

    if (gallery && gallery.length > 0) {
      currentGallery = gallery;
      currentIndex = startIndex >= 0 && startIndex < gallery.length ? startIndex : 0;
    } else if (src) {
      currentGallery = [src];
      currentIndex = 0;
    }

    const currentSrc = currentGallery[currentIndex] || src;
    lightboxImg.src = currentSrc;
    lightboxImg.alt = alt;
    lightboxImg.style.opacity = '1';

    updateDisplay();

    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    document.dispatchEvent(new CustomEvent('lightbox:opened'));
  }

  function closeLightbox() {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    setTimeout(() => {
      if (!modal.classList.contains('is-open')) {
        lightboxImg.src = '';
        currentGallery = [];
        currentIndex = 0;
      }
    }, 300);
    document.dispatchEvent(new CustomEvent('lightbox:closed'));
  }

  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    closeLightbox();
  });

  if (prevBtn) {
    prevBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      goToIndex(currentIndex - 1);
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      goToIndex(currentIndex + 1);
    });
  }

  modal.addEventListener('click', (e) => {
    if (e.target === modal || e.target.classList.contains('lightbox-content')) {
      closeLightbox();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (!modal.classList.contains('is-open')) return;
    if (e.key === 'Escape') {
      closeLightbox();
    } else if (e.key === 'ArrowLeft') {
      goToIndex(currentIndex - 1);
    } else if (e.key === 'ArrowRight') {
      goToIndex(currentIndex + 1);
    }
  });

  // Helper to normalize URLs for matching
  function normalizeUrl(url) {
    try {
      return new URL(url, window.location.href).href;
    } catch (e) {
      return url;
    }
  }

  // Attach to alternating frames and zoomable images
  const zoomableTargets = document.querySelectorAll('.alternating-frame, [data-zoomable="true"]');
  zoomableTargets.forEach(target => {
    target.addEventListener('click', (e) => {
      e.preventDefault();
      const activeImg = target.querySelector('.alt-img-active') || target.querySelector('img');
      if (!activeImg || !activeImg.src) return;

      const currentSrc = activeImg.src;
      const normalizedCurrentSrc = normalizeUrl(currentSrc);

      // Look for parent gallery or showcase
      const showcase = target.closest('.alternating-showcase, [data-images]');
      let galleryList = [];

      if (showcase) {
        const imageListAttr = showcase.getAttribute('data-images');
        if (imageListAttr) {
          try {
            galleryList = JSON.parse(imageListAttr);
          } catch (err) {
            galleryList = imageListAttr.split(',').map(s => s.trim());
          }
        } else {
          const imgs = showcase.querySelectorAll('img');
          imgs.forEach(im => {
            if (im.src) galleryList.push(im.src);
          });
        }
      }

      // Filter and normalize gallery list
      galleryList = Array.from(new Set(galleryList.filter(Boolean))).map(normalizeUrl);

      let foundIndex = galleryList.findIndex(url => url === normalizedCurrentSrc);
      if (foundIndex === -1 && galleryList.length > 0) {
        foundIndex = galleryList.findIndex(url => url.endsWith(currentSrc) || currentSrc.endsWith(url));
      }

      if (galleryList.length > 0) {
        openLightbox(currentSrc, activeImg.alt || 'Prototipo Físico', galleryList, foundIndex >= 0 ? foundIndex : 0);
      } else {
        openLightbox(currentSrc, activeImg.alt || 'Prototipo Físico');
      }
    });
  });
}

/**
 * 11. Next Project Link 3-Blink Yellow Pulse Navigation
 */
function initNextProjectBlink() {
  const nextLinks = document.querySelectorAll('.next-project-link');
  nextLinks.forEach(link => {
    if (link.dataset.hasNextBlinkBound) return;
    link.dataset.hasNextBlinkBound = 'true';

    link.addEventListener('click', (e) => {
      const targetHref = link.getAttribute('href');
      if (!targetHref || targetHref.startsWith('#')) return;

      e.preventDefault();
      link.classList.add('is-blinking');

      setTimeout(() => {
        link.classList.remove('is-blinking');
        window.location.href = targetHref;
      }, 680);
    });
  });
}

/**
 * 12. WebGL Mesh Gradient Animation for Project 03 preview on Home Page
 */
function initPreviewMeshGradient() {
  const canvas = document.getElementById('preview-3-mesh-canvas') || document.querySelector('.preview-mesh-canvas');
  if (!canvas) return;

  if (canvas.dataset.initialized === 'true') return;
  canvas.dataset.initialized = 'true';

  const gl = canvas.getContext('webgl', { antialias: true, powerPreference: 'high-performance' }) ||
    canvas.getContext('experimental-webgl');
  if (!gl) return;

  const vsSource = `
    attribute vec2 a_pos;
    varying vec2 v_uv;
    void main() {
      v_uv = (a_pos + 1.0) * 0.5;
      gl_Position = vec4(a_pos, 0.0, 1.0);
    }
  `;

  const fsSource = `
    precision highp float;
    varying vec2 v_uv;
    uniform vec2 u_res;
    uniform vec2 u_points[5];
    uniform vec3 u_colors[5];
    uniform float u_radius[5];
    uniform float u_falloff;
    uniform float u_grain;
    uniform vec3 u_bgcolor;
    uniform float u_time;

    float hash(vec2 p) {
      return fract(sin(dot(p + u_time * 0.001, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      vec2 st = gl_FragCoord.xy / u_res;
      float aspect = u_res.x / u_res.y;
      vec3 totalColor = vec3(0.0);
      float totalWeight = 0.00001;

      for (int i = 0; i < 5; i++) {
        vec2 diff = (st - u_points[i]);
        diff.x *= aspect;
        float dist = length(diff) / max(u_radius[i], 0.05);
        float weight = 1.0 / (pow(dist, u_falloff) + 0.0001);
        totalColor += u_colors[i] * weight;
        totalWeight += weight;
      }

      vec3 color = totalColor / totalWeight;
      color = mix(u_bgcolor, color, 0.98);

      if (u_grain > 0.0) {
        float noise = (hash(st * 4.0) - 0.5) * (u_grain * 0.12);
        color += noise;
      }

      gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
    }
  `;

  function hexToRgb(hex) {
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const n = parseInt(c, 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }

  function createShader(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  }

  const prog = gl.createProgram();
  gl.attachShader(prog, createShader(gl.VERTEX_SHADER, vsSource));
  gl.attachShader(prog, createShader(gl.FRAGMENT_SHADER, fsSource));
  gl.linkProgram(prog);
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);

  const pos = gl.getAttribLocation(prog, 'a_pos');
  gl.enableVertexAttribArray(pos);
  gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

  const uRes = gl.getUniformLocation(prog, 'u_res');
  const uPoints = gl.getUniformLocation(prog, 'u_points');
  const uColors = gl.getUniformLocation(prog, 'u_colors');
  const uRadius = gl.getUniformLocation(prog, 'u_radius');
  const uFalloff = gl.getUniformLocation(prog, 'u_falloff');
  const uGrain = gl.getUniformLocation(prog, 'u_grain');
  const uBg = gl.getUniformLocation(prog, 'u_bgcolor');
  const uTime = gl.getUniformLocation(prog, 'u_time');

  const config = {
    backgroundColor: "#0f0812",
    falloff: 1.6,
    grainNoise: 0.22,
    animationSpeed: 0.6,
    points: [
      { id: 0, color: "#f9cee1", x: 0.20, y: 0.22, radius: 1.15, animOffset: 0.0 },
      { id: 1, color: "#cfda8c", x: 0.80, y: 0.20, radius: 1.20, animOffset: 1.3 },
      { id: 2, color: "#f9cee1", x: 0.50, y: 0.50, radius: 1.05, animOffset: 2.6 },
      { id: 3, color: "#f28e0e", x: 0.18, y: 0.78, radius: 1.25, animOffset: 3.9 },
      { id: 4, color: "#f9cee1", x: 0.82, y: 0.78, radius: 1.15, animOffset: 5.2 }
    ]
  };

  let width = 0, height = 0;
  function resizeMesh() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = Math.max(1, Math.floor((window.innerWidth || 1200) * dpr));
    height = Math.max(1, Math.floor((window.innerHeight || 800) * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
    }
  }
  window.addEventListener('resize', resizeMesh);
  resizeMesh();

  let animTime = 0;
  let lastTime = performance.now();

  function renderMesh(now) {
    const parentCard = canvas.closest('.preview-card');
    if (!parentCard || parentCard.classList.contains('is-active')) {
      const delta = (now - lastTime) * 0.001;
      lastTime = now;

      animTime += delta * config.animationSpeed * 1000;
      const t = animTime * 0.0011;

      const currentPoints = config.points.map((p, i) => {
        const bX = p.x;
        const bY = p.y;
        const freqX = 0.75 + i * 0.18;
        const freqY = 0.65 + i * 0.20;
        const phase = p.animOffset;

        const ox = Math.sin(t * freqX + phase) * 0.065 + Math.cos(t * 0.55 + phase) * 0.02;
        const oy = Math.cos(t * freqY + phase) * 0.055 + Math.sin(t * 0.60 + phase) * 0.02;

        const px = Math.max(0.06, Math.min(0.94, bX + ox));
        const py = Math.max(0.06, Math.min(0.94, bY + oy));
        const r = p.radius * (1.0 + Math.sin(t * 1.2 + phase) * 0.06);

        return { ...p, curX: px, curY: py, curR: r };
      });

      const minDist = 0.18;
      for (let iter = 0; iter < 2; iter++) {
        for (let i = 0; i < currentPoints.length; i++) {
          for (let j = i + 1; j < currentPoints.length; j++) {
            const p1 = currentPoints[i];
            const p2 = currentPoints[j];
            const dx = p2.curX - p1.curX;
            const dy = p2.curY - p1.curY;
            const dist = Math.hypot(dx, dy);

            if (dist < minDist && dist > 0.0001) {
              const overlap = (minDist - dist) * 0.5;
              const nx = dx / dist;
              const ny = dy / dist;
              p1.curX = Math.max(0.06, Math.min(0.94, p1.curX - nx * overlap));
              p1.curY = Math.max(0.06, Math.min(0.94, p1.curY - ny * overlap));
              p2.curX = Math.max(0.06, Math.min(0.94, p2.curX + nx * overlap));
              p2.curY = Math.max(0.06, Math.min(0.94, p2.curY + ny * overlap));
            }
          }
        }
      }

      const ptsArr = [];
      const colArr = [];
      const radArr = [];

      currentPoints.forEach(p => {
        ptsArr.push(p.curX, 1.0 - p.curY);
        const rgb = hexToRgb(p.color);
        colArr.push(rgb[0], rgb[1], rgb[2]);
        radArr.push(p.curR);
      });

      gl.uniform2f(uRes, width, height);
      gl.uniform1f(uFalloff, config.falloff);
      gl.uniform1f(uGrain, config.grainNoise);
      gl.uniform1f(uTime, now * 0.001);

      const bgRgb = hexToRgb(config.backgroundColor);
      gl.uniform3f(uBg, bgRgb[0], bgRgb[1], bgRgb[2]);

      gl.uniform2fv(uPoints, new Float32Array(ptsArr));
      gl.uniform3fv(uColors, new Float32Array(colArr));
      gl.uniform1fv(uRadius, new Float32Array(radArr));

      gl.drawArrays(gl.TRIANGLES, 0, 6);
    } else {
      lastTime = now;
    }
    requestAnimationFrame(renderMesh);
  }
  requestAnimationFrame(renderMesh);
}



