// @shared
// CSS broker ops-панели админки, часть 1: контейнер, вкладки, тулбар, таблица.
// Классы .brk-* живут внутри .ap и наследуют его CSS-переменные (--c-*).
export const brokerOpsCss1 = `
.brk-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.brk-hd-right {
  display: flex;
  align-items: center;
  gap: 0.55rem;
}

/* ── TABS ── */
.brk-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-bottom: 0.6rem;
  position: relative;
  z-index: 1;
}
.brk-tab {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  width: auto;
  padding: 0.35rem 0.6rem;
}
.brk-tab i {
  font-size: 0.62rem;
  opacity: 0.7;
}
.brk-tab-ct {
  font-size: 0.62rem;
  padding: 0.02rem 0.3rem;
  border: 1px solid var(--c-bdr);
  background: rgba(10, 9, 12, 0.7);
  color: var(--c-tx3);
  font-variant-numeric: tabular-nums;
}
.brk-tab.active .brk-tab-ct {
  color: #fff;
  border-color: var(--c-red-s);
}

/* ── TOOLBAR ── */
.brk-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.6rem;
}
.brk-filter {
  flex: 1 1 14rem;
  font-size: 0.8rem;
}
.brk-toolbar-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.brk-limit-label {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--c-tx3);
}
.brk-limit {
  width: 4.5rem;
  font-size: 0.8rem;
  padding: 0.35rem 0.45rem;
}

/* ── TABLE ── */
.brk-body {
  min-height: 0;
}
.brk-table-scroll {
  overflow-x: auto;
  overflow-y: auto;
  max-height: 46vh;
  border: 1px solid rgba(50, 44, 54, 0.35);
  background: rgba(5, 4, 7, 0.98);
}
.brk-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.76rem;
  min-width: 560px;
}
.brk-table thead th {
  position: sticky;
  top: 0;
  z-index: 2;
  background: var(--c-bg-deep);
  color: var(--c-tx3);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-size: 0.64rem;
  text-align: left;
  padding: 0.5rem 0.6rem;
  border-bottom: 1px solid var(--c-bdr);
  white-space: nowrap;
}
.brk-table tbody td {
  padding: 0.45rem 0.6rem;
  border-bottom: 1px solid rgba(50, 44, 54, 0.18);
  color: var(--c-tx);
  vertical-align: top;
}
.brk-table tbody tr:hover td {
  background: rgba(255, 255, 255, 0.02);
}
.brk-th-act {
  text-align: right;
  white-space: nowrap;
}
.brk-act-group {
  display: inline-flex;
  gap: 0.35rem;
  justify-content: flex-end;
  flex-wrap: wrap;
}
.brk-empty {
  text-align: center;
  color: var(--c-tx3);
  padding: 1.5rem;
  font-size: 0.8rem;
  letter-spacing: 0.03em;
}
`
