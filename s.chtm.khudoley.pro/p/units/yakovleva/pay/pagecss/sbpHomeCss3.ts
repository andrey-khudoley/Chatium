// @shared
export const sbpHomeCss3 = `
/* ===================== FEED GRID ===================== */
.feed-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.9rem;
}

/* ===================== FILTER PILLS ===================== */
.filter-pills {
  display: flex;
  gap: 0.35rem;
  flex-wrap: wrap;
  margin-bottom: 0.85rem;
}
.pill {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
  padding: 0.3rem 0.7rem;
  font-family: inherit;
  font-size: 0.7rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  cursor: pointer;
  transition:
    color 0.2s,
    border-color 0.2s,
    background 0.2s;
}
.pill:hover {
  color: var(--color-text);
  border-color: var(--color-border-light);
}
.pill.active {
  color: var(--color-text);
  border-color: var(--color-accent);
  background: var(--color-accent-light);
}
.pill-count {
  font-size: 0.65rem;
  color: var(--color-text-tertiary);
  background: rgba(0, 0, 0, 0.3);
  padding: 0.05rem 0.35rem;
  border: 1px solid var(--color-border);
}
.pill.active .pill-count {
  color: var(--color-text);
  border-color: var(--color-accent);
}

/* ===================== TABLES ===================== */
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
.data-table tbody tr:hover {
  background: rgba(211, 35, 75, 0.05);
}
.data-table tbody tr:last-child td {
  border-bottom: 0;
}
.data-table .row-clickable {
  cursor: pointer;
}
.data-table .row-error {
  background: rgba(217, 122, 138, 0.06);
  box-shadow: inset 3px 0 0 #d97a8a;
}
.data-table .row-warn {
  background: rgba(212, 168, 90, 0.06);
  box-shadow: inset 3px 0 0 #d4a85a;
}
.data-table td.cell-ok {
  color: #6aaf7e;
}
.data-table td.cell-err {
  color: #d97a8a;
}
.data-table td.cell-warn {
  color: #d4a85a;
}
.data-table .cell-id {
  white-space: nowrap;
  max-width: 320px;
  overflow: hidden;
}
.data-table code {
  color: var(--color-text);
  font-size: 0.75rem;
}
.data-table-vertical th {
  width: 180px;
  background: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
  border-right: 1px solid var(--color-border);
}
.compact-table th,
.compact-table td {
  padding: 0.35rem 0.5rem;
  font-size: 0.72rem;
}
.json-block {
  margin: 0;
  font-size: 0.75rem;
  white-space: pre-wrap;
  word-break: break-all;
  color: var(--color-text);
}
.dup-badge {
  display: inline-block;
  font-size: 0.65rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #d4a85a;
  background: rgba(212, 168, 90, 0.1);
  border: 1px solid rgba(212, 168, 90, 0.4);
  padding: 0.1rem 0.35rem;
}

/* ===================== EMPTY STATES ===================== */
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
.link-button {
  background: transparent;
  border: 0;
  border-bottom: 1px dashed var(--color-accent);
  color: var(--color-accent);
  font: inherit;
  letter-spacing: inherit;
  padding: 0;
  cursor: pointer;
}
.link-button:hover {
  color: var(--color-accent-hover);
  border-color: var(--color-accent-hover);
}

/* ===================== SETTINGS ===================== */
/* Форма настроек LifePay перенесена на страницу настроек проекта (/web/admin).
   Класс ниже переиспользуется модалкой создания пригласительной ссылки. */
.settings-save-bar {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding-top: 0.5rem;
}

/* ===================== FORMS ===================== */
.grid-form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 0.85rem 1rem;
  align-items: start;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.field-full {
  grid-column: 1 / -1;
}
.field-label {
  font-size: 0.68rem;
  color: var(--color-text-tertiary);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.field-required {
  color: var(--color-accent);
  margin-left: 0.2rem;
}
.field-hint {
  font-size: 0.7rem;
  color: var(--color-text-tertiary);
}
.field-hint code {
  color: var(--color-text);
  background: var(--color-bg);
  padding: 0.05rem 0.3rem;
  border: 1px solid var(--color-border);
}
.field-input {
  background: var(--color-bg);
  color: var(--color-text);
  border: 1px solid var(--color-border-light);
  padding: 0.5rem 0.7rem;
  font-family: inherit;
  letter-spacing: inherit;
  font-size: 0.875rem;
  outline: none;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
}
.field-input:focus {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 1px rgba(211, 35, 75, 0.25);
}
.field-row {
  display: flex;
  gap: 0.5rem;
  align-items: stretch;
}
.field-row .field-input {
  flex: 1;
}

.form-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}
.form-msg {
  margin: 0;
  font-size: 0.78rem;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}
.form-msg.is-ok {
  color: #6aaf7e;
}
.form-msg.is-err {
  color: #d97a8a;
}
.hint {
  color: var(--color-text-secondary);
  font-size: 0.78rem;
  margin: 0 0 0.85rem;
  line-height: 1.45;
}
.hint code {
  color: var(--color-text);
  background: var(--color-bg);
  padding: 0.05rem 0.3rem;
  border: 1px solid var(--color-border);
}
.muted {
  color: var(--color-text-tertiary);
  font-size: 0.78rem;
  margin: 0;
}
.muted i {
  margin-right: 0.3rem;
}

/* ===================== BUTTONS ===================== */
.btn-primary,
.btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-family: inherit;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-size: 0.72rem;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: all 0.2s ease;
  text-decoration: none;
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
.btn-primary {
  background: var(--color-accent);
  color: #fff;
  border: 1px solid var(--color-accent);
  padding: 0.55rem 1.1rem;
  box-shadow:
    0 4px 12px rgba(211, 35, 75, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
}
.btn-primary:hover {
  background: var(--color-accent-hover);
  border-color: var(--color-accent-hover);
  transform: translateY(-1px);
  box-shadow:
    0 6px 16px rgba(211, 35, 75, 0.32),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}
.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}
.btn-secondary {
  background: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border-light);
  padding: 0.45rem 0.9rem;
}
.btn-secondary:hover {
  color: var(--color-text);
  border-color: var(--color-accent);
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
`
