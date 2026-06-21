// @shared
/**
 * Каталог юнит-тестов Payments Client (синхронизирован с api/tests/unit и lib/tests/*UnitSuite).
 * Подмодуль shared/testCatalog (см. shared/testCatalog.ts).
 */

import type { TestCatalogBlock } from './testCatalog'

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
    title: 'lib/logLevel',
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
    id: 'unit-lifepay',
    title: 'LifePay client panel',
    description: 'Каталог операций, сборка URL invoke, маскировка args, парсинг webhook, токен',
    tests: [
      { id: 'lp_catalog_three_ops', title: 'каталог: createBill/getBillStatus/cancelBill' },
      { id: 'lp_catalog_methods', title: 'каталог: HTTP-методы операций' },
      { id: 'lp_catalog_findOperation', title: 'findOperationInCatalog' },
      { id: 'lp_invoke_url_build_post', title: 'invoke URL: POST createBill' },
      { id: 'lp_invoke_url_build_get', title: 'invoke URL: GET getBillStatus' },
      { id: 'lp_invoke_url_trailing_slash', title: 'invoke URL: trailing slash' },
      { id: 'lp_invoke_unknown_op', title: 'invoke URL: op_unknown' },
      { id: 'lp_invoke_empty_base_url', title: 'invoke URL: base_url_invalid' },
      { id: 'lp_redact_email', title: 'redactEmail' },
      { id: 'lp_redact_email_no_at', title: 'redactEmail без @' },
      { id: 'lp_redact_phone', title: 'redactPhone' },
      { id: 'lp_redact_phone_short', title: 'redactPhone короткий' },
      { id: 'lp_invoke_redact_email_in_args', title: 'argsRedacted: email маскируется' },
      { id: 'lp_invoke_redact_phone_in_args', title: 'argsRedacted: phone маскируется' },
      {
        id: 'lp_invoke_no_secrets_in_args_redacted',
        title: 'argsRedacted: без apikey/login/token'
      },
      { id: 'lp_extract_order_number', title: 'extractOrderNumber' },
      { id: 'lp_login_valid', title: 'isValidLpLogin: ok' },
      { id: 'lp_login_invalid_wrong_first', title: 'isValidLpLogin: не 7 первая' },
      { id: 'lp_login_invalid_length', title: 'isValidLpLogin: длина' },
      { id: 'lp_gateway_base_url_normalize', title: 'normalizeGatewayBaseUrl' },
      { id: 'lp_gateway_base_url_valid', title: 'isValidGatewayBaseUrl' },
      { id: 'gc_gateway_base_url_rewrites_legacy_paths', title: 'gateway URL: GC legacy roots' },
      {
        id: 'gateway_base_url_rewrites_all_legacy_paths',
        title: 'gateway URL: все legacy roots'
      },
      {
        id: 'gateway_base_url_external_override_preserved',
        title: 'gateway URL: внешний override'
      },
      {
        id: 'gateway_base_url_empty_resolves_to_workspace_gateway',
        title: 'gateway URL: auto текущего workspace'
      },
      {
        id: 'lavatop_direct_api_host_resolves_to_auto_mode',
        title: 'Lava.Top direct host -> auto'
      },
      { id: 'lp_generate_webhook_token_min_length', title: 'generateWebhookToken: длина' },
      { id: 'lp_generate_webhook_token_hex', title: 'generateWebhookToken: hex' },
      { id: 'lp_webhook_parse_basic', title: 'parseWebhookBody основные поля' },
      {
        id: 'lp_webhook_extract_order_number_nested',
        title: 'parseWebhookBody вложенный order.number'
      },
      { id: 'lp_webhook_email_raw', title: 'parseWebhookBody возвращает сырой email' },
      { id: 'lp_webhook_email_from_customer', title: 'parseWebhookBody email из customer.email' },
      { id: 'lp_webhook_no_body', title: 'parseWebhookBody пустое body' },
      { id: 'lp_webhook_unwrap_object', title: 'unwrapWebhookBody: чистый объект' },
      { id: 'lp_webhook_unwrap_json_string', title: 'unwrapWebhookBody: JSON-строка' },
      { id: 'lp_webhook_unwrap_form_data_field', title: 'unwrapWebhookBody: {data:"<json>"}' },
      { id: 'lp_webhook_unwrap_object_data_field', title: 'unwrapWebhookBody: {data:{<obj>}}' },
      {
        id: 'lp_webhook_unwrap_json_string_data_object',
        title: 'unwrapWebhookBody: \'{"data":{...}}\''
      },
      {
        id: 'lp_webhook_unwrap_form_urlencoded_string',
        title: 'unwrapWebhookBody: form-urlencoded строка'
      },
      {
        id: 'lp_webhook_unwrap_form_urlencoded_data_json',
        title: 'unwrapWebhookBody: data=<urlencoded-json>'
      },
      { id: 'lp_webhook_unwrap_null', title: 'unwrapWebhookBody: null' },
      {
        id: 'lp_webhook_raw_multipart_extract',
        title: 'extractDataFromRawMultipart: поле data из сырого multipart'
      },
      { id: 'lp_webhook_success_condition', title: 'isSuccessfulPayment: только payment+success' },
      { id: 'lp_webhook_formdata_string', title: 'readWebhookDataField: текстовое поле data' },
      { id: 'lp_webhook_formdata_file', title: 'readWebhookDataField: File-подобное поле .text()' },
      { id: 'lp_webhook_formdata_absent', title: 'readWebhookDataField: нет поля / нет form' },
      { id: 'lp_webhook_token_not_configured', title: 'checkWebhookToken: not_configured' },
      { id: 'lp_webhook_token_missing', title: 'checkWebhookToken: missing' },
      { id: 'lp_webhook_token_mismatch_403', title: 'checkWebhookToken: mismatch' },
      { id: 'lp_webhook_token_valid', title: 'checkWebhookToken: valid' },
      { id: 'lp_redactraw_secrets_top', title: 'redactRawDeep: удаление секретов верхнего уровня' },
      { id: 'lp_redactraw_secrets_nested', title: 'redactRawDeep: удаление секретов в вложенных' },
      { id: 'lp_redactraw_email_nested', title: 'redactRawDeep: маска email в customer.email' },
      { id: 'lp_redactraw_pii_other', title: 'redactRawDeep: маска passport/inn/fio/address' },
      { id: 'lp_redactraw_truncation', title: 'redactRawDeep: усечение > 64KB' },
      { id: 'lp_redactraw_non_serializable', title: 'redactRawDeep: function → __nonSerializable' },
      { id: 'lp_redactraw_circular', title: 'redactRawDeep: цикл → __circular' },
      { id: 'lp_redactraw_array_root', title: 'redactRawDeep: массив-корень' },
      { id: 'lp_redactraw_primitive_root', title: 'redactRawDeep: примитивы как есть' }
    ]
  },
  {
    id: 'unit-correlation',
    title: 'Связка webhook по correlationId',
    description:
      'shared/correlation — генерация, сборка callbackUrl, извлечение, дедупликация (без Heap)',
    tests: [
      {
        id: 'lp_correlation_generate_nonempty',
        title: 'generateCorrelationId: непустые уникальные строки'
      },
      { id: 'lp_correlation_append_valid', title: 'appendCorrelationId: добавляет в валидный URL' },
      {
        id: 'lp_correlation_append_preserves_token',
        title: 'appendCorrelationId: сохраняет token'
      },
      {
        id: 'lp_correlation_append_invalid',
        title: 'appendCorrelationId: невалидный URL → оригинал'
      },
      { id: 'lp_correlation_extract_present', title: 'extractCorrelationId: значение из объекта' },
      { id: 'lp_correlation_extract_absent', title: 'extractCorrelationId: "" при отсутствии' },
      { id: 'lp_correlation_merge_dedup', title: 'mergeWebhooksById: дедуп по id + сортировка' }
    ]
  },
  {
    id: 'unit-date-filter',
    title: 'Фильтр панели по дате/времени',
    description: 'isValidDateFilter, normalizeDateFilter — чистая валидация без Heap',
    tests: [
      { id: 'df_isvalid_empty', title: 'isValidDateFilter({}) → true' },
      { id: 'df_isvalid_only_from', title: 'isValidDateFilter({from})' },
      { id: 'df_isvalid_only_to', title: 'isValidDateFilter({to})' },
      { id: 'df_isvalid_both_ok', title: 'isValidDateFilter(from<to)' },
      { id: 'df_isvalid_both_equal', title: 'isValidDateFilter(from===to)' },
      { id: 'df_isvalid_from_gt_to', title: 'isValidDateFilter(from>to) → false' },
      { id: 'df_isvalid_string_bound', title: 'isValidDateFilter строковая граница → false' },
      { id: 'df_isvalid_zero', title: 'isValidDateFilter({from:0}) → false' },
      { id: 'df_isvalid_negative', title: 'isValidDateFilter отрицательная → false' },
      { id: 'df_isvalid_nan', title: 'isValidDateFilter NaN → false' },
      { id: 'df_isvalid_non_object', title: 'isValidDateFilter не-объект → false' },
      { id: 'df_norm_floor', title: 'normalizeDateFilter floor границ' },
      { id: 'df_norm_only_from', title: 'normalizeDateFilter только from' },
      { id: 'df_norm_drop_invalid', title: 'normalizeDateFilter отбрасывает невалидное' },
      { id: 'df_norm_empty_on_from_gt_to', title: 'normalizeDateFilter from>to → {}' },
      { id: 'df_norm_non_object', title: 'normalizeDateFilter не-объект → {}' },
      { id: 'df_norm_empty_input', title: 'normalizeDateFilter({}) → {}' }
    ]
  },
  {
    id: 'unit-access',
    title: 'Внутренняя авторизация (ADR 0003)',
    description: 'classifyInvite, decideInternalAccess — чистая логика без Heap',
    tests: [
      { id: 'access_classify_unknown', title: 'classifyInvite: null → unknown' },
      { id: 'access_classify_used', title: 'classifyInvite: usedAt → used' },
      { id: 'access_classify_revoked', title: 'classifyInvite: revokedAt → revoked' },
      { id: 'access_classify_expired', title: 'classifyInvite: истёк → expired' },
      { id: 'access_classify_valid', title: 'classifyInvite: свежий → valid' },
      { id: 'access_classify_used_precedence', title: 'classifyInvite: used приоритетнее' },
      { id: 'access_decide_admin', title: 'decideInternalAccess: admin → true' },
      { id: 'access_decide_grant', title: 'decideInternalAccess: grant → true' },
      { id: 'access_decide_none', title: 'decideInternalAccess: нет → false' }
    ]
  },
  {
    id: 'unit-plugin-manifests',
    title: 'Payment plugin manifests',
    description: 'manifest registry, setting key whitelist, write-only secret DTO',
    tests: [
      { id: 'plugin_manifests_validate', title: 'manifest registry validates' },
      { id: 'plugin_manifest_ids', title: 'lifepay/lavatop/getcourse ids' },
      { id: 'plugin_manifest_field_keys_unique', title: 'field keys unique' },
      { id: 'plugin_manifest_keys_known', title: 'keys exist in SETTING_KEYS' },
      { id: 'plugin_manifest_widget_keys_limited', title: 'widget_* keys explicitly limited' },
      { id: 'plugin_secret_public_value_write_only', title: 'secret DTO has no raw value' },
      { id: 'plugin_login_public_value_masked', title: 'lp_login masked' },
      { id: 'plugin_boolean_public_value', title: 'boolean DTO value' },
      { id: 'plugin_widget_method_enabled_fallback', title: 'widget toggle fallback enabled' },
      {
        id: 'plugin_widget_method_enabled_explicit_false',
        title: 'widget toggle explicit false'
      },
      {
        id: 'plugin_widget_method_enabled_requires_config',
        title: 'widget toggle requires config'
      },
      { id: 'plugin_save_unknown_plugin_rejected', title: 'unknown plugin rejected' },
      { id: 'plugin_save_unknown_key_rejected', title: 'unknown key rejected' },
      { id: 'plugin_save_object_value_rejected', title: 'object value rejected' },
      { id: 'plugin_reveal_non_secret_rejected', title: 'non-secret reveal rejected' }
    ]
  },
  {
    id: 'unit-lavatop',
    title: 'Lava.Top / многогейтвейная архитектура',
    description: 'Каталог Lava.Top, диспатч по gatewayId, валидация настроек',
    tests: [
      { id: 'lavatop_supported_gateways_list', title: 'SUPPORTED_GATEWAYS list' },
      { id: 'lavatop_isGatewayId_ok', title: 'isGatewayId' },
      { id: 'lavatop_proxy_codes_present', title: 'GATEWAY_REQUIRED / GATEWAY_UNKNOWN коды' },
      { id: 'lavatop_catalog_size', title: 'LAVATOP_OPERATIONS ≥ 4' },
      { id: 'lavatop_catalog_createInvoice', title: 'createInvoice (POST)' },
      { id: 'lavatop_catalog_getInvoiceStatus', title: 'getInvoiceStatus (GET)' },
      { id: 'lavatop_catalog_listProducts', title: 'listProducts (GET)' },
      { id: 'lavatop_catalog_updateOfferPrice', title: 'updateOfferPrice (POST)' },
      { id: 'lavatop_no_lifepay_ops', title: 'createBill отсутствует в Lava.Top' },
      { id: 'lifepay_no_lavatop_ops', title: 'createInvoice отсутствует в LifePay' },
      { id: 'gateway_catalog_total', title: 'FULL = LIFEPAY + LAVATOP' },
      { id: 'gc_static_catalog_empty', title: 'GC static catalog empty' },
      { id: 'lavatop_operations_by_gateway', title: 'OPERATIONS_BY_GATEWAY.lavatop' },
      { id: 'lavatop_any_gateway_lookup', title: 'findOperationInAnyGateway createInvoice' },
      { id: 'lifepay_any_gateway_lookup', title: 'findOperationInAnyGateway createBill' },
      { id: 'lavatop_header_X_Lava_Apikey', title: 'X-Lava-Apikey header' },
      { id: 'lifepay_headers_unchanged', title: 'X-Lp-* headers preserved' },
      { id: 'lavatop_base_url_validates_https', title: 'isValidLavaBaseUrl https' },
      { id: 'lavatop_base_url_rejects_empty', title: 'isValidLavaBaseUrl empty' },
      { id: 'lavatop_base_url_rejects_no_scheme', title: 'isValidLavaBaseUrl no scheme' },
      { id: 'lavatop_base_url_normalize_trailing_slash', title: 'normalizeLavaBaseUrl trailing' },
      { id: 'lavatop_webhook_secret_min_length', title: 'LAVA_WEBHOOK_SECRET_MIN_LENGTH ≥ 16' }
    ]
  }
]
