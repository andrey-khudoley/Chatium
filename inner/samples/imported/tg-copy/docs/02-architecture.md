# 02. Архитектура

## Слои

```
┌──────────────────────────────────────────────────────────┐
│  Браузер (PWA)                                           │
│  index.tsx → App.vue (SPA, Vue 3)                        │
│   ├── ChatsList / ChatView / ProfileView / ChatSettings │
│   ├── composables/* (socket, audio, theme, scale, ...)  │
│   └── Service Worker (firebase-messaging-sw.js)         │
└───────────────┬───────────────────────┬──────────────────┘
       HTTP (apiXxxRoute.run / fetch)    │  WebSocket (subscribeToData)
                │                        │
┌───────────────▼────────────────────────▼─────────────────┐
│  Серверные роуты Chatium (api/*.ts, file-based)          │
│   ├── @app/feed   — сообщения, участники, фиды           │
│   ├── @app/heap   — 19 таблиц метаданных                 │
│   ├── @app/socket — рассылка событий                     │
│   ├── @pay/sdk    — подписки/платежи                     │
│   ├── @ai-agents  — обработка сообщений агентами         │
│   └── @app/storage, @app/inbox, @app/auth, ...           │
└──────────────────────────────────────────────────────────┘
```

## Ключевой архитектурный принцип

**Источник истины для сообщений — Feed API (`@app/feed`), а не Heap.** Сообщения, участники, реакции (в `message.data`), файлы, флаг закрепления — всё живёт в фиде. Heap-таблицы хранят только **метаданные и кэши**: справочник чатов (`chats`), приглашения, папки, подписки, модерации, прочитанные упоминания, транскрипции и т.п.

Связь чата с фидом — через строковое поле `chats.feedId` (= `feed.id` из `createFeed`). RefLink на фид не используется.

## Точка входа

`index.tsx` — единственная HTML-страница на пути `'/'` (базовый путь приложения `/tg/`):
1. Если `!ctx.user` → `redirect('/s/auth/signin?back=/tg')`.
2. `userSocketId = await genSocketId(ctx, 'user-' + ctx.user.id)`.
3. Возвращает `<html>` с инлайн-CSS (темы, стили чата), подключением Tailwind/FontAwesome/Cropper/Firebase и монтированием `<App userSocketId={userSocketId} />`.

Прочие серверные страницы: `invite.tsx` (`/:token` — приём приглашения), `manifest.json.ts` (`/` → PWA-манифест).

## File-based роутинг

Один файл = набор роутов. Каждый роут объявляется через глобальный `app` (без импорта):

```ts
export const apiChatsListRoute = app.get('/list', async (ctx, req) => {...})
export const apiChatsCreateRoute = app.body(s => ...).post('/create', async (ctx, req) => {...})
export const apiChatGetRoute = app.get('/:feedId', async (ctx, req) => {...})
```

URL роута = базовый путь приложения + путь файла + путь в `app.get/post`. С клиента роуты вызываются типобезопасно: `apiChatsListRoute.run(ctx)`, `apiChatGetRoute({ feedId }).run(ctx)`, либо прямым `fetch('/tg/api/<file>~<subroute>')` (где `~` — разделитель подпути).

## Потоки данных

### Отправка сообщения
```
ChatView.sendMessage → apiMessagesSendRoute.run(ctx, {text, replyTo?})
  → createFeedMessage(ctx, feedId, ctx.user, {...})
  → broadcastMessageEvent → для каждого участника sendDataToSocket('user-<id>', {type:'chat-event', event:'new-message', feedId, message})
  → apiPushSendFCMRoute (FCM push получателям)
  → processMessageWithAgents (если группа — fire-and-forget)
Клиенты получают событие в персональном канале user-<id> и в канале chat-<feedId>.
```

### Real-time приём
```
App.vue: subscribeToData(userSocketId) + subscribeToData('<userId>/inbox')
ChatView.vue: useChatSocket(userSocketId) + subscribeToData('chat-<feedId>')
```

### Платёж за подписку
```
apiChatSubscriptionCreateRoute → Subscriptions.create(status:'pending')
  → runAttemptPayment(ctx, {subject, amount, successCallbackRoute, cancelCallbackRoute})
  → возвращает paymentLink (клиент открывает)
  → @pay/sdk вызывает subscriptionPaymentSuccessRoute (app.function, validateCaller)
     → status:'active', добавление участника во все чаты тарифа, уведомление владельцам
```

## Изоляция от других приложений

Все фиды создаются с `data: { appId: 'tg' }` и `inboxUrl: '/tg/chat~<inboxSubjectId>'`. `api/inbox-badges` фильтрует inbox только по чатам этого приложения (по `inboxSubjectId`), чтобы счётчики непрочитанного не «засорялись» фидами других приложений того же аккаунта.

## Каталоги проекта

| Каталог | Содержимое |
| --- | --- |
| `api/` | ~40 файлов серверных роутов |
| `tables/` | 19 Heap-таблиц (`*.table.ts`) |
| `shared/` | чистые/общие модули (`mentions`, `permissions`, `subscription-periods`) — импортируемы в Vue |
| `lib/` | серверные утилиты (`jwt-rs256`) |
| `tools/` | тулы AI-агентов |
| `composables/` | Vue-composables (9 шт.) |
| `components/` | ~57 Vue-компонентов |
| `pages/` | `LandingPage.vue` |
| `fed-docs/` | спека федерации (не реализована) |
| `docs/` | эта документация + `spec/` |
