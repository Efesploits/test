# Berkay Cabbar — Evolution Site :: BUILD CONTRACT

Single-page, vanilla HTML/CSS/JS site (NO frameworks, NO build step, NO external CDN).
Language of ALL user-visible copy: TURKISH (tr). Tone: over-the-top, epic, admiring
("Berkay Cabbar" is celebrated as a legend). Humor is affectionate, never insulting.

Story: Berkay Cabbar was once a gorilla, and evolved into a human.
Arc: JUNGLE / PRIMAL (earth, moss, fur, drums) -> AWAKENING -> HUMAN / NEON FUTURE (chrome, glass, cyan).

## File layout (each agent owns ONLY its own files — never edit another agent's file)
- index.html            (assembled by the orchestrator — agents DO NOT write it)
- partials/<name>.html  (the section markup, no <html>/<body> wrapper)
- assets/css/<name>.css
- assets/js/<name>.js   (IIFE or plain script, NO ES modules, NO import/export)

## Global conventions
- Design tokens live in assets/css/tokens.css — USE THE VARIABLES, never hardcode brand colors.
- All JS files are loaded with `defer` at the end of <head>. Guard everything:
  `const el = document.querySelector('#x'); if (!el) return;`
- Wrap every file: `(function () { 'use strict'; ... })();` — no globals except a single
  namespaced `window.BC = window.BC || {}` when sharing helpers.
- Respect reduced motion. A global boolean is available:
  `window.BC.reduced` (true when prefers-reduced-motion: reduce). If true: no autoplay loops,
  no parallax, instant reveals. Also honor the CSS media query.
- Scroll reveals: add class `reveal` (+ optional `reveal--up|left|right|zoom`, `data-delay="120"`)
  to any element. A global IntersectionObserver in assets/js/core.js adds `is-visible`. Do NOT
  write your own reveal observer.
- Section wrapper pattern:
  `<section id="NAME" class="section section--NAME" aria-labelledby="NAME-title">`
- Every animation must be requestAnimationFrame- or CSS-driven, throttled, and must pause
  when offscreen (use IntersectionObserver) or when `document.hidden`.
- Canvas: always size with devicePixelRatio and re-size on `resize` (debounced).
- Accessibility: real headings h1..h3, alt/aria-labels, focus-visible styles, keyboard reachable.
- Mobile: everything must work down to 360px wide. Heavy canvas effects should reduce particle
  counts on small screens / low `navigator.hardwareConcurrency`.
- No emoji in code. Turkish characters must be UTF-8 (ç ğ ı İ ö ş ü).
- No external requests of any kind (no Google Fonts, no images from the web). Fonts: system stack
  already defined in tokens.css. All artwork must be inline SVG or canvas-drawn.

## Z-index scale (use tokens)
preloader 9000 | cursor 8000 | nav 700 | scroll-progress 750 | modal 800 | section content 2 | section fx 1
