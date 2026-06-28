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
  },
  {
    id: 'unit-themes',
    title: 'Темы оформления',
    description: 'config/themes — каталог тем (getTheme, segFills)',
    tests: [
      { id: 'themes_count_at_least_6', title: 'не менее 6 тем' },
      { id: 'themes_ids_unique', title: 'id тем уникальны' },
      { id: 'themes_getTheme_known', title: 'getTheme(known) → объект темы' },
      { id: 'themes_getTheme_fallback', title: 'getTheme(unknown) → дефолт' },
      { id: 'themes_all_have_segfills', title: 'у всех тем непустые segFills/segTexts' }
    ]
  },
  {
    id: 'unit-wheel-email',
    title: 'Email-хелперы колеса',
    description: 'wheel.lib normalizeEmail / isValidEmail (чистые функции)',
    tests: [
      { id: 'wheel_normalizeEmail_trim_lowercase', title: 'normalizeEmail trim + lowercase' },
      { id: 'wheel_normalizeEmail_idempotent', title: 'normalizeEmail идемпотентен' },
      { id: 'wheel_isValidEmail_valid', title: 'isValidEmail валидный' },
      { id: 'wheel_isValidEmail_no_at', title: 'isValidEmail без @' },
      { id: 'wheel_isValidEmail_no_domain', title: 'isValidEmail без домена' },
      { id: 'wheel_isValidEmail_spaces', title: 'isValidEmail с пробелами' },
      { id: 'wheel_isValidEmail_empty', title: 'isValidEmail пустой' },
      { id: 'wheel_maskEmail_basic', title: 'maskEmail tester@khudoley.pro → te***@***ey.pro' },
      { id: 'wheel_maskEmail_short_local', title: 'maskEmail короткий local' },
      { id: 'wheel_maskEmail_no_dot_domain', title: 'maskEmail домен без точки' },
      { id: 'wheel_maskEmail_no_at', title: 'maskEmail без @ → ***' }
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
      { id: 'api_wheel_winners', title: 'GET wheel/winners (маскировка, hasMore)' },
      { id: 'api_admin_wheel_reset', title: 'POST admin/wheel/reset (Admin)' },
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
  },
  {
    id: 'int-segments-repo',
    title: 'segments.repo',
    description: 'CRUD сегментов колеса (Heap)',
    tests: [
      { id: 'segments_repo_create_findById', title: 'create → findById' },
      {
        id: 'segments_repo_findAllEnabled_filter_sort',
        title: 'findAllEnabled: enabled + order asc'
      },
      { id: 'segments_repo_findAll_includes_disabled', title: 'findAll включает disabled' },
      { id: 'segments_repo_update', title: 'update полей сегмента' },
      { id: 'segments_repo_updateOrder', title: 'updateOrder' },
      { id: 'segments_repo_deleteById', title: 'deleteById' },
      { id: 'segments_delete_blocked_by_spins', title: 'delete с победами → success:false' }
    ]
  },
  {
    id: 'int-spins-repo',
    title: 'spins.repo',
    description: 'История вращений (Heap)',
    tests: [
      { id: 'spins_repo_create_countByEmail', title: 'create → countByEmail' },
      { id: 'spins_repo_countByEmail_normalized', title: 'countByEmail по email' },
      { id: 'spins_repo_countBySegment', title: 'countBySegment по RefLink' },
      {
        id: 'spins_repo_findRecent_order_limit',
        title: 'findRecent: timestamp desc + limit/offset'
      },
      { id: 'spins_repo_deleteAll', title: 'deleteAll → 0 записей' }
    ]
  },
  {
    id: 'int-spinGrants-repo',
    title: 'spinGrants.repo',
    description: 'Доначисленные попытки (Heap)',
    tests: [
      { id: 'spinGrants_repo_create_sumByEmail', title: 'create → sumByEmail' },
      { id: 'spinGrants_repo_sumByEmail_empty_zero', title: 'sumByEmail без записей → 0' },
      { id: 'spinGrants_repo_deleteAll', title: 'deleteAll → 0 записей' }
    ]
  },
  {
    id: 'int-wheel-lib',
    title: 'wheel.lib',
    description: 'Загрузка сегментов, выбор, лимит',
    tests: [
      { id: 'wheel_loadEffectiveSegments_range_low', title: 'N<2 → error' },
      { id: 'wheel_loadEffectiveSegments_range_high', title: 'N>8 → error' },
      { id: 'wheel_loadEffectiveSegments_even', title: 'чётное N → nEff=N' },
      { id: 'wheel_loadEffectiveSegments_odd_autoretry', title: 'нечётное N → авто-retry' },
      { id: 'wheel_selectTarget_weighted', title: 'взвешенный выбор' },
      { id: 'wheel_selectTarget_maxWins_excluded', title: 'maxWins исчерпан → исключён' },
      { id: 'wheel_selectTarget_all_exhausted', title: 'Σweight=0 → error' },
      { id: 'wheel_checkSpinLimit_base', title: 'лимит без грантов' },
      { id: 'wheel_checkSpinLimit_with_grants', title: 'лимит + гранты' }
    ]
  },
  {
    id: 'int-settings-wheel',
    title: 'settings.lib (колесо)',
    description: 'Новые настройки колеса и gating',
    tests: [
      { id: 'settings_wheel_enabled_default_set', title: 'wheel_enabled default/set' },
      { id: 'settings_wheel_max_spins_validation', title: 'wheel_max_spins положительный' },
      { id: 'settings_theme_validation', title: 'theme — из THEMES' },
      { id: 'settings_gateway_base_url_normalize', title: 'gateway_base_url префикс/срез' },
      { id: 'settings_gc_school_host_strip', title: 'gc_school_host срез схемы/пути' },
      { id: 'settings_gc_api_key_masked', title: 'gc_school_api_key маскируется' },
      { id: 'settings_required_group_ids_dedup', title: 'required_group_ids дедуп' },
      { id: 'settings_getGetcourseGating_user_implied', title: 'requireGroup влечёт requireUser' },
      { id: 'settings_require_group_needs_ids', title: 'require_group=true требует группы' }
    ]
  },
  {
    id: 'int-getcourse-lib',
    title: 'getcourse.lib (мок gateway)',
    description: 'Проверки доступа и createDeal через _setRequestFn',
    tests: [
      { id: 'gc_passesGcUserCheck_allowed', title: 'пользователь найден → allowed' },
      { id: 'gc_passesGcUserCheck_not_found', title: 'не найден → !allowed' },
      { id: 'gc_passesGcUserCheck_transient_failclosed', title: 'сбой → transient fail-closed' },
      { id: 'gc_passesGcGroupCheck_intersection', title: 'пересечение групп → allowed' },
      { id: 'gc_passesGcGroupCheck_empty', title: 'нет пересечения → !allowed' },
      { id: 'gc_passesGcGroupCheck_transient', title: 'сбой групп → transient' },
      { id: 'gc_createDeal_ok', title: 'createDeal успех' },
      { id: 'gc_createDeal_invalid_offerId', title: 'createDeal нечисловой offerId' },
      { id: 'gc_envelope_invalid_json', title: 'невалидный JSON gateway' },
      { id: 'gc_settings_missing', title: 'пустые настройки → SETTINGS_MISSING' }
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
    { id: 'web-tests', title: 'GET /web/tests' },
    { id: 'web-winners', title: 'GET /web/winners' }
  ]
}

export function flattenCatalogBlocks(blocks: TestCatalogBlock[]): TestCatalogEntry[] {
  return blocks.flatMap((b) => b.tests)
}
