# Приглашения в федеративные чаты

## Обзор проблемы

В обычных чатах приглашения работают просто: все участники в одном аккаунте Chatium, все пользователи известны. В федеративных чатах участники могут быть из разных инстансов, что создаёт сложности:

- Как пригласить пользователя из другого инстанса?
- Кто может кого приглашать?
- Как работают инвайт-ссылки между инстансами?
- Как валидировать права на приглашение?

## Типы приглашений

### 1. Локальные приглашения

**Сценарий:** Участник чата приглашает пользователя из СВОЕГО инстанса.

**Механизм:**
- Работает как в обычных чатах (username, email, phone)
- Участник может приглашать только из своего инстанса
- Приглашение создаётся локально и регистрируется на хосте

**Workflow:**
```
1. Участник из инстанса B ищет пользователя в СВОЁМ инстансе
2. Создаёт приглашение локально в таблице chat_invites
3. Отправляет уведомление на хост о новом участнике (pending)
4. Пользователь принимает → локальный инстанс регистрирует участника
5. Локальный инстанс уведомляет хост о новом участнике
6. Хост рассылает всем инстансам событие "new-participant"
```

**API (на локальном инстансе):**
```typescript
POST /api/invites/create
{
  "chatId": "local-mirror-chat-id",
  "inviteType": "username",
  "inviteValue": "john_doe",
  // userId, email, phone - локальные, из своего инстанса
}

// При принятии
POST /api/invites/accept
{
  "inviteId": "invite-id"
}
```

**API (хост принимает нового участника):**
```typescript
POST /federation/participants/:feedId/add
Authorization: Bearer {federation-token}
{
  "remoteInstanceUrl": "https://instance-b.chatium.ru",
  "remoteUserId": "user-123",
  "displayName": "John Doe",
  "role": "guest"
}
```

### 2. Универсальная инвайт-ссылка

**Сценарий:** Ссылка работает для ВСЕХ инстансов, подключенных к федерации.

**Формат ссылки:**
```
https://host-instance.chatium.ru/projekt-chat/invite/{federation-token}?type=federated&feedId={feedId}
```

**Особенности:**
- Ссылка ведёт на хост-инстанс
- Хост проверяет токен и перенаправляет на локальный инстанс пользователя
- Если локальный инстанс НЕ подключен к федерации — предложение подключиться

**Workflow:**

```
1. Админ создаёт федеративную инвайт-ссылку на хосте
2. Хост генерирует URL с federation-token
3. Пользователь из инстанса C кликает на ссылку
4. Хост определяет инстанс пользователя по ctx.user или redirect
5. Хост проверяет: подключен ли инстанс C к этому чату?
   
   a) ДА → пользователь присоединяется автоматически
   b) НЕТ → показать страницу "Подключить ваш инстанс к федеративному чату"
      - Админ инстанса C должен одобрить подключение
      - После одобрения пользователь автоматически присоединяется
```

**API (хост):**
```typescript
// Создание федеративной инвайт-ссылки
POST /api/federation/chats/:feedId/create-invite-link
Authorization: Bearer {owner-auth}
{
  "expiresAt": "2025-12-31T23:59:59Z" // опционально
}

Response:
{
  "inviteUrl": "https://host.chatium.ru/projekt-chat/invite/{token}?type=federated&feedId={feedId}",
  "token": "federation-token-xxx",
  "expiresAt": "..."
}

// Обработка перехода по ссылке
GET /projekt-chat/invite/{token}?type=federated&feedId={feedId}

// Проверяет:
// 1. Валидность токена
// 2. Права доступа
// 3. Подключен ли инстанс пользователя
// 4. Перенаправляет или показывает страницу подключения
```

### 3. Cross-instance приглашения (будущее)

**Сценарий:** Участник из инстанса B приглашает пользователя из инстанса C напрямую.

**Формат:** `username@instance.domain` (как email в Fediverse/Mastodon)

**Пример:**
```
Участник хочет пригласить: john@other-company.chatium.ru
```

**Workflow:**
```
1. Участник вводит: john@other-company.chatium.ru
2. Локальный инстанс отправляет запрос на хост
3. Хост проверяет: подключен ли other-company.chatium.ru?
   a) ДА → хост отправляет приглашение в инстанс C
   b) НЕТ → ошибка "Этот инстанс не подключен к федерации"
4. Инстанс C получает приглашение и уведомляет пользователя john
5. john принимает → инстанс C регистрирует участника локально
6. Инстанс C уведомляет хост о новом участнике
7. Хост рассылает событие всем инстансам
```

**API (хост принимает cross-instance приглашение):**
```typescript
POST /federation/invites/:feedId/create-cross-instance
Authorization: Bearer {federation-token-instance-b}
{
  "targetInstance": "https://other-company.chatium.ru",
  "targetUsername": "john",
  "invitedBy": {
    "remoteUserId": "user-456",
    "displayName": "Mary from Instance B",
    "instanceUrl": "https://instance-b.chatium.ru"
  }
}

// Хост проверяет подключение targetInstance
// Хост отправляет приглашение в targetInstance

POST https://other-company.chatium.ru/federation/invites/receive
Authorization: Bearer {federation-token-instance-c}
{
  "feedId": "fed-chat-123",
  "hostInstance": "https://host.chatium.ru",
  "invitedUsername": "john",
  "invitedBy": {
    "displayName": "Mary from Instance B",
    "instanceUrl": "https://instance-b.chatium.ru"
  },
  "chatInfo": {
    "title": "Federated Project Chat",
    "description": "...",
    "participantsCount": 15
  }
}
```

## Права на приглашение

### Кто может приглашать?

| Роль | Локальные приглашения | Инвайт-ссылка | Cross-instance |
|------|----------------------|---------------|----------------|
| **Owner** (хост) | ✅ Да | ✅ Создавать | ✅ Да (будущее) |
| **Admin** (хост) | ✅ Да | ✅ Создавать | ✅ Да (будущее) |
| **Guest** (хост) | ✅ Только свой инстанс | ❌ Нет | ❌ Нет |
| **Admin** (удалённый) | ✅ Только свой инстанс | ❌ Нет | ❌ Нет |
| **Guest** (удалённый) | ✅ Только свой инстанс | ❌ Нет | ❌ Нет |

**Правила:**
- **Любой участник** может пригласить пользователя из СВОЕГО инстанса
- **Только owner/admin хоста** могут создавать универсальные инвайт-ссылки
- **Cross-instance приглашения** (фаза 2) — только owner/admin хоста

### Таблица федеративных приглашений

```typescript
// Таблица: federation_invites
{
  "id": "string",
  "feedId": "string", // ID чата на хосте
  "chatId": "string", // ID локального зеркального чата (если есть)
  
  // Тип приглашения
  "type": "local" | "universal-link" | "cross-instance",
  
  // Локальные приглашения
  "invitedBy": "UserRefLinkKind", // кто пригласил (локальный пользователь)
  "invitedUser": "UserRefLinkKind", // кого пригласили (локальный)
  "inviteType": "username" | "email" | "phone" | "userId",
  "inviteValue": "string",
  
  // Universal link
  "linkToken": "string", // токен для инвайт-ссылки
  "expiresAt": "Date",
  
  // Cross-instance
  "targetInstance": "string", // URL инстанса
  "targetUsername": "string", // username в том инстансе
  "sourceInstance": "string", // откуда пригласили
  
  "status": "pending" | "accepted" | "declined" | "expired",
  "createdAt": "Date",
  "acceptedAt": "Date"
}
```

## UI/UX для приглашений

### Модалка приглашения (InviteModal)

**Для обычного участника (любого инстанса):**
```
┌─────────────────────────────────────┐
│ Пригласить в чат                    │
├─────────────────────────────────────┤
│ 🔍 Поиск пользователей              │
│ ┌─────────────────────────────────┐ │
│ │ Введите имя...                  │ │
│ └─────────────────────────────────┘ │
│                                     │
│ 📍 Ваш инстанс: instance-b.chatium  │
│                                     │
│ Список пользователей:               │
│ ┌─────────────────────────────────┐ │
│ │ 👤 John Doe (@john)             │ │
│ │ 👤 Mary Smith (@mary)           │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ℹ️ Вы можете пригласить только     │
│    пользователей из вашего инстанса│
│                                     │
│         [Отмена]  [Пригласить]     │
└─────────────────────────────────────┘
```

**Для owner/admin хоста:**
```
┌─────────────────────────────────────┐
│ Пригласить в федеративный чат       │
├─────────────────────────────────────┤
│ Вкладки: [Локальные] [Ссылка]       │
│                                     │
│ === Вкладка "Локальные" ===        │
│ (как выше)                          │
│                                     │
│ === Вкладка "Ссылка" ===           │
│ Универсальная ссылка для ВСЕХ       │
│ подключенных инстансов              │
│                                     │
│ 🔗 Действующая ссылка:              │
│ ┌─────────────────────────────────┐ │
│ │ https://host.chatium.ru/...     │ │
│ │ [Скопировать] [Обновить]        │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Срок действия: 7 дней               │
│ Использований: 5 из ∞               │
│                                     │
│ [Создать новую ссылку]             │
└─────────────────────────────────────┘
```

### Страница приёма инвайт-ссылки

**Сценарий 1: Инстанс уже подключен**
```
┌─────────────────────────────────────┐
│ 🌐 Федеративный чат                 │
├─────────────────────────────────────┤
│ Вас приглашают в:                   │
│                                     │
│ 💬 "Federated Project Chat"         │
│ 📍 Хост: host-company.chatium.ru    │
│ 👥 15 участников из 3 инстансов     │
│                                     │
│ Описание: Общий проект...           │
│                                     │
│ ✅ Ваш инстанс уже подключен        │
│                                     │
│      [Отклонить] [Присоединиться]  │
└─────────────────────────────────────┘
```

**Сценарий 2: Инстанс НЕ подключен (для админа)**
```
┌─────────────────────────────────────┐
│ 🌐 Подключение к федеративному чату │
├─────────────────────────────────────┤
│ Вас приглашают в:                   │
│                                     │
│ 💬 "Federated Project Chat"         │
│ 📍 Хост: host-company.chatium.ru    │
│ 👥 15 участников из 3 инстансов     │
│                                     │
│ ⚠️ Ваш инстанс ещё не подключен     │
│                                     │
│ Для присоединения требуется:        │
│ 1. Подключить ваш инстанс к этому   │
│    федеративному чату               │
│ 2. После подключения вы и другие    │
│    пользователи вашего инстанса     │
│    смогут присоединяться            │
│                                     │
│ 🔐 Требуется роль Admin             │
│                                     │
│    [Отклонить] [Подключить инстанс]│
└─────────────────────────────────────┘
```

**Сценарий 3: Инстанс НЕ подключен (для обычного пользователя)**
```
┌─────────────────────────────────────┐
│ 🌐 Федеративный чат недоступен      │
├─────────────────────────────────────┤
│ Приглашение в:                      │
│ 💬 "Federated Project Chat"         │
│                                     │
│ ⚠️ Ваш инстанс не подключен к этому │
│    федеративному чату               │
│                                     │
│ Для присоединения обратитесь к      │
│ администратору вашего инстанса:     │
│                                     │
│ 👤 admin@your-company.chatium.ru    │
│                                     │
│ Скопируйте эту ссылку и отправьте   │
│ администратору:                     │
│ ┌─────────────────────────────────┐ │
│ │ https://host.chatium.ru/...     │ │
│ │ [Скопировать]                   │ │
│ └─────────────────────────────────┘ │
│                                     │
│               [Закрыть]             │
└─────────────────────────────────────┘
```

## Безопасность приглашений

### Валидация прав

```typescript
// Проверка перед созданием приглашения
async function canInviteToFederatedChat(
  ctx: app.Ctx,
  feedId: string,
  inviteType: 'local' | 'universal-link' | 'cross-instance'
): Promise<boolean> {
  const chat = await Chats.findOneBy(ctx, { feedId });
  if (!chat?.isFederated) return false;

  const participant = await getOrCreateParticipant(ctx, feedId, ctx.user);
  
  switch (inviteType) {
    case 'local':
      // Любой участник может приглашать из своего инстанса
      return true;
      
    case 'universal-link':
    case 'cross-instance':
      // Только owner/admin хоста
      if (!chat.isHostInstance) return false;
      return participant.role === 'owner' || participant.role === 'admin';
      
    default:
      return false;
  }
}
```

### Rate Limiting

```typescript
// Ограничения на создание приглашений
const INVITE_RATE_LIMITS = {
  local: {
    perUser: 10, // 10 приглашений в час
    perChat: 50, // 50 приглашений на чат в час
  },
  universalLink: {
    perChat: 5, // 5 ссылок на чат в день
  },
  crossInstance: {
    perUser: 5, // 5 cross-instance в час (будущее)
  },
};
```

### Токены инвайт-ссылок

```typescript
import { randomBytes } from 'crypto';

function generateInviteLinkToken(): string {
  // 256-bit криптографически стойкий токен
  return randomBytes(32).toString('base64url');
}

// Валидация токена
async function validateInviteLinkToken(
  token: string,
  feedId: string
): Promise<boolean> {
  const invite = await FederationInvites.findOneBy(ctx, {
    linkToken: token,
    feedId,
    type: 'universal-link',
    status: 'pending',
  });
  
  if (!invite) return false;
  if (invite.expiresAt && invite.expiresAt < new Date()) {
    // Токен истёк
    await FederationInvites.update(ctx, {
      id: invite.id,
      status: 'expired',
    });
    return false;
  }
  
  return true;
}
```

## Edge Cases

### 1. Пользователь уже участник

```typescript
// При попытке принять приглашение
const existingParticipant = await findFeedParticipants(ctx, feedId, {
  userId: ctx.user.id,
  limit: 1,
});

if (existingParticipant.length > 0) {
  return {
    success: false,
    error: 'already_member',
    message: 'Вы уже участник этого чата',
  };
}
```

### 2. Инвайт-ссылка истекла

```typescript
// Показать сообщение с предложением запросить новую
{
  success: false,
  error: 'invite_expired',
  message: 'Эта ссылка-приглашение истекла. Запросите новую у администратора чата.',
}
```

### 3. Лимит участников достигнут

```typescript
const MAX_PARTICIPANTS = 1000; // Лимит для федеративного чата

const participantsCount = await getFeedParticipantsCount(ctx, feedId);
if (participantsCount >= MAX_PARTICIPANTS) {
  return {
    success: false,
    error: 'chat_full',
    message: 'Чат достиг максимального количества участников',
  };
}
```

### 4. Инстанс отключился от федерации

```typescript
// Если инстанс отключился, все приглашения этого инстанса становятся недействительными
async function onInstanceDisconnect(feedId: string, instanceUrl: string) {
  // Отменить все pending приглашения от этого инстанса
  await FederationInvites.updateMany(ctx, {
    where: {
      feedId,
      sourceInstance: instanceUrl,
      status: 'pending',
    },
    update: {
      status: 'expired',
    },
  });
}
```

### 5. Приглашение самого себя

```typescript
// Блокировать приглашение самого себя
if (invitedUserId === ctx.user.id) {
  return {
    success: false,
    error: 'cannot_invite_self',
    message: 'Вы не можете пригласить самого себя',
  };
}
```

## Миграция существующих приглашений

При включении федерации для существующего чата:

```typescript
async function migrateChatToFederation(chatId: string) {
  const chat = await Chats.findById(ctx, chatId);
  
  // 1. Обновить чат
  await Chats.update(ctx, {
    id: chatId,
    isFederated: true,
    federationToken: generateFederationToken(),
    isHostInstance: true,
  });
  
  // 2. Мигрировать существующие приглашения
  const existingInvites = await ChatInvites.findAll(ctx, {
    where: { chat: chatId, status: 'pending' },
  });
  
  for (const invite of existingInvites) {
    await FederationInvites.create(ctx, {
      feedId: chat.feedId,
      chatId,
      type: 'local',
      invitedBy: invite.invitedBy,
      invitedUser: invite.invitedUser,
      inviteType: invite.inviteType,
      inviteValue: invite.inviteValue,
      status: invite.status,
    });
  }
}
```

## Резюме

### Что работает "из коробки" после стыковки:

✅ **Локальные приглашения** — каждый участник может пригласить пользователей из своего инстанса
✅ **Универсальная инвайт-ссылка** — owner/admin хоста создаёт ссылку для всех инстансов
✅ **Автоматическая регистрация** — принятие приглашения автоматически добавляет участника

### Что требует дополнительной настройки:

⚠️ **Cross-instance приглашения** — требует:
- Обнаружение инстансов (discovery)
- Проверка доступности `username@instance.domain`
- Координация между инстансами

### Рекомендуемый порядок реализации:

**Фаза 1 (MVP):**
1. Локальные приглашения ✅
2. Универсальная инвайт-ссылка ✅

**Фаза 2 (расширенная):**
3. Cross-instance приглашения
4. Discovery инстансов
5. Предложение подключения новых инстансов

### Финальная рекомендация:

**После стыковки инстансов проблемы с приглашениями НЕТ:**
- Участники могут приглашать пользователей из своего инстанса
- Owner/admin хоста создают универсальные ссылки
- Ссылки работают для всех подключенных инстансов

**Единственное ограничение:** нельзя напрямую пригласить пользователя из ДРУГОГО инстанса (но можно дать ему универсальную ссылку).
