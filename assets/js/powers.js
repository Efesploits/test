/* ============================================================
   BERKAY CABBAR — EVOLUTION :: GÜÇLER / PRAISE GRID
   Owner: powers agent. Section id="guc".
   Drives: 3D pointer tilt + cursor-tracked specular highlight on
   every card, the power-level meters (fill + count-up when the
   card scrolls into view) and the canvas DNA double helix in the
   feature card (projected 3D points, amber -> cyan interpolation).
   Entrance reveals are handled by the global observer in core.js.
   Depends on window.BC but degrades gracefully without it.
   ============================================================ */
(function () {
  'use strict';

  var section = document.getElementById('guc');
  if (!section) return;

  var BC = window.BC = window.BC || {};

  /* ==========================================================
     1. Helpers (each one falls back if core.js is missing)
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

  function hasFinePointer() {
    if (!window.matchMedia) return !isTouch();
    return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  }

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

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
    var io = new IntersectionObserver(function (entries, obs) {
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].isIntersecting) {
          cb(true, entries[i]);
          if (o.once) obs.unobserve(entries[i].target);
        } else if (o.both) {
          cb(false, entries[i]);
        }
      }
    }, {
      rootMargin: o.rootMargin || '0px',
      threshold: typeof o.threshold === 'number' ? o.threshold : 0.15
    });
    io.observe(el);
  }

  function pixelRatio() {
    if (typeof BC.dpr === 'function') return BC.dpr();
    return Math.min(window.devicePixelRatio || 1, 2);
  }

  var reduced = readReduced();
  var lowPower = (typeof BC.prefersLowPower === 'boolean')
    ? BC.prefersLowPower
    : ((navigator.hardwareConcurrency || 8) <= 4 || window.innerWidth < 720);

  var cards = section.querySelectorAll('.pw-card');
  if (!cards.length) return;

  /* ==========================================================
     2. 3D tilt + specular highlight
     ========================================================== */
  var MAX_TILT = 12;
  var usePointer = ('PointerEvent' in window);
  var EV_ENTER = usePointer ? 'pointerenter' : 'mouseenter';
  var EV_MOVE = usePointer ? 'pointermove' : 'mousemove';
  var EV_LEAVE = usePointer ? 'pointerleave' : 'mouseleave';

  /**
   * Layout box of the card in viewport coordinates, measured through the
   * (never transformed) offset parent so the card's own tilt transform
   * cannot feed back into the next measurement.
   */
  function layoutBox(el) {
    var w = el.offsetWidth;
    var h = el.offsetHeight;
    var parent = el.offsetParent;
    if (parent && parent.getBoundingClientRect) {
      var pr = parent.getBoundingClientRect();
      return {
        left: pr.left + el.offsetLeft - (parent.scrollLeft || 0),
        top: pr.top + el.offsetTop - (parent.scrollTop || 0),
        width: w,
        height: h
      };
    }
    var r = el.getBoundingClientRect();
    return { left: r.left, top: r.top, width: w || r.width, height: h || r.height };
  }

  function attachTilt(card) {
    if (!card) return;

    var raf = 0;
    var cx = 0;
    var cy = 0;
    var active = false;

    function apply() {
      raf = 0;
      if (!active) return;
      var box = layoutBox(card);
      if (!box.width || !box.height) return;
      var px = clamp((cx - box.left) / box.width, 0, 1);
      var py = clamp((cy - box.top) / box.height, 0, 1);
      var ry = (px - 0.5) * 2 * MAX_TILT;
      var rx = (0.5 - py) * 2 * MAX_TILT;

      card.style.transform =
        'perspective(1000px) rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg) ' +
        'translate3d(0, -6px, 0) scale(1.012)';
      card.style.setProperty('--pw-mx', (px * 100).toFixed(2) + '%');
      card.style.setProperty('--pw-my', (py * 100).toFixed(2) + '%');
    }

    function queue() {
      if (raf) return;
      raf = window.requestAnimationFrame(apply);
    }

    function onEnter(e) {
      if (usePointer && e && e.pointerType === 'touch') return;
      if (readReduced()) { reset(); return; }
      active = true;
      card.classList.add('is-tilting');
      onMove(e);
    }

    function onMove(e) {
      if (!active || !e) return;
      if (usePointer && e.pointerType === 'touch') return;
      cx = e.clientX;
      cy = e.clientY;
      queue();
    }

    function reset() {
      active = false;
      if (raf) { window.cancelAnimationFrame(raf); raf = 0; }
      card.classList.remove('is-tilting');
      card.style.transform = '';
      card.style.setProperty('--pw-mx', '50%');
      card.style.setProperty('--pw-my', '50%');
    }

    card.addEventListener(EV_ENTER, onEnter);
    card.addEventListener(EV_MOVE, onMove, { passive: true });
    card.addEventListener(EV_LEAVE, reset);
    card.addEventListener('blur', reset);

    card.__pwResetTilt = reset;
  }

  function bindTilts() {
    if (reduced || isTouch() || !hasFinePointer()) return;
    for (var i = 0; i < cards.length; i++) {
      if (cards[i].getAttribute('data-pw-tilt') === '1') continue;
      cards[i].setAttribute('data-pw-tilt', '1');
      attachTilt(cards[i]);
    }
  }

  function releaseTilts() {
    for (var i = 0; i < cards.length; i++) {
      if (typeof cards[i].__pwResetTilt === 'function') cards[i].__pwResetTilt();
    }
  }

  bindTilts();

  /* Keyboard focus keeps the highlight centred (CSS mirrors :hover). */
  for (var f = 0; f < cards.length; f++) {
    (function (card) {
      card.addEventListener('focus', function () {
        card.style.setProperty('--pw-mx', '50%');
        card.style.setProperty('--pw-my', '50%');
      });
    })(cards[f]);
  }

  /* ==========================================================
     3. Power-level meters
     ========================================================== */
  function countUp(el, target, duration) {
    if (!el) return;
    var start = 0;
    function step(ts) {
      if (!start) start = ts;
      var t = clamp((ts - start) / duration, 0, 1);
      var eased = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(target * eased) + '%';
      if (t < 1) window.requestAnimationFrame(step);
    }
    window.requestAnimationFrame(step);
  }

  function initMeter(card) {
    if (!card) return;
    var raw = card.getAttribute('data-level');
    if (raw === null) return;
    var level = parseInt(raw, 10);
    if (isNaN(level)) return;
    level = clamp(level, 0, 100);

    var valEl = card.querySelector('[data-pw-val]');
    var bar = card.querySelector('.pw-card__bar');
    var filled = false;

    if (bar) bar.setAttribute('aria-valuenow', String(level));

    function fill() {
      if (filled) return;
      filled = true;
      card.style.setProperty('--pw-fill', (level / 100).toFixed(3));
      if (!valEl) return;
      if (readReduced()) { valEl.textContent = level + '%'; return; }
      countUp(valEl, level, 1200);
    }

    observe(card, function (visible) {
      if (visible) fill();
    }, { once: true, threshold: 0.3 });
  }

  for (var m = 0; m < cards.length; m++) initMeter(cards[m]);

  /* ==========================================================
     4. Feature card — DNA double helix on 2D canvas
     ========================================================== */
  (function dna() {
    var stage = section.querySelector('.pw-dna__stage');
    var canvas = section.querySelector('.pw-dna__canvas');
    if (!stage || !canvas || !canvas.getContext) return;

    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    /* ---- colours straight from the design tokens ---- */
    function parseColor(value, fallback) {
      if (typeof value !== 'string') return fallback;
      var s = value.trim();
      if (!s) return fallback;
      if (s.charAt(0) === '#') {
        if (s.length === 4) {
          return [
            parseInt(s.charAt(1) + s.charAt(1), 16),
            parseInt(s.charAt(2) + s.charAt(2), 16),
            parseInt(s.charAt(3) + s.charAt(3), 16)
          ];
        }
        if (s.length === 7) {
          return [
            parseInt(s.slice(1, 3), 16),
            parseInt(s.slice(3, 5), 16),
            parseInt(s.slice(5, 7), 16)
          ];
        }
        return fallback;
      }
      var match = s.match(/rgba?\(([^)]+)\)/i);
      if (match) {
        var parts = match[1].split(/[,\s/]+/);
        if (parts.length >= 3) {
          var r = parseFloat(parts[0]);
          var g = parseFloat(parts[1]);
          var b = parseFloat(parts[2]);
          if (!isNaN(r) && !isNaN(g) && !isNaN(b)) return [r, g, b];
        }
      }
      return fallback;
    }

    function token(name, fallback) {
      try {
        var value = window.getComputedStyle(document.documentElement).getPropertyValue(name);
        return parseColor(value, fallback);
      } catch (err) {
        return fallback;
      }
    }

    var WARM = token('--amber-500', [255, 176, 46]);
    var COOL = token('--cyan-500', [34, 230, 255]);

    function mix(a, b, t) {
      var k = clamp(t, 0, 1);
      return [
        a[0] + (b[0] - a[0]) * k,
        a[1] + (b[1] - a[1]) * k,
        a[2] + (b[2] - a[2]) * k
      ];
    }

    function rgba(c, alpha) {
      return 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' +
        clamp(alpha, 0, 1).toFixed(3) + ')';
    }

    /* ---- geometry ---- */
    var POINTS = lowPower ? 26 : 42;
    var TWIST = 0.44;
    var FOCAL = 340;

    var cssW = 0;
    var cssH = 0;
    var phase = 0;
    var strandA = [];
    var strandB = [];

    function sizeCanvas() {
      var rect = stage.getBoundingClientRect();
      var w = Math.max(1, Math.round(rect.width));
      var h = Math.max(1, Math.round(rect.height));
      var dpr = pixelRatio();
      cssW = w;
      cssH = h;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function project() {
      var cx = cssW / 2;
      var cy = cssH / 2;
      var radius = Math.min(cssW * 0.19, cssH * 0.24, 78);
      var span = cssH * 0.84;
      var stepY = span / (POINTS - 1);

      strandA.length = 0;
      strandB.length = 0;

      for (var i = 0; i < POINTS; i++) {
        var t = i / (POINTS - 1);
        var y = -span / 2 + i * stepY;
        var ang = i * TWIST + phase;

        for (var s = 0; s < 2; s++) {
          var a = ang + s * Math.PI;
          var x3 = Math.cos(a) * radius;
          var z3 = Math.sin(a) * radius;
          var k = FOCAL / (FOCAL - z3);
          var point = {
            x: cx + x3 * k,
            y: cy + y * k,
            depth: (z3 + radius) / (2 * radius),
            t: t
          };
          if (s === 0) strandA.push(point);
          else strandB.push(point);
        }
      }
    }

    function drawStrand(list, warmBias) {
      var i;
      /* backbone */
      for (i = 1; i < list.length; i++) {
        var p0 = list[i - 1];
        var p1 = list[i];
        var d = (p0.depth + p1.depth) / 2;
        var color = mix(WARM, COOL, warmBias + p1.t * 0.65);
        ctx.strokeStyle = rgba(color, 0.16 + d * 0.6);
        ctx.lineWidth = 0.9 + d * 1.9;
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
      }
      /* nodes */
      for (i = 0; i < list.length; i++) {
        var p = list[i];
        var nodeColor = mix(WARM, COOL, warmBias + p.t * 0.65);
        ctx.fillStyle = rgba(nodeColor, 0.28 + p.depth * 0.68);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.2 + p.depth * 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function render() {
      if (!cssW || !cssH) return;
      ctx.clearRect(0, 0, cssW, cssH);
      project();

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';

      /* rungs first so the strands read as being in front */
      var stepRung = lowPower ? 2 : 1;
      for (var i = 0; i < strandA.length; i += stepRung) {
        var a = strandA[i];
        var b = strandB[i];
        if (!a || !b) continue;
        var d = (a.depth + b.depth) / 2;
        var color = mix(WARM, COOL, a.t);
        ctx.strokeStyle = rgba(color, 0.08 + d * 0.24);
        ctx.lineWidth = 0.7 + d * 1.1;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }

      drawStrand(strandA, 0.0);
      drawStrand(strandB, 0.35);

      ctx.restore();
    }

    /* ---- loop, paused offscreen / when hidden / when reduced ---- */
    var running = false;
    var rafId = 0;
    var lastTs = 0;
    var visible = false;

    function loop(ts) {
      if (!running) return;
      if (!lastTs) lastTs = ts;
      var dt = Math.min(50, ts - lastTs);
      lastTs = ts;
      phase = (phase + dt * 0.00042) % (Math.PI * 2);
      render();
      rafId = window.requestAnimationFrame(loop);
    }

    function start() {
      if (running || readReduced() || !visible || document.hidden) return;
      running = true;
      lastTs = 0;
      rafId = window.requestAnimationFrame(loop);
    }

    function stop() {
      running = false;
      if (rafId) {
        window.cancelAnimationFrame(rafId);
        rafId = 0;
      }
    }

    function refresh() {
      sizeCanvas();
      render();
    }

    sizeCanvas();
    render();

    observe(stage, function (isVisible) {
      visible = !!isVisible;
      if (visible) start();
      else stop();
    }, { both: true, threshold: 0.04 });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop();
      else start();
    });

    var onResize = debounce(refresh, 160);
    window.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('orientationchange', onResize, { passive: true });

    if (typeof BC.on === 'function') {
      BC.on('preloader:done', refresh);
      BC.on('bc:ready', refresh);
      BC.on('motion:change', function (isReduced) {
        reduced = !!isReduced;
        if (reduced) {
          stop();
          phase = 0;
          render();
          releaseTilts();
        } else {
          bindTilts();
          start();
        }
      });
    }

    window.addEventListener('load', refresh, { once: true });
  })();

  /* ==========================================================
     5. Live reduced-motion changes (when core.js is absent)
     ========================================================== */
  if (typeof BC.on !== 'function' && mqReduce) {
    var onReduceChange = function (e) {
      reduced = !!e.matches;
      if (reduced) releaseTilts();
      else bindTilts();
    };
    if (mqReduce.addEventListener) mqReduce.addEventListener('change', onReduceChange);
    else if (mqReduce.addListener) mqReduce.addListener(onReduceChange);
  }
})();
