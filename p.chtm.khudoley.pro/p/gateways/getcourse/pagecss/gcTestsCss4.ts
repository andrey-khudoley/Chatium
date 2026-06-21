// @shared
export const gcTestsCss4 = `

.tp-v1ops-accent--success {
  background: var(--c-ok);
}
.tp-v1ops-accent--fail {
  background: var(--c-alert);
}
.tp-v1ops-accent--skip {
  background: var(--c-warn);
}
.tp-v1ops-accent--ready {
  background: rgba(106, 175, 126, 0.55);
}
.tp-v1ops-accent--blocked-availability {
  background: rgba(126, 119, 123, 0.55);
}
.tp-v1ops-accent--warn-heap,
.tp-v1ops-accent--warn-deps {
  background: rgba(201, 166, 96, 0.7);
}
.tp-v1ops-accent--pending {
  background: var(--c-tx3);
  opacity: 0.3;
}

/* Дополнительные тэги статуса сценария рядом с availability. */
.tp-v1ops-tag--st-blocked-availability {
  color: var(--c-tx3);
  border-color: rgba(126, 119, 123, 0.4);
}
.tp-v1ops-tag--st-warn-heap,
.tp-v1ops-tag--st-warn-deps {
  color: var(--c-warn);
  border-color: rgba(201, 166, 96, 0.5);
}

/* Подсказки-блокировки внутри строки. */
.tp-v1ops-block {
  margin: 0.3rem 0 0;
  font-size: 0.74rem;
  padding: 0.35rem 0.5rem;
  border-left: 2px solid;
}
.tp-v1ops-block i {
  margin-right: 0.3rem;
}
.tp-v1ops-block--blocked {
  color: var(--c-tx2);
  border-color: rgba(126, 119, 123, 0.6);
  background: rgba(70, 70, 78, 0.18);
}
.tp-v1ops-block--warn {
  color: var(--c-warn);
  border-color: rgba(201, 166, 96, 0.7);
  background: rgba(201, 166, 96, 0.07);
}
.tp-v1ops-block-link {
  margin-left: 0.5rem;
  color: var(--c-tx);
  border-bottom: 1px dotted var(--c-tx3);
  text-decoration: none;
  font-size: 0.7rem;
}
.tp-v1ops-block-link:hover {
  border-bottom-color: var(--c-tx);
}

/* Заголовки фаз. */
.tp-v1ops-phase {
  margin-top: 0.7rem;
}
.tp-v1ops-phase-hd {
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
  padding: 0.25rem 0.5rem;
  margin-bottom: 0.25rem;
  border-bottom: 1px dashed var(--c-bdr);
}
.tp-v1ops-phase-num {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--c-tx);
  text-transform: uppercase;
}
.tp-v1ops-phase-label {
  font-size: 0.74rem;
  color: var(--c-tx2);
}
.tp-v1ops-phase-count {
  margin-left: auto;
  font-size: 0.68rem;
  color: var(--c-tx3);
}

/* Верхняя панель готовности. */
.tp-v1ops-readiness {
  margin: 0.5rem 0 0.6rem;
  padding: 0.45rem 0.55rem;
  border: 1px solid var(--c-bdr);
  background: var(--c-bg-deep);
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.tp-v1ops-readiness--loading {
  color: var(--c-tx3);
  font-size: 0.74rem;
}
.tp-v1ops-readiness-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  align-items: center;
}
.tp-v1ops-readiness-h {
  font-size: 0.7rem;
  color: var(--c-tx2);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  margin-right: 0.2rem;
}
.tp-v1ops-readiness-tag {
  font-size: 0.68rem;
  padding: 0.12rem 0.4rem;
  border: 1px solid;
  letter-spacing: 0.03em;
}
.tp-v1ops-readiness-tag--ok {
  color: var(--c-ok);
  border-color: rgba(106, 175, 126, 0.4);
}
.tp-v1ops-readiness-tag--warn {
  color: var(--c-warn);
  border-color: rgba(201, 166, 96, 0.5);
}
.tp-v1ops-readiness-tag--blocked {
  color: var(--c-tx3);
  border-color: rgba(126, 119, 123, 0.4);
}
.tp-v1ops-readiness-link {
  margin-left: auto;
  font-size: 0.72rem;
  color: var(--c-tx);
  text-decoration: none;
  border: 1px solid var(--c-bdr);
  padding: 0.18rem 0.45rem;
}
.tp-v1ops-readiness-link:hover {
  border-color: var(--c-bdr-hi);
}
.tp-v1ops-readiness-link i {
  margin-right: 0.25rem;
}
.tp-badge--skip {
  color: var(--c-warn);
  border-color: rgba(201, 166, 96, 0.4);
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
`
