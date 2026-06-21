@chatium

# WebSocket для real-time обновлений в Chatium

Исчерпывающее руководство по использованию WebSocket для обновлений в реальном времени в Chatium. Документ структурирован для удобства полнотекстового поиска и работы с эмбеддингами.

## Содержание

- [Основные концепции](#основные-концепции)
- [Архитектура](#архитектура)
- [Серверная часть](#серверная-часть)
  - [Генерация socketId](#генерация-socketid)
  - [Отправка данных в socket](#отправка-данных-в-socket)
- [Клиентская часть](#клиентская-часть)
  - [Подписка на socket](#подписка-на-socket)
  - [Обработка данных](#обработка-данных)
- [Практические примеры](#практические-примеры)
  - [Уведомления в реальном времени](#уведомления-в-реальном-времени)
  - [Прогресс обработки](#прогресс-обработки)
  - [Чат в реальном времени](#чат-в-реальном-времени)
- [Лучшие практики](#лучшие-практики)

---

## Основные концепции

**WebSocket в Chatium** — система для обновлений в реальном времени между сервером и клиентом.

### Ключевые компоненты

- **sendDataToSocket** — отправка данных с сервера
- **genSocketId** — генерация закодированного ID
- **getOrCreateBrowserSocketClient** — подключение на клиенте
- **subscribeToData** — подписка на обновления

### Принципы работы

1. Сервер генерирует **закодированный socketId**
2. Передаёт его клиенту (через props, HTML)
3. Клиент подписывается на обновления по этому ID
4. Сервер отправляет данные в socket
5. Клиент получает данные в реальном времени

### Когда использовать

- ✅ Уведомления в реальном времени
- ✅ Прогресс долгих операций
- ✅ Чаты и обмен сообщениями
- ✅ Live обновления данных
- ❌ **НЕ** используйте для передачи больших объёмов (видео)
- ❌ Для видео-стриминга используйте WebRTC

---

## Архитектура

### Шаги интеграции

1. **Выбор socketId** — используйте стабильный ID (не генерируйте случайный)
2. **Серверная отправка** — `sendDataToSocket(ctx, socketId, data)`
3. **Передача на клиент** — через props или HTML
4. **Подписка на клиенте** — `socketClient.subscribeToData(encodedSocketId)`

### Важно

- ⚠️ **Для отправки** используйте **НЕ**кодированный socketId
- ⚠️ **Для подписки** используйте **закодированный** socketId

---

## Серверная часть

### Генерация socketId

Используйте стабильный ID, а не случайный.

```typescript
import { genSocketId } from '@app/socket'

// ✅ Хорошо: стабильные ID
const socketId = `thread-${threadId}`
const socketId = `order-${orderId}`
const socketId = `user-${userId}-chat`

// ❌ Плохо: случайный ID
const socketId = Math.random().toString()
```

**Генерация закодированного ID**:

```typescript
import { genSocketId } from '@app/socket'

const socketId = `thread-${threadId}`
const encodedSocketId = await genSocketId(ctx, socketId)

// Передаём на клиент
return {
  threadId,
  encodedSocketId
}
```

### Отправка данных в socket

```typescript
import { sendDataToSocket } from '@app/socket'

// Отправка данных
await sendDataToSocket(ctx, socketId, {
  type: 'socket-data',
  data: {
    message: 'Обновление из сервера',
    timestamp: Date.now()
  }
})
```

**В API роуте**:

```typescript
export const processDataRoute = app.post('/process', async (ctx, req) => {
  const { threadId } = req.body
  const socketId = `thread-${threadId}`

  // Запускаем обработку
  processDataJob.scheduleJobAsap(ctx, { threadId, socketId })

  return {
    success: true,
    message: 'Обработка начата'
  }
})

const processDataJob = app.job('/process-data', async (ctx, params) => {
  const { threadId, socketId } = params

  for (let i = 0; i < 10; i++) {
    // Долгая обработка
    await processChunk(ctx, threadId, i)

    // Отправляем прогресс
    await sendDataToSocket(ctx, socketId, {
      type: 'progress',
      data: {
        progress: (i + 1) * 10,
        message: `Обработано ${i + 1} из 10`
      }
    })
  }

  // Финальное уведомление
  await sendDataToSocket(ctx, socketId, {
    type: 'completed',
    data: {
      message: 'Обработка завершена!'
    }
  })
})
```

---

## Клиентская часть

### Подписка на socket

#### Способ 1: Передача encodedSocketId через HTML (SSR)

**Передача encodedSocketId через HTML**:

```typescript
// pages/thread.tsx
import { genSocketId } from '@app/socket'

export default app.html('/thread/:id', async (ctx, req) => {
  const threadId = req.params.id
  const socketId = `thread-${threadId}`
  const encodedSocketId = await genSocketId(ctx, socketId)

  return (
    <html>
      <body>
        <VuePage
          threadId={threadId}
          encodedSocketId={encodedSocketId}
        />
      </body>
    </html>
  )
})
```

**Vue компонент с подпиской**:

```vue
<template>
  <div>
    <h1>Thread {{ props.threadId }}</h1>

    <div v-for="message in messages" :key="message.timestamp">
      {{ message.message }}
    </div>

    <div v-if="progress > 0">Прогресс: {{ progress }}%</div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getOrCreateBrowserSocketClient } from '@app/socket'

const props = defineProps<{
  threadId: string
  encodedSocketId: string
}>()

const messages = ref([])
const progress = ref(0)

onMounted(async () => {
  // Получаем socket клиент
  const socketClient = await getOrCreateBrowserSocketClient()

  // Подписываемся на обновления (используем ЗАКОДИРОВАННЫЙ ID!)
  const subscription = socketClient.subscribeToData(props.encodedSocketId)

  // Слушаем данные
  subscription.listen(data => {
    console.log('Socket data received', data)

    if (data.type === 'progress') {
      progress.value = data.data.progress
      messages.value.push(data.data)
    } else if (data.type === 'completed') {
      messages.value.push(data.data)
      progress.value = 100
    } else {
      messages.value.push(data.data)
    }
  })
})
</script>
```

#### Способ 2: Получение encodedSocketId через API

**⚠️ КРИТИЧЕСКИ ВАЖНО для GET запросов**: При получении `encodedSocketId` через API endpoint используйте метод `.query()` для передачи параметров!

**API endpoint для генерации socketId**:

```typescript
// api/chat.ts
import { genSocketId } from '@app/socket'

export const apiGetSocketIdRoute = app.get('/socket-id', async (ctx, req) => {
  try {
    const { chainKey, agentId } = req.query

    if (!chainKey || !agentId) {
      return {
        success: false,
        error: 'chainKey и agentId обязательны'
      }
    }

    const socketId = `chat-${ctx.user.id}-${chainKey}-${agentId}`
    const encodedSocketId = await genSocketId(ctx, socketId)

    ctx.account.log('🔌 Generated socket ID for client', {
      level: 'info',
      json: { userId: ctx.user.id, chainKey, agentId, socketId }
    })

    return {
      success: true,
      encodedSocketId
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    }
  }
})
```

**Vue компонент - ПРАВИЛЬНОЕ использование**:

```vue
<script setup>
import { ref, onMounted } from 'vue'
import { getOrCreateBrowserSocketClient } from '@app/socket'
import { apiGetSocketIdRoute } from '../api/chat'

const currentChainKey = ref('')
const selectedAgentId = ref('')
const messages = ref([])
const socketSubscription = ref(null)

onMounted(async () => {
  await subscribeToSocket()
})

async function subscribeToSocket() {
  if (!selectedAgentId.value || !currentChainKey.value) return

  try {
    // ✅ ПРАВИЛЬНО: для GET запросов используем .query()
    const result = await apiGetSocketIdRoute
      .query({
        chainKey: currentChainKey.value,
        agentId: selectedAgentId.value
      })
      .run(ctx)

    if (!result.success) {
      console.error('Failed to get socket ID:', result.error)
      return
    }

    console.log('Got encodedSocketId:', result.encodedSocketId)

    // Создаём подписку
    const socketClient = await getOrCreateBrowserSocketClient()
    socketSubscription.value = socketClient.subscribeToData(result.encodedSocketId)

    // Слушаем обновления
    socketSubscription.value.listen((data) => {
      if (data.type === 'assistant-message') {
        messages.value.push({
          role: 'assistant',
          content: data.data.content
        })
      }
    })
  } catch (error) {
    console.error('Error subscribing to socket:', error)
  }
}
</script>
```

**❌ НЕПРАВИЛЬНОЕ использование**:

```vue
<script setup>
// ❌ НЕПРАВИЛЬНО: передача параметров как body для GET запроса
const result = await apiGetSocketIdRoute.run(ctx, {
  chainKey: currentChainKey.value,
  agentId: selectedAgentId.value
})
// Это НЕ работает! req.query будет пустым!
</script>
```

**Правило**:

- ✅ **POST/PUT**: `.run(ctx, { params })` - параметры в body
- ✅ **GET**: `.query({ params }).run(ctx)` - параметры в query string
- ❌ **GET**: `.run(ctx, { params })` - НЕ РАБОТАЕТ!

### Обработка данных

**Обработка разных типов сообщений**:

```vue
<script setup>
import { ref, onMounted } from 'vue'
import { getOrCreateBrowserSocketClient } from '@app/socket'

const props = defineProps<{
  encodedSocketId: string
}>()

const notifications = ref([])
const progress = ref(0)
const status = ref('idle')

onMounted(async () => {
  const socketClient = await getOrCreateBrowserSocketClient()
  const subscription = socketClient.subscribeToData(props.encodedSocketId)

  subscription.listen(data => {
    switch (data.type) {
      case 'progress':
        progress.value = data.data.progress
        status.value = 'processing'
        break

      case 'completed':
        status.value = 'completed'
        notifications.value.push({
          type: 'success',
          message: data.data.message
        })
        break

      case 'error':
        status.value = 'error'
        notifications.value.push({
          type: 'error',
          message: data.data.error
        })
        break

      case 'notification':
        notifications.value.push({
          type: 'info',
          message: data.data.message
        })
        break

      default:
        ctx.account.log('Unknown socket message', { json: data })
    }
  })
})
</script>
```

---

## Практические примеры

### Уведомления в реальном времени

**Серверная часть**:

```typescript
// api/notifications.ts
import { sendDataToSocket } from '@app/socket'

export async function sendNotification(
  ctx: app.Ctx,
  userId: string,
  notification: {
    title: string
    message: string
    type: 'info' | 'success' | 'warning' | 'error'
  }
) {
  const socketId = `user-${userId}-notifications`

  await sendDataToSocket(ctx, socketId, {
    type: 'notification',
    data: {
      ...notification,
      timestamp: Date.now()
    }
  })
}

// Использование
export const createOrderRoute = app.post('/order/create', async (ctx, req) => {
  const order = await Orders.create(ctx, req.body)

  // Отправляем уведомление
  await sendNotification(ctx, ctx.user.id, {
    title: 'Заказ создан',
    message: `Заказ #${order.id} успешно создан`,
    type: 'success'
  })

  return { success: true, order }
})
```

**Клиентская часть**:

```vue
<template>
  <div class="notifications">
    <div
      v-for="notif in notifications"
      :key="notif.timestamp"
      :class="['notification', notif.type]"
    >
      <h4>{{ notif.title }}</h4>
      <p>{{ notif.message }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getOrCreateBrowserSocketClient } from '@app/socket'
import { genSocketId } from '@app/socket'

const notifications = ref([])

onMounted(async () => {
  // Генерируем socketId для текущего пользователя
  const socketId = `user-${ctx.user.id}-notifications`
  const encodedSocketId = await genSocketId(ctx, socketId)

  const socketClient = await getOrCreateBrowserSocketClient()
  const subscription = socketClient.subscribeToData(encodedSocketId)

  subscription.listen((data) => {
    if (data.type === 'notification') {
      notifications.value.unshift(data.data)

      // Удаляем через 5 секунд
      setTimeout(() => {
        const index = notifications.value.findIndex((n) => n.timestamp === data.data.timestamp)
        if (index !== -1) {
          notifications.value.splice(index, 1)
        }
      }, 5000)
    }
  })
})
</script>

<style scoped>
.notification {
  padding: 1rem;
  margin-bottom: 0.5rem;
  border-radius: 4px;
  animation: slideIn 0.3s;
}

.notification.success {
  background: #d4edda;
  border-left: 4px solid #28a745;
}

.notification.error {
  background: #f8d7da;
  border-left: 4px solid #dc3545;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
</style>
```

### Прогресс обработки

**Серверная часть**:

```typescript
// api/upload.ts
import { sendDataToSocket } from '@app/socket'

const processFileJob = app.job('/process-file', async (ctx, params) => {
  const { fileHash, socketId } = params

  try {
    const steps = [
      { name: 'Загрузка', duration: 1000 },
      { name: 'Валидация', duration: 500 },
      { name: 'Обработка', duration: 2000 },
      { name: 'Сохранение', duration: 500 }
    ]

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i]
      const progress = ((i + 1) / steps.length) * 100

      await sendDataToSocket(ctx, socketId, {
        type: 'progress',
        data: {
          step: step.name,
          progress: Math.round(progress),
          message: `${step.name}...`
        }
      })

      // Имитация обработки
      await new Promise((resolve) => setTimeout(resolve, step.duration))
    }

    await sendDataToSocket(ctx, socketId, {
      type: 'completed',
      data: {
        message: 'Файл успешно обработан!',
        fileHash
      }
    })
  } catch (error: any) {
    await sendDataToSocket(ctx, socketId, {
      type: 'error',
      data: {
        error: error.message
      }
    })
  }
})

export const uploadFileRoute = app.post('/file/upload', async (ctx, req) => {
  const { fileHash } = req.body
  const socketId = `file-${fileHash}`

  processFileJob.scheduleJobAsap(ctx, { fileHash, socketId })

  // Возвращаем encodedSocketId
  const encodedSocketId = await genSocketId(ctx, socketId)

  return {
    success: true,
    encodedSocketId
  }
})
```

**Клиентская часть**:

```vue
<template>
  <div class="upload-progress">
    <div v-if="status === 'uploading'">
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: `${progress}%` }" />
      </div>
      <p>{{ currentStep }} - {{ progress }}%</p>
    </div>

    <div v-else-if="status === 'completed'">
      <p class="success">✓ Загрузка завершена!</p>
    </div>

    <div v-else-if="status === 'error'">
      <p class="error">✗ Ошибка: {{ errorMessage }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { getOrCreateBrowserSocketClient } from '@app/socket'
import { apiUploadFileRoute } from '../api/upload'

const progress = ref(0)
const currentStep = ref('')
const status = ref('idle')
const errorMessage = ref('')

async function uploadFile(fileHash: string) {
  status.value = 'uploading'

  // Запускаем обработку на сервере
  const result = await apiUploadFileRoute.run(ctx, { fileHash })

  if (!result.success) {
    status.value = 'error'
    errorMessage.value = 'Ошибка запуска обработки'
    return
  }

  // Подписываемся на обновления
  const socketClient = await getOrCreateBrowserSocketClient()
  const subscription = socketClient.subscribeToData(result.encodedSocketId)

  subscription.listen(data => {
    if (data.type === 'progress') {
      progress.value = data.data.progress
      currentStep.value = data.data.step
    } else if (data.type === 'completed') {
      status.value = 'completed'
      progress.value = 100
    } else if (data.type === 'error') {
      status.value = 'error'
      errorMessage.value = data.data.error
    }
  })
}

defineExpose({ uploadFile })
</script>

<style scoped>
.progress-bar {
  width: 100%;
  height: 20px;
  background: #f0f0f0;
  border-radius: 10px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #4caf50;
  transition: width 0.3s;
}

.success {
  color: #28a745;
  font-weight: bold;
}

.error {
  color: #dc3545;
  font-weight: bold;
}
</style>
```

### Чат в реальном времени

**Серверная часть**:

```typescript
// api/chat.ts
import { sendDataToSocket } from '@app/socket'

export const sendChatMessageRoute = app.post('/chat/send', async (ctx, req) => {
  const { chatId, message } = req.body

  // Сохраняем сообщение
  const chatMessage = await ChatMessages.create(ctx, {
    chatId,
    userId: ctx.user.id,
    message,
    timestamp: new Date()
  })

  // Отправляем через WebSocket всем участникам
  const socketId = `chat-${chatId}`

  await sendDataToSocket(ctx, socketId, {
    type: 'new-message',
    data: {
      id: chatMessage.id,
      userId: ctx.user.id,
      userName: ctx.user.displayName,
      message,
      timestamp: chatMessage.timestamp
    }
  })

  return { success: true, message: chatMessage }
})
```

**Клиентская часть**:

```vue
<template>
  <div class="chat">
    <div class="messages" ref="messagesContainer">
      <div
        v-for="msg in messages"
        :key="msg.id"
        :class="['message', { own: msg.userId === ctx.user.id }]"
      >
        <strong>{{ msg.userName }}:</strong>
        <p>{{ msg.message }}</p>
        <span class="time">{{ formatTime(msg.timestamp) }}</span>
      </div>
    </div>

    <div class="input-area">
      <input v-model="newMessage" @keyup.enter="sendMessage" placeholder="Введите сообщение..." />
      <button @click="sendMessage">Отправить</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { getOrCreateBrowserSocketClient } from '@app/socket'
import { apiSendChatMessageRoute } from '../api/chat'

const props = defineProps<{
  chatId: string
  encodedSocketId: string
}>()

const messages = ref([])
const newMessage = ref('')
const messagesContainer = ref(null)

onMounted(async () => {
  // Подписываемся на новые сообщения
  const socketClient = await getOrCreateBrowserSocketClient()
  const subscription = socketClient.subscribeToData(props.encodedSocketId)

  subscription.listen(data => {
    if (data.type === 'new-message') {
      messages.value.push(data.data)

      // Прокручиваем к последнему сообщению
      nextTick(() => {
        if (messagesContainer.value) {
          messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
        }
      })
    }
  })
})

async function sendMessage() {
  if (!newMessage.value.trim()) return

  await apiSendChatMessageRoute.run(ctx, {
    chatId: props.chatId,
    message: newMessage.value
  })

  newMessage.value = ''
}

function formatTime(timestamp: string) {
  return new Date(timestamp).toLocaleTimeString()
}
</script>

<style scoped>
.chat {
  display: flex;
  flex-direction: column;
  height: 500px;
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.message {
  margin-bottom: 1rem;
  padding: 0.5rem;
  background: #f0f0f0;
  border-radius: 8px;
}

.message.own {
  background: #e3f2fd;
  text-align: right;
}

.input-area {
  display: flex;
  padding: 1rem;
  border-top: 1px solid #ddd;
}

.input-area input {
  flex: 1;
  padding: 0.5rem;
  margin-right: 0.5rem;
}
</style>
```

---

## Лучшие практики

### Выбор socketId

✅ **Используйте стабильные ID**:

```typescript
// Хорошо
const socketId = `order-${orderId}`
const socketId = `user-${userId}-notifications`
const socketId = `thread-${threadId}`

// Плохо
const socketId = Math.random().toString()
const socketId = Date.now().toString()
```

### Обработка ошибок

✅ **Всегда оборачивайте в try/catch**:

```typescript
try {
  await sendDataToSocket(ctx, socketId, data)
} catch (error: any) {
  ctx.account.log('Ошибка отправки в socket', {
    level: 'error',
    json: { error: error.message, socketId }
  })
}
```

### Типизация данных

✅ **Типизируйте socket сообщения**:

```typescript
type SocketMessage =
  | { type: 'progress'; data: { progress: number; message: string } }
  | { type: 'completed'; data: { message: string } }
  | { type: 'error'; data: { error: string } }

subscription.listen((data: SocketMessage) => {
  // TypeScript проверит типы
})
```

### Очистка подписок

✅ **Отписывайтесь при размонтировании**:

```vue
<script setup>
import { onMounted, onBeforeUnmount } from 'vue'

let subscription = null

onMounted(async () => {
  const socketClient = await getOrCreateBrowserSocketClient()
  subscription = socketClient.subscribeToData(props.encodedSocketId)

  subscription.listen((data) => {
    // Обработка
  })
})

onBeforeUnmount(() => {
  if (subscription) {
    subscription.unsubscribe()
  }
})
</script>
```

### Ограничения

⚠️ **Не используйте для больших объёмов**:

- WebSocket в Chatium не предназначен для видео
- Для видео-стриминга используйте WebRTC
- Ограничьте размер сообщений

---

## Связанные документы

- **007-vue.md** — Использование в Vue компонентах
- **005-jobs.md** — Отправка из отложенных задач
- **002-routing.md** — Интеграция в роуты
- **001-standards.md** — Стандарты кодирования

---

**Версия**: 1.1  
**Дата**: 2025-11-03  
**Последнее обновление**: 2025-11-05 (Добавлен раздел о получении encodedSocketId через API с критически важным замечанием про использование .query() для GET запросов)
