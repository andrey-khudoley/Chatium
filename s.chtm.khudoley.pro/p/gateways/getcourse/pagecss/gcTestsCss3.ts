// @shared
export const gcTestsCss3 = `
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

/* ── V1 OPS SECTION ── */
.tp-v1ops {
  margin-top: 0.85rem;
}
.tp-v1ops-metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem 0.85rem;
  margin: 0.5rem 0 0.6rem;
  font-size: 0.72rem;
  color: var(--c-tx2);
  position: relative;
  z-index: 1;
}
.tp-v1ops-metric {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}
.tp-v1ops-metric i {
  font-size: 0.62rem;
  opacity: 0.65;
}
.tp-v1ops-metric--ok {
  color: var(--c-ok);
}
.tp-v1ops-metric--fail {
  color: var(--c-alert);
}
.tp-v1ops-metric--skip {
  color: var(--c-warn);
}
.tp-v1ops-time {
  margin-left: auto;
  font-variant-numeric: tabular-nums;
}

.tp-v1ops-method {
  font-weight: 700;
  color: var(--c-tx);
  margin-right: 0.35rem;
  letter-spacing: 0.04em;
  font-size: 0.72rem;
}
.tp-v1ops-op {
  font-family: inherit;
  font-size: 0.78rem;
  color: var(--c-tx);
  background: rgba(196, 33, 63, 0.08);
  border: 1px solid rgba(196, 33, 63, 0.2);
  padding: 0.05rem 0.35rem;
  margin-right: 0.4rem;
}
.tp-v1ops-tag {
  font-size: 0.62rem;
  padding: 0.05rem 0.3rem;
  border: 1px solid var(--c-bdr);
  margin-right: 0.25rem;
  letter-spacing: 0.04em;
  color: var(--c-tx2);
  text-transform: uppercase;
}
.tp-v1ops-tag--contour {
  color: var(--c-cyan);
  border-color: rgba(125, 191, 204, 0.3);
}
.tp-v1ops-tag--av-enabled {
  color: var(--c-ok);
  border-color: rgba(106, 175, 126, 0.3);
}
.tp-v1ops-tag--av-beta {
  color: var(--c-warn);
  border-color: rgba(201, 166, 96, 0.4);
}
.tp-v1ops-tag--av-disabled {
  color: var(--c-tx3);
  border-color: rgba(126, 119, 123, 0.3);
  opacity: 0.7;
}
.tp-v1ops-tag--av-unsupported {
  color: var(--c-alert);
  border-color: rgba(217, 122, 138, 0.3);
  opacity: 0.7;
}

.tp-v1ops-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem 0.7rem;
  margin-top: 0.25rem;
  font-size: 0.7rem;
  color: var(--c-tx3);
  font-variant-numeric: tabular-nums;
}
.tp-v1ops-meta-item {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
}
.tp-v1ops-meta-err {
  color: var(--c-alert);
}
.tp-v1ops-meta-req {
  font-family: inherit;
  opacity: 0.85;
}

.tp-v1ops-hint {
  margin: 0.25rem 0 0;
  font-size: 0.72rem;
  color: var(--c-tx3);
  font-style: italic;
}
.tp-v1ops-hint--idle {
  opacity: 0.6;
}

.tp-v1ops-toggle {
  margin-top: 0.3rem;
  padding: 0.2rem 0.45rem;
  border: 1px solid var(--c-bdr);
  background: var(--c-bg-deep);
  color: var(--c-tx2);
  font-family: inherit;
  font-size: 0.7rem;
  cursor: pointer;
  letter-spacing: 0.03em;
}
.tp-v1ops-toggle:hover {
  border-color: var(--c-bdr-hi);
  color: var(--c-tx);
}
.tp-v1ops-toggle i {
  font-size: 0.6rem;
  margin-right: 0.25rem;
}

.tp-v1ops-payload {
  margin-top: 0.4rem;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}
.tp-v1ops-payload-block {
  border: 1px solid var(--c-bdr);
  background: rgba(5, 4, 7, 0.95);
}
.tp-v1ops-payload-h {
  padding: 0.25rem 0.5rem;
  border-bottom: 1px solid var(--c-bdr);
  font-size: 0.66rem;
  color: var(--c-tx3);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  background: var(--c-bg-deep);
}
.tp-v1ops-payload pre {
  margin: 0;
  padding: 0.5rem 0.65rem;
  max-height: 22rem;
  overflow: auto;
  font-family: inherit;
  font-size: 0.72rem;
  color: var(--c-tx);
  white-space: pre-wrap;
  word-break: break-word;
}

.tp-test--skip {
  border-color: rgba(201, 166, 96, 0.25);
}
.tp-test--skip:hover {
  border-color: rgba(201, 166, 96, 0.45);
}
.tp-test-accent--skip {
  background: var(--c-warn);
}

/*
 * Визуальные состояния строк сценариев /v1/{op} (gateway-testing-strategy.md §9):
 *   - blocked-availability — нейтральный серый фон, акцент серый, кнопка disabled (§9.1);
 *   - warn-heap — приглушённый янтарный фон + жёлтая боковая полоса (§9.3);
 *   - warn-deps — тот же оттенок (зависимости нет), чуть слабее;
 *   - ready — обычный фон, нормальная активная кнопка.
 */
.tp-v1ops-row {
  transition:
    background-color 0.18s ease,
    border-color 0.18s ease;
}
.tp-v1ops-row--blocked-availability {
  background: rgba(70, 70, 78, 0.28);
  border-color: rgba(126, 119, 123, 0.3);
}
.tp-v1ops-row--blocked-availability:hover {
  border-color: rgba(126, 119, 123, 0.5);
}
.tp-v1ops-row--blocked-availability .tp-v1ops-method,
.tp-v1ops-row--blocked-availability .tp-v1ops-op,
.tp-v1ops-row--blocked-availability .tp-test-name {
  opacity: 0.7;
}
.tp-v1ops-row--warn-heap,
.tp-v1ops-row--warn-deps {
  background: rgba(201, 166, 96, 0.12);
  border-color: rgba(201, 166, 96, 0.3);
}
.tp-v1ops-row--warn-heap:hover,
.tp-v1ops-row--warn-deps:hover {
  border-color: rgba(201, 166, 96, 0.55);
}
.tp-v1ops-row--ready {
  /* обычный фон */
}
.tp-v1ops-row--success {
  border-color: rgba(106, 175, 126, 0.3);
}
.tp-v1ops-row--fail {
  border-color: rgba(217, 122, 138, 0.4);
}
`
