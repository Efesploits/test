/* ============================================================
   BERKAY CABBAR — EVOLUTION :: STATS / RAKAMLARLA EFSANE
   Owner: stats agent. Section id="istatistik".
   Drives: the eased count-up row (Intl.NumberFormat tr-TR),
   the six skill bars (two of which break out of their track),
   the goril -> insan radar morph and the draggable
   goril/insan comparison slider (pointer + keyboard).
   Depends on window.BC (core.js) but degrades without it.
   ============================================================ */
(function () {
  'use strict';

  var section = document.getElementById('istatistik');
  if (!section) return;

  var BC = window.BC = window.BC || {};

  /* ==========================================================
     1. Helpers
     ========================================================== */
  var mqReduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

  function readReduced() {
    if (BC.reduced === true) return true;
    return !!(mqReduce && mqReduce.matches);
  }

  var reduced = readReduced();

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  /* eased, never linear */
  function easeOutExpo(t) { return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t); }
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function now() {
    return (window.performance && window.performance.now) ? window.performance.now() : Date.now();
  }

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

  var trFormat = null;
  try {
    if (window.Intl && typeof window.Intl.NumberFormat === 'function') {
      trFormat = new window.Intl.NumberFormat('tr-TR');
    }
  } catch (err) { trFormat = null; }

  function fmtNumber(value, grouped) {
    var n = Math.round(value);
    if (!grouped) return String(n);
    if (trFormat) {
      try { return trFormat.format(n); } catch (err) { /* fall through */ }
    }
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  /* Element.closest with a token-exact fallback for old engines. */
  function closestCard(el, className) {
    if (!el) return null;
    if (el.closest) return el.closest('.' + className);
    var node = el.parentNode;
    while (node && node.nodeType === 1) {
      var cls = ' ' + ('' + (node.className || '')) + ' ';
      if (cls.indexOf(' ' + className + ' ') !== -1) return node;
      node = node.parentNode;
    }
    return null;
  }

  var rafId = { counters: 0, bars: 0, radar: 0 };

  function stop(key) {
    if (rafId[key]) {
      window.cancelAnimationFrame(rafId[key]);
      rafId[key] = 0;
    }
  }

  /* ==========================================================
     2. Block 1 — count-up row
     ========================================================== */
  var counterRow = section.querySelector('.st-counters');
  var counterNodes = section.querySelectorAll('.st-counter__num');
  var counters = [];
  var countersStarted = false;
  var popTimers = [];

  (function buildCounters() {
    if (!counterNodes || !counterNodes.length) return;
    for (var i = 0; i < counterNodes.length; i++) {
      var el = counterNodes[i];
      if (!el) continue;
      var to = parseFloat(el.getAttribute('data-to'));
      if (isNaN(to)) continue;
      var from = parseFloat(el.getAttribute('data-from'));
      var dur = parseInt(el.getAttribute('data-dur'), 10);
      counters.push({
        el: el,
        card: closestCard(el, 'st-counter'),
        from: isNaN(from) ? 0 : from,
        to: to,
        prefix: el.getAttribute('data-prefix') || '',
        suffix: el.getAttribute('data-suffix') || '',
        finalText: el.getAttribute('data-final') || '',
        grouped: el.getAttribute('data-group') !== 'off',
        dur: (!dur || dur < 200) ? 1800 : dur
      });
    }
  })();

  function paintCounter(c, value, finished) {
    if (!c || !c.el) return;
    if (finished && c.finalText) {
      c.el.textContent = c.finalText;
      return;
    }
    c.el.textContent = c.prefix + fmtNumber(value, c.grouped) + c.suffix;
  }

  function settleCounter(c) {
    if (!c) return;
    paintCounter(c, c.to, true);
    if (c.card) c.card.classList.add('is-done');
  }

  function settleCounters() {
    stop('counters');
    countersStarted = true;
    for (var i = 0; i < counters.length; i++) settleCounter(counters[i]);
  }

  function popCard(card) {
    if (!card || reduced) return;
    card.classList.add('is-pop');
    popTimers.push(window.setTimeout(function () {
      card.classList.remove('is-pop');
    }, 700));
  }

  function runCounters() {
    if (countersStarted || !counters.length) return;   /* animate once only */
    countersStarted = true;

    if (reduced) { settleCounters(); return; }

    var start = now();
    var landed = [];
    var i;
    for (i = 0; i < counters.length; i++) landed.push(false);

    function frame() {
      rafId.counters = 0;
      var t = now() - start;
      var alive = false;
      for (var j = 0; j < counters.length; j++) {
        var c = counters[j];
        var p = clamp(t / c.dur, 0, 1);
        var eased = easeOutExpo(p);
        paintCounter(c, c.from + (c.to - c.from) * eased, p >= 1);
        if (p >= 1) {
          if (!landed[j]) {
            landed[j] = true;
            if (c.card) c.card.classList.add('is-done');
            popCard(c.card);
          }
        } else {
          alive = true;
        }
      }
      if (alive) rafId.counters = window.requestAnimationFrame(frame);
    }

    rafId.counters = window.requestAnimationFrame(frame);
  }

  /* start from zero so the count-up has somewhere to travel from */
  if (counters.length) {
    if (reduced) {
      settleCounters();
    } else {
      for (var ci = 0; ci < counters.length; ci++) paintCounter(counters[ci], counters[ci].from, false);
      observe(counterRow || section, function (visible) {
        if (visible) runCounters();
      }, { once: true, threshold: 0.3 });
    }
  }

  /* ==========================================================
     3. Block 2 — skill bars
     ========================================================== */
  var barsWrap = section.querySelector('.st-bars');
  var barNodes = section.querySelectorAll('.st-bar');
  var bars = [];
  var barsStarted = false;

  (function buildBars() {
    if (!barNodes || !barNodes.length) return;
    for (var i = 0; i < barNodes.length; i++) {
      var el = barNodes[i];
      if (!el) continue;
      var value = parseFloat(el.getAttribute('data-value'));
      if (isNaN(value)) continue;
      bars.push({
        el: el,
        pct: el.querySelector('.st-bar__pct'),
        value: value,
        over: value > 100,
        delay: i * 110,
        dur: 1500
      });
    }
  })();

  function paintBar(b, value) {
    if (!b || !b.el) return;
    var track = clamp(value, 0, 100);
    var boost = b.over ? clamp((value - 100) / 50, 0, 1) : 0;
    b.el.style.setProperty('--st-p', track.toFixed(2));
    b.el.style.setProperty('--st-boost', boost.toFixed(3));
    if (b.pct) b.pct.textContent = '%' + Math.round(value);
  }

  function settleBars() {
    stop('bars');
    barsStarted = true;
    for (var i = 0; i < bars.length; i++) {
      paintBar(bars[i], bars[i].value);
      if (bars[i].el) bars[i].el.classList.add('is-armed');
    }
  }

  function runBars() {
    if (barsStarted || !bars.length) return;           /* animate once only */
    barsStarted = true;

    if (reduced) { settleBars(); return; }

    var start = now();
    var armed = [];
    var i;
    for (i = 0; i < bars.length; i++) armed.push(false);

    function frame() {
      rafId.bars = 0;
      var t = now() - start;
      var alive = false;
      for (var j = 0; j < bars.length; j++) {
        var b = bars[j];
        var p = clamp((t - b.delay) / b.dur, 0, 1);
        if (t >= b.delay && !armed[j]) {
          armed[j] = true;
          b.el.classList.add('is-armed');
        }
        paintBar(b, b.value * easeOutCubic(p));
        if (p < 1) alive = true;
      }
      if (alive) rafId.bars = window.requestAnimationFrame(frame);
    }

    rafId.bars = window.requestAnimationFrame(frame);
  }

  if (bars.length) {
    if (reduced) {
      settleBars();
    } else {
      for (var bi = 0; bi < bars.length; bi++) paintBar(bars[bi], 0);
      observe(barsWrap || section, function (visible) {
        if (visible) runBars();
      }, { once: true, threshold: 0.25 });
    }
  }

  /* ==========================================================
     4. Radar / hexagon morph (goril -> insan)
     ========================================================== */
  var RADAR_CX = 200;
  var RADAR_CY = 155;
  var RADAR_R = 110;

  var radarSvg = section.querySelector('.st-radar__svg');
  var radarShape = radarSvg ? radarSvg.querySelector('.st-radar__shape') : null;
  var radarDots = radarSvg ? radarSvg.querySelectorAll('.st-radar__dot') : null;
  var radarFrom = [];
  var radarTo = [];
  var radarReady = false;
  var radarStarted = false;

  function parseSeries(raw) {
    var out = [];
    if (!raw) return out;
    var parts = ('' + raw).split(',');
    for (var i = 0; i < parts.length; i++) {
      var n = parseFloat(parts[i]);
      if (isNaN(n)) return [];
      out.push(clamp(n, 0, 100));
    }
    return out;
  }

  if (radarSvg && radarShape) {
    radarFrom = parseSeries(radarSvg.getAttribute('data-from'));
    radarTo = parseSeries(radarSvg.getAttribute('data-to'));
    radarReady = radarFrom.length === 6 && radarTo.length === 6;
  }

  function radarPoint(index, value) {
    var angle = (-90 + 60 * index) * Math.PI / 180;
    var r = RADAR_R * (clamp(value, 0, 100) / 100);
    return [RADAR_CX + Math.cos(angle) * r, RADAR_CY + Math.sin(angle) * r];
  }

  function paintRadar(values) {
    if (!radarShape) return;
    var pts = [];
    for (var i = 0; i < values.length; i++) {
      var p = radarPoint(i, values[i]);
      pts.push(p[0].toFixed(2) + ',' + p[1].toFixed(2));
      if (radarDots && radarDots[i]) {
        radarDots[i].setAttribute('cx', p[0].toFixed(2));
        radarDots[i].setAttribute('cy', p[1].toFixed(2));
      }
    }
    radarShape.setAttribute('points', pts.join(' '));
  }

  function settleRadar() {
    stop('radar');
    if (!radarReady) return;
    radarStarted = true;
    paintRadar(radarTo);
    if (radarSvg) radarSvg.classList.add('is-done');
  }

  function runRadar() {
    if (radarStarted || !radarReady) return;           /* animate once only */
    radarStarted = true;

    if (reduced) { settleRadar(); return; }

    var start = now();
    var dur = 1700;
    var mixed = [0, 0, 0, 0, 0, 0];

    function frame() {
      rafId.radar = 0;
      var p = clamp((now() - start) / dur, 0, 1);
      var eased = easeInOutCubic(p);
      for (var i = 0; i < 6; i++) {
        mixed[i] = radarFrom[i] + (radarTo[i] - radarFrom[i]) * eased;
      }
      paintRadar(mixed);
      if (p < 1) {
        rafId.radar = window.requestAnimationFrame(frame);
      } else if (radarSvg) {
        radarSvg.classList.add('is-done');
      }
    }

    rafId.radar = window.requestAnimationFrame(frame);
  }

  if (radarReady) {
    if (reduced) {
      settleRadar();
    } else {
      paintRadar(radarFrom);
      observe(radarSvg, function (visible) {
        if (visible) runRadar();
      }, { once: true, threshold: 0.35 });
    }
  }

  /* ==========================================================
     5. Block 3 — GORİL vs İNSAN comparison slider
     ========================================================== */
  var stage = section.querySelector('.st-vs__stage');
  var divider = section.querySelector('.st-vs__divider');

  if (stage && divider) {
    var pos = parseFloat(divider.getAttribute('aria-valuenow'));
    if (isNaN(pos)) pos = 50;
    var dragging = false;
    var activePointer = null;

    var setPos = function (value) {
      var next = clamp(value, 0, 100);
      pos = next;
      stage.style.setProperty('--st-vs', next.toFixed(2));
      var rounded = Math.round(next);
      divider.setAttribute('aria-valuenow', String(rounded));
      divider.setAttribute('aria-valuetext', 'Goril tarafı yüzde ' + rounded);
    };

    var posFromX = function (clientX) {
      var rect = stage.getBoundingClientRect();
      if (!rect || !rect.width) return pos;
      return ((clientX - rect.left) / rect.width) * 100;
    };

    var focusDivider = function () {
      if (!divider.focus) return;
      try { divider.focus({ preventScroll: true }); } catch (err) { divider.focus(); }
    };

    var startDrag = function () {
      dragging = true;
      stage.classList.add('is-dragging');
    };

    var endDrag = function () {
      if (!dragging) return;
      dragging = false;
      activePointer = null;
      stage.classList.remove('is-dragging');
    };

    setPos(pos);

    if (window.PointerEvent) {
      stage.addEventListener('pointerdown', function (e) {
        if (e.button !== 0 && e.pointerType === 'mouse') return;
        startDrag();
        activePointer = e.pointerId;
        if (stage.setPointerCapture) {
          try { stage.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        }
        setPos(posFromX(e.clientX));
        focusDivider();
        e.preventDefault();
      });

      stage.addEventListener('pointermove', function (e) {
        if (!dragging || (activePointer !== null && e.pointerId !== activePointer)) return;
        setPos(posFromX(e.clientX));
      });

      stage.addEventListener('pointerup', endDrag);
      stage.addEventListener('pointercancel', endDrag);
      stage.addEventListener('lostpointercapture', endDrag);
    } else {
      stage.addEventListener('mousedown', function (e) {
        if (e.button !== 0) return;
        startDrag();
        setPos(posFromX(e.clientX));
        focusDivider();
        e.preventDefault();
      });
      document.addEventListener('mousemove', function (e) {
        if (!dragging) return;
        setPos(posFromX(e.clientX));
      });
      document.addEventListener('mouseup', endDrag);

      var touchX = 0;
      var touchY = 0;
      var touchAxis = 0;   /* 0 = undecided, 1 = horizontal, 2 = vertical */

      stage.addEventListener('touchstart', function (e) {
        if (!e.touches || !e.touches.length) return;
        touchX = e.touches[0].clientX;
        touchY = e.touches[0].clientY;
        touchAxis = 0;
        startDrag();
        setPos(posFromX(touchX));
      }, { passive: true });

      stage.addEventListener('touchmove', function (e) {
        if (!dragging || !e.touches || !e.touches.length) return;
        var t = e.touches[0];
        if (touchAxis === 0) {
          var dx = Math.abs(t.clientX - touchX);
          var dy = Math.abs(t.clientY - touchY);
          if (dx < 6 && dy < 6) return;
          touchAxis = dx >= dy ? 1 : 2;
          if (touchAxis === 2) { endDrag(); return; }   /* let the page scroll */
        }
        if (touchAxis !== 1) return;
        setPos(posFromX(t.clientX));
        if (e.cancelable) e.preventDefault();
      }, { passive: false });

      stage.addEventListener('touchend', endDrag);
      stage.addEventListener('touchcancel', endDrag);
    }

    divider.addEventListener('keydown', function (e) {
      var key = e.key;
      var step = e.shiftKey ? 10 : 2;
      var next = null;

      if (key === 'ArrowLeft' || key === 'Left' || key === 'ArrowDown' || key === 'Down') next = pos - step;
      else if (key === 'ArrowRight' || key === 'Right' || key === 'ArrowUp' || key === 'Up') next = pos + step;
      else if (key === 'PageDown') next = pos - 12;
      else if (key === 'PageUp') next = pos + 12;
      else if (key === 'Home') next = 0;
      else if (key === 'End') next = 100;

      if (next === null) return;
      e.preventDefault();
      setPos(next);
    });

    divider.addEventListener('dragstart', function (e) { e.preventDefault(); });
  }

  /* ==========================================================
     6. Idle loops: alive only while visible and not hidden
     ========================================================== */
  var inView = false;

  function syncLive() {
    var live = inView && !reduced && !document.hidden;
    section.classList.toggle('is-live', live);
  }

  observe(section, function (visible) {
    inView = !!visible;
    syncLive();
  }, { both: true, threshold: 0.02 });

  document.addEventListener('visibilitychange', syncLive);

  /* ==========================================================
     7. Live reduced-motion changes -> jump to the final state
     ========================================================== */
  function applyReduced(value) {
    reduced = !!value;
    if (!reduced) { syncLive(); return; }
    settleCounters();
    settleBars();
    settleRadar();
    for (var i = 0; i < popTimers.length; i++) window.clearTimeout(popTimers[i]);
    popTimers.length = 0;
    syncLive();
  }

  if (typeof BC.on === 'function') {
    BC.on('motion:change', applyReduced);
  } else if (mqReduce) {
    if (mqReduce.addEventListener) {
      mqReduce.addEventListener('change', function (e) { applyReduced(e.matches); });
    } else if (mqReduce.addListener) {
      mqReduce.addListener(function (e) { applyReduced(e.matches); });
    }
  }
})();
