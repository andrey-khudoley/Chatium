# Безопасность федеративных чатов

## Векторы атак и защита

### 1. Несанкционированный доступ к сообщениям

**Вектор атаки:**
Злоумышленник пытается получить доступ к сообщениям чата, к которому не подключен.

**Защита:**

#### A. Генерация токена
```typescript
import { randomBytes } from 'crypto'

function generateFederationToken(): string {
  // 256 бит случайности = 64 hex символа
  return randomBytes(32).toString('hex')
}
```

**Почему это безопасно:**
- 2^256 возможных комбинаций
- Практически невозможно угадать или перебрать

#### B. Проверка на каждом запросе
```typescript
// middleware для всех federation endpoints
async function validateFederationToken(
  ctx: app.Ctx,
  token: string,
  feedId: string
): Promise<boolean> {
  // Constant-time comparison для защиты от timing attacks
  const chat = await Chats.findOneBy(ctx, { feedId })
  if (!chat) return false
  
  // Используем crypto.timingSafeEqual
  const expectedBuffer = Buffer.from(chat.federationToken || '')
  const providedBuffer = Buffer.from(token)
  
  if (expectedBuffer.length !== providedBuffer.length) return false
  
  return crypto.timingSafeEqual(expectedBuffer, providedBuffer)
}
```

**Дополнительные проверки:**
```typescript
async function fullTokenValidation(
  ctx: app.Ctx,
  token: string,
  feedId: string
): Promise<{ valid: boolean; reason?: string }> {
  const chat = await Chats.findOneBy(ctx, { feedId })
  
  if (!chat) {
    return { valid: false, reason: 'CHAT_NOT_FOUND' }
  }
  
  if (!chat.isFederated) {
    return { valid: false, reason: 'NOT_FEDERATED' }
  }
  
  if (!chat.federationEnabled) {
    return { valid: false, reason: 'FEDERATION_DISABLED' }
  }
  
  const expectedBuffer = Buffer.from(chat.federationToken || '')
  const providedBuffer = Buffer.from(token)
  
  if (expectedBuffer.length !== providedBuffer.length) {
    return { valid: false, reason: 'INVALID_TOKEN' }
  }
  
  if (!crypto.timingSafeEqual(expectedBuffer, providedBuffer)) {
    return { valid: false, reason: 'INVALID_TOKEN' }
  }
  
  return { valid: true }
}
```

### 2. Подмена участника

**Вектор атаки:**
Злоумышленник из инстанса A пытается отправить сообщение от имени пользователя из инстанса B.

**Защита:**

#### A. Привязка к instance domain
```typescript
// При отправке сообщения клиент ОБЯЗАН указать свой домен
headers: {
  'X-Instance-Domain': 'client.chatium.ru'
}

// На хосте проверяем соответствие
const instanceDomain = req.headers['x-instance-domain']
const author = req.body.author

if (author.instanceDomain !== instanceDomain) {
  throw new Error('Instance domain mismatch')
}
```

#### B. Создание уникального participantId
```typescript
function createParticipantId(instanceDomain: string, remoteUserId: string): string {
  // Формат: remote-{domain}-{userId}
  return `remote-${instanceDomain}-${remoteUserId}`
}

// При получении сообщения
const participantId = createParticipantId(
  author.instanceDomain,
  author.remoteUserId
)

// Проверяем, что такой участник существует
const participant = await FederationParticipants.findOneBy(ctx, {
  chatId: feedId,
  participantId,
})

if (!participant) {
  throw new Error('Participant not found')
}
```

#### C. Верификация через обратный запрос (опционально)
При первой отправке сообщения от нового участника:
```typescript
// Хост делает обратный запрос к клиентскому инстансу
const verifyUrl = `https://${instanceDomain}/api/federation/verify-user`
const response = await fetch(verifyUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    userId: remoteUserId,
    federationToken: token,  // Для подтверждения, что запрос от хоста
  }),
})

const { exists, displayName, avatarUrl } = await response.json()

if (!exists) {
  throw new Error('User verification failed')
}
```

### 3. Injection атаки в сообщениях

**Вектор атаки:**
Злоумышленник отправляет сообщение с вредоносным контентом (XSS, script injection).

**Защита:**

#### A. Валидация на хосте
```typescript
import { sanitizeHtml } from '@app/sanitize'

function validateMessage(message: { text: string; files?: any[] }) {
  // 1. Длина текста
  if (message.text.length < 1 || message.text.length > 10000) {
    throw new Error('Invalid message length')
  }
  
  // 2. Санитизация HTML (на всякий случай)
  message.text = sanitizeHtml(message.text, {
    allowedTags: [],  // Никаких тегов
    allowedAttributes: {},
  })
  
  // 3. Проверка файлов
  if (message.files) {
    if (message.files.length > 10) {
      throw new Error('Too many files')
    }
    
    for (const file of message.files) {
      // URL должен быть HTTPS
      if (!file.url.startsWith('https://')) {
        throw new Error('Only HTTPS URLs allowed')
      }
      
      // Размер файла
      if (file.size > 100 * 1024 * 1024) {  // 100 MB
        throw new Error('File too large')
      }
      
      // MIME type из whitelist
      const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'video/mp4',
        'video/webm',
        'audio/mpeg',
        'audio/ogg',
        'application/pdf',
      ]
      
      if (!allowedTypes.includes(file.mimeType)) {
        throw new Error('File type not allowed')
      }
    }
  }
  
  return message
}
```

#### B. Escape на клиенте
```vue
<!-- В ChatView.vue всегда используем v-text или {{ }} для текста -->
<div class="message-text" v-text="message.text" />

<!-- Для markdown используем библиотеку с санитизацией -->
<MarkdownMessage :text="message.text" :sanitize="true" />
```

### 4. Rate Limiting обход

**Вектор атаки:**
Злоумышленник меняет IP адрес или использует распределённую атаку для обхода rate limiting.

**Защита:**

#### A. Многоуровневый rate limiting
```typescript
// Лимиты на разных уровнях
const rateLimits = {
  // По IP адресу
  byIp: {
    requests: 100,
    window: '1 minute',
  },
  
  // По instance domain
  byInstance: {
    requests: 1000,
    window: '1 minute',
  },
  
  // По пользователю
  byUser: {
    messages: 10,
    window: '1 minute',
  },
  
  // Глобально на feedId
  byFeed: {
    requests: 5000,
    window: '1 minute',
  },
}

// Проверка всех лимитов
async function checkRateLimits(
  ctx: app.Ctx,
  ip: string,
  instanceDomain: string,
  userId: string,
  feedId: string
): Promise<{ allowed: boolean; reason?: string }> {
  // 1. По IP
  if (!await checkLimit(`ip:${ip}`, rateLimits.byIp)) {
    return { allowed: false, reason: 'IP_RATE_LIMIT' }
  }
  
  // 2. По инстансу
  if (!await checkLimit(`instance:${instanceDomain}`, rateLimits.byInstance)) {
    return { allowed: false, reason: 'INSTANCE_RATE_LIMIT' }
  }
  
  // 3. По пользователю
  if (!await checkLimit(`user:${userId}`, rateLimits.byUser)) {
    return { allowed: false, reason: 'USER_RATE_LIMIT' }
  }
  
  // 4. По фиду
  if (!await checkLimit(`feed:${feedId}`, rateLimits.byFeed)) {
    return { allowed: false, reason: 'FEED_RATE_LIMIT' }
  }
  
  return { allowed: true }
}
```

#### B. Адаптивный rate limiting
```typescript
// Если детектируется аномалия — снижаем лимиты
const suspiciousPatterns = {
  // Слишком много ошибок
  highErrorRate: (errorRate: number) => errorRate > 0.5,
  
  // Слишком быстрые запросы
  tooFast: (avgInterval: number) => avgInterval < 10,  // ms
  
  // Одинаковые сообщения
  duplicate: (uniqueRatio: number) => uniqueRatio < 0.3,
}

async function adjustRateLimits(instanceDomain: string) {
  const stats = await getInstanceStats(instanceDomain)
  
  let multiplier = 1.0
  
  if (suspiciousPatterns.highErrorRate(stats.errorRate)) {
    multiplier *= 0.5
  }
  
  if (suspiciousPatterns.tooFast(stats.avgInterval)) {
    multiplier *= 0.3
  }
  
  if (suspiciousPatterns.duplicate(stats.uniqueRatio)) {
    multiplier *= 0.2
  }
  
  return {
    requests: Math.floor(rateLimits.byInstance.requests * multiplier),
    window: rateLimits.byInstance.window,
  }
}
```

### 5. Replay атаки

**Вектор атаки:**
Злоумышленник перехватывает WebSocket событие и повторно отправляет его.

**Защита:**

#### A. Timestamp validation
```typescript
// В каждом событии
{
  type: 'federation-event',
  event: 'new-message',
  feedId: string,
  timestamp: string,  // ISO timestamp
  data: { ... }
}

// На клиенте
function validateEventTimestamp(event: any): boolean {
  const eventTime = new Date(event.timestamp)
  const now = new Date()
  
  // События старше 1 минуты отклоняем
  const maxAge = 60 * 1000  // 1 minute
  if (now.getTime() - eventTime.getTime() > maxAge) {
    return false
  }
  
  // События "из будущего" тоже отклоняем
  if (eventTime.getTime() > now.getTime() + 5000) {  // 5 sec clock skew
    return false
  }
  
  return true
}
```

#### B. Event deduplication
```typescript
// Храним хеши последних 1000 событий
const recentEvents = new Set<string>()

function getEventHash(event: any): string {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(event))
    .digest('hex')
}

function isEventDuplicate(event: any): boolean {
  const hash = getEventHash(event)
  
  if (recentEvents.has(hash)) {
    return true
  }
  
  recentEvents.add(hash)
  
  // Ограничиваем размер Set
  if (recentEvents.size > 1000) {
    const firstItem = recentEvents.values().next().value
    recentEvents.delete(firstItem)
  }
  
  return false
}
```

### 6. Man-in-the-Middle (MITM)

**Вектор атаки:**
Злоумышленник перехватывает трафик между инстансами.

**Защита:**

#### A. HTTPS обязателен
```typescript
// Проверка при подключении
function validateInstanceUrl(url: string): boolean {
  if (!url.startsWith('https://')) {
    throw new Error('Only HTTPS URLs allowed')
  }
  return true
}
```

#### B. Certificate pinning (опционально)
```typescript
// При первом подключении сохраняем сертификат
const instanceCertificates = new Map<string, string>()

async function validateCertificate(instanceDomain: string): Promise<boolean> {
  const savedFingerprint = instanceCertificates.get(instanceDomain)
  const currentFingerprint = await getCertificateFingerprint(instanceDomain)
  
  if (savedFingerprint && savedFingerprint !== currentFingerprint) {
    // ПРЕДУПРЕЖДЕНИЕ: сертификат изменился!
    ctx.account.log('Certificate mismatch', {
      level: 'error',
      json: {
        instanceDomain,
        savedFingerprint,
        currentFingerprint,
      },
    })
    return false
  }
  
  if (!savedFingerprint) {
    instanceCertificates.set(instanceDomain, currentFingerprint)
  }
  
  return true
}
```

### 7. Denial of Service (DoS)

**Вектор атаки:**
Злоумышленник перегружает хост огромным количеством запросов.

**Защита:**

#### A. Глобальный rate limiting
```typescript
// Максимум 10,000 запросов/мин на весь сервер
const globalLimit = {
  requests: 10000,
  window: '1 minute',
}

// Если превышен — временная блокировка новых подключений
let isOverloaded = false

async function checkGlobalLoad(): Promise<boolean> {
  const currentLoad = await getCurrentRequestRate()
  
  if (currentLoad > globalLimit.requests) {
    isOverloaded = true
    
    // Разблокировка через 5 минут
    setTimeout(() => {
      isOverloaded = false
    }, 5 * 60 * 1000)
    
    return false
  }
  
  return true
}
```

#### B. Приоритезация
```typescript
// В условиях высокой нагрузки приоритезируем запросы
enum RequestPriority {
  CRITICAL = 3,  // Новые сообщения
  HIGH = 2,      // Реакции, редактирование
  NORMAL = 1,    // История, участники
  LOW = 0,       // Heartbeat
}

async function handleRequest(req: any, priority: RequestPriority) {
  if (isOverloaded && priority < RequestPriority.HIGH) {
    throw new Error('Server overloaded, try again later')
  }
  
  // Обработка запроса
}
```

#### C. Circuit Breaker
```typescript
// Если хост не справляется — временно отключаем федерацию
class CircuitBreaker {
  private failureCount = 0
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED'
  
  async execute(fn: () => Promise<any>): Promise<any> {
    if (this.state === 'OPEN') {
      throw new Error('Circuit breaker is OPEN')
    }
    
    try {
      const result = await fn()
      this.onSuccess()
      return result
    } catch (e) {
      this.onFailure()
      throw e
    }
  }
  
  private onSuccess() {
    this.failureCount = 0
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED'
    }
  }
  
  private onFailure() {
    this.failureCount++
    
    if (this.failureCount >= 5) {
      this.state = 'OPEN'
      
      // Попытка восстановления через 30 секунд
      setTimeout(() => {
        this.state = 'HALF_OPEN'
        this.failureCount = 0
      }, 30 * 1000)
    }
  }
}
```

### 8. Утечка данных через ошибки

**Вектор атаки:**
Злоумышленник получает информацию о системе через детальные сообщения об ошибках.

**Защита:**

#### A. Обобщенные сообщения об ошибках
```typescript
function sanitizeError(error: any): { code: string; message: string } {
  // Внутреннее логирование с деталями
  ctx.account.log('Federation API error', {
    level: 'error',
    json: {
      error: error.message,
      stack: error.stack,
      details: error.details,
    },
  })
  
  // Клиенту возвращаем общее сообщение
  const publicErrors = {
    'INVALID_TOKEN': 'Authentication failed',
    'RATE_LIMIT_EXCEEDED': 'Too many requests',
    'VALIDATION_ERROR': 'Invalid request data',
  }
  
  return {
    code: error.code || 'INTERNAL_ERROR',
    message: publicErrors[error.code] || 'An error occurred',
  }
}
```

#### B. Не раскрывать внутреннюю структуру
```typescript
// ❌ Плохо
throw new Error(`User ${userId} not found in table users_${accountId}`)

// ✅ Хорошо
throw new Error('User not found')
```

## Аудит и мониторинг

### Логирование всех действий

```typescript
// Все federation API запросы
ctx.account.log('Federation API', {
  level: 'info',
  json: {
    endpoint: req.path,
    method: req.method,
    feedId: req.params.feedId,
    instanceDomain: req.headers['x-instance-domain'],
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    status: ctx.resp.status,
    duration: Date.now() - requestStartTime,
  },
})

// Подозрительная активность
ctx.account.log('Suspicious activity', {
  level: 'warn',
  json: {
    type: 'invalid_token_attempt',
    feedId: req.params.feedId,
    token: req.headers['x-federation-token']?.slice(0, 8) + '...',  // Частично
    ip: req.ip,
    instanceDomain: req.headers['x-instance-domain'],
  },
})

// Критические события
ctx.account.log('Security event', {
  level: 'error',
  json: {
    type: 'instance_blocked',
    instanceDomain: blockedDomain,
    reason: blockReason,
    timestamp: new Date(),
  },
})
```

### Метрики

```typescript
// Счетчики для мониторинга
const metrics = {
  // Успешные запросы
  successfulRequests: 0,
  
  // Неудачные запросы
  failedRequests: 0,
  
  // По типу ошибки
  errorsByType: new Map<string, number>(),
  
  // По инстансу
  requestsByInstance: new Map<string, number>(),
  
  // WebSocket соединения
  activeConnections: 0,
  
  // Средняя задержка
  avgLatency: 0,
}

// Экспорт метрик для Grafana/Prometheus
export async function getMetrics() {
  return {
    ...metrics,
    timestamp: new Date(),
  }
}
```

### Алерты

Настроить уведомления при:

1. **Более 10 неудачных попыток аутентификации за 5 минут**
   ```typescript
   if (failedAuthAttempts > 10) {
     await sendAlert('High number of failed auth attempts')
   }
   ```

2. **Превышение rate limit более чем на 200%**
   ```typescript
   if (currentRate > rateLimit.requests * 2) {
     await sendAlert('Severe rate limit violation')
   }
   ```

3. **Отключение инстанса из-за подозрительной активности**
   ```typescript
   await sendAlert(`Instance ${domain} disconnected: ${reason}`)
   ```

4. **Circuit breaker в состоянии OPEN**
   ```typescript
   if (circuitBreaker.state === 'OPEN') {
     await sendAlert('Circuit breaker opened - federation degraded')
   }
   ```

## Checklist безопасности

Перед запуском федерации в продакшен:

- [ ] Все endpoints требуют HTTPS
- [ ] Federation tokens генерируются криптографически стойким генератором
- [ ] Используется constant-time comparison для токенов
- [ ] Rate limiting настроен на всех уровнях (IP, instance, user, feed)
- [ ] Валидация всех входящих данных (длина, тип, содержимое)
- [ ] Санитизация HTML в сообщениях
- [ ] WebSocket каналы изолированы по токенам
- [ ] Timestamp validation для событий
- [ ] Event deduplication реализован
- [ ] Сообщения об ошибках не раскрывают внутреннюю структуру
- [ ] Логирование всех federation API запросов
- [ ] Логирование подозрительной активности
- [ ] Алерты настроены для критических событий
- [ ] Circuit breaker реализован
- [ ] Приоритезация запросов при высокой нагрузке
- [ ] Certificate pinning (опционально, для повышенной безопасности)
- [ ] Регулярный аудит логов безопасности
- [ ] План реагирования на инциденты

## План реагирования на инциденты

### 1. Обнаружение атаки

**Индикаторы:**
- Аномально высокий трафик с одного IP/инстанса
- Множественные неудачные попытки аутентификации
- Подозрительные паттерны в сообщениях (одинаковый текст, слишком быстро)

**Действия:**
1. Логировать все детали
2. Временно заблокировать IP/инстанс
3. Уведомить администратора

### 2. Блокировка

```typescript
async function blockInstance(
  ctx: app.Ctx,
  instanceDomain: string,
  reason: string,
  duration: number = 3600000  // 1 час
) {
  // Помечаем все соединения как неактивные
  const connections = await FederationConnections.findAll(ctx, {
    where: { instanceDomain },
  })
  
  for (const conn of connections) {
    await FederationConnections.update(ctx, {
      id: conn.id,
      isActive: false,
    })
  }
  
  // Закрываем WebSocket соединения
  await disconnectAllInstanceSockets(ctx, instanceDomain)
  
  // Добавляем в черный список
  await BlockedInstances.create(ctx, {
    instanceDomain,
    reason,
    blockedUntil: new Date(Date.now() + duration),
  })
  
  // Логируем
  ctx.account.log('Instance blocked', {
    level: 'warn',
    json: { instanceDomain, reason, duration },
  })
  
  // Уведомляем админа
  await sendAdminAlert(`Instance ${instanceDomain} blocked: ${reason}`)
}
```

### 3. Расследование

После блокировки:
1. Анализ логов за последний час
2. Выявление паттернов атаки
3. Оценка ущерба (утечка данных, DDoS)
4. Документирование инцидента

### 4. Восстановление

```typescript
async function unblockInstance(
  ctx: app.Ctx,
  instanceDomain: string
) {
  await BlockedInstances.deleteBy(ctx, { instanceDomain })
  
  ctx.account.log('Instance unblocked', {
    level: 'info',
    json: { instanceDomain },
  })
}
```

### 5. Улучшение

После каждого инцидента:
- Обновить правила rate limiting
- Добавить новые паттерны детекции
- Улучшить логирование
- Обновить документацию
