// @shared
export const testsPageCss1 = `
/* Высота окна: хедер и футер фиксированы; вертикальный скролл у левой колонки, не у <main>. */
.app-layout {
  height: 100vh;
  height: 100dvh;
  max-height: 100vh;
  max-height: 100dvh;
  overflow: hidden;
  position: relative;
  width: 100%;
}

.tp-wrap {
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  width: 100%;
  overflow: hidden;
}

.tp {
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
  --c-cyan: #7dbfcc;

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
.tp.ready {
  opacity: 1;
  transform: none;
}
.tp,
.tp * {
  box-sizing: border-box;
  border-radius: 0 !important;
  line-height: 1.45;
}

.tp-icon-muted {
  font-size: 0.65rem;
  opacity: 0.55;
}
.tp-icon-hd {
  font-size: 0.68rem;
  opacity: 0.6;
  margin-right: 0.15rem;
}
.tp-icon-tab {
  font-size: 0.6rem;
  opacity: 0.6;
  margin-right: 0.1rem;
}
.tp-icon-block {
  font-size: 0.62rem;
  opacity: 0.55;
  margin-right: 0.15rem;
}

/* ── TOOLBAR ── */
.tp-toolbar {
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
  flex-wrap: wrap;
  position: relative;
  overflow: hidden;
}
.tp-toolbar::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--c-red), transparent);
  opacity: 0.3;
}
.tp-toolbar-sweep {
  position: absolute;
  top: 0;
  left: -50%;
  width: 50%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(217, 86, 114, 0.03), transparent);
  animation: tp-sweep 8s linear infinite;
  pointer-events: none;
}
@keyframes tp-sweep {
  0% {
    left: -50%;
  }
  100% {
    left: 150%;
  }
}
.tp-toolbar-left,
.tp-toolbar-right {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  position: relative;
  z-index: 1;
}
.tp-path {
  color: var(--c-red-s);
  letter-spacing: 0.04em;
  font-weight: 600;
}
.tp-last-run {
  font-size: 0.68rem;
  color: var(--c-tx3);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

/* ── TABS ── */
.tp-tabs {
  display: inline-flex;
}
.tp-tab {
  padding: 0.35rem 0.8rem;
  border: 1px solid var(--c-bdr);
  background: var(--c-bg-deep);
  color: var(--c-tx2);
  font-family: inherit;
  font-size: 0.76rem;
  cursor: pointer;
  transition: all 0.15s ease;
  font-weight: 600;
  letter-spacing: 0.04em;
  position: relative;
  overflow: hidden;
}
.tp-tab + .tp-tab {
  border-left: none;
}
.tp-tab::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background: var(--c-red);
  transform: scaleX(0);
  transition: transform 0.2s ease;
}
.tp-tab:hover {
  border-color: var(--c-bdr-hi);
  background: rgba(22, 20, 26, 0.98);
  color: var(--c-tx);
}
.tp-tab:hover::after {
  transform: scaleX(1);
}
.tp-tab.active {
  border-color: var(--c-red-s);
  background: rgba(196, 33, 63, 0.14);
  color: #fff;
}
.tp-tab.active::after {
  transform: scaleX(1);
}
.tp-tab.active .tp-icon-tab {
  opacity: 0.8;
}

/* ── GRID ── */
.tp-grid {
  flex: 1 1 auto;
  min-height: 0;
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: minmax(0, 1fr);
  gap: 0.85rem;
  align-items: stretch;
}
.tp-grid--logs {
  grid-template-columns: minmax(240px, 1fr) minmax(360px, 440px);
}
.tp-main {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  min-width: 0;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
}

.tp-tab-panel {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

/* ── METRICS ── */
.tp-metrics {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.55rem;
  animation: tp-enter 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.1s both;
}
@keyframes tp-enter {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
.tp-metric {
  border: 1px solid var(--c-bdr);
  background: linear-gradient(175deg, var(--c-bg), var(--c-bg2));
  padding: 0.55rem 0.7rem;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  position: relative;
  overflow: hidden;
  transition: border-color 0.25s ease;
}
.tp-metric::after {
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
.tp-metric-accent {
  position: absolute;
  top: 0;
  left: 0;
  width: 3px;
  height: 100%;
}
.tp-metric-icon {
  font-size: 0.6rem;
  color: var(--c-tx3);
  opacity: 0.7;
  position: relative;
  z-index: 1;
  margin-bottom: 0.15rem;
}
.tp-metric-icon--pass {
  color: var(--c-ok);
  opacity: 0.75;
}
.tp-metric-icon--fail {
  color: var(--c-alert);
  opacity: 0.75;
}
.tp-metric-icon--skip {
  color: var(--c-warn);
  opacity: 0.75;
}
.tp-metric strong {
  font-size: 1.35rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1.15;
  color: var(--c-tx);
  position: relative;
  z-index: 1;
}
`
