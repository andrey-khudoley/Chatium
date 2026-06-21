# Развертывание и миграция федеративных чатов

## Этапы внедрения

### Этап 1: Подготовка базы данных

#### Создание новых таблиц

**1. federation_connections.table**
```json
{
  "name": "federation_connections",
  "title": "Федеративные подключения",
  "description": "Хранит информацию о подключенных инстансах (только на хост-инстансе)",
  "fields": [
    {
      "name": "chat",
      "kind": "RefLinkKind",
      "targetTablePath": "tables/chats.table",
      "title": "Чат"
    },
    {
      "name": "instanceUrl",
      "kind": "StringKind",
      "title": "URL инстанса"
    },
    {
      "name": "instanceDomain",
      "kind": "StringKind",
      "title": "Домен инстанса",
      "searchable": {
        "enabled": true
      }
    },
    {
      "name": "instanceName",
      "kind": "StringKind",
      "title": "Название инстанса"
    },
    {
      "name": "connectedAt",
      "kind": "DateKind",
      "title": "Дата подключения"
    },
    {
      "name": "lastSeenAt",
      "kind": "DateKind",
      "title": "Последняя активность"
    },
    {
      "name": "isActive",
      "kind": "BooleanKind",
      "title": "Активно"
    },
    {
      "name": "messagesCount",
      "kind": "NumberKind",
      "title": "Количество сообщений"
    },
    {
      "name": "participantsCount",
      "kind": "NumberKind",
      "title": "Количество участников"
    }
  ]
}
```

**2. federation_participants.table**
```json
{
  "name": "federation_participants",
  "title": "Федеративные участники",
  "description": "Связь участников с инстансами",
  "fields": [
    {
      "name": "chat",
      "kind": "RefLinkKind",
      "targetTablePath": "tables/chats.table",
      "title": "Чат"
    },
    {
      "name": "participantId",
      "kind": "StringKind",
      "title": "ID участника в Feed API"
    },
    {
      "name": "isLocal",
      "kind": "BooleanKind",
      "title": "Локальный участник"
    },
    {
      "name": "userId",
      "kind": "UserRefLinkKind",
      "title": "Пользователь (для локальных)"
    },
    {
      "name": "remoteInstanceUrl",
      "kind": "StringKind",
      "title": "URL инстанса (для удалённых)"
    },
    {
      "name": "remoteInstanceDomain",
      "kind": "StringKind",
      "title": "Домен инстанса (для удалённых)",
      "searchable": {
        "enabled": true
      }
    },
    {
      "name": "remoteUserId",
      "kind": "StringKind",
      "title": "ID пользователя в удалённом инстансе"
    },
    {
      "name": "remoteDisplayName",
      "kind": "StringKind",
      "title": "Имя пользователя",
      "searchable": {
        "enabled": true
      }
    },
    {
      "name": "remoteAvatarUrl",
      "kind": "StringKind",
      "title": "Аватар пользователя"
    },
    {
      "name": "joinedAt",
      "kind": "DateKind",
      "title": "Дата присоединения"
    },
    {
      "name": "lastActiveAt",
      "kind": "DateKind",
      "title": "Последняя активность"
    }
  ]
}
```

**3. federation_invitations.table** (для межсерверного установления)
```json
{
  "name": "federation_invitations",
  "title": "Приглашения для федерации",
  "description": "Out-of-band приглашения для подключения инстансов",
  "fields": [
    {
      "name": "chat",
      "kind": "RefLinkKind",
      "targetTablePath": "tables/chats.table",
      "title": "Чат"
    },
    {
      "name": "invitationToken",
      "kind": "StringKind",
      "title": "Токен приглашения",
      "searchable": {
        "enabled": true
      }
    },
    {
      "name": "maxUses",
      "kind": "NumberKind",
      "title": "Максимум использований"
    },
    {
      "name": "usedCount",
      "kind": "NumberKind",
      "title": "Использовано"
    },
    {
      "name": "expiresAt",
      "kind": "DateKind",
      "title": "Срок действия"
    },
    {
      "name": "allowedInstances",
      "kind": "AnyKind",
      "title": "Разрешённые инстансы (JSON массив)"
    },
    {
      "name": "createdBy",
      "kind": "UserRefLinkKind",
      "title": "Кто создал"
    },
    {
      "name": "status",
      "kind": "StringKind",
      "title": "Статус"
    },
    {
      "name": "revokedAt",
      "kind": "DateKind",
      "title": "Дата отзыва"
    }
  ]
}
```

**4. blocked_instances.table** (для безопасности)
```json
{
  "name": "blocked_instances",
  "title": "Заблокированные инстансы",
  "description": "Черный список инстансов",
  "fields": [
    {
      "name": "instanceDomain",
      "kind": "StringKind",
      "title": "Домен инстанса"
    },
    {
      "name": "reason",
      "kind": "StringKind",
      "title": "Причина блокировки"
    },
    {
      "name": "blockedAt",
      "kind": "DateKind",
      "title": "Дата блокировки"
    },
    {
      "name": "blockedUntil",
      "kind": "DateKind",
      "title": "Блокировка до"
    },
    {
      "name": "blockedBy",
      "kind": "UserRefLinkKind",
      "title": "Кто заблокировал"
    }
  ]
}
```

#### Расширение существующей таблицы chats

```typescript
// Миграция для добавления полей в chats.table
{
  "isFederated": {
    "kind": "BooleanKind",
    "title": "Федеративный чат",
    "default": false
  },
  "federationToken": {
    "kind": "StringKind",
    "title": "Токен федерации"
  },
  "isHostInstance": {
    "kind": "BooleanKind",
    "title": "Хост-инстанс",
    "default": true
  },
  "hostFederationUrl": {
    "kind": "StringKind",
    "title": "URL хост-инстанса"
  },
  "federationEnabled": {
    "kind": "BooleanKind",
    "title": "Федерация активна",
    "default": true
  },
  "federatedAt": {
    "kind": "DateKind",
    "title": "Дата создания федерации"
  },
  "connectedInstancesCount": {
    "kind": "NumberKind",
    "title": "Количество подключенных инстансов",
    "default": 0
  }
}
```

### Этап 2: Создание API endpoints

Создать файлы в порядке приоритета:

**1. /api/federation.ts** — основные endpoints
```typescript
// Подключение к федеративному чату
export const apiFederationConnectRoute = app.get('/connect', ...)

// Отправка сообщения
export const apiFederationMessagesSendRoute = app.post('/messages/send', ...)

// Получение истории
export const apiFederationMessagesListRoute = app.get('/messages/list', ...)

// Heartbeat
export const apiFederationHeartbeatRoute = app.post('/heartbeat', ...)

// Отключение
export const apiFederationDisconnectRoute = app.post('/disconnect', ...)
```

**2. /api/federation-participants.ts** — управление участниками
```typescript
export const apiFederationParticipantsListRoute = app.get('/list', ...)
export const apiFederationParticipantsJoinRoute = app.post('/join', ...)
```

**3. /api/federation-reactions.ts** — реакции
```typescript
export const apiFederationReactionsToggleRoute = app.post('/toggle', ...)
```

**4. /api/federation-websocket.ts** — WebSocket
```typescript
export const apiFederationWebSocketRoute = app.get('/ws/:feedId/:token', ...)
```

**5. /api/federation-local.ts** — локальные endpoints для подключения
```typescript
export const apiFederationJoinRoute = app.post('/join-federated', ...)
export const apiFederationManageRoute = app.post('/manage', ...)
```

**6. /api/federation-invitations.ts** — межсерверное установление (обязательно для межкластерной федерации)
```typescript
// На хост-инстансе
export const apiFederationInvitationsCreateRoute = app.post('/invitations/create', ...)
export const apiFederationInvitationsInfoRoute = app.get('/invitations/:token/info', ...)
export const apiFederationInvitationsAcceptRoute = app.post('/invitations/accept', ...)
export const apiFederationInvitationsRevokeRoute = app.post('/invitations/:token/revoke', ...)

// На клиентском инстансе
export const apiFederationInvitationsParseRoute = app.post('/invitations/parse', ...)
export const apiFederationInvitationsJoinRoute = app.post('/invitations/join', ...)
```

### Этап 3: Создание shared модулей

**1. /shared/federation-utils.ts**
```typescript
// Генерация токена
export function generateFederationToken(): string

// Валидация токена
export async function validateFederationToken(
  ctx: app.Ctx,
  token: string,
  feedId: string
): Promise<boolean>

// Создание participantId
export function createParticipantId(
  instanceDomain: string,
  remoteUserId: string
): string

// Парсинг federation URL
export function parseFederationUrl(url: string): {
  hostUrl: string,
  token: string,
  feedId: string,
}
```

**2. /shared/websocket-gateway.ts**
```typescript
// WebSocket функции из документации
export function getFederationChannelName(...)
export async function validateFederationChannel(...)
export async function broadcastToFederation(...)
export async function broadcastToLocalParticipants(...)
export async function broadcastChatEvent(...)
```

**3. /shared/rate-limiter.ts**
```typescript
export class RateLimiter {
  async checkLimit(key: string, limit: RateLimit): Promise<boolean>
  async recordAttempt(key: string)
  async resetLimit(key: string)
}
```

### Этап 4: Обновление UI компонентов

**1. Обновить ChatView.vue**
- Добавить отображение instanceDomain в сообщениях
- Добавить индикатор федеративного статуса в шапку
- Обработка WebSocket событий от федерации

**2. Обновить ParticipantsPanel.vue**
- Группировка по инстансам
- Отображение instanceDomain для каждого участника

**3. Создать новые компоненты**
- `FederationStatusIndicator.vue` — индикатор статуса соединения
- `FederatedParticipantBadge.vue` — бейдж федеративного участника
- `FederationSettingsPanel.vue` — настройки федерации (для владельца)
- `JoinFederatedChatModal.vue` — модалка подключения к федеративному чату

**4. Обновить CreateChatModal.vue**
- Добавить checkbox "Федеративный чат" (только для Admin)
- Отображение federation URL после создания

**5. Создать компоненты для межсерверного установления**
- `FederationInvitationsPanel.vue` — создание и управление приглашениями
- `JoinByInvitationModal.vue` — ввод invitation кода и подключение
- `InvitationQRCode.vue` — генерация и отображение QR-кода

**6. Создать composable**
- `composables/useFederationSocket.ts` — подписка на WebSocket федерации
- `composables/useFederationInvitations.ts` — работа с приглашениями

### Этап 5: Тестирование

#### Unit тесты

**1. Тестирование генерации токена**
```typescript
test('generateFederationToken returns unique tokens', () => {
  const token1 = generateFederationToken()
  const token2 = generateFederationToken()
  
  expect(token1).not.toBe(token2)
  expect(token1.length).toBe(64)
})
```

**2. Тестирование валидации токена**
```typescript
test('validateFederationToken rejects invalid token', async () => {
  const chat = await createFederatedChat(ctx, 'Test')
  const isValid = await validateFederationToken(ctx, 'wrong-token', chat.feedId)
  
  expect(isValid).toBe(false)
})
```

**3. Тестирование WebSocket изоляции**
```typescript
test('Events go to correct channel only', async () => {
  // См. детали в 03-websocket-isolation.md
})
```

#### Integration тесты

**1. Создание и подключение**
```typescript
test('Create federated chat and connect from another instance', async () => {
  // 1. Создать федеративный чат на хосте
  const hostChat = await createFederatedChat(hostCtx, 'Test Chat')
  
  // 2. Получить federation URL
  const federationUrl = getFederationUrl(hostChat)
  
  // 3. Подключиться с клиентского инстанса
  const clientChat = await joinFederatedChat(clientCtx, federationUrl)
  
  // 4. Проверить, что чат появился на клиенте
  expect(clientChat.feedId).toBe(hostChat.feedId)
  expect(clientChat.isHostInstance).toBe(false)
})
```

**2. Отправка сообщения**
```typescript
test('Send message from client to host', async () => {
  // Setup
  const hostChat = await createFederatedChat(hostCtx, 'Test Chat')
  const clientChat = await joinFederatedChat(clientCtx, getFederationUrl(hostChat))
  
  // Отправка с клиента
  const message = await sendFederatedMessage(clientCtx, clientChat.feedId, {
    text: 'Hello from client!',
    author: {
      remoteUserId: 'user123',
      displayName: 'Test User',
      instanceDomain: 'client.chatium.ru',
    }
  })
  
  // Проверка на хосте
  const messages = await getMessages(hostCtx, hostChat.feedId)
  expect(messages[0].text).toBe('Hello from client!')
  expect(messages[0].author.instanceDomain).toBe('client.chatium.ru')
})
```

**3. WebSocket синхронизация**
```typescript
test('WebSocket events reach all instances', async () => {
  // Setup
  const hostChat = await createFederatedChat(hostCtx, 'Test Chat')
  const client1 = await joinFederatedChat(client1Ctx, getFederationUrl(hostChat))
  const client2 = await joinFederatedChat(client2Ctx, getFederationUrl(hostChat))
  
  const events1 = []
  const events2 = []
  
  // Подписка на события
  subscribeToFederationEvents(client1, (e) => events1.push(e))
  subscribeToFederationEvents(client2, (e) => events2.push(e))
  
  // Отправка сообщения с хоста
  await sendMessage(hostCtx, hostChat.feedId, 'Test message')
  
  await sleep(100)
  
  // Оба клиента должны получить событие
  expect(events1.length).toBe(1)
  expect(events2.length).toBe(1)
  expect(events1[0].data.text).toBe('Test message')
  expect(events2[0].data.text).toBe('Test message')
})
```

#### E2E тесты (опционально)

Используя Playwright или Cypress:
1. Открыть 2 браузера с разными аккаунтами
2. Создать федеративный чат в первом
3. Подключиться во втором
4. Отправить сообщение из второго
5. Убедиться, что оно появилось в первом

### Этап 6: Развертывание

#### Чеклист перед деплоем

- [ ] Все таблицы созданы
- [ ] Все API endpoints реализованы
- [ ] UI компоненты обновлены
- [ ] Тесты проходят
- [ ] Rate limiting настроен
- [ ] Логирование работает
- [ ] WebSocket изоляция протестирована
- [ ] Межсерверное установление федерации протестировано (invitation flow)
- [ ] Transit proxy протестирован (если применимо)
- [ ] Документация обновлена
- [ ] .CHATIUM-LLM.md обновлен

#### Пошаговое развертывание

**1. Стейджинг**
```bash
# Развернуть на тестовом аккаунте
# Создать несколько тестовых федеративных чатов
# Подключить их между тестовыми аккаунтами
# Проверить все функции
```

**2. Канареечный деплой**
```bash
# Включить федерацию только для Admin пользователей
# Собрать обратную связь
# Исправить баги
```

**3. Полный деплой**
```bash
# Включить для всех пользователей
# Мониторинг метрик
# Готовность к откату
```

### Этап 7: Миграция существующих чатов (опционально)

Если нужно сделать существующий чат федеративным:

```typescript
// /api/chats.ts - новый endpoint
export const apiChatEnableFederationRoute = app.post('/:feedId/enable-federation', async (ctx, req) => {
  // Проверка прав (только Admin)
  requireAccountRole(ctx, 'Admin')
  
  const chat = await Chats.findOneBy(ctx, { feedId: req.params.feedId })
  if (!chat) throw new Error('Chat not found')
  
  // Генерация токена
  const federationToken = generateFederationToken()
  
  // Обновление чата
  await Chats.update(ctx, {
    id: chat.id,
    isFederated: true,
    federationToken,
    isHostInstance: true,
    federationEnabled: true,
    federatedAt: new Date(),
  })
  
  // Создание записей для локальных участников
  const participants = await findFeedParticipants(ctx, req.params.feedId, {})
  
  for (const p of participants) {
    await FederationParticipants.create(ctx, {
      chat: chat.id,
      participantId: p.id,
      isLocal: true,
      userId: p.userId,
      joinedAt: new Date(),
      lastActiveAt: new Date(),
    })
  }
  
  // Возврат federation URL
  const federationUrl = getFederationUrl(chat)
  
  return {
    success: true,
    federationUrl,
  }
})
```

## Обратная совместимость

### Гарантии

1. **Существующие чаты продолжают работать**
   - Ничего не ломается для не-федеративных чатов
   - Все старые API endpoints остаются рабочими

2. **Опциональность федерации**
   - По умолчанию `isFederated = false`
   - Включается явно через UI или API

3. **Нет обязательных миграций**
   - Новые таблицы пустые
   - Новые поля в chats имеют дефолтные значения

### Проверка совместимости

```typescript
// В каждом API endpoint проверяем, федеративный ли чат
const chat = await Chats.findOneBy(ctx, { feedId })

if (chat.isFederated && chat.isHostInstance) {
  // Логика для хост-инстанса
  await broadcastChatEvent(ctx, feedId, 'new-message', message)
} else if (chat.isFederated && !chat.isHostInstance) {
  // Логика для клиентского инстанса
  await sendToHost(ctx, chat.hostFederationUrl, ...)
} else {
  // Обычная логика для локальных чатов
  await broadcastToLocalParticipants(ctx, feedId, 'new-message', message)
}
```

## Мониторинг после деплоя

### Метрики для отслеживания

1. **Количество федеративных чатов**
   ```sql
   SELECT COUNT(*) FROM chats WHERE isFederated = true
   ```

2. **Количество подключений**
   ```sql
   SELECT COUNT(*) FROM federation_connections WHERE isActive = true
   ```

3. **Количество федеративных участников**
   ```sql
   SELECT COUNT(*) FROM federation_participants WHERE isLocal = false
   ```

4. **Средняя задержка WebSocket событий**
   - Измерять время между отправкой на хосте и получением на клиенте

5. **Rate limit violations**
   - Сколько запросов заблокировано

6. **Ошибки аутентификации**
   - Сколько неудачных попыток подключения

7. **Приглашения (invitations)**
   ```sql
   SELECT COUNT(*) FROM federation_invitations WHERE status = 'active'
   SELECT COUNT(*) FROM federation_invitations WHERE status = 'expired'
   ```
   - Сколько создано приглашений
   - Сколько принято
   - Сколько истекло

### Алерты

Настроить уведомления при:
- Более 5% ошибок в federation API
- Circuit breaker открылся
- Более 10 неудачных попыток аутентификации за 5 минут
- Средняя задержка WebSocket > 1 секунды
- Более 20 истёкших приглашений без использования (возможно, проблема с доставкой)

### Дашборд

Grafana дашборд с метриками:
- График активных федеративных чатов (по времени)
- График активных подключений (по времени)
- Топ-5 хост-инстансов по количеству подключений
- Топ-5 клиентских инстансов по количеству сообщений
- Ошибки по типам (pie chart)
- WebSocket latency (histogram)

## Откат (если что-то пошло не так)

### Быстрый откат

1. **Отключить федерацию через feature flag**
   ```typescript
   // В /api/app-settings.ts
   await AppSettings.update(ctx, {
     key: 'federation_enabled',
     value: 'false',
   })
   
   // Проверка в каждом federation endpoint
   const enabled = await AppSettings.findOneBy(ctx, { key: 'federation_enabled' })
   if (enabled?.value !== 'true') {
     throw new Error('Federation is disabled')
   }
   ```

2. **Закрыть все федеративные WebSocket соединения**
   ```typescript
   const connections = await FederationConnections.findAll(ctx, {
     where: { isActive: true },
   })
   
   for (const conn of connections) {
     await disconnectFederationChannel(ctx, conn.chatId, conn.instanceDomain, 'System maintenance')
   }
   ```

3. **Вернуть старую версию кода**
   - Удалить federation endpoints
   - Вернуть старые WebSocket broadcast функции
   - Удалить UI компоненты федерации

### Полный откат (если критическая проблема)

1. Вернуть версию до внедрения федерации
2. Удалить новые таблицы (опционально)
3. Убрать новые поля из chats.table (опционально)

**Важно:** Данные в новых таблицах можно оставить — они не мешают работе.

## Постдеплойный чеклист

- [ ] Федерация включена
- [ ] Метрики собираются
- [ ] Алерты настроены
- [ ] Логи проверены на ошибки
- [ ] Создан тестовый федеративный чат
- [ ] Проверено подключение с другого инстанса
- [ ] Проверено создание invitation и подключение по нему
- [ ] Проверена работа через transit proxy (если применимо)
- [ ] Проверена отправка сообщений
- [ ] Проверен WebSocket
- [ ] Проверен rate limiting
- [ ] Документация обновлена
- [ ] Команда проинформирована
- [ ] План поддержки готов
