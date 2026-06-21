export const VIEWPORT_META_CONTENT = 'width=device-width, initial-scale=1, viewport-fit=cover'

export const mobileSafeAreaStyles = `
  :root {
    --app-safe-top: env(safe-area-inset-top, 0px);
    --app-safe-right: env(safe-area-inset-right, 0px);
    --app-safe-bottom: env(safe-area-inset-bottom, 0px);
    --app-safe-left: env(safe-area-inset-left, 0px);
  }

  body {
    padding-left: var(--app-safe-left);
    padding-right: var(--app-safe-right);
  }

  .jn-modal-overlay,
  .logout-modal-overlay {
    padding-left: max(1rem, var(--app-safe-left));
    padding-right: max(1rem, var(--app-safe-right));
    padding-bottom: max(1rem, var(--app-safe-bottom));
    padding-top: max(1rem, var(--app-safe-top));
    box-sizing: border-box;
  }

  @media (max-width: 480px) {
    .jn-modal-overlay,
    .logout-modal-overlay {
      align-items: flex-start;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
    }
  }
`

export const baseHtmlStyles = `
  html {
    font-size: 17px;
    -webkit-text-size-adjust: 100%;
    text-size-adjust: 100%;
  }

  body {
    height: 100%;
    width: 100%;
    background-image: url(https://fs.cdn-chatium.io/thumbnail/image_bXkpfHZFGu.2393x2250.png/s/400x400);
    background-size: 196px;
    background-color: #f8f8f8;
    line-height: 1.45;
  }

  @media (max-width: 480px) {
    html {
      font-size: 16px;
    }
  }
`

export const customScrollbarStyles = `
  @supports not selector(::-webkit-scrollbar) {
    body,
    .content-wrapper,
    .custom-scrollbar {
      scrollbar-width: thin;
      scrollbar-color: #444 #1a1a1a;
    }
  }
  body::-webkit-scrollbar,
  .content-wrapper::-webkit-scrollbar,
  .custom-scrollbar::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  body::-webkit-scrollbar-track,
  .content-wrapper::-webkit-scrollbar-track,
  .custom-scrollbar::-webkit-scrollbar-track {
    background: #1a1a1a;
    border-radius: 4px;
  }
  body::-webkit-scrollbar-thumb,
  .content-wrapper::-webkit-scrollbar-thumb,
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #444;
    border-radius: 4px;
  }
  body::-webkit-scrollbar-thumb:hover,
  .content-wrapper::-webkit-scrollbar-thumb:hover,
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #555;
  }
  body::-webkit-scrollbar-thumb:active,
  .content-wrapper::-webkit-scrollbar-thumb:active,
  .custom-scrollbar::-webkit-scrollbar-thumb:active {
    background: #666;
  }
`

export const formControlStyles = `
  :where(
    input:not([type='checkbox']):not([type='radio']):not([type='range']):not([type='color']):not([type='file']),
    textarea,
    select
  ):focus,
  :where(
    input:not([type='checkbox']):not([type='radio']):not([type='range']):not([type='color']):not([type='file']),
    textarea,
    select
  ):focus-visible {
    outline: none;
    /* Убираем системную (в т.ч. жёлтую) обводку браузера по всему проекту */
    box-shadow: none;
  }

  .jn-input,
  .jn-textarea {
    transition: border-color 0.18s ease, box-shadow 0.18s ease;
    font-size: max(0.9rem, 16px);
    line-height: 1.35;
  }

  button,
  input,
  textarea,
  select {
    font-size: max(0.9rem, 16px);
  }

  .jn-input:-webkit-autofill,
  .jn-textarea:-webkit-autofill,
  .settings-input:-webkit-autofill {
    -webkit-text-fill-color: #e8e8e8;
    caret-color: #e8e8e8;
    box-shadow: 0 0 0 1000px #0a0a0a inset;
    transition: background-color 5000s ease-in-out 0s;
  }

  .settings-input:-webkit-autofill {
    box-shadow: 0 0 0 1000px rgba(12, 12, 12, 0.98) inset;
  }

  .jn-input:-webkit-autofill:focus,
  .jn-textarea:-webkit-autofill:focus,
  .settings-input:-webkit-autofill:focus {
    -webkit-text-fill-color: #e8e8e8;
    box-shadow:
      0 0 0 1000px #0a0a0a inset,
      0 0 0 1px rgba(211, 35, 75, 0.45);
  }

  .settings-input:-webkit-autofill:focus {
    box-shadow:
      0 0 0 1000px rgba(12, 12, 12, 0.98) inset,
      0 0 0 1px rgba(211, 35, 75, 0.4);
  }

  .jn-input:focus,
  .jn-textarea:focus,
  .jn-input:focus-visible,
  .jn-textarea:focus-visible {
    outline: none;
    border-color: #d3234b;
    box-shadow: 0 0 0 1px rgba(211, 35, 75, 0.35);
  }

  .settings-input:focus,
  .settings-input:focus-visible {
    outline: none;
    border-color: #d3234b;
    box-shadow: 0 0 0 1px rgba(211, 35, 75, 0.28);
  }
`
