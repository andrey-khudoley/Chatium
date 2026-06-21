# Data

Настройки проекта хранятся в Heap (key-value). См. [ADR-0002](ADR/0002-settings-heap-and-layered-api.md).

## Heap таблицы

| Table                                              | File                                  | Назначение                                         | Основные поля                                                                                                                                                                                                                                                                |
| -------------------------------------------------- | ------------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| t**lava-gc-integration**setting\_\_8Qm4Rt          | tables/settings.table.ts              | Настройки проекта (key-value)                      | key (string), value (any)                                                                                                                                                                                                                                                    |
| t**lava-gc-integration**log\_\_8Qm4Rt              | tables/logs.table.ts                  | Серверные логи (долгосрочное хранение)             | message (string), payload (any), severity, level, timestamp                                                                                                                                                                                                                  |
| t**lava-gc-integration**payment-contract\_\_9Xr5Bt | tables/lava_payment_contract.table.ts | Связь заказа GetCourse с контрактом Lava           | gc_order_id, gc_user_id, lava_contract_id, lava_product_id, lava_offer_id, amount, currency, buyer_email, gc_offer_title (текст offer из GC), gc_product_title (текст product из GC; в Lava — имя оффера при PATCH), payment_url, status, request_id, created_at, updated_at |
| t**lava-gc-integration**webhook-event\_\_3Kp7Qs    | tables/lava_webhook_event.table.ts    | Webhook Lava: сырой payload и дедупликация         | event_type, lava_contract_id, payload_json, dedupe_key, processed, processed_at, processing_error, created_at                                                                                                                                                                |
| t**lava-gc-integration**lock-log\_\_5Fm2Nt         | tables/lava_lock_log.table.ts         | Аудит блокировок критической секции (payment-link) | lock_key, request_id, gc_order_id, acquired_at, released_at, result, error_message                                                                                                                                                                                           |

## Репозитории (repos/)

- `repos/settings.repo.ts` — findByKey, findAll, upsert, deleteByKey (слой работы с БД; без вызовов logger.lib, т.к. getSetting/getLogLevel вызываются из writeServerLog и используют findByKey — иначе рекурсия).
- `repos/logs.repo.ts` — create, findAll, findById, findBeforeTimestamp (слой работы с БД логов; findBeforeTimestamp использует нативную фильтрацию Heap API через `where: { timestamp: { $lt } }` для эффективной пагинации).
- `repos/lava_payment_contract.repo.ts` — create, findByGcOrderId, findByLavaContractId, updateStatus, findActiveByGcOrderAmountAndCurrency (активный контракт по `gc_order_id` + `amount` + `currency`, статус в `created` / `in_progress` / `unknown` — идемпотентность payment-link), deactivateActiveContractsForGcOrderId (отмена прочих активных по заказу при смене суммы).
- `repos/lava_webhook_event.repo.ts` — create, findByDedupeKey, markProcessed, findUnprocessed (очередь необработанных: `where: { processed: false }`, сортировка по `created_at` asc).
- `repos/lava_lock_log.repo.ts` — create, updateReleased (аудит блокировки шаблона оплаты).

## Библиотеки (lib/)

- `lib/settings.lib.ts` — getSetting, getAllSettings, setSetting, getLogLevel, getLogsLimit, getLogWebhook; ключи интеграции в `SETTING_KEYS` (`lava_api_key`, `lava_base_url`, `lava_product_id`, `lava_offer_id`, `lava_webhook_secret`, `gc_api_key`, `gc_account_domain`, `gc_order_flag_addfield_id`) и геттеры без логирования: `getLavaApiKey`, `getLavaBaseUrl`, `getLavaProductId`, `getLavaOfferId`, `getLavaWebhookSecret`, `getGcApiKey`, `getGcAccountDomain`, `getGcOrderFlagAddfieldId` (бизнес-логика, дефолты, валидация); для `lava_base_url` при сохранении — нормализация через `shared/lavaBaseUrl.ts`. `lib/settings-save-credentials.lib.ts` — чистые функции слияния одного поля с парой из Heap для POST save (`resolveGcCredentialsForSave`, `resolveLavaCredentialsForSave`, `shouldVerifyCredentialPair`). `api/settings/save` перед `setSetting` для пар `gc_api_key`/`gc_account_domain` и `lava_api_key`/`lava_base_url` выполняет живые проверки (`verifyGcPlApiAccess`, `verifyLavaCredentials` — см. `docs/api.md`).
- `lib/lava-api.client.ts` — `updateOfferPrice` (PATCH цены оффера перед оплатой), `createContract` (POST `/api/v3/invoice`), `getProducts` (диагностический GET), `fetchLavaProductsCatalog` (GET `/api/v2/products`, пары продукт/оффер для мастера в админке). Парсер каталога учитывает **два** формата `items[]`: лента `{ type: PRODUCT, data: { id, title, offers } }` и **плоский** ответ API `{ id, title, type, offers }` (например `type: CONSULTATION`). Исходящий `request` — **одним аргументом** (объект опций), без `ctx`. Debug-логи при загрузке каталога: сырой JSON, гистограмма `type` по элементам.
- `lib/getcourse-api.client.ts` — `verifyGcPlApiAccess` (проверка ключа и домена для админки), `updateDealStatus`, `probeGcOrderPlApi` (диагностическая проба заказа для тестов `/web/tests`; POST `https://{домен}/pl/api/deals`, form + Base64 `params`; если в настройках задан `gc_order_flag_addfield_id`, в `deal.addfields` добавляется `{ [id]: true }`; ошибки от GC только в лог).
- `lib/integration-credentials.lib.ts` — `runGcCredentialCheckFromSettings`, `runLavaCredentialCheckFromSettings` (чтение из Heap и те же живые вызовы, что при сохранении в `api/settings/save`, без слияния с телом POST); `runIntegrationCredentialChecksFromSettings` — обе проверки подряд. GET-тесты: `integration-gc-credentials`, `integration-lava-credentials`, `integration-credentials-both`.
- `lib/lava-payment.service.ts` — `createPaymentLink` (идемпотентность по заказу+сумме+валюте; при новой сумме — отмена устаревших активных контрактов по `gc_order_id`; `runWithExclusiveLock`; запись в `lava_payment_contract` и `lava_lock_log`).
- `lib/lava-webhook.service.ts` — `processWebhook` (секрет, дедупликация `lava_webhook_event`; обработка только успешной оплаты `payment.success` + `completed`, обновление контракта, callback в GetCourse со статусом `in_work`; неуспешные/нерелевантные webhook-события игнорируются).
- `lib/lava-types.ts` — типы валюты, webhook, запрос/ответ payment-link, локальный статус контракта.
- `lib/normalize-string-record.lib.ts` — `normalizeStringRecord` для полей `utm` / `clientUtm` после `s.optional(s.unknown())` в схеме тела; **`s.record`** в UGC даёт ошибку `modifier`, поэтому record в схеме не используем.
- `lib/logger.lib.ts` — getAdminLogsSocketId, shouldLogByLevel, writeServerLog (проверка уровня, запись в ctx.log/ctx.account.log, Heap, WebSocket, вебхук).

## Файлы и хранилище

- Не используется.

## Индексы/поиск

- Не используется.

## Интеграция Lava + GetCourse (реализовано)

Поток данных: GetCourse вызывает `POST /api/integrations/lava/payment-link` → `lava-payment.service` → Lava API → запись в `lava_payment_contract`; Lava шлёт `POST /api/integrations/lava/webhook` → `lava-webhook.service` → Heap + GetCourse PL API. Дополнительный контекст по полям и сценариям — [integration-data-model.md](./integration-data-model.md); ограничения платформы — [integration-implementation-chatium.md](./integration-implementation-chatium.md).
