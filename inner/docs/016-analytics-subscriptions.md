@chatium

# Система подписок на события

Руководство по реализации подписок на события через `subscribeToMetricEvents` и обработке через хук `metric-event`.

## Содержание

- [Основные концепции](#основные-концепции)
- [Подписка на события - subscribeToMetricEvents](#подписка-на-события---subscribetometricevents)
- [Хук metric-event](#хук-metric-event)
- [Проект Events Subscribe](#проект-events-subscribe)
- [Управление подписками через Heap](#управление-подписками-через-heap)
- [WebSocket мониторинг](#websocket-мониторинг)
- [Практические примеры](#практические-примеры)
- [Troubleshooting](#troubleshooting)

---

## Основные концепции

**Система подписок** позволяет получать уведомления о событиях из GetCourse и других источников в режиме реального времени.

### Два подхода к подпискам

#### 1. Встроенный Chatium (subscribeToMetricEvents)

```typescript
import { subscribeToMetricEvents } from '@app/metric'

// Подписка на события
await subscribeToMetricEvents(ctx, ['event://getcourse/user/created'])

// Обработка через хук
app.accountHook('metric-event', async (ctx, { event }) => {
  // Получаем событие
  console.log(event)
})
```

**Статус**: ⚠️ **Не работает стабильно** - хук не срабатывает для GetCourse событий

#### 2. Через Heap таблицу (Events Subscribe проект)

```typescript
// Сохранение подписок в Heap
await SubscriptionsTable.create(ctx, {
  userId: ctx.user.id,
  eventType: 'getcourse',
  eventName: 'user/created',
  isActive: true
})

// Мониторинг через Job + WebSocket
app.job('/monitor-events', async (ctx, params) => {
  const events = await gcQueryAi(ctx, query)
  await sendDataToSocket(ctx, socketId, events)
})
```

**Статус**: ✅ **Работает** - реализовано в `dev/events-subscribe`

---

## Подписка на события - subscribeToMetricEvents

### Импорт и базовое использование

```typescript
import { subscribeToMetricEvents, unsubscribeFromMetricEvents } from '@app/metric'

// Подписка на одно событие
export const apiEnableUserSync = app.post('/enable-sync', async (ctx) => {
  await subscribeToMetricEvents(ctx, ['event://getcourse/user/created'])
  return { success: true }
})

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

// Отписка от события
export const apiDisableSync = app.post('/disable-sync', async (ctx) => {
  await unsubscribeFromMetricEvents(ctx, 'event://getcourse/user/created')
  return { success: true }
})
```

### Поддерживаемые события

События должны иметь формат `event://getcourse/{eventName}`:

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

### Регистрация хука

```typescript
// api/analytics.ts

app.accountHook('metric-event', async (ctx, { event }) => {
  // Событие приходит в параметре event
  ctx.console.log('Received metric event', event)

  // Обработка события
  if (event.urlPath === 'event://getcourse/user/created') {
    await handleUserCreated(ctx, event)
  }
})

async function handleUserCreated(ctx, event) {
  if (!event.user_email) return

  await UsersTable.create(ctx, {
    email: event.user_email,
    firstName: event.user_first_name,
    lastName: event.user_last_name,
    registrationDate: new Date()
  })
}
```

### Структура события

```typescript
interface MetricEvent {
  urlPath: string // 'event://getcourse/user/created'
  user_id?: string // ID пользователя
  user_email?: string // Email
  user_first_name?: string // Имя
  user_last_name?: string // Фамилия
  user_phone?: string // Телефон
  uid?: string // UID сессии
  // ... другие поля события
}
```

### ⚠️ Известные проблемы

**Проблема**: Хук `metric-event` не срабатывает после `subscribeToMetricEvents`

**Симптомы**:

- ✅ Подписка выполняется успешно
- ✅ События есть в ClickHouse
- ❌ Хук не логирует события
- ❌ `ctx.console.log` и `ctx.account.log` не выполняются

**Обходное решение**: Используйте проект `dev/events-subscribe` с Heap подписками и WebSocket мониторингом.

---

## Проект Events Subscribe

Полнофункциональная система подписок на события, реализованная в `dev/events-subscribe`.

### Архитектура

```
Пользователь
    ↓
Heap таблица subscriptions (подписки)
    ↓
Job монитор (каждые 10 сек)
    ↓
SQL запросы к ClickHouse
    ↓
WebSocket (sendDataToSocket)
    ↓
Браузер пользователя (real-time)
```

### Таблица subscriptions

```typescript
// tables/subscriptions.table.ts
export const Subscriptions = Heap.Table('subscriptions', {
  userId: Heap.UserRefLink({
    customMeta: { title: 'Пользователь' }
  }),
  eventType: Heap.String({
    customMeta: { title: 'Тип события' }
    // Значения: 'traffic' или 'getcourse'
  }),
  eventName: Heap.String({
    customMeta: { title: 'Название события' }
    // Значения: 'pageview', 'dealCreated', и т.д.
  }),
  isActive: Heap.Boolean({
    customMeta: { title: 'Активна' }
  })
})
```

### API endpoints

#### POST /api/subscriptions~subscribe

Подписка на одно событие:

```typescript
// Запрос
await apiSubscribeRoute.run(ctx, {
  eventType: 'getcourse',
  eventName: 'user/created'
})

// Ответ
{
  success: true,
  message: 'Подписка создана'
}
```

#### POST /api/subscriptions~subscribe-all

Массовая подписка:

```typescript
// На все события traffic
await apiSubscribeAllRoute.run(ctx, {
  eventType: 'traffic'
})

// На все события getcourse
await apiSubscribeAllRoute.run(ctx, {
  eventType: 'getcourse'
})

// На ВСЕ события (traffic + getcourse)
await apiSubscribeAllRoute.run(ctx, {
  eventType: undefined
})

// Ответ
{
  success: true,
  message: 'Подписка создана: 15, активировано: 3',
  total: 18
}
```

#### POST /api/subscriptions~unsubscribe

Отписка от события:

```typescript
await apiUnsubscribeRoute.run(ctx, {
  eventType: 'getcourse',
  eventName: 'user/created'
})
```

#### GET /api/subscriptions~list

Получение списка подписок:

```typescript
const subscriptions =
  await apiSubscriptionsListRoute.run(ctx)[
    // Возвращает массив:
    {
      id: 'sub_123',
      userId: 'user_456',
      eventType: 'getcourse',
      eventName: 'user/created',
      isActive: true,
      createdAt: '2025-11-07T10:00:00Z'
    }
  ]
```

#### GET /api/subscriptions~available-events

Список всех доступных событий:

```typescript
const events = await apiAvailableEventsRoute.run(ctx)

// Возвращает:
[
  {
    name: 'user/created',
    type: 'getcourse',
    description: 'Регистрация пользователя',
    urlPath: 'event://getcourse/user/created',
    fields: [...],
    example: {...}
  },
  // ... все остальные события
]
```

---

## Управление подписками через Heap

### Создание подписки

```typescript
import Subscriptions from './tables/subscriptions.table'

// Проверяем, есть ли уже подписка
const existing = await Subscriptions.findOneBy(ctx, {
  userId: ctx.user.id,
  eventType: 'getcourse',
  eventName: 'user/created'
})

if (existing) {
  // Активируем существующую
  await Subscriptions.update(ctx, {
    id: existing.id,
    isActive: true
  })
} else {
  // Создаем новую
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
  where: {
    userId: ctx.user.id,
    isActive: true
  },
  limit: 100
})

// Получаем только события getcourse
const getcourseSubscriptions = await Subscriptions.findAll(ctx, {
  where: {
    userId: ctx.user.id,
    eventType: 'getcourse',
    isActive: true
  }
})
```

---

## WebSocket мониторинг

### Архитектура

```
Job монитор (каждые 10 сек)
    ↓
Читает подписки пользователя из Heap
    ↓
Для каждой подписки: SQL запрос к ClickHouse
    ↓
Отправляет новые события через WebSocket
    ↓
Браузер получает и отображает
```

### Job для мониторинга (с gcQueryAi)

**Использование для настраиваемого GetCourse MCP Client** - каждый пользователь мониторит свой аккаунт.

```typescript
// api/events.ts
import { sendDataToSocket, genSocketId } from '@app/socket'
import { gcQueryAi } from '@gc-mcp-server/sdk'

export const monitorEventsJob = app.job(
  '/monitor-events',
  async (
    ctx,
    params: {
      userId: string
      socketId: string
      lastCheckTime?: string
    }
  ) => {
    // Получаем активные подписки
    const subscriptions = await Subscriptions.findAll(ctx, {
      where: {
        userId: params.userId,
        isActive: true
      }
    })

    const events = []
    const lastCheckTime = params.lastCheckTime || new Date(Date.now() - 60000).toISOString()

    // Для каждой подписки получаем последние события
    for (const sub of subscriptions) {
      if (sub.eventType === 'getcourse') {
        const query = `
        SELECT * 
        FROM chatium_ai.access_log
        WHERE urlPath = 'event://getcourse/${sub.eventName}'
          AND ts > '${lastCheckTime}'
          AND dt >= today() - 1
        ORDER BY ts DESC
        LIMIT 10
      `

        const result = await gcQueryAi(ctx, query)
        events.push(...(result.rows || []))
      } else if (sub.eventType === 'traffic') {
        const query = `
        SELECT * 
        FROM chatium_ai.access_log
        WHERE action = '${sub.eventName}'
          AND ts > '${lastCheckTime}'
          AND dt >= today() - 1
          AND NOT startsWith(urlPath, 'event://getcourse/')
        ORDER BY ts DESC
        LIMIT 10
      `

        const result = await gcQueryAi(ctx, query)
        events.push(...(result.rows || []))
      }
    }

    // Отправляем события через WebSocket
    if (events.length > 0) {
      await sendDataToSocket(ctx, params.socketId, {
        type: 'events-update',
        data: events,
        timestamp: new Date().toISOString()
      })
    }

    // Планируем следующую проверку через 15 секунд
    await monitorEventsJob.scheduleJobAfter(ctx, 15, 'seconds', {
      ...params,
      lastCheckTime: new Date().toISOString()
    })
  }
)
```

### Job для мониторинга (с queryAi)

**Использование для аккаунта разработчика** - все пользователи мониторят один аккаунт.

```typescript
import { sendDataToSocket } from '@app/socket'
import { queryAi } from '@traffic/sdk'

export const monitorEventsJob = app.job(
  '/monitor-events',
  async (
    ctx,
    params: {
      userId: string
      socketId: string
    }
  ) => {
    const subscriptions = await Subscriptions.findAll(ctx, {
      where: { userId: params.userId, isActive: true }
    })

    const events = []

    for (const sub of subscriptions) {
      const query = `
      SELECT * 
      FROM chatium_ai.access_log
      WHERE ${
        sub.eventType === 'getcourse'
          ? `urlPath = 'event://getcourse/${sub.eventName}'`
          : `action = '${sub.eventName}'`
      }
        AND dt >= today() - 1
      ORDER BY ts DESC
      LIMIT 10
    `

      // Данные из аккаунта разработчика
      const result = await queryAi(ctx, query)
      events.push(...(result.rows || []))
    }

    if (events.length > 0) {
      await sendDataToSocket(ctx, params.socketId, {
        type: 'events-update',
        data: events
      })
    }

    await monitorEventsJob.scheduleJobAfter(ctx, 10, 'seconds', params)
  }
)
```

### Запуск мониторинга

```typescript
export const apiStartMonitoringRoute = app.post('/start-monitoring', async (ctx) => {
  requireRealUser(ctx)

  const socketId = `events-monitor-${ctx.user.id}`
  const encodedSocketId = await genSocketId(ctx, socketId)

  // Запускаем job
  await monitorEventsJob.scheduleJobAsap(ctx, {
    userId: ctx.user.id,
    socketId
  })

  return {
    success: true,
    socketId: encodedSocketId
  }
})
```

### Клиент (Vue)

```vue
<template>
  <div>
    <div v-for="event in events" :key="event.id">{{ event.urlPath }} - {{ event.ts }}</div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getOrCreateBrowserSocketClient } from '@app/socket'
import { apiStartMonitoringRoute } from '../api/events'

const events = ref([])
const socketId = ref(null)

onMounted(async () => {
  // Запускаем мониторинг
  const result = await apiStartMonitoringRoute.run(ctx)
  socketId.value = result.socketId

  // Подключаемся к WebSocket
  const socketClient = await getOrCreateBrowserSocketClient()

  socketClient.on('data', (message) => {
    if (message.type === 'events-update') {
      events.value.unshift(...message.data)

      // Ограничиваем количество событий
      if (events.value.length > 100) {
        events.value = events.value.slice(0, 100)
      }
    }
  })
})
</script>
```

---

## Практические примеры

### Пример 1: Простая подписка на создание пользователей

```typescript
// api/users.ts
import { subscribeToMetricEvents } from '@app/metric'

export const apiEnableUserSync = app.post('/enable-user-sync', async (ctx) => {
  requireAccountRole(ctx, 'Admin')

  // Подписываемся
  await subscribeToMetricEvents(ctx, ['event://getcourse/user/created'])

  ctx.account.log('Subscribed to user/created events', {
    level: 'info',
    json: { subscribedAt: new Date() }
  })

  return { success: true }
})

// ⚠️ Хук НЕ РАБОТАЕТ стабильно!
app.accountHook('metric-event', async (ctx, { event }) => {
  // Этот код может не выполниться
  ctx.console.log('Event received', event)
})
```

### Пример 2: Рабочая реализация через Heap (Events Subscribe)

#### Шаг 1: API для подписки

```typescript
// api/subscriptions.ts
import Subscriptions from '../tables/subscriptions.table'

export const apiSubscribeRoute = app.post('/subscribe', async (ctx, req) => {
  requireRealUser(ctx)

  const { eventType, eventName } = req.body

  // Проверяем существующую подписку
  const existing = await Subscriptions.findOneBy(ctx, {
    userId: ctx.user.id,
    eventType,
    eventName
  })

  if (existing) {
    await Subscriptions.update(ctx, {
      id: existing.id,
      isActive: true
    })
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

#### Шаг 2: Job для мониторинга (с gcQueryAi)

**Для настраиваемого GetCourse MCP Client**:

```typescript
// api/events.ts
import { sendDataToSocket } from '@app/socket'
import { gcQueryAi } from '@gc-mcp-server/sdk'

export const monitorEventsJob = app.job(
  '/monitor',
  async (
    ctx,
    params: {
      userId: string
      socketId: string
      lastCheckTime?: string
    }
  ) => {
    // Получаем подписки пользователя
    const subs = await Subscriptions.findAll(ctx, {
      where: { userId: params.userId, isActive: true }
    })

    const allEvents = []
    const lastCheckTime = params.lastCheckTime || new Date(Date.now() - 60000).toISOString()

    // Для каждой подписки получаем события
    for (const sub of subs) {
      if (sub.eventType === 'getcourse') {
        const query = `
        SELECT *
        FROM chatium_ai.access_log
        WHERE urlPath = 'event://getcourse/${sub.eventName}'
          AND ts > '${lastCheckTime}'
          AND dt >= today() - 1
        ORDER BY ts DESC
        LIMIT 10
      `

        // Запросы к настроенному аккаунту пользователя
        const result = await gcQueryAi(ctx, query)
        allEvents.push(...(result.rows || []))
      } else if (sub.eventType === 'traffic') {
        const query = `
        SELECT *
        FROM chatium_ai.access_log
        WHERE action = '${sub.eventName}'
          AND ts > '${lastCheckTime}'
          AND dt >= today() - 1
          AND NOT startsWith(urlPath, 'event://getcourse/')
        ORDER BY ts DESC
        LIMIT 10
      `

        const result = await gcQueryAi(ctx, query)
        allEvents.push(...(result.rows || []))
      }
    }

    // Отправляем через WebSocket
    if (allEvents.length > 0) {
      await sendDataToSocket(ctx, params.socketId, {
        type: 'events',
        data: allEvents
      })
    }

    // Повторяем через 15 секунд с обновленным lastCheckTime
    await monitorEventsJob.scheduleJobAfter(ctx, 15, 'seconds', {
      ...params,
      lastCheckTime: new Date().toISOString()
    })
  }
)
```

#### Альтернатива: Job для мониторинга (с queryAi)

**Для аккаунта разработчика**:

```typescript
import { sendDataToSocket } from '@app/socket'
import { queryAi } from '@traffic/sdk'

export const monitorEventsJob = app.job(
  '/monitor',
  async (
    ctx,
    params: {
      userId: string
      socketId: string
    }
  ) => {
    const subs = await Subscriptions.findAll(ctx, {
      where: { userId: params.userId, isActive: true }
    })

    const allEvents = []

    for (const sub of subs) {
      const query = `
      SELECT *
      FROM chatium_ai.access_log
      WHERE ${
        sub.eventType === 'getcourse'
          ? `urlPath = 'event://getcourse/${sub.eventName}'`
          : `action = '${sub.eventName}'`
      }
        AND dt >= today() - 1
      ORDER BY ts DESC
      LIMIT 10
    `

      // Данные из аккаунта разработчика
      const result = await queryAi(ctx, query)
      allEvents.push(...(result.rows || []))
    }

    if (allEvents.length > 0) {
      await sendDataToSocket(ctx, params.socketId, {
        type: 'events',
        data: allEvents
      })
    }

    await monitorEventsJob.scheduleJobAfter(ctx, 10, 'seconds', params)
  }
)
```

#### Шаг 3: API для запуска

```typescript
export const apiStartMonitoring = app.post('/start', async (ctx) => {
  requireRealUser(ctx)

  const socketId = `monitor-${ctx.user.id}`
  const encoded = await genSocketId(ctx, socketId)

  await monitorEventsJob.scheduleJobAsap(ctx, {
    userId: ctx.user.id,
    socketId
  })

  return { success: true, socketId: encoded }
})
```

#### Шаг 4: Клиент Vue

```vue
<script setup>
import { ref, onMounted } from 'vue'
import { getOrCreateBrowserSocketClient } from '@app/socket'

const events = ref([])

onMounted(async () => {
  const result = await apiStartMonitoring.run(ctx)

  const socket = await getOrCreateBrowserSocketClient()
  socket.on('data', (msg) => {
    if (msg.type === 'events') {
      events.value = msg.data
    }
  })
})
</script>
```

---

## Troubleshooting

### Проблема: metric-event хук не срабатывает

**Проверьте**:

1. ✅ Файл с хуком импортирован в `index.tsx`:

```typescript
import './api/analytics.ts' // Для регистрации хука
```

2. ✅ Подписка активирована:

```typescript
await subscribeToMetricEvents(ctx, ['event://getcourse/user/created'])
```

3. ✅ События есть в ClickHouse после момента подписки

4. ❌ Хук все равно не срабатывает → **Используйте Events Subscribe проект**

### Решение: Используйте dev/events-subscribe

Вместо `subscribeToMetricEvents` + `metric-event` используйте:

1. Heap таблицу для подписок
2. Job для периодического опроса ClickHouse
3. WebSocket для отправки событий клиенту

См. полную реализацию в `dev/events-subscribe`.

---

## Ссылки

- **016-analytics-getcourse.md** — GetCourse события и SQL запросы
- **016-analytics-traffic.md** — События трафика
- **E01-gc-sdk.md** — GetCourse SDK (настройка MCP Client)
- **014-socket.md** — WebSocket в Chatium
- **008-heap.md** — Heap таблицы
- **Проекты**:
  - `dev/partnership` - партнёрская система с подписками и мониторингом
  - `dev/events-subscribe` - рабочая реализация подписок

---

**Версия**: 2.0  
**Дата создания**: 2025-11-07  
**Последнее обновление**: 2025-11-09  
**Статус**: Добавлена информация о работе с gcQueryAi (настраиваемый аккаунт) и queryAi (аккаунт разработчика)
