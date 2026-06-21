// @shared
export const gcTestsCss5 = `
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

.tp-log-ft {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  position: relative;
  z-index: 1;
  flex-shrink: 0;
}
.tp-log-sync {
  font-size: 0.74rem;
  color: var(--c-tx2);
  display: flex;
  align-items: center;
  gap: 0.35rem;
}
.tp-log-sync i {
  font-size: 0.62rem;
}
.tp-log-btns {
  display: flex;
  gap: 0.4rem;
}
.tp-log-btns .tp-btn:first-child {
  flex: 1;
}

@media (max-width: 1180px) {
  .tp-wrap {
    overflow-y: auto;
  }
  .tp {
    flex: none;
    min-height: auto;
    overflow: visible;
  }
  .tp-grid,
  .tp-grid--logs {
    flex: none;
    grid-template-columns: 1fr;
    grid-template-rows: auto auto;
    min-height: auto;
    align-items: start;
  }
  .tp-main {
    overflow: visible;
  }
  .tp-side {
    overflow: visible;
  }
  .tp-log-card {
    flex: none;
  }
  .tp-log-out {
    flex: none;
    min-height: 240px;
    max-height: 420px;
  }
}
@media (max-width: 720px) {
  .tp {
    padding: 0.5rem 0.625rem 1rem;
  }
  .tp-toolbar {
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
  }
  .tp-toolbar-left,
  .tp-toolbar-right {
    justify-content: space-between;
  }
  .tp-metrics {
    grid-template-columns: repeat(2, 1fr);
  }
  .tp-log-filters {
    grid-template-columns: repeat(2, 1fr);
  }
  .tp-log-row {
    grid-template-columns: 1fr;
    gap: 0.1rem;
  }
  .tp-test-main {
    grid-template-columns: auto minmax(0, 1fr) 1.6rem;
  }
}
`
