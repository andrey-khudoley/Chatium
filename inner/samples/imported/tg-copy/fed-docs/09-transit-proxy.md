# Транзитное проксирование (Transit Proxy) для межкластерной федерации

## Проблема

Участники из определённых стран (например, Украина) могут иметь ограниченный доступ к определённым кластерам Chatium:
- ❌ Нет прямого доступа к `chatium.ai` (AI кластер)
- ❌ Нет прямого доступа к `chatium.ru` (RU кластер)
- ✅ Есть доступ к `chatium.kz` (KZ кластер) или другому локальному кластеру

**Требование:** Все запросы от таких пользователей должны идти транзитом через их "родной" сервер Chatium, без прямых обращений к хост-инстансу.

## Архитектура решения

### Концепция "Home Instance" vs "Host Instance"

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER DEVICE                                    │
│                        (находится в Украине)                                │
│                                                                             │
│  ┌──────────────┐         ┌──────────────┐         ┌──────────────┐         │
│  │   Browser    │ ──────> │  chatium.kz  │ ──────> │  chatium.ai  │         │
│  │   (User)     │  WebSocket│  (Home)      │  Federation│  (Host)      │         │
│  └──────────────┘         └──────────────┘         └──────────────┘         │
│                              ↑                                              │
│                              │                                              │
│                         Все запросы идут через Home Instance               │
│                         Нет прямых обращений к Host Instance               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Типы транзитных запросов

```
1. API Requests (REST)
   User → Home Instance → Host Instance
   
2. WebSocket Events
   User ↔ Home Instance ↔ Host Instance
   
3. Media Files
   User → Home Instance → Host Instance (streaming)
   
4. Real-time Updates
   Host Instance → Home Instance → User (WebSocket)
```

## Модификация таблиц

### Дополнение к `federated_connections`

```typescript
interface FederatedConnection {
  // ... существующие поля ...
  
  // Транзитное проксирование
  transitProxy: {
    enabled: boolean;              // true = используется транзит
    homeInstanceUrl: string;       // URL домашнего инстанса пользователя
    homeInstanceDomain: string;    // chatium.kz
    
    // Для хост-инстанса: маппинг пользователей к их home instance
    userHomeInstances: Array<{
      userId: string;              // ID пользователя на хосте
      homeInstanceUrl: string;     // его домашний инстанс
      homeInstanceDomain: string;  // chatium.kz
      proxyToken: string;          // токен для проксирования запросов от этого пользователя
    }>;
  };
  
  // Кеширование для транзита
  cache: {
    messages: Array<{
      messageId: string;
      cachedAt: Date;
      expiresAt: Date;
    }>;
    mediaUrls: Array<{
      originalUrl: string;         // URL на хосте
      proxiedUrl: string;          // URL через home instance
      expiresAt: Date;
    }>;
  };
}
```

### Новая таблица: `transit_proxy_sessions`

```typescript
interface TransitProxySession {
  id: string;
  
  // Связь
  feedId: string;                  // ID федеративного чата
  hostInstanceUrl: string;         // URL хост-инстанса
  homeInstanceUrl: string;         // URL home-инстанса
  
  // Пользователь
  userId: string;                  // ID пользователя на home instance
  remoteUserId: string;            // ID пользователя на host instance
  
  // Токены
  proxyToken: string;              // Токен для проксирования API запросов
  websocketToken: string;          // Токен для WebSocket проксирования
  
  // Состояние
  status: 'active' | 'suspended' | 'closed';
  createdAt: Date;
  lastActivityAt: Date;
  expiresAt: Date;                 // Автоистечение через 24ч неактивности
  
  // Метрики
  messagesProxied: number;
  mediaBytesTransferred: number;
  errorsCount: number;
}
```

## API для транзитного проксирования

### 1. Инициализация транзитной сессии

**Когда:** User из chatium.kz открывает федеративный чат, хост которого на chatium.ai

```typescript
// POST /api/federation/transit/init
// Вызывается на HOME INSTANCE (chatium.kz)

interface TransitInitRequest {
  hostInstanceUrl: string;         // https://chatium.ai/workspace
  feedId: string;                  // ID федеративного чата
  userToken: string;               // Токен пользователя на home instance
}

interface TransitInitResponse {
  success: boolean;
  sessionId: string;
  proxyToken: string;
  websocketToken: string;
  
  // Информация о пользователе на host instance
  remoteUser: {
    id: string;
    displayName: string;
    homeInstance: string;          // chatium.kz
  };
  
  // URL для проксирования
  proxyEndpoints: {
    api: string;                   // /api/federation/transit/proxy
    websocket: string;             // /api/federation/transit/ws
    media: string;                 // /api/federation/transit/media
  };
}

// Логика на Home Instance:
async function initTransitSession(ctx, request) {
  // 1. Проверяем права пользователя
  const user = await requireRealUser(ctx);
  
  // 2. Проверяем существование федеративного чата на хосте
  const hostCheck = await proxyRequestToHost(request.hostInstanceUrl, '/verify', {
    feedId: request.feedId,
    userId: user.id,
    homeInstance: ctx.account.domain,
  });
  
  // 3. Создаём или получаем remote user на host instance
  const remoteUser = await getOrCreateRemoteUser(
    request.hostInstanceUrl,
    user,
    ctx.account.domain
  );
  
  // 4. Создаём сессию проксирования
  const session = await TransitProxySessions.create(ctx, {
    feedId: request.feedId,
    hostInstanceUrl: request.hostInstanceUrl,
    homeInstanceUrl: ctx.account.baseUrl,
    userId: user.id,
    remoteUserId: remoteUser.id,
    proxyToken: generateSecureToken(32),
    websocketToken: generateSecureToken(32),
    status: 'active',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });
  
  // 5. Уведомляем host instance о создании прокси-сессии
  await notifyHostAboutProxySession(request.hostInstanceUrl, session);
  
  return {
    sessionId: session.id,
    proxyToken: session.proxyToken,
    websocketToken: session.websocketToken,
    remoteUser,
  };
}
```

### 2. Проксирование API запросов

```typescript
// Все API запросы от User идут на Home Instance
// Home Instance проксирует их на Host Instance

// POST /api/federation/transit/proxy
// Вызывается на HOME INSTANCE

interface TransitProxyRequest {
  sessionId: string;
  proxyToken: string;
  
  // Оригинальный запрос
  target: {
    endpoint: string;              // /messages/:feedId/send
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: any;
    headers?: Record<string, string>;
  };
}

interface TransitProxyResponse {
  success: boolean;
  statusCode: number;
  body: any;
  headers: Record<string, string>;
}

// Реализация на Home Instance:
async function proxyApiRequest(ctx, request) {
  // 1. Валидация сессии
  const session = await TransitProxySessions.findOne(ctx, {
    where: {
      id: request.sessionId,
      proxyToken: request.proxyToken,
      status: 'active',
    }
  });
  
  if (!session || session.expiresAt < new Date()) {
    throw new Error('Invalid or expired transit session');
  }
  
  // 2. Обновляем активность
  await TransitProxySessions.update(ctx, {
    id: session.id,
    lastActivityAt: new Date(),
  });
  
  // 3. Проксируем запрос на host instance
  const response = await fetch(`${session.hostInstanceUrl}/api/federation/host/proxy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Transit-Token': session.proxyToken,
      'X-Home-Instance': ctx.account.baseUrl,
    },
    body: JSON.stringify({
      feedId: session.feedId,
      remoteUserId: session.remoteUserId,
      target: request.target,
    }),
  });
  
  // 4. Возвращаем ответ пользователю
  return {
    success: true,
    statusCode: response.status,
    body: await response.json(),
    headers: Object.fromEntries(response.headers),
  };
}
```

### 3. Проксирование WebSocket

```typescript
// User подключается к WebSocket на Home Instance
// Home Instance поддерживает 2 WebSocket соединения:
// 1. С User (browser)
// 2. С Host Instance (server-to-server)

// WebSocket endpoint на Home Instance:
// wss://chatium.kz/api/federation/transit/ws?token={websocketToken}

interface TransitWebSocketMessage {
  // От User к Host
  type: 'upstream' | 'downstream';
  
  // Upstream: user → home → host
  upstream?: {
    action: 'subscribe' | 'unsubscribe' | 'typing' | 'heartbeat';
    payload?: any;
  };
  
  // Downstream: host → home → user
  downstream?: {
    event: 'new-message' | 'edit-message' | 'reaction' | 'participant-joined';
    payload: any;
  };
}

// Архитектура WebSocket проксирования:
/*
┌──────────────┐      WebSocket      ┌──────────────┐      WebSocket      ┌──────────────┐
│     User     │ <=================> │  Home Inst   │ <=================> │  Host Inst   │
│   (Browser)  │    (encrypted)      │  (chatium.kz)│   (server-to-server)│  (chatium.ai)│
└──────────────┘                     └──────────────┘                     └──────────────┘
                                           ↑
                                           │
                                    ┌──────────────┐
                                    │  Connection  │
                                    │   Manager    │
                                    │  ( keeps 2   │
                                    │  websockets  │
                                    │   alive )    │
                                    └──────────────┘
*/

// Реализация на Home Instance:
class TransitWebSocketProxy {
  private userSocket: WebSocket;      // Соединение с браузером пользователя
  private hostSocket: WebSocket;      // Соединение с host instance
  private session: TransitProxySession;
  
  constructor(session: TransitProxySession) {
    this.session = session;
    this.connectToHost();
  }
  
  // Когда пользователь подключается
  onUserConnect(userSocket: WebSocket) {
    this.userSocket = userSocket;
    
    // Ретранслируем сообщения от пользователя на host
    userSocket.on('message', (data) => {
      if (this.hostSocket?.readyState === WebSocket.OPEN) {
        this.hostSocket.send(JSON.stringify({
          type: 'upstream',
          sessionId: this.session.id,
          proxyToken: this.session.proxyToken,
          payload: JSON.parse(data),
        }));
      }
    });
    
    // При закрытии соединения с пользователем
    userSocket.on('close', () => {
      this.hostSocket?.close();
    });
  }
  
  // Подключение к host instance
  private connectToHost() {
    this.hostSocket = new WebSocket(
      `${this.session.hostInstanceUrl}/api/federation/host/ws`
    );
    
    this.hostSocket.on('open', () => {
      // Авторизация на host instance
      this.hostSocket.send(JSON.stringify({
        type: 'auth',
        sessionId: this.session.id,
        proxyToken: this.session.proxyToken,
        homeInstance: this.session.homeInstanceUrl,
      }));
    });
    
    // Ретранслируем сообщения от host к пользователю
    this.hostSocket.on('message', (data) => {
      if (this.userSocket?.readyState === WebSocket.OPEN) {
        this.userSocket.send(data);
      } else {
        // Буферизуем, если пользователь офлайн
        this.bufferMessage(data);
      }
    });
    
    // Автореконнект при разрыве
    this.hostSocket.on('close', () => {
      setTimeout(() => this.connectToHost(), 5000);
    });
  }
  
  private bufferMessage(data: any) {
    // Сохраняем в Redis/DB для доставки при переподключении
  }
}
```

### 4. Проксирование медиа-файлов

```typescript
// Проблема: медиа-файлы хранятся на host instance
// Решение: Home Instance проксирует файлы с кешированием

// GET /api/federation/transit/media?url={originalUrl}&token={proxyToken}
// Вызывается на HOME INSTANCE

async function proxyMediaRequest(ctx, req) {
  const { url, token } = req.query;
  
  // 1. Валидация токена
  const session = await validateProxyToken(ctx, token);
  
  // 2. Проверяем кеш
  const cached = await MediaCache.findOne(ctx, {
    where: { originalUrl: url, sessionId: session.id }
  });
  
  if (cached && cached.expiresAt > new Date()) {
    // Отдаём из кеша
    return ctx.resp.sendFile(cached.localPath);
  }
  
  // 3. Загружаем с host instance
  const mediaResponse = await fetch(url, {
    headers: {
      'X-Transit-Token': session.proxyToken,
      'X-Home-Instance': ctx.account.baseUrl,
    },
  });
  
  // 4. Сохраняем в кеш
  const localPath = await saveToCache(mediaResponse.body, url);
  await MediaCache.create(ctx, {
    originalUrl: url,
    localPath,
    sessionId: session.id,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 дней
  });
  
  // 5. Стримим пользователю
  ctx.resp.set('Content-Type', mediaResponse.headers.get('content-type'));
  ctx.resp.set('Content-Length', mediaResponse.headers.get('content-length'));
  ctx.resp.set('Cache-Control', 'public, max-age=86400');
  
  mediaResponse.body.pipe(ctx.resp);
}

// Оптимизация для видео (range requests)
async function proxyMediaWithRange(ctx, req) {
  const { url, token } = req.query;
  const range = req.headers.range;
  
  const session = await validateProxyToken(ctx, token);
  
  // Проксируем range request на host
  const response = await fetch(url, {
    headers: {
      'Range': range,
      'X-Transit-Token': session.proxyToken,
    },
  });
  
  ctx.resp.status(206);
  ctx.resp.set('Content-Range', response.headers.get('content-range'));
  ctx.resp.set('Accept-Ranges', 'bytes');
  
  response.body.pipe(ctx.resp);
}
```

## Модификация клиентского кода

### Автоопределение необходимости транзита

```typescript
// composables/useFederationTransit.ts

export function useFederationTransit() {
  const homeInstance = computed(() => ctx.account.baseUrl);
  const hostInstance = computed(() => currentChat.value?.federation?.hostInstanceUrl);
  
  // Определяем, нужен ли транзит
  const requiresTransit = computed(() => {
    if (!hostInstance.value) return false;
    
    // Извлекаем домены
    const homeDomain = extractDomain(homeInstance.value);
    const hostDomain = extractDomain(hostInstance.value);
    
    // Если домены разные - проверяем доступность
    if (homeDomain !== hostDomain) {
      return !canConnectDirectly(hostDomain);
    }
    
    return false;
  });
  
  // Проверка доступности (пробуем HEAD запрос)
  async function canConnectDirectly(domain: string): Promise<boolean> {
    try {
      const response = await fetch(`https://${domain}/health`, {
        method: 'HEAD',
        mode: 'no-cors',
        signal: AbortSignal.timeout(5000),
      });
      return true;
    } catch {
      return false;
    }
  }
  
  return {
    requiresTransit,
    initTransitSession,
    proxyRequest,
    getProxiedMediaUrl,
  };
}
```

### Модификация API клиента

```typescript
// api/federation-client.ts

class FederationClient {
  private transitSession: TransitSession | null = null;
  
  async makeRequest(endpoint: string, options: RequestOptions) {
    // Если нужен транзит - проксируем через home instance
    if (this.requiresTransit) {
      return this.makeTransitRequest(endpoint, options);
    }
    
    // Прямой запрос к host instance
    return fetch(`${this.hostInstanceUrl}${endpoint}`, options);
  }
  
  private async makeTransitRequest(endpoint: string, options: RequestOptions) {
    // Инициализируем сессию если нужно
    if (!this.transitSession) {
      this.transitSession = await this.initTransitSession();
    }
    
    // Отправляем на home instance для проксирования
    const response = await fetch('/api/federation/transit/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: this.transitSession.id,
        proxyToken: this.transitSession.proxyToken,
        target: {
          endpoint,
          method: options.method,
          body: options.body,
          headers: options.headers,
        },
      }),
    });
    
    return response;
  }
  
  // Получение URL для медиа
  getMediaUrl(originalUrl: string): string {
    if (this.requiresTransit && this.transitSession) {
      // Возвращаем URL через прокси
      return `/api/federation/transit/media?url=${encodeURIComponent(originalUrl)}&token=${this.transitSession.proxyToken}`;
    }
    
    return originalUrl;
  }
}
```

### WebSocket с автоматическим транзитом

```typescript
// composables/useFederationWebSocket.ts

export function useFederationWebSocket(chatId: string) {
  const ws = ref<WebSocket | null>(null);
  const { requiresTransit, transitSession } = useFederationTransit();
  
  function connect() {
    if (requiresTransit.value) {
      // Подключаемся к home instance для проксирования
      ws.value = new WebSocket(
        `${getWebSocketUrl()}/api/federation/transit/ws?token=${transitSession.value.websocketToken}`
      );
    } else {
      // Прямое подключение к host instance
      ws.value = new WebSocket(
        `${getHostWebSocketUrl()}/api/federation/websocket?token=${federationToken.value}`
      );
    }
    
    // Остальная логика WebSocket...
  }
  
  return {
    connect,
    ws,
  };
}
```

## Безопасность транзитного проксирования

### 1. Валидация цепочки доверия

```typescript
// Host Instance должен доверять Home Instance

const TRUSTED_CLUSTERS = [
  'chatium.ai',
  'chatium.ru', 
  'chatium.kz',
  'chatium.eu',
];

async function validateHomeInstance(ctx, homeInstanceUrl: string) {
  const domain = extractDomain(homeInstanceUrl);
  
  // Проверяем что домен в whitelist
  if (!TRUSTED_CLUSTERS.includes(domain)) {
    throw new Error('Untrusted home instance');
  }
  
  // Проверяем TLS сертификат (через fingerprint)
  const certFingerprint = await getCertFingerprint(homeInstanceUrl);
  const knownFingerprint = await getKnownFingerprint(domain);
  
  if (certFingerprint !== knownFingerprint) {
    throw new Error('Certificate mismatch - possible MITM');
  }
  
  return true;
}
```

### 2. Rate limiting на транзит

```typescript
// Ограничения на уровне Home Instance
const TRANSIT_LIMITS = {
  // На пользователя
  perUser: {
    requestsPerMinute: 60,
    messagesPerMinute: 30,
    mediaBandwidthPerHour: 100 * 1024 * 1024, // 100 MB
  },
  
  // На соединение с host instance
  perHostConnection: {
    maxConcurrentUsers: 1000,
    totalBandwidthPerSecond: 100 * 1024 * 1024, // 100 MB/s
  },
  
  // На весь home instance
  perHomeInstance: {
    maxConcurrentSessions: 10000,
    totalRequestsPerSecond: 1000,
  },
};

async function checkTransitLimits(ctx, session: TransitProxySession) {
  const userId = session.userId;
  const hostInstance = session.hostInstanceUrl;
  
  // Проверяем лимиты пользователя
  const userRequests = await getUserRequestCount(userId, '1 minute');
  if (userRequests > TRANSIT_LIMITS.perUser.requestsPerMinute) {
    throw new Error('Rate limit exceeded for user');
  }
  
  // Проверяем лимиты соединения с host
  const hostConnections = await getHostConnectionCount(hostInstance);
  if (hostConnections > TRANSIT_LIMITS.perHostConnection.maxConcurrentUsers) {
    // Включаем circuit breaker
    await enableCircuitBreaker(hostInstance);
    throw new Error('Host instance overloaded');
  }
}
```

### 3. Изоляция сессий

```typescript
// Каждая транзитная сессия изолирована

class TransitSessionIsolation {
  // Проверка что пользователь может получить доступ только к своему чату
  async validateChatAccess(session: TransitProxySession, feedId: string) {
    if (session.feedId !== feedId) {
      // Логируем попытку доступа к чужому чату
      await logSecurityEvent({
        type: 'unauthorized_chat_access_attempt',
        sessionId: session.id,
        attemptedFeedId: feedId,
        userId: session.userId,
      });
      
      throw new Error('Access denied');
    }
  }
  
  // Проверка что запрос идёт от легитимного home instance
  async validateRequestOrigin(ctx, session: TransitProxySession) {
    const origin = ctx.req.headers['x-home-instance'];
    
    if (origin !== session.homeInstanceUrl) {
      await logSecurityEvent({
        type: 'origin_mismatch',
        sessionId: session.id,
        expectedOrigin: session.homeInstanceUrl,
        actualOrigin: origin,
      });
      
      // Закрываем сессию
      await closeTransitSession(session.id);
      throw new Error('Origin validation failed');
    }
  }
}
```

### 4. Защита от атак через транзит

```typescript
// Предотвращение использования транзита для DDoS

async function validateTransitRequest(ctx, request) {
  // Проверяем размер payload
  const bodySize = JSON.stringify(request.target.body).length;
  if (bodySize > 1024 * 1024) { // 1 MB limit
    throw new Error('Payload too large');
  }
  
  // Проверяем что endpoint в whitelist
  const allowedEndpoints = [
    '/messages/:feedId/list',
    '/messages/:feedId/send',
    '/messages/:feedId/edit',
    '/messages/:feedId/delete',
    '/reactions/:feedId/toggle',
    '/typing/:feedId/start',
    '/typing/:feedId/stop',
    '/participants/:feedId/list',
  ];
  
  const isAllowed = allowedEndpoints.some(pattern => 
    matchPattern(request.target.endpoint, pattern)
  );
  
  if (!isAllowed) {
    throw new Error('Endpoint not allowed for transit');
  }
  
  // Проверяем на попытку SSRF
  if (request.target.body && containsInternalUrls(request.target.body)) {
    throw new Error('SSRF attempt detected');
  }
}
```

## Обработка ошибок транзита

### Сценарии отказа

```typescript
enum TransitErrorType {
  // Home instance недоступен
  HOME_INSTANCE_UNAVAILABLE = 'home_unavailable',
  
  // Host instance недоступен
  HOST_INSTANCE_UNAVAILABLE = 'host_unavailable',
  
  // Таймаут проксирования
  PROXY_TIMEOUT = 'proxy_timeout',
  
  // Превышены лимиты
  RATE_LIMIT_EXCEEDED = 'rate_limit',
  
  // Сессия истекла
  SESSION_EXPIRED = 'session_expired',
  
  // Ошибка авторизации
  AUTH_FAILED = 'auth_failed',
}

// Обработка ошибок
async function handleTransitError(error: TransitError) {
  switch (error.type) {
    case TransitErrorType.HOST_INSTANCE_UNAVAILABLE:
      // Показываем пользователю сообщение о недоступности
      showErrorToast('Host instance temporarily unavailable. Retrying...');
      
      // Включаем офлайн-режим с буферизацией сообщений
      enableOfflineMode();
      
      // Пытаемся переподключиться с exponential backoff
      scheduleReconnect({ maxDelay: 300000 }); // 5 минут максимум
      break;
      
    case TransitErrorType.PROXY_TIMEOUT:
      // Повторяем запрос
      return retryRequest(error.originalRequest, { maxRetries: 3 });
      
    case TransitErrorType.SESSION_EXPIRED:
      // Переинициализируем сессию
      await reinitializeTransitSession();
      break;
      
    case TransitErrorType.RATE_LIMIT_EXCEEDED:
      // Показываем сообщение с таймером
      showRateLimitError(error.retryAfter);
      break;
  }
}
```

## UI/UX для транзитных пользователей

### Индикация транзитного соединения

```vue
<!-- Компонент TransitIndicator.vue -->
<template>
  <div v-if="requiresTransit" class="transit-indicator">
    <i class="fas fa-shield-alt"></i>
    <span>Secure transit via {{ homeInstanceDomain }}</span>
    <Tooltip>
      Your connection is routed through your home server for privacy.
      Direct connection to {{ hostInstanceDomain }} is restricted.
    </Tooltip>
  </div>
</template>

<style>
.transit-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  background: #e3f2fd;
  border-radius: 4px;
  font-size: 12px;
  color: #1976d2;
}

.transit-indicator i {
  color: #1976d2;
}
</style>
```

### Статус подключения

```vue
<!-- TransitConnectionStatus.vue -->
<template>
  <div class="connection-status" :class="statusClass">
    <div class="status-dot"></div>
    <span class="status-text">{{ statusText }}</span>
    <span v-if="latency" class="latency">{{ latency }}ms</span>
  </div>
</template>

<script setup>
const props = defineProps({
  status: String, // 'direct' | 'transit' | 'degraded' | 'offline'
  latency: Number,
  homeInstance: String,
  hostInstance: String,
});

const statusText = computed(() => {
  switch (props.status) {
    case 'direct': return `Connected to ${props.hostInstance}`;
    case 'transit': return `Connected via ${props.homeInstance}`;
    case 'degraded': return 'Connection degraded';
    case 'offline': return 'Offline - messages queued';
  }
});
</script>
```

## Мониторинг и метрики

### Ключевые метрики

```typescript
interface TransitMetrics {
  // Активные сессии
  activeSessions: number;
  sessionsByHomeInstance: Record<string, number>;
  
  // Производительность
  averageLatency: number;          // Средняя задержка проксирования
  p95Latency: number;              // 95-й перцентиль
  p99Latency: number;              // 99-й перцентиль
  
  // Пропускная способность
  totalBytesProxied: number;
  bytesByMediaType: {
    images: number;
    video: number;
    audio: number;
    other: number;
  };
  
  // Надёжность
  errorRate: number;               // Процент ошибок
  timeoutRate: number;             // Процент таймаутов
  reconnectionCount: number;       // Количество переподключений
  
  // Кеширование
  cacheHitRate: number;            // Процент попаданий в кеш медиа
  cacheSize: number;               // Размер кеша
}

// Отправка метрик
async function collectTransitMetrics(ctx): Promise<TransitMetrics> {
  const sessions = await TransitProxySessions.findAll(ctx, {
    where: { status: 'active' },
  });
  
  return {
    activeSessions: sessions.length,
    averageLatency: await calculateAverageLatency(sessions),
    cacheHitRate: await calculateCacheHitRate(),
    // ...
  };
}
```

### Алерты

```typescript
// Условия для алертов
const TRANSIT_ALERTS = {
  // Высокая задержка
  highLatency: {
    condition: (metrics) => metrics.p95Latency > 2000, // > 2 секунд
    severity: 'warning',
    message: 'Transit proxy latency is high',
  },
  
  // Много ошибок
  highErrorRate: {
    condition: (metrics) => metrics.errorRate > 0.05, // > 5%
    severity: 'critical',
    message: 'Transit error rate exceeded threshold',
  },
  
  // Host instance недоступен
  hostUnavailable: {
    condition: (metrics) => metrics.timeoutRate > 0.1, // > 10%
    severity: 'critical',
    message: 'Host instance may be unavailable',
  },
  
  // Перегрузка
  overload: {
    condition: (metrics) => metrics.activeSessions > 8000,
    severity: 'warning',
    message: 'Approaching transit session limit',
  },
};
```

## Roadmap реализации

### Phase 1: Базовый транзит (MVP)
- [ ] Таблица `transit_proxy_sessions`
- [ ] API инициализации сессии
- [ ] Проксирование REST API
- [ ] Базовое проксирование WebSocket
- [ ] Простое кеширование медиа

### Phase 2: Оптимизации
- [ ] Smart кеширование (предзагрузка медиа)
- [ ] Сжатие трафика между инстансами
- [ ] Буферизация при временных разрывах
- [ ] Graceful degradation

### Phase 3: Продвинутые фичи
- [ ] Мульти-hop транзит (через несколько инстансов)
- [ ] CDN-интеграция для медиа
- [ ] E2E шифрование между инстансами
- [ ] Автоматический выбор оптимального маршрута

---

**Важно:** Транзитное проксирование должно быть полностью прозрачным для конечного пользователя. Он не должен знать, что его запросы идут через посредника — за исключением индикатора статуса подключения.
