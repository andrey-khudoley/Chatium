// Переиспользуемый компонент прелоадера для всех страниц проекта

/**
 * Возвращает CSS стили для прелоадера
 */
export function getPreloaderStyles() {
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
      background: #0a0a0a;
      transform-origin: center center;
      overflow: hidden;
    }
    
    #boot-loader.collapsing {
      animation: crt-collapse 0.4s cubic-bezier(0.5, 0, 0.75, 1) forwards;
    }
    
    @keyframes crt-collapse {
      0% {
        transform: scaleY(1) scaleX(1);
        opacity: 1;
        filter: brightness(1) contrast(1);
      }
      15% {
        transform: scaleY(0.95) scaleX(1.02);
        opacity: 0.95;
        filter: brightness(0.9) contrast(1.1);
      }
      30% {
        transform: scaleY(0.7) scaleX(1.05);
        opacity: 0.85;
        filter: brightness(0.7) contrast(1.3);
      }
      50% {
        transform: scaleY(0.4) scaleX(1.08);
        opacity: 0.7;
        filter: brightness(0.5) contrast(1.5);
      }
      70% {
        transform: scaleY(0.15) scaleX(1.1);
        opacity: 0.5;
        filter: brightness(0.3) contrast(2);
      }
      85% {
        transform: scaleY(0.05) scaleX(1.12);
        opacity: 0.3;
        filter: brightness(0.1) contrast(2.5);
      }
      100% {
        transform: scaleY(0) scaleX(1.15);
        opacity: 0;
        filter: brightness(0) contrast(3);
      }
    }
    
    #boot-loader.collapsing .boot-messages {
      animation: crt-distort-lines 0.4s cubic-bezier(0.5, 0, 0.75, 1) forwards;
    }
    
    @keyframes crt-distort-lines {
      0% {
        transform: scaleY(1);
        filter: blur(0);
      }
      30% {
        transform: scaleY(1.1);
        filter: blur(0.3px);
      }
      60% {
        transform: scaleY(1.3);
        filter: blur(0.8px);
      }
      100% {
        transform: scaleY(2);
        filter: blur(1.5px);
      }
    }
    
    .boot-messages {
      font-family: 'Courier New', monospace;
      font-size: 0.9rem;
      color: #a0a0a0;
      max-width: 600px;
      width: 100%;
    }
    
    .boot-message {
      display: flex;
      gap: 0.75rem;
      margin-bottom: 0.5rem;
      opacity: 0;
      transform: translateX(-10px);
      animation: boot-line-appear 0.3s ease-out forwards;
    }
    
    .boot-status {
      color: #d3234b;
      font-weight: bold;
      flex-shrink: 0;
    }
    
    .boot-text {
      color: #e8e8e8;
    }
    
    .boot-cursor {
      display: inline-block;
      margin-left: 0.5rem;
      animation: cursor-blink 1s step-end infinite;
      color: #d3234b;
      font-size: 1.2rem;
    }
    
    @keyframes boot-line-appear {
      from { opacity: 0; transform: translateX(-10px); }
      to { opacity: 1; transform: translateX(0); }
    }
    
    @keyframes cursor-blink {
      0%, 50% { opacity: 1; }
      51%, 100% { opacity: 0; }
    }
  `
}

/**
 * Возвращает JavaScript код прелоадера
 */
export function getPreloaderScript() {
  return `
    (function() {
      var container = null;
      var loadedResources = new Set();
      var isComplete = false;
      window.bootStaticReady = false;
      
      var bootSequence = [
        { type: 'init', msg: 'Инициализация системы...' },
        { type: 'html', msg: 'Парсинг HTML документа...' },
        { type: 'script', name: 'tailwind', msg: 'Загрузка Tailwind CSS...' },
        { type: 'link', name: 'fontawesome', msg: 'Загрузка FontAwesome иконок...' },
        { type: 'link', name: 'fonts.googleapis', msg: 'Подключение Google Fonts...' },
        { type: 'link', name: 'fonts.gstatic', msg: 'Загрузка терминального шрифта...' }
      ];
      
      function addMessage(status, text) {
        if (!container) {
          container = document.getElementById('boot-messages-container');
        }
        if (!container) return;
        
        var div = document.createElement('div');
        div.className = 'boot-message';
        div.innerHTML = '<span class="boot-status">[' + status + ']</span><span class="boot-text">' + text + '</span>';
        container.appendChild(div);
        
        if (container.children.length > 12) {
          container.removeChild(container.children[0]);
        }
      }
      
      function checkResource(resource) {
        var name = resource.name;
        if (loadedResources.has(name)) return;
        
        for (var i = 0; i < bootSequence.length; i++) {
          var item = bootSequence[i];
          if (item.name && name.indexOf(item.name) !== -1) {
            loadedResources.add(name);
            addMessage('OK', item.msg);
            return;
          }
        }
      }
      
      function monitorResources() {
        if (window.performance && window.performance.getEntriesByType) {
          var resources = window.performance.getEntriesByType('resource');
          for (var i = 0; i < resources.length; i++) {
            checkResource(resources[i]);
          }
        }
      }
      
      function finishBootStaticReady() {
        if (window.bootStaticReady) return;
        window.bootStaticReady = true;
        window.dispatchEvent(new Event('boot-static-ready'));
      }
      
      function completeSequence() {
        if (isComplete) return;
        
        try {
          addMessage('OK', 'Компоненты загружены');
          addMessage('OK', 'Инициализация Vue.js...');
          addMessage('OK', 'Проверка аутентификации...');
          addMessage('OK', 'Система готова к работе');
          var cursor = document.createElement('div');
          cursor.className = 'boot-cursor';
          cursor.textContent = '_';
          if (!container) {
            container = document.getElementById('boot-messages-container');
          }
          if (container) {
            container.appendChild(cursor);
          }
        } catch (e) {}
        
        isComplete = true;
        
        setTimeout(function() {
          function afterFonts() {
            if (document.fonts && document.fonts.ready) {
              document.fonts.ready.then(finishBootStaticReady).catch(finishBootStaticReady);
            } else {
              finishBootStaticReady();
            }
          }
          afterFonts();
        }, 400);
      }
      
      function hideBootLoader() {
        var loader = document.getElementById('boot-loader');
        if (loader) {
          loader.classList.add('collapsing');
          setTimeout(function() {
            loader.style.display = 'none';
            document.body.classList.add('boot-complete');
            window.bootLoaderComplete = true;
            window.dispatchEvent(new Event('bootloader-complete'));
          }, 400);
        }
      }
      
      window.hideBootLoader = hideBootLoader;
      
      setTimeout(function() {
        if (!window.bootStaticReady) {
          finishBootStaticReady();
        }
      }, 12000);
      
      setTimeout(function() {
        if (!window.bootLoaderComplete && typeof window.hideBootLoader === 'function') {
          window.hideBootLoader();
        }
      }, 15000);
      
      function startBoot() {
        addMessage('OK', bootSequence[0].msg);
        addMessage('OK', bootSequence[1].msg);
        
        var checkInterval = setInterval(function() {
          monitorResources();
        }, 50);
        
        window.addEventListener('load', function() {
          clearInterval(checkInterval);
          monitorResources();
          setTimeout(completeSequence, 100);
        });
        
        setTimeout(function() {
          if (!isComplete) {
            clearInterval(checkInterval);
            monitorResources();
            completeSequence();
          }
        }, 3000);
      }
      
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
          setTimeout(startBoot, 50);
        });
      } else {
        setTimeout(startBoot, 50);
      }
    })();
  `
}

/**
 * Возвращает HTML разметку прелоадера
 */
export function getPreloaderHTML() {
  return `
    <div id="boot-loader">
      <div class="boot-messages">
        <div id="boot-messages-container"></div>
      </div>
    </div>
  `
}
