// @shared
export const sbpHomeCss4 = `
/* ===================== BILL RESULT ===================== */
.bill-result {
  margin-top: 1rem;
  padding: 1rem;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  position: relative;
}
.bill-result-ok {
  border-color: rgba(106, 175, 126, 0.4);
}
.bill-result-err {
  border-color: rgba(217, 122, 138, 0.4);
}
.bill-meta {
  margin: 0.5rem 0;
  font-size: 0.78rem;
  color: var(--color-text-secondary);
}
.bill-success p {
  margin: 0.3rem 0;
  font-size: 0.8rem;
}
.bill-success code,
.bill-meta code {
  color: var(--color-text);
  background: var(--color-bg-tertiary);
  padding: 0.1rem 0.35rem;
  border: 1px solid var(--color-border);
}
.bill-success .paymenturl {
  word-break: break-all;
  display: inline-block;
}
.qr-block {
  margin-top: 0.85rem;
}
.qr-container {
  background: #fff;
  padding: 0.5rem;
  display: inline-block;
  margin-top: 0.4rem;
}
.bill-action {
  margin-top: 0.85rem;
}

/* ===================== RESPONSIVE ===================== */
@media (max-width: 1100px) {
  .kpi-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .kpi-grid-secondary {
    grid-template-columns: repeat(2, 1fr);
  }
  .feed-grid {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 760px) {
  .content-wrapper {
    padding: 1rem 0 1.5rem;
  }
  .content-inner {
    padding: 0 1rem;
    gap: 1rem;
  }
  .panel-section {
    padding: 1rem 0.9rem 0.85rem;
  }
  .status-strip {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  .status-webhook {
    flex: 0 0 auto;
    width: 100%;
    justify-content: flex-start;
  }
  .quick-search {
    flex: 1 1 100%;
  }
  .kpi-grid,
  .kpi-grid-secondary {
    grid-template-columns: 1fr 1fr;
  }
  .kpi-value {
    font-size: 1.4rem;
  }
  .grid-form {
    grid-template-columns: 1fr;
  }
  .form-actions {
    flex-direction: column;
    align-items: flex-start;
  }
  .data-table {
    font-size: 0.72rem;
  }
}
@media (max-width: 480px) {
  .kpi-grid,
  .kpi-grid-secondary {
    grid-template-columns: 1fr;
  }
  .tab span {
    display: none;
  }
  .tab {
    padding: 0.5rem 0.65rem;
  }
  .section-tab {
    padding: 0.5rem 0.7rem;
    letter-spacing: 0.06em;
    font-size: 0.72rem;
  }
  .date-filter {
    flex-direction: column;
    align-items: flex-start;
    width: 100%;
  }
  .date-filter-sep {
    display: none;
  }
  .date-filter-field {
    width: 100%;
    min-width: 0;
  }
  .date-filter-field .date-filter-input {
    flex: 1;
    min-width: 0;
  }
}

/* ====== RAW PAYLOAD MODAL ====== */
.raw-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 999999;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  backdrop-filter: blur(2px);
}
.raw-modal {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border-light);
  border-radius: 6px;
  width: 100%;
  max-width: 980px;
  max-height: 86vh;
  display: flex;
  flex-direction: column;
  box-shadow:
    0 12px 60px rgba(0, 0, 0, 0.6),
    0 0 0 1px rgba(211, 35, 75, 0.15);
}
.raw-modal-head {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-bg-tertiary);
}
.raw-modal-head h2 {
  font-size: 1rem;
  margin: 0;
  font-weight: 500;
  flex: 1;
}
.raw-modal-head .muted {
  margin-left: 0.4rem;
  color: var(--color-text-tertiary);
  font-weight: 400;
}
.raw-modal-body {
  padding: 1rem;
  overflow: auto;
  flex: 1;
}
.raw-modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}
.raw-modal-body .json-block {
  white-space: pre-wrap;
  word-break: break-all;
  font-size: 0.78rem;
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  padding: 0.75rem;
  margin: 0;
  color: var(--color-text);
  max-height: 70vh;
  overflow: auto;
}
@media (max-width: 768px) {
  .raw-modal-backdrop {
    padding: 0.5rem;
  }
  .raw-modal {
    max-height: 96vh;
  }
}

/* Бейдж идентификатора гейтвея в журналах (HomeRequestsTab / HomeWebhooksTab / HomeSearchResult) */
.gateway-badge {
  display: inline-block;
  padding: 0.05rem 0.45rem;
  border: 1px solid var(--color-muted, #6b7280);
  border-radius: 0.2rem;
  font-size: 0.75rem;
  font-family: 'Share Tech Mono', monospace;
  color: var(--color-text, #e5e7eb);
  background: rgba(255, 255, 255, 0.04);
  letter-spacing: 0.04em;
}
.gateway-badge.gateway-lifepay {
  border-color: #f59e0b;
  color: #fcd34d;
}
.gateway-badge.gateway-lavatop {
  border-color: #38bdf8;
  color: #7dd3fc;
}
.gateway-badge.gateway-unknown {
  border-color: #4b5563;
  color: #9ca3af;
  font-style: italic;
}

/* ===================== CREATE REQUEST TAB ===================== */
/* Метаданные выбранной операции (под дропдауном): бейдж + метод + op + описание. */
.op-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.65rem;
  background: var(--color-bg-tertiary, rgba(255, 255, 255, 0.02));
  border: 1px solid var(--color-border, rgba(255, 255, 255, 0.1));
  border-radius: 0.25rem;
}
.op-meta-method {
  font-family: 'Share Tech Mono', monospace;
  font-size: 0.75rem;
  padding: 0.05rem 0.4rem;
  border: 1px solid var(--color-border, rgba(255, 255, 255, 0.15));
  border-radius: 0.2rem;
  background: rgba(255, 255, 255, 0.04);
}
.op-meta-op {
  font-family: 'Share Tech Mono', monospace;
  font-size: 0.85rem;
}
.op-meta-desc {
  flex-basis: 100%;
  margin: 0.25rem 0 0;
  font-size: 0.78rem;
  line-height: 1.4;
}
.op-no-fields {
  font-size: 0.85rem;
  padding: 0.5rem 0.65rem;
}
.field-optional {
  font-size: 0.7rem;
  font-style: italic;
  margin-left: 0.25rem;
}
.field-textarea {
  font-family: 'Share Tech Mono', monospace;
  font-size: 0.8rem;
  min-height: 6.5rem;
  resize: vertical;
}
/* Ячейка op в превью «Последние запросы» — моно-шрифт, чтобы синхронно
   с бейджем гейтвея воспринималось как идентификатор. */
.op-code {
  font-family: 'Share Tech Mono', monospace;
  font-size: 0.75rem;
}
`
