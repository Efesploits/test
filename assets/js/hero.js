/* ============================================================
   BERKAY CABBAR — EVOLUTION :: HERO
   Particle constellation, per-letter title, typewriter,
   magnetic buttons, pointer + scroll parallax.
   ============================================================ */
(function () {
  'use strict';

  var hero = document.getElementById('hero');
  if (!hero) return;

  window.BC = window.BC || {};

  var TAU = Math.PI * 2;
  var mqReduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

  function readReduced() {
    if (window.BC && window.BC.reduced === true) return true;
    return !!(mqReduce && mqReduce.matches);
  }
  var reduced = readReduced();

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  /* ==========================================================
     1. TITLE — split into words / letters, each letter carrying
        its own slice of the shared gradient.
     ========================================================== */
  var titleLine = hero.querySelector('.hero__title-line');
  var titleEl = hero.querySelector('.hero__title');
  var letters = [];
  var isSplit = false;

  function splitTitle() {
    if (!titleLine) return;
    var text = (titleLine.getAttribute('data-text') || titleLine.textContent || '').trim();
    if (!text) return;

    var words = text.split(/\s+/);
    var frag = document.createDocumentFragment();
    var index = 0;

    for (var w = 0; w < words.length; w++) {
      if (w > 0) frag.appendChild(document.createTextNode(' '));
      var word = document.createElement('span');
      word.className = 'hero__word';
      for (var c = 0; c < words[w].length; c++) {
        var span = document.createElement('span');
        span.className = 'hero__ltr';
        span.textContent = words[w].charAt(c);
        span.style.setProperty('--i', String(index));
        index++;
        word.appendChild(span);
        letters.push(span);
      }
      frag.appendChild(word);
    }

    titleLine.textContent = '';
    titleLine.appendChild(frag);
    titleLine.setAttribute('aria-hidden', 'true');
    if (titleEl) {
      titleEl.setAttribute('aria-label', titleLine.getAttribute('data-name') || text);
    }
  }

  function paintTitleGradient() {
    if (!titleLine || !letters.length) return false;
    var total = titleLine.offsetWidth;
    var tall = titleLine.offsetHeight;
    if (total < 2 || tall < 2) return false;

    for (var i = 0; i < letters.length; i++) {
      var el = letters[i];
      el.style.backgroundSize = total + 'px ' + tall + 'px';
      el.style.backgroundPosition = (-el.offsetLeft) + 'px ' + (-el.offsetTop) + 'px';
    }
    if (!isSplit) {
      titleLine.classList.add('is-split');
      isSplit = true;
    }
    return true;
  }

  splitTitle();
  paintTitleGradient();

  /* ==========================================================
     2. TYPEWRITER
     ========================================================== */
  var typeEl = document.getElementById('hero-type');
  var PHRASES = [
    'Goril olarak doğdu.',
    'İnsan olarak yükseldi.',
    'Efsane olarak kaldı.',
    'Evrimin son halkası.'
  ];
  var tw = { i: 0, c: 0, del: false, timer: 0, on: false, started: false };

  function twClear() {
    if (tw.timer) { clearTimeout(tw.timer); tw.timer = 0; }
  }

  function twStep() {
    tw.timer = 0;
    if (!typeEl || !tw.on) return;

    var full = PHRASES[tw.i];
    var wait;

    if (!tw.del) {
      tw.c++;
      typeEl.textContent = full.slice(0, tw.c);
      if (tw.c >= full.length) { tw.del = true; wait = 1600; }
      else { wait = 48 + Math.random() * 52; }
    } else {
      tw.c--;
      typeEl.textContent = full.slice(0, Math.max(0, tw.c));
      if (tw.c <= 0) {
        tw.del = false;
        tw.i = (tw.i + 1) % PHRASES.length;
        wait = 360;
      } else { wait = 26; }
    }
    tw.timer = setTimeout(twStep, wait);
  }

  function twSetRunning(run) {
    if (!typeEl || reduced) return;
    if (run && !tw.on) {
      tw.on = true;
      if (!tw.timer) tw.timer = setTimeout(twStep, tw.started ? 120 : 1150);
      tw.started = true;
    } else if (!run && tw.on) {
      tw.on = false;
      twClear();
    }
  }

  if (typeEl) {
    if (reduced) {
      typeEl.textContent = PHRASES[0];
    } else {
      typeEl.textContent = '';
    }
  }

  /* ==========================================================
     3. BUTTONS — magnetic hover + in-page scrolling
     ========================================================== */
  var magnets = hero.querySelectorAll('[data-hero-magnetic]');
  if (magnets.length && !reduced) {
    Array.prototype.forEach.call(magnets, function (btn) {
      var MAX = 15;

      function release() {
        btn.classList.remove('is-magnetic');
        btn.style.setProperty('--mx', '0px');
        btn.style.setProperty('--my', '0px');
      }

      btn.addEventListener('pointermove', function (ev) {
        if (ev.pointerType === 'touch') return;
        var r = btn.getBoundingClientRect();
        if (!r.width || !r.height) return;
        var mx = clamp((ev.clientX - (r.left + r.width / 2)) * 0.34, -MAX, MAX);
        var my = clamp((ev.clientY - (r.top + r.height / 2)) * 0.5, -MAX, MAX);
        btn.classList.add('is-magnetic');
        btn.style.setProperty('--mx', mx.toFixed(2) + 'px');
        btn.style.setProperty('--my', my.toFixed(2) + 'px');
      });

      btn.addEventListener('pointerleave', release);
      btn.addEventListener('pointercancel', release);
      btn.addEventListener('blur', release);
    });
  }

  var jumpers = hero.querySelectorAll('[data-hero-scroll]');
  if (jumpers.length) {
    Array.prototype.forEach.call(jumpers, function (link) {
      link.addEventListener('click', function (ev) {
        /* core.js owns in-page navigation (nav offset, focus, history) —
           only step in when it is not there */
        if (window.BC && typeof window.BC.scrollToEl === 'function') return;
        var sel = link.getAttribute('data-hero-scroll');
        if (!sel) return;
        var target = null;
        try { target = document.querySelector(sel); } catch (err) { target = null; }
        if (!target) return;
        ev.preventDefault();
        if (reduced || !('scrollBehavior' in document.documentElement.style)) {
          target.scrollIntoView(true);
        } else {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  /* ==========================================================
     4. CANVAS — constellation particle field
     ========================================================== */
  var canvas = document.getElementById('hero-canvas');
  var ctx = null;
  if (canvas && canvas.getContext) {
    try { ctx = canvas.getContext('2d'); } catch (err) { ctx = null; }
  }

  var W = 1, H = 1, dpr = 1;
  var parts = [];
  var waves = [];
  var LINK = 130, LINK2 = LINK * LINK;
  var REP = 112, ATTR = 300, ATTR2 = ATTR * ATTR;
  var pointer = { x: 0, y: 0, active: false };

  /* amber -> leaf -> cyan -> violet, mirroring --grad-full */
  var STOPS = [
    [0.00, 255, 176, 46],
    [0.34, 111, 224, 154],
    [0.67, 34, 230, 255],
    [1.00, 139, 92, 255]
  ];
  var BUCKETS = 32;
  var PALETTE = [];
  (function buildPalette() {
    for (var b = 0; b <= BUCKETS; b++) {
      var t = b / BUCKETS;
      var s = 0;
      while (s < STOPS.length - 2 && t > STOPS[s + 1][0]) s++;
      var a = STOPS[s], c = STOPS[s + 1];
      var span = c[0] - a[0] || 1;
      var k = clamp((t - a[0]) / span, 0, 1);
      var r = Math.round(a[1] + (c[1] - a[1]) * k);
      var g = Math.round(a[2] + (c[2] - a[2]) * k);
      var bl = Math.round(a[3] + (c[3] - a[3]) * k);
      PALETTE.push('rgb(' + r + ',' + g + ',' + bl + ')');
    }
  })();

  function bucketAt(x) {
    return clamp(Math.round((x / (W || 1)) * BUCKETS), 0, BUCKETS);
  }

  function targetCount() {
    var base = 140;
    if (W < 460) base = 44;
    else if (W < 760) base = 66;
    else if (W < 1120) base = 102;
    var cores = navigator.hardwareConcurrency || 4;
    var lite = (window.BC && window.BC.prefersLowPower === true) || cores <= 4;
    if (lite) base = Math.round(base * 0.72);
    return Math.max(22, base);
  }

  function makeParticle() {
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      vx: 0, vy: 0,
      bx: (Math.random() - 0.5) * 0.34,
      by: (Math.random() - 0.5) * 0.3,
      r: 0.8 + Math.random() * 1.9
    };
  }

  function buildParticles() {
    var want = targetCount();
    while (parts.length > want) parts.pop();
    while (parts.length < want) {
      var p = makeParticle();
      p.vx = p.bx; p.vy = p.by;
      parts.push(p);
    }
    LINK = clamp(W * 0.11, 92, 152);
    LINK2 = LINK * LINK;
  }

  function sizeCanvas() {
    if (!canvas || !ctx) return;
    var rect = hero.getBoundingClientRect();
    var nw = Math.max(1, Math.round(rect.width));
    var nh = Math.max(1, Math.round(rect.height));
    var sx = W > 1 ? nw / W : 1;
    var sy = H > 1 ? nh / H : 1;

    W = nw; H = nh;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    for (var i = 0; i < parts.length; i++) {
      parts[i].x *= sx;
      parts[i].y *= sy;
    }
    buildParticles();
  }

  function stepPhysics(dt) {
    var i, p, dx, dy, d2, d, f;
    var damp = Math.pow(0.982, dt);
    var ease = 0.006 * dt;

    for (i = 0; i < parts.length; i++) {
      p = parts[i];

      p.vx += (p.bx - p.vx) * ease;
      p.vy += (p.by - p.vy) * ease;

      if (pointer.active) {
        dx = p.x - pointer.x;
        dy = p.y - pointer.y;
        d2 = dx * dx + dy * dy;
        if (d2 < ATTR2 && d2 > 0.01) {
          d = Math.sqrt(d2);
          if (d < REP) {
            f = (1 - d / REP) * 1.35 * dt;
            p.vx += (dx / d) * f;
            p.vy += (dy / d) * f;
          } else {
            f = (1 - d / ATTR) * 0.11 * dt;
            p.vx -= (dx / d) * f;
            p.vy -= (dy / d) * f;
          }
        }
      }

      for (var k = 0; k < waves.length; k++) {
        var wv = waves[k];
        dx = p.x - wv.x;
        dy = p.y - wv.y;
        d = Math.sqrt(dx * dx + dy * dy) || 1;
        var band = Math.abs(d - wv.r);
        if (band < 74) {
          f = (1 - band / 74) * 2.4 * wv.life * dt;
          p.vx += (dx / d) * f;
          p.vy += (dy / d) * f;
        }
      }

      p.vx *= damp;
      p.vy *= damp;

      var sp = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (sp > 6.5) { p.vx = (p.vx / sp) * 6.5; p.vy = (p.vy / sp) * 6.5; }

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      if (p.x < -40) p.x = W + 40;
      else if (p.x > W + 40) p.x = -40;
      if (p.y < -40) p.y = H + 40;
      else if (p.y > H + 40) p.y = -40;
    }

    for (var j = waves.length - 1; j >= 0; j--) {
      var w = waves[j];
      w.r += (w.max * 0.016 + 4.5) * dt;
      w.life = 1 - w.r / w.max;
      if (w.life <= 0) waves.splice(j, 1);
    }
  }

  function draw() {
    if (!ctx) return;
    var i, j, p, q, dx, dy, d2, a;

    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineWidth = 1;

    /* links */
    for (i = 0; i < parts.length; i++) {
      p = parts[i];
      for (j = i + 1; j < parts.length; j++) {
        q = parts[j];
        dx = p.x - q.x;
        if (dx > LINK || dx < -LINK) continue;
        dy = p.y - q.y;
        if (dy > LINK || dy < -LINK) continue;
        d2 = dx * dx + dy * dy;
        if (d2 > LINK2) continue;
        a = (1 - Math.sqrt(d2) / LINK) * 0.42;
        if (a < 0.035) continue;
        ctx.globalAlpha = a;
        ctx.strokeStyle = PALETTE[bucketAt((p.x + q.x) * 0.5)];
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(q.x, q.y);
        ctx.stroke();
      }
    }

    /* particles: halo + core */
    for (i = 0; i < parts.length; i++) {
      p = parts[i];
      var col = PALETTE[bucketAt(p.x)];
      ctx.fillStyle = col;
      ctx.globalAlpha = 0.1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 4.2, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, TAU);
      ctx.fill();
    }

    /* shockwaves */
    for (i = 0; i < waves.length; i++) {
      var w = waves[i];
      var lf = w.life * w.life;
      ctx.strokeStyle = PALETTE[bucketAt(w.x)];
      ctx.lineWidth = 1 + 2.6 * w.life;
      ctx.globalAlpha = 0.45 * lf;
      ctx.beginPath();
      ctx.arc(w.x, w.y, w.r, 0, TAU);
      ctx.stroke();
      ctx.globalAlpha = 0.2 * lf;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(w.x, w.y, w.r * 0.84, 0, TAU);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  function shock(x, y) {
    if (reduced) return;
    if (waves.length > 3) waves.shift();
    waves.push({ x: x, y: y, r: 6, max: Math.max(W, H) * 0.82, life: 1 });
  }

  /* ==========================================================
     5. PARALLAX + SCROLL
     ========================================================== */
  var pxT = 0, pyT = 0, pxC = 0, pyC = 0;

  function onPointerMove(ev) {
    var r = hero.getBoundingClientRect();
    if (!r.width || !r.height) return;
    var x = ev.clientX - r.left;
    var y = ev.clientY - r.top;
    pointer.x = x;
    pointer.y = y;
    pointer.active = true;
    pxT = clamp((x / r.width) * 2 - 1, -1, 1);
    pyT = clamp((y / r.height) * 2 - 1, -1, 1);
  }

  function onPointerOut() {
    pointer.active = false;
    pxT = 0;
    pyT = 0;
  }

  hero.addEventListener('pointermove', onPointerMove, { passive: true });
  hero.addEventListener('pointerleave', onPointerOut, { passive: true });
  hero.addEventListener('pointercancel', onPointerOut, { passive: true });
  hero.addEventListener('pointerdown', function (ev) {
    var r = hero.getBoundingClientRect();
    if (!r.width) return;
    pointer.x = ev.clientX - r.left;
    pointer.y = ev.clientY - r.top;
    pointer.active = true;
    shock(pointer.x, pointer.y);
  }, { passive: true });

  var scrollQueued = false;
  function applyScroll() {
    scrollQueued = false;
    var rect = hero.getBoundingClientRect();
    var h = rect.height || hero.offsetHeight || window.innerHeight || 1;
    var p = clamp(-rect.top / (h * 0.9), 0, 1);
    hero.style.setProperty('--hero-scroll', p.toFixed(4));
    if (p > 0.985) hero.classList.add('is-past');
    else hero.classList.remove('is-past');
  }
  function onScroll() {
    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(applyScroll);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  applyScroll();

  /* ==========================================================
     6. LOOP + LIFECYCLE
     ========================================================== */
  var rafId = 0;
  var last = 0;
  var inView = true;

  function frame(now) {
    rafId = 0;
    var dt = last ? (now - last) / 16.6667 : 1;
    last = now;
    if (dt > 3) dt = 3;
    if (dt < 0.2) dt = 0.2;

    pxC += (pxT - pxC) * 0.08 * dt;
    pyC += (pyT - pyC) * 0.08 * dt;
    hero.style.setProperty('--px', pxC.toFixed(4));
    hero.style.setProperty('--py', pyC.toFixed(4));

    if (ctx) {
      stepPhysics(dt);
      draw();
    }

    if (running()) rafId = requestAnimationFrame(frame);
  }

  function running() {
    return inView && !document.hidden && !reduced;
  }

  function start() {
    if (rafId || !running()) return;
    last = 0;
    rafId = requestAnimationFrame(frame);
  }

  function stop() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
  }

  function sync() {
    if (running()) { start(); twSetRunning(true); }
    else { stop(); twSetRunning(false); }
  }

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) inView = entries[i].isIntersecting;
      sync();
    }, { threshold: 0 });
    io.observe(hero);
  }

  document.addEventListener('visibilitychange', sync);

  var resizeTimer = 0;
  function onResize() {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      resizeTimer = 0;
      sizeCanvas();
      paintTitleGradient();
      applyScroll();
      if (reduced && ctx) draw();
    }, 160);
  }
  window.addEventListener('resize', onResize, { passive: true });
  window.addEventListener('orientationchange', onResize, { passive: true });

  window.addEventListener('load', function () {
    paintTitleGradient();
    sizeCanvas();
    applyScroll();
    if (reduced && ctx) draw();
  });

  function applyReducedState() {
    if (reduced) {
      stop();
      twClear();
      tw.on = false;
      if (typeEl) typeEl.textContent = PHRASES[0];
      hero.style.setProperty('--px', '0');
      hero.style.setProperty('--py', '0');
      waves.length = 0;
      pointer.active = false;
      if (ctx) draw();
      hero.classList.add('is-settled');
    } else {
      if (typeEl) { tw.c = 0; tw.del = false; typeEl.textContent = ''; }
      sync();
    }
  }

  if (mqReduce) {
    var onMqChange = function () {
      reduced = readReduced();
      applyReducedState();
    };
    if (mqReduce.addEventListener) mqReduce.addEventListener('change', onMqChange);
    else if (mqReduce.addListener) mqReduce.addListener(onMqChange);
  }

  /* ==========================================================
     7. BOOT — hold the choreography back until the preloader lifts,
        so the entrance is not spent behind an overlay.
     ========================================================== */
  var booted = false;

  function boot() {
    if (booted) return;
    booted = true;

    sizeCanvas();
    paintTitleGradient();
    applyScroll();
    hero.classList.add('is-ready');

    if (reduced) {
      applyReducedState();
    } else {
      sync();
      setTimeout(function () { hero.classList.add('is-settled'); }, 3400);
    }
  }

  sizeCanvas();

  var preloader = document.getElementById('preloader');
  var bus = (window.BC && typeof window.BC.on === 'function') ? window.BC : null;

  if (preloader && bus && !document.documentElement.classList.contains('bc-evolved')) {
    bus.on('preloader:done', boot);
    setTimeout(boot, 7000);
  } else {
    boot();
  }
})();
