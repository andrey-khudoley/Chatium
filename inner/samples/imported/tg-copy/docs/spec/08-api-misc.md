# 08. API — профиль, пользователи, модерация, приватность, прочее

## api/profile.ts (`requireRealUser`)

| Роут | Метод/путь | Описание |
| --- | --- | --- |
| `apiProfileGetRoute` | GET `/` | через `findIdentities({userId})` достать email/phone. `{user:{id,displayName,firstName,lastName,username,email,phone,gender,birthday,imageUrl,imageHash,accountRole}}` |
| `apiProfileUpdateRoute` | POST `/update` | body `{firstName?,lastName?,username?,gender?,birthday?}`. firstName/lastName → `updateUser`. username → валидация (`^[a-zA-Z0-9_]+$`, 3–32), `ctx.user.updateUsername(ctx, trimmed)`; ошибки `{success:false, error:'username_taken'|'invalid_username'|'username_too_short'|'username_too_long'|'unknown_error', message}`. gender/birthday → `ctx.user.updateExtendedInfo`. Успех `{success:true}` |
| `apiProfileUpdateAvatarRoute` | POST `/avatar` | body `{imageHash}`. `ctx.user.updateExtendedInfo({imageHash})`. `{success, imageUrl}` |

## api/users.ts (`requireRealUser`, body-схемы)

| Роут | Метод/путь | Вход | Описание |
| --- | --- | --- | --- |
| `apiUsersSearchRoute` | POST `/search` | `{query, type?('username'/'email'/'phone')}` | username → `findUsers({username, type:'Real'})`; email/phone → `normalizeIdentityKey` + identities → users + fallback по точному совпадению. Дедуп. `{users:[{id,displayName,username?/email?/phone?,type,avatar}]}` |
| `apiUsersFindByIdentityRoute` | POST `/find-by-identity` | `{email?,phone?,username?}` | приоритет username→email→phone, `type:'Real'`. `{user}` или `{user:null}` |
| `apiUsersGetByIdsRoute` | POST `/get-by-ids` | `{ids:string[]}` | дедуп, `findUsersByIds` + identities. `{users:[{id,displayName,firstName,lastName,username,avatar,email,phone}]}` |

## api/users-list.ts

### `apiUsersListRoute` — `GET /` (`requireAccountRole('Staff')` — Staff/Admin/Developer)
`findUsers({type:'Real'})` limit 1000. `{success, users:[{id,firstName,lastName,username,displayName,email,phone,accountRole,type,hasAvatar,imageHash,imageUrl,createdAt}], totalCount}`. При ошибке `{success:false, error}`.

## api/blocked-users.ts (`requireRealUser`, body-схемы)

| Роут | Метод/путь | Вход | Описание |
| --- | --- | --- | --- |
| `apiBlockedUsersListRoute` | GET `/list` | — | `{blockedUsers:[{id,blockedUserId,reason,createdAt,user|null}]}` (order createdAt desc, `findUsersByIds`) |
| `apiBlockedUsersBlockRoute` | POST `/block` | `{userId, reason?}` | `{success, blockedUser}`. Throw: self-block, уже заблокирован |
| `apiBlockedUsersUnblockRoute` | POST `/unblock` | `{userId}` | `{success}`. Throw `'не найден в чёрном списке'` |
| `apiBlockedUsersCheckRoute` | POST `/check` | `{userId}` | `{isBlocked:boolean}` |

## api/chat-actions.ts (`requireRealUser`, body `{feedId}`)

| Роут | Метод/путь | Описание |
| --- | --- | --- |
| `apiChatLeaveRoute` | POST `/leave` | Выход из группы. Запрет `direct` (`'используйте блокировку'`). Должен быть участником; владелец не может. `deleteFeedParticipant(ctx, feedId, myParticipant.id)`. `createSystemMessage('user_left', {userName})`. WS `chat-<feedId> {type:'chat-event', event:'participant-left', feedId, userId, userName}` + дубль на `user-<id>` оставшимся. Выход `{success, message}` |
| `apiChannelUnsubscribeRoute` | POST `/unsubscribe` | Только `channel`. Аналогично leave (`user_left`, те же WS). Владелец не может |
| `apiDirectChatDeleteRoute` | POST `/delete-direct` | Только `direct`. Удалить участника (чат исчезает у себя). Без WS/системника. `{success, message:'Диалог удален'}` |

## api/moderation.ts (`requireRealUser`)

Таблица `Moderations`. Экспорт `isUserBanned(ctx, feedId, userId): Promise<boolean>` (с авто-деактивацией истёкшего).

| Роут | Метод/путь | Вход | Описание |
| --- | --- | --- | --- |
| `apiModerationCheckRoute` | POST `/check` | `{feedId, userId}` | активная модерация (авто-деактивация истёкшей). `{moderation}` или `{moderation:null}` |
| `apiModerationSetRoute` | POST `/set` | `{feedId, userId, type('mute'/'ban'), reason?, duration?(мин)}` | `canManageChat`; запрет owner/себя; деактивировать прежние того же типа; `isPermanent=!duration`, `expiresAt=duration?now+duration*60000:null`; `Moderations.create({...,isActive:true})`; при `ban` → `deleteFeedParticipant`(try/catch); при временной → `apiModerationExpireJob.scheduleJobAt(ctx, expiresAt, {moderationId})`. `{success, moderation}` |
| `apiModerationRemoveRoute` | POST `/remove` | `{feedId, userId, type}` | `canManageChat`; деактивировать активные. `{success}` |
| `apiModerationListRoute` | GET `/list` | query `{feedId, onlyActive?}` | `canManageChat`. `{moderations}` (order createdAt desc, limit 100) |
| `apiModerationExpireJob` | job `/expire` | `{moderationId}` | деактивировать если истекло |

## api/privacy-settings.ts (`requireRealUser`)

Таблица `PrivacySettings` (`user, allowDirectMessages('everyone'/'contacts'/'none'), allowedUsers[], blockedUsers[]`). Экспорт `canSendDirectMessage(ctx, senderId, targetUserId): {allowed, reason?}` (self→false; blockedUsers содержит sender→false; `everyone`→true; `contacts`→true только если в allowedUsers; `none`→false).

| Роут | Метод/путь | Описание |
| --- | --- | --- |
| `apiPrivacySettingsGetRoute` | GET `/` | дефолт `everyone` при отсутствии. `{allowDirectMessages, allowedUsers, blockedUsers}` |
| `apiPrivacySettingsUpdateRoute` | POST `/update` | `{allowDirectMessages?, allowedUsers?, blockedUsers?}`. Upsert. `{success, settings}` |
| `apiPrivacySettingsCanMessageRoute` | POST `/can-message` | `{targetUserId}` → `canSendDirectMessage` |
| `apiPrivacySettingsAllowUserRoute` | POST `/allow-user` | `{userId}` → добавить в allowedUsers (создать с `contacts` если нет). `{success}` |
| `apiPrivacySettingsRemoveAllowedRoute` | POST `/remove-allowed` | `{userId}` → убрать из allowedUsers. `{success}` |

## api/voice-transcriptions.ts

Импорт `transcriptAudio` (`@start/sdk`). Таблица `Transcriptions`.

### `apiVoiceTranscriptionGetRoute` — `GET /:fileHash` (`requireRealUser`)
`Transcriptions.findOneBy({fileHash})`. `{transcription|null}`.

### `apiVoiceTranscriptionCreateRoute` — `POST /create` (`requireAccountRole('Admin')`)
Body `{fileHash, messageId, feedId}`.
1. Кэш: запись `completed` → `{success, transcription, fromCache:true}`.
2. create/update запись `status:'processing'`, `requestedBy`.
3. `audioUrl='https://fs.chatium.ru/get/<fileHash>'`.
4. `transcriptAudio(ctx, audioUrl)` → `result.text`.
5. update `status:'completed', transcription`.
6. `findFeedMessageById` + `updateFeedMessage(ctx, feedId, messageId, {data:{...existingData, voiceTranscription, voiceTranscriptionAt}})`.
7. WS `chat-<feedId> {type:'transcription-completed', messageId, fileHash, transcription, feedId, timestamp}`.
8. При ошибке: update `status:'error', errorMessage`; WS `{type:'transcription-error', messageId, fileHash, error}`; rethrow.
Выход `{success, transcription, fromCache:false}`.

## api/app-settings.ts (`requireAccountRole('Admin')`)

Таблица `AppSettings`. DTO `{id,key,value,category,description}`. Экспорт `getAppSetting(ctx, key): Promise<string|null>`.

| Роут | Метод/путь | Описание |
| --- | --- | --- |
| `apiAppSettingsListRoute` | GET `/list` | `AppSettingDto[]` (order category asc, key asc) |
| `apiAppSettingsGetRoute` | GET `/get/:key` | `AppSettingDto\|null` |
| `apiAppSettingsUpdateRoute` | POST `/update` | `{key, value?, category?, description?}` → upsert по key |
| `apiAppSettingsDeleteRoute` | POST `/delete` | `{key}` → `{success:true}` |

## client-logs (отладка)

`api/client-logs.ts`, `client-logs-simple.ts`, `client-logs-sw.ts` — приём логов с клиента и Service Worker в таблицу `ClientLogs` (`{userId, type, message, details, userAgent, url}`). Используются `useClientLogger` и `firebase-messaging-sw.js` (`api/client-logs-sw`).
