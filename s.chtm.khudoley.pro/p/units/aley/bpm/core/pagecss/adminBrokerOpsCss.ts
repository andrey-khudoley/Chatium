// @shared
export const adminBrokerOpsCss = `
.broker-panel {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.broker-filters {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.45rem;
  position: relative;
  z-index: 1;
}
.broker-tabs {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0.45rem;
  position: relative;
  z-index: 1;
}
.broker-table-wrap {
  position: relative;
  z-index: 1;
  min-width: 0;
  overflow-x: auto;
  border: 1px solid rgba(50, 44, 54, 0.35);
  background: rgba(5, 4, 7, 0.84);
}
.broker-table {
  width: 100%;
  min-width: 920px;
  border-collapse: collapse;
  font-size: 0.72rem;
}
.broker-table th,
.broker-table td {
  padding: 0.5rem;
  border-bottom: 1px solid rgba(50, 44, 54, 0.35);
  text-align: left;
  vertical-align: top;
}
.broker-table th {
  color: var(--c-tx3);
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  background: rgba(12, 11, 14, 0.98);
}
.broker-table td {
  color: var(--c-tx2);
}
.broker-table strong,
.broker-table span {
  display: block;
}
.broker-table strong {
  color: var(--c-tx);
  font-weight: 600;
  word-break: break-word;
}
.broker-table span {
  color: var(--c-tx3);
  word-break: break-word;
}
.broker-actions {
  white-space: nowrap;
}
.broker-actions .ap-btn {
  margin: 0 0.25rem 0.25rem 0;
}
.broker-empty {
  padding: 1rem !important;
  text-align: center !important;
  color: var(--c-tx3) !important;
}
.broker-pill {
  display: inline-flex;
  width: max-content;
  padding: 0.12rem 0.35rem;
  border: 1px solid var(--c-bdr);
  color: var(--c-tx2) !important;
  font-size: 0.64rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.broker-pill--ok {
  color: var(--c-ok) !important;
  border-color: rgba(106, 175, 126, 0.42);
}
.broker-pill--warn {
  color: var(--c-warn) !important;
  border-color: rgba(201, 166, 96, 0.42);
}
.broker-pill--off {
  color: var(--c-alert) !important;
  border-color: rgba(217, 122, 138, 0.42);
}
.broker-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}
.broker-summary span {
  display: inline-flex;
  width: max-content;
  max-width: 20rem;
  padding: 0.1rem 0.3rem;
  border: 1px solid rgba(50, 44, 54, 0.45);
  background: rgba(12, 11, 14, 0.8);
  color: var(--c-tx2);
  overflow: hidden;
  text-overflow: ellipsis;
}
@media (max-width: 900px) {
  .broker-tabs {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .broker-filters {
    grid-template-columns: 1fr;
  }
}
`
