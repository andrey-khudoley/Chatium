@chatium

# ClickHouse — аналитическая база данных в Chatium

**Runtime-верифицированная версия на 2026-07-18.** Утверждения проверены прямым запуском SDK-функций и `queryAi`-запросами (workspace `/temp/qna1807`, хост `s.chtm.aley.pro`). Расхождения типов и runtime отмечены явно.

> ⚠️ **Главное про runtime:** ряд функций **объявлен** в TypeScript-тайпингах, но **не работает** в runtime (бэкенд не реализует sysCall). Перед использованием в production проверяйте каждую SDK-функцию. Самое важное: **`queryAccountLogs`/`listAccountLogs` из `@app/ugc` НЕ работают** — читать `account_logs` можно только через `queryAi`.

> 🔗 **Связанные доки.** Пересекающиеся темы — в отдельных файлах: события трафика и `queryAi`-примеры — [016-analytics-traffic.md](016-analytics-traffic.md); события workspace (`writeWorkspaceEvent`) — [016-analytics-workspace.md](016-analytics-workspace.md); подписки на события метрик — [016-analytics-subscriptions.md](016-analytics-subscriptions.md); низкоуровневый модуль метрик — [038-metric.md](038-metric.md).

## Содержание

- [Архитектура](#архитектура)
- [Доступные таблицы](#доступные-таблицы)
- [Запись событий: writeMetricEvent](#запись-событий-writemetricevent)
- [Запись событий: writeWorkspaceEvent](#запись-событий-writeworkspaceevent)
- [Запись событий: captureCustomerEvent](#запись-событий-capturecustomerevent)
- [Запись логов: ctx.account.log](#запись-логов-ctxaccountlog)
- [Чтение данных: queryAi](#чтение-данных-queryai)
- [Чтение account_logs](#чтение-account_logs)
- [Система декларации событий](#система-декларации-событий)
- [Структуры таблиц](#структуры-таблиц)
- [Расходы на рекламу и сквозная аналитика](#расходы-на-рекламу-и-сквозная-аналитика)
- [Типы контактов (ContactType)](#типы-контактов-contacttype)
- [Лучшие практики](#лучшие-практики)
- [Частые ошибки](#частые-ошибки)
- [Результаты runtime-верификации](#результаты-runtime-верификации)

---

## Архитектура

ClickHouse на платформе Chatium — **строго внутренняя (platform-managed)** инфраструктура. Аккаунты и workspace'ы не имеют прямого доступа к серверу, не создают свои базы/таблицы и не выполняют DDL. Всё взаимодействие — через SDK-функции записи и SQL-запросы (только SELECT) к платформенным таблицам.

```
Workspace-код (TypeScript)
    │
    ├── writeMetricEvent(ctx, data)          → @app/metric   → ClickHouse (chatium_ai.access_log)
    ├── writeWorkspaceEvent(ctx, name, data)  → @start/sdk    → ClickHouse (chatium_ai.access_log)
    ├── captureCustomerEvent(ctx, input)      → @crm/sdk/v2   → ClickHouse + CRM
    └── ctx.account.log(msg, params)          → метод ctx     → ClickHouse (chatium_ai.account_logs) — см. 050-logging.md

Чтение:
    ├── queryAi(ctx, sql)                     → @traffic/sdk  ← ClickHouse (SELECT) — единственный рабочий способ
    │                                           (ТОЛЬКО динамический import — модуля нет в node_modules)
    ├── *queryAccountLogs(ctx, sql)            → @app/ugc      ⚠️ ДЕКЛАРИРОВАН, НО НЕ РАБОТАЕТ
    └── *listAccountLogs(ctx, opts)            → @app/ugc      ⚠️ ДЕКЛАРИРОВАН, НО НЕ РАБОТАЕТ
```

> ⚠️ **Звёздочкой (\*)** помечены функции, объявленные в `.d.ts`, но выбрасывающие в runtime `Method not found (from sysCall 'ugc.queryAccountLogs')`. Читать `account_logs` можно только через `queryAi` из `@traffic/sdk`.

**Импорты (сверено):** `captureCustomerEvent`/`getCustomerEventUrl`/`ContactType` — из **`@crm/sdk/v2`** (не `@crm/v2/sdk`); `ctx.account.log()` — метод контекста, **не** импортируется из `@app/ugc`; `sendDataToSocket`/`getOrCreateBrowserSocketClient` — из **`@app/socket`** (не `@start/sdk`).

---

## Доступные таблицы

| Таблица | Назначение | Запись | Чтение | Статус |
|---|---|---|---|---|
| `chatium_ai.access_log` | Основной лог событий и посещений | `writeMetricEvent`, `writeWorkspaceEvent`, `captureCustomerEvent` | `queryAi()` | ✅ |
| `chatium_ai.behaviour2_log` | Поведенческая аналитика (VIEW) | Только платформа | `queryAi()` | ✅ |
| `chatium_ai.traffic_source_statistics` | Расходы на рекламу | Внешний модуль | `queryAi()` | ✅ |
| `chatium_ai.account_logs` | Логи приложения | `ctx.account.log()` | `queryAi()` **или** dev-логгер `/s/dev/logs` | ✅ запись, ⚠️ чтение через `@app/ugc` не работает |

**Ограничения:** нет DDL (`CREATE`/`ALTER`), фиксированная схема, `Map` только `string→string`, нет изоляции (все события в одной таблице, различаются по `url`), плоская структура, нет управления TTL, `queryAi` — OLAP-аналитика (не ETL, не для выгрузки миллионов строк).

---

## Запись событий: writeMetricEvent

Низкоуровневая запись произвольного события в `chatium_ai.access_log`. Тип полей — `MetricEventData` (`@app/metric`, **type-only** экспорт). Обзор модуля — [038-metric.md](038-metric.md).

```typescript
import { writeMetricEvent } from '@app/metric'
// В sandbox допустим dynamic import: const { writeMetricEvent } = await import('@app/metric')

await writeMetricEvent(ctx, {
  uid: req.headers['x-chtm-uid'] as string,
  url: 'event://my-app/form_submitted',
  action: 'Bot',
  action_param1: 'Иван Иванов',
  action_param1_float: 1500.0,
  action_param1_mapstrstr: { source: 'landing' },
  customer_contacts: [{ type: 'email', value: 'ivan@example.com' }],
})
```

> ℹ️ **`MetricEventData` — type-only.** Интерфейс реэкспортируется из `@app/metric`, импортировать можно только как тип: `import type { MetricEventData } from '@app/metric'` (в runtime значения нет). Фактический аргумент — `UgcAppMetricEventData = Partial<Omit<MetricEventData, 'account' | 'workspace_id' | 'workspace_path'>>` (+ опция `user`): платформа сама заполняет `account`/`workspace_*`, остальные поля (включая `url`, `action`, `customer_contacts`) разрешены.

### Проверенные поля (runtime)

| Поле | Тип | Примечание |
|---|---|---|
| `uid` | `string` | ID посетителя — обязателен для привязки к сессии/UTM |
| `url` | `string` | URL события — `event://workspace/eventName` |
| `action` | `string` | Тип действия |
| `action_param1..3` | `string` | Строковые параметры |
| `action_param1..8_float` | `number` | **8** дробных полей |
| `action_param1..3_int` | `number` | 3 целочисленных |
| `action_param1..3_arrstr` | `string[]` | 3 массива строк |
| `action_param1_uint32arr` | `number[]` | Массив целых |
| `action_param1..2_mapstrstr` | `Record<string, string>` | **2** словаря строка→строка |
| `customer_contacts` | объекты **или** строки | Контакты (см. ниже) |
| `utm_source/medium/campaign/content/term` | `string` | UTM-метки |
| `user` | объект | Данные пользователя (из `ctx.user`) |

### customer_contacts — форматы ввода и хранения

**На вход** SDK принимает **оба** формата:

```typescript
// Формат 1 — объекты (рекомендуемый)
customer_contacts: [{ type: 'email', value: 'ivan@example.com' }, { type: 'phone', value: '+79001234567' }]

// Формат 2 — строки "type:value"
customer_contacts: ['email:ivan@example.com', 'phone:+79001234567']
```

**В ClickHouse** всегда хранится как `Array(String)` в формате `"type:value"`: `["email:ivan@example.com", "phone:+79001234567"]`.

---

## Запись событий: writeWorkspaceEvent

Универсальная запись событий workspace. **URL формируется автоматически.** Полное руководство и примеры — [016-analytics-workspace.md](016-analytics-workspace.md).

```typescript
import { writeWorkspaceEvent, getWorkspaceEventUrl } from '@start/sdk'

// URL: event://account/<workspacePath>/form_submitted
await writeWorkspaceEvent(ctx, 'form_submitted', {
  uid: clrtUid,
  action_param1: 'Иван',
  customer_contacts: [
    { type: 'email', value: 'user@mail.ru' },
    { type: 'phone', value: '+79001234567' },
  ],
  utm_source: 'yandex',
  action_param1_mapstrstr: { message: 'Хочу консультацию' },
})
```

**Сигнатура (runtime):** `writeWorkspaceEvent(ctx: app.Ctx, eventName: string, eventData: any): Promise<void>`. Тип `eventData` — `any` (контракт runtime, не TS); ориентируйтесь на поля `MetricEventData`.

**Форматы URL:** workspace-событие — `event://account/<workspacePath>/<eventName>`; customer-событие — `event://crm/customer/event/<eventName>`. `getWorkspaceEventUrl(ctx, eventName)` — **асинхронная**, имя должно совпадать с `eventName` в `writeWorkspaceEvent`.

---

## Запись событий: captureCustomerEvent

Создаёт/обновляет карточку клиента в CRM + пишет событие в ClickHouse. **Только на сервере.**

```typescript
import { captureCustomerEvent, getCustomerEventUrl } from '@crm/sdk/v2'

const result = await captureCustomerEvent(ctx, {
  event: 'order_created',
  name: 'Создан заказ №123',
  contacts: [
    { type: 'email', value: 'user@mail.ru' },
    { type: 'phone', value: '+79001234567' },
  ],
  customer: { displayName: 'Иван Иванов', utm: { source: 'yandex', medium: 'cpc' } },
  payload: { orderId: '123' },
  metricEventData: { action_param1: 'Иван', action_param1_float: 1500.0, utm_source: 'yandex' },
})
```

### CaptureCustomerEventInput

| Поле | Тип | Обяз. | Описание |
|---|---|---|---|
| `event` | `string` | ✅ | ID события |
| `name` | `string` | — | Человекочитаемое название |
| `contacts` | `Array<{type, value} \| null \| undefined>` | ⚠️* | Контакты клиента |
| `appendUserContacts` | `string \| null` | ⚠️* | `userId` для подтягивания подтверждённых контактов |
| `customer` | `CustomerInput` | — | Данные карточки клиента |
| `linkRecords` | `Array<{heapType, id}>` | — | Привязка записей |
| `payload` | `Record<string, unknown>` | — | Произвольные данные (для автоматизаций) |
| **`metricEventData`** | `Partial<Omit<MetricEventData, 'url' \| 'funnel' \| 'funnel_node' \| 'funnel_node_from' \| 'customer_contacts'>>` | — | Поля метрики |

> \* Нужен хотя бы один контакт (`contacts` или `appendUserContacts`). Иначе `{ success: false, errorCode: 'no_contacts', errorMessage: 'No contacts provided' }`.

**Запрещённые типом поля в `metricEventData` (Omit, 5 полей):** `url` (формируется через `getCustomerEventUrl`), `funnel`, `funnel_node`, `funnel_node_from`, `customer_contacts` (передавайте через `contacts`). Поле **`action` разрешено** типом, но платформа его для customer-события не использует.

**Результат:** `{ success: true; customerIds; contactIds; recordIds }` | `{ success: false; errorCode; errorMessage }`.

Проверено runtime: `{type:'email', value:'...'}` создаёт customer+contact; без контактов → `errorCode: 'no_contacts'`; `appendUserContacts` работает при доступном `ctx.user.id`.

---

## Логи приложения → 050-logging.md

Технические логи (`ctx.account.log` → `chatium_ai.account_logs`) вынесены в отдельный документ: **[050-logging.md](050-logging.md)**. Там — чем логировать, чем это отличается от `ctx.console`, асинхронность записи, чтение через `queryAi`, фильтр по `workspace_path`, тип `ts64`, готовые запросы для страницы логов и частые ошибки.

Здесь остаётся всё, что касается **событий** (`access_log`) и аналитики.

---

## Чтение данных: queryAi

`queryAi` из `@traffic/sdk` — **единственный рабочий способ чтения ClickHouse** из workspace-кода. Сравнение с `gcQueryAi` (мультиаккаунтные приложения) — [016-analytics-traffic.md](016-analytics-traffic.md).

### ⚠️ Импорт только динамический

Модуля **нет** в `node_modules` и нет его декларации в `@app/types/modules.d.ts` — платформа внедряет его в рантайме. Статический импорт не резолвится, типов нет:

```typescript
// @ts-ignore — @traffic/sdk внедряется платформой, локальных типов нет
const { queryAi } = await import('@traffic/sdk')

const result = await queryAi(ctx, `
  SELECT toDate(dt) AS day, count() AS visits
  FROM chatium_ai.access_log
  WHERE dt >= subtractDays(today(), 7)
  GROUP BY day
  ORDER BY day
`)

return result.rows // Array<Record<string, any>>
```

Проверено прогоном: модуль отдаёт 19 экспортов — `queryAi`, `query`, `raw`, `filteredQueryAi`, `filterByDate`, `groupByDate`, `writeAccessLog` и другие. Только `SELECT`, никакого DDL.

**Подтверждённые таблицы** (проверены `queryAi`-запросами):

| Таблица | Кол-во колонок | Примечание |
|---|---|---|
| `chatium_ai.access_log` | 69 (в выборке `queryAi`; полная таблица шире — см. [038-metric.md](038-metric.md)) | Все задокументированные колонки существуют |
| `chatium_ai.behaviour2_log` | 19 | VIEW поведенческой аналитики |
| `chatium_ai.traffic_source_statistics` | ~25 | Расходы (может быть пуста) |
| `chatium_ai.account_logs` | ~39 | Логи приложения — см. [050-logging.md](050-logging.md) |

**Замеры:** простой `SELECT` — ~120 мс; выборка страницы с отдельным `count()` — ~230 мс.

---

## Система декларации событий

### getAccountEvents vs getWorkspaceEvents

```typescript
import { getAccountEvents, getWorkspaceEvents, getWorkspaceEventUrl } from '@start/sdk'
```

| Функция | Возвращает | Поле `type` |
|---|---|---|
| `getAccountEvents(ctx, workspacePath?)` | inline-объекты `{ name, url, description?, icon?, category?, type?, payloadMapping }` | **объявлено** в типах, но runtime **не заполняет** (всегда `undefined`) |
| `getWorkspaceEvents(ctx, workspacePath?)` | `EventDeclaration[]` | **нет** (ни в типах, ни в runtime) |

> ⚠️ **Расхождение типов и runtime:** TS объявляет `type?: 'customerEvent' \| 'workspaceEvent'` в возврате `getAccountEvents`, но в текущем runtime поле всегда `undefined`. Поля `type` **нет** в интерфейсе `EventDeclaration` (это возврат `getWorkspaceEvents`).

```typescript
interface EventDeclaration {
  name: string
  description?: string
  url: string
  icon?: string
  category?: string
  payloadMapping: Record<string, PayloadFieldMapping>
}

interface PayloadFieldMapping {
  title: string
  fieldName: string        // колонка ClickHouse: 'action_param1', 'action_param1_float', ...
  fieldExpr?: string       // JS-выражение для извлечения из Map/Array
  type?: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array' | 'any'
  description?: string
}
```

Регистрация событий для AI-агентов — через хук `@start/agent/events` (см. [016-analytics-workspace.md](016-analytics-workspace.md)).

---

## Структуры таблиц

### access_log

Колонки проверены runtime-запросами. В выборке `queryAi` — **69 колонок** (полная таблица шире: `hostname`, `auth_*`, `workspace_id`, `workspace_path`, `customer_contacts`, ~111 всего — см. [038-metric.md](038-metric.md)).

```sql
CREATE TABLE chatium_ai.access_log
(
    `uid` String,
    `url` String,
    `path` String,
    `domain` String,
    `referer` Nullable(String),
    `user_agent` Nullable(String),
    `ip` Nullable(String),
    `location_country` Nullable(String),
    `location_region` Nullable(String),
    `location_time_zone` Nullable(String),
    `location_city` Nullable(String),
    `location_coordinates_latitude` Nullable(Float32),
    `location_coordinates_longitude` Nullable(Float32),
    `device_name` Nullable(String),
    `os_name` Nullable(String),
    `request_type` String,
    `auth_id` Nullable(Int32),
    `account_type` String,
    `user_id` Nullable(String),
    `user_type` LowCardinality(String),
    `session_id` String,
    `ts` DateTime,
    `ts64` DateTime64(3),
    `dt` Date,
    `user_roles` Array(String),
    `user_first_name` Nullable(String),
    `user_last_name` Nullable(String),
    `user_phone` Nullable(String),
    `user_email` Nullable(String),
    `user_account_role` Nullable(String),
    `utm_source` Nullable(String),
    `utm_content` Nullable(String),
    `utm_medium` Nullable(String),
    `utm_campaign` Nullable(String),
    `utm_term` Nullable(String),
    `session_email` Nullable(String),
    `session_phone` Nullable(String),
    `ua_client_type` Nullable(String),
    `ua_client_name` Nullable(String),
    `ua_client_version` Nullable(String),
    `ua_device_type` Nullable(String),
    `ua_device_brand` Nullable(String),
    `ua_device_model` Nullable(String),
    `ua_os_name` Nullable(String),
    `ua_os_version` Nullable(String),
    `ua_os_platform` Nullable(String),
    `ua_bot_name` Nullable(String),
    `ua_bot_category` Nullable(String),
    `sid` Nullable(String),
    `sid_duration` Nullable(Int32),
    `title` Nullable(String),
    `screen_height` Nullable(Int16),
    `screen_width` Nullable(Int16),
    `screen_pixel_ratio` Nullable(Int8),
    `inferred_uid` Nullable(Bool),
    `inferred_sid` Nullable(Bool),
    `funnel` Nullable(String),
    `funnel_node` Nullable(String),
    `funnel_node_from` Nullable(String),
    `action` Nullable(String),
    `action_params` Nullable(String),
    `urlPath` String,
    `action_param1` Nullable(String),
    `action_param2` Nullable(String),
    `action_param3` Nullable(String),
    `action_param1_float` Nullable(Float32),
    `action_param2_float` Nullable(Float32),
    `action_param3_float` Nullable(Float32),
    `action_param4_float` Nullable(Float32),
    `action_param5_float` Nullable(Float32),
    `action_param6_float` Nullable(Float32),
    `action_param7_float` Nullable(Float32),
    `action_param8_float` Nullable(Float32),
    `action_param1_int` Nullable(Int32),
    `action_param2_int` Nullable(Int32),
    `action_param3_int` Nullable(Int32),
    `sign` Int8,
    `keys` Array(String),
    `values` Array(String),
    `action_param1_arrstr` Array(String),
    `action_param2_arrstr` Array(String),
    `action_param3_arrstr` Array(String),
    `action_param1_uint32arr` Array(UInt32),
    `gc_visit_id` Nullable(Int64),
    `gc_visitor_id` Nullable(Int64),
    `gc_session_id` Nullable(Int64),
    `param_clrt` String,
    `clrt_type` LowCardinality(String),
    `clrt_campaign_id` String,
    `clrt_ad_id` String,
    `clrt_run_id` UInt32,
    `action_param1_mapstrstr` Map(String, String),
    `action_param2_mapstrstr` Map(String, String),
    `resolved_user_id` String,
    `matched_traffic_source_ids` Array(String)
)
```

**Ключевые поля:** `uid` (посетитель), `url` (событие), `dt` (партиция — всегда фильтруйте), `resolved_user_id`/`matched_traffic_source_ids` (read-side), `customer_contacts` `Array(String)` (`["type:value", ...]`), `action_param1_mapstrstr` `Map`, `action_param8_float` (маркер Sender-событий `= 1`), `funnel`/`funnel_node`/`funnel_node_from`.

### behaviour2_log

VIEW, только чтение через `queryAi`. 19 колонок.

```sql
CREATE VIEW chatium_ai.behaviour2_log
(
    `version_ts` DateTime64(3),
    `ts64` DateTime64(3),
    `dt` Date,
    `clrt_run_id` UInt32,
    `browser_session_id` String,
    `browser_id_started_at` DateTime64(3),
    `url` String,
    `urlPath` String,
    `uid` String,
    `sid` String,
    `user_id` String,
    `user_type` LowCardinality(String),
    `gc_visit_id` Int64,
    `gc_visitor_id` Int64,
    `gc_session_id` Int64,
    `view_focused_duration` UInt32,
    `view_total_duration` UInt32,
    `mouse_distance` UInt32,
    `scroll_distance` UInt32,
    `click_counter` UInt32,
    `selection_length` UInt32,
    `resolved_user_id` String
)
```

`view_focused_duration` — время активного просмотра (мкс), `view_total_duration` — общее время на странице (мкс), `scroll_distance` — скролл (px), `click_counter` — кликов, `mouse_distance` — движение мыши (px).

### traffic_source_statistics

Расходы на рекламу, заполняется внешним модулем (в этой среде пуста; структура подтверждена).

| Поле | Тип | Описание |
|---|---|---|
| `dt` | `Date` | Дата статистики |
| `platform` | `String` | `YD` / `VK` / `Tg` / `Av` |
| `expense` | `Float64` | Расход в рублях |
| `clicks` | `UInt64` | Клики |
| `views` / `impressions` | `UInt64` | Показы |
| `traffic_source_id` | `String` | Технический ID источника |
| `action_param1_mapstrstr` | `Map(String, String)` | Метаданные (`campaign_name`, `ad_name`, …) |
| `is_deleted` | `Bool` | Маркер удаления (фильтруйте `is_deleted = 0`) |
| `utm_source` .. `utm_term` | `String` | UTM-метки |

### account_logs

Логи приложения. Полное описание — **[050-logging.md](050-logging.md)**: раскладка колонок при записи, обязательный фильтр по `workspace_path`, тип `ts64` (`DateTime64(3,'UTC')`), готовые запросы, неработающие `queryAccountLogs`/`listAccountLogs`.

---

## Расходы на рекламу и сквозная аналитика

### Связка через matched_traffic_source_ids (доверенный метод)

```sql
WITH
  events AS (
    SELECT dt, traffic_source_id,
      uniqExactIf(uid, url = '{lead_event_url}') AS leads,
      sumIf(coalesce(action_param1_float, 0), url = '{order_event_url}') AS revenue
    FROM chatium_ai.access_log
    ARRAY JOIN matched_traffic_source_ids AS traffic_source_id
    WHERE dt BETWEEN toDate('2026-01-01') AND toDate('2026-01-31')
      AND traffic_source_id != ''
    GROUP BY dt, traffic_source_id
  ),
  spend AS (
    SELECT dt, traffic_source_id, sum(expense) AS expense_rub
    FROM chatium_ai.traffic_source_statistics
    WHERE is_deleted = 0
      AND dt BETWEEN toDate('2026-01-01') AND toDate('2026-01-31')
    GROUP BY dt, traffic_source_id
  )
SELECT e.dt, e.traffic_source_id, e.leads, e.revenue, s.expense_rub,
  round(s.expense_rub / nullIf(e.leads, 0), 2) AS cac,
  round(e.revenue / nullIf(s.expense_rub, 0), 4) AS roas
FROM events e LEFT JOIN spend s ON s.dt = e.dt AND s.traffic_source_id = e.traffic_source_id
ORDER BY e.dt, s.expense_rub DESC
```

Если `matched_traffic_source_ids` пуст — fallback-связка по UTM-полям (помечайте такую аналитику как менее надёжную).

### Readable label для traffic_source_id

```sql
coalesce(
  nullIf(action_param1_mapstrstr['ad_name'], ''),
  nullIf(action_param1_mapstrstr['banner_name'], ''),
  nullIf(action_param1_mapstrstr['campaign_name'], ''),
  traffic_source_id
) AS source_label
```

`traffic_source_id` — технический ID (напр. `YD_12345_67890`); всегда показывайте читаемое название.

---

## Типы контактов (ContactType)

Экспортируется из `@crm/sdk/v2` (и `@crm/shared`). Проверено runtime — **11 литералов**:

```typescript
const ContactType = {
  Phone: 'phone', Email: 'email', UserId: 'user_id',
  TelegramId: 'telegram_id', TelegramUsername: 'telegram_username',
  MaxId: 'max_id', MaxUsername: 'max_username', VkId: 'vk_id',
  FacebookPsid: 'facebook_psid', InstagramUid: 'instagram_uid', Wazzup24Id: 'wazzup24_id',
}
```

> **`ok_id` отсутствует** — не используйте. Тип — `... | (string & {})`, поэтому `customer_contacts` в `writeWorkspaceEvent` (`any`) технически примет любую строку-тип, но канон — 11 значений выше.

**Фабрики контактов:** `emailContact('ivan@mail.ru')` → `{ type: 'email', value: 'ivan@mail.ru' }`; аналогично `phoneContact`, `telegramIdContact`, `telegramUsernameContact`, `facebookPsidContact`, `instagramUidContact`.

---

## Лучшие практики

**Выбор события:** форма/заказ/оплата/регистрация → `captureCustomerEvent` (нужна карточка CRM); браузерное действие (клик/скролл) → `writeWorkspaceEvent` (`captureCustomerEvent` недоступен на клиенте); одно событие с записью и регистрацией в разных проектах → `customerEvent` (`getCustomerEventUrl` глобальный).

**UID:** всегда передавайте `uid` — сервер `req.headers['x-chtm-uid']`, клиент `window.clrtUid`.

**Контакты:** передавайте `customer_contacts`/`contacts` всегда, когда известны, в формате `{ type, value }`.

**Фильтрация по `dt`:** всегда `WHERE dt >= subtractDays(today(), 30)` — `dt` это партиция.

**Производительность:** избегайте JOIN между таблицами (подзапросы); сначала агрегируйте (CTE с `GROUP BY`), потом `LEFT JOIN`.

**Метрика + детали:** если полей `MetricEventData` не хватает — детали в Heap-таблицу, в ClickHouse только метрику (см. [008-heap.md](008-heap.md)).

---

## Частые ошибки

### ❌ queryAccountLogs / listAccountLogs

```typescript
// ❌ НЕ РАБОТАЕТ — Method not found
import { queryAccountLogs } from '@app/ugc'
await queryAccountLogs(ctx, 'SELECT ...')

// ✅ РАБОТАЕТ
import { queryAi } from '@traffic/sdk'
await queryAi(ctx, 'SELECT ... FROM chatium_ai.account_logs ...')
```

### ❌ source/userId/extra_json в ctx.account.log

```typescript
// ❌ таких полей нет в LogParams
ctx.account.log('msg', { source: 'pay', userId: '123', extra_json: '{}' })
// ✅ используйте kv и json
ctx.account.log('msg', { level: 'info', kv: { source: 'pay', userId: '123' }, json: { orderId: 42 } })
```

### ❌ captureCustomerEvent без контактов

```typescript
// ❌ { success: false, errorCode: 'no_contacts' }
await captureCustomerEvent(ctx, { event: 'test' })
// ✅
await captureCustomerEvent(ctx, { event: 'test', contacts: [{ type: 'email', value: 'user@mail.ru' }] })
```

### ❌ Запрещённые поля в metricEventData (captureCustomerEvent)

```typescript
// ❌ url, funnel, funnel_node, funnel_node_from, customer_contacts — запрещены типом
metricEventData: { url: '...', funnel: '...' }
// ✅
metricEventData: { action_param1: 'Иван', action_param1_float: 1500, utm_source: 'yandex' }
```

### ❌ captureCustomerEvent на клиенте

```typescript
// ❌ на клиенте не работает
captureCustomerEvent(ctx, { event: 'click', contacts: [...] })
// ✅ writeWorkspaceEvent (API унифицирован)
writeWorkspaceEvent(ctx, 'button_clicked', { action_param1: 'cta_button' })
```

### ❌ Прямой INSERT / DDL

`queryAi` поддерживает только SELECT. Запись — только через SDK (`writeMetricEvent`/`writeWorkspaceEvent`/`captureCustomerEvent`).

### ❌ Пропуск `action_param8_float = 1` в Sender-событиях

Маркер актуального формата Sender-событий — без фильтра в выборку попадёт устаревший формат.

---

## Результаты runtime-верификации

Проверено прямым запуском SDK-функций и `queryAi`-запросами (workspace `/temp/qna1807`, хост `s.chtm.aley.pro`), 2026-07-18.

### ✅ Работает

| Функция | Модуль |
|---|---|
| `writeMetricEvent(ctx, data)` | `@app/metric` (dynamic import в sandbox) |
| `writeWorkspaceEvent(ctx, name, data)` | `@start/sdk` |
| `getAccountEvents` / `getWorkspaceEvents` / `getWorkspaceEventUrl` | `@start/sdk` |
| `captureCustomerEvent` / `getCustomerEventUrl` | `@crm/sdk/v2` |
| `queryAi(ctx, sql)` | `@traffic/sdk` |
| `ctx.account.log(msg?, params?)` | метод ctx |
| `ContactType` + фабрики контактов | `@crm/sdk/v2` |

### ❌ Не работает (расхождение с типами)

| Функция | Модуль | Ошибка |
|---|---|---|
| `queryAccountLogs(ctx, sql)` | `@app/ugc` | `Method not found (from sysCall 'ugc.queryAccountLogs')` |
| `listAccountLogs(ctx, opts?)` | `@app/ugc` | `Method not found (from sysCall 'ugc.listAccountLogs')` |

### ⚠️ Расхождение типов и runtime

| Утверждение | Типы | Runtime |
|---|---|---|
| `getAccountEvents` возвращает `type?: 'customerEvent' \| 'workspaceEvent'` | ✅ объявлено | ❌ всегда `undefined` |
| `MetricEventData` доступен как значение из `@app/metric` | ✅ type-only | ❌ только `import type` |

### 📊 Проверенные колонки ClickHouse

`access_log` — 69 (выборка `queryAi`), `behaviour2_log` — 19, `traffic_source_statistics` — ~25 (данных нет), `account_logs` — ~39 (ключевые: `ts64`, `level`, `msg`, `kv`, `json_str`, `extra_json`).

---

**Версия:** 2.0 (runtime-верифицированная)
**Дата:** 2026-07-18
**Источник:** synced `qna1807/clickhouse-corrected.md` (runtime-верификация пользователем: `queryAi`, `writeWorkspaceEvent`, `captureCustomerEvent`, `ctx.account.log`, `getAccountEvents`, `getCustomerEventUrl`; хост `s.chtm.aley.pro`)
