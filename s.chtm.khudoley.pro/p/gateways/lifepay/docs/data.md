# Data

Настройки проекта хранятся в Heap (key-value). См. [ADR-0002](ADR/0002-settings-heap-and-layered-api.md).

## Heap таблицы

| Table                                 | File                               | Назначение                                                                                                     | Основные поля                                                                                                                                                                                                                                                                       |
| ------------------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| t**saas-gw-lifepay**setting\_\_L4p9Vx | tables/settings.table.ts           | Настройки проекта (key-value)                                                                                  | key (string), value (any)                                                                                                                                                                                                                                                           |
| t**saas-gw-lifepay**log\_\_M2k8Rj     | tables/logs.table.ts               | Серверные логи (долгосрочное хранение)                                                                         | message (string), payload (any), severity, level, timestamp                                                                                                                                                                                                                         |
| t**saas-gw-lifepay**greq\_\_G4n2Lp    | tables/gatewayRequestLog.table.ts  | Журнал входящих запросов клиентов к gateway (одна запись на каждый `POST /api/v1/{op}`)                        | requestId (searchable), op (searchable), contour, method, rawArgs (Heap.Any, PII-маска), rawHeadersSafe (Heap.Any, без секретов), clientHttpStatus, errorCode, durationMs, requestedAt                                                                                              |
| t**saas-gw-lifepay**gups\_\_U7q3Mn    | tables/gatewayUpstreamLog.table.ts | Журнал исходящих вызовов gateway → LifePay (на каждое реальное обращение через `lib/gateway/lifePayClient.ts`) | requestId (searchable), op (searchable), upstreamKind (json_ok/upstream_status/upstream_parse_error/network_error/timeout), rawLpJson (Heap.Any, полное тело LifePay с PII-маской или marker `{ __kind, lpHttpStatus, __rawText }`), lpHttpStatus, semanticRule, durationMs, sentAt |
| t**saas-gw-lifepay**paccess\_\_gEY6s1 | tables/panelAccess.table.ts        | Выданные доступы к панели (не Admin)                                                                           | userId (searchable), grantedAt, grantedBy                                                                                                                                                                                                                                           |
| t**saas-gw-lifepay**pinvite\_\_3EzUBP | tables/panelInvites.table.ts       | Пригласительные токены для выдачи доступа                                                                      | token (searchable), issuedAt, expiresAt, consumedAt, consumedByUserId, revokedAt, createdBy                                                                                                                                                                                         |

## Репозитории (repos/)

- `repos/settings.repo.ts` — findByKey, findAll, upsert, deleteByKey (слой работы с БД; без вызовов logger.lib, т.к. getSetting/getLogLevel вызываются из writeServerLog и используют findByKey — иначе рекурсия).
- `repos/logs.repo.ts` — create, findAll, findById, findBeforeTimestamp (слой работы с БД логов; findBeforeTimestamp использует нативную фильтрацию Heap API через `where: { timestamp: { $lt } }` для эффективной пагинации).
- `repos/gatewayRequestLog.repo.ts` — create, `findRecent`, `findRecentFiltered(ctx, limit, dateFrom?, dateTo?)` (where requestedAt $gte/$lte; без границ — `findRecent`), findById, findByRequestId, countSince, countErrorsSince.
- `repos/gatewayUpstreamLog.repo.ts` — create, `findRecent`, `findRecentFiltered(ctx, limit, dateFrom?, dateTo?)` (where sentAt $gte/$lte), findById, findByRequestId, countSince, countOkSince.
- `repos/panelAccess.repo.ts` — create, findByUserId, findAll, deleteByUserId (гранты доступа к панели).
- `repos/panelInvites.repo.ts` — create, findByToken, findAll, updateConsumed, updateRevoked (инвайты доступа к панели).

## Библиотеки (lib/)

- `lib/settings.lib.ts` — getSetting, getAllSettings, setSetting, getLogLevel, getLogsLimit, getLogWebhook, `getPanelDateFilter` (бизнес-логика, дефолты, валидация). Ключ `panel_date_filter` (`PANEL_DATE_FILTER`) хранит глобальный фильтр по дате `{ from?, to? }` (Unix ms); запись через `setSetting` с валидацией; сброс — `deleteByKey`.
- `lib/logger.lib.ts` — getAdminLogsSocketId, shouldLogByLevel, writeServerLog (проверка уровня, запись в ctx.log/ctx.account.log, Heap, WebSocket, вебхук).
- `lib/gateway/lifePayClient.ts` — `lifePayPostJson`/`lifePayGetJson`: вызовы к LifePay через `@app/request`. Возвращает дискриминированный `LpClientResult` с `lpRawText` (обрезан до 64KB) для `json_ok`/`upstream_status`/`upstream_parse_error`.
- `lib/gateway/handleV1Op.ts` — общая цепочка обработки `/v1/{op}`. Заводит локальный `GatewayLogCtx`, заполняет его по ходу выполнения (`contour`, `method`, `rawArgs`, `rawHeadersSafe`, `upstream`), и в `finally`-блоке внешней функции вызывает `writeGatewayLogs` — запись `gatewayRequestLog` (всегда) + `gatewayUpstreamLog` (если был upstream-вызов). Try/catch на каждый repo-вызов, чтобы лог не валил основной поток.
- `lib/access/` — система внутренних доступов к панели:
  - `constants.ts` — `INVITE_TTL_DAYS = 7`, `INVITE_CONSUME_LOCK_PREFIX`.
  - `requireInternalAccess.ts` — `decideInternalAccess` (Admin или активный грант), `requireInternalAccess`, `InternalAccessDeniedError`.
  - `apiGuard.ts` — `guardInternalApi` (Admin или активный грант).
  - `invites.ts` — `generateInvite`, `consumeInvite` (через `runWithExclusiveLock`), `classifyInvite`, `getInviteByToken`, `revokeInvite`, `revokeGrant`.
- `shared/redactRaw.ts` — `redactRawDeep(value)`: рекурсивная PII-маска и удаление секретов. SECRET*KEYS_DEEP (apikey/login/token/authorization/cookie/lp*_/x-lp-_); PII_KEYS_DEEP (email/phone/passport/inn/snils/fio/address/...). Лимит `MAX_RAW_BYTES = 64 KB` с усечением до marker `{ __truncated: true, __originalBytes, __preview }`. Циклы → `__circular`, functions/symbols → `__nonSerializable`. Файл синхронизирован с `p/units/yakovleva/pay/shared/redactRaw.ts`.

## Файлы и хранилище

- Не используется.

## Индексы/поиск

- `requestId`, `op` в `gatewayRequestLog` и `gatewayUpstreamLog` — searchable.
