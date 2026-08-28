/* ============================================================
   BERKAY CABBAR — EVOLUTION :: QUOTES / SÖZLER
   Owner: quotes agent. Section id="sozler".
   Drives: two rAF marquees running in opposite directions
   (hover slows them down), and a 3D testimonial carousel with
   autoplay, hover/focus pause, prev/next, dots, keyboard arrows
   and touch swipe. Depends on window.BC (core.js) but degrades
   gracefully without it.
   ============================================================ */
(function () {
  'use strict';

  var section = document.getElementById('sozler');
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
  var sectionVisible = false;

  /* ==========================================================
     2. Marquees — rAF driven, opposite directions, slow on hover
     ========================================================== */
  function createMarquee(el) {
    if (!el) return null;

    var row = el.querySelector('[data-qt-row]');
    var base = el.querySelector('[data-qt-base]');
    if (!row || !base) return null;

    var dir = parseFloat(el.getAttribute('data-qt-dir'));
    if (!dir || isNaN(dir)) dir = 1;

    var baseSpeed = parseFloat(el.getAttribute('data-qt-speed'));
    if (!baseSpeed || isNaN(baseSpeed) || baseSpeed <= 0) baseSpeed = 70;

    var offset = 0;
    var unit = 0;
    var speed = baseSpeed;
    var target = baseSpeed;
    var last = 0;
    var raf = 0;
    var running = false;
    var hovering = false;
    var isStatic = false;

    function ensureCoverage() {
      if (!unit || unit <= 0) return;
      var vw = el.clientWidth || window.innerWidth || 0;
      var need = 1 + Math.ceil(vw / unit);
      if (need < 2) need = 2;
      var guard = 0;
      while (row.children.length < need && guard < 12) {
        var clone = base.cloneNode(true);
        clone.removeAttribute('data-qt-base');
        clone.classList.add('qt__mq-track--clone');
        clone.setAttribute('aria-hidden', 'true');
        row.appendChild(clone);
        guard++;
      }
    }

    function measure() {
      /* offsetWidth is layout-based, so an ancestor `.reveal` transform
         can never falsify the loop unit. */
      var w = base.offsetWidth;
      if (!w) {
        var rect = base.getBoundingClientRect();
        w = rect ? rect.width : 0;
      }
      unit = w > 0 ? w : 0;
      if (unit > 0) ensureCoverage();
    }

    function apply() {
      row.style.transform = 'translate3d(' + (-offset).toFixed(2) + 'px, 0, 0)';
    }

    function frame(ts) {
      if (!running) { raf = 0; return; }
      if (!last) last = ts;
      var dt = (ts - last) / 1000;
      last = ts;
      if (dt > 0.1) dt = 0.1;
      if (dt < 0) dt = 0;

      speed += (target - speed) * Math.min(1, dt * 5);
      offset += speed * dir * dt;

      if (unit > 0) {
        offset = offset % unit;
        if (offset < 0) offset += unit;
      }
      apply();
      raf = window.requestAnimationFrame(frame);
    }

    function start() {
      if (running || isStatic || reduced) return;
      if (!unit) measure();
      running = true;
      last = 0;
      raf = window.requestAnimationFrame(frame);
    }

    function stop() {
      running = false;
      if (raf) { window.cancelAnimationFrame(raf); raf = 0; }
      last = 0;
    }

    function setStatic(on) {
      isStatic = !!on;
      if (isStatic) {
        stop();
        offset = 0;
        row.style.transform = '';
        el.classList.remove('qt-is-js');
        el.classList.add('qt-is-static');
      } else {
        el.classList.remove('qt-is-static');
        el.classList.add('qt-is-js');
        measure();
        apply();
      }
    }

    function onEnter() {
      hovering = true;
      target = baseSpeed * 0.18;
    }

    function onLeave() {
      hovering = false;
      target = baseSpeed;
    }

    el.addEventListener('mouseenter', onEnter);
    el.addEventListener('mouseleave', onLeave);

    return {
      el: el,
      measure: function () { if (!isStatic) { measure(); apply(); } },
      start: start,
      stop: stop,
      setStatic: setStatic,
      refresh: function () {
        if (reduced) { setStatic(true); return; }
        setStatic(false);
        target = hovering ? baseSpeed * 0.18 : baseSpeed;
      }
    };
  }

  var marquees = [];
  var marqueeNodes = section.querySelectorAll('[data-qt-marquee]');
  for (var m = 0; m < marqueeNodes.length; m++) {
    var mq = createMarquee(marqueeNodes[m]);
    if (mq) marquees.push(mq);
  }

  function marqueesRefresh() {
    for (var i = 0; i < marquees.length; i++) marquees[i].refresh();
  }
  function marqueesMeasure() {
    for (var i = 0; i < marquees.length; i++) marquees[i].measure();
  }
  function marqueesRun(on) {
    for (var i = 0; i < marquees.length; i++) {
      if (on) marquees[i].start();
      else marquees[i].stop();
    }
  }

  marqueesRefresh();

  /* ==========================================================
     3. Carousel
     ========================================================== */
  var carousel = section.querySelector('[data-qt-carousel]');
  var viewport = carousel ? carousel.querySelector('[data-qt-viewport]') : null;
  var track = carousel ? carousel.querySelector('[data-qt-track]') : null;
  var slides = track ? track.querySelectorAll('[data-qt-slide]') : null;
  var prevBtn = carousel ? carousel.querySelector('[data-qt-prev]') : null;
  var nextBtn = carousel ? carousel.querySelector('[data-qt-next]') : null;
  var dots = carousel ? carousel.querySelectorAll('[data-qt-dot]') : null;
  var status = carousel ? carousel.querySelector('[data-qt-status]') : null;

  var hasCarousel = !!(carousel && viewport && track && slides && slides.length);

  /* bridges filled in below, so the section lifecycle can drive the carousel */
  var carouselLayout = function () {};
  var carouselSchedule = function () {};
  var carouselStop = function () {};

  if (hasCarousel) {
    var AUTOPLAY_MS = 5600;

    var count = slides.length;
    var index = 0;
    var currentX = 0;
    var autoTimer = 0;
    var hovering = false;
    var focused = false;
    var dragging = false;
    var pointerId = null;
    var startX = 0;
    var startY = 0;
    var dragDX = 0;
    var dragBaseX = 0;
    var axis = '';

    function setX(x) {
      currentX = x;
      track.style.transform = 'translate3d(' + x.toFixed(2) + 'px, 0, 0)';
    }

    function layout() {
      var active = slides[index];
      if (!active) return;
      var vw = viewport.clientWidth || viewport.getBoundingClientRect().width || 0;
      var x = (vw / 2) - (active.offsetLeft + (active.offsetWidth / 2));
      setX(x);
    }

    function paint() {
      for (var i = 0; i < count; i++) {
        var slide = slides[i];
        if (!slide) continue;
        var delta = i - index;
        var isActive = delta === 0;
        slide.style.setProperty('--qt-off', String(clamp(delta, -1, 1)));
        slide.classList.toggle('qt-is-active', isActive);
        slide.classList.toggle('qt-is-near', Math.abs(delta) === 1);
        slide.setAttribute('aria-hidden', isActive ? 'false' : 'true');
      }
      if (dots) {
        for (var d = 0; d < dots.length; d++) {
          var dot = dots[d];
          if (!dot) continue;
          if (d === index) dot.setAttribute('aria-current', 'true');
          else dot.removeAttribute('aria-current');
        }
      }
    }

    function announce() {
      if (!status) return;
      var active = slides[index];
      var src = active ? active.querySelector('.qt__source') : null;
      var name = src ? (src.textContent || '').replace(/\s+/g, ' ').trim() : '';
      status.textContent = (index + 1) + ' / ' + count + (name ? ' — ' + name : '');
    }

    function goTo(next, announceIt) {
      if (!count) return;
      var target = ((next % count) + count) % count;
      index = target;
      paint();
      layout();
      if (announceIt) announce();
    }

    /* ---------- autoplay ---------- */
    function canAutoplay() {
      return !reduced && sectionVisible && !document.hidden &&
             !hovering && !focused && !dragging && count > 1;
    }

    function stopAuto() {
      if (autoTimer) { window.clearTimeout(autoTimer); autoTimer = 0; }
    }

    function scheduleAuto() {
      stopAuto();
      if (!canAutoplay()) return;
      autoTimer = window.setTimeout(function () {
        autoTimer = 0;
        if (!canAutoplay()) return;
        goTo(index + 1, false);
        scheduleAuto();
      }, AUTOPLAY_MS);
    }

    function userGoTo(next) {
      goTo(next, true);
      scheduleAuto();
    }

    /* ---------- buttons + dots ---------- */
    if (prevBtn) {
      prevBtn.addEventListener('click', function () { userGoTo(index - 1); });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', function () { userGoTo(index + 1); });
    }
    if (dots) {
      for (var di = 0; di < dots.length; di++) {
        (function (node, target) {
          if (!node) return;
          node.addEventListener('click', function () { userGoTo(target); });
        })(dots[di], di);
      }
    }

    /* ---------- keyboard ---------- */
    carousel.addEventListener('keydown', function (e) {
      var key = e.key;
      if (!key) return;
      if (key === 'ArrowLeft' || key === 'Left') {
        e.preventDefault();
        userGoTo(index - 1);
      } else if (key === 'ArrowRight' || key === 'Right') {
        e.preventDefault();
        userGoTo(index + 1);
      } else if (key === 'Home') {
        e.preventDefault();
        userGoTo(0);
      } else if (key === 'End') {
        e.preventDefault();
        userGoTo(count - 1);
      }
    });

    /* ---------- pause on hover / focus ---------- */
    carousel.addEventListener('mouseenter', function () { hovering = true; stopAuto(); });
    carousel.addEventListener('mouseleave', function () { hovering = false; scheduleAuto(); });
    carousel.addEventListener('focusin', function () { focused = true; stopAuto(); });
    carousel.addEventListener('focusout', function (e) {
      if (e.relatedTarget && carousel.contains(e.relatedTarget)) return;
      focused = false;
      scheduleAuto();
    });

    /* the viewport must never scroll itself when focus moves inside */
    viewport.addEventListener('scroll', function () {
      if (viewport.scrollLeft !== 0) viewport.scrollLeft = 0;
      if (viewport.scrollTop !== 0) viewport.scrollTop = 0;
    });

    /* ---------- touch / pointer swipe ---------- */
    function beginDrag(x, y, id) {
      dragging = true;
      axis = '';
      startX = x;
      startY = y;
      dragDX = 0;
      pointerId = (id === undefined) ? null : id;
      dragBaseX = currentX;
      carousel.classList.add('qt-is-dragging');
      stopAuto();
    }

    function moveDrag(x, y) {
      if (!dragging) return;
      var dx = x - startX;
      var dy = y - startY;
      if (!axis) {
        if (Math.abs(dx) < 7 && Math.abs(dy) < 7) return;
        axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
        if (axis === 'y') { endDrag(false); return; }
      }
      dragDX = dx;
      setX(dragBaseX + dx * 0.9);
    }

    function endDrag(commit) {
      if (!dragging) return;
      dragging = false;
      carousel.classList.remove('qt-is-dragging');
      var moved = dragDX;
      dragDX = 0;
      pointerId = null;
      var vw = viewport.clientWidth || 1;
      var threshold = Math.max(38, vw * 0.13);
      if (commit && Math.abs(moved) > threshold) {
        userGoTo(moved < 0 ? index + 1 : index - 1);
      } else {
        layout();
        scheduleAuto();
      }
    }

    if (window.PointerEvent) {
      viewport.addEventListener('pointerdown', function (e) {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        beginDrag(e.clientX, e.clientY, e.pointerId);
        if (viewport.setPointerCapture && e.pointerId !== undefined) {
          try { viewport.setPointerCapture(e.pointerId); } catch (err) {}
        }
      }, { passive: true });

      viewport.addEventListener('pointermove', function (e) {
        if (!dragging) return;
        if (pointerId !== null && e.pointerId !== pointerId) return;
        moveDrag(e.clientX, e.clientY);
      }, { passive: true });

      viewport.addEventListener('pointerup', function (e) {
        if (pointerId !== null && e.pointerId !== pointerId) return;
        endDrag(true);
      }, { passive: true });

      viewport.addEventListener('pointercancel', function () { endDrag(false); }, { passive: true });
      viewport.addEventListener('lostpointercapture', function () { endDrag(false); }, { passive: true });
    } else {
      viewport.addEventListener('touchstart', function (e) {
        if (!e.touches || e.touches.length !== 1) return;
        beginDrag(e.touches[0].clientX, e.touches[0].clientY);
      }, { passive: true });

      viewport.addEventListener('touchmove', function (e) {
        if (!dragging || !e.touches || !e.touches.length) return;
        moveDrag(e.touches[0].clientX, e.touches[0].clientY);
      }, { passive: true });

      viewport.addEventListener('touchend', function () { endDrag(true); }, { passive: true });
      viewport.addEventListener('touchcancel', function () { endDrag(false); }, { passive: true });

      viewport.addEventListener('mousedown', function (e) {
        if (e.button !== 0) return;
        beginDrag(e.clientX, e.clientY);
      });
      document.addEventListener('mousemove', function (e) {
        if (dragging) moveDrag(e.clientX, e.clientY);
      });
      document.addEventListener('mouseup', function () {
        if (dragging) endDrag(true);
      });
    }

    carouselLayout = function () { layout(); };
    carouselSchedule = function () { scheduleAuto(); };
    carouselStop = function () { stopAuto(); };

    /* first paint */
    goTo(0, false);
  }

  /* ==========================================================
     4. Section gates + lifecycle
     ========================================================== */
  function refresh() {
    reduced = readReduced();
    marqueesRefresh();
    marqueesMeasure();
    marqueesRun(sectionVisible && !document.hidden && !reduced);
    carouselLayout();
    if (reduced) carouselStop();
    else carouselSchedule();
  }

  observe(section, function (visible) {
    sectionVisible = !!visible;
    section.classList.toggle('qt-is-idle', !sectionVisible);
    if (sectionVisible && !document.hidden && !reduced) {
      marqueesMeasure();
      marqueesRun(true);
      carouselSchedule();
    } else {
      marqueesRun(false);
      carouselStop();
    }
  }, { both: true, threshold: 0, rootMargin: '12% 0px 12% 0px' });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      marqueesRun(false);
      carouselStop();
    } else if (sectionVisible && !reduced) {
      marqueesRun(true);
      carouselSchedule();
    }
  });

  var onResize = debounce(function () { refresh(); }, 160);
  window.addEventListener('resize', onResize, { passive: true });
  window.addEventListener('orientationchange', onResize, { passive: true });

  if (typeof BC.on === 'function') {
    BC.on('preloader:done', function () { window.setTimeout(refresh, 60); });
    BC.on('bc:ready', function () { refresh(); });
    BC.on('motion:change', function (isReduced) {
      reduced = !!isReduced;
      refresh();
    });
  }

  if (mqReduce) {
    var onMq = function (e) {
      reduced = !!e.matches;
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
