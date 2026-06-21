// @shared
import { jsx } from '@app/html-jsx'
import { requireRealUser } from '@app/auth'
import WebhooksPage from './pages/WebhooksPage.vue'
import { TgChannelAnalyticsSettings, ensureDefaultSettings } from './tables/settings.table'
import { loginPageRoute } from './login'
import { profilePageRoute } from './profile'
import { indexPageRoute } from './index'
import { applyDebugLevel } from './lib/logging'
import { Debug } from './shared/debug'
import { genSocketId } from '@app/socket'

export const webhooksPageRoute = app.html('/', async (ctx, req) => {
  // Применяем уровень логирования из настроек
  await applyDebugLevel(ctx, 'webhooks')
  Debug.info(ctx, '[webhooks] Начало обработки страницы вебхуков')

  try {
    requireRealUser(ctx)
    Debug.info(ctx, `[webhooks] Пользователь авторизован: userId=${ctx.user.id}`)
  } catch (error: any) {
    Debug.warn(ctx, `[webhooks] Пользователь не авторизован, перенаправление на страницу входа`)
    Debug.warn(ctx, `[webhooks] Ошибка авторизации: ${error?.message || 'Unknown error'}`)
    const loginUrl = loginPageRoute.url() + '?back=' + encodeURIComponent(req.url)
    return (
      <html>
        <head>
          <meta http-equiv="refresh" content={`0; url=${loginUrl}`} />
        </head>
        <body>
          <p>Перенаправление на страницу входа...</p>
        </body>
      </html>
    )
  }

  await ensureDefaultSettings(ctx)
  Debug.info(ctx, '[webhooks] Настройки по умолчанию проверены')

  const titleSetting = await TgChannelAnalyticsSettings.findOneBy(ctx, { key: 'project_title' })
  const projectTitle = titleSetting?.value ?? 'Аналитика телеграм-каналов'
  Debug.info(ctx, `[webhooks] Название проекта: ${projectTitle}`)

  const socketId = `webhooks-${ctx.user.id}`
  const encodedSocketId = await genSocketId(ctx, socketId)
  Debug.info(ctx, `[webhooks] Сгенерирован encodedSocketId для пользователя ${ctx.user.id}`)

  const isAuthenticated = !!ctx.user
  Debug.info(
    ctx,
    `[webhooks] Статус авторизации: ${isAuthenticated ? `авторизован (userId=${ctx.user?.id})` : 'не авторизован'}`
  )

  // Получаем botId из query параметров (опционально, для фильтрации)
  const botId = req.query.botId as string | undefined
  Debug.info(
    ctx,
    `[webhooks] Параметр botId из query: ${botId || 'не указан (показываем все вебхуки)'}`
  )

  // Получаем chatId из query параметров (опционально, для фильтрации по каналу)
  const chatId = req.query.chatId as string | undefined
  Debug.info(
    ctx,
    `[webhooks] Параметр chatId из query: ${chatId || 'не указан (показываем все каналы)'}`
  )

  Debug.info(ctx, '[webhooks] Рендеринг страницы вебхуков')
  return (
    <html>
      <head>
        <title>{projectTitle} - Вебхуки</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta charset="UTF-8" />
        <style>{`
          html { 
            background: #0a0a0a;
          }
          body { 
            margin: 0; 
            background: #0a0a0a;
            position: relative;
            min-height: 100vh;
            overflow: hidden;
          }
          
          body.boot-complete {
            overflow-x: hidden;
            overflow-y: auto;
          }
          
          /* Скрываем контент до завершения загрузки */
          .app-layout:not(.global-glitch-active) {
            opacity: 0;
            position: relative;
            z-index: 2;
            transform: scale(0.96);
            filter: blur(1px);
          }
          
          /* Анимация появления запускается только один раз при загрузке */
          body.boot-complete .app-layout:not(.app-layout-appeared) {
            animation: crt-power-on 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.5s forwards;
          }
          
          /* После завершения анимации появления класс предотвращает её повторный запуск */
          /* Явно сохраняем финальное состояние анимации, но не перекрываем глитч */
          body.boot-complete .app-layout.app-layout-appeared:not(.global-glitch-active) {
            opacity: 1 !important;
            transform: scale(1) translate(0, 0) !important;
            filter: blur(0) !important;
          }
          
          /* При активном глитче убираем все конфликтующие стили */
          body.boot-complete .app-layout.global-glitch-active {
            opacity: 1 !important;
            /* transform и filter управляются анимацией глитча */
          }
          
          @keyframes crt-power-on {
            0% {
              opacity: 0;
              transform: scale(0.96) translate(0, 0);
              filter: blur(1.2px);
            }
            8% {
              opacity: 0.2;
              transform: scale(0.97) translate(0.15px, -0.1px);
              filter: blur(1px);
            }
            16% {
              opacity: 0.4;
              transform: scale(0.98) translate(-0.12px, 0.08px);
              filter: blur(0.8px);
            }
            24% {
              opacity: 0.55;
              transform: scale(0.985) translate(0.1px, -0.06px);
              filter: blur(0.6px);
            }
            32% {
              opacity: 0.68;
              transform: scale(0.99) translate(-0.08px, 0.05px);
              filter: blur(0.5px);
            }
            40% {
              opacity: 0.78;
              transform: scale(0.995) translate(0.06px, -0.04px);
              filter: blur(0.4px);
            }
            48% {
              opacity: 0.85;
              transform: scale(0.998) translate(-0.04px, 0.03px);
              filter: blur(0.3px);
            }
            56% {
              opacity: 0.9;
              transform: scale(1.0) translate(0.03px, -0.02px);
              filter: blur(0.2px);
            }
            64% {
              opacity: 0.94;
              transform: scale(1.0) translate(-0.02px, 0.015px);
              filter: blur(0.15px);
            }
            72% {
              opacity: 0.97;
              transform: scale(1.0) translate(0.015px, -0.01px);
              filter: blur(0.1px);
            }
            80% {
              opacity: 0.99;
              transform: scale(1.0) translate(-0.01px, 0.008px);
              filter: blur(0.05px);
            }
            88% {
              opacity: 1;
              transform: scale(1.0) translate(0.008px, -0.005px);
              filter: blur(0.02px);
            }
            96% {
              opacity: 1;
              transform: scale(1.0) translate(-0.005px, 0.003px);
              filter: blur(0.01px);
            }
            100% {
              opacity: 1;
              transform: scale(1.0) translate(0, 0);
              filter: blur(0);
            }
          }
          
          
          /* LAYER 1: Realistic CRT Screen Vignette (BEHIND content, z-index: 1) */
          #geometric-bg {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 1;
            pointer-events: none;
            /* Radial gradient from center - mimics CRT phosphor glow */
            background: 
              radial-gradient(
                ellipse 100% 100% at 50% 50%,
                transparent 0%,
                transparent 75%,
                rgba(0, 0, 0, 0.3) 85%,
                rgba(0, 0, 0, 0.7) 92%,
                rgba(0, 0, 0, 0.95) 97%,
                rgba(0, 0, 0, 0.99) 100%
              );
            /* Pronounced curved screen effect */
            border-radius: 3% / 4%;
            /* Strong inner shadow to create depth */
            box-shadow: 
              inset 0 0 200px 50px rgba(0, 0, 0, 0.8),
              inset 0 0 100px 20px rgba(0, 0, 0, 0.6);
            /* Always visible but starts with glow animation */
            animation: crt-ambient-glow 3s ease-in-out infinite;
          }
          
          /* Mobile: only vertical vignette (top and bottom, no sides) */
          @media (max-width: 768px) {
            #geometric-bg {
              background: 
                radial-gradient(
                  ellipse 150% 100% at 50% 50%,
                  transparent 0%,
                  transparent 80%,
                  rgba(0, 0, 0, 0.5) 90%,
                  rgba(0, 0, 0, 0.95) 100%
                );
              border-radius: 0;
              box-shadow: 
                inset 0 100px 80px -50px rgba(0, 0, 0, 0.9),
                inset 0 -100px 80px -50px rgba(0, 0, 0, 0.9);
            }
          }
          
          @keyframes crt-ambient-glow {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.97; }
          }
          
          /* LAYER 2: Content will be in the middle (z-index: 100-200) - naturally above geometric-bg */
          
          /* LAYER 3: Cosmetic overlay - Scanlines and subtle effects (TOP, z-index: 999999) */
          body::after {
            content: '';
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: repeating-linear-gradient(
              0deg,
              rgba(0, 0, 0, 0.03),
              rgba(0, 0, 0, 0.03) 1px,
              transparent 1px,
              transparent 2px
            );
            pointer-events: none;
            z-index: 999999;
            border-radius: 3% / 4%;
            /* Hidden initially, fades in with flickering after bootloader */
            opacity: 0;
            animation: 
              scanline-fade-in 0.6s ease-out 1s forwards,
              scanline-flicker 8s linear 1.6s infinite;
          }
          
          @keyframes scanline-fade-in {
            from { opacity: 0; }
            to { opacity: 0.3; }
          }
          
          @keyframes scanline-flicker {
            0% { opacity: 0.25; }
            50% { opacity: 0.35; }
            100% { opacity: 0.25; }
          }
          
          @media (max-width: 768px) {
            body::after {
              border-radius: 0;
            }
          }
          
          /* Screen bezel effect - creates depth illusion */
          body::before {
            content: '';
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            pointer-events: none;
            z-index: 999998;
            border-radius: 3% / 4%;
            /* Subtle edge highlight for 3D effect */
            box-shadow: 
              inset 0 0 80px rgba(0, 0, 0, 0.3),
              inset 0 2px 1px rgba(255, 255, 255, 0.01);
            /* Hidden initially, fades in after bootloader */
            opacity: 0;
            animation: bezel-fade-in 0.8s ease-out 1.2s forwards;
          }
          
          @keyframes bezel-fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          
          @media (max-width: 768px) {
            body::before {
              border-radius: 0;
              box-shadow: inset 0 0 40px rgba(0, 0, 0, 0.2);
            }
          }
          /* CRT grid: STRAIGHT in center, CURVED OUTWARD at edges (CONVEX screen) */
          #geometric-bg::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'%3E%3Cg stroke='%232a2a2a' stroke-width='0.12' fill='none'%3E%3Cpath d='M 0,0 C -2,15 -3,35 -3,50 C -3,65 -2,85 0,100'/%3E%3Cpath d='M 6,0 C 4,20 4,40 4,50 C 4,60 4,80 6,100'/%3E%3Cpath d='M 12,0 L 11,25 C 11,35 11,65 11,75 L 12,100'/%3E%3Cpath d='M 18,0 L 18,30 L 18,70 L 18,100'/%3E%3Cpath d='M 24,0 L 24,100'/%3E%3Cpath d='M 30,0 L 30,100'/%3E%3Cpath d='M 36,0 L 36,100'/%3E%3Cpath d='M 42,0 L 42,100'/%3E%3Cpath d='M 48,0 L 48,100'/%3E%3Cpath d='M 54,0 L 54,100'/%3E%3Cpath d='M 60,0 L 60,100'/%3E%3Cpath d='M 66,0 L 66,100'/%3E%3Cpath d='M 72,0 L 72,100'/%3E%3Cpath d='M 78,0 L 78,100'/%3E%3Cpath d='M 84,0 L 84,30 L 84,70 L 84,100'/%3E%3Cpath d='M 90,0 L 91,25 C 91,35 91,65 91,75 L 90,100'/%3E%3Cpath d='M 96,0 C 98,20 98,40 98,50 C 98,60 98,80 96,100'/%3E%3Cpath d='M 100,0 C 103,15 105,35 105,50 C 105,65 103,85 100,100'/%3E%3Cpath d='M 0,0 C 15,-2 35,-3 50,-3 C 65,-3 85,-2 100,0'/%3E%3Cpath d='M 0,6 C 20,4 40,4 50,4 C 60,4 80,4 100,6'/%3E%3Cpath d='M 0,12 L 25,11 C 35,11 65,11 75,11 L 100,12'/%3E%3Cpath d='M 0,18 L 30,18 L 70,18 L 100,18'/%3E%3Cpath d='M 0,24 L 100,24'/%3E%3Cpath d='M 0,30 L 100,30'/%3E%3Cpath d='M 0,36 L 100,36'/%3E%3Cpath d='M 0,42 L 100,42'/%3E%3Cpath d='M 0,48 L 100,48'/%3E%3Cpath d='M 0,54 L 100,54'/%3E%3Cpath d='M 0,60 L 100,60'/%3E%3Cpath d='M 0,66 L 100,66'/%3E%3Cpath d='M 0,72 L 100,72'/%3E%3Cpath d='M 0,78 L 100,78'/%3E%3Cpath d='M 0,84 L 100,84'/%3E%3Cpath d='M 0,90 L 25,91 C 35,91 65,91 75,91 L 100,90'/%3E%3Cpath d='M 0,96 C 20,98 40,98 50,98 C 60,98 80,98 100,96'/%3E%3Cpath d='M 0,100 C 15,103 35,105 50,105 C 65,105 85,103 100,100'/%3E%3C/g%3E%3C/svg%3E");
            background-size: 100% 100%;
            background-position: center;
            background-repeat: no-repeat;
            opacity: 0.3;
          }
          /* Ambient glow */
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
          
          /* Эффект искажения линий при схлопывании - линии "схлопываются" к центру */
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
          
          /* Subtle TV Glitch Effect - легкое дрожание и искажение */
          #tv-glitch {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 999997;
            pointer-events: none;
            opacity: 0;
          }
          
          #tv-glitch.active {
            animation: glitch-wave 1s cubic-bezier(0.4, 0, 0.2, 1);
          }
          
          @keyframes glitch-wave {
            0%, 100% {
              opacity: 0;
            }
            10%, 90% {
              opacity: 0.8;
            }
          }
          
          /* Зона искажения, которая движется сверху вниз */
          #tv-glitch::before {
            content: '';
            position: absolute;
            left: 0;
            right: 0;
            height: 80px;
            background: transparent;
          }
          
          #tv-glitch.active::before {
            animation: glitch-zone-move 1s cubic-bezier(0.4, 0, 0.2, 1);
          }
          
          @keyframes glitch-zone-move {
            0% {
              top: -80px;
              opacity: 0;
            }
            10% {
              opacity: 1;
            }
            90% {
              opacity: 1;
            }
            100% {
              top: 100%;
              opacity: 0;
            }
          }
          
          /* Эффект легкого дрожания всего контента */
          body.glitch-active .app-layout {
            animation: body-glitch 1s cubic-bezier(0.4, 0, 0.2, 1);
            will-change: transform;
          }
          
          @keyframes body-glitch {
            0%, 100% {
              transform: translateX(0);
            }
            15% {
              transform: translateX(-2px);
            }
            18% {
              transform: translateX(3px);
            }
            22% {
              transform: translateX(-2px);
            }
            25% {
              transform: translateX(2px);
            }
            28% {
              transform: translateX(0);
            }
            50% {
              transform: translateX(-3px);
            }
            53% {
              transform: translateX(2px);
            }
            56% {
              transform: translateX(0);
            }
            75% {
              transform: translateX(2px);
            }
            78% {
              transform: translateX(-2px);
            }
            82% {
              transform: translateX(0);
            }
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
            
            function hideBootLoader() {
              var loader = document.getElementById('boot-loader');
              if (loader) {
                // Добавляем класс для эффекта схлопывания
                loader.classList.add('collapsing');
                // Добавляем класс boot-complete сразу, но анимация появления контента начнётся с задержкой 0.5s
                document.body.classList.add('boot-complete');
                setTimeout(function() {
                  loader.style.display = 'none';
                  window.bootLoaderComplete = true;
                  window.dispatchEvent(new Event('bootloader-complete'));
                  
                  // Добавляем класс после завершения анимации появления (0.5s задержка + 0.7s анимация = 1.2s)
                  // Это предотвратит повторный запуск анимации при любых манипуляциях с классами
                  // Добавляем небольшую задержку для гарантии завершения анимации
                  setTimeout(function() {
                    var appLayout = document.querySelector('.app-layout');
                    if (appLayout) {
                      appLayout.classList.add('app-layout-appeared');
                      // Явно устанавливаем финальное состояние на случай, если анимация не завершилась
                      appLayout.style.opacity = '1';
                      appLayout.style.transform = 'scale(1) translate(0, 0)';
                      appLayout.style.filter = 'blur(0)';
                    }
                  }, 1300); // Небольшая задержка для гарантии
                }, 400);
              }
            }
            
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
        `}</script>
        <script src="/s/static/lib/tailwind.3.4.16.min.js"></script>
        <link rel="stylesheet" href="/s/static/lib/fontawesome/6.7.2/css/all.min.css" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap"
          rel="stylesheet"
        />
        <style>{`
          :root {
            --color-bg: #0a0a0a;
            --color-bg-secondary: #141414;
            --color-bg-tertiary: #1a1a1a;
            --color-text: #e8e8e8;
            --color-text-secondary: #a0a0a0;
            --color-text-tertiary: #707070;
            --color-border: #2a2a2a;
            --color-border-light: #3a3a3a;
            --color-accent: #d3234b;
            --color-accent-hover: #e6395f;
            --color-accent-light: rgba(211, 35, 75, 0.15);
            --color-accent-medium: rgba(211, 35, 75, 0.25);
          }
          
          /* Стилизация выделения текста */
          ::selection {
            background: #e0335a;
            color: #ffffff;
          }
          
          ::-moz-selection {
            background: #e0335a;
            color: #ffffff;
          }
        `}</style>
      </head>
      <body>
        <div id="geometric-bg"></div>
        <div id="tv-glitch"></div>
        <div id="boot-loader">
          <div class="boot-messages">
            <div id="boot-messages-container"></div>
          </div>
        </div>
        <WebhooksPage
          projectTitle={projectTitle}
          indexUrl={indexPageRoute.url()}
          profileUrl={profilePageRoute.url()}
          loginUrl={loginPageRoute.url()}
          isAuthenticated={isAuthenticated}
          encodedSocketId={encodedSocketId}
          botId={botId || null}
          chatId={chatId || null}
        />
      </body>
    </html>
  )
})
