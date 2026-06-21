---
name: chatium-realtime
description: Настраивает real-time обновления через WebSocket в Chatium — genSocketId + sendDataToSocket на сервере, getOrCreateBrowserSocketClient + subscribeToData + subscription.listen на клиенте. Использовать для live-обновлений UI, чатов, прогресса операций, push-уведомлений.
---

## Когда использовать

- При необходимости обновлять UI без перезагрузки страницы (чат, уведомления, статусы)
- Когда сервер должен инициировать отправку данных клиенту (push-модель)
- Для прогресса долгих операций (job-ы, загрузка файлов)

## Архитектура

Обязательный поток:

1. Сервер задаёт **стабильный socketId** (не случайный)
2. Генерирует **закодированный encodedSocketId** через `genSocketId(ctx, socketId)`
3. Передаёт `encodedSocketId` клиенту (через SSR-props или API-ответ)
4. Клиент подписывается: `subscription = socketClient.subscribeToData(encodedSocketId)`, затем `subscription.listen(callback)`
5. Сервер отправляет данные: `sendDataToSocket(ctx, socketId, data)` — **НЕкодированный** ID!

**Критично:**
- `sendDataToSocket` принимает **НЕкодированный** socketId (три аргумента: ctx, socketId, data)
- `subscribeToData` принимает **закодированный** encodedSocketId
- `subscribeToData` возвращает объект `subscription`, у которого вызывается `.listen(callback)` — колбэк **не** передаётся в `subscribeToData`

## Серверная сторона

### Генерация socketId

```typescript
import { genSocketId, sendDataToSocket } from '@app/socket'

// Используйте стабильные ID, а не случайные
const socketId = `thread-${threadId}`
const socketId = `order-${orderId}`
const socketId = `user-${userId}-notifications`
const socketId = `chat-${chatId}`

// Генерация закодированного ID для передачи клиенту
const encodedSocketId = await genSocketId(ctx, socketId)
return { encodedSocketId }
```

### Отправка данных в socket

```typescript
import { sendDataToSocket } from '@app/socket'

// Три отдельных аргумента: ctx, socketId (НЕкодированный), data
await sendDataToSocket(ctx, socketId, {
  type: 'socket-data',
  data: {
    message: 'Обновление из сервера',
    timestamp: Date.now()
  }
})
```

### Полный пример — роут + job

```typescript
import { genSocketId, sendDataToSocket } from '@app/socket'

export const startProcessRoute = app.post('/process', async (ctx, req) => {
  const { threadId } = req.body
  const socketId = `thread-${threadId}`

  processDataJob.scheduleJobAsap(ctx, { threadId, socketId })

  const encodedSocketId = await genSocketId(ctx, socketId)
  return { success: true, encodedSocketId }
})

const processDataJob = app.job('/process-data', async (ctx, params) => {
  const { threadId, socketId } = params

  try {
    for (let i = 0; i < 10; i++) {
      await processChunk(ctx, threadId, i)

      await sendDataToSocket(ctx, socketId, {
        type: 'progress',
        data: { progress: (i + 1) * 10, message: `Обработано ${i + 1} из 10` }
      })
    }

    await sendDataToSocket(ctx, socketId, {
      type: 'completed',
      data: { message: 'Обработка завершена!' }
    })
  } catch (error: any) {
    await sendDataToSocket(ctx, socketId, {
      type: 'error',
      data: { error: error.message }
    })
  }
})
```

### Получение encodedSocketId через GET-эндпоинт

```typescript
import { genSocketId } from '@app/socket'

export const apiGetSocketIdRoute = app.get('/socket-id', async (ctx, req) => {
  const { chainKey, agentId } = req.query

  const socketId = `chat-${ctx.user.id}-${chainKey}-${agentId}`
  const encodedSocketId = await genSocketId(ctx, socketId)

  ctx.account.log('Generated socket ID for client', {
    level: 'info',
    json: { userId: ctx.user.id, chainKey, agentId }
  })

  return { success: true, encodedSocketId }
})
```

## Клиентская сторона (Vue / браузер)

Импорт — из `@app/socket` (не из `@app/socket/client`).

### Способ 1: encodedSocketId через SSR-props

```vue
<script setup>
import { onMounted, onBeforeUnmount } from 'vue'
import { getOrCreateBrowserSocketClient } from '@app/socket'

const props = defineProps<{
  encodedSocketId: string
}>()

let subscription = null

onMounted(async () => {
  const socketClient = await getOrCreateBrowserSocketClient()

  // subscribeToData возвращает объект subscription
  subscription = socketClient.subscribeToData(props.encodedSocketId)

  // колбэк передаётся в subscription.listen(), а не в subscribeToData()
  subscription.listen(data => {
    if (data.type === 'progress') {
      progress.value = data.data.progress
    } else if (data.type === 'completed') {
      status.value = 'completed'
    } else if (data.type === 'error') {
      status.value = 'error'
    }
  })
})

onBeforeUnmount(() => {
  if (subscription) {
    subscription.unsubscribe()
  }
})
</script>
```

### Способ 2: encodedSocketId через GET-запрос к API

**Критически важно:** для GET-запросов параметры передавать через `.query()`, не через `.run(ctx, params)`.

```vue
<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { getOrCreateBrowserSocketClient } from '@app/socket'
import { apiGetSocketIdRoute } from '../api/chat'

const currentChainKey = ref('')
const selectedAgentId = ref('')
let subscription = null

onMounted(async () => {
  // ✅ ПРАВИЛЬНО для GET: .query({ ... }).run(ctx)
  const result = await apiGetSocketIdRoute
    .query({ chainKey: currentChainKey.value, agentId: selectedAgentId.value })
    .run(ctx)

  if (!result.success) return

  const socketClient = await getOrCreateBrowserSocketClient()
  subscription = socketClient.subscribeToData(result.encodedSocketId)

  subscription.listen(data => {
    // обработка
  })
})

onBeforeUnmount(() => {
  subscription?.unsubscribe()
})
</script>
```

**Правило вызова роутов на клиенте:**
- POST/PUT: `.run(ctx, { params })` — параметры в body
- GET: `.query({ params }).run(ctx)` — параметры в query string
- GET через `.run(ctx, { params })` — **НЕ работает**, `req.query` будет пустым

### Типизация socket-сообщений

```typescript
type SocketMessage =
  | { type: 'progress'; data: { progress: number; message: string } }
  | { type: 'completed'; data: { message: string } }
  | { type: 'error'; data: { error: string } }

subscription.listen((data: SocketMessage) => {
  switch (data.type) {
    case 'progress':
      progress.value = data.data.progress
      break
    case 'completed':
      status.value = 'completed'
      break
    case 'error':
      status.value = 'error'
      break
  }
})
```

## Паттерны

- **Именование socketId:** стабильные, уникальные для фичи (`chat-${chatId}`, `user-${userId}-notifications`)
- **Не** генерировать случайные ID (`Math.random()`, `Date.now()`)
- На сервере: вызывать `sendDataToSocket` после изменения данных
- На клиенте: не держать тяжёлую логику в колбэке; обновлять реактивное состояние (`ref`/`reactive`)
- Всегда оборачивать `sendDataToSocket` в `try/catch` и логировать ошибки через `ctx.account.log`
- WebSocket не предназначен для больших объёмов (видео); для видео-стриминга — WebRTC

## Чеклист

- [ ] socketId стабильный (не случайный), согласован между сервером и клиентом
- [ ] `genSocketId(ctx, socketId)` вызывается на сервере для получения `encodedSocketId`
- [ ] `sendDataToSocket(ctx, socketId, data)` — НЕкодированный socketId, три отдельных аргумента
- [ ] `subscribeToData(encodedSocketId)` — закодированный encodedSocketId, возвращает `subscription`
- [ ] Колбэк передаётся в `subscription.listen(callback)`, а не в `subscribeToData()`
- [ ] Отписка `subscription.unsubscribe()` в `onBeforeUnmount`
- [ ] GET-эндпоинт для socketId вызывается через `.query({ ... }).run(ctx)`
- [ ] В job-е ошибки пойманы в `catch` и отправлены через `sendDataToSocket` с `type: 'error'`
- [ ] `ctx.account.log` используется для логирования, а не `console.log`

## Ссылки

- **014-socket.md** — WebSocket API, полные примеры (уведомления, прогресс, чат), лучшие практики, ограничения
- **005-jobs.md** — Отправка из отложенных задач (для долгих операций с прогрессом)
- **002-routing.md** — Интеграция в роуты
- **007-vue.md** — Использование в Vue компонентах

## Примеры в кодовой базе

- `tg/pa_sample/` — realtime в чате (обновление сообщений, статусов)
