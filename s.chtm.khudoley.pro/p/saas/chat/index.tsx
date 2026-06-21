import { jsx } from '@app/html-jsx'
import { genSocketId } from '@app/socket'
import App from './App.vue'
import LandingPage from './pages/LandingPage.vue'
import { getAppUrl, getAppBasePath } from './shared/app-paths'

// CSS файлы загружаются при старте сервера
// Для чтения используем относительные пути от рабочей директории
async function loadCssFile(fileName: string): Promise<string> {
  try {
    // В среде Chatium читаем файл через Deno API
    const filePath = `./styles/${fileName}`
    const content = await Deno.readTextFile(filePath)
    return content
  } catch {
    return ''
  }
}

// Роут для theme.css
export const themeCssRoute = app.get('/styles/theme.css', async (ctx, req) => {
  const css = await loadCssFile('theme.css')
  return ctx.resp.rawResponse(css, {
    status: 200,
    headers: { 'Content-Type': 'text/css; charset=utf-8', 'Cache-Control': 'public, max-age=3600' }
  })
})

// Роут для chat-view.css
export const chatViewCssRoute = app.get('/styles/chat-view.css', async (ctx, req) => {
  const css = await loadCssFile('chat-view.css')
  return ctx.resp.rawResponse(css, {
    status: 200,
    headers: { 'Content-Type': 'text/css; charset=utf-8', 'Cache-Control': 'public, max-age=3600' }
  })
})

// Роут для message-selection.css
export const messageSelectionCssRoute = app.get(
  '/styles/message-selection.css',
  async (ctx, req) => {
    const css = await loadCssFile('message-selection.css')
    return ctx.resp.rawResponse(css, {
      status: 200,
      headers: {
        'Content-Type': 'text/css; charset=utf-8',
        'Cache-Control': 'public, max-age=3600'
      }
    })
  }
)

export const indexPageRoute = app.html('/', async (ctx, req) => {
  const isAuthenticated = !!ctx.user

  // Генерируем encoded socket ID для пользователя (для real-time обновлений)
  let userSocketId = null
  if (isAuthenticated) {
    userSocketId = await genSocketId(ctx, `user-${ctx.user.id}`)
  }

  // Динамически определяем базовый путь для ресурсов
  const manifestUrl = getAppUrl(ctx, '/manifest.json')
  const stylesBaseUrl = getAppUrl(ctx, '/styles')

  return (
    <html lang="ru">
      <head>
        <title>{isAuthenticated ? 'Чаты' : 'Chatium Chat — Общайтесь без границ'}</title>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
        />
        <meta name="theme-color" content="#008069" />
        <meta name="background-color" content="#f0f2f5" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Chatium Chat" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="Chatium Chat" />
        <meta
          name="description"
          content="Современный мессенджер для общения без границ. Групповые чаты, каналы, голосовые и видео-сообщения."
        />
        <meta name="format-detection" content="telephone=no" />

        {/* PWA Manifest */}
        <link rel="manifest" href={manifestUrl} />

        {/* Apple Touch Icons */}
        <link rel="apple-touch-icon" href="https://fs.chatium.ru/get/image_msk_AaplkedAT7" />

        {/* Favicon */}
        <link rel="icon" type="image/png" href="https://fs.chatium.ru/get/image_msk_AaplkedAT7" />

        <script src="/s/metric/clarity.js"></script>
        <script src="/s/static/lib/tailwind.3.4.16.min.js"></script>
        <link href="/s/static/lib/fontawesome/6.7.2/css/all.min.css" rel="stylesheet" />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.6.1/cropper.min.css"
        />
        <script src="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.6.1/cropper.min.js"></script>

        {/* Стили приложения с версионированием для сброса кэша */}
        <link href={`${stylesBaseUrl}/theme.css?v=2`} rel="stylesheet" />
        <link href={`${stylesBaseUrl}/chat-view.css?v=2`} rel="stylesheet" />
        <link href={`${stylesBaseUrl}/message-selection.css?v=2`} rel="stylesheet" />

        <script>{`
          tailwind.config = {
            theme: {
              extend: {
                colors: {
                  primary: '#008069',
                  secondary: '#00a884',
                }
              }
            }
          }
        `}</script>
        <style>{`
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          html, body {
            height: 100%;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
          }
          /* CSS переменная для масштаба интерфейса */
          :root {
            --ui-scale: 1;
          }
          
          /* Стили для скелетон-загрузки */
          .app-skeleton {
            position: fixed;
            inset: 0;
            background: #f0f2f5;
            display: flex;
            z-index: 1;
          }
          
          .skeleton-sidebar {
            width: 360px;
            background: #ffffff;
            border-right: 1px solid #e0e0e0;
            display: flex;
            flex-direction: column;
          }
          
          .skeleton-header {
            height: 60px;
            background: #f0f2f5;
            border-bottom: 1px solid #e0e0e0;
          }
          
          .skeleton-list {
            flex: 1;
            padding: 8px;
          }
          
          .skeleton-item {
            height: 72px;
            background: linear-gradient(90deg, #f0f2f5 25%, #e8e8e8 50%, #f0f2f5 75%);
            background-size: 200% 100%;
            animation: skeleton-loading 1.5s infinite;
            border-radius: 8px;
            margin-bottom: 8px;
          }
          
          .skeleton-content {
            flex: 1;
            background: #e5ddd5;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #667781;
            font-size: 16px;
          }
          
          @keyframes skeleton-loading {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
          
          @media (max-width: 768px) {
            .skeleton-sidebar {
              width: 100%;
            }
            .skeleton-content {
              display: none;
            }
          }
          
          /* Скрыть скелетон после загрузки */
          .app-loaded .app-skeleton {
            display: none;
          }
        `}</style>

        {/* Инициализация масштаба из localStorage - выполняется до загрузки Vue */}
        <script type="text/javascript">{`
          (function() {
            try {
              const savedScale = localStorage.getItem('chat-ui-scale');
              if (savedScale) {
                const scale = parseInt(savedScale, 10);
                if (!isNaN(scale) && scale >= 50 && scale <= 300) {
                  document.documentElement.style.setProperty('--ui-scale', scale / 100);
                  document.documentElement.style.fontSize = 'calc(16px * ' + (scale / 100) + ')';
                }
              }
            } catch (e) {
              // Игнорируем ошибки localStorage
            }
          })();
        `}</script>

        {/* Диагностика загрузки стилей */}
        <script type="text/javascript">{`
          (function() {
            window.styleLoadStatus = {
              theme: false,
              chatView: false,
              messageSelection: false,
              fontAwesome: false,
              cropper: false
            };
            
            function checkStylesLoaded() {
              const styles = document.styleSheets;
              for (let i = 0; i < styles.length; i++) {
                try {
                  const href = styles[i].href || '';
                  if (href.includes('theme.css')) window.styleLoadStatus.theme = true;
                  if (href.includes('chat-view.css')) window.styleLoadStatus.chatView = true;
                  if (href.includes('message-selection.css')) window.styleLoadStatus.messageSelection = true;
                  if (href.includes('fontawesome')) window.styleLoadStatus.fontAwesome = true;
                  if (href.includes('cropper')) window.styleLoadStatus.cropper = true;
                } catch (e) {
                  // Игнорируем ошибки CORS для внешних стилей
                }
              }
            }
            
            // Проверяем после загрузки DOM
            if (document.readyState === 'loading') {
              document.addEventListener('DOMContentLoaded', checkStylesLoaded);
            } else {
              checkStylesLoaded();
            }
            
            // Повторная проверка после полной загрузки
            window.addEventListener('load', function() {
              checkStylesLoaded();
              // Добавляем класс для скрытия скелетона
              document.body.classList.add('app-loaded');
              
              // Логируем статус для отладки (только в dev режиме)
              if (location.hostname === 'localhost' || location.search.includes('debug=1')) {
                console.log('[Chatium Chat] Styles load status:', window.styleLoadStatus);
              }
            });
            
            // Обработка ошибок загрузки CSS
            window.addEventListener('error', function(e) {
              if (e.target && e.target.tagName === 'LINK') {
                console.warn('[Chatium Chat] Failed to load stylesheet:', e.target.href);
                // Можно добавить fallback загрузку
              }
            }, true);
          })();
        `}</script>
      </head>
      <body>
        {/* Скелетон-загрузка */}
        <div class="app-skeleton">
          <div class="skeleton-sidebar">
            <div class="skeleton-header"></div>
            <div class="skeleton-list">
              <div class="skeleton-item"></div>
              <div class="skeleton-item"></div>
              <div class="skeleton-item"></div>
              <div class="skeleton-item"></div>
              <div class="skeleton-item"></div>
            </div>
          </div>
          <div class="skeleton-content">
            <span>Загрузка...</span>
          </div>
        </div>

        {isAuthenticated ? <App userSocketId={userSocketId} /> : <LandingPage />}
      </body>
    </html>
  )
})
