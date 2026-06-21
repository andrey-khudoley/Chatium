# 05. API — папки, закрепления, фильтры, inbox

Все — `requireRealUser` первой строкой. WebSocket нет. Соглашения по оформлению (один файл = один роут, `// @shared-route`, `@app/errors`, `runWithExclusiveLock` на дедуп, `ctx.account.log`) — см. [04, преамбула](04-api-core-messaging.md). Дедуп `findOneBy`→`create` (папки, закрепления) оборачивать в `runWithExclusiveLock`.

## api/chat-folders.ts

Таблицы `ChatFolders`, `ChatFolderItems`. Владелец проверяется `folder.userId === ctx.user.id` (иначе throw `'Folder not found'`).

| Роут | Метод/путь | Вход | Выход / логика |
| --- | --- | --- | --- |
| `apiChatFoldersListRoute` | GET `/list` | — | `ChatFolder[]` (where userId, order sortOrder asc) |
| `apiChatFoldersCreateRoute` | POST `/create` | `{name, icon?, selectedChats?:string[]}` | folder. sortOrder=max+1; icon дефолт `📁`, color `#008069`. Для каждого feedId — `ChatFolderItems.create` (дедуп findOneBy, `addedAt:now`) |
| `apiChatFoldersUpdateRoute` | POST `/:id/update` | params `id`; `{name?, icon?, selectedChats?}` | folder. Обновить name/icon. Если `selectedChats` — diff items (добавить toAdd, удалить toRemove) |
| `apiChatFoldersDeleteRoute` | POST `/:id/delete` | params `id` | `{success:true}`. Удалить items + folder |
| `apiChatFoldersReorderRoute` | POST `/reorder` | `{folderIds:string[]}` | `{success:true}`. Для каждого (если userId совпал) update sortOrder=i |
| `apiChatFoldersAddChatRoute` | POST `/:id/add-chat` | params `id`; `{feedId}` | item (новый/существующий, дедуп) |
| `apiChatFoldersRemoveChatRoute` | POST `/:id/remove-chat` | params `id`; `{feedId}` | `{success:true}`. delete по `{folderId,feedId,userId}` |
| `apiChatFoldersGetChatsRoute` | GET `/:id/chats` | params `id` | `string[]` feedIds (order addedAt desc) |
| `apiChatFoldersGetAllWithChatsRoute` | GET `/all-with-chats` | — | `Array<folder & {chatIds:string[]}>` |
| `apiChatFoldersGetForChatRoute` | GET `/for-chat/:feedId` | params `feedId` | `string[]` folderIds |

## api/pinned-chats.ts

Таблица `UserPinnedChats`.

| Роут | Метод/путь | Вход | Выход |
| --- | --- | --- | --- |
| `apiPinnedChatsListRoute` | GET `/list` | — | `{pinnedChats:[{id,feedId,sortOrder}]}` (order sortOrder asc, limit 1000) |
| `apiPinnedChatsPinRoute` | POST `/pin` | `{feedId}` | `{success:true, pinnedChat}`. Дедуп; sortOrder=max+1 |
| `apiPinnedChatsUnpinRoute` | POST `/unpin` | `{feedId}` | `{success:true}` |
| `apiPinnedChatsReorderRoute` | POST `/reorder` | `{feedIds:string[]}` | `{success:true}`. Throw `'feedIds должен быть массивом'` если не массив; update sortOrder=i |
| `apiPinnedChatsCheckRoute` | POST `/check` | `{feedId}` | `{isPinned:boolean, sortOrder?}` |

## api/chat-filter-orders.ts

Таблица `UserChatFilterOrders`.

| Роут | Метод/путь | Вход | Выход |
| --- | --- | --- | --- |
| `apiChatFilterOrdersGetRoute` | GET `/` | — | `UserChatFilterOrder[]` (order position asc) |
| `apiChatFilterOrdersUpdateRoute` | POST `/update` | `{orders:[{filterId,filterType,position}]}` | `{success:true}`. **Удалить все** записи юзера, затем создать из `orders` |

## api/inbox-badges.ts

Импорты `getInboxData, resetInboxBadge` (`@app/inbox`), `isUserBanned`.

### `apiInboxBadgesGetRoute` — `GET /get`
- Логика: собрать `accessibleSubjectIds` по всем чатам приложения: исключить забаненных (`isUserBanned`); доступ если участник / `isPublic` / по подписке (`Subscriptions`+`PlanChats`) / accepted-инвайт (`ChatInvites`); ключ — `inboxSubjectId || feedId`. `getInboxData(ctx, ctx.user)` → отфильтровать `items` по доступным subject_id и `badge>0`.
- Выход: `{badges: Record<subjectId, number>}`.

### `apiInboxBadgeResetRoute` — `POST /reset`
- Body: `{subjectId, url?}`. `resetInboxBadge(ctx, ctx.user, {subjectId, url})`. Выход `{success:true}`.
