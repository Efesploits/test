/* ============================================================
   BERKAY CABBAR — EVOLUTION :: CORE RUNTIME
   Owner: core agent. MUST be the first script on the page.
   Exposes window.BC (helpers + event bus), builds the animated
   backdrop, the reveal observer, the scroll-progress bar and
   the custom cursor, and owns smooth anchor navigation.
   ============================================================ */
(function () {
  'use strict';

  var root = document.documentElement;
  var BC = window.BC = window.BC || {};

  /* --------------------------------------------------------
     1. Tiny event bus (with latched lifecycle events)
     -------------------------------------------------------- */
  var handlers = Object.create(null);
  var latchedNames = { 'preloader:done': 1, 'bc:ready': 1 };
  var latched = Object.create(null);

  BC.on = function (name, fn) {
    if (typeof name !== 'string' || typeof fn !== 'function') return function () {};
    (handlers[name] || (handlers[name] = [])).push(fn);
    if (latchedNames[name] && Object.prototype.hasOwnProperty.call(latched, name)) {
      try { fn(latched[name]); } catch (err) { logError(err); }
    }
    return function off() { BC.off(name, fn); };
  };

  BC.off = function (name, fn) {
    var list = handlers[name];
    if (!list) return;
    for (var i = list.length - 1; i >= 0; i--) {
      if (list[i] === fn) list.splice(i, 1);
    }
  };

  BC.emit = function (name, payload) {
    if (typeof name !== 'string') return;
    if (latchedNames[name]) latched[name] = payload;
    var list = handlers[name];
    if (!list || !list.length) return;
    var snapshot = list.slice();
    for (var i = 0; i < snapshot.length; i++) {
      try { snapshot[i](payload); } catch (err) { logError(err); }
    }
  };

  function logError(err) {
    if (window.console && console.warn) console.warn('[BC]', err);
  }

  /* --------------------------------------------------------
     2. Environment flags + math helpers
     -------------------------------------------------------- */
  var mqReduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

  BC.reduced = !!(mqReduce && mqReduce.matches);

  BC.isTouch = (function () {
    if (window.matchMedia && window.matchMedia('(hover: none) and (pointer: coarse)').matches) return true;
    return ('ontouchstart' in window) && (navigator.maxTouchPoints || 0) > 0;
  })();

  BC.prefersLowPower = (navigator.hardwareConcurrency || 8) <= 4 || window.innerWidth < 720;

  BC.dpr = function () {
    var d = window.devicePixelRatio || 1;
    return Math.min(d, BC.prefersLowPower ? 1.5 : 2);
  };

  BC.lerp = function (a, b, t) { return a + (b - a) * t; };

  BC.clamp = function (v, min, max) { return v < min ? min : (v > max ? max : v); };

  BC.map = function (v, a, b, c, d) {
    if (b === a) return c;
    return c + (d - c) * ((v - a) / (b - a));
  };

  BC.rafThrottle = function (fn) {
    var queued = false;
    var lastArgs = null;
    var lastThis = null;
    function run() {
      queued = false;
      var args = lastArgs;
      var ctx = lastThis;
      lastArgs = null;
      lastThis = null;
      try { fn.apply(ctx, args || []); } catch (err) { logError(err); }
    }
    return function throttled() {
      lastArgs = Array.prototype.slice.call(arguments);
      lastThis = this;
      if (queued) return;
      queued = true;
      window.requestAnimationFrame(run);
    };
  };

  BC.debounce = function (fn, wait) {
    var t = 0;
    return function debounced() {
      var args = arguments;
      var ctx = this;
      window.clearTimeout(t);
      t = window.setTimeout(function () { fn.apply(ctx, args); }, wait || 120);
    };
  };

  /**
   * onVisible(el, cb, opts) -> IntersectionObserver | null
   * cb(isVisible, entry). Fires only when the element becomes visible
   * unless opts.both is true (then it also fires on exit with false).
   * opts: { threshold, rootMargin, once, both, root }
   */
  BC.onVisible = function (el, cb, opts) {
    if (!el || typeof cb !== 'function') return null;
    var o = opts || {};
    if (!('IntersectionObserver' in window)) {
      try { cb(true, null); } catch (err) { logError(err); }
      return null;
    }
    var io = new IntersectionObserver(function (entries, obs) {
      for (var i = 0; i < entries.length; i++) {
        var entry = entries[i];
        if (entry.isIntersecting) {
          try { cb(true, entry); } catch (err) { logError(err); }
          if (o.once) obs.unobserve(entry.target);
        } else if (o.both) {
          try { cb(false, entry); } catch (err) { logError(err); }
        }
      }
    }, {
      root: o.root || null,
      rootMargin: o.rootMargin || '0px',
      threshold: typeof o.threshold === 'number' ? o.threshold : (o.threshold || 0.15)
    });
    io.observe(el);
    return io;
  };

  /* Live reduced-motion updates. */
  function applyReducedClass() { root.classList.toggle('bc-reduced', BC.reduced); }
  applyReducedClass();
  if (BC.prefersLowPower) root.classList.add('bc-lite');
  if (BC.isTouch) root.classList.add('bc-touch');

  function handleReduceChange(e) {
    BC.reduced = !!e.matches;
    applyReducedClass();
    if (BC.reduced) {
      revealEverything();
      teardownCursor();
    } else {
      setupCursor();
    }
    BC.emit('motion:change', BC.reduced);
  }
  if (mqReduce) {
    if (mqReduce.addEventListener) mqReduce.addEventListener('change', handleReduceChange);
    else if (mqReduce.addListener) mqReduce.addListener(handleReduceChange);
  }

  /* --------------------------------------------------------
     3. Animated global backdrop
     -------------------------------------------------------- */
  function buildBackdrop() {
    if (document.getElementById('bc-backdrop')) return;
    var body = document.body;
    if (!body) return;
    var wrap = document.createElement('div');
    wrap.id = 'bc-backdrop';
    wrap.setAttribute('aria-hidden', 'true');
    var layers = ['mesh', 'conic', 'grid', 'lines', 'noise', 'vignette'];
    for (var i = 0; i < layers.length; i++) {
      var layer = document.createElement('div');
      layer.className = 'bc-backdrop__' + layers[i];
      wrap.appendChild(layer);
    }
    body.insertBefore(wrap, body.firstChild);
  }

  /* --------------------------------------------------------
     4. Reveal system
     -------------------------------------------------------- */
  var REVEAL_SELECTOR = '[class*="reveal"]';
  var revealObserver = null;

  function revealEverything(scope) {
    var nodes = (scope || document).querySelectorAll(REVEAL_SELECTOR);
    for (var i = 0; i < nodes.length; i++) nodes[i].classList.add('is-visible');
  }

  function getRevealObserver() {
    if (revealObserver) return revealObserver;
    if (!('IntersectionObserver' in window)) return null;
    revealObserver = new IntersectionObserver(function (entries, obs) {
      var batch = 0;
      for (var i = 0; i < entries.length; i++) {
        var entry = entries[i];
        if (!entry.isIntersecting) continue;
        var el = entry.target;
        var attr = el.getAttribute('data-delay');
        /* auto-stagger, capped so a big batch never waits too long */
        var delay = attr === null ? Math.min(batch, 6) * 70 : (parseInt(attr, 10) || 0);
        batch++;
        (function (node, ms) {
          if (ms <= 0) { node.classList.add('is-visible'); return; }
          window.setTimeout(function () { node.classList.add('is-visible'); }, ms);
        })(el, delay);
        obs.unobserve(el);
      }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    return revealObserver;
  }

  /**
   * Registers every [class*="reveal"] element inside `scope` (default: document).
   * Safe to call repeatedly — already-registered nodes are skipped.
   */
  BC.observeReveals = function (scope) {
    if (BC.reduced) { revealEverything(scope); return; }
    var obs = getRevealObserver();
    var nodes = (scope || document).querySelectorAll(REVEAL_SELECTOR);
    if (!obs) {
      for (var j = 0; j < nodes.length; j++) nodes[j].classList.add('is-visible');
      return;
    }
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (el.getAttribute('data-bc-rev') === '1') continue;
      el.setAttribute('data-bc-rev', '1');
      obs.observe(el);
    }
  };

  /* --------------------------------------------------------
     5. Scroll progress bar + CSS scroll variables
     -------------------------------------------------------- */
  var progressEl = null;
  var progressBar = null;

  function buildProgress() {
    if (document.getElementById('bc-progress')) return;
    var body = document.body;
    if (!body) return;
    progressEl = document.createElement('div');
    progressEl.id = 'bc-progress';
    progressEl.setAttribute('aria-hidden', 'true');
    progressBar = document.createElement('i');
    progressBar.className = 'bc-progress__bar';
    var dot = document.createElement('i');
    dot.className = 'bc-progress__dot';
    progressEl.appendChild(progressBar);
    progressEl.appendChild(dot);
    body.appendChild(progressEl);
  }

  function scrollProgress() {
    var doc = document.documentElement;
    var max = (doc.scrollHeight || 0) - window.innerHeight;
    if (max <= 0) return 0;
    var y = window.pageYOffset || doc.scrollTop || 0;
    return BC.clamp(y / max, 0, 1);
  }

  var lastProgress = -1;

  var updateScroll = BC.rafThrottle(function () {
    var p = scrollProgress();
    if (Math.abs(p - lastProgress) < 0.0005) return;
    lastProgress = p;
    root.style.setProperty('--scroll-progress', p.toFixed(4));
    if (progressBar) progressBar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
    if (progressEl) progressEl.classList.toggle('is-active', p > 0.005);
    BC.scrollProgress = p;
    BC.emit('scroll', p);
  });

  function updateViewportVar() {
    root.style.setProperty('--vh', (window.innerHeight * 0.01).toFixed(3) + 'px');
    lastProgress = -1;
    updateScroll();
  }

  /* --------------------------------------------------------
     6. Custom cursor
     -------------------------------------------------------- */
  var cursor = null;
  var cursorRing = null;
  var cursorDot = null;
  var cursorLabel = null;
  var cursorRaf = 0;
  var mouse = { x: 0, y: 0 };
  var ring = { x: 0, y: 0 };
  var cursorAwake = false;
  var dotScaleTarget = 1;
  var dotScale = 1;

  function setupCursor() {
    if (BC.isTouch || BC.reduced) return;
    if (document.getElementById('bc-cursor')) return;
    var body = document.body;
    if (!body) return;

    cursor = document.createElement('div');
    cursor.id = 'bc-cursor';
    cursor.setAttribute('aria-hidden', 'true');

    cursorRing = document.createElement('div');
    cursorRing.className = 'bc-cursor__ring';
    cursorLabel = document.createElement('span');
    cursorLabel.className = 'bc-cursor__label';
    cursorRing.appendChild(cursorLabel);

    cursorDot = document.createElement('div');
    cursorDot.className = 'bc-cursor__dot';

    cursor.appendChild(cursorRing);
    cursor.appendChild(cursorDot);
    body.appendChild(cursor);
    root.classList.add('bc-cursor-on');

    mouse.x = ring.x = window.innerWidth / 2;
    mouse.y = ring.y = window.innerHeight / 2;

    document.addEventListener('mousemove', onMouseMove, { passive: true });
    document.addEventListener('mouseover', onCursorOver, { passive: true });
    document.addEventListener('mouseout', onCursorOut, { passive: true });
    document.addEventListener('mousedown', onCursorDown, { passive: true });
    document.addEventListener('mouseup', onCursorUp, { passive: true });
    document.addEventListener('mouseleave', onCursorLeave, { passive: true });
    document.addEventListener('mouseenter', onCursorEnter, { passive: true });

    cursorRaf = window.requestAnimationFrame(cursorLoop);
  }

  function teardownCursor() {
    if (!cursor) return;
    window.cancelAnimationFrame(cursorRaf);
    cursorRaf = 0;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseover', onCursorOver);
    document.removeEventListener('mouseout', onCursorOut);
    document.removeEventListener('mousedown', onCursorDown);
    document.removeEventListener('mouseup', onCursorUp);
    document.removeEventListener('mouseleave', onCursorLeave);
    document.removeEventListener('mouseenter', onCursorEnter);
    if (cursor.parentNode) cursor.parentNode.removeChild(cursor);
    root.classList.remove('bc-cursor-on');
    cursor = cursorRing = cursorDot = cursorLabel = null;
    cursorAwake = false;
  }

  function onMouseMove(e) {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    if (!cursorAwake && cursor) {
      cursorAwake = true;
      ring.x = mouse.x;
      ring.y = mouse.y;
      cursor.classList.add('is-awake');
    }
  }

  function hotTarget(node) {
    if (!node || node.nodeType !== 1 || !node.closest) return null;
    return node.closest('[data-cursor], a[href], button, [role="button"], input, textarea, select, summary');
  }

  function onCursorOver(e) {
    if (!cursor) return;
    var t = hotTarget(e.target);
    if (!t) return;
    var label = t.getAttribute('data-cursor');
    if (cursorLabel) cursorLabel.textContent = label || '';
    cursor.classList.add('is-hot');
  }

  function onCursorOut(e) {
    if (!cursor) return;
    var from = hotTarget(e.target);
    if (!from) return;
    var to = hotTarget(e.relatedTarget);
    if (to === from) return;
    cursor.classList.remove('is-hot');
    if (cursorLabel) cursorLabel.textContent = '';
  }

  function onCursorDown() { dotScaleTarget = 2.4; if (cursor) cursor.classList.add('is-down'); }
  function onCursorUp() { dotScaleTarget = 1; if (cursor) cursor.classList.remove('is-down'); }
  function onCursorLeave() { if (cursor) cursor.classList.remove('is-awake'); cursorAwake = false; }
  function onCursorEnter() { if (cursor && cursorAwake) cursor.classList.add('is-awake'); }

  function cursorLoop() {
    if (!cursor) return;
    ring.x = BC.lerp(ring.x, mouse.x, 0.17);
    ring.y = BC.lerp(ring.y, mouse.y, 0.17);
    dotScale = BC.lerp(dotScale, dotScaleTarget, 0.22);
    if (cursorDot) {
      cursorDot.style.transform =
        'translate3d(' + mouse.x + 'px,' + mouse.y + 'px,0) scale(' + dotScale.toFixed(3) + ')';
    }
    if (cursorRing) {
      cursorRing.style.transform = 'translate3d(' + ring.x.toFixed(2) + 'px,' + ring.y.toFixed(2) + 'px,0)';
    }
    cursorRaf = window.requestAnimationFrame(cursorLoop);
  }

  /* --------------------------------------------------------
     7. Smooth anchor navigation + focus management
     -------------------------------------------------------- */
  function navOffset() {
    var nav = document.querySelector('.bc-nav');
    var h = nav ? nav.offsetHeight : 0;
    if (!h) {
      var css = parseInt(getComputedStyle(root).getPropertyValue('--bc-nav-h'), 10);
      h = isNaN(css) ? 72 : css;
    }
    return h + 14;
  }

  function scrollToY(y) {
    var top = Math.max(0, Math.round(y));
    if (BC.reduced || !('scrollBehavior' in root.style)) {
      window.scrollTo(0, top);
      return;
    }
    try {
      window.scrollTo({ top: top, behavior: 'smooth' });
    } catch (err) {
      window.scrollTo(0, top);
    }
  }

  BC.scrollToEl = function (target) {
    if (!target) return;
    var y = target.getBoundingClientRect().top + (window.pageYOffset || 0) - navOffset();
    scrollToY(y);
    focusTarget(target);
  };

  function focusTarget(target) {
    if (!target || !target.focus) return;
    var hadTabIndex = target.hasAttribute('tabindex');
    if (!hadTabIndex) target.setAttribute('tabindex', '-1');
    try { target.focus({ preventScroll: true }); } catch (err) { target.focus(); }
    if (!hadTabIndex) {
      target.addEventListener('blur', function clean() {
        target.removeAttribute('tabindex');
        target.removeEventListener('blur', clean);
      });
    }
  }

  function onDocumentClick(e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var node = e.target;
    if (!node || !node.closest) return;
    var link = node.closest('a[href]');
    if (!link) return;
    var href = link.getAttribute('href');
    if (!href || href.charAt(0) !== '#') return;

    if (href === '#' || href === '#top') {
      e.preventDefault();
      scrollToY(0);
      BC.emit('nav:navigate', 'top');
      return;
    }

    var id = href.slice(1);
    var target = null;
    try { target = document.getElementById(id) || document.querySelector(href); }
    catch (err) { target = document.getElementById(id); }
    if (!target) return;

    e.preventDefault();
    BC.scrollToEl(target);
    if (window.history && history.pushState) {
      try { history.pushState(null, '', href); } catch (err2) { logError(err2); }
    }
    BC.emit('nav:navigate', id);
  }

  /* --------------------------------------------------------
     8. Boot
     -------------------------------------------------------- */
  function boot() {
    buildBackdrop();
    buildProgress();
    setupCursor();
    BC.observeReveals(document);
    updateViewportVar();

    window.addEventListener('scroll', updateScroll, { passive: true });
    window.addEventListener('resize', BC.debounce(updateViewportVar, 140), { passive: true });
    window.addEventListener('orientationchange', BC.debounce(updateViewportVar, 220), { passive: true });
    document.addEventListener('click', onDocumentClick, false);
    document.addEventListener('visibilitychange', function () {
      BC.emit('visibility', !document.hidden);
    });

    if (BC.reduced) revealEverything();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }

  function markReady() {
    if (root.classList.contains('bc-ready')) return;
    root.classList.add('bc-ready');
    BC.observeReveals(document);
    updateViewportVar();
    BC.emit('bc:ready', true);
  }

  if (document.readyState === 'complete') {
    window.setTimeout(markReady, 0);
  } else {
    window.addEventListener('load', markReady, { once: true });
    window.setTimeout(markReady, 4000);
  }

  /* Late-arriving sections can re-register their reveals. */
  BC.on('preloader:done', function () {
    BC.observeReveals(document);
    lastProgress = -1;
    updateScroll();
  });
})();
