// @shared-route
import { requireAnyUser } from '@app/auth'
import * as loggerLib from '../../lib/logger.lib'

const LOG_PATH = 'api/tests/list'

/**
 * GET /api/tests/list — каталог тестов: список категорий и тестов.
 * Для авторизованных пользователей.
 */
export const listTestsRoute = app.get('/', async (ctx, req) => {
  requireAnyUser(ctx)

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Запрос каталога тестов`,
    payload: {}
  })

  const categories = [
    {
      id: 'endpoints',
      title: 'Проверка эндпоинтов',
      tests: [
        { id: 'index', title: 'Эндпоинт /' },
        { id: 'web-admin', title: 'Эндпоинт /web/admin' },
        { id: 'web-profile', title: 'Эндпоинт /web/profile' },
        { id: 'web-login', title: 'Эндпоинт /web/login' },
        { id: 'web-tests', title: 'Эндпоинт /web/tests' }
      ]
    },
    {
      id: 'settings-lib',
      title: 'Библиотека настроек',
      tests: [
        { id: 'getSettingString', title: 'getSettingString (project_name)' },
        { id: 'getLogLevel', title: 'getLogLevel' },
        { id: 'getLogsLimit', title: 'getLogsLimit' },
        { id: 'getLogWebhook', title: 'getLogWebhook' },
        { id: 'getDashboardResetAt', title: 'getDashboardResetAt' },
        { id: 'getAllSettings', title: 'getAllSettings' }
      ]
    },
    {
      id: 'settings-repo',
      title: 'Репозиторий настроек',
      tests: [
        { id: 'upsert', title: 'upsert' },
        { id: 'deleteByKey', title: 'deleteByKey' },
        { id: 'findByKey', title: 'findByKey' },
        { id: 'findAll', title: 'findAll' }
      ]
    },
    {
      id: 'logger-lib',
      title: 'Библиотека логов',
      tests: [
        { id: 'getAdminLogsSocketId', title: 'getAdminLogsSocketId' },
        { id: 'shouldLogByLevel_Info', title: 'shouldLogByLevel (Info, 6)' },
        { id: 'shouldLogByLevel_Error', title: 'shouldLogByLevel (Error, 3)' },
        { id: 'shouldLogByLevel_Disable', title: 'shouldLogByLevel (Disable, 7)' }
      ]
    },
    {
      id: 'logs-repo',
      title: 'Репозиторий логов',
      tests: [
        { id: 'create', title: 'create' },
        { id: 'findAll', title: 'findAll' },
        { id: 'findBeforeTimestamp', title: 'findBeforeTimestamp' },
        { id: 'countErrorsAfter', title: 'countErrorsAfter' },
        { id: 'countWarningsAfter', title: 'countWarningsAfter' }
      ]
    },
    {
      id: 'dashboard-lib',
      title: 'Библиотека админки',
      tests: [
        { id: 'getDashboardCounts', title: 'getDashboardCounts' },
        { id: 'resetDashboard', title: 'resetDashboard' }
      ]
    },
    {
      id: 'ref-generator',
      title: 'Генератор идентификаторов',
      tests: [
        { id: 'generateUrlSafeId-default', title: 'generateUrlSafeId() — длина 8, base62' },
        { id: 'generateUrlSafeId-length', title: 'generateUrlSafeId(12) — длина 12, base62' },
        { id: 'generateCampaignSecret', title: 'generateCampaignSecret() — длина 8, base62' },
        { id: 'generateLinkSlug', title: 'generateLinkSlug() — длина 10, base62' }
      ]
    },
    {
      id: 'fingerprint',
      title: 'Fingerprint (дедупликация визитов)',
      tests: [
        {
          id: 'computeFingerprint-basic',
          title: 'computeFingerprint — hash и parts по заголовкам'
        },
        {
          id: 'computeFingerprint-x-forwarded-for-first',
          title: 'IP из X-Forwarded-For — берётся первый адрес'
        },
        {
          id: 'computeFingerprint-x-real-ip',
          title: 'IP из X-Real-IP при отсутствии X-Forwarded-For'
        },
        {
          id: 'computeFingerprint-empty-headers',
          title: 'Пустые заголовки — ip unknown, строки пустые'
        },
        {
          id: 'computeFingerprint-deterministic',
          title: 'Один и тот же запрос — один и тот же hash'
        },
        { id: 'computeFingerprint-optional-fields', title: 'Опциональные поля platform и timezone' }
      ]
    },
    {
      id: 'url-builder',
      title: 'Построение URL',
      tests: [
        { id: 'substituteRef-single', title: 'substituteRef — одна подстановка {ref}' },
        { id: 'substituteRef-multiple', title: 'substituteRef — несколько вхождений {ref}' },
        {
          id: 'buildPartnerLinkUrl',
          title: 'buildPartnerLinkUrl — URL содержит slug и путь редиректа'
        }
      ]
    },
    {
      id: 'page-repo',
      title: 'Репозиторий страниц',
      tests: [
        { id: 'createPage', title: 'createPage' },
        { id: 'getPageById-found', title: 'getPageById (найдена)' },
        { id: 'getPageById-notFound', title: 'getPageById (не найдена)' },
        { id: 'getCampaignPages', title: 'getCampaignPages' }
      ]
    },
    {
      id: 'link-repo',
      title: 'Репозиторий партнёрских ссылок',
      tests: [
        { id: 'getOrCreatePartnerLink', title: 'getOrCreatePartnerLink' },
        {
          id: 'getOrCreatePartnerLink-idempotent',
          title: 'getOrCreatePartnerLink (повтор — та же ссылка)'
        },
        { id: 'getPartnerLinks', title: 'getPartnerLinks' },
        { id: 'findLinkByPublicSlug', title: 'findLinkByPublicSlug' }
      ]
    },
    {
      id: 'member-repo',
      title: 'Репозиторий участников кампании',
      tests: [
        { id: 'addMember', title: 'addMember' },
        { id: 'checkCampaignAccess-hasAccess', title: 'checkCampaignAccess (есть доступ)' },
        { id: 'checkCampaignAccess-noAccess', title: 'checkCampaignAccess (нет доступа)' }
      ]
    },
    {
      id: 'campaign-repo',
      title: 'Репозиторий кампаний',
      tests: [
        { id: 'createCampaign', title: 'createCampaign' },
        { id: 'getCampaignById-found', title: 'getCampaignById (найдена)' },
        { id: 'getCampaignById-notFound', title: 'getCampaignById (не найдена)' },
        { id: 'getUserCampaigns', title: 'getUserCampaigns' },
        { id: 'findCampaignBySecret-found', title: 'findCampaignBySecret (найдена по key)' },
        { id: 'findCampaignBySecret-notFound', title: 'findCampaignBySecret (неверный key → null)' }
      ]
    },
    {
      id: 'campaigns-api',
      title: 'API кампаний',
      tests: [
        { id: 'campaigns-list', title: 'GET /api/campaigns/list' },
        { id: 'campaigns-create', title: 'POST /api/campaigns/create (успех)' },
        { id: 'campaigns-create-validation', title: 'POST /api/campaigns/create (валидация)' }
      ]
    },
    {
      id: 'visit-repo',
      title: 'Репозиторий визитов',
      tests: [
        { id: 'createVisit', title: 'createVisit (новый визит)' },
        { id: 'createVisit-idempotent', title: 'createVisit (повтор — тот же ref)' },
        { id: 'findVisitByRef-found', title: 'findVisitByRef (найден)' },
        { id: 'findVisitByRef-notFound', title: 'findVisitByRef (не найден)' },
        { id: 'markVisitRegistered', title: 'markVisitRegistered' }
      ]
    },
    {
      id: 'redirect-route',
      title: 'Роут редиректа /r?linkId=',
      tests: [
        { id: 'redirect-404-unknown-slug', title: 'GET /r?linkId= — неизвестный slug → 404' },
        { id: 'redirect-success', title: 'GET /r?linkId= — редирект и визит' },
        { id: 'redirect-idempotent', title: 'GET /r?linkId= — повторный клик (тот же ref)' }
      ]
    },
    {
      id: 'referral-repo',
      title: 'Репозиторий рефералов',
      tests: [
        { id: 'createOrUpdateReferral-new', title: 'createOrUpdateReferral (новый реферал)' },
        { id: 'createOrUpdateReferral-update', title: 'createOrUpdateReferral (обновление)' },
        { id: 'incrementReferralStats', title: 'incrementReferralStats' }
      ]
    },
    {
      id: 'attribution',
      title: 'Атрибуция (resolveByRef)',
      tests: [
        { id: 'resolveByRef-found', title: 'resolveByRef (найден по ref)' },
        { id: 'resolveByRef-notFound', title: 'resolveByRef (несуществующий ref → null)' }
      ]
    },
    {
      id: 'event-repo',
      title: 'Репозиторий событий (eventRepo)',
      tests: [
        { id: 'processRegistration-new', title: 'processRegistration (новый)' },
        { id: 'processRegistration-idempotent', title: 'processRegistration (идемпотентность)' },
        { id: 'processOrder-new', title: 'processOrder (новый заказ)' },
        { id: 'processOrder-idempotent', title: 'processOrder (идемпотентность)' },
        { id: 'processPayment-new', title: 'processPayment (новая оплата)' }
      ]
    },
    {
      id: 'webhooks-feature5',
      title: "Webhook'и фичи 5 (register, order, payment)",
      tests: [
        { id: 'hook-register', title: 'POST hook/register → success' },
        { id: 'hook-order', title: 'POST hook/order → success' },
        { id: 'hook-payment', title: 'POST hook/payment → success' }
      ]
    },
    {
      id: 'partner-repo',
      title: 'Репозиторий партнёров',
      tests: [
        { id: 'getOrCreatePartner-new', title: 'getOrCreatePartner (новый партнёр)' },
        { id: 'getOrCreatePartner-existing', title: 'getOrCreatePartner (существующий)' },
        { id: 'getPartnerById-found', title: 'getPartnerById (найден)' },
        { id: 'getPartnerById-notFound', title: 'getPartnerById (не найден)' },
        { id: 'updatePartnerStats', title: 'updatePartnerStats (инкремент счётчиков)' }
      ]
    },
    {
      id: 'bot-repo',
      title: 'Репозиторий ботов',
      tests: [
        { id: 'getBotById-found', title: 'getBotById (найден)' },
        { id: 'getBotById-notFound', title: 'getBotById (не найден)' },
        { id: 'saveUpdate', title: 'saveUpdate (запись апдейта)' }
      ]
    },
    {
      id: 'telegram-bot',
      title: 'Telegram-бот (URL, сообщения, токен)',
      tests: [
        { id: 'getTelegramWebhookUrl', title: 'getTelegramWebhookUrl' },
        { id: 'buildWelcomeMessage', title: 'buildWelcomeMessage' },
        { id: 'buildStatsMessage', title: 'buildStatsMessage' },
        { id: 'telegram-getMe', title: 'Telegram getMe (тестовый токен)' }
      ]
    },
    {
      id: 'telegram-hook',
      title: 'Webhook Telegram',
      tests: [{ id: 'hook-unknown-botId-200', title: 'POST hook — неизвестный botId → 200' }]
    }
  ]

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] Каталог отдан`,
    payload: { categoriesCount: categories.length }
  })

  return { success: true, categories }
})
