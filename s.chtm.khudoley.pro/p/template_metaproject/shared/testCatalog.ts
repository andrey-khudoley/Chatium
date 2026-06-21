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
    id: 'unit-routes',
    title: 'config/routes',
    description: 'getFullUrl, withProjectRoot, ROUTES/ROUTE_PATHS',
    tests: [
      { id: 'routes_getFullUrl_dot_slash', title: 'getFullUrl("./")' },
      { id: 'routes_getFullUrl_slash', title: 'getFullUrl("/")' },
      { id: 'routes_getFullUrl_web_admin_rel', title: 'getFullUrl("./web/admin")' },
      { id: 'routes_getFullUrl_web_admin_abs', title: 'getFullUrl("/web/admin")' },
      { id: 'routes_getFullUrl_web_admin_bare', title: 'getFullUrl("web/admin")' },
      { id: 'routes_getFullUrl_empty', title: 'getFullUrl("")' },
      { id: 'routes_withProjectRoot_rel', title: 'withProjectRoot("./web/admin")' },
      { id: 'routes_withProjectRoot_bare', title: 'withProjectRoot("web/admin")' },
      { id: 'routes_withProjectRoot_dot', title: 'withProjectRoot("./")' },
      { id: 'routes_withProjectRoot_empty', title: 'withProjectRoot("")' },
      { id: 'routes_subroute_omit', title: 'withProjectRootAndSubroute без subroute' },
      { id: 'routes_subroute_slash', title: 'subroute = "/"' },
      { id: 'routes_subroute_edit', title: 'subroute = "edit"' },
      { id: 'routes_subroute_slash_edit', title: 'subroute = "/edit"' },
      { id: 'routes_subroute_nested', title: 'subroute = "users/123"' },
      { id: 'routes_PROJECT_ROOT', title: 'PROJECT_ROOT' },
      { id: 'routes_ROUTES_KEYS_match_PATHS', title: 'ключи ROUTES / ROUTE_PATHS' },
      { id: 'routes_no_domain_in_urls', title: 'ссылки без домена' },
      { id: 'routes_internal_start_with_dot', title: 'внутренние роуты с ./' }
    ]
  },
  {
    id: 'unit-project',
    title: 'config/project',
    description: 'Заголовки и константы страниц',
    tests: [
      { id: 'project_getPageTitle_basic', title: 'getPageTitle обычные строки' },
      { id: 'project_getPageTitle_empty_page', title: 'getPageTitle пустой pageName' },
      { id: 'project_getPageTitle_empty_project', title: 'getPageTitle пустой projectName' },
      { id: 'project_getPageTitle_unicode', title: 'getPageTitle кириллица / спецсимволы' },
      { id: 'project_getHeaderText_basic', title: 'getHeaderText базовый' },
      { id: 'project_getHeaderText_empty', title: 'getHeaderText пустые значения' },
      { id: 'project_getHeaderText_special', title: 'getHeaderText спецсимволы' },
      { id: 'project_constants_non_empty', title: 'константы project не пустые' },
      { id: 'project_page_names_distinct', title: 'имена страниц различаются' }
    ]
  },
  {
    id: 'unit-log-level',
    title: 'shared/logLevel',
    description: 'Скрипт window.__BOOT__.logLevel',
    tests: [
      { id: 'logLevel_script_Debug', title: 'getLogLevelScript(Debug)' },
      { id: 'logLevel_script_Info', title: 'getLogLevelScript(Info)' },
      { id: 'logLevel_script_Warn', title: 'getLogLevelScript(Warn)' },
      { id: 'logLevel_script_Error', title: 'getLogLevelScript(Error)' },
      { id: 'logLevel_script_Disable', title: 'getLogLevelScript(Disable)' },
      { id: 'logLevel_script_preserves_boot', title: 'скрипт не затирает __BOOT__' }
    ]
  },
  {
    id: 'unit-logger-lib',
    title: 'lib/logger.lib (pure)',
    description: 'shouldLogByLevel, getAdminLogsSocketId',
    tests: [
      { id: 'loggerLib_getAdminLogsSocketId_format', title: 'префикс admin-logs-' },
      { id: 'loggerLib_getAdminLogsSocketId_stable', title: 'стабильность между вызовами' },
      { id: 'loggerLib_shouldLogByLevel_matrix', title: 'полная матрица shouldLogByLevel' }
    ]
  },
  {
    id: 'unit-shared-logger',
    title: 'shared/logger',
    description: 'shouldLog, setLogSink, createComponentLogger',
    tests: [
      { id: 'shared_shouldLog_Disable_all', title: 'Disable: severity 0..7 → false' },
      { id: 'shared_shouldLog_Error', title: 'Error: матрица' },
      { id: 'shared_shouldLog_Warn', title: 'Warn: матрица' },
      { id: 'shared_shouldLog_Info', title: 'Info: матрица' },
      { id: 'shared_shouldLog_Debug', title: 'Debug: матрица' },
      { id: 'shared_shouldLog_no_window', title: 'без window → Info' },
      { id: 'shared_shouldLog_invalid_numeric', title: 'logLevel -1 → Disable' },
      { id: 'shared_shouldLog_invalid_string', title: 'мусор в logLevel → Info' },
      { id: 'shared_setLogSink_roundtrip', title: 'setLogSink / сброс' },
      { id: 'shared_setLogSink_throw_keeps_console', title: 'ошибка sink не ломает console' },
      { id: 'shared_componentLogger_prefix', title: 'createComponentLogger [Name]' },
      { id: 'shared_logWarn_alias', title: 'logWarn = logWarning' }
    ]
  },
  {
    id: 'unit-catalog',
    title: 'Каталог тестов',
    description: 'Целостность shared/testCatalog и совпадение с прогоном',
    tests: [
      { id: 'catalog_block_ids_unique', title: 'id блоков уникальны' },
      { id: 'catalog_test_ids_unique', title: 'id тестов уникальны' },
      { id: 'catalog_blocks_have_tests', title: 'в блоке есть тесты' },
      { id: 'catalog_flatten_order', title: 'flattenCatalogBlocks порядок' },
      { id: 'catalog_unit_ids_match_runner', title: 'UNIT_TEST_BLOCKS содержит все id прогона' }
    ]
  }
]

export const INTEGRATION_SERVER_TEST_BLOCKS: TestCatalogBlock[] = [
  {
    id: 'int-settings-lib',
    title: 'settings.lib',
    description: 'Чтение и запись настроек (Heap)',
    tests: [
      { id: 'settings_get_project_name', title: 'getSettingString(PROJECT_NAME)' },
      { id: 'settings_get_log_level', title: 'getLogLevel — допустимое значение' },
      { id: 'settings_getSetting_branches', title: 'getSetting: heap / null / default' },
      { id: 'settings_getLogsLimit_parse', title: 'getLogsLimit парсинг' },
      { id: 'settings_getLogWebhook', title: 'getLogWebhook объекты и дефолт' },
      { id: 'settings_getDashboardResetAt', title: 'getDashboardResetAt нормализация' },
      { id: 'settings_getAllSettings', title: 'getAllSettings defaults + heap' },
      { id: 'settings_setSetting_log_level', title: 'setSetting LOG_LEVEL ветки' },
      { id: 'settings_setSetting_logs_limit', title: 'setSetting LOGS_LIMIT ветки' },
      { id: 'settings_setSetting_project_fields', title: 'setSetting PROJECT_NAME/TITLE' },
      { id: 'settings_setSetting_webhook', title: 'setSetting LOG_WEBHOOK' },
      { id: 'settings_setSetting_dashboard_reset', title: 'setSetting DASHBOARD_RESET_AT' },
      { id: 'settings_setSetting_unknown_key', title: 'setSetting неизвестный ключ' },
      {
        id: 'regression_getLogLevel_no_recursion',
        title: 'регрессия: getLogLevel без stack overflow'
      },
      {
        id: 'regression_getSetting_no_recursion',
        title: 'регрессия: getSetting без stack overflow'
      }
    ]
  },
  {
    id: 'int-settings-repo',
    title: 'settings.repo',
    description: 'Доступ к таблице настроек',
    tests: [
      { id: 'settings_repo_findAll', title: 'findAll → массив' },
      { id: 'settings_repo_findByKey', title: 'findByKey(project_name)' },
      { id: 'settings_repo_upsert_create_update', title: 'upsert create/update' },
      { id: 'settings_repo_deleteByKey', title: 'deleteByKey' }
    ]
  },
  {
    id: 'int-logs-repo',
    title: 'logs.repo',
    description: 'Чтение и запись логов',
    tests: [
      { id: 'logs_repo_findAll', title: 'findAll(limit) → массив' },
      { id: 'logs_repo_create_and_read', title: 'create → findById' },
      { id: 'logs_repo_findBeforeTimestamp_where', title: 'findBeforeTimestamp через where' },
      { id: 'logs_repo_count_severities', title: 'countErrors/Warnings/BySeverity' },
      { id: 'regression_logs_create_no_recursion', title: 'регрессия: create без рекурсии логов' }
    ]
  },
  {
    id: 'int-logger-lib-ctx',
    title: 'logger.lib (ctx)',
    description: 'writeServerLog, сокет, вебхук',
    tests: [
      { id: 'logger_admin_socket', title: 'getAdminLogsSocketId(ctx)' },
      { id: 'logger_writeServerLog_filter', title: 'фильтрация по уровню' },
      { id: 'logger_writeServerLog_socket', title: 'идентификатор сокета логов' },
      { id: 'logger_writeServerLog_webhook_url', title: 'getLogWebhook url' },
      { id: 'regression_payload_not_object_object', title: 'регрессия: payload не [object Object]' }
    ]
  },
  {
    id: 'int-dashboard',
    title: 'dashboard.lib',
    description: 'Счётчики дашборда админки',
    tests: [
      { id: 'dashboard_get_counts', title: 'getDashboardCounts' },
      { id: 'dashboard_reset', title: 'resetDashboard + setSetting' },
      { id: 'dashboard_flow_logs', title: 'сценарий: логи → counts → reset' }
    ]
  },
  {
    id: 'int-api-contract',
    title: 'API (route.run)',
    description: 'Контракты эндпоинтов с текущим ctx',
    tests: [
      { id: 'api_settings_list', title: 'GET settings/list' },
      { id: 'api_settings_get', title: 'GET settings/get?key=' },
      { id: 'api_settings_save_validation', title: 'POST settings/save валидация' },
      { id: 'api_logger_log', title: 'POST logger/log' },
      { id: 'api_admin_logs_recent', title: 'GET admin/logs/recent' },
      { id: 'api_admin_logs_before', title: 'GET admin/logs/before' },
      { id: 'api_admin_dashboard_counts', title: 'GET admin/dashboard/counts' },
      { id: 'api_tests_list_shape', title: 'GET tests/list структура' },
      { id: 'api_tests_unit_shape', title: 'GET tests/unit shape' },
      { id: 'api_tests_integration_shape', title: 'GET tests/integration shape' }
    ]
  },
  {
    id: 'int-e2e',
    title: 'Сквозные сценарии',
    description: 'Настройки, логи, дашборд, пагинация',
    tests: [
      { id: 'e2e_settings_name_roundtrip', title: 'project_name save → get → list' },
      { id: 'e2e_log_level_filters_storage', title: 'log_level Error фильтрует запись в Heap' },
      { id: 'e2e_logs_pagination', title: 'recent + before пагинация' },
      { id: 'e2e_dashboard_reset_flow', title: 'counts → reset → counts' },
      { id: 'e2e_log_payload_roundtrip', title: 'payload объект → Heap → recent' }
    ]
  }
]

export const INTEGRATION_HTTP_TEST_BLOCK: TestCatalogBlock = {
  id: 'int-http-pages',
  title: 'HTTP GET страниц',
  description: 'Статус 200 и фрагменты SSR',
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
