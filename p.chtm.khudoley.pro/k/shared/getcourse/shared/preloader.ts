// Переиспользуемый прелоадер для страницы документации (без CRT, простой fade)

/**
 * Возвращает CSS стили для прелоадера
 */
export function getPreloaderStyles(): string {
  return `
    #boot-loader {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      background: var(--color-bg, #ffffff);
      transition: opacity 0.35s ease-out;
    }
    
    #boot-loader.fade-out {
      opacity: 0;
      pointer-events: none;
    }
    
    .boot-messages {
      text-align: center;
      font-size: 0.9375rem;
      color: var(--color-text-secondary, #6b7280);
    }
    
    .boot-spinner {
      width: 32px;
      height: 32px;
      margin: 0 auto 1rem;
      border: 3px solid var(--color-border, #e5e7eb);
      border-top-color: var(--color-accent, #3b82f6);
      border-radius: 50%;
      animation: boot-spin 0.8s linear infinite;
    }
    
    @keyframes boot-spin {
      to { transform: rotate(360deg); }
    }
  `
}

/**
 * Возвращает JavaScript код прелоадера (скрытие по load)
 */
export function getPreloaderScript(): string {
  return `
    (function() {
      function hideBootLoader() {
        var loader = document.getElementById('boot-loader');
        if (loader) {
          loader.classList.add('fade-out');
          document.body.classList.add('boot-complete');
          setTimeout(function() {
            loader.style.display = 'none';
            window.bootLoaderComplete = true;
            window.dispatchEvent(new Event('bootloader-complete'));
          }, 350);
        }
      }
      if (document.readyState === 'complete') {
        setTimeout(hideBootLoader, 50);
      } else {
        window.addEventListener('load', function() { setTimeout(hideBootLoader, 100); });
      }
    })();
  `
}

/**
 * Возвращает HTML разметку прелоадера
 */
export function getPreloaderHTML(): string {
  return `
    <div id="boot-loader">
      <div class="boot-messages">
        <div class="boot-spinner"></div>
        <div>Загрузка документации...</div>
      </div>
    </div>
  `
}
