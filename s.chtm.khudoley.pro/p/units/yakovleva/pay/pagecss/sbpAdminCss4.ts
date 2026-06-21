// @shared
export const sbpAdminCss4 = `
/* ── SETTINGS (LifePay) ── */
.ap-set-form {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  position: relative;
  z-index: 1;
}
.ap-set-grp {
  border: 1px solid var(--c-bdr);
  background: var(--c-bg-deep);
  padding: 0.7rem 0.85rem 0.85rem;
  margin: 0;
}
.ap-set-legend {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--c-tx2);
  padding: 0 0.4rem;
}
.ap-set-legend i {
  color: var(--c-red-s);
  margin-right: 0.3rem;
  font-size: 0.66rem;
}
.ap-hint {
  margin: 0 0 0.7rem;
  font-size: 0.72rem;
  color: var(--c-tx3);
  line-height: 1.5;
}
.ap-set-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.7rem 0.85rem;
}
.ap-field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  min-width: 0;
}
.ap-field-full {
  grid-column: 1 / -1;
}
.ap-field-label {
  font-size: 0.72rem;
  color: var(--c-tx2);
  letter-spacing: 0.02em;
}
.ap-field-hint {
  font-size: 0.68rem;
  color: var(--c-tx3);
  line-height: 1.4;
}
.ap-field-row {
  display: flex;
  gap: 0.5rem;
  align-items: stretch;
}
.ap-field-row .ap-input {
  flex: 1 1 auto;
}
.ap-field-row .ap-btn {
  flex-shrink: 0;
}
.ap-set-grp code,
.ap-field-hint code,
.ap-hint code {
  background: rgba(20, 18, 24, 0.9);
  border: 1px solid var(--c-bdr);
  padding: 0.02rem 0.28rem;
  font-size: 0.92em;
  color: var(--c-tx);
}

.ap-btn--primary {
  border-color: var(--c-red-s);
  color: #fff;
  background: rgba(196, 33, 63, 0.16);
}
.ap-btn--primary::after {
  background: var(--c-red-s);
}
.ap-btn--primary:hover {
  border-color: var(--c-red-s);
  background: rgba(196, 33, 63, 0.24);
}
.ap-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.ap-save-bar {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  flex-wrap: wrap;
}
.ap-unsaved {
  font-size: 0.72rem;
  color: var(--c-warn);
  letter-spacing: 0.03em;
}
.ap-unsaved i {
  font-size: 0.45rem;
  margin-right: 0.3rem;
  vertical-align: middle;
}
.ap-msg {
  margin: 0;
  font-size: 0.74rem;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}
.ap-msg i {
  font-size: 0.7rem;
}
.ap-msg--ok {
  color: var(--c-ok);
}
.ap-msg--err {
  color: var(--c-alert);
}

@media (max-width: 680px) {
  .ap-set-fields {
    grid-template-columns: 1fr;
  }
}

/* ── LOG MONITOR: высота = ячейка сетки (ровно ряд между шапкой страницы и футером); внутренний скролл — в LogStreamPanel ── */
.ap-side {
  min-width: 0;
  min-height: 0;
  width: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

@media (max-width: 1100px) {
  .ap-wrap {
    overflow-y: auto;
  }
  .ap {
    flex: none;
    min-height: auto;
    overflow: visible;
  }
  .ap-grid {
    flex: none;
    grid-template-columns: 1fr;
    grid-template-rows: auto auto;
    min-height: auto;
    align-items: start;
  }
  .ap-main {
    overflow: visible;
  }
  .ap-side {
    overflow: visible;
  }
  .ap-side :deep(.lsp-card) {
    flex: none;
  }
  .ap-side :deep(.lsp-log-out) {
    min-height: 240px;
    max-height: 420px;
    flex: none;
  }
}
@media (max-width: 680px) {
  .ap {
    padding: 0.5rem 0.625rem 1rem;
  }
  .ap-cfg-row {
    grid-template-columns: 1fr;
  }
  .ap-meters {
    grid-template-columns: 1fr;
  }
  .ap-status {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.35rem;
  }
  .ap-lvls {
    grid-template-columns: repeat(2, 1fr);
  }
}
`
