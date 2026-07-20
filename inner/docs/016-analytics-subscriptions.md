@chatium

# Система подписок на события

Руководство по реализации подписок на события через `subscribeToMetricEvents` и обработке через хук `metric-event`. Все сигнатуры и утверждения ниже сверены с runtime (см. футер).

## Содержание

- [Основные концепции](#основные-концепции)
- [Модули и импорты](#модули-и-импорты)
- [Подписка на события — subscribeToMetricEvents](#подписка-на-события--subscribetometricevents)
- [Хук metric-event](#хук-metric-event)
- [MetricEventRecord — структура события](#metriceventrecord--структура-события)
- [Формат URL событий и префикс](#формат-url-событий-и-префикс)
- [Проект Events Subscribe](#проект-events-subscribe)
- [Управление подписками через Heap](#управление-подписками-через-heap)
- [WebSocket мониторинг](#websocket-мониторинг)
- [SDK для чтения ClickHouse (queryAi / gcQueryAi)](#sdk-для-чтения-clickhouse-queryai--gcqueryai)
- [Отложенные задачи (app.job)](#отложенные-задачи-appjob)
- [Логирование ctx.account.log](#логирование-ctxaccountlog)
- [Практические примеры](#практические-примеры)
- [Troubleshooting](#troubleshooting)
- [Сводка runtime-исправлений](#сводка-runtime-исправлений)

---

## Основные концепции

**Система подписок** позволяет получать уведомления о событиях из GetCourse и других источников в режиме реального времени.

### Два подхода к подпискам

#### 1. Встроенный Chatium (subscribeToMetricEvents + хук metric-event)

```typescript
import { subscribeToMetricEvents } from '@app/metric'

// Подписка на события
await subscribeToMetricEvents(ctx, ['event://getcourse/user/created'])

// Обработка через хук — payload содержит event/params/groupKey
app.accountHook('metric-event', async (ctx, payload) => {
  ctx.account.log('Metric event received', {
    level: 'info',
    json: { eventUrl: payload.event.url, groupKey: payload.groupKey }
  })
})
```

**Статус (runtime):** ✅ Подписка и хук **регистрируются и срабатывают** — хук успешно вызывается в runtime-тестах. Однако **стабильность доставки GetCourse-событий** может варьироваться в зависимости от конфигурации аккаунта. Рекомендуется использовать хук как дополнительный механизм, а надёжную доставку строить на подходе №2 (Heap + опрос ClickHouse).

> ⚠️ Прежняя версия документа утверждала, что хук «не работает» и получает `{ event }` с полем `event.urlPath`. Это неверно: хук получает единый `payload` с полями `event`, `params`, `groupKey`, а в событии поле называется **`url`**, а не `urlPath` (подробнее ниже).

#### 2. Через Heap таблицу + опрос ClickHouse (Events Subscribe проект)

```typescript
// Сохранение подписок в Heap
await Subscriptions.create(ctx, {
  userId: ctx.user.id,
  eventType: 'getcourse',
  eventName: 'user/created',
  isActive: true
})

// Мониторинг через Job + чтение ClickHouse + WebSocket
export const monitorJob = app.job('/', async (ctx, params) => {
  const result = await queryAi(ctx, query) // queryAi возвращает { rows: [...] }
  await sendDataToSocket(ctx, params.socketId, { type: 'events', data: result.rows })
})
```

**Статус:** ✅ **Работает** — реализовано в `dev/events-subscribe`. Это рекомендуемый надёжный вариант для продакшена.

---

## Модули и импорты

Все перечисленные модули **доступны** и **импортируются** без ошибок как на уровне типов (.d.ts, если есть), так и в runtime:

| Модуль | Импорт | Статус |
| --- | --- | --- |
| `@app/metric` | `import { subscribeToMetricEvents, unsubscribeFromMetricEvents, unsubscribeFromMetricEventsGroup } from '@app/metric'` | ✅ |
| `@app/socket` | `import { sendDataToSocket, genSocketId, getOrCreateBrowserSocketClient } from '@app/socket'` | ✅ |
| `@app/auth` | `import { requireRealUser, requireAccountRole, requireAnyUser } from '@app/auth'` | ✅ |
| `@app/jobs` | `import { cancelScheduledJob } from '@app/jobs'` | ✅ |
| `@traffic/sdk` | `import { queryAi } from '@traffic/sdk'` | ✅ (runtime; ambient-модуль без .d.ts) |
| `@gc-mcp-server/sdk` | `import { gcQueryAi } from '@gc-mcp-server/sdk'` | ✅ (runtime; .d.ts в node_modules отсутствует) |

> ⚠️ `sendDataToSocket` и `genSocketId` импортируются из **`@app/socket`**, НЕ из `@start/sdk` — в `@start/sdk` их нет.

---

## Подписка на события — subscribeToMetricEvents

### Сигнатура (runtime-верифицирована)

```typescript
import { subscribeToMetricEvents } from '@app/metric'

// Из @app/metric/index.d.ts:
async function subscribeToMetricEvents<P extends JSONInputValue = JSONInputValue>(
  ctx: RichUgcCtx,
  subscriptions: string[] | Record<string, P>,
  groupKey?: string | null,
): Promise<void>
```

**Параметры:**

- `ctx` — контекст.
- `subscriptions` — массив URL-строк событий **ИЛИ** `Record<url, params>` для передачи параметров на каждую подписку.
- `groupKey` — опциональная строка для группировки подписок (позволяет отписаться от всей группы сразу через `unsubscribeFromMetricEventsGroup`).

### Форматы subscriptions

```typescript
// Массив строк
await subscribeToMetricEvents(ctx, ['event://getcourse/user/created'])

// Несколько событий
await subscribeToMetricEvents(ctx, [
  'event://getcourse/user/created',
  'event://getcourse/deal/created',
  'event://getcourse/order/created'
])

// Record с параметрами на каждую подписку
await subscribeToMetricEvents(ctx, {
  'event://getcourse/user/updated': { notify: true },
  'event://getcourse/deal/updated': { notify: false }
})

// С groupKey (для групповой отписки)
await subscribeToMetricEvents(ctx, ['event://getcourse/user/created'], 'my-sync-group')
```

### unsubscribeFromMetricEvents

```typescript
import { unsubscribeFromMetricEvents } from '@app/metric'

// Сигнатура — принимает строку ИЛИ массив строк:
async function unsubscribeFromMetricEvents(ctx: RichUgcCtx, urlPaths: string[] | string): Promise<void>
```

```typescript
// Отписка от одного события
await unsubscribeFromMetricEvents(ctx, 'event://getcourse/user/created')

// Отписка от нескольких
await unsubscribeFromMetricEvents(ctx, [
  'event://getcourse/deal/created',
  'event://getcourse/order/created'
])
```

### unsubscribeFromMetricEventsGroup

```typescript
import { unsubscribeFromMetricEventsGroup } from '@app/metric'

// Сигнатура:
async function unsubscribeFromMetricEventsGroup(ctx: RichUgcCtx, groupKey: string): Promise<void>
```

Отписывает от всех подписок, созданных с указанным `groupKey`. Функция существует в `@app/metric` (в прежней документации не была описана).

### Пример роутов подписки/отписки

```typescript
import { subscribeToMetricEvents, unsubscribeFromMetricEvents } from '@app/metric'

// Подписка на несколько событий
export const apiEnableAllSync = app.post('/enable-all', async (ctx) => {
  await subscribeToMetricEvents(ctx, [
    'event://getcourse/user/created',
    'event://getcourse/user/updated',
    'event://getcourse/deal/created',
    'event://getcourse/order/created'
  ])
  return { success: true }
})

// Отписка
export const apiDisableSync = app.post('/disable-sync', async (ctx) => {
  await unsubscribeFromMetricEvents(ctx, 'event://getcourse/user/created')
  return { success: true }
})
```

### Поддерживаемые события GetCourse (примеры urlPath)

```typescript
const supportedEvents = [
  'event://getcourse/user/created',
  'event://getcourse/user/updated',
  'event://getcourse/deal/created',
  'event://getcourse/deal/updated',
  'event://getcourse/order/created',
  'event://getcourse/order/updated',
  'event://getcourse/message/sent',
  'event://getcourse/message/viewed',
  'event://getcourse/form/sent',
  'event://getcourse/user/chatbot/vk_enabled'
]
```

---

## Хук metric-event

### Регистрация (runtime-верифицирована)

```typescript
// api/analytics.ts — файл должен быть импортирован в index.tsx для регистрации хука

app.accountHook('metric-event', async (ctx, payload) => {
  // payload: MetricEventHookPayload — три поля, не только event!
  const { event, params, groupKey } = payload

  ctx.account.log('Metric event received', {
    level: 'info',
    json: { eventUrl: event.url, groupKey }
  })

  if (event.url.includes('event://getcourse/user/created')) {
    await handleUserCreated(ctx, event)
  }
})
```

### Типы хука

```typescript
// Точная сигнатура (из @app/types/internal):
type MetricEventHook = (ctx: RichUgcCtx, payload: MetricEventHookPayload) => Promise<void>

interface MetricEventHookPayload {
  event: MetricEventRecord
  params: JSONValue
  groupKey: string | null
}
```

> ⚠️ **Важно (исправлено против прежней версии):**
> - Хук получает **единый `payload`** с полями `event`, `params`, `groupKey`, а не деструктуризацию `{ event }`.
> - В событии поле события называется **`url`**, а НЕ `urlPath`.
> - Правильно: `(ctx, payload) => { payload.event.url }`.
> - Неправильно: `(ctx, { event }) => { event.urlPath }`.

---

## MetricEventRecord — структура события

```typescript
interface MetricEventRecord {
  // ⚠️ Поле называется url, НЕ urlPath!
  url: string // Полный URL события (с автоматическим префиксом, см. ниже)

  // Поля пользователя — на верхнем уровне (не вложены)
  user_id?: string
  user_email?: string
  user_first_name?: string
  user_last_name?: string
  user_phone?: string

  // Другие поля
  uid?: string // UID сессии
  action?: string | null // Действие
  action_param1?: string | null
  action_param2?: string | null
  action_param3?: string | null
  customer_contacts?: string[]
  session?: string
  hostname?: string
  // ... и другие поля
}
```

### Соответствие полей ClickHouse `access_log` (runtime-верифицировано)

| Поле | Тип в ClickHouse | Статус |
| --- | --- | --- |
| `url` | `String` | ✅ Основное поле |
| `urlPath` | `String` | ✅ Существует, дублирует `url` в event-режиме |
| `user_id` | `Nullable(String)` | ✅ |
| `user_email` | `Nullable(String)` | ✅ |
| `user_first_name` | `Nullable(String)` | ✅ |
| `user_last_name` | `Nullable(String)` | ✅ |
| `user_phone` | `Nullable(String)` | ✅ |
| `uid` | `String` | ✅ |
| `action` | `Nullable(String)` | ✅ (по умолчанию **NULL**, не `'pageview'`) |
| `action_param1` | `Nullable(String)` | ✅ |
| `customer_contacts` | `Array(String)` | ✅ |
| `ts` | `DateTime` | ✅ |
| `dt` | `Date` | ✅ |

> ⚠️ **Заполнение полей `user_*`:** через `writeMetricEvent` поля `user_*` **НЕ заполняются из параметров события** — они берутся из контекста HTTP-запроса (авторизованного пользователя). Чтобы передать собственные данные через событие, используйте `action_param1`–`action_param3` или `writeWorkspaceEvent`. Подробнее о `writeMetricEvent`/метриках — см. `038-metric.md`.

### Сравнение writeMetricEvent vs writeWorkspaceEvent

| Характеристика | `writeMetricEvent` (`@app/metric`) | `writeWorkspaceEvent` (`@start/sdk`) |
| --- | --- | --- |
| URL-префикс | ✅ Добавляется автоматически | ✅ Добавляется автоматически |
| `user_email`/`user_id` | Из HTTP-контекста | Из HTTP-контекста |
| `action_param1`–3 | ✅ | ✅ |
| `customer_contacts` | ✅ | ✅ |
| Применимость | Любые метрические события | События воркспейса |

---

## Формат URL событий и префикс

При записи через `writeMetricEvent(ctx, { url: 'event://getcourse/user/created' })` в ClickHouse сохраняется:

```
event://account/event://getcourse/user/created
```

Платформа **автоматически добавляет префикс** `event://account/` к URL. Это нужно учитывать при фильтрации в SQL:

```sql
-- Искать по полному URL (с учётом префикса) — надёжнее через LIKE
SELECT * FROM chatium_ai.access_log
WHERE url LIKE '%event://getcourse/user/created%'
  AND dt >= today() - 1
```

> ⚠️ Прежняя версия предполагала точное равенство `urlPath = 'event://getcourse/{eventName}'`. Из-за автопрефикса точное сравнение по «чистому» URL не сработает — используйте `LIKE '%...%'` либо сравнение по полному URL с префиксом. Структура таблицы `access_log` — см. `049-clickhouse.md`.

---

## Проект Events Subscribe

Полнофункциональная система подписок, реализованная в `dev/events-subscribe`.

### Архитектура

```
Пользователь
    ↓
Heap таблица подписок (subscriptions)
    ↓
Job-монитор (app.job('/'), рекурсивный self-reschedule каждые 10–15 сек)
    ↓
SQL-запросы к ClickHouse через queryAi (@traffic/sdk)
    ↓
WebSocket (sendDataToSocket)
    ↓
Браузер пользователя (real-time)
```

### Таблица подписок (Heap)

```json
{
  "name": "event_subscriptions",
  "title": "Подписки на события",
  "fields": [
    { "name": "userId", "kind": "UserRefLinkKind", "title": "Пользователь" },
    { "name": "eventType", "kind": "StringKind", "title": "Тип события" },
    { "name": "eventName", "kind": "StringKind", "title": "Название события" },
    { "name": "isActive", "kind": "BooleanKind", "title": "Активна" }
  ]
}
```

`eventType` принимает значения `'traffic'` или `'getcourse'`; `eventName` — например `'pageview'`, `'user/created'` и т.д.

---

## Управление подписками через Heap

### Создание/активация подписки

```typescript
import Subscriptions from './tables/event_subscriptions.table'

const existing = await Subscriptions.findOneBy(ctx, {
  userId: ctx.user.id,
  eventType: 'getcourse',
  eventName: 'user/created'
})

if (existing) {
  await Subscriptions.update(ctx, { id: existing.id, isActive: true })
} else {
  await Subscriptions.create(ctx, {
    userId: ctx.user.id,
    eventType: 'getcourse',
    eventName: 'user/created',
    isActive: true
  })
}
```

### Получение активных подписок

```typescript
const activeSubscriptions = await Subscriptions.findAll(ctx, {
  where: { userId: ctx.user.id, isActive: true },
  limit: 100
})
```

---

## WebSocket мониторинг

Все функции экспортируются из **`@app/socket`** (НЕ из `@start/sdk`).

### sendDataToSocket (сервер)

```typescript
import { sendDataToSocket } from '@app/socket'

// Два оверлоада:
async function sendDataToSocket(ctx: RichUgcCtx, unencodedSocketId: string, data: JSONInputValue): Promise<void>
async function sendDataToSocket(unencodedSocketId: string, data: JSONInputValue): Promise<void>
```

> ⚠️ Второй параметр — **незакодированный** socket ID (raw string). На клиент передавайте закодированный ID из `genSocketId`.

### genSocketId (сервер)

```typescript
import { genSocketId } from '@app/socket'

// Два оверлоада:
async function genSocketId(ctx: RichUgcCtx, unencodedSocketId: string): Promise<string>
async function genSocketId(unencodedSocketId: string): Promise<string>
```

Возвращает закодированный socket ID формата `"rawId:number"` (например `"my-socket-123:4533"`). Именно закодированный ID передаётся на клиент для подписки.

### getOrCreateBrowserSocketClient (клиент)

```typescript
import { getOrCreateBrowserSocketClient } from '@app/socket'

async function getOrCreateBrowserSocketClient(options?: { baseUrl?: string }): Promise<SocketClient>
```

### Полный паттерн Server → Client

```typescript
// === СЕРВЕР (api/start-monitoring.ts) ===
import { sendDataToSocket, genSocketId } from '@app/socket'
import { monitorJob } from '../jobs/monitor'

export const apiStartRoute = app.post('/', async (ctx) => {
  requireRealUser(ctx)

  const rawSocketId = `events-monitor-${ctx.user.id}`
  const encodedSocketId = await genSocketId(ctx, rawSocketId)

  // Джобе передаём raw ID (для отправки), клиенту — encoded
  await monitorJob.scheduleJobAsap(ctx, {
    userId: ctx.user.id,
    socketId: rawSocketId
  })

  return { success: true, socketId: encodedSocketId }
})
```

```vue
<!-- === КЛИЕНТ (Vue) === -->
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getOrCreateBrowserSocketClient } from '@app/socket'
import { apiStartRoute } from '../api/start-monitoring'

const events = ref<any[]>([])

onMounted(async () => {
  const { socketId } = await apiStartRoute.run(ctx)
  const socket = await getOrCreateBrowserSocketClient()
  const subs = socket.subscribeToData(socketId)

  subs.listen((msg: any) => {
    if (msg.type === 'events') {
      events.value.unshift(...msg.data)
      if (events.value.length > 100) events.value = events.value.slice(0, 100)
    }
  })
})
</script>
```

---

## SDK для чтения ClickHouse (queryAi / gcQueryAi)

Есть два SDK для работы с ClickHouse — **они возвращают разное**, это критично.

### queryAi (@traffic/sdk) — читает данные

```typescript
import { queryAi } from '@traffic/sdk'

// Сигнатура (runtime):
function queryAi(ctx: RichUgcCtx, sql: string): Promise<{ rows: Record<string, any>[] }>
```

Возвращает объект со свойством `rows` — массив объектов-строк. **Это то, что нужно для чтения событий.**

```typescript
const result = await queryAi(ctx, 'SELECT url, action, ts FROM chatium_ai.access_log LIMIT 5')
// result.rows = [{ url: '...', action: null, ts: '2026-07-18 12:00:00' }, ...]
```

### gcQueryAi (@gc-mcp-server/sdk) — выполняет SQL, строки НЕ возвращает

```typescript
import { gcQueryAi } from '@gc-mcp-server/sdk'

// Сигнатура (runtime-верифицирована):
function gcQueryAi(ctx: RichUgcCtx, query: string): Promise<{ success: boolean; error?: string }>
```

| Характеристика | `queryAi` (`@traffic/sdk`) | `gcQueryAi` (`@gc-mcp-server/sdk`) |
| --- | --- | --- |
| Тип возврата | `{ rows: [...] }` | `{ success: boolean; error?: string }` |
| Назначение | Чтение данных ClickHouse | Выполнение SQL (результат напрямую не возвращается) |
| Наличие .d.ts | Ambient-модуль (runtime) | Только runtime |

> ⚠️ **Исправлено (важно!):** `gcQueryAi` **НЕ возвращает строки данных** (`result.rows` у него нет). Прежняя версия документа использовала `gcQueryAi(ctx, query)` c последующим `events.push(...(result.rows || []))` — это неверно. **Для чтения событий используйте `queryAi` из `@traffic/sdk`.** `gcQueryAi` подходит лишь для выполнения SQL, где важен только факт успеха.

---

## Отложенные задачи (app.job)

### Определение джобы

```typescript
// jobs/monitor.ts (ОТДЕЛЬНЫЙ файл, путь только '/')
export const monitorJob = app.job('/', async (ctx, params: { userId: string; socketId: string }) => {
  // ... логика джобы
})
```

**Правила (runtime-верифицировано):**

- Джоба — в отдельном файле `jobs/<name>.ts`.
- Путь роута джобы — **только `'/'`** (а не именованный `'/monitor-events'`).
- `params` типизируются явно.
- **Нельзя** определять джобу внутри другого хендлера/функции — будет ошибка: `Defining job route '/' outside of module's top-level runtime scope is pointless`.

> ⚠️ Прежняя версия использовала `app.job('/monitor-events', handler)` и `app.job('/monitor', handler)` с именованным путём. Корректно — путь `'/'`, а различают джобы по файлу (file-based routing).

### Методы планирования

```typescript
await monitorJob.scheduleJobAfter(ctx, 15, 'seconds', params) // через N seconds/minutes/hours/days
await monitorJob.scheduleJobAsap(ctx, params)                  // как можно скорее
await monitorJob.scheduleJobAt(ctx, new Date(2026, 6, 20), params) // в конкретную дату
```

Все методы возвращают `Promise<number>` — **`taskId` имеет тип `number`**, не `string`.

### Отмена джобы

```typescript
import { cancelScheduledJob } from '@app/jobs'

// Сигнатура — jobId именно number:
async function cancelScheduledJob(ctx: RichUgcCtx, jobId: number): Promise<boolean>
```

> ⚠️ `jobId` — `number` (в прежней версии ошибочно предполагался `string`).

---

## Логирование ctx.account.log

### Сигнатура (из @app/types/internal)

```typescript
ctx.account.log(params: LogParams): void
ctx.account.log(msg: string | number, params?: LogParamsNoMsg): void
ctx.account.log(msg: string | number, err?: Error): void
ctx.account.log(err: Error): void
```

```typescript
type LogParams = {
  err?: Error
  kv?: Record<string, string | number | undefined>
  json?: unknown
  level?: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'unknown'
  msg?: string | number
}
```

### Примеры

```typescript
ctx.account.log('Something happened')

ctx.account.log('User subscribed to events', {
  level: 'info',
  json: { userId: ctx.user.id, eventType: 'getcourse', subscribedAt: new Date().toISOString() }
})

ctx.account.log('Order processed', { level: 'info', kv: { orderId: '123', status: 'paid' } })

ctx.account.log('Process failed', new Error('Something broke'))
```

### Чтение логов из ClickHouse (account_logs)

```sql
-- Таблица: chatium_ai.account_logs
-- Колонки: msg (String), json_str (String), kv (String),
--          level (LowCardinality(String)), ts64 (DateTime64(3)), dt (Date)

SELECT msg, json_str, level, ts64
FROM chatium_ai.account_logs
WHERE msg LIKE '%User subscribed%'
  AND dt >= today()
ORDER BY ts64 DESC
```

> ⚠️ **Исправлено:** временна́я колонка называется **`ts64`** (`DateTime64(3)`), а не `ts`/`createdAt`. `json_str` и `kv` — строки, содержащие JSON/ключ-значения как текст. Подробнее о структуре таблиц ClickHouse — см. `049-clickhouse.md`.

### Авторизация (@app/auth)

```typescript
import { requireRealUser, requireAccountRole, requireAnyUser } from '@app/auth'

const user = requireRealUser(ctx) // синхронный, возвращает UgcSmartUser (не void!)
requireAccountRole(ctx, 'Admin')  // пропускает Admin, Developer, Owner
const anon = await requireAnyUser(ctx) // асинхронный — требует await
```

> ⚠️ `requireRealUser` возвращает `UgcSmartUser` (в прежней версии предполагался `void`). `requireAnyUser` — асинхронный, нужен `await`.

---

## Практические примеры

### Пример 1: Встроенная подписка + хук (дополнительный механизм)

```typescript
// api/users.ts
import { subscribeToMetricEvents } from '@app/metric'
import { requireAccountRole } from '@app/auth'

export const apiEnableUserSync = app.post('/enable-user-sync', async (ctx) => {
  requireAccountRole(ctx, 'Admin')

  await subscribeToMetricEvents(ctx, ['event://getcourse/user/created'])

  ctx.account.log('Subscribed to user/created events', {
    level: 'info',
    json: { subscribedAt: new Date().toISOString() }
  })

  return { success: true }
})

// Хук регистрируется и срабатывает; для GetCourse-доставки — см. надёжный вариант ниже
app.accountHook('metric-event', async (ctx, payload) => {
  ctx.account.log('Event received', { level: 'info', json: { url: payload.event.url } })
})
```

### Пример 2: Рабочая реализация через Heap (Events Subscribe)

#### Шаг 1: API подписки

```typescript
// api/subscriptions/subscribe.ts
// @shared
import Subscriptions from '../../tables/event_subscriptions.table'
import { requireRealUser } from '@app/auth'

export const subscribeRoute = app
  .post('/')
  .body((s) => ({
    eventType: s.string(),
    eventName: s.string()
  }))
  .handle(async (ctx, req) => {
    requireRealUser(ctx)

    const existing = await Subscriptions.findOneBy(ctx, {
      userId: ctx.user.id,
      eventType: req.body.eventType,
      eventName: req.body.eventName
    })

    if (existing) {
      await Subscriptions.update(ctx, { id: existing.id, isActive: true })
    } else {
      await Subscriptions.create(ctx, {
        userId: ctx.user.id,
        eventType: req.body.eventType,
        eventName: req.body.eventName,
        isActive: true
      })
    }

    ctx.account.log('Subscription created', {
      level: 'info',
      json: { eventType: req.body.eventType, eventName: req.body.eventName, userId: ctx.user.id }
    })

    return { success: true }
  })
```

#### Шаг 2: Job-монитор (через queryAi — читает строки)

```typescript
// jobs/monitor.ts
import { sendDataToSocket } from '@app/socket'
import { queryAi } from '@traffic/sdk'
import Subscriptions from '../tables/event_subscriptions.table'

export const monitorJob = app.job('/', async (ctx, params: { userId: string; socketId: string }) => {
  const subscriptions = await Subscriptions.findAll(ctx, {
    where: { userId: params.userId, isActive: true }
  })

  const allEvents: any[] = []

  for (const sub of subscriptions) {
    const query = `
      SELECT url, action, action_param1, ts
      FROM chatium_ai.access_log
      WHERE url LIKE '%${sub.eventType}/${sub.eventName}%'
        AND dt >= today() - 1
      ORDER BY ts DESC
      LIMIT 10
    `
    try {
      const result = await queryAi(ctx, query) // { rows: [...] }
      if (result?.rows?.length) {
        allEvents.push(...result.rows)
      }
    } catch (e) {
      ctx.account.log(`Query failed for ${sub.eventType}/${sub.eventName}`, {
        level: 'error',
        json: { error: String(e) }
      })
    }
  }

  if (allEvents.length > 0) {
    await sendDataToSocket(ctx, params.socketId, {
      type: 'events',
      data: allEvents,
      timestamp: new Date().toISOString()
    })
  }

  // Рекурсивный self-reschedule — следующая проверка через 15 секунд
  await monitorJob.scheduleJobAfter(ctx, 15, 'seconds', params)
})
```

#### Шаг 3: API запуска мониторинга

```typescript
// api/subscriptions/start-monitoring.ts
// @shared
import { genSocketId } from '@app/socket'
import { requireRealUser } from '@app/auth'
import { monitorJob } from '../../jobs/monitor'

export const startMonitoringRoute = app.post('/', async (ctx) => {
  requireRealUser(ctx)

  const rawSocketId = `events-monitor-${ctx.user.id}`
  const encodedSocketId = await genSocketId(ctx, rawSocketId)

  await monitorJob.scheduleJobAsap(ctx, {
    userId: ctx.user.id,
    socketId: rawSocketId
  })

  return { success: true, socketId: encodedSocketId }
})
```

#### Шаг 4: Vue-клиент

```vue
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { getOrCreateBrowserSocketClient } from '@app/socket'
import { startMonitoringRoute } from '../api/subscriptions/start-monitoring'
import { listRoute } from '../api/subscriptions/list'

const events = ref<any[]>([])
const monitoring = ref(false)
let socketSubs: any = null

async function startMonitoring() {
  if (monitoring.value) return

  const result = await startMonitoringRoute.run(ctx)
  const socket = await getOrCreateBrowserSocketClient()
  socketSubs = socket.subscribeToData(result.socketId)

  socketSubs.listen((msg: any) => {
    if (msg.type === 'events') {
      events.value.unshift(...msg.data)
      if (events.value.length > 100) events.value = events.value.slice(0, 100)
    }
  })

  monitoring.value = true
}

onMounted(async () => {
  const subs = await listRoute.run(ctx)
  if (subs.length > 0) await startMonitoring()
})

onUnmounted(() => {
  socketSubs?.unsubscribe?.()
})
</script>
```

---

## Troubleshooting

### Хук metric-event не даёт GetCourse-событий

Хук **регистрируется и срабатывает** (проверено runtime), но доставка именно GetCourse-событий зависит от конфигурации аккаунта. Проверьте:

1. Файл с хуком импортирован в `index.tsx`:

```typescript
import './api/analytics.ts' // для регистрации хука
```

2. Подписка активирована `subscribeToMetricEvents`.
3. События есть в ClickHouse после момента подписки (фильтр по `url LIKE '%...%'` с учётом префикса `event://account/`).
4. В обработчике используется `payload.event.url`, а не `event.urlPath`.

Если событий по-прежнему нет — используйте надёжный вариант через Heap + `queryAi` + WebSocket (Events Subscribe, `dev/events-subscribe`).

### Пустой результат при чтении событий

Проверьте, что используется `queryAi` (`@traffic/sdk`), а не `gcQueryAi` — последний **не возвращает `rows`**. И что фильтр по URL учитывает автопрефикс (`LIKE '%event://getcourse/...%'`).

---

## Сводка runtime-исправлений

| № | Было в прежней версии | Runtime-реальность |
| --- | --- | --- |
| 1 | Поле события `urlPath` | В TS-типе поле называется `url` (в ClickHouse есть оба, `urlPath` дублирует `url`) |
| 2 | Хук получает `(ctx, { event })` | Получает `(ctx, payload)` с полями `event`, `params`, `groupKey` |
| 3 | Хук «не работает» | Хук регистрируется и срабатывает; для GetCourse доставка зависит от конфигурации |
| 4 | `subscribeToMetricEvents` принимает только `string[]` | Также `Record<string, P>` + опциональный `groupKey` |
| 5 | `unsubscribeFromMetricEvents(ctx, string)` | Принимает `string` ИЛИ `string[]` |
| 6 | Нет `unsubscribeFromMetricEventsGroup` | Существует в `@app/metric` |
| 7 | `sendDataToSocket`/`genSocketId` из `@start/sdk` | Из `@app/socket` (в `@start/sdk` их нет) |
| 8 | `gcQueryAi` возвращает `{ rows: [...] }` | Возвращает `{ success, error? }` — строк не возвращает; читать через `queryAi` |
| 9 | URL событий `event://getcourse/{eventName}` | Платформа добавляет префикс: `event://account/event://getcourse/{eventName}` |
| 10 | `account_logs` колонка `ts`/`createdAt` | Фактически `ts64` (`DateTime64(3)`) |
| 11 | `requireRealUser` — `void` | Возвращает `UgcSmartUser` |
| 12 | `cancelScheduledJob` id — `string` | `jobId: number` |
| 13 | `app.job('/monitor-events', handler)` | Путь только `'/'`, джоба — в отдельном файле; определять внутри хендлера нельзя |
| 14 | `writeMetricEvent` заполняет `user_email` из параметров | `user_*` берётся из HTTP-контекста, не из параметров события |
| 15 | `action = 'pageview'` по умолчанию | `action = NULL` по умолчанию |

---

## Ссылки

- **038-metric.md** — writeMetricEvent, метрические события, формирование URL и полей
- **049-clickhouse.md** — структура таблиц ClickHouse (`access_log`, `account_logs`), запросы
- **016-analytics-getcourse.md** — GetCourse события и SQL-запросы
- **016-analytics-traffic.md** — события трафика
- **E01-gc-sdk.md** — GetCourse SDK (настройка MCP Client)
- **014-socket.md** — WebSocket в Chatium
- **008-heap.md** — Heap-таблицы
- **Проекты:**
  - `dev/events-subscribe` — рабочая реализация подписок (Heap + queryAi + WebSocket)
  - `dev/partnership` — партнёрская система с подписками и мониторингом

---

**Версия**: 3.0 (runtime-верифицировано)  
**Дата создания**: 2025-11-07  
**Последнее обновление**: runtime-верифицировано 2026-07-18  
**Источник проверки**: прямые runtime-тесты (`subscribeToMetricEvents`, хук `metric-event`, `@app/socket`, `queryAi`/`gcQueryAi`, `app.job`, `ctx.account.log`, колонки ClickHouse)
