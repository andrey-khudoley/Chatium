# 07. API — AI-агенты и личные чаты

Импорты: `findAgents`, `pushMessageToChain` (`@ai-agents/sdk/process`); `createOrUpdateBotUser` (`@app/auth`); `createOrUpdateFeedParticipant, getFeedById, findFeedParticipants` (`@app/feed`). Тулы агента — в [03-shared-and-lib.md](03-shared-and-lib.md).

## Модель агента в чате

1. Системный агент аккаунта (из `findAgents(ctx)`) добавляется в чат.
2. Для него создаётся бот-пользователь `createOrUpdateBotUser(ctx, botUsername, {firstName, lastName})`; `botUser.id` → `ChatAgents.botUserId`.
3. Бот становится участником фида: `createOrUpdateFeedParticipant(ctx, feed, botUser, {role:'guest', silent:true})`.
4. Связь в `ChatAgents` с `chainKey = 'chat_<feedId>_agent_<agentId>'`.
5. При сообщении в группу — `processMessageWithAgents` решает, ответить ли, и шлёт в цепочку `pushMessageToChain`.

## api/agents.ts

### `apiAgentsListRoute` — `GET /list` (`requireRealUser`)
`findAgents(ctx)` → `{success, agents:[{id, name(name||title||key||slug||'Агент <id8>'), description, key, avatarUrl, isActive}]}`. При ошибке `{success:true, agents:[]}` + log.

### `apiAgentsByChatRoute` — `GET /by-chat/:chatId` (`requireRealUser`)
По `Chats.findById`. `{success, chatId, feedId, agents:[{id,agentId,agentName,agentKey,botUserId,respondTo,respondToMention,isActive,canScheduleInChat,chainKey}]}` (только активные).

### `apiAgentsByFeedRoute` — `GET /by-feed/:feedId` — то же через `Chats.findOneBy({feedId})`.

### `apiAgentsAddRoute` — `POST /add` (`requireRealUser` + `requireAccountRole('Admin')`, `.body`)
- Body: `{chatId, agentId, agentName, agentKey, respondTo='mention', respondToMention='all', canScheduleInChat=true}`.
- Логика: только `chat.type==='group'`. Дедуп: запись есть и активна → ошибка; неактивна → реактивировать (update). `createOrUpdateBotUser(ctx, 'agent_<agentKey>_<Date.now()>', {firstName:agentName, lastName:''})`. `chainKey='chat_<feedId>_agent_<agentId>'`. `ChatAgents.create({chat, agentId, agentName, agentKey, botUserId, respondTo, respondToMention, isActive:true, canScheduleInChat, chainKey})`. `createOrUpdateFeedParticipant(ctx, feed, botUser, {role:'guest', silent:true})`.
- Выход: `{success, agent:{id,agentId,agentName,agentKey,botUserId,respondTo,respondToMention,chainKey}}`.

### `apiAgentsUpdateRoute` — `POST /:agentId/update` (admin, `.body`)
Body `{respondTo?, respondToMention?, canScheduleInChat?}`. Частичный update. Выход `{success, agent}`.

### `apiAgentsRemoveRoute` — `POST /remove` (admin, `.body`)
Body `{agentId}`. **Деактивирует** (`isActive:false`), не удаляет. Выход `{success}`.

## api/agents-migration.ts

### `apiAgentsMigrationRoute` — `POST /migrate` (`requireAccountRole('Admin')`)
Для всех `ChatAgents` без `botUserId`: `createOrUpdateBotUser('agent-<agentId>', {firstName: agentName||'Агент'})`, update записи, добавить участника в feed. Выход `{success, stats:{total,migrated,errors,skipped}, results}`.

## api/direct-chats.ts

Импорты также `canSendDirectMessage` (`./privacy-settings`), `findAgents`.

### `apiDirectChatCreateRoute` — `POST /create` (`requireRealUser`, `.body`)
Body `{userId}`. Шаги: запрет self; `canSendDirectMessage(ctx, ctx.user.id, targetUserId)` (если `!allowed` — throw reason); `findExistingDirectChat` (есть → `{success, chat, feedId, isNew:false}`); `chatTitle` из профиля собеседника; `createFeed({title, inboxSubjectId:'direct-<u>-<t>-<ts>', inboxUrl:'/tg/chat~<id>', data:{appId:'tg'}})`; `Chats.create({feedId, title, type:'direct', owner, isPublic:false, description:'', inboxSubjectId})`; оба участника (`ctx.user` owner silent, target guest silent). Выход `{success, chat, feedId, isNew:true}`.

### `apiDirectChatGetRoute` — `GET /:feedId` (`requireRealUser`)
Проверка `type==='direct'` и участия. Выход `{chat, otherUser:{id,displayName,firstName,lastName,username,avatar}|null, participants}`.

### `apiDirectChatCanMessageRoute` — `POST /can-message` (`.body`)
Body `{userId}`. → результат `canSendDirectMessage`.

### `apiDirectChatWithAgentRoute` — `POST /create-with-agent` (**`requireAccountRole('Admin')`**, `.body`)
Body `{agentId, agentKey?, agentName?}`. Дедуп `findExistingDirectChatWithAgent`; `findAgents` для title; `createFeed` (`inboxSubjectId 'direct-agent-...'`); `Chats.create(type:'direct')`; `createOrUpdateBotUser('agent_<agentId>..._<Date.now()>', {firstName:chatTitle, lastName:''})`; `ChatAgents.create({chat, agentId, agentKey, agentName, botUserId, respondTo:'all', respondToMention:'all', isActive:true})`; участники (текущий owner, bot guest, оба silent). Выход `{success, chat, feedId, isNew}`.

### `apiDirectChatsWithAgentsRoute` — `GET /my-agents` (`requireRealUser`)
Перебрать direct-чаты юзера, отобрать с активным `ChatAgents`. Выход `{success, chats:[{id,feedId,title,agentName,agentId,createdAt}]}`.

## processMessageWithAgents (в messages.ts)

Вызывается из `apiMessagesSendRoute` для `type==='group'` (fire-and-forget).
1. `ChatAgents.findAll({chat, isActive})`.
2. Для каждого по `respondTo`:
   - `all` — отвечать всегда;
   - `admins` — только если отправитель owner/admin;
   - `mention` — только при упоминании (regex `@agentName` / `@agentKey` / `@[agentName](id)`); при `respondToMention==='admins'` — дополнительно требовать роль admin.
   - Не отвечать на сообщения от своего `botUserId`.
3. Загрузить до 10 последних сообщений как контекст; собрать текст `buildAgentMessageText({...})` (markdown-промпт с инструкциями про тулы `reply-in-group-chat`/`send-image-to-group-chat`).
4. `pushMessageToChain(ctx, { agentId, chainKey: chatAgent.chainKey || 'chat_<feedId>_agent_<agentId>', messageText, wakeAgent:true, createChainIfNotExists:true, chainParams: { title, chainMeta:{chatId, chatTitle, agentId, agentName, botUserId, messageId}, userProfile:{senderName, senderRole, chatTitle} } })`.

Агент, обработав сообщение, отвечает через тулы (создают `createFeedMessage` от `{id: botUserId}` + WS `new-message`).
