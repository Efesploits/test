/* ============================================================
   BERKAY CABBAR — EVOLUTION :: STORY / KRONOLOJİ
   Owner: story agent. Section id="hikaye".
   Drives: the self-drawing rail (stroke-dashoffset), the comet
   that follows section scroll progress, node lighting, the
   green -> cyan hue shift (--story-p), the pointer light sweep
   on each card and the odd/even parallax drift.
   Depends on window.BC (core.js) but degrades without it.
   ============================================================ */
(function () {
  'use strict';

  var section = document.getElementById('hikaye');
  if (!section) return;

  var BC = window.BC = window.BC || {};

  var timeline = section.querySelector('.story__timeline');
  var rail = section.querySelector('.story__rail');
  if (!timeline || !rail) return;

  var drawPaths = rail.querySelectorAll('.story__rail-draw, .story__rail-halo');
  var itemNodes = section.querySelectorAll('.story__item');
  if (!itemNodes.length) return;

  /* ==========================================================
     1. Helpers (all with graceful fallbacks)
     ========================================================== */
  var mqReduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

  function readReduced() {
    if (BC.reduced === true) return true;
    return !!(mqReduce && mqReduce.matches);
  }

  function isTouch() {
    if (typeof BC.isTouch === 'boolean') return BC.isTouch;
    if (window.matchMedia && window.matchMedia('(hover: none) and (pointer: coarse)').matches) return true;
    return ('ontouchstart' in window) && (navigator.maxTouchPoints || 0) > 0;
  }

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  function scrollTop() {
    return window.pageYOffset || document.documentElement.scrollTop || 0;
  }

  var debounce = typeof BC.debounce === 'function' ? BC.debounce : function (fn, wait) {
    var t = 0;
    return function () {
      var args = arguments;
      var ctx = this;
      window.clearTimeout(t);
      t = window.setTimeout(function () { fn.apply(ctx, args); }, wait || 120);
    };
  };

  function observe(el, cb, opts) {
    if (!el || typeof cb !== 'function') return;
    if (typeof BC.onVisible === 'function') { BC.onVisible(el, cb, opts); return; }
    if (!('IntersectionObserver' in window)) { cb(true, null); return; }
    var o = opts || {};
    var io = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].isIntersecting) cb(true, entries[i]);
        else if (o.both) cb(false, entries[i]);
      }
    }, {
      rootMargin: o.rootMargin || '0px',
      threshold: typeof o.threshold === 'number' ? o.threshold : 0.15
    });
    io.observe(el);
  }

  var reduced = readReduced();
  var touch = isTouch();

  /* ==========================================================
     2. Chapter records
     ========================================================== */
  var items = [];
  var i;

  for (i = 0; i < itemNodes.length; i++) {
    var el = itemNodes[i];
    var index = parseInt(el.getAttribute('data-index'), 10) || (i + 1);
    items.push({
      el: el,
      slot: el.querySelector('.story__slot'),
      card: el.querySelector('.story__card'),
      node: el.querySelector('.story__node'),
      /* odd chapters drift a touch slower than the even ones */
      factor: (index % 2 === 1) ? 0.030 : 0.066,
      ratio: itemNodes.length > 1 ? i / (itemNodes.length - 1) : 1,
      centerDoc: 0,
      offset: 0,
      lit: false
    });
  }

  var timelineTop = 0;
  var timelineH = 1;
  var parallaxOn = false;
  var inView = false;
  var current = 0;
  var target = 0;
  var rafId = 0;
  var lastApplied = -1;

  /* ==========================================================
     3. Measurement
     ========================================================== */
  function measure() {
    var sy = scrollTop();
    var tRect = timeline.getBoundingClientRect();
    timelineTop = tRect.top + sy;
    timelineH = tRect.height > 0 ? tRect.height : 1;

    for (var k = 0; k < items.length; k++) {
      var rec = items[k];
      var iRect = rec.el.getBoundingClientRect();
      rec.centerDoc = iRect.top + sy + iRect.height / 2;
      var anchor = rec.node || rec.el;
      var nRect = anchor.getBoundingClientRect();
      rec.ratio = clamp(((nRect.top + sy + nRect.height / 2) - timelineTop) / timelineH, 0, 1);
    }

    parallaxOn = !reduced && window.innerWidth >= 700;
    if (!parallaxOn) clearParallax();
    lastApplied = -1;
  }

  function clearParallax() {
    for (var k = 0; k < items.length; k++) {
      if (!items[k].slot) continue;
      items[k].slot.style.transform = '';
      items[k].offset = 0;
    }
  }

  /* ==========================================================
     4. Scroll progress of this section (0..1)
     ========================================================== */
  function computeTarget() {
    var vh = window.innerHeight || 1;
    var start = timelineTop - vh * 0.78;
    var end = timelineTop + timelineH - vh * 0.42;
    var span = end - start;
    if (span < 80) span = timelineH;
    if (span <= 0) return 1;
    return clamp((scrollTop() - start) / span, 0, 1);
  }

  /* ==========================================================
     5. Painting
     ========================================================== */
  function apply(p) {
    if (Math.abs(p - lastApplied) > 0.0004) {
      lastApplied = p;
      var txt = p.toFixed(4);
      section.style.setProperty('--story-p', txt);
      var off = (1 - p).toFixed(4);
      for (var d = 0; d < drawPaths.length; d++) {
        drawPaths[d].style.strokeDashoffset = off;
      }
      for (var k = 0; k < items.length; k++) {
        var rec = items[k];
        var lit = p >= rec.ratio - 0.006;
        if (lit !== rec.lit) {
          rec.lit = lit;
          rec.el.classList.toggle('is-lit', lit);
        }
      }
    }
    if (parallaxOn) applyParallax();
  }

  function applyParallax() {
    var vhHalf = (window.innerHeight || 0) / 2;
    var sy = scrollTop();
    for (var k = 0; k < items.length; k++) {
      var rec = items[k];
      if (!rec.slot) continue;
      var rel = rec.centerDoc - sy - vhHalf;
      var y = clamp(-rel * rec.factor, -22, 22);
      if (Math.abs(y - rec.offset) < 0.08) continue;
      rec.offset = y;
      rec.slot.style.transform = 'translate3d(0,' + y.toFixed(2) + 'px,0)';
    }
  }

  /* ==========================================================
     6. Animation loop (lerped, pauses offscreen / when hidden)
     ========================================================== */
  function schedule() {
    if (rafId || document.hidden || !inView) return;
    rafId = window.requestAnimationFrame(frame);
  }

  function frame() {
    rafId = 0;
    var diff = target - current;
    if (Math.abs(diff) < 0.0004) current = target;
    else current += diff * 0.16;
    apply(current);
    if (current !== target) schedule();
  }

  function onScroll() {
    if (!inView || document.hidden) return;
    target = computeTarget();
    if (reduced) {
      current = target;
      apply(current);
      return;
    }
    schedule();
  }

  function refresh() {
    measure();
    target = computeTarget();
    current = target;
    apply(current);
  }

  /* ==========================================================
     7. Pointer light sweep (--mx / --my on each card)
     ========================================================== */
  function bindSweep(rec) {
    var card = rec.card;
    if (!card) return;

    var raf = 0;
    var px = 0;
    var py = 0;

    function write() {
      raf = 0;
      var r = card.getBoundingClientRect();
      if (!r.width || !r.height) return;
      var mx = clamp(((px - r.left) / r.width) * 100, -20, 120);
      var my = clamp(((py - r.top) / r.height) * 100, -20, 120);
      card.style.setProperty('--mx', mx.toFixed(2) + '%');
      card.style.setProperty('--my', my.toFixed(2) + '%');
    }

    function onMove(e) {
      if (e.pointerType === 'touch') return;
      px = e.clientX;
      py = e.clientY;
      if (!raf) raf = window.requestAnimationFrame(write);
    }

    function onEnter(e) {
      if (e.pointerType === 'touch') return;
      card.classList.add('is-hot');
      onMove(e);
    }

    function onLeave() {
      card.classList.remove('is-hot');
      if (raf) { window.cancelAnimationFrame(raf); raf = 0; }
    }

    if (window.PointerEvent) {
      card.addEventListener('pointerenter', onEnter, { passive: true });
      card.addEventListener('pointermove', onMove, { passive: true });
      card.addEventListener('pointerleave', onLeave, { passive: true });
      card.addEventListener('pointercancel', onLeave, { passive: true });
    } else {
      card.addEventListener('mouseenter', function (e) { onEnter({ clientX: e.clientX, clientY: e.clientY }); }, { passive: true });
      card.addEventListener('mousemove', function (e) { onMove({ clientX: e.clientX, clientY: e.clientY }); }, { passive: true });
      card.addEventListener('mouseleave', onLeave, { passive: true });
    }
  }

  /* ==========================================================
     8. Wiring
     ========================================================== */
  /* per-chapter "is-live" gate: icon loops only run on screen */
  for (i = 0; i < items.length; i++) {
    (function (rec) {
      observe(rec.el, function (visible) {
        rec.el.classList.toggle('is-live', !!visible);
      }, { both: true, threshold: 0.2 });
      if (!touch) bindSweep(rec);
    })(items[i]);
  }

  /* section gate: rail sparks + scroll math only while on screen */
  observe(section, function (visible) {
    inView = !!visible;
    section.classList.toggle('is-live', inView && !reduced);
    if (!inView) {
      if (rafId) { window.cancelAnimationFrame(rafId); rafId = 0; }
      return;
    }
    measure();
    onScroll();
  }, { both: true, threshold: 0, rootMargin: '15% 0px 15% 0px' });

  var onResize = debounce(function () {
    reduced = readReduced();
    refresh();
  }, 160);

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize, { passive: true });
  window.addEventListener('orientationchange', onResize, { passive: true });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      if (rafId) { window.cancelAnimationFrame(rafId); rafId = 0; }
    } else if (inView) {
      onScroll();
    }
  });

  if (typeof BC.on === 'function') {
    BC.on('preloader:done', function () { window.setTimeout(refresh, 60); });
    BC.on('bc:ready', function () { refresh(); });
    BC.on('motion:change', function (isReduced) {
      reduced = !!isReduced;
      section.classList.toggle('is-live', inView && !reduced);
      refresh();
    });
  }

  if (mqReduce) {
    var onMq = function (e) {
      reduced = !!e.matches;
      section.classList.toggle('is-live', inView && !reduced);
      refresh();
    };
    if (mqReduce.addEventListener) mqReduce.addEventListener('change', onMq);
    else if (mqReduce.addListener) mqReduce.addListener(onMq);
  }

  window.addEventListener('load', function () { window.setTimeout(refresh, 80); }, { once: true });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', refresh, { once: true });
  } else {
    refresh();
  }
})();
