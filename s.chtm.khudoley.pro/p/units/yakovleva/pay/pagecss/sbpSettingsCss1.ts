// @shared
// Legacy .st-* styles kept for shared panel fragments that still reuse these classes.
export const sbpSettingsCss1 = `
/* ── SETTINGS TAB ── */
.st-tab {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* Полоска-обзор: чипы статусов трёх каналов на одной строке. */
.st-overview {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.55rem;
  padding: 0.6rem 0.85rem;
  background: rgba(20, 20, 20, 0.6);
  border: 1px solid var(--color-border);
  clip-path: polygon(
    0 3px, 3px 3px, 3px 0,
    calc(100% - 3px) 0, calc(100% - 3px) 3px, 100% 3px,
    100% calc(100% - 3px), calc(100% - 3px) calc(100% - 3px),
    calc(100% - 3px) 100%, 3px 100%, 3px calc(100% - 3px),
    0 calc(100% - 3px)
  );
}
.st-overview-label {
  font-size: 0.66rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-text-tertiary);
}
.st-overview-pills {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
}
.st-overview-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.28rem 0.6rem;
  border: 1px solid var(--color-border);
  background: var(--color-bg-tertiary);
  font-size: 0.7rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition:
    color 0.2s ease,
    border-color 0.2s ease,
    background 0.2s ease;
}
.st-overview-pill:hover {
  color: var(--color-text);
  border-color: var(--color-border-light);
}
.st-overview-pill .st-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: #4a4a4a;
  box-shadow: 0 0 0 2px rgba(74, 74, 74, 0.15);
}
.st-overview-pill.is-on {
  color: #b5dec1;
  border-color: rgba(106, 175, 126, 0.4);
  background: rgba(106, 175, 126, 0.08);
}
.st-overview-pill.is-on .st-dot {
  background: #6aaf7e;
  box-shadow: 0 0 0 2px rgba(106, 175, 126, 0.2);
}
.st-overview-pill.is-off {
  color: var(--color-text-tertiary);
}
.st-overview-pill.is-off .st-dot {
  background: #4a4a4a;
}

/* Обёртка двух секций виджетов (LifePay + Lava.Top): вертикальный зазор,
   т.к. у .panel-section нет собственного margin, а .st-tab gap сюда не достаёт. */
.st-widget-stack {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* Раздел: расширение .panel-section с местом под action-кнопку справа в заголовке. */
.st-section .panel-section-head .st-section-action {
  margin-left: auto;
}
.st-section-sub {
  margin: 0 0 0.85rem;
  font-size: 0.78rem;
  color: var(--color-text-secondary);
  line-height: 1.45;
}

/* ── TOGGLE SWITCH (большой) ── */
.st-toggle-row {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.7rem 0.85rem;
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  margin-bottom: 0.85rem;
}
.st-toggle {
  position: relative;
  display: inline-block;
  width: 46px;
  height: 24px;
  flex-shrink: 0;
  cursor: pointer;
}
.st-toggle input {
  position: absolute;
  opacity: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  cursor: pointer;
  z-index: 2;
}
.st-toggle-slider {
  position: absolute;
  inset: 0;
  background: var(--color-bg);
  border: 1px solid var(--color-border-light);
  transition: background 0.2s ease, border-color 0.2s ease;
}
.st-toggle-slider::before {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  background: var(--color-text-tertiary);
  transition: transform 0.2s ease, background 0.2s ease;
}
.st-toggle input:checked + .st-toggle-slider {
  background: rgba(211, 35, 75, 0.18);
  border-color: var(--color-accent);
}
.st-toggle input:checked + .st-toggle-slider::before {
  transform: translateX(22px);
  background: var(--color-accent);
}
.st-toggle-text {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}
.st-toggle-title {
  font-size: 0.8rem;
  color: var(--color-text);
  letter-spacing: 0.03em;
}
.st-toggle-hint {
  font-size: 0.7rem;
  color: var(--color-text-tertiary);
  line-height: 1.4;
}
.st-toggle-state {
  font-size: 0.66rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-text-tertiary);
  padding: 0.18rem 0.5rem;
  border: 1px solid var(--color-border);
  flex-shrink: 0;
}
.st-toggle-state.is-on {
  color: #b5dec1;
  border-color: rgba(106, 175, 126, 0.4);
  background: rgba(106, 175, 126, 0.08);
}

/* ── FIELDS GRID ── */
.st-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.8rem 0.95rem;
}
.st-grid--single {
  grid-template-columns: 1fr;
}
.st-field-full {
  grid-column: 1 / -1;
}
.st-field-label {
  display: block;
  margin-bottom: 0.3rem;
  font-size: 0.72rem;
  color: var(--color-text-secondary);
  letter-spacing: 0.02em;
}
.st-field-hint {
  margin-top: 0.3rem;
  font-size: 0.68rem;
  color: var(--color-text-tertiary);
  line-height: 1.45;
}
.st-input,
.st-textarea {
  width: 100%;
  background: var(--color-bg);
  color: var(--color-text);
  border: 1px solid var(--color-border-light);
  padding: 0.5rem 0.7rem;
  font-family: inherit;
  font-size: 0.84rem;
  letter-spacing: inherit;
  outline: none;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
}
.st-textarea {
  min-height: 72px;
  resize: vertical;
  line-height: 1.45;
  font-family: 'Share Tech Mono', 'Courier New', monospace;
  font-size: 0.78rem;
}
.st-input:focus,
.st-textarea:focus {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 1px rgba(211, 35, 75, 0.25);
}
.st-input:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  background: var(--color-bg-tertiary);
}
.st-input::placeholder,
.st-textarea::placeholder {
  color: var(--color-text-tertiary);
  opacity: 0.7;
}

/* ── Пунктирный разделитель: отделяет вид метода от условий показа (лимиты + офферы) ── */
.st-dashed-sep {
  margin: 1.1rem 0 0.9rem;
  border-top: 1px dashed var(--color-border);
}

/* ── OFFER FILTER ── */
/* Граница убрана: лимиты суммы и фильтр офферов сгруппированы под общей .st-dashed-sep */
.st-offer-block {
  margin-top: 1.1rem;
}
.st-offer-head {
  display: flex;
  align-items: baseline;
  gap: 0.55rem;
  flex-wrap: wrap;
  margin-bottom: 0.5rem;
}
.st-offer-head h3 {
  margin: 0;
  font-size: 0.78rem;
  color: var(--color-text);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.st-offer-head h3 i {
  color: var(--color-accent);
  margin-right: 0.3rem;
}
.st-offer-counter {
  margin-left: auto;
  font-size: 0.7rem;
  color: var(--color-text-tertiary);
}
.st-offer-counter code {
  color: var(--color-text);
  background: var(--color-bg);
  padding: 0.05rem 0.35rem;
  border: 1px solid var(--color-border);
  margin-left: 0.25rem;
}
.st-offer-hint {
  margin: 0 0 0.6rem;
  font-size: 0.72rem;
  color: var(--color-text-tertiary);
  line-height: 1.5;
}

.st-segmented {
  display: inline-flex;
  border: 1px solid var(--color-border-light);
  background: var(--color-bg);
  margin-bottom: 0.7rem;
}
.st-segmented-btn {
  background: transparent;
  border: 0;
  color: var(--color-text-secondary);
  padding: 0.4rem 0.85rem;
  font-family: inherit;
  font-size: 0.72rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  cursor: pointer;
  transition: color 0.15s ease, background 0.15s ease;
}
.st-segmented-btn + .st-segmented-btn {
  border-left: 1px solid var(--color-border-light);
}
.st-segmented-btn:hover {
  color: var(--color-text);
}
.st-segmented-btn.is-active {
  color: #fff;
  background: var(--color-accent);
}

.st-offer-toolbar {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-bottom: 0.55rem;
}
.st-offer-toolbar .st-input {
  flex: 1 1 auto;
}

.st-offer-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 0.4rem;
  max-height: 280px;
  overflow-y: auto;
  padding: 0.45rem;
  border: 1px solid var(--color-border);
  background: var(--color-bg);
}
.st-offer-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.55rem;
  border: 1px solid var(--color-border);
  background: var(--color-bg-tertiary);
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease;
}
.st-offer-item:hover {
  border-color: var(--color-border-light);
}
.st-offer-item input[type='checkbox'] {
  width: 14px;
  height: 14px;
  margin: 0;
  flex-shrink: 0;
  accent-color: var(--color-accent);
}
.st-offer-item__body {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}
.st-offer-item__name {
  font-size: 0.76rem;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.st-offer-item__meta {
  font-size: 0.66rem;
  color: var(--color-text-tertiary);
  display: flex;
  gap: 0.5rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.st-offer-item.is-selected {
  border-color: var(--color-accent);
  background: rgba(211, 35, 75, 0.08);
}
.st-offer-empty {
  padding: 1rem;
  text-align: center;
  font-size: 0.74rem;
  color: var(--color-text-tertiary);
  border: 1px dashed var(--color-border);
}
.st-offer-warn {
  padding: 0.55rem 0.7rem;
  margin-bottom: 0.55rem;
  font-size: 0.72rem;
  color: #f0c989;
  background: rgba(212, 168, 90, 0.08);
  border: 1px solid rgba(212, 168, 90, 0.35);
  line-height: 1.5;
}

/* ── COLLAPSIBLE (Как встроить виджет) ── */
.st-collapsible {
  margin-top: 1.1rem;
  border: 1px solid var(--color-border);
  background: var(--color-bg);
}
.st-collapsible-summary {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.55rem 0.75rem;
  cursor: pointer;
  list-style: none;
  font-size: 0.76rem;
  color: var(--color-text-secondary);
  letter-spacing: 0.04em;
  user-select: none;
  transition: color 0.15s ease, background 0.15s ease;
}
.st-collapsible-summary::-webkit-details-marker {
  display: none;
}
.st-collapsible-summary:hover {
  color: var(--color-text);
  background: rgba(255, 255, 255, 0.02);
}
.st-collapsible-summary i.fa-chevron-right {
  font-size: 0.65rem;
  transition: transform 0.2s ease;
  color: var(--color-accent);
}
.st-collapsible[open] .st-collapsible-summary i.fa-chevron-right {
  transform: rotate(90deg);
}
.st-collapsible-body {
  padding: 0.7rem 0.75rem 0.85rem;
  border-top: 1px solid var(--color-border);
}

.st-snippet {
  position: relative;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid var(--color-border);
  margin-top: 0.45rem;
  font-family: 'Share Tech Mono', 'Courier New', monospace;
}
.st-snippet:first-child {
  margin-top: 0;
}
.st-snippet pre {
  margin: 0;
  padding: 0.55rem 2.2rem 0.55rem 0.7rem;
  font-size: 0.72rem;
  color: var(--color-text);
  white-space: pre-wrap;
  word-break: break-all;
  line-height: 1.5;
}
.st-snippet-copy {
  position: absolute;
  top: 0.35rem;
  right: 0.35rem;
  background: var(--color-bg);
  border: 1px solid var(--color-border-light);
  color: var(--color-text-secondary);
  padding: 0.2rem 0.45rem;
  font-size: 0.66rem;
  letter-spacing: 0.05em;
  cursor: pointer;
  transition: color 0.15s ease, border-color 0.15s ease;
}
.st-snippet-copy:hover {
  color: var(--color-accent);
  border-color: var(--color-accent);
}
.st-snippet-copy.is-copied {
  color: #6aaf7e;
  border-color: rgba(106, 175, 126, 0.4);
}
.st-snippet-copy i {
  margin-right: 0.2rem;
}

/* ── ACTIONS (Save + status) ── */
.st-actions {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  flex-wrap: wrap;
  margin-top: 1rem;
  padding-top: 0.85rem;
  border-top: 1px solid var(--color-border);
}
.st-msg {
  margin: 0;
  font-size: 0.76rem;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}
.st-msg.is-ok {
  color: #6aaf7e;
}
.st-msg.is-err {
  color: #d97a8a;
}
.st-msg i {
  font-size: 0.72rem;
}
.st-unsaved {
  font-size: 0.72rem;
  color: #d4a85a;
  letter-spacing: 0.04em;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}
.st-unsaved i {
  font-size: 0.45rem;
}

/* ── RESPONSIVE ── */
@media (max-width: 760px) {
  .st-grid {
    grid-template-columns: 1fr;
  }
  .st-overview {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  .st-toggle-row {
    flex-wrap: wrap;
  }
  .st-offer-toolbar {
    flex-direction: column;
    align-items: stretch;
  }
  .pp-logo-settings {
    grid-template-columns: 1fr;
    align-items: stretch;
  }
  .pp-logo-upload {
    align-items: stretch;
    flex-direction: column;
  }
  .st-method-label-preview { display: none; }
  .st-method-section-badge { display: none; }
}

/* ── PAYMENT METHODS: GROUPS ── */
.pp-group-toggle-all {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border-light);
  color: var(--color-text-secondary);
  padding: 0.25rem 0.6rem;
  font-family: inherit;
  font-size: 0.66rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
}
.pp-group-toggle-all:hover {
  color: var(--color-text);
  border-color: var(--color-accent);
}
.pp-group {
  border: 1px solid var(--color-border);
  background: rgba(10, 10, 10, 0.35);
  margin-bottom: 0.55rem;
}
.pp-group-head {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.55rem 0.85rem;
  background: rgba(20, 20, 20, 0.5);
  cursor: pointer;
  user-select: none;
  transition: background 0.15s ease;
}
.pp-group-head:hover { background: rgba(211, 35, 75, 0.05); }
.pp-group-chevron {
  font-size: 0.65rem;
  color: var(--color-accent);
  transition: transform 0.2s ease;
  flex-shrink: 0;
}
.pp-group-chevron.is-open { transform: rotate(90deg); }
.pp-group-title {
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text);
  flex: 1 1 auto;
}
.pp-group-counter {
  font-size: 0.66rem;
  letter-spacing: 0.05em;
  color: var(--color-text-tertiary);
  padding: 0.15rem 0.5rem;
  border: 1px solid var(--color-border);
  background: var(--color-bg-tertiary);
  flex-shrink: 0;
}
.pp-group-body {
  padding: 0.5rem 0.75rem 0.65rem;
  border-top: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

/* ── PAYMENT METHODS: ROW ── */
.st-method-row {
  border: 1px solid var(--color-border);
  background: var(--color-bg-tertiary);
}
.pp-dnd-handle {
  flex-shrink: 0;
  color: var(--color-text-tertiary);
  cursor: grab;
  font-size: 0.9rem;
  line-height: 1;
  user-select: none;
}
.st-method-row.is-dragging {
  opacity: 0.45;
  border-color: var(--color-accent);
  border-style: dashed;
}
/* Плавное перестроение строк при live-предпросмотре DnD */
.pp-group-body .st-method-row {
  transition: transform 0.12s ease;
}
.pp-group.is-dnd-over {
  border-color: var(--color-accent);
  box-shadow: inset 0 0 0 1px var(--color-accent);
}
/* Пустой раздел: видимая drop-зона (раздел в админке не скрывается, чтобы можно было вернуть метод) */
.pp-group-empty-drop {
  padding: 0.85rem;
  text-align: center;
  font-size: 0.72rem;
  color: var(--color-text-tertiary);
  border: 1px dashed var(--color-border-light);
  background: rgba(0, 0, 0, 0.15);
}
.pp-group.is-dnd-over .pp-group-empty-drop {
  border-color: var(--color-accent);
  color: var(--color-text-secondary);
}
.pp-mobile-actions {
  display: flex;
  gap: 0.4rem;
  align-items: center;
  flex-wrap: wrap;
  padding-top: 0.4rem;
}
.pp-mobile-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2rem;
  padding: 0.25rem 0.5rem;
  border: 1px solid var(--color-border-light);
  background: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
  font-family: inherit;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
}
.pp-mobile-btn:hover:not(:disabled) { color: var(--color-text); border-color: var(--color-accent); }
.pp-mobile-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.pp-mobile-actions select.st-input { flex: 1 1 auto; }
.st-method-summary {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  min-height: 2.5rem;
  transition: background 0.15s ease;
}
.st-method-summary:hover { background: rgba(255, 255, 255, 0.02); }
.st-method-toggle { flex-shrink: 0; cursor: pointer; }
.st-method-id {
  font-family: 'Share Tech Mono', 'Courier New', monospace;
  font-size: 0.78rem;
  color: var(--color-text);
  letter-spacing: 0.03em;
  flex: 0 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.st-method-label-preview {
  font-size: 0.7rem;
  color: var(--color-text-secondary);
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1 1 auto;
}
.st-method-section-badge {
  font-size: 0.62rem;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--color-text-tertiary);
  padding: 0.12rem 0.45rem;
  border: 1px solid var(--color-border);
  background: rgba(0, 0, 0, 0.25);
  flex-shrink: 0;
}
.st-method-detail {
  padding: 0.75rem 0.85rem 0.85rem;
  border-top: 1px solid var(--color-border);
  background: rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.st-method-notice {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.5rem 0.65rem;
  border: 1px solid rgba(212, 168, 90, 0.35);
  background: rgba(212, 168, 90, 0.06);
  color: #f0c989;
}
.st-method-notice i { flex-shrink: 0; margin-top: 0.05rem; }

/* ── CALLOUT EDITOR ── */
.pp-callout-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-bottom: 0.4rem;
}
.pp-callout-btn {
  padding: 0.3rem 0.7rem;
  font-size: 0.72rem;
  font-family: inherit;
  letter-spacing: 0.04em;
  border: 1px solid var(--color-border-light);
  background: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
}
.pp-callout-btn:hover {
  color: var(--color-text);
  border-color: var(--color-accent);
  background: var(--color-bg);
}
.pp-logo-settings {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 140px auto;
  gap: 0.65rem;
  align-items: end;
}
.pp-logo-upload {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}
.pp-logo-preview {
  min-width: 92px;
  min-height: 54px;
  padding: 0.45rem 0.6rem;
  border: 1px solid var(--color-border-light);
  background: var(--color-bg);
  display: flex;
  align-items: center;
  justify-content: center;
}
.pp-logo-preview img {
  display: block;
  max-width: 100%;
  height: auto;
}
.st-section .pp-callout-editor {
  border: 1px solid var(--color-border-light);
  min-height: 120px;
  padding: 0.55rem 0.75rem;
  overflow: auto;
  font-size: 0.84rem;
  line-height: 1.5;
  background: var(--color-bg);
  color: var(--color-text);
  box-sizing: border-box;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.st-section .pp-callout-editor:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 1px rgba(211, 35, 75, 0.25);
}
`
