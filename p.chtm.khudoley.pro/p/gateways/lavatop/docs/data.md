# Data

Настройки проекта хранятся в Heap (key-value). См. [ADR-0002](ADR/0002-settings-heap-and-layered-api.md).

## Heap таблицы

| UID                                   | File                                  | Назначение                                      | Ключевые поля                                                                                                                                                                            |
| ------------------------------------- | ------------------------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| t**saas-gw-lavatop**setting\_\_pGtfce | tables/settings.table.ts              | Настройки проекта (key-value)                   | key (string), value (any)                                                                                                                                                                |
| t**saas-gw-lavatop**log\_\_4RhPFp     | tables/logs.table.ts                  | Серверные логи (долгосрочное хранение)          | message, payload, severity, level, timestamp                                                                                                                                             |
| t**saas-gw-lavatop**greq\_\_R7mK2v    | tables/gatewayRequestLog.table.ts     | Журнал входящих запросов клиентов к /v1/\*      | requestId (searchable), op (searchable), contour, method, rawArgs (PII-маска), rawHeadersSafe, clientHttpStatus, errorCode, durationMs, requestedAt                                      |
| t**saas-gw-lavatop**gups\_\_N9qF4w    | tables/gatewayUpstreamLog.table.ts    | Журнал исходящих вызовов к Lava.Top             | requestId (searchable), op (searchable), upstreamKind, rawLpJson (PII-маска), lpHttpStatus, semanticRule, durationMs, sentAt                                                             |
| t**saas-gw-lavatop**whe\_\_X3pL8s     | tables/lavatopWebhookEvent.table.ts   | Журнал входящих вебхуков и результат форварда   | event_type, lava_contract_id (searchable), payload_json, dedupe_key (searchable), processed, processed_at, processing_error, forward_url, forward_status_code, forward_error, created_at |
| t**saas-gw-lavatop**whm\_\_C5jH7t     | tables/lavatopWebhookMapping.table.ts | Маппинг contractId → клиентский callback-URL    | contract_id (searchable, уникальный), callback_url, client_order_id?, created_at                                                                                                         |
| t**saas-gw-lavatop**paccess\_\_W2dB5m | tables/panelAccess.table.ts           | Гранты доступа к панели (не-Admin пользователи) | userId (searchable), grantedAt, grantedByUserId, inviteId, revokedAt?, revokedByUserId?                                                                                                  |
| t**saas-gw-lavatop**pinvite\_\_Q8nA3r | tables/panelInvites.table.ts          | Одноразовые пригласительные токены              | token (searchable), createdByUserId, issuedAt, expiresAt, usedAt?, usedByUserId?, revokedAt?, note?                                                                                      |

Уникальность `contract_id` в `lavatopWebhookMapping` и `userId` в `panelAccess` обеспечивается на уровне приложения (под `runWithExclusiveLock`), не схемой Heap.

## Настройки gateway (в settings)

| Ключ                | Дефолт                | Назначение                                                   |
| ------------------- | --------------------- | ------------------------------------------------------------ | ------------ | ------- |
| lava_test_apikey    | ''                    | Тестовый API-ключ Lava.Top (форма «Создать запрос» в панели) |
| lava_base_url       | https://gate.lava.top | Базовый URL Lava.Top (настраивается для тестовой среды)      |
| lava_webhook_secret | ''                    | Секрет приёма вебхуков (X-Api-Key или Basic)                 |
| panel_date_filter   | null                  | Глобальный фильтр по дате панели `{ from: ms                 | null, to: ms | null }` |

## Репозитории (repos/)

- `repos/settings.repo.ts` — findByKey, findAll, upsert, deleteByKey. Без вызовов logger.lib (рекурсия: writeServerLog→getLogLevel→getSetting→findByKey→writeServerLog).
- `repos/logs.repo.ts` — create, findAll, findById, findBeforeTimestamp (пагинация через `where: { timestamp: { $lt } }`), countBySeverityAfter, countErrorsAfter, countWarningsAfter.
- `repos/gatewayRequestLog.repo.ts` — create, findRecent, findRecentFiltered (фильтр по дате через `where: { requestedAt: { $gte, $lte } }`), findById.
- `repos/gatewayUpstreamLog.repo.ts` — create, findRecent, findRecentFiltered, findById.
- `repos/lavatopWebhookEvent.repo.ts` — create, findByDedupeKey, findById, markProcessed, updateForwardResult.
- `repos/lavatopWebhookMapping.repo.ts` — upsertByContractId (идемпотентно, под локом), findByContractId.
- `repos/panelAccess.repo.ts` — findByUserId, findAllActive, create, revoke.
- `repos/panelInvites.repo.ts` — create, findByToken, revoke, findAll.

## Библиотеки (lib/)

- `lib/settings.lib.ts` — getSetting, getAllSettings, setSetting, getLogLevel, getLogsLimit, getLogWebhook, getLavaTestApiKey, getLavaBaseUrl, getLavaWebhookSecret, getPanelDateFilter, setPanelDateFilter.
- `lib/logger.lib.ts` — getAdminLogsSocketId, shouldLogByLevel, writeServerLog.
- `lib/admin/dashboard.lib.ts` — getDashboardCounts, resetDashboard.
- `lib/gateway/` — gateway-слой (см. `docs/architecture.md`).
- `lib/webhook/webhookRelay.service.ts` — processWebhook, reforwardEvent.
- `lib/access/` — requireInternalAccess, guardInternalApi, consumeInvite, revokeInvite.

## Файлы и хранилище

- Не используется.

## Индексы/поиск

- `requestId` в gatewayRequestLog и gatewayUpstreamLog — searchable (связка входящего с исходящим).
- `op` в обоих журналах — searchable.
- `lava_contract_id`, `dedupe_key` в lavatopWebhookEvent — searchable.
- `contract_id` в lavatopWebhookMapping — searchable (основной путь чтения).
- `userId` в panelAccess, `token` в panelInvites — searchable.
