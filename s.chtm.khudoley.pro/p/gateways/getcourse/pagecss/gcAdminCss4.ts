// @shared
export const gcAdminCss4 = `

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
