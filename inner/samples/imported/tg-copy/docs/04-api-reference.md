# 04. Карта API

Полные контракты (вход/выход/логика/события/ошибки) — в `spec/04`…`spec/09`. Здесь — карта файлов и роутов. Базовый префикс: `/tg/api/`.

## Ядро сообщений

| Файл | Роуты |
| --- | --- |
| `chats.ts` | `GET /list`, `POST /create`, `GET /:feedId`, `POST /:feedId/update`, `POST /:feedId/delete`, `GET /:feedId/public`, `POST /:feedId/set-paid`, `POST /:feedId/join`, `GET /:feedId/can-join` |
| `messages.ts` | `GET /:feedId/list`, `POST /:feedId/send`, `POST /:feedId/edit`, `GET /:feedId/after`, `GET /:feedId/around`, `POST /:feedId/delete` |
| `participants.ts` | `GET /:feedId/list`, `POST /:feedId/add`, `POST /:feedId/remove`, `POST /:feedId/update-role` |
| `invites.ts` | `POST /create`, `POST /get-link`, `GET /by-token/:token`, `POST /accept`, `POST /decline`, `GET /my`, `POST /revoke` |
| `reactions.ts` | `POST /:feedId/toggle`, `GET /:feedId/:messageId`, `GET /:feedId/:messageId/details` |
| `typing.ts` | `POST /:feedId/start`, `POST /:feedId/stop` |
| `pinned.ts` | `POST /:feedId/set`, `POST /:feedId/remove`, `GET /:feedId` |
| `read-receipts.ts` | `POST /:feedId/mark`, `GET /:feedId/:messageId`, `GET /:feedId/stats` |
| `read-mentions.ts` | `GET /:feedId`, `POST /:feedId/mark` |
| `search.ts` | `POST /search`, `POST /quick-search` |
| `chat-search.ts` | `POST /:feedId/search` |
| `system-messages.ts` | `POST /:feedId/create` (+ экспорт `createSystemMessage`) |
| `files.ts` | `POST /:feedId/upload`, `GET /upload-url`, `GET /:hash` |

## Организация / навигация

| Файл | Роуты |
| --- | --- |
| `chat-folders.ts` | `GET /list`, `POST /create`, `POST /:id/update`, `POST /:id/delete`, `POST /reorder`, `POST /:id/add-chat`, `POST /:id/remove-chat`, `GET /:id/chats`, `GET /all-with-chats`, `GET /for-chat/:feedId` |
| `pinned-chats.ts` | `GET /list`, `POST /pin`, `POST /unpin`, `POST /reorder`, `POST /check` |
| `chat-filter-orders.ts` | `GET /`, `POST /update` |
| `inbox-badges.ts` | `GET /get`, `POST /reset` |

## Подписки / платежи

| Файл | Роуты |
| --- | --- |
| `chat-subscription-plans.ts` | `GET /plans`, `GET /plans/all`(admin), `GET /by-chat/:feedId/plans`, `POST /plans/create`(admin), `POST /plans/:id/update`(admin), `POST /plans/:id/delete`(admin), `POST /plans/reorder`(admin), `POST /plans/:id/add-chat`(admin), `POST /plans/:id/remove-chat`(admin), `GET /plans/:id/periods` |
| `chat-subscriptions.ts` | `GET /:feedId/subscription`, `GET /my`, `POST /subscribe`, `POST /:subscriptionId/extend`, `POST /:subscriptionId/cancel`, `POST /:feedId/check-access`, `GET /cards`, `GET /check-expiry`, `GET /accessible-chats` + pay-callbacks (`app.function`) + jobs (`app.job`) |
| `admin-subscriptions.ts` | `POST /grant`(admin), `GET /chat-plans/:feedId`(admin) |

## Агенты / личные чаты

| Файл | Роуты |
| --- | --- |
| `agents.ts` | `GET /list`, `GET /by-chat/:chatId`, `GET /by-feed/:feedId`, `POST /add`(admin), `POST /:agentId/update`(admin), `POST /remove`(admin) |
| `agents-migration.ts` | `POST /migrate`(admin) |
| `direct-chats.ts` | `POST /create`, `GET /:feedId`, `POST /can-message`, `POST /create-with-agent`(admin), `GET /my-agents` |

## Пользователи / профиль / модерация / приватность

| Файл | Роуты |
| --- | --- |
| `profile.ts` | `GET /`, `POST /update`, `POST /avatar` |
| `users.ts` | `POST /search`, `POST /find-by-identity`, `POST /get-by-ids` |
| `users-list.ts` | `GET /` (Staff+) |
| `blocked-users.ts` | `GET /list`, `POST /block`, `POST /unblock`, `POST /check` |
| `chat-actions.ts` | `POST /leave`, `POST /unsubscribe`, `POST /delete-direct` |
| `moderation.ts` | `POST /check`, `POST /set`, `POST /remove`, `GET /list`, job `/expire` (+ экспорт `isUserBanned`) |
| `privacy-settings.ts` | `GET /`, `POST /update`, `POST /can-message`, `POST /allow-user`, `POST /remove-allowed` (+ экспорт `canSendDirectMessage`) |
| `voice-transcriptions.ts` | `GET /:fileHash`, `POST /create`(admin) |
| `app-settings.ts` | `GET /list`(admin), `GET /get/:key`(admin), `POST /update`(admin), `POST /delete`(admin) (+ экспорт `getAppSetting`) |

## Push

| Файл | Роуты |
| --- | --- |
| `push/send-fcm.ts` | `POST /` (рассылка FCM) |
| `push/subscribe-fcm.ts` | `POST /` (сохранить токен) |
| `push/stats.ts` | `GET /` (admin) |
| `client-logs.ts`, `client-logs-simple.ts`, `client-logs-sw.ts` | приём клиентских/SW-логов |
