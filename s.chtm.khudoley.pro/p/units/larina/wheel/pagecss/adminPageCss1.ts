// @shared
export const adminPageCss1 = `
/* Высота окна: хедер и футер фиксированы; main без вертикального скролла — крутится левая колонка, правая (логи) по высоте ряда. На мобиле скролл-контейнером становится .app-layout (см. media-блок). */
.app-layout {
  height: 100vh;
  height: 100dvh;
  max-height: 100vh;
  max-height: 100dvh;
  overflow: hidden;
  position: relative;
  width: 100%;
}

.ap-wrap {
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  width: 100%;
  overflow: hidden;
  background: #0a0a0c;
}

.ap {
  --c-page: #0a0a0c;
  --c-bg: #141417;
  --c-bg2: #1a1a1f;
  --c-bg-deep: #0e0e11;
  --c-bdr: rgba(255, 255, 255, 0.07);
  --c-bdr-hi: rgba(255, 255, 255, 0.13);
  --c-tx: #ececf1;
  --c-tx2: #9b9ba6;
  --c-tx3: #65656f;
  --c-red: #e24b58;
  --c-red-s: #ef6573;
  --c-red-glow: rgba(226, 75, 88, 0.4);
  --c-accent-bg: rgba(226, 75, 88, 0.13);
  --c-accent-bdr: rgba(226, 75, 88, 0.45);
  --c-warn: #e3a13a;
  --c-warn-bg: rgba(227, 161, 58, 0.13);
  --c-alert: #e24b58;
  --c-ok: #4cc38a;
  --c-ok-bg: rgba(76, 195, 138, 0.13);
  --radius: 8px;
  --radius-lg: 12px;
  --radius-pill: 999px;
  --font-ui: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  --font-mono: ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Consolas, 'Share Tech Mono', monospace;

  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  width: 100%;
  max-width: 1320px;
  margin: 0 auto;
  padding: 1.15rem 1.25rem 1.4rem;
  opacity: 0;
  transform: translateY(6px);
  transition:
    opacity 0.4s ease,
    transform 0.4s ease;
  font-family: var(--font-ui);
  color: var(--c-tx);
  -webkit-font-smoothing: antialiased;
}
.ap.ready {
  opacity: 1;
  transform: none;
}
.ap,
.ap * {
  box-sizing: border-box;
}
.ap {
  line-height: 1.5;
}

.ap-icon-muted {
  color: var(--c-tx3);
  font-size: 0.85rem;
}
.ap-icon-hd {
  color: var(--c-tx3);
  font-size: 0.9rem;
  margin-right: 0.1rem;
}

/* ── STATUS BAR ── */
.ap-status {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.6rem 0.9rem;
  margin-bottom: 1rem;
  border: 1px solid var(--c-bdr);
  border-radius: var(--radius-lg);
  background: var(--c-bg);
  font-size: 0.82rem;
  color: var(--c-tx2);
}
.ap-status-sweep {
  display: none;
}
.ap-status-left,
.ap-status-right {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}
.ap-path {
  color: var(--c-tx2);
  font-weight: 500;
}
.ap-separator {
  color: var(--c-tx3);
}
.ap-project-label {
  color: var(--c-tx);
  font-weight: 500;
}
.ap-status-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.2rem 0.55rem;
  border: 1px solid var(--c-bdr);
  border-radius: var(--radius-pill);
  background: var(--c-bg-deep);
  font-size: 0.72rem;
  color: var(--c-tx2);
  font-variant-numeric: tabular-nums;
}

/* ── LIVE PILL ── */
.ap-stream-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-width: 6.5rem;
  padding: 0.28rem 0.6rem;
  border: 1px solid var(--c-bdr);
  border-radius: var(--radius-pill);
  background: var(--c-bg-deep);
  font-size: 0.7rem;
  font-weight: 500;
  letter-spacing: 0.02em;
  line-height: 1;
  flex-shrink: 0;
}
.ap-stream-pill__dot {
  width: 7px;
  height: 7px;
  flex: 0 0 7px;
  border-radius: 50%;
  background: var(--c-tx3);
}
.ap-stream-pill__label {
  flex: 1 1 auto;
  min-width: 3.5rem;
  text-align: left;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  display: inline-flex;
  align-items: center;
}
.ap-stream-pill__sync {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 0.85rem;
  font-size: 0.62rem;
  color: var(--c-tx2);
}
.ap-stream-pill--live {
  color: var(--c-ok);
  border-color: var(--c-ok-bg);
}
.ap-stream-pill--live .ap-stream-pill__dot {
  background: var(--c-ok);
  box-shadow: 0 0 0 3px var(--c-ok-bg);
  animation: ap-stream-dot-pulse 2.4s ease-in-out infinite;
}
.ap-stream-pill--offline {
  color: var(--c-tx3);
}
.ap-stream-pill--offline .ap-stream-pill__dot {
  background: var(--c-tx3);
}
.ap-stream-pill--nosocket {
  color: var(--c-tx3);
}
.ap-stream-pill--nosocket .ap-stream-pill__dot {
  background: var(--c-tx3);
  opacity: 0.5;
}
.ap-stream-pill--pending {
  color: var(--c-tx2);
}
.ap-stream-pill--pending .ap-stream-pill__dot {
  background: var(--c-warn);
  animation: ap-stream-dot-pulse 1.4s ease-in-out infinite;
}
@keyframes ap-stream-dot-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.35;
  }
}

/* ── GRID: левая колонка скроллится, правая (логи) по высоте ряда ── */
.ap-grid {
  flex: 1 1 auto;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(240px, 1fr) minmax(360px, 440px);
  grid-template-rows: minmax(0, 1fr);
  gap: 1rem;
  align-items: stretch;
}
.ap-main {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-width: 0;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  padding-right: 0.3rem;
}

/* ── CARDS ── */
.ap-card {
  border: 1px solid var(--c-bdr);
  background: var(--c-bg);
  border-radius: var(--radius-lg);
  padding: 1.1rem 1.15rem;
  position: relative;
  transition:
    border-color 0.2s ease,
    background 0.2s ease;
}
.ap-card:hover {
  border-color: var(--c-bdr-hi);
}
.ap-card--stagger-1 {
  animation: ap-card-enter 0.45s ease 0.04s both;
}

/* ── SCROLLBARS ── */
.ap-main::-webkit-scrollbar,
.ap-log-out::-webkit-scrollbar,
.ap-groups-list::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
.ap-main::-webkit-scrollbar-thumb,
.ap-log-out::-webkit-scrollbar-thumb,
.ap-groups-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-pill);
}
.ap-main::-webkit-scrollbar-thumb:hover,
.ap-log-out::-webkit-scrollbar-thumb:hover,
.ap-groups-list::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.18);
}
.ap-main,
.ap-log-out,
.ap-groups-list {
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.14) transparent;
}
`
