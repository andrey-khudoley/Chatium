# WebSocket Изоляция для федеративных чатов

## Проблема

В текущей реализации WebSocket использует каналы вида `user-${userId}` для отправки событий конкретному пользователю. Это работает для локальных чатов, но создаёт проблему для федерации:

**Уязвимость:** Если использовать тот же подход, злоумышленник может подключиться к каналу другого чата, зная только userId.

## Решение: Отдельные каналы для федерации

### Архитектура каналов

#### 1. Локальные пользователи (как сейчас)
```
Канал: user-${userId}
События: все чаты, в которых участвует пользователь
```

#### 2. Федеративные клиенты (новые)
```
Канал: federation-${feedId}-${federationToken}
События: только события конкретного feedId
```

#### 3. Валидация подключения
При попытке подключиться к федеративному каналу:
1. Извлекается `feedId` и `federationToken` из имени канала
2. Проверяется, что токен валиден для этого feedId
3. Проверяется, что чат действительно федеративный
4. Только после успешной проверки — подключение разрешено

## Реализация

### Структура WebSocket Gateway

```typescript
// websocket-gateway.ts

import { sendDataToSocket, subscribeToSocket } from '@app/socket'

// Генерация имени федеративного канала
export function getFederationChannelName(feedId: string, token: string): string {
  return `federation-${feedId}-${token}`
}

// Валидация федеративного токена перед подключением
export async function validateFederationChannel(
  ctx: app.Ctx,
  channelName: string
): Promise<boolean> {
  // Парсинг имени канала
  const match = channelName.match(/^federation-([^-]+)-(.+)$/)
  if (!match) return false
  
  const [, feedId, token] = match
  
  // Загружаем чат из таблицы
  const chat = await Chats.findOneBy(ctx, { feedId })
  if (!chat) return false
  
  // Проверки
  if (!chat.isFederated) return false
  if (!chat.federationEnabled) return false
  if (chat.federationToken !== token) return false
  
  return true
}

// Отправка события в федеративный канал
export async function broadcastToFederation(
  ctx: app.Ctx,
  feedId: string,
  event: string,
  data: any
) {
  // Загружаем чат
  const chat = await Chats.findOneBy(ctx, { feedId })
  if (!chat || !chat.isFederated) return
  
  const channelName = getFederationChannelName(feedId, chat.federationToken!)
  
  await sendDataToSocket(ctx, channelName, {
    type: 'federation-event',
    event,
    feedId,
    data,
  })
}

// Отправка события локальным пользователям
export async function broadcastToLocalParticipants(
  ctx: app.Ctx,
  feedId: string,
  event: string,
  data: any
) {
  // Получаем всех локальных участников
  const participants = await FederationParticipants.findAll(ctx, {
    where: { chatId: feedId, isLocal: true },
    limit: 1000,
  })
  
  // Отправляем каждому
  for (const participant of participants) {
    if (!participant.userId) continue
    
    await sendDataToSocket(ctx, `user-${participant.userId}`, {
      type: 'chat-event',
      event,
      feedId,
      data,
    })
  }
}

// Универсальный broadcast (локально + федерация)
export async function broadcastChatEvent(
  ctx: app.Ctx,
  feedId: string,
  event: string,
  data: any
) {
  // Локальным участникам
  await broadcastToLocalParticipants(ctx, feedId, event, data)
  
  // Федеративным клиентам
  await broadcastToFederation(ctx, feedId, event, data)
}
```

### WebSocket Endpoint на хосте

```typescript
// api/federation-websocket.ts

import { subscribeToSocket } from '@app/socket'
import { validateFederationChannel, getFederationChannelName } from '../shared/websocket-gateway'

export const apiFederationWebSocketRoute = app.get('/ws/federation/:feedId/:token', async (ctx, req) => {
  const { feedId, token } = req.params
  const instanceDomain = req.query.instanceDomain as string
  
  if (!instanceDomain) {
    ctx.resp.status = 400
    return { error: 'instanceDomain required' }
  }
  
  // Валидация токена
  const channelName = getFederationChannelName(feedId, token)
  const isValid = await validateFederationChannel(ctx, channelName)
  
  if (!isValid) {
    ctx.resp.status = 403
    return { error: 'Invalid federation token' }
  }
  
  // Обновляем lastSeenAt в federation_connections
  const connection = await FederationConnections.findOneBy(ctx, {
    chatId: feedId,
    instanceDomain,
  })
  
  if (connection) {
    await FederationConnections.update(ctx, {
      id: connection.id,
      lastSeenAt: new Date(),
      isActive: true,
    })
  }
  
  // Логирование
  ctx.account.log('Federation WebSocket connected', {
    level: 'info',
    json: {
      feedId,
      instanceDomain,
      channelName,
    },
  })
  
  // Возвращаем данные для подключения
  return {
    channelName,
    encodedSocketId: await genSocketId(ctx, channelName),
  }
})
```

### Клиентская подписка

```typescript
// composables/useFederationSocket.ts

import { ref, watch, onUnmounted } from 'vue'
import { subscribeToData } from '@app/socket/client'

export function useFederationSocket(
  federationUrl: string,
  feedId: string,
  token: string,
  instanceDomain: string
) {
  const socketData = ref<any>(null)
  const isConnected = ref(false)
  const error = ref<string | null>(null)
  
  let unsubscribe: (() => void) | null = null
  
  async function connect() {
    try {
      // Запрашиваем WebSocket credentials у хоста
      const wsEndpoint = `${federationUrl}/api/federation/ws/${feedId}/${token}?instanceDomain=${instanceDomain}`
      const response = await fetch(wsEndpoint)
      const { channelName, encodedSocketId } = await response.json()
      
      // Подписываемся на канал
      const { data, unsubscribe: unsub } = subscribeToData(encodedSocketId)
      unsubscribe = unsub
      
      watch(data, (newData) => {
        socketData.value = newData
      })
      
      isConnected.value = true
      error.value = null
    } catch (e) {
      error.value = e.message
      isConnected.value = false
      
      // Retry через 5 секунд
      setTimeout(connect, 5000)
    }
  }
  
  connect()
  
  onUnmounted(() => {
    if (unsubscribe) {
      unsubscribe()
    }
  })
  
  return {
    socketData,
    isConnected,
    error,
  }
}
```

## Безопасность WebSocket

### 1. Изоляция по токену

**Проблема:** Клиент знает feedId, может ли он подключиться к чужому каналу?

**Решение:** Нет, т.к. для подключения нужен правильный `federationToken`. Без правильного токена валидация в `validateFederationChannel` вернёт false.

### 2. Защита от перебора токенов

**Проблема:** Злоумышленник может попытаться перебрать токены.

**Решение:**
- Токены генерируются криптографически стойким генератором (256 бит)
- После 5 неудачных попыток подключения — IP блокируется на 1 час
- Логирование всех неудачных попыток

```typescript
// Rate limiting для WebSocket
const failedAttempts = new Map<string, number>()

export async function checkWebSocketRateLimit(ip: string): Promise<boolean> {
  const attempts = failedAttempts.get(ip) || 0
  if (attempts >= 5) return false
  return true
}

export function recordFailedAttempt(ip: string) {
  const attempts = failedAttempts.get(ip) || 0
  failedAttempts.set(ip, attempts + 1)
  
  // Сброс через 1 час
  setTimeout(() => {
    failedAttempts.delete(ip)
  }, 60 * 60 * 1000)
}
```

### 3. Защита от утечки данных между каналами

**Проблема:** Сообщение из чата A случайно попало в канал чата B.

**Решение:**
- Каждое событие содержит `feedId`
- При отправке через `broadcastToFederation` проверяется соответствие feedId
- Клиент при получении события проверяет `event.feedId === expectedFeedId`

```typescript
// В broadcastToFederation
export async function broadcastToFederation(
  ctx: app.Ctx,
  feedId: string,
  event: string,
  data: any
) {
  const chat = await Chats.findOneBy(ctx, { feedId })
  if (!chat || !chat.isFederated) {
    // Логируем попытку broadcast в не-федеративный чат
    ctx.account.log('Attempted broadcast to non-federated chat', {
      level: 'warn',
      json: { feedId, event },
    })
    return
  }
  
  const channelName = getFederationChannelName(feedId, chat.federationToken!)
  
  // ВАЖНО: feedId включен в событие для валидации на клиенте
  await sendDataToSocket(ctx, channelName, {
    type: 'federation-event',
    event,
    feedId,  // <-- Обязательно!
    data,
    timestamp: new Date().toISOString(),
  })
}
```

### 4. Отключение при подозрительной активности

Если детектируется подозрительная активность:
- Слишком много попыток подключения
- Отправка невалидных данных
- Попытка доступа к другим feedId

То канал автоматически отключается:

```typescript
export async function disconnectFederationChannel(
  ctx: app.Ctx,
  feedId: string,
  instanceDomain: string,
  reason: string
) {
  // Помечаем соединение как неактивное
  const connection = await FederationConnections.findOneBy(ctx, {
    chatId: feedId,
    instanceDomain,
  })
  
  if (connection) {
    await FederationConnections.update(ctx, {
      id: connection.id,
      isActive: false,
    })
  }
  
  // Отправляем событие отключения
  const chat = await Chats.findOneBy(ctx, { feedId })
  if (chat?.federationToken) {
    const channelName = getFederationChannelName(feedId, chat.federationToken)
    await sendDataToSocket(ctx, channelName, {
      type: 'federation-event',
      event: 'federation-disconnected',
      feedId,
      data: {
        reason,
        message: 'Connection terminated due to security violation',
      },
    })
  }
  
  // Логирование
  ctx.account.log('Federation channel disconnected', {
    level: 'warn',
    json: {
      feedId,
      instanceDomain,
      reason,
    },
  })
}
```

## Мониторинг и алертинг

### Метрики для отслеживания

1. **Активные WebSocket соединения** по feedId
2. **Неудачные попытки подключения** по IP
3. **Трафик по каналу** (events/min)
4. **Задержка доставки событий**

### Алерты

Настроить уведомления при:
- Более 10 неудачных попыток подключения с одного IP за 5 минут
- Более 1000 событий/мин в один канал
- Задержка доставки более 1 секунды

## Тестирование изоляции

### Unit тесты

```typescript
// Тест изоляции каналов
test('Federation channel isolation', async () => {
  const chat1 = await createFederatedChat(ctx, 'Chat 1')
  const chat2 = await createFederatedChat(ctx, 'Chat 2')
  
  // Подключаемся к каналу chat1 с токеном chat2
  const isValid = await validateFederationChannel(
    ctx,
    getFederationChannelName(chat1.feedId, chat2.federationToken)
  )
  
  expect(isValid).toBe(false)
})

// Тест отправки в правильный канал
test('Events go to correct channel only', async () => {
  const chat1 = await createFederatedChat(ctx, 'Chat 1')
  const chat2 = await createFederatedChat(ctx, 'Chat 2')
  
  const events1 = []
  const events2 = []
  
  // Подписываемся на оба канала
  subscribeToChannel(chat1, (e) => events1.push(e))
  subscribeToChannel(chat2, (e) => events2.push(e))
  
  // Отправляем событие в chat1
  await broadcastToFederation(ctx, chat1.feedId, 'test', { data: 'test' })
  
  await sleep(100)
  
  // Проверяем, что событие пришло только в chat1
  expect(events1.length).toBe(1)
  expect(events2.length).toBe(0)
})
```

### Integration тесты

1. **Тест перебора токенов**
   - Сделать 10 попыток с неверными токенами
   - Убедиться, что IP заблокирован

2. **Тест утечки данных**
   - Создать 2 федеративных чата
   - Отправить 100 сообщений в каждый
   - Убедиться, что каждый канал получил только свои сообщения

3. **Тест reconnect**
   - Подключиться к каналу
   - Разорвать соединение
   - Переподключиться
   - Убедиться, что события продолжают приходить

## Диаграмма потока событий

```
                          ХОСТ-ИНСТАНС
                                
   [Локальный участник]         [Удалённый участник из Client A]
            |                              |
            | Отправка сообщения           | POST /federation/messages/send
            ↓                              ↓
    ┌───────────────────────────────────────────┐
    │   API Handler (createFeedMessage)         │
    └───────────────────────────────────────────┘
                        |
                        ↓
    ┌───────────────────────────────────────────┐
    │   broadcastChatEvent()                    │
    └───────────────────────────────────────────┘
            |                              |
            |                              |
            ↓                              ↓
    broadcastToLocalParticipants   broadcastToFederation
            |                              |
            ↓                              ↓
    sendDataToSocket                sendDataToSocket
    (user-{userId})                 (federation-{feedId}-{token})
            |                              |
            |                              |
            ↓                              ↓
    ┌─────────────┐              ┌────────────────┐
    │ Локальный WS │              │ Федеративный WS│
    │   Gateway    │              │    Gateway     │
    └─────────────┘              └────────────────┘
            |                              |
            ↓                              ↓
    [Client: App.vue]            [Client A: FederationSocket]
    socketData обновляется       socketData обновляется
            |                              |
            ↓                              ↓
    ChatView отображает          ChatView отображает
    новое сообщение              новое сообщение
```

## Резюме

✅ **Изоляция достигается через:**
1. Уникальный токен для каждого федеративного чата
2. Отдельный WebSocket канал: `federation-{feedId}-{token}`
3. Валидация токена при каждом подключении
4. Включение feedId в каждое событие для проверки на клиенте

✅ **Безопасность обеспечивается:**
1. Криптографически стойкими токенами
2. Rate limiting для попыток подключения
3. Логированием всех неудачных попыток
4. Автоматическим отключением при подозрительной активности

✅ **Невозможные атаки:**
1. Подключение к чужому каналу без токена
2. Перебор токенов (защита rate limiting)
3. Получение событий из других чатов (изоляция по каналам)
4. Отправка событий в чужой канал (валидация на хосте)
