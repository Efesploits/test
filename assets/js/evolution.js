/* ============================================================
   BERKAY CABBAR — EVOLUTION :: SECTION 02 "EVRİM"
   Scroll-scrubbed silhouette morph, goril -> Berkay Cabbar.

   Owns: partials/evolution.html, assets/css/evolution.css.
   Reads window.BC helpers from core.js but never writes to it.
   ============================================================ */
(function () {
  'use strict';

  var BC = window.BC || {};

  var clamp = BC.clamp || function (v, a, b) { return v < a ? a : (v > b ? b : v); };
  var lerp = BC.lerp || function (a, b, t) { return a + (b - a) * t; };
  var debounce = BC.debounce || function (fn, w) {
    var t = 0;
    return function () {
      var args = arguments, ctx = this;
      window.clearTimeout(t);
      t = window.setTimeout(function () { fn.apply(ctx, args); }, w || 120);
    };
  };
  var rafThrottle = BC.rafThrottle || function (fn) {
    var q = false;
    return function () {
      if (q) return;
      q = true;
      window.requestAnimationFrame(function () { q = false; fn(); });
    };
  };

  /* --------------------------------------------------------
     0. DOM — every lookup guarded, bail out early.
     -------------------------------------------------------- */
  var section = document.getElementById('evrim');
  if (!section) return;

  var track = document.getElementById('evrim-track');
  var stage = document.getElementById('evrim-stage');
  var bodyPath = document.getElementById('evrim-body-path');
  var echoPath = document.getElementById('evrim-echo-path');
  var rimPath = document.getElementById('evrim-rim-path');
  var clipPath = document.getElementById('evrim-clip-path');
  var figureWrap = document.getElementById('evrim-figure-wrap');
  var furGroup = document.getElementById('evrim-fur');
  var circuitGroup = document.getElementById('evrim-circuit');
  var canvas = document.getElementById('evrim-particles');
  var captionBox = document.getElementById('evrim-captions');
  var railFill = document.getElementById('evrim-rail-fill');
  var counterEl = document.getElementById('evrim-counter');
  var epochEl = document.getElementById('evrim-epoch');

  if (!track || !stage || !bodyPath || !echoPath || !rimPath || !clipPath || !figureWrap) return;

  var captions = captionBox ? captionBox.querySelectorAll('.evrim__caption') : [];
  var nodes = section.querySelectorAll('.evrim__node');

  var poseEls = [];
  for (var pi = 1; pi <= 5; pi++) {
    var pel = document.getElementById('evrim-pose-' + pi);
    if (!pel) return;
    poseEls.push(pel);
  }

  var EPOCHS = ['2.000.000 YIL ÖNCE', '800.000 YIL ÖNCE', '300.000 YIL ÖNCE', '40.000 YIL ÖNCE', 'BUGÜN'];
  var STAGE_COUNT = 5;
  var SEGMENTS = STAGE_COUNT - 1;

  /* --------------------------------------------------------
     1. Path parsing / interpolation
     -------------------------------------------------------- */
  var NUM_RE = /-?\d*\.?\d+(?:[eE][-+]?\d+)?/g;

  function parseNumbers(d) {
    var out = [];
    var m;
    NUM_RE.lastIndex = 0;
    while ((m = NUM_RE.exec(d)) !== null) out.push(parseFloat(m[0]));
    return out;
  }

  function parseCommands(d) {
    return d.replace(/[^A-Za-z]/g, '').toUpperCase();
  }

  /* Command sequence turned into a serializer plan: how many numbers
     each command eats. Shared by every pose (verified below). */
  var ARITY = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 };

  var poses = [];
  var commandSeq = '';
  var plan = null;
  var morphOK = false;

  (function buildPoses() {
    var i;
    for (i = 0; i < poseEls.length; i++) {
      var d = poseEls[i].getAttribute('d') || '';
      poses.push({ d: d, nums: parseNumbers(d), cmds: parseCommands(d) });
    }

    /* --- verification: identical command sequence + identical point count --- */
    commandSeq = poses[0].cmds;
    var refLen = poses[0].nums.length;
    var ok = refLen > 0;
    for (i = 1; i < poses.length; i++) {
      if (poses[i].cmds !== commandSeq) { ok = false; break; }
      if (poses[i].nums.length !== refLen) { ok = false; break; }
    }
    if (ok) {
      /* every command must be a cubic (plus the leading M and trailing Z) */
      var expected = 0;
      plan = [];
      for (i = 0; i < commandSeq.length; i++) {
        var c = commandSeq.charAt(i);
        var n = ARITY[c];
        if (n === undefined) { ok = false; break; }
        plan.push({ c: c, n: n });
        expected += n;
      }
      if (expected !== refLen) ok = false;
    }
    if (!ok) {
      plan = null;
      if (window.console && console.warn) {
        console.warn('[evrim] pose paths are not interpolable — falling back to discrete poses.');
      }
    }
    morphOK = ok;
  })();

  var frame = morphOK ? new Array(poses[0].nums.length) : null;

  /* Reusable serializer buffer — no per-frame array allocation. */
  var chunks = plan ? new Array(plan.length) : null;

  function round2(v) { return Math.round(v * 100) / 100; }

  function serialize(nums) {
    var k = 0;
    for (var i = 0; i < plan.length; i++) {
      var step = plan[i];
      var n = step.n;
      if (n === 0) { chunks[i] = step.c; continue; }
      var s = step.c;
      for (var j = 0; j < n; j++) {
        s += (j ? ' ' : '') + round2(nums[k++]);
      }
      chunks[i] = s;
    }
    return chunks.join('');
  }

  function morph(p) {
    var seg = p * SEGMENTS;
    var idx = Math.floor(seg);
    if (idx >= SEGMENTS) idx = SEGMENTS - 1;
    if (idx < 0) idx = 0;
    var t = seg - idx;
    /* smoothstep keeps the joints from snapping at the keyframes */
    var te = t * t * (3 - 2 * t);
    var a = poses[idx].nums;
    var b = poses[idx + 1].nums;
    for (var i = 0; i < a.length; i++) frame[i] = a[i] + (b[i] - a[i]) * te;
    return serialize(frame);
  }

  /* --------------------------------------------------------
     2. Colour ramps (fur/amber -> moss -> chrome/cyan)
     -------------------------------------------------------- */
  var RAMP_A = [[255, 200, 97], [157, 255, 196], [223, 233, 245]];
  var RAMP_B = [[255, 176, 46], [63, 163, 99], [34, 230, 255]];
  var RAMP_C = [[42, 28, 18], [11, 41, 28], [90, 47, 214]];
  var RAMP_RIM = [[255, 176, 46], [111, 224, 154], [34, 230, 255]];

  function rampColor(keys, p) {
    var n = keys.length - 1;
    var s = clamp(p, 0, 1) * n;
    var i = Math.floor(s);
    if (i >= n) i = n - 1;
    var t = s - i;
    var a = keys[i], b = keys[i + 1];
    return 'rgb(' +
      Math.round(lerp(a[0], b[0], t)) + ',' +
      Math.round(lerp(a[1], b[1], t)) + ',' +
      Math.round(lerp(a[2], b[2], t)) + ')';
  }

  function smoothstep(edge0, edge1, x) {
    var t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  }

  /* --------------------------------------------------------
     3. Fur strands + circuit traces (built once, clipped to
        the live silhouette so they always sit on the body)
     -------------------------------------------------------- */
  var SVG_NS = 'http://www.w3.org/2000/svg';
  var lite = !!BC.prefersLowPower;
  var decorBuilt = false;

  function makeRng(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  function buildFur() {
    if (!furGroup || furGroup.childNodes.length) return;
    var rnd = makeRng(20260828);
    var count = lite ? 46 : 96;
    var frag = document.createDocumentFragment();
    for (var i = 0; i < count; i++) {
      var x = 132 + rnd() * 336;
      var y = 188 + rnd() * 452;
      /* fur sweeps down and away from the spine */
      var dir = x < 300 ? -1 : 1;
      var len = 9 + rnd() * 15;
      var ang = (0.85 + rnd() * 0.7) * dir;
      var line = document.createElementNS(SVG_NS, 'line');
      line.setAttribute('x1', round2(x));
      line.setAttribute('y1', round2(y));
      line.setAttribute('x2', round2(x + Math.sin(ang) * len * 0.75));
      line.setAttribute('y2', round2(y + Math.abs(Math.cos(ang)) * len + 3));
      line.setAttribute('stroke-width', (1.4 + rnd() * 1.5).toFixed(2));
      line.setAttribute('opacity', (0.3 + rnd() * 0.6).toFixed(2));
      frag.appendChild(line);
    }
    furGroup.appendChild(frag);
  }

  function buildCircuit() {
    if (!circuitGroup || circuitGroup.childNodes.length) return;
    var rnd = makeRng(77714);
    var traces = lite ? 12 : 24;
    var frag = document.createDocumentFragment();
    var i, j;

    for (i = 0; i < traces; i++) {
      var x = 232 + rnd() * 136;
      var y = 92 + rnd() * 520;
      var dir = rnd() < 0.5 ? -1 : 1;
      var d = 'M' + round2(x) + ' ' + round2(y);
      var segs = 2 + Math.floor(rnd() * 3);
      for (j = 0; j < segs; j++) {
        if (j % 2 === 0) {
          x += dir * (16 + rnd() * 34);
          d += 'H' + round2(x);
        } else {
          var dy = (rnd() < 0.5 ? -1 : 1) * (14 + rnd() * 40);
          /* chamfered corner reads as a circuit trace */
          var cx = x + dir * 7;
          var cy = y + (dy > 0 ? 7 : -7);
          d += 'L' + round2(cx) + ' ' + round2(cy);
          y += dy;
          d += 'V' + round2(y);
        }
      }
      var path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('d', d);
      path.setAttribute('opacity', (0.4 + rnd() * 0.6).toFixed(2));
      frag.appendChild(path);

      var dot = document.createElementNS(SVG_NS, 'circle');
      dot.setAttribute('cx', round2(x));
      dot.setAttribute('cy', round2(y));
      dot.setAttribute('r', (1.6 + rnd() * 2).toFixed(2));
      dot.setAttribute('opacity', (0.5 + rnd() * 0.5).toFixed(2));
      frag.appendChild(dot);
    }

    /* a few free-floating nodes for density */
    var extras = lite ? 8 : 18;
    for (i = 0; i < extras; i++) {
      var n = document.createElementNS(SVG_NS, 'circle');
      n.setAttribute('cx', round2(230 + rnd() * 140));
      n.setAttribute('cy', round2(88 + rnd() * 530));
      n.setAttribute('r', (1 + rnd() * 1.6).toFixed(2));
      n.setAttribute('opacity', (0.35 + rnd() * 0.5).toFixed(2));
      frag.appendChild(n);
    }
    circuitGroup.appendChild(frag);
  }

  function buildDecor() {
    if (decorBuilt) return;
    decorBuilt = true;
    buildFur();
    buildCircuit();
  }

  /* --------------------------------------------------------
     4. Particle bursts
     -------------------------------------------------------- */
  var ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null;
  var particles = [];
  var partRaf = 0;
  var canvasW = 0;
  var canvasH = 0;
  var emit = { x: 0, y: 0 };
  var lastTick = 0;

  function sizeCanvas() {
    if (!ctx || !canvas) return;
    var w = stage.clientWidth || 0;
    var h = stage.clientHeight || 0;
    if (!w || !h) return;
    var dpr = BC.dpr ? BC.dpr() : Math.min(window.devicePixelRatio || 1, 2);
    canvasW = w;
    canvasH = h;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function measureEmitter() {
    if (!figureWrap || !stage) return;
    var fr = figureWrap.getBoundingClientRect();
    var sr = stage.getBoundingClientRect();
    emit.x = (fr.left - sr.left) + fr.width * 0.5;
    emit.y = (fr.top - sr.top) + fr.height * 0.52;
  }

  function burst(color, power) {
    if (!ctx) return;
    if (BC.reduced) return;
    var count = lite ? 34 : 78;
    count = Math.round(count * (power || 1));
    for (var i = 0; i < count; i++) {
      var ang = Math.random() * Math.PI * 2;
      var sp = 1.4 + Math.random() * 6.4;
      particles.push({
        x: emit.x + (Math.random() - 0.5) * 46,
        y: emit.y + (Math.random() - 0.5) * 160,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp - 1.1,
        life: 1,
        decay: 0.008 + Math.random() * 0.018,
        size: 0.9 + Math.random() * 2.6,
        color: color
      });
    }
    if (particles.length > 460) particles.splice(0, particles.length - 460);
    startParticles();
  }

  function startParticles() {
    if (partRaf || !ctx) return;
    lastTick = 0;
    partRaf = window.requestAnimationFrame(tickParticles);
  }

  function stopParticles() {
    if (partRaf) window.cancelAnimationFrame(partRaf);
    partRaf = 0;
    if (ctx && canvasW) ctx.clearRect(0, 0, canvasW, canvasH);
  }

  function tickParticles(now) {
    partRaf = 0;
    if (!ctx) return;
    if (document.hidden || !particles.length) { stopParticles(); return; }

    var dt = lastTick ? Math.min((now - lastTick) / 16.667, 2.6) : 1;
    lastTick = now;

    ctx.clearRect(0, 0, canvasW, canvasH);
    ctx.globalCompositeOperation = 'lighter';

    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 0.052 * dt;
      p.vx *= 0.986;
      p.vy *= 0.986;
      p.life -= p.decay * dt;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      ctx.globalAlpha = p.life * p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.35 + p.life * 0.9), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    partRaf = window.requestAnimationFrame(tickParticles);
  }

  /* --------------------------------------------------------
     5. Stage boundary effects
     -------------------------------------------------------- */
  var flashTimer = 0;
  var flashPending = 0;

  function flash() {
    if (!stage || BC.reduced) return;
    stage.classList.remove('is-flash');
    if (flashPending) window.cancelAnimationFrame(flashPending);
    /* re-add on the next frame so the CSS animation restarts
       without a forced synchronous layout */
    flashPending = window.requestAnimationFrame(function () {
      flashPending = 0;
      stage.classList.add('is-flash');
      window.clearTimeout(flashTimer);
      flashTimer = window.setTimeout(function () {
        stage.classList.remove('is-flash');
      }, 520);
    });
  }

  var activeStage = -1;

  function setStage(idx, p) {
    if (idx === activeStage) return;
    var first = activeStage === -1;
    activeStage = idx;

    var i;
    for (i = 0; i < captions.length; i++) {
      captions[i].classList.toggle('is-active', i === idx);
    }
    for (i = 0; i < nodes.length; i++) {
      nodes[i].classList.toggle('is-active', i === idx);
      nodes[i].classList.toggle('is-past', i < idx);
    }
    if (counterEl) counterEl.textContent = '0' + (idx + 1);
    if (epochEl) epochEl.textContent = EPOCHS[idx] || '';

    if (!first) {
      flash();
      burst(rampColor(RAMP_RIM, p), idx === STAGE_COUNT - 1 ? 1.5 : 1);
    }
  }

  /* --------------------------------------------------------
     6. Frame application
     -------------------------------------------------------- */
  var lastVars = { fa: '', fb: '', fc: '', rim: '' };

  function applyFrame(p) {
    var d = morphOK ? morph(p) : poses[clamp(Math.round(p * SEGMENTS), 0, SEGMENTS)].d;
    bodyPath.setAttribute('d', d);
    echoPath.setAttribute('d', d);
    rimPath.setAttribute('d', d);
    clipPath.setAttribute('d', d);

    var s = stage.style;
    s.setProperty('--p', p.toFixed(4));
    s.setProperty('--env-a', (1 - smoothstep(0.18, 0.42, p)).toFixed(3));
    s.setProperty('--env-b', (smoothstep(0.16, 0.40, p) * (1 - smoothstep(0.58, 0.80, p))).toFixed(3));
    s.setProperty('--env-c', smoothstep(0.58, 0.82, p).toFixed(3));
    s.setProperty('--fur', (1 - smoothstep(0.10, 0.50, p)).toFixed(3));
    s.setProperty('--circuit', smoothstep(0.46, 0.86, p).toFixed(3));
    s.setProperty('--lift', smoothstep(0.28, 0.98, p).toFixed(3));

    var fa = rampColor(RAMP_A, p);
    var fb = rampColor(RAMP_B, p);
    var fc = rampColor(RAMP_C, p);
    var rim = rampColor(RAMP_RIM, p);
    if (fa !== lastVars.fa) { s.setProperty('--fa', fa); lastVars.fa = fa; }
    if (fb !== lastVars.fb) { s.setProperty('--fb', fb); lastVars.fb = fb; }
    if (fc !== lastVars.fc) { s.setProperty('--fc', fc); lastVars.fc = fc; }
    if (rim !== lastVars.rim) { s.setProperty('--rim', rim); lastVars.rim = rim; }

    if (railFill) railFill.style.transform = 'scaleX(' + p.toFixed(4) + ')';

    stage.classList.toggle('is-moving', p > 0.03);

    setStage(clamp(Math.round(p * SEGMENTS), 0, SEGMENTS), p);
  }

  /* --------------------------------------------------------
     7. Scroll plumbing — cached metrics, zero layout reads
        inside the scroll handler.
     -------------------------------------------------------- */
  var metrics = { top: 0, span: 1 };
  var lastP = -1;
  var visible = false;
  var running = false;

  function scrollY() {
    return window.pageYOffset || document.documentElement.scrollTop || 0;
  }

  function measure() {
    if (!track) return;
    var r = track.getBoundingClientRect();
    metrics.top = r.top + scrollY();
    metrics.span = Math.max(1, r.height - window.innerHeight);
    measureEmitter();
    sizeCanvas();
    lastP = -1;
  }

  function readProgress() {
    return clamp((scrollY() - metrics.top) / metrics.span, 0, 1);
  }

  var update = rafThrottle(function () {
    if (!running) return;
    var p = readProgress();
    if (lastP >= 0 && Math.abs(p - lastP) < 0.0004) return;
    lastP = p;
    applyFrame(p);
  });

  function onScroll() {
    if (!visible) return;
    update();
  }

  var onResize = debounce(function () {
    if (!running) return;
    measure();
    update();
  }, 150);

  /* --------------------------------------------------------
     8. Mode switching
     -------------------------------------------------------- */
  var MQ = '(min-width: 621px) and (min-height: 481px) and (prefers-reduced-motion: no-preference)';
  var mq = window.matchMedia ? window.matchMedia(MQ) : null;
  var io = null;

  function scrubMode() {
    if (BC.reduced) return false;
    if (!mq) return false;
    return mq.matches;
  }

  function start() {
    if (running) return;
    running = true;
    buildDecor();

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('orientationchange', onResize, { passive: true });

    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(function (entries) {
        for (var i = 0; i < entries.length; i++) {
          visible = entries[i].isIntersecting;
          if (visible) { measure(); update(); }
          else stopParticles();
        }
      }, { rootMargin: '25% 0px 25% 0px', threshold: 0 });
      io.observe(track);
    } else {
      visible = true;
    }

    measure();
    lastP = -1;
    applyFrame(readProgress());
  }

  function stop() {
    if (!running) return;
    running = false;
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('orientationchange', onResize);
    if (io) { io.disconnect(); io = null; }
    stopParticles();
    particles.length = 0;
    stage.classList.remove('is-flash', 'is-moving');
    visible = false;
  }

  function syncMode() {
    if (scrubMode()) start();
    else stop();
  }

  /* --------------------------------------------------------
     9. Boot
     -------------------------------------------------------- */
  /* Seed the figure with pose 1 so the stage is never blank,
     even for a split second before the first scroll frame. */
  (function seed() {
    var d = poses[0].d;
    bodyPath.setAttribute('d', d);
    echoPath.setAttribute('d', d);
    rimPath.setAttribute('d', d);
    clipPath.setAttribute('d', d);
  })();

  syncMode();

  if (mq) {
    if (mq.addEventListener) mq.addEventListener('change', syncMode);
    else if (mq.addListener) mq.addListener(syncMode);
  }

  if (typeof BC.on === 'function') {
    BC.on('motion:change', syncMode);
    BC.on('preloader:done', function () {
      if (running) { measure(); lastP = -1; update(); }
    });
    BC.on('visibility', function (isVisible) {
      if (!isVisible) stopParticles();
    });
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stopParticles();
  });

  window.addEventListener('load', function () {
    if (running) { measure(); lastP = -1; update(); }
  });

  if ('ResizeObserver' in window) {
    var ro = new ResizeObserver(debounce(function () {
      if (running) { measure(); update(); }
    }, 160));
    ro.observe(track);
  }
})();
