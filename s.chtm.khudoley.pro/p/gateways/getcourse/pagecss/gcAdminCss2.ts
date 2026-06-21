// @shared
export const gcAdminCss2 = `
.ap-card--stagger-2 {
  animation: ap-card-enter 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.2s both;
}
.ap-card--stagger-3 {
  animation: ap-card-enter 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.3s both;
}
.ap-card--stagger-4 {
  animation: ap-card-enter 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.4s both;
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

.ap-gc-lead {
  margin: 0 0 0.75rem;
  font-size: 0.72rem;
  color: var(--c-tx3);
  line-height: 1.45;
  position: relative;
  z-index: 1;
}
.ap-gc-code {
  font-size: 0.68rem;
  color: var(--c-tx2);
  letter-spacing: 0.02em;
}
.ap-gc-field {
  margin-bottom: 0.75rem;
  position: relative;
  z-index: 1;
}
.ap-gc-label {
  display: block;
  margin-bottom: 0.35rem;
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--c-tx2);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.ap-gc-input-row {
  display: flex;
  gap: 0.4rem;
  align-items: stretch;
}
.ap-input--grow {
  flex: 1 1 auto;
  min-width: 0;
}
.ap-gc-toggle {
  flex-shrink: 0;
  align-self: stretch;
}
.ap-gc-actions {
  margin-top: 0.5rem;
  position: relative;
  z-index: 1;
}

/* ── Произвольные пары «ключ — значение» (manual §5.9) ─────────────────── */
.ap-kv .ap-kv-form {
  margin-top: 0.55rem;
}
.ap-kv-row {
  display: flex;
  gap: 0.45rem;
  flex-wrap: wrap;
  align-items: flex-end;
}
.ap-kv-field {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 12rem;
}
.ap-kv-field--grow {
  flex: 1;
  min-width: 14rem;
}
.ap-kv-field span {
  font-size: 0.68rem;
  color: var(--c-tx2);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.ap-kv-save {
  align-self: flex-end;
}
.ap-kv-list {
  margin-top: 0.6rem;
}
.ap-kv-empty {
  font-size: 0.74rem;
  color: var(--c-tx3);
  padding: 0.4rem 0.5rem;
}
.ap-kv-rows {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.ap-kv-item {
  display: grid;
  grid-template-columns: minmax(8rem, 16rem) minmax(0, 1fr) auto;
  gap: 0.5rem;
  align-items: center;
  padding: 0.4rem 0.55rem;
  border: 1px solid var(--c-bdr);
  background: var(--c-bg-deep);
}
.ap-kv-key {
  font-size: 0.74rem;
  color: var(--c-tx);
  word-break: break-all;
}
.ap-kv-value {
  font-size: 0.74rem;
  color: var(--c-tx2);
  word-break: break-all;
  white-space: pre-wrap;
}
.ap-kv-actions {
  display: inline-flex;
  gap: 0.35rem;
}
.ap-card-hd {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.7rem;
  position: relative;
  z-index: 1;
}
.ap-card-hd h2 {
  margin: 0;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--c-tx2);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

/* ── METERS ── */
.ap-meters {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.6rem;
  position: relative;
  z-index: 1;
}
.ap-meter {
  display: flex;
  overflow: hidden;
  border: 1px solid var(--c-bdr);
  background: var(--c-bg-deep);
  transition: border-color 0.25s ease;
}
.ap-meter-accent {
  width: 3px;
  flex-shrink: 0;
}
.ap-meter-body {
  padding: 0.65rem 0.8rem;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}
.ap-meter strong {
  font-size: 1.75rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1.15;
}
.ap-meter span {
  font-size: 0.66rem;
  color: var(--c-tx3);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.ap-meter span i {
  margin-right: 0.2rem;
}

.ap-meter--err .ap-meter-accent {
  background: var(--c-alert);
}
.ap-meter--err strong {
  color: var(--c-alert);
}
.ap-meter--err {
  border-color: rgba(217, 122, 138, 0.25);
}
.ap-meter--err:hover {
  border-color: rgba(217, 122, 138, 0.45);
}

.ap-meter--wrn .ap-meter-accent {
  background: var(--c-warn);
}
.ap-meter--wrn strong {
  color: var(--c-warn);
}
.ap-meter--wrn {
  border-color: rgba(201, 166, 96, 0.25);
}
.ap-meter--wrn:hover {
  border-color: rgba(201, 166, 96, 0.45);
}

/* ── CONFIG ── */
.ap-cfg-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.85rem;
}

.ap-input {
  width: 100%;
  padding: 0.55rem 0.7rem;
  border: 1px solid var(--c-bdr);
  background: var(--c-bg-deep);
  color: var(--c-tx);
  font-family: inherit;
  font-size: 0.85rem;
  letter-spacing: 0.02em;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
  position: relative;
  z-index: 1;
}
.ap-input:focus {
  outline: none;
  border-color: var(--c-red-s);
  box-shadow: 0 0 0 1px rgba(217, 86, 114, 0.2);
}
.ap-input::placeholder {
  color: var(--c-tx3);
}

.ap-lvls {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.4rem;
  position: relative;
  z-index: 1;
}
.ap-lvl {
  padding: 0.42rem;
  border: 1px solid var(--c-bdr);
  background: var(--c-bg-deep);
  color: var(--c-tx2);
  font-family: inherit;
  font-size: 0.72rem;
  cursor: pointer;
  transition: all 0.15s ease;
  font-weight: 600;
  text-align: center;
  letter-spacing: 0.05em;
  position: relative;
  overflow: hidden;
  clip-path: polygon(
    0 2px,
    2px 2px,
    2px 0,
    calc(100% - 2px) 0,
    calc(100% - 2px) 2px,
    100% 2px,
    100% calc(100% - 2px),
    calc(100% - 2px) calc(100% - 2px),
    calc(100% - 2px) 100%,
    2px 100%,
    2px calc(100% - 2px),
    0 calc(100% - 2px)
  );
}
.ap-lvl::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background: var(--c-red);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.2s ease;
}
.ap-lvl:hover {
  border-color: var(--c-bdr-hi);
  background: rgba(22, 20, 26, 0.98);
  color: var(--c-tx);
}
`
