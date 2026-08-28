/* ============================================================
   BERKAY CABBAR — EVOLUTION :: PRELOADER + NAV
   Owner: core agent. Requires assets/js/core.js to run first.

   Part A — preloader: a gorilla silhouette is drawn stroke-first
   as the counter climbs 0 -> 100, then morphs into a standing
   human silhouette across the final 20%, then a curtain wipe.
   Part B — nav: sticky/blur state, full-screen mobile menu with
   staggered links, focus trap and scroll spy.
   ============================================================ */
(function () {
  'use strict';

  var BC = window.BC = window.BC || {};
  var root = document.documentElement;

  function reduced() { return !!BC.reduced; }
  function emit(name, payload) { if (typeof BC.emit === 'function') BC.emit(name, payload); }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  /* ==========================================================
     PART A — PRELOADER
     ========================================================== */

  /* Right half of each silhouette, top-centre -> bottom-centre.
     Both lists share the same length and the same landmark order
     (skull, jaw, shoulder, arm, hand, torso, thigh, foot), so the
     two shapes can be interpolated point by point. */
  /* Landmark order (both lists):
     0 crown, 1-4 skull/jaw, 5-6 neck, 7-9 shoulder, 10-13 outer arm,
     14-15 hand, 16-19 inner arm, 20 armpit, 21-23 torso side,
     24-27 outer leg, 28-29 foot, 30-33 inner leg, 34 crotch. */
  var GORILLA_R = [
    [100, 24], [117, 28], [132, 42], [137, 60], [131, 76],
    [119, 83], [116, 88], [134, 90], [155, 94], [171, 108],
    [178, 132], [180, 158], [182, 184], [182, 208], [177, 230],
    [159, 232], [157, 210], [158, 184], [158, 158], [156, 130],
    [148, 106], [141, 122], [128, 152], [134, 178], [136, 200],
    [132, 220], [132, 236], [130, 246], [140, 254], [119, 255],
    [116, 246], [116, 236], [115, 220], [113, 204], [100, 188]
  ];
  var HUMAN_R = [
    [100, 16], [109, 19], [112, 30], [112, 42], [110, 51],
    [106, 56], [105, 62], [117, 70], [134, 78], [141, 94],
    [144, 120], [145, 144], [147, 168], [148, 189], [146, 206],
    [136, 207], [134, 188], [133, 166], [131, 142], [129, 118],
    [124, 96], [118, 114], [114, 140], [121, 160], [124, 186],
    [119, 208], [119, 228], [115, 242], [126, 252], [108, 253],
    [108, 242], [108, 228], [107, 208], [106, 190], [100, 168]
  ];

  /* Mirror a right half into a full closed contour. */
  function mirrorHalf(half) {
    var pts = half.slice();
    for (var i = half.length - 2; i >= 1; i--) {
      pts.push([200 - half[i][0], half[i][1]]);
    }
    return pts;
  }

  var GORILLA = mirrorHalf(GORILLA_R);
  var HUMAN = mirrorHalf(HUMAN_R);

  /* Closed Catmull-Rom -> cubic bezier path data. */
  function toPath(points) {
    var n = points.length;
    if (!n) return '';
    var k = 0.92;
    var d = 'M' + points[0][0].toFixed(2) + ' ' + points[0][1].toFixed(2);
    for (var i = 0; i < n; i++) {
      var p0 = points[(i - 1 + n) % n];
      var p1 = points[i];
      var p2 = points[(i + 1) % n];
      var p3 = points[(i + 2) % n];
      var c1x = p1[0] + (p2[0] - p0[0]) / 6 * k;
      var c1y = p1[1] + (p2[1] - p0[1]) / 6 * k;
      var c2x = p2[0] - (p3[0] - p1[0]) / 6 * k;
      var c2y = p2[1] - (p3[1] - p1[1]) / 6 * k;
      d += 'C' + c1x.toFixed(2) + ' ' + c1y.toFixed(2) +
           ',' + c2x.toFixed(2) + ' ' + c2y.toFixed(2) +
           ',' + p2[0].toFixed(2) + ' ' + p2[1].toFixed(2);
    }
    return d + 'Z';
  }

  function morphPoints(t) {
    var out = [];
    for (var i = 0; i < GORILLA.length; i++) {
      out.push([
        lerp(GORILLA[i][0], HUMAN[i][0], t),
        lerp(GORILLA[i][1], HUMAN[i][1], t)
      ]);
    }
    return out;
  }

  var STATUS = [
    [0,   'Orman protokolü yükleniyor...'],
    [18,  'Kaslar kalibre ediliyor...'],
    [36,  'Muzlar saf enerjiye çevriliyor...'],
    [54,  'Omurga dikleşiyor, efsane doğuyor...'],
    [72,  'Zekâ modülü kuruluyor: sınır yok...'],
    [88,  'Karizma katsayısı tavan yaptı...'],
    [97,  'Berkay Cabbar sahneye çıkıyor...']
  ];

  function initPreloader() {
    var pl = document.getElementById('preloader');
    if (!pl) { emit('preloader:done', { skipped: true }); return; }

    var figure = document.getElementById('pl-figure');
    var glow = document.getElementById('pl-glow');
    var bodyFill = document.getElementById('pl-body');
    var spark = document.getElementById('pl-spark');
    var num = document.getElementById('pl-num');
    var fill = document.getElementById('pl-fill');
    var status = document.getElementById('pl-status');

    root.classList.add('bc-preloader-active');

    var done = false;
    var forced = false;
    var shown = 0;
    var target = 0;
    var startedAt = 0;
    var rafId = 0;
    var timers = [];
    var statusIndex = -1;
    var pathLength = 0;

    function later(fn, ms) { timers.push(window.setTimeout(fn, ms)); }

    function setD(d) {
      if (figure) figure.setAttribute('d', d);
      if (glow) glow.setAttribute('d', d);
      if (bodyFill) bodyFill.setAttribute('d', d);
    }

    function measure() {
      if (!figure || typeof figure.getTotalLength !== 'function') return 0;
      try { return figure.getTotalLength(); } catch (err) { return 0; }
    }

    function applyDraw(ratio) {
      if (!figure || !pathLength) return;
      var offset = pathLength * (1 - clamp(ratio, 0, 1));
      figure.style.strokeDasharray = pathLength + ' ' + pathLength;
      figure.style.strokeDashoffset = offset.toFixed(2);
      if (glow) {
        glow.style.strokeDasharray = pathLength + ' ' + pathLength;
        glow.style.strokeDashoffset = offset.toFixed(2);
      }
      if (spark && typeof figure.getPointAtLength === 'function') {
        if (ratio > 0.02 && ratio < 0.995) {
          try {
            var pt = figure.getPointAtLength(pathLength * ratio);
            spark.setAttribute('cx', pt.x.toFixed(2));
            spark.setAttribute('cy', pt.y.toFixed(2));
            spark.style.opacity = '1';
          } catch (err) { spark.style.opacity = '0'; }
        } else {
          spark.style.opacity = '0';
        }
      }
    }

    function setStatus(pct) {
      if (!status) return;
      var idx = 0;
      for (var i = 0; i < STATUS.length; i++) {
        if (pct >= STATUS[i][0]) idx = i;
      }
      if (idx === statusIndex) return;
      statusIndex = idx;
      var text = STATUS[idx][1];
      status.classList.add('is-swapping');
      later(function () {
        if (!status) return;
        status.textContent = text;
        status.classList.remove('is-swapping');
      }, 160);
    }

    function paint(pct) {
      var p = clamp(pct, 0, 100) / 100;

      /* 0 -> 80%: draw the gorilla. 80 -> 100%: morph to human. */
      var morphT = p <= 0.8 ? 0 : (p - 0.8) / 0.2;
      morphT = morphT * morphT * (3 - 2 * morphT); /* smoothstep */
      var drawT = clamp(p / 0.8, 0, 1);

      if (morphT > 0) {
        setD(toPath(morphPoints(morphT)));
        pathLength = measure() || pathLength;
      }
      applyDraw(drawT);

      /* the silhouette only fills in once its outline is complete */
      if (bodyFill) {
        var fillOpacity = p < 0.78 ? 0 : (p - 0.78) / 0.22;
        bodyFill.style.opacity = (fillOpacity * 0.9).toFixed(3);
      }
      if (num) num.textContent = String(Math.round(clamp(pct, 0, 100)));
      if (fill) fill.style.transform = 'scaleX(' + p.toFixed(4) + ')';
      pl.setAttribute('aria-valuenow', String(Math.round(clamp(pct, 0, 100))));
      setStatus(pct);
    }

    function finish() {
      if (done) return;
      done = true;
      window.cancelAnimationFrame(rafId);
      paint(100);
      root.classList.remove('bc-preloader-active');
      root.classList.add('bc-evolved');
      pl.classList.add('is-done');
      emit('preloader:done', { ok: true });
      var wipe = reduced() ? 60 : 1000;
      later(function () {
        for (var i = 0; i < timers.length; i++) window.clearTimeout(timers[i]);
        if (pl.parentNode) pl.parentNode.removeChild(pl);
      }, wipe);
    }

    function force() {
      forced = true;
      target = 100;
      if (reduced()) finish();
    }

    /* ---- reduced motion: no drawing, 400ms maximum ---- */
    if (reduced()) {
      setD(toPath(HUMAN));
      pathLength = measure();
      if (figure) { figure.style.strokeDasharray = 'none'; figure.style.strokeDashoffset = '0'; }
      if (glow) { glow.style.strokeDasharray = 'none'; glow.style.strokeDashoffset = '0'; }
      if (spark) spark.style.opacity = '0';
      if (num) num.textContent = '100';
      if (fill) fill.style.transform = 'scaleX(1)';
      if (bodyFill) bodyFill.style.opacity = '.9';
      if (status) status.textContent = STATUS[STATUS.length - 1][1];
      pl.setAttribute('aria-valuenow', '100');
      later(finish, 400);
      return;
    }

    /* ---- animated path ---- */
    setD(toPath(GORILLA));
    pathLength = measure();
    applyDraw(0);

    startedAt = (window.performance && performance.now) ? performance.now() : Date.now();

    function tick(now) {
      if (done) return;
      var t = now - startedAt;
      if (!forced) {
        /* organic climb that eases toward 92 and never stalls at 0 */
        target = 92 * (1 - Math.exp(-t / 480));
      }
      shown = lerp(shown, target, forced ? 0.34 : 0.11);
      if (forced && shown > 99.3) shown = 100;
      paint(shown);
      if (forced && shown >= 100) { finish(); return; }
      rafId = window.requestAnimationFrame(tick);
    }
    rafId = window.requestAnimationFrame(tick);

    /* ---- completion triggers: window load OR 1500ms cap ---- */
    if (document.readyState === 'complete') {
      later(force, 160);
    } else {
      window.addEventListener('load', function onLoad() {
        window.removeEventListener('load', onLoad);
        force();
      });
    }
    later(force, 1500);
    later(finish, 2500);   /* absolute never-hang guarantee */

    /* If the tab is hidden the rAF loop pauses; finish on return. */
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden && forced && !done) finish();
    });
  }

  /* ==========================================================
     PART B — NAV
     ========================================================== */
  function initNav() {
    var nav = document.getElementById('bc-nav');
    if (!nav) return;

    var burger = document.getElementById('bc-burger');
    var menu = document.getElementById('bc-menu');
    var menuLinks = menu ? menu.querySelectorAll('.bc-menu__link') : [];
    var navLinks = nav.querySelectorAll('.bc-nav__links a');
    var isOpen = false;

    /* --- keep --bc-nav-h in sync --- */
    function syncHeight() {
      var h = nav.offsetHeight;
      if (h) root.style.setProperty('--bc-nav-h', h + 'px');
    }
    syncHeight();

    /* --- sticky / blurred state after 80px --- */
    var throttle = typeof BC.rafThrottle === 'function'
      ? BC.rafThrottle
      : function (fn) { return fn; };

    var onScroll = throttle(function () {
      var y = window.pageYOffset || root.scrollTop || 0;
      nav.classList.toggle('is-stuck', y > 80);
    });
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    var onResize = (typeof BC.debounce === 'function' ? BC.debounce : function (fn) { return fn; })(function () {
      syncHeight();
      if (isOpen && window.innerWidth > 920) closeMenu();
    }, 150);
    window.addEventListener('resize', onResize, { passive: true });

    /* --- reveal the bar once the preloader is gone --- */
    function goLive() { nav.classList.add('is-live'); syncHeight(); }
    if (typeof BC.on === 'function') BC.on('preloader:done', goLive);
    window.setTimeout(goLive, 2600);

    /* --- full-screen menu --- */
    var i;
    for (i = 0; i < menuLinks.length; i++) {
      menuLinks[i].style.setProperty('--i', String(i));
    }

    function focusables() {
      if (!menu) return [];
      var list = menu.querySelectorAll('a[href], button:not([disabled])');
      return Array.prototype.slice.call(list);
    }

    function openMenu() {
      if (!menu || !burger || isOpen) return;
      isOpen = true;
      menu.classList.add('is-open');
      menu.setAttribute('aria-hidden', 'false');
      burger.setAttribute('aria-expanded', 'true');
      burger.setAttribute('aria-label', 'Menüyü kapat');
      root.classList.add('bc-menu-open');
      document.addEventListener('keydown', onKeydown, true);
      window.setTimeout(function () {
        var f = focusables();
        if (f.length && isOpen) f[0].focus();
      }, reduced() ? 0 : 260);
      emit('menu:open', true);
    }

    function closeMenu(restoreFocus) {
      if (!menu || !burger || !isOpen) return;
      isOpen = false;
      menu.classList.remove('is-open');
      menu.setAttribute('aria-hidden', 'true');
      burger.setAttribute('aria-expanded', 'false');
      burger.setAttribute('aria-label', 'Menüyü aç');
      root.classList.remove('bc-menu-open');
      document.removeEventListener('keydown', onKeydown, true);
      if (restoreFocus !== false) burger.focus();
      emit('menu:close', false);
    }

    function onKeydown(e) {
      if (!isOpen) return;
      if (e.key === 'Escape' || e.key === 'Esc') {
        e.preventDefault();
        closeMenu();
        return;
      }
      if (e.key !== 'Tab') return;
      var f = focusables();
      if (!f.length) return;
      f.push(burger);
      var first = f[0];
      var last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    if (burger && menu) {
      burger.addEventListener('click', function () {
        if (isOpen) closeMenu(); else openMenu();
      });
      for (i = 0; i < menuLinks.length; i++) {
        menuLinks[i].addEventListener('click', function () {
          /* close first so the scroll lock is lifted before core.js scrolls */
          closeMenu(false);
        });
      }
    }

    /* --- scroll spy --- */
    if ('IntersectionObserver' in window && navLinks.length) {
      var map = {};
      var sections = [];
      for (i = 0; i < navLinks.length; i++) {
        var href = navLinks[i].getAttribute('href') || '';
        if (href.charAt(0) !== '#' || href.length < 2) continue;
        var section = document.getElementById(href.slice(1));
        if (!section) continue;
        map[href.slice(1)] = navLinks[i];
        sections.push(section);
      }
      if (sections.length) {
        var spy = new IntersectionObserver(function (entries) {
          for (var j = 0; j < entries.length; j++) {
            var entry = entries[j];
            if (!entry.isIntersecting) continue;
            var link = map[entry.target.id];
            if (!link) continue;
            for (var k = 0; k < navLinks.length; k++) navLinks[k].removeAttribute('aria-current');
            link.setAttribute('aria-current', 'true');
          }
        }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
        for (i = 0; i < sections.length; i++) spy.observe(sections[i]);
      }
    }
  }

  /* ==========================================================
     BOOT
     ========================================================== */
  function boot() {
    initPreloader();
    initNav();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
