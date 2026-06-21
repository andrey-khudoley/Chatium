// @shared
export const sbpLogStreamCss2 = `
.lsp-log-row {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0 0.4rem;
  padding: 0.2rem 0;
  border-bottom: 1px solid rgba(50, 44, 54, 0.1);
  cursor: pointer;
  transition: background 0.1s ease;
  user-select: none;
}
.lsp-log-row:hover {
  background: rgba(255, 255, 255, 0.02);
}
.lsp-log-t {
  flex-shrink: 0;
  color: var(--c-tx3);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.lsp-log-l {
  flex-shrink: 0;
  font-weight: 700;
  white-space: nowrap;
}
.lsp-log-m {
  flex: 1 1 0;
  min-width: 0;
  color: var(--c-tx);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.lsp-log-row.expanded .lsp-log-m {
  flex-basis: 100%;
  white-space: pre-wrap;
  word-break: break-word;
  overflow: visible;
  text-overflow: unset;
  margin-top: 0.15rem;
  padding: 0.2rem 0 0.1rem 0.5rem;
  border-left: 2px solid rgba(50, 44, 54, 0.3);
  user-select: text;
}

.lvl-debug {
  color: #7e767a;
}
.lvl-info {
  color: var(--c-tx2);
}
.lvl-notice {
  color: #8bb89c;
}
.lvl-warning {
  color: var(--c-warn);
}
.lvl-error,
.lvl-critical,
.lvl-alert,
.lvl-emergency {
  color: var(--c-alert);
}

.lsp-log-ft {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  position: relative;
  z-index: 1;
  flex-shrink: 0;
}
.lsp-log-sync {
  font-size: 0.74rem;
  color: var(--c-tx2);
  display: flex;
  align-items: center;
  gap: 0.35rem;
}
.lsp-log-sync i {
  font-size: 0.62rem;
}
.lsp-log-btns {
  display: flex;
  gap: 0.4rem;
}
.lsp-log-btns .lsp-btn:first-child {
  flex: 1;
}

.lsp-err {
  margin: 0.4rem 0 0;
  color: var(--c-alert);
  font-size: 0.76rem;
}
.lsp-err i {
  font-size: 0.62rem;
  margin-right: 0.15rem;
}

/* ── BUTTONS ── */
.lsp-btn {
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
.lsp-btn::before {
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
.lsp-btn::after {
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
.lsp-btn i {
  font-size: 0.62rem;
}
.lsp-btn:hover:not(:disabled) {
  border-color: var(--c-bdr-hi);
  background: rgba(24, 22, 28, 0.98);
  transform: translateY(-1px);
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.35);
}
.lsp-btn:hover:not(:disabled)::after {
  transform: scaleX(1);
}
.lsp-btn:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: none;
}
.lsp-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.lsp-btn--danger {
  border-color: rgba(217, 122, 138, 0.3);
  color: #ecc8cf;
  background: rgba(45, 14, 22, 0.9);
}
.lsp-btn--danger::after {
  background: var(--c-alert);
}
.lsp-btn--danger:hover:not(:disabled) {
  border-color: rgba(217, 122, 138, 0.5);
  background: rgba(60, 20, 30, 0.95);
}

/* Узкий экран: фильтры в 2 колонки. Ограничение высоты списка при разворачивании
   сетки в одну колонку задаёт страница-родитель через :deep() на своём брейкпоинте. */
@media (max-width: 720px) {
  .lsp-log-filters {
    grid-template-columns: repeat(2, 1fr);
  }
  .lsp-log-row {
    grid-template-columns: 1fr;
    gap: 0.1rem;
  }
}
`
