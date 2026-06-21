// @shared
export const testsPageCss4 = `

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
