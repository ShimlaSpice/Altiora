/**
 * journey.js — Altiora altitude journey
 *
 * Responsibilities:
 *  1. Parallax: SVG layers move at 0.15× scroll speed (very subtle)
 *  2. Progress rail: highlights current scene dot
 *  3. Scroll reveal: fades in .j-reveal elements
 *
 * Performance contract:
 *  - All DOM reads happen in a single rAF callback (no layout thrashing)
 *  - Transforms use translateY only (compositor-friendly)
 *  - Parallax disabled on mobile (< 768px) and prefers-reduced-motion
 *  - IntersectionObserver handles reveal + progress (no scroll listener needed for those)
 */

(function () {
  'use strict';

  /* ── Config ─────────────────────────────────────────────────────── */
  const PARALLAX_STRENGTH = 0.15; // 0 = no movement, 1 = full-speed with scroll
  const MOBILE_BREAKPOINT = 768;

  /* ── Detect environment ──────────────────────────────────────────── */
  const isMobile = () => window.innerWidth < MOBILE_BREAKPOINT;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const parallaxEnabled = () => !isMobile() && !prefersReducedMotion;

  /* ── Element refs ────────────────────────────────────────────────── */
  const journey = document.getElementById('altJourney');
  const rail    = document.getElementById('jProgress');

  if (!journey) return; // Nothing to do if journey doesn't exist

  const scenes  = [...journey.querySelectorAll('.jscene')];
  const svgLayers = scenes.map(s => s.querySelector('.jscene-svg'));
  const dots    = rail ? [...rail.querySelectorAll('.j-pdot')] : [];

  /* ── 1. PARALLAX via rAF ─────────────────────────────────────────── */
  let rafId      = null;
  let lastScroll = -1;

  /**
   * Apply parallax offset to each scene's SVG layer.
   * Reads are batched before writes to avoid layout thrashing.
   */
  function applyParallax() {
    if (!parallaxEnabled()) {
      // Ensure no stale transform lingers if viewport is resized to mobile
      svgLayers.forEach(svg => { if (svg) svg.style.transform = ''; });
      return;
    }

    const scrollY = window.scrollY;
    if (scrollY === lastScroll) return; // Nothing changed
    lastScroll = scrollY;

    // Batch: read all bounding rects first
    const rects = scenes.map(s => s.getBoundingClientRect());

    // Batch: write transforms
    scenes.forEach((scene, i) => {
      const svg = svgLayers[i];
      if (!svg) return;

      const rect   = rects[i];
      const center = rect.top + rect.height / 2; // Distance of scene centre from viewport top
      const offset = (window.innerHeight / 2 - center) * PARALLAX_STRENGTH;

      svg.style.transform = `translateY(${offset.toFixed(2)}px)`;
    });
  }

  function onScroll() {
    if (rafId) return; // Already scheduled
    rafId = requestAnimationFrame(() => {
      applyParallax();
      rafId = null;
    });
  }

  // Initial application + listener
  applyParallax();
  window.addEventListener('scroll', onScroll, { passive: true });

  // Re-evaluate on resize (mobile/desktop switch)
  window.addEventListener('resize', () => {
    if (!parallaxEnabled()) {
      svgLayers.forEach(svg => { if (svg) svg.style.transform = ''; });
    } else {
      applyParallax();
    }
  }, { passive: true });

  /* ── 2. PROGRESS RAIL — show while journey is in viewport ──────── */
  if (rail) {
    new IntersectionObserver(
      entries => entries.forEach(e => rail.classList.toggle('vis', e.isIntersecting)),
      { threshold: 0.02 }
    ).observe(journey);

    // Update active dot for whichever scene is most visible
    const dotIO = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          if (!e.isIntersecting) return;
          const idx = parseInt(e.target.dataset.ji, 10);
          if (isNaN(idx)) return;
          dots.forEach((d, di) => d.classList.toggle('on', di === idx));
        });
      },
      { threshold: 0.45 }
    );
    scenes.forEach(s => dotIO.observe(s));
  }

  /* ── 3. SCROLL REVEAL for .j-reveal elements ─────────────────────── */
  const revealIO = new IntersectionObserver(
    entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
    { threshold: 0.2 }
  );
  journey.querySelectorAll('.j-reveal').forEach(el => revealIO.observe(el));

})();
