// @shared
export const lifepayHomeCss2 = `
.summary-title {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin: 0 0 0.7rem;
  font-size: 0.95rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text);
}
.summary-title .prompt {
  color: var(--color-accent);
}
.summary-period {
  margin-left: 0.5rem;
  font-size: 0.72rem;
  text-transform: none;
  letter-spacing: normal;
  color: var(--color-accent);
  font-weight: normal;
}

/* === Feed grid (two preview tables) === */
.feed-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.9rem;
}
.compact-table th,
.compact-table td {
  padding: 0.35rem 0.5rem;
  font-size: 0.72rem;
}
.data-table td.cell-ok {
  color: #6aaf7e;
}
.data-table td.cell-err {
  color: #d97a8a;
}

/* === Sections / tables === */
.panel-section {
  position: relative;
  background: rgba(20, 20, 20, 0.6);
  border: 1px solid var(--color-border);
  padding: 1.25rem 1.25rem 1rem;
  clip-path: polygon(
    0 4px,
    4px 4px,
    4px 0,
    calc(100% - 4px) 0,
    calc(100% - 4px) 4px,
    100% 4px,
    100% calc(100% - 4px),
    calc(100% - 4px) calc(100% - 4px),
    calc(100% - 4px) 100%,
    4px 100%,
    4px calc(100% - 4px),
    0 calc(100% - 4px)
  );
}
.panel-section-head {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin: 0 0 0.85rem;
  padding-bottom: 0.6rem;
  border-bottom: 1px solid var(--color-border);
  flex-wrap: wrap;
}
.panel-section-head h2 {
  margin: 0;
  font-size: 0.85rem;
  color: var(--color-accent);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  text-shadow: 0 0 5px rgba(211, 35, 75, 0.25);
}
.panel-section-head .prompt {
  color: var(--color-accent);
  font-size: 1.1rem;
  line-height: 1;
}
.panel-section-head .muted {
  color: var(--color-text-tertiary);
  font-size: 0.75rem;
  margin-left: 0.5rem;
}
.btn-mini {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  background: transparent;
  color: var(--color-text-tertiary);
  border: 1px solid var(--color-border);
  padding: 0.15rem 0.4rem;
  font-size: 0.68rem;
  letter-spacing: 0.04em;
  cursor: pointer;
  margin-left: 0.35rem;
  transition:
    color 0.2s,
    border-color 0.2s;
}
.btn-mini:hover {
  color: var(--color-accent);
  border-color: var(--color-accent);
}
.btn-mini:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn-mini.btn-primary {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: #fff;
}
.btn-mini.btn-primary:hover {
  background: var(--color-accent-hover);
  border-color: var(--color-accent-hover);
}
.btn-mini.btn-danger:hover {
  color: var(--color-accent);
  border-color: var(--color-accent);
}
.head-action {
  margin-left: 0.5rem;
}
.table-wrapper {
  overflow-x: auto;
  border: 1px solid var(--color-border);
  background: rgba(10, 10, 10, 0.65);
}
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.78rem;
}
.data-table th,
.data-table td {
  padding: 0.45rem 0.6rem;
  text-align: left;
  vertical-align: top;
  border-bottom: 1px solid var(--color-border);
}
.data-table th {
  background: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
  font-weight: 400;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.65rem;
  border-bottom: 1px solid var(--color-border-light);
}
.data-table .row-err td {
  color: var(--color-accent);
}
.data-table .row-revoked td {
  opacity: 0.55;
}
.badge {
  display: inline-block;
  padding: 0.1rem 0.45rem;
  font-size: 0.7rem;
  border: 1px solid var(--color-border);
}
.badge-active {
  color: #6aaf7e;
  border-color: rgba(106, 175, 126, 0.4);
}
.badge-used {
  color: var(--color-text-secondary);
}
.badge-revoked {
  color: var(--color-accent);
  border-color: var(--color-accent);
}
.badge-expired {
  color: var(--color-text-tertiary);
}
.empty-state {
  padding: 1.75rem 1rem;
  text-align: center;
  color: var(--color-text-tertiary);
  border: 1px dashed var(--color-border);
  background: rgba(10, 10, 10, 0.4);
}
.empty-icon {
  font-size: 1.5rem;
  color: var(--color-text-tertiary);
  opacity: 0.6;
  display: block;
  margin-bottom: 0.5rem;
}
.empty-title {
  color: var(--color-text-secondary);
  font-size: 0.85rem;
  margin: 0 0 0.25rem;
  letter-spacing: 0.04em;
}
.empty-hint {
  margin: 0;
  font-size: 0.75rem;
}
.field-label {
  font-size: 0.68rem;
  color: var(--color-text-tertiary);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.field-full {
  width: 100%;
  box-sizing: border-box;
}

/* === Raw modal === */
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
.raw-modal-narrow {
  max-width: 560px;
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
.json-block {
  margin: 0;
  font-size: 0.75rem;
  white-space: pre-wrap;
  word-break: break-all;
  color: var(--color-text);
}
.form-msg.is-err {
  color: #d97a8a;
}
.form-msg.is-ok {
  color: #6aaf7e;
}
.muted {
  color: var(--color-text-tertiary);
  font-size: 0.78rem;
  margin: 0;
}

@media (max-width: 1024px) {
  .kpi-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .kpi-grid-secondary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .feed-grid {
    grid-template-columns: 1fr;
  }
}
`
