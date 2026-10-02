/**
 * JUAN PABLO — COMING SOON INTERACTIONS
 * Clean Contact Toggle & Depixelating Decoder Animation
 */

document.addEventListener('DOMContentLoaded', () => {
  initContactToggle();
});

/**
 * Contact Drawer Toggle with Calibrated Sequential Depixelating Decoder
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
 * Custom Yellow Circle Cursor
 */
function initCustomCursorHook() {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

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
    document.body.appendChild(wrapper);
  }

  let mouseX = -100, mouseY = -100;
  let isVisible = false;

  const updateCursorPos = (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    wrapper.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;
    if (!isVisible) {
      isVisible = true;
      wrapper.classList.add('is-visible');
    }
  };

  window.addEventListener('pointermove', updateCursorPos, { passive: true });
  window.addEventListener('mousemove', updateCursorPos, { passive: true });

  const interactiveSelector = 'a, button, input, select, textarea, [role="button"], label, .contact-sublink, .stage-footer-link';

  document.addEventListener('mouseover', (e) => {
    if (e.target && e.target.closest && e.target.closest(interactiveSelector)) {
      wrapper.classList.add('is-hovering');
    }
  }, { passive: true });

  document.addEventListener('mouseout', (e) => {
    if (e.target && e.target.closest && e.target.closest(interactiveSelector)) {
      if (!e.relatedTarget || !e.relatedTarget.closest || !e.relatedTarget.closest(interactiveSelector)) {
        wrapper.classList.remove('is-hovering');
      }
    }
  }, { passive: true });

  document.addEventListener('mousedown', () => {
    wrapper.classList.add('is-clicking');
  });

  document.addEventListener('mouseup', () => {
    wrapper.classList.remove('is-clicking');
  });

  document.addEventListener('mouseleave', () => {
    isVisible = false;
    wrapper.classList.remove('is-visible');
  });

  document.addEventListener('mouseenter', () => {
    isVisible = true;
    wrapper.classList.add('is-visible');
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initCustomCursorHook();
});

