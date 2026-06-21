---
name: chatium-getcourse-events
description: Подписка на события GetCourse в Chatium — subscribeToMetricEvents, metric-event хуки, мониторинг через Heap + Job + WebSocket. Использовать при реакции на события GetCourse в реальном времени (регистрация, сделки, формы и др.).
---

# chatium-getcourse-events

Получение событий GetCourse в реальном времени. Доступны два подхода: встроенный `subscribeToMetricEvents` (нестабилен) и рабочая реализация через Heap + Job + WebSocket.

## Когда использовать

- Реакция на события GetCourse (уроки, сделки, контакты, формы, опросы) в режиме реального времени
- Получение событий user/created, deal/created, form/sent и аналогичных

## Два подхода

### Подход 1: subscribeToMetricEvents + metric-event хук

> **Статус:** Нестабилен — хук может не срабатывать для GetCourse событий. При проблемах переходить на Подход 2.

**Импорты:**

```typescript
import { subscribeToMetricEvents, unsubscribeFromMetricEvents } from '@app/metric'
```

**Подписка и отписка:**

```typescript
// Подписка на одно событие
await subscribeToMetricEvents(ctx, ['event://getcourse/user/created'])

// Подписка на несколько событий
await subscribeToMetricEvents(ctx, [
  'event://getcourse/user/created',
  'event://getcourse/deal/created',
  'event://getcourse/form/sent'
])

// Отписка
await unsubscribeFromMetricEvents(ctx, 'event://getcourse/user/created')
```

**Обработка через хук:**

```typescript
// Общий хук для всех подписанных событий
app.accountHook('metric-event', async (ctx, { event }) => {
  ctx.account.log('Received event', {
    level: 'info',
    json: { urlPath: event.urlPath }
  })

  if (event.urlPath === 'event://getcourse/user/created') {
    await handleUserCreated(ctx, event)
  }
})
```

**Структура события:**

```typescript
interface MetricEvent {
  urlPath: string       // 'event://getcourse/user/created'
  user_id?: string
  user_email?: string
  user_first_name?: string
  user_last_name?: string
  user_phone?: string
  uid?: string
  // ... другие поля в зависимости от типа события
}
```

**Известная проблема:** хук `metric-event` может не срабатывать даже при успешной подписке и наличии событий в ClickHouse. Обходное решение — Подход 2.

### Подход 2: Heap + Job + WebSocket (рабочий)

> **Статус:** Работает. Рекомендован для продакшена. Реализован в `dev/events-subscribe`.

**Архитектура:**

```
Пользователь
    ↓
Heap таблица subscriptions (подписки)
    ↓
Job монитор (каждые 10–15 сек)
    ↓
SQL запросы к ClickHouse (gcQueryAi или queryAi)
    ↓
WebSocket (sendDataToSocket)
    ↓
Браузер пользователя (real-time)
```

**Таблица подписок:**

```typescript
// tables/subscriptions.table.ts
export const Subscriptions = Heap.Table('subscriptions', {
  userId: Heap.UserRefLink({ customMeta: { title: 'Пользователь' } }),
  eventType: Heap.String({ customMeta: { title: 'Тип события' } }), // 'getcourse' | 'traffic'
  eventName: Heap.String({ customMeta: { title: 'Название события' } }), // 'user/created', 'deal/created', ...
  isActive: Heap.Boolean({ customMeta: { title: 'Активна' } })
})
```

**API подписки:**

```typescript
// api/subscriptions.ts
import Subscriptions from '../tables/subscriptions.table'

export const apiSubscribeRoute = app.post('/subscribe', async (ctx, req) => {
  requireRealUser(ctx)
  const { eventType, eventName } = req.body

  const existing = await Subscriptions.findOneBy(ctx, {
    userId: ctx.user.id,
    eventType,
    eventName
  })

  if (existing) {
    await Subscriptions.update(ctx, { id: existing.id, isActive: true })
  } else {
    await Subscriptions.create(ctx, {
      userId: ctx.user.id,
      eventType,
      eventName,
      isActive: true
    })
  }

  return { success: true }
})
```

**Job-монитор (gcQueryAi — для настраиваемого аккаунта пользователя):**

```typescript
// api/events.ts
import { sendDataToSocket, genSocketId } from '@app/socket'
import { gcQueryAi } from '@gc-mcp-server/sdk'

export const monitorEventsJob = app.job(
  '/monitor-events',
  async (ctx, params: { userId: string; socketId: string; lastCheckTime?: string }) => {
    const subs = await Subscriptions.findAll(ctx, {
      where: { userId: params.userId, isActive: true }
    })

    const allEvents = []
    const lastCheckTime = params.lastCheckTime || new Date(Date.now() - 60000).toISOString()

    for (const sub of subs) {
      if (sub.eventType === 'getcourse') {
        const query = `
          SELECT * FROM chatium_ai.access_log
          WHERE urlPath = 'event://getcourse/${sub.eventName}'
            AND ts > '${lastCheckTime}'
            AND dt >= today() - 1
          ORDER BY ts DESC
          LIMIT 10
        `
        const result = await gcQueryAi(ctx, query)
        allEvents.push(...(result.rows || []))
      }
    }

    if (allEvents.length > 0) {
      await sendDataToSocket(ctx, params.socketId, {
        type: 'events-update',
        data: allEvents,
        timestamp: new Date().toISOString()
      })
    }

    await monitorEventsJob.scheduleJobAfter(ctx, 15, 'seconds', {
      ...params,
      lastCheckTime: new Date().toISOString()
    })
  }
)
```

**Job-монитор (queryAi — для аккаунта разработчика):**

```typescript
import { sendDataToSocket } from '@app/socket'
import { queryAi } from '@traffic/sdk'

export const monitorEventsJob = app.job(
  '/monitor-events',
  async (ctx, params: { userId: string; socketId: string }) => {
    const subs = await Subscriptions.findAll(ctx, {
      where: { userId: params.userId, isActive: true }
    })

    const allEvents = []

    for (const sub of subs) {
      const query = `
        SELECT * FROM chatium_ai.access_log
        WHERE ${
          sub.eventType === 'getcourse'
            ? `urlPath = 'event://getcourse/${sub.eventName}'`
            : `action = '${sub.eventName}'`
        }
          AND dt >= today() - 1
        ORDER BY ts DESC
        LIMIT 10
      `
      const result = await queryAi(ctx, query)
      allEvents.push(...(result.rows || []))
    }

    if (allEvents.length > 0) {
      await sendDataToSocket(ctx, params.socketId, {
        type: 'events-update',
        data: allEvents
      })
    }

    await monitorEventsJob.scheduleJobAfter(ctx, 10, 'seconds', params)
  }
)
```

**API запуска мониторинга:**

```typescript
export const apiStartMonitoring = app.post('/start-monitoring', async (ctx) => {
  requireRealUser(ctx)

  const socketId = `events-monitor-${ctx.user.id}`
  const encodedSocketId = await genSocketId(ctx, socketId)

  await monitorEventsJob.scheduleJobAsap(ctx, {
    userId: ctx.user.id,
    socketId
  })

  return { success: true, socketId: encodedSocketId }
})
```

**Клиент Vue:**

```vue
<script setup>
import { ref, onMounted } from 'vue'
import { getOrCreateBrowserSocketClient } from '@app/socket'
import { apiStartMonitoring } from '../api/events'

const events = ref([])

onMounted(async () => {
  const result = await apiStartMonitoring.run(ctx)
  const socket = await getOrCreateBrowserSocketClient()
  socket.on('data', (msg) => {
    if (msg.type === 'events-update') {
      events.value.unshift(...msg.data)
      if (events.value.length > 100) {
        events.value = events.value.slice(0, 100)
      }
    }
  })
})
</script>
```

## Поддерживаемые события GetCourse

Формат: `event://getcourse/{eventName}`. Примеры:

```
event://getcourse/user/created
event://getcourse/user/updated
event://getcourse/deal/created
event://getcourse/deal/updated
event://getcourse/order/created
event://getcourse/order/updated
event://getcourse/message/sent
event://getcourse/message/viewed
event://getcourse/form/sent
event://getcourse/user/chatbot/vk_enabled
```

## Чеклист

- [ ] Выбрать подход: `subscribeToMetricEvents` (нестабилен) или Heap + Job + WebSocket (рекомендован)
- [ ] При Подходе 1: импорт из `@app/metric`, подписка через `subscribeToMetricEvents`, хук `metric-event`
- [ ] При Подходе 2: Heap таблица подписок, Job с `gcQueryAi` (или `queryAi`), `sendDataToSocket`
- [ ] `requireRealUser(ctx)` в защищённых эндпоинтах
- [ ] Логирование через `ctx.account.log()`, не `console.log`
- [ ] WebSocket-клиент подключён через `getOrCreateBrowserSocketClient` (только Vue, не сервер)

## Troubleshooting

**metric-event хук не срабатывает:**
1. Убедиться, что файл с хуком импортирован в `index.tsx`
2. Проверить, что подписка активирована вызовом `subscribeToMetricEvents`
3. Проверить наличие событий в ClickHouse после момента подписки
4. Если всё равно не работает — переходить на Подход 2 (Heap + Job + WebSocket)

## Ссылки на документацию

- **016-analytics-subscriptions.md** — `subscribeToMetricEvents`, metric-event хук, Events Subscribe проект, WebSocket мониторинг
- **016-analytics-getcourse.md** — GetCourse события и SQL запросы
- **016-analytics-traffic.md** — события трафика
- **014-socket.md** — WebSocket в Chatium
- **008-heap.md** — Heap таблицы
- **E01-gc-sdk.md** — GetCourse SDK (настройка MCP Client)
- **Проекты:** `dev/events-subscribe` — рабочая реализация подписок
