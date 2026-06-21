# 13. Компоненты (Vue 3, `<script setup>`)

~57 компонентов + `pages/LandingPage.vue`. Вызовы API — `apiXxxRoute.run(ctx)` (роут `// @shared-route`) либо `fetch(withProjectRoot(route.url()))`; хардкод URL запрещён.

> **Размер файлов ≤300–400 строк (001-standards).** Крупные компоненты sample (`ChatView.vue` ~4747 строк, `ChatsList.vue` ~74 KB) **дробить** на под-компоненты: например `ChatView` → `MessageList`, `MessageItem`, `MessageInput`, `ChatHeader`, `SelectionBar`, `EmojiPicker`. В `.vue` импортировать только из `shared/*` (`// @shared`) и роут-объекты; `tables/`/`repos/`/`lib/` — никогда. Данные — SSR-пропсы или `route.run(ctx)`.

## Крупные/ключевые (подробно)

### ChatView.vue — главный экран чата
Props: `feedId, chatsList, userSocketId, targetMessageId`. Emits: `back, select-chat, profile, create-chat, message-viewed, chat-updated, badge-reset, chat-deleted, chat-left`.
Composables: `useChatAccess, useChatSocket, useMessageSync, useSmartPosition`.
Состояние (выжимка): `chat, participants, messages, pinnedMessage, typingUsers, readReceipts`; `sortedMessages`(computed по createdAt); флаги `sending, loadingMore, hasMoreMessages, loading`; ввод `newMessage, editingMessage, replyingTo, forwardingMessage(s)`; выбор `selectedMessageIds:Set, isSelectionMode`; модалки `activeModal('info'|'edit'|'subscription'|'extra-menu'), showParticipants, showInviteModal, showAttachMenu, showEmojiPicker, showSearch, showInlineVoiceRecorder, showAgentsModal, addToFolderModalOpen, showModerationModal, showChatAvatarModal`; `contextMenu{show,x,y,message,reactions}`, mention (`showMentionPicker, mentionSearchQuery, mentionStartIndex`), `unreadMentions`, эмодзи-наборы; модерация (`myModeration, isBanned, banInfo, participantsModerations:Map`); refs (`messagesContainer, loadMoreAnchor, messageInput`), наблюдатели (`loadMoreObserver, readObserver`), `loadedMessageIds:Set, pendingReadMessages, sentReadMessages`; свайп (`touchStartX/Y, swipeThreshold`); `editChat{title,description,isPublic,avatarHash}, selectedFiles`.
Computed: `otherUser, isChannel, isDirectChat, isOwner, isAdmin, canManage, canPostMessages, isMember, canJoin, isWorkspaceAdmin, typingText, replyAuthorName, replyPreview, unreadMentionsCount`.
WS: два канала (user из `useChatSocket` + `chat-<feedId>` через `getOrCreateBrowserSocketClient`), оба `type==='chat-event' && feedId===props.feedId`, `switch(event)`: new-message→`handleNewMessage`, edit-message→`handleEditMessage`, delete-message→`handleDeleteMessage`, new-participant→`handleNewParticipant`, participant-left→`handleParticipantLeft`, reaction-toggle→`handleReactionUpdate`, typing-start/stop→`handleTyping*`, message-pinned/unpinned→set/clear, message-read→`handleMessageRead`; `transcription-completed`→вписать `voiceTranscription`. `watch(isConnected)`→`forceSync()`. Fallback-polling 10 c.
Методы (≈150): `loadChat, loadMessages(silent), loadAroundMessage(targetId), loadMoreMessages, loadPinnedMessages, checkCanJoin, checkMyModeration, loadParticipantsModerations, loadReadMentionsFromServer/saveReadMentionsToServer`; `sendMessage, sendMessageWithFiles, uploadFile, handleFileSelect, handlePaste, onVoiceRecorded, onInlineVoiceRecorded, onVideoRecorded`; `editMessage, deleteMessage, replyToMessage, forwardMessage, pinMessage, toggleReaction, copyMessageText`; `enterSelectionMode, toggleMessageSelection, copy/forward/deleteSelectedMessages`; `updateChat, deleteChat, joinChat, leaveChat, blockUserFromChat, removeParticipant, updateParticipantRole`; `handleMentionInput, insertMention, scrollToFirstUnreadMention`; `scrollToBottom, scrollToMessage, setupReadObserver, markAsRead, handleScroll, checkMobile`, `handleTouchStart/Move/End`; `showContextMenu, toggleEmojiPicker, insertEmoji`; `normalizeMessageFields, normalizeClientData`.

### ChatsList.vue — сайдбар
Props: `chats[], selectedChat, invites[], inboxBadges:Map, user, pushNotificationsEnabled, pushBannerVisible`. Emits: `select-chat, show-profile, show-settings, create-chat, accept-invite, decline-invite, go-to-message, select-user-chat, enable-push`.
Composables: `useTheme, useScale, useSmartPosition`.
Состояние: поиск (`isSearchMode, searchQuery, searchType('all'/'chats'/'messages'), isSearching, searchResults`), меню (`showMenu, menuPosition`), фильтры (`activeFilter('all'/'groups'/'personal'/'channels'/'folder-<id>'), filterOrders`), папки (`customFolders, folderModalOpen, editingFolder, addToFolderModalOpen, selectedChatForFolder/FolderIds`), закреплённые (`pinnedChats, pinnedChatIds, filteredPinnedChats, draggedPinnedIndex`), контекст-меню чата (`showChatContextMenu, contextMenuChat`), long-press (`longPressTimer, longPressDuration 500`), `joinedChats:Set, blockedUserIds:Set`. Computed: `canViewUsersList, showPushButton, filteredChats, filteredPinnedChats`.
Методы: `toggleSearch, performSearch(apiSearchRoute), loadBlockedUsers, loadCustomFolders/createFolder/updateFolder/deleteFolder/reorderFilters, pin/unpin/reorder pinned, leaveChat/unsubscribe/deleteDirect, joinChat`. Дочерние: `InvitesList, ChatFilters, FolderModal, AddToFolderModal, UsersListModal`. Экспонирует `reload()`.

### ProfileView.vue
Emits: `back`. Состояние: `profile{...}, editForm, activeTab('general'|...), notification, blockedUsers, showAvatarModal`. Computed: `avatarUrl, isAdmin, hasChanges`. Методы: `loadProfile, saveProfile(apiProfileUpdate), onAvatarSaved/removeAvatar(apiProfileUpdateAvatar), loadBlockedUsers/unblockUser, copyId, onAgentChatCreated`. Дочерние: `AgentChatsList, PrivacySettings, AvatarCropperModal, AdminSettings`.

### ChatSettings.vue
Props: `user, chats[]`. Emits: `back, select-chat`. Вкладки: `subscriptions/available/plans(admin)/agents(admin)`. Состояние: `mySubscriptions, allPlans, cancellingId, renewingId, subscribingPlanId`. Методы: `loadSubscriptions(apiChatSubscriptionsMy), loadPlans(apiSubscriptionPlansList/All), cancelSubscription, renewSubscription, subscribeToPlan` (`import('../shared/subscription-periods')`, `window.open(paymentLink)`). Дочерние: `SubscriptionPlansSettings, AgentsSettings`.

### MessageReactions.vue
Props: `messageId, feedId, reactions:Object`. Emits: `update`. Нормализует реакции; `toggleReaction(emoji)` → `apiReactionsToggleRoute({feedId}).run(ctx,{messageId,emoji})` → emit `update {messageId, reactions}`. Хелперы `hasUserReacted, getReactionTooltip`.

### CreateChatModal.vue
Props: `isAdmin, user`. Emits: `close, created`. Состояние: `newChat{title,description,type('group'/'channel'/'agent'),isPublic}`, агент (`withAgent, selectedAgentId, agentName, agentRespondTo, agentRespondToMention`), `avatarHash, isPaidChat, plans[]`. Методы: `loadAgents(apiAgentsList), createChat` (agent→`apiDirectChatWithAgentRoute`, иначе `apiChatsCreateRoute`), `addPlan/removePlan`.

### InviteModal.vue
Props: `chatId, isAdmin`. Emits: `close, invited`. Вкладки `username/email/phone/link`. Состояние: поиск, выдача подписки (`showGrantSubscription, availablePlans, selectedPlanId, subscriptionStart/EndDate, subscriptionNote`), `inviteLink`. Методы: `searchUser(apiUsersFindByIdentity), sendInvite(apiInvitesCreate), grantSubscription(apiAdminGrantSubscription), createInviteLink(apiInvitesGetLink), copyLink`.

### MediaViewer.vue
Props: `files[], initialIndex, modelValue`. Emits: `update:modelValue`. Лайтбокс; `mediaList` (→ `{url:fs.chatium.ru/get/<hash>, type}`), навигация next/prev, клавиатура Esc/←/→, блокировка скролла.

### VoiceRecorder / InlineVoiceRecorder / VoiceRecorderModal
Emits: `recorded` (+`cancel`/`close`). `getUserMedia` + `MediaRecorder` + AnalyserNode (waveform), Wake Lock, таймер. `getSupportedMimeType` (предпочт. `audio/webm;codecs=opus`); на blob → `file.duration`, `file.isVoiceMessage`; эмит `{file, duration}`. InlineVoiceRecorder автостартует в `onMounted`; VoiceRecorder экспонирует `startRecording`.

### AgentsSettings.vue
Без props/emits. `apiAgentsListRoute` → список системных агентов (вкладка «Агенты» в ChatSettings).

## Остальные компоненты

| Компонент | Назначение | Props | Emits |
| --- | --- | --- | --- |
| AddToFolderModal | выбор папок для чата | `isOpen, folders[], chatId, chatFolderIds[]` | `close, toggle-folder, create-folder` |
| AdminSettings | заглушка (push удалён) | — | — |
| AgentChatsList | список/создание чатов с агентами | — | `chat-created` |
| AttachMenu | меню вложений | — | `file-select, voice-record, video-recorded` |
| AvatarCropperModal | загрузка+кроп аватара (Cropper.js, прямой upload) | `isOpen, title, saveButtonText, currentAvatarHash` | `close, save(hash), remove` |
| ChatAgentsModal | управление агентами чата | `feedId, chatId` | `close, agent-added, agent-removed` |
| ChatFilters | лента фильтров/папок (drag-reorder) | `filters[], customFolders[], activeFilter, chats[], filterOrders[], inboxBadges:Map` | `select-filter, reorder-filters, create-folder, edit-folder, delete-folder` |
| ChatProfileModal | инфо о чате (+подписка) | `chatId, chatTitle, chatType, chatDescription, avatarHash, isPublic, isPaid, showSubscriptionInfo` | `close, go-to-chat` |
| ChatSearchPanel | поиск сообщений в чате (debounce 300) | `feedId` | `close, go-to-message` |
| DateDivider | разделитель дат | `date` | — |
| FolderModal | создание/редактирование папки | `isOpen, folder, folderChats[], allChats[]` | `close, save, add-chat, remove-chat` |
| ForwardMessageModal | пересылка 1/N сообщений | `message, messages[], chats[], sourceChat` | `close, forward` |
| ForwardedFrom | плашка «переслано из» | `forwardedFrom` | `click, authorClick` |
| GlobalAudioPlayer | UI глобального плеера | `isFloating` | — |
| InvitesList | блок входящих приглашений | `invites[]` | `accepted(feedId), declined` |
| MarkdownMessage | рендер markdown + ссылки + @упоминания | `text, participants[]` | `mention-click` |
| MentionIndicator | кнопка «N упоминаний» | `show, count, bottom` | `click` |
| MentionPicker | автокомплит @упоминаний | `show, participants[], searchQuery, position, textareaRect` | `select, close` |
| MessageActionsMenu | контекст-меню сообщения + реакции | `show, message, currentUserId, canManage, isChannel` | `close, reply, forward, pin, edit, delete, toggle-reaction, copy-text, select` |
| MessageFiles | рендер вложений | `files[], isOwn, messageId, feedId, isWorkspaceAdmin, messageData, message, chatTitle, senderName` | — |
| MessageReply | плашка reply-to | `replyTo, currentUserId` | `scroll-to` |
| Modal | базовая модалка | `isOpen, title, showClose, size, bodyClass, closeOnOverlay, closeDelay` | `close, closed` (+`defineExpose({close})`) |
| ModerationModal | мьют/бан участника | `isOpen, feedId, userId, userName` | `close, applied` |
| OnboardingModal | первичный профиль (имя+username) | `user` | `complete` |
| ParticipantDirectChat | кнопка «написать» | `userId, userName` | `chat-created` |
| ParticipantsPanel | панель участников (роли, модерация) | `participants[], currentUserId, isChannel, isDirectChat, canManage, isOwner, participantsModerations:Map` | `close, invite, remove-participant, update-role, moderate, remove-moderation, direct-chat-created` |
| PinnedChatsList | закреплённые чаты (drag) | `pinnedChats[], allChats[], selectedChat` | `select-chat, unpin, reorder` |
| PinnedMessage | плашка закреплённого | `pinnedMessage, feedId, canManage` | `unpin, scroll-to` |
| PrivacySettings | приватность ЛС | — | — |
| ReadReceipts | галочки статуса | `status` | — |
| SubscriptionModal | оформление подписки | `show, feedId, chatTitle, chatDescription, chatAvatar` | `close, subscribed` |
| SubscriptionPlansSettings | CRUD тарифов (mode chat/global) | `canManage, mode, feedId, isPaid, isOwnerOrAdmin` | `plans-updated` |
| SubscriptionRequired | пейволл | `feedId, chat, plans[], accessStatus, subscription` | `subscribed, cancel` |
| SubscriptionsList | мои подписки (fetch) | — | — |
| TypingIndicator | «N печатает…» | `typingUsers[]` | — |
| UserProfileModal | карточка пользователя | `user, userId, currentUserRole` | `close, start-chat` |
| UsersListModal | список пользователей (admin) | — | `close, select-user, start-chat` |
| VideoNote | проигрывание видео-кружочка | `file, duration` | — |
| VideoRecorder | запись видео (≤60 c) | — | `recorded` |
| VideoRecorderModal | модалка записи видео | — | `recorded, close` |
| VoiceMessage | плеер голосового + транскрипция (WS) | `file, isOwn, messageId, feedId, isWorkspaceAdmin, messageData, message, chatTitle, senderName` | — |
| WelcomeView | пустой экран «выберите чат» | — | `create-chat` |
| pages/LandingPage | лендинг до авторизации | (`loginUrl='/s/auth/signin?back=' + withProjectRoot(indexPageRoute.url())`) | — |
