// @shared
export const baseHtmlStyles = `
  body {
    height: 100%;
    width: 100%;
    background-image: url(https://fs.cdn-chatium.io/thumbnail/image_bXkpfHZFGu.2393x2250.png/s/400x400);
    background-size: 196px;
    background-color: #f8f8f8;
  }
`

/** Переиспользуемые стили скроллбара (тёмная тема). .content-wrapper — основной скролл; body — если скроллится страница; .custom-scrollbar — блоки вроде логов. В Chrome 121+ стандартные scrollbar-width/scrollbar-color переопределяют ::-webkit-scrollbar, поэтому стандартные свойства задаём только для Firefox через @supports. */
export const customScrollbarStyles = `
  @supports not selector(::-webkit-scrollbar) {
    body,
    .content-wrapper,
    .custom-scrollbar {
      scrollbar-width: thin;
      scrollbar-color: #444 #1a1a1a;
    }
  }
  body::-webkit-scrollbar,
  .content-wrapper::-webkit-scrollbar,
  .custom-scrollbar::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  body::-webkit-scrollbar-track,
  .content-wrapper::-webkit-scrollbar-track,
  .custom-scrollbar::-webkit-scrollbar-track {
    background: #1a1a1a;
    border-radius: 4px;
  }
  body::-webkit-scrollbar-thumb,
  .content-wrapper::-webkit-scrollbar-thumb,
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #444;
    border-radius: 4px;
  }
  body::-webkit-scrollbar-thumb:hover,
  .content-wrapper::-webkit-scrollbar-thumb:hover,
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #555;
  }
  body::-webkit-scrollbar-thumb:active,
  .content-wrapper::-webkit-scrollbar-thumb:active,
  .custom-scrollbar::-webkit-scrollbar-thumb:active {
    background: #666;
  }
`

/** Чтобы фоновая сетка была видна поверх контента: корневой .app-layout должен быть прозрачным. Подключать вместе с geometricBgStyles на страницах с сеткой. */
export const appLayoutOverGridStyles = `
  .app-layout { background: transparent !important; }
`

/** Фоновая сетка (CRT-сетка + виньетка + градиент) для тёмных страниц. Подключать в head; в body добавить <div id="geometric-bg"></div> перед контентом. */
const CRT_GRID_SVG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'%3E%3Cg stroke='%232a2a2a' stroke-width='0.12' fill='none'%3E%3Cpath d='M 0,0 C -2,15 -3,35 -3,50 C -3,65 -2,85 0,100'/%3E%3Cpath d='M 6,0 C 4,20 4,40 4,50 C 4,60 4,80 6,100'/%3E%3Cpath d='M 12,0 L 11,25 C 11,35 11,65 11,75 L 12,100'/%3E%3Cpath d='M 18,0 L 18,30 L 18,70 L 18,100'/%3E%3Cpath d='M 24,0 L 24,100'/%3E%3Cpath d='M 30,0 L 30,100'/%3E%3Cpath d='M 36,0 L 36,100'/%3E%3Cpath d='M 42,0 L 42,100'/%3E%3Cpath d='M 48,0 L 48,100'/%3E%3Cpath d='M 54,0 L 54,100'/%3E%3Cpath d='M 60,0 L 60,100'/%3E%3Cpath d='M 66,0 L 66,100'/%3E%3Cpath d='M 72,0 L 72,100'/%3E%3Cpath d='M 78,0 L 78,100'/%3E%3Cpath d='M 84,0 L 84,30 L 84,70 L 84,100'/%3E%3Cpath d='M 90,0 L 91,25 C 91,35 91,65 91,75 L 90,100'/%3E%3Cpath d='M 96,0 C 98,20 98,40 98,50 C 98,60 98,80 96,100'/%3E%3Cpath d='M 100,0 C 103,15 105,35 105,50 C 105,65 103,85 100,100'/%3E%3Cpath d='M 0,0 C 15,-2 35,-3 50,-3 C 65,-3 85,-2 100,0'/%3E%3Cpath d='M 0,6 C 20,4 40,4 50,4 C 60,4 80,4 100,6'/%3E%3Cpath d='M 0,12 L 25,11 C 35,11 65,11 75,11 L 100,12'/%3E%3Cpath d='M 0,18 L 30,18 L 70,18 L 100,18'/%3E%3Cpath d='M 0,24 L 100,24'/%3E%3Cpath d='M 0,30 L 100,30'/%3E%3Cpath d='M 0,36 L 100,36'/%3E%3Cpath d='M 0,42 L 100,42'/%3E%3Cpath d='M 0,48 L 100,48'/%3E%3Cpath d='M 0,54 L 100,54'/%3E%3Cpath d='M 0,60 L 100,60'/%3E%3Cpath d='M 0,66 L 100,66'/%3E%3Cpath d='M 0,72 L 100,72'/%3E%3Cpath d='M 0,78 L 100,78'/%3E%3Cpath d='M 0,84 L 100,84'/%3E%3Cpath d='M 0,90 L 25,91 C 35,91 65,91 75,91 L 100,90'/%3E%3Cpath d='M 0,96 C 20,98 40,98 50,98 C 60,98 80,98 100,96'/%3E%3Cpath d='M 0,100 C 15,103 35,105 50,105 C 65,105 85,103 100,100'/%3E%3C/g%3E%3C/svg%3E"

export const geometricBgStyles = `
  #geometric-bg {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1;
    pointer-events: none;
    background: radial-gradient(
      ellipse 100% 100% at 50% 50%,
      transparent 0%,
      transparent 75%,
      rgba(0, 0, 0, 0.3) 85%,
      rgba(0, 0, 0, 0.7) 92%,
      rgba(0, 0, 0, 0.95) 97%,
      rgba(0, 0, 0, 0.99) 100%
    );
    border-radius: 3% / 4%;
    box-shadow: inset 0 0 200px 50px rgba(0, 0, 0, 0.8), inset 0 0 100px 20px rgba(0, 0, 0, 0.6);
    animation: crt-ambient-glow 3s ease-in-out infinite;
  }
  @media (max-width: 768px) {
    #geometric-bg {
      background: radial-gradient(
        ellipse 150% 100% at 50% 50%,
        transparent 0%,
        transparent 80%,
        rgba(0, 0, 0, 0.5) 90%,
        rgba(0, 0, 0, 0.95) 100%
      );
      border-radius: 0;
      box-shadow: inset 0 100px 80px -50px rgba(0, 0, 0, 0.9), inset 0 -100px 80px -50px rgba(0, 0, 0, 0.9);
    }
  }
  @keyframes crt-ambient-glow {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.97; }
  }
  #geometric-bg::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image: url("${CRT_GRID_SVG}");
    background-size: 100% 100%;
    background-position: center;
    background-repeat: no-repeat;
    opacity: 0.3;
  }
  #geometric-bg::after {
    content: '';
    position: absolute;
    top: -50%;
    right: -10%;
    width: 600px;
    height: 600px;
    background: radial-gradient(circle, rgba(211, 35, 75, 0.08) 0%, transparent 70%);
    border-radius: 50%;
    animation: geometric-float 20s ease-in-out infinite;
  }
  @keyframes geometric-float {
    0%, 100% { transform: translate(0, 0) scale(1); }
    50% { transform: translate(-50px, 50px) scale(1.1); }
  }
`
