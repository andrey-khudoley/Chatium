// @shared
import { jsx } from '@app/html-jsx'
import WebAppIndex from './pages/WebAppIndex.vue'
import { requireRealUser } from '@app/auth'

export const indexPageRoute = app.get('/', async (ctx, req) => {
  const user = await requireRealUser(ctx)

  return (
    <html>
      <head>
        <title>Telegram Web App</title>
        {/* Базовые мета данные для мобильных устройств */}
        <meta charset="UTF-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"
        />

        {/* Мета данные для предотвращения зума и создания нативного опыта */}
        <meta name="format-detection" content="telephone=no" />
        <meta name="msapplication-tap-highlight" content="no" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Telegram Web App" />

        {/* Предотвращение выделения текста и контекстных меню */}
        <meta name="theme-color" content="#ffffff" />

        {/* Telegram Web App SDK */}
        <script src="https://telegram.org/js/telegram-web-app.js"></script>

        {/* TailwindCSS для современной стилизации */}
        <script src="/s/static/lib/tailwind.3.4.16.min.js"></script>

        <link href="/s/static/lib/fontawesome/6.7.2/css/all.min.css" rel="stylesheet"></link>

        {/* Аналитика */}
        <script src="/s/metric/clarity.js"></script>

        {/* Стили для Telegram Web App */}
        <style type="text/tailwindcss">{`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

          /* Light theme (default) */
          :root {
            --tg-theme-bg-color: #ffffff;
            --tg-theme-bg-gradient-from: #f0f9ff;
            --tg-theme-bg-gradient-to: #ffffff;
            --tg-theme-card-bg: #ffffff;
            --tg-theme-border-color: #e5e7eb;
            --tg-theme-border-light: #f3f4f6;
            --tg-theme-text-color: #000000;
            --tg-theme-text-primary: #1f2937;
            --tg-theme-text-secondary: #6b7280;
            --tg-theme-text-muted: #9ca3af;
            --tg-theme-hint-color: #999999;
            --tg-theme-accent-bg: #dbeafe;
            --tg-theme-accent-color: #2563eb;
            --tg-theme-success-bg: #dcfce7;
            --tg-theme-success-color: #16a34a;
            --tg-theme-hover-border: #93c5fd;
            --tg-theme-shadow: rgba(0, 0, 0, 0.1);
            --tg-theme-link-color: #2481cc;
            --tg-theme-button-color: #2481cc;
            --tg-theme-button-text-color: #ffffff;
            --tg-theme-secondary-bg-color: #f1f1f1;
            --font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
          }

          /* Dark theme */
          [data-theme="dark"] {
            --tg-theme-bg-color: #212d3b;
            --tg-theme-bg-gradient-from: #1e293b;
            --tg-theme-bg-gradient-to: #0f172a;
            --tg-theme-card-bg: #334155;
            --tg-theme-border-color: #475569;
            --tg-theme-border-light: #374151;
            --tg-theme-text-color: #ffffff;
            --tg-theme-text-primary: #f8fafc;
            --tg-theme-text-secondary: #cbd5e1;
            --tg-theme-text-muted: #94a3b8;
            --tg-theme-hint-color: #708499;
            --tg-theme-accent-bg: #1e40af;
            --tg-theme-accent-color: #60a5fa;
            --tg-theme-success-bg: #166534;
            --tg-theme-success-color: #4ade80;
            --tg-theme-hover-border: #3b82f6;
            --tg-theme-shadow: rgba(0, 0, 0, 0.3);
            --tg-theme-link-color: #6ab7ff;
            --tg-theme-button-color: #5288c1;
            --tg-theme-button-text-color: #ffffff;
            --tg-theme-secondary-bg-color: #151e27;
          }

          * {
            box-sizing: border-box;
            -webkit-tap-highlight-color: transparent;
          }

          html {
            height: 100%;
            width: 100%;
            overflow-x: hidden;
          }

          body {
            margin: 0;
            padding: 0;
            font-family: var(--font-family);
            background-color: var(--tg-theme-bg-color);
            color: var(--tg-theme-text-color);
            height: 100vh;
            width: 100vw;
            overflow-x: hidden;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            user-select: none;
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
          }

          [data-v-app] {
            height: 100%
          }

          #app {
            height: 100vh;
            width: 100vw;
            display: flex;
            flex-direction: column;
          }

          .tg-button {
            background-color: var(--tg-theme-button-color);
            color: var(--tg-theme-button-text-color);
            border: none;
            border-radius: 8px;
            padding: 12px 24px;
            font-size: 16px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            touch-action: manipulation;
          }

          .tg-button:active {
            transform: scale(0.98);
          }

          .tg-button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }

          .tg-secondary-button {
            background-color: var(--tg-theme-secondary-bg-color);
            color: var(--tg-theme-text-color);
            border: 1px solid var(--tg-theme-hint-color);
          }

          .counter-button {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            font-weight: 600;
            touch-action: manipulation;
          }

          .haptic-feedback {
            transition: transform 0.1s ease;
          }

          .haptic-feedback:active {
            transform: scale(0.95);
          }
        `}</style>

        {/* Инициализация Telegram Web App */}
        <script>{`
          window.addEventListener('DOMContentLoaded', function() {
            if (window.Telegram && window.Telegram.WebApp) {
              const tg = window.Telegram.WebApp;

              // Расширяем приложение на весь экран
              tg.expand();

              // Раскомментируй, если нужно подтверждение перед закрытием приложения
              // tg.enableClosingConfirmation();

              // Применяем тему на основе настроек Telegram
              const applyTheme = () => {
                const isDark = tg.colorScheme === 'dark';
                document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
                tg.setHeaderColor(isDark ? '#212d3b' : '#ffffff');
                tg.setBackgroundColor(isDark ? '#212d3b' : '#ffffff');
              };

              applyTheme();

              // Готово к использованию
              tg.ready();

              // Делаем Telegram Web App доступным глобально
              window.tg = tg;

              // Haptic feedback функция
              window.hapticFeedback = function(type) {
                if (tg.HapticFeedback) {
                  switch(type) {
                    case 'light':
                      tg.HapticFeedback.impactOccurred('light');
                      break;
                    case 'medium':
                      tg.HapticFeedback.impactOccurred('medium');
                      break;
                    case 'heavy':
                      tg.HapticFeedback.impactOccurred('heavy');
                      break;
                    case 'success':
                      tg.HapticFeedback.notificationOccurred('success');
                      break;
                    case 'error':
                      tg.HapticFeedback.notificationOccurred('error');
                      break;
                    case 'warning':
                      tg.HapticFeedback.notificationOccurred('warning');
                      break;
                    default:
                      tg.HapticFeedback.selectionChanged();
                  }
                }
              };
            }
          });
        `}</script>
      </head>
      <body>
        <div id="app">
          <WebAppIndex user={user} />
        </div>
      </body>
    </html>
  )
})
