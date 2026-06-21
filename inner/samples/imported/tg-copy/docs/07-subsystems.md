# 07. Подсистемы

## AI-агенты в чатах

Детали — [spec/07-api-agents.md](spec/07-api-agents.md).

**Модель:** системный агент Chatium (`findAgents`) добавляется в чат. Для него создаётся бот-пользователь (`createOrUpdateBotUser`), который становится участником фида (`role: 'guest'`). Связь чат↔агент хранится в таблице `chat-agents` с полем `chainKey = 'chat_<feedId>_agent_<agentId>'`.

**Режимы ответа** (`respondTo`): `all` (на все сообщения), `admins` (только от owner/admin), `mention` (по упоминанию `@agentName`/`@agentKey`/`@[agentName](id)`; при `respondToMention:'admins'` — только от админов).

**Обработка** (`processMessageWithAgents` в `messages.ts`): при отправке сообщения в группу — загрузка активных агентов, проверка условий, сборка контекста (до 10 последних сообщений), вызов `pushMessageToChain({ agentId, chainKey, messageText, wakeAgent: true, createChainIfNotExists: true, chainParams })`. Агент не реагирует на сообщения от своего `botUserId`.

**Тулы агента** (`tools/`, регистрируются хуком `@start/agent/tools` в `agent-tools.ts`):
- `replyInGroupChat` — отправка текста: `createFeedMessage(ctx, chatId, {id: botUserId}, {text, reply_to, data:{isAgentMessage}})` + рассылка `new-message`.
- `sendImageToGroupChat` — отправка изображения (`files:[{url, name, mimeType}]`).
- Агент должен использовать **только один** тул за раз. В каналах проверяется, что бот имеет роль owner/admin.

## Платные чаты и подписки

Детали — [spec/06-api-subscriptions-payments.md](spec/06-api-subscriptions-payments.md).

**Таблицы:** `chat-subscription-plans` (тарифы), `chat-plan-chats` (тариф↔чаты M:N), `chat-subscriptions` (подписки).

**Периоды** (`shared/subscription-periods.ts`): `days` (с текущего момента), `months` (текущий/следующий месяц или календарные кварталы/полугодия через `specificPeriodStart`), `years` (текущий/следующий год). `generatePeriodOptions(...)` строит варианты с `startDate`/`endDate`.

**Оплата (`@pay/sdk`):**
- Подписка/продление: `runAttemptPayment(ctx, {subject, amount:[amount,currency], successCallbackRoute, cancelCallbackRoute, ...})` → `paymentLink`.
- Автопродление: `attemptAutoCharge` в job `subscriptionRenewalJob`.
- Callbacks (`app.function` + `validateCaller`): success → `status:'active'` + добавление участника во все чаты тарифа + уведомление владельцам; cancel → удаление неоплаченной.
- Сохранённые карты: `getSavedCards`.

**Проверка доступа:** `POST /:feedId/check-access` — участник owner/admin → доступ; иначе ищет активную подписку по тарифам чата; возвращает `reason` (`no_subscription`/`pending`/`expired`/...) + список тарифов для пейволла.

**Планировщик:** `GET /check-expiry` (раз в день) — помечает истёкшие, ставит warning-jobs (за 3 дня) и renewal-jobs (за 1 день).

**Ручная выдача:** `admin-subscriptions POST /grant` — админ создаёт подписку без оплаты, добавляет в чаты тарифа, шлёт WS `granted-by-admin`.

## Push (FCM v1)

Детали — [spec/09-api-push.md](spec/09-api-push.md).

**Поток:** клиент получает FCM-токен (`messaging.getToken`) → `apiPushSubscribeFCMRoute` сохраняет в `push-subscriptions`. При новом сообщении `apiPushSendFCMRoute`:
1. `generateJWT(client_email, private_key)` (RS256 через `jsrsasign` с CDN) → `getAccessToken(jwt)` (OAuth2).
2. POST `https://fcm.googleapis.com/v1/projects/<project_id>/messages:send` с Bearer-токеном.
3. Payload **только `message.data`** (без `notification`/`webpush`) — критично для iOS PWA.
4. Невалидные токены (`UNREGISTERED`/`INVALID_ARGUMENT`/`NOT_FOUND`) удаляются.

**Service Worker** (`firebase-messaging-sw.js`): `onBackgroundMessage` → `showNotification`; `notificationclick` → фокус окна + `postMessage({type:'navigate-to-chat', chatId})` или `openWindow`. Кэш статики (cache-first для GET).

**Требует настройки:** `serviceAccount` в `push/send-fcm.ts` и `FIREBASE_CONFIG` в `firebase-config.js` (плейсхолдеры `YOUR_*`).

## Модерация

`api/moderation.ts` + таблица `chat-moderations`. `POST /set` (мьют/бан, `canManageChat`, нельзя owner/себя); при бане — `deleteFeedParticipant`; при временной — job `/expire` на `expiresAt`. Экспорт `isUserBanned(ctx, feedId, userId)` используется в `chats/list`, `chats/:feedId`, `inbox-badges`, `messages/send`.

## Приватность ЛС

`api/privacy-settings.ts` + таблица `user-privacy-settings`. Режимы `allowDirectMessages`: `everyone` / `contacts` (только `allowedUsers`) / `none`. Экспорт `canSendDirectMessage(ctx, senderId, targetId)` проверяется при создании личного чата.
