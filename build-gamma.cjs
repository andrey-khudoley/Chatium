#!/usr/bin/env node
// Gamma -> Chatium page builder. Usage: node build-gamma.cjs <id>
// Reads gamma-<id>-html.txt / gamma-<id>-css-full.json / <id>-mobile.cjs (+ optional <id>-meta.json)
// Writes p/units/neso/pages/<id>/{index.tsx,pageHtml.ts,.dir.json,.workspace.json,tsconfig.json}
const fs = require('fs');
const path = require('path');

const id = process.argv[2];
if (!id) { console.error('usage: node build-gamma.cjs <id>'); process.exit(1); }

const ROOT = __dirname;
const OUT_DIR = path.join(ROOT, 's.chtm.khudoley.pro', 'p', 'units', 'neso', 'pages', id);

function readJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }

const rawHtml = readJson(path.join(ROOT, `gamma-${id}-html.txt`)); // JSON-encoded string
const cssData = readJson(path.join(ROOT, `gamma-${id}-css-full.json`)); // {css, skippedCount, skipped}
const metaPath = path.join(ROOT, `gamma-${id}-meta.json`);
const meta = fs.existsSync(metaPath) ? readJson(metaPath) : {};
const mobileMod = require(path.join(ROOT, `${id}-mobile.cjs`));

const gammaDocUrl = meta.gammaUrl || '';
const title = meta.title || 'NESO Akademie';
const description = meta.description || '';

// ---- Standard Gamma mask SVGs (identical across docs; reused from earlier capture) ----
const MASK_SVGS = {
  left: 'PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxIDEiIHByZXNlcnZlQXNwZWN0UmF0aW89Im5vbmUiPgogICAgPGVsbGlwc2UgY3g9Ii0wLjIyIiBjeT0iMC4zNSIgcnk9IjEiIHJ4PSIxLjIiIGZpbGw9IndoaXRlIiAvPgo8L3N2Zz4=',
  right: 'PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxIDEiIHByZXNlcnZlQXNwZWN0UmF0aW89Im5vbmUiPgogICAgPGVsbGlwc2UgY3g9IjEuMjIiIGN5PSIwLjM1IiByeT0iMSIgcng9IjEuMiIgZmlsbD0id2hpdGUiIC8+Cjwvc3ZnPg==',
  top: 'PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxIDEiIHByZXNlcnZlQXNwZWN0UmF0aW89Im5vbmUiPgogICAgPGVsbGlwc2UgY3g9IjAuNSIgY3k9Ii0uMjIiIHJ5PSIxLjIiIHJ4PSIxIiBmaWxsPSJ3aGl0ZSIgLz4KPC9zdmc+',
};

function fixMasks(text) {
  return text.replace(
    /url\((['"]?)(?:https:\/\/gamma\.app)?\/_next\/static\/media\/circle-(left|right|top)\.[^"')]*?\.svg(?:\?[^"')]*)?\1\)/g,
    (m, q, side) => `url("data:image/svg+xml;base64,${MASK_SVGS[side]}")`
  );
}

function absolutizeUrls(text) {
  // CSS url(/...) -> url(https://gamma.app/...)
  text = text.replace(/url\((['"]?)\/(?!\/)/g, 'url($1https://gamma.app/');
  // HTML src="/..." / href="/..." (also handles \" json-escaped form already unescaped by now)
  text = text.replace(/(src|href)="\/(?!\/)/g, '$1="https://gamma.app/');
  return text;
}

function detectContainerTypeSizeSelectors(css) {
  const out = new Set();
  const re = /([^{}]+?)\{[^{}]*container-type:\s*size[^{}]*\}/g;
  let m;
  while ((m = re.exec(css))) {
    out.add(m[1].trim());
  }
  return Array.from(out);
}

function escapeForTemplate(s) {
  return s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
}

function hexToRgb(hex) {
  return [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16));
}
function rgbToHex(rgb) {
  return '#' + rgb.map(c => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0')).join('');
}
function luminanceOf(rgb) {
  return (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
}
function mix(rgbA, rgbB, t) {
  return rgbA.map((c, i) => c + (rgbB[i] - c) * t);
}

// Detects the page's accent + light/dark theme from captured inline CSS vars
// (--accent-color, --card-background-color, --heading-color, --body-color) and,
// when it deviates from the shared template's default light/gold theme, emits a
// `.gamma-mobile { --gm-* overrides }` block so the hand-mobile layer matches.
function detectThemeOverride(rawHtmlText, themeMeta) {
  themeMeta = themeMeta || {};
  const accentM = /--accent-color:\s*#([0-9a-fA-F]{6})/.exec(rawHtmlText);
  const bgM = /--card-background-color:\s*#([0-9a-fA-F]{6})/.exec(rawHtmlText);
  const headingM = /--heading-color:\s*#([0-9a-fA-F]{6})/.exec(rawHtmlText);
  const bodyM = /--body-color:\s*#([0-9a-fA-F]{6})/.exec(rawHtmlText);

  // `--card-background-color`/etc. can be redeclared in nested scopes (e.g. a
  // highlighted callout card) — the first regex match isn't reliably the page's
  // own background. meta.json's `theme: {accent, bg}` overrides the auto-detect
  // when the captured page has such a mismatch (verify visually and hardcode).
  const accentHex = (themeMeta.accent || (accentM ? accentM[1] : 'e7bf6a')).toLowerCase();
  const bgHex = (themeMeta.bg || (bgM ? bgM[1] : 'f6f1e7')).toLowerCase();
  const isDefaultLightGold = accentHex === 'e7bf6a' && luminanceOf(hexToRgb(bgHex)) > 0.5;
  if (isDefaultLightGold) return ''; // shared template default already covers it

  const accentRgb = hexToRgb(accentHex);
  const bgRgb = hexToRgb(bgHex);
  const isDark = luminanceOf(bgRgb) < 0.4;

  const deepRgb = isDark ? mix(accentRgb, [255, 255, 255], 0.18) : accentRgb.map(c => c * 0.78);
  const deepHex = rgbToHex(deepRgb);
  const accentLuminance = luminanceOf(accentRgb);
  const btnText = accentLuminance > 0.55 ? '#2a1f0a' : '#fff5e6';

  console.log(`[build-gamma] theme override: accent #${accentHex}, bg #${bgHex}, dark=${isDark}`);

  const vars = [
    `--gm-accent:#${accentHex}`,
    `--gm-accent-rgb:${accentRgb.join(',')}`,
    `--gm-accent-deep:${deepHex}`,
    `--gm-btn-grad:linear-gradient(45deg,#${accentHex} 0%,${deepHex} 99%)`,
    `--gm-btn-text:${btnText}`,
    `--gm-on-accent:${btnText}`,
  ];

  if (isDark) {
    const inkHex = bodyM ? `#${bodyM[1]}` : '#e8e2ea';
    const headingHex = headingM ? `#${headingM[1]}` : `#${accentHex}`;
    const cardRgb = mix(bgRgb, [255, 255, 255], 0.08);
    const lineRgb = mix(bgRgb, accentRgb, 0.35);
    vars.push(
      `--gm-ink:${inkHex}`,
      `--gm-heading:${headingHex}`,
      `--gm-soft:${inkHex}cc`,
      `--gm-paper:#${bgHex}`,
      `--gm-card:${rgbToHex(cardRgb)}`,
      `--gm-line:${rgbToHex(lineRgb)}66`,
      `--gm-shadow:rgba(0,0,0,.35)`,
      `--gm-shadow-strong:rgba(0,0,0,.5)`
    );
  }

  return `.gamma-mobile {
  ${vars.join('; ')};
}
`;
}

// ---- Transform captured CSS/HTML ----
let css = fixMasks(cssData.css);
css = absolutizeUrls(css);

let html = fixMasks(rawHtml);
html = absolutizeUrls(html);

const containerSelectors = detectContainerTypeSizeSelectors(cssData.css);
if (containerSelectors.length === 0) {
  console.warn(`[build-gamma] WARNING: no container-type:size selectors detected for ${id} — bistable collapse fix may be missing`);
} else {
  console.log(`[build-gamma] container-type:size selectors (${containerSelectors.length}):`, containerSelectors.join(', '));
}

// Gamma serializes `background: var(--heading-gradient)` shorthand on gradient-text
// headings as empty longhands (background-image: ; ...) when captured via cssText.
// Result: heading wrapped in an "animate-has-animated" reveal box computes
// `color:transparent; background-clip:text; background-image:none` == invisible text.
// Reapply the theme's own --heading-gradient var explicitly; no-op (falls back to
// `none`) on themes that don't define it, so this is safe to always include.
const GRADIENT_HEADING_FIX_CSS = `.gml-heading.animate-has-animated .gml-heading__content, .gml-heading.animate-has-animated .gml-title__content { background-image: var(--heading-gradient, none) !important; }`;
const GRADIENT_HEADING_FIX_JS = `'.gml-heading.animate-has-animated .gml-heading__content,.gml-heading.animate-has-animated .gml-title__content{background-image:var(--heading-gradient,none) !important;}'`;

const overridesCss = [
  ...containerSelectors.map(sel => `${sel} { container-type: inline-size !important; }`),
  `[class*="animatable-on-load"] { opacity: 1 !important; transform: none !important; }`,
  GRADIENT_HEADING_FIX_CSS,
].join('\n');

const ovJs = [
  ...containerSelectors.map(sel => `'${sel.replace(/'/g, "\\'")}{container-type:inline-size !important;}'`),
  `'[class*="animatable-on-load"]{opacity:1 !important;transform:none !important;}'`,
  GRADIENT_HEADING_FIX_JS,
].join(' +\n      ');

// ---- Mobile CSS (shared, generic .gamma-mobile/.gm-* component library) ----
const mobileCss = fs.readFileSync(path.join(ROOT, 'gamma-mobile-shared.css.tpl'), 'utf8');
const accentOverride = detectThemeOverride(rawHtml, meta.theme);

// Outer <html> bounce-scroll background: match the doc's own bg on dark themes,
// otherwise the neutral light gray used across the light/gold pages.
const pageBgM = /--card-background-color:\s*#([0-9a-fA-F]{6})/.exec(rawHtml);
const pageBgHex = (meta.theme && meta.theme.bg) || (pageBgM ? pageBgM[1] : null);
const htmlBg = pageBgHex && luminanceOf(hexToRgb(pageBgHex)) < 0.4 ? `#${pageBgHex}` : 'rgb(245, 245, 246)';

// ---- Font links (Gamma workspace-wide font kit) ----
const FONT_LINKS = `    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="preconnect" href="https://use.typekit.net" crossorigin>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700;800;900&display=swap">
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage%20Grotesque:wght@200;300;400;500;600;700;800&display=swap">
    <link rel="stylesheet" href="https://use.typekit.net/tiw2cwq.css">`;

const reflowScript = `  <script>
  (function () {
    var OV =
      ${ovJs};
    function ok() {
      var c = document.querySelector('.card-wrapper');
      return !!c && c.offsetHeight > 50;
    }
    function pulse() {
      var s = document.getElementById('gamma-overrides');
      if (!s) return;
      s.textContent = '';
      void document.body.offsetHeight;
      s.textContent = OV;
      void document.body.offsetHeight;
    }
    function fix(n) {
      if (window.innerWidth <= 768) return; // mobile uses the separate layer; clone is hidden
      if (ok()) return;
      pulse();
      if (!ok() && n > 0) requestAnimationFrame(function () { fix(n - 1); });
    }
    function run() {
      try { document.documentElement.style.overflowY = 'auto'; } catch (e) {}
      fix(40);
    }
    if (document.readyState !== 'loading') run();
    document.addEventListener('DOMContentLoaded', run);
    window.addEventListener('load', run);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(run);
    [80, 250, 600, 1200, 2500, 4000].forEach(function (t) { setTimeout(run, t); });
    window.addEventListener('resize', function () { if (!ok()) run(); });
  })();
  </script>`;

const fullHtml = `<!DOCTYPE html>
<html lang="ru" style="background: ${htmlBg}; overflow-x: hidden; overflow-y: auto;">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title}</title>
    <meta name="description" content="${description.replace(/"/g, '&quot;')}">
    <meta name="robots" content="noindex, nofollow">
    <link rel="icon" href="https://static.gamma.app/favicons/favicon_light.svg">
${FONT_LINKS}
    <style id="gamma-captured-css">
/* ===== sheet inline ===== */
${css}
    </style>
    <style id="gamma-overrides">
/* ==== ${id} standalone overrides (added by transfer) — keep MINIMAL; see gamma-to-chatium-transfer skill ====
   The Gamma doc layout is BISTABLE when served statically; adding background / margin /
   display rules into THIS stylesheet re-collapses the height chain on the next style recalc. */
${overridesCss}
</style>
    <style id="gamma-mobile-css">
${mobileCss}
${accentOverride}</style>
  </head>
  <body class="chakra-ui-light">
<div class="gamma-desktop">${html}</div><div class="gamma-mobile">
${mobileMod.MOBILE_HTML}
</div>

${reflowScript}
  </body>
</html>`;

const pageHtmlTs = `// AUTO-GENERATED from Gamma doc ${gammaDocUrl}
// Desktop is a 1:1 literal clone (captured DOM + CSS). Do not hand-edit; regenerate via build-gamma.cjs ${id}.
/* eslint-disable */
export const PAGE_HTML = \`${escapeForTemplate(fullHtml)}\`
`;

const indexTsx = `import { PAGE_HTML } from './pageHtml'

// Gamma -> Chatium transfer: "${title}" (NESO Akademie).
// Desktop = literal 1:1 clone of the Gamma render. URL: /p/units/neso/pages/${id}
export const ${id}PageRoute = app.get('/', async (ctx) => {
  return ctx.resp.html(PAGE_HTML)
})

export default ${id}PageRoute
`;

const dirJson = `{
  "name": "[INWORK] p/units/neso/pages/${id}",
  "params": {
    "startWorkspaceAppearance": "ai"
  }
}
`;

const workspaceJson = `{}\n`;

const tsconfigJson = `{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ESNext", "DOM", "DOM.Iterable"],
    "rootDir": ".",
    "baseUrl": ".",
    "paths": { "/*": ["./*"] },
    "allowJs": false,
    "allowSyntheticDefaultImports": true,
    "experimentalDecorators": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "jsx": "preserve",
    "strict": false,
    "noUncheckedIndexedAccess": false
  },
  "vueCompilerOptions": { "target": 3.5 },
  "include": ["**/*.ts", "**/*.tsx", "**/*.vue"],
  "exclude": []
}
`;

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, 'pageHtml.ts'), pageHtmlTs);
fs.writeFileSync(path.join(OUT_DIR, 'index.tsx'), indexTsx);
fs.writeFileSync(path.join(OUT_DIR, '.dir.json'), dirJson);
fs.writeFileSync(path.join(OUT_DIR, '.workspace.json'), workspaceJson);
fs.writeFileSync(path.join(OUT_DIR, 'tsconfig.json'), tsconfigJson);

console.log(`[build-gamma] wrote ${OUT_DIR}`);
console.log(`[build-gamma] pageHtml.ts size: ${(pageHtmlTs.length / 1024).toFixed(1)} KB`);
