// @shared
export const adminPageCss2 = `
.ap-card--stagger-2 {
  animation: ap-card-enter 0.45s ease 0.08s both;
}
.ap-card--stagger-3 {
  animation: ap-card-enter 0.45s ease 0.12s both;
}
@keyframes ap-card-enter {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

/* ── CARD HEADER ── */
.ap-card-hd {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.95rem;
}
.ap-card-hd h2 {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--c-tx);
  letter-spacing: 0;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

/* ── METRIC TILES ── */
.ap-meters {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.7rem;
}
.ap-meter {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  overflow: hidden;
  border: 1px solid var(--c-bdr);
  border-radius: var(--radius);
  background: var(--c-bg-deep);
  padding: 0.85rem 0.95rem;
  transition: border-color 0.2s ease;
}
.ap-meter-accent {
  width: 34px;
  height: 34px;
  border-radius: var(--radius);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.95rem;
}
.ap-meter-body {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  min-width: 0;
}
.ap-meter strong {
  font-size: 1.6rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
  color: var(--c-tx);
}
.ap-meter span {
  font-size: 0.74rem;
  color: var(--c-tx2);
  letter-spacing: 0;
}
.ap-meter span i {
  display: none;
}

.ap-meter--err .ap-meter-accent {
  background: var(--c-accent-bg);
  color: var(--c-red-s);
}
.ap-meter--err strong {
  color: var(--c-red-s);
}
.ap-meter--err:hover {
  border-color: var(--c-accent-bdr);
}

.ap-meter--wrn .ap-meter-accent {
  background: var(--c-warn-bg);
  color: var(--c-warn);
}
.ap-meter--wrn strong {
  color: var(--c-warn);
}
.ap-meter--wrn:hover {
  border-color: rgba(227, 161, 58, 0.4);
}

/* ── CONFIG ── */
.ap-cfg-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.95rem;
}

.ap-input {
  width: 100%;
  height: 2.4rem;
  padding: 0 0.75rem;
  border: 1px solid var(--c-bdr);
  border-radius: var(--radius);
  background: var(--c-bg-deep);
  color: var(--c-tx);
  font-family: inherit;
  font-size: 0.88rem;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}
textarea.ap-input {
  height: auto;
  padding: 0.6rem 0.75rem;
  line-height: 1.5;
}
.ap-input:hover {
  border-color: var(--c-bdr-hi);
}
.ap-input:focus {
  outline: none;
  border-color: var(--c-red-s);
  box-shadow: 0 0 0 3px var(--c-accent-bg);
}
.ap-input::placeholder {
  color: var(--c-tx3);
}

/* ── SEGMENTED: LOG LEVEL ── */
.ap-lvls {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.35rem;
  padding: 0.25rem;
  border: 1px solid var(--c-bdr);
  border-radius: var(--radius);
  background: var(--c-bg-deep);
}
.ap-lvl {
  padding: 0.5rem 0.4rem;
  border: none;
  border-radius: calc(var(--radius) - 3px);
  background: transparent;
  color: var(--c-tx2);
  font-family: inherit;
  font-size: 0.78rem;
  cursor: pointer;
  transition:
    background 0.15s ease,
    color 0.15s ease;
  font-weight: 500;
  text-align: center;
}
.ap-lvl:hover {
  background: rgba(255, 255, 255, 0.04);
  color: var(--c-tx);
}
.ap-lvl.active {
  background: var(--c-accent-bg);
  color: var(--c-red-s);
}

/* ── BUTTONS ── */
.ap-btn {
  padding: 0.5rem 0.85rem;
  border: 1px solid var(--c-bdr-hi);
  border-radius: var(--radius);
  background: var(--c-bg2);
  color: var(--c-tx);
  font-family: inherit;
  font-size: 0.82rem;
  font-weight: 500;
  cursor: pointer;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    transform 0.05s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
}
.ap-btn:hover {
  background: #232329;
  border-color: rgba(255, 255, 255, 0.2);
}
.ap-btn:active {
  transform: scale(0.98);
}
.ap-btn i {
  font-size: 0.82rem;
}

/* ── BADGES ── */
.ap-badge {
  font-size: 0.68rem;
  padding: 0.15rem 0.5rem;
  border: 1px solid transparent;
  border-radius: var(--radius-pill);
  font-weight: 500;
  letter-spacing: 0;
}
`
