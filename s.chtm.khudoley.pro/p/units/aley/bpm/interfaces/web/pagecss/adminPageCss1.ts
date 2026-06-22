// @shared
export const adminPageCss1 = `
/* Высота окна: хедер и футер фиксированы; <main> без вертикального скролла — крутится левая колонка, правая (логи) по высоте ряда = окно минус хедер/футер/тулбар. */
.app-layout {
  height: 100vh;
  height: 100dvh;
  max-height: 100vh;
  max-height: 100dvh;
  overflow: hidden;
  position: relative;
  width: 100%;
}

/* main: колонка на всю доступную высоту между шапкой и футером, без собственного scroll */
.ap-wrap {
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  width: 100%;
  overflow: hidden;
}

.ap {
  --c-bg: rgba(12, 11, 14, 0.97);
  --c-bg2: rgba(16, 15, 19, 0.96);
  --c-bg-deep: rgba(8, 7, 10, 0.98);
  --c-bdr: rgba(50, 44, 54, 0.55);
  --c-bdr-hi: rgba(75, 62, 78, 0.6);
  --c-tx: #e0dcdf;
  --c-tx2: #a39da0;
  --c-tx3: #7e777b;
  --c-red: #c4213f;
  --c-red-s: #d95672;
  --c-red-glow: rgba(217, 86, 114, 0.35);
  --c-warn: #c9a660;
  --c-alert: #d97a8a;
  --c-ok: #6aaf7e;

  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  width: 100%;
  max-width: 1440px;
  margin: 0 auto;
  padding: 0.75rem 1rem 1.5rem;
  opacity: 0;
  transform: translateY(8px);
  transition:
    opacity 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94),
    transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  font-family: 'Share Tech Mono', 'Courier New', monospace;
}

.ap.ready {
  opacity: 1;
  transform: none;
}
.ap,
.ap * {
  box-sizing: border-box;
  border-radius: 0 !important;
  line-height: 1.45;
}

.ap-icon-muted {
  font-size: 0.65rem;
  opacity: 0.55;
}
.ap-icon-hd {
  font-size: 0.68rem;
  opacity: 0.6;
  margin-right: 0.15rem;
}

/* ── STATUS BAR ── */
.ap-status {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.5rem 0.85rem;
  margin-bottom: 0.85rem;
  border: 1px solid var(--c-bdr);
  background: var(--c-bg-deep);
  font-size: 0.78rem;
  color: var(--c-tx2);
  position: relative;
  overflow: hidden;
}
.ap-status::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--c-red), transparent);
  opacity: 0.3;
}
.ap-status-sweep {
  position: absolute;
  top: 0;
  left: -100%;
  width: 50%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(217, 86, 114, 0.03), transparent);
  animation: ap-sweep 8s linear infinite;
  pointer-events: none;
}
@keyframes ap-sweep {
  0% {
    left: -50%;
  }
  100% {
    left: 150%;
  }
}
.ap-status-left,
.ap-status-right {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  position: relative;
  z-index: 1;
}
.ap-path {
  color: var(--c-red-s);
  letter-spacing: 0.04em;
  font-weight: 600;
}
.ap-separator {
  color: var(--c-tx3);
  opacity: 0.4;
}
.ap-project-label {
  color: var(--c-tx);
  letter-spacing: 0.02em;
}
.ap-status-tag {
  padding: 0.15rem 0.45rem;
  border: 1px solid var(--c-bdr);
  background: rgba(16, 15, 19, 0.7);
  font-size: 0.7rem;
  letter-spacing: 0.05em;
  color: var(--c-tx2);
}
/* Поток логов: фиксированная ширина подписи, отдельный индикатор загрузки — без скачков вёрстки */
.ap-stream-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-width: 7.25rem;
  padding: 0.28rem 0.5rem 0.28rem 0.4rem;
  border: 1px solid var(--c-bdr);
  background: rgba(10, 9, 12, 0.85);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  line-height: 1;
  flex-shrink: 0;
  box-sizing: border-box;
}
.ap-stream-pill__dot {
  width: 7px;
  height: 7px;
  flex: 0 0 7px;
  align-self: center;
  background: var(--c-tx3);
  box-shadow: none;
}
.ap-stream-pill__label {
  flex: 1 1 auto;
  min-width: 4.25rem;
  text-align: left;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  padding-top: 0.06em;
}
.ap-stream-pill__sync {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 0.85rem;
  font-size: 0.62rem;
  opacity: 0.85;
  color: var(--c-tx2);
}
.ap-stream-pill--live {
  color: var(--c-red-s);
  border-color: rgba(217, 86, 114, 0.35);
}
.ap-stream-pill--live .ap-stream-pill__dot {
  background: var(--c-red-s);
  box-shadow: 0 0 6px var(--c-red-glow);
  animation: ap-stream-dot-pulse 2.2s ease-in-out infinite;
}
.ap-stream-pill--offline {
  color: var(--c-tx3);
  border-color: rgba(80, 75, 82, 0.55);
}
.ap-stream-pill--offline .ap-stream-pill__dot {
  background: var(--c-tx3);
  animation: none;
}
.ap-stream-pill--nosocket {
  color: var(--c-tx3);
  border-color: var(--c-bdr);
}
.ap-stream-pill--nosocket .ap-stream-pill__dot {
  background: var(--c-tx3);
  opacity: 0.5;
  animation: none;
}
.ap-stream-pill--pending {
  color: var(--c-tx2);
  border-color: rgba(90, 82, 88, 0.45);
}
.ap-stream-pill--pending .ap-stream-pill__dot {
  background: rgba(217, 86, 114, 0.55);
  opacity: 1;
  animation: ap-stream-dot-pulse 1.4s ease-in-out infinite;
}
.ap-stream-pill--syncing.ap-stream-pill--live {
  border-color: rgba(217, 86, 114, 0.45);
}
@keyframes ap-stream-dot-pulse {
  0%,
  100% {
    opacity: 1;
    box-shadow: 0 0 6px var(--c-red-glow);
    transform: scale(1);
  }
  50% {
    opacity: 0.4;
    box-shadow: 0 0 2px rgba(217, 86, 114, 0.25);
    transform: scale(0.92);
  }
}

/* ── GRID: ровно оставшаяся высота main; левая колонка скроллится, правая (логи) тянется по высоте ряда и не уезжает при скролле слева ── */
.ap-grid {
  flex: 1 1 auto;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(240px, 1fr) minmax(360px, 440px);
  grid-template-rows: minmax(0, 1fr);
  gap: 0.85rem;
  align-items: stretch;
}
.ap-main {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  min-width: 0;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
}

/* ── CARDS ── */
.ap-card {
  border: 1px solid var(--c-bdr);
  background: linear-gradient(175deg, var(--c-bg), var(--c-bg2));
  padding: 0.85rem 1rem;
  position: relative;
  transition: border-color 0.25s ease;
}
.ap-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent 10%, var(--c-red) 50%, transparent 90%);
  opacity: 0.2;
}
.ap-card::after {
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.012) 0px,
    rgba(0, 0, 0, 0.012) 1px,
    transparent 1px,
    transparent 3px
  );
  pointer-events: none;
  opacity: 0.4;
}
.ap-card:hover {
  border-color: var(--c-bdr-hi);
}
.ap-card--stagger-1 {
  animation: ap-card-enter 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.1s both;
}
`
