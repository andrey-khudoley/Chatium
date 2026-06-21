// @shared
import { jsx } from '@app/html-jsx'
import { requireAccountRole } from '@app/auth'
import { genSocketId } from '@app/socket'
import AdminPage from './pages/AdminPage.vue'
import { Debug } from './shared/debug'
import {
  applyDebugLevel,
  applyLogPrefix,
  getCachedLogLevel,
  getCachedLogPrefix
} from './lib/logging'
import { loadProjectSettings } from './lib/settings'
import { getFullUrl, ROUTES } from './config/routes'
import { getPreloaderStyles, getPreloaderScript, getPreloaderHTML } from './shared/preloader'
import './lib/logs-init'
import { getLogs, getLogCounts } from './lib/logs-operations'
import { getErrorCountSilent, getWarnCountSilent } from './lib/logging'
import { ProjectLogs } from './tables/projectLogs.table'

const ADMIN_LOGS_SOCKET_ID = 'admin-logs'

/**
 * Страница админки
 * Доступна только пользователям с ролью Admin
 */
export const adminPageRoute = app.html('/', async (ctx, req) => {
  try {
    // Применяем настройки логирования
    await applyDebugLevel(ctx, 'admin-page')
    await applyLogPrefix(ctx, 'admin-page')

    Debug.info(ctx, '[admin] Начало обработки запроса на страницу админки')

    // Проверка прав доступа
    requireAccountRole(ctx, 'Admin')
    Debug.info(ctx, `[admin] Пользователь авторизован как Admin: userId=${ctx.user?.id}`)

    // Загрузка настроек проекта
    const { projectName, projectTitle, projectDescription, logsWebhookUrl, logsWebhookEnabled } =
      await loadProjectSettings(ctx)
    Debug.info(
      ctx,
      `[admin] Настройки проекта загружены: projectName=${projectName}, projectTitle=${projectTitle}`
    )

    // Генерация socket ID для WebSocket подключения
    const encodedSocketId = await genSocketId(ctx, ADMIN_LOGS_SOCKET_ID)
    Debug.info(ctx, '[admin] Socket ID сгенерирован для WebSocket подключения')

    const currentLogLevel = getCachedLogLevel()
    const currentLogPrefix = getCachedLogPrefix()
    Debug.info(
      ctx,
      `[admin] Текущие настройки: logLevel=${currentLogLevel}, logPrefix=${currentLogPrefix}`
    )

    // Начальные логи и счётчики только при рендере (Heap доступен здесь; в API @shared-route Heap не инициализирован)
    const query = (req as any).query ?? (ctx as any).req?.query ?? {}
    const queryLimit = Math.min(Math.max(Number(query.limit) || 50, 1), 1000)
    const queryBefore = query.before as string | undefined
    const queryLevel = query.level as string | undefined
    const validLevel =
      queryLevel === 'info' || queryLevel === 'warn' || queryLevel === 'error'
        ? queryLevel
        : undefined

    let initialLogs: Array<{
      id: string
      level: string
      message: string
      code?: string
      createdAt: string
    }> = []
    let initialCounts = { info: 0, warn: 0, error: 0 }
    let initialAccumulatedCounts = { error: 0, warn: 0 }
    try {
      // Явно передаём таблицу (ProjectLogs), чтобы не зависеть от инжекции в контексте рендера
      const [logsData, countsData, errorCount, warnCount] = await Promise.all([
        getLogs(
          ctx,
          { limit: queryLimit, before: queryBefore || undefined, level: validLevel },
          ProjectLogs
        ),
        getLogCounts(ctx, ProjectLogs),
        getErrorCountSilent(ctx),
        getWarnCountSilent(ctx)
      ])
      initialLogs = Array.isArray(logsData) ? logsData : []
      initialCounts =
        countsData && typeof countsData.info === 'number'
          ? countsData
          : { info: 0, warn: 0, error: 0 }
      initialAccumulatedCounts = { error: errorCount ?? 0, warn: warnCount ?? 0 }
    } catch (err) {
      Debug.error(
        ctx,
        `[admin] Ошибка загрузки логов при рендере: ${(err as Error)?.message ?? err}`,
        'E_ADMIN_LOGS_LOAD'
      )
      // Оставляем пустые значения, страница отобразится без логов
    }

    const initialLimit = queryLimit
    const nextLimit = Math.min(initialLimit + 50, 1000)
    const loadMoreUrl =
      nextLimit > initialLimit
        ? `${getFullUrl(ROUTES.admin)}?limit=${nextLimit}${validLevel ? `&level=${validLevel}` : ''}`
        : ''
    const loadAllUrl = `${getFullUrl(ROUTES.admin)}?limit=1000${validLevel ? `&level=${validLevel}` : ''}`

    const pageTitle = `Админка | ${projectTitle}`

    return (
      <html>
        <head>
          <title>{pageTitle}</title>
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
              animation: crt-ambient-glow 3s ease-in-out infinite;
            }
            
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
            
            /* CRT grid: STRAIGHT in center, CURVED OUTWARD at edges (CONVEX screen) */
            #geometric-bg::before {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'%3E%3Cg stroke='%232a2a2a' stroke-width='0.12' fill='none'%3E%3Cpath d='M 0,0 C -2,15 -3,35 -3,50 C -3,65 -2,85 0,100'/%3E%3Cpath d='M 6,0 C 4,20 4,40 4,50 C 4,60 4,80 6,100'/%3E%3Cpath d='M 12,0 L 11,25 C 11,35 11,65 11,75 L 12,100'/%3E%3Cpath d='M 18,0 L 18,30 L 18,70 L 18,100'/%3E%3Cpath d='M 24,0 L 24,100'/%3E%3Cpath d='M 30,0 L 30,100'/%3E%3Cpath d='M 36,0 L 36,100'/%3E%3Cpath d='M 42,0 L 42,100'/%3E%3Cpath d='M 48,0 L 48,100'/%3E%3Cpath d='M 54,0 L 54,100'/%3E%3Cpath d='M 60,0 L 60,100'/%3E%3Cpath d='M 66,0 L 66,100'/%3E%3Cpath d='M 72,0 L 72,100'/%3E%3Cpath d='M 78,0 L 78,100'/%3E%3Cpath d='M 84,0 L 84,30 L 84,70 L 84,100'/%3E%3Cpath d='M 90,0 L 91,25 C 91,35 91,65 91,75 L 90,100'/%3E%3Cpath d='M 96,0 C 98,20 98,40 98,50 C 98,60 98,80 96,100'/%3E%3Cpath d='M 100,0 C 103,15 105,35 105,50 C 105,65 103,85 100,100'/%3E%3Cpath d='M 0,0 C 15,-3 35,-5 50,-5 C 65,-5 85,-3 100,0'/%3E%3Cpath d='M 0,6 C 20,3 40,3 50,3 C 60,3 80,3 100,6'/%3E%3Cpath d='M 0,12 L 25,10 C 35,10 65,10 75,10 L 100,12'/%3E%3Cpath d='M 0,18 L 30,18 L 70,18 L 100,18'/%3E%3Cpath d='M 0,24 L 100,24'/%3E%3Cpath d='M 0,30 L 100,30'/%3E%3Cpath d='M 0,36 L 100,36'/%3E%3Cpath d='M 0,42 L 100,42'/%3E%3Cpath d='M 0,48 L 100,48'/%3E%3Cpath d='M 0,54 L 100,54'/%3E%3Cpath d='M 0,60 L 100,60'/%3E%3Cpath d='M 0,66 L 100,66'/%3E%3Cpath d='M 0,72 L 100,72'/%3E%3Cpath d='M 0,78 L 100,78'/%3E%3Cpath d='M 0,84 L 30,84 L 70,84 L 100,84'/%3E%3Cpath d='M 0,90 L 25,92 C 35,92 65,92 75,92 L 100,90'/%3E%3Cpath d='M 0,96 C 20,99 40,99 50,99 C 60,99 80,99 100,96'/%3E%3Cpath d='M 0,100 C 15,105 35,107 50,107 C 65,107 85,105 100,100'/%3E%3C/g%3E%3C/svg%3E");
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
              box-shadow: 
                inset 0 0 80px rgba(0, 0, 0, 0.3),
                inset 0 2px 1px rgba(255, 255, 255, 0.01);
              opacity: 1;
            }
            
            @media (max-width: 768px) {
              body::before {
                border-radius: 0;
                box-shadow: inset 0 0 40px rgba(0, 0, 0, 0.2);
              }
            }
            ${getPreloaderStyles()}
          `}</style>
          <script>{getPreloaderScript()}</script>
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
          {jsx(getPreloaderHTML())}
          <AdminPage
            projectName={projectName}
            projectTitle={projectTitle}
            projectDescription={projectDescription}
            currentLogLevel={currentLogLevel}
            encodedSocketId={encodedSocketId}
            indexUrl={getFullUrl(ROUTES.index)}
            profileUrl={getFullUrl(ROUTES.profile)}
            loginUrl={getFullUrl(ROUTES.login)}
            adminUrl={getFullUrl(ROUTES.admin)}
            isAdmin={true}
            initialLogs={initialLogs}
            initialCounts={initialCounts}
            initialAccumulatedCounts={initialAccumulatedCounts}
            initialLimit={initialLimit}
            loadMoreUrl={loadMoreUrl}
            loadAllUrl={loadAllUrl}
            initialFilter={validLevel ?? 'all'}
            initialWebhookUrl={logsWebhookUrl}
            initialWebhookEnabled={logsWebhookEnabled}
          />
        </body>
      </html>
    )
  } catch (error: any) {
    Debug.error(
      ctx,
      `[admin] Ошибка при обработке страницы админки: ${error.message}`,
      'E_ADMIN_PAGE'
    )
    Debug.error(ctx, `[admin] Stack trace: ${error.stack || 'N/A'}`)

    // Возвращаем страницу с ошибкой
    return (
      <html>
        <head>
          <title>Ошибка - Админка</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <meta charset="UTF-8" />
        </head>
        <body style="background: #0a0a0a; color: #e8e8e8; font-family: monospace; padding: 2rem;">
          <h1 style="color: #d3234b;">Ошибка доступа</h1>
          <p>{error.message || 'Произошла ошибка при загрузке страницы админки'}</p>
          <a href="/" style="color: #d3234b;">
            Вернуться на главную
          </a>
        </body>
      </html>
    )
  }
})
