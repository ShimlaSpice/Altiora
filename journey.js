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
 *
 * Bug fixes vs original:
 *  - FIX 1: lastScroll reset on resize so parallax recalculates after mobile/desktop switch
 *  - FIX 2: dotIO threshold lowered to 0.3 so fast scrolls still register dot updates
 *  - FIX 3: Rail observer uses rootMargin instead of tiny threshold to correctly
 *           show/hide the rail when the journey section enters/leaves the viewport
 *  - FIX 4: Guard against missing data-ji attribute on scene elements
 *  - FIX 5: Removed unnecessary { passive: true } on resize (resize has no cancelable default)
 */

(function () {
  'use strict';

  /* ── Config ─────────────────────────────────────────────────────── */
  const PARALLAX_STRENGTH = 0.15; // 0 = no movement, 1 = full-speed with scroll
  const MOBILE_BREAKPOINT = 768;

  /* ── Detect environment ──────────────────────────────────────────── */
  const isMobile          = () => window.innerWidth < MOBILE_BREAKPOINT;
  const prefersReduced    = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const parallaxEnabled   = () => !isMobile() && !prefersReduced;

  /* ── Element refs ────────────────────────────────────────────────── */
  const journey   = document.getElementById('altJourney');
  const rail      = document.getElementById('jProgress');

  if (!journey) return; // Nothing to do if journey doesn't exist on this page

  const scenes    = [...journey.querySelectorAll('.jscene')];
  const svgLayers = scenes.map(s => s.querySelector('.jscene-svg'));
  const dots      = rail ? [...rail.querySelectorAll('.j-pdot')] : [];

  /* ── 1. PARALLAX via rAF ─────────────────────────────────────────── */
  let rafId      = null;
  let lastScroll = -1;

  /**
   * Apply parallax offset to each scene's SVG layer.
   * Reads are batched before writes to avoid layout thrashing.
   */
  function applyParallax() {
    if (!parallaxEnabled()) {
      // Clear any stale transform if we've switched to mobile
      svgLayers.forEach(svg => { if (svg) svg.style.transform = ''; });
      return;
    }

    const scrollY = window.scrollY;
    if (scrollY === lastScroll) return; // Nothing changed — skip work
    lastScroll = scrollY;

    // Batch reads first, then batch writes — avoids layout thrashing
    const rects = scenes.map(s => s.getBoundingClientRect());

    scenes.forEach((scene, i) => {
      const svg = svgLayers[i];
      if (!svg) return;

      const rect   = rects[i];
      const center = rect.top + rect.height / 2;
      const offset = (window.innerHeight / 2 - center) * PARALLAX_STRENGTH;

      svg.style.transform = `translateY(${offset.toFixed(2)}px)`;
    });
  }

  function onScroll() {
    if (rafId) return; // Already scheduled — don't stack rAF calls
    rafId = requestAnimationFrame(() => {
      applyParallax();
      rafId = null;
    });
  }

  // Run once on load, then listen for scroll
  applyParallax();
  window.addEventListener('scroll', onScroll, { passive: true });

  // FIX 1: Reset lastScroll on resize so parallax fully recalculates
  // after a mobile ↔ desktop viewport switch
  window.addEventListener('resize', () => {
    lastScroll = -1; // Force recalculation on next scroll/rAF
    if (!parallaxEnabled()) {
      svgLayers.forEach(svg => { if (svg) svg.style.transform = ''; });
    } else {
      applyParallax();
    }
  });

  /* ── 2. PROGRESS RAIL ────────────────────────────────────────────── */
  if (rail) {
    // FIX 2: Use rootMargin instead of a tiny threshold for a tall multi-scene
    // journey container. The original threshold: 0.02 is unreliable on elements
    // that span 500vh — the element is almost always partially intersecting.
    // rootMargin: '0px' with threshold: 0 fires cleanly on entry/exit.
    new IntersectionObserver(
      entries => entries.forEach(e => rail.classList.toggle('vis', e.isIntersecting)),
      { threshold: 0, rootMargin: '0px' }
    ).observe(journey);

    // FIX 3: Lowered threshold from 0.45 → 0.3 so dots still update
    // when a user scrolls quickly through a scene (45% may never be reached)
    // FIX 4: Guard against scenes missing the data-ji attribute
    const dotIO = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          if (!e.isIntersecting) return;
          const raw = e.target.dataset.ji;
          if (raw === undefined || raw === '') return; // FIX 4: skip elements without data-ji
          const idx = parseInt(raw, 10);
          if (isNaN(idx)) return;
          dots.forEach((d, di) => d.classList.toggle('on', di === idx));
        });
      },
      { threshold: 0.3 } // FIX 3: was 0.45
    );
    scenes.forEach(s => dotIO.observe(s));
  }

  /* ── 3. SCROLL REVEAL for .j-reveal elements ─────────────────────── */
  const revealIO = new IntersectionObserver(
    entries => entries.forEach(e => {
      if (e.isIntersecting) e.target.classList.add('visible');
    }),
    { threshold: 0.2 }
  );
  journey.querySelectorAll('.j-reveal').forEach(el => revealIO.observe(el));

})();
