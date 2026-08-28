/* ============================================================
   BERKAY CABBAR — EVOLUTION :: SECTION 07 "MANİFESTO" + FOOTER
   Typed terminal manifesto, kinetic finale, magnetic share
   button with a hand-written confetti engine, reusable toast
   stack, back-to-top button and the GORİL MODU easter egg.

   Owns: partials/manifesto.html, assets/css/manifesto.css.
   Reads window.BC helpers from core.js; only writes the
   namespaced window.BC.manifesto object.
   ============================================================ */
(function () {
  'use strict';

  var BC = window.BC = window.BC || {};
  var root = document.documentElement;

  /* --------------------------------------------------------
     0. Helpers (fall back if core.js is absent)
     -------------------------------------------------------- */
  var clamp = BC.clamp || function (v, a, b) { return v < a ? a : (v > b ? b : v); };

  var rafThrottle = BC.rafThrottle || function (fn) {
    var queued = false;
    return function () {
      if (queued) return;
      queued = true;
      window.requestAnimationFrame(function () { queued = false; fn(); });
    };
  };

  var debounce = BC.debounce || function (fn, wait) {
    var t = 0;
    return function () {
      var args = arguments, ctx = this;
      window.clearTimeout(t);
      t = window.setTimeout(function () { fn.apply(ctx, args); }, wait || 120);
    };
  };

  var onVisible = BC.onVisible || function (el, cb) {
    if (el && typeof cb === 'function') { try { cb(true, null); } catch (err) { warn(err); } }
    return null;
  };

  function reduced() { return !!BC.reduced; }
  function isTouch() { return !!BC.isTouch; }
  function warn(err) { if (window.console && console.warn) console.warn('[manifesto]', err); }
  function emit(name, payload) { if (typeof BC.emit === 'function') BC.emit(name, payload); }
  function listen(name, fn) { if (typeof BC.on === 'function') BC.on(name, fn); }

  /* --------------------------------------------------------
     1. Toast system — reusable + namespaced (BC.manifesto)
     -------------------------------------------------------- */
  var TOAST_MAX = 3;
  var TOAST_TONES = { warn: 1, jungle: 1 };

  function toast(message, opts) {
    var wrap = document.getElementById('mf-toasts');
    if (!wrap || typeof message !== 'string' || !message) return null;

    var o = opts || {};
    var el = document.createElement('div');
    el.className = 'mf-toast' + (o.tone && TOAST_TONES[o.tone] ? ' mf-toast--' + o.tone : '');

    var dot = document.createElement('i');
    dot.className = 'mf-toast__dot';
    dot.setAttribute('aria-hidden', 'true');

    var text = document.createElement('span');
    text.className = 'mf-toast__text';
    text.textContent = message;

    el.appendChild(dot);
    el.appendChild(text);
    wrap.appendChild(el);

    while (wrap.children.length > TOAST_MAX && wrap.firstChild) {
      wrap.removeChild(wrap.firstChild);
    }

    window.requestAnimationFrame(function () { el.classList.add('is-in'); });

    var life = typeof o.duration === 'number' ? o.duration : 2800;
    window.setTimeout(function () { hideToast(el); }, clamp(life, 1200, 9000));
    return el;
  }

  function hideToast(el) {
    if (!el || !el.parentNode) return;
    el.classList.remove('is-in');
    el.classList.add('is-out');
    window.setTimeout(function () {
      if (el && el.parentNode) el.parentNode.removeChild(el);
    }, 450);
  }

  /* --------------------------------------------------------
     2. Terminal
     -------------------------------------------------------- */
  var KINDS = { cmd: 1, run: 1, ok: 1, out: 1, hot: 1, final: 1 };

  var FALLBACK_LINES = [
    { text: '> evrim --baslat --hedef=berkay_cabbar', kind: 'cmd', pause: 520 },
    { text: 'goril.dna arşivden çıkarılıyor...', kind: 'run', pause: 260 },
    { text: 'omurga dikleştirildi', kind: 'ok', pause: 220 },
    { text: 'başparmak karşıt konuma alınıyor...', kind: 'run', pause: 240 },
    { text: 'ateş kontrolü kalibre edildi', kind: 'ok', pause: 220 },
    { text: 'zekâ modülü kuruldu — sürüm 2.0', kind: 'ok', pause: 240 },
    { text: 'karizma: %1000 (ölçek sınırı aşıldı)', kind: 'hot', pause: 420 },
    { text: '> whoami', kind: 'cmd', pause: 360 },
    { text: 'berkay_cabbar', kind: 'out', pause: 460 },
    { text: '> durum --detayli', kind: 'cmd', pause: 380 },
    { text: 'EFSANE. AKTİF. DURDURULAMAZ.', kind: 'final', pause: 520 },
    { text: 'evrim tamamlandı — çıkış kodu: 0', kind: 'ok', pause: 0 }
  ];

  function readLines(source) {
    var out = [];
    if (source) {
      var items = source.querySelectorAll('li');
      for (var i = 0; i < items.length; i++) {
        var node = items[i];
        var txt = (node.textContent || '').replace(/\s+/g, ' ').trim();
        if (!txt) continue;
        var kind = node.getAttribute('data-kind') || 'out';
        if (!KINDS[kind]) kind = 'out';
        var pause = parseInt(node.getAttribute('data-pause'), 10);
        out.push({ text: txt, kind: kind, pause: isNaN(pause) ? 240 : pause });
      }
    }
    if (!out.length) {
      for (var j = 0; j < FALLBACK_LINES.length; j++) out.push(FALLBACK_LINES[j]);
    }
    return out;
  }

  function initTerminal() {
    var term = document.getElementById('mf-terminal');
    if (!term) return;

    var screen = document.getElementById('mf-term-screen');
    var termBody = document.getElementById('mf-term-body');
    if (!screen || !termBody) return;

    var source = document.getElementById('mf-term-source');
    var skipBtn = document.getElementById('mf-skip');
    var restartBtn = document.getElementById('mf-restart');
    var stateText = document.getElementById('mf-term-state-text');

    var lines = readLines(source);
    if (!lines.length) return;

    term.classList.add('is-js');

    var caret = document.createElement('i');
    caret.className = 'mf__caret';
    caret.setAttribute('aria-hidden', 'true');

    var textEls = [];
    var promptEl = null;
    var timer = 0;
    var gen = 0;
    var li = 0;
    var ci = 0;
    var running = false;
    var paused = false;
    var done = false;
    var started = false;
    var onScreen = false;

    function setState(txt) {
      if (stateText) stateText.textContent = txt;
    }

    function clearTimer() {
      if (timer) { window.clearTimeout(timer); timer = 0; }
    }

    function schedule(ms) {
      clearTimer();
      if (!running || paused) return;
      var g = gen;
      timer = window.setTimeout(function () {
        timer = 0;
        if (g !== gen || !running || paused) return;
        tick();
      }, ms > 0 ? ms : 0);
    }

    function keepScrolled() {
      try { termBody.scrollTop = termBody.scrollHeight; } catch (err) { warn(err); }
    }

    function moveCaret(el) {
      if (!el) return;
      el.appendChild(caret);
    }

    function appendLine(line, full) {
      var el = document.createElement('p');
      el.className = 'mf__line mf__line--' + line.kind;

      if (line.kind === 'ok') {
        var tag = document.createElement('b');
        tag.className = 'mf__tag';
        tag.textContent = '[OK]';
        el.appendChild(tag);
      }

      var text = document.createElement('span');
      text.className = 'mf__line-text';
      text.textContent = full ? line.text : '';
      el.appendChild(text);

      screen.appendChild(el);
      textEls.push(text);
      moveCaret(el);
      return text;
    }

    function charDelay(line, ch) {
      if (reduced()) return 0;
      var slow = line.kind === 'cmd';
      var d = (slow ? 34 : 19) + Math.random() * (slow ? 32 : 26);
      if (ch === '.' || ch === ',' || ch === ':') d += 85;
      else if (ch === ' ') d += 10;
      return d;
    }

    function tick() {
      if (!running) return;
      if (li >= lines.length) { finish(); return; }

      var line = lines[li];

      if (!textEls[li]) {
        appendLine(line, false);
        keepScrolled();
        schedule(line.kind === 'cmd' ? 150 : 70);
        return;
      }

      if (ci < line.text.length) {
        ci++;
        textEls[li].textContent = line.text.slice(0, ci);
        keepScrolled();
        schedule(charDelay(line, line.text.charAt(ci - 1)));
        return;
      }

      li++;
      ci = 0;
      schedule(reduced() ? 0 : line.pause);
    }

    function resetScreen() {
      clearTimer();
      if (caret.parentNode) caret.parentNode.removeChild(caret);
      while (screen.firstChild) screen.removeChild(screen.firstChild);
      textEls.length = 0;
      promptEl = null;
      li = 0;
      ci = 0;
      done = false;
      term.classList.remove('is-done');
    }

    function finish() {
      running = false;
      done = true;
      clearTimer();

      promptEl = document.createElement('p');
      promptEl.className = 'mf__line mf__line--cmd';
      var t = document.createElement('span');
      t.className = 'mf__line-text';
      t.textContent = '> ';
      promptEl.appendChild(t);
      screen.appendChild(promptEl);
      moveCaret(promptEl);
      keepScrolled();

      term.classList.remove('is-running');
      term.classList.add('is-done');
      setState('hazır');
      if (skipBtn) skipBtn.setAttribute('aria-disabled', 'true');
      emit('manifesto:terminal-done', true);
    }

    function renderAll() {
      gen++;
      clearTimer();
      running = false;
      resetScreen();
      for (var i = 0; i < lines.length; i++) appendLine(lines[i], true);
      li = lines.length;
      ci = 0;
      finish();
    }

    function skipToEnd() {
      if (done) return;
      renderAll();
    }

    function start() {
      if (reduced()) { renderAll(); return; }
      gen++;
      running = true;
      paused = false;
      term.classList.add('is-running');
      setState('çalışıyor');
      schedule(320);
    }

    function restart() {
      gen++;
      clearTimer();
      running = false;
      paused = false;
      resetScreen();
      if (skipBtn) skipBtn.removeAttribute('aria-disabled');
      started = true;
      start();
      toast('Terminal yeniden başlatıldı.');
    }

    function setPaused(next) {
      var want = !!next;
      if (want === paused) return;
      paused = want;
      if (paused) clearTimer();
      else if (running) schedule(140);
    }

    /* start when the panel scrolls into view, pause when it leaves */
    onVisible(term, function (vis) {
      onScreen = !!vis;
      if (onScreen && !started) {
        started = true;
        start();
        return;
      }
      setPaused(!onScreen || document.hidden);
    }, { threshold: 0.22, both: true });

    document.addEventListener('visibilitychange', function () {
      if (!started || done) return;
      setPaused(document.hidden || !onScreen);
    });

    listen('motion:change', function (isReduced) {
      if (isReduced && started && !done) renderAll();
    });

    if (skipBtn) {
      skipBtn.addEventListener('click', function () { skipToEnd(); });
    }
    if (restartBtn) {
      restartBtn.addEventListener('click', function () { restart(); });
    }

    termBody.addEventListener('click', function () {
      if (!done) skipToEnd();
    });

    termBody.addEventListener('keydown', function (e) {
      var k = e.key;
      if (k === 'Enter' || k === ' ' || k === 'Spacebar') {
        e.preventDefault();
        if (done) restart();
        else skipToEnd();
      }
    });
  }

  /* --------------------------------------------------------
     3. Finale — 3D float + pointer tilt
     -------------------------------------------------------- */
  function initFinale() {
    var finale = document.getElementById('mf-finale');
    if (!finale) return;

    var tilt = document.getElementById('mf-tilt');
    var onScreen = false;

    function setLive() {
      var live = onScreen && !reduced() && !document.hidden;
      finale.classList.toggle('is-live', live);
    }

    onVisible(finale, function (vis) {
      onScreen = !!vis;
      setLive();
    }, { threshold: 0.2, both: true });

    document.addEventListener('visibilitychange', setLive);
    listen('motion:change', setLive);

    if (!tilt || isTouch()) return;

    var rx = 0;
    var ry = 0;

    var applyTilt = rafThrottle(function () {
      tilt.style.setProperty('--mf-rx', rx.toFixed(2) + 'deg');
      tilt.style.setProperty('--mf-ry', ry.toFixed(2) + 'deg');
    });

    finale.addEventListener('mousemove', function (e) {
      if (reduced()) return;
      var r = finale.getBoundingClientRect();
      if (!r.width || !r.height) return;
      var nx = clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1);
      var ny = clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1, 1);
      ry = nx * 7;
      rx = -ny * 5;
      applyTilt();
    }, { passive: true });

    finale.addEventListener('mouseleave', function () {
      rx = 0;
      ry = 0;
      applyTilt();
    }, { passive: true });
  }

  /* --------------------------------------------------------
     4. Confetti engine (hand-rolled physics)
     -------------------------------------------------------- */
  var TOKEN_COLORS = [
    '--amber-500', '--amber-400', '--leaf-300', '--moss-400',
    '--cyan-500', '--cyan-400', '--violet-500', '--magenta-500', '--chrome-200'
  ];
  var GRAVITY = 980;
  var MAX_PARTS = 700;

  var confetti = (function () {
    var canvas = document.getElementById('mf-confetti');
    var ctx = (canvas && canvas.getContext) ? canvas.getContext('2d') : null;
    var parts = [];
    var raf = 0;
    var last = 0;
    var vw = 0;
    var vh = 0;

    function sizeCanvas() {
      if (!canvas || !ctx) return;
      var dpr = typeof BC.dpr === 'function' ? BC.dpr() : Math.min(window.devicePixelRatio || 1, 2);
      vw = window.innerWidth || root.clientWidth || 320;
      vh = window.innerHeight || root.clientHeight || 480;
      canvas.width = Math.max(1, Math.round(vw * dpr));
      canvas.height = Math.max(1, Math.round(vh * dpr));
      canvas.style.width = vw + 'px';
      canvas.style.height = vh + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function palette() {
      var out = [];
      var cs = window.getComputedStyle ? window.getComputedStyle(root) : null;
      if (cs) {
        for (var i = 0; i < TOKEN_COLORS.length; i++) {
          var v = (cs.getPropertyValue(TOKEN_COLORS[i]) || '').trim();
          if (v) out.push(v);
        }
      }
      if (!out.length) out.push('#ffffff');
      return out;
    }

    function burst(ox, oy) {
      if (!canvas || !ctx) return;
      sizeCanvas();

      var pal = palette();
      var small = vw < 560 || !!BC.prefersLowPower;
      var count = reduced() ? 44 : (small ? 90 : 170);
      var baseTtl = reduced() ? 1.1 : 3.1;
      var x = typeof ox === 'number' ? ox : vw / 2;
      var y = typeof oy === 'number' ? oy : vh * 0.68;

      for (var i = 0; i < count; i++) {
        var ang = (-Math.PI / 2) + (Math.random() - 0.5) * 2.15;
        var speed = (300 + Math.random() * 640) * (small ? 0.82 : 1);
        parts.push({
          x: x + (Math.random() - 0.5) * 34,
          y: y + (Math.random() - 0.5) * 20,
          vx: Math.cos(ang) * speed,
          vy: Math.sin(ang) * speed,
          w: 5 + Math.random() * 7,
          h: 8 + Math.random() * 10,
          color: pal[Math.floor(Math.random() * pal.length) % pal.length],
          ang: Math.random() * Math.PI * 2,
          spin: (Math.random() - 0.5) * 11,
          flut: Math.random() * Math.PI * 2,
          flutSpeed: 4 + Math.random() * 6,
          driftAmp: 22 + Math.random() * 56,
          driftPhase: Math.random() * Math.PI * 2,
          driftSpeed: 0.7 + Math.random() * 1.6,
          life: 0,
          ttl: baseTtl + Math.random() * baseTtl * 0.45
        });
      }

      if (parts.length > MAX_PARTS) parts.splice(0, parts.length - MAX_PARTS);

      canvas.classList.add('is-on');
      if (!raf) {
        last = 0;
        raf = window.requestAnimationFrame(frame);
      }
    }

    function stop() {
      if (raf) { window.cancelAnimationFrame(raf); raf = 0; }
      last = 0;
      if (ctx) ctx.clearRect(0, 0, vw, vh);
      if (canvas) canvas.classList.remove('is-on');
    }

    function frame(ts) {
      raf = 0;
      if (!canvas || !ctx) return;

      var dt = last ? (ts - last) / 1000 : 0.016;
      last = ts;
      if (!(dt > 0)) dt = 0.016;
      if (dt > 0.05) dt = 0.05;

      ctx.clearRect(0, 0, vw, vh);

      var dragX = Math.pow(0.15, dt);
      var dragY = Math.pow(0.25, dt);

      for (var i = parts.length - 1; i >= 0; i--) {
        var p = parts[i];

        p.life += dt;
        p.vy = (p.vy + GRAVITY * dt) * dragY;
        p.vx *= dragX;
        p.driftPhase += p.driftSpeed * dt;
        p.x += (p.vx + Math.sin(p.driftPhase) * p.driftAmp) * dt;
        p.y += p.vy * dt;
        p.ang += p.spin * dt;
        p.flut += p.flutSpeed * dt;

        if (p.life >= p.ttl || p.y > vh + 90) {
          parts.splice(i, 1);
          continue;
        }

        var t = p.life / p.ttl;
        var alpha = t < 0.8 ? 1 : Math.max(0, 1 - (t - 0.8) / 0.2);
        var squash = Math.cos(p.flut);
        squash = squash < 0 ? Math.min(-0.18, squash) : Math.max(0.18, squash);

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.ang);
        ctx.scale(1, squash);
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }

      ctx.globalAlpha = 1;

      if (!parts.length) { stop(); return; }
      raf = window.requestAnimationFrame(frame);
    }

    if (canvas && ctx) {
      sizeCanvas();
      window.addEventListener('resize', debounce(function () {
        sizeCanvas();
        if (!parts.length) stop();
      }, 160), { passive: true });

      document.addEventListener('visibilitychange', function () {
        if (document.hidden) {
          if (raf) { window.cancelAnimationFrame(raf); raf = 0; }
          last = 0;
        } else if (parts.length && !raf) {
          last = 0;
          raf = window.requestAnimationFrame(frame);
        }
      });
    }

    return { burst: burst, stop: stop };
  })();

  /* --------------------------------------------------------
     5. Share CTA — magnetic button, confetti, clipboard
     -------------------------------------------------------- */
  function fallbackCopy(url, restoreEl) {
    var sink = document.createElement('textarea');
    sink.className = 'mf-copy-sink';
    sink.value = url;
    sink.setAttribute('readonly', 'readonly');
    sink.setAttribute('aria-hidden', 'true');
    sink.setAttribute('tabindex', '-1');

    var host = document.body || root;
    if (!host) return false;
    host.appendChild(sink);

    var ok = false;
    try {
      sink.focus();
      sink.select();
      if (sink.setSelectionRange) sink.setSelectionRange(0, sink.value.length);
      ok = !!(document.execCommand && document.execCommand('copy'));
    } catch (err) {
      warn(err);
      ok = false;
    }

    if (sink.parentNode) sink.parentNode.removeChild(sink);
    if (restoreEl && restoreEl.focus) {
      try { restoreEl.focus({ preventScroll: true }); } catch (err2) { restoreEl.focus(); }
    }
    return ok;
  }

  function copyFailed() {
    toast('Bağlantı kopyalanamadı, adresi elle kopyalayabilirsiniz.', { tone: 'warn', duration: 4200 });
  }

  function copyLink(restoreEl) {
    var url = '';
    try { url = window.location.href; } catch (err) { url = ''; }
    if (!url) { copyFailed(); return; }

    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      try {
        navigator.clipboard.writeText(url).then(function () {
          toast('Bağlantı kopyalandı!');
        }, function () {
          if (fallbackCopy(url, restoreEl)) toast('Bağlantı kopyalandı!');
          else copyFailed();
        });
        return;
      } catch (err) {
        warn(err);
      }
    }

    if (fallbackCopy(url, restoreEl)) toast('Bağlantı kopyalandı!');
    else copyFailed();
  }

  function initShare() {
    var btn = document.getElementById('mf-share');
    if (!btn) return;

    var label = btn.querySelector('.mf__share-label');
    var zone = (btn.closest && btn.closest('.mf__cta')) || btn;

    if (!isTouch()) {
      var tx = 0;
      var ty = 0;

      var applyMagnet = rafThrottle(function () {
        btn.style.setProperty('--mf-mx', tx.toFixed(1) + 'px');
        btn.style.setProperty('--mf-my', ty.toFixed(1) + 'px');
        if (label) {
          label.style.setProperty('--mf-lx', (tx * 0.45).toFixed(1) + 'px');
          label.style.setProperty('--mf-ly', (ty * 0.45).toFixed(1) + 'px');
        }
      });

      zone.addEventListener('mousemove', function (e) {
        if (reduced()) return;
        var r = btn.getBoundingClientRect();
        if (!r.width || !r.height) return;
        var dx = e.clientX - (r.left + r.width / 2);
        var dy = e.clientY - (r.top + r.height / 2);
        var dist = Math.sqrt(dx * dx + dy * dy);
        var reach = Math.max(r.width, r.height) * 0.9 + 90;
        if (dist > reach) { tx = 0; ty = 0; }
        else {
          var force = (1 - dist / reach) * 0.42;
          tx = clamp(dx * force, -26, 26);
          ty = clamp(dy * force, -20, 20);
        }
        applyMagnet();
      }, { passive: true });

      zone.addEventListener('mouseleave', function () {
        tx = 0;
        ty = 0;
        applyMagnet();
      }, { passive: true });
    }

    btn.addEventListener('click', function () {
      var r = btn.getBoundingClientRect();
      confetti.burst(r.left + r.width / 2, r.top + r.height / 2);
      copyLink(btn);
      emit('manifesto:share', true);
    });
  }

  /* --------------------------------------------------------
     6. Back-to-top (appears after 600px)
     -------------------------------------------------------- */
  function initBackToTop() {
    var btn = document.getElementById('mf-top');
    if (!btn) return;

    var update = rafThrottle(function () {
      var y = window.pageYOffset || root.scrollTop || 0;
      btn.classList.toggle('is-on', y > 600);
    });

    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    update();

    btn.addEventListener('click', function () {
      if (reduced() || !('scrollBehavior' in root.style)) {
        window.scrollTo(0, 0);
      } else {
        try { window.scrollTo({ top: 0, behavior: 'smooth' }); }
        catch (err) { window.scrollTo(0, 0); }
      }
      var brand = document.querySelector('.bc-nav__brand');
      if (brand && brand.focus) {
        try { brand.focus({ preventScroll: true }); } catch (err2) { brand.focus(); }
      }
      emit('nav:navigate', 'top');
    });
  }

  /* --------------------------------------------------------
     7. GORİL MODU — Konami code easter egg
     -------------------------------------------------------- */
  var KONAMI = [
    'arrowup', 'arrowup', 'arrowdown', 'arrowdown',
    'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'
  ];

  var LEAF_SVG =
    '<svg viewBox="0 0 24 24" focusable="false" role="presentation" aria-hidden="true">' +
    '<path d="M21.2 2.6C11.4 2.6 3.4 7.9 3.4 15.9c0 1.8.4 3.4 1.1 4.7 4.3-6.6 8.9-9.8 14-11.4' +
    '-4.2 2.8-7.9 6.5-10.4 11.4 1.3.6 2.8.9 4.4.9 8.1 0 12.7-8.6 8.7-18.9z"></path>' +
    '<path class="mf-leaf__vein" d="M5 20.6C8.7 13.9 13.6 9.4 19.4 6.2" fill="none" ' +
    'stroke="currentColor" stroke-width="1.1" stroke-linecap="round"></path></svg>';

  function clearLeaves() {
    var box = document.getElementById('mf-leaves');
    if (!box) return;
    while (box.firstChild) box.removeChild(box.firstChild);
  }

  function spawnLeaves() {
    var box = document.getElementById('mf-leaves');
    if (!box) return;
    clearLeaves();

    var narrow = (window.innerWidth || 360) < 560;
    var count = reduced() ? 4 : (narrow || BC.prefersLowPower ? 6 : 9);

    for (var i = 0; i < count; i++) {
      var leaf = document.createElement('span');
      leaf.className = 'mf-leaf';
      leaf.setAttribute('aria-hidden', 'true');
      leaf.innerHTML = LEAF_SVG;

      var x = Math.round((i + 0.5) * (100 / count) + (Math.random() * 8 - 4));
      leaf.style.setProperty('--mf-leaf-x', clamp(x, 2, 94) + '%');
      leaf.style.setProperty('--mf-leaf-scale', (0.65 + Math.random() * 0.7).toFixed(2));
      leaf.style.setProperty('--mf-leaf-dur', (13 + Math.random() * 12).toFixed(1) + 's');
      leaf.style.setProperty('--mf-leaf-delay', (-Math.random() * 14).toFixed(1) + 's');
      leaf.style.setProperty('--mf-leaf-drift', (Math.random() * 120 - 60).toFixed(0) + 'px');

      if (reduced()) {
        leaf.style.top = (12 + Math.random() * 62).toFixed(0) + 'vh';
        leaf.style.opacity = '0.45';
      }

      box.appendChild(leaf);
    }
  }

  function setGorilMode(on) {
    var next = !!on;
    root.classList.toggle('mf-goril', next);
    if (next) {
      spawnLeaves();
      toast('GORİL MODU AKTİF', { tone: 'jungle', duration: 3200 });
    } else {
      clearLeaves();
      toast('GORİL MODU KAPANDI', { duration: 2600 });
    }
    emit('manifesto:goril', next);
  }

  function initKonami() {
    var idx = 0;

    document.addEventListener('keydown', function (e) {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;

      var t = e.target;
      if (t && t.nodeType === 1) {
        var tag = (t.tagName || '').toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select' || t.isContentEditable) return;
      }

      var key = (e.key || '').toLowerCase();
      if (!key) return;

      if (key === KONAMI[idx]) {
        idx++;
        if (idx >= KONAMI.length) {
          idx = 0;
          setGorilMode(!root.classList.contains('mf-goril'));
        }
        return;
      }
      idx = (key === KONAMI[0]) ? 1 : 0;
    });

    window.addEventListener('resize', debounce(function () {
      if (root.classList.contains('mf-goril')) spawnLeaves();
    }, 320), { passive: true });
  }

  /* --------------------------------------------------------
     8. Public (namespaced) API + boot
     -------------------------------------------------------- */
  BC.manifesto = BC.manifesto || {};
  BC.manifesto.toast = toast;
  BC.manifesto.confetti = function (x, y) { confetti.burst(x, y); };
  BC.manifesto.gorilMode = setGorilMode;

  function boot() {
    initTerminal();
    initFinale();
    initShare();
    initBackToTop();
    initKonami();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
