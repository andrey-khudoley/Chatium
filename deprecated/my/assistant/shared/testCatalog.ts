// @shared
/**
 * Каталог тестов шаблонного минимума (синхронизирован с api/tests/unit, integration, HTTP-чеками).
 * Используется в TestsPage (список до запуска) и api/tests/list.
 */

export type TestCatalogEntry = { id: string; title: string }

export type TestCatalogBlock = {
  id: string
  title: string
  description?: string
  tests: TestCatalogEntry[]
}

export const UNIT_TEST_BLOCKS: TestCatalogBlock[] = [
  {
    id: 'unit-logger',
    title: 'logger.lib',
    description: 'Уровни логирования и идентификатор канала логов админки',
    tests: [
      { id: 'shouldLogByLevel_Info_6', title: 'shouldLogByLevel(Info, 6) === true' },
      { id: 'shouldLogByLevel_Disable_7', title: 'shouldLogByLevel(Disable, 7) === false' },
      { id: 'getAdminLogsSocketId_shape', title: 'getAdminLogsSocketId — префикс admin-logs-' }
    ]
  },
  {
    id: 'unit-routes',
    title: 'config/routes',
    description: 'Построение URL от корня проекта',
    tests: [
      { id: 'getFullUrl_root', title: 'getFullUrl("./") содержит PROJECT_ROOT' },
      { id: 'getFullUrl_admin', title: 'getFullUrl("./web/admin") содержит /web/admin' }
    ]
  },
  {
    id: 'unit-project',
    title: 'config/project',
    description: 'Заголовки страниц',
    tests: [{ id: 'getPageTitle', title: 'getPageTitle не пустой' }]
  },
  {
    id: 'unit-log-level',
    title: 'shared/logLevel',
    description: 'Скрипт уровня логирования для клиента',
    tests: [{ id: 'getLogLevelScript', title: 'getLogLevelScript(Debug) содержит Debug' }]
  }
]

export const INTEGRATION_SERVER_TEST_BLOCKS: TestCatalogBlock[] = [
  {
    id: 'int-settings-lib',
    title: 'settings.lib',
    description: 'Чтение настроек из Heap',
    tests: [
      { id: 'settings_get_project_name', title: 'getSettingString(PROJECT_NAME)' },
      { id: 'settings_get_log_level', title: 'getLogLevel — допустимое значение' }
    ]
  },
  {
    id: 'int-settings-repo',
    title: 'settings.repo',
    description: 'Доступ к таблице настроек',
    tests: [
      { id: 'settings_repo_findAll', title: 'findAll → массив' },
      { id: 'settings_repo_findByKey', title: 'findByKey(project_name) без исключения' }
    ]
  },
  {
    id: 'int-logs-repo',
    title: 'logs.repo',
    description: 'Чтение логов',
    tests: [{ id: 'logs_repo_findAll', title: 'findAll(limit) → массив' }]
  },
  {
    id: 'int-dashboard',
    title: 'dashboard.lib',
    description: 'Счётчики дашборда админки',
    tests: [{ id: 'dashboard_get_counts', title: 'getDashboardCounts — числа error/warn/resetAt' }]
  },
  {
    id: 'int-logger-ctx',
    title: 'logger.lib (ctx)',
    description: 'Сокет логов с реальным контекстом',
    tests: [{ id: 'logger_admin_socket', title: 'getAdminLogsSocketId(ctx) — непустая строка' }]
  }
]

export const INTEGRATION_HTTP_TEST_BLOCK: TestCatalogBlock = {
  id: 'int-http-pages',
  title: 'HTTP GET страниц',
  description: 'Ожидается ответ 200 (шаблонные маршруты)',
  tests: [
    { id: 'index', title: 'GET /' },
    { id: 'web-admin', title: 'GET /web/admin' },
    { id: 'web-profile', title: 'GET /web/profile' },
    { id: 'web-login', title: 'GET /web/login' },
    { id: 'web-tests', title: 'GET /web/tests' }
  ]
}

export function flattenCatalogBlocks(blocks: TestCatalogBlock[]): TestCatalogEntry[] {
  return blocks.flatMap((b) => b.tests)
}
