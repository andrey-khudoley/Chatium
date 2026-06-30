// @shared
/**
 * CSS состояния ошибки колеса (§6.1, §14.1).
 * Класс `wheel-error-state` на корневом элементе обесцвечивает всю страницу.
 * Контейнер ошибки выведен из-под фильтра через filter:none.
 */
export const wheelPageCss3 = `
  .wheel-error-state {
    filter: grayscale(100%);
  }
  .wheel-error-overlay {
    position: fixed;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 100;
    padding: 2rem;
    filter: none;
  }
  .wheel-error-box {
    background: rgba(10, 8, 7, 0.95);
    border: 1px solid rgba(217, 182, 95, 0.3);
    border-radius: 18px;
    padding: 36px 32px;
    max-width: 380px;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 18px;
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.7);
    filter: none;
  }
  .wheel-error-icon {
    font-size: 48px;
    line-height: 1;
    opacity: 0.7;
  }
  .wheel-error-title {
    font-family: 'Cormorant Garamond', serif;
    font-weight: 600;
    font-size: 26px;
    color: #f2e7cf;
    margin: 0;
  }
  .wheel-error-message {
    font-size: 15px;
    color: #a59a83;
    line-height: 1.5;
    margin: 0;
  }
  .wheel-error-reload-btn {
    margin-top: 8px;
    padding: 14px 28px;
    border-radius: 100px;
    border: 1px solid rgba(217, 182, 95, 0.4);
    background: rgba(217, 182, 95, 0.08);
    color: #f3dd9b;
    font-family: 'Jost', sans-serif;
    font-weight: 500;
    font-size: 14px;
    letter-spacing: 0.5px;
    cursor: pointer;
    transition: background 0.2s;
  }
  .wheel-error-reload-btn:hover {
    background: rgba(217, 182, 95, 0.16);
  }
`
