// @shared

export const themeBootstrapScript = `
(function () {
  var storageKey = 'knowledge-app-theme'
  var defaultTheme = (window.__DEFAULT_THEME__ === 'light' || window.__DEFAULT_THEME__ === 'dark')
    ? window.__DEFAULT_THEME__
    : 'dark'

  var stored = null
  try {
    stored = localStorage.getItem(storageKey)
  } catch (error) {
    stored = null
  }
  var initialTheme = (stored === 'light' || stored === 'dark') ? stored : defaultTheme

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme)
    if (document.body) {
      document.body.classList.remove('theme-light', 'theme-dark')
      document.body.classList.add('theme-' + theme)
      return
    }

    document.addEventListener('DOMContentLoaded', function () {
      if (!document.body) return
      document.body.classList.remove('theme-light', 'theme-dark')
      document.body.classList.add('theme-' + theme)
    }, { once: true })
  }

  applyTheme(initialTheme)

  if (!stored) {
    try {
      localStorage.setItem(storageKey, initialTheme)
    } catch (error) {
      // ignore storage errors
    }
  }

  window.__setKnowledgeTheme = function (theme) {
    if (theme !== 'light' && theme !== 'dark') return
    try {
      localStorage.setItem(storageKey, theme)
    } catch (error) {
      // ignore storage errors
    }
    applyTheme(theme)
  }
})()
`

export const commonStyles = `
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  html,
  body {
    margin: 0;
    min-height: 100%;
  }

  :root,
  [data-theme='dark'] {
    --kb-bg: #0a0a0a;
    --kb-bg-elev: #111213;
    --kb-bg-soft: #181a1d;
    --kb-bg-hard: #080909;
    --kb-text: #e8e8e8;
    --kb-text-muted: #9ca0a8;
    --kb-text-soft: #6f7580;
    --kb-border: #2d3138;
    --kb-border-soft: #20242a;
    --kb-accent: #d3234b;
    --kb-accent-strong: #ee3b64;
    --kb-accent-soft: rgba(211, 35, 75, 0.16);
    --kb-success: #24c788;
    --kb-warning: #f59f2f;
    --kb-danger: #ea4747;
    --kb-info: #4ea8ff;
    --kb-shadow: 0 24px 70px rgba(0, 0, 0, 0.55);
    --kb-card-shadow: 0 14px 34px rgba(0, 0, 0, 0.38);
    --kb-radius: 14px;
    --kb-radius-sm: 9px;
    --kb-radius-xs: 6px;
  }

  [data-theme='light'] {
    --kb-bg: #f4f5f8;
    --kb-bg-elev: #ffffff;
    --kb-bg-soft: #eceef3;
    --kb-bg-hard: #e3e5eb;
    --kb-text: #10151c;
    --kb-text-muted: #4f5a68;
    --kb-text-soft: #718093;
    --kb-border: #d6dbe5;
    --kb-border-soft: #e7ebf2;
    --kb-accent: #be1c43;
    --kb-accent-strong: #d92b56;
    --kb-accent-soft: rgba(190, 28, 67, 0.13);
    --kb-success: #1d9a6b;
    --kb-warning: #c98014;
    --kb-danger: #ca3434;
    --kb-info: #347dcb;
    --kb-shadow: 0 22px 52px rgba(34, 43, 56, 0.2);
    --kb-card-shadow: 0 12px 28px rgba(34, 43, 56, 0.14);
  }

  body {
    font-family: 'Share Tech Mono', 'Courier New', monospace;
    background: var(--kb-bg);
    color: var(--kb-text);
    line-height: 1.45;
    letter-spacing: 0.02em;
    position: relative;
    overflow-x: hidden;
  }

  body::before {
    content: '';
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: -2;
    background:
      radial-gradient(circle at 12% 12%, rgba(211, 35, 75, 0.16), transparent 34%),
      radial-gradient(circle at 88% 20%, rgba(78, 168, 255, 0.1), transparent 38%),
      radial-gradient(circle at 50% 88%, rgba(211, 35, 75, 0.1), transparent 42%),
      linear-gradient(180deg, var(--kb-bg), var(--kb-bg-hard));
  }

  body::after {
    content: '';
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 9999;
    background: repeating-linear-gradient(
      0deg,
      rgba(255, 255, 255, 0.02) 0px,
      rgba(255, 255, 255, 0.02) 1px,
      transparent 1px,
      transparent 3px
    );
    opacity: 0.2;
  }

  a {
    color: inherit;
  }

  .kb-shell {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .kb-topbar {
    position: sticky;
    top: 0;
    z-index: 40;
    backdrop-filter: blur(8px);
    background: color-mix(in srgb, var(--kb-bg-elev) 86%, transparent);
    border-bottom: 1px solid var(--kb-border-soft);
  }

  .kb-topbar__inner,
  .kb-content,
  .kb-footer__inner {
    width: min(1240px, calc(100% - 2rem));
    margin: 0 auto;
  }

  .kb-topbar__inner {
    min-height: 74px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  .kb-brand {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    min-width: 0;
  }

  .kb-brand__title {
    margin: 0;
    font-size: 1.05rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--kb-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .kb-brand__subtitle {
    margin: 0;
    font-size: 0.78rem;
    color: var(--kb-text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .kb-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .kb-content {
    width: min(1240px, calc(100% - 2rem));
    padding: 1.4rem 0 2rem;
    flex: 1;
  }

  .kb-section-title {
    margin: 0;
    font-size: 1rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--kb-text-muted);
  }

  .kb-btn,
  .kb-input,
  .kb-select,
  .kb-textarea,
  .kb-table,
  .kb-panel,
  .kb-chip {
    font: inherit;
  }

  .kb-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.42rem;
    border-radius: var(--kb-radius-xs);
    border: 1px solid var(--kb-border);
    padding: 0.5rem 0.78rem;
    cursor: pointer;
    text-decoration: none;
    color: var(--kb-text);
    background: var(--kb-bg-soft);
    transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease, transform 0.2s ease;
    white-space: nowrap;
  }

  .kb-btn:hover:not(:disabled) {
    transform: translateY(-1px);
    border-color: color-mix(in srgb, var(--kb-accent) 38%, var(--kb-border));
    box-shadow: 0 9px 18px color-mix(in srgb, var(--kb-accent-soft) 55%, transparent);
  }

  .kb-btn:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .kb-btn--primary {
    background: linear-gradient(135deg, var(--kb-accent), var(--kb-accent-strong));
    border-color: color-mix(in srgb, var(--kb-accent) 70%, #000 30%);
    color: #fff;
  }

  .kb-btn--ghost {
    background: transparent;
  }

  .kb-btn--danger {
    background: color-mix(in srgb, var(--kb-danger) 22%, var(--kb-bg-soft));
    border-color: color-mix(in srgb, var(--kb-danger) 50%, var(--kb-border));
  }

  .kb-btn--tiny {
    padding: 0.35rem 0.56rem;
    font-size: 0.78rem;
  }

  .kb-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.34rem;
    padding: 0.34rem 0.58rem;
    border: 1px solid var(--kb-border);
    border-radius: 999px;
    background: var(--kb-bg-soft);
    color: var(--kb-text-muted);
    font-size: 0.75rem;
    cursor: pointer;
    user-select: none;
    text-decoration: none;
  }

  .kb-chip.is-active {
    color: var(--kb-text);
    border-color: color-mix(in srgb, var(--kb-accent) 50%, var(--kb-border));
    background: color-mix(in srgb, var(--kb-accent-soft) 72%, var(--kb-bg-soft));
  }

  .kb-grid {
    display: grid;
    gap: 1rem;
  }

  .kb-grid--dashboard {
    grid-template-columns: minmax(0, 2fr) minmax(300px, 1fr);
    align-items: start;
  }

  .kb-panel {
    background: linear-gradient(160deg, color-mix(in srgb, var(--kb-bg-elev) 85%, transparent), var(--kb-bg-soft));
    border: 1px solid var(--kb-border-soft);
    border-radius: var(--kb-radius);
    box-shadow: var(--kb-card-shadow);
    padding: 0.95rem;
  }

  .kb-panel--flush {
    padding: 0;
    overflow: hidden;
  }

  .kb-panel__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.8rem;
    margin-bottom: 0.8rem;
  }

  .kb-panel__title {
    margin: 0;
    font-size: 0.87rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--kb-text-muted);
  }

  .kb-toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
    align-items: center;
    margin-bottom: 0.75rem;
  }

  .kb-toolbar__spacer {
    flex: 1;
  }

  .kb-input,
  .kb-select,
  .kb-textarea {
    width: 100%;
    border-radius: var(--kb-radius-xs);
    border: 1px solid var(--kb-border);
    background: var(--kb-bg);
    color: var(--kb-text);
    padding: 0.52rem 0.64rem;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
  }

  .kb-input::placeholder,
  .kb-textarea::placeholder {
    color: var(--kb-text-soft);
  }

  .kb-input:focus,
  .kb-select:focus,
  .kb-textarea:focus {
    outline: none;
    border-color: color-mix(in srgb, var(--kb-accent) 58%, var(--kb-border));
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--kb-accent-soft) 80%, transparent);
  }

  .kb-textarea {
    min-height: 360px;
    resize: vertical;
    line-height: 1.45;
    tab-size: 2;
  }

  .kb-inline-input {
    width: auto;
    min-width: 140px;
  }

  .kb-field {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    margin-bottom: 0.8rem;
  }

  .kb-field__label {
    color: var(--kb-text-muted);
    font-size: 0.76rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .kb-field__hint {
    color: var(--kb-text-soft);
    font-size: 0.72rem;
  }

  .kb-table-wrap {
    overflow: auto;
    border: 1px solid var(--kb-border-soft);
    border-radius: var(--kb-radius-sm);
    background: color-mix(in srgb, var(--kb-bg) 70%, transparent);
  }

  .kb-table {
    width: 100%;
    border-collapse: collapse;
    min-width: 620px;
  }

  .kb-table th,
  .kb-table td {
    padding: 0.58rem 0.62rem;
    border-bottom: 1px solid var(--kb-border-soft);
    text-align: left;
    vertical-align: middle;
    font-size: 0.82rem;
  }

  .kb-table thead th {
    position: sticky;
    top: 0;
    z-index: 1;
    background: color-mix(in srgb, var(--kb-bg-soft) 90%, transparent);
    color: var(--kb-text-muted);
    letter-spacing: 0.07em;
    text-transform: uppercase;
  }

  .kb-table tbody tr:hover {
    background: color-mix(in srgb, var(--kb-accent-soft) 35%, var(--kb-bg-soft));
  }

  .kb-table tbody tr.is-selected {
    background: color-mix(in srgb, var(--kb-accent-soft) 66%, var(--kb-bg-soft));
  }

  .kb-link {
    color: var(--kb-text);
    text-decoration: none;
    border-bottom: 1px dashed color-mix(in srgb, var(--kb-accent) 44%, var(--kb-border));
    transition: color 0.2s ease, border-color 0.2s ease;
  }

  .kb-link:hover {
    color: var(--kb-accent-strong);
    border-color: color-mix(in srgb, var(--kb-accent) 70%, transparent);
  }

  .kb-status {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.72rem;
    color: var(--kb-text-muted);
  }

  .kb-status-dot {
    width: 7px;
    height: 7px;
    border-radius: 999px;
    background: var(--kb-text-soft);
  }

  .kb-status-dot--ok {
    background: var(--kb-success);
  }

  .kb-status-dot--warning {
    background: var(--kb-warning);
  }

  .kb-status-dot--danger {
    background: var(--kb-danger);
  }

  .kb-badges {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }

  .kb-badge {
    display: inline-flex;
    align-items: center;
    border: 1px solid var(--kb-border);
    border-radius: 999px;
    padding: 0.2rem 0.5rem;
    font-size: 0.7rem;
    color: var(--kb-text-muted);
    background: var(--kb-bg-soft);
  }

  .kb-alert {
    display: flex;
    align-items: flex-start;
    gap: 0.55rem;
    padding: 0.62rem 0.74rem;
    border-radius: var(--kb-radius-xs);
    border: 1px solid var(--kb-border);
    margin-bottom: 0.75rem;
    font-size: 0.82rem;
  }

  .kb-alert--error {
    border-color: color-mix(in srgb, var(--kb-danger) 62%, var(--kb-border));
    background: color-mix(in srgb, var(--kb-danger) 16%, var(--kb-bg-soft));
  }

  .kb-alert--success {
    border-color: color-mix(in srgb, var(--kb-success) 62%, var(--kb-border));
    background: color-mix(in srgb, var(--kb-success) 14%, var(--kb-bg-soft));
  }

  .kb-alert--info {
    border-color: color-mix(in srgb, var(--kb-info) 52%, var(--kb-border));
    background: color-mix(in srgb, var(--kb-info) 14%, var(--kb-bg-soft));
  }

  .kb-empty {
    border: 1px dashed var(--kb-border);
    border-radius: var(--kb-radius-sm);
    padding: 1.3rem 0.95rem;
    text-align: center;
    color: var(--kb-text-soft);
    background: color-mix(in srgb, var(--kb-bg) 85%, transparent);
    font-size: 0.85rem;
  }

  .kb-loader {
    width: 20px;
    height: 20px;
    border-radius: 999px;
    border: 2px solid color-mix(in srgb, var(--kb-accent-soft) 50%, var(--kb-border));
    border-top-color: var(--kb-accent);
    animation: kb-spin 0.8s linear infinite;
  }

  @keyframes kb-spin {
    to {
      transform: rotate(360deg);
    }
  }

  .kb-modal {
    position: fixed;
    inset: 0;
    z-index: 90;
    background: rgba(0, 0, 0, 0.56);
    display: grid;
    place-items: center;
    padding: 1rem;
  }

  .kb-modal__box {
    width: min(560px, 100%);
    border-radius: var(--kb-radius);
    border: 1px solid var(--kb-border-soft);
    background: linear-gradient(160deg, var(--kb-bg-elev), var(--kb-bg-soft));
    box-shadow: var(--kb-shadow);
    padding: 1rem;
  }

  .kb-modal__title {
    margin: 0 0 0.8rem;
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--kb-text-muted);
  }

  .kb-modal__actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    margin-top: 0.9rem;
  }

  .kb-upload-zone {
    border: 1px dashed var(--kb-border);
    border-radius: var(--kb-radius-sm);
    padding: 0.9rem;
    text-align: center;
    color: var(--kb-text-muted);
    background: color-mix(in srgb, var(--kb-bg-soft) 50%, transparent);
    transition: border-color 0.2s ease, background 0.2s ease;
  }

  .kb-upload-zone.is-active {
    border-color: color-mix(in srgb, var(--kb-accent) 62%, var(--kb-border));
    background: color-mix(in srgb, var(--kb-accent-soft) 70%, transparent);
    color: var(--kb-text);
  }

  .kb-split {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 1rem;
  }

  .kb-footer {
    margin-top: 1rem;
    border-top: 1px solid var(--kb-border-soft);
  }

  .kb-footer__inner {
    width: min(1240px, calc(100% - 2rem));
    margin: 0 auto;
    padding: 0.9rem 0;
    color: var(--kb-text-soft);
    font-size: 0.72rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .kb-kbd {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.34rem;
    padding: 0.08rem 0.3rem;
    border-radius: 4px;
    border: 1px solid var(--kb-border);
    background: color-mix(in srgb, var(--kb-bg-soft) 85%, transparent);
    font-size: 0.7rem;
    color: var(--kb-text-muted);
  }

  .kb-markdown {
    color: var(--kb-text);
    line-height: 1.6;
    font-size: 0.91rem;
  }

  .kb-markdown > :first-child {
    margin-top: 0;
  }

  .kb-markdown > :last-child {
    margin-bottom: 0;
  }

  .kb-markdown h1,
  .kb-markdown h2,
  .kb-markdown h3,
  .kb-markdown h4,
  .kb-markdown h5,
  .kb-markdown h6 {
    margin-top: 1.2rem;
    margin-bottom: 0.6rem;
    line-height: 1.3;
  }

  .kb-markdown h1,
  .kb-markdown h2 {
    border-bottom: 1px solid var(--kb-border-soft);
    padding-bottom: 0.35rem;
  }

  .kb-markdown p,
  .kb-markdown li {
    color: var(--kb-text);
  }

  .kb-markdown code {
    background: color-mix(in srgb, var(--kb-accent-soft) 52%, var(--kb-bg-soft));
    color: color-mix(in srgb, var(--kb-accent-strong) 72%, var(--kb-text));
    border-radius: 4px;
    padding: 0.08rem 0.25rem;
    font-size: 0.82em;
  }

  .kb-markdown pre {
    background: color-mix(in srgb, var(--kb-bg-hard) 84%, var(--kb-bg-soft));
    border: 1px solid var(--kb-border-soft);
    border-radius: var(--kb-radius-xs);
    padding: 0.7rem;
    overflow: auto;
  }

  .kb-markdown pre code {
    background: transparent;
    color: var(--kb-text);
    padding: 0;
  }

  .kb-markdown blockquote {
    border-left: 2px solid color-mix(in srgb, var(--kb-accent) 60%, var(--kb-border));
    margin: 0.8rem 0;
    padding: 0.35rem 0 0.35rem 0.75rem;
    color: var(--kb-text-muted);
    background: color-mix(in srgb, var(--kb-accent-soft) 40%, transparent);
  }

  .kb-markdown table {
    width: 100%;
    border-collapse: collapse;
    margin: 0.8rem 0;
    overflow: auto;
    display: block;
  }

  .kb-markdown table th,
  .kb-markdown table td {
    border: 1px solid var(--kb-border);
    padding: 0.35rem 0.45rem;
    font-size: 0.86rem;
    white-space: nowrap;
  }

  .kb-markdown table th {
    background: color-mix(in srgb, var(--kb-bg-soft) 70%, transparent);
  }

  .kb-muted {
    color: var(--kb-text-muted);
  }

  .kb-soft {
    color: var(--kb-text-soft);
  }

  .kb-right {
    text-align: right;
  }

  .kb-checkbox {
    width: 15px;
    height: 15px;
    accent-color: var(--kb-accent);
    cursor: pointer;
  }

  @media (max-width: 1040px) {
    .kb-grid--dashboard {
      grid-template-columns: minmax(0, 1fr);
    }

    .kb-topbar {
      position: static;
    }

    .kb-topbar__inner {
      min-height: 64px;
      align-items: flex-start;
      padding-top: 0.6rem;
      padding-bottom: 0.6rem;
      flex-direction: column;
    }

    .kb-actions {
      width: 100%;
      justify-content: flex-start;
    }
  }

  @media (max-width: 800px) {
    .kb-content,
    .kb-topbar__inner,
    .kb-footer__inner {
      width: calc(100% - 1.2rem);
    }

    .kb-btn {
      padding: 0.45rem 0.64rem;
    }

    .kb-split {
      grid-template-columns: minmax(0, 1fr);
    }

    .kb-panel {
      padding: 0.8rem;
    }

    .kb-table {
      min-width: 540px;
    }

    .kb-mobile-hide {
      display: none;
    }
  }
`
