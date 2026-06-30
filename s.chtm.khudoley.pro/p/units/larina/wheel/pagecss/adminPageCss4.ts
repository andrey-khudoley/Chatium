// @shared
export const adminPageCss4 = `
/* ── FIELD ROWS ── */
.ap-field-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.4rem;
}
.ap-field-row--checkbox {
  margin-bottom: 0.55rem;
}
.ap-field-row--checkbox .ap-label {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  cursor: pointer;
  font-size: 0.85rem;
  color: var(--c-tx);
}
.ap-row--disabled {
  opacity: 0.4;
}
.ap-row--disabled .ap-label,
.ap-row--disabled .ap-checkbox {
  cursor: not-allowed;
}

/* ── LABELS ── */
.ap-label {
  display: block;
  font-size: 0.8rem;
  color: var(--c-tx2);
  margin-bottom: 0.35rem;
}

/* ── SUBSECTION TITLE ── */
.ap-section-title {
  display: block;
  font-size: 0.74rem;
  font-weight: 500;
  color: var(--c-tx3);
  letter-spacing: 0.02em;
  margin: 1.1rem 0 0.6rem;
  padding-bottom: 0.4rem;
  border-bottom: 1px solid var(--c-bdr);
}

/* ── MUTED / EMPTY / LOADING ── */
.ap-muted {
  color: var(--c-tx3);
  font-size: 0.78rem;
}
.ap-empty {
  color: var(--c-tx3);
  font-size: 0.82rem;
  text-align: center;
  padding: 1.4rem 0.5rem;
}
.ap-loading {
  color: var(--c-tx3);
  font-size: 0.82rem;
  padding: 0.7rem 0;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.ap-loading i {
  font-size: 0.78rem;
}

/* ── BADGE INLINE ── */
.ap-badge--inline {
  vertical-align: middle;
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
}

/* ── INPUT FLEX / GROUP ── */
.ap-input--flex {
  flex: 1 1 auto;
  min-width: 0;
}
.ap-input-group {
  display: flex;
  align-items: stretch;
  gap: 0.45rem;
}
.ap-input-group .ap-input {
  flex: 1 1 auto;
  min-width: 0;
}

/* ── BUTTON MODIFIERS ── */
.ap-btn--sm {
  padding: 0.38rem 0.65rem;
  font-size: 0.76rem;
}
.ap-btn--sm i {
  font-size: 0.76rem;
}
.ap-btn--icon {
  padding: 0;
  width: 2.1rem;
  height: 2.1rem;
  min-width: 2.1rem;
  justify-content: center;
  flex-shrink: 0;
}
.ap-btn--icon i {
  font-size: 0.82rem;
}
.ap-btn--ghost {
  background: transparent;
  border-color: var(--c-bdr);
  color: var(--c-tx2);
}
.ap-btn--ghost:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: var(--c-bdr-hi);
  color: var(--c-tx);
}
.ap-btn--danger {
  border-color: var(--c-accent-bdr);
  color: var(--c-red-s);
  background: var(--c-accent-bg);
}
.ap-btn--danger:hover {
  border-color: var(--c-red);
  background: rgba(226, 75, 88, 0.2);
  color: #fff;
}
.ap-btn:disabled,
.ap-btn[disabled] {
  opacity: 0.4;
  cursor: not-allowed;
  pointer-events: none;
}

/* ── TOGGLE SWITCH ── */
.ap-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  color: var(--c-tx2);
  font-family: inherit;
  font-size: 0.85rem;
  transition: color 0.2s ease;
}
.ap-toggle:focus {
  outline: none;
}
.ap-toggle:focus-visible .ap-toggle__track {
  box-shadow: 0 0 0 3px var(--c-accent-bg);
}
.ap-toggle__track {
  display: block;
  width: 2.4rem;
  height: 1.3rem;
  border-radius: var(--radius-pill);
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
  left: 0.18rem;
  transform: translateY(-50%);
  width: 0.9rem;
  height: 0.9rem;
  border-radius: 50%;
  background: var(--c-tx2);
  transition:
    left 0.2s ease,
    background 0.2s ease;
}
.ap-toggle--on .ap-toggle__track {
  background: var(--c-red);
  border-color: var(--c-red);
}
.ap-toggle--on .ap-toggle__thumb {
  left: calc(2.4rem - 0.9rem - 0.18rem);
  background: #fff;
}
.ap-toggle--on {
  color: var(--c-tx);
}
.ap-toggle__label {
  color: inherit;
  font-size: 0.8rem;
}

/* ── CHECKBOX ── */
.ap-checkbox {
  accent-color: var(--c-red);
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
  cursor: pointer;
}

/* ── SEGMENTS LIST ── */
.ap-segments-list {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  margin-top: 0.4rem;
}
.ap-segment-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.6rem 0.55rem;
  border: 1px solid transparent;
  border-radius: var(--radius);
  transition:
    background 0.15s ease,
    border-color 0.15s ease;
}
.ap-segment-row:hover {
  background: var(--c-bg-deep);
  border-color: var(--c-bdr);
}
.ap-segment-row--disabled {
  opacity: 0.4;
}
.ap-segment-row__order {
  font-size: 0.74rem;
  font-weight: 600;
  color: var(--c-tx3);
  min-width: 1.5rem;
  text-align: center;
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}
.ap-segment-row__info {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}
.ap-segment-row__label {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--c-tx);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ap-segment-row__full {
  font-size: 0.76rem;
  color: var(--c-tx2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ap-segment-row__meta {
  font-size: 0.72rem;
  color: var(--c-tx3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ap-segment-row__actions {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  flex-shrink: 0;
}

/* ── SEGMENT FORM ── */
.ap-segment-form {
  background: var(--c-bg-deep);
  border: 1px solid var(--c-bdr);
  border-radius: var(--radius);
  padding: 0.9rem 1rem;
  margin-bottom: 0.8rem;
}
.ap-segment-form__title {
  margin: 0 0 0.75rem;
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--c-tx);
}
.ap-segment-form__actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.7rem;
}

/* ── CONFIRM ── */
.ap-confirm {
  background: var(--c-accent-bg);
  border: 1px solid var(--c-accent-bdr);
  border-radius: var(--radius);
  padding: 0.8rem 0.95rem;
  margin-bottom: 0.7rem;
}
.ap-confirm__msg {
  margin: 0 0 0.6rem;
  font-size: 0.85rem;
  color: var(--c-tx);
}
.ap-confirm__msg i {
  color: var(--c-warn);
  margin-right: 0.35rem;
}
.ap-confirm__actions {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

/* ── GROUPS BLOCK ── */
.ap-groups-block {
  margin: 0.55rem 0 0.7rem;
}
.ap-groups-list {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  margin-top: 0.4rem;
  max-height: 14rem;
  overflow-y: auto;
}
.ap-group-item {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  font-size: 0.85rem;
  color: var(--c-tx);
  cursor: pointer;
  padding: 0.4rem 0.45rem;
  border-radius: var(--radius);
  transition: background 0.12s ease;
}
.ap-group-item:hover {
  background: var(--c-bg-deep);
}
.ap-group-item .ap-muted {
  margin-left: auto;
  font-size: 0.74rem;
}

/* ── STAGGER ANIMATIONS (4–6) ── */
.ap-card--stagger-4 {
  animation: ap-card-enter 0.45s ease 0.16s both;
}
.ap-card--stagger-5 {
  animation: ap-card-enter 0.45s ease 0.2s both;
}
.ap-card--stagger-6 {
  animation: ap-card-enter 0.45s ease 0.24s both;
}
`
