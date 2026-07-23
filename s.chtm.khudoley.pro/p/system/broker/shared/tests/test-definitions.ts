// @shared

/*
  Реестр персистентного набора тестов брокера (§9, ADR-0015) — единственный
  источник истины для web/tests, web/tests/ai и pages/tests/UnitTestsPage.vue.
  Шесть категорий (§9.3): database, api, functional, integration, concurrency, limits.
*/

export interface TestDefinition {
  name: string
  description: string
}

export interface TestCategory {
  name: string
  title: string
  tests: TestDefinition[]
}

export const TEST_CATEGORIES: TestCategory[] = [
  {
    name: 'database',
    title: 'База данных',
    tests: [
      { name: 'tables_exist', description: 'Все таблицы брокера существуют и доступны' },
      { name: 'schema_version_filter', description: 'Фильтр по schemaVersion работает (ADR-0003)' },
      {
        name: 'settings_kv_roundtrip',
        description: 'createOrUpdateBy/findOneBy на BrokerSettings (KV round-trip)'
      },
      {
        name: 'updateall_cas_semantics',
        description: 'Семантика updateAll-CAS: победитель — 1, проигравший — 0'
      }
    ]
  },
  {
    name: 'functional',
    title: 'Функциональные',
    tests: [
      {
        name: 'glob_validation',
        description: 'validatePatterns отклоняет частично-сегментные/**/пустые паттерны'
      },
      {
        name: 'glob_match_expand',
        description: 'expandAncestors/matchesGlob работают корректно (ADR-0008)'
      },
      {
        name: 'sha256_token_hash',
        description: 'hashModuleToken — детерминированный SHA-256 hex с доменным разделением'
      },
      {
        name: 'log_level_cutoff',
        description: 'shouldLog реализует таблицу отсечки по уровню (§5.10.4)'
      },
      {
        name: 'socket_payload_debug_only',
        description: 'buildSocketEvent кладёт payload только при log_level=Debug'
      },
      { name: 'fetch_limit_clamp', description: 'limit клэмпится снизу до 1' },
      {
        name: 'last_error_truncate',
        description: 'lastError обрезается до LAST_ERROR_MAX, вызов не отклоняется (О7)'
      },
      {
        name: 'readlogs_history',
        description:
          'readLogs возвращает запись собственной пробы с фильтром workspace_path (§9.5.2.5)'
      }
    ]
  },
  {
    name: 'api',
    title: 'API (internal + external)',
    tests: [
      {
        name: 'register_internal_active',
        description: 'internal-регистрация сразу даёт status=active'
      },
      {
        name: 'register_external_moderation',
        description: 'external HTTP-регистрация даёт status=onModeration'
      },
      {
        name: 'register_duplicate_refused',
        description: 'повторная регистрация занятого moduleKey отклоняется'
      },
      {
        name: 'register_reserved',
        description: 'moduleKey=broker и broker.* в publish отклоняются; в subscribe — проходит'
      },
      {
        name: 'auth_wrong_token_403',
        description: 'неверный токен даёт отказ (403 либо 500 c success:false)'
      },
      {
        name: 'update_types_internal_applied',
        description: 'internal-обновление publish/subscribe-types применяется сразу'
      },
      {
        name: 'update_types_external_pending',
        description: 'external-расширение уходит в pending, сужение — сразу'
      },
      {
        name: 'admin_disable_enable',
        description: 'admin disable/enable корректно гейтит и восстанавливает работу'
      },
      {
        name: 'source_not_overridable',
        description: 'внешний канал регистрации не подделывается полем source в теле'
      },
      {
        name: 'admin_status',
        description: 'admin_status-роут отдаёт счётчики, согласованные с прямыми countBy (§5.11)'
      },
      {
        name: 'admin_metrics',
        description:
          'admin_metrics-роут отражает фикстуру в eventsTotal/events24h/dead/activeModulesCount'
      },
      {
        name: 'admin_log_level',
        description:
          'переключение уровня через admin_log_level реально меняет отсечку (чтение после записи)'
      },
      {
        name: 'admin_role_gate',
        description:
          'все 7 admin-поверхностей (5 новых + disable/enable) отклоняют неаутентифицированный доступ'
      },
      {
        name: 'admin_logs_search',
        description:
          'admin_logs (список) находит собственную пробу по search, без payload/jsonStr в строках'
      },
      {
        name: 'admin_log_payload',
        description:
          'admin_log_payload раскрывает payload по точным ts/msg/kv; отсутствующая запись — found:false'
      }
    ]
  },
  {
    name: 'integration',
    title: 'Интеграционные',
    tests: [
      {
        name: 'happy_path',
        description:
          'сквозной happy-path §9.5.2: регистрация → публикация → fan-out → fetch → ack → delete'
      },
      {
        name: 'fanout_width',
        description: 'одно событие → доставка каждому подходящему подписчику, неподходящий — нет'
      },
      {
        name: 'drainer_recovery',
        description: 'незавершённое событие (dispatchedAt=null) материализуется следующим проходом'
      },
      {
        name: 'fanout_double',
        description: 'повторные проходы дренера идемпотентны по (eventId, subscriberModuleKey)'
      },
      {
        name: 'publish_dedup',
        description: 'повторная публикация с тем же idempotencyKey не создаёт второе событие'
      },
      {
        name: 'reclaim_expired',
        description: 'перезабор просроченной claimed-доставки: новая claimToken, claimCount+1'
      },
      {
        name: 'close_matrix',
        description:
          'матрица О6 (полная): pending→invalid_claim_token (ack и dead), повтор ack/dead→alreadyAcked/alreadyDead, перекрёстный ack/dead на закрытую строку→отказ'
      },
      {
        name: 'foreign_delivery',
        description: 'чужая и несуществующая доставка одинаково дают delivery_unavailable'
      },
      {
        name: 'status_gate',
        description: 'disabled блокирует pull-операции, enable восстанавливает работу'
      },
      {
        name: 'audit_events',
        description:
          'broker.* события пишутся в журнал и доставляются подписчику на broker.module.*'
      },
      {
        name: 'log_two_phase',
        description: 'двухфазный лог-тест: workspace_path и payload в json_str на рабочем уровне'
      },
      {
        name: 'no_log_recursion',
        description: 'getLogLevel не рекурсирует через writeServerLog (§5.10.9)'
      }
    ]
  },
  {
    name: 'concurrency',
    title: 'Конкурентность',
    tests: [
      {
        name: 'parallel_fetch_http',
        description: 'два параллельных HTTP fetch по pending-доставкам не пересекаются (О3)'
      },
      {
        name: 'parallel_publish_dedup',
        description:
          'два параллельных HTTP publish с одним idempotencyKey сходятся на одном событии'
      }
    ]
  },
  {
    name: 'limits',
    title: 'Лимиты',
    tests: [
      { name: 'payload_ceiling', description: 'потолок payload 8 КБ соблюдается' },
      { name: 'fetch_over_limit_ok', description: 'limit > потолка усекается, а не отклоняется' },
      {
        name: 'fetch_default_limit',
        description: 'без limit применяется дефолт FETCH_LIMIT_DEFAULT'
      },
      {
        name: 'cascade_order',
        description:
          'каскад удаляет доставки раньше строки модуля; повторная регистрация — с пустой очередью'
      },
      {
        name: 'deleteall_guard_semantics',
        description:
          'deleteAll: числовой limit меньше числа строк — падение без изменений; limit: null — удаление всех'
      }
    ]
  }
]
