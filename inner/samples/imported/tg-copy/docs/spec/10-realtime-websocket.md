# 10. Real-time (WebSocket) — полный протокол

## Каналы

| Канал | Кто слушает | Что приходит |
| --- | --- | --- |
| `user-<userId>` | App.vue, ChatView.vue | большинство `chat-event`, `invite-event`, `subscription-event` |
| `chat-<feedId>` | ChatView.vue | `new-participant`(join), `participant-left`, `message-pinned/unpinned`, системные `new-message`, `transcription-*` |
| `<userId>/inbox` | App.vue | сигнал → `loadInboxBadges()` |

Сервер: `genSocketId(ctx, 'user-'+ctx.user.id)` в `index.tsx` → пробрасывается в `App` как `userSocketId`; `sendDataToSocket(ctx, channel, payload)`. Клиент: `getOrCreateBrowserSocketClient().subscribeToData(channel).listen(data => ...)`.

Большинство `chat-event` рассылаются перебором `findFeedParticipants` в персональные `user-<id>` (см. `broadcastMessageEvent`). Некоторые события (join, participant-left, pinned, системные, транскрипция) шлются на `chat-<feedId>`.

## Формат событий

### `type: 'chat-event'`
`{ type:'chat-event', event, feedId, ...payload }`

| event | payload | где формируется |
| --- | --- | --- |
| `new-message` | `message` | messages/send, files/upload, system-messages, тулы агентов |
| `edit-message` | `message` | messages/edit |
| `delete-message` | `message:{id}` | messages/delete |
| `new-participant` | `user:{id,displayName,firstName,lastName,avatar}` | chats/join, invites/accept, participants/add |
| `participant-left` | `userId, userName` | chat-actions/leave, unsubscribe |
| `reaction-toggle` | `messageId, emoji, userId, reactions, action('added'/'removed')` | reactions/toggle |
| `typing-start` | `userId, userName` | typing/start (всем кроме отправителя) |
| `typing-stop` | `userId, userName` | typing/stop |
| `message-pinned` | `messageId, message` | pinned/set |
| `message-unpinned` | `messageId` | pinned/remove |
| `message-read` | `userId, messageId, readAt` | read-receipts/mark |

### `type: 'invite-event'`
`{ type:'invite-event', event, ... }` (канал `user-<id>`):

| event | payload |
| --- | --- |
| `new-invite` | `invite:{id, chat:{id,title,description}, invitedBy:{id,displayName,avatar}, createdAt}` |
| `invite-accepted` | `chat:{id,feedId,title,description}` |
| `invite-declined` | `chatId` |
| `invite-revoked` | `inviteId, chatId` |

### `type: 'subscription-event'`
`{ type:'subscription-event', event, ... }` (канал `user-<id>`): `granted-by-admin` (`subscription:{...}`), `extended` (`subscriptionId, newEndDate`), `renewed`, `renewal-failed`, `expiring-soon` (`endDate, chatCount`), `expired`.

### Транскрипция (канал `chat-<feedId>`)
`{ type:'transcription-completed', messageId, fileHash, transcription, feedId, timestamp }` / `{ type:'transcription-error', messageId, fileHash, error }`.

### `type: 'inbox-update'` → App.vue вызывает `loadInboxBadges()`.

## Подписки на клиенте

**App.vue** (`setupSocketSubscription`): `subscribeToData(userSocketId)` (invite/chat-события: `new-message`→`updateChatLastMessage`+бейджи; `new-participant`→`loadChats`; invite-события) + `subscribeToData('<userId>/inbox')` (→ `loadInboxBadges`). Fallback-polling чатов 30 c.

**ChatView.vue**: `useChatSocket(userSocketId)` (реконнект+heartbeat) + `subscribeToData('chat-<feedId>')`. Оба канала обрабатывают `type==='chat-event' && feedId===props.feedId` через `switch(event)`. Плюс `transcription-completed` (вписать `voiceTranscription`). При реконнекте (`watch(isConnected)`) → `forceSync()`. Fallback-polling 10 c при отсутствии WS.

## Нормализация на клиенте

Поля сообщений приходят частично snake_case. `normalizeMessageFields(message)`: `createdBy = m.createdBy||m.created_by`, `createdAt = m.createdAt||m.created_at`, `replyTo = m.replyTo||m.reply_to`; `reactions`/`data` парсятся, если пришли строкой. Применять при приёме любого сообщения через WS и из API.
