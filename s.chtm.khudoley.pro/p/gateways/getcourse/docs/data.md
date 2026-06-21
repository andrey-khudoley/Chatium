# Data

Настройки проекта хранятся в Heap (key-value). См. [ADR-0002](ADR/0002-settings-heap-and-layered-api.md).

## Heap таблицы

| Table                            | File                               | Назначение                                            | Основные поля                                                                                                              |
| -------------------------------- | ---------------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| t**saas-gw-gc**setting\_\_W3r8Ys | tables/settings.table.ts           | Настройки проекта (key-value)                         | key (string), value (any)                                                                                                  |
| t**saas-gw-gc**log\_\_K7n2Tp     | tables/logs.table.ts               | Серверные логи (долгосрочное хранение)                | message (string), payload (any), severity, level, timestamp                                                                |
| t**saas-gw-gc**paccess\_\_GDgDvk | tables/panelAccess.table.ts        | Выданные доступы к панели (не Admin)                  | userId (searchable), grantedAt, grantedBy                                                                                  |
| t**saas-gw-gc**pinvite\_\_U7FaXD | tables/panelInvites.table.ts       | Пригласительные токены для выдачи доступа             | token (searchable), issuedAt, expiresAt, consumedAt, consumedByUserId, revokedAt, createdBy                                |
| t**saas-gw-gc**greq\_\_Gr9Qm2    | tables/gatewayRequestLog.table.ts  | Входящие запросы `/v1/{op}` — raw-журнал (PII-маска)  | requestId (searchable), op, contour, method, rawArgs, rawHeadersSafe, clientHttpStatus, errorCode, durationMs, requestedAt |
| t**saas-gw-gc**gups\_\_Up7Mn3    | tables/gatewayUpstreamLog.table.ts | Исходящие вызовы к GetCourse — raw-журнал (PII-маска) | requestId (searchable), op, upstreamKind, rawGcJson, gcHttpStatus, semanticRule, durationMs, sentAt                        |

**Связь между таблицами:** `gatewayRequestLog` и `gatewayUpstreamLog` связаны по полю `requestId` (один входящий запрос — один исходящий вызов GC, если availability позволила).

## Репозитории (repos/)

- `repos/settings.repo.ts` — findByKey, findAll, upsert, deleteByKey (слой работы с БД; без вызовов logger.lib, т.к. getSetting/getLogLevel вызываются из writeServerLog и используют findByKey — иначе рекурсия).
- `repos/logs.repo.ts` — create, findAll, findById, findBeforeTimestamp (слой работы с БД логов; findBeforeTimestamp использует нативную фильтрацию Heap API через `where: { timestamp: { $lt } }` для эффективной пагинации).
- `repos/panelAccess.repo.ts` — create, findByUserId, findAll, deleteByUserId (гранты доступа к панели).
- `repos/panelInvites.repo.ts` — create, findByToken, findAll, updateConsumed, updateRevoked (инвайты доступа к панели).
- `repos/gatewayRequestLog.repo.ts` — create, findRecent, findRecentFiltered, findById, countSince, countErrorsSince (через `countBy`/`where`; не `findAll().length`).
- `repos/gatewayUpstreamLog.repo.ts` — create, findRecent, findByRequestId, countSince, countOkSince (через `countBy`/`where`).

## Библиотеки (lib/)

- `lib/settings.lib.ts` — getSetting, getAllSettings, setSetting, getLogLevel, getLogsLimit, getLogWebhook, `getPanelDateFilter` (бизнес-логика, дефолты, валидация). Ключ `panel_date_filter` (`PANEL_DATE_FILTER`) хранит глобальный фильтр по дате в формате `{ from?, to? }` (Unix ms); запись через `setSetting` с валидацией; сброс — `deleteByKey`. Имена ключей gateway для клиента дублируются в `shared/gatewaySettingKeys.ts` (`// @shared`), сервер тянет те же строки в `SETTING_KEYS` (например `GC_DEVELOPER_API_KEY`, `GC_TEST_SCHOOL_API_KEY`, `GC_TEST_SCHOOL_HOST` → `gc_developer_api_key`, `gc_test_school_api_key`, `gc_test_school_host`). Валидация при записи: непустые строки после `trim` для двух ключей; хост — `validateGcSchoolHostTrimmed` в `shared/gcSchoolHostValidation.ts` + `throwLoggedServerError` в `setSetting`. Ввод в админке: `pages/AdminPage.vue` (секреты — `type="password"`, кнопка «показать»).
- `lib/logger.lib.ts` — getAdminLogsSocketId, shouldLogByLevel, writeServerLog, `throwLoggedServerError` (сначала лог по правилам `writeServerLog`, затем `throw`), `isServerErrorAlreadyLogged` (чтобы `api/settings/save` не дублировал severity 3 при той же ошибке). Проверка уровня; Heap всегда получает JSON `payload` при его передаче; обогащённый payload в ctx.account.log / WebSocket / вебхук — только при уровне Debug.
- `lib/access/` — система внутренних доступов к панели:
  - `constants.ts` — `INVITE_TTL_DAYS = 7`, `INVITE_CONSUME_LOCK_PREFIX`.
  - `requireInternalAccess.ts` — `decideInternalAccess` (Admin или активный грант), `requireInternalAccess` (редирект на forbidden при отказе), `InternalAccessDeniedError`.
  - `apiGuard.ts` — `guardInternalApi` (Admin или активный грант; для API-эндпоинтов вместо Admin-only).
  - `invites.ts` — `generateInvite`, `consumeInvite` (через `runWithExclusiveLock`), `classifyInvite`, `getInviteByToken`, `revokeInvite`, `revokeGrant`. Токен — локальный генератор (Math.random hex, ≥32 символов).

## Файлы и хранилище

- Не используется.

## Индексы/поиск

- Не используется.
