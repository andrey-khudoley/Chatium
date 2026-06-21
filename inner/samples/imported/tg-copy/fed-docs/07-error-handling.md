# Обработка ошибок и edge cases

## Категории ошибок

### 1. Сетевые ошибки

#### Хост недоступен

**Проблема:**
Клиентский инстанс не может достучаться до хост-инстанса.

**Причины:**
- Хост-инстанс выключен
- Сетевые проблемы
- DNS не резолвится
- Firewall блокирует запросы

**Обработка:**

```typescript
// На клиенте при отправке запроса
async function sendToHost(url: string, data: any): Promise<any> {
  const maxRetries = 3
  let attempt = 0
  
  while (attempt < maxRetries) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Federation-Token': federationToken,
        },
        body: JSON.stringify(data),
        timeout: 10000,  // 10 секунд
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      return await response.json()
    } catch (error) {
      attempt++
      
      // Логируем
      ctx.account.log('Host unreachable', {
        level: 'warn',
        json: {
          url,
          attempt,
          error: error.message,
        },
      })
      
      // Если последняя попытка - выбрасываем ошибку
      if (attempt >= maxRetries) {
        throw new NetworkError('Host unreachable after 3 attempts', {
          url,
          originalError: error,
        })
      }
      
      // Exponential backoff
      const delay = Math.pow(2, attempt) * 1000
      await sleep(delay)
    }
  }
}
```

**UI:**
```vue
<template>
  <div v-if="hostUnreachable" class="error-banner">
    ⚠️ Соединение с {{ hostDomain }} потеряно.
    <button @click="retryConnection">Повторить</button>
  </div>
</template>
```

**Автоматические действия:**
- Показать уведомление пользователю
- Блокировать отправку новых сообщений
- Попытки переподключения каждые 30 секунд
- Переход в режим "только чтение"

#### WebSocket отключился

**Обработка:**

```typescript
// В useFederationSocket.ts
let reconnectAttempts = 0
const maxReconnectAttempts = 10

function setupWebSocket() {
  const ws = new WebSocket(wsUrl)
  
  ws.onclose = () => {
    isConnected.value = false
    
    if (reconnectAttempts < maxReconnectAttempts) {
      reconnectAttempts++
      
      // Exponential backoff с максимумом 30 секунд
      const delay = Math.min(Math.pow(2, reconnectAttempts) * 1000, 30000)
      
      setTimeout(() => {
        setupWebSocket()
      }, delay)
    } else {
      // Показать ошибку пользователю
      error.value = 'Не удалось восстановить соединение. Перезагрузите страницу.'
    }
  }
  
  ws.onerror = (err) => {
    ctx.account.log('WebSocket error', {
      level: 'error',
      json: {
        error: err.message,
        wsUrl,
      },
    })
  }
  
  ws.onopen = () => {
    isConnected.value = true
    reconnectAttempts = 0  // Сброс счетчика при успехе
  }
}
```

### 2. Ошибки аутентификации

#### Неверный токен

**Обработка на хосте:**

```typescript
export const apiFederationMessagesSendRoute = app.post('/messages/send', async (ctx, req) => {
  const token = req.headers['x-federation-token']
  const feedId = req.body.feedId
  
  const validation = await fullTokenValidation(ctx, token, feedId)
  
  if (!validation.valid) {
    // Логируем подозрительную активность
    ctx.account.log('Invalid federation token', {
      level: 'warn',
      json: {
        feedId,
        token: token.slice(0, 8) + '...',  // Частично
        reason: validation.reason,
        ip: req.ip,
        instanceDomain: req.headers['x-instance-domain'],
      },
    })
    
    // Увеличиваем счетчик неудачных попыток
    await recordFailedAuthAttempt(req.ip, req.headers['x-instance-domain'])
    
    // Проверяем, не пора ли заблокировать
    const shouldBlock = await checkShouldBlockInstance(req.headers['x-instance-domain'])
    if (shouldBlock) {
      await blockInstance(ctx, req.headers['x-instance-domain'], 'Too many auth failures')
    }
    
    ctx.resp.status = 403
    return {
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Authentication failed',
      },
    }
  }
  
  // Продолжаем обработку...
})
```

**Обработка на клиенте:**

```typescript
// Если получили 403 с INVALID_TOKEN
if (response.error?.code === 'INVALID_TOKEN') {
  // Это критическая ошибка - токен больше не работает
  
  // 1. Помечаем чат как "требует переподключения"
  await Chats.update(ctx, {
    id: chatId,
    federationEnabled: false,
  })
  
  // 2. Показываем модалку пользователю
  showModal({
    title: 'Требуется переподключение',
    message: 'Токен доступа больше не действителен. Свяжитесь с администратором хост-инстанса для получения новой ссылки.',
    actions: [
      { label: 'Понятно', primary: true },
      { label: 'Отключиться от чата', destructive: true, onClick: disconnectFromChat },
    ],
  })
}
```

#### Токен истёк (если реализована expiration)

**Опционально:** Можно добавить срок действия токенов.

```typescript
// В таблице chats добавить поле
{
  "federationTokenExpiresAt": {
    "kind": "DateKind",
    "title": "Токен действителен до"
  }
}

// Проверка при валидации
if (chat.federationTokenExpiresAt && chat.federationTokenExpiresAt < new Date()) {
  return {
    valid: false,
    reason: 'TOKEN_EXPIRED',
  }
}
```

**Обработка:**
- За 7 дней до истечения — уведомить владельца хост-чата
- За 1 день — уведомить подключенные инстансы
- После истечения — блокировать доступ, но сохранить историю
- Владелец может обновить токен через UI

### 3. Конфликты данных

#### Одновременная отправка с разных инстансов

**Проблема:**
Два пользователя из разных инстансов одновременно отправляют сообщения.

**Решение:**
Feed API автоматически обрабатывает конкурентные вставки. Каждое сообщение получает уникальный ID и timestamp.

**Дополнительная защита:**

```typescript
// Клиентская дедупликация по optimistic ID
const pendingMessages = new Map<string, Message>()

async function sendMessage(text: string) {
  const optimisticId = `temp-${Date.now()}-${Math.random()}`
  
  const optimisticMessage = {
    id: optimisticId,
    text,
    createdAt: new Date(),
    author: currentUser,
    pending: true,
  }
  
  // Показываем сообщение сразу
  messages.value.push(optimisticMessage)
  pendingMessages.set(optimisticId, optimisticMessage)
  
  try {
    const response = await sendToHost(...)
    
    // Заменяем оптимистичное сообщение на реальное
    const index = messages.value.findIndex(m => m.id === optimisticId)
    if (index !== -1) {
      messages.value[index] = {
        ...optimisticMessage,
        id: response.messageId,
        pending: false,
      }
    }
    
    pendingMessages.delete(optimisticId)
  } catch (error) {
    // Помечаем сообщение как "не отправлено"
    const index = messages.value.findIndex(m => m.id === optimisticId)
    if (index !== -1) {
      messages.value[index].error = true
      messages.value[index].errorMessage = 'Не удалось отправить'
    }
  }
}
```

#### Удаление сообщения до получения на клиенте

**Проблема:**
1. Хост создал сообщение (messageId: 123)
2. Хост сразу удалил это сообщение
3. WebSocket событие "new-message" ещё в пути к клиенту
4. WebSocket событие "delete-message" уже пришло на клиент

**Решение:**

```typescript
// На клиенте
const deletedMessageIds = new Set<string>()

watch(socketData, (data) => {
  if (data.event === 'delete-message') {
    const messageId = data.data.messageId
    
    // Добавляем в set удалённых
    deletedMessageIds.add(messageId)
    
    // Удаляем из списка, если есть
    const index = messages.value.findIndex(m => m.id === messageId)
    if (index !== -1) {
      messages.value.splice(index, 1)
    }
  }
  
  if (data.event === 'new-message') {
    const message = data.data.message
    
    // Проверяем, не удалено ли уже
    if (deletedMessageIds.has(message.id)) {
      // Игнорируем
      return
    }
    
    messages.value.push(message)
  }
})
```

#### Редактирование удалённого сообщения

**Обработка на хосте:**

```typescript
export const apiFederationMessagesEditRoute = app.post('/messages/edit', async (ctx, req) => {
  const message = await findFeedMessageById(ctx, req.body.feedId, req.body.messageId)
  
  if (!message) {
    ctx.resp.status = 404
    return {
      success: false,
      error: {
        code: 'MESSAGE_NOT_FOUND',
        message: 'Message not found or already deleted',
      },
    }
  }
  
  // Продолжаем редактирование...
})
```

### 4. Проблемы с файлами

#### Файл недоступен с клиентского инстанса

**Проблема:**
Клиент отправил сообщение с файлом, но URL файла недоступен с хост-инстанса.

**Валидация на хосте:**

```typescript
async function validateFileUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      timeout: 5000,
    })
    
    return response.ok
  } catch (error) {
    return false
  }
}

// При получении сообщения с файлами
for (const file of message.files) {
  const isAccessible = await validateFileUrl(file.url)
  
  if (!isAccessible) {
    throw new ValidationError('File URL is not accessible', {
      fileUrl: file.url,
      fileName: file.name,
    })
  }
}
```

**Требование к клиенту:**
Все файлы ДОЛЖНЫ быть загружены в Chatium Filestorage и иметь публичный URL вида:
```
https://fs.chatium.ru/get/{hash}
```

#### Файл слишком большой

**Проверка:**

```typescript
const MAX_FILE_SIZE = 100 * 1024 * 1024  // 100 MB

for (const file of message.files) {
  if (file.size > MAX_FILE_SIZE) {
    throw new ValidationError('File too large', {
      fileName: file.name,
      fileSize: file.size,
      maxSize: MAX_FILE_SIZE,
    })
  }
}
```

### 5. Проблемы с участниками

#### Участник удалён из хост-чата

**Сценарий:**
1. Пользователь из client.chatium.ru присоединился к чату
2. Администратор хост-чата удалил его из участников
3. Но на client.chatium.ru он все еще видит чат

**Обработка:**

```typescript
// На хосте при удалении участника
export const apiParticipantsRemoveRoute = app.post('/:feedId/remove', async (ctx, req) => {
  const participant = await findParticipant(ctx, req.params.feedId, req.body.participantId)
  
  // Удаляем из Feed API
  await deleteFeedParticipant(ctx, req.params.feedId, participant)
  
  // Удаляем из federation_participants
  await FederationParticipants.deleteBy(ctx, {
    chatId: req.params.feedId,
    participantId: req.body.participantId,
  })
  
  // Если это федеративный участник, отправляем событие его инстансу
  if (participant.instanceDomain) {
    await sendEventToInstance(ctx, participant.instanceDomain, {
      type: 'participant-removed',
      feedId: req.params.feedId,
      participantId: req.body.participantId,
      userId: participant.remoteUserId,
    })
  }
})

// На клиенте при получении события
watch(socketData, (data) => {
  if (data.event === 'participant-removed') {
    // Если удалили текущего пользователя
    if (data.data.userId === ctx.user.id) {
      // Помечаем чат как "доступ отозван"
      showNotification({
        type: 'warning',
        message: 'Вы были удалены из чата',
      })
      
      // Скрываем чат из списка или помечаем как read-only
      await Chats.update(ctx, {
        id: chatId,
        federationEnabled: false,
      })
      
      // Закрываем чат, если открыт
      if (currentChatId === data.data.feedId) {
        router.push('/')
      }
    }
  }
})
```

#### Участник из инстанса, который отключился

**Обработка:**

```typescript
// На хосте при отключении инстанса
async function handleInstanceDisconnect(
  ctx: app.Ctx,
  chatId: string,
  instanceDomain: string
) {
  // Помечаем всех участников из этого инстанса как "offline"
  const participants = await FederationParticipants.findAll(ctx, {
    where: {
      chatId,
      remoteInstanceDomain: instanceDomain,
    },
  })
  
  for (const p of participants) {
    await FederationParticipants.update(ctx, {
      id: p.id,
      lastActiveAt: new Date(),
    })
  }
  
  // Отправляем событие другим инстансам
  await broadcastToFederation(ctx, chatId, 'instance-disconnected', {
    instanceDomain,
    participantIds: participants.map(p => p.participantId),
  })
}
```

**На клиенте:**

```vue
<template>
  <div
    v-for="p in participants"
    :key="p.id"
    class="participant"
    :class="{ 'participant-offline': isOffline(p) }"
  >
    {{ p.displayName }}
    <span v-if="isOffline(p)" class="offline-badge">офлайн</span>
  </div>
</template>

<script setup>
function isOffline(participant) {
  if (!participant.instanceDomain) return false
  
  const disconnectedInstances = store.disconnectedInstances || []
  return disconnectedInstances.includes(participant.instanceDomain)
}
</script>
```

### 6. Проблемы производительности

#### Слишком много сообщений

**Проблема:**
В чате 100,000 сообщений. Клиент запрашивает всю историю.

**Защита на хосте:**

```typescript
export const apiFederationMessagesListRoute = app.get('/messages/list', async (ctx, req) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 100)  // Максимум 100
  
  const messages = await findFeedMessages(ctx, req.query.feedId, {
    mode: 'tail',
    limit,
    beforeMessageId: req.query.beforeMessageId,
  })
  
  return {
    success: true,
    data: {
      messages,
      hasMore: messages.length === limit,
    },
  }
})
```

**На клиенте — виртуальный скролл:**

```vue
<template>
  <virtual-list
    :items="messages"
    :item-height="estimateHeight"
    class="messages-list"
  >
    <template #default="{ item }">
      <MessageItem :message="item" />
    </template>
  </virtual-list>
</template>
```

#### Слишком много участников

**Проблема:**
В чате 10,000 участников. Запрос списка участников.

**Защита:**

```typescript
export const apiFederationParticipantsListRoute = app.get('/list', async (ctx, req) => {
  const limit = Math.min(parseInt(req.query.limit) || 100, 1000)
  
  const participants = await FederationParticipants.findAll(ctx, {
    where: { chatId: req.query.feedId },
    limit,
    offset: parseInt(req.query.offset) || 0,
  })
  
  const total = await FederationParticipants.countBy(ctx, {
    chatId: req.query.feedId,
  })
  
  return {
    success: true,
    data: {
      participants,
      total,
      hasMore: total > (parseInt(req.query.offset) || 0) + limit,
    },
  }
})
```

**На клиенте — ленивая загрузка:**

```vue
<template>
  <div class="participants-list" @scroll="onScroll">
    <div v-for="p in participants" :key="p.id">
      {{ p.displayName }}
    </div>
    <div v-if="loading">Загрузка...</div>
  </div>
</template>

<script setup>
async function onScroll(e) {
  const { scrollTop, scrollHeight, clientHeight } = e.target
  
  if (scrollTop + clientHeight >= scrollHeight - 100 && !loading.value && hasMore.value) {
    loading.value = true
    offset.value += 100
    await loadMoreParticipants()
    loading.value = false
  }
}
</script>
```

### 7. Проблемы безопасности

#### SQL Injection через participantId

**Проблема:**
Злоумышленник отправляет `participantId` с SQL инъекцией.

**Защита:**
Heap Tables автоматически защищают от SQL injection через параметризованные запросы.

**Дополнительная валидация:**

```typescript
function sanitizeParticipantId(id: string): string {
  // Только буквы, цифры, дефисы, подчеркивания
  const sanitized = id.replace(/[^a-zA-Z0-9\-_.]/g, '')
  
  if (sanitized !== id) {
    throw new ValidationError('Invalid participantId format')
  }
  
  return sanitized
}
```

#### XSS через displayName

**Защита:**

```typescript
function sanitizeDisplayName(name: string): string {
  // Удаляем HTML теги
  const sanitized = name.replace(/<[^>]*>/g, '')
  
  // Ограничиваем длину
  return sanitized.slice(0, 100)
}
```

**На клиенте:**

```vue
<!-- Используем v-text вместо v-html -->
<div class="participant-name" v-text="participant.displayName" />
```

#### CSRF через federation API

**Защита:**
Federation API не использует cookies, только токены в заголовках. CSRF невозможен.

### 8. Проблемы с синхронизацией

#### Клиент получил события не в порядке

**Проблема:**
Из-за сетевых задержек события приходят не по порядку:
1. edit-message (messageId: 123)
2. new-message (messageId: 123)

**Решение:**

```typescript
// Буферизация событий до получения всех зависимостей
const eventBuffer = []
const processedMessages = new Set()

function processEvent(event) {
  if (event.event === 'edit-message') {
    const messageId = event.data.messageId
    
    // Проверяем, есть ли уже это сообщение
    if (!processedMessages.has(messageId)) {
      // Сообщения ещё нет, буферизуем событие
      eventBuffer.push(event)
      return
    }
    
    // Сообщение есть, применяем редактирование
    applyEdit(event.data)
  }
  
  if (event.event === 'new-message') {
    const messageId = event.data.message.id
    
    // Добавляем сообщение
    addMessage(event.data.message)
    processedMessages.add(messageId)
    
    // Проверяем буфер на отложенные события для этого сообщения
    const bufferedEvents = eventBuffer.filter(e =>
      e.event === 'edit-message' && e.data.messageId === messageId
    )
    
    for (const buffered of bufferedEvents) {
      applyEdit(buffered.data)
      
      // Удаляем из буфера
      const index = eventBuffer.indexOf(buffered)
      eventBuffer.splice(index, 1)
    }
  }
}
```

#### Потеря событий при переподключении

**Решение:**

```typescript
// При переподключении WebSocket
async function onReconnect() {
  // Получаем ID последнего сообщения
  const lastMessageId = messages.value[messages.value.length - 1]?.id
  
  if (!lastMessageId) return
  
  // Запрашиваем новые сообщения с хоста
  const newMessages = await fetchNewMessages({
    feedId,
    afterMessageId: lastMessageId,
  })
  
  // Добавляем в список
  for (const msg of newMessages) {
    if (!messages.value.find(m => m.id === msg.id)) {
      messages.value.push(msg)
    }
  }
}
```

## Общие принципы обработки ошибок

### 1. Fail gracefully

```typescript
try {
  await sendMessage(...)
} catch (error) {
  // НЕ ломаем весь UI
  // Показываем ошибку только для этого сообщения
  message.error = true
  message.errorMessage = 'Не удалось отправить'
}
```

### 2. Retry with exponential backoff

```typescript
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      if (i === maxRetries - 1) throw error
      
      const delay = Math.pow(2, i) * 1000
      await sleep(delay)
    }
  }
}
```

### 3. Логировать все ошибки

```typescript
try {
  await criticalOperation()
} catch (error) {
  ctx.account.log('Critical operation failed', {
    level: 'error',
    json: {
      error: error.message,
      stack: error.stack,
      context: { /* relevant data */ },
    },
  })
  
  throw error
}
```

### 4. Информативные сообщения для пользователя

```typescript
// ❌ Плохо
alert('Error')

// ✅ Хорошо
showNotification({
  type: 'error',
  title: 'Не удалось отправить сообщение',
  message: 'Проверьте подключение к интернету и попробуйте снова',
  actions: [
    { label: 'Повторить', onClick: retry },
    { label: 'Отмена' },
  ],
})
```

### 5. Circuit breaker для критических систем

```typescript
const circuitBreaker = new CircuitBreaker({
  threshold: 5,  // После 5 ошибок открываем circuit
  timeout: 30000,  // Пытаемся восстановиться через 30 сек
})

async function sendToHost(...) {
  return circuitBreaker.execute(async () => {
    return await fetch(...)
  })
}
```

## Checklist обработки ошибок

- [ ] Все сетевые запросы имеют timeout
- [ ] Все сетевые запросы имеют retry с exponential backoff
- [ ] WebSocket reconnect реализован
- [ ] Все ошибки логируются
- [ ] Пользователю показываются информативные сообщения
- [ ] UI не ломается при ошибках
- [ ] Критические операции защищены circuit breaker
- [ ] Валидация всех входящих данных
- [ ] Защита от SQL injection
- [ ] Защита от XSS
- [ ] Обработка конкурентных операций
- [ ] Обработка удаления несуществующих записей
- [ ] Обработка недоступных файлов
- [ ] Ограничение размера файлов
- [ ] Ограничение количества запросов (rate limiting)
- [ ] Обработка отключения инстансов
- [ ] Обработка удаления участников
- [ ] Виртуальный скролл для больших списков
- [ ] Ленивая загрузка участников
- [ ] Буферизация событий при out-of-order доставке
- [ ] Синхронизация после переподключения
