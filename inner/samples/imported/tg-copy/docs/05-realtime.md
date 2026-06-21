# 05. Real-time (WebSocket)

Полный протокол с payload — в [spec/10-realtime-websocket.md](spec/10-realtime-websocket.md).

## Каналы

Используется `@app/socket`. Три типа каналов:

| Канал | Назначение |
| --- | --- |
| `user-<userId>` | персональные события пользователя (большинство `chat-event`, `invite-event`, `subscription-event`) |
| `chat-<feedId>` | broadcast по подписке чата (join, participant-left, pinned, системные, транскрипция) |
| `<userId>/inbox` | сигнал обновления inbox-бейджей |

Сервер шлёт `sendDataToSocket(ctx, channel, payload)`. Большинство `chat-event` рассылаются перебором `findFeedParticipants` в персональные `user-<id>`.

Клиент: `genSocketId` на сервере (`index.tsx`) → `subscribeToData(socketId)` в браузере. `App.vue` слушает `user-<id>` и `<userId>/inbox`; `ChatView.vue` дополнительно слушает `chat-<feedId>` и использует composable `useChatSocket` (реконнект + heartbeat).

## События

### `type: 'chat-event'`
`{ type:'chat-event', event, feedId, ... }`:

| event | payload | источник |
| --- | --- | --- |
| `new-message` | `message` | messages/send, files/upload, system-messages, tools агентов |
| `edit-message` | `message` | messages/edit |
| `delete-message` | `message:{id}` | messages/delete |
| `new-participant` | `user:{id,displayName,firstName,lastName,avatar}` | join, invites/accept, participants/add |
| `participant-left` | `userId, userName` | chat-actions/leave, unsubscribe |
| `reaction-toggle` | `messageId, emoji, userId, reactions, action` | reactions/toggle |
| `typing-start` / `typing-stop` | `userId, userName` | typing/* |
| `message-pinned` / `message-unpinned` | `messageId, message?` | pinned/* |
| `message-read` | `userId, messageId, readAt` | read-receipts/mark |

### `type: 'invite-event'`
`{ type:'invite-event', event, ... }`: `new-invite` (invite), `invite-accepted`, `invite-declined`, `invite-revoked`.

### `type: 'subscription-event'`
`{ type:'subscription-event', event, ... }` (канал `user-<id>`): `granted-by-admin`, `extended`, `renewed`, `renewal-failed`, `expiring-soon`, `expired`.

### Транскрипция
`{ type:'transcription-completed' | 'transcription-error', messageId, fileHash, transcription?, feedId }` (канал `chat-<feedId>`).

## Нормализация на клиенте

Поля сообщений приходят из Feed API частично в `snake_case` (`created_by`, `reply_to`, `created_at`). Клиент нормализует их в `camelCase` (`normalizeMessageFields`) и парсит `reactions`/`data`, если они пришли строкой.
