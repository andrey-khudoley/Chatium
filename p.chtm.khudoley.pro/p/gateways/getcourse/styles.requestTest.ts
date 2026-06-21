// Стили вкладки «Создать запрос»: глобальные классы .rt-*, инъектируются через index.tsx.
/**
 * Стили вкладки «Создать запрос» (`components/RequestTestTab.vue` и под-компоненты
 * `RtFormatHint.vue` / `RtSnapshots.vue`). Все селекторы неймспейснуты префиксом `.rt-`,
 * поэтому стили глобальные (не scoped) и подключаются один раз через `index.tsx` — это
 * держит SFC компактными (001-standards §«KEEP FILES SMALL»).
 */
export const requestTestTabStyles = `
.rt {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  font-family: 'Share Tech Mono', 'Courier New', monospace;
  color: #e0dcdf;
}
.rt-section {
  border: 1px solid rgba(50, 44, 54, 0.55);
  background: rgba(12, 11, 14, 0.85);
  padding: 0.6rem 0.8rem;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}
.rt-section-hd {
  font-size: 0.72rem;
  letter-spacing: 0.06em;
  color: #d95672;
  text-transform: uppercase;
  font-weight: 600;
}
.rt-section-hd-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
}
.rt-spoiler-hd {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  text-align: left;
  color: inherit;
  font-family: inherit;
}
.rt-spoiler-chevron {
  color: #d95672;
  font-size: 0.7rem;
  width: 0.8rem;
}
.rt-spoiler-count {
  margin-left: auto;
  font-size: 0.66rem;
  color: #7e777b;
  letter-spacing: 0.04em;
}
.rt-spoiler-body {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  margin-top: 0.55rem;
}
.rt-hint-block {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.rt-hint-label {
  font-size: 0.66rem;
  letter-spacing: 0.06em;
  color: #a39da0;
  text-transform: uppercase;
}
.rt-legend {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.rt-legend-item {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.4rem;
  font-size: 0.72rem;
  line-height: 1.4;
}
.rt-legend-name {
  color: #e0dcdf;
  background: rgba(50, 44, 54, 0.45);
  padding: 0.05rem 0.35rem;
}
.rt-legend-type {
  color: #8fb3c9;
  font-size: 0.66rem;
}
.rt-legend-desc {
  color: #a39da0;
  flex-basis: 100%;
}
.rt-group-hd {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.4rem;
  padding-top: 0.3rem;
  border-top: 1px dashed rgba(50, 44, 54, 0.5);
  font-size: 0.72rem;
  letter-spacing: 0.04em;
}
.rt-group-ic {
  color: #d95672;
  font-size: 0.7rem;
}
.rt-group-name {
  color: #e0dcdf;
  font-weight: 600;
}
.rt-group-desc {
  color: #a39da0;
  font-size: 0.66rem;
  flex-basis: 100%;
}
.rt-btn-primary {
  background: rgba(196, 33, 63, 0.9);
  border: 1px solid #c4213f;
  color: #fff;
  padding: 0.4rem 0.9rem;
  font-family: inherit;
  font-size: 0.74rem;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition: background 0.15s ease;
}
.rt-btn-primary:hover:not(:disabled) {
  background: #c4213f;
}
.rt-btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.rt-btn-secondary {
  background: rgba(8, 7, 10, 0.95);
  border: 1px solid rgba(50, 44, 54, 0.55);
  color: #cfc9cc;
  padding: 0.3rem 0.65rem;
  font-family: inherit;
  font-size: 0.7rem;
  letter-spacing: 0.04em;
  cursor: pointer;
  white-space: nowrap;
  transition:
    border-color 0.15s ease,
    color 0.15s ease,
    background 0.15s ease;
}
.rt-btn-secondary:hover:not(:disabled) {
  border-color: #c4213f;
  color: #fff;
  background: rgba(196, 33, 63, 0.1);
}
.rt-btn-secondary:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.rt-row {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.rt-input-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.rt-input-grow {
  flex: 1 1 auto;
  min-width: 0;
}
.rt-lbl {
  font-size: 0.72rem;
  color: #a39da0;
  letter-spacing: 0.04em;
}
.rt-type {
  color: #7e777b;
  margin-left: 0.35rem;
  font-size: 0.62rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.rt-req {
  color: #d97a8a;
  margin-left: 0.2rem;
}
.rt-opt {
  color: #7e777b;
  margin-left: 0.3rem;
  font-size: 0.66rem;
}
.rt-input {
  background: rgba(8, 7, 10, 0.95);
  border: 1px solid rgba(50, 44, 54, 0.55);
  color: #e0dcdf;
  padding: 0.45rem 0.6rem;
  font-family: inherit;
  font-size: 0.78rem;
  outline: none;
}
.rt-input:focus {
  border-color: #c4213f;
  background: rgba(20, 18, 24, 0.95);
}
.rt-textarea {
  resize: vertical;
  white-space: pre;
}
.rt-hint {
  font-size: 0.66rem;
  color: #7e777b;
  margin: 0;
}
.rt-err {
  font-size: 0.7rem;
  color: #d97a8a;
  margin: 0;
}
.rt-warn {
  border: 1px solid #c9a660;
  background: rgba(201, 166, 96, 0.08);
  color: #c9a660;
  padding: 0.5rem 0.7rem;
  font-size: 0.74rem;
}
.rt-actions {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}
.rt-status {
  padding: 0.35rem 0.7rem;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  border: 1px solid;
}
.rt-status--ok {
  color: #6aaf7e;
  border-color: #6aaf7e;
}
.rt-status--fail {
  color: #d97a8a;
  border-color: #d97a8a;
}
.rt-snap {
  border: 1px solid rgba(50, 44, 54, 0.55);
  background: rgba(8, 7, 10, 0.95);
  display: flex;
  flex-direction: column;
}
.rt-snap-hd {
  padding: 0.4rem 0.7rem;
  background: rgba(196, 33, 63, 0.08);
  color: #d95672;
  font-size: 0.7rem;
  letter-spacing: 0.06em;
  font-weight: 600;
  text-transform: uppercase;
  border-bottom: 1px solid rgba(50, 44, 54, 0.55);
}
.rt-pre {
  margin: 0;
  padding: 0.6rem 0.7rem;
  font-family: 'Share Tech Mono', 'Courier New', monospace;
  font-size: 0.74rem;
  color: #cfc9cc;
  white-space: pre;
  overflow-x: auto;
  max-height: 480px;
  overflow-y: auto;
}
`
