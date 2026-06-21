// @shared
export const lavatopHeaderCss1 = `
.header {
  background: transparent;
  padding: 1.25rem 0;
  position: relative;
  z-index: 200;
  transition: all 0.25s ease;
  font-family: 'Share Tech Mono', 'Courier New', monospace;
}

.header-hidden {
  opacity: 0;
  pointer-events: none;
}

/* Скрытие контента при открытии модального окна */
.hidden-for-modal {
  opacity: 0 !important;
  pointer-events: none !important;
  transition: opacity 0.3s ease;
}

.content-hidden {
  transition: opacity 0.3s ease;
}

/* Terminal-style corner brackets for header */
.header::before {
  content: '';
  position: absolute;
  top: 10px;
  left: 10px;
  width: 20px;
  height: 20px;
  border-left: 2px solid rgba(211, 35, 75, 0.3);
  border-top: 2px solid rgba(211, 35, 75, 0.3);
  pointer-events: none;
}

.header::after {
  content: '';
  position: absolute;
  top: 10px;
  right: 10px;
  width: 20px;
  height: 20px;
  border-right: 2px solid rgba(211, 35, 75, 0.3);
  border-top: 2px solid rgba(211, 35, 75, 0.3);
  pointer-events: none;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.header-title-section {
  display: flex;
  align-items: center;
  gap: 0;
  min-width: 0;
  position: relative;
}

.header-logo-and-title {
  display: flex;
  align-items: center;
  gap: 1rem;
  cursor: pointer;
  text-decoration: none;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-shrink: 0;
}

/* Анимация срабатывает только при ховере на сами элементы (логотип или заголовок) */
.header-logo-and-title:has(.header-logo:hover) .header-logo,
.header-logo-and-title:has(.header-logo:hover) .header-title,
.header-logo-and-title:has(.header-title:hover) .header-logo,
.header-logo-and-title:has(.header-title:hover) .header-title {
  animation: glitch-text 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
}

/* Основная анимация глитча с RGB-разделением */
@keyframes glitch-text {
  0%,
  100% {
    transform: translate(0);
    filter: none;
  }
  10% {
    transform: translate(-1.5px, 0);
    filter: drop-shadow(1px 0 0 #ff00ff) drop-shadow(-1px 0 0 #00ffff);
  }
  20% {
    transform: translate(1.5px, 0);
    filter: drop-shadow(-1px 0 0 #ff00ff) drop-shadow(1px 0 0 #00ffff);
  }
  30% {
    transform: translate(-1px, 0);
    filter: drop-shadow(1.5px 0 0 #ff00ff) drop-shadow(-1.5px 0 0 #00ffff);
  }
  40% {
    transform: translate(1px, 0);
    filter: drop-shadow(-1.5px 0 0 #ff00ff) drop-shadow(1.5px 0 0 #00ffff);
  }
  50% {
    transform: translate(-1.5px, 0);
    filter: drop-shadow(1px 0 0 #ff00ff) drop-shadow(-1px 0 0 #00ffff);
  }
  60% {
    transform: translate(1.5px, 0);
    filter: drop-shadow(-1px 0 0 #ff00ff) drop-shadow(1px 0 0 #00ffff);
  }
  70% {
    transform: translate(-1px, 0);
    filter: drop-shadow(1px 0 0 #ff00ff) drop-shadow(-1px 0 0 #00ffff);
  }
  80% {
    transform: translate(1px, 0);
    filter: drop-shadow(-1.5px 0 0 #ff00ff) drop-shadow(1.5px 0 0 #00ffff);
  }
  90% {
    transform: translate(-0.5px, 0);
    filter: drop-shadow(0.5px 0 0 #ff00ff) drop-shadow(-0.5px 0 0 #00ffff);
  }
}

.header-logo-link {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  position: relative;
}

/* Легкие CRT scanlines для логотипа */
.header-logo-link::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.08) 0px,
    rgba(0, 0, 0, 0.08) 1px,
    transparent 1px,
    transparent 2px
  );
  pointer-events: none;
  z-index: 1;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.header-logo-and-title:hover .header-logo-link::before {
  opacity: 1;
  animation: scanline-flicker-subtle 4s linear infinite;
}

@keyframes scanline-flicker-subtle {
  0%,
  100% {
    opacity: 0.6;
  }
  50% {
    opacity: 0.4;
  }
}

.header-logo {
  height: 2.5rem;
  width: auto;
  object-fit: contain;
  filter: brightness(0.98) contrast(1.05) drop-shadow(0 0 3px rgba(211, 35, 75, 0.15));
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  z-index: 2;
}

.header-logo-and-title:hover .header-logo {
  filter: brightness(1.05) contrast(1.1) drop-shadow(0 0 6px rgba(211, 35, 75, 0.3));
  animation: logo-rgb-glitch 3s ease-in-out infinite;
}

/* Периодический тонкий RGB-глитч для логотипа */
@keyframes logo-rgb-glitch {
  0%,
  85%,
  100% {
    filter: brightness(1.05) contrast(1.1);
  }
  86% {
    filter: brightness(1.05) contrast(1.1) drop-shadow(1px 0 0 rgba(255, 0, 255, 0.4))
      drop-shadow(-1px 0 0 rgba(0, 255, 255, 0.4));
  }
  87% {
    filter: brightness(1.05) contrast(1.1) drop-shadow(-1px 0 0 rgba(255, 0, 255, 0.4))
      drop-shadow(1px 0 0 rgba(0, 255, 255, 0.4));
  }
  88% {
    filter: brightness(1.05) contrast(1.1);
  }
  91% {
    filter: brightness(1.05) contrast(1.1) drop-shadow(1px 0 0 rgba(255, 0, 255, 0.3))
      drop-shadow(-1px 0 0 rgba(0, 255, 255, 0.3));
  }
  92% {
    filter: brightness(1.05) contrast(1.1);
  }
}

.header-title {
  font-size: 1.125rem;
  font-weight: 400;
  color: var(--color-text);
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  letter-spacing: 0.08em;
  text-shadow:
    0 0 8px rgba(232, 232, 232, 0.25),
    0.5px 0 0 rgba(255, 0, 255, 0.08),
    -0.5px 0 0 rgba(0, 255, 255, 0.08);
  position: relative;
  cursor: pointer;
  transition: all 0.3s ease;
}

/* Мерцающий курсор после текста - появляется при hover на логотип ИЛИ заголовок */
.header-title::after {
  content: '▮';
  margin-left: 0.25rem;
  opacity: 0;
  color: var(--color-accent);
  text-shadow: 0 0 8px rgba(211, 35, 75, 0.5);
  transition: opacity 0.3s ease;
}

.header-logo-and-title:hover .header-title::after {
  opacity: 1;
  animation: terminal-cursor-blink 1s step-end infinite;
}

@keyframes terminal-cursor-blink {
  0%,
  50% {
    opacity: 1;
  }
  51%,
  100% {
    opacity: 0;
  }
}

.header-clock {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--color-text-secondary);
  letter-spacing: 0.1em;
  text-shadow: 0 0 4px rgba(160, 160, 160, 0.3);
  position: relative;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  transition: all 0.25s ease;
  cursor: default;
  padding: 0.25rem 0.6rem 0.25rem 0.5rem;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--color-border);
  border-radius: 0;
  image-rendering: pixelated;
  -webkit-font-smoothing: none;
  -moz-osx-font-smoothing: grayscale;
  box-shadow:
    inset 0 1px 2px rgba(0, 0, 0, 0.4),
    0 0 6px rgba(160, 160, 160, 0.08);
  clip-path: polygon(
    0 2px,
    2px 2px,
    2px 0,
    calc(100% - 2px) 0,
    calc(100% - 2px) 2px,
    100% 2px,
    100% calc(100% - 2px),
    calc(100% - 2px) calc(100% - 2px),
    calc(100% - 2px) 100%,
    2px 100%,
    2px calc(100% - 2px),
    0 calc(100% - 2px)
  );
}
`
