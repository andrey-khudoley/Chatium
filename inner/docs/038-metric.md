@chatium

# Модуль @app/metric: Метрики и события платформы

Краткий справочник по модулю `@app/metric` — запись метрик в ClickHouse (таблица `chatium_ai.access_log`), подписка на события метрик, десериализация записей.

**Источник типов:** `node_modules/@app/metric/index.d.ts`

---

## Содержание

- [Назначение](#назначение)
- [Основные экспорты](#основные-экспорты)
- [Детальное описание функций](#детальное-описание-функций)
- [Экспортируемые типы](#экспортируемые-типы)
- [ClickHouse: таблица назначения](#clickhouse-таблица-назначения)
- [Связанные документы](#связанные-документы)
- [Чеклист расхождений с устаревшей документацией](#чеклист-расхождений-с-устаревшей-документацией)

---

## Назначение

**@app/metric** — низкоуровневый API платформы для записи метрик (pageview, произвольные события), управления подписками на события метрик (`subscribeToMetricEvents`) и десериализации записей. Все записи попадают в таблицу `chatium_ai.access_log` в ClickHouse (БД `chatium_ai`). Чтение — через `queryAi` из `@traffic/sdk`.

---

## Основные экспорты

### Актуальные функции (рекомендуемые)

| Функция | Описание |
|---------|----------|
| `prepareMetricEvent(ctx, rewrite?)` | Подготовить объект `MetricEventData` из контекста, опционально перезаписывая поля |
| `writeMetricEvent(ctx, data?)` | Подготовить + записать метрику в access_log (один вызов) |
| `prepareAppHostMetricEvent(ctx, data?)` | То же, но для контекста хоста приложения |
| `writeAppHostMetricEvent(ctx, data?)` | Подготовить + записать метрику хоста в access_log |
| `subscribeToMetricEvents(ctx, subscriptions, groupKey?)` | Подписаться на события метрик по URL-путям |
| `unsubscribeFromMetricEventsGroup(ctx, groupKey)` | Отписаться от группы подписок |
| `unsubscribeFromMetricEvents(ctx, urlPaths)` | Отписаться от конкретных URL-путей |
| `deserializeMetricEventRecord(event)` | Десериализовать `MetricEventJson` в `MetricEventRecord` |

### Устаревшие алиасы (deprecated)

| Старое название | Рекомендуемая замена | Статус |
|-----------------|----------------------|--------|
| `prepareAccessLog(ctx, rewrite?)` | `prepareMetricEvent(ctx, rewrite?)` | **@deprecated** — функциональный алиас |
| `writeAccessLog(ctx, data?)` | `writeMetricEvent(ctx, data?)` | **@deprecated** — функциональный алиас |
| `prepareAppHostAccessLog(ctx, data?)` | `prepareAppHostMetricEvent(ctx, data?)` | **@deprecated** — функциональный алиас |
| `writeAppHostAccessLog(ctx, data?)` | `writeAppHostMetricEvent(ctx, data?)` | **@deprecated** — функциональный алиас |
| `writeEventLog(ctx, model, data?)` | `writeMetricEvent(ctx, data?)` | **@deprecated noop** — НЕ ПИШЕТ данные |
| `writeAppHostEventLog(ctx, model, data?)` | `writeAppHostMetricEvent(ctx, data?)` | **@deprecated noop** — НЕ ПИШЕТ данные |

> ⚠️ **ВАЖНО:** `writeEventLog` и `writeAppHostEventLog` — **deprecated noop**. Они не записывают никаких данных, а лишь возвращают `void`. **Не используйте их** — вызов не имеет никакого эффекта. Для записи событий используйте `writeMetricEvent` / `writeAppHostMetricEvent`.
>
> Алиасы `prepareAccessLog` / `writeAccessLog` / `prepareAppHostAccessLog` / `writeAppHostAccessLog` помечены **@deprecated** и работоспособны (пишут в ту же таблицу), но в новом коде используйте рекомендуемые замены `prepareMetricEvent` / `writeMetricEvent` / `prepareAppHostMetricEvent` / `writeAppHostMetricEvent`.

---

## Детальное описание функций

### `prepareMetricEvent(ctx, rewrite?)`

```typescript
declare function prepareMetricEvent(
  ctx: RichUgcCtx,
  rewrite?: UgcAppMetricEventData
): Promise<MetricEventData>
```

Собирает объект метрики из контекста запроса: URL, IP, user-agent, данные пользователя, UTM-метки и т.д. Параметр `rewrite` позволяет перезаписать любые поля результирующего объекта.

**Возвращает:** `MetricEventData` — готовый объект для записи.

### `writeMetricEvent(ctx, data?)`

```typescript
declare function writeMetricEvent(
  ctx: RichUgcCtx,
  data?: UgcAppMetricEventData
): Promise<MetricEventData>
```

Вызывает `prepareMetricEvent`, объединяет с переданным `data` и записывает результат в таблицу `chatium_ai.access_log`. Это основной способ записи произвольного события.

**Возвращает:** `MetricEventData` — записанный объект (ту же структуру, что и prepareMetricEvent).

**Пример:**
```typescript
import { writeMetricEvent } from '@app/metric'

await writeMetricEvent(ctx, {
  action: 'form_submitted',
  action_param1: name,
  action_param2: email,
  action_param1_int: 42,
  action_param1_float: 99.9,
  utm_source: 'google',
})
```

**Назначение `UgcAppMetricEventData`:**

```typescript
type UgcAppMetricEventData = Partial<
  Omit<MetricEventData, 'account' | 'workspace_id' | 'workspace_path'>
>
```

Можно передать любые поля из `MetricEventData`, **кроме** `account`, `workspace_id` и `workspace_path` (они заполняются автоматически из контекста).

### `prepareAppHostMetricEvent(ctx, data?)` / `writeAppHostMetricEvent(ctx, data?)`

Аналоги `prepareMetricEvent` / `writeMetricEvent`, но для контекста хоста приложения (app-host). Используются при работе с встроенными страницами платформы.

```typescript
declare function prepareAppHostMetricEvent(
  ctx: RichUgcCtx,
  data?: UgcAppMetricEventData
): Promise<MetricEventData>

declare function writeAppHostMetricEvent(
  ctx: RichUgcCtx,
  data?: UgcAppMetricEventData
): Promise<MetricEventData>
```

### `subscribeToMetricEvents(ctx, subscriptions, groupKey?)`

```typescript
declare function subscribeToMetricEvents<P extends JSONInputValue = JSONInputValue>(
  ctx: RichUgcCtx,
  subscriptions: string[] | Record<string, P>,
  groupKey?: string | null
): Promise<void>
```

Подписывается на события метрик. Параметры:
- **`subscriptions`** — массив URL-путей (`string[]`) для подписки, **либо** объект `Record<string, P>`, где ключи — URL-пути, а значения — произвольные параметры (JSON)
- **`groupKey`** (опционально) — ключ группы. Если передан, старые подписки с тем же `groupKey`, отсутствующие в новом списке, автоматически удаляются

**Возвращает:** `Promise<void>` (не возвращает группу — группа задаётся через параметр `groupKey`).

Обработка подписанных событий производится через хук `app.accountHook('metric-event', ...)` в другом модуле.

### `unsubscribeFromMetricEventsGroup(ctx, groupKey)`

```typescript
declare function unsubscribeFromMetricEventsGroup(
  ctx: RichUgcCtx,
  groupKey: string
): Promise<void>
```

Удаляет все подписки, зарегистрированные с указанным `groupKey`.

### `unsubscribeFromMetricEvents(ctx, urlPaths)`

```typescript
declare function unsubscribeFromMetricEvents(
  ctx: RichUgcCtx,
  urlPaths: string[] | string
): Promise<void>
```

Удаляет подписку на конкретный URL-путь (или массив путей).

### `deserializeMetricEventRecord(event)`

```typescript
// re-exported from @app/types/internal
export { deserializeMetricEventRecord } from '@app/types/internal'

declare function deserializeEvent(event: MetricEventJson): MetricEventRecord
```

Преобразует сериализованное событие в формате `MetricEventJson` в плоскую запись `MetricEventRecord`. Используется при обработке событий из Kafka / очередей.

---

## Экспортируемые типы

Типы реэкспортируются из `@app/types/internal` и являются **type-only**: в runtime их значений не существует, они доступны только для TypeScript. Импортировать их следует через `import type`.

| Тип | Описание |
|-----|----------|
| `MetricEventData` | Высокоуровневый объект события (вход/выход `writeMetricEvent`) |
| `MetricEventRecord` | Плоская запись для ClickHouse (колонка → значение) |
| `MetricEventJson` | Сериализованная версия `MetricEventRecord` со строковыми timestamp'ами |
| `UgcAppMetricEventData` | Тип параметра для `writeMetricEvent` / `prepareMetricEvent`: `Partial<Omit<MetricEventData, 'account' \| 'workspace_id' \| 'workspace_path'>>` |
| `MetricEventHook` | Тип функции-хука для обработки событий |
| `MetricEventHookPayload` | Объект, передаваемый в хук: `{ event: MetricEventRecord, params: JSONValue, groupKey: string \| null }` |

> ⚠️ Типы `MetricEventData`, `MetricEventRecord`, `MetricEventJson` — **type-only** (реэкспорт из `@app/types/internal`, в runtime значений нет). Используйте только `import type`, не `import`.

---

## ClickHouse: таблица назначения

Все вызовы `writeMetricEvent`, `writeAppHostMetricEvent`, deprecated-алиасы `writeAccessLog` / `writeAppHostAccessLog` пишут в **одну таблицу**:

- **БД:** `chatium_ai`
- **Таблица:** `access_log`
- **Количество колонок:** ~111

### Основные группы колонок

| Категория | Примеры колонок |
|-----------|-----------------|
| Идентификация | `uid`, `url`, `path`, `domain`, `hostname`, `ip`, `sid`, `session_id` |
| Пользователь | `user_id`, `user_type`, `user_first_name`, `user_last_name`, `user_phone`, `user_email`, `user_account_role` |
| Аутентификация | `auth_id`, `auth_type`, `auth_key`, `auth_first_name`, `auth_last_name` |
| Технические | `request_type`, `ts`, `ts64`, `dt`, `sign`, `referer`, `user_agent` |
| UTM / трафик | `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `param_clrt`, `clrt_type` |
| Событие | `action`, `action_params`, `action_param1`, `action_param2`, `action_param3` |
| Числовые параметры | `action_param1_int`–`action_param3_int`, `action_param1_float`–`action_param8_float` |
| Массивы | `action_param1_arrstr`–`action_param3_arrstr`, `action_param1_uint32arr` |
| Map | `action_param1_mapstrstr`, `action_param2_mapstrstr` |
| Контакты клиента | `customer_contacts` (`Array(String)`) |
| Геолокация | `location_country`, `location_city`, `location_region`, `location_time_zone` |
| Рабочее пространство | `workspace_id`, `workspace_path`, `resolved_user_id` |

**Чтение:** через `queryAi` из `@traffic/sdk`:

```typescript
import { queryAi } from '@traffic/sdk'

const result = await queryAi(ctx, `
  SELECT action, action_param1, action_param2, ts64
  FROM chatium_ai.access_log
  WHERE action = 'form_submitted'
  ORDER BY ts64 DESC
  LIMIT 10
`)
// result.rows — массив записей
```

---

## Связанные документы

- [049-clickhouse.md](049-clickhouse.md) — ClickHouse: полная структура MetricEventData/access_log, запись через writeMetricEvent, чтение через queryAi, частые ошибки
- [016-analytics-workspace.md](016-analytics-workspace.md) — writeWorkspaceEvent, события workspace
- [021-getcourse-events.md](021-getcourse-events.md) — subscribeToMetricEvents, metric-event хук
- [025-app-modules.md](025-app-modules.md) — сводка по модулям @app

---

## Чеклист расхождений с устаревшей документацией

При обновлении или редактировании старых версий документа учитывайте:

| № | Что было неверно / неточно | Исправление |
|---|---------------------------|-------------|
| 1 | `writeEventLog` и `writeAppHostEventLog` описаны как рабочие функции записи событийного лога | **deprecated noop** — не пишут никаких данных, возвращают `void` |
| 2 | `prepareAccessLog`/`writeAccessLog`/`*AppHost*` описаны как основные API | Помечены **@deprecated**, рекомендуется `prepareMetricEvent`/`writeMetricEvent`/`prepareAppHostMetricEvent`/`writeAppHostMetricEvent` |
| 3 | `subscribeToMetricEvents(ctx, options)` — не указаны точные типы параметров и возврат | Сигнатура: `(ctx, subscriptions: string[] \| Record<string, P>, groupKey?: string \| null): Promise<void>` — группа задаётся через `groupKey`, не возвращается |
| 4 | `MetricEventJson` не указан среди экспортируемых типов | `MetricEventJson`, `UgcAppMetricEventData`, `MetricEventHook`, `MetricEventHookPayload` также экспортируются; все — **type-only** (`import type`) |
| 5 | Не указана БД ClickHouse | Таблица: `chatium_ai.access_log` (БД `chatium_ai`), ~111 колонок; чтение через `queryAi` из `@traffic/sdk` |

---

> **Статус документа:** runtime-верифицировано 2026-07-18 (факты подтверждены прямым запуском в runtime).
> **Источник типов:** `node_modules/@app/metric/index.d.ts`
