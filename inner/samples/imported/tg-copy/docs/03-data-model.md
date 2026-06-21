# 03. Модель данных

Точные типы полей и синтаксис объявления — в [spec/02-data-model.md](spec/02-data-model.md). Здесь — обзорная карта.

## Сущности Feed API (`@app/feed`)

Не Heap-таблицы, а встроенные сущности платформы.

- **Feed** — чат. Поля: `id`(uid), `title`, `pinnedMessageId`, `lastMessageId`, `inboxSubjectId`, `inboxUrl`, `data`, `hooks`. Создаётся с `data: { appId: 'tg' }`.
- **Participant** — связь пользователь↔фид: `userId`, `role` (`owner`/`admin`/`guest`), `muted`, `read_at`, `read_message_id`, `data`.
- **Message** — сообщение: `id`, `type` (`Message`/`System`/`Change`/`Blocks`), `text`, `files[]`, `reactions` (`Record<emoji, {user_id, created_at}[]>`), `reply_to`, `data`, `createdBy`, `createdAt`. Реакции и системные флаги хранятся в `message.data`.

## Heap-таблицы (19)

Все поля обёрнуты в `Heap.Optional(...)`. Системные поля `id`/`createdAt`/`updatedAt` добавляются платформой.

| Таблица | Назначение | Ключевые поля |
| --- | --- | --- |
| `chats` | справочник чатов | `feedId`, `title`(search+embeddings), `type`, `owner`(userRef), `isPublic`, `isPaid`, `description`, `avatarHash`, `pinnedMessageId`, `inboxSubjectId` |
| `chat-invites` | приглашения | `chat`(ref→chats), `invitedBy`/`invitedUser`(userRef), `status`, `token`, `inviteType`, `inviteValue`, `isLinkInvite`, `expiresAt` |
| `blocked-users` | чёрный список | `userId`, `blockedUserId`, `reason` |
| `pinned-messages` | закреп. сообщения | `chatId`, `messageId`, `pinnedBy`(userRef), `pinnedAt` |
| `chat-agents` | агенты в чатах | `chat`(ref→chats), `agentId`, `agentKey`, `agentName`, `botUserId`, `respondTo`, `respondToMention`, `isActive`, `canScheduleInChat`, `chainKey` |
| `chat-folders` | папки | `name`, `userId`, `sortOrder`, `icon`, `color` |
| `chat-folder-items` | чат в папке | `folderId`, `feedId`, `userId`, `addedAt` |
| `user-pinned-chats` | закреп. чаты | `userId`, `feedId`, `sortOrder` |
| `user-chat-filter-orders` | порядок фильтров | `userId`, `filterId`, `filterType`, `position` |
| `read-mentions` | прочит. упоминания | `userId`, `feedId`, `messageId`, `readAt` |
| `chat-subscription-plans` | тарифы | `chatId`, `name`, `durationType`, `durationValue`, `calendarPeriod`, `specificPeriodStart`, `price`(Money), `isActive`, `allowAutoRenewal`, `sortOrder` |
| `chat-subscriptions` | подписки | `userId`(userRef), `chatId`, `planId`(ref→plans), `status`, `startDate`, `endDate`, `autoRenewal`, `renewalPlanId`(ref), `lastPaymentId`, `nextBillingDate`, `cancelledAt`, `cancelReason`, `selectedPeriodStart/End` |
| `chat-plan-chats` | тариф↔чат (M:N) | `planId`(ref→plans), `feedId`, `sortOrder` |
| `chat-moderations` | мьют/бан | `chatId`, `userId`(userRef), `moderatedBy`(userRef), `type`, `reason`, `duration`, `expiresAt`, `isPermanent`, `isActive` |
| `user-privacy-settings` | приватность ЛС | `user`(userRef), `allowDirectMessages`, `allowedUsers`(json), `blockedUsers`(json) |
| `push-subscriptions` | FCM-токены | `endpoint`, `subscriptionData`(json: `{fcmToken, deviceInfo}`), `userId`(userRef) |
| `voice-transcriptions` | транскрипции | `fileHash`, `messageId`, `feedId`, `transcription`, `language`, `status`, `errorMessage`, `requestedBy`(userRef) |
| `app-settings` | KV-настройки | `key`, `value`, `category`, `description` |
| `client-logs` | клиентские логи | `userId`, `type`, `message`, `details`, `userAgent`, `url` |

## Связи

```
chats (feedId) ──┬─ chat-agents.chat (RefLink)
                 ├─ chat-invites.chat (RefLink)
                 └─ chat-plan-chats.feedId / chat-subscriptions.chatId (по feedId)

chat-subscription-plans ──┬─ chat-plan-chats.planId (RefLink)  ── feedId чатов тарифа
                          └─ chat-subscriptions.planId / .renewalPlanId (RefLink)

chat-folders ── chat-folder-items.folderId
```

> **Важно для воссоздания:** `RefLink` ссылается на **физический id** целевой таблицы (`t_projekt_chat_chats_K7w` и т.п.). Суффиксы случайны и генерируются заново — порядок создания таблиц важен (сначала `chats` и `chat-subscription-plans`, потом ссылающиеся).
