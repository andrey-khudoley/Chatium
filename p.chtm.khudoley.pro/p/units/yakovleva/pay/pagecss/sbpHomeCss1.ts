// @shared
export const sbpHomeCss1 = `
.app-layout {
  min-height: 100vh;
  background: transparent;
  position: relative;
}

/* ====== Управление доступом ====== */
.access-block {
  margin-bottom: 2rem;
}
.access-block-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.75rem;
}
.access-block-head h3 {
  margin: 0;
  font-size: 1rem;
  color: var(--color-text, #e8e8e8);
}
.access-block-head h3 i {
  color: var(--color-accent, #d3234b);
  margin-right: 0.4rem;
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

/* ===================== STATUS STRIP ===================== */
.status-strip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.65rem 1rem;
  background: rgba(20, 20, 20, 0.6);
  border: 1px solid var(--color-border);
  flex-wrap: wrap;
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
.status-chips {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.7rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 0.25rem 0.6rem;
  border: 1px solid var(--color-border);
  background: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
}
.chip i {
  font-size: 0.7rem;
}
.chip.is-ok {
  color: #b5dec1;
  border-color: rgba(106, 175, 126, 0.35);
  background: rgba(106, 175, 126, 0.08);
}
.chip.is-warn {
  color: #f0c989;
  border-color: rgba(212, 168, 90, 0.4);
  background: rgba(212, 168, 90, 0.08);
}
.config-status {
  position: relative;
  cursor: default;
}
.config-status-tooltip {
  position: absolute;
  top: calc(100% + 0.4rem);
  left: 0;
  z-index: 50;
  min-width: 200px;
  padding: 0.5rem 0.7rem;
  background: var(--color-bg);
  border: 1px solid rgba(212, 168, 90, 0.4);
  color: var(--color-text);
  text-transform: none;
  letter-spacing: normal;
  font-size: 0.72rem;
  text-align: left;
  opacity: 0;
  visibility: hidden;
  transform: translateY(-4px);
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
  pointer-events: none;
}
.config-status:hover .config-status-tooltip,
.config-status:focus-visible .config-status-tooltip {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}
.config-status-tooltip-title {
  display: block;
  margin-bottom: 0.35rem;
  color: #f0c989;
}
.config-status-tooltip ul {
  margin: 0;
  padding-left: 1rem;
  list-style: disc;
}
.config-status-tooltip li {
  line-height: 1.5;
}

.status-webhook {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.7rem;
  color: var(--color-text-tertiary);
  letter-spacing: 0.05em;
  flex: 1 1 380px;
  min-width: 0;
  justify-content: flex-end;
}
.status-webhook-label {
  text-transform: uppercase;
  white-space: nowrap;
}
.status-webhook-label i {
  margin-right: 0.3rem;
  color: var(--color-accent);
}
.status-webhook-url {
  color: var(--color-text);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  padding: 0.2rem 0.5rem;
  font-size: 0.7rem;
  max-width: 100%;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 0 1 auto;
}

/* ===================== TOOLBAR ===================== */
.panel-toolbar {
  display: flex;
  flex-direction: column;
  padding: 0 0.75rem;
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
.toolbar-row {
  display: flex;
  align-items: center;
  width: 100%;
}
.toolbar-row--sections {
  padding: 0.6rem 0 0.5rem;
}
.toolbar-row--tabs {
  padding: 0.5rem 0;
  border-top: 1px solid var(--color-border-light);
}
.toolbar-row--tools {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
  width: 100%;
  padding: 0.5rem 0;
  border-top: 1px solid var(--color-border-light);
}
.panel-tabs {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  align-items: center;
}
/* ── Первичные разделы (верхний уровень навигации) ── */
.panel-sections {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  align-items: center;
}
.section-tab {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
  padding: 0.55rem 1.1rem;
  font-family: inherit;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  font-size: 0.78rem;
  font-weight: 600;
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
.section-tab i {
  color: var(--color-accent);
  font-size: 0.95em;
}
.section-tab:hover {
  color: var(--color-text);
  border-color: var(--color-border-light);
  transform: translateY(-1px);
}
.section-tab.active {
  color: var(--color-text);
  border-color: var(--color-accent);
  background: var(--color-accent-light);
  box-shadow: inset 0 -2px 0 var(--color-accent);
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
.tab::before {
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.1) 0px,
    rgba(0, 0, 0, 0.1) 1px,
    transparent 1px,
    transparent 2px
  );
  pointer-events: none;
  z-index: 0;
}
.tab::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background: var(--color-accent);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.3s ease;
  z-index: 2;
}
.tab i,
.tab span {
  position: relative;
  z-index: 2;
}
.tab:hover {
  color: var(--color-text);
  border-color: var(--color-border-light);
  transform: translateY(-1px);
}
.tab:hover::after {
  transform: scaleX(1);
}
.tab.active {
  color: var(--color-text);
  border-color: var(--color-accent);
  background: var(--color-accent-light);
}
.tab.active::after {
  transform: scaleX(1);
}

/* live toggle */
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
.live-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: #4a4a4a;
  box-shadow: 0 0 0 2px rgba(74, 74, 74, 0.15);
  transition:
    background 0.2s,
    box-shadow 0.2s;
}
.live-toggle.on {
  color: var(--color-text);
  border-color: var(--color-accent);
  background: var(--color-accent-light);
}
.live-toggle.on .live-dot {
  background: #d97a8a;
  box-shadow: 0 0 0 2px rgba(217, 122, 138, 0.2);
  animation: live-pulse 1.5s ease-in-out infinite;
}
@keyframes live-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.55;
  }
}
`
