// @shared
export const gcHomeCss1 = `
/* === Layout === */
.app-layout {
  min-height: 100vh;
  background: transparent;
  position: relative;
}
.content-wrapper {
  padding: 1.5rem 0 2rem;
}
.content-inner {
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

/* === Toolbar === */
.panel-toolbar {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.5rem 0.75rem;
  flex-wrap: wrap;
  background: rgba(20, 20, 20, 0.65);
  border: 1px solid var(--color-border);
  clip-path: polygon(
    0 3px,
    3px 3px,
    3px 0,
    calc(100% - 3px) 0,
    calc(100% - 3px) 3px,
    100% 3px,
    100% calc(100% - 3px),
    calc(100% - 3px) calc(100% - 3px),
    calc(100% - 3px) 100%,
    3px 100%,
    3px calc(100% - 3px),
    0 calc(100% - 3px)
  );
}
.panel-tabs {
  display: flex;
  gap: 0.35rem;
  flex-wrap: wrap;
}
.tab {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  background: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
  padding: 0.45rem 0.85rem;
  font-family: inherit;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-size: 0.72rem;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition:
    color 0.2s ease,
    border-color 0.2s ease,
    transform 0.2s ease,
    background 0.2s ease;
  clip-path: polygon(
    0 3px,
    3px 3px,
    3px 0,
    calc(100% - 3px) 0,
    calc(100% - 3px) 3px,
    100% 3px,
    100% calc(100% - 3px),
    calc(100% - 3px) calc(100% - 3px),
    calc(100% - 3px) 100%,
    3px 100%,
    3px calc(100% - 3px),
    0 calc(100% - 3px)
  );
}
.tab.active {
  color: var(--color-text);
  border-color: var(--color-accent);
  background: var(--color-accent-light);
}
.panel-toolbar-right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.live-toggle {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 0.4rem;
  cursor: pointer;
  user-select: none;
  font-size: 0.7rem;
  letter-spacing: 0.1em;
  color: var(--color-text-tertiary);
  padding: 0.3rem 0.6rem;
  border: 1px solid var(--color-border);
  background: var(--color-bg-tertiary);
}
.live-toggle input {
  display: none;
}
.live-toggle .live-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-text-tertiary);
}
.live-toggle.on .live-dot {
  background: #d97a8a;
  box-shadow: 0 0 0 2px rgba(217, 122, 138, 0.2);
  animation: live-pulse 1.5s ease-in-out infinite;
}
.live-label {
  font-size: 0.75rem;
  letter-spacing: 0.1em;
  color: var(--color-text-secondary);
}

/* === Date filter bar === */
.filter-bar {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  background: rgba(20, 20, 20, 0.6);
  border: 1px solid var(--color-border);
  padding: 0.65rem 0.9rem;
  clip-path: polygon(
    0 3px,
    3px 3px,
    3px 0,
    calc(100% - 3px) 0,
    calc(100% - 3px) 3px,
    100% 3px,
    100% calc(100% - 3px),
    calc(100% - 3px) calc(100% - 3px),
    calc(100% - 3px) 100%,
    3px 100%,
    3px calc(100% - 3px),
    0 calc(100% - 3px)
  );
}
.filter-group {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}
.filter-label {
  font-size: 0.75rem;
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.filter-label i {
  color: var(--color-accent);
  margin-right: 0.25rem;
}
.filter-input {
  background: var(--color-bg);
  color: var(--color-text);
  border: 1px solid var(--color-border-light);
  padding: 0.3rem 0.5rem;
  font-family: inherit;
  font-size: 0.8rem;
  color-scheme: dark;
}
.filter-time {
  width: 6.5rem;
}
.filter-actions {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  margin-left: auto;
  flex-wrap: wrap;
}
.filter-msg {
  font-size: 0.75rem;
}
.filter-msg.is-err {
  color: var(--color-accent);
}

/* === KPI === */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.9rem;
}
.kpi-grid-secondary {
  grid-template-columns: repeat(4, 1fr);
}
.kpi-card {
  position: relative;
  background: rgba(20, 20, 20, 0.65);
  border: 1px solid var(--color-border);
  padding: 1.1rem 1.25rem;
  overflow: hidden;
  clip-path: polygon(
    0 4px,
    4px 4px,
    4px 0,
    calc(100% - 4px) 0,
    calc(100% - 4px) 4px,
    100% 4px,
    100% calc(100% - 4px),
    calc(100% - 4px) calc(100% - 4px),
    calc(100% - 4px) 100%,
    4px 100%,
    4px calc(100% - 4px),
    0 calc(100% - 4px)
  );
}
.kpi-card.kpi-success {
  border-left: 3px solid var(--color-accent);
}
.kpi-icon {
  font-size: 1rem;
  color: var(--color-accent);
  margin-bottom: 0.4rem;
}
.kpi-label {
  font-size: 0.65rem;
  color: var(--color-text-tertiary);
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.kpi-value {
  font-size: 1.85rem;
  color: var(--color-text);
  margin-top: 0.3rem;
  text-shadow: 0 0 8px rgba(232, 232, 232, 0.2);
  line-height: 1;
}
.stat-card {
  position: relative;
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  padding: 0.7rem 0.85rem;
  overflow: hidden;
  clip-path: polygon(
    0 3px,
    3px 3px,
    3px 0,
    calc(100% - 3px) 0,
    calc(100% - 3px) 3px,
    100% 3px,
    100% calc(100% - 3px),
    calc(100% - 3px) calc(100% - 3px),
    calc(100% - 3px) 100%,
    3px 100%,
    3px calc(100% - 3px),
    0 calc(100% - 3px)
  );
}
.stat-label {
  font-size: 0.65rem;
  color: var(--color-text-tertiary);
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.stat-label i {
  margin-right: 0.3rem;
  color: var(--color-accent);
  opacity: 0.85;
}
.stat-value {
  font-size: 1.2rem;
  color: var(--color-text);
  margin-top: 0.15rem;
  line-height: 1.1;
}
.stat-value.small {
  font-size: 0.95rem;
}
.stat-unit {
  font-size: 0.7rem;
  color: var(--color-text-tertiary);
  margin-left: 0.15rem;
}
.kpi-unit {
  font-size: 0.85rem;
  color: var(--color-text-tertiary);
  margin-left: 0.1rem;
}

/* === Admin summary === */
.admin-summary .kpi-grid + .kpi-grid {
  margin-top: 0.9rem;
}
`
