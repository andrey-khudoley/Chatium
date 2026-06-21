// @shared
export const sbpTestsCss3 = `
/* ── TEST ROWS ── */
.tp-tests {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-top: 0.45rem;
  position: relative;
  z-index: 1;
}
.tp-test {
  display: flex;
  overflow: hidden;
  border: 1px solid var(--c-bdr);
  background: var(--c-bg-deep);
  transition: border-color 0.2s ease;
}
.tp-test:hover {
  border-color: var(--c-bdr-hi);
}
.tp-test--success {
  border-color: rgba(106, 175, 126, 0.2);
}
.tp-test--success:hover {
  border-color: rgba(106, 175, 126, 0.4);
}
.tp-test--fail {
  border-color: rgba(217, 122, 138, 0.25);
}
.tp-test--fail:hover {
  border-color: rgba(217, 122, 138, 0.45);
}
.tp-test-accent {
  width: 3px;
  flex-shrink: 0;
}
.tp-test-accent--success {
  background: var(--c-ok);
}
.tp-test-accent--fail {
  background: var(--c-alert);
}
.tp-test-accent--pending {
  background: var(--c-tx3);
  opacity: 0.3;
}
.tp-test-content {
  flex: 1;
  min-width: 0;
  padding: 0.4rem 0.55rem;
}
.tp-test-main {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) 1.8rem;
  gap: 0.45rem;
  align-items: center;
}

.tp-badge {
  font-size: 0.6rem;
  padding: 0.1rem 0.3rem;
  border: 1px solid;
  font-weight: 700;
  letter-spacing: 0.06em;
  line-height: 1.3;
}
.tp-badge--success {
  color: var(--c-ok);
  border-color: rgba(106, 175, 126, 0.4);
}
.tp-badge--fail {
  color: var(--c-alert);
  border-color: rgba(217, 122, 138, 0.4);
}
.tp-badge--pending {
  color: var(--c-tx3);
  border-color: rgba(92, 86, 89, 0.3);
}

.tp-test-name {
  color: var(--c-tx);
  font-size: 0.8rem;
  min-width: 0;
}
.tp-test-run {
  width: 1.8rem;
  height: 1.8rem;
  border: 1px solid var(--c-bdr);
  background: var(--c-bg-deep);
  color: var(--c-tx2);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
  position: relative;
  overflow: hidden;
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
.tp-test-run i {
  font-size: 0.55rem;
}
.tp-test-run:hover:not(:disabled) {
  border-color: var(--c-red-s);
  color: #fff;
  background: rgba(196, 33, 63, 0.15);
}
.tp-test-run:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
.tp-test-id {
  display: block;
  margin-top: 0.2rem;
  font-size: 0.64rem;
  color: var(--c-tx3);
  letter-spacing: 0.03em;
  font-family: inherit;
}
.tp-test-err {
  margin: 0.25rem 0 0;
  font-size: 0.74rem;
  color: var(--c-alert);
}
.tp-test-err i {
  font-size: 0.62rem;
  margin-right: 0.15rem;
}

/* ── BUTTONS ── */
.tp-btn {
  padding: 0.42rem 0.8rem;
  border: 1px solid var(--c-bdr);
  background: var(--c-bg-deep);
  color: var(--c-tx);
  font-family: inherit;
  font-size: 0.76rem;
  cursor: pointer;
  transition: all 0.15s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  white-space: nowrap;
  letter-spacing: 0.03em;
  position: relative;
  overflow: hidden;
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
.tp-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.04) 0px,
    rgba(0, 0, 0, 0.04) 1px,
    transparent 1px,
    transparent 2px
  );
  pointer-events: none;
}
.tp-btn::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background: var(--c-red);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.2s ease;
}
.tp-btn i {
  font-size: 0.62rem;
}
.tp-btn:hover:not(:disabled) {
  border-color: var(--c-bdr-hi);
  background: rgba(24, 22, 28, 0.98);
  transform: translateY(-1px);
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.35);
}
.tp-btn:hover:not(:disabled)::after {
  transform: scaleX(1);
}
.tp-btn:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: none;
}
.tp-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.tp-btn--primary {
  border-color: rgba(217, 86, 114, 0.35);
  background: rgba(196, 33, 63, 0.14);
  color: #fff;
}
.tp-btn--primary::after {
  background: var(--c-red-s);
}
.tp-btn--primary:hover:not(:disabled) {
  background: rgba(196, 33, 63, 0.24);
  border-color: var(--c-red-s);
}

.tp-btn--danger {
  border-color: rgba(217, 122, 138, 0.3);
  color: #ecc8cf;
  background: rgba(45, 14, 22, 0.9);
}
.tp-btn--danger::after {
  background: var(--c-alert);
}
.tp-btn--danger:hover:not(:disabled) {
  border-color: rgba(217, 122, 138, 0.5);
  background: rgba(60, 20, 30, 0.95);
}

.tp-suite-run {
  margin-top: 0.7rem;
  width: 100%;
  justify-content: center;
  position: relative;
  z-index: 1;
}

.tp-err {
  margin: 0.4rem 0 0;
  color: var(--c-alert);
  font-size: 0.76rem;
}
.tp-err i {
  font-size: 0.62rem;
  margin-right: 0.15rem;
}

/* ── LOG SIDEBAR: высота по ячейке сетки; внутренний скролл — в LogStreamPanel ── */
.tp-side {
  min-width: 0;
  min-height: 0;
  width: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

@media (max-width: 1180px) {
  .tp-wrap {
    overflow-y: auto;
  }
  .tp {
    flex: none;
    min-height: auto;
    overflow: visible;
  }
  .tp-grid,
  .tp-grid--logs {
    flex: none;
    grid-template-columns: 1fr;
    grid-template-rows: auto auto;
    min-height: auto;
    align-items: start;
  }
  .tp-main {
    overflow: visible;
  }
  .tp-side {
    overflow: visible;
  }
  .tp-side :deep(.lsp-card) {
    flex: none;
  }
  .tp-side :deep(.lsp-log-out) {
    flex: none;
    min-height: 240px;
    max-height: 420px;
  }
}
@media (max-width: 720px) {
  .tp {
    padding: 0.5rem 0.625rem 1rem;
  }
  .tp-toolbar {
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
  }
  .tp-toolbar-left,
  .tp-toolbar-right {
    justify-content: space-between;
  }
  .tp-metrics {
    grid-template-columns: repeat(2, 1fr);
  }
  .tp-test-main {
    grid-template-columns: auto minmax(0, 1fr) 1.6rem;
  }
}
`
