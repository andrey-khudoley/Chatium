# API

Брокер — account-глобальный сервис (§0, §1 [спеки](spec/spec.md)). Все операции гейтвея доступны с двух транспортов: **external** HTTP (`api/broker/*`, токен модуля обязателен везде, кроме `register`) и **internal** `app.function` (`api/broker/internal/*`, вызов через `.run(ctx, params)` из другого проекта того же аккаунта, без токена — канал неподделываем и проставляется гейтвеем, не телом запроса).

## Конверт ответа

Все операции гейтвея возвращают **HTTP 200** с телом-конвертом `BrokerResult` (`lib/broker/result.ts`):

```
{ success: true, ...результат }
| { success: false, code: BrokerErrorCode, error: string, details?: object }
```

**Единственное исключение** — отказ аутентификации по токену модуля (`authenticateModule`): бросается `AccessDeniedError` и уходит наружу необёрнутым → платформа отвечает **HTTP 403**. Подтверждено Runtime Verification (тест `auth_wrong_token_403`, статус + тело проверены).

12 кодов ошибок (§5.9.5 [спеки](spec/spec.md)) — единый список на все операции:

| Код                     | Где возникает                                       | Смысл                                                                                                          |
| ----------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `module_not_active`     | publish, fetchDeliveries, ackDelivery, deadDelivery | модуль аутентифицирован, но `status !== 'active'`                                                              |
| `delivery_unavailable`  | ackDelivery, deadDelivery                           | доставка не найдена или принадлежит другому модулю (один код на оба случая — не раскрываем какой именно)       |
| `invalid_claim_token`   | ackDelivery, deadDelivery                           | доставка застолблена, но предъявленный `claimToken` не совпадает                                               |
| `delivery_not_claimed`  | ackDelivery, deadDelivery                           | доставка не в статусе `claimed` (после отбраковки токена/владельца)                                            |
| `module_already_exists` | register                                            | `moduleKey` уже занят                                                                                          |
| `invalid_pattern`       | register, publishTypes, subscribeTypes, publish     | невалидный glob-паттерн типа/eventType, либо `claimTimeoutMs < 1`                                              |
| `reserved_module_key`   | register                                            | `moduleKey` = `'broker'` (сентинел) или начинается с `'test-'` (резерв тестового харнесса, регистронезависимо) |
| `reserved_namespace`    | register, publishTypes, publish                     | попытка publish-доступа к `broker.*` (подписка на `broker.*` разрешена)                                        |
| `payload_too_large`     | publish                                             | `JSON.stringify(payload)` превышает 8192 символа                                                               |
| `publish_not_allowed`   | publish                                             | `eventType` не входит в `allowedPublishTypes` модуля                                                           |
| `module_not_found`      | admin disable/enable                                | `moduleKey` не зарегистрирован                                                                                 |
| `invalid_status`        | admin disable/enable                                | попытка `disable` не-`active` или `enable` не-`disabled` модуля                                                |

## Операции гейтвея (8 операций × 2 транспорта)

| Операция             | Method | External path                  | Internal path (`.run`)                | File (external / internal)                                                 | Auth                                      |
| -------------------- | ------ | ------------------------------ | ------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------- |
| registerModule       | POST   | `/api/broker/register`         | `api/broker/internal/register`        | `api/broker/register.ts` / `api/broker/internal/register.ts`               | токен не нужен (сама операция его выдаёт) |
| updatePublishTypes   | POST   | `/api/broker/publish-types`    | `api/broker/internal/publish-types`   | `api/broker/publish-types.ts` / `api/broker/internal/publish-types.ts`     | токен модуля (external)                   |
| updateSubscribeTypes | POST   | `/api/broker/subscribe-types`  | `api/broker/internal/subscribe-types` | `api/broker/subscribe-types.ts` / `api/broker/internal/subscribe-types.ts` | токен модуля (external)                   |
| deleteModule         | POST   | `/api/broker/delete`           | `api/broker/internal/delete`          | `api/broker/delete.ts` / `api/broker/internal/delete.ts`                   | токен модуля (external)                   |
| publishEvent         | POST   | `/api/broker/publish`          | `api/broker/internal/publish`         | `api/broker/publish.ts` / `api/broker/internal/publish.ts`                 | токен модуля (external)                   |
| fetchDeliveries      | POST   | `/api/broker/deliveries/fetch` | `api/broker/internal/fetch`           | `api/broker/deliveries/fetch.ts` / `api/broker/internal/fetch.ts`          | токен модуля (external)                   |
| ackDelivery          | POST   | `/api/broker/deliveries/ack`   | `api/broker/internal/ack`             | `api/broker/deliveries/ack.ts` / `api/broker/internal/ack.ts`              | токен модуля (external)                   |
| deadDelivery         | POST   | `/api/broker/deliveries/dead`  | `api/broker/internal/dead`            | `api/broker/deliveries/dead.ts` / `api/broker/internal/dead.ts`            | токен модуля (external)                   |

Внутренние `app.function`-роуты принимают тот же shape параметров, что и тело external-запроса, но **без** `moduleKey`+`authToken`-проверки по токену — канал `'internal'` проставляется гейтвеем напрямую в `registerModuleCore`, а для остальных 7 операций внутренний вызов идёт от доверенного кода того же аккаунта (без HTTP-границы).

### registerModule (§5.2)

Body (external, `s.` — схема): `{ moduleKey: string, allowedPublishTypes: string[], allowedSubscribeTypes: string[], claimTimeoutMs?: number, displayName?: string, metadata?: any }`. Internal — тот же shape (`RegisterModuleParams`), без `authToken`.

Возврат: `{ moduleKey, authToken, status: 'active' | 'onModeration' }`. `authToken` выдаётся один раз, только в ответе на регистрацию. Канал определяет исход: **internal → `active`** сразу; **external → `onModeration`**. Переход `onModeration → active` — вне кода волны 2 (admin-операции §5.7 работают только с осью `active ↔ disabled`, `onModeration` ими не обрабатывается); модерация — задел на будущую волну. `moduleKey` не может содержать `.`/`:`, не может быть `'broker'` или начинаться с `test-` (см. таблицу кодов).

### updatePublishTypes / updateSubscribeTypes (§5.3, §5.4)

Body: `{ moduleKey, authToken, types: string[] }` (internal — без `authToken`). Возврат: `{ result: 'applied' | 'pending' }`.

- `source === 'internal'` — применяется сразу (`applied`) без ограничений.
- `source === 'external'` — **сужение** (новый набор — литеральное подмножество старого) применяется сразу; **расширение** уходит в `pendingPublishTypes`/`pendingSubscribeTypes`, боевое поле и `status` не трогаются (модуль продолжает работать со старым набором до модерации, §5.6).
- `publishTypes` дополнительно запрещает `broker.*`-namespace (`reserved_namespace`); `subscribeTypes` — разрешает (аудит-подписка).

### deleteModule (§5.5)

Body: `{ moduleKey, authToken }` (internal — без `authToken`). Возврат: `{ deletedDeliveries: number }`.

Каскад **строго в порядке**: сначала hard-`deleteAll` всех доставок модуля (`subscriberModuleKey`), затем hard-`delete` строки модуля — последней. Это гарантирует, что `moduleKey` остаётся занятым, пока хвост доставок не убран (иначе новый владелец того же ключа унаследовал бы чужую очередь).

**Контракт «таймаут ≠ провал»**: если HTTP-вызов оборвался по таймауту после того как операция фактически завершилась на сервере, повторный вызов с теми же credentials получит `AccessDeniedError` (403) — строка модуля уже удалена, токен больше не валиден. Это следует читать как **успех предыдущей попытки**, а не как новый отказ.

### publishEvent (§5.8)

Body: `{ moduleKey, authToken, eventType: string, payload?: any, schemaVersion?: number, idempotencyKey?: string }` (internal — без `authToken`). Возврат: `{ eventId: string, deduplicated: boolean }`.

Двухфазно: фаза 1 (синхронно, этот вызов) — auth → `assertActive` → запрет `broker.*` → валидация `eventType` → проверка `allowedPublishTypes` → потолок payload (8192 симв., `JSON.stringify(payload ?? null).length`) → при наличии `idempotencyKey` — дедуп под замком `lockKey('dedup', moduleKey, idempotencyKey)` (повтор с тем же ключом возвращает старый `eventId`, `deduplicated: true`) → создание строки `BrokerEvents` (`dispatchedAt: null`) → триггер fan-out-дренера asap. Фаза 2 (материализация доставок подписчикам) — асинхронная, вне этого запроса (`lib/broker/fanout.ts` + `jobs/fanout-drainer.ts`).

### fetchDeliveries (§5.9.2)

Body: `{ moduleKey, authToken, limit?: number }` (internal — без `authToken`). Возврат: `{ deliveries: DeliveryOut[] }`, где `DeliveryOut = { id, eventId, eventType, schemaVersion, payload, claimToken, claimExpiresAt, claimCount, createdAt }`.

Атомарный poll+claim: выбирает `pending` + просроченные `claimed` (старше `claimTimeoutMs` модуля, дефолт 60000 мс) своего модуля, тут же столбит построчным CAS (`updateAll` с `where` по прежнему статусу, ADR-0014). Возвращённых доставок может быть меньше запрошенного — проигранные гонки CAS просто выпадают, это штатно, не ошибка.

### ackDelivery / deadDelivery (§5.9.3, §5.9.4)

Body ack: `{ moduleKey, authToken, deliveryId, claimToken }`. Body dead: то же + `lastError?: string` (internal — без `authToken`).

Возврат ack: `{ result: 'acked' | 'alreadyAcked' }`. Возврат dead: `{ result: 'dead' | 'alreadyDead' }`.

CAS-first: сразу пытается закрыть условным `updateAll` по `{ id, subscriberModuleKey, status: 'claimed', claimToken }`. При проигрыше CAS — классификация причины через `retryRead` (компенсация read-lag, ADR-0015): не найдена/чужая → `delivery_unavailable`; неверный `claimToken` (проверяется раньше матрицы статусов) → `invalid_claim_token`; уже в целевом статусе → `alreadyAcked`/`alreadyDead`; иной статус → `delivery_not_claimed`. `lastError` не отклоняется при превышении длины — обрезается до 1000 символов (`LAST_ERROR_MAX`).

## Admin-операции (§5.7)

Не часть модульного API — без токена модуля, требуют роль `Admin` на аккаунте (`requireAccountRole(ctx, 'Admin')` первой строкой, `// @shared-route`).

| Method | Path                        | File                          | Auth  | Назначение                                                                                                                                       |
| ------ | --------------------------- | ----------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| POST   | `/api/broker/admin/disable` | `api/broker/admin/disable.ts` | Admin | `{ moduleKey, reason? }` → `{ status: 'disabled' }`. Только из `status === 'active'`, иначе `invalid_status`. `pending*`-поля не трогает (§5.6). |
| POST   | `/api/broker/admin/enable`  | `api/broker/admin/enable.ts`  | Admin | `{ moduleKey }` → `{ status: 'active' }`. Только из `status === 'disabled'`, иначе `invalid_status`. Без ре-модерации.                           |

## Admin-операции наблюдаемости (§5.11, волна 2.5)

Внутренние поверхности для `pages/admin/*.vue` — не часть модульного API, без токена модуля. Все 7 admin-роутов (5 ниже + `disable`/`enable` выше) — `POST '/'`, `// @shared-route` (вызываются `.run()` с клиента страницы админки), `requireAccountRole(ctx, 'Admin')` первой строкой обработчика. Гейт роли подтверждён Runtime Verification: анонимный HTTP-запрос на любую из 7 admin-поверхностей получает отказ (тест `admin_role_gate`).

| Method | Path                            | File                              | Auth  | Назначение                                                                      |
| ------ | ------------------------------- | --------------------------------- | ----- | ------------------------------------------------------------------------------- |
| POST   | `/api/broker/admin/status`      | `api/broker/admin/status.ts`      | Admin | Сводка состояния брокера — backlog, доставки по статусам, список модулей.       |
| POST   | `/api/broker/admin/metrics`     | `api/broker/admin/metrics.ts`     | Admin | Метрики за 24ч — события, типы событий, доля мёртвых доставок, активные модули. |
| POST   | `/api/broker/admin/logs`        | `api/broker/admin/logs.ts`        | Admin | Постраничная выборка серверных логов брокера с фильтрами.                       |
| POST   | `/api/broker/admin/log-payload` | `api/broker/admin/log-payload.ts` | Admin | Полный JSON payload одной строки лога (в списке `logs` payload не отдаётся).    |
| POST   | `/api/broker/admin/log-level`   | `api/broker/admin/log-level.ts`   | Admin | Чтение/переключение уровня логирования брокера.                                 |

Формы ответов:

- **status** — тело не требуется. Возврат: `{ success, fanoutBacklog, deliveriesByStatus: { pending, claimed, acked, dead }, oldestPendingAgeMs: number | null, modules: [...], modulesTotal, logLevel }`. Записи `modules[]` — без `authTokenHash`/`metadata`.
- **metrics** — тело не требуется. Возврат: `{ success, eventsTotal, events24h, eventsByType24h: [{ eventType, count }], deliveriesByStatus, deadRatio, activeModulesCount }`. `eventsByType24h` — топ-20 типов за последние 24ч.
- **logs** — тело: `{ levels?, search?, from?, to?, limit?, offset? }`. Валидация входа без исключений — невалидные `levels`/`from`/`to` дают `{ success: false, ... }`, не 4xx/5xx. `limit` клэмпится в диапазон 1..200, `offset >= 0`. Возврат: `{ success, rows: [{ ts, level, msg, kv }], total }`. `rows[]` — без `payload` (см. `log-payload`).
- **log-payload** — тело: `{ ts, msg, kv }` (составной ключ строки лога — уникального id у строки нет). Возврат: `{ success, found, jsonStr: string | null }`. Отсутствующая запись → `found: false` без исключения. Ограничение: коллизия `ts`(мс)+`msg`+`kv` возможна в пределах одного миллисекундного тика — тогда `LIMIT 1` возвращает произвольную из совпавших строк.
- **log-level** — тело: `{ level? }`. Без `level` — только чтение текущего значения. С `level` — валидация по 5 допустимым значениям (`VALID_LEVELS`), невалидный → `{ success: false, ... }`; при успешной смене пишется серверный лог о переключении. Возврат: `{ success, level }`.

## Тестовые поверхности (§9)

Не часть контракта гейтвея — служебные роуты для проверки самого брокера.

| Method | Path                              | File                                | Auth                             | Назначение                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------ | --------------------------------- | ----------------------------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/web/tests`                      | `web/tests/index.tsx`               | Admin                            | Интерактивная HTML-страница юнит-тестов (`pages/tests/UnitTestsPage.vue`, по образцу `new_project`).                                                                                                                                                                                                                                                                                                                                                     |
| GET    | `/web/tests/ai`                   | `web/tests/ai.tsx`                  | Admin                            | JSON-гейт для агента/CI: `{ project: 'broker', summary: { total, passed, failed, duration, success }, results }`. Зелёный прогон = `summary.success === true`. Query `?category=` — прогон одной категории вместо всех шести (запасной ход при переросте бюджета времени; полный прогон ~9–10 с).                                                                                                                                                        |
| GET    | `/api/tests/run-tests/list`       | `api/tests/run-tests/list.ts`       | Admin                            | `{ success, categories }` — реестр 6 категорий/39 тестов (`shared/tests/test-definitions.ts`, единый источник истины со страницей).                                                                                                                                                                                                                                                                                                                      |
| POST   | `/api/tests/run-tests/run-single` | `api/tests/run-tests/run-single.ts` | Admin                            | `{ category, test }` → запуск одного теста, для интерактивной страницы.                                                                                                                                                                                                                                                                                                                                                                                  |
| POST   | `/api/tests/run-tests/run-all`    | `api/tests/run-tests/run-all.ts`    | Admin                            | `{ category? }` → запуск всего набора (или одной категории) для интерактивной страницы; тот же раннер, что у `/web/tests/ai`, но HTTP-обёртка отдельная (не in-process).                                                                                                                                                                                                                                                                                 |
| POST   | `/api/tests/log-probe`            | `api/tests/log-probe.ts`            | одноразовый `probeKey` (не роль) | Двухфазная проба уровня логирования: пишет лог ниже и выше отсекающего уровня, доказывая фильтрацию по `log_level` и всегдашнее наличие `payload`/`marks` в ClickHouse. Гейт — ключ `test_probe_key` в `BrokerSettings`, который раннер тестов создаёт перед вызовом и одноразово потребляет; несовпадение/отсутствие ключа → `AccessDeniedError` (403). `finally` независимо восстанавливает уровень логирования и удаляет ключ, даже если проба упала. |

Категории: database (4), functional (7), api (9), integration (12), concurrency (2), limits (5) — итого 39. Прогонять по одному инстансу за раз: параллельные `run-all` конкурируют за общий `sweep`/`probe-key`/`log_level` и взаимно разрушительны.

## Лимиты (`config/constants.ts`)

| Параметр                                             | Значение                                                   | Поведение при превышении                                                                                   |
| ---------------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `PAYLOAD_MAX_CHARS`                                  | 8192 символов (`JSON.stringify(payload).length`, не байты) | `publish` отклоняется с `payload_too_large`                                                                |
| `FETCH_LIMIT_DEFAULT`                                | 50                                                         | используется, если `limit` не передан                                                                      |
| `FETCH_LIMIT_MAX`                                    | 200                                                        | `limit` клэмпится сверху (усечение, не отказ), и снизу — минимум 1                                         |
| `claimTimeoutMs` (per-модуль, задаётся в `register`) | должен быть `>= 1` (целое/конечное число)                  | `register` отклоняется с `invalid_pattern`; `null`/не задан → дефолт `DEFAULT_CLAIM_TIMEOUT_MS` = 60000 мс |
| `LAST_ERROR_MAX`                                     | 1000 символов                                              | `deadDelivery.lastError` обрезается, вызов не отклоняется                                                  |
