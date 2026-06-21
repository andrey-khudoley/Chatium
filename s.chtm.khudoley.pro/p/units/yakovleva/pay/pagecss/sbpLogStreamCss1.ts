// @shared
export const sbpLogStreamCss1 = `
.lsp-card {
  /* Палитра дублирована локально (та же, что у страниц-родителей). */
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
  --c-warn: #c9a660;
  --c-alert: #d97a8a;

  border: 1px solid var(--c-bdr);
  background: linear-gradient(175deg, var(--c-bg), var(--c-bg2));
  padding: 0.85rem 1rem;
  position: relative;
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
  font-family: 'Share Tech Mono', 'Courier New', monospace;
  animation: lsp-enter 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.15s both;
}
.lsp-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent 10%, var(--c-red) 50%, transparent 90%);
  opacity: 0.2;
}
.lsp-card::after {
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
@keyframes lsp-enter {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
.lsp-card,
.lsp-card :deep(*) {
  box-sizing: border-box;
  border-radius: 0 !important;
  line-height: 1.45;
}

.lsp-icon-hd {
  font-size: 0.68rem;
  opacity: 0.6;
  margin-right: 0.15rem;
}

.lsp-card-hd {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.55rem;
  position: relative;
  z-index: 1;
  flex-shrink: 0;
}
.lsp-card-hd h2 {
  margin: 0;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--c-tx2);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.lsp-log-ct {
  font-size: 0.7rem;
  color: var(--c-tx3);
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.04em;
}

.lsp-log-filters {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.4rem;
  margin-bottom: 0.45rem;
  position: relative;
  z-index: 1;
  flex-shrink: 0;
}
.lsp-flt {
  padding: 0.35rem;
  border: 1px solid var(--c-bdr);
  background: var(--c-bg-deep);
  color: var(--c-tx2);
  font-family: inherit;
  font-size: 0.7rem;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: center;
  letter-spacing: 0.03em;
  position: relative;
  overflow: hidden;
}
.lsp-flt::after {
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
.lsp-flt:hover {
  border-color: var(--c-bdr-hi);
}
.lsp-flt:hover::after {
  transform: scaleX(1);
}
.lsp-flt.active {
  border-color: var(--c-red-s);
  background: rgba(196, 33, 63, 0.12);
  color: #fff;
}
.lsp-flt.active::after {
  transform: scaleX(1);
}

.lsp-log-toggle-row {
  margin-bottom: 0.55rem;
  position: relative;
  z-index: 1;
  flex-shrink: 0;
}
.lsp-btn--toggle-all {
  width: 100%;
  font-size: 0.72rem;
  padding: 0.32rem 0.55rem;
}

.lsp-log-out {
  flex: 1 1 auto;
  min-height: 7rem;
  overflow-y: auto;
  border: 1px solid rgba(50, 44, 54, 0.35);
  background: rgba(5, 4, 7, 0.98);
  padding: 0.55rem;
  margin-bottom: 0.55rem;
  font-size: 0.74rem;
  line-height: 1.6;
  position: relative;
  z-index: 1;
  box-shadow: inset 0 0 40px rgba(0, 0, 0, 0.25);
}
.lsp-log-empty {
  color: var(--c-tx3);
  padding: 2rem;
  text-align: center;
  font-size: 0.8rem;
  letter-spacing: 0.03em;
}
.lsp-log-div {
  text-align: center;
  padding: 0.35rem 0;
  margin: 0.3rem 0;
}
.lsp-log-div span {
  font-size: 0.64rem;
  color: var(--c-warn);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.5;
  padding: 0.1rem 0.6rem;
  border-top: 1px solid rgba(201, 166, 96, 0.12);
  border-bottom: 1px solid rgba(201, 166, 96, 0.12);
}
`
