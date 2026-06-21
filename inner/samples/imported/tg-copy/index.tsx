import { jsx } from '@app/html-jsx'
import { genSocketId } from '@app/socket'
import App from './App.vue'

export const indexPageRoute = app.html('/', async (ctx, req) => {
  // Если пользователь не авторизован - редирект на стандартную авторизацию Chatium
  if (!ctx.user) {
    return ctx.resp.redirect('/s/auth/signin?back=/tg')
  }

  // Генерируем encoded socket ID для пользователя (для real-time обновлений)
  const userSocketId = await genSocketId(ctx, `user-${ctx.user.id}`)

  // Вычисляем базовый URL-путь текущего приложения (например /tg/ или /inner/samples/imported/tg-copy/).
  // Это нужно для корректной регистрации Service Worker и загрузки статики.
  let basePath = '/tg/'
  try {
    const u = new URL(indexPageRoute.url())
    basePath = u.pathname.endsWith('/') ? u.pathname : u.pathname + '/'
  } catch (e) {
    basePath = '/tg/'
  }

  return (
    <html lang="ru">
      <head>
        <title>Чаты</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <meta name="theme-color" content="#008069" />
        <meta name="background-color" content="#e5ddd5" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Chatium Chat" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="Chatium Chat" />
        <meta name="description" content="Современный мессенджер для общения без границ. Групповые чаты, каналы, голосовые и видео-сообщения." />
        <meta name="format-detection" content="telephone=no" />
        
        {/* PWA Manifest */}
        <link rel="manifest" href={`${basePath}manifest.json`} />
        
        {/* Apple Touch Icons — multiple sizes for better iOS support */}
        <link rel="apple-touch-icon" sizes="72x72" href="https://fs.chatium.ru/get/image_msk_AaplkedAT7" />
        <link rel="apple-touch-icon" sizes="96x96" href="https://fs.chatium.ru/get/image_msk_AaplkedAT7" />
        <link rel="apple-touch-icon" sizes="144x144" href="https://fs.chatium.ru/get/image_msk_AaplkedAT7" />
        <link rel="apple-touch-icon" sizes="152x152" href="https://fs.chatium.ru/get/image_msk_AaplkedAT7" />
        <link rel="apple-touch-icon" sizes="167x167" href="https://fs.chatium.ru/get/image_msk_AaplkedAT7" />
        <link rel="apple-touch-icon" sizes="180x180" href="https://fs.chatium.ru/get/image_msk_AaplkedAT7" />
        <link rel="apple-touch-icon" sizes="192x192" href="https://fs.chatium.ru/get/image_msk_AaplkedAT7" />
        
        {/* Favicon — multiple sizes for different devices */}
        <link rel="icon" type="image/png" sizes="16x16" href="https://fs.chatium.ru/get/image_msk_AaplkedAT7" />
        <link rel="icon" type="image/png" sizes="32x32" href="https://fs.chatium.ru/get/image_msk_AaplkedAT7" />
        <link rel="icon" type="image/png" sizes="96x96" href="https://fs.chatium.ru/get/image_msk_AaplkedAT7" />
        <link rel="icon" type="image/png" sizes="192x192" href="https://fs.chatium.ru/get/image_msk_AaplkedAT7" />
        <link rel="icon" type="image/png" sizes="512x512" href="https://fs.chatium.ru/get/image_msk_AaplkedAT7" />
        
        <script src="/s/metric/clarity.js"></script>
        <script src="/s/static/lib/tailwind.3.4.16.min.js"></script>
        <link href="/s/static/lib/fontawesome/6.7.2/css/all.min.css" rel="stylesheet" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.6.1/cropper.min.css" />
        <script src="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.6.1/cropper.min.js"></script>
        
        {/* Firebase SDK для Push-уведомлений (compat версии) - defer для гарантии порядка загрузки */}
        <script type="text/javascript">{`window.APP_BASE_PATH = ${JSON.stringify(basePath)};`}</script>
        <script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js" defer></script>
        <script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js" defer></script>
        <script src={`${basePath}firebase-config.js`} defer></script>
        
        {/* Inline CSS - theme.css */}
        <style>{`
          /* Тематический паттерн для нутрициологии */
          .chat-pattern-bg {
            position: relative;
          }
          .chat-pattern-bg::before {
            content: '';
            position: absolute;
            inset: 0;
            background-image: url('https://sel.cdn-chatium.io/get/image_msk_JBiawVjTbX.1376x768.png');
            background-size: 400px auto;
            background-repeat: repeat;
            opacity: 0.04;
            pointer-events: none;
            z-index: 0;
          }
          [data-theme="dark"] .chat-pattern-bg::before {
            opacity: 0.03;
            filter: brightness(1.2);
          }
          
          :root {
            /* Светлая тема (по умолчанию) - Telegram Style */
            --bg-primary: #ffffff;
            --bg-secondary: #f0f2f5;
            --bg-tertiary: #e5ddd5;
            --bg-hover: rgba(0, 0, 0, 0.05);
            
            --text-primary: #111b21;
            --text-secondary: #667781;
            --text-muted: #8696a0;
            --text-inverse: #ffffff;
            
            --border-color: #d1d7db;
            --border-light: #e9edef;
            
            --bubble-own: #d9fdd3;
            --bubble-other: #ffffff;
            --bubble-shadow: 0 1px 0.5px rgba(0, 0, 0, 0.13);
            
            --input-bg: #ffffff;
            --input-border: transparent;
            --input-placeholder: #667781;
            
            --header-bg: #ffffff;
            --panel-bg: #ffffff;
            --modal-bg: #ffffff;
            --menu-bg: #ffffff;
            --menu-hover: #f0f2f5;
            --menu-divider: #e9edef;
            
            --primary-color: #008069;
            --primary-hover: #005c4b;
            
            /* Цвета статусов (c-*) */
            --c-primary: #008069;
            --c-primary-dark: #005c4b;
            --c-success: #25d366;
            --c-danger: #ef4444;
            --c-warning: #f59e0b;
            --c-info: #3b82f6;
            --c-text-primary: #111b21;
            --c-text-secondary: #667781;
            --c-surface: #ffffff;
            --c-bg-secondary: #f0f2f5;
            --c-bg-hover: rgba(0, 0, 0, 0.05);
            --c-border: #d1d7db;
            
            /* Accent цвета */
            --accent-color: #008069;
            --accent-primary: #008069;
            --accent-hover: #005c4b;
            --accent-light: rgba(0, 128, 105, 0.15);
            
            --danger-color: #ef4444;
            --danger-hover: #dc2626;
            --danger-bg: #fee2e2;
            
            --warning-color: #f59e0b;
            --warning-hover: #d97706;
            --warning-bg: #fef3c7;
            
            --secondary-btn-bg: #f0f2f5;
            --secondary-btn-hover: #e9edef;
            
            --system-bg: rgba(0, 0, 0, 0.05);
            --system-text: #667781;
            
            --reaction-bg: rgba(0, 0, 0, 0.05);
            --reaction-active: rgba(0, 128, 105, 0.15);
            --reaction-border: #e0e0e0;
            
            --pinned-bg: #ffffff;
            --pinned-border: #e9edef;
            --pinned-nav-bg: #f0f2f5;
            
            --role-owner-bg: #fef3c7;
            --role-owner-text: #92400e;
            --role-admin-bg: #dbeafe;
            --role-admin-text: #1e40af;
            --role-guest-bg: #f3f4f6;
            --role-guest-text: #6b7280;
            
            /* Даторазделитель */
            --date-divider-bg: rgba(0, 0, 0, 0.1);
            --date-divider-text: #667781;
            
            /* Статус подключения */
            --bg-warning: #fef3c7;
            --text-warning: #92400e;
            --bg-info: #dbeafe;
            --text-info: #1e40af;
            
            /* Приглашения */
            --invites-bg: #f0f2f5;
            --invites-header-hover: #e9edef;
            --invites-item-bg: #ffffff;
            --invites-item-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
            --btn-accept-bg: #e8f5e9;
            --btn-accept-text: #2e7d32;
            --btn-accept-hover-bg: #2e7d32;
            --btn-accept-hover-text: #ffffff;
            --btn-decline-bg: #ffebee;
            --btn-decline-text: #c62828;
            --btn-decline-hover-bg: #c62828;
            --btn-decline-hover-text: #ffffff;
            
            /* Тени */
            --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.1);
            --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.15);
            --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.2);
          }

          [data-theme="dark"] {
            /* Тёмная тема */
            --bg-primary: #0E1621;
            --bg-secondary: #17212B;
            --bg-tertiary: #1E2733;
            --bg-hover: rgba(255, 255, 255, 0.05);
            
            --text-primary: #e9edef;
            --text-secondary: #8696a0;
            --text-muted: #667781;
            --text-inverse: #111b21;
            
            --border-color: #2a3942;
            --border-light: #2a3942;
            
            --bubble-own: #2B5278;
            --bubble-other: #182533;
            --bubble-shadow: none;
            
            --input-bg: #243342;
            --input-border: transparent;
            --input-placeholder: #8696a0;
            
            --header-bg: #17212B;
            --panel-bg: #17212B;
            --modal-bg: #182533;
            --menu-bg: #182533;
            --menu-hover: #243342;
            --menu-divider: #2a3942;
            
            --primary-color: #5CB3F5;
            --primary-hover: #7AC4FF;
            
            /* Цвета статусов (c-*) */
            --c-primary: #5CB3F5;
            --c-primary-dark: #7AC4FF;
            --c-success: #25d366;
            --c-danger: #f15c6d;
            --c-warning: #fbbf24;
            --c-info: #60a5fa;
            --c-text-primary: #e9edef;
            --c-text-secondary: #8696a0;
            --c-surface: #202c33;
            --c-bg-secondary: #111b21;
            --c-bg-hover: rgba(255, 255, 255, 0.05);
            --c-border: #2a3942;
            
            /* Accent цвета */
            --accent-color: #5CB3F5;
            --accent-primary: #5CB3F5;
            --accent-hover: #7AC4FF;
            --accent-light: rgba(92, 179, 245, 0.2);
            
            --danger-color: #f15c6d;
            --danger-hover: #fa6676;
            
            --warning-color: #fbbf24;
            --warning-hover: #fcd34d;
            --warning-bg: rgba(251, 191, 36, 0.15);
            
            --danger-bg: rgba(241, 92, 109, 0.15);
            
            --secondary-btn-bg: #243342;
            --secondary-btn-hover: #2E3E4D;
            
            --system-bg: rgba(255, 255, 255, 0.05);
            --system-text: #8696a0;
            
            --reaction-bg: rgba(255, 255, 255, 0.05);
            --reaction-active: rgba(92, 179, 245, 0.25);
            --reaction-border: #2a3942;
            
            --pinned-bg: #182533;
            --pinned-border: #243342;
            --pinned-nav-bg: #1E2733;
            
            --role-owner-bg: rgba(254, 243, 199, 0.2);
            --role-owner-text: #fcd34d;
            --role-admin-bg: rgba(219, 234, 254, 0.2);
            --role-admin-text: #93c5fd;
            --role-guest-bg: rgba(243, 244, 246, 0.1);
            --role-guest-text: #9ca3af;
            
            /* Даторазделитель */
            --date-divider-bg: rgba(92, 179, 245, 0.15);
            --date-divider-text: #8696a0;
            
            /* Статус подключения */
            --bg-warning: rgba(254, 243, 199, 0.2);
            --text-warning: #fcd34d;
            --bg-info: rgba(219, 234, 254, 0.2);
            --text-info: #93c5fd;
            
            /* Приглашения */
            --invites-bg: #17212B;
            --invites-header-hover: #243342;
            --invites-item-bg: #182533;
            --invites-item-shadow: none;
            --btn-accept-bg: rgba(92, 179, 245, 0.2);
            --btn-accept-text: #5CB3F5;
            --btn-accept-hover-bg: #00a884;
            --btn-accept-hover-text: #111b21;
            --btn-decline-bg: rgba(241, 92, 109, 0.2);
            --btn-decline-text: #f15c6d;
            --btn-decline-hover-bg: #f15c6d;
            --btn-decline-hover-text: #ffffff;
            
            /* Тени */
            --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
            --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.4);
            --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.5);
          }
        `}</style>
        
        {/* Inline CSS - chat-view.css */}
        <style>{`
          .chat-view { display: flex; flex-direction: column; flex: 1; min-height: 0; position: relative; }
          .connection-status { position: absolute; top: 3.75rem; left: 0; right: 0; z-index: 10; display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.5rem 1rem; background: var(--bg-warning, #fef3c7); color: var(--text-warning, #92400e); font-size: 0.8125rem; font-weight: 500; box-shadow: 0 0.125rem 0.5rem rgba(0, 0, 0, 0.15); }
          .connection-status.reconnecting { background: var(--bg-info, #dbeafe); color: var(--text-info, #1e40af); }
          .connection-status i { font-size: 0.875rem; }
          .btn-reconnect { width: 1.75rem; height: 1.75rem; border: none; background: transparent; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; color: inherit; font-size: 0.75rem; margin-left: 0.25rem; transition: all 0.2s; }
          .btn-reconnect:hover { background: rgba(0, 0, 0, 0.1); transform: rotate(180deg); }
          .chat-header { display: flex; align-items: center; justify-content: space-between; padding: 0.625rem 1rem; background: var(--header-bg); border-bottom: 1px solid var(--border-color); min-height: 3.75rem; flex-shrink: 0; }
          .chat-header-left { display: flex; align-items: center; gap: 0.75rem; flex: 1; min-width: 0; }
          .chat-header-info { display: flex; align-items: center; gap: 0.75rem; min-width: 0; flex: 1; }
          .chat-header-avatar { width: 2.5rem; height: 2.5rem; border-radius: 50%; background: linear-gradient(135deg, #2AABEE 0%, #229ED9 100%); display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 0.875rem; flex-shrink: 0; }
          .chat-header-text { display: flex; flex-direction: column; min-width: 0; flex: 1; }
          .chat-header-title { font-size: 1rem; font-weight: 600; color: var(--text-primary); margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .chat-header-status { font-size: 0.8125rem; color: var(--text-secondary); margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .chat-header-status.typing { color: var(--primary-color); font-style: italic; }
          .chat-header-actions { display: flex; gap: 0.5rem; flex-shrink: 0; }
          .messages-area { flex: 1; overflow-y: auto; padding: 1rem; display: flex; flex-direction: column; min-height: 0; position: relative; overflow-anchor: none; contain: size layout; }
          .scroll-to-bottom-btn { position: absolute; right: 1.25rem; width: 3rem; height: 3rem; border-radius: 50%; background: var(--primary-color); color: white; border: none; box-shadow: 0 0.125rem 0.75rem rgba(0,0,0,0.3); cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 1.125rem; transition: all 0.2s ease; z-index: 5; }
          .scroll-to-bottom-btn:hover { transform: translateY(-2px); box-shadow: 0 0.25rem 0.75rem rgba(0,0,0,0.3); }
          .scroll-to-bottom-btn:active { transform: translateY(0); }
          .load-more-anchor { height: 2.5rem; width: 100%; display: flex; align-items: center; justify-content: center; color: var(--text-secondary); font-size: 0.8125rem; }
          .empty-chat { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--text-secondary); }
          .empty-chat i { font-size: 4rem; margin-bottom: 1rem; opacity: 0.5; }
          .empty-chat p { font-size: 1.125rem; margin-bottom: 0.5rem; }
          .empty-chat span { font-size: 0.875rem; }
          .messages-list { display: flex; flex-direction: column; gap: 0.5rem; }
          .messages-spacer { flex: 1; min-height: 0; }
          .system-message { display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.5rem 1rem; color: var(--system-text); font-size: 0.8125rem; }
          .date-divider { display: flex; align-items: center; justify-content: center; margin: 1.25rem 0; position: relative; }
          .date-divider-label { background: var(--date-divider-bg); color: var(--date-divider-text); font-size: 0.75rem; font-weight: 500; padding: 0.375rem 0.875rem; border-radius: 1rem; text-transform: capitalize; line-height: 1.2; }
          .system-text { background: var(--system-bg); padding: 0.25rem 0.75rem; border-radius: 0.75rem; }
          .system-time { font-size: 0.6875rem; opacity: 0.7; }
          .message { display: flex; align-items: flex-start; gap: 0.5rem; max-width: 80%; animation: messageAppear 0.2s ease-out; }
          @keyframes messageAppear { from { opacity: 0; transform: translateY(0.625rem); } to { opacity: 1; transform: translateY(0); } }
          .message-own { align-self: flex-end; flex-direction: row-reverse; }
          .message-avatar { width: 3rem; height: 3rem; border-radius: 50%; overflow: hidden; flex-shrink: 0; background: linear-gradient(135deg, #2AABEE 0%, #229ED9 100%); display: flex; align-items: center; justify-content: center; color: white; font-size: 0.75rem; font-weight: 600; }
          .message-avatar img { width: 100%; height: 100%; object-fit: cover; }
          .message-content { display: flex; flex-direction: column; max-width: 100%; }
          .message-author-name { font-size: 0.75rem; color: var(--primary-color); font-weight: 600; margin-bottom: 0.125rem; margin-left: 0.25rem; }
          .message-bubble { background: var(--bubble-other); border-radius: 0.5rem; padding: 0.5rem 0.75rem; box-shadow: var(--bubble-shadow); position: relative; min-width: 3.125rem; max-width: 100%; }
          .message-bubble.has-files { padding: 0; overflow: hidden; }
          .message-bubble.has-files.has-text { padding-bottom: 0.5rem; }
          .message-bubble.has-files .message-text, .message-bubble.has-files .markdown-message { padding: 0.5rem 0.75rem 0; }
          .message-bubble.has-files:not(.has-text) { padding: 0; }
          .message-bubble.has-files .message-meta { padding: 0.25rem 0.75rem; }
          .message-bubble.has-files:not(.has-text) .message-meta { padding: 0.25rem 0.75rem 0.5rem; }
          .message-bubble.has-files .message-edited { padding: 0 0.75rem; }
          .message-bubble.has-files:has(.file-item.image) { min-width: auto; }
          .message-own .message-bubble { background: var(--bubble-own); }
          .message-text, .markdown-message { font-size: 0.875rem; color: var(--text-primary); line-height: 1.4; white-space: pre-wrap; word-break: break-word; }
          .markdown-message h1, .markdown-message h2, .markdown-message h3 { margin: 0.5rem 0 0.25rem; font-weight: 600; line-height: 1.3; }
          .markdown-message h1 { font-size: 1.3em; }
          .markdown-message h2 { font-size: 1.15em; }
          .markdown-message h3 { font-size: 1.05em; }
          .markdown-message strong { font-weight: 600; }
          .markdown-message em { font-style: italic; }
          .markdown-message del { text-decoration: line-through; opacity: 0.7; }
          .markdown-message code { font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace; font-size: 0.9em; background: rgba(0, 0, 0, 0.06); padding: 0.125rem 0.3125rem; border-radius: 0.25rem; word-break: break-all; }
          .markdown-message pre { background: rgba(0, 0, 0, 0.06); padding: 0.625rem 0.75rem; border-radius: 0.5rem; margin: 0.5rem 0; overflow-x: auto; }
          .markdown-message pre code { background: transparent; padding: 0; font-size: 0.85em; white-space: pre; word-break: normal; }
          .markdown-message blockquote { border-left: 3px solid var(--accent-color); margin: 0.5rem 0; padding: 0.25rem 0.75rem; background: var(--accent-light); border-radius: 0 0.375rem 0.375rem 0; }
          .markdown-message ul, .markdown-message ol { margin: 0.375rem 0; padding-left: 1.25rem; }
          .markdown-message li { margin: 0.125rem 0; }
          .markdown-message a { color: var(--accent-color); text-decoration: none; border-bottom: 1px solid transparent; transition: border-color 0.2s; }
          .markdown-message a:hover { border-bottom-color: var(--accent-color); }
          .message-own .markdown-message code { background: var(--bg-hover); }
          .message-own .markdown-message pre { background: var(--bg-hover); }
          .message-own .markdown-message blockquote { border-left-color: var(--accent-color); background: var(--accent-light); }
          .message-own .markdown-message a { color: var(--accent-color); border-bottom-color: transparent; }
          .message-own .markdown-message a:hover { border-bottom-color: var(--accent-color); }
          .message-edited { font-size: 0.625rem; color: var(--text-muted); font-style: italic; margin-top: 0.125rem; }
          .message-meta { display: flex; align-items: center; justify-content: flex-end; gap: 0.25rem; margin-top: 0.25rem; }
          .message-footer { display: flex; align-items: center; gap: 0.5rem; margin-top: 0.25rem; }
          .message-meta-spacer { flex: 1; }
          .message-reactions-inline { display: flex; flex-wrap: wrap; gap: 0.25rem; }
          .reaction-chip { display: flex; align-items: center; gap: 0.1875rem; padding: 0.125rem 0.5rem; border: none; border-radius: 0.75rem; background: transparent; cursor: pointer; font-size: 0.875rem; transition: all 0.15s ease; }
          .reaction-chip:hover { background: var(--bg-hover); }
          .reaction-chip.active { background: var(--reaction-active, rgba(0,128,105,0.15)); }
          .message-own .reaction-chip { background: transparent; }
          .message-own .reaction-chip.active { background: rgba(255,255,255,0.3); }
          .reaction-chip-emoji { font-size: 1.25rem; }
          .reaction-chip-count { font-size: 0.75rem; color: var(--text-secondary); font-weight: 600; }
          .reaction-chip.active .reaction-chip-count { color: var(--primary-color); font-weight: 600; }
          .message-time { font-size: 0.6875rem; color: var(--text-secondary); }
          .message-actions { display: flex; gap: 0.25rem; opacity: 0; transition: opacity 0.2s; }
          .message:hover .message-actions { opacity: 1; }
          .action-btn { width: 1.75rem; height: 1.75rem; border: none; background: var(--bg-hover); border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--text-secondary); font-size: 0.75rem; }
          .action-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
          .moderation-notice { background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); border-left: 4px solid #dc2626; padding: 0.75rem 1rem; margin: 0; flex-shrink: 0; }
          .moderation-notice-content { display: flex; align-items: flex-start; gap: 0.75rem; }
          .moderation-notice-content i { font-size: 1.5rem; color: #dc2626; flex-shrink: 0; margin-top: 0.125rem; }
          .moderation-text { display: flex; flex-direction: column; gap: 0.25rem; flex: 1; }
          .moderation-text strong { color: #991b1b; font-size: 0.9375rem; font-weight: 600; }
          .moderation-reason, .moderation-expires { font-size: 0.8125rem; color: #7f1d1d; }
          .moderation-badge { display: inline-flex; align-items: center; justify-content: center; width: 1.125rem; height: 1.125rem; margin-left: 0.375rem; background: #fee2e2; border-radius: 50%; flex-shrink: 0; }
          .moderation-badge i { font-size: 0.625rem; color: #dc2626; }
          .participant-actions { display: flex; gap: 0.375rem; align-items: center; }
          .btn-icon-sm { width: 1.75rem; height: 1.75rem; border: none; background: transparent; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--text-secondary); font-size: 0.875rem; transition: all 0.2s; }
          .btn-icon-sm:hover { background: var(--bg-hover); color: var(--primary-color); }
          .btn-icon-sm:active { transform: scale(0.95); }
          .input-area { background: var(--bg-secondary); padding: 0.5rem 1rem; border-top: 1px solid var(--border-color); flex-shrink: 0; }
          .edit-banner, .reply-banner { display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0.75rem; background: var(--bg-hover); border-radius: 0.5rem 0.5rem 0 0; font-size: 0.8125rem; color: var(--text-secondary); margin-bottom: 0.5rem; }
          .reply-banner-content, .edit-banner-content { display: flex; align-items: center; gap: 0.5rem; }
          .reply-info { display: flex; flex-direction: column; }
          .reply-label { font-weight: 500; color: var(--primary-color); }
          .reply-preview { font-size: 0.75rem; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 18.75rem; }
          .input-form { display: flex; align-items: center; gap: 0.5rem; }
          .btn-attach, .btn-emoji, .btn-send, .btn-icon { width: 2.5rem; height: 2.5rem; border: none; background: transparent; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--text-secondary); font-size: 1.25rem; transition: all 0.2s; flex-shrink: 0; }
          .btn-icon:hover { background: var(--bg-hover); }
          .btn-send { background: transparent; color: var(--text-secondary); }
          .btn-send.active { background: var(--primary-color); color: white; }
          .btn-send:not(:disabled):hover { background: var(--bg-hover); }
          .btn-send.active:not(:disabled):hover { background: var(--primary-hover); }
          .btn-send:disabled { opacity: 0.5; cursor: not-allowed; }
          .input-wrapper { flex: 1; display: flex; align-items: flex-end; background: var(--input-bg); border-radius: 1rem; padding: 0.375rem 0.75rem; min-height: 2.75rem; }
          .message-input { flex: 1; border: none; outline: none; padding: 0.625rem 0.5rem; font-size: 0.9375rem; background: transparent; resize: none; min-height: 1.5rem; max-height: 7.5rem; line-height: 1.5; overflow-y: auto; font-family: inherit; color: var(--text-primary); box-shadow: none; }
          .message-input:focus { outline: none; border: none; box-shadow: none; }
          .message-input::placeholder { color: var(--input-placeholder); }
          .participants-panel { position: fixed; right: 0; top: 0; bottom: 0; width: 20rem; background: var(--panel-bg); border-left: 1px solid var(--border-color); display: flex; flex-direction: column; z-index: 50; box-shadow: -0.125rem 0 0.5rem rgba(0, 0, 0, 0.1); }
          .panel-header { display: flex; align-items: center; justify-content: space-between; padding: 1rem; border-bottom: 1px solid var(--border-color); }
          .panel-header h3 { font-size: 1rem; font-weight: 600; margin: 0; color: var(--text-primary); }
          .panel-actions { padding: 0.75rem 1rem; border-bottom: 1px solid var(--border-color); }
          .participants-list { flex: 1; overflow-y: auto; }
          .participant-item { display: flex; align-items: center; padding: 0.75rem 1rem; gap: 0.75rem; }
          .participant-avatar { width: 2.5rem; height: 2.5rem; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 0.875rem; flex-shrink: 0; }
          .participant-info { flex: 1; }
          .participant-name { font-weight: 500; color: var(--text-primary); }
          .participant-role { font-size: 0.75rem; color: var(--text-secondary); padding: 0.125rem 0.5rem; border-radius: 0.75rem; display: inline-block; margin-top: 0.125rem; }
          .participant-role.role-owner { background: var(--role-owner-bg); color: var(--role-owner-text); font-weight: 600; }
          .participant-role.role-admin { background: var(--role-admin-bg); color: var(--role-admin-text); }
          .participant-role.role-guest { background: var(--role-guest-bg); color: var(--role-guest-text); }
          .role-dropdown { margin-top: 0.25rem; }
          .role-select { font-size: 0.75rem; padding: 0.25rem 0.5rem; border: 1px solid var(--border-color); border-radius: 0.375rem; background: var(--bg-primary); color: var(--text-primary); cursor: pointer; outline: none; min-width: 7.5rem; }
          .role-select:hover { border-color: var(--primary-color); }
          .role-select:focus { border-color: var(--primary-color); box-shadow: 0 0 0 2px rgba(0, 128, 105, 0.1); }
          .participant-contact { font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.125rem; }
          .btn-remove { width: 1.75rem; height: 1.75rem; border: none; background: transparent; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--text-secondary); }
          .btn-remove:hover { background: var(--bg-hover); color: var(--danger-color); }
          .chat-modal-overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; }
          .chat-modal-content { background: var(--modal-bg); border-radius: 0.75rem; width: 90%; max-width: 25rem; padding: 1rem; }
          .modal-title { font-size: 1.25rem; font-weight: 600; margin: 0 0 1.25rem; color: var(--text-primary); }
          .form-group { margin-bottom: 1rem; }
          .form-group label { display: block; font-size: 0.875rem; font-weight: 500; color: var(--text-primary); margin-bottom: 0.375rem; }
          .form-group input, .form-group textarea { width: 100%; padding: 0.625rem 0.75rem; border: 1px solid var(--border-color); border-radius: 0.5rem; font-size: 0.875rem; outline: none; background: var(--bg-primary); color: var(--text-primary); }
          .form-group input:focus, .form-group textarea:focus { border-color: var(--primary-color); }
          .form-group.checkbox { display: flex; align-items: center; gap: 0.5rem; }
          .form-group.checkbox input { width: auto; }
          .form-group.checkbox label { margin: 0; }
          .modal-actions { display: flex; gap: 0.75rem; margin-top: 1.25rem; }
          .modal-danger { margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-color); }
          .btn-primary, .btn-secondary, .btn-danger { flex: 1; padding: 0.75rem; border: none; border-radius: 0.5rem; font-size: 0.875rem; font-weight: 500; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem; }
          .btn-primary { background: var(--primary-color); color: white; }
          .btn-primary:hover { background: var(--primary-hover); }
          .btn-secondary { background: var(--secondary-btn-bg); color: var(--text-primary); }
          .btn-secondary:hover { background: var(--secondary-btn-hover); }
          .btn-danger { background: var(--danger-color); color: white; }
          .btn-danger:hover { background: var(--danger-hover); }
          .btn-warning { background: var(--warning-color); color: white; }
          .btn-warning:hover { background: var(--warning-hover); }
          .btn-full { width: 100%; }
          .files-banner { padding: 0.5rem 1rem; background: var(--bg-hover); border-radius: 0.5rem 0.5rem 0 0; margin-bottom: 0.5rem; }
          .files-list { display: flex; flex-wrap: wrap; gap: 0.5rem; }
          .file-item { position: relative; background: var(--bg-primary); border-radius: 0.5rem; padding: 0.5rem; min-width: 5rem; max-width: 22.5rem; }
          .file-preview img { width: 100%; height: 3.75rem; object-fit: cover; border-radius: 0.25rem; }
          .file-info { display: flex; flex-direction: column; align-items: center; gap: 0.25rem; padding: 0.5rem; }
          .file-info i { font-size: 1.5rem; color: var(--text-secondary); }
          .file-name { font-size: 0.6875rem; color: var(--text-primary); text-align: center; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .btn-remove-file { position: absolute; top: -0.375rem; right: -0.375rem; width: 1.25rem; height: 1.25rem; border: none; background: var(--danger-color); color: white; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 0.625rem; }
          .file-item.uploading .file-preview { position: relative; }
          .upload-overlay { position: absolute; inset: 0; background: rgba(0, 0, 0, 0.6); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.5rem; border-radius: 0.25rem; backdrop-filter: blur(2px); }
          .upload-spinner { font-size: 1.75rem; color: white; }
          .upload-percent { font-size: 1rem; font-weight: 600; color: white; }
          .upload-progress-bar { width: 80%; height: 0.375rem; background: rgba(255, 255, 255, 0.3); border-radius: 0.1875rem; overflow: hidden; }
          .upload-progress-fill { height: 100%; background: var(--primary-color); transition: width 0.2s ease; }
          .file-upload-info { width: 100%; margin-top: 0.5rem; }
          .upload-text-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem; }
          .upload-status { font-size: 0.6875rem; color: var(--primary-color); font-weight: 500; }
          .upload-percent-file { font-size: 0.6875rem; color: var(--text-secondary); font-weight: 600; }
          .upload-progress-bar-file { width: 100%; height: 0.25rem; background: var(--bg-hover); border-radius: 0.125rem; overflow: hidden; }
          .file-item.uploading .btn-remove-file { opacity: 0.5; cursor: not-allowed; pointer-events: none; }
          .file-progress { display: none; }
          .progress-bar { display: none; }
          .chat-info-modal { text-align: center; padding: 0; overflow-y: auto; max-height: 80vh; }
          .chat-info-header { position: relative; margin: 0; padding: 0; background: transparent; }
          .chat-info-close-btn { position: absolute; top: 0.75rem; right: 0.75rem; width: 2.25rem; height: 2.25rem; border: none; background: rgba(0, 0, 0, 0.4); border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; color: white; font-size: 1rem; z-index: 10; transition: all 0.2s ease; backdrop-filter: blur(4px); }
          .chat-info-close-btn:hover { background: rgba(0, 0, 0, 0.6); transform: scale(1.05); }
          .chat-info-avatar-wrapper { position: relative; width: 100%; aspect-ratio: 1; overflow: hidden; }
          .chat-info-avatar { width: 100%; height: 100%; border-radius: 0; background: linear-gradient(135deg, #2AABEE 0%, #229ED9 100%); display: flex; align-items: center; justify-content: center; font-size: 4rem; font-weight: 600; color: white; }
          .chat-info-avatar img { width: 100%; height: 100%; object-fit: cover; }
          .chat-info-overlay { position: absolute; bottom: 0; left: 0; right: 0; padding: 3rem 1.5rem 1.5rem; background: linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 60%, transparent 100%); color: white; text-align: left; }
          .chat-info-title { font-size: 1.5rem; font-weight: 600; margin: 0 0 0.25rem; display: flex; align-items: center; gap: 0.5rem; text-shadow: 0 1px 3px rgba(0,0,0,0.5); }
          .chat-info-title i { font-size: 1.125rem; opacity: 0.9; flex-shrink: 0; }
          .chat-info-type { font-size: 0.875rem; opacity: 0.9; margin: 0; text-shadow: 0 1px 2px rgba(0,0,0,0.5); }
          .chat-info-section { padding: 1.5rem; text-align: left; border-bottom: 1px solid var(--border-color); }
          .chat-info-section h3 { font-size: 0.875rem; font-weight: 600; color: var(--primary-color); text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 0.75rem 0; }
          .chat-info-description { font-size: 0.9375rem; color: var(--text-primary); line-height: 1.5; margin: 0; }
          .chat-info-participants { display: flex; flex-wrap: wrap; gap: 0.5rem; margin: 0 0 1rem 0; }
          .mini-participant { display: flex; align-items: center; gap: 0.375rem; padding: 0.375rem 0.625rem; background: var(--bg-secondary); border-radius: 1rem; font-size: 0.8125rem; color: var(--text-primary); }
          .mini-avatar { width: 1.5rem; height: 1.5rem; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 0.625rem; font-weight: 600; flex-shrink: 0; }
          .more-participants { padding: 0.375rem 0.75rem; background: var(--bg-tertiary); border-radius: 1rem; font-size: 0.8125rem; color: var(--text-secondary); }
          .chat-info-footer { padding: 1rem 1.5rem; background: var(--bg-tertiary); }
          .context-menu { position: fixed; background: var(--menu-bg); border: 1px solid var(--border-color); border-radius: 0.5rem; box-shadow: 0 0.25rem 0.75rem rgba(0, 0, 0, 0.3); z-index: 1000; width: 30rem; max-height: calc(100vh - 20px); overflow-y: auto; padding: 0.25rem 0; scrollbar-width: thin; scrollbar-color: var(--border-color) transparent; }
          .context-menu::-webkit-scrollbar { width: 6px; }
          .context-menu::-webkit-scrollbar-track { background: transparent; }
          .context-menu::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 3px; }
          .context-menu::-webkit-scrollbar-thumb:hover { background: var(--text-secondary); }
          .context-menu button { display: flex; align-items: center; gap: 0.75rem; padding: 0.625rem; border: none; background: transparent; cursor: pointer; color: var(--text-primary); text-align: left; width: 100%; }
          .context-menu .quick-reaction-btn, .context-menu .emoji-cat-btn, .context-menu .emoji-picker-emoji { width: auto; padding: 0; justify-content: center; }
          .context-menu button:hover { background: var(--menu-hover); }
          .context-menu button.danger { color: var(--danger-color); }
          .context-menu-divider { height: 1px; background: var(--border-color); margin: 0.25rem 0; }
          .quick-reactions { display: flex; align-items: center; gap: 0.125rem; padding: 0.5rem 0.75rem; background: var(--bg-secondary); margin: 0.25rem; border-radius: 0.5rem; }
          .quick-reaction-btn { width: 2.75rem; height: 2.75rem; border: none; background: transparent; border-radius: 50%; cursor: pointer; font-size: 1.6875rem; display: flex; align-items: center; justify-content: center; transition: all 0.15s ease; padding: 0; }
          .quick-reaction-btn:hover { background: var(--bg-hover); transform: scale(1.15); }
          .quick-reaction-btn.more { color: var(--text-secondary); font-size: 1rem; }
          .quick-reaction-btn.more:hover { background: var(--bg-hover); color: var(--text-primary); }
          .emoji-picker-accordion { padding: 0.5rem; background: var(--bg-secondary); margin: 0 0.25rem 0.25rem; border-radius: 0.5rem; width: calc(100% - 0.5rem); box-sizing: border-box; }
          .emoji-categories-tabs { display: flex; gap: 0.25rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color); margin-bottom: 0.5rem; overflow-x: auto; scrollbar-width: none; justify-content: center; }
          .emoji-categories-tabs::-webkit-scrollbar { display: none; }
          .emoji-cat-btn { width: 2.75rem; height: 2.75rem; border: none; background: transparent; border-radius: 0.5rem; cursor: pointer; font-size: 1.6875rem; display: flex; align-items: center; justify-content: center; transition: all 0.15s ease; flex-shrink: 0; padding: 0; }
          .emoji-cat-btn:hover { background: var(--bg-hover); }
          .emoji-cat-btn.active { background: var(--reaction-active, rgba(0,128,105,0.15)); }
          .emoji-picker-grid { display: grid; grid-template-columns: repeat(8, 1fr); gap: 0.25rem; max-height: 12.5rem; overflow-y: auto; padding: 0.25rem; }
          .emoji-picker-emoji { width: 2.75rem; height: 2.75rem; border: none; background: transparent; border-radius: 0.5rem; cursor: pointer; font-size: 1.75rem; display: flex; align-items: center; justify-content: center; transition: all 0.15s ease; padding: 0; }
          .emoji-picker-emoji:hover { background: var(--bg-hover); transform: scale(1.1); }
          .reactions-view-all { padding: 0.5rem 0.75rem; font-size: 0.75rem; color: var(--primary-color); cursor: pointer; text-align: center; border-top: 1px solid var(--border-color); margin-top: 0.25rem; }
          .reactions-view-all:hover { background: var(--bg-hover); }
          .context-menu-reactions { max-height: 12.5rem; overflow-y: auto; }
          .context-menu-reactions-header { padding: 0.625rem 1rem; font-size: 0.8125rem; font-weight: 600; color: var(--primary-color); display: flex; align-items: center; gap: 0.5rem; border-bottom: 1px solid var(--border-color); }
          .reactions-more { font-size: 0.6875rem; color: var(--text-secondary); font-weight: normal; }
          .context-menu-reactions-list { padding: 0.25rem 0; }
          .context-menu-reaction-item { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; font-size: 0.8125rem; }
          .context-menu-reaction-item:hover { background: var(--menu-hover); }
          .reaction-emoji { font-size: 1.5rem; width: 2rem; text-align: center; }
          .reaction-user { flex: 1; color: var(--text-primary); font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .reaction-contact { font-size: 0.6875rem; color: var(--text-secondary); max-width: 6.25rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .reaction-time { font-size: 0.6875rem; color: var(--text-muted); white-space: nowrap; }
          .message.highlight { animation: highlight 2s ease-out; }
          @keyframes highlight { 0% { background: rgba(0, 128, 105, 0.3); } 100% { background: transparent; } }
          .join-chat-prompt { text-align: center; }
          .join-chat-prompt i { color: var(--primary-color); }
          .btn-join-chat { margin-top: 1rem; padding: 0.75rem 1.5rem; background: var(--primary-color); color: white; border: none; border-radius: 1.5rem; font-size: 0.9375rem; font-weight: 500; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; transition: all 0.2s; }
          .btn-join-chat:hover:not(:disabled) { background: var(--primary-hover); transform: translateY(-1px); }
          .btn-join-chat:disabled { opacity: 0.7; cursor: not-allowed; }
          .mobile-extra-menu { max-width: 20rem; padding: 1rem; }
          .extra-menu-list { display: flex; flex-direction: column; gap: 0.25rem; }
          .extra-menu-item { display: flex; align-items: center; gap: 1rem; padding: 0.875rem 1rem; border: none; background: transparent; color: var(--text-primary); font-size: 1rem; cursor: pointer; border-radius: 0.5rem; text-align: left; }
          .extra-menu-item:hover { background: var(--bg-hover); }
          .extra-menu-item i { width: 1.5rem; text-align: center; color: var(--text-secondary); }
          .extra-menu-divider { height: 1px; background: var(--border-color); margin: 0.5rem 0; }
          .emoji-picker-input-popup { position: fixed; background: var(--menu-bg); border: 1px solid var(--border-color); border-radius: 0.75rem; box-shadow: 0 0.5rem 1.5rem rgba(0, 0, 0, 0.3); z-index: 1001; width: 22.5rem; padding: 0.5rem; animation: pickerAppear 0.15s ease-out; }
          @keyframes pickerAppear { from { opacity: 0; transform: translateY(0.625rem) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
          .emoji-picker-input-popup .emoji-categories-tabs { display: flex; gap: 0.25rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color); margin-bottom: 0.5rem; overflow-x: auto; scrollbar-width: none; justify-content: center; }
          .emoji-picker-input-popup .emoji-categories-tabs::-webkit-scrollbar { display: none; }
          .emoji-picker-input-popup .emoji-cat-btn { width: 2.5rem; height: 2.5rem; border: none; background: transparent; border-radius: 0.5rem; cursor: pointer; font-size: 1.5rem; display: flex; align-items: center; justify-content: center; transition: all 0.15s ease; flex-shrink: 0; }
          .emoji-picker-input-popup .emoji-cat-btn:hover { background: var(--bg-hover); }
          .emoji-picker-input-popup .emoji-cat-btn.active { background: var(--reaction-active, rgba(0,128,105,0.15)); }
          .emoji-picker-input-popup .emoji-picker-grid { display: grid; grid-template-columns: repeat(8, 1fr); gap: 0.25rem; max-height: 13.75rem; overflow-y: auto; padding: 0.25rem; }
          .emoji-picker-input-popup .emoji-picker-emoji { width: 2.5rem; height: 2.5rem; border: none; background: transparent; border-radius: 0.5rem; cursor: pointer; font-size: 1.625rem; display: flex; align-items: center; justify-content: center; transition: all 0.15s ease; }
          .emoji-picker-input-popup .emoji-picker-emoji:hover { background: var(--bg-hover); transform: scale(1.15); }
          @media (max-width: 1024px) { .participants-panel { width: 20rem; } }
          @media (max-width: 768px) { 
            .chat-view { height: 100dvh; }
            .chat-header { padding: 0.5rem 0.75rem; min-height: 3.5rem; max-height: 3.5rem; }
            .chat-header-avatar { width: 2.25rem; height: 2.25rem; }
            .chat-header-title { font-size: 0.9375rem; max-width: 12.5rem; }
            .chat-header-status { font-size: 0.75rem; }
            .messages-area { padding: 0.75rem; }
            .message { max-width: 85%; }
            .message-bubble { padding: 0.375rem 0.625rem; min-width: 3.125rem; }
            .message-text { font-size: 0.9375rem; }
            .message-actions { display: none !important; }
            .message:hover .message-actions { opacity: 0; }
            .input-area { padding: 0.375rem 0.75rem 1rem; }
            .input-form { gap: 0.375rem; }
            .btn-attach, .btn-emoji, .btn-send { width: 2.25rem; height: 2.25rem; font-size: 1.125rem; flex-shrink: 0; }
            .input-wrapper { min-width: 0; }
            .participants-panel { width: 100%; z-index: 100; }
            .context-menu { position: fixed !important; top: 50% !important; left: 50% !important; transform: translate(-50%, -50%) !important; min-width: 280px; max-width: 90vw; border-radius: 0.75rem; padding: 0.5rem 0; }
            .reply-preview { max-width: 12.5rem; }
            .emoji-picker-input-popup { width: 18.75rem; left: 50% !important; transform: translateX(-50%); bottom: 4.375rem; top: auto !important; }
            .emoji-picker-input-popup .emoji-cat-btn { width: 2.25rem; height: 2.25rem; font-size: 1.375rem; }
            .emoji-picker-input-popup .emoji-picker-emoji { width: 2.25rem; height: 2.25rem; font-size: 1.5rem; }
            .scroll-to-bottom-btn { right: 1rem; width: 2.75rem; height: 2.75rem; font-size: 1rem; }
          }
          @media (max-width: 480px) { 
            .message { max-width: 90%; }
            .chat-modal-content { padding: 1rem; margin: 1rem; }
            .chat-header-title { max-width: 9.375rem; }
            .extra-menu-item { padding: 0.75rem; font-size: 0.9375rem; }
            .emoji-picker-input-popup { width: 17.5rem; }
            .emoji-picker-input-popup .emoji-picker-grid { grid-template-columns: repeat(7, 1fr); }
          }
          @media (max-width: 380px) { 
            .input-area { padding: 0.375rem 0.5rem 1rem; }
            .input-form { gap: 0.25rem; }
            .btn-attach, .btn-emoji, .btn-send { width: 2.125rem; height: 2.125rem; font-size: 1rem; }
            .input-wrapper { padding: 0.25rem 0.5rem; min-height: 2.375rem; }
            .message-input { padding: 0.5rem 0.375rem; font-size: 1rem; }
          }
          @media (max-width: 360px) { 
            .message { max-width: 95%; }
            .chat-header-title { max-width: 7.5rem; font-size: 0.875rem; }
            .emoji-picker-input-popup { width: 16.25rem; }
            .emoji-picker-input-popup .emoji-picker-grid { grid-template-columns: repeat(6, 1fr); }
            .input-area { padding: 0.25rem 0.375rem 1rem; }
            .btn-attach, .btn-emoji, .btn-send { width: 2rem; height: 2rem; font-size: 0.9375rem; }
          }
          .messages-area.swiping { cursor: grabbing; }
          @media (max-width: 768px) {
            .messages-area::before { content: ''; position: absolute; left: 0; top: 50%; transform: translateY(-50%); width: 0.25rem; height: 3.75rem; background: var(--border-color); border-radius: 0 0.25rem 0.25rem 0; opacity: 0.5; transition: opacity 0.2s; }
            .messages-area:active::before, .messages-area.swiping::before { opacity: 0.8; background: var(--primary-color); }
          }
          .bottom-anchor { height: 0; width: 0; overflow: hidden; visibility: hidden; pointer-events: none; }
          .chat-avatar-edit { display: flex; align-items: center; gap: 1rem; margin-bottom: 0.5rem; }
          .current-chat-avatar { width: 5rem; height: 5rem; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 1.75rem; flex-shrink: 0; position: relative; overflow: hidden; }
          .current-chat-avatar .avatar-overlay { position: absolute; inset: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.2s; border-radius: 50%; }
          .current-chat-avatar:hover .avatar-overlay { opacity: 1; }
          .current-chat-avatar .avatar-overlay i { font-size: 1.5rem; color: white; }
          .avatar-edit-actions { display: flex; flex-direction: column; gap: 0.5rem; }
          .btn-sm { padding: 0.5rem 0.875rem; font-size: 0.8125rem; display: flex; align-items: center; gap: 0.375rem; }
          .field-hint { display: block; font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem; }
          .input-form .voice-recorder, .input-form .video-recorder { display: flex; align-items: center; }
          .input-form :deep(.btn-record-voice), .input-form :deep(.btn-record-video) { width: 2.5rem; height: 2.5rem; border: none; background: transparent; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--text-secondary); font-size: 1.125rem; transition: all 0.2s; flex-shrink: 0; }
          .input-form :deep(.btn-record-voice:hover), .input-form :deep(.btn-record-video:hover) { background: var(--bg-hover); color: var(--primary-color); }
          .input-form :deep(.btn-record-voice.recording) { color: var(--danger-color); animation: pulse 1s infinite; }
          @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }
          @media (max-width: 768px) { .input-form :deep(.btn-record-voice), .input-form :deep(.btn-record-video) { width: 2.25rem; height: 2.25rem; font-size: 1rem; } }
          @media (max-width: 380px) { .input-form :deep(.btn-record-voice), .input-form :deep(.btn-record-video) { width: 2.125rem; height: 2.125rem; font-size: 0.9375rem; } }
          @media (max-width: 360px) { .input-form :deep(.btn-record-voice), .input-form :deep(.btn-record-video) { width: 2rem; height: 2rem; font-size: 0.875rem; } }
          .paid-chat-icon { color: #f59e0b; font-size: 0.75em; margin-left: 0.375rem; vertical-align: middle; }
          .chat-info-title .paid-chat-icon { font-size: 1rem; margin-left: 0.5rem; }
          .subscription-settings-modal { width: 100%; max-width: 32rem; max-height: 85vh; overflow-y: auto; padding: 0; }
          .subscription-settings-modal .modal-header { position: sticky; top: 0; background: var(--modal-bg); z-index: 10; }
          .ban-screen-full { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: var(--bg-primary); z-index: 20; padding: 2rem; }
          .ban-content { display: flex; flex-direction: column; align-items: center; text-align: center; max-width: 400px; }
          .ban-icon { font-size: 4rem; color: #dc2626; margin-bottom: 1.5rem; opacity: 0.9; }
          .ban-content h2 { font-size: 1.5rem; font-weight: 600; color: var(--text-primary); margin: 0 0 1rem 0; }
          .ban-reason { font-size: 1rem; color: var(--text-secondary); margin: 0 0 0.5rem 0; line-height: 1.5; }
          .ban-expires { font-size: 0.9375rem; color: var(--text-muted); margin: 0 0 1.5rem 0; }
          .ban-content .btn-secondary { display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1.5rem; background: var(--secondary-btn-bg); color: var(--text-primary); border: none; border-radius: 0.5rem; font-size: 0.9375rem; font-weight: 500; cursor: pointer; transition: all 0.2s; }
          .ban-content .btn-secondary:hover { background: var(--secondary-btn-hover); }
          [data-theme="dark"] .ban-icon { color: #ef4444; }
          @media (max-width: 768px) { .ban-screen-full { padding: 1.5rem; } .ban-icon { font-size: 3.5rem; margin-bottom: 1.25rem; } .ban-content h2 { font-size: 1.25rem; } .ban-reason { font-size: 0.9375rem; } .ban-expires { font-size: 0.875rem; } }
        `}</style>
        
        {/* Inline CSS - message-selection.css */}
        <style>{`
          .selection-header { display: flex; align-items: center; justify-content: space-between; padding: 0.625rem 1rem; background: var(--primary-color); border-bottom: 1px solid var(--border-color); min-height: 3.75rem; flex-shrink: 0; color: white; }
          .selection-header-left { display: flex; align-items: center; gap: 0.75rem; }
          .selection-header .btn-icon { color: white; width: 2.5rem; height: 2.5rem; }
          .selection-header .btn-icon:hover { background: rgba(255, 255, 255, 0.2); }
          .selection-count { font-size: 1rem; font-weight: 600; }
          .selection-actions { display: flex; gap: 0.5rem; }
          .selection-btn { width: 2.5rem; height: 2.5rem; border: none; background: rgba(255, 255, 255, 0.2); border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; color: white; font-size: 1.125rem; transition: all 0.2s; }
          .selection-btn:hover { background: rgba(255, 255, 255, 0.3); }
          .selection-btn.danger { background: rgba(239, 68, 68, 0.8); }
          .selection-btn.danger:hover { background: rgba(239, 68, 68, 1); }
          .selection-btn:disabled { opacity: 0.5; cursor: not-allowed; }
          .message-checkbox { display: flex; align-items: center; justify-content: center; padding: 0 0.5rem; cursor: pointer; flex-shrink: 0; }
          .checkbox-circle { width: 1.5rem; height: 1.5rem; border: 2px solid var(--border-color); border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: all 0.2s; background: var(--bg-primary); }
          .checkbox-circle.checked { background: var(--primary-color); border-color: var(--primary-color); }
          .checkbox-circle i { font-size: 0.75rem; color: white; }
          .message-selection-mode { cursor: pointer; }
          .message-selected .message-bubble { background: var(--selection-bg, rgba(0, 128, 105, 0.15)); box-shadow: 0 0 0 2px var(--primary-color); }
          .message-own.message-selected .message-bubble { background: var(--selection-own-bg, rgba(0, 128, 105, 0.25)); }
          .message-checkbox { animation: checkboxAppear 0.2s ease-out; }
          @keyframes checkboxAppear { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
          @media (max-width: 768px) { .selection-header { padding: 0.5rem 0.75rem; min-height: 3.5rem; } .selection-count { font-size: 0.9375rem; } .selection-btn { width: 2.25rem; height: 2.25rem; font-size: 1rem; } .checkbox-circle { width: 1.375rem; height: 1.375rem; } .message-checkbox { padding: 0 0.375rem; } }
          [data-theme="dark"] .checkbox-circle { background: var(--bg-secondary); border-color: var(--border-color); }
          [data-theme="dark"] .checkbox-circle.checked { background: var(--primary-color); border-color: var(--primary-color); }
        `}</style>
        
        <script>{`
          tailwind.config = {
            theme: {
              extend: {
                colors: {
                  primary: '#008069',
                  secondary: '#005c4b',
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
        

      </head>
      <body>
        <App userSocketId={userSocketId} />
      </body>
    </html>
  )
})
