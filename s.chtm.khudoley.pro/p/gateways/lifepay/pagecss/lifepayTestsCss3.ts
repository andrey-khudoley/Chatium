// @shared
export const lifepayTestsCss3 = `
.tp-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.04) 0px,
    rgba(0, 0, 0, 0.04) 1px,
    transparent 1px,
    transparent 2px
  );
  pointer-events: none;
}
.tp-btn::after {
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
.tp-btn i {
  font-size: 0.62rem;
}
.tp-btn:hover:not(:disabled) {
  border-color: var(--c-bdr-hi);
  background: rgba(24, 22, 28, 0.98);
  transform: translateY(-1px);
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.35);
}
.tp-btn:hover:not(:disabled)::after {
  transform: scaleX(1);
}
.tp-btn:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: none;
}
.tp-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.tp-btn--primary {
  border-color: rgba(217, 86, 114, 0.35);
  background: rgba(196, 33, 63, 0.14);
  color: #fff;
}
.tp-btn--primary::after {
  background: var(--c-red-s);
}
.tp-btn--primary:hover:not(:disabled) {
  background: rgba(196, 33, 63, 0.24);
  border-color: var(--c-red-s);
}

.tp-btn--danger {
  border-color: rgba(217, 122, 138, 0.3);
  color: #ecc8cf;
  background: rgba(45, 14, 22, 0.9);
}
.tp-btn--danger::after {
  background: var(--c-alert);
}
.tp-btn--danger:hover:not(:disabled) {
  border-color: rgba(217, 122, 138, 0.5);
  background: rgba(60, 20, 30, 0.95);
}

.tp-suite-run {
  margin-top: 0.7rem;
  width: 100%;
  justify-content: center;
  position: relative;
  z-index: 1;
}

.tp-err {
  margin: 0.4rem 0 0;
  color: var(--c-alert);
  font-size: 0.76rem;
}
.tp-err i {
  font-size: 0.62rem;
  margin-right: 0.15rem;
}

/* ── LOG SIDEBAR: высота по ячейке сетки; скролл только внутри .tp-log-out ── */
.tp-side {
  min-width: 0;
  min-height: 0;
  width: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.tp-card {
  border: 1px solid var(--c-bdr);
  background: linear-gradient(175deg, var(--c-bg), var(--c-bg2));
  padding: 0.85rem 1rem;
  position: relative;
}
.tp-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent 10%, var(--c-red) 50%, transparent 90%);
  opacity: 0.2;
}
.tp-card::after {
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.012) 0px,
    rgba(0, 0, 0, 0.012) 1px,
    transparent 1px,
    transparent 3px
  );
  pointer-events: none;
  opacity: 0.4;
}
.tp-log-card {
  position: relative;
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
  animation: tp-enter 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.15s both;
}
.tp-card-hd {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.55rem;
  position: relative;
  z-index: 1;
}
.tp-card-hd h2 {
  margin: 0;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--c-tx2);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.tp-log-ct {
  font-size: 0.7rem;
  color: var(--c-tx3);
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.04em;
}
.tp-log-filters {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.4rem;
  margin-bottom: 0.45rem;
  position: relative;
  z-index: 1;
  flex-shrink: 0;
}
.tp-log-card > .tp-card-hd {
  flex-shrink: 0;
}
.tp-log-toggle-row {
  margin-bottom: 0.55rem;
  position: relative;
  z-index: 1;
  flex-shrink: 0;
}
.tp-btn--toggle-all {
  width: 100%;
  font-size: 0.72rem;
  padding: 0.32rem 0.55rem;
}
.tp-flt {
  padding: 0.35rem;
  border: 1px solid var(--c-bdr);
  background: var(--c-bg-deep);
  color: var(--c-tx2);
  font-family: inherit;
  font-size: 0.7rem;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: center;
  letter-spacing: 0.03em;
  position: relative;
  overflow: hidden;
}
.tp-flt::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background: var(--c-red);
  transform: scaleX(0);
  transition: transform 0.2s ease;
}
.tp-flt:hover {
  border-color: var(--c-bdr-hi);
}
.tp-flt:hover::after {
  transform: scaleX(1);
}
.tp-flt.active {
  border-color: var(--c-red-s);
  background: rgba(196, 33, 63, 0.12);
  color: #fff;
}
.tp-flt.active::after {
  transform: scaleX(1);
}

.tp-log-out {
  flex: 1 1 auto;
  min-height: 7rem;
  overflow-y: auto;
  border: 1px solid rgba(50, 44, 54, 0.35);
  background: rgba(5, 4, 7, 0.98);
  padding: 0.55rem;
  margin-bottom: 0.55rem;
  font-size: 0.74rem;
  line-height: 1.6;
  position: relative;
  z-index: 1;
  box-shadow: inset 0 0 40px rgba(0, 0, 0, 0.25);
}
.tp-log-empty {
  color: var(--c-tx3);
  padding: 2rem;
  text-align: center;
  font-size: 0.8rem;
  letter-spacing: 0.03em;
}
.tp-log-div {
  text-align: center;
  padding: 0.35rem 0;
  margin: 0.3rem 0;
}
.tp-log-div span {
  font-size: 0.64rem;
  color: var(--c-warn);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.5;
  padding: 0.1rem 0.6rem;
  border-top: 1px solid rgba(201, 166, 96, 0.12);
  border-bottom: 1px solid rgba(201, 166, 96, 0.12);
}
.tp-log-row {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0 0.4rem;
  padding: 0.2rem 0;
  border-bottom: 1px solid rgba(50, 44, 54, 0.1);
  cursor: pointer;
  transition: background 0.1s ease;
  user-select: none;
}
.tp-log-row:hover {
  background: rgba(255, 255, 255, 0.02);
}
.tp-log-t {
  flex-shrink: 0;
  color: var(--c-tx3);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.tp-log-l {
  flex-shrink: 0;
  font-weight: 700;
  white-space: nowrap;
}
.tp-log-m {
  flex: 1 1 0;
  min-width: 0;
  color: var(--c-tx);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tp-log-row.expanded .tp-log-m {
  flex-basis: 100%;
  white-space: pre-wrap;
  word-break: break-word;
  overflow: visible;
  text-overflow: unset;
  margin-top: 0.15rem;
  padding: 0.2rem 0 0.1rem 0.5rem;
  border-left: 2px solid rgba(50, 44, 54, 0.3);
  user-select: text;
}
`
