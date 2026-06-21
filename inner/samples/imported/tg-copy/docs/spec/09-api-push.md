# 09. Push (FCM v1) и Service Worker

## Поток

```
Клиент: messaging.getToken() → apiPushSubscribeFCMRoute (сохранить в push_subscriptions)
Сервер при новом сообщении: apiPushSendFCMRoute
  → generateJWT(client_email, private_key)  [lib/jwt-rs256, RS256 через jsrsasign]
  → getAccessToken(jwt)                       [OAuth2]
  → POST fcm.googleapis.com/v1/projects/<id>/messages:send  (Bearer)
SW (firebase-messaging-sw.js): onBackgroundMessage → showNotification; notificationclick → фокус/openWindow
```

## api/push/send-fcm.ts

Импорты: `PushSubscriptions`, `requireRealUser`, `generateJWT, getAccessToken` (`../../lib/jwt-rs256`), `request` (`@app/request`).
Хардкод `serviceAccount = { project_id, private_key, client_email }` (плейсхолдеры `YOUR_*` — бросать ошибку, если не заменены).

### `apiPushSendFCMRoute` — `POST /` (`requireRealUser`)
Body `{userIds:string[], title, body, data?, icon?, badge?, image?, url?}`.
1. Проверка плейсхолдеров; валидация `userIds`.
2. `PushSubscriptions.findAll({userId: userIds})`. Пусто → `{success, sent:0}`.
3. `generateJWT(client_email, private_key)` → `getAccessToken(jwt)`.
4. Для каждой подписки `fcmToken = sub.subscriptionData?.fcmToken`. Payload **только `message.data`** (без `notification`/`webpush` — критично для iOS PWA):
   ```json
   { "message": { "token": "<fcmToken>", "data": {
       "title": "...", "body": "...", "url": "<withProjectRoot('./')>",
       "icon": "<withProjectRoot('./icons/icon-192.png')>", "badge": "...",
       "chatId": "...", "timestamp": "..." } } }
   ```
5. POST `https://fcm.googleapis.com/v1/projects/<project_id>/messages:send`, `Authorization: Bearer <accessToken>`.
6. Считать sent/failed; невалидные токены (`UNREGISTERED`/`INVALID_ARGUMENT`/`NOT_FOUND`) → удалить подписку.
Выход `{success, sent, failed, total, errors?, invalidTokensRemoved}`. Лог `ctx.account.log('FCM notifications sent')`.

## api/push/subscribe-fcm.ts

### `apiPushSubscribeFCMRoute` — `POST /` (`requireRealUser`)
Body `{token, deviceInfo?}`. Дедуп `findOneBy({$and:[{userId},{endpoint:token}]})`. Update (`subscriptionData:{fcmToken, deviceInfo, updatedAt}`) или create (`{endpoint:token, subscriptionData:{fcmToken, deviceInfo}, userId, createdAt}`). Выход `{success, message, id}`.

## api/push/stats.ts

### `apiPushStatsRoute` — `GET /` (`requireAccountRole(ctx, 'Admin')` первой строкой — не ручная проверка `ctx.user.is('Admin')`)
`PushSubscriptions.countBy({})` + `.select({userId, count:{$count:['id']}}).group(['userId']).run(ctx)`. Выход `{total, byUser: byUser.length, subscriptions: byUser}`.

## lib/jwt-rs256.ts

См. [03-shared-and-lib.md](03-shared-and-lib.md) — `generateJWT(clientEmail, privateKey)` и `getAccessToken(jwt)`.

## firebase-config.js (клиентский IIFE)

`FIREBASE_CONFIG = {apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId}` (плейсхолдеры `YOUR_*`). `(self||window).FIREBASE_CONFIG = FIREBASE_CONFIG`. Если `firebase` загружен, `firebase.apps` пуст и `apiKey !== 'YOUR_API_KEY'` → `firebase.initializeApp(FIREBASE_CONFIG)`.

## firebase-messaging-sw.js (Service Worker)

- `BASE_PATH` из `self.location.pathname` (срез до последнего `/`).
- `sendServerLog(type, message, details)` → POST `BASE_PATH + 'api/client-logs-sw'` (`{type, message≤500, details≤2000, deviceId:'sw-<scope>'}`).
- `importScripts` Firebase 10.7.1 (app+messaging compat) + `BASE_PATH + 'firebase-config.js'`; `initializeApp` если `apiKey !== 'YOUR_API_KEY'`; `messaging = firebase.messaging()`.
- Кэш `CACHE_NAME='tg-chat-v4'`, статика `icons/icon-192.png`, `icons/icon-512.png`.
- **install**: кэш STATIC_ASSETS + `skipWaiting()`. **activate**: удалить старые кэши + `clients.claim()`.
- **fetch**: только GET; пропуск кросс-ориджин/`navigate`/`/api/`; cache-first с дозаписью 200 (same-origin); сетевая ошибка → `undefined`.
- **onBackgroundMessage(payload)**: лог; title/body/chatId/url из `payload.data` или `notification` (fallback «Новое сообщение», url `/tg`); `showNotification` с `icon/badge` (default `/tg/icons/icon-192.png`), `data:{url,chatId,messageId}`, `vibrate:[200,100,200]`, `tag:'chat-<chatId>'||'push-<ts>'`, `renotify:true`.
- **push** (fallback): парсить `event.data.json()`/`.text()`; через 100ms проверить `getNotifications()` — если Firebase уже показал, не дублировать.
- **notificationclick**: закрыть; найти открытое окно по `urlToOpen=data.url||'/tg'`, сфокусировать + `postMessage({type:'navigate-to-chat', chatId})`, иначе `clients.openWindow(urlToOpen)`.

## Настройка перед запуском

1. `api/push/send-fcm.ts` — подставить `serviceAccount` (project_id, private_key, client_email) сервис-аккаунта Firebase.
2. `firebase-config.js` — подставить web-config Firebase.
3. Положить иконки `icons/icon-192.png`, `icons/icon-512.png` (или заменить URL).
