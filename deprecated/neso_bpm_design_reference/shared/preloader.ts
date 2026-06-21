// @shared
// Переиспользуемый прелоадер (HTML + CSS + JS), без компонентной обвязки.

export type PreloaderTheme = 'auto' | 'dark' | 'light'

const DEFAULT_PROJECT_NAME = 'NeSo Academy'

function normalizeTheme(theme?: string): PreloaderTheme {
  if (theme === 'dark' || theme === 'light') return theme
  return 'auto'
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function getPreloaderInnerHTML(projectName: string): string {
  const safeProjectName = escapeHtml(projectName)
  return `
    <div class="boot-shell" role="status">
      <span class="boot-signal boot-signal--top" aria-hidden="true"></span>
      <span class="boot-signal boot-signal--bottom" aria-hidden="true"></span>
      <p class="boot-kicker">System Boot</p>
      <h1 class="boot-title">${safeProjectName}</h1>
      <p class="boot-subtitle">Подготавливаем интерфейс...</p>
      <div class="boot-progress-track" aria-hidden="true">
        <span id="boot-progress-bar" class="boot-progress-bar"></span>
      </div>
      <div class="boot-meta">
        <span id="boot-status-text" class="boot-status-text">Собираем визуальную оболочку...</span>
        <span id="boot-progress-value" class="boot-progress-value">0%</span>
      </div>
      <div class="boot-theme-chip" id="boot-theme-pill">Ночной лес</div>
    </div>
  `
}

/**
 * CSS стили прелоадера.
 */
export function getPreloaderStyles() {
  return `
    #boot-loader {
      --boot-bg-primary: var(--bg-primary, #05080a);
      --boot-bg-secondary: var(--bg-secondary, #0d1214);
      --boot-bg-tertiary: var(--surface, #11191b);
      --boot-surface: rgba(10, 18, 20, 0.72);
      --boot-text: var(--text-primary, #eef4eb);
      --boot-subtle: rgba(238, 244, 235, 0.72);
      --boot-accent: var(--accent, #afc45f);
      --boot-accent-deep: var(--accent-deep, #6f8440);
      --boot-glow-soft: rgba(175, 196, 95, 0.12);
      --boot-glow-strong: rgba(175, 196, 95, 0.24);
      position: fixed;
      inset: 0;
      z-index: 99999;
      display: grid;
      place-items: center;
      padding: 1.5rem;
      overflow: hidden;
      color: var(--boot-text);
      background:
        linear-gradient(180deg, var(--boot-glow-soft) 0%, transparent 38%),
        linear-gradient(0deg, rgba(111, 132, 64, 0.1) 0%, transparent 42%),
        linear-gradient(142deg, var(--boot-bg-primary) 0%, var(--boot-bg-secondary) 58%, var(--boot-bg-tertiary) 100%);
      transition: opacity 0.44s ease, transform 0.44s ease, visibility 0.44s ease;
    }

    #boot-loader::before {
      content: '';
      position: absolute;
      inset: -20%;
      pointer-events: none;
      opacity: 0.36;
      background: linear-gradient(120deg, transparent 0%, rgba(255, 255, 255, 0.08) 24%, transparent 48%);
      animation: boot-ray 3.6s ease-in-out infinite;
    }

    #boot-loader::after {
      content: '';
      position: absolute;
      inset: 0;
      pointer-events: none;
      opacity: 0.26;
      background-image:
        linear-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 255, 255, 0.035) 1px, transparent 1px);
      background-size: 42px 42px;
      mask-image: radial-gradient(circle at center, rgba(0, 0, 0, 0.94) 22%, transparent 88%);
    }

    #boot-loader[data-theme="light"],
    #boot-loader:not([data-theme])[data-theme-hint="light"] {
      --boot-bg-primary: #f2eedf;
      --boot-bg-secondary: #e8e2ce;
      --boot-bg-tertiary: #f9f5ea;
      --boot-surface: rgba(249, 245, 234, 0.86);
      --boot-text: #1f2f1d;
      --boot-subtle: rgba(31, 47, 29, 0.78);
      --boot-accent: #4f6f2f;
      --boot-accent-deep: #3d5525;
      --boot-glow-soft: rgba(79, 111, 47, 0.16);
      --boot-glow-strong: rgba(79, 111, 47, 0.28);
    }

    #boot-loader.boot-loader--done {
      opacity: 0;
      transform: scale(1.03);
      visibility: hidden;
      pointer-events: none;
    }

    #boot-loader.boot-loader--done .boot-shell {
      opacity: 0;
      transform: translateY(-8px) scale(0.98);
    }

    #boot-loader .boot-messages {
      display: none;
    }

    .boot-shell {
      position: relative;
      width: min(520px, 100%);
      border-radius: 24px;
      padding: clamp(1.2rem, 2.8vw, 2rem);
      font-family: 'Mulish', -apple-system, BlinkMacSystemFont, sans-serif;
      color: var(--boot-text);
      background:
        linear-gradient(165deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 42%, rgba(0, 0, 0, 0.09) 100%),
        var(--boot-surface);
      box-shadow:
        0 22px 48px rgba(0, 0, 0, 0.34),
        inset 0 1px 0 rgba(255, 255, 255, 0.14),
        inset 0 -1px 0 rgba(0, 0, 0, 0.24);
      backdrop-filter: blur(8px);
      transition: opacity 0.36s ease, transform 0.36s ease;
      overflow: hidden;
    }

    #boot-loader[data-theme="light"] .boot-shell,
    #boot-loader:not([data-theme])[data-theme-hint="light"] .boot-shell {
      background:
        linear-gradient(165deg, rgba(255, 255, 255, 0.64) 0%, rgba(255, 255, 255, 0.38) 48%, rgba(79, 111, 47, 0.08) 100%),
        var(--boot-surface);
      box-shadow:
        0 22px 46px rgba(79, 111, 47, 0.2),
        inset 0 1px 0 rgba(255, 255, 255, 0.74),
        inset 0 -1px 0 rgba(79, 111, 47, 0.14);
    }

    .boot-signal {
      position: absolute;
      pointer-events: none;
      height: 1px;
      opacity: 0.7;
      background: linear-gradient(90deg, transparent 0%, var(--boot-accent) 52%, transparent 100%);
      animation: boot-signal-scan 4.2s ease-in-out infinite;
    }

    .boot-signal--top {
      width: 62%;
      top: 0;
      right: 0;
    }

    .boot-signal--bottom {
      width: 54%;
      left: 0;
      bottom: 0;
      animation-delay: 0.8s;
    }

    #boot-loader[data-theme="light"] .boot-signal,
    #boot-loader:not([data-theme])[data-theme-hint="light"] .boot-signal {
      background: linear-gradient(90deg, transparent 0%, var(--boot-accent-deep) 52%, transparent 100%);
    }

    .boot-kicker {
      margin: 0;
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.18em;
      color: var(--boot-subtle);
    }

    .boot-title {
      margin: 0.35rem 0 0;
      font-family: 'Old Standard TT', serif;
      font-size: clamp(1.65rem, 4.8vw, 2.15rem);
      font-weight: 700;
      letter-spacing: 0.01em;
      color: var(--boot-text);
    }

    .boot-subtitle {
      margin: 0.38rem 0 0;
      font-size: 0.94rem;
      color: var(--boot-subtle);
    }

    .boot-progress-track {
      position: relative;
      height: 8px;
      margin-top: 1.1rem;
      border-radius: 999px;
      overflow: hidden;
      background: rgba(255, 255, 255, 0.12);
      box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.32);
    }

    #boot-loader[data-theme="light"] .boot-progress-track,
    #boot-loader:not([data-theme])[data-theme-hint="light"] .boot-progress-track {
      background: rgba(79, 111, 47, 0.2);
      box-shadow: inset 0 1px 2px rgba(79, 111, 47, 0.2);
    }

    .boot-progress-bar {
      position: absolute;
      inset: 0;
      transform-origin: left center;
      transform: scaleX(0);
      background: linear-gradient(92deg, var(--boot-accent-deep) 0%, var(--boot-accent) 56%, #d8e898 100%);
      box-shadow: 0 0 24px rgba(175, 196, 95, 0.45);
    }

    #boot-loader[data-theme="light"] .boot-progress-bar,
    #boot-loader:not([data-theme])[data-theme-hint="light"] .boot-progress-bar {
      box-shadow: 0 0 20px rgba(79, 111, 47, 0.28);
    }

    .boot-progress-bar::after {
      content: '';
      position: absolute;
      top: 0;
      bottom: 0;
      width: 54px;
      right: -54px;
      background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.72) 56%, transparent 100%);
      animation: boot-progress-glint 1.7s linear infinite;
    }

    .boot-meta {
      margin-top: 0.72rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }

    .boot-status-text {
      font-size: 0.88rem;
      color: var(--boot-subtle);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .boot-progress-value {
      font-size: 0.83rem;
      font-weight: 700;
      color: var(--boot-accent);
      letter-spacing: 0.04em;
    }

    .boot-theme-chip {
      display: inline-flex;
      align-items: center;
      margin-top: 1rem;
      padding: 0.32rem 0.7rem;
      border-radius: 999px;
      font-size: 0.74rem;
      font-weight: 700;
      color: var(--boot-accent);
      background:
        linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, transparent 44%, rgba(0, 0, 0, 0.12) 100%),
        rgba(175, 196, 95, 0.09);
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.3),
        inset 0 -1px 0 rgba(0, 0, 0, 0.18);
    }

    #boot-loader[data-theme="light"] .boot-theme-chip,
    #boot-loader:not([data-theme])[data-theme-hint="light"] .boot-theme-chip {
      background:
        linear-gradient(135deg, rgba(255, 255, 255, 0.42) 0%, transparent 44%, rgba(79, 111, 47, 0.1) 100%),
        rgba(79, 111, 47, 0.18);
    }

    @keyframes boot-ray {
      0%, 100% {
        transform: translateX(-28%) translateY(-3%) rotate(2deg);
      }
      50% {
        transform: translateX(26%) translateY(2%) rotate(-1deg);
      }
    }

    @keyframes boot-signal-scan {
      0%, 100% {
        transform: translateX(-10%);
      }
      50% {
        transform: translateX(10%);
      }
    }

    @keyframes boot-progress-glint {
      from {
        transform: translateX(0);
      }
      to {
        transform: translateX(120px);
      }
    }

    @media (max-width: 640px) {
      #boot-loader {
        padding: 1rem;
      }
      .boot-shell {
        border-radius: 20px;
        padding: 1.05rem 1rem 1.15rem;
      }
      .boot-meta {
        gap: 0.65rem;
      }
      .boot-status-text {
        font-size: 0.82rem;
      }
      .boot-theme-chip {
        margin-top: 0.85rem;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      #boot-loader,
      .boot-shell,
      .boot-signal,
      .boot-progress-bar::after {
        animation: none !important;
        transition: none !important;
      }
    }
  `
}

/**
 * JavaScript код прелоадера.
 */
export function getPreloaderScript(themeHint: PreloaderTheme = 'auto') {
  const safeThemeHint = normalizeTheme(themeHint)
  const fallbackInnerHTML = getPreloaderInnerHTML(DEFAULT_PROJECT_NAME).trim().replace(/\s+/g, ' ')

  return `
    (function() {
      var themeHint = ${JSON.stringify(safeThemeHint)};
      var fallbackInnerHTML = ${JSON.stringify(fallbackInnerHTML)};
      var loader = null;
      var progressBar = null;
      var progressValue = null;
      var statusText = null;
      var themePill = null;
      var startedAt = Date.now();
      var progressCurrent = 0;
      var progressTarget = 6;
      var frameId = 0;
      var complete = false;
      var pageLoaded = false;
      var iconFontsReady = false;
      var iconNodesReady = false;
      var finalizeQueued = false;
      var iconObserver = null;

      var timeline = [
        { delay: 120, progress: 16, text: 'Собираем визуальную оболочку...' },
        { delay: 420, progress: 34, text: 'Подключаем типографику и иконки...' },
        { delay: 820, progress: 56, text: 'Синхронизируем тему страницы...' },
        { delay: 1260, progress: 74, text: 'Запускаем модули интерфейса...' },
        { delay: 1680, progress: 90, text: 'Финализируем загрузку...' }
      ];

      function normalizeTheme(value) {
        if (value === 'dark' || value === 'light') return value;
        return 'auto';
      }

      function parseColorToRgb(value) {
        if (!value) return null;
        var raw = String(value).trim();
        if (!raw) return null;

        var rgbMatch = raw.match(/rgba?\\(\\s*([0-9.]+)\\s*[,\\s]\\s*([0-9.]+)\\s*[,\\s]\\s*([0-9.]+)/i);
        if (rgbMatch) {
          return [Number(rgbMatch[1]), Number(rgbMatch[2]), Number(rgbMatch[3])];
        }

        if (raw.charAt(0) === '#') {
          var hex = raw.slice(1);
          if (hex.length === 3) {
            return [
              parseInt(hex.charAt(0) + hex.charAt(0), 16),
              parseInt(hex.charAt(1) + hex.charAt(1), 16),
              parseInt(hex.charAt(2) + hex.charAt(2), 16)
            ];
          }
          if (hex.length >= 6) {
            return [
              parseInt(hex.slice(0, 2), 16),
              parseInt(hex.slice(2, 4), 16),
              parseInt(hex.slice(4, 6), 16)
            ];
          }
        }

        return null;
      }

      function inferThemeFromColor(value) {
        var rgb = parseColorToRgb(value);
        if (!rgb) return null;
        var luminance = (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255;
        return luminance > 0.56 ? 'light' : 'dark';
      }

      function resolveTheme() {
        var explicitTheme = normalizeTheme(themeHint);
        if (explicitTheme !== 'auto') return explicitTheme;

        var hintFromMarkup = normalizeTheme(loader && loader.getAttribute('data-theme-hint'));
        if (hintFromMarkup !== 'auto') return hintFromMarkup;

        var root = document.documentElement;
        var rootTheme = normalizeTheme(root && (root.getAttribute('data-theme') || root.getAttribute('data-color-scheme')));
        if (rootTheme !== 'auto') return rootTheme;

        var themeColorMeta = document.querySelector('meta[name="theme-color"]');
        if (themeColorMeta) {
          var byMeta = inferThemeFromColor(themeColorMeta.getAttribute('content'));
          if (byMeta) return byMeta;
        }

        if (root && window.getComputedStyle) {
          var rootToken = window.getComputedStyle(root).getPropertyValue('--bg-primary');
          var byToken = inferThemeFromColor(rootToken);
          if (byToken) return byToken;
        }

        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
          return 'light';
        }

        return 'dark';
      }

      function setTheme(theme) {
        if (!loader) return;
        loader.setAttribute('data-theme', theme);
        if (themePill) {
          themePill.textContent = theme === 'light' ? 'Солнечная листва' : 'Ночной лес';
        }
      }

      function renderProgress(value) {
        var clamped = Math.max(0, Math.min(100, value));
        if (progressBar) {
          progressBar.style.transform = 'scaleX(' + clamped / 100 + ')';
        }
        if (progressValue) {
          progressValue.textContent = Math.round(clamped) + '%';
        }
      }

      function updateStatus(text) {
        if (statusText && text) {
          statusText.textContent = text;
        }
      }

      function setTarget(progress, text) {
        if (progress > progressTarget) {
          progressTarget = progress;
        }
        updateStatus(text);
      }

      function withTimeout(promise, timeoutMs) {
        return new Promise(function(resolve) {
          var settled = false;
          var timer = window.setTimeout(function() {
            if (settled) return;
            settled = true;
            resolve(false);
          }, timeoutMs);

          promise.then(function(value) {
            if (settled) return;
            settled = true;
            window.clearTimeout(timer);
            resolve(value);
          }).catch(function() {
            if (settled) return;
            settled = true;
            window.clearTimeout(timer);
            resolve(false);
          });
        });
      }

      function hasFontAwesomeLink() {
        return !!document.querySelector('link[href*="/fontawesome/"], link[href*="fontawesome"]');
      }

      function hasIconNodes() {
        return !!document.querySelector('.fa, .fa-solid, .fa-regular, .fa-brands, .fas, .far, .fab');
      }

      function maybeFinalize() {
        if (complete || finalizeQueued) return;
        if (!pageLoaded || !iconFontsReady || !iconNodesReady) return;
        finalizeQueued = true;
        setTarget(98, 'Почти готово...');
        window.setTimeout(finalizeLoader, 120);
      }

      function stopIconObserver() {
        if (iconObserver) {
          iconObserver.disconnect();
          iconObserver = null;
        }
      }

      function waitForIconNodes(maxWaitMs) {
        if (hasIconNodes()) {
          iconNodesReady = true;
          maybeFinalize();
          return;
        }

        updateStatus('Ожидаем отрисовку иконок...');
        var root = document.body || document.documentElement;
        if (!root || typeof MutationObserver === 'undefined') {
          iconNodesReady = true;
          maybeFinalize();
          return;
        }

        var timeoutId = window.setTimeout(function() {
          stopIconObserver();
          iconNodesReady = true;
          maybeFinalize();
        }, maxWaitMs);

        iconObserver = new MutationObserver(function() {
          if (!hasIconNodes()) return;
          window.clearTimeout(timeoutId);
          stopIconObserver();
          iconNodesReady = true;
          maybeFinalize();
        });

        iconObserver.observe(root, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['class']
        });
      }

      function waitForIconFonts() {
        if (!hasFontAwesomeLink() || !document.fonts || !document.fonts.load) {
          iconFontsReady = true;
          maybeFinalize();
          return;
        }

        setTarget(91, 'Проверяем шрифт иконок...');
        var specs = [
          '900 1em "Font Awesome 6 Free"',
          '400 1em "Font Awesome 6 Free"',
          '400 1em "Font Awesome 6 Brands"'
        ];
        var loaders = [];
        for (var i = 0; i < specs.length; i++) {
          loaders.push(withTimeout(document.fonts.load(specs[i]), 2800));
        }

        withTimeout(Promise.all(loaders), 3400).then(function() {
          iconFontsReady = true;
          if (!complete) {
            setTarget(95, 'Иконки готовы, завершаем...');
          }
          maybeFinalize();
        });
      }

      function tickProgress() {
        if (complete) return;

        var delta = progressTarget - progressCurrent;
        if (delta > 0.08) {
          progressCurrent += delta * 0.14 + 0.08;
        } else {
          progressCurrent = progressTarget;
        }

        if (progressCurrent > 100) progressCurrent = 100;
        renderProgress(progressCurrent);
        frameId = window.requestAnimationFrame(tickProgress);
      }

      function finalizeLoader() {
        if (complete) return;
        complete = true;
        stopIconObserver();

        if (frameId) {
          window.cancelAnimationFrame(frameId);
          frameId = 0;
        }

        setTarget(100, 'Готово');
        progressCurrent = 100;
        renderProgress(progressCurrent);

        var minVisibleMs = 820;
        var elapsed = Date.now() - startedAt;
        var waitBeforeHide = elapsed < minVisibleMs ? (minVisibleMs - elapsed) : 120;

        window.setTimeout(function() {
          if (!loader) return;
          loader.classList.add('boot-loader--done');
          if (document.body) {
            document.body.classList.add('boot-complete');
          }
          window.setTimeout(function() {
            loader.style.display = 'none';
            loader.setAttribute('aria-busy', 'false');
            window.bootLoaderComplete = true;
            window.dispatchEvent(new Event('bootloader-complete'));
          }, 460);
        }, waitBeforeHide);
      }

      function scheduleTimeline() {
        for (var i = 0; i < timeline.length; i++) {
          (function(step) {
            window.setTimeout(function() {
              if (!complete) {
                setTarget(step.progress, step.text);
              }
            }, step.delay);
          })(timeline[i]);
        }
      }

      function bindResourceSignals() {
        if (document.fonts && document.fonts.ready) {
          withTimeout(document.fonts.ready, 2800).then(function() {
            if (!complete) {
              setTarget(66, 'Шрифты текста готовы...');
            }
          });
        }

        function onLoadReady() {
          if (complete) return;
          pageLoaded = true;
          setTarget(86, 'Проверяем ресурсы интерфейса...');
          waitForIconNodes(2600);
          waitForIconFonts();
          maybeFinalize();
        }

        if (document.readyState === 'complete') {
          onLoadReady();
        } else {
          window.addEventListener('load', onLoadReady, { once: true });
        }

        window.setTimeout(function() {
          if (!complete) {
            stopIconObserver();
            finalizeLoader();
          }
        }, 8200);
      }

      function ensureMarkup() {
        if (!loader) return;
        if (loader.querySelector('.boot-shell')) return;
        loader.innerHTML = fallbackInnerHTML;
      }

      function init() {
        loader = document.getElementById('boot-loader');
        if (!loader) {
          if (document.body) {
            document.body.classList.add('boot-complete');
          }
          return;
        }

        ensureMarkup();

        progressBar = document.getElementById('boot-progress-bar');
        progressValue = document.getElementById('boot-progress-value');
        statusText = document.getElementById('boot-status-text');
        themePill = document.getElementById('boot-theme-pill');

        setTheme(resolveTheme());
        renderProgress(progressCurrent);
        scheduleTimeline();
        bindResourceSignals();
        frameId = window.requestAnimationFrame(tickProgress);
      }

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
      } else {
        init();
      }
    })();
  `
}

/**
 * HTML разметка прелоадера.
 */
export function getPreloaderHTML(
  projectName = DEFAULT_PROJECT_NAME,
  themeHint: PreloaderTheme = 'auto'
) {
  const safeThemeHint = normalizeTheme(themeHint)
  const initialThemeAttr = safeThemeHint === 'auto' ? '' : ` data-theme="${safeThemeHint}"`
  return `
    <div id="boot-loader"${initialThemeAttr} data-theme-hint="${safeThemeHint}" data-project-name="${escapeHtml(projectName)}" aria-live="polite" aria-busy="true">
      ${getPreloaderInnerHTML(projectName)}
    </div>
  `
}
