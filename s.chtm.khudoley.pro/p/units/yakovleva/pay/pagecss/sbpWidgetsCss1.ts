// @shared
export const sbpWidgetsCss1 = `
/* ── WIDGET SETTINGS ── */
.aw-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.7rem 0.85rem;
}
@media (max-width: 720px) {
  .aw-grid {
    grid-template-columns: 1fr;
  }
}

.aw-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.aw-switch {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.78rem;
  letter-spacing: 0.04em;
  color: var(--c-tx);
  cursor: pointer;
  user-select: none;
}
.aw-switch input[type='checkbox'] {
  width: 16px;
  height: 16px;
  margin: 0;
  accent-color: var(--c-red-s, #d3234b);
}

.aw-textarea {
  font-family: 'Share Tech Mono', 'Courier New', monospace;
  font-size: 0.74rem;
  width: 100%;
  min-height: 70px;
  padding: 0.5rem 0.6rem;
  background: var(--c-bg-deep);
  color: var(--c-tx);
  border: 1px solid var(--c-bdr);
  border-radius: 2px;
  resize: vertical;
  line-height: 1.45;
}
.aw-textarea:focus {
  outline: none;
  border-color: var(--c-red-s, #d3234b);
}

.aw-search-row {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}
.aw-search-row .aw-input {
  flex: 1;
}

.aw-offer-list {
  margin-top: 0.55rem;
  max-height: 240px;
  overflow-y: auto;
  border: 1px solid var(--c-bdr);
  background: var(--c-bg-deep);
}
.aw-offer-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.55rem;
  border-bottom: 1px solid var(--c-bdr);
  font-size: 0.74rem;
  color: var(--c-tx);
}
.aw-offer-item:last-child {
  border-bottom: none;
}
.aw-offer-item input[type='checkbox'] {
  width: 14px;
  height: 14px;
  margin: 0;
  accent-color: var(--c-red-s, #d3234b);
}
.aw-offer-item__name {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.aw-offer-item__price {
  font-variant-numeric: tabular-nums;
  color: var(--c-tx3);
  font-size: 0.7rem;
}
.aw-offer-empty {
  padding: 0.7rem;
  font-size: 0.74rem;
  color: var(--c-tx3);
  text-align: center;
}

.aw-radio-row {
  display: flex;
  gap: 0.8rem;
  flex-wrap: wrap;
}
.aw-radio {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.78rem;
  cursor: pointer;
  color: var(--c-tx);
}
.aw-radio input[type='radio'] {
  margin: 0;
  accent-color: var(--c-red-s, #d3234b);
}

.aw-anchor-snippet {
  margin-top: 0.5rem;
  padding: 0.55rem 0.65rem;
  background: var(--c-bg-deep);
  border: 1px solid var(--c-bdr);
  color: var(--c-tx2);
  font-family: 'Share Tech Mono', 'Courier New', monospace;
  font-size: 0.72rem;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
}
.aw-anchor-snippet code {
  color: var(--c-tx);
}

.aw-hint--warn {
  color: #d39825;
}

.aw-input {
  font-family: 'Share Tech Mono', 'Courier New', monospace;
  font-size: 0.78rem;
  padding: 0.45rem 0.55rem;
  background: var(--c-bg-deep);
  color: var(--c-tx);
  border: 1px solid var(--c-bdr);
  border-radius: 2px;
  width: 100%;
}
.aw-input:focus {
  outline: none;
  border-color: var(--c-red-s, #d3234b);
}
`
