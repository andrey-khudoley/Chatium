// @shared
export const headerCss2 = `

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

.header-clock i {
  font-size: 0.625rem;
  opacity: 0.7;
}

.clock-time {
  font-family: 'Share Tech Mono', 'Courier New', monospace;
}

.header-clock:hover {
  color: var(--color-text);
  border-color: var(--color-border-light);
  text-shadow: 0 0 6px rgba(232, 232, 232, 0.5);
  background: rgba(0, 0, 0, 0.4);
}

.header-clock:hover i {
  opacity: 1;
  animation: clock-icon-pulse 2s ease-in-out infinite;
}

@keyframes clock-icon-pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

.header-right {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-shrink: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.header-action-btn {
  width: 2rem;
  height: 2rem;
  border-radius: 0;
  background: var(--color-bg-tertiary);
  border: 2px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  transition: all 0.25s ease;
  color: var(--color-text);
  text-decoration: none;
  cursor: pointer;
  position: relative;
  box-shadow:
    0 2px 4px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.03),
    inset 0 0 0 1px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  clip-path: polygon(
    0 3px,
    3px 3px,
    3px 0,
    calc(100% - 3px) 0,
    calc(100% - 3px) 3px,
    100% 3px,
    100% calc(100% - 3px),
    calc(100% - 3px) calc(100% - 3px),
    calc(100% - 3px) 100%,
    3px 100%,
    3px calc(100% - 3px),
    0 calc(100% - 3px)
  );
}

/* CRT scanlines для кнопок хедера */
.header-action-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.12) 0px,
    rgba(0, 0, 0, 0.12) 1px,
    transparent 1px,
    transparent 2px
  );
  pointer-events: none;
  z-index: 0;
}

.header-action-btn::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background: var(--color-accent);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.3s ease;
  z-index: 2;
}

.header-action-btn i {
  transition: all 0.25s ease;
  position: relative;
  z-index: 2;
}

.header-action-btn:hover {
  border-color: var(--color-border-light);
  transform: translateY(-2px);
  box-shadow:
    0 4px 8px rgba(0, 0, 0, 0.4),
    0 2px 4px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.header-action-btn:hover::after {
  transform: scaleX(1);
}

.header-action-btn:hover i.fa-times {
  transform: rotate(90deg) scale(1.1);
}

.header-action-btn:hover i.fa-window-maximize {
  transform: scale(1.15);
}

.header-action-btn:hover i.fa-window-minimize {
  transform: translateY(2px) scaleY(0.7);
}

.header-action-btn:hover i.fa-cog {
  transform: rotate(90deg);
}

.header-action-btn:active {
  transform: translateY(0);
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.03);
}

.header-action-btn:active i {
  transform: scale(0.95);
}

@media (max-width: 640px) {
  .header {
    padding: 1rem 0;
  }

  .header-title {
    font-size: 1rem;
  }

  .header-clock {
    font-size: 0.8125rem;
    padding: 0.3rem 0.5rem;
    gap: 0.35rem;
  }

  .header-clock i {
    font-size: 0.6875rem;
  }

  .clock-time {
    font-size: 0.8125rem;
  }

  .header-action-btn {
    width: 1.875rem;
    height: 1.875rem;
    font-size: 0.8125rem;
  }
}

@media (max-width: 480px) {
  .header-clock {
    display: none;
  }
}
`
