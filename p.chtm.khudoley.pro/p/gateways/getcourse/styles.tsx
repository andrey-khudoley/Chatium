// @shared

/**
 * Общий CRT-фон для страниц проекта: тёмный body, vignette/grid в `#geometric-bg`,
 * scanlines/bezel на `body::after`/`body::before`, glitch overlay `#tv-glitch`,
 * crt-power-on / body-glitch анимации для `.app-layout`.
 *
 * Использовать вместе с разметкой:
 *   <body>
 *     <div id="geometric-bg"></div>
 *     <div id="tv-glitch"></div>
 *     <div id="boot-loader">...</div>
 *     <YourPage ... />
 *   </body>
 *
 * Стили прелоадера подключаются отдельно (`getPreloaderStyles()`).
 */
export const crtBackgroundStyles = `
  html { background: #0a0a0a; }
  body {
    margin: 0;
    background: #0a0a0a;
    color: #e8e8e8;
    font-family: 'Share Tech Mono', 'Courier New', monospace;
    letter-spacing: 0.03em;
    position: relative;
    min-height: 100vh;
    overflow: hidden;
  }
  body.boot-complete {
    overflow-x: hidden;
    overflow-y: auto;
  }

  :root {
    --color-bg: #0a0a0a;
    --color-bg-secondary: #141414;
    --color-bg-tertiary: #1a1a1a;
    --color-text: #e8e8e8;
    --color-text-secondary: #a0a0a0;
    --color-text-tertiary: #707070;
    --color-border: #2a2a2a;
    --color-border-light: #3a3a3a;
    --color-accent: #d3234b;
    --color-accent-hover: #e6395f;
    --color-accent-light: rgba(211, 35, 75, 0.15);
    --color-accent-medium: rgba(211, 35, 75, 0.25);
  }

  ::selection { background: #e0335a; color: #fff; }
  ::-moz-selection { background: #e0335a; color: #fff; }

  /* Hidden until boot-loader signals ready */
  .app-layout:not(.global-glitch-active) {
    opacity: 0;
    position: relative;
    z-index: 2;
    transform: scale(0.96);
    filter: blur(1px);
  }
  body.boot-complete .app-layout:not(.app-layout-appeared) {
    animation: crt-power-on 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.5s forwards;
  }
  body.boot-complete .app-layout.app-layout-appeared:not(.global-glitch-active) {
    opacity: 1 !important;
    transform: scale(1) translate(0, 0) !important;
    filter: blur(0) !important;
  }
  body.boot-complete .app-layout.global-glitch-active { opacity: 1 !important; }

  @keyframes crt-power-on {
    0%   { opacity: 0;    transform: scale(0.96)  translate(0, 0);            filter: blur(1.2px); }
    16%  { opacity: 0.4;  transform: scale(0.98)  translate(-0.12px, 0.08px); filter: blur(0.8px); }
    32%  { opacity: 0.68; transform: scale(0.99)  translate(-0.08px, 0.05px); filter: blur(0.5px); }
    48%  { opacity: 0.85; transform: scale(0.998) translate(-0.04px, 0.03px); filter: blur(0.3px); }
    64%  { opacity: 0.94; transform: scale(1)     translate(-0.02px, 0.015px); filter: blur(0.15px); }
    80%  { opacity: 0.99; transform: scale(1)     translate(-0.01px, 0.008px); filter: blur(0.05px); }
    100% { opacity: 1;    transform: scale(1)     translate(0, 0);            filter: blur(0); }
  }

  /* CRT vignette + grid */
  #geometric-bg {
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    z-index: 1; pointer-events: none;
    background: radial-gradient(
      ellipse 100% 100% at 50% 50%,
      transparent 0%, transparent 75%,
      rgba(0, 0, 0, 0.3) 85%, rgba(0, 0, 0, 0.7) 92%,
      rgba(0, 0, 0, 0.95) 97%, rgba(0, 0, 0, 0.99) 100%
    );
    border-radius: 3% / 4%;
    box-shadow:
      inset 0 0 200px 50px rgba(0, 0, 0, 0.8),
      inset 0 0 100px 20px rgba(0, 0, 0, 0.6);
    animation: crt-ambient-glow 3s ease-in-out infinite;
  }
  @media (max-width: 768px) {
    #geometric-bg {
      background: radial-gradient(
        ellipse 150% 100% at 50% 50%,
        transparent 0%, transparent 80%,
        rgba(0, 0, 0, 0.5) 90%, rgba(0, 0, 0, 0.95) 100%
      );
      border-radius: 0;
      box-shadow:
        inset 0 100px 80px -50px rgba(0, 0, 0, 0.9),
        inset 0 -100px 80px -50px rgba(0, 0, 0, 0.9);
    }
  }
  @keyframes crt-ambient-glow { 0%, 100% { opacity: 1; } 50% { opacity: 0.97; } }

  #geometric-bg::before {
    content: ''; position: absolute; inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'%3E%3Cg stroke='%232a2a2a' stroke-width='0.12' fill='none'%3E%3Cpath d='M 0,0 C -2,15 -3,35 -3,50 C -3,65 -2,85 0,100'/%3E%3Cpath d='M 6,0 C 4,20 4,40 4,50 C 4,60 4,80 6,100'/%3E%3Cpath d='M 12,0 L 11,25 C 11,35 11,65 11,75 L 12,100'/%3E%3Cpath d='M 18,0 L 18,30 L 18,70 L 18,100'/%3E%3Cpath d='M 24,0 L 24,100'/%3E%3Cpath d='M 30,0 L 30,100'/%3E%3Cpath d='M 36,0 L 36,100'/%3E%3Cpath d='M 42,0 L 42,100'/%3E%3Cpath d='M 48,0 L 48,100'/%3E%3Cpath d='M 54,0 L 54,100'/%3E%3Cpath d='M 60,0 L 60,100'/%3E%3Cpath d='M 66,0 L 66,100'/%3E%3Cpath d='M 72,0 L 72,100'/%3E%3Cpath d='M 78,0 L 78,100'/%3E%3Cpath d='M 84,0 L 84,30 L 84,70 L 84,100'/%3E%3Cpath d='M 90,0 L 91,25 C 91,35 91,65 91,75 L 90,100'/%3E%3Cpath d='M 96,0 C 98,20 98,40 98,50 C 98,60 98,80 96,100'/%3E%3Cpath d='M 100,0 C 103,15 105,35 105,50 C 105,65 103,85 100,100'/%3E%3Cpath d='M 0,0 C 15,-2 35,-3 50,-3 C 65,-3 85,-2 100,0'/%3E%3Cpath d='M 0,6 C 20,4 40,4 50,4 C 60,4 80,4 100,6'/%3E%3Cpath d='M 0,12 L 25,11 C 35,11 65,11 75,11 L 100,12'/%3E%3Cpath d='M 0,18 L 30,18 L 70,18 L 100,18'/%3E%3Cpath d='M 0,24 L 100,24'/%3E%3Cpath d='M 0,30 L 100,30'/%3E%3Cpath d='M 0,36 L 100,36'/%3E%3Cpath d='M 0,42 L 100,42'/%3E%3Cpath d='M 0,48 L 100,48'/%3E%3Cpath d='M 0,54 L 100,54'/%3E%3Cpath d='M 0,60 L 100,60'/%3E%3Cpath d='M 0,66 L 100,66'/%3E%3Cpath d='M 0,72 L 100,72'/%3E%3Cpath d='M 0,78 L 100,78'/%3E%3Cpath d='M 0,84 L 100,84'/%3E%3Cpath d='M 0,90 L 25,91 C 35,91 65,91 75,91 L 100,90'/%3E%3Cpath d='M 0,96 C 20,98 40,98 50,98 C 60,98 80,98 100,96'/%3E%3Cpath d='M 0,100 C 15,103 35,105 50,105 C 65,105 85,103 100,100'/%3E%3C/g%3E%3C/svg%3E");
    background-size: 100% 100%;
    background-position: center;
    background-repeat: no-repeat;
    opacity: 0.3;
  }
  #geometric-bg::after {
    content: ''; position: absolute;
    top: -50%; right: -10%;
    width: 600px; height: 600px;
    background: radial-gradient(circle, rgba(211, 35, 75, 0.08) 0%, transparent 70%);
    border-radius: 50%;
    animation: geometric-float 20s ease-in-out infinite;
  }
  @keyframes geometric-float {
    0%, 100% { transform: translate(0, 0) scale(1); }
    50% { transform: translate(-50px, 50px) scale(1.1); }
  }

  /* Scanlines (top overlay) */
  body::after {
    content: ''; position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background: repeating-linear-gradient(
      0deg,
      rgba(0, 0, 0, 0.03),
      rgba(0, 0, 0, 0.03) 1px,
      transparent 1px, transparent 2px
    );
    pointer-events: none; z-index: 999999;
    border-radius: 3% / 4%;
    opacity: 0;
    animation:
      scanline-fade-in 0.6s ease-out 1s forwards,
      scanline-flicker 8s linear 1.6s infinite;
  }
  @keyframes scanline-fade-in { from { opacity: 0; } to { opacity: 0.3; } }
  @keyframes scanline-flicker  { 0% { opacity: 0.25; } 50% { opacity: 0.35; } 100% { opacity: 0.25; } }
  @media (max-width: 768px) {
    body::after { border-radius: 0; }
  }

  /* Bezel inner shadow */
  body::before {
    content: ''; position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    pointer-events: none; z-index: 999998;
    border-radius: 3% / 4%;
    box-shadow:
      inset 0 0 80px rgba(0, 0, 0, 0.3),
      inset 0 2px 1px rgba(255, 255, 255, 0.01);
    opacity: 0;
    animation: bezel-fade-in 0.8s ease-out 1.2s forwards;
  }
  @keyframes bezel-fade-in { from { opacity: 0; } to { opacity: 1; } }
  @media (max-width: 768px) {
    body::before {
      border-radius: 0;
      box-shadow: inset 0 0 40px rgba(0, 0, 0, 0.2);
    }
  }

  /* TV glitch overlay */
  #tv-glitch {
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    z-index: 999997; pointer-events: none; opacity: 0;
  }
  #tv-glitch.active { animation: glitch-wave 1s cubic-bezier(0.4, 0, 0.2, 1); }
  @keyframes glitch-wave { 0%, 100% { opacity: 0; } 10%, 90% { opacity: 0.8; } }
  #tv-glitch::before {
    content: ''; position: absolute;
    left: 0; right: 0; height: 80px;
    background: transparent;
  }
  #tv-glitch.active::before { animation: glitch-zone-move 1s cubic-bezier(0.4, 0, 0.2, 1); }
  @keyframes glitch-zone-move {
    0%   { top: -80px; opacity: 0; }
    10%  { opacity: 1; }
    90%  { opacity: 1; }
    100% { top: 100%; opacity: 0; }
  }

  body.glitch-active .app-layout {
    animation: body-glitch 1s cubic-bezier(0.4, 0, 0.2, 1);
    will-change: transform;
  }
  @keyframes body-glitch {
    0%, 100% { transform: translateX(0); }
    15% { transform: translateX(-2px); }
    18% { transform: translateX(3px); }
    22% { transform: translateX(-2px); }
    25% { transform: translateX(2px); }
    28% { transform: translateX(0); }
    50% { transform: translateX(-3px); }
    53% { transform: translateX(2px); }
    56% { transform: translateX(0); }
    75% { transform: translateX(2px); }
    78% { transform: translateX(-2px); }
    82% { transform: translateX(0); }
  }
`

export const baseHtmlStyles = `
  body {
    height: 100%;
    width: 100%;
    background-image: url(https://fs.cdn-chatium.io/thumbnail/image_bXkpfHZFGu.2393x2250.png/s/400x400);
    background-size: 196px;
    background-color: #f8f8f8;
  }
`

/**
 * Скроллбар: низкий контраст, едва заметный (нейтральные тёмно-серые тона как у границ UI), без акцентного свечения.
 * WebKit — узкий, слабый градиент на ползунке; Firefox — `scrollbar-color` с теми же оттенками.
 * Основной скролл: `body`, `.content-wrapper` (в т.ч. на `.ap-main` / `.tp-main` на админке и тестах), `.custom-scrollbar`.
 */
export const customScrollbarStyles = `
  @supports not selector(::-webkit-scrollbar) {
    body,
    .content-wrapper,
    .custom-scrollbar {
      scrollbar-width: thin;
      scrollbar-color: #3a383c #0c0c0c;
    }
  }

  body::-webkit-scrollbar,
  .content-wrapper::-webkit-scrollbar,
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  body::-webkit-scrollbar-track,
  .content-wrapper::-webkit-scrollbar-track,
  .custom-scrollbar::-webkit-scrollbar-track {
    background: #0c0c0c;
    border-left: 1px solid rgba(50, 44, 54, 0.22);
    box-shadow: none;
    border-radius: 0;
  }

  body::-webkit-scrollbar-thumb,
  .content-wrapper::-webkit-scrollbar-thumb,
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: linear-gradient(
      180deg,
      rgba(52, 48, 54, 0.9) 0%,
      rgba(38, 36, 40, 0.95) 100%
    );
    border: 1px solid rgba(45, 42, 48, 0.55);
    border-radius: 0;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
  }

  body::-webkit-scrollbar-thumb:hover,
  .content-wrapper::-webkit-scrollbar-thumb:hover,
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(
      180deg,
      rgba(58, 54, 60, 0.92) 0%,
      rgba(44, 42, 46, 0.96) 100%
    );
    border-color: rgba(55, 50, 58, 0.6);
  }

  body::-webkit-scrollbar-thumb:active,
  .content-wrapper::-webkit-scrollbar-thumb:active,
  .custom-scrollbar::-webkit-scrollbar-thumb:active {
    background: linear-gradient(
      180deg,
      rgba(46, 44, 48, 0.95) 0%,
      rgba(34, 32, 36, 1) 100%
    );
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.35);
  }

  body::-webkit-scrollbar-corner,
  .content-wrapper::-webkit-scrollbar-corner,
  .custom-scrollbar::-webkit-scrollbar-corner {
    background: #0c0c0c;
  }
`
