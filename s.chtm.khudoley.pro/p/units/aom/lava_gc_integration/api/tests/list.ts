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

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Формирование categories`,
    payload: {}
  })
  const categories = [
    {
      id: 'unit-save-credentials',
      title: 'Юнит: слияние ключей (save, без сети)',
      tests: [
        {
          id: 'settings-save-credentials-unit',
          title: 'resolveGcCredentialsForSave / resolveLavaCredentialsForSave'
        }
      ]
    },
    {
      id: 'unit-page-routes',
      title: 'Юнит: страницы (route.run, без HTTP)',
      tests: [
        { id: 'index', title: 'Главная (/)' },
        { id: 'web-admin', title: 'Админка /web/admin' },
        { id: 'web-profile', title: 'Профиль /web/profile' },
        { id: 'web-login', title: 'Вход /web/login' },
        { id: 'web-tests', title: 'Тесты /web/tests' },
        { id: 'web-orders', title: 'Заказы /web/orders' }
      ]
    },
    {
      id: 'integration-pages-http',
      title: 'Интеграция: страницы (fetch из браузера)',
      tests: [
        { id: 'index', title: 'Главная (/)' },
        { id: 'web-admin', title: 'Админка /web/admin' },
        { id: 'web-profile', title: 'Профиль /web/profile' },
        { id: 'web-login', title: 'Вход /web/login' },
        { id: 'web-tests', title: 'Тесты /web/tests' },
        { id: 'web-orders', title: 'Заказы /web/orders' }
      ]
    },
    {
      id: 'integration-credentials-heap',
      title: 'Интеграция: ключи из Heap (GetCourse и Lava)',
      tests: [
        {
          id: 'integration-gc-credentials',
          title: 'GetCourse: gc_api_key + gc_account_domain → verifyGcPlApiAccess'
        },
        {
          id: 'integration-lava-credentials',
          title: 'Lava: lava_api_key + lava_base_url → GET /api/v2/products'
        },
        {
          id: 'integration-gc-order-pl-api',
          title:
            'GetCourse: PL API по gcOrderId (+ buyerEmail или email из Heap-контракта) — проба обновления заказа'
        }
      ]
    },
    {
      id: 'endpoints',
      title: 'Проверка эндпоинтов',
      tests: [
        { id: 'index', title: 'Эндпоинт /' },
        { id: 'web-admin', title: 'Эндпоинт /web/admin' },
        { id: 'web-profile', title: 'Эндпоинт /web/profile' },
        { id: 'web-login', title: 'Эндпоинт /web/login' },
        { id: 'web-tests', title: 'Эндпоинт /web/tests' },
        { id: 'web-orders', title: 'Эндпоинт /web/orders' }
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
      id: 'integration-check',
      title: 'Ключи интеграции (GetCourse и Lava)',
      tests: [
        {
          id: 'integration-gc-credentials',
          title: 'GetCourse: gc_api_key + gc_account_domain → verifyGcPlApiAccess'
        },
        {
          id: 'integration-lava-credentials',
          title: 'Lava: lava_api_key + lava_base_url → GET /api/v2/products'
        },
        {
          id: 'integration-gc-order-pl-api',
          title:
            'GetCourse: PL API по gcOrderId (+ buyerEmail или email из Heap-контракта) — проба обновления заказа'
        }
      ]
    },
    {
      id: 'payment-link-integration',
      title: 'POST payment-link (dry-run и HTTP)',
      tests: [
        {
          id: 'payment-link-dry-run-unit',
          title: 'Юнит: route.run + integrationTestDryRun (без HTTP к себе)'
        },
        {
          id: 'lava-amount-limits-unit',
          title: 'Юнит: лимиты суммы оффера Lava (RUB/USD/EUR, без сети)'
        },
        {
          id: 'payment-link-http-integration',
          title: 'Интеграция: HTTP POST через request() на payment-link'
        }
      ]
    },
    {
      id: 'webhook-route-unit',
      title: 'Юнит: POST …/api/integrations/lava/webhook (route.run)',
      tests: [
        {
          id: 'lava-webhook-route',
          title: 'lavaWebhookInfoRoute + lavaWebhookRoute: GET-проба, 401, валидация тела, успех'
        }
      ]
    },
    {
      id: 'payment-link-live',
      title: 'POST payment-link (лайв: Heap + Lava, gcOrderId=test)',
      tests: [
        {
          id: 'payment-link-heap-settings-read',
          title: 'Чтение Heap: lava_api_key (маска), base_url, product_id, offer_id'
        },
        {
          id: 'payment-link-full-route-run',
          title: 'Интеграция: route.run без dry-run (сброс контрактов test → Lava)'
        },
        {
          id: 'payment-link-full-http-integration',
          title: 'Интеграция: HTTP POST без dry-run (сброс контрактов test → Lava)'
        },
        {
          id: 'webhook-live-test-arm',
          title:
            'POST webhook-live-test-arm — вооружить проверку webhook (ожидаемый lava_contract_id)'
        },
        {
          id: 'webhook-live-test-status',
          title: 'GET webhook-live-test-status — URL эндпоинта webhook и состояние лайв-проверки'
        }
      ]
    }
  ]

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Переменные categories`,
    payload: { categoriesCount: categories.length, categoryIds: categories.map((c) => c.id) }
  })
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] Каталог отдан`,
    payload: { categoriesCount: categories.length }
  })
  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Возврат success`,
    payload: { categoriesCount: categories.length }
  })
  return { success: true, categories }
})
