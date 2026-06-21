---
name: chatium-preloader
description: Прелоадер приложения в Chatium — встраивание в HTML до загрузки Vue, типы (спиннер, boot sequence, skeleton). Использовать для устранения белого экрана и FOUC.
---

# chatium-preloader

Прелоадер показывается до загрузки Vue и скрывается после монтирования приложения. Устраняет белый экран, прыгающие элементы и FOUC (Flash of Unstyled Content).

## Когда использовать

- SPA с задержкой до первого рендера
- Необходимость показать состояние «загрузка» до инициализации Vue
- Разные концепции: классический спиннер, boot sequence, skeleton, progress bar

## Ключевой принцип

- Прелоадер встроен в HTML (в `<body>`), показывается до загрузки Vue.
- Стили — inline или критический CSS в `<head>`.
- Скрытие — после монтирования Vue (например, в onMounted или корневом компоненте).
- Не использовать Vue-компонент для самого прелоадера (он должен быть в HTML).
- Не полагаться только на CSS-классы без inline-стилей для первого кадра.

## Типы прелоадеров

- **Классический спиннер** — логотип + кольцо, текст «Загрузка...».
- **Boot sequence** — терминальный вид, последовательные сообщения, мигающий курсор, отслеживание ресурсов (Performance API).
- **Skeleton loader** — плейсхолдеры под контент страницы.
- **Progress bar** — тонкая полоса прогресса вверху.

## Архитектура

- Разметка и стили прелоадера в том же HTML/стилях, что отдаёт app.html (например, styles.tsx: preloaderStyles, cssVariables).
- Скрытие: класс или атрибут, убираемый после mount (например, document.body или корневой div).

## Структура файлов

```
project/
├── styles.tsx              # CSS стили и скрипты
│   ├── cssVariables        # CSS переменные тем
│   ├── preloaderStyles     # Стили прелоадера
│   └── loaderScript        # JavaScript для скрытия
├── index.tsx               # Главный роут
└── pages/
    └── HomePage.vue        # Vue компоненты
```

## Последовательность загрузки

```
1. HTML парсится
   └─> Inline стили на <body> применяются МГНОВЕННО

2. <head> обрабатывается
   └─> CSS переменные (БЕЗ type="text/tailwindcss"!)
   └─> Стили прелоадера

3. <body> рендерится
   └─> Прелоадер видим СРАЗУ (inline стили)
   └─> Vue компонент загружается (скрыт opacity: 0)

4. Vue монтируется
   └─> onMounted() вызывается
   └─> window.hideAppLoader() выполняется

5. Crossfade переход
   └─> Прелоадер: opacity 1 → 0
   └─> Контент: opacity 0 → 1
```

## Реализация: шаг 1 — styles.tsx

```typescript
// @shared

// CSS переменные для тем
export const cssVariables = `
  :root {
    --color-bg: #fafbfc;
    --color-bg-secondary: #ffffff;
    --color-text: #1e293b;
    --color-text-secondary: #64748b;
    --color-primary: #0ea5e9;
    --color-primary-hover: #0284c7;
    --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.12);
  }
  
  .dark {
    --color-bg: #0f172a;
    --color-bg-secondary: #1e293b;
    --color-text: #f1f5f9;
    --color-text-secondary: #94a3b8;
    --color-primary: #38bdf8;
    --color-primary-hover: #0ea5e9;
    --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.5);
  }
`

// Стили прелоадера
export const preloaderStyles = `
  #app-loader {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: var(--color-bg);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 99999;
    animation: loader-fade-in 0.3s ease-out;
  }

  @keyframes loader-fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .loader-content {
    text-align: center;
    animation: loader-content-entrance 0.5s ease-out 0.2s both;
  }

  @keyframes loader-content-entrance {
    from { opacity: 0; transform: translateY(10px) scale(0.95); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }

  .loader-spinner {
    width: 72px; height: 72px;
    margin: 0 auto 1.5rem;
    position: relative;
  }

  /* Градиентный conic-gradient спиннер */
  .loader-ring {
    box-sizing: border-box;
    width: 100%; height: 100%;
    border-radius: 50%;
    background: conic-gradient(
      from 0deg,
      transparent 0deg, transparent 40deg,
      var(--color-primary) 60deg,
      var(--color-primary-hover) 180deg,
      var(--color-primary) 300deg,
      transparent 320deg, transparent 360deg
    );
    animation: loader-spin 1.2s linear infinite;
    position: relative;
  }

  /* Внутренняя маска — HARDCODED цвет, не var() */
  .loader-ring::before {
    content: '';
    position: absolute;
    top: 4px; left: 4px; right: 4px; bottom: 4px;
    background: #0f172a;
    border-radius: 50%;
  }

  @keyframes loader-spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .loader-text {
    margin: 0;
    color: var(--color-text-secondary);
    font-size: 0.95rem;
    font-weight: 500;
    letter-spacing: 0.02em;
    animation: loader-text-pulse 2s ease-in-out infinite;
  }

  @keyframes loader-text-pulse {
    0%, 100% { opacity: 0.7; }
    50% { opacity: 1; }
  }

  @media (max-width: 480px) {
    .loader-spinner { width: 64px; height: 64px; }
    .loader-text { font-size: 0.875rem; }
  }
`

// JavaScript для скрытия прелоадера
export const loaderScript = `
  (function() {
    const loader = document.getElementById('app-loader');
    const content = document.getElementById('app-content');

    window.hideAppLoader = function() {
      if (loader && content) {
        loader.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
        loader.style.opacity = '0';
        loader.style.transform = 'scale(0.95)';
        content.style.transition = 'opacity 0.4s ease';
        content.style.opacity = '1';
        setTimeout(function() {
          loader.style.display = 'none';
          if (loader.parentNode) loader.parentNode.removeChild(loader);
        }, 400);
      }
    };

    // Fallback: принудительное скрытие через 5 секунд
    setTimeout(function() {
      if (loader && loader.style.display !== 'none') {
        window.hideAppLoader();
      }
    }, 5000);
  })();
`
```

## Реализация: шаг 2 — роут index.tsx

КРИТИЧЕСКИ ВАЖНО: порядок элементов в `<head>`.

```typescript
// @shared
import { jsx } from "@app/html-jsx"
import HomePage from './pages/HomePage.vue'
import { cssVariables, preloaderStyles, loaderScript } from './styles'

export const indexPageRoute = app.get('/', async (ctx) => {
  return (
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>My App</title>

        {/* ПЕРВЫМ: CSS переменные — БЕЗ type="text/tailwindcss"! */}
        <style>{cssVariables}</style>

        {/* ВТОРЫМ: Стили прелоадера */}
        <style>{preloaderStyles}</style>

        {/* Остальные библиотеки */}
        <script src="/s/static/lib/tailwind.3.4.16.min.js"></script>
        <link href="/s/static/lib/fontawesome/6.7.2/css/all.min.css" rel="stylesheet" />
      </head>
      <body style="margin: 0; padding: 0; background-color: #0f172a; min-height: 100vh;">

        {/* Прелоадер — INLINE СТИЛИ обязательны */}
        <div id="app-loader" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: #0f172a; display: flex; align-items: center; justify-content: center; z-index: 999999;">
          <div class="loader-content">
            <div class="loader-spinner">
              <div class="loader-ring"></div>
            </div>
            <p class="loader-text">Загрузка приложения...</p>
          </div>
        </div>

        {/* Контент — изначально скрыт */}
        <div id="app-content" style="opacity: 0;">
          <HomePage />
        </div>

        <script>{loaderScript}</script>
      </body>
    </html>
  )
})
```

## Реализация: шаг 3 — Vue компонент

```vue
<script setup>
import { onMounted } from 'vue'

onMounted(async () => {
  // Сначала загружаем данные
  await Promise.all([loadSettings(), loadData()])

  // Скрываем прелоадер ПОСЛЕ загрузки данных
  if (window.hideAppLoader) {
    window.hideAppLoader()
  }
})
</script>
```

## Boot Sequence Preloader

Для технических/IT приложений — имитация загрузки ОС.

**Ключевые особенности:**
- Терминальный стиль (monospace шрифт)
- Мониторинг реальных ресурсов через Performance API
- Последовательные сообщения с индикаторами `[OK]`, `[LOAD]`, `[FAIL]`
- Мигающий курсор
- Синхронизация с Vue через `window.bootLoaderComplete` и событие `bootloader-complete`

**Структура в index.tsx:**

```typescript
// @shared
import { jsx } from "@app/html-jsx"
import HomePage from './pages/HomePage.vue'

export const indexPageRoute = app.get('/', async (ctx) => {
  return (
    <html class="dark">
      <head>
        <title>Analytics System</title>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />

        <style>{`
          body { margin: 0; background: #0a0a0a; }

          #boot-loader {
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            z-index: 99999;
            display: flex; align-items: center; justify-content: center;
            padding: 2rem;
          }
          .boot-messages {
            font-family: 'Courier New', monospace;
            font-size: 0.9rem; color: #a0a0a0;
            max-width: 600px; width: 100%;
          }
          .boot-message {
            display: flex; gap: 0.75rem; margin-bottom: 0.5rem;
            opacity: 0; transform: translateX(-10px);
            animation: boot-line-appear 0.3s ease-out forwards;
          }
          .boot-status { color: #d3234b; font-weight: bold; flex-shrink: 0; }
          .boot-text { color: #e8e8e8; }
          .boot-cursor {
            display: inline-block; margin-left: 0.5rem;
            animation: cursor-blink 1s step-end infinite;
            color: #d3234b; font-size: 1.2rem;
          }
          @keyframes boot-line-appear {
            from { opacity: 0; transform: translateX(-10px); }
            to { opacity: 1; transform: translateX(0); }
          }
          @keyframes cursor-blink {
            0%, 50% { opacity: 1; } 51%, 100% { opacity: 0; }
          }
        `}</style>

        <script>{`
          (function() {
            var container = null;
            var loadedResources = new Set();
            var isComplete = false;

            var bootSequence = [
              { type: 'init', msg: 'Инициализация системы...' },
              { type: 'html', msg: 'Парсинг HTML документа...' },
              { type: 'script', name: 'tailwind', msg: 'Загрузка Tailwind CSS...' },
              { type: 'link', name: 'fontawesome', msg: 'Загрузка FontAwesome иконок...' },
              { type: 'link', name: 'fonts.googleapis', msg: 'Подключение Google Fonts...' }
            ];

            function addMessage(status, text) {
              if (!container) container = document.getElementById('boot-messages-container');
              if (!container) return;
              var div = document.createElement('div');
              div.className = 'boot-message';
              div.innerHTML = '<span class="boot-status">[' + status + ']</span><span class="boot-text">' + text + '</span>';
              container.appendChild(div);
              if (container.children.length > 12) container.removeChild(container.children[0]);
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
                for (var i = 0; i < resources.length; i++) checkResource(resources[i]);
              }
            }

            function completeSequence() {
              if (isComplete) return;
              isComplete = true;
              addMessage('OK', 'Компоненты загружены');
              addMessage('OK', 'Инициализация Vue.js...');
              addMessage('OK', 'Система готова к работе');
              var cursor = document.createElement('div');
              cursor.className = 'boot-cursor';
              cursor.textContent = '_';
              container.appendChild(cursor);
              setTimeout(hideBootLoader, 400);
            }

            function hideBootLoader() {
              var loader = document.getElementById('boot-loader');
              if (loader) {
                loader.style.transition = 'opacity 0.6s ease-out';
                loader.style.opacity = '0';
                setTimeout(function() {
                  loader.style.display = 'none';
                  window.bootLoaderComplete = true;
                  window.dispatchEvent(new Event('bootloader-complete'));
                }, 600);
              }
            }

            function startBoot() {
              addMessage('OK', bootSequence[0].msg);
              addMessage('OK', bootSequence[1].msg);
              var checkInterval = setInterval(monitorResources, 50);
              window.addEventListener('load', function() {
                clearInterval(checkInterval);
                monitorResources();
                setTimeout(completeSequence, 100);
              });
              // Защита от зависания — максимум 3 секунды
              setTimeout(function() {
                if (!isComplete) { clearInterval(checkInterval); monitorResources(); completeSequence(); }
              }, 3000);
            }

            if (document.readyState === 'loading') {
              document.addEventListener('DOMContentLoaded', function() { setTimeout(startBoot, 50); });
            } else {
              setTimeout(startBoot, 50);
            }
          })();
        `}</script>

        <script src="/s/static/lib/tailwind.3.4.16.min.js"></script>
        <link rel="stylesheet" href="/s/static/lib/fontawesome/6.7.2/css/all.min.css" />
      </head>
      <body>
        <div id="boot-loader">
          <div class="boot-messages">
            <div id="boot-messages-container"></div>
          </div>
        </div>

        <HomePage projectTitle="Аналитика" />
      </body>
    </html>
  )
})
```

**Vue компонент ожидает завершения boot:**

```vue
<script setup lang="ts">
import { onMounted, ref } from 'vue'

const bootLoaderDone = ref(false)

onMounted(() => {
  const startAnimations = () => {
    bootLoaderDone.value = true
  }

  if ((window as any).bootLoaderComplete) {
    startAnimations()
  } else {
    window.addEventListener('bootloader-complete', startAnimations)
  }
})
</script>
```

## Частые ошибки

| Ошибка | Почему плохо | Правильно |
|--------|-------------|-----------|
| Vue компонент как прелоадер | Загружается с задержкой, белый экран | HTML напрямую в `<body>` |
| `type="text/tailwindcss"` для cssVariables | Tailwind обрабатывает с задержкой | Обычный `<style>` без type |
| `var(--color-bg)` в критических местах | CSS переменная применяется с задержкой | Hardcoded цвет: `#0f172a` |
| `setTimeout(hideLoader, 1000)` | Не учитывает реальное время загрузки | Vue вызывает через `window.hideAppLoader()` |
| `loader.classList.add('loaded')` | Inline `display: flex` побеждает CSS | `loader.style.display = 'none'` |
| Контент без `opacity: 0` | Контент просвечивает через прелоадер | `<div id="app-content" style="opacity: 0;">` |
| `dangerouslySetInnerHTML` | Некорректный рендеринг | Прямой JSX |
| Отдельные border-кольца | Рваный эффект | `conic-gradient` для плавного градиента |

## Варианты сообщений boot sequence

```javascript
// Аналитическая система
var bootMessages = [
  'Инициализация системы...', 'Загрузка ядра приложения...',
  'Подключение к базе данных...', 'Проверка аутентификации...', 'Система готова к работе'
]

// CRM
var bootMessages = [
  'Инициализация CRM...', 'Подключение к AmoCRM API...',
  'Проверка OAuth токенов...', 'Система готова к работе'
]

// DevOps
var bootMessages = [
  'Starting system initialization...', 'Checking dependencies...',
  'Connecting to API gateway...', 'System ready'
]
```

## Чеклист

- [ ] Разметка прелоадера в HTML (body), не в Vue
- [ ] Inline стили на `<body>` и `#app-loader` (hardcoded цвета)
- [ ] CSS переменные — первый `<style>` без `type="text/tailwindcss"`
- [ ] Контент обёрнут в `<div id="app-content" style="opacity: 0;">`
- [ ] `window.hideAppLoader()` вызывается в `onMounted()` ПОСЛЕ загрузки данных
- [ ] Критические цвета в CSS hardcoded (фон центра кольца, базовый фон)
- [ ] Fallback таймер 5 секунд в loaderScript
- [ ] При boot sequence — Performance API и `bootloader-complete` событие

## Ссылки на документацию

- **018-preloader.md** — типы прелоадеров, boot sequence, пошаговая реализация, частые ошибки
