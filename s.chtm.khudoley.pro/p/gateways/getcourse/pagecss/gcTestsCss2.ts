// @shared
export const gcTestsCss2 = `
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

/* ── TEST ROWS ── */
.tp-tests {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-top: 0.45rem;
  position: relative;
  z-index: 1;
}
.tp-test {
  display: flex;
  overflow: hidden;
  border: 1px solid var(--c-bdr);
  background: var(--c-bg-deep);
  transition: border-color 0.2s ease;
}
.tp-test:hover {
  border-color: var(--c-bdr-hi);
}
.tp-test--success {
  border-color: rgba(106, 175, 126, 0.2);
}
.tp-test--success:hover {
  border-color: rgba(106, 175, 126, 0.4);
}
.tp-test--fail {
  border-color: rgba(217, 122, 138, 0.25);
}
.tp-test--fail:hover {
  border-color: rgba(217, 122, 138, 0.45);
}
.tp-test-accent {
  width: 3px;
  flex-shrink: 0;
}
.tp-test-accent--success {
  background: var(--c-ok);
}
.tp-test-accent--fail {
  background: var(--c-alert);
}
.tp-test-accent--pending {
  background: var(--c-tx3);
  opacity: 0.3;
}
.tp-test-content {
  flex: 1;
  min-width: 0;
  padding: 0.4rem 0.55rem;
}
.tp-test-main {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) 1.8rem;
  gap: 0.45rem;
  align-items: center;
}

.tp-badge {
  font-size: 0.6rem;
  padding: 0.1rem 0.3rem;
  border: 1px solid;
  font-weight: 700;
  letter-spacing: 0.06em;
  line-height: 1.3;
}
.tp-badge--success {
  color: var(--c-ok);
  border-color: rgba(106, 175, 126, 0.4);
}
.tp-badge--fail {
  color: var(--c-alert);
  border-color: rgba(217, 122, 138, 0.4);
}
.tp-badge--pending {
  color: var(--c-tx3);
  border-color: rgba(92, 86, 89, 0.3);
}

.tp-test-name {
  color: var(--c-tx);
  font-size: 0.8rem;
  min-width: 0;
}
.tp-test-run {
  width: 1.8rem;
  height: 1.8rem;
  border: 1px solid var(--c-bdr);
  background: var(--c-bg-deep);
  color: var(--c-tx2);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
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
.tp-test-run i {
  font-size: 0.55rem;
}
.tp-test-run:hover:not(:disabled) {
  border-color: var(--c-red-s);
  color: #fff;
  background: rgba(196, 33, 63, 0.15);
}
.tp-test-run:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
.tp-test-id {
  display: block;
  margin-top: 0.2rem;
  font-size: 0.64rem;
  color: var(--c-tx3);
  letter-spacing: 0.03em;
  font-family: inherit;
}
.tp-test-err {
  margin: 0.25rem 0 0;
  font-size: 0.74rem;
  color: var(--c-alert);
}
.tp-test-err i {
  font-size: 0.62rem;
  margin-right: 0.15rem;
}

/* ── BUTTONS ── */
.tp-btn {
  padding: 0.42rem 0.8rem;
  border: 1px solid var(--c-bdr);
  background: var(--c-bg-deep);
  color: var(--c-tx);
  font-family: inherit;
  font-size: 0.76rem;
  cursor: pointer;
  transition: all 0.15s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  white-space: nowrap;
  letter-spacing: 0.03em;
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
`
