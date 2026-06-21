# 04. API — ядро сообщений

## Соглашения для всех API-файлов (04–09, обязательно)

Приоритет — правила из [01-platform.md](01-platform.md). Контракты ниже описывают **что** делает роут; **как** его оформить:

- **Один файл = один роут.** Каждый роут ниже — отдельный файл в `/api/<module>/`, путь `app.get('/')` / `app.post('/')`, экспорт `const ...Route`. Имена экспортов сохранить (на них завязан клиент). Группировка «много роутов в одном `*.ts`» из sample не воспроизводится.
- **Клиентские роуты — `// @shared-route`** первой строкой файла.
- **Авторизация — первой строкой** обработчика (`requireRealUser(ctx)` / `requireAccountRole(ctx, 'Admin')`). Роуты, где в sample проверка отсутствует или мягкая (`read-mentions`, `reactions`, `check-access`), — усилить до `requireRealUser`/`requireAnyUser`.
- **Ошибки — классы `@app/errors`**: «не найдено» → `new NotFoundError('Чат', feedId)`; «нет доступа»/«забанен»/«только автор» → `new AccessDeniedError(msg)`; неверный вход → `new ValidationError(reason, issues)`. Не `throw new Error(...)`.
- **Логирование — `ctx.account.log(...)`** в каждой значимой ветке (отправка, отказ доступа, удаление, ошибка интеграции). `console.log` запрещён.
- **Race conditions — `runWithExclusiveLock`** (ключ по сущности) для `findOneBy`→`create` и read-modify-write: join/accept/add участника, pinned/set, invites/create, reactions/toggle, подписки. Все операции БД — внутри колбэка.
- **Ссылки/URL** (`inviteLink`, `inboxUrl`) — через `withProjectRoot`/`withProjectRootAndSubroute`, не хардкод `/tg/...`. Серверные редиректы — относительные `./`, `../`.
- **Heap** — `countBy`/`where`/`order [{f:'asc'}]`/методы `Money`; не передавать `id/createdAt/updatedAt` в `create`.
- **Вход** — через `.body((s)=>({...}))` / `.query(...)`; роуты sample, читающие body без схемы (`set-paid`, `read-mentions/mark`), — привести к `.body()`.

Каждый роут: метод+путь, авторизация, вход, выход, логика, WS, ошибки.

Общий паттерн проверки доступа к чату: `chat = Chats.findOneBy(ctx, {feedId})` (нет → `throw new NotFoundError('Чат', feedId)`) → `participants = findFeedParticipants(ctx, feedId)` → `isParticipant = participants.some(p => p.userId === ctx.user.id)` → доступ если `isParticipant || chat.owner.id===ctx.user.id [|| chat.isPublic]`, иначе `throw new AccessDeniedError('Нет доступа к этому чату')`. Бан — `isUserBanned(ctx, feedId, userId)` (из `api/moderation/*`).

---

## api/chats.ts

Вспомогательные (объявить в файле):
- `enrichParticipantsWithUserData(ctx, participants)` — догружает `user` каждому: `findUsersByIds` + `findIdentities` (limit 1000) → `{ id, displayName, firstName, lastName, username, avatar: imageUrl, email, phone }`; нет userIds → `user: null`.
- `generateId()` → два `Math.random().toString(36).substring(2,15)` склеены.
- `getDirectChatDisplayTitle(participants, currentUserId)` — имя собеседника: `displayName || 'firstName lastName' || username || 'Пользователь'`.
- `enrichLastMessagesWithAuthors(ctx, messages)` — добавляет `author {id,displayName,firstName,lastName}` по `createdBy`.

### `apiChatsListRoute` — `GET /list`
- Авторизация: `requireRealUser`.
- Логика: `Chats.findAll({ order:[{updatedAt:'desc'}], limit:1000 })`. Для каждого: `isUserBanned`→`bannedChatIds`. Подписки пользователя: active/pending (`Subscriptions where status:['active','pending']`) + expired/cancelled (limit 100) → через `PlanChats.findAll({where:{planId}})` собрать `subscriptionChatIds` + `chatSubscriptionMap`. Для каждого чата `findFeedParticipants` → `isParticipant`, `myRole`, `participantsCount`. **Side-effect:** если feed «не найден» (ошибка содержит not found/не найден/null) — каскадно удалить `ChatAgents`, `ChatInvites`, запись `Chats`. Оставить доступные (участник ИЛИ публичный ИЛИ по подписке, И не забанен). Для `type==='direct'` — обогатить участниками + `displayTitle`. Для участников — последнее сообщение (`findFeedMessages` tail→head fallback, limit 1) + автор. Добавить `inboxSubjectId` (`getFeedById`).
- Выход: `{ chats: Array<chat & { isMember, myRole, participantsCount, isAccessibleBySubscription, subscriptionInfo|null, participants?, displayTitle?, lastMessage|null, inboxSubjectId }> }`.

### `apiChatsCreateRoute` — `POST /create` (`.body`)
- Авторизация: `requireRealUser`; `requireAccountRole('Admin')` если `isPublic`; то же если `isPaid`.
- Body: `title`, `type?`, `description?`, `isPublic?`, `avatarHash: string|null`, `isPaid?`, `plans?: Array<{name, priceAmount, priceCurrency, durationType, durationValue, allowAutoRenewal?, isActive?}>`, `withAgent?`, `agentId?`, `agentKey?`, `agentName?`, `agentRespondTo?`, `agentRespondToMention?`.
- Логика: `inboxSubjectId='chat-'+generateId()`; `createFeed({title, inboxSubjectId, inboxUrl:'/tg/chat~'+inboxSubjectId, data:{appId:'tg'}})`. `Chats.create({feedId:feed.id, title, type:type||'group', owner:user.id, isPublic, isPaid, description, avatarHash, inboxSubjectId})`. Если платный и `plans` — для каждого `SubscriptionPlans.create({chatId:feed.id, name, description:'', durationType, durationValue, calendarPeriod:'current', specificPeriodStart:null, price:new Money(priceAmount, priceCurrency||'RUB'), isActive, allowAutoRenewal, sortOrder:i+1})`. `createOrUpdateFeedParticipant(feed, user, {role:'owner', silent:true})`. `createSystemMessage(feed.id, 'chat_created', {})`. Если `withAgent && agentId && type==='group'` — `createOrUpdateBotUser('agent_<sanitized>', {firstName:agentName, lastName:''})`, `ChatAgents.create({chat:chat.id, agentId, agentKey, agentName, botUserId, respondTo, respondToMention, isActive:true})`, добавить бота участником `guest` silent.
- Выход: `{ success:true, chat, feedId:feed.id, agentAdded:boolean }`.

### `apiChatGetRoute` — `GET /:feedId`
- Авторизация: `requireRealUser`. Доступ: участник ИЛИ владелец ИЛИ `isPublic` ИЛИ workspace-admin (`is('Admin')||is('Owner')`) ИЛИ есть accepted-инвайт. Throw «Вы забанены...» если `isUserBanned`.
- Логика: `Chats.findOneBy({feedId})` (нет → `'Чат не найден'`). `findFeedParticipants` (каскадно удалить «мёртвую» запись при ошибке feed). `getFeedById`. Сформировать `chatProps` вручную. Обогатить участников. Для direct — `displayTitle` + `otherUser`.
- Выход: `{ chat:{...chat, displayTitle, inboxSubjectId, inboxUrl}, feed, participants, chatProps:{feedId,title,pinnedMessageId,lastMessageId,inboxSubjectId,inboxUrl}, isMember, otherUser }`.
- Ошибки: `'Чат не найден'`, `'Вы забанены в этом чате'`, `'Нет доступа к этому чату'`.

### `apiChatUpdateRoute` — `POST /:feedId/update` (`.body`)
- Авторизация: `requireRealUser`; `canManageChat(ctx, feedId, userId, chat.isPublic)` ИЛИ владелец. `requireAccountRole('Admin')` при `isPublic:false→true` и `isPaid:false→true`.
- Body: `title?`, `description?`, `isPublic?`, `avatarHash:string|null` (+ читается `isPaid`).
- Логика: обновить поля `Chats.update`. Если `title` — `updateFeed({id:feedId, title})` + `createSystemMessage('chat_renamed', {oldTitle, newTitle})`.
- Выход: `{ success:true, chat }`.

### `apiChatDeleteRoute` — `POST /:feedId/delete`
- Авторизация: `requireRealUser`; владелец ИЛИ workspace-admin.
- Логика: `deleteFeed` (not found игнорировать); удалить все `ChatAgents`, `ChatInvites`, затем `Chats.delete`.
- Выход: `{ success:true }`.

### `apiChatPublicInfoRoute` — `GET /:feedId/public`
- Авторизация: `requireRealUser`. Для `!isPaid` — обычная проверка доступа; для платных — без неё.
- Выход: `{ chat:{feedId, title, description, type, isPaid, isPublic, avatarHash, participantsCount} }`.

### `apiChatSetPaidRoute` — `POST /:feedId/set-paid`
- Авторизация: `requireRealUser` + `requireAccountRole('Admin')`.
- Body (без схемы): `{ isPaid: boolean }`.
- Логика: `Chats.update({id, isPaid})`. Выход `{ success:true, chat }`.

### `apiChatJoinRoute` — `POST /:feedId/join`
- Авторизация: `requireRealUser`. Throw если забанен / уже участник. Доступ: `isPublic` ИЛИ accepted-инвайт.
- Логика: `createOrUpdateFeedParticipant(feed, user, {role:'guest', silent:false})`; WS; `createSystemMessage('user_joined', {userName})`.
- Выход: `{ success:true, chat:{...chat, isMember:true} }`.
- WS: `chat-<feedId>` → `{type:'chat-event', event:'new-participant', feedId, user:{id,displayName,firstName,lastName,avatar}}`.

### `apiChatCheckJoinRoute` — `GET /:feedId/can-join`
- Авторизация: `requireRealUser`. Не бросает.
- Выход: `{canJoin:false, reason}` | `{canJoin:true, isPublic:true}` | `{canJoin:true, isPublic:false, hasInvite:true}`.

---

## api/messages.ts

Вспомогательные:
- `normalizeAuthorId(createdBy)` — string|{id}|→String.
- `normalizeReactions(message)` — `message.reactions||data.reactions||{}`; парсит, если строка.
- `normalizeData(data)` — парсит JSON-строку, иначе объект/`{}`.
- `enrichMessagesWithAuthorData(ctx, messages)` — `type` (`'System'` если `data.isSystemMessage`/`systemType`, иначе `m.type||'Message'`), нормализованные `reactions`/`data`, `author:{id,displayName,firstName,lastName,username,avatar,email,phone}|null`.
- `broadcastMessageEvent(ctx, feedId, eventType, message)` — `findFeedParticipants`, каждому `sendDataToSocket('user-'+userId, {type:'chat-event', event:eventType, feedId, message})`.
- `processMessageWithAgents(...)` — см. [07-api-agents.md](07-api-agents.md).

### `apiMessagesListRoute` — `GET /:feedId/list` (`.query`)
- Авторизация: `requireRealUser`. Доступ участник/владелец/публичный. Для `isPaid && !isOwnerOrAdmin` — требовать активную подписку (через `PlanChats`→`Subscriptions` active/pending с проверкой start/end; fallback legacy `Subscriptions{chatId,status:'active'}`), иначе throw `'Требуется подписка для доступа к сообщениям'`.
- Query: `limit?` (default 50), `beforeId?`.
- Логика: `getFeedById`. Не участник но публичный → `{messages:[], hasMore:false}`. `findFeedMessages(mode: beforeId?'head':'tail', limit: min(limit,100), beforeId)` с fallback head→around (`aroundId: feed.lastMessageId||'none'`). Порядок: при beforeId как есть, иначе reverse. Обогатить авторами.
- Выход: `{ messages, hasMore: messages.length===limit }`.

### `apiMessagesSendRoute` — `POST /:feedId/send` (`.body`)
- Авторизация: `requireRealUser`. Доступ участник/владелец. Платный без owner/admin — проверка подписки, иначе throw `'Требуется подписка для отправки сообщений'`. `channel` — публикуют только owner/admin/workspace-admin. `direct` — проверка взаимных блокировок (`BlockedUsers`): `'Вы заблокировали этого пользователя'` / `'Пользователь заблокировал вас'`. Проверка модерации (`Moderations` isActive): истёкшую деактивировать; иначе throw с текстом mute/ban + причина + срок.
- Body: `text`, `replyTo?`, `forwardedFrom?: {feedId, title, type, avatarHash?, isPublic?, isPaid?, authorName?, authorId?}`.
- Логика: `createFeedMessage(feedId, user, {text, type:'Message', reply_to: replyTo||null, data:{forwardedFrom?}})`. Обогатить. `broadcastMessageEvent('new-message')`. Push: `apiPushSendFCMRoute.run(ctx, {userIds: recipients, title: chat.title||'Чат', body:'<sender>: <preview≤100>', data:{chatId, messageId, type:'new-message'}, icon, badge})` (ошибки не фатальны). Если `group` — `processMessageWithAgents` (fire-and-forget).
- Выход: `{ success:true, message }`.
- WS: `broadcastMessageEvent` → `user-<id>` `new-message`.

### `apiMessagesEditRoute` — `POST /:feedId/edit` (`.body`)
- Авторизация: `requireRealUser`; участник/владелец; **только автор** (нормализация id, снять префикс `user:`), иначе `'Вы можете редактировать только свои сообщения'`.
- Body: `messageId`, `text`.
- Логика: `findFeedMessageById` (нет → throw); `updateFeedMessage(feedId, messageId, {text})`; обогатить; `broadcastMessageEvent('edit-message')`.
- Выход: `{ success:true, message }`.

### `apiMessagesAfterRoute` — `GET /:feedId/after` (`.query`)
- Авторизация: участник/владелец/публичный. Query: `afterId`, `limit?` (100).
- Логика: `findFeedMessages(mode:'head', limit:min(limit,100), afterId)`; не участник+публичный → пусто.
- Выход: `{ messages, hasMore: messages.length===limit }`.

### `apiMessagesAroundRoute` — `GET /:feedId/around` (`.query`)
- Query: `aroundId`, `limit?` (50). `findFeedMessages(mode:'around', limit, messageId:aroundId)`.
- Выход: `{ messages, hasMore: true }`.

### `apiMessagesDeleteRoute` — `POST /:feedId/delete` (`.body`)
- Авторизация: `requireRealUser`. Автор (нормализация, снять `user:`/`u:`) → удалить сразу. Иначе участник/владелец И (owner|admin|chat.owner), иначе `'Вы можете удалять только свои сообщения'`.
- Body: `messageId`.
- Логика: `deleteFeedMessage`; `broadcastMessageEvent('delete-message', {id:messageId})`.
- Выход: `{ success:true }`.

---

## api/participants.ts

`enrichParticipantsWithUserData` — как в chats.ts.

### `apiParticipantsListRoute` — `GET /:feedId/list`
- Авторизация: участник/владелец/публичный. Для `channel` не-owner/admin видят только owner+admin + `totalCount`.
- Выход: `{ participants }` или `{ participants:[onlyOwnerAdmin], totalCount, isChannel:true }`.

### `apiParticipantsAddRoute` — `POST /:feedId/add` (`.body`)
- Авторизация: `direct`→запрет; `canManageChat`; для role `admin|owner` — `isChatOwner`.
- Body: `userId`, `role?` (default `guest`).
- Логика: `createOrUpdateFeedParticipant(feedId, userId, {role, silent:false})`; `findUserById`; WS new-participant; `createSystemMessage('user_joined', {userName})`.
- Выход: `{ success:true, participant }`. WS: `chat-<feedId>` new-participant.

### `apiParticipantsRemoveRoute` — `POST /:feedId/remove` (`.body`)
- Авторизация: self-removal всем; иначе `canManageChat`. Нельзя удалить владельца (если не self). Нет участника → throw.
- Body: `userId`.
- Логика: `deleteFeedParticipant(feedId, targetParticipant)`; `createSystemMessage('user_removed', {userName})`.
- Выход: `{ success:true }`.

### `apiParticipantsUpdateRoleRoute` — `POST /:feedId/update-role` (`.body`)
- Авторизация: `direct`→запрет; **только владелец** (`isChatOwner`); нельзя себе; role ∈ `['admin','guest']`; нельзя менять роль владельца.
- Body: `userId`, `role`.
- Логика: `createOrUpdateFeedParticipant(feedId, userId, {role})`.
- Выход: `{ success:true, participant }`.

---

## api/invites.ts

Вспомогательные: `generateToken()`; `generateInviteLink(ctx, token)` → origin (customDomain>domain>headers) + `/tg/invite~<token>`; `findUserByIdentity(ctx, type, value)` (`username`/`email`/`phone` с нормализацией + fallback).

### `apiInvitesCreateRoute` — `POST /create` (`.body`)
- Авторизация: **только владелец** (`chat.owner.id===user.id`).
- Body: `chatId`(=feedId), `invitedUserId?`, `inviteType?`, `inviteValue?`, `isLinkInvite?`.
- Логика (ветки):
  - **isLinkInvite**: вернуть активную pending-ссылку; истёкшую → `expired`; иначе `ChatInvites.create({chat, invitedBy, invitedUser:null, status:'pending', token, inviteType:'link', inviteValue:null, isLinkInvite:true, expiresAt:+7д})`. → `{success:true, invite, inviteLink}`.
  - **inviteType+inviteValue**: `findUserByIdentity`; нет → `{success:false, error:'Пользователь не найден'}`; сам себя → error; существующий pending → вернуть; иначе create + WS. → `{success:true, invite, user:{id,displayName,avatar}}`.
  - **invitedUserId**: аналогично по id.
  - иначе `{success:false, error:'Не указаны данные для приглашения'}`.
- WS: `user-<targetId>` → `{type:'invite-event', event:'new-invite', invite:{id, chat:{id,title,description}, invitedBy:{id,displayName,avatar}, createdAt}}`.

### `apiInvitesGetLinkRoute` — `POST /get-link` (`.body`)
- Авторизация: только владелец. Body: `chatId`, `regenerate?`.
- Логика: вернуть активную ссылку (если не regenerate и не истекла) `{success:true, inviteLink, expiresAt, isNew:false}`; истёкшую → `expired`; при regenerate отозвать; создать новую (+7д). → `{success:true, inviteLink, expiresAt, isNew:true}`.

### `apiInvitesByTokenRoute` — `GET /by-token/:token`
- Авторизация: **нет** `requireRealUser` (публичный).
- Логика: `ChatInvites.findOneBy({token, status:'pending'})`; нет → `{success:false, error}`; истёк → `expired` + error; загрузить chat, invitedBy, participants, `isAlreadyMember`.
- Выход: `{success:true, invite:{id,token,isLinkInvite,expiresAt}, chat:{id,feedId,title,description,type}, invitedBy:{id,displayName,avatar,gender}|null, participantsCount, isAlreadyMember}`.

### `apiInvitesAcceptRoute` — `POST /accept` (`.body`)
- Авторизация: `requireRealUser`. По `token` (pending) или `inviteId`. Throw: не найден / уже обработан / истёк / `'Это не ваше приглашение'`.
- Body: `inviteId?`, `token?`. Query: `back?` (→ redirect).
- Логика: `createOrUpdateFeedParticipant(chat.feedId, user.id, {role:'guest', silent:false})`; `ChatInvites.update({status:'accepted', invitedUser:user.id})`; WS new-participant; `createSystemMessage('user_joined')`; WS invite-accepted.
- Выход: `{success:true, chatId:chat.id, feedId:chat.feedId}` (или redirect).
- WS: `chat-<feedId>` new-participant; `user-<id>` `{type:'invite-event', event:'invite-accepted', chat:{id,feedId,title,description}}`.

### `apiInvitesDeclineRoute` — `POST /decline` (`.body`)
- Body: `inviteId?`, `token?`. `ChatInvites.update({status:'declined'})`; WS `invite-declined {chatId}`. Выход `{success:true}`.

### `apiInvitesMyRoute` — `GET /my`
- `ChatInvites.findAll({invitedUser:user.id, status:'pending'}, order createdAt desc)` + обогащение. Выход `{invites:[{id, chat:{id,title,description}, invitedBy:{id,displayName,avatar}|null, createdAt}]}`.

### `apiInvitesRevokeRoute` — `POST /revoke` (`.body`)
- Авторизация: только владелец. Body: `inviteId`. `ChatInvites.update({status:'revoked'})`; если адресный — WS `invite-revoked {inviteId, chatId}`. Выход `{success:true}`.

---

## api/reactions.ts (`// @shared`, lazy-import `@app/feed`/`@app/socket`)

`MessageReactions = Record<emoji, {user_id:string, created_at:ISO}[]>`. Вспомогательные: `broadcastReactionEvent`, `normalizeReactions`, `getUserDisplayName`, `getUserContact` (`confirmedEmail||confirmedPhone||username`).

### `apiReactionsToggleRoute` — `POST /:feedId/toggle` (`.body`)
- Авторизация: участник/владелец. Body: `messageId`, `emoji`.
- Логика: `findFeedMessageById`; нормализовать; **удалить все прочие реакции пользователя** (один пользователь = одна реакция); тогглить текущую (add с timestamp / remove); `updateFeedMessage(feedId, messageId, {data:{...,reactions}, reactions})`; перечитать; broadcast.
- Выход: `{success:true, message:{...,reactions:finalReactions, data:{...,reactions}}, action:'added'|'removed'}`.
- WS: всем `user-<id>` → `{type:'chat-event', event:'reaction-toggle', feedId, messageId, emoji, userId, reactions, action}`.

### `apiReactionsGetRoute` — `GET /:feedId/:messageId` → `{reactions}`.
### `apiReactionsDetailsRoute` — `GET /:feedId/:messageId/details`
- Развернуть реакции в плоский список, sort `created_at` desc, взять **15**, догрузить пользователей. Выход `{reactions:[{emoji,userId,userName,userContact,createdAt}], totalCount}`.

---

## api/typing.ts

`broadcastTypingEvent(ctx, feedId, userId, userName, isTyping)` — всем участникам **кроме отправителя** на `user-<id>` → `{type:'chat-event', event: isTyping?'typing-start':'typing-stop', feedId, userId, userName}`.

### `apiTypingStartRoute` — `POST /:feedId/start` → `{success:true}` + WS `typing-start`.
### `apiTypingStopRoute` — `POST /:feedId/stop` → `{success:true}` + WS `typing-stop`.

---

## api/pinned.ts

`broadcastPinnedEvent(ctx, feedId, eventType, data)` — шлёт и на `chat-<feedId>`, и на каждый `user-<id>` → `{type:'chat-event', event, feedId, ...data}`. Таблица `PinnedMessages` (одна запись на чат, `chatId=feedId`).

### `apiPinnedSetRoute` — `POST /:feedId/set` (`.body`)
- Авторизация: `canManageChat`. Body: `messageId`.
- Логика: `findFeedMessageById`; удалить существующие записи; `PinnedMessages.create({chatId:feedId, messageId, pinnedBy, pinnedAt:now})`; broadcast `message-pinned`; `createSystemMessage('message_pinned')`.
- Выход: `{success:true, message}`.

### `apiPinnedRemoveRoute` — `POST /:feedId/remove`
- Авторизация: `canManageChat`. Удалить запись; broadcast `message-unpinned {messageId}`; `createSystemMessage('message_unpinned')`. Выход `{success:true}`.

### `apiPinnedGetRoute` — `GET /:feedId` → `{pinnedMessage|null}` (участник/владелец/публичный).

---

## api/read-receipts.ts

`broadcastReadEvent(ctx, feedId, data)` — всем `user-<id>` → `{type:'chat-event', event:'message-read', feedId, ...data}`. (Персистентного хранилища read-указателя нет — обновление `participant.read_message_id` в памяти + WS.)

### `apiReadReceiptsMarkRoute` — `POST /:feedId/mark` (`.body`)
- Body: `messageId`. Ставит `read_message_id/read_at` (in-memory); broadcast `message-read {userId, messageId, readAt}`. Выход `{success:true}`.
### `apiReadReceiptsGetRoute` — `GET /:feedId/:messageId` → `{readBy:[{userId,readAt,user|null}], totalParticipants}`.
### `apiReadReceiptsStatsRoute` — `GET /:feedId/stats` → `{stats:[{userId,lastReadMessageId,lastReadAt}], totalParticipants}`.

---

## api/read-mentions.ts (усилить: `requireRealUser` первой строкой — в sample проверка мягкая)

### `apiReadMentionsGetRoute` — `GET /:feedId`
- Нет userId → `{mentions:[]}`. `ReadMentions.findAll({userId,feedId}, limit 1000)`. Выход `{mentions:[{messageId,readAt}]}`.
### `apiReadMentionsMarkRoute` — `POST /:feedId/mark` (без `.body`-схемы)
- Валидация `userId && Array.isArray(messageIds) && length>0`, иначе `{success:false, error:'Invalid request'}`. Body: `messageIds: string[]`. Upsert каждого в `ReadMentions`. Выход `{success:true, results:[{messageId, status:'updated'|'created'}]}`.

---

## api/search.ts

Вспомогательные: `getUserChatIds(ctx)` (чаты с флагами `isMember, requiresSubscription, isOwnerOrAdmin`), `enrichMessagesWithAuthors`.

### `apiSearchRoute` — `POST /search` (`.body`)
- Body: `query`, `type?` (`all`/`chats`/`messages`, default `all`). <2 символов → пусто.
- Логика: чаты по title/description includes (slice 20); сообщения — по каждому чату `findFeedMessages(tail, 100)`, фильтр по тексту, авторы, sort createdAt desc, slice 50.
- Выход: `{chats:[{id,feedId,title,description,type,updatedAt,isPublic,isMember,isPaid,requiresSubscription}], messages:[{id,text,createdAt,author,chatId,chatTitle,chatFeedId}], totalCount}`.

### `apiQuickSearchChatsRoute` — `POST /quick-search` (`.body`)
- Body: `query`. Выход `{chats:[{id,feedId,title,type,isPaid,requiresSubscription}]}` (slice 10).

## api/chat-search.ts

### `apiChatSearchRoute` — `POST /:feedId/search` (`.body`)
- Body: `query` (<2 → `{messages:[]}`).
- Логика: пагинированно загрузить до 1000 сообщений (`findFeedMessages` head, 100, beforeId-курсор, дедуп по id); фильтр по тексту; авторы; sort desc; slice 50.
- Выход: `{messages:[{id,text,createdAt,author:{id,displayName,firstName,lastName}|null}]}`.

---

## api/system-messages.ts

### `createSystemMessage(ctx, feedId, type, data)` — **экспорт-функция** (используется многими роутами)
- `type ∈ 'user_joined'|'user_left'|'user_removed'|'chat_created'|'chat_renamed'|'message_pinned'|'message_unpinned'`.
- Сформировать текст по шаблонам (эмодзи + `data.userName`/`oldTitle`/`newTitle`). `createFeedMessage(feedId, ctx.user, {text, data:{systemType:type, isSystemMessage:true, ...data}})`. При ошибке → `return null`. WS на `chat-<feedId>` → `{type:'chat-event', event:'new-message', feedId, message:{...message, type:'System', data:{...,isSystemMessage:true, systemType}}}`. Возврат `message`.

### `apiSystemMessageCreateRoute` — `POST /:feedId/create` (`.body`)
- Авторизация: **только владелец**. Body: `type`, `data?`. Вызывает `createSystemMessage`. Выход `{success:true, message}`.

---

## api/files.ts

`FileUpload = {hash?, uid?, name, size, mimeType, isVoiceMessage?, isVideoNote?, duration?}`.

### `apiFilesUploadRoute` — `POST /:feedId/upload` (`.body`)
- Авторизация: участник/владелец. Body: `files: FileUpload[]`, `text?`, `replyTo?`, `forwardedFrom?`.
- Логика: мапить файлы в формат Feed (`uid: file.uid||file.hash`, `previewUrl=getThumbnailUrl(uid,400,400)` для image/*, метаданные voice/video/duration); `createFeedMessage(feedId, user, {text:text||'', type:'Message', files:messageFiles, reply_to:replyTo||null, data:{forwardedFrom?}})`; WS всем участникам.
- Выход: `{success:true, message}`. WS: `user-<id>` `new-message` (с `files`, `data`).

### `apiFilesGetUploadUrlRoute` — `GET /upload-url` → `{uploadUrl: obtainStorageFilePutUrl(ctx)}`.
### `apiFilesGetRoute` — `GET /:hash` → `{url: getThumbnailUrl(hash), thumbnailUrl: getThumbnailUrl(hash,400,400)}`.
