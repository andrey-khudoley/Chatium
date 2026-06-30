// @shared
export const adminPageCss3 = `
.ap-badge i {
  font-size: 0.62rem;
  margin-right: 0.15rem;
}
.ap-badge--ok {
  color: var(--c-ok);
  background: var(--c-ok-bg);
  border-color: transparent;
}
.ap-badge--err {
  color: var(--c-red-s);
  background: var(--c-accent-bg);
  border-color: transparent;
}

.ap-err {
  margin: 0.45rem 0 0;
  color: var(--c-red-s);
  font-size: 0.78rem;
  display: flex;
  align-items: baseline;
  gap: 0.35rem;
}
.ap-err i {
  font-size: 0.72rem;
}

/* ── LOG MONITOR ── */
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
  font-size: 0.72rem;
  color: var(--c-tx2);
  font-variant-numeric: tabular-nums;
  padding: 0.1rem 0.5rem;
  border-radius: var(--radius-pill);
  background: var(--c-bg-deep);
  border: 1px solid var(--c-bdr);
}
.ap-logs > .ap-card-hd {
  flex-shrink: 0;
}
.ap-log-filters {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.3rem;
  margin-bottom: 0.7rem;
  padding: 0.25rem;
  border: 1px solid var(--c-bdr);
  border-radius: var(--radius);
  background: var(--c-bg-deep);
  flex-shrink: 0;
}
.ap-flt {
  padding: 0.45rem 0.3rem;
  border: none;
  border-radius: calc(var(--radius) - 3px);
  background: transparent;
  color: var(--c-tx2);
  font-family: inherit;
  font-size: 0.72rem;
  font-weight: 500;
  cursor: pointer;
  transition:
    background 0.15s ease,
    color 0.15s ease;
  text-align: center;
}
.ap-flt:hover {
  background: rgba(255, 255, 255, 0.04);
  color: var(--c-tx);
}
.ap-flt.active {
  background: var(--c-accent-bg);
  color: var(--c-red-s);
}

.ap-log-out {
  flex: 1 1 auto;
  min-height: 7rem;
  overflow-y: auto;
  border: 1px solid var(--c-bdr);
  border-radius: var(--radius);
  background: #08080a;
  padding: 0.6rem 0.7rem;
  margin-bottom: 0.6rem;
  font-family: var(--font-mono);
  font-size: 0.74rem;
  line-height: 1.65;
}
.ap-log-empty {
  color: var(--c-tx3);
  padding: 2rem;
  text-align: center;
  font-family: var(--font-ui);
  font-size: 0.82rem;
}
.ap-log-div {
  text-align: center;
  padding: 0.4rem 0;
  margin: 0.3rem 0;
}
.ap-log-div span {
  font-family: var(--font-ui);
  font-size: 0.66rem;
  color: var(--c-tx3);
  letter-spacing: 0.02em;
  padding: 0.1rem 0.6rem;
  border-radius: var(--radius-pill);
  background: var(--c-bg-deep);
  border: 1px solid var(--c-bdr);
}
.ap-log-row {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0 0.45rem;
  padding: 0.22rem 0.3rem;
  border-radius: calc(var(--radius) - 3px);
  cursor: pointer;
  transition: background 0.1s ease;
  user-select: none;
}
.ap-log-row:hover {
  background: rgba(255, 255, 255, 0.04);
}
.ap-log-t {
  flex-shrink: 0;
  color: var(--c-tx3);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.ap-log-l {
  flex-shrink: 0;
  font-weight: 600;
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
  margin-top: 0.2rem;
  padding: 0.3rem 0.5rem;
  border-radius: calc(var(--radius) - 3px);
  background: rgba(255, 255, 255, 0.03);
  border-left: 2px solid var(--c-bdr-hi);
  user-select: text;
}

.lvl-debug {
  color: var(--c-tx3);
}
.lvl-info {
  color: var(--c-tx2);
}
.lvl-notice {
  color: var(--c-ok);
}
.lvl-warning {
  color: var(--c-warn);
}
.lvl-error,
.lvl-critical,
.lvl-alert,
.lvl-emergency {
  color: var(--c-red-s);
}

.ap-log-ft {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
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
  font-size: 0.66rem;
}
.ap-log-btns {
  display: flex;
  gap: 0.45rem;
}
.ap-log-btns .ap-btn:first-child {
  flex: 1;
}

@media (max-width: 1100px) {
  /* Мобайл/планшет: документ/боди на мобиле НЕ скроллятся — у body стоит overflow:hidden
     (оболочка Chatium, body.boot-complete). Поэтому делаем сам .app-layout скролл-контейнером:
     фикс. высота 100dvh + overflow:auto. .ap-wrap/.ap/.ap-grid раскрываются на полную высоту
     (flex:none). overflow задаём shorthand'ом; селектор .app-layout .ap-wrap повышенной
     специфичности перебивает utility-классы .flex-1/.overflow-hidden из платформенного бандла. */
  .app-layout {
    height: 100vh;
    height: 100dvh;
    max-height: 100dvh;
    overflow: hidden auto;
  }
  .app-layout .ap-wrap {
    flex: none;
    overflow: visible;
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
    padding-right: 0;
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
    padding: 0.7rem 0.7rem 1rem;
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
  .ap-status {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.4rem;
  }
  .ap-lvls {
    grid-template-columns: repeat(3, 1fr);
  }
}
`
