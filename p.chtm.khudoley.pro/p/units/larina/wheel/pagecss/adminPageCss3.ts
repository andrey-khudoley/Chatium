// @shared
export const adminPageCss3 = `
.ap-badge i {
  font-size: 0.55rem;
  margin-right: 0.1rem;
}
@keyframes ap-badge-flash {
  0% {
    opacity: 0;
    transform: scale(0.85);
  }
  50% {
    transform: scale(1.04);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}
.ap-badge--ok {
  color: var(--c-ok);
  border-color: rgba(106, 175, 126, 0.4);
}
.ap-badge--err {
  color: var(--c-alert);
  border-color: rgba(217, 122, 138, 0.4);
}

.ap-err {
  margin: 0.4rem 0 0;
  color: var(--c-alert);
  font-size: 0.76rem;
  position: relative;
  z-index: 1;
}
.ap-err i {
  margin-right: 0.2rem;
  font-size: 0.65rem;
}

/* ── LOG MONITOR: высота = ячейка сетки (ровно ряд между шапкой страницы и футером); движется только список в .ap-log-out ── */
.ap-side {
  min-width: 0;
  min-height: 0;
  width: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.ap-logs {
  position: relative;
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.ap-log-ct {
  font-size: 0.7rem;
  color: var(--c-tx3);
  letter-spacing: 0.04em;
  font-variant-numeric: tabular-nums;
}
.ap-log-filters {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.4rem;
  margin-bottom: 0.6rem;
  position: relative;
  z-index: 1;
  flex-shrink: 0;
}
.ap-logs > .ap-card-hd {
  flex-shrink: 0;
}
.ap-flt {
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
.ap-flt::after {
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
.ap-flt:hover {
  border-color: var(--c-bdr-hi);
}
.ap-flt:hover::after {
  transform: scaleX(1);
}
.ap-flt.active {
  border-color: var(--c-red-s);
  background: rgba(196, 33, 63, 0.12);
  color: #fff;
}
.ap-flt.active::after {
  transform: scaleX(1);
}

.ap-log-out {
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
.ap-log-empty {
  color: var(--c-tx3);
  padding: 2rem;
  text-align: center;
  font-size: 0.8rem;
  letter-spacing: 0.03em;
}
.ap-log-div {
  text-align: center;
  padding: 0.35rem 0;
  margin: 0.3rem 0;
}
.ap-log-div span {
  font-size: 0.64rem;
  color: var(--c-warn);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.5;
  padding: 0.1rem 0.6rem;
  border-top: 1px solid rgba(201, 166, 96, 0.12);
  border-bottom: 1px solid rgba(201, 166, 96, 0.12);
}
.ap-log-row {
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
.ap-log-row:hover {
  background: rgba(255, 255, 255, 0.02);
}
.ap-log-t {
  flex-shrink: 0;
  color: var(--c-tx3);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.ap-log-l {
  flex-shrink: 0;
  font-weight: 700;
  white-space: nowrap;
}
.ap-log-m {
  flex: 1 1 0;
  min-width: 0;
  color: var(--c-tx);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ap-log-row.expanded .ap-log-m {
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

.lvl-debug {
  color: #7e767a;
}
.lvl-info {
  color: var(--c-tx2);
}
.lvl-notice {
  color: #8bb89c;
}
.lvl-warning {
  color: var(--c-warn);
}
.lvl-error,
.lvl-critical,
.lvl-alert,
.lvl-emergency {
  color: var(--c-alert);
}

.ap-log-ft {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  position: relative;
  z-index: 1;
  flex-shrink: 0;
}
.ap-log-sync {
  font-size: 0.74rem;
  color: var(--c-tx2);
  display: flex;
  align-items: center;
  gap: 0.35rem;
}
.ap-log-sync i {
  font-size: 0.62rem;
}
.ap-log-btns {
  display: flex;
  gap: 0.4rem;
}
.ap-log-btns .ap-btn:first-child {
  flex: 1;
}

@media (max-width: 1100px) {
  .ap-wrap {
    overflow-y: auto;
  }
  .ap {
    flex: none;
    min-height: auto;
    overflow: visible;
  }
  .ap-grid {
    flex: none;
    grid-template-columns: 1fr;
    grid-template-rows: auto auto;
    min-height: auto;
    align-items: start;
  }
  .ap-main {
    overflow: visible;
  }
  .ap-side {
    overflow: visible;
  }
  .ap-logs {
    flex: none;
  }
  .ap-log-out {
    min-height: 240px;
    max-height: 420px;
    flex: none;
  }
}
@media (max-width: 680px) {
  .ap {
    padding: 0.5rem 0.625rem 1rem;
  }
  .ap-cfg-row {
    grid-template-columns: 1fr;
  }
  .ap-meters {
    grid-template-columns: 1fr;
  }
  .ap-log-filters {
    grid-template-columns: repeat(2, 1fr);
  }
  .ap-log-row {
    grid-template-columns: 1fr;
    gap: 0.1rem;
  }
  .ap-status {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.35rem;
  }
  .ap-lvls {
    grid-template-columns: repeat(2, 1fr);
  }
}
`
