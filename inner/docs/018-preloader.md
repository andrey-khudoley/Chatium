@chatium

# Прелоадер приложения (App Preloader)

## Оглавление

1. [Основные концепции](#основные-концепции)
2. [Типы прелоадеров](#типы-прелоадеров)
3. [Архитектура решения](#архитектура-решения)
4. [Пошаговая реализация](#пошаговая-реализация)
5. [Boot Sequence Preloader](#boot-sequence-preloader)
6. [Частые ошибки](#частые-ошибки-как-не-надо-делать)
7. [Примеры кода](#примеры-кода)
8. [Адаптация под разные темы](#адаптация-под-разные-темы)

---

## Основные концепции

### Зачем нужен прелоадер?

Прелоадер решает несколько критических проблем при загрузке SPA (Single Page Application):

1. **Устраняет белый экран** при загрузке страницы
2. **Скрывает "прыгающие" элементы** во время рендеринга Vue компонентов
3. **Предотвращает FOUC** (Flash of Unstyled Content)
4. **Улучшает UX** - пользователь понимает, что приложение загружается

### Ключевой принцип

**Прелоадер должен быть встроен в HTML и показываться ДО загрузки Vue компонентов.**

Это означает:

- ✅ HTML разметка прелоадера встраивается непосредственно в `<body>`
- ✅ Стили применяются через inline атрибуты или критический CSS в `<head>`
- ✅ Прелоадер скрывается ПОСЛЕ монтирования Vue компонента
- ❌ НЕ использовать Vue компонент для прелоадера
- ❌ НЕ полагаться только на CSS классы без inline стилей

---

## Типы прелоадеров

В зависимости от концепции приложения можно использовать разные типы прелоадеров:

### 1. Классический спиннер (универсальный)

Подходит для большинства приложений:

- Логотип + вращающееся кольцо
- Текст "Загрузка..."
- Минималистичный и нейтральный

### 2. Boot Sequence (системный)

Для технических/IT приложений:

- Имитация загрузки операционной системы
- Терминальный вид (monospace шрифт)
- Последовательные сообщения о загрузке компонентов
- Мигающий курсор
- Отслеживание реальных ресурсов

### 3. Skeleton Loader (контентный)

Для контент-ориентированных приложений:

- Показывает "скелет" будущей страницы
- Анимированные placeholder'ы
- Плавная замена на реальный контент

### 4. Progress Bar (минималистичный)

Для быстрых приложений:

- Тонкая полоса прогресса вверху
- Минимально отвлекает
- Подходит для SPA с быстрой загрузкой

---

## Архитектура решения

### Структура файлов

```
project/
├── styles.tsx              # CSS стили и скрипты
│   ├── cssVariables        # CSS переменные тем
│   ├── preloaderStyles     # Стили прелоадера
│   └── loaderScript        # JavaScript для скрытия
├── index.tsx               # Главный роут
├── otherPage.tsx           # Другие роуты
└── pages/
    └── HomePage.vue        # Vue компоненты
```

### Последовательность загрузки

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

---

## Пошаговая реализация

### Шаг 1: Добавить CSS переменные и стили в `styles.tsx`

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
  /* Прелоадер - показывается до загрузки Vue */
  #app-loader {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--color-bg);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 99999;
    animation: loader-fade-in 0.3s ease-out;
  }
  
  #app-loader.loaded {
    display: none;
  }
  
  /* Плавное появление прелоадера */
  @keyframes loader-fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  .loader-content {
    text-align: center;
    animation: loader-content-entrance 0.5s ease-out 0.2s both;
  }
  
  /* Анимация появления контента */
  @keyframes loader-content-entrance {
    from {
      opacity: 0;
      transform: translateY(10px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
  
  .loader-logo {
    width: 64px;
    height: 64px;
    margin: 0 auto 1.5rem;
    background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%);
    border-radius: 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 8px 32px rgba(14, 165, 233, 0.3);
    animation: loader-logo-pulse 2s ease-in-out infinite;
    position: relative;
  }
  
  /* Пульсация логотипа с glow эффектом */
  @keyframes loader-logo-pulse {
    0%, 100% {
      transform: scale(1);
      box-shadow: 0 8px 32px rgba(14, 165, 233, 0.3);
    }
    50% {
      transform: scale(1.05);
      box-shadow: 0 8px 48px rgba(14, 165, 233, 0.5);
    }
  }
  
  .loader-logo i {
    font-size: 2rem;
    color: white;
  }
  
  .loader-spinner {
    width: 72px;
    height: 72px;
    margin: 0 auto 1.5rem;
    position: relative;
  }
  
  /* Градиентный спиннер */
  .loader-ring {
    box-sizing: border-box;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background: conic-gradient(
      from 0deg,
      transparent 0deg,
      transparent 40deg,
      var(--color-primary) 60deg,
      var(--color-primary-hover) 180deg,
      var(--color-primary) 300deg,
      transparent 320deg,
      transparent 360deg
    );
    animation: loader-spin 1.2s linear infinite;
    position: relative;
  }
  
  /* Внутренняя маска для создания кольца */
  .loader-ring::before {
    content: '';
    position: absolute;
    top: 4px;
    left: 4px;
    right: 4px;
    bottom: 4px;
    background: #0f172a;  /* HARDCODED! НЕ var(--color-bg) */
    border-radius: 50%;
  }
  
  /* Дополнительный glow эффект */
  .loader-ring::after {
    content: '';
    position: absolute;
    top: -2px;
    left: -2px;
    right: -2px;
    bottom: -2px;
    background: conic-gradient(
      from 0deg,
      transparent 0deg,
      transparent 40deg,
      rgba(14, 165, 233, 0.3) 60deg,
      rgba(2, 132, 199, 0.3) 180deg,
      rgba(14, 165, 233, 0.3) 300deg,
      transparent 320deg,
      transparent 360deg
    );
    border-radius: 50%;
    filter: blur(8px);
    z-index: -1;
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
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    animation: loader-text-pulse 2s ease-in-out infinite;
  }
  
  /* Пульсация текста */
  @keyframes loader-text-pulse {
    0%, 100% { opacity: 0.7; }
    50% { opacity: 1; }
  }
  
  /* Адаптивность */
  @media (max-width: 480px) {
    .loader-logo {
      width: 56px;
      height: 56px;
      margin-bottom: 1.25rem;
    }
    .loader-logo i {
      font-size: 1.75rem;
    }
    .loader-spinner {
      width: 64px;
      height: 64px;
      margin-bottom: 1.25rem;
    }
    .loader-text {
      font-size: 0.875rem;
    }
  }
`

// JavaScript для скрытия прелоадера
export const loaderScript = `
  // Скрыть прелоадер после загрузки Vue приложения
  (function() {
    const loader = document.getElementById('app-loader');
    const content = document.getElementById('app-content');
    
    // Глобальная функция для скрытия прелоадера (вызывается из Vue)
    window.hideAppLoader = function() {
      if (loader && content) {
        // Плавное скрытие прелоадера с zoom-out эффектом
        loader.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
        loader.style.opacity = '0';
        loader.style.transform = 'scale(0.95)';
        
        // Одновременно показываем контент
        content.style.transition = 'opacity 0.4s ease';
        content.style.opacity = '1';
        
        // Полное удаление прелоадера после анимации
        setTimeout(function() {
          loader.style.display = 'none';
          // Очистка из DOM для освобождения памяти
          if (loader.parentNode) {
            loader.parentNode.removeChild(loader);
          }
        }, 400);
      }
    };
    
    // Fallback: если Vue не вызвал hideAppLoader через 5 секунд, скрываем сами
    setTimeout(function() {
      if (loader && loader.style.display !== 'none') {
        console.warn('Vue не смонтировался за 5 секунд, скрываем прелоадер принудительно');
        window.hideAppLoader();
      }
    }, 5000);
  })();
`
```

### Шаг 2: Интегрировать в роут (например, `index.tsx`)

**КРИТИЧЕСКИ ВАЖНО:** Порядок элементов в `<head>` имеет значение!

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

        {/*
          ПЕРВЫМ ДЕЛОМ: CSS переменные
          БЕЗ type="text/tailwindcss"!
          Обычный <style> для мгновенного применения
        */}
        <style>{cssVariables}</style>

        {/* ВТОРЫМ: Стили прелоадера (используют CSS переменные) */}
        <style>{preloaderStyles}</style>

        {/* Остальные библиотеки */}
        <script src="/s/static/lib/tailwind.3.4.16.min.js"></script>
        <link href="/s/static/lib/fontawesome/6.7.2/css/all.min.css" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

        {/* Общие стили */}
        <style>{commonStyles}</style>
      </head>
      <body style="margin: 0; padding: 0; background-color: #0f172a; min-height: 100vh;">
        {/*
          Прелоадер - показывается сразу
          INLINE СТИЛИ - критически важны для мгновенного применения!
        */}
        <div id="app-loader" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: #0f172a; display: flex; align-items: center; justify-content: center; z-index: 999999;">
          <div class="loader-content">
            <div class="loader-logo">
              <i class="fas fa-plug"></i>
            </div>
            <div class="loader-spinner">
              <div class="loader-ring"></div>
            </div>
            <p class="loader-text">Загрузка приложения...</p>
          </div>
        </div>

        {/* Контент - изначально скрыт (opacity: 0) */}
        <div id="app-content" style="opacity: 0;">
          <HomePage />
        </div>

        {/* Скрипт для скрытия прелоадера */}
        <script>{loaderScript}</script>
      </body>
    </html>
  )
})
```

### Шаг 3: Вызвать `hideAppLoader()` в Vue компоненте

В каждом Vue компоненте страницы добавьте вызов в `onMounted`:

```vue
<script setup>
import { onMounted } from 'vue'

onMounted(async () => {
  // Загружаем данные
  await Promise.all([loadSettings(), loadServices(), loadOAuthStatus()])

  // ВАЖНО: Скрываем прелоадер ПОСЛЕ загрузки данных
  if (window.hideAppLoader) {
    window.hideAppLoader()
  }
})
</script>
```

---

## Boot Sequence Preloader

### Концепция

Boot Sequence Preloader имитирует загрузку операционной системы или терминального приложения. Идеально подходит для:

- Аналитических систем
- DevOps инструментов
- Технических дашбордов
- IT-сервисов

### Ключевые особенности

1. **Терминальный стиль** - monospace шрифт, строки команд
2. **Реальный мониторинг** - отслеживание загрузки ресурсов через Performance API
3. **Последовательные сообщения** - каждый этап загрузки отображается
4. **Статус-индикаторы** - `[OK]`, `[LOAD]`, `[FAIL]`
5. **Мигающий курсор** - создаёт ощущение живой системы

### Полная реализация

#### Шаг 1: HTML и стили в `index.tsx`

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

        {/* Inline критические стили для предотвращения моргания */}
        <style>{`
          html {
            background: #0a0a0a;
          }
          body {
            margin: 0;
            background: #0a0a0a;
            min-height: 100vh;
          }

          /* Геометрический фон - статичный для preloader и контента */
          #geometric-bg {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 5;
            pointer-events: none;
          }
          #geometric-bg::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background:
              linear-gradient(90deg, transparent 0%, transparent calc(100% - 1px), #2a2a2a calc(100% - 1px)),
              linear-gradient(0deg, transparent 0%, transparent calc(100% - 1px), #2a2a2a calc(100% - 1px));
            background-size: 60px 60px;
            opacity: 0.12;
          }
          #geometric-bg::after {
            content: '';
            position: absolute;
            top: -50%;
            right: -10%;
            width: 600px;
            height: 600px;
            background: radial-gradient(circle, rgba(211, 35, 75, 0.08) 0%, transparent 70%);
            border-radius: 50%;
            animation: geometric-float 20s ease-in-out infinite;
          }
          @keyframes geometric-float {
            0%, 100% { transform: translate(0, 0) scale(1); }
            50% { transform: translate(-50px, 50px) scale(1.1); }
          }

          /* Boot Loader */
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
            background: transparent;
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
        `}</style>

        {/* JavaScript для мониторинга загрузки */}
        <script>{`
          (function() {
            var container = null;
            var loadedResources = new Set();
            var isComplete = false;

            // Последовательность загрузки с отслеживанием реальных ресурсов
            var bootSequence = [
              { type: 'init', msg: 'Инициализация системы...' },
              { type: 'html', msg: 'Парсинг HTML документа...' },
              { type: 'script', name: 'tailwind', msg: 'Загрузка Tailwind CSS...' },
              { type: 'link', name: 'fontawesome', msg: 'Загрузка FontAwesome иконок...' },
              { type: 'link', name: 'fonts.googleapis', msg: 'Подключение Google Fonts...' },
              { type: 'link', name: 'fonts.gstatic', msg: 'Загрузка шрифта Inter...' }
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

              // Ограничиваем количество сообщений на экране
              if (container.children.length > 12) {
                container.removeChild(container.children[0]);
              }
            }

            // Проверяем загрузку ресурса через Performance API
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

            // Мониторим загрузку ресурсов
            function monitorResources() {
              if (window.performance && window.performance.getEntriesByType) {
                var resources = window.performance.getEntriesByType('resource');
                for (var i = 0; i < resources.length; i++) {
                  checkResource(resources[i]);
                }
              }
            }

            // Завершаем последовательность
            function completeSequence() {
              if (isComplete) return;
              isComplete = true;

              addMessage('OK', 'Компоненты загружены');
              addMessage('OK', 'Инициализация Vue.js...');
              addMessage('OK', 'Проверка аутентификации...');
              addMessage('OK', 'Система готова к работе');

              var cursor = document.createElement('div');
              cursor.className = 'boot-cursor';
              cursor.textContent = '_';
              container.appendChild(cursor);

              setTimeout(hideBootLoader, 400);
            }

            // Скрытие bootloader
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

            // Запуск boot sequence
            function startBoot() {
              addMessage('OK', bootSequence[0].msg);
              addMessage('OK', bootSequence[1].msg);

              // Проверяем загрузку ресурсов каждые 50ms
              var checkInterval = setInterval(function() {
                monitorResources();
              }, 50);

              // Завершаем когда всё загружено
              window.addEventListener('load', function() {
                clearInterval(checkInterval);
                monitorResources();
                setTimeout(completeSequence, 100);
              });

              // Защита от зависания - максимум 3 секунды
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
        `}</script>

        <script src="/s/static/lib/tailwind.3.4.16.min.js"></script>
        <link rel="stylesheet" href="/s/static/lib/fontawesome/6.7.2/css/all.min.css" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />

        {/* CSS переменные темы */}
        <style>{`
          :root {
            --color-bg: #0a0a0a;
            --color-bg-secondary: #141414;
            --color-text: #e8e8e8;
            --color-accent: #d3234b;
          }
        `}</style>
      </head>
      <body>
        {/* Статичный геометрический фон */}
        <div id="geometric-bg"></div>

        {/* Boot Loader */}
        <div id="boot-loader">
          <div class="boot-messages">
            <div id="boot-messages-container"></div>
          </div>
        </div>

        {/* Основной контент */}
        <HomePage
          projectTitle="Аналитика телеграм-каналов"
          analyticsUrl="/analytics"
          channelsUrl="/channels"
          botsUrl="/bots"
          profileUrl="/profile"
          settingsUrl="/settings"
        />
      </body>
    </html>
  )
})
```

#### Шаг 2: Vue компонент ожидает завершения bootloader

```vue
<script setup lang="ts">
import { onMounted, ref } from 'vue'

const displayedTitle = ref('')
const showCursor = ref(true)
const showCards = ref(false)
const bootLoaderDone = ref(false)

const props = defineProps<{
  projectTitle: string
  analyticsUrl: string
  channelsUrl: string
  botsUrl: string
  profileUrl: string
  settingsUrl: string
}>()

onMounted(() => {
  // Ждём завершения bootloader
  const startAnimations = () => {
    bootLoaderDone.value = true
    setTimeout(() => {
      typeTitle()
    }, 100)
  }

  // Проверяем, завершён ли уже bootloader
  if ((window as any).bootLoaderComplete) {
    startAnimations()
  } else {
    window.addEventListener('bootloader-complete', startAnimations)
  }

  const typeTitle = () => {
    const fullText = props.projectTitle
    let currentIndex = 0

    const typeInterval = setInterval(() => {
      if (currentIndex < fullText.length) {
        displayedTitle.value = fullText.substring(0, currentIndex + 1)
        currentIndex++
      } else {
        clearInterval(typeInterval)
        setTimeout(() => {
          showCards.value = true
        }, 400)
      }
    }, 40)
  }
})
</script>

<template>
  <div class="app-layout">
    <!-- Header появляется только после bootloader -->
    <Header v-if="bootLoaderDone" :pageTitle="'Главная'" />

    <main class="content-wrapper">
      <div class="content-inner">
        <!-- Hero Section -->
        <section class="hero-section" :class="{ 'hero-ready': bootLoaderDone }">
          <!-- Иконка появляется вместе с карточками -->
          <div class="hero-icon-wrapper" :class="{ 'hero-icon-visible': showCards }">
            <i class="fas fa-chart-line hero-icon"></i>
          </div>

          <!-- Заголовок печатается посимвольно -->
          <h1 class="hero-heading">
            {{ displayedTitle }}<span v-if="showCursor" class="typing-cursor">|</span>
          </h1>

          <p class="hero-description">Выберите раздел для управления</p>
        </section>

        <!-- Карточки появляются после печати заголовка -->
        <section class="cards-section" :class="{ 'cards-visible': showCards }">
          <!-- Карточки навигации -->
        </section>
      </div>
    </main>

    <!-- Footer появляется только после bootloader -->
    <footer v-if="bootLoaderDone" class="app-footer">
      <!-- Контент футера -->
    </footer>
  </div>
</template>

<style>
/* Hero Section скрыт до завершения boot */
.hero-section {
  opacity: 0;
  transition: opacity 0.6s ease-out;
}

.hero-section.hero-ready {
  opacity: 1;
}

/* Мигающий курсор */
.typing-cursor {
  display: inline-block;
  margin-left: 4px;
  animation: cursor-blink 1s step-end infinite;
  color: var(--color-accent);
}

@keyframes cursor-blink {
  0%,
  50% {
    opacity: 1;
  }
  51%,
  100% {
    opacity: 0;
  }
}

/* Иконка появляется с анимацией */
.hero-icon-wrapper {
  opacity: 0;
  transform: scale(0.8);
  transition:
    opacity 0.6s cubic-bezier(0.34, 1.3, 0.64, 1),
    transform 0.6s cubic-bezier(0.34, 1.3, 0.64, 1);
}

.hero-icon-wrapper.hero-icon-visible {
  opacity: 1;
  transform: scale(1);
  animation: hero-icon-pulse 3s ease-in-out infinite 0.6s;
}

@keyframes hero-icon-pulse {
  0%,
  100% {
    box-shadow:
      0 8px 24px rgba(211, 35, 75, 0.4),
      0 4px 12px rgba(211, 35, 75, 0.3);
  }
  50% {
    box-shadow:
      0 12px 32px rgba(211, 35, 75, 0.5),
      0 6px 16px rgba(211, 35, 75, 0.4);
  }
}

/* Карточки появляются последовательно */
.nav-card {
  opacity: 0;
  transform: translateY(30px);
}

.cards-visible .nav-card {
  animation: card-appear 0.6s cubic-bezier(0.34, 1.3, 0.64, 1) forwards;
}

.cards-visible .nav-card:nth-child(1) {
  animation-delay: 0s;
}

.cards-visible .nav-card:nth-child(2) {
  animation-delay: 0.15s;
}

.cards-visible .nav-card:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes card-appear {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
```

### Ключевые моменты Boot Sequence

#### 1. Мониторинг реальных ресурсов

```javascript
// Performance API отслеживает ВСЕ загружаемые ресурсы
var resources = window.performance.getEntriesByType('resource')

// Проверяем каждый ресурс
for (var i = 0; i < resources.length; i++) {
  var name = resources[i].name

  // Сопоставляем с нашим списком
  if (name.indexOf('tailwind') !== -1) {
    addMessage('OK', 'Загрузка Tailwind CSS...')
  }
  if (name.indexOf('fontawesome') !== -1) {
    addMessage('OK', 'Загрузка FontAwesome иконок...')
  }
}
```

#### 2. Адаптивная длительность

```javascript
// Быстрая загрузка: показываем как есть, завершаем по window.load
window.addEventListener('load', function () {
  completeSequence()
})

// Медленная загрузка: показываем прогресс, но не дольше 3 секунд
setTimeout(function () {
  if (!isComplete) {
    completeSequence() // Защита от зависания
  }
}, 3000)
```

#### 3. Статичный фон

```html
<!-- Фон создаётся один раз в body и не меняется -->
<div id="geometric-bg"></div>

<!-- Boot loader прозрачный, фон виден сквозь него -->
<div id="boot-loader" style="background: transparent;"></div>
```

#### 4. Синхронизация с Vue

```javascript
// В JavaScript (preloader)
window.bootLoaderComplete = true
window.dispatchEvent(new Event('bootloader-complete'))

// В Vue
window.addEventListener('bootloader-complete', () => {
  // Запускаем анимации
  bootLoaderDone.value = true
})
```

### Варианты сообщений Boot Sequence

Для разных типов приложений можно использовать разные наборы сообщений:

#### Аналитическая система

```javascript
var bootMessages = [
  'Инициализация системы...',
  'Загрузка ядра приложения...',
  'Подключение Tailwind CSS...',
  'Загрузка иконок FontAwesome...',
  'Инициализация шрифтов Inter...',
  'Подключение Vue.js...',
  'Загрузка модулей аналитики...',
  'Подключение к базе данных...',
  'Проверка аутентификации...',
  'Система готова к работе'
]
```

#### CRM система

```javascript
var bootMessages = [
  'Инициализация CRM...',
  'Загрузка UI компонентов...',
  'Подключение к AmoCRM API...',
  'Проверка OAuth токенов...',
  'Синхронизация с базой данных...',
  'Загрузка пользовательских настроек...',
  'Инициализация вебхуков...',
  'Система готова к работе'
]
```

#### DevOps инструмент

```javascript
var bootMessages = [
  'Starting system initialization...',
  'Loading kernel modules...',
  'Checking dependencies...',
  'Connecting to API gateway...',
  'Authenticating user session...',
  'Loading configuration files...',
  'Starting monitoring services...',
  'System ready'
]
```

### Кастомизация внешнего вида

#### Изменение цветовой схемы

```css
/* Зелёный терминал (Matrix style) */
.boot-status {
  color: #00ff00; /* Зелёный статус */
}
.boot-cursor {
  color: #00ff00; /* Зелёный курсор */
}
.boot-text {
  color: #00cc00; /* Зелёный текст */
}

/* Синий терминал (Windows style) */
.boot-status {
  color: #0088cc;
}
.boot-cursor {
  color: #0088cc;
}

/* Красный терминал (Alert style) */
.boot-status {
  color: #d3234b;
}
.boot-cursor {
  color: #d3234b;
}
```

#### Добавление ASCII-арта логотипа

```javascript
function startBoot() {
  var ascii = [
    '  ___              _       _   _          ',
    ' / _ \\            | |     | | (_)         ',
    '/ /_\\ \\_ __   __ _| |_   _| |_ _  ___ ___ ',
    "|  _  | '_ \\ / _\` | | | | | __| |/ __/ __|",
    '| | | | | | | (_| | | |_| | |_| | (__\\__ \\',
    '\\_| |_/_| |_|\\__,_|_|\\__, |\\__|_|\\___|___/',
    '                      __/ |                ',
    '                     |___/                 ',
    ''
  ]

  // Добавляем ASCII-арт построчно
  for (var i = 0; i < ascii.length; i++) {
    addMessage('', ascii[i])
  }

  // Продолжаем обычные сообщения
  addMessage('OK', 'Инициализация системы...')
}
```

### Диагностика проблем загрузки

Boot Sequence Preloader позволяет диагностировать проблемы:

```javascript
// Добавьте обработку ошибок
function checkResource(resource) {
  // Проверяем время загрузки
  var duration = resource.duration

  if (duration > 2000) {
    // Медленная загрузка - предупреждение
    addMessage('WARN', item.msg + ' (медленно: ' + Math.round(duration) + 'ms)')
  } else if (duration > 5000) {
    // Очень медленная - ошибка
    addMessage('FAIL', item.msg + ' (таймаут)')
  } else {
    addMessage('OK', item.msg)
  }
}
```

### Интеграция с различными темами

Для поддержки множества тем создайте конфигурацию:

```typescript
// config/themes.ts
export const themes = {
  analytics: {
    color: '#d3234b',
    messages: [
      'Загрузка модулей аналитики...',
      'Подключение к базе данных...',
      'Проверка аутентификации...'
    ],
    icon: 'fa-chart-line'
  },
  crm: {
    color: '#0088cc',
    messages: [
      'Подключение к AmoCRM API...',
      'Проверка OAuth токенов...',
      'Синхронизация контактов...'
    ],
    icon: 'fa-users'
  },
  devops: {
    color: '#00c853',
    messages: [
      'Connecting to API gateway...',
      'Starting monitoring services...',
      'Loading deployment status...'
    ],
    icon: 'fa-server'
  }
}

// В роуте
export const route = app.get('/', async (ctx) => {
  const theme = await getTheme(ctx) // 'analytics' | 'crm' | 'devops'
  const config = themes[theme]

  return (
    <html>
      <head>
        <style>{`
          .boot-status { color: ${config.color}; }
          .boot-cursor { color: ${config.color}; }
        `}</style>

        <script>{`
          var themeMessages = ${JSON.stringify(config.messages)};
          // Используем themeMessages в bootSequence
        `}</script>
      </head>
      <body>
        <div id="boot-loader">...</div>
        <HomePage icon="${config.icon}" />
      </body>
    </html>
  )
})
```

### Преимущества Boot Sequence Preloader

✅ **Технологичный вид** - создаёт ощущение профессиональной системы
✅ **Диагностика** - видно на каком этапе произошла ошибка
✅ **Адаптивность** - легко настроить под разные темы
✅ **Реальный мониторинг** - показывает фактическую загрузку ресурсов
✅ **UX** - пользователь понимает что происходит
✅ **Брендинг** - усиливает восприятие как IT-продукта

### Недостатки и когда НЕ использовать

❌ **Не подходит для:**

- Простых лендингов
- Контентных сайтов
- Приложений для не-технической аудитории
- Быстрых страниц (загрузка < 200ms)

❌ **Может показаться:**

- Избыточным для простых задач
- Слишком "гиковским" для массовой аудитории
- Замедляющим (если последовательность слишком длинная)

### Когда использовать

✅ **Идеально подходит для:**

- Технических дашбордов
- Аналитических систем
- DevOps инструментов
- Admin панелей
- B2B SaaS продуктов
- IT-сервисов

---

## Частые ошибки: Как НЕ надо делать

### ❌ Ошибка 1: Использовать Vue компонент для прелоадера

**Неправильно:**

```vue
<!-- components/Loader.vue -->
<template>
  <div class="loader">Loading...</div>
</template>
```

**Почему плохо:**

- Vue компонент загружается С ЗАДЕРЖКОЙ
- Пользователь увидит белый экран до монтирования компонента
- FOUC (Flash of Unstyled Content) неизбежен

### ❌ Ошибка 2: CSS переменные в `type="text/tailwindcss"`

**Неправильно:**

```tsx
<style type="text/tailwindcss">{cssVariables}</style>
```

**Почему плохо:**

- Tailwind должен сначала обработать CSS
- Задержка применения переменных → белый экран
- Прелоадер не получит правильные цвета вовремя

**Правильно:**

```tsx
<style>{cssVariables}</style>  {/* БЕЗ type! */}
```

### ❌ Ошибка 3: Использовать CSS переменные в критических местах

**Неправильно:**

```css
#app-loader {
  background: var(--color-bg); /* Переменная применяется с задержкой! */
}

.loader-ring::before {
  background: var(--color-bg); /* Будет белым до применения CSS! */
}
```

**Правильно:**

```tsx
{/* Inline стили для мгновенного применения */}
<div id="app-loader" style="background: #0f172a;">
```

```css
.loader-ring::before {
  background: #0f172a; /* HARDCODED цвет! */
}
```

### ❌ Ошибка 4: Скрывать прелоадер по таймеру

**Неправильно:**

```javascript
// Фиксированная задержка - не учитывает реальное время загрузки
setTimeout(() => {
  hideLoader()
}, 1000)
```

**Почему плохо:**

- Быстрый интернет: прелоадер крутится дольше, чем нужно
- Медленный интернет: контент не успевает загрузиться
- Не учитывает время загрузки данных

**Правильно:**

```javascript
// Vue вызывает скрытие когда готов
window.hideAppLoader = function() { ... }

// Fallback только для защиты от зависания
setTimeout(() => {
  if (loaderVisible) hideLoader()
}, 5000)
```

### ❌ Ошибка 5: Использовать `dangerouslySetInnerHTML`

**Неправильно:**

```tsx
<div dangerouslySetInnerHTML={{ __html: loaderHTML }} />
```

**Почему плохо:**

- Может не отрендериться корректно
- Сложнее отлаживать
- Проблемы с React/JSX парсингом

**Правильно:**

```tsx
{
  /* Прямой JSX */
}
;<div id="app-loader">
  <div class="loader-content">
    <div class="loader-logo">
      <i class="fas fa-plug"></i>
    </div>
  </div>
</div>
```

### ❌ Ошибка 6: Скрывать через CSS классы при наличии inline стилей

**Неправильно:**

```css
#app-loader.loaded {
  display: none; /* НЕ СРАБОТАЕТ! inline display: flex побеждает */
}
```

```javascript
loader.classList.add('loaded') // Не скроет элемент!
```

**Почему плохо:**

- Inline стили имеют более высокий приоритет, чем CSS классы
- `display: flex` в inline побеждает `display: none` в классе

**Правильно:**

```javascript
// Переопределяем inline стиль напрямую
loader.style.display = 'none'
```

### ❌ Ошибка 7: Не скрывать контент изначально

**Неправильно:**

```tsx
<body>
  <div id="app-loader">...</div>
  <HomePage /> {/* Виден сразу! Моргает! */}
</body>
```

**Почему плохо:**

- Vue компоненты рендерятся параллельно с прелоадером
- Контент "просвечивает" через прелоадер
- Эффект мигания

**Правильно:**

```tsx
<body>
  <div id="app-loader">...</div>
  <div id="app-content" style="opacity: 0;">
    {' '}
    {/* Скрыт! */}
    <HomePage />
  </div>
</body>
```

### ❌ Ошибка 8: Использовать отдельные border-кольца

**Неправильно (рваный эффект):**

```css
.loader-ring:nth-child(1) {
  border-top-color: blue;
}
.loader-ring:nth-child(2) {
  border-right-color: blue;
}
.loader-ring:nth-child(3) {
  border-bottom-color: blue;
}
.loader-ring:nth-child(4) {
  border-left-color: blue;
}
```

**Правильно (плавный градиент):**

```css
.loader-ring {
  background: conic-gradient(
    from 0deg,
    transparent 0deg,
    var(--color-primary) 60deg,
    var(--color-primary-hover) 180deg,
    transparent 320deg
  );
}
```

---

## Примеры кода

### Полный пример: Минимальная реализация

**styles.tsx:**

```typescript
export const cssVariables = `
  :root {
    --bg: #0f172a;
    --primary: #0ea5e9;
  }
`

export const preloaderStyles = `
  #app-loader {
    position: fixed;
    inset: 0;
    background: var(--bg);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 99999;
  }
  
  .loader-spinner {
    width: 48px;
    height: 48px;
    border: 3px solid transparent;
    border-top-color: var(--primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`

export const loaderScript = `
  (function() {
    window.hideAppLoader = function() {
      const loader = document.getElementById('app-loader');
      const content = document.getElementById('app-content');
      if (loader && content) {
        loader.style.opacity = '0';
        content.style.opacity = '1';
        setTimeout(() => loader.remove(), 300);
      }
    };
  })();
`
```

**index.tsx:**

```typescript
import { jsx } from "@app/html-jsx"
import { cssVariables, preloaderStyles, loaderScript } from './styles'
import HomePage from './pages/HomePage.vue'

export const route = app.get('/', async (ctx) => {
  return (
    <html>
      <head>
        <style>{cssVariables}</style>
        <style>{preloaderStyles}</style>
      </head>
      <body style="margin: 0; background: #0f172a;">
        <div id="app-loader">
          <div class="loader-spinner"></div>
        </div>

        <div id="app-content" style="opacity: 0;">
          <HomePage />
        </div>

        <script>{loaderScript}</script>
      </body>
    </html>
  )
})
```

**HomePage.vue:**

```vue
<script setup>
import { onMounted } from 'vue'

onMounted(async () => {
  await loadData()

  if (window.hideAppLoader) {
    window.hideAppLoader()
  }
})
</script>
```

### Полный пример: Продвинутая реализация с градиентным спиннером

См. код выше в разделе "Шаг 1" - это и есть продвинутая версия с:

- Плавными появлением/исчезновением
- Градиентным conic-gradient спиннером
- Glow эффектом
- Пульсацией логотипа
- Адаптивностью

---

## Адаптация под разные темы

### Светлая тема

```tsx
<body style="background-color: #fafbfc;">
  {' '}
  {/* Светлый фон */}
  <div id="app-loader" style="background: #fafbfc;">
    {/* ... */}
  </div>
</body>
```

CSS:

```css
.loader-ring::before {
  background: #fafbfc; /* Светлый центр кольца */
}
```

### Тёмная тема

```tsx
<body style="background-color: #0f172a;">
  {' '}
  {/* Тёмный фон */}
  <div id="app-loader" style="background: #0f172a;">
    {/* ... */}
  </div>
</body>
```

CSS:

```css
.loader-ring::before {
  background: #0f172a; /* Тёмный центр кольца */
}
```

### Автоопределение темы (как в knowledge-app)

```tsx
export const route = app.get('/', async (ctx) => {
  // Получаем тему из настроек
  const defaultTheme = await getDefaultTheme(ctx)
  const bgColor = defaultTheme === 'dark' ? '#0f172a' : '#fafbfc'

  return (
    <html>
      <head>
        <style>{cssVariables}</style>
        <style>{preloaderStyles}</style>
        <script>{`
          // Применяем тему к HTML немедленно
          (function() {
            const theme = '${defaultTheme}';
            document.documentElement.setAttribute('data-theme', theme);
          })();
        `}</script>
      </head>
      <body style="background-color: ${bgColor};">
        <div id="app-loader" style="background: ${bgColor};">
          {/* ... */}
        </div>

        <div id="app-content" style="opacity: 0;">
          <HomePage />
        </div>

        <script>{loaderScript}</script>
      </body>
    </html>
  )
})
```

И обновите CSS:

```typescript
export const preloaderStyles = `
  .loader-ring::before {
    background: var(--color-bg);  /* Теперь можно использовать переменную */
  }
`
```

---

## Критические моменты (ЧЕКЛИСТ)

При внедрении прелоадера ОБЯЗАТЕЛЬНО проверьте:

### ✅ В `<head>`:

1. CSS переменные идут ПЕРВЫМИ
2. НЕТ `type="text/tailwindcss"` на критических стилях
3. Стили прелоадера идут ПОСЛЕ CSS переменных

### ✅ В `<body>`:

1. Есть **inline стиль** с `background-color`
2. Прелоадер имеет **inline стили** (position, background, display, z-index)
3. Контент обёрнут в `<div id="app-content" style="opacity: 0;">`
4. Скрипт `loaderScript` в конце body

### ✅ В Vue компонентах:

1. `window.hideAppLoader()` вызывается в `onMounted()`
2. Вызов ПОСЛЕ загрузки данных (если есть API запросы)

### ✅ В CSS прелоадера:

1. Критические цвета (фон центра кольца) - HARDCODED, не через var()
2. Анимации определены в том же блоке стилей
3. Есть адаптивность для мобильных

---

## Быстрое внедрение (за 5 минут)

### 1. Скопируйте готовые константы в `styles.tsx`

```typescript
export const preloaderStyles = `/* см. выше полный код */`
export const loaderScript = `/* см. выше полный код */`
```

### 2. Обновите роуты

Для каждого роута:

```tsx
import { preloaderStyles, loaderScript } from './styles'

// В <head>:
<style>{cssVariables}</style>
<style>{preloaderStyles}</style>

// В <body>:
<body style="background: #0f172a;">
  <div id="app-loader" style="position: fixed; inset: 0; background: #0f172a; display: flex; align-items: center; justify-content: center; z-index: 999999;">
    <div class="loader-content">
      <div class="loader-logo"><i class="fas fa-plug"></i></div>
      <div class="loader-spinner"><div class="loader-ring"></div></div>
      <p class="loader-text">Загрузка...</p>
    </div>
  </div>

  <div id="app-content" style="opacity: 0;">
    <YourVueComponent />
  </div>

  <script>{loaderScript}</script>
</body>
```

### 3. Добавьте вызов в Vue компоненты

В каждый компонент страницы:

```vue
onMounted(async () => { await loadData() // Ваша логика if (window.hideAppLoader) {
window.hideAppLoader() } })
```

**Готово!** ✅

---

## Визуальные эффекты

### Градиентный спиннер (conic-gradient)

**Почему conic-gradient:**

- ✅ Плавный переход цветов
- ✅ Современный вид
- ✅ Один элемент вместо четырёх
- ✅ Легко кастомизировать

**Параметры:**

```css
background: conic-gradient(
  from 0deg,
  /* Начальный угол */ transparent 0deg,
  /* Прозрачная зона начало */ transparent 40deg,
  /* Прозрачная зона конец */ #0ea5e9 60deg,
  /* Градиент начало */ #0284c7 180deg,
  /* Градиент середина */ #0ea5e9 300deg,
  /* Градиент конец */ transparent 320deg,
  /* Прозрачная зона начало */ transparent 360deg /* Прозрачная зона конец */
);
```

### Glow эффект (свечение)

Использует псевдоэлемент `::after` с `filter: blur()`:

```css
.loader-ring::after {
  content: '';
  position: absolute;
  inset: -2px; /* Чуть больше основного элемента */
  background: conic-gradient(/* тот же градиент, но полупрозрачный */);
  border-radius: 50%;
  filter: blur(8px); /* Размытие создаёт glow */
  z-index: -1;
}
```

### Пульсация с масштабированием

```css
@keyframes loader-logo-pulse {
  0%,
  100% {
    transform: scale(1);
    box-shadow: 0 8px 32px rgba(14, 165, 233, 0.3);
  }
  50% {
    transform: scale(1.05); /* Увеличение */
    box-shadow: 0 8px 48px rgba(14, 165, 233, 0.5); /* Усиление тени */
  }
}
```

### Crossfade переход (прелоадер ↔ контент)

```javascript
// Одновременно:
loader.style.opacity = '0' // Прелоадер исчезает
content.style.opacity = '1' // Контент появляется

// С одинаковой анимацией:
loader.style.transition = 'opacity 0.4s ease'
content.style.transition = 'opacity 0.4s ease'
```

---

## Отладка

### Проверка 1: Виден ли прелоадер?

Откройте DevTools → Network → поставьте Throttling на "Slow 3G"
Обновите страницу - прелоадер должен показываться несколько секунд.

### Проверка 2: Нет ли белого экрана?

В DevTools → Elements → посмотрите на `<body>` - должен быть inline стиль:

```html
<body style="background-color: #0f172a;"></body>
```

### Проверка 3: Скрывается ли прелоадер?

В консоли после загрузки проверьте:

```javascript
document.getElementById('app-loader') // Должен быть null (удалён)
```

### Проверка 4: Вызывается ли hideAppLoader?

Добавьте в `onMounted`:

```vue
onMounted(async () => { console.log('Vue mounted!') if (window.hideAppLoader) { console.log('Hiding
loader...') window.hideAppLoader() } else { console.error('hideAppLoader not found!') } })
```

---

## Продвинутые техники

### Прогресс-бар вместо спиннера

```css
.loader-progress {
  width: 200px;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
  margin: 0 auto;
}

.loader-progress-bar {
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary), var(--color-primary-hover));
  animation: progress 2s ease-in-out infinite;
}

@keyframes progress {
  0% {
    width: 0%;
  }
  50% {
    width: 70%;
  }
  100% {
    width: 100%;
  }
}
```

### Множественные спиннеры (орбиты)

```css
.loader-orbit {
  position: absolute;
  border: 2px solid transparent;
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: orbit 1.5s linear infinite;
}

.loader-orbit:nth-child(1) {
  width: 60px;
  height: 60px;
}

.loader-orbit:nth-child(2) {
  width: 80px;
  height: 80px;
  animation-duration: 2s;
  opacity: 0.6;
}

@keyframes orbit {
  to {
    transform: rotate(360deg);
  }
}
```

### Skeleton loader (для SSR)

Если используете SSR, можно показать "скелет" страницы:

```tsx
<div id="app-loader">
  <div class="skeleton-header"></div>
  <div class="skeleton-content">
    <div class="skeleton-line"></div>
    <div class="skeleton-line"></div>
    <div class="skeleton-line"></div>
  </div>
</div>
```

```css
.skeleton-line {
  height: 16px;
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.1) 0%,
    rgba(255, 255, 255, 0.2) 50%,
    rgba(255, 255, 255, 0.1) 100%
  );
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s ease-in-out infinite;
}

@keyframes skeleton-loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
```

---

## Производительность

### Оптимизация 1: Удаление из DOM

После скрытия прелоадер **удаляется из DOM**:

```javascript
loader.parentNode.removeChild(loader)
```

**Почему важно:**

- Освобождает память
- Убирает лишний элемент из дерева
- Останавливает анимации

### Оптимизация 2: will-change

Для плавных анимаций:

```css
#app-loader {
  will-change: opacity, transform;
}
```

### Оптимизация 3: transform вместо position

Для анимаций используйте `transform`, а не `top/left`:

```css
/* Плохо (перерисовка layout) */
@keyframes slide {
  from {
    top: -100px;
  }
  to {
    top: 0;
  }
}

/* Хорошо (только compositing) */
@keyframes slide {
  from {
    transform: translateY(-100px);
  }
  to {
    transform: translateY(0);
  }
}
```

---

## Резюме: Золотые правила

1. **Inline стили для критических элементов** - background, display, position
2. **CSS переменные БЕЗ type="text/tailwindcss"** - для мгновенного применения
3. **Контент скрыт изначально** - `opacity: 0` на контейнере
4. **Vue вызывает скрытие** - через `window.hideAppLoader()` в `onMounted`
5. **Fallback на 5 секунд** - защита от зависания
6. **Hardcode критических цветов** - центр спиннера, базовый фон
7. **Удаление из DOM** - после скрытия для очистки памяти
8. **Градиентный спиннер** - conic-gradient вместо отдельных border-колец
9. **Плавные переходы** - crossfade между прелоадером и контентом
10. **Адаптивность** - медиа-запросы для мобильных

---

## Опыт из диалога: Что мы пробовали

### Попытка 1: Vue компонент ❌

- Создали `components/Loader.vue`
- **Провал:** Компонент загружается слишком поздно, белый экран остался

### Попытка 2: dangerouslySetInnerHTML ❌

- Вставляли HTML через innerHTML
- **Провал:** Некорректный рендеринг, проблемы с парсингом

### Попытка 3: CSS переменные через Tailwind ❌

- `<style type="text/tailwindcss">{cssVariables}</style>`
- **Провал:** Tailwind обрабатывает с задержкой → белый экран

### Попытка 4: CSS классы для скрытия ❌

- `.loaded { display: none }`
- **Провал:** Inline `display: flex` побеждает CSS класс

### Попытка 5: Фиксированный таймер ❌

- `setTimeout(hideLoader, 1000)`
- **Провал:** Не учитывает реальное время загрузки

### Попытка 6: Отдельные border-кольца ❌

- 4 div с разными border-color
- **Провал:** Рваный эффект, не плавный

### ✅ ФИНАЛЬНОЕ РЕШЕНИЕ:

- Inline стили на критических элементах
- CSS переменные в обычном `<style>`
- Градиентный conic-gradient спиннер
- Hardcoded цвета в критических местах
- Vue вызывает скрытие когда готов
- Crossfade переход

---

## Пример для копирования (готовый шаблон)

**Создайте файл `styles.tsx`** и скопируйте код из раздела "Шаг 1" выше.

**Обновите роут `index.tsx`:**

```typescript
import { cssVariables, preloaderStyles, loaderScript } from './styles'

export const indexPageRoute = app.get('/', async (ctx) => {
  return (
    <html>
      <head>
        <style>{cssVariables}</style>
        <style>{preloaderStyles}</style>
        <script src="/s/static/lib/tailwind.3.4.16.min.js"></script>
        <link href="/s/static/lib/fontawesome/6.7.2/css/all.min.css" rel="stylesheet" />
      </head>
      <body style="margin: 0; padding: 0; background-color: #0f172a; min-height: 100vh;">
        <div id="app-loader" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: #0f172a; display: flex; align-items: center; justify-content: center; z-index: 999999;">
          <div class="loader-content">
            <div class="loader-logo"><i class="fas fa-plug"></i></div>
            <div class="loader-spinner"><div class="loader-ring"></div></div>
            <p class="loader-text">Загрузка приложения...</p>
          </div>
        </div>

        <div id="app-content" style="opacity: 0;">
          <HomePage />
        </div>

        <script>{loaderScript}</script>
      </body>
    </html>
  )
})
```

**Обновите Vue компонент:**

```vue
<script setup>
import { onMounted } from 'vue'

onMounted(async () => {
  await loadYourData()

  if (window.hideAppLoader) {
    window.hideAppLoader()
  }
})
</script>
```

**Готово! Прелоадер работает.** 🎉

---

## FAQ

### Q: Почему прелоадер мигает белым?

A: Проверьте inline стили на `<body>` и `#app-loader`. Должны быть hardcoded цвета, не CSS переменные.

### Q: Почему прелоадер не скрывается?

A: Убедитесь, что `window.hideAppLoader()` вызывается в `onMounted()` ВСЕХ страниц.

### Q: Почему элементы "прыгают" при загрузке?

A: Контент должен быть обёрнут в `<div id="app-content" style="opacity: 0;">`.

### Q: Можно ли использовать другую иконку?

A: Да! Замените класс иконки:

```tsx
<i class="fas fa-spinner"></i>  {/* spinner */}
<i class="fas fa-circle-notch"></i>  {/* circle */}
<i class="fas fa-cog"></i>  {/* шестерёнка */}
```

### Q: Как изменить цвет прелоадера?

A: Измените `background` в inline стиле и `background` в `.loader-ring::before`:

```tsx
<div style="background: #1a1a1a;">  {/* Ваш цвет */}
```

```css
.loader-ring::before {
  background: #1a1a1a; /* Тот же цвет */
}
```

---

## Итоговая структура проекта

```
amocrm-connector/
├── styles.tsx
│   ├── cssVariables       ← CSS переменные тем
│   ├── preloaderStyles    ← Стили прелоадера
│   ├── loaderScript       ← Скрипт скрытия
│   └── commonStyles       ← Общие стили
├── index.tsx              ← Главная страница
│   └── <html>
│       └── <head>
│           ├── <style>{cssVariables}</style>          ← ПЕРВЫЙ
│           ├── <style>{preloaderStyles}</style>       ← ВТОРОЙ
│           └── <остальные библиотеки>
│       └── <body style="background: #0f172a;">        ← INLINE!
│           ├── <div id="app-loader" style="...">      ← INLINE!
│           ├── <div id="app-content" style="opacity:0;"> ← СКРЫТ
│           └── <script>{loaderScript}</script>
├── pages/
│   └── HomePage.vue
│       └── onMounted()
│           └── window.hideAppLoader()                 ← ВЫЗОВ
```

---

## Заключение

Правильно реализованный прелоадер:

- 🎯 Показывается **мгновенно** при загрузке страницы
- ⚡ Скрывается **автоматически** когда Vue готов
- 🎨 Выглядит **современно** с плавными анимациями
- 📱 **Адаптивен** под разные экраны
- 🛡️ Имеет **fallback** защиту от зависания
- ♻️ **Очищает память** при удалении

Следуйте этой инструкции, и вы получите профессиональный прелоадер без белых экранов, миганий и прыжков контента!

---

**Версия:** 1.0  
**Дата:** 3 ноября 2025  
**Платформа:** Chatium
