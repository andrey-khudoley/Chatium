# Межсерверное установление федерации (Out-of-Band)

## Проблема

При блокировках между кластерами (например, Ukraine ↔ chatium.ai) администраторы не могут напрямую обращаться из браузера к хост-инстансу для установления федерации.

**Неправильный подход (браузерное соединение):**
```
Админ (UA) → Браузер → chatium.ai ❌ (блокировка)
```

**Правильный подход (межсерверное соединение):**
```
Админ (UA) → Браузер → chatium.kz ✅ (доступен)
                    ↓
              chatium.kz → chatium.ai ✅ (сервер-сервер)
```

## Архитектура межсерверного установления

### Принцип: Сервер как посредник

Администратор взаимодействует ТОЛЬКО со своим локальным инстансом. Все запросы к внешним инстансам выполняются сервером-сервером.

### Flow установления федерации

#### Шаг 1: Хост-инстанс создаёт приглашение

```
Админ хоста (RU/AI) → Включает федерацию
                              ↓
                    Создаёт FederationInvitation
                              ↓
                    Получает invitation token
                              ↓
                    Передаёт админу клиента (OOB)
```

**Таблица `federation_invitations` (на хост-инстансе):**
```typescript
{
  id: string,
  feedId: string,                    // ID федеративного чата
  invitationToken: string,           // 64-char hex token
  
  // Ограничения
  maxUses: number,                   // Максимум подключений (1-10)
  usedCount: number,                 // Сколько использовано
  expiresAt: Date,                   // Срок действия (7-30 дней)
  
  // Безопасность
  allowedInstances: string[] | null, // Разрешённые домены (null = любые)
  createdBy: string,                 // ID админа, создавшего приглашение
  
  // Статус
  status: 'active' | 'revoked' | 'expired',
  createdAt: Date,
  revokedAt: Date | null,
}
```

#### Шаг 2: Передача приглашения (Out-of-Band)

Админ хоста передаёт приглашение админу клиента любым способом:
- Email
- Telegram
- QR-код
- Скопированная строка

**Формат приглашения:**
```
federation-invite:INVITATION_TOKEN@host.chatium.ai
```

Пример:
```
federation-invite:a3f7b2d9e8c1...5f6a9b2c@chatium.ai
```

#### Шаг 3: Клиентский инстанс принимает приглашение

```
Админ клиента (KZ) → Вводит приглашение в свой инстанс
                              ↓
                    Его сервер парсит токен и хост
                              ↓
                    Запрос к хосту (сервер-сервер)
                              ↓
                    Получает federation token
                              ↓
                    Создаёт локальный чат и подключается
```

## API для межсерверного установления

### На хост-инстансе

#### 1. Создание приглашения

```typescript
// POST /api/federation/invitations/create

interface CreateInvitationRequest {
  feedId: string;
  maxUses?: number;        // default: 1, max: 10
  expiresInDays?: number;  // default: 7, max: 30
  allowedInstances?: string[];  // опционально ограничить домены
}

interface CreateInvitationResponse {
  success: true;
  data: {
    invitationToken: string;
    invitationCode: string;  // Короткий код для передачи (8 символов)
    expiresAt: Date;
    maxUses: number;
    // Полный URL для копирования
    invitationUrl: string;   // federation-invite:TOKEN@host.chatium.ai
  }
}
```

**Проверки:**
- Только owner/admin чата может создавать приглашения
- Максимум 5 активных приглашений на чат
- `allowedInstances` валидируются против whitelist (если настроен)

#### 2. Получение информации о приглашении

```typescript
// GET /api/federation/invitations/:invitationToken/info

interface InvitationInfoResponse {
  success: true;
  data: {
    // Общая информация о чате (без чувствительных данных)
    chatTitle: string;
    chatDescription: string;
    chatType: 'group' | 'channel';
    participantsCount: number;
    hostInstanceDomain: string;
    
    // Информация о приглашении
    expiresAt: Date;
    maxUses: number;
    usedCount: number;
    remainingUses: number;
    
    // Проверка доступности
    isValid: boolean;
    canConnect: boolean;  // false если исчерпаны uses или истёк срок
  }
}
```

Этот endpoint публичный (не требует auth), но rate-limited.

#### 3. Принятие приглашения (сервер-сервер)

```typescript
// POST /api/federation/invitations/accept

interface AcceptInvitationRequest {
  invitationToken: string;
  
  // Информация о клиентском инстансе
  clientInstance: {
    url: string;           // https://client.chatium.kz
    domain: string;        // client.chatium.kz
    name?: string;         // Название организации
  };
  
  // Публичный ключ для шифрования federation token
  // (опционально, для E2E шифрования токена в ответе)
  publicKey?: string;
}

interface AcceptInvitationResponse {
  success: true;
  data: {
    // Данные для подключения
    federationToken: string;      // Основной токен для федерации
    feedId: string;
    hostInstanceUrl: string;
    
    // Метаданные чата
    chatTitle: string;
    chatDescription: string;
    avatarUrl: string | null;
    type: 'group' | 'channel';
    
    // WebSocket endpoint
    wsEndpoint: string;
    
    // Начальные данные
    initialMessages: Message[];
    participants: FederationParticipant[];
    
    // Transit proxy (если нужен)
    transitProxy?: {
      required: boolean;
      proxyEndpoint?: string;  // Если клиент должен использовать транзит
    };
  }
}
```

**Что происходит на хосте:**
1. Валидация invitation token
2. Проверка срока действия и доступных uses
3. Проверка `allowedInstances` (если заданы)
4. Верификация clientInstance (обратный DNS lookup опционально)
5. Генерация federation token (или получение существующего)
6. Создание записи в `federation_connections`
7. Увеличение `usedCount` в приглашении
8. Возврат данных для подключения

#### 4. Отзыв приглашения

```typescript
// POST /api/federation/invitations/:invitationToken/revoke

interface RevokeInvitationResponse {
  success: true;
}
```

**Поведение:**
- При отзыве существующие подключения остаются активными
- Новые подключения по этому токену блокируются

### На клиентском инстансе

#### 1. Парсинг приглашения

```typescript
// POST /api/federation/invitations/parse

interface ParseInvitationRequest {
  invitationCode: string;  // federation-invite:TOKEN@host
}

interface ParseInvitationResponse {
  success: true;
  data: {
    hostDomain: string;
    invitationToken: string;
    // Информация, полученная с хоста
    chatInfo: {
      title: string;
      description: string;
      type: string;
      participantsCount: number;
      expiresAt: Date;
    };
  }
}
```

**Что происходит:**
1. Парсинг кода
2. Сервер-сервер запрос к `GET /api/federation/invitations/:token/info`
3. Возврат информации админу

#### 2. Подтверждение подключения

```typescript
// POST /api/federation/invitations/join

interface JoinFederationRequest {
  invitationToken: string;
  hostDomain: string;
}

interface JoinFederationResponse {
  success: true;
  data: {
    chatId: string;  // Локальный ID созданного чата
    feedId: string;
    connectionStatus: 'connected' | 'pending';
  }
}
```

**Что происходит:**
1. POST к хосту `/api/federation/invitations/accept`
2. Получение federation token
3. Создание локальной записи в `chats` с `isFederated: true`
4. Сохранение полученных участников в `federation_participants`
5. Подключение к WebSocket хоста
6. Возврат локального chatId админу

## UI/UX Flow

### Создание приглашения (админ хоста)

```
┌─────────────────────────────────────────┐
│ Настройки чата > Федерация              │
├─────────────────────────────────────────┤
│                                         │
│ [✓] Включить федерацию                  │
│                                         │
│ Приглашения для подключения:            │
│ ┌─────────────────────────────────────┐ │
│ │ Код: ABC12345 (5 использований)    │ │
│ │ Срок: до 15.04.2025                │ │
│ │ [Копировать] [Отозвать]            │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [+ Создать приглашение]                 │
│                                         │
│ Макс. использований: [1] ▲▼             │
│ Срок действия: [7 дней] ▼               │
│ Ограничить домены: [________]           │
│                                         │
└─────────────────────────────────────────┘
```

**Форматы для копирования:**
- **Короткий код:** `ABC12345` (для голосового/бумажного)
- **Полная строка:** `federation-invite:a3f7...b2c@chatium.ai`
- **QR-код:** содержит полную строку

### Принятие приглашения (админ клиента)

```
┌─────────────────────────────────────────┐
│ Присоединиться к федеративному чату     │
├─────────────────────────────────────────┤
│                                         │
│ Введите код приглашения:                │
│ ┌─────────────────────────────────────┐ │
│ │ federation-invite:...               │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [Проверить]                             │
│                                         │
│ ═══════════════════════════════════════ │
│                                         │
│ Информация о чате:                      │
│ 📢 "Название чата"                      │
│ Участников: 42                          │
│ Хост: chatium.ai                        │
│                                         │
│ [Присоединиться]                        │
│                                         │
└─────────────────────────────────────────┘
```

**После подключения:**
```
✅ Успешное подключение!

Чат "Название" добавлен в ваш список.
Участники из вашего инстанса теперь могут 
присоединяться к этому чату.

[Открыть чат]
```

## Безопасность

### Защита приглашений

#### 1. Rate limiting
```typescript
const invitationLimits = {
  // Создание приглашений
  create: {
    perChat: 5,      // Макс 5 активных на чат
    perAdmin: 10,    // Макс 10 в час на админа
  },
  
  // Проверка информации о приглашении
  infoCheck: {
    perIp: 10,       // 10 запросов в минуту с IP
  },
  
  // Принятие приглашения
  accept: {
    perInvitation: 5,     // Не более 5 попыток принятия
    perInstance: 3,       // Не более 3 подключений в час
  }
}
```

#### 2. Валидация инстанса при принятии
```typescript
async function validateClientInstance(
  ctx: app.Ctx,
  instanceUrl: string,
  allowedInstances: string[] | null
): Promise<boolean> {
  // 1. HTTPS only
  if (!instanceUrl.startsWith('https://')) {
    return false
  }
  
  // 2. Проверка against whitelist
  if (allowedInstances) {
    const domain = new URL(instanceUrl).hostname
    if (!allowedInstances.includes(domain)) {
      return false
    }
  }
  
  // 3. Проверка, что это действительно Chatium
  // (опционально - обратный запрос для проверки)
  const healthCheck = await fetch(`${instanceUrl}/api/health`)
  if (!healthCheck.ok) {
    return false
  }
  
  // 4. Проверка по черному списку
  const isBlocked = await BlockedInstances.findOneBy(ctx, {
    instanceDomain: new URL(instanceUrl).hostname,
    blockedUntil: { $gt: new Date() }
  })
  if (isBlocked) {
    return false
  }
  
  return true
}
```

#### 3. Одноразовые токены для принятия
Если `maxUses: 1`, токен приглашения становится недействительным сразу после первого успешного принятия.

### Изоляция данных

При получении информации о чате через `GET /info` возвращаются ТОЛЬКО:
- Название чата
- Описание
- Тип
- Количество участников
- Домен хоста

**НЕ возвращаются:**
- Содержимое сообщений
- Список участников
- Federation token
- Данные о создателе

## Обработка ошибок

### Коды ошибок

```typescript
enum InvitationErrorCode {
  // Ошибки приглашения
  INVITATION_NOT_FOUND = 'INVITATION_NOT_FOUND',
  INVITATION_EXPIRED = 'INVITATION_EXPIRED',
  INVITATION_REVOKED = 'INVITATION_REVOKED',
  INVITATION_EXHAUSTED = 'INVITATION_EXHAUSTED',  // uses исчерпаны
  
  // Ошибки валидации
  INVALID_INSTANCE = 'INVALID_INSTANCE',
  INSTANCE_BLOCKED = 'INSTANCE_BLOCKED',
  INSTANCE_NOT_ALLOWED = 'INSTANCE_NOT_ALLOWED',
  
  // Ошибки подключения
  HOST_UNREACHABLE = 'HOST_UNREACHABLE',
  TRANSIT_REQUIRED = 'TRANSIT_REQUIRED',
  FEDERATION_DISABLED = 'FEDERATION_DISABLED',
  
  // Ошибки прав
  NOT_CHAT_ADMIN = 'NOT_CHAT_ADMIN',
  TOO_MANY_INVITATIONS = 'TOO_MANY_INVITATIONS',
}
```

### Сценарии ошибок

#### Приглашение истекло
```typescript
{
  success: false,
  error: {
    code: 'INVITATION_EXPIRED',
    message: 'Invitation expired on 2025-04-15',
    details: {
      expiredAt: '2025-04-15T00:00:00Z',
      suggestion: 'Contact chat administrator for new invitation'
    }
  }
}
```

#### Нужен транзитный прокси
```typescript
{
  success: false,
  error: {
    code: 'TRANSIT_REQUIRED',
    message: 'Direct connection not available, transit proxy required',
    details: {
      transitProxyEndpoint: 'https://transit.chatium.ru',
      setupInstructions: 'Enable transit proxy in your instance settings'
    }
  }
}
```

## Интеграция с Transit Proxy

При блокировках между кластерами flow становится:

```
Админ клиента (UA) → Вводит код
                           ↓
                    chatium.kz парсит код
                           ↓
                    Запрос к chatium.ai через Transit Proxy
                           ↓
                    chatium.ai отвечает через Transit Proxy
                           ↓
                    Установление федерации ✓
```

**Автодетекция транзита:**
```typescript
async function detectTransitNeed(
  ctx: app.Ctx,
  hostDomain: string
): Promise<boolean> {
  // Пробуем сделать health check напрямую
  const directCheck = await Promise.race([
    fetch(`https://${hostDomain}/api/health`, { timeout: 5000 }),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), 5000)
    )
  ]).catch(() => null)
  
  if (directCheck?.ok) {
    return false  // Прямое соединение работает
  }
  
  // Проверяем, есть ли transit proxy настроенный
  const transitProxy = await getTransitProxyForCluster(hostDomain)
  return transitProxy !== null
}
```

## Миграция существующих федераций

Если у вас уже есть федерации, созданные через браузер:

```typescript
// POST /api/federation/migrate-to-invitation

// Конвертирует существующее прямое подключение 
// в invitation-based для безопасности

interface MigrateRequest {
  feedId: string;
  generateInvitation?: boolean;  // Создать приглашение для новых
}
```

## Summary

| Аспект | Решение |
|--------|---------|
| **Браузерный доступ** | Админы работают только со своим инстансом |
| **Межсерверное соединение** | Серверы общаются напрямую, используя transit proxy при необходимости |
| **Передача доступа** | Out-of-band: коды, QR, email |
| **Безопасность** | Invitation tokens с ограничением по uses/сроку |
| **Отказоустойчивость** | Автодетекция необходимости транзита |

Этот механизм гарантирует, что администраторы из заблокированных регионов могут установить федерацию без необходимости прямого доступа к хост-инстансу из браузера.
