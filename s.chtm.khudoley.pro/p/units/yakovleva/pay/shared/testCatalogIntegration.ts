// @shared
/**
 * Каталог интеграционных и HTTP-тестов Payments Client (синхронизирован с api/tests/integration и lib/tests/integration*).
 * Подмодуль shared/testCatalog (см. shared/testCatalog.ts).
 */

import type { TestCatalogBlock } from './testCatalog'

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
    id: 'int-date-filter',
    title: 'Фильтр панели (Heap)',
    description: 'getPanelDateFilter roundtrip, валидация setSetting, границы выборок репозиториев',
    tests: [
      { id: 'df_getPanelDateFilter_roundtrip', title: 'getPanelDateFilter: save → read → reset' },
      {
        id: 'df_setSetting_invalid_throws',
        title: 'setSetting PANEL_DATE_FILTER: невалидное → throw'
      },
      { id: 'df_requestlog_range_bounds', title: 'requestLog: countInRange/findInRange границы' },
      {
        id: 'df_webhooklog_range_bounds',
        title: 'webhookLog: countInRange/findInRange/byOrder границы'
      }
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
  },
  {
    id: 'int-access',
    title: 'Внутренняя авторизация (ADR 0003)',
    description: 'Гранты, инвайты, потребление (Heap)',
    tests: [
      { id: 'access_require_admin_passes', title: 'requireInternalAccess(admin) не бросает' },
      { id: 'access_repo_grant_lifecycle', title: 'panelAccess: upsert/active/revoke' },
      { id: 'access_invite_generate_token_min_32', title: 'generateInvite: токен ≥ 32' },
      { id: 'access_invite_get_does_not_consume', title: 'getInviteByToken не расходует' },
      { id: 'access_invite_consume_expired', title: 'consumeInvite: expired' },
      { id: 'access_invite_consume_revoked', title: 'consumeInvite: revoked' },
      { id: 'access_invite_consume_flow', title: 'consumeInvite: ok → grant; повтор → used' },
      { id: 'access_invite_already_has_access', title: 'consumeInvite: already_has_access' }
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
    { id: 'web-panel', title: 'GET /web/panel' }
  ]
}
