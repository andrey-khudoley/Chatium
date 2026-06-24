// @shared
// CSS broker ops-панели админки, часть 2: ячейки, статус-метки, теги, адаптив.
export const brokerOpsCss2 = `
.brk-cell-main {
  color: var(--c-tx);
  font-weight: 600;
}
.brk-cell-sub {
  color: var(--c-tx3);
  font-size: 0.7rem;
  word-break: break-all;
}
.brk-cell-summary {
  max-width: 22rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.brk-cell-err {
  color: var(--c-alert);
  font-size: 0.68rem;
  max-width: 22rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 0.15rem;
}
.brk-num {
  font-variant-numeric: tabular-nums;
  text-align: right;
}

/* ── STATUS PILLS ── */
.brk-st {
  display: inline-block;
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  padding: 0.08rem 0.4rem;
  border: 1px solid var(--c-bdr);
  text-transform: lowercase;
  white-space: nowrap;
}
.brk-st--ok {
  color: var(--c-ok);
  border-color: rgba(106, 175, 126, 0.4);
}
.brk-st--err {
  color: var(--c-alert);
  border-color: rgba(217, 122, 138, 0.4);
}
.brk-st--warn {
  color: var(--c-warn);
  border-color: rgba(201, 166, 96, 0.4);
}
.brk-st--info {
  color: var(--c-red-s);
  border-color: rgba(217, 86, 114, 0.35);
}
.brk-st--muted {
  color: var(--c-tx3);
  border-color: var(--c-bdr);
}

.brk-tag {
  display: inline-block;
  margin-left: 0.3rem;
  font-size: 0.58rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--c-tx3);
  padding: 0.04rem 0.3rem;
  border: 1px dashed rgba(80, 75, 82, 0.5);
}

@media (max-width: 1100px) {
  .brk-table-scroll {
    max-height: none;
  }
}
@media (max-width: 680px) {
  .brk-toolbar {
    flex-direction: column;
    align-items: stretch;
  }
  .brk-toolbar-right {
    justify-content: space-between;
  }
  .brk-cell-summary,
  .brk-cell-err {
    max-width: 12rem;
  }
}
`
