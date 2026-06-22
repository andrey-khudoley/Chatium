// @shared
export const baseHtmlStyles = `
  body {
    height: 100%;
    width: 100%;
    background-image: url(https://fs.cdn-chatium.io/thumbnail/image_bXkpfHZFGu.2393x2250.png/s/400x400);
    background-size: 196px;
    background-color: #f8f8f8;
  }
`

/**
 * Скроллбар: низкий контраст, едва заметный (нейтральные тёмно-серые тона как у границ UI), без акцентного свечения.
 * WebKit — узкий, слабый градиент на ползунке; Firefox — `scrollbar-color` с теми же оттенками.
 * Основной скролл: `body`, `.content-wrapper` (в т.ч. на `.ap-main` / `.tp-main` на админке и тестах), `.custom-scrollbar`.
 */
export const customScrollbarStyles = `
  @supports not selector(::-webkit-scrollbar) {
    body,
    .content-wrapper,
    .custom-scrollbar {
      scrollbar-width: thin;
      scrollbar-color: #3a383c #0c0c0c;
    }
  }

  body::-webkit-scrollbar,
  .content-wrapper::-webkit-scrollbar,
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  body::-webkit-scrollbar-track,
  .content-wrapper::-webkit-scrollbar-track,
  .custom-scrollbar::-webkit-scrollbar-track {
    background: #0c0c0c;
    border-left: 1px solid rgba(50, 44, 54, 0.22);
    box-shadow: none;
    border-radius: 0;
  }

  body::-webkit-scrollbar-thumb,
  .content-wrapper::-webkit-scrollbar-thumb,
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: linear-gradient(
      180deg,
      rgba(52, 48, 54, 0.9) 0%,
      rgba(38, 36, 40, 0.95) 100%
    );
    border: 1px solid rgba(45, 42, 48, 0.55);
    border-radius: 0;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
  }

  body::-webkit-scrollbar-thumb:hover,
  .content-wrapper::-webkit-scrollbar-thumb:hover,
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(
      180deg,
      rgba(58, 54, 60, 0.92) 0%,
      rgba(44, 42, 46, 0.96) 100%
    );
    border-color: rgba(55, 50, 58, 0.6);
  }

  body::-webkit-scrollbar-thumb:active,
  .content-wrapper::-webkit-scrollbar-thumb:active,
  .custom-scrollbar::-webkit-scrollbar-thumb:active {
    background: linear-gradient(
      180deg,
      rgba(46, 44, 48, 0.95) 0%,
      rgba(34, 32, 36, 1) 100%
    );
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.35);
  }

  body::-webkit-scrollbar-corner,
  .content-wrapper::-webkit-scrollbar-corner,
  .custom-scrollbar::-webkit-scrollbar-corner {
    background: #0c0c0c;
  }
`
