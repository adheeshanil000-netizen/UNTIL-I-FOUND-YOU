/* ================================================================
   HAPPY BIRTHDAY, ANNNAAAMMOO — SCRIPT
   Vanilla JS. No frameworks, no dependencies.
   Handles: intro sequence, ambient particles, scroll reveals,
   timeline progress, split-text, music fade in/out, lightbox,
   video/music ducking, starfield ending.
   ================================================================ */

(() => {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------
     UTIL
     ------------------------------------------------------------ */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /* ------------------------------------------------------------
     LOCK GATE — unlock with the date, then reveal the intro
     ------------------------------------------------------------ */
  const lockGate = $('#lock-gate');
  const lockForm = $('#lock-form');
  const lockInput = $('#lock-input');
  const lockError = $('#lock-error');
  const introSection = $('#intro');

  const CORRECT_ANSWER = '22APRIL2022';

  function normalizeAnswer(raw) {
    return raw
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, ''); // strip spaces, slashes, dashes, dots
  }

  async function unlockGate() {
    lockGate.classList.add('is-leaving');
    await wait(1200);
    lockGate.classList.add('is-gone');

    introSection.classList.remove('is-waiting');
    runIntroSequence();
  }

  function rejectGuess() {
    lockError.textContent = "That's not quite the date I remember. Try again?";
    lockError.classList.add('is-visible');
    lockInput.classList.add('is-shaking');
    lockInput.value = '';
    lockInput.focus();
    setTimeout(() => lockInput.classList.remove('is-shaking'), 500);
  }

  if (lockForm) {
    lockForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const guess = normalizeAnswer(lockInput.value);
      if (guess === CORRECT_ANSWER) {
        lockError.classList.remove('is-visible');
        unlockGate();
      } else {
        rejectGuess();
      }
    });
  }

  /* ------------------------------------------------------------
     INTRO SEQUENCE
     ------------------------------------------------------------ */
  const introLines = $$('.intro__line', introSection);
  const beginBtn = $('#begin-btn');
  const introHint = $('.intro__hint');
  const mainExperience = $('#main-experience');
  const soundToggle = $('#sound-toggle');

  async function runIntroSequence() {
    if (prefersReducedMotion) {
      introLines.forEach((l) => l.classList.add('is-visible'));
      beginBtn.classList.add('is-visible');
      introHint.classList.add('is-visible');
      return;
    }

    await wait(700);
    for (const line of introLines) {
      line.classList.add('is-visible');
      await wait(2200);
      line.classList.remove('is-visible');
      await wait(500);
    }
    // Leave the final line concept resolved, then reveal CTA
    beginBtn.classList.add('is-visible');
    await wait(300);
    introHint.classList.add('is-visible');
  }

  // Intro no longer auto-starts — it now waits for unlockGate() to call it.


  /* ------------------------------------------------------------
     BEGIN OUR STORY — dismiss intro, start music, enter experience
     ------------------------------------------------------------ */
  const bgMusic = $('#bg-music');
  let musicUnlocked = false;
  let musicManuallyMuted = false;

  function fadeAudio(audio, targetVolume, duration = 1400) {
    return new Promise((resolve) => {
      const startVolume = audio.volume;
      const startTime = performance.now();

      function step(now) {
        const progress = Math.min((now - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
        audio.volume = startVolume + (targetVolume - startVolume) * eased;
        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          audio.volume = targetVolume;
          resolve();
        }
      }
      requestAnimationFrame(step);
    });
  }

  async function startMusic() {
    if (!bgMusic || musicManuallyMuted) return;
    try {
      bgMusic.volume = 0;
      await bgMusic.play();
      musicUnlocked = true;
      await fadeAudio(bgMusic, 0.55, 1800);
    } catch (err) {
      // Autoplay blocked or asset missing — fail silently, UI still works.
      musicUnlocked = false;
    }
  }

  beginBtn.addEventListener('click', async () => {
    beginBtn.disabled = true;
    startMusic();

    introSection.classList.add('is-leaving');
    await wait(1400);
    introSection.classList.add('is-gone');

    mainExperience.setAttribute('aria-hidden', 'false');
    mainExperience.classList.add('is-active');
    soundToggle.classList.remove('is-hidden');

    initSplitText();
    initScrollReveals();
    initTimelineProgress();
    initProgressRail();
  }, { once: true });

  /* ------------------------------------------------------------
     SOUND TOGGLE
     ------------------------------------------------------------ */
  soundToggle.addEventListener('click', () => {
    if (!bgMusic) return;
    if (bgMusic.paused || musicManuallyMuted) {
      musicManuallyMuted = false;
      soundToggle.classList.remove('is-muted');
      soundToggle.setAttribute('aria-pressed', 'true');
      if (bgMusic.paused) {
        bgMusic.play().catch(() => {});
      }
      fadeAudio(bgMusic, 0.55, 600);
    } else {
      musicManuallyMuted = true;
      soundToggle.classList.add('is-muted');
      soundToggle.setAttribute('aria-pressed', 'false');
      fadeAudio(bgMusic, 0, 500).then(() => bgMusic.pause());
    }
  });

  /* ------------------------------------------------------------
     SPLIT TEXT (hero title / eyebrow / subtitle)
     ------------------------------------------------------------ */
  function initSplitText() {
    $$('[data-split-text]').forEach((el, elIndex) => {
      const text = el.textContent;
      el.textContent = '';
      el.setAttribute('aria-label', text);

      const words = text.split(/(\s+)/); // keep whitespace tokens
      let charDelay = 0;

      words.forEach((word) => {
        if (word.trim() === '') {
          el.appendChild(document.createTextNode(word));
          return;
        }
        const wordSpan = document.createElement('span');
        wordSpan.style.display = 'inline-block';
        wordSpan.style.whiteSpace = 'nowrap';

        Array.from(word).forEach((char) => {
          const charSpan = document.createElement('span');
          charSpan.className = 'char';
          charSpan.textContent = char;
          charSpan.style.animationDelay = `${elIndex * 0.15 + charDelay}s`;
          charDelay += 0.028;
          wordSpan.appendChild(charSpan);
        });
        el.appendChild(wordSpan);
      });
    });
  }

  /* ------------------------------------------------------------
     SCROLL REVEALS — generic [data-reveal] + ending lines
     ------------------------------------------------------------ */
  function initScrollReveals() {
    const revealTargets = $$('[data-reveal]');

    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.18, rootMargin: '0px 0px -8% 0px' });

    revealTargets.forEach((el) => revealObserver.observe(el));

    // Ending sequence — staged, sequential reveal of each line
    const endingSection = $('#ending');
    const endingLines = $$('[data-line]', endingSection);
    let endingTriggered = false;

    const endingObserver = new IntersectionObserver(async (entries) => {
      entries.forEach(async (entry) => {
        if (entry.isIntersecting && !endingTriggered) {
          endingTriggered = true;
          endingObserver.disconnect();
          for (const line of endingLines) {
            line.classList.add('is-visible');
            await wait(prefersReducedMotion ? 0 : 420);
          }
          fadeAudio(bgMusic, 0, 3500);
        }
      });
    }, { threshold: 0.35 });

    endingObserver.observe(endingSection);
  }

  /* ------------------------------------------------------------
     TIMELINE SPINE PROGRESS FILL
     ------------------------------------------------------------ */
  function initTimelineProgress() {
    const timeline = $('#timeline');
    const timelineFill = $('#timeline-fill');
    if (!timeline || !timelineFill) return;

    function updateFill() {
      const rect = timeline.getBoundingClientRect();
      const viewportH = window.innerHeight;
      const total = rect.height;

      const start = viewportH * 0.75;
      const scrolled = start - rect.top;
      const ratio = Math.min(Math.max(scrolled / (total + start - viewportH * 0.25), 0), 1);

      timelineFill.style.height = `${ratio * 100}%`;
    }

    window.addEventListener('scroll', throttle(updateFill, 50), { passive: true });
    window.addEventListener('resize', throttle(updateFill, 100));
    updateFill();
  }

  /* ------------------------------------------------------------
     TOP PROGRESS RAIL (overall scroll position)
     ------------------------------------------------------------ */
  function initProgressRail() {
    const fill = $('#progress-fill');
    if (!fill) return;

    function updateRail() {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = docHeight > 0 ? scrollTop / docHeight : 0;
      fill.style.width = `${Math.min(Math.max(ratio, 0), 1) * 100}%`;
    }

    window.addEventListener('scroll', throttle(updateRail, 50), { passive: true });
    window.addEventListener('resize', throttle(updateRail, 100));
    updateRail();
  }

  function throttle(fn, wait) {
    let last = 0;
    let timeout = null;
    return (...args) => {
      const now = Date.now();
      const remaining = wait - (now - last);
      if (remaining <= 0) {
        last = now;
        fn(...args);
      } else if (!timeout) {
        timeout = setTimeout(() => {
          last = Date.now();
          timeout = null;
          fn(...args);
        }, remaining);
      }
    };
  }

  /* ------------------------------------------------------------
     AMBIENT PARTICLE CANVAS (floating golden particles)
     ------------------------------------------------------------ */
  function initParticles() {
    const canvas = $('#particle-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let particles = [];
    let w, h, dpr;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.width = window.innerWidth * dpr;
      h = canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
    }

    function makeParticles() {
      const count = Math.round((window.innerWidth * window.innerHeight) / 26000);
      particles = Array.from({ length: Math.min(count, 70) }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: (Math.random() * 1.6 + 0.4) * dpr,
        speedY: (Math.random() * 0.25 + 0.06) * dpr,
        driftX: (Math.random() - 0.5) * 0.12 * dpr,
        alpha: Math.random() * 0.5 + 0.15,
        twinkleSpeed: Math.random() * 0.015 + 0.004,
        twinklePhase: Math.random() * Math.PI * 2,
      }));
    }

    let frame = 0;
    function draw() {
      ctx.clearRect(0, 0, w, h);
      frame++;
      particles.forEach((p) => {
        p.y -= p.speedY;
        p.x += p.driftX + Math.sin(frame * 0.01 + p.twinklePhase) * 0.06 * dpr;
        if (p.y < -10) {
          p.y = h + 10;
          p.x = Math.random() * w;
        }
        const twinkle = (Math.sin(frame * p.twinkleSpeed + p.twinklePhase) + 1) / 2;
        const alpha = p.alpha * (0.5 + twinkle * 0.5);

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(232, 200, 116, ${alpha})`;
        ctx.shadowBlur = 6 * dpr;
        ctx.shadowColor = 'rgba(201,169,97,0.8)';
        ctx.fill();
      });
      requestAnimationFrame(draw);
    }

    resize();
    makeParticles();
    if (!prefersReducedMotion) requestAnimationFrame(draw);
    window.addEventListener('resize', throttle(() => { resize(); makeParticles(); }, 200));
  }

  initParticles();

  /* ------------------------------------------------------------
     STARFIELD FOR ENDING SECTION
     ------------------------------------------------------------ */
  function initStarfield() {
    const canvas = $('#stars-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let stars = [];
    let w, h, dpr;
    let started = false;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.parentElement.getBoundingClientRect();
      w = canvas.width = rect.width * dpr;
      h = canvas.height = rect.height * dpr;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
    }

    function makeStars() {
      const count = Math.round((w * h) / (9000 * dpr * dpr));
      stars = Array.from({ length: Math.min(count, 160) }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.3 * dpr + 0.2,
        twinkleSpeed: Math.random() * 0.02 + 0.005,
        twinklePhase: Math.random() * Math.PI * 2,
      }));
    }

    let frame = 0;
    function draw() {
      ctx.clearRect(0, 0, w, h);
      frame++;
      stars.forEach((s) => {
        const twinkle = (Math.sin(frame * s.twinkleSpeed + s.twinklePhase) + 1) / 2;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(245, 239, 230, ${0.25 + twinkle * 0.6})`;
        ctx.fill();
      });
      requestAnimationFrame(draw);
    }

    function start() {
      if (started) return;
      started = true;
      resize();
      makeStars();
      if (!prefersReducedMotion) requestAnimationFrame(draw);
      else { draw(); }
      window.addEventListener('resize', throttle(() => { resize(); makeStars(); }, 200));
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          start();
          observer.disconnect();
        }
      });
    }, { threshold: 0.05 });

    observer.observe($('#ending'));
  }

  initStarfield();

  /* ------------------------------------------------------------
     CURSOR GLOW (desktop, hover-capable devices only)
     ------------------------------------------------------------ */
  (function initCursorGlow() {
    const glow = $('.cursor-glow');
    if (!glow || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let glowX = mouseX;
    let glowY = mouseY;

    window.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    });

    function animateGlow() {
      glowX += (mouseX - glowX) * 0.09;
      glowY += (mouseY - glowY) * 0.09;
      glow.style.transform = `translate(${glowX}px, ${glowY}px) translate(-50%, -50%)`;
      requestAnimationFrame(animateGlow);
    }
    if (!prefersReducedMotion) requestAnimationFrame(animateGlow);
  })();

  /* ------------------------------------------------------------
     GALLERY LIGHTBOX
     ------------------------------------------------------------ */
  (function initLightbox() {
    const galleryItems = $$('.gallery__item img');
    const lightbox = $('#lightbox');
    const lightboxImg = $('#lightbox-img');
    const lightboxClose = $('#lightbox-close');
    const lightboxPrev = $('#lightbox-prev');
    const lightboxNext = $('#lightbox-next');
    const lightboxCounter = $('#lightbox-counter');

    if (!galleryItems.length || !lightbox) return;

    let currentIndex = 0;

    function openLightbox(index) {
      currentIndex = index;
      updateLightboxImage();
      lightbox.classList.add('is-open');
      lightbox.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }

    function closeLightbox() {
      lightbox.classList.remove('is-open');
      lightbox.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }

    function updateLightboxImage() {
      const img = galleryItems[currentIndex];
      lightboxImg.src = img.src;
      lightboxImg.alt = img.alt || '';
      lightboxCounter.textContent = `${currentIndex + 1} / ${galleryItems.length}`;
    }

    function showNext() {
      currentIndex = (currentIndex + 1) % galleryItems.length;
      updateLightboxImage();
    }
    function showPrev() {
      currentIndex = (currentIndex - 1 + galleryItems.length) % galleryItems.length;
      updateLightboxImage();
    }

    galleryItems.forEach((img, index) => {
      img.parentElement.addEventListener('click', () => openLightbox(index));
    });

    lightboxClose.addEventListener('click', closeLightbox);
    lightboxNext.addEventListener('click', showNext);
    lightboxPrev.addEventListener('click', showPrev);

    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) closeLightbox();
    });

    document.addEventListener('keydown', (e) => {
      if (!lightbox.classList.contains('is-open')) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') showNext();
      if (e.key === 'ArrowLeft') showPrev();
    });

    // Swipe support
    let touchStartX = 0;
    lightbox.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].clientX;
    }, { passive: true });

    lightbox.addEventListener('touchend', (e) => {
      const touchEndX = e.changedTouches[0].clientX;
      const delta = touchEndX - touchStartX;
      if (Math.abs(delta) > 50) {
        delta < 0 ? showNext() : showPrev();
      }
    }, { passive: true });
  })();

  /* ------------------------------------------------------------
     GLASS PANEL TILT — subtle pointer-tracked 3D tilt + glow follow
     ------------------------------------------------------------ */
  (function initGlassTilt() {
    if (prefersReducedMotion || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    const panels = $$('.glass-panel');
    const MAX_TILT = 6; // degrees

    panels.forEach((panel) => {
      let rect = null;

      panel.addEventListener('pointerenter', () => {
        rect = panel.getBoundingClientRect();
        panel.classList.add('is-active-glass');
      });

      panel.addEventListener('pointermove', (e) => {
        if (!rect) rect = panel.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width; // 0-1
        const py = (e.clientY - rect.top) / rect.height;  // 0-1

        const rotateY = (px - 0.5) * MAX_TILT * 2;
        const rotateX = (0.5 - py) * MAX_TILT * 2;

        panel.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-2px)`;
        panel.style.setProperty('--glow-x', `${px * 100}%`);
        panel.style.setProperty('--glow-y', `${py * 100}%`);
      });

      panel.addEventListener('pointerleave', () => {
        panel.classList.remove('is-active-glass');
        panel.style.transform = '';
        rect = null;
      });
    });
  })();

  /* ------------------------------------------------------------
     MOSAIC — pinch / scroll to zoom, drag to pan
     ------------------------------------------------------------ */
  (function initMosaicZoom() {
    const viewer = $('#mosaic-viewer');
    const canvas = $('#mosaic-canvas');
    const hint = $('#mosaic-hint');
    const resetBtn = $('#mosaic-reset');
    if (!viewer || !canvas) return;

    const MIN_SCALE = 1;
    const MAX_SCALE = 4;

    let scale = 1;
    let originX = 0;
    let originY = 0;
    let startX = 0;
    let startY = 0;
    let isPanning = false;
    let hasInteracted = false;

    function applyTransform() {
      canvas.style.transform = `translate(${originX}px, ${originY}px) scale(${scale})`;
    }

    function clampOrigin() {
      const rect = viewer.getBoundingClientRect();
      const maxX = (rect.width * (scale - 1)) / 2;
      const maxY = (rect.height * (scale - 1)) / 2;
      originX = Math.min(Math.max(originX, -maxX), maxX);
      originY = Math.min(Math.max(originY, -maxY), maxY);
    }

    function markInteracted() {
      if (hasInteracted) return;
      hasInteracted = true;
      hint.classList.add('is-hidden');
    }

    function updateUIState() {
      viewer.classList.toggle('is-zoomed', scale > MIN_SCALE + 0.01);
      resetBtn.classList.toggle('is-visible', scale > MIN_SCALE + 0.01);
    }

    function setScale(newScale, focalX, focalY) {
      const rect = viewer.getBoundingClientRect();
      const prevScale = scale;
      scale = Math.min(Math.max(newScale, MIN_SCALE), MAX_SCALE);

      if (focalX !== undefined && focalY !== undefined) {
        const cx = focalX - rect.left - rect.width / 2;
        const cy = focalY - rect.top - rect.height / 2;
        const ratio = scale / prevScale;
        originX = cx - (cx - originX) * ratio;
        originY = cy - (cy - originY) * ratio;
      }

      if (scale === MIN_SCALE) {
        originX = 0;
        originY = 0;
      }
      clampOrigin();
      applyTransform();
      updateUIState();
    }

    function resetZoom() {
      scale = MIN_SCALE;
      originX = 0;
      originY = 0;
      applyTransform();
      updateUIState();
    }

    resetBtn.addEventListener('click', resetZoom);

    /* Desktop: scroll wheel to zoom, drag to pan when zoomed */
    viewer.addEventListener('wheel', (e) => {
      e.preventDefault();
      markInteracted();
      const delta = -e.deltaY * 0.0016;
      setScale(scale + delta * scale, e.clientX, e.clientY);
    }, { passive: false });

    viewer.addEventListener('mousedown', (e) => {
      if (scale <= MIN_SCALE) return;
      isPanning = true;
      viewer.classList.add('is-panning');
      startX = e.clientX - originX;
      startY = e.clientY - originY;
    });
    window.addEventListener('mousemove', (e) => {
      if (!isPanning) return;
      originX = e.clientX - startX;
      originY = e.clientY - startY;
      clampOrigin();
      applyTransform();
    });
    window.addEventListener('mouseup', () => {
      isPanning = false;
      viewer.classList.remove('is-panning');
    });

    /* Double-click to zoom in/out on desktop */
    viewer.addEventListener('dblclick', (e) => {
      markInteracted();
      if (scale > MIN_SCALE) {
        resetZoom();
      } else {
        setScale(2.4, e.clientX, e.clientY);
      }
    });

    /* Touch: pinch to zoom, drag to pan, double-tap to zoom */
    let touchStartDist = 0;
    let touchStartScale = 1;
    let lastTapTime = 0;
    let singleTouchStartX = 0;
    let singleTouchStartY = 0;

    function getTouchDist(touches) {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.hypot(dx, dy);
    }
    function getTouchMidpoint(touches) {
      return {
        x: (touches[0].clientX + touches[1].clientX) / 2,
        y: (touches[0].clientY + touches[1].clientY) / 2,
      };
    }

    viewer.addEventListener('touchstart', (e) => {
      markInteracted();
      if (e.touches.length === 2) {
        touchStartDist = getTouchDist(e.touches);
        touchStartScale = scale;
      } else if (e.touches.length === 1) {
        const now = Date.now();
        if (now - lastTapTime < 320) {
          // Double tap
          const touch = e.touches[0];
          if (scale > MIN_SCALE) {
            resetZoom();
          } else {
            setScale(2.4, touch.clientX, touch.clientY);
          }
        }
        lastTapTime = now;
        singleTouchStartX = e.touches[0].clientX - originX;
        singleTouchStartY = e.touches[0].clientY - originY;
      }
    }, { passive: true });

    viewer.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dist = getTouchDist(e.touches);
        const mid = getTouchMidpoint(e.touches);
        const newScale = touchStartScale * (dist / touchStartDist);
        setScale(newScale, mid.x, mid.y);
      } else if (e.touches.length === 1 && scale > MIN_SCALE) {
        e.preventDefault();
        originX = e.touches[0].clientX - singleTouchStartX;
        originY = e.touches[0].clientY - singleTouchStartY;
        clampOrigin();
        applyTransform();
      }
    }, { passive: false });

    window.addEventListener('resize', () => {
      clampOrigin();
      applyTransform();
    });
  })();

  /* ------------------------------------------------------------
     VIDEO ↔ MUSIC DUCKING
     Music pauses when a video plays, resumes when it's paused/ended.
     ------------------------------------------------------------ */
  (function initVideoMusicDucking() {
    const videos = $$('.video-card__player');
    if (!videos.length || !bgMusic) return;

    let wasPlayingBeforeVideo = false;

    videos.forEach((video) => {
      video.addEventListener('play', () => {
        // Pause every other video so only one plays at a time
        videos.forEach((v) => { if (v !== video && !v.paused) v.pause(); });

        if (!bgMusic.paused && !musicManuallyMuted) {
          wasPlayingBeforeVideo = true;
          fadeAudio(bgMusic, 0, 500).then(() => bgMusic.pause());
        }
      });

      const resumeMusic = () => {
        if (wasPlayingBeforeVideo && !musicManuallyMuted) {
          bgMusic.play().then(() => fadeAudio(bgMusic, 0.55, 900)).catch(() => {});
        }
        wasPlayingBeforeVideo = false;
      };

      video.addEventListener('pause', resumeMusic);
      video.addEventListener('ended', resumeMusic);
    });
  })();

})();
