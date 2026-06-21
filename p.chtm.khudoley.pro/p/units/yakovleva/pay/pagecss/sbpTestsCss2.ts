// @shared
export const sbpTestsCss2 = `
/* ── METRICS ── */
.tp-metrics {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.55rem;
  animation: tp-enter 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.1s both;
}
@keyframes tp-enter {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
.tp-metric {
  border: 1px solid var(--c-bdr);
  background: linear-gradient(175deg, var(--c-bg), var(--c-bg2));
  padding: 0.55rem 0.7rem;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  position: relative;
  overflow: hidden;
  transition: border-color 0.25s ease;
}
.tp-metric::after {
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
.tp-metric-accent {
  position: absolute;
  top: 0;
  left: 0;
  width: 3px;
  height: 100%;
}
.tp-metric-icon {
  font-size: 0.6rem;
  color: var(--c-tx3);
  opacity: 0.7;
  position: relative;
  z-index: 1;
  margin-bottom: 0.15rem;
}
.tp-metric-icon--pass {
  color: var(--c-ok);
  opacity: 0.75;
}
.tp-metric-icon--fail {
  color: var(--c-alert);
  opacity: 0.75;
}
.tp-metric-icon--skip {
  color: var(--c-warn);
  opacity: 0.75;
}
.tp-metric strong {
  font-size: 1.35rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1.15;
  color: var(--c-tx);
  position: relative;
  z-index: 1;
}
.tp-metric span {
  font-size: 0.66rem;
  color: var(--c-tx3);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  position: relative;
  z-index: 1;
}

.tp-metric--pass .tp-metric-accent {
  background: var(--c-ok);
}
.tp-metric--pass strong {
  color: var(--c-ok);
}
.tp-metric--pass {
  border-color: rgba(106, 175, 126, 0.2);
}
.tp-metric--pass:hover {
  border-color: rgba(106, 175, 126, 0.4);
}

.tp-metric--fail .tp-metric-accent {
  background: var(--c-alert);
}
.tp-metric--fail strong {
  color: var(--c-alert);
}
.tp-metric--fail {
  border-color: rgba(217, 122, 138, 0.2);
}
.tp-metric--fail:hover {
  border-color: rgba(217, 122, 138, 0.4);
}

.tp-metric--skip .tp-metric-accent {
  background: var(--c-warn);
}
.tp-metric--skip strong {
  color: var(--c-warn);
}
.tp-metric--skip {
  border-color: rgba(201, 166, 96, 0.2);
}
.tp-metric--skip:hover {
  border-color: rgba(201, 166, 96, 0.4);
}

/* ── SUITES ── */
.tp-suite {
  border: 1px solid var(--c-bdr);
  background: linear-gradient(175deg, var(--c-bg), var(--c-bg2));
  padding: 0.85rem 1rem;
  position: relative;
  animation: tp-enter 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.2s both;
}
.tp-suite::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent 10%, var(--c-red) 50%, transparent 90%);
  opacity: 0.2;
}
.tp-suite::after {
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
.tp-suite-hd {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.7rem;
  flex-wrap: wrap;
  position: relative;
  z-index: 1;
}
.tp-suite-hd h2 {
  margin: 0;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--c-tx2);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.tp-code {
  border: 1px solid rgba(50, 44, 54, 0.4);
  background: var(--c-bg-deep);
  color: var(--c-tx3);
  padding: 0.18rem 0.45rem;
  font-size: 0.7rem;
  letter-spacing: 0.03em;
  font-family: inherit;
}

/* ── TEST BLOCKS ── */
.tp-block + .tp-block {
  margin-top: 0.7rem;
}
.tp-block-hd {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.45rem 0.6rem;
  border: 1px solid var(--c-bdr);
  background: var(--c-bg-deep);
  flex-wrap: wrap;
  position: relative;
  z-index: 1;
}
.tp-block-hd--toggle {
  width: 100%;
  box-sizing: border-box;
  cursor: pointer;
  font: inherit;
  color: inherit;
  text-align: left;
}
.tp-block-hd--toggle:hover {
  border-color: var(--c-bdr-hi);
}
.tp-block-hd-title,
.tp-block-hd h3 {
  margin: 0;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--c-tx);
  letter-spacing: 0.03em;
}
.tp-block-info {
  font-size: 0.68rem;
  color: var(--c-tx3);
  letter-spacing: 0.03em;
}
.tp-block-desc {
  margin: 0.4rem 0;
  font-size: 0.76rem;
  color: var(--c-tx2);
  position: relative;
  z-index: 1;
}
`
