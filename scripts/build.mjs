/* Assembles index.html from partials + asset lists. Run: node scripts/build.mjs */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CSS = ['tokens', 'base', 'preloader', 'hero', 'evolution', 'story', 'powers', 'stats', 'quotes', 'manifesto'];
const JS  = ['core', 'preloader', 'hero', 'evolution', 'story', 'powers', 'stats', 'quotes', 'manifesto'];
const PARTIALS = ['preloader', 'hero', 'evolution', 'story', 'powers', 'stats', 'quotes', 'manifesto'];

const read = (p) => existsSync(join(ROOT, p)) ? readFileSync(join(ROOT, p), 'utf8') : (console.warn('MISSING: ' + p), '');

const links = CSS.map(n => `  <link rel="stylesheet" href="assets/css/${n}.css">`).join('\n');
const scripts = JS.map(n => `  <script defer src="assets/js/${n}.js"></script>`).join('\n');
const body = PARTIALS.map(n => `\n<!-- ==================== ${n.toUpperCase()} ==================== -->\n` + read(`partials/${n}.html`).trim() + '\n').join('\n');

const html = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#04060d">
  <title>Berkay Cabbar — Evrimin Son Halkası</title>
  <meta name="description" content="Bir gorilin insana evrilişi. Berkay Cabbar'ın efsanevi hikâyesi: ormandan şehre, güçten zarafete.">
  <meta property="og:title" content="Berkay Cabbar — Evrimin Son Halkası">
  <meta property="og:description" content="Goril olarak doğdu. İnsan olarak yükseldi. Efsane olarak kaldı.">
  <meta property="og:type" content="website">
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%23ffb02e'/%3E%3Cstop offset='.5' stop-color='%236fe09a'/%3E%3Cstop offset='1' stop-color='%2322e6ff'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='100' height='100' rx='24' fill='%2304060d'/%3E%3Cpath d='M30 74c0-14 6-22 20-22s20 8 20 22' stroke='url(%23g)' stroke-width='8' fill='none' stroke-linecap='round'/%3E%3Ccircle cx='50' cy='34' r='13' fill='url(%23g)'/%3E%3C/svg%3E">
${links}
${scripts}
</head>
<body>
${body}
</body>
</html>
`;

writeFileSync(join(ROOT, 'index.html'), html, 'utf8');
console.log('index.html written (' + html.length + ' bytes)');
