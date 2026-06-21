# API Спецификация федеративных чатов

## Общие принципы

### Авторизация
Все федеративные endpoints требуют заголовок:
```
X-Federation-Token: {federationToken}
```

### Формат ответов
```typescript
// Успех
{
  success: true,
  data: { ... }
}

// Ошибка
{
  success: false,
  error: {
    code: string,
    message: string,
    details?: any
  }
}
```

### Коды ошибок
- `INVALID_TOKEN` — неверный federation token
- `FEED_NOT_FOUND` — чат не найден
- `FEDERATION_DISABLED` — федерация отключена для этого чата
- `ACCESS_DENIED` — нет доступа
- `RATE_LIMIT_EXCEEDED` — превышен лимит запросов
- `PARTICIPANT_NOT_FOUND` — участник не найден
- `INVALID_MESSAGE` — невалидное сообщение

## Endpoints на хост-инстансе

### 1. Подключение к федеративному чату

**`GET /api/federation/connect`**

Получение информации о чате для подключения.

**Query параметры:**
- `token` — federation token
- `feedId` — ID фида

**Headers:**
- `X-Instance-Url` — URL клиентского инстанса (например, `https://client.chatium.ru`)
- `X-Instance-Domain` — домен для отображения (например, `client.chatium.ru`)

**Response:**
```typescript
{
  success: true,
  data: {
    feedId: string,
    title: string,
    description: string,
    avatarUrl: string | null,
    type: 'group' | 'channel',
    
    // Информация о хосте
    hostInstanceUrl: string,
    hostInstanceDomain: string,
    
    // Статистика
    participantsCount: number,
    messagesCount: number,
    
    // WebSocket endpoint
    wsEndpoint: string,  // wss://host.chatium.ru/ws/federation/{feedId}/{token}
    
    // Начальная история
    initialMessages: Message[],  // Последние 100 сообщений
    participants: FederationParticipant[],  // Список всех участников
  }
}
```

**Что происходит на хосте:**
1. Валидация токена
2. Проверка, что чат федеративный и активен
3. Создание записи в `federation_connections`
4. Возврат метаданных чата

### 2. Отправка сообщения

**`POST /api/federation/messages/send`**

Отправка сообщения из клиентского инстанса.

**Headers:**
- `X-Federation-Token` — federation token

**Body:**
```typescript
{
  feedId: string,
  
  // Информация об отправителе (из клиентского инстанса)
  author: {
    remoteUserId: string,           // ID пользователя в клиентском инстансе
    displayName: string,            // Имя для отображения
    avatarUrl: string | null,       // Аватар пользователя
    instanceDomain: string,         // Домен инстанса
  },
  
  // Данные сообщения
  message: {
    text: string,
    files?: Array<{
      hash: string,
      url: string,  // Публичный URL файла
      name: string,
      size: number,
      mimeType: string,
    }>,
    replyTo?: string,  // ID сообщения, на которое отвечаем
  }
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    messageId: string,
    createdAt: Date,
  }
}
```

**Что происходит на хосте:**
1. Валидация токена и feedId
2. Проверка или создание прокси-участника для автора
3. Валидация сообщения (длина текста, количество файлов)
4. Создание сообщения через `createFeedMessage`
5. Broadcast через WebSocket всем подключенным инстансам
6. Возврат ID созданного сообщения

### 3. Получение истории сообщений

**`GET /api/federation/messages/list`**

Получение истории сообщений.

**Headers:**
- `X-Federation-Token` — federation token

**Query параметры:**
- `feedId` — ID фида
- `limit` — количество сообщений (макс 100)
- `beforeMessageId` — получить сообщения до этого ID (для пагинации)

**Response:**
```typescript
{
  success: true,
  data: {
    messages: Message[],
    hasMore: boolean,
  }
}
```

### 4. Редактирование сообщения

**`POST /api/federation/messages/edit`**

**Headers:**
- `X-Federation-Token` — federation token

**Body:**
```typescript
{
  feedId: string,
  messageId: string,
  newText: string,
  
  // Информация о редакторе
  editor: {
    remoteUserId: string,
    instanceDomain: string,
  }
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    messageId: string,
    updatedAt: Date,
  }
}
```

**Что происходит:**
1. Валидация токена
2. Проверка, что редактор — автор сообщения
3. Обновление через `updateFeedMessage`
4. WebSocket broadcast события `edit-message`

### 5. Удаление сообщения

**`POST /api/federation/messages/delete`**

**Headers:**
- `X-Federation-Token` — federation token

**Body:**
```typescript
{
  feedId: string,
  messageId: string,
  
  // Информация о том, кто удаляет
  deletedBy: {
    remoteUserId: string,
    instanceDomain: string,
  }
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    messageId: string,
  }
}
```

**Проверки:**
- Удалять может: автор сообщения, admin или owner чата
- Хост проверяет права через `federation_participants`

### 6. Реакции на сообщения

**`POST /api/federation/reactions/toggle`**

**Headers:**
- `X-Federation-Token` — federation token

**Body:**
```typescript
{
  feedId: string,
  messageId: string,
  emoji: string,
  
  // Кто реагирует
  reactor: {
    remoteUserId: string,
    displayName: string,
    instanceDomain: string,
  }
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    reactions: Record<string, Array<{
      userId: string,
      displayName: string,
      instanceDomain?: string,
    }>>,
  }
}
```

### 7. Получение участников

**`GET /api/federation/participants/list`**

**Headers:**
- `X-Federation-Token` — federation token

**Query:**
- `feedId` — ID фида

**Response:**
```typescript
{
  success: true,
  data: {
    participants: Array<{
      id: string,
      displayName: string,
      avatarUrl: string | null,
      role: 'owner' | 'admin' | 'guest',
      
      // Если локальный
      isLocal: boolean,
      
      // Если удалённый
      instanceDomain?: string,
      instanceUrl?: string,
    }>,
  }
}
```

### 8. Присоединение участника

**`POST /api/federation/participants/join`**

Добавление нового участника из клиентского инстанса.

**Headers:**
- `X-Federation-Token` — federation token

**Body:**
```typescript
{
  feedId: string,
  participant: {
    remoteUserId: string,
    displayName: string,
    avatarUrl: string | null,
    instanceDomain: string,
  }
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    participantId: string,
  }
}
```

**Что происходит:**
1. Валидация токена
2. Проверка, что чат публичный или есть приглашение
3. Создание прокси-участника
4. Запись в `federation_participants`
5. WebSocket broadcast события `new-participant`
6. Создание системного сообщения "X присоединился из Y"

### 9. Heartbeat (проверка активности)

**`POST /api/federation/heartbeat`**

Клиентский инстанс должен отправлять heartbeat каждые 60 секунд.

**Headers:**
- `X-Federation-Token` — federation token

**Body:**
```typescript
{
  feedId: string,
  instanceDomain: string,
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    serverTime: Date,
  }
}
```

**Что происходит:**
- Обновляется `lastSeenAt` в `federation_connections`
- Если heartbeat не приходил 5 минут — соединение помечается как неактивное

### 10. Отключение от чата

**`POST /api/federation/disconnect`**

**Headers:**
- `X-Federation-Token` — federation token

**Body:**
```typescript
{
  feedId: string,
  instanceDomain: string,
}
```

**Response:**
```typescript
{
  success: true
}
```

**Что происходит:**
1. Соединение помечается как неактивное в `federation_connections`
2. Все участники из этого инстанса помечаются как offline
3. WebSocket соединения закрываются

## Endpoints на клиентском инстансе

### 1. Подключение к федеративному чату

**`POST /api/federation/join-federated`**

Локальный endpoint для подключения к внешнему чату.

**Body:**
```typescript
{
  federationUrl: string,  // URL вида: https://host.../api/federation/connect?token=...&feedId=...
}
```

**Что происходит:**
1. Парсинг URL, извлечение token и feedId
2. Запрос к хосту GET /api/federation/connect
3. Создание записи в локальной таблице `chats`:
   ```typescript
   {
     isFederated: true,
     isHostInstance: false,
     hostFederationUrl: 'https://host.chatium.ru',
     federationToken: 'extracted-token',
     feedId: 'extracted-feedId',
   }
   ```
4. Сохранение участников в `federation_participants`
5. Подключение к WebSocket хоста

**Response:**
```typescript
{
  success: true,
  data: {
    chatId: string,  // ID записи в локальной таблице chats
    feedId: string,
  }
}
```

## WebSocket Protocol

### Подключение

**URL:**
```
wss://{hostDomain}/ws/federation/{feedId}/{federationToken}
```

**Query params:**
- `instanceDomain` — домен клиентского инстанса

### События от хоста к клиентам

#### new-message
```typescript
{
  type: 'federation-event',
  event: 'new-message',
  feedId: string,
  data: {
    message: {
      id: string,
      text: string,
      files: File[],
      createdAt: Date,
      createdBy: {
        id: string,
        displayName: string,
        avatarUrl: string | null,
        instanceDomain?: string,  // Если удалённый
      },
      replyTo?: string,
      reactions: Record<string, Reactor[]>,
    }
  }
}
```

#### edit-message
```typescript
{
  type: 'federation-event',
  event: 'edit-message',
  feedId: string,
  data: {
    messageId: string,
    newText: string,
    updatedAt: Date,
  }
}
```

#### delete-message
```typescript
{
  type: 'federation-event',
  event: 'delete-message',
  feedId: string,
  data: {
    messageId: string,
  }
}
```

#### reaction-toggle
```typescript
{
  type: 'federation-event',
  event: 'reaction-toggle',
  feedId: string,
  data: {
    messageId: string,
    emoji: string,
    reactions: Record<string, Reactor[]>,
  }
}
```

#### new-participant
```typescript
{
  type: 'federation-event',
  event: 'new-participant',
  feedId: string,
  data: {
    participant: {
      id: string,
      displayName: string,
      avatarUrl: string | null,
      instanceDomain?: string,
      role: string,
    }
  }
}
```

#### typing-start / typing-stop
```typescript
{
  type: 'federation-event',
  event: 'typing-start' | 'typing-stop',
  feedId: string,
  data: {
    participantId: string,
    displayName: string,
    instanceDomain?: string,
  }
}
```

#### federation-disconnected
```typescript
{
  type: 'federation-event',
  event: 'federation-disconnected',
  feedId: string,
  data: {
    reason: string,
    message: string,
  }
}
```

## Rate Limiting

### Глобальные лимиты (на один инстанс)
- **Запросы к API:** 100 req/min
- **WebSocket подключения:** 10 одновременных на feedId
- **Heartbeat:** 1 req/min (макс)

### Лимиты на действия
- **Отправка сообщений:** 10 msg/min на участника
- **Редактирование:** 5 edit/min на участника
- **Реакции:** 20 reactions/min на участника
- **Присоединение участников:** 5 joins/min на инстанс

### Обработка превышения
При превышении лимита:
```typescript
{
  success: false,
  error: {
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Rate limit exceeded',
    details: {
      limit: number,
      window: string,  // '1 minute'
      retryAfter: number,  // секунд до следующей попытки
    }
  }
}
```

## Валидация данных

### Сообщения
- **Текст:** 1-10000 символов
- **Файлы:** макс 10 файлов, каждый до 100 МБ
- **Файлы:** должны быть доступны по публичному URL

### Участники
- **displayName:** 1-100 символов
- **instanceDomain:** валидный домен
- **avatarUrl:** валидный HTTPS URL (если указан)

### Реакции
- **emoji:** один emoji символ (валидация через regex)

## Обработка ошибок

При любой ошибке API возвращает детальное описание:
```typescript
{
  success: false,
  error: {
    code: 'ERROR_CODE',
    message: 'Human-readable message',
    details: {
      field?: string,      // Поле, вызвавшее ошибку
      expected?: any,      // Ожидаемое значение
      received?: any,      // Полученное значение
      suggestion?: string, // Подсказка как исправить
    }
  }
}
```

## Логирование

На хост-инстансе логируются:
- Все federation API запросы (timestamp, instanceDomain, endpoint, status)
- WebSocket подключения/отключения
- Превышения rate limit
- Ошибки валидации
- Подозрительная активность (слишком много запросов, невалидные данные)

Формат лога:
```typescript
ctx.account.log('Federation API', {
  level: 'info' | 'warn' | 'error',
  json: {
    endpoint: string,
    feedId: string,
    instanceDomain: string,
    userId?: string,
    status: number,
    duration: number,  // ms
    error?: string,
  }
})
```
