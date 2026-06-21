// @shared
/** Стили скроллбара для светлой темы */
export const customScrollbarStyles = `
  @supports not selector(::-webkit-scrollbar) {
    body,
    .content-wrapper,
    .custom-scrollbar {
      scrollbar-width: thin;
      scrollbar-color: #93a7c7 #e9effa;
    }
  }
  body::-webkit-scrollbar,
  .content-wrapper::-webkit-scrollbar,
  .custom-scrollbar::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }
  body::-webkit-scrollbar-track,
  .content-wrapper::-webkit-scrollbar-track,
  .custom-scrollbar::-webkit-scrollbar-track {
    background: #e9effa;
    border-radius: 999px;
  }
  body::-webkit-scrollbar-thumb,
  .content-wrapper::-webkit-scrollbar-thumb,
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #93a7c7;
    border-radius: 999px;
    border: 2px solid #e9effa;
  }
  body::-webkit-scrollbar-thumb:hover,
  .content-wrapper::-webkit-scrollbar-thumb:hover,
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #647ea6;
  }
`

/** CSS-переменные светлой темы и цветов HTTP-методов (для документации) */
export const lightThemeVariables = `
  :root {
    --font-body: 'Manrope', 'Segoe UI', sans-serif;
    --font-mono: 'JetBrains Mono', 'SFMono-Regular', Menlo, monospace;
    --color-bg: #f2f6ff;
    --color-bg-secondary: #e9f0ff;
    --color-surface: rgba(255, 255, 255, 0.86);
    --color-surface-strong: #ffffff;
    --color-surface-muted: #f5f8ff;
    --color-text: #10233f;
    --color-text-secondary: #4f607a;
    --color-border: #d6e1f2;
    --color-border-soft: #e5edf9;
    --color-accent: #0ea5e9;
    --color-accent-soft: #dff3ff;
    --color-get: #0f9d58;
    --color-post: #0f6cda;
    --color-put: #d97706;
    --color-delete: #d14343;
    --color-patch: #64748b;
    --shadow-card: 0 20px 45px -28px rgba(25, 56, 102, 0.36);
    --shadow-card-hover: 0 24px 55px -30px rgba(25, 56, 102, 0.48);
  }
`
