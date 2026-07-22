# Данные — Broker

Обзор Heap-таблиц брокера. Источник истины по полям и инвариантам — [`docs/spec/spec.md`](spec/spec.md) §3 (таблицы) и §5 (операции); здесь — карта с точными идентификаторами, без копирования кода `tables/*.table.ts`.

## Паттерн окружений

Каждая из 5 сущностей объявлена **один раз** как общий объект `fields`, из которого строится пара Heap-таблиц `*Stage`/`*Prod` (разные `Heap.Table`-имена, одинаковая схема). Наружу из `tables/*.table.ts` экспортируется **только** репозиторий выбранного окружения — статический селектор `IS_PROD` (`config/env.ts`, вычисляется из `PROJECT_ROOT`). Пара как таковая наружу не выходит: остальной код видит один объект (`BrokerModules`, `BrokerEvents`, …) и не знает, что за ним пара таблиц. Слой `repos/` в проекте отсутствует — `lib/` обращается к `tables/` напрямую (осознанное упрощение MVP); инвариант «одна логическая сущность = одна пара» держит сам экспорт-селектор в `.table.ts`, а не отдельный слой.

Идентификаторы таблиц (Heap-имя `t__broker__<entity>__<env>_<suffix>`) фиксированы и не меняются между stage/prod — суффикс общий, различается только `__stage_`/`__prod_`.

## Таблицы

### BrokerModules — реестр модулей-участников (спека §3.1)

`t__broker__modules__stage_wI7S9L` / `t__broker__modules__prod_wI7S9L`

| Поле                    | Тип                                   | Назначение                                                          |
| ----------------------- | ------------------------------------- | ------------------------------------------------------------------- |
| `moduleKey`             | String                                | естественный ключ модуля (ADR-0001)                                 |
| `displayName`           | String?                               | человекочитаемое имя, только для админ-диагностики                  |
| `source`                | Enum `internal\|external`             | канал регистрации (из канала вызова, не из тела запроса)            |
| `allowedPublishTypes`   | String[]                              | одобренный whitelist типов публикации (glob, посегментный)          |
| `allowedSubscribeTypes` | String[]                              | одобренный whitelist типов подписки (glob, посегментный)            |
| `pendingPublishTypes`   | String[]?                             | заявка на расширение publish (§5.3); `null` = заявки нет            |
| `pendingSubscribeTypes` | String[]?                             | заявка на расширение subscribe (§5.4); `null` = заявки нет          |
| `status`                | Enum `onModeration\|active\|disabled` | операционный статус модуля (ADR-0010)                               |
| `claimTimeoutMs`        | Number?                               | переопределение таймаута claim; `null` = `DEFAULT_CLAIM_TIMEOUT_MS` |
| `authTokenHash`         | String                                | SHA-256 хэш auth-токена (ADR-0002, §5.1)                            |
| `metadata`              | Any?                                  | произвольные дополнительные данные модуля                           |

### BrokerEvents — журнал опубликованных событий (спека §3.2)

`t__broker__events__stage_BOnFpq` / `t__broker__events__prod_BOnFpq`

Append-only: фактическая часть строки после публикации не редактируется, меняется только служебный `dispatchedAt`.

| Поле                | Тип     | Назначение                                                                                       |
| ------------------- | ------- | ------------------------------------------------------------------------------------------------ |
| `eventType`         | String  | доменный тип события (цель glob-матча подписки)                                                  |
| `schemaVersion`     | Number  | версия схемы `payload` внутри `eventType`; корневое плоское поле ради индексируемости (ADR-0003) |
| `producerModuleKey` | String  | `moduleKey` продюсера — строка, не RefLink                                                       |
| `payload`           | Any?    | полезная нагрузка, потолок 8 КБ (`PAYLOAD_MAX_CHARS`)                                            |
| `idempotencyKey`    | String? | ключ дедупликации публикации, вместе с `producerModuleKey`                                       |
| `dispatchedAt`      | Number? | epoch ms завершения fan-out; `null` = не завершён (разовый переход null → timestamp)             |

### BrokerDeliveries — материализованные доставки (спека §3.3)

`t__broker__deliveries__stage_fk9ze2` / `t__broker__deliveries__prod_fk9ze2`

Одна строка на пару (событие × подписчик); самая быстрорастущая таблица брокера.

| Поле                  | Тип                                  | Назначение                                                                            |
| --------------------- | ------------------------------------ | ------------------------------------------------------------------------------------- |
| `eventId`             | String                               | id строки-источника из `BrokerEvents` — строка, не RefLink                            |
| `eventType`           | String                               | тип события, снимок для pull-фильтра подписчика                                       |
| `schemaVersion`       | Number                               | версия схемы `payload`, снимок                                                        |
| `payload`             | Any?                                 | снимок payload события — толстая доставка (ADR-0006)                                  |
| `subscriberModuleKey` | String                               | `moduleKey` подписчика — строка, не RefLink                                           |
| `status`              | Enum `pending\|claimed\|acked\|dead` | жизненный цикл доставки (§3.3)                                                        |
| `claimedAt`           | Number?                              | epoch ms последнего claim; не задан до первого claim                                  |
| `claimCount`          | Number (default 0)                   | сколько раз доставку выдавали — диагностика гонок (О7)                                |
| `lastError`           | String?                              | причина финальной сдачи (`deadDelivery`), обрезается до `LAST_ERROR_MAX` (1000 симв.) |
| `claimToken`          | String?                              | метка текущего захвата (nanoid, новая на каждый claim, О6)                            |

### BrokerEventsArchive — холодный архив журнала (спека §3.4)

`t__broker__events-arch__stage_LO6Zki` / `t__broker__events-arch__prod_LO6Zki`

Только схема: волна 2 (MVP) её не использует — архивация и любое чтение архива входят в волну 3 (retention-джоб, §3.5). Таблица объявлена заранее, чтобы схема была зафиксирована и неизменяема с самого начала.

| Поле        | Тип    | Назначение                                              |
| ----------- | ------ | ------------------------------------------------------- |
| `batchFrom` | Number | минимальный `createdAt` в батче, epoch ms               |
| `batchTo`   | Number | максимальный `createdAt` в батче, epoch ms              |
| `count`     | Number | число упакованных событий в строке                      |
| `events`    | Any    | упакованный массив архивных строк `BrokerEvents` (JSON) |

### BrokerSettings — операционные настройки (спека §3.6)

`t__broker__settings__stage_I7Ozm8` / `t__broker__settings__prod_I7Ozm8`

Generic key-value; строка на настройку (новая настройка = новая строка, не новое поле).

| Поле    | Тип    | Назначение                       |
| ------- | ------ | -------------------------------- |
| `key`   | String | имя настройки                    |
| `value` | Any    | значение настройки (любая форма) |

В волне 2 единственная настройка — `log_level` (§5.10.8): читается с TTL-кэшем 3 с (`lib/log/settings.ts`), пишется через `createOrUpdateBy`. Также используется как разовый гейт-ключ (`probeKey`) двухфазной лог-пробы теста (`api/tests/log-probe.ts`), с независимым восстановлением уровня и удалением ключа в `finally`.

## Отклонение от плана: `Heap.Enum` объектной формой

`MODULE_SOURCE_ENUM`, `MODULE_STATUS_ENUM`, `DELIVERY_STATUS_ENUM` объявлены как объектный enum (`{ internal: 'internal', ... } as const`), а не как массив строковых литералов. Осознанное отклонение: `Heap.Enum` ожидает `TEnumType`-объект — строковый массив-литерал молча попадает в другой (объектный) оверлоад и ломает типизацию. Паттерн уже используется в воркспейсе (`p/units/neso/.../orders.table.ts`).

## Статусные модели

**Модуль** (`BrokerModules.status`, ADR-0010): `onModeration → active` (одобрение, волна 3) `→ disabled` (админ-отключение, `admin/{disable,enable}`, роль Admin). `deleteModule` — не переход статуса, а физическое удаление строки с освобождением `moduleKey` (§5.5).

**Доставка** (`BrokerDeliveries.status`, §3.3): `pending → claimed → acked | dead`. `pending` создаётся fan-out'ом; `claimed` — атомарный poll-claim забора (`fetchDeliveries`, ADR-0012); `acked`/`dead` — финальные, различаются per-row CAS-гонкой при подтверждении/сдаче (ADR-0014). `pending`/`claimed` retention не трогает — только `acked` (>24 ч) и `dead` (>30 дней, окно хранения, §3.5).

## Инварианты данных

- **Идемпотентность fan-out** — не более одной доставки на пару `(eventId, subscriberModuleKey)`: перед созданием строки `BrokerDeliveries` fan-out (`lib/broker/fanout.ts`) держит per-event замок `lockKey('fanout', eventId)` и внутри перепроверяет активность подписчика.
- **CAS-захват доставки** — `fetchDeliveries`/`ack`/`dead` (`lib/broker/pull.ts`) используют `updateAll` с условием и проверкой `won === 1`; проигрыш CAS классифицируется через `retryRead` с предикатом «противоречие проигрышу CAS» (матрица О6: `alreadyAcked`/`alreadyDead`).
- **Публикация** — дедуп по `idempotencyKey` под `lockKey('dedup', ...)`, глоб-валидация типа, потолок 8 КБ на `payload` — до создания строки `BrokerEvents` (§5.8).
- **Регистрация модуля** — замок `lockKey('register', moduleKey)` с защитным свипом чужих доставок того же ключа (защита от мисатрибуции при повторном занятии освобождённого `moduleKey`).
- **Каскад `deleteModule`** (§5.5) — строго синхронный порядок: сначала `deleteAll` всех доставок `subscriberModuleKey` (`limit: null, hard: true`), и только затем — строка `BrokerModules`. Порядок обязателен: обрыв по бюджету джоба/запроса на любом шаге оставляет `moduleKey` занятым (безопасный исход), обратный порядок отдал бы ключ вместе с чужим хвостом доставок новому владельцу. `BrokerEvents`/архив каскад не задевает — исторический факт остаётся, `producerModuleKey` не ссылочный.
- **Retention (волна 3, §3.5)** — не реализован в MVP; таблицы, которые он тронет: `BrokerDeliveries` (удаление `acked`>24ч и `dead`>30 дней), `BrokerEvents`→`BrokerEventsArchive` (архивация событий старше месяца, порядок «сначала архив, потом удаление исходных строк»). В волне 2 `BrokerEventsArchive` не пишется и не читается никем; `BrokerSettings` в волне 2 трогают только `lib/log/settings.ts` (уровень лога) и лог-проба тестов (`probeKey`).

## Изоляция тестовых строк

Тестовые данные размечаются зарезервированными префиксами `moduleKey`, недоступными обычным клиентам:

- `test-` (`RESERVED_MODULE_KEY_TEST_PREFIX`) — резерв проверяется регистронезависимо при `registerModule`; используется большинством юнит-тестов (`testModuleKey` в `lib/tests/helpers.ts`).
- `brokertest-` — отдельный префикс для транспортных register-тестов (`transportModuleKey`), которые действительно проходят HTTP/internal-канал регистрации; убирается через `cleanupTransportModule` в `try/finally`. Упавший процесс тест не подчистит — остаётся клаттер, не конфликт (см. остаточные риски README).

Полная зачистка — `sweep`: `$ilike 'test-%'`, `limit: null`, `hard: true`, выполняется тестовым раннером. Прогоны нельзя параллелить: общий sweep, общий `probeKey` лог-теста и общий `log_level` делают набор тестов взаимно разрушительным при одновременном запуске (см. README «Тесты»).
