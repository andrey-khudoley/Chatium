// @shared
export const adminPageCss4 = `
/* ── FIELD ROWS ── */
.ap-field-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.35rem;
  position: relative;
  z-index: 1;
}
.ap-field-row--checkbox {
  margin-bottom: 0.45rem;
}
.ap-field-row--checkbox .ap-label {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  cursor: pointer;
}

/* ── LABELS ── */
.ap-label {
  display: block;
  font-size: 0.72rem;
  color: var(--c-tx2);
  letter-spacing: 0.04em;
  margin-bottom: 0;
  position: relative;
  z-index: 1;
}

/* ── SECTION TITLE ── */
.ap-section-title {
  display: block;
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--c-tx);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin: 0.85rem 0 0.45rem;
  padding-bottom: 0.3rem;
  border-bottom: 1px solid var(--c-bdr);
  position: relative;
  z-index: 1;
}

/* ── MUTED / EMPTY / LOADING ── */
.ap-muted {
  color: var(--c-tx3);
  font-size: 0.75rem;
}
.ap-empty {
  color: var(--c-tx3);
  font-size: 0.8rem;
  text-align: center;
  padding: 1.2rem 0.5rem;
  position: relative;
  z-index: 1;
}
.ap-loading {
  color: var(--c-tx3);
  font-size: 0.8rem;
  padding: 0.65rem 0;
  position: relative;
  z-index: 1;
}
.ap-loading i {
  margin-right: 0.3rem;
  font-size: 0.72rem;
}

/* ── BADGE INLINE ── */
.ap-badge--inline {
  vertical-align: middle;
  display: inline-flex;
  align-items: center;
  gap: 0.15rem;
}

/* ── INPUT FLEX / GROUP ── */
.ap-input--flex {
  flex: 1 1 auto;
  min-width: 0;
}
.ap-input-group {
  display: flex;
  align-items: stretch;
  gap: 0.4rem;
  position: relative;
  z-index: 1;
}
.ap-input-group .ap-input {
  flex: 1 1 auto;
  min-width: 0;
}

/* ── BUTTON MODIFIERS ── */
.ap-btn--sm {
  padding: 0.28rem 0.55rem;
  font-size: 0.68rem;
}
.ap-btn--sm i {
  font-size: 0.58rem;
}
.ap-btn--icon {
  padding: 0.38rem 0.5rem;
  min-width: 2rem;
  justify-content: center;
  flex-shrink: 0;
}
.ap-btn--icon i {
  font-size: 0.65rem;
}
.ap-btn--ghost {
  background: transparent;
  border-color: var(--c-bdr);
  color: var(--c-tx2);
}
.ap-btn--ghost:hover {
  background: rgba(20, 18, 24, 0.8);
  border-color: var(--c-bdr-hi);
  color: var(--c-tx);
}
.ap-btn--ghost::after {
  background: var(--c-tx3);
}
.ap-btn--danger {
  border-color: rgba(196, 33, 63, 0.35);
  color: var(--c-red-s);
  background: rgba(45, 14, 22, 0.9);
}
.ap-btn--danger::after {
  background: var(--c-red-s);
}
.ap-btn--danger:hover {
  border-color: rgba(217, 86, 114, 0.55);
  background: rgba(65, 18, 30, 0.95);
  color: #ecc8cf;
}
.ap-btn:disabled,
.ap-btn[disabled] {
  opacity: 0.4;
  cursor: not-allowed;
  pointer-events: none;
}

/* ── TOGGLE ── */
.ap-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  background: none;
  border: none;
  padding: 0;
  position: relative;
  cursor: pointer;
  color: var(--c-tx2);
  font-family: inherit;
  font-size: 0.78rem;
  letter-spacing: 0.04em;
  transition: color 0.2s ease;
}
.ap-toggle:focus {
  outline: none;
}
.ap-toggle__track {
  display: block;
  width: 2.2rem;
  height: 1.1rem;
  background: var(--c-bg-deep);
  border: 1px solid var(--c-bdr);
  position: relative;
  flex-shrink: 0;
  transition:
    background 0.2s ease,
    border-color 0.2s ease;
}
.ap-toggle__thumb {
  display: block;
  position: absolute;
  top: 50%;
  left: 0.15rem;
  transform: translateY(-50%);
  width: 0.75rem;
  height: 0.75rem;
  background: var(--c-tx3);
  transition:
    left 0.2s ease,
    background 0.2s ease;
}
.ap-toggle--on .ap-toggle__track {
  background: rgba(196, 33, 63, 0.18);
  border-color: rgba(217, 86, 114, 0.5);
}
.ap-toggle--on .ap-toggle__thumb {
  left: calc(2.2rem - 0.75rem - 0.15rem);
  background: var(--c-red-s);
}
.ap-toggle--on {
  color: var(--c-tx);
}
.ap-toggle__label {
  color: inherit;
  font-size: 0.72rem;
  letter-spacing: 0.06em;
}

/* ── CHECKBOX ── */
.ap-checkbox {
  accent-color: var(--c-red-s);
  width: 0.85rem;
  height: 0.85rem;
  flex-shrink: 0;
  cursor: pointer;
}

/* ── SEGMENTS LIST ── */
.ap-segments-list {
  display: flex;
  flex-direction: column;
  gap: 0;
  position: relative;
  z-index: 1;
  margin-top: 0.35rem;
}
.ap-segment-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.4rem;
  border-bottom: 1px solid var(--c-bdr);
  transition: background 0.15s ease;
}
.ap-segment-row:last-child {
  border-bottom: none;
}
.ap-segment-row:hover {
  background: rgba(255, 255, 255, 0.02);
}
.ap-segment-row--disabled {
  opacity: 0.45;
}
.ap-segment-row__order {
  font-size: 0.68rem;
  font-weight: 700;
  color: var(--c-tx3);
  min-width: 1.4rem;
  text-align: center;
  flex-shrink: 0;
  letter-spacing: 0.04em;
  font-variant-numeric: tabular-nums;
}
.ap-segment-row__info {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}
.ap-segment-row__label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--c-tx);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ap-segment-row__full {
  font-size: 0.72rem;
  color: var(--c-tx2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ap-segment-row__meta {
  font-size: 0.67rem;
  color: var(--c-tx3);
  letter-spacing: 0.02em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ap-segment-row__actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex-shrink: 0;
}

/* ── SEGMENT FORM ── */
.ap-segment-form {
  background: var(--c-bg-deep);
  border: 1px solid var(--c-bdr);
  padding: 0.7rem 0.85rem;
  margin-bottom: 0.7rem;
  position: relative;
  z-index: 1;
}
.ap-segment-form__title {
  margin: 0 0 0.65rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--c-tx);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.ap-segment-form__actions {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin-top: 0.6rem;
  position: relative;
  z-index: 1;
}

/* ── CONFIRM ── */
.ap-confirm {
  background: rgba(45, 14, 22, 0.5);
  border: 1px solid rgba(196, 33, 63, 0.3);
  padding: 0.65rem 0.85rem;
  margin-bottom: 0.65rem;
  position: relative;
  z-index: 1;
}
.ap-confirm__msg {
  margin: 0 0 0.5rem;
  font-size: 0.8rem;
  color: var(--c-tx);
  letter-spacing: 0.02em;
}
.ap-confirm__msg i {
  color: var(--c-warn);
  margin-right: 0.3rem;
  font-size: 0.7rem;
}
.ap-confirm__actions {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

/* ── GROUPS BLOCK ── */
.ap-groups-block {
  margin: 0.45rem 0 0.65rem;
  position: relative;
  z-index: 1;
}
.ap-groups-list {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  margin-top: 0.3rem;
  max-height: 14rem;
  overflow-y: auto;
}
.ap-group-item {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.8rem;
  color: var(--c-tx);
  cursor: pointer;
  padding: 0.25rem 0.3rem;
  transition: background 0.12s ease;
  letter-spacing: 0.02em;
}
.ap-group-item:hover {
  background: rgba(255, 255, 255, 0.03);
}
.ap-group-item .ap-muted {
  margin-left: auto;
  font-size: 0.68rem;
}

/* ── STAGGER ANIMATIONS (4–6) ── */
.ap-card--stagger-4 {
  animation: ap-card-enter 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.4s both;
}
.ap-card--stagger-5 {
  animation: ap-card-enter 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.5s both;
}
.ap-card--stagger-6 {
  animation: ap-card-enter 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.6s both;
}
`
