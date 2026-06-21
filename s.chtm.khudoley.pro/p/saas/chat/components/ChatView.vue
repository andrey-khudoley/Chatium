<template>
  <div class="chat-view">
    <!-- Экран бана — полный доступ запрещен (приоритет выше всего) -->
    <div v-if="isBanned && !accessCheck.loading" class="ban-screen-full">
      <div class="ban-content">
        <i class="fas fa-ban ban-icon"></i>
        <h2>Вы забанены в этом чате</h2>
        <p v-if="banInfo?.reason" class="ban-reason">Причина: {{ banInfo.reason }}</p>
        <p v-if="banInfo && !banInfo.isPermanent" class="ban-expires">
          Бан истекает: {{ formatModerationExpiry(banInfo.expiresAt) }}
        </p>
        <p v-else-if="banInfo?.isPermanent" class="ban-expires">Бан навсегда</p>
        <button @click="$emit('back')" class="btn-secondary">
          <i class="fas fa-arrow-left"></i> Вернуться к списку чатов
        </button>
      </div>
    </div>

    <!-- UI для покупки подписки (если нет доступа к платному чату) -->
    <SubscriptionRequired
      v-else-if="accessCheck.isPaid && !accessCheck.hasAccess && !accessCheck.loading"
      :feed-id="feedId"
      :chat="accessCheck.chat"
      :plans="accessCheck.plans"
      :access-status="accessCheck.reason"
      :subscription="accessCheck.subscription"
      @subscribed="onSubscribed"
      @cancel="$emit('back')"
    />

    <!-- Основной контент чата (если есть доступ) -->
    <template v-else-if="!accessCheck.loading && accessCheck.hasAccess">
      <!-- Панель выбора сообщений (показывается в режиме выбора) -->
      <div v-if="isSelectionMode" class="selection-header">
        <div class="selection-header-left">
          <button @click="exitSelectionMode" class="btn-icon" title="Отменить выбор">
            <i class="fas fa-times"></i>
          </button>
          <span class="selection-count"
            >{{ selectedMessageIds.size }}
            {{
              selectedMessageIds.size === 1
                ? 'сообщение'
                : selectedMessageIds.size < 5
                  ? 'сообщения'
                  : 'сообщений'
            }}</span
          >
        </div>
        <div class="selection-actions">
          <button
            v-if="selectedMessages.some((m) => m.text)"
            @click="copySelectedMessages"
            class="selection-btn"
            title="Копировать как текст"
          >
            <i class="fas fa-copy"></i>
          </button>
          <button @click="forwardSelectedMessages" class="selection-btn" title="Переслать">
            <i class="fas fa-share"></i>
          </button>
          <button
            v-if="selectedMessages.every((m) => isOwner || isOwnMessage(m))"
            @click="deleteSelectedMessages"
            class="selection-btn danger"
            title="Удалить"
          >
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>

      <!-- Шапка чата -->
      <header v-else class="chat-header">
        <div class="chat-header-left">
          <button v-if="isMobile" @click="$emit('back')" class="btn-icon">
            <i class="fas fa-arrow-left"></i>
          </button>
          <div
            v-if="chat"
            class="chat-header-info"
            @click="activeModal = 'info'"
            style="cursor: pointer"
          >
            <div class="chat-header-avatar" :style="getChatHeaderAvatarStyle()">
              <span v-if="!hasChatHeaderAvatar()">{{
                getChatInitials(chat.displayTitle || chat.title)
              }}</span>
            </div>
            <div class="chat-header-text">
              <h1 class="chat-header-title">
                {{ chat.displayTitle || chat.title }}
                <i v-if="chat?.isPaid" class="fas fa-crown paid-chat-icon" title="Платный чат"></i>
              </h1>
              <p v-if="typingUsers.length > 0" class="chat-header-status typing">
                {{ typingText }}
              </p>
              <p v-else-if="participants.length > 0" class="chat-header-status">
                {{
                  isChannel
                    ? formatSubscribers(participants.length)
                    : formatParticipants(participants.length)
                }}
              </p>
            </div>
          </div>
        </div>
        <div class="chat-header-actions">
          <!-- Десктопные кнопки -->
          <template v-if="!isMobile">
            <button
              v-if="canManage"
              @click="showSearch = true"
              class="btn-icon header-btn"
              title="Поиск"
            >
              <i class="fas fa-search"></i>
            </button>
            <button
              v-if="canManage && !isDirectChat"
              @click="showInviteModal = true"
              class="btn-icon header-btn"
              title="Пригласить участника"
            >
              <i class="fas fa-user-plus"></i>
            </button>
            <button
              v-if="!isDirectChat && (isOwner || isAdmin || !isChannel)"
              @click="showParticipants = !showParticipants"
              class="btn-icon header-btn"
              :class="{ active: showParticipants }"
              :title="isChannel ? 'Подписчики' : 'Участники'"
            >
              <i class="fas fa-users"></i>
            </button>
          </template>
          <button
            @click="activeModal = 'extra-menu'"
            class="btn-icon header-btn menu-btn"
            title="Меню"
          >
            <i class="fas fa-ellipsis-v"></i>
          </button>
        </div>
      </header>

      <!-- Индикатор состояния подключения (абсолютное позиционирование) -->
      <div
        v-if="!isConnected || isReconnecting || syncState.isSyncing"
        class="connection-status"
        :class="{ reconnecting: isReconnecting || syncState.isSyncing }"
      >
        <i
          class="fas"
          :class="isReconnecting || syncState.isSyncing ? 'fa-spinner fa-spin' : 'fa-wifi-slash'"
        ></i>
        <span v-if="syncState.isSyncing">Синхронизация...</span>
        <span v-else-if="isReconnecting">Переподключение...</span>
        <span v-else>Нет соединения</span>
        <button
          v-if="lastError && !syncState.isSyncing"
          @click="reconnect"
          class="btn-reconnect"
          title="Переподключиться"
        >
          <i class="fas fa-redo"></i>
        </button>
      </div>

      <!-- Закрепленное сообщение -->
      <PinnedMessage
        v-if="pinnedMessage"
        :pinned-message="pinnedMessage"
        :feed-id="feedId"
        :can-manage="canManage"
        @unpin="handleUnpin"
        @scroll-to="scrollToMessage"
      />

      <!-- Область сообщений -->
      <div
        ref="messagesContainer"
        class="messages-area"
        :class="{ swiping: isSwiping }"
        @scroll="handleScroll"
        @touchstart="handleTouchStart"
        @touchmove="handleTouchMove"
        @touchend="handleTouchEnd"
      >
        <!-- Якорь для подгрузки старых сообщений -->
        <div
          v-if="hasMoreMessages && messages.length > 0"
          ref="loadMoreAnchor"
          class="load-more-anchor"
        >
          <i class="fas fa-spinner fa-spin"></i>
        </div>

        <div v-else-if="canJoin" class="empty-chat join-chat-prompt">
          <i class="fas" :class="chat?.isPublic ? 'fa-lock-open' : 'fa-envelope-open'"></i>
          <p>
            {{
              chat?.isPublic
                ? `Публичный ${isChannel ? 'канал' : 'чат'}`
                : 'Приглашение в ' + (isChannel ? 'канал' : 'группу')
            }}
          </p>
          <span>{{
            chat?.description ||
            (isChannel ? 'Подпишитесь, чтобы видеть сообщения' : 'Вступите, чтобы видеть сообщения')
          }}</span>
          <button @click="joinChat" :disabled="joining" class="btn-join-chat">
            <i v-if="joining" class="fas fa-spinner fa-spin"></i>
            <span v-else>{{ isChannel ? 'Подписаться на канал' : 'Вступить в группу' }}</span>
          </button>
        </div>

        <div v-else-if="loading" class="empty-chat">
          <i class="fas fa-spinner fa-spin"></i>
          <p>Загрузка...</p>
        </div>

        <div v-else-if="messages.length === 0" class="empty-chat">
          <i class="fas fa-comments"></i>
          <p>Нет сообщений</p>
          <span>Начните общение первым!</span>
        </div>

        <div v-if="messages.length > 0" class="messages-list">
          <!-- Spacer для прижатия сообщений к низу, когда их мало -->
          <div v-if="!hasMoreMessages" class="messages-spacer"></div>
          <template v-for="(message, index) in sortedMessages" :key="message.id">
            <!-- Даторазделитель -->
            <DateDivider v-if="shouldShowDateDivider(message, index)" :date="message.createdAt" />
            <!-- Системное сообщение -->
            <div v-if="message.type === 'System'" class="system-message">
              <span class="system-text">{{ message.text }}</span>
              <span class="system-time">{{ formatTime(message.createdAt) }}</span>
            </div>

            <!-- Обычное сообщение -->
            <div
              v-else
              :class="[
                'message',
                {
                  'message-own': isOwnMessage(message),
                  'message-selected': isMessageSelected(message.id),
                  'message-selection-mode': isSelectionMode
                }
              ]"
              :id="'message-' + message.id"
              @click="isSelectionMode ? toggleMessageSelection(message.id) : null"
            >
              <!-- Чекбокс выбора (в режиме выбора) -->
              <div
                v-if="isSelectionMode"
                class="message-checkbox"
                @click.stop="toggleMessageSelection(message.id)"
              >
                <div :class="['checkbox-circle', { checked: isMessageSelected(message.id) }]">
                  <i v-if="isMessageSelected(message.id)" class="fas fa-check"></i>
                </div>
              </div>
              <!-- Аватар для чужих сообщений -->
              <div
                v-if="!isOwnMessage(message)"
                class="message-avatar"
                @click="showUserProfile(message)"
                style="cursor: pointer"
                :title="'Просмотреть профиль ' + getMessageAuthorName(message)"
              >
                <img
                  v-if="getMessageAuthor(message)?.avatar"
                  :src="getMessageAuthor(message).avatar"
                />
                <span v-else>{{ getMessageAuthorInitials(message) }}</span>
              </div>

              <div class="message-content">
                <!-- Имя автора для чужих сообщений -->
                <div
                  v-if="!isOwnMessage(message)"
                  class="message-author-name"
                  @click="showUserProfile(message)"
                  style="cursor: pointer"
                  :title="'Просмотреть профиль ' + getMessageAuthorName(message)"
                >
                  {{ getMessageAuthorName(message) }}
                </div>

                <div
                  class="message-bubble"
                  :class="{
                    'has-files': message.files && message.files.length > 0,
                    'has-text': message.text
                  }"
                  @contextmenu.prevent="!isSelectionMode && showContextMenu($event, message)"
                  @click="!isSelectionMode && isMobile ? showMobileMessageMenu(message) : null"
                >
                  <!-- Источник пересылки -->
                  <ForwardedFrom
                    v-if="getForwardedFrom(message)"
                    :forwarded-from="getForwardedFrom(message)"
                    @click="showChatProfile"
                    @author-click="showForwardedAuthorProfile"
                  />

                  <!-- Ответ на сообщение -->
                  <MessageReply
                    v-if="message.replyTo || message.reply_to"
                    :reply-to="getReplyToMessage(message)"
                    :current-user-id="ctx.user?.id"
                    @scroll-to="scrollToMessage"
                  />

                  <!-- Файлы -->
                  <MessageFiles
                    v-if="message.files && message.files.length > 0"
                    :files="message.files"
                    :is-own="isOwnMessage(message)"
                    :message-id="message.id"
                    :feed-id="props.feedId"
                    :is-workspace-admin="isWorkspaceAdmin"
                    :message-data="message.data || {}"
                    :message="message"
                    :chat-title="chat?.displayTitle || chat?.title || ''"
                    :sender-name="getMessageAuthorName(message)"
                  />

                  <!-- Текст сообщения -->
                  <MarkdownMessage
                    v-if="message.text"
                    :text="message.text"
                    :participants="participants"
                    @mention-click="handleMentionClick"
                  />

                  <!-- Редактировано -->
                  <div v-if="isEdited(message)" class="message-edited">изменено</div>

                  <!-- Нижняя строка пузыря: реакции слева, мета справа -->
                  <div class="message-footer">
                    <div v-if="hasReactions(message)" class="message-reactions-inline">
                      <button
                        v-for="(users, emoji) in getMessageReactions(message)"
                        :key="emoji"
                        :class="['reaction-chip', { active: hasUserReacted(message, emoji) }]"
                        @click.stop="toggleReaction(message, emoji)"
                        :title="getReactionTooltip(emoji, users)"
                      >
                        <span class="reaction-chip-emoji">{{ emoji }}</span>
                        <span class="reaction-chip-count">{{
                          Array.isArray(users) ? users.length : 0
                        }}</span>
                      </button>
                    </div>
                    <div class="message-meta-spacer" v-if="hasReactions(message)"></div>
                    <div class="message-meta">
                      <span class="message-time">{{ formatTime(message.createdAt) }}</span>
                      <ReadReceipts
                        v-if="isOwnMessage(message)"
                        :status="getMessageStatus(message)"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <!-- Действия с сообщением -->
              <div class="message-actions">
                <button @click="replyToMessage(message)" class="action-btn" title="Ответить">
                  <i class="fas fa-reply"></i>
                </button>
                <button @click="forwardMessage(message)" class="action-btn" title="Переслать">
                  <i class="fas fa-share"></i>
                </button>
                <button
                  v-if="canManage || isOwnMessage(message)"
                  @click="pinMessage(message)"
                  class="action-btn"
                  title="Закрепить"
                >
                  <i class="fas fa-thumbtack"></i>
                </button>
                <button
                  v-if="isOwnMessage(message)"
                  @click="editMessage(message)"
                  class="action-btn"
                  title="Редактировать"
                >
                  <i class="fas fa-pen"></i>
                </button>
                <button
                  v-if="isOwner || isOwnMessage(message)"
                  @click="deleteMessage(message.id)"
                  class="action-btn"
                  title="Удалить"
                >
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </div>
          </template>

          <!-- Typing indicator -->
          <TypingIndicator :typing-users="typingUsers" />
        </div>

        <!-- Якорь для прокрутки в самый низ -->
        <div ref="bottomAnchor" class="bottom-anchor"></div>
      </div>

      <!-- Кнопка прокрутки вниз -->
      <button
        v-show="showScrollButton"
        class="scroll-to-bottom-btn"
        @click="scrollToBottom"
        title="Прокрутить вниз"
        :style="scrollButtonStyle"
      >
        <i class="fas fa-chevron-down"></i>
      </button>

      <!-- Индикатор упоминаний -->
      <MentionIndicator
        :show="unreadMentionsCount > 0"
        :count="unreadMentionsCount"
        :bottom="mentionButtonBottom"
        @click="scrollToFirstUnreadMention"
      />

      <!-- Плашка модерации для замьюченных пользователей (внутри чата) -->
      <div v-if="isMember && myModeration?.type === 'mute'" class="moderation-notice">
        <div class="moderation-notice-content">
          <i class="fas fa-volume-mute"></i>
          <div class="moderation-text">
            <strong>Вам запрещено писать сообщения</strong>
            <span v-if="myModeration.reason" class="moderation-reason"
              >Причина: {{ myModeration.reason }}</span
            >
            <span v-if="!myModeration.isPermanent" class="moderation-expires">
              До {{ formatModerationExpiry(myModeration.expiresAt) }}
            </span>
            <span v-else class="moderation-expires">Навсегда</span>
          </div>
        </div>
      </div>

      <!-- Область ввода (только для участников с правами на публикацию и без модерации) -->
      <div v-else-if="isMember && canPostMessages" ref="inputAreaRef" class="input-area">
        <!-- Баннер ответа -->
        <div v-if="replyingTo" class="reply-banner">
          <div class="reply-banner-content">
            <i class="fas fa-reply"></i>
            <div class="reply-info">
              <span class="reply-label">Ответ {{ replyAuthorName }}</span>
              <span class="reply-preview">{{ replyPreview }}</span>
            </div>
          </div>
          <button @click="cancelReply" class="btn-icon">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <!-- Баннер редактирования -->
        <div v-if="editingMessage" class="edit-banner">
          <div class="edit-banner-content">
            <i class="fas fa-pen"></i>
            <span>Редактирование сообщения</span>
          </div>
          <button @click="cancelEdit" class="btn-icon">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <!-- Баннер прикрепленных файлов -->
        <div v-if="selectedFiles.length > 0" class="files-banner">
          <div class="files-list">
            <div
              v-for="(file, index) in selectedFiles"
              :key="index"
              class="file-item"
              :class="{ uploading: file.uploading }"
            >
              <div class="file-preview" v-if="file.isImage">
                <img :src="file.preview" />
                <!-- Индикатор загрузки для изображений -->
                <div v-if="file.uploading" class="upload-overlay">
                  <div class="upload-spinner">
                    <i class="fas fa-spinner fa-spin"></i>
                  </div>
                  <div class="upload-percent">{{ file.progress }}%</div>
                  <div class="upload-progress-bar">
                    <div class="upload-progress-fill" :style="{ width: file.progress + '%' }"></div>
                  </div>
                </div>
              </div>
              <div class="file-info" v-else>
                <i class="fas" :class="getUploadFileIcon(file)"></i>
                <span class="file-name">{{ file.name }}</span>
                <!-- Индикатор загрузки для файлов -->
                <div v-if="file.uploading" class="file-upload-info">
                  <div class="upload-text-row">
                    <span class="upload-status">Загрузка...</span>
                    <span class="upload-percent-file">{{ file.progress }}%</span>
                  </div>
                  <div class="upload-progress-bar-file">
                    <div class="upload-progress-fill" :style="{ width: file.progress + '%' }"></div>
                  </div>
                </div>
              </div>
              <button
                type="button"
                class="btn-remove-file"
                @click="removeFile(index)"
                :disabled="file.uploading"
              >
                <i class="fas fa-times"></i>
              </button>
            </div>
          </div>
        </div>

        <form @submit.prevent="sendMessage" class="input-form">
          <!-- Меню прикрепления (файлы, голосовое, видео) -->
          <AttachMenu
            @file-select="selectFiles"
            @voice-recorded="onVoiceRecorded"
            @video-recorded="onVideoRecorded"
          />
          <input
            ref="fileInput"
            type="file"
            multiple
            style="display: none"
            @change="handleFileSelect"
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.zip,.rar"
          />
          <div class="input-wrapper">
            <textarea
              ref="messageInput"
              v-model="newMessage"
              placeholder="Написать сообщение..."
              class="message-input"
              @keydown="handleInputKeydown"
              @input="handleInput"
              @paste="handlePaste"
              @focus="handleInputFocus"
              @blur="handleInputBlur"
              rows="1"
            ></textarea>
            <button
              type="button"
              ref="emojiPickerButton"
              class="btn-emoji"
              @click="toggleEmojiPickerPopup"
            >
              <i class="far fa-smile"></i>
            </button>
          </div>
          <button
            type="submit"
            :class="['btn-send', { active: newMessage.trim() || selectedFiles.length > 0 }]"
            :disabled="(!newMessage.trim() && selectedFiles.length === 0) || sending"
          >
            <i class="fas fa-paper-plane"></i>
          </button>
        </form>
      </div>

      <!-- Панель участников (скрыта от подписчиков в канале и для личных чатов) -->
      <ParticipantsPanel
        v-if="showParticipants && !isDirectChat && (isOwner || isAdmin || !isChannel)"
        :participants="participants"
        :current-user-id="ctx.user?.id"
        :is-channel="isChannel"
        :is-direct-chat="isDirectChat"
        :can-manage="canManage"
        :is-owner="isOwner"
        :participants-moderations="participantsModerations"
        @close="showParticipants = false"
        @invite="showInviteModal = true"
        @remove-participant="removeParticipant"
        @update-role="updateParticipantRole"
        @moderate="openModerationModal"
        @remove-moderation="removeModeration"
        @direct-chat-created="onDirectChatCreated"
      />

      <!-- Модальное окно дополнительного меню -->
      <Teleport to="body">
        <div
          v-if="activeModal === 'extra-menu'"
          class="chat-modal-overlay"
          @click="activeModal = null"
        >
          <div class="chat-modal-content mobile-extra-menu" @click.stop>
            <h2 class="modal-title" style="font-size: 18px">Меню</h2>
            <div class="extra-menu-list">
              <button
                v-if="isMobile && canManage"
                @click="
                  showSearch = true
                  activeModal = null
                "
                class="extra-menu-item"
              >
                <i class="fas fa-search"></i>
                <span>Поиск</span>
              </button>
              <button
                v-if="isMobile && canManage && !isDirectChat"
                @click="
                  showInviteModal = true
                  activeModal = null
                "
                class="extra-menu-item"
              >
                <i class="fas fa-user-plus"></i>
                <span>Пригласить</span>
              </button>
              <button
                v-if="isMobile && !isDirectChat && (isOwner || isAdmin || !isChannel)"
                @click="
                  showParticipants = !showParticipants
                  activeModal = null
                "
                class="extra-menu-item"
              >
                <i class="fas fa-users"></i>
                <span>{{ isChannel ? 'Подписчики' : 'Участники' }}</span>
              </button>
              <button @click="activeModal = 'info'" class="extra-menu-item">
                <i class="fas fa-info-circle"></i>
                <span>Информация о чате</span>
              </button>
              <button
                v-if="isWorkspaceAdmin && chat?.type === 'group'"
                @click="
                  showAgentsModal = true
                  activeModal = null
                "
                class="extra-menu-item"
              >
                <i class="fas fa-robot"></i>
                <span>Агенты</span>
              </button>
              <button
                @click="
                  openAddToFolderFromChat()
                  activeModal = null
                "
                class="extra-menu-item"
              >
                <i class="fas fa-folder-plus"></i>
                <span>Добавить в папку</span>
              </button>
              <div class="extra-menu-divider"></div>
              <button @click="activeModal = null" class="btn-secondary" style="margin-top: 8px">
                Закрыть
              </button>
            </div>
          </div>
        </div>
      </Teleport>

      <!-- Модальное окно редактирования чата -->
      <Teleport to="body">
        <div v-if="activeModal === 'edit'" class="chat-modal-overlay" @click="activeModal = null">
          <div class="chat-modal-content" @click.stop>
            <h2 class="modal-title">Редактировать чат</h2>
            <form @submit.prevent="updateChatFromEdit">
              <!-- Аватарка чата -->
              <div class="form-group">
                <label>Аватар чата</label>
                <div class="chat-avatar-edit">
                  <div
                    class="current-chat-avatar"
                    :style="getChatEditAvatarStyle()"
                    @click="showChatAvatarModal = true"
                    style="cursor: pointer"
                  >
                    <span v-if="!hasChatEditAvatar()">{{ getChatInitials(editChat.title) }}</span>
                    <div class="avatar-overlay">
                      <i class="fas fa-camera"></i>
                    </div>
                  </div>
                </div>
                <span class="field-hint">Нажмите на аватар, чтобы изменить фото</span>
              </div>

              <div class="form-group">
                <label>Название</label>
                <input v-model="editChat.title" type="text" required />
              </div>
              <div class="form-group">
                <label>Описание</label>
                <textarea v-model="editChat.description" rows="3"></textarea>
              </div>
              <div v-if="isWorkspaceAdmin" class="form-group checkbox">
                <input v-model="editChat.isPublic" type="checkbox" id="editIsPublic" />
                <label for="editIsPublic">Публичный чат</label>
              </div>
              <div class="modal-actions">
                <button type="button" @click="activeModal = null" class="btn-secondary">
                  Отмена
                </button>
                <button type="submit" :disabled="chatAvatarUploading" class="btn-primary">
                  <i v-if="chatAvatarUploading" class="fas fa-spinner fa-spin"></i>
                  <span v-else>Сохранить</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </Teleport>

      <!-- Модальное окно приглашения участников -->
      <InviteModal
        v-if="showInviteModal"
        :chat-id="chat?.id"
        @close="showInviteModal = false"
        @invited="onInvited"
      />

      <!-- Модальное окно пересылки сообщения (одиночное) -->
      <ForwardMessageModal
        v-if="forwardingMessage && forwardingMessages.length === 0"
        :message="forwardingMessage"
        :chats="chatsList"
        :source-chat="chat"
        @close="forwardingMessage = null"
        @forward="onMessageForwarded"
      />

      <!-- Модальное окно пересылки нескольких сообщений -->
      <ForwardMessageModal
        v-if="forwardingMessages.length > 0"
        :messages="forwardingMessages"
        :chats="chatsList"
        :source-chat="chat"
        @close="forwardingMessages = []"
        @forward="onMessagesForwarded"
      />

      <!-- Модальное окно с информацией о чате -->
      <Teleport to="body">
        <div v-if="activeModal === 'info'" class="chat-modal-overlay" @click="activeModal = null">
          <div class="chat-modal-content chat-info-modal" @click.stop>
            <div class="chat-info-header">
              <button @click="activeModal = null" class="chat-info-close-btn" title="Закрыть">
                <i class="fas fa-times"></i>
              </button>
              <div class="chat-info-avatar-wrapper">
                <div class="chat-info-avatar" :style="getChatInfoAvatarStyle()">
                  <span v-if="!hasChatInfoAvatar()">{{
                    getChatInitials(chat?.displayTitle || chat?.title)
                  }}</span>
                </div>
                <div class="chat-info-overlay">
                  <h2 class="chat-info-title">
                    <i v-if="chat?.type === 'group'" class="fas fa-users" title="Групповой чат"></i>
                    <i
                      v-else-if="chat?.type === 'channel'"
                      class="fas fa-bullhorn"
                      title="Канал"
                    ></i>
                    <span>{{ chat?.displayTitle || chat?.title }}</span>
                    <i
                      v-if="chat?.isPaid"
                      class="fas fa-crown paid-chat-icon"
                      title="Платный чат"
                    ></i>
                  </h2>
                  <p v-if="chat?.type !== 'direct'" class="chat-info-type">
                    {{ getChatTypeLabel(chat?.type) }}
                  </p>
                </div>
              </div>
            </div>

            <div class="chat-info-section" v-if="chat?.description && chat?.type !== 'direct'">
              <h3>Описание</h3>
              <p class="chat-info-description">{{ chat.description }}</p>
            </div>

            <!-- Секция участников (не для личных чатов) -->
            <div
              v-if="!isDirectChat && (isOwner || isAdmin || !isChannel)"
              class="chat-info-section"
            >
              <h3>{{ isChannel ? 'Подписчики' : 'Участники' }} ({{ participants.length }})</h3>
              <div class="chat-info-participants">
                <div v-for="p in participants.slice(0, 5)" :key="p.id" class="mini-participant">
                  <div class="mini-avatar" :style="getParticipantAvatarStyle(p)">
                    {{ getParticipantInitials(p) }}
                  </div>
                  <span>{{ getUserName(p.userId) }}</span>
                </div>
                <div v-if="participants.length > 5" class="more-participants">
                  +{{ participants.length - 5 }} ещё
                </div>
              </div>
              <button
                v-if="isOwner"
                @click="
                  activeModal = null
                  showInviteModal = true
                "
                class="btn-primary btn-full"
                style="margin-bottom: 8px"
              >
                <i class="fas fa-user-plus"></i>
                {{ isChannel ? 'Пригласить подписчика' : 'Пригласить участника' }}
              </button>
              <div
                v-if="canManage"
                style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #f0f2f5"
              >
                <button
                  @click="activeModal = 'edit'"
                  class="btn-secondary btn-full"
                  style="margin-bottom: 8px"
                >
                  <i class="fas fa-pen"></i>
                  Редактировать чат
                </button>
                <!-- Настройки подписок только для администраторов воркспейса -->
                <button
                  v-if="isWorkspaceAdmin"
                  @click.stop.prevent="openSubscriptionModal"
                  class="btn-secondary btn-full"
                  style="margin-bottom: 8px"
                >
                  <i class="fas fa-credit-card"></i>
                  {{ chat?.isPaid ? 'Настройки подписок' : 'Сделать платным' }}
                </button>
                <button
                  v-if="isWorkspaceAdmin && chat?.type === 'group'"
                  @click="
                    showAgentsModal = true
                    activeModal = null
                  "
                  class="btn-secondary btn-full"
                  style="margin-bottom: 8px"
                >
                  <i class="fas fa-robot"></i>
                  Агенты
                </button>
              </div>
            </div>

            <div class="chat-info-footer">
              <button
                v-if="isMember && !isOwner && chat?.type === 'direct'"
                @click="blockUserFromChat"
                :disabled="blocking"
                class="btn-danger btn-full"
                style="margin-bottom: 8px"
              >
                <i class="fas fa-ban"></i>
                {{ blocking ? 'Блокировка...' : 'Заблокировать пользователя' }}
              </button>
              <button
                v-if="isMember && !isOwner"
                @click="leaveChat"
                class="btn-warning btn-full"
                style="margin-bottom: 8px"
              >
                <i class="fas" :class="isChannel ? 'fa-bell-slash' : 'fa-sign-out-alt'"></i>
                {{ isChannel ? 'Отписаться от канала' : 'Выйти из чата' }}
              </button>
              <button
                @click="activeModal = null"
                class="btn-secondary btn-full"
                style="margin-bottom: 8px"
              >
                Закрыть
              </button>
              <button v-if="isOwner" @click="deleteChatFromInfo" class="btn-danger btn-full">
                <i class="fas fa-trash"></i>
                Удалить чат
              </button>
            </div>
          </div>
        </div>
      </Teleport>

      <!-- Панель поиска в чате -->
      <ChatSearchPanel
        v-if="showSearch"
        :feed-id="feedId"
        @close="showSearch = false"
        @go-to-message="scrollToMessage"
      />

      <!-- Мобильное меню действий с сообщением -->
      <MessageActionsMenu
        v-if="mobileMessageMenu.show"
        :show="mobileMessageMenu.show"
        :message="mobileMessageMenu.message"
        :current-user-id="ctx.user?.id"
        :can-manage="canManage"
        :is-channel="isChannel"
        @close="mobileMessageMenu.show = false"
        @reply="replyToMessage(mobileMessageMenu.message)"
        @select="enterSelectionMode(mobileMessageMenu.message)"
        @forward="forwardMessage(mobileMessageMenu.message)"
        @copy-text="copyMessageText(mobileMessageMenu.message)"
        @pin="pinMessage(mobileMessageMenu.message)"
        @edit="editMessage(mobileMessageMenu.message)"
        @delete="deleteMessage(mobileMessageMenu.message.id)"
        @toggle-reaction="(emoji) => toggleReaction(mobileMessageMenu.message, emoji)"
      />

      <!-- Модальное окно профиля пользователя -->
      <UserProfileModal
        v-if="selectedUserProfile"
        :user="selectedUserProfile.user"
        :user-id="selectedUserProfile.userId"
        @close="selectedUserProfile = null"
        @start-chat="onUserProfileStartChat"
      />

      <!-- Модальное окно профиля чата (источника пересылки) -->
      <ChatProfileModal
        v-if="selectedChatProfile"
        :chat-id="selectedChatProfile.feedId"
        :chat-title="selectedChatProfile.title"
        :chat-type="selectedChatProfile.type"
        :chat-description="selectedChatProfile.description"
        :avatar-hash="selectedChatProfile.avatarHash"
        :is-public="selectedChatProfile.isPublic"
        :is-paid="selectedChatProfile.isPaid"
        @close="selectedChatProfile = null"
        @go-to-chat="onChatProfileGoToChat"
      />

      <!-- Модальное окно настроек подписок -->
      <Teleport to="body">
        <div
          v-if="activeModal === 'subscription'"
          class="chat-modal-overlay"
          @click="activeModal = null"
        >
          <div class="chat-modal-content subscription-settings-modal" @click.stop>
            <div
              class="modal-header"
              style="
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 16px 20px;
                border-bottom: 1px solid var(--border-color);
              "
            >
              <h3 style="margin: 0; font-size: 18px; font-weight: 600">Настройки подписок</h3>
              <button
                @click="activeModal = null"
                class="btn-close"
                style="
                  background: none;
                  border: none;
                  font-size: 20px;
                  color: var(--text-secondary);
                  cursor: pointer;
                "
              >
                <i class="fas fa-times"></i>
              </button>
            </div>
            <div style="padding: 20px">
              <SubscriptionPlansSettings :can-manage="isWorkspaceAdmin" />
            </div>
          </div>
        </div>
      </Teleport>

      <!-- Модалка добавления в папку из чата -->
      <AddToFolderModal
        :is-open="addToFolderModalOpen"
        :folders="customFolders"
        :chat-id="feedId"
        :chat-folder-ids="chatFolderIds"
        @close="addToFolderModalOpen = false"
        @toggle-folder="toggleChatInFolderFromChat"
        @create-folder="createFolderFromChat"
      />

      <!-- Модалка модерации участника -->
      <ModerationModal
        v-if="moderatingUser"
        :is-open="showModerationModal"
        :feed-id="feedId"
        :user-id="moderatingUser.userId"
        :user-name="getUserName(moderatingUser.userId)"
        @close="
          showModerationModal = false
          moderatingUser = null
        "
        @applied="onModerationApplied"
      />

      <!-- Модалка управления агентами -->
      <ChatAgentsModal
        v-if="showAgentsModal"
        :feed-id="feedId"
        :chat-id="chat?.id"
        @close="showAgentsModal = false"
        @agent-added="loadChat"
        @agent-removed="loadChat"
      />

      <!-- Модалка обрезки аватара чата -->
      <AvatarCropperModal
        :is-open="showChatAvatarModal"
        title="Выберите аватар чата"
        save-button-text="Сохранить аватар"
        :current-avatar-hash="editChat.avatarHash"
        @close="showChatAvatarModal = false"
        @save="onChatAvatarSaved"
        @remove="onChatAvatarRemoved"
      />

      <!-- Пикер эмодзи для поля ввода -->
      <div
        v-if="showEmojiPickerPopup"
        ref="emojiPickerPopup"
        class="emoji-picker-input-popup"
        :style="{ top: emojiPickerPosition.y + 'px', left: emojiPickerPosition.x + 'px' }"
        @click.stop
      >
        <div class="emoji-categories-tabs">
          <button
            v-for="cat in emojiCategories"
            :key="cat.id"
            :class="['emoji-cat-btn', { active: emojiPickerCategory === cat.id }]"
            @click="emojiPickerCategory = cat.id"
            :title="cat.name"
          >
            {{ cat.icon }}
          </button>
        </div>
        <div class="emoji-picker-grid">
          <button
            v-for="emoji in currentInputEmojiCategoryEmojis"
            :key="emoji"
            class="emoji-picker-emoji"
            @click="insertEmoji(emoji)"
          >
            {{ emoji }}
          </button>
        </div>
      </div>

      <!-- Mention picker -->
      <MentionPicker
        :show="showMentionPicker"
        :participants="participants"
        :search-query="mentionSearchQuery"
        :position="mentionPosition"
        :textarea-rect="mentionTextareaRect"
        @select="insertMention"
        @close="showMentionPicker = false"
      />
    </template>

    <!-- Загрузка -->
    <div
      v-else-if="accessCheck.loading"
      class="empty-chat"
      style="
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
      "
    >
      <i
        class="fas fa-spinner fa-spin"
        style="font-size: 32px; margin-bottom: 16px; color: var(--primary-color)"
      ></i>
      <p>Проверка доступа...</p>
    </div>

    <!-- Ошибка -->
    <div
      v-else
      class="empty-chat"
      style="
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
      "
    >
      <i
        class="fas fa-exclamation-circle"
        style="font-size: 32px; margin-bottom: 16px; color: #ef4444"
      ></i>
      <p>Не удалось загрузить чат</p>
      <button @click="$emit('back')" class="btn-secondary" style="margin-top: 16px">
        <i class="fas fa-arrow-left"></i> Назад к чатам
      </button>
    </div>

    <!-- Контекстное меню -->
    <div
      v-if="contextMenu.show"
      ref="contextMenuElement"
      class="context-menu"
      :style="{ top: contextMenu.y + 'px', left: contextMenu.x + 'px' }"
      @click.stop
    >
      <!-- Быстрые реакции (как в Telegram) -->
      <div class="quick-reactions">
        <button
          v-for="emoji in quickReactions"
          :key="emoji"
          class="quick-reaction-btn"
          @click.stop="
            toggleReaction(contextMenu.message, emoji)
            closeContextMenu()
          "
          :title="'Отреагировать ' + emoji"
        >
          {{ emoji }}
        </button>
        <button class="quick-reaction-btn more" @click.stop="toggleEmojiPicker" title="Ещё реакции">
          <i
            class="fas"
            :class="contextMenu.showEmojiPicker ? 'fa-chevron-up' : 'fa-chevron-down'"
          ></i>
        </button>
      </div>

      <!-- Полный пикер реакций (аккордеон) -->
      <div v-if="contextMenu.showEmojiPicker" class="emoji-picker-accordion">
        <div class="emoji-categories-tabs">
          <button
            v-for="cat in emojiCategories"
            :key="cat.id"
            :class="['emoji-cat-btn', { active: contextMenu.emojiCategory === cat.id }]"
            @click.stop="contextMenu.emojiCategory = cat.id"
            :title="cat.name"
          >
            {{ cat.icon }}
          </button>
        </div>
        <div class="emoji-picker-grid">
          <button
            v-for="emoji in currentEmojiCategoryEmojis"
            :key="emoji"
            class="emoji-picker-emoji"
            @click.stop="
              toggleReaction(contextMenu.message, emoji)
              closeContextMenu()
            "
          >
            {{ emoji }}
          </button>
        </div>
      </div>

      <div class="context-menu-divider"></div>

      <!-- Список текущих реакций (показываем только когда загружено) -->
      <div
        v-if="!contextMenu.reactionsLoading && contextMenu.reactions.length > 0"
        class="context-menu-reactions"
      >
        <div class="context-menu-reactions-header">
          <i class="far fa-smile"></i>
          Реакции ({{ contextMenu.reactionsTotal }})
        </div>
        <div class="context-menu-reactions-list">
          <div
            v-for="reaction in contextMenu.reactions.slice(0, 5)"
            :key="reaction.userId + reaction.emoji"
            class="context-menu-reaction-item"
          >
            <span class="reaction-emoji">{{ reaction.emoji }}</span>
            <span class="reaction-user">{{ reaction.userName }}</span>
            <span class="reaction-time">{{ formatReactionDate(reaction.createdAt) }}</span>
          </div>
          <div
            v-if="contextMenu.reactions.length > 5"
            class="reactions-view-all"
            @click.stop="showAllReactions(contextMenu.message)"
          >
            Показать все {{ contextMenu.reactionsTotal }} реакций...
          </div>
        </div>
        <div class="context-menu-divider"></div>
      </div>

      <button
        @click="
          replyToMessage(contextMenu.message)
          closeContextMenu()
        "
      >
        <i class="fas fa-reply"></i> Ответить
      </button>
      <button
        @click="
          enterSelectionMode(contextMenu.message)
          closeContextMenu()
        "
      >
        <i class="fas fa-check-square"></i> Выбрать
      </button>
      <button
        @click="
          forwardMessage(contextMenu.message)
          closeContextMenu()
        "
      >
        <i class="fas fa-share"></i> Переслать
      </button>
      <button
        v-if="contextMenu.message?.text"
        @click="
          copyMessageText(contextMenu.message)
          closeContextMenu()
        "
      >
        <i class="fas fa-copy"></i> Копировать текст
      </button>
      <button
        v-if="canManage"
        @click="
          pinMessage(contextMenu.message)
          closeContextMenu()
        "
      >
        <i class="fas fa-thumbtack"></i> Закрепить
      </button>
      <button
        v-if="isOwnMessage(contextMenu.message)"
        @click="
          editMessage(contextMenu.message)
          closeContextMenu()
        "
      >
        <i class="fas fa-pen"></i> Редактировать
      </button>
      <div class="context-menu-divider"></div>
      <button
        v-if="isOwner || isOwnMessage(contextMenu.message)"
        @click="
          deleteMessage(contextMenu.message.id)
          closeContextMenu()
        "
        class="danger"
      >
        <i class="fas fa-trash"></i> Удалить
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, nextTick, watch, reactive } from 'vue'
import AddToFolderModal from './AddToFolderModal.vue'
import ChatAgentsModal from './ChatAgentsModal.vue'
import MentionPicker from './MentionPicker.vue'
import MentionIndicator from './MentionIndicator.vue'
import Modal from './Modal.vue'
import SubscriptionPlansSettings from './SubscriptionPlansSettings.vue'
import ParticipantsPanel from './ParticipantsPanel.vue'
import ForwardedFrom from './ForwardedFrom.vue'
import ChatProfileModal from './ChatProfileModal.vue'
import {
  apiChatGetRoute,
  apiChatUpdateRoute,
  apiChatDeleteRoute,
  apiChatJoinRoute,
  apiChatCheckJoinRoute
} from '../api/chats'
import { apiParticipantsRemoveRoute, apiParticipantsUpdateRoleRoute } from '../api/participants'
import { apiChatLeaveRoute, apiChannelUnsubscribeRoute } from '../api/chat-actions'
import { apiBlockedUsersBlockRoute } from '../api/blocked-users'
import {
  apiMessagesListRoute,
  apiMessagesSendRoute,
  apiMessagesEditRoute,
  apiMessagesDeleteRoute,
  apiMessagesAroundRoute,
  apiMessagesAfterRoute
} from '../api/messages'
import { apiPinnedSetRoute, apiPinnedGetRoute } from '../api/pinned'
import { apiReactionsDetailsRoute } from '../api/reactions'
import { apiTypingStartRoute, apiTypingStopRoute } from '../api/typing'
import { apiReadReceiptsMarkRoute } from '../api/read-receipts'
import { apiFilesUploadRoute, apiFilesGetUploadUrlRoute } from '../api/files'
import { apiInboxBadgeResetRoute } from '../api/inbox-badges'
import { apiModerationCheckRoute, apiModerationRemoveRoute } from '../api/moderation'
import { apiReadMentionsGetRoute, apiReadMentionsMarkRoute } from '../api/read-mentions'
import { useChatSocket } from '../composables/useChatSocket'
import { useSmartPosition } from '../composables/useSmartPosition'
import InviteModal from './InviteModal.vue'
import ForwardMessageModal from './ForwardMessageModal.vue'
import TypingIndicator from './TypingIndicator.vue'
import PinnedMessage from './PinnedMessage.vue'
import ReadReceipts from './ReadReceipts.vue'
import MessageReply from './MessageReply.vue'
import MessageFiles from './MessageFiles.vue'
import AttachMenu from './AttachMenu.vue'
import ChatSearchPanel from './ChatSearchPanel.vue'
import MessageActionsMenu from './MessageActionsMenu.vue'
import MarkdownMessage from './MarkdownMessage.vue'
import ParticipantDirectChat from './ParticipantDirectChat.vue'
import UserProfileModal from './UserProfileModal.vue'
import DateDivider from './DateDivider.vue'
import ModerationModal from './ModerationModal.vue'
import AvatarCropperModal from './AvatarCropperModal.vue'
import {
  apiChatFoldersListRoute,
  apiChatFoldersGetForChatRoute,
  apiChatFoldersAddChatRoute,
  apiChatFoldersRemoveChatRoute
} from '../api/chat-folders'
import { useChatAccess } from '../composables/useChatAccess'
import { useMessageSync } from '../composables/useMessageSync'
import SubscriptionRequired from './SubscriptionRequired.vue'
import { getOrCreateBrowserSocketClient } from '@app/socket'

const props = defineProps({
  feedId: String,
  chatsList: Array,
  userSocketId: String,
  targetMessageId: String
})

const emit = defineEmits([
  'back',
  'select-chat',
  'profile',
  'create-chat',
  'message-viewed',
  'chat-updated',
  'badge-reset'
])

// Доступ к чату (особенно для платных)
const { accessCheck, checkAccess, reset: resetAccess } = useChatAccess()

const chat = ref(null)
const participants = ref([])
const messages = ref([])
const pinnedMessage = ref(null)
const typingUsers = ref([])
const readReceipts = ref({})

const sortedMessages = computed(() => {
  return [...messages.value].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
})

const sending = ref(false)
const loadingMore = ref(false)
const hasMoreMessages = ref(true)
const newMessage = ref('')
const editingMessage = ref(null)
const replyingTo = ref(null)
const forwardingMessage = ref(null)
const forwardingMessages = ref([]) // Для пересылки нескольких сообщений
const showParticipants = ref(false)

// Состояние выбора сообщений
const selectedMessageIds = ref(new Set())
const isSelectionMode = ref(false)
const showInviteModal = ref(false)
const showAttachMenu = ref(false)
const showEmojiPicker = ref(false)
const showSearch = ref(false)

// Универсальная модалка - единое состояние для всех модальных окон
const activeModal = ref(null) // 'info' | 'edit' | 'subscription' | 'extra-menu' | null
const showAgentsModal = ref(false)
const mobileMessageMenu = ref({ show: false, message: null })
const addToFolderModalOpen = ref(false)
const customFolders = ref([])
const chatFolderIds = ref([])
const myModeration = ref(null)
const isBanned = ref(false)
const banInfo = ref(null)
const showModerationModal = ref(false)
const moderatingUser = ref(null)
const participantsModerations = ref(new Map())

const messagesContainer = ref(null)
const loadMoreAnchor = ref(null)
const isMobile = ref(false)
let loadMoreObserver = null
let typingTimeout = null
let isTypingActive = false
let readObserver = null
let contextMenuCloseHandler = null
let markAsReadTimeout = null
const pendingReadMessages = ref(new Set())
const sentReadMessages = ref(new Set())

// Загрузка прочитанных упоминаний с сервера
async function loadReadMentionsFromServer() {
  try {
    const result = await apiReadMentionsGetRoute({ feedId: props.feedId }).run(ctx)
    if (result.mentions && Array.isArray(result.mentions)) {
      result.mentions.forEach((m) => sentReadMessages.value.add(m.messageId))
    }
  } catch (e) {
    console.error('Failed to load read mentions from server:', e)
  }
}

// Сохранение прочитанных упоминаний на сервер
async function saveReadMentionsToServer(messageIds) {
  try {
    await apiReadMentionsMarkRoute({ feedId: props.feedId }).run(ctx, { messageIds })
  } catch (e) {
    console.error('Failed to save read mentions to server:', e)
  }
}
const messageInput = ref(null)
const contextMenuElement = ref(null)

const { calculatePositionFromPoint } = useSmartPosition()
const maxInputRows = 5
const lineHeight = 24

const contextMenu = ref({
  show: false,
  x: 0,
  y: 0,
  message: null,
  reactions: [],
  reactionsLoading: false,
  reactionsTotal: 0,
  showEmojiPicker: false,
  emojiCategory: 'recent'
})

// Быстрые реакции (как в Telegram)
const quickReactions = ['👍', '❤️', '😂', '😮', '😢', '🎉', '💩']

// Категории эмодзи для пикера
const emojiCategories = [
  { id: 'recent', name: 'Недавние', icon: '🕐' },
  { id: 'popular', name: 'Популярные', icon: '🔥' },
  { id: 'smileys', name: 'Смайлики', icon: '😀' },
  { id: 'hearts', name: 'Сердечки', icon: '❤️' },
  { id: 'gestures', name: 'Жесты', icon: '👍' },
  { id: 'animals', name: 'Животные', icon: '🐱' },
  { id: 'food', name: 'Еда', icon: '🍎' },
  { id: 'travel', name: 'Путешествия', icon: '🚗' },
  { id: 'activities', name: 'Активности', icon: '⚽' },
  { id: 'objects', name: 'Объекты', icon: '💡' },
  { id: 'symbols', name: 'Символы', icon: '❓' },
  { id: 'flags', name: 'Флаги', icon: '🏳️' }
]

// Эмодзи по категориям (расширенный набор)
const emojisByCategory = {
  recent: [
    '👍',
    '❤️',
    '😂',
    '😮',
    '😢',
    '🎉',
    '💩',
    '👏',
    '🔥',
    '🤔',
    '👎',
    '😡',
    '🥳',
    '😍',
    '🤣',
    '🙏',
    '✨',
    '💯',
    '👌',
    '💔',
    '🫶',
    '😭',
    '😤',
    '🤯',
    '🥺',
    '👀',
    '💅',
    '🙈',
    '🤷',
    '🥰',
    '😎'
  ],
  popular: [
    '👍',
    '❤️',
    '😂',
    '😮',
    '😢',
    '🎉',
    '💩',
    '👏',
    '🔥',
    '🤔',
    '👎',
    '😡',
    '🥳',
    '😍',
    '🤣',
    '🙏',
    '✨',
    '💯',
    '👌',
    '🕊️',
    '🫡',
    '🫶',
    '❤️‍🔥',
    '💔',
    '♥️',
    '💙',
    '💚',
    '💛',
    '🖤',
    '🤍',
    '🤎',
    '😭',
    '🥺',
    '😤',
    '🤯',
    '🥰',
    '😎',
    '🤩',
    '🥵',
    '🥶',
    '🤠',
    '🤡',
    '👀',
    '🙈',
    '🙉',
    '🙊',
    '💅',
    '🤷',
    '🤦',
    '🙋',
    '🙌',
    '🤲',
    '🤳',
    '💪',
    '🦾',
    '🦿',
    '🦵',
    '🦶',
    '👂',
    '🦻',
    '👃',
    '🧠',
    '🫀',
    '🫁',
    '🦷',
    '🦴',
    '👅',
    '👄',
    '💋',
    '🩸',
    '👶',
    '👧',
    '🧒',
    '👦',
    '👩',
    '🧑',
    '👨',
    '👩‍🦱',
    '🧑‍🦱',
    '👨‍🦱',
    '👩‍🦰',
    '🧑‍🦰',
    '👨‍🦰',
    '👱‍♀️',
    '👱',
    '👱‍♂️',
    '👩‍🦳',
    '🧑‍🦳',
    '👨‍🦳',
    '👩‍🦲',
    '🧑‍🦲',
    '👨‍🦲',
    '🧔‍♀️',
    '🧔',
    '🧔‍♂️',
    '👵',
    '🧓',
    '👴'
  ],
  smileys: [
    '😀',
    '😃',
    '😄',
    '😁',
    '😅',
    '😂',
    '🤣',
    '🥲',
    '☺️',
    '😊',
    '😇',
    '🙂',
    '🙃',
    '😉',
    '😌',
    '😍',
    '🥰',
    '😘',
    '😗',
    '☺️',
    '😚',
    '😋',
    '😛',
    '😝',
    '😜',
    '🤪',
    '🤨',
    '🧐',
    '🤓',
    '😎',
    '🥸',
    '🤩',
    '🥳',
    '😏',
    '😒',
    '😞',
    '😔',
    '😟',
    '😕',
    '🙁',
    '☹️',
    '😣',
    '😖',
    '😫',
    '😩',
    '🥺',
    '😢',
    '😭',
    '😤',
    '😠',
    '😡',
    '🤬',
    '🤯',
    '😳',
    '🥵',
    '🥶',
    '😱',
    '😨',
    '😰',
    '😥',
    '😓',
    '🤗',
    '🤔',
    '🤭',
    '🤫',
    '🤥',
    '😶',
    '😐',
    '😑',
    '😬',
    '🙄',
    '😯',
    '😦',
    '😧',
    '😮',
    '😲',
    '🥱',
    '😴',
    '🤤',
    '😪',
    '😵',
    '🤐',
    '🥴',
    '🤢',
    '🤮',
    '🤧',
    '😷',
    '🤒',
    '🤕',
    '🤑',
    '🤠',
    '😈',
    '👿',
    '👹',
    '👺',
    '🤡',
    '💩',
    '👻',
    '💀',
    '☠️',
    '👽',
    '👾',
    '🤖',
    '🎃',
    '😺',
    '😸',
    '😹',
    '😻',
    '😼',
    '😽',
    '🙀',
    '😿',
    '😾'
  ],
  hearts: [
    '❤️',
    '🧡',
    '💛',
    '💚',
    '💙',
    '💜',
    '🖤',
    '🤍',
    '🤎',
    '💔',
    '❣️',
    '💕',
    '💞',
    '💓',
    '💗',
    '💖',
    '💘',
    '💝',
    '💟',
    '☮️',
    '✝️',
    '☪️',
    '🕉',
    '☸️',
    '✡️',
    '🔯',
    '🕎',
    '☯️',
    '☦️',
    '🛐',
    '⛎',
    '♈️',
    '♉️',
    '♊️',
    '♋️',
    '♌️',
    '♍️',
    '♎️',
    '♏️',
    '♐️',
    '♑️',
    '♒️',
    '♓️',
    '🆔',
    '⚛️',
    '🉑',
    '☢️',
    '☣️',
    '📴',
    '📳',
    '🈶',
    '🈚️',
    '🈸',
    '🈺',
    '🈷️',
    '✴️',
    '🆚',
    '💮',
    '🉐',
    '㊙️',
    '㊗️',
    '🈴',
    '🈵',
    '🈹',
    '🈲',
    '🅰️',
    '🅱️',
    '🆎',
    '🆑',
    '🅾️',
    '🆘',
    '❌',
    '⭕️',
    '🛑',
    '⛔️',
    '📛',
    '🚫',
    '💯',
    '💢',
    '♨️',
    '🚷',
    '🚯',
    '🚳',
    '🚱',
    '🔞',
    '📵',
    '🚭',
    '❗️',
    '❕',
    '❓',
    '❔',
    '‼️',
    '⁉️',
    '🔅',
    '🔆',
    '〽️',
    '⚠️',
    '🚸',
    '🔱',
    '⚜️',
    '🔰',
    '♻️',
    '✅',
    '🈯️',
    '💹',
    '❇️',
    '✳️',
    '❎',
    '🌐',
    '💠',
    'Ⓜ️',
    '🌀',
    '💤',
    '🏧',
    '🚾',
    '♿️',
    '🅿️',
    '🈳',
    '🈂️',
    '🛂',
    '🛃',
    '🛄',
    '🛅',
    '🛗'
  ],
  gestures: [
    '👍',
    '👎',
    '👌',
    '🤌',
    '🤏',
    '✌️',
    '🤞',
    '🫰',
    '🤟',
    '🤘',
    '🤙',
    '👈',
    '👉',
    '👆',
    '🖕',
    '👇',
    '☝️',
    '👋',
    '🤚',
    '🖐️',
    '✋',
    '🫱',
    '🫲',
    '🫳',
    '🫴',
    '🫷',
    '🫸',
    '🖖',
    '👏',
    '🙌',
    '👐',
    '🤲',
    '🤝',
    '🙏',
    '✍️',
    '💪',
    '🦾',
    '🦿',
    '🦵',
    '🦶',
    '👂',
    '🦻',
    '👃',
    '🧠',
    '🫀',
    '🫁',
    '🦷',
    '🦴',
    '👀',
    '👁️',
    '👅',
    '👄',
    '💋',
    '🩸',
    '👶',
    '🧒',
    '👦',
    '👧',
    '🧑',
    '👱',
    '👨',
    '🧔',
    '🧔‍♂️',
    '🧔‍♀️',
    '👨‍🦰',
    '👨‍🦱',
    '👨‍🦲',
    '👨‍🦳',
    '👩',
    '👩‍🦰',
    '🧑‍🦰',
    '👩‍🦱',
    '🧑‍🦱',
    '👩‍🦲',
    '🧑‍🦲',
    '👩‍🦳',
    '🧑‍🦳',
    '👱‍♀️',
    '👱‍♂️',
    '🧓',
    '👴',
    '👵',
    '🙍',
    '🙍‍♂️',
    '🙍‍♀️',
    '🙎',
    '🙎‍♂️',
    '🙎‍♀️',
    '🙅',
    '🙅‍♂️',
    '🙅‍♀️',
    '🙆',
    '🙆‍♂️',
    '🙆‍♀️',
    '💁',
    '💁‍♂️',
    '💁‍♀️',
    '🙋',
    '🙋‍♂️',
    '🙋‍♀️',
    '🧏',
    '🧏‍♂️',
    '🧏‍♀️',
    '🙇',
    '🙇‍♂️',
    '🙇‍♀️',
    '🤦',
    '🤦‍♂️',
    '🤦‍♀️',
    '🤷',
    '🤷‍♂️',
    '🤷‍♀️',
    '🧑‍⚕️',
    '👨‍⚕️',
    '👩‍⚕️',
    '🧑‍🎓',
    '👨‍🎓',
    '👩‍🎓',
    '🧑‍🏫',
    '👨‍🏫',
    '👩‍🏫',
    '🧑‍⚖️',
    '👨‍⚖️',
    '👩‍⚖️',
    '🧑‍🌾',
    '👨‍🌾',
    '👩‍🌾',
    '🧑‍🍳',
    '👨‍🍳',
    '👩‍🍳',
    '🧑‍🔧',
    '👨‍🔧',
    '👩‍🔧',
    '🧑‍🏭',
    '👨‍🏭',
    '👩‍🏭',
    '🧑‍💼',
    '👨‍💼',
    '👩‍💼',
    '🧑‍🔬',
    '👨‍🔬',
    '👩‍🔬',
    '🧑‍💻',
    '👨‍💻',
    '👩‍💻',
    '🧑‍🎤',
    '👨‍🎤',
    '👩‍🎤',
    '🧑‍🎨',
    '👨‍🎨',
    '👩‍🎨',
    '🧑‍✈️',
    '👨‍✈️',
    '👩‍✈️',
    '🧑‍🚀',
    '👨‍🚀',
    '👩‍🚀',
    '🧑‍🚒',
    '👨‍🚒',
    '👩‍🚒',
    '👮',
    '👮‍♂️',
    '👮‍♀️',
    '🕵️',
    '🕵️‍♂️',
    '🕵️‍♀️',
    '💂',
    '💂‍♂️',
    '💂‍♀️',
    '🥷',
    '👷',
    '👷‍♂️',
    '👷‍♀️',
    '🫅',
    '🤴',
    '👸',
    '👳',
    '👳‍♂️',
    '👳‍♀️',
    '👲',
    '🧕',
    '🤵',
    '🤵‍♂️',
    '🤵‍♀️',
    '👰',
    '👰‍♂️',
    '👰‍♀️',
    '🤰',
    '🫄',
    '🫃',
    '🤱',
    '👩‍🍼',
    '👨‍🍼',
    '🧑‍🍼',
    '👼',
    '🎅',
    '🤶',
    '🧑‍🎄',
    '🦸',
    '🦸‍♂️',
    '🦸‍♀️',
    '🦹',
    '🦹‍♂️',
    '🦹‍♀️',
    '🧙',
    '🧙‍♂️',
    '🧙‍♀️',
    '🧚',
    '🧚‍♂️',
    '🧚‍♀️',
    '🧛',
    '🧛‍♂️',
    '🧛‍♀️',
    '🧜',
    '🧜‍♂️',
    '🧜‍♀️',
    '🧝',
    '🧝‍♂️',
    '🧝‍♀️',
    '🧞',
    '🧞‍♂️',
    '🧞‍♀️',
    '🧟',
    '🧟‍♂️',
    '🧟‍♀️',
    '🧌',
    '💆',
    '💆‍♂️',
    '💆‍♀️',
    '💇',
    '💇‍♂️',
    '💇‍♀️',
    '🚶',
    '🚶‍♂️',
    '🚶‍♀️',
    '🧍',
    '🧍‍♂️',
    '🧍‍♀️',
    '🧎',
    '🧎‍♂️',
    '🧎‍♀️',
    '🧑‍🦯',
    '👨‍🦯',
    '👩‍🦯',
    '🧑‍🦼',
    '👨‍🦼',
    '👩‍🦼',
    '🧑‍🦽',
    '👨‍🦽',
    '👩‍🦽',
    '🏃',
    '🏃‍♂️',
    '🏃‍♀️',
    '💃',
    '🕺',
    '🕴️',
    '👯',
    '👯‍♂️',
    '👯‍♀️',
    '🧖',
    '🧖‍♂️',
    '🧖‍♀️',
    '🧗',
    '🧗‍♂️',
    '🧗‍♀️',
    '🤺',
    '🏇',
    '⛷️',
    '🏂',
    '🏌️',
    '🏌️‍♂️',
    '🏌️‍♀️',
    '🏄',
    '🏄‍♂️',
    '🏄‍♀️',
    '🚣',
    '🚣‍♂️',
    '🚣‍♀️',
    '🏊',
    '🏊‍♂️',
    '🏊‍♀️',
    '⛹️',
    '⛹️‍♂️',
    '⛹️‍♀️',
    '🏋️',
    '🏋️‍♂️',
    '🏋️‍♀️',
    '🚴',
    '🚴‍♂️',
    '🚴‍♀️',
    '🚵',
    '🚵‍♂️',
    '🚵‍♀️',
    '🤸',
    '🤸‍♂️',
    '🤸‍♀️',
    '🤼',
    '🤼‍♂️',
    '🤼‍♀️',
    '🤽',
    '🤽‍♂️',
    '🤽‍♀️',
    '🤾',
    '🤾‍♂️',
    '🤾‍♀️',
    '🤹',
    '🤹‍♂️',
    '🤹‍♀️',
    '🧘',
    '🧘‍♂️',
    '🧘‍♀️',
    '🛀',
    '🛌',
    '🧑‍🤝‍🧑',
    '👭',
    '👫',
    '👬',
    '💏',
    '👩‍❤️‍💋‍👨',
    '👨‍❤️‍💋‍👨',
    '👩‍❤️‍💋‍👩',
    '💑',
    '👩‍❤️‍👨',
    '👨‍❤️‍👨',
    '👩‍❤️‍👩',
    '👪',
    '👨‍👩‍👦',
    '👨‍👩‍👧',
    '👨‍👩‍👧‍👦',
    '👨‍👩‍👦‍👦',
    '👨‍👩‍👧‍👧',
    '👨‍👨‍👦',
    '👨‍👨‍👧',
    '👨‍👨‍👧‍👦',
    '👨‍👨‍👦‍👦',
    '👨‍👨‍👧‍👧',
    '👩‍👩‍👦',
    '👩‍👩‍👧',
    '👩‍👩‍👧‍👦',
    '👩‍👩‍👦‍👦',
    '👩‍👩‍👧‍👧',
    '👨‍👦',
    '👨‍👧',
    '👨‍👧‍👦',
    '👨‍👦‍👦',
    '👨‍👧‍👧',
    '👩‍👦',
    '👩‍👧',
    '👩‍👧‍👦',
    '👩‍👦‍👦',
    '👩‍👧‍👧',
    '🗣️',
    '👤',
    '👥',
    '🫂',
    '👣'
  ],
  animals: [
    '🐵',
    '🐒',
    '🦍',
    '🦧',
    '🐶',
    '🐕',
    '🦮',
    '🐕‍🦺',
    '🐩',
    '🐺',
    '🦊',
    '🦝',
    '🐱',
    '🐈',
    '🐈‍⬛',
    '🦁',
    '🐯',
    '🐅',
    '🐆',
    '🐴',
    '🐎',
    '🦄',
    '🦓',
    '🦌',
    '🦬',
    '🐮',
    '🐂',
    '🐃',
    '🐄',
    '🐷',
    '🐖',
    '🐗',
    '🐽',
    '🐏',
    '🐑',
    '🐐',
    '🐪',
    '🐫',
    '🦙',
    '🦒',
    '🐘',
    '🦣',
    '🦏',
    '🦛',
    '🐭',
    '🐁',
    '🐀',
    '🐹',
    '🐰',
    '🐇',
    '🐿️',
    '🦫',
    '🦔',
    '🦇',
    '🐻',
    '🐻‍❄️',
    '🐨',
    '🐼',
    '🦥',
    '🦦',
    '🦨',
    '🦘',
    '🦡',
    '🐾',
    '🦃',
    '🐔',
    '🐓',
    '🐣',
    '🐤',
    '🐥',
    '🐦',
    '🐧',
    '🕊️',
    '🦅',
    '🦆',
    '🦢',
    '🦉',
    '🦤',
    '🪶',
    '🦩',
    '🦚',
    '🦜',
    '🐸',
    '🐊',
    '🐢',
    '🦎',
    '🐍',
    '🐲',
    '🐉',
    '🦕',
    '🦖',
    '🐳',
    '🐋',
    '🐬',
    '🦭',
    '🐟',
    '🐠',
    '🐡',
    '🦈',
    '🐙',
    '🐚',
    '🪸',
    '🐌',
    '🐛',
    '🐜',
    '🐝',
    '🪲',
    '🐞',
    '🦗',
    '🪳',
    '🕷️',
    '🕸️',
    '🦂',
    '🦟',
    '🪰',
    '🪱',
    '🦠',
    '💐',
    '🌸',
    '💮',
    '🏵️',
    '🌹',
    '🥀',
    '🌺',
    '🌻',
    '🌼',
    '🌷',
    '🌱',
    '🪴',
    '🌲',
    '🌳',
    '🌴',
    '🌵',
    '🌾',
    '🌿',
    '☘️',
    '🍀',
    '🍁',
    '🍂',
    '🍃',
    '🪹',
    '🪺',
    '🍄',
    '🌰'
  ],
  food: [
    '🍏',
    '🍎',
    '🍐',
    '🍊',
    '🍋',
    '🍌',
    '🍉',
    '🍇',
    '🍓',
    '🫐',
    '🍈',
    '🍒',
    '🍑',
    '🍍',
    '🥝',
    '🍅',
    '🫒',
    '🥥',
    '🥑',
    '🍆',
    '🥔',
    '🥕',
    '🌽',
    '🌶️',
    '🫑',
    '🥒',
    '🥬',
    '🥦',
    '🧄',
    '🧅',
    '🍄',
    '🥜',
    '🫘',
    '🌰',
    '🍞',
    '🥐',
    '🥖',
    '🫓',
    '🥨',
    '🥯',
    '🥞',
    '🧇',
    '🧀',
    '🍖',
    '🍗',
    '🥩',
    '🥓',
    '🍔',
    '🍟',
    '🍕',
    '🌭',
    '🥪',
    '🌮',
    '🌯',
    '🫔',
    '🥙',
    '🧆',
    '🥚',
    '🍳',
    '🥘',
    '🍲',
    '🫕',
    '🥣',
    '🥗',
    '🍿',
    '🧈',
    '🧂',
    '🥫',
    '🍱',
    '🍘',
    '🍙',
    '🍚',
    '🍛',
    '🍜',
    '🍝',
    '🍠',
    '🍢',
    '🍣',
    '🍤',
    '🍥',
    '🥮',
    '🍡',
    '🥟',
    '🥠',
    '🥡',
    '🦀',
    '🦞',
    '🦐',
    '🦑',
    '🦪',
    '🍦',
    '🍧',
    '🍨',
    '🍩',
    '🍪',
    '🎂',
    '🍰',
    '🧁',
    '🥧',
    '🍫',
    '🍬',
    '🍭',
    '🍮',
    '🍯',
    '🍼',
    '🥛',
    '☕️',
    '🫖',
    '🍵',
    '🍶',
    '🍾',
    '🍷',
    '🍸',
    '🍹',
    '🍺',
    '🍻',
    '🥂',
    '🥃',
    '🫗',
    '🥤',
    '🧋',
    '🧃',
    '🧉',
    '🧊',
    '🥢',
    '🍽️',
    '🍴',
    '🥄',
    '🔪',
    '🫙',
    '🏺'
  ],
  travel: [
    '🌍',
    '🌎',
    '🌏',
    '🌐',
    '🗺️',
    '🧭',
    '⛰️',
    '🏔️',
    '🌋',
    '🗻',
    '🏕️',
    '🏖️',
    '🏜️',
    '🏝️',
    '🏞️',
    '🏟️',
    '🏛️',
    '🏗️',
    '🧱',
    '🪨',
    '🪵',
    '🛖',
    '🏘️',
    '🏚️',
    '🏠',
    '🏡',
    '🏢',
    '🏣',
    '🏤',
    '🏥',
    '🏦',
    '🏨',
    '🏩',
    '🏪',
    '🏫',
    '🏬',
    '🏭',
    '🏯',
    '🏰',
    '💒',
    '🗼',
    '🗽',
    '⛪️',
    '🕌',
    '🛕',
    '🕍',
    '⛩',
    '🕋',
    '⛲️',
    '⛺️',
    '🌁',
    '🌃',
    '🏙',
    '🌄',
    '🌅',
    '🌆',
    '🌇',
    '🌉',
    '♨️',
    '🎠',
    '🎡',
    '🎢',
    '💈',
    '🎪',
    '🚂',
    '🚃',
    '🚄',
    '🚅',
    '🚆',
    '🚇',
    '🚈',
    '🚉',
    '🚊',
    '🚝',
    '🚞',
    '🚋',
    '🚌',
    '🚍',
    '🚎',
    '🚐',
    '🚑',
    '🚒',
    '🚓',
    '🚔',
    '🚕',
    '🚖',
    '🚗',
    '🚘',
    '🚙',
    '🛻',
    '🚚',
    '🚛',
    '🚜',
    '🏎️',
    '🏍️',
    '🛵',
    '🦽',
    '🦼',
    '🛺',
    '🚲',
    '🛴',
    '🛹',
    '🛼',
    '🚏',
    '🛣️',
    '🛤️',
    '🛢️',
    '⛽',
    '🚨',
    '🚥',
    '🚦',
    '🛑',
    '🚧',
    '⚓',
    '⛵',
    '🛶',
    '🚤',
    '🛳️',
    '⛴️',
    '🛥️',
    '🚢',
    '✈️',
    '🛩️',
    '🛫',
    '🛬',
    '🪂',
    '💺',
    '🚁',
    '🚟',
    '🚠',
    '🚡',
    '🛰️',
    '🚀',
    '🛸',
    '🛎️',
    '🧳',
    '⌚',
    '⏰',
    '⏱️',
    '⏲️',
    '🕰️',
    '🕛',
    '🕧',
    '🕐',
    '🕜',
    '🕑',
    '🕝',
    '🕒',
    '🕞',
    '🕓',
    '🕟',
    '🕔',
    '🕠',
    '🕕',
    '🕡',
    '🕖',
    '🕢',
    '🕗',
    '🕣',
    '🕘',
    '🕤',
    '🕙',
    '🕥',
    '🕚',
    '🕦',
    '🌑',
    '🌒',
    '🌓',
    '🌔',
    '🌕',
    '🌖',
    '🌗',
    '🌘',
    '🌙',
    '🌚',
    '🌛',
    '🌜',
    '🌡️',
    '☀️',
    '🌝',
    '🌞',
    '🪐',
    '⭐',
    '🌟',
    '🌠',
    '🌌',
    '☁️',
    '⛅',
    '⛈️',
    '🌤️',
    '🌥️',
    '🌦️',
    '🌧️',
    '🌨️',
    '❄️',
    '🌬️',
    '💨',
    '🌪️',
    '🌫️',
    '🌈',
    '☂️',
    '☔',
    '⚡',
    '❄️',
    '☃️',
    '⛄',
    '☄️',
    '🔥',
    '💧',
    '🌊'
  ],
  activities: [
    '⚽',
    '🏀',
    '🏈',
    '⚾',
    '🥎',
    '🎾',
    '🏐',
    '🏉',
    '🥏',
    '🎱',
    '🪀',
    '🏓',
    '🏸',
    '🏒',
    '🏑',
    '🥍',
    '🏏',
    '🪃',
    '🥅',
    '⛳',
    '🪁',
    '🏹',
    '🎣',
    '🤿',
    '🥊',
    '🥋',
    '🎽',
    '🛹',
    '🛼',
    '🛷',
    '⛸️',
    '🥌',
    '🎿',
    '⛷️',
    '🏂',
    '🪂',
    '🏋️',
    '🏋️‍♂️',
    '🏋️‍♀️',
    '🤼',
    '🤼‍♂️',
    '🤼‍♀️',
    '🤸',
    '🤸‍♂️',
    '🤸‍♀️',
    '⛹️',
    '⛹️‍♂️',
    '⛹️‍♀️',
    '🤺',
    '🤾',
    '🤾‍♂️',
    '🤾‍♀️',
    '🏌️',
    '🏌️‍♂️',
    '🏌️‍♀️',
    '🏇',
    '🧘',
    '🧘‍♂️',
    '🧘‍♀️',
    '🏄',
    '🏄‍♂️',
    '🏄‍♀️',
    '🏊',
    '🏊‍♂️',
    '🏊‍♀️',
    '🤽',
    '🤽‍♂️',
    '🤽‍♀️',
    '🚣',
    '🚣‍♂️',
    '🚣‍♀️',
    '🧗',
    '🧗‍♂️',
    '🧗‍♀️',
    '🚵',
    '🚵‍♂️',
    '🚵‍♀️',
    '🚴',
    '🚴‍♂️',
    '🚴‍♀️',
    '🏆',
    '🥇',
    '🥈',
    '🥉',
    '🏅',
    '🎖️',
    '🏵️',
    '🎗️',
    '🎫',
    '🎟️',
    '🎪',
    '🤹',
    '🤹‍♂️',
    '🤹‍♀️',
    '🎭',
    '🩰',
    '🎨',
    '🎬',
    '🎤',
    '🎧',
    '🎼',
    '🎹',
    '🥁',
    '🪘',
    '🎷',
    '🎺',
    '🪗',
    '🎸',
    '🪕',
    '🎻',
    '🎲',
    '♟️',
    '🎯',
    '🎳',
    '🎮',
    '🎰',
    '🧩'
  ],
  objects: [
    '⌚',
    '📱',
    '📲',
    '💻',
    '⌨️',
    '🖥️',
    '🖨️',
    '🖱️',
    '🖲️',
    '🕹️',
    '🗜️',
    '💽',
    '💾',
    '💿',
    '📀',
    '📼',
    '📷',
    '📸',
    '📹',
    '🎥',
    '📽️',
    '🎞️',
    '📞',
    '☎️',
    '📟',
    '📠',
    '📺',
    '📻',
    '🎙️',
    '🎚️',
    '🎛️',
    '🧭',
    '⏱️',
    '⏲️',
    '⏰',
    '🕰️',
    '⌛',
    '⏳',
    '📡',
    '🔋',
    '🔌',
    '💡',
    '🔦',
    '🕯️',
    '🪔',
    '🧯',
    '🛢️',
    '💸',
    '💵',
    '💴',
    '💶',
    '💷',
    '🪙',
    '💰',
    '💳',
    '💎',
    '⚖️',
    '🪜',
    '🧰',
    '🪛',
    '🔧',
    '🔨',
    '⚒️',
    '🛠️',
    '⛏️',
    '🔩',
    '⚙️',
    '🪤',
    '🧱',
    '⛓️',
    '🧲',
    '🔫',
    '💣',
    '🧱',
    '🔪',
    '🗡️',
    '⚔️',
    '🛡️',
    '🚬',
    '⚰️',
    '🪦',
    '⚱️',
    '🏺',
    '🔮',
    '📿',
    '🧿',
    '💎',
    '🔔',
    '🔕',
    '📢',
    '📣',
    '🥁',
    '🪘',
    '📯',
    '🔔',
    '🎐',
    '🎼',
    '🎵',
    '🎶',
    '🎙️',
    '🎚️',
    '🎛️',
    '🎤',
    '🎧',
    '📻',
    '🎷',
    '🪗',
    '🎸',
    '🎹',
    '🎺',
    '🎻',
    '🪕',
    '🥁',
    '📱',
    '📲',
    '☎️',
    '📞',
    '📟',
    '📠',
    '🔋',
    '🔌',
    '💻',
    '🖥️',
    '🖨️',
    '⌨️',
    '🖱️',
    '🖲️',
    '💽',
    '💾',
    '💿',
    '📀',
    '🧮',
    '🎥',
    '🎞️',
    '📽️',
    '🎬',
    '📺',
    '📷',
    '📸',
    '📹',
    '📼',
    '🔍',
    '🔎',
    '🕯️',
    '💡',
    '🔦',
    '🏮',
    '🪔',
    '📔',
    '📕',
    '📖',
    '📗',
    '📘',
    '📙',
    '📚',
    '📓',
    '📒',
    '📃',
    '📜',
    '📄',
    '📰',
    '🗞️',
    '📑',
    '🔖',
    '🏷️',
    '💰',
    '🪙',
    '💴',
    '💵',
    '💶',
    '💷',
    '💸',
    '💳',
    '🧾',
    '✉️',
    '📧',
    '📨',
    '📩',
    '📤',
    '📥',
    '📦',
    '📫',
    '📪',
    '📬',
    '📭',
    '📮',
    '🗳️',
    '✏️',
    '✒️',
    '🖋️',
    '🖊️',
    '🖌️',
    '🖍️',
    '📝',
    '💼',
    '📁',
    '📂',
    '🗂️',
    '📅',
    '📆',
    '🗒️',
    '🗓️',
    '📇',
    '📈',
    '📉',
    '📊',
    '📋',
    '📌',
    '📍',
    '📎',
    '🖇️',
    '📏',
    '📐',
    '✂️',
    '🗃️',
    '🗄️',
    '🗑️',
    '🔒',
    '🔓',
    '🔏',
    '🔐',
    '🔑',
    '🗝️',
    '🔨',
    '🪓',
    '⛏️',
    '⚒️',
    '🛠️',
    '🗡️',
    '⚔️',
    '🔫',
    '🪃',
    '🏹',
    '🛡️',
    '🪚',
    '🔧',
    '🪛',
    '🔩',
    '⚙️',
    '🗜️',
    '⚖️',
    '🦯',
    '🔗',
    '⛓️',
    '🪝',
    '🧰',
    '🧲',
    '🪜',
    '🧪',
    '🧫',
    '🧬',
    '🔬',
    '🔭',
    '📡',
    '💉',
    '🩸',
    '💊',
    '🩹',
    '🩺',
    '🌡️',
    '🧹',
    '🪠',
    '🧺',
    '🧻',
    '🚽',
    '🚰',
    '🚿',
    '🛁',
    '🛀',
    '🧼',
    '🪥',
    '🪒',
    '🧽',
    '🧴',
    '🛎️',
    '🔑',
    '🗝️',
    '🚪',
    '🪑',
    '🛋️',
    '🛏️',
    '🛌',
    '🧸',
    '🪆',
    '🖼️',
    '🪞',
    '🪟',
    '🛍️',
    '🛒',
    '🎁',
    '🎈',
    '🎏',
    '🎀',
    '🪄',
    '🪅',
    '🎊',
    '🎉',
    '🎎',
    '🏆',
    '🎖️',
    '🥇',
    '🥈',
    '🥉',
    '🏅',
    '🥇',
    '🎗️',
    '🎟️',
    '🎫',
    '🎮',
    '🕹️',
    '🎰',
    '🎲',
    '🎯',
    '🎳',
    '🎰',
    '🎲',
    '🎯',
    '🎳',
    '🎰',
    '🎱',
    '🔮',
    '🪄',
    '🎀',
    '🎉',
    '🎊',
    '🎋',
    '🎍',
    '🎎',
    '🎏',
    '🎐',
    '🎑',
    '🧧',
    '🎀',
    '🎁',
    '🎗️',
    '🎟️',
    '🎫'
  ],
  symbols: [
    '❤️',
    '🧡',
    '💛',
    '💚',
    '💙',
    '💜',
    '🖤',
    '🤍',
    '🤎',
    '💔',
    '❣️',
    '💕',
    '💞',
    '💓',
    '💗',
    '💖',
    '💘',
    '💝',
    '💟',
    '☮️',
    '✝️',
    '☪️',
    '🕉',
    '☸️',
    '✡️',
    '🔯',
    '🕎',
    '☯️',
    '☦️',
    '🛐',
    '⛎',
    '♈️',
    '♉️',
    '♊️',
    '♋️',
    '♌️',
    '♍️',
    '♎️',
    '♏️',
    '♐️',
    '♑️',
    '♒️',
    '♓️',
    '🆔',
    '⚛️',
    '🉑',
    '☢️',
    '☣️',
    '📴',
    '📳',
    '🈶',
    '🈚️',
    '🈸',
    '🈺',
    '🈷️',
    '✴️',
    '🆚',
    '💮',
    '🉐',
    '㊙️',
    '㊗️',
    '🈴',
    '🈵',
    '🈹',
    '🈲',
    '🅰️',
    '🅱️',
    '🆎',
    '🆑',
    '🅾️',
    '🆘',
    '❌',
    '⭕️',
    '🛑',
    '⛔️',
    '📛',
    '🚫',
    '💯',
    '💢',
    '♨️',
    '🚷',
    '🚯',
    '🚳',
    '🚱',
    '🔞',
    '📵',
    '🚭',
    '❗️',
    '❕',
    '❓',
    '❔',
    '‼️',
    '⁉️',
    '🔅',
    '🔆',
    '〽️',
    '⚠️',
    '🚸',
    '🔱',
    '⚜️',
    '🔰',
    '♻️',
    '✅',
    '🈯️',
    '💹',
    '❇️',
    '✳️',
    '❎',
    '🌐',
    '💠',
    'Ⓜ️',
    '🌀',
    '💤',
    '🏧',
    '🚾',
    '♿️',
    '🅿️',
    '🈳',
    '🈂️',
    '🛂',
    '🛃',
    '🛄',
    '🛅',
    '🛗',
    '🈂️',
    '🚮',
    '🚰',
    '♿',
    '🚹',
    '🚺',
    '🚻',
    '🚼',
    '🚾',
    '🛂',
    '🛃',
    '🛄',
    '🛅',
    '🚸',
    '⛔',
    '🚫',
    '🚳',
    '🚭',
    '🚯',
    '🚱',
    '🚷',
    '📵',
    '🔞',
    '☢',
    '☣',
    '⬆️',
    '↗️',
    '➡️',
    '↘️',
    '⬇️',
    '↙️',
    '⬅️',
    '↖️',
    '↕️',
    '↔️',
    '↩️',
    '↪️',
    '⤴️',
    '⤵️',
    '🔃',
    '🔄',
    '🔙',
    '🔚',
    '🔛',
    '🔜',
    '🔝',
    '🛐',
    '⚛',
    '🕉',
    '✡',
    '☸',
    '☯',
    '✝',
    '☦',
    '☪',
    '☮',
    '🕎',
    '🔯',
    '♈',
    '♉',
    '♊',
    '♋',
    '♌',
    '♍',
    '♎',
    '♏',
    '♐',
    '♑',
    '♒',
    '♓',
    '⛎',
    '🔀',
    '🔁',
    '🔂',
    '▶️',
    '⏩',
    '⏭️',
    '⏯️',
    '◀️',
    '⏪',
    '⏮️',
    '🔼',
    '⏫',
    '🔽',
    '⏬',
    '⏸️',
    '⏹️',
    '⏺️',
    '⏏️',
    '🎦',
    '🔅',
    '🔆',
    '📶',
    '📳',
    '📴',
    '♀️',
    '♂️',
    '⚧️',
    '✖️',
    '➕',
    '➖',
    '➗',
    '♾️',
    '‼️',
    '⁉️',
    '❓',
    '❔',
    '❕',
    '❗',
    '〰️',
    '💱',
    '💲',
    '⚕️',
    '♻️',
    '⚜️',
    '🔱',
    '📛',
    '🔰',
    '⭕',
    '✅',
    '☑️',
    '✔️',
    '❌',
    '❎',
    '➰',
    '➿',
    '〽️',
    '✳️',
    '✴️',
    '❇️',
    '©️',
    '®️',
    '™️',
    '#️⃣',
    '*️⃣',
    '0️⃣',
    '1️⃣',
    '2️⃣',
    '3️⃣',
    '4️⃣',
    '5️⃣',
    '6️⃣',
    '7️⃣',
    '8️⃣',
    '9️⃣',
    '🔟',
    '🔠',
    '🔡',
    '🔢',
    '🔣',
    '🔤',
    '🅰️',
    '🆎',
    '🅱️',
    '🆑',
    '🆒',
    '🆓',
    'ℹ️',
    '🆔',
    'Ⓜ️',
    '🆕',
    '🆖',
    '🅾️',
    '🆗',
    '🅿️',
    '🆘',
    '🆙',
    '🆚',
    '🈁',
    '🈂️',
    '🈷️',
    '🈶',
    '🈯',
    '🉐',
    '🈹',
    '🈚',
    '🈲',
    '🉑',
    '🈸',
    '🈴',
    '🈳',
    '㊗️',
    '㊙️',
    '🈺',
    '🈵',
    '🔴',
    '🟠',
    '🟡',
    '🟢',
    '🔵',
    '🟣',
    '⚫',
    '⚪',
    '🟤',
    '🔺',
    '🔻',
    '🔸',
    '🔹',
    '🔶',
    '🔷',
    '🔳',
    '🔲',
    '▪️',
    '▫️',
    '◾',
    '◽',
    '◼️',
    '◻️',
    '🟥',
    '🟧',
    '🟨',
    '🟩',
    '🟦',
    '🟪',
    '⬛',
    '⬜',
    '🟫',
    '🔈',
    '🔇',
    '🔉',
    '🔊',
    '🔔',
    '🔕',
    '📣',
    '📢',
    '💬',
    '💭',
    '🗯️',
    '♠️',
    '♣️',
    '♥️',
    '♦️',
    '🃏',
    '🎴',
    '🀄',
    '🕐',
    '🕑',
    '🕒',
    '🕓',
    '🕔',
    '🕕',
    '🕖',
    '🕗',
    '🕘',
    '🕙',
    '🕚',
    '🕛',
    '🕜',
    '🕝',
    '🕞',
    '🕟',
    '🕠',
    '🕡',
    '🕢',
    '🕣',
    '🕤',
    '🕥',
    '🕦',
    '🕧'
  ],
  flags: [
    '🏳️',
    '🏴',
    '🏴‍☠️',
    '🏁',
    '🚩',
    '🏳️‍🌈',
    '🏳️‍⚧️',
    '🇺🇳',
    '🇦🇫',
    '🇦🇽',
    '🇦🇱',
    '🇩🇿',
    '🇦🇸',
    '🇦🇩',
    '🇦🇴',
    '🇦🇮',
    '🇦🇶',
    '🇦🇬',
    '🇦🇷',
    '🇦🇲',
    '🇦🇼',
    '🇦🇺',
    '🇦🇹',
    '🇦🇿',
    '🇧🇸',
    '🇧🇭',
    '🇧🇩',
    '🇧🇧',
    '🇧🇾',
    '🇧🇪',
    '🇧🇿',
    '🇧🇯',
    '🇧🇲',
    '🇧🇹',
    '🇧🇴',
    '🇧🇦',
    '🇧🇼',
    '🇧🇷',
    '🇮🇴',
    '🇻🇬',
    '🇧🇳',
    '🇧🇬',
    '🇧🇫',
    '🇧🇮',
    '🇰🇭',
    '🇨🇲',
    '🇨🇦',
    '🇮🇨',
    '🇨🇻',
    '🇧🇶',
    '🇰🇾',
    '🇨🇫',
    '🇹🇩',
    '🇨🇱',
    '🇨🇳',
    '🇨🇽',
    '🇨🇨',
    '🇨🇴',
    '🇰🇲',
    '🇨🇬',
    '🇨🇩',
    '🇨🇰',
    '🇨🇷',
    '🇨🇮',
    '🇭🇷',
    '🇨🇺',
    '🇨🇼',
    '🇨🇾',
    '🇨🇿',
    '🇩🇰',
    '🇩🇯',
    '🇩🇲',
    '🇩🇴',
    '🇪🇨',
    '🇪🇬',
    '🇸🇻',
    '🇬🇶',
    '🇪🇷',
    '🇪🇪',
    '🇸🇿',
    '🇪🇹',
    '🇪🇺',
    '🇫🇰',
    '🇫🇴',
    '🇫🇯',
    '🇫🇮',
    '🇫🇷',
    '🇬🇫',
    '🇵🇫',
    '🇹🇫',
    '🇬🇦',
    '🇬🇲',
    '🇬🇪',
    '🇩🇪',
    '🇬🇭',
    '🇬🇮',
    '🇬🇷',
    '🇬🇱',
    '🇬🇩',
    '🇬🇵',
    '🇬🇺',
    '🇬🇹',
    '🇬🇬',
    '🇬🇳',
    '🇬🇼',
    '🇬🇾',
    '🇭🇹',
    '🇭🇳',
    '🇭🇰',
    '🇭🇺',
    '🇮🇸',
    '🇮🇳',
    '🇮🇩',
    '🇮🇷',
    '🇮🇶',
    '🇮🇪',
    '🇮🇲',
    '🇮🇱',
    '🇮🇹',
    '🇯🇲',
    '🇯🇵',
    '🎌',
    '🇯🇪',
    '🇯🇴',
    '🇰🇿',
    '🇰🇪',
    '🇰🇮',
    '🇽🇰',
    '🇰🇼',
    '🇰🇬',
    '🇱🇦',
    '🇱🇻',
    '🇱🇧',
    '🇱🇸',
    '🇱🇷',
    '🇱🇾',
    '🇱🇮',
    '🇱🇹',
    '🇱🇺',
    '🇲🇴',
    '🇲🇬',
    '🇲🇼',
    '🇲🇾',
    '🇲🇻',
    '🇲🇱',
    '🇲🇹',
    '🇲🇭',
    '🇲🇶',
    '🇲🇷',
    '🇲🇺',
    '🇾🇹',
    '🇲🇽',
    '🇫🇲',
    '🇲🇩',
    '🇲🇨',
    '🇲🇳',
    '🇲🇪',
    '🇲🇸',
    '🇲🇦',
    '🇲🇿',
    '🇲🇲',
    '🇳🇦',
    '🇳🇷',
    '🇳🇵',
    '🇳🇱',
    '🇳🇨',
    '🇳🇿',
    '🇳🇮',
    '🇳🇪',
    '🇳🇬',
    '🇳🇺',
    '🇳🇫',
    '🇰🇵',
    '🇲🇰',
    '🇲🇵',
    '🇳🇴',
    '🇴🇲',
    '🇵🇰',
    '🇵🇼',
    '🇵🇸',
    '🇵🇦',
    '🇵🇬',
    '🇵🇾',
    '🇵🇪',
    '🇵🇭',
    '🇵🇳',
    '🇵🇱',
    '🇵🇹',
    '🇵🇷',
    '🇶🇦',
    '🇷🇪',
    '🇷🇴',
    '🇷🇺',
    '🇷🇼',
    '🇼🇸',
    '🇸🇲',
    '🇸🇹',
    '🇸🇦',
    '🇸🇳',
    '🇷🇸',
    '🇸🇨',
    '🇸🇱',
    '🇸🇬',
    '🇸🇽',
    '🇸🇰',
    '🇸🇮',
    '🇬🇸',
    '🇸🇧',
    '🇸🇴',
    '🇿🇦',
    '🇸🇸',
    '🇪🇸',
    '🇱🇰',
    '🇧🇱',
    '🇸🇭',
    '🇰🇳',
    '🇱🇨',
    '🇵🇲',
    '🇻🇨',
    '🇸🇩',
    '🇸🇷',
    '🇸🇪',
    '🇨🇭',
    '🇸🇾',
    '🇹🇼',
    '🇹🇯',
    '🇹🇿',
    '🇹🇭',
    '🇹🇱',
    '🇹🇬',
    '🇹🇰',
    '🇹🇴',
    '🇹🇹',
    '🇹🇳',
    '🇹🇷',
    '🇹🇲',
    '🇹🇨',
    '🇹🇻',
    '🇺🇬',
    '🇺🇦',
    '🇦🇪',
    '🇬🇧',
    '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
    '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
    '🇺🇳',
    '🇺🇸',
    '🇺🇾',
    '🇺🇿',
    '🇻🇺',
    '🇻🇦',
    '🇻🇪',
    '🇻🇳',
    '🇼🇫',
    '🇪🇭',
    '🇾🇪',
    '🇿🇲',
    '🇿🇼',
    '🏴‍☠️',
    '🏳️‍🌈',
    '🏳️‍⚧️',
    '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
    '🏴󠁧󠁢󠁷󠁬󠁳󠁿'
  ]
}

const currentEmojiCategoryEmojis = computed(() => {
  const cat = contextMenu.value.emojiCategory
  return emojisByCategory[cat] || emojisByCategory.popular
})

const currentInputEmojiCategoryEmojis = computed(() => {
  return emojisByCategory[emojiPickerCategory.value] || emojisByCategory.popular
})

const loadedMessageIds = ref(new Set())
const loading = ref(true)
const showScrollButton = ref(false)

const editChat = ref({
  title: '',
  description: '',
  isPublic: false,
  avatarHash: null
})

// Аватарка чата
const showChatAvatarModal = ref(false)

const selectedFiles = ref([])
const fileInput = ref(null)
const joining = ref(false)
const blocking = ref(false)
const selectedUserProfile = ref(null)
const selectedChatProfile = ref(null)

// Референсы и состояние для пикера эмодзи
const emojiPickerButton = ref(null)
const emojiPickerPopup = ref(null)
const showEmojiPickerPopup = ref(false)
const emojiPickerCategory = ref('recent')
const emojiPickerPosition = ref({ x: 0, y: 0 })

// Свайп для возврата к списку чатов на мобильных
const touchStartX = ref(0)
const touchEndX = ref(0)
const touchStartY = ref(0)
const isSwiping = ref(false)
const swipeThreshold = 80 // минимальное расстояние свайпа в пикселях
const maxVerticalDeviation = 50 // максимальное отклонение по вертикали

const isWorkspaceAdmin = computed(() => {
  return ctx.user?.is('Admin') || ctx.user?.is('Owner')
})

// Другой пользователь в личном чате
const otherUser = computed(() => {
  if (chat.value?.type !== 'direct') return null
  const otherParticipant = participants.value.find((p) => String(p.userId) !== String(ctx.user?.id))
  return otherParticipant?.user || null
})

const isChannel = computed(() => {
  return chat.value?.type === 'channel'
})

const isDirectChat = computed(() => {
  return chat.value?.type === 'direct'
})

const canPostMessages = computed(() => {
  if (!isChannel.value) return true
  return isOwner.value || isAdmin.value
})

const isOwner = computed(() => {
  const myParticipant = participants.value.find((p) => String(p.userId) === String(ctx.user?.id))
  if (myParticipant?.role === 'owner') return true
  if (!chat.value || !chat.value.owner) return false
  const ownerId = typeof chat.value.owner === 'object' ? chat.value.owner?.id : chat.value.owner
  if (chat.value?.isPublic && isWorkspaceAdmin.value) return true
  return ownerId === ctx.user.id
})

const isAdmin = computed(() => {
  const myParticipant = participants.value.find((p) => String(p.userId) === String(ctx.user?.id))
  return myParticipant?.role === 'admin' || myParticipant?.role === 'owner'
})

const canManage = computed(() => {
  if (isOwner.value || isAdmin.value) return true
  if (chat.value?.isPublic && isWorkspaceAdmin.value) return true
  return false
})

const isMember = computed(() => {
  if (!participants.value || participants.value.length === 0) return false
  return participants.value.some((p) => String(p.userId) === String(ctx.user?.id))
})

const canJoin = computed(() => {
  // Можно вступить если: публичный чат ИЛИ есть приглашение
  return !isMember.value && (chat.value?.isPublic || hasAcceptedInvite.value)
})

const hasAcceptedInvite = ref(false)
const joinCheckLoading = ref(false)

const typingText = computed(() => {
  const count = typingUsers.value.length
  if (count === 0) return ''
  if (count === 1) return `${typingUsers.value[0].name} печатает...`
  if (count === 2) return `${typingUsers.value[0].name} и ${typingUsers.value[1].name} печитают...`
  return `${count} человек печатают...`
})

const replyAuthorName = computed(() => {
  if (!replyingTo.value) return ''
  const name = getMessageAuthorName(replyingTo.value)
  return name === 'Вы' ? 'себе' : name
})

const replyPreview = computed(() => {
  if (!replyingTo.value) return ''
  const text = replyingTo.value.text || ''
  return text.length > 50 ? text.substring(0, 50) + '...' : text
})

const { socketData, isConnected, isReconnecting, lastError, reconnect } = useChatSocket(
  props.userSocketId
)

// Состояние для mention picker
const showMentionPicker = ref(false)
const mentionSearchQuery = ref('')
const mentionPosition = ref({ x: 0, y: 0 })
const mentionTextareaRect = ref(null)
const mentionStartIndex = ref(-1)

// Состояние для индикации упоминаний
const unreadMentions = ref([])

// Подсчитываем непрочитанные упоминания
const unreadMentionsCount = computed(() => {
  return unreadMentions.value.length
})

// Обработка ввода @ для mention picker
function handleMentionInput(event) {
  const textarea = messageInput.value
  if (!textarea) return

  const cursorPosition = textarea.selectionStart
  const textBeforeCursor = newMessage.value.slice(0, cursorPosition)
  const textAfterCursor = newMessage.value.slice(cursorPosition)

  // Ищем @ перед курсором
  const lastAtIndex = textBeforeCursor.lastIndexOf('@')

  if (lastAtIndex !== -1) {
    const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1)
    const hasSpaceAfterAt = textAfterAt.includes(' ')

    // Если после @ нет пробела и мы не в середине слова
    if (
      !hasSpaceAfterAt &&
      (textAfterCursor.length === 0 ||
        textAfterCursor.startsWith(' ') ||
        cursorPosition === textBeforeCursor.length)
    ) {
      mentionSearchQuery.value = textAfterAt
      mentionStartIndex.value = lastAtIndex

      // Получаем позицию курсора
      const rect = textarea.getBoundingClientRect()
      const coords = getCaretCoordinates(textarea, cursorPosition)

      mentionPosition.value = {
        x: rect.left + coords.left,
        y: rect.top + coords.top
      }
      mentionTextareaRect.value = rect
      showMentionPicker.value = true
      return
    }
  }

  // Скрываем пикер если условия не выполнены
  showMentionPicker.value = false
}

// Получение координат каретки
function getCaretCoordinates(textarea, position) {
  const div = document.createElement('div')
  const styles = window.getComputedStyle(textarea)

  // Копируем стили
  const properties = [
    'boxSizing',
    'width',
    'height',
    'overflowX',
    'overflowY',
    'borderTopWidth',
    'borderRightWidth',
    'borderBottomWidth',
    'borderLeftWidth',
    'paddingTop',
    'paddingRight',
    'paddingBottom',
    'paddingLeft',
    'fontStyle',
    'fontVariant',
    'fontWeight',
    'fontStretch',
    'fontSize',
    'fontSizeAdjust',
    'lineHeight',
    'fontFamily',
    'textAlign',
    'textTransform',
    'textIndent',
    'textDecoration',
    'letterSpacing',
    'wordSpacing',
    'tabSize',
    'MozTabSize'
  ]

  properties.forEach((prop) => {
    div.style[prop] = styles[prop]
  })

  div.style.position = 'absolute'
  div.style.visibility = 'hidden'
  div.style.whiteSpace = 'pre-wrap'
  div.style.wordWrap = 'break-word'
  div.style.overflow = 'hidden'

  div.textContent = textarea.value.substring(0, position)

  const span = document.createElement('span')
  span.textContent = textarea.value.substring(position) || '.'
  div.appendChild(span)

  document.body.appendChild(div)

  const coordinates = {
    top: span.offsetTop + parseInt(styles.borderTopWidth),
    left: span.offsetLeft + parseInt(styles.borderLeftWidth)
  }

  document.body.removeChild(div)

  return coordinates
}

// Вставка mention в текст
function insertMention(user) {
  if (mentionStartIndex.value === -1) return

  const beforeMention = newMessage.value.slice(0, mentionStartIndex.value)
  const afterMention = newMessage.value.slice(
    mentionStartIndex.value + 1 + mentionSearchQuery.value.length
  )

  // Формат: @[Имя](userId)
  const mentionText = `@[${user.displayName}](${user.id}) `
  newMessage.value = beforeMention + mentionText + afterMention

  showMentionPicker.value = false
  mentionSearchQuery.value = ''
  mentionStartIndex.value = -1

  // Возвращаем фокус и устанавливаем курсор после вставленного текста
  nextTick(() => {
    const textarea = messageInput.value
    if (textarea) {
      textarea.focus()
      const newPosition = beforeMention.length + mentionText.length
      textarea.selectionStart = textarea.selectionEnd = newPosition
      handleInput()
    }
  })
}

// Синхронизация сообщений при восстановлении соединения (мобильные)
const { syncState, forceSync } = useMessageSync(
  computed(() => props.feedId),
  () => messages.value,
  async (options) => {
    const response = await apiMessagesAfterRoute({ feedId: props.feedId })
      .query({
        afterId: options?.afterId,
        limit: options?.limit || 100
      })
      .run(ctx)
    return response.messages
  },
  (newMessages, source = 'sync') => {
    // Добавляем новые сообщения без дублей
    const existingIds = new Set(messages.value.map((m) => m.id))

    // Компенсация высоты: сохраняем позицию перед добавлением
    const container = messagesContainer.value
    let oldScrollHeight = 0
    let oldScrollTop = 0

    if (container && source === 'sync') {
      oldScrollHeight = container.scrollHeight
      oldScrollTop = container.scrollTop
    }

    newMessages.forEach((msg) => {
      if (!existingIds.has(msg.id)) {
        loadedMessageIds.value.add(msg.id)
        const normalizedMessage = normalizeMessageFields(msg)
        messages.value.push(normalizedMessage)
      }
    })

    // Применяем компенсацию высоты после добавления сообщений
    if (container && source === 'sync' && newMessages.length > 0) {
      nextTick(() => {
        const newScrollHeight = container.scrollHeight
        const heightDiff = newScrollHeight - oldScrollHeight

        // Восстанавливаем позицию прокрутки с компенсацией
        container.scrollTop = oldScrollTop + heightDiff
      })
    }
  }
)

// Дополнительная подписка на канал чата для событий транскрибации (отправляется на chat-${feedId}, а не на userSocketId)
let chatChannelSubscription = null

async function setupChatChannelSubscription() {
  if (!props.feedId) {
    // console.log('[ChatView] Skipping chat channel subscription - no feedId')
    return
  }

  const channelName = `chat-${props.feedId}`

  // Отписываемся от предыдущей подписки
  if (chatChannelSubscription) {
    try {
      chatChannelSubscription()
    } catch (e) {
      console.warn('[ChatView] Error unsubscribing from chat channel:', e)
    }
    chatChannelSubscription = null
  }

  try {
    // console.log('[ChatView] Setting up chat channel subscription:', {
    //   channel: channelName,
    //   userId: ctx.user?.id,
    //   feedId: props.feedId
    // })

    const socketClient = await getOrCreateBrowserSocketClient()
    // console.log('[ChatView] Socket client obtained:', !!socketClient)

    const subscription = socketClient.subscribeToData(channelName)
    // console.log('[ChatView] Subscription created:', !!subscription, 'for channel:', channelName)

    chatChannelSubscription = subscription.listen((data) => {
      // console.log('[ChatView] WebSocket data received:', {
      //   type: data?.type,
      //   channel: channelName,
      //   feedId: data?.feedId,
      //   messageId: data?.messageId,
      //   hasTranscription: !!data?.transcription,
      //   currentUserId: ctx.user?.id,
      //   dataKeys: Object.keys(data || {})
      // })

      if (data?.type === 'transcription-completed') {
        // console.log('[ChatView] Received transcription-completed:', {
        //   messageId: data.messageId,
        //   fileHash: data.fileHash,
        //   transcriptionLength: data.transcription?.length,
        //   currentUserId: ctx.user?.id,
        //   messagesCount: messages.value.length
        // })

        // Ищем сообщение по messageId ИЛИ по fileHash в данных сообщения
        const idx = messages.value.findIndex((m) => {
          if (m.id === data.messageId) return true
          // Также проверяем fileHash в прикрепленных файлах
          if (m.files && m.files.length > 0) {
            return m.files.some((f) => {
              const fHash = f.hash || f.uid || f.id
              return fHash === data.fileHash
            })
          }
          return false
        })

        if (idx !== -1) {
          const msg = messages.value[idx]
          // console.log('[ChatView] Before update - message data:', {
          //   messageId: msg.id,
          //   existingData: msg.data,
          //   existingVoiceTranscription: msg.data?.voiceTranscription?.substring(0, 50)
          // })

          // Создаем новый объект для гарантии реактивности
          const updatedMessage = {
            ...msg,
            data: {
              ...(msg.data || {}),
              voiceTranscription: data.transcription,
              voiceTranscriptionAt: new Date().toISOString()
            }
          }

          // Заменяем весь элемент массива для гарантии реактивности
          messages.value = messages.value.map((m, i) => (i === idx ? updatedMessage : m))

          // console.log('[ChatView] Updated message with transcription:', {
          //   index: idx,
          //   messageId: data.messageId,
          //   transcriptionLength: data.transcription?.length,
          //   newMessageData: updatedMessage.data
          // })
        } else {
          console.warn('[ChatView] Message not found for transcription:', {
            messageId: data.messageId,
            fileHash: data.fileHash,
            availableMessages: messages.value.map((m) => ({
              id: m.id,
              files: m.files?.map((f) => f.hash || f.uid || f.id)
            }))
          })
        }
      } else if (data?.type === 'transcription-error') {
        // console.log('[ChatView] Received transcription-error for message:', data.messageId, data.error)
      } else {
        // console.log('[ChatView] Other WebSocket event:', { type: data?.type, keys: Object.keys(data || {}) })
      }
    })

    // console.log('[ChatView] Subscribed to chat channel:', `chat-${props.feedId}`)
  } catch (error) {
    console.error('[ChatView] Failed to subscribe to chat channel:', error)
  }
}

// Fallback: периодическая проверка новых сообщений при отсутствии WebSocket
let fallbackPollTimer = null
const fallbackPollInterval = 10000 // 10 секунд

function startFallbackPolling() {
  if (fallbackPollTimer) clearInterval(fallbackPollTimer)
  fallbackPollTimer = setInterval(async () => {
    if (!isConnected.value && messages.value.length > 0) {
      // Подгружаем последние сообщения через API
      try {
        const wasAtBottom = isUserAtBottom()
        const response = await apiMessagesListRoute({ feedId: props.feedId })
          .query({ limit: 50 })
          .run(ctx)

        let hasNewMessages = false
        // Компенсация высоты: сохраняем позицию перед добавлением
        const container = messagesContainer.value
        let oldScrollHeight = 0
        let oldScrollTop = 0

        if (container) {
          oldScrollHeight = container.scrollHeight
          oldScrollTop = container.scrollTop
        }

        // Добавляем только новые сообщения
        response.messages.forEach((msg) => {
          if (!loadedMessageIds.value.has(msg.id)) {
            loadedMessageIds.value.add(msg.id)
            const normalizedMessage = normalizeMessageFields(msg)
            messages.value.push(normalizedMessage)
            hasNewMessages = true
          }
        })

        // Компенсация высоты: восстанавливаем позицию
        if (container && hasNewMessages) {
          nextTick(() => {
            const newScrollHeight = container.scrollHeight
            const heightDiff = newScrollHeight - oldScrollHeight
            container.scrollTop = oldScrollTop + heightDiff
          })
        }
      } catch (err) {
        // Игнорируем ошибки fallback polling
      }
    }
  }, fallbackPollInterval)
}

function stopFallbackPolling() {
  if (fallbackPollTimer) {
    clearInterval(fallbackPollTimer)
    fallbackPollTimer = null
  }
}

// Синхронизация при восстановлении соединения
watch(isConnected, (connected, wasConnected) => {
  if (connected && !wasConnected) {
    // console.log('[ChatView] WebSocket reconnected, syncing messages...')
    // При восстановлении соединения используем MessageSync для надёжной синхронизации
    forceSync()
  }
})

watch(socketData, (data) => {
  if (!data) return

  if (data.type === 'chat-event' && data.feedId === props.feedId) {
    switch (data.event) {
      case 'new-message':
        handleNewMessage(data.message)
        break
      case 'edit-message':
        handleEditMessage(data.message)
        break
      case 'delete-message':
        handleDeleteMessage(data.message)
        break
      case 'new-participant':
        loadChat()
        break
      case 'participant-left':
        handleParticipantLeft(data)
        break
      case 'reaction-toggle':
        handleReactionUpdate(data)
        break
      case 'typing-start':
        handleTypingStart(data)
        break
      case 'typing-stop':
        handleTypingStop(data)
        break
      case 'message-pinned':
        pinnedMessage.value = data.message
        break
      case 'message-unpinned':
        pinnedMessage.value = null
        break
      case 'message-read':
        handleMessageRead(data)
        break
    }
  }

  // Обработка завершения транскрибации (видна всем пользователям)
  // Примечание: эта обработка дублируется в setupChatChannelSubscription для надёжности
  if (data?.type === 'transcription-completed' && data.feedId === props.feedId) {
    const idx = messages.value.findIndex((m) => m.id === data.messageId)
    if (idx !== -1) {
      const msg = messages.value[idx]
      // Обновляем data сообщения с транскрипцией
      messages.value[idx] = {
        ...msg,
        data: {
          ...(msg.data || {}),
          voiceTranscription: data.transcription,
          voiceTranscriptionAt: new Date().toISOString()
        }
      }
      // console.log('[ChatView] Updated message via socketData watch, index:', idx)
    }
  }
})

function handleNewMessage(message) {
  if (!loadedMessageIds.value.has(message.id)) {
    loadedMessageIds.value.add(message.id)
    const normalizedMessage = normalizeMessageFields(message)

    // Компенсация высоты: сохраняем позицию перед добавлением
    const container = messagesContainer.value
    let oldScrollHeight = 0
    let oldScrollTop = 0

    if (container) {
      oldScrollHeight = container.scrollHeight
      oldScrollTop = container.scrollTop
    }

    messages.value.push(normalizedMessage)

    // Обновляем список упоминаний
    nextTick(() => {
      updateUnreadMentions()
    })

    // Прокручиваем только если:
    // 1. Это своё сообщение (пользователь его только что отправил)
    // 2. ИЛИ пользователь уже находится внизу чата
    const isOwn = isOwnMessage(normalizedMessage)
    const atBottom = isUserAtBottom()

    if (isOwn || atBottom) {
      nextTick(() => {
        scrollToBottom(!isOwn) // force=true только если не своё сообщение
      })
    } else if (container) {
      // Компенсация высоты: пользователь читает историю — не дергаем прокрутку
      nextTick(() => {
        const newScrollHeight = container.scrollHeight
        const heightDiff = newScrollHeight - oldScrollHeight
        container.scrollTop = oldScrollTop + heightDiff
      })
    }

    if (document.visibilityState === 'visible') {
      markAsRead(normalizedMessage.id)
    }
  }
}

function handleEditMessage(message) {
  const idx = messages.value.findIndex((m) => m.id === message.id)
  if (idx !== -1) {
    messages.value[idx] = normalizeMessageFields(message)
  }
}

function handleDeleteMessage(message) {
  loadedMessageIds.value.delete(message.id)
  messages.value = messages.value.filter((m) => m.id !== message.id)
}

function handleReactionUpdate(data) {
  let reactions = data.reactions
  if (typeof reactions === 'string') {
    try {
      reactions = JSON.parse(reactions)
    } catch (e) {
      reactions = {}
    }
  }

  const idx = messages.value.findIndex((m) => m.id === data.messageId)
  if (idx !== -1) {
    const newReactions = JSON.parse(JSON.stringify(reactions))

    const newMessages = [...messages.value]
    newMessages[idx] = {
      ...newMessages[idx],
      reactions: newReactions,
      data: {
        ...(newMessages[idx].data || {}),
        reactions: newReactions
      }
    }
    messages.value = newMessages
  }
}

function handleTypingStart(data) {
  if (data.userId === ctx.user?.id) return

  const exists = typingUsers.value.find((u) => u.id === data.userId)
  if (!exists) {
    typingUsers.value.push({
      id: data.userId,
      name: data.userName
    })
  }
}

function handleTypingStop(data) {
  typingUsers.value = typingUsers.value.filter((u) => u.id !== data.userId)
}

function handleMessageRead(data) {
  if (!readReceipts.value[data.messageId]) {
    readReceipts.value[data.messageId] = { readBy: [] }
  }
  readReceipts.value[data.messageId].readBy.push({
    userId: data.userId,
    readAt: data.readAt
  })
}

function handleParticipantLeft(data) {
  // Удаляем участника из локального списка (приводим к строке для сравнения)
  const leftUserId = String(data.userId)
  participants.value = participants.value.filter((p) => String(p.userId) !== leftUserId)
}

function normalizeMessageFields(message) {
  let reactions = message.reactions || message.data?.reactions || {}
  if (typeof reactions === 'string') {
    try {
      reactions = JSON.parse(reactions)
    } catch (e) {
      reactions = {}
    }
  }

  // Нормализуем файлы, чтобы сохранить метаданные (duration, isVoiceMessage, isVideoNote)
  let files = message.files || message.data?.files || []
  if (files && files.length > 0) {
    files = files.map((file) => ({
      ...file,
      // Убедимся, что эти поля доступны
      duration: file.duration,
      isVoiceMessage: file.isVoiceMessage,
      isVideoNote: file.isVideoNote
    }))
  }

  // Извлекаем forwardedFrom из данных сообщения
  const forwardedFrom = message.data?.forwardedFrom || null

  return {
    ...message,
    createdBy: message.createdBy || message.created_by,
    updatedBy: message.updatedBy || message.updated_by,
    createdAt: message.createdAt || message.created_at,
    updatedAt: message.updatedAt || message.updated_at,
    replyTo: message.replyTo || message.reply_to,
    reactions,
    files,
    data: {
      ...(message.data || {}),
      forwardedFrom
    }
  }
}

function getMessageReactions(message) {
  let reactions = message.reactions || message.data?.reactions || {}

  if (typeof reactions === 'string') {
    try {
      reactions = JSON.parse(reactions)
    } catch (e) {
      reactions = {}
    }
  }

  return reactions
}

function isOwnMessage(message) {
  return String(getMessageAuthorId(message)) === String(ctx.user?.id)
}

function getMessageAuthorId(message) {
  if (message.author?.id) return message.author.id
  if (message.createdBy) {
    if (typeof message.createdBy === 'string') return message.createdBy
    if (message.createdBy.id) return message.createdBy.id
  }
  if (message.created_by) {
    if (typeof message.created_by === 'string') return message.created_by
    if (message.created_by.id) return message.created_by.id
  }
  return ''
}

function getMessageAuthor(message) {
  if (message.author) return message.author

  const authorId = getMessageAuthorId(message)
  if (!authorId) return null

  const participant = participants.value.find((p) => String(p.userId) === String(authorId))
  return participant?.user || null
}

function getMessageAuthorName(message) {
  const author = getMessageAuthor(message)
  if (!author) return 'Неизвестно'

  if (author.id === ctx.user?.id) return 'Вы'

  return author.firstName
    ? author.lastName
      ? `${author.firstName} ${author.lastName}`
      : author.firstName
    : author.displayName || author.username || 'Пользователь'
}

function getMessageAuthorInitials(message) {
  const author = getMessageAuthor(message)
  if (!author) return '?'

  const firstName = author.firstName || ''
  const lastName = author.lastName || ''

  if (firstName && lastName) {
    return (firstName[0] + lastName[0]).toUpperCase()
  }
  if (firstName) {
    return firstName.substring(0, 2).toUpperCase()
  }
  if (author.displayName) {
    return author.displayName.substring(0, 2).toUpperCase()
  }
  return author.username?.substring(0, 2).toUpperCase() || '?'
}

function getReplyToMessage(message) {
  const replyId = message.replyTo || message.reply_to
  if (!replyId) return null

  return messages.value.find((m) => m.id === replyId) || null
}

function isEdited(message) {
  return (
    message.updatedAt &&
    message.createdAt &&
    new Date(message.updatedAt).getTime() !== new Date(message.createdAt).getTime()
  )
}

function hasReactions(message) {
  return message.reactions && Object.keys(message.reactions).length > 0
}

function hasUserReacted(message, emoji) {
  const reactions = getMessageReactions(message)
  const users = reactions[emoji] || []
  return users.some((u) => u?.user_id === ctx.user?.id)
}

function getReactionTooltip(emoji, users) {
  if (!Array.isArray(users)) return emoji

  const count = users.length
  if (count === 0) return emoji

  const hasMine = users.some((u) => u?.user_id === ctx.user?.id)

  if (count === 1 && hasMine) return 'Вы'
  if (hasMine) return `Вы и ещё ${count - 1}`
  return `${count}`
}

async function toggleReaction(message, emoji) {
  if (!message) return

  try {
    const { apiReactionsToggleRoute } = await import('../api/reactions')
    const result = await apiReactionsToggleRoute({ feedId: props.feedId }).run(ctx, {
      messageId: message.id,
      emoji
    })

    // Извлекаем реакции из ответа API
    let reactions = result.message?.reactions || result.message?.data?.reactions || {}
    if (typeof reactions === 'string') {
      try {
        reactions = JSON.parse(reactions)
      } catch (e) {
        reactions = {}
      }
    }

    // Обновляем сообщение
    const idx = messages.value.findIndex((m) => m.id === message.id)
    if (idx !== -1) {
      const reactionsCopy = JSON.parse(JSON.stringify(reactions))
      const newMessages = [...messages.value]
      newMessages[idx] = {
        ...newMessages[idx],
        reactions: reactionsCopy,
        data: {
          ...(newMessages[idx].data || {}),
          reactions: reactionsCopy
        }
      }
      messages.value = newMessages
    }
  } catch (err) {
    console.error('Failed to toggle reaction:', err)
  }
}

function showAllReactions(message) {
  // Показать все реакции (можно расширить в будущем)
  // console.log('Show all reactions for message:', message.id)
}

function getMessageStatus(message) {
  const receipts = readReceipts.value[message.id]
  if (receipts && receipts.readBy && receipts.readBy.length > 0) {
    const othersRead = receipts.readBy.filter((r) => r.userId !== ctx.user?.id)
    if (othersRead.length > 0) return 'read'
  }

  return 'delivered'
}

function onReactionUpdate({ messageId, reactions }) {
  let newReactions = reactions
  if (typeof reactions === 'string') {
    try {
      newReactions = JSON.parse(reactions)
    } catch (e) {
      newReactions = {}
    }
  }

  const idx = messages.value.findIndex((m) => m.id === messageId)
  if (idx !== -1) {
    const reactionsCopy = JSON.parse(JSON.stringify(newReactions))

    const newMessages = [...messages.value]
    newMessages[idx] = {
      ...newMessages[idx],
      reactions: reactionsCopy,
      data: {
        ...(newMessages[idx].data || {}),
        reactions: reactionsCopy
      }
    }
    messages.value = newMessages
  }
}

async function showContextMenu(event, message) {
  contextMenu.value = {
    show: true,
    x: event.clientX,
    y: event.clientY,
    message,
    reactions: [],
    reactionsLoading: true,
    reactionsTotal: 0,
    showEmojiPicker: false,
    emojiCategory: 'recent'
  }

  await nextTick()

  if (contextMenuElement.value) {
    // Сначала позиционируем, потом настраиваем observer
    const rect = contextMenuElement.value.getBoundingClientRect()
    const position = calculatePositionFromPoint(
      event.clientX,
      event.clientY,
      { width: rect.width || 180, height: rect.height || 200 },
      4
    )

    contextMenu.value.x = position.x
    contextMenu.value.y = position.y

    // Корректируем позицию после рендера
    await nextTick()
    adjustMenuPosition()

    // Настраиваем ResizeObserver для отслеживания изменений размера
    setupMenuResizeObserver()
  }

  loadContextMenuReactions(message.id)
}

async function loadContextMenuReactions(messageId) {
  if (!messageId) return

  try {
    const result = await apiReactionsDetailsRoute({
      feedId: props.feedId,
      messageId
    }).run(ctx)

    contextMenu.value.reactions = result.reactions || []
    contextMenu.value.reactionsTotal = result.totalCount || 0
  } catch (err) {
    console.error('Failed to load reactions:', err)
    contextMenu.value.reactions = []
    contextMenu.value.reactionsTotal = 0
  } finally {
    contextMenu.value.reactionsLoading = false
  }
}

async function toggleEmojiPicker() {
  contextMenu.value.showEmojiPicker = !contextMenu.value.showEmojiPicker

  if (contextMenu.value.showEmojiPicker) {
    // Ждем обновления DOM и пересчитываем позицию
    await nextTick()
    adjustMenuPosition()
  }
}

// ResizeObserver для отслеживания изменений размера меню
let menuResizeObserver = null

function setupMenuResizeObserver() {
  // Отключаем предыдущий observer если есть
  if (menuResizeObserver) {
    menuResizeObserver.disconnect()
    menuResizeObserver = null
  }

  if (!contextMenuElement.value) return

  menuResizeObserver = new ResizeObserver(() => {
    // При изменении размера корректируем позицию
    nextTick(() => adjustMenuPosition())
  })

  menuResizeObserver.observe(contextMenuElement.value)
}

function adjustMenuPosition() {
  if (!contextMenuElement.value) return

  const menu = contextMenuElement.value
  const rect = menu.getBoundingClientRect()
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const padding = 10 // Отступ от краёв экрана

  let newX = contextMenu.value.x
  let newY = contextMenu.value.y

  // Проверяем выход за правый край
  if (newX + rect.width > viewportWidth - padding) {
    newX = viewportWidth - rect.width - padding
  }

  // Проверяем выход за левый край
  if (newX < padding) {
    newX = padding
  }

  // Проверяем выход за нижний край
  if (newY + rect.height > viewportHeight - padding) {
    // Если меню слишком высокое — позиционируем от нижнего края с отступом
    if (rect.height > viewportHeight - 2 * padding) {
      newY = padding
    } else {
      // Иначе смещаем вверх
      newY = viewportHeight - rect.height - padding
    }
  }

  // Проверяем верхний край
  if (newY < padding) {
    newY = padding
  }

  contextMenu.value.x = newX
  contextMenu.value.y = newY
}

function formatReactionDate(dateString) {
  if (!dateString) return ''

  const date = new Date(dateString)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()

  if (isToday) {
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  } else {
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
}

function closeContextMenu() {
  contextMenu.value.show = false
  contextMenu.value.showEmojiPicker = false
  contextMenu.value.emojiCategory = 'recent'

  // Отключаем ResizeObserver при закрытии
  if (menuResizeObserver) {
    menuResizeObserver.disconnect()
    menuResizeObserver = null
  }
}

async function toggleEmojiPickerPopup() {
  showEmojiPickerPopup.value = !showEmojiPickerPopup.value

  if (showEmojiPickerPopup.value) {
    await nextTick()
    updateEmojiPickerPosition()

    // Закрываем при клике вне пикера
    setTimeout(() => {
      document.addEventListener('click', closeEmojiPickerOnClickOutside, { once: true })
    }, 0)
  }
}

function closeEmojiPickerOnClickOutside(event) {
  const picker = emojiPickerPopup.value
  const button = emojiPickerButton.value
  if (picker && !picker.contains(event.target) && button && !button.contains(event.target)) {
    showEmojiPickerPopup.value = false
  }
}

function updateEmojiPickerPosition() {
  if (!emojiPickerButton.value || !emojiPickerPopup.value) return

  const buttonRect = emojiPickerButton.value.getBoundingClientRect()
  const popupRect = emojiPickerPopup.value.getBoundingClientRect()
  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight
  }

  // По умолчанию показываем над кнопкой
  let x = buttonRect.left - popupRect.width / 2 + buttonRect.width / 2
  let y = buttonRect.top - popupRect.height - 8

  // Проверяем границы viewport
  if (x < 10) x = 10
  if (x + popupRect.width > viewport.width - 10) x = viewport.width - popupRect.width - 10
  if (y < 10) {
    // Если не помещается сверху — показываем снизу
    y = buttonRect.bottom + 8
  }

  emojiPickerPosition.value = { x, y }
}

function insertEmoji(emoji) {
  const textarea = messageInput.value
  if (!textarea) return

  const start = textarea.selectionStart || 0
  const end = textarea.selectionEnd || 0
  const text = newMessage.value

  // Вставляем эмодзи в текущую позицию курсора
  newMessage.value = text.substring(0, start) + emoji + text.substring(end)

  // Восстанавливаем фокус и устанавливаем позицию после вставленного эмодзи
  nextTick(() => {
    textarea.focus()
    const newPosition = start + emoji.length
    textarea.selectionStart = textarea.selectionEnd = newPosition

    // Вызываем handleInput для обновления высоты
    handleInput()
  })
}

function showMobileMessageMenu(message) {
  mobileMessageMenu.value = { show: true, message }
}

// Вход в режим выбора сообщений
function enterSelectionMode(message) {
  isSelectionMode.value = true
  selectedMessageIds.value.clear()
  if (message) {
    selectedMessageIds.value.add(message.id)
  }
}

// Выход из режима выбора
function exitSelectionMode() {
  isSelectionMode.value = false
  selectedMessageIds.value.clear()
}

// Переключение выбора сообщения
function toggleMessageSelection(messageId) {
  if (selectedMessageIds.value.has(messageId)) {
    selectedMessageIds.value.delete(messageId)
    // Если ничего не выбрано - выходим из режима выбора
    if (selectedMessageIds.value.size === 0) {
      exitSelectionMode()
    }
  } else {
    selectedMessageIds.value.add(messageId)
  }
}

// Проверка, выбрано ли сообщение
function isMessageSelected(messageId) {
  return selectedMessageIds.value.has(messageId)
}

// Получение выбранных сообщений в порядке их следования в чате
const selectedMessages = computed(() => {
  return sortedMessages.value.filter((msg) => selectedMessageIds.value.has(msg.id))
})

// Копирование выбранных сообщений как текст
async function copySelectedMessages() {
  const texts = selectedMessages.value
    .map((msg) => {
      const author = getMessageAuthorName(msg)
      const time = formatTime(msg.createdAt)
      const text = msg.text || ''
      return `[${time}] ${author}: ${text}`
    })
    .filter((text) => text.length > 0)

  if (texts.length === 0) return

  const fullText = texts.join('\n')

  try {
    await navigator.clipboard.writeText(fullText)
    exitSelectionMode()
  } catch (err) {
    console.error('Failed to copy texts:', err)
    // Fallback
    const textarea = document.createElement('textarea')
    textarea.value = fullText
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    try {
      document.execCommand('copy')
      exitSelectionMode()
    } catch (e) {
      console.error('Fallback copy failed:', e)
    }
    document.body.removeChild(textarea)
  }
}

// Пересылка выбранных сообщений
function forwardSelectedMessages() {
  forwardingMessages.value = selectedMessages.value
}

// Удаление выбранных сообщений
async function deleteSelectedMessages() {
  const count = selectedMessageIds.value.size
  if (count === 0) return

  const messageIds = Array.from(selectedMessageIds.value)
  let deletedCount = 0

  for (const messageId of messageIds) {
    try {
      await apiMessagesDeleteRoute({ feedId: props.feedId }).run(ctx, { messageId })
      loadedMessageIds.value.delete(messageId)
      deletedCount++
    } catch (err) {
      console.error('Failed to delete message:', messageId, err)
    }
  }

  messages.value = messages.value.filter((m) => !selectedMessageIds.value.has(m.id))
  exitSelectionMode()
}

async function copyMessageText(message) {
  if (!message?.text) return

  try {
    await navigator.clipboard.writeText(message.text)
    // Можно добавить тост-уведомление в будущем
  } catch (err) {
    console.error('Failed to copy text:', err)
    // Fallback для старых браузеров
    const textarea = document.createElement('textarea')
    textarea.value = message.text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    try {
      document.execCommand('copy')
    } catch (e) {
      console.error('Fallback copy failed:', e)
    }
    document.body.removeChild(textarea)
  }
}

function getChatInitials(title) {
  if (!title) return '?'
  return title
    .split(' ')
    .map((w) => w[0])
    .join('')
    .substring(0, 2)
    .toUpperCase()
}

// Стили для аватарки в шапке чата
function getChatHeaderAvatarStyle() {
  if (!chat.value) return {}

  // Если у чата есть аватарка
  if (chat.value.avatarHash) {
    return {
      background: `url(https://fs.chatium.ru/thumbnail/${chat.value.avatarHash}/s/200x) center/cover no-repeat`
    }
  }

  // Для личного чата показываем аватарку собеседника
  if (chat.value.type === 'direct' && otherUser.value?.avatar) {
    return {
      background: `url(${otherUser.value.avatar}) center/cover no-repeat`
    }
  }

  // Градиент по умолчанию
  return getParticipantAvatarStyle({ userId: chat.value?.id || 'default' })
}

function hasChatHeaderAvatar() {
  if (!chat.value) return false
  if (chat.value.avatarHash) return true
  if (chat.value.type === 'direct' && otherUser.value?.avatar) return true
  return false
}

// Стили для аватарки в информации о чате
function getChatInfoAvatarStyle() {
  if (!chat.value) return {}

  // Если у чата есть аватарка
  if (chat.value.avatarHash) {
    return {
      background: `url(https://fs.chatium.ru/thumbnail/${chat.value.avatarHash}/s/300x) center/cover no-repeat`
    }
  }

  // Для личного чата показываем аватарку собеседника
  if (chat.value.type === 'direct' && otherUser.value?.avatar) {
    return {
      background: `url(${otherUser.value.avatar}) center/cover no-repeat`
    }
  }

  // Градиент по умолчанию (больший размер)
  const colors = [
    ['#667eea', '#764ba2'],
    ['#f093fb', '#f5576c'],
    ['#4facfe', '#00f2fe'],
    ['#43e97b', '#38f9d7'],
    ['#fa709a', '#fee140']
  ]
  const index = (chat.value?.id?.charCodeAt(0) || 0) % colors.length
  const [from, to] = colors[index]
  return {
    background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`
  }
}

function hasChatInfoAvatar() {
  if (!chat.value) return false
  if (chat.value.avatarHash) return true
  if (chat.value.type === 'direct' && otherUser.value?.avatar) return true
  return false
}

function getUserName(userId) {
  if (String(userId) === String(ctx.user?.id)) return 'Вы'
  const participant = participants.value.find((p) => p.userId === userId)
  if (participant?.user) {
    const name = participant.user.firstName
      ? participant.user.lastName
        ? `${participant.user.firstName} ${participant.user.lastName}`
        : participant.user.firstName
      : participant.user.displayName
    return name || participant.user.username || userId.substring(0, 8)
  }
  return userId.substring(0, 8)
}

function getParticipantInitials(participant) {
  if (participant.user) {
    const firstName = participant.user.firstName
    const lastName = participant.user.lastName
    if (firstName && lastName) {
      return (firstName[0] + lastName[0]).toUpperCase()
    }
    if (firstName) {
      return firstName.substring(0, 2).toUpperCase()
    }
    if (participant.user.displayName) {
      return participant.user.displayName.substring(0, 2).toUpperCase()
    }
  }
  return participant.userId.substring(0, 2).toUpperCase()
}

function getParticipantAvatarStyle(participant) {
  const colors = [
    ['#667eea', '#764ba2'],
    ['#f093fb', '#f5576c'],
    ['#4facfe', '#00f2fe'],
    ['#43e97b', '#38f9d7'],
    ['#fa709a', '#fee140'],
    ['#a8edea', '#fed6e3'],
    ['#d299c2', '#fef9d7'],
    ['#89f7fe', '#66a6ff']
  ]
  const index = participant.userId.charCodeAt(0) % colors.length
  const [from, to] = colors[index]
  return {
    background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`
  }
}

function formatTime(date) {
  if (!date) return ''
  const d = new Date(date)
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

function shouldShowDateDivider(message, index) {
  if (index === 0) return true

  const currentDate = new Date(message.createdAt)
  const prevMessage = sortedMessages.value[index - 1]
  const prevDate = new Date(prevMessage.createdAt)

  // Показываем даторазделитель, если дата изменилась
  return currentDate.toDateString() !== prevDate.toDateString()
}

function formatParticipants(count) {
  if (count === 1) return '1 участник'
  if (count < 5) return `${count} участника`
  return `${count} участников`
}

function formatSubscribers(count) {
  if (count === 1) return '1 подписчик'
  if (count < 5) return `${count} подписчика`
  return `${count} подписчиков`
}

function getRoleLabel(role) {
  const isChan = isChannel.value
  const labels = {
    owner: 'Владелец',
    admin: 'Администратор',
    guest: isChan ? 'Подписчик' : 'Участник'
  }
  return labels[role] || role
}

function getChatTypeLabel(type) {
  const labels = {
    direct: 'Личный чат',
    group: 'Групповой чат',
    channel: 'Канал'
  }
  return labels[type] || 'Чат'
}

async function loadChat() {
  // Сначала проверяем, не забанен ли пользователь (даже если не участник)
  await checkMyModeration()

  // Если пользователь забанен - показываем экран бана и не загружаем чат
  if (isBanned.value) {
    // Загружаем базовую инфу о чате для отображения названия
    try {
      const response = await apiChatGetRoute({ feedId: props.feedId }).run(ctx)
      chat.value = response.chat
    } catch (err) {
      // Если не удалось загрузить чат - не критично, покажем без названия
      // console.log('Failed to load chat info for banned user:', err.message)
    }
    loading.value = false
    // Сбрасываем accessCheck.loading чтобы экран бана отобразился
    accessCheck.value.loading = false
    return
  }

  // Проверяем доступ к чату (для платных)
  const hasAccess = await checkAccess(props.feedId)

  if (!hasAccess && accessCheck.value.isPaid) {
    // Для платного чата без доступа - показываем UI подписки
    // Базовая инфа уже загружена в checkAccess через apiChatPublicInfoRoute
    chat.value = accessCheck.value.chat
    return
  }

  // Загружаем полный чат если есть доступ
  try {
    const response = await apiChatGetRoute({ feedId: props.feedId }).run(ctx)
    chat.value = response.chat
    participants.value = response.participants

    editChat.value = {
      title: chat.value.title,
      description: chat.value.description || '',
      isPublic: chat.value.isPublic,
      avatarHash: chat.value.avatarHash || null
    }

    if (isMember.value) {
      await loadMessages()
      await loadPinnedMessages()
      await loadParticipantsModerations()
      // Сбрасываем badge при открытии чата
      await resetChatBadge()
    } else {
      // Для не-участников проверяем, можно ли вступить
      await checkCanJoin()
    }

    nextTick(() => {
      // Фокус на поле ввода только на десктопе (на мобиле это вызывает появление клавиатуры)
      if (messageInput.value && canPostMessages.value && !isMobile.value && !myModeration.value) {
        messageInput.value.focus()
      }
    })
  } catch (err) {
    if (err.message?.includes('не найден')) {
      emit('chat-deleted', props.feedId)
      return
    }
    // console.log('Failed to load chat:', err.message)
  }
}

async function checkCanJoin() {
  joinCheckLoading.value = true
  try {
    const result = await apiChatCheckJoinRoute({ feedId: props.feedId }).run(ctx)
    hasAcceptedInvite.value = result.canJoin && result.hasInvite
    // Обновляем флаг публичности чата на основе ответа
    if (result.canJoin && result.isPublic) {
      chat.value = { ...chat.value, isPublic: true }
    }
  } catch (err) {
    // console.log('Failed to check join access:', err.message)
    hasAcceptedInvite.value = false
  } finally {
    joinCheckLoading.value = false
  }
}

async function onSubscribed() {
  // После успешной подписки перезагружаем чат
  resetAccess()
  await loadChat()
}

async function loadPinnedMessages() {
  const currentFeedId = props.feedId

  try {
    const response = await apiPinnedGetRoute({ feedId: props.feedId }).run(ctx)
    if (props.feedId === currentFeedId) {
      pinnedMessage.value = response.pinnedMessage || null
    }
  } catch (err) {
    if (props.feedId === currentFeedId) {
      pinnedMessage.value = null
    }
  }
}

function handleUnpin() {
  pinnedMessage.value = null
}

async function loadMessages(silent = false) {
  loading.value = true
  try {
    const response = await apiMessagesListRoute({ feedId: props.feedId }).run(ctx)

    loading.value = false

    loadedMessageIds.value.clear()
    response.messages.forEach((m) => {
      loadedMessageIds.value.add(m.id)
      m.createdBy = m.createdBy || m.created_by
      m.createdAt = m.createdAt || m.created_at
      m.updatedAt = m.updatedAt || m.updated_at
      m.replyTo = m.replyTo || m.reply_to
      m.reactions = m.reactions || m.data?.reactions || {}

      // Логируем транскрипцию если есть
      if (m.data?.voiceTranscription) {
        // console.log('[ChatView] Loaded message with transcription:', {
        //   messageId: m.id,
        //   transcriptionLength: m.data.voiceTranscription.length
        // })
      }
    })

    messages.value = response.messages
    hasMoreMessages.value = response.hasMore

    // Загружаем прочитанные упоминания с сервера
    await loadReadMentionsFromServer()

    // Обновляем список упоминаний после загрузки сообщений
    updateUnreadMentions()

    // Если нужно перейти к конкретному сообщению — загружаем вокруг него
    if (props.targetMessageId && !messages.value.some((m) => m.id === props.targetMessageId)) {
      await loadAroundMessage(props.targetMessageId)
    }
  } catch (err) {
    if (err.message?.includes('не найден')) {
      loading.value = false
      return
    }
    // console.log('Failed to load messages:', err.message)
  } finally {
    loading.value = false
    // Даём время на полный рендеринг контента (изображения и т.д.)
    await nextTick()

    if (props.targetMessageId) {
      scrollToMessage(props.targetMessageId)
      emit('message-viewed')
    } else {
      // Используем force=true для гарантированной прокрутки при открытии чата
      // Добавляем небольшую задержку, чтобы изображения успели загрузиться
      setTimeout(() => {
        scrollToBottom(true)
      }, 100)
    }

    setupReadObserver()
  }
}

async function loadAroundMessage(targetId) {
  try {
    const response = await apiMessagesAroundRoute({ feedId: props.feedId })
      .query({ aroundId: targetId, limit: 50 })
      .run(ctx)

    loadedMessageIds.value.clear()
    response.messages.forEach((m) => {
      loadedMessageIds.value.add(m.id)
      m.createdBy = m.createdBy || m.created_by
      m.createdAt = m.createdAt || m.created_at
      m.updatedAt = m.updatedAt || m.updated_at
      m.replyTo = m.replyTo || m.reply_to
      m.reactions = m.reactions || m.data?.reactions || {}
    })

    messages.value = response.messages
    hasMoreMessages.value = response.hasMore
  } catch (err) {
    console.error('Failed to load messages around:', err)
  }
}

async function loadMoreMessages() {
  if (loadingMore.value || !hasMoreMessages.value || messages.value.length === 0) {
    return
  }

  loadingMore.value = true

  try {
    const container = messagesContainer.value
    if (!container) return

    // Сохраняем позицию первого видимого сообщения для якорения
    const firstVisibleMessage = findFirstVisibleMessage(container)
    let anchorElement = null
    let anchorOffset = 0

    if (firstVisibleMessage) {
      anchorElement = firstVisibleMessage.element
      anchorOffset = firstVisibleMessage.offset
    } else {
      // Fallback: используем старую логику если не нашли видимое сообщение
      anchorElement = container.firstElementChild
      anchorOffset = container.scrollTop
    }

    const oldestMessage = messages.value[0]

    const response = await apiMessagesListRoute({ feedId: props.feedId })
      .query({ beforeId: oldestMessage.id, limit: 30 })
      .run(ctx)

    if (response.messages.length > 0) {
      const newMessages = response.messages.filter((m) => !loadedMessageIds.value.has(m.id))

      if (newMessages.length > 0) {
        newMessages.forEach((m) => {
          loadedMessageIds.value.add(m.id)
          m.createdBy = m.createdBy || m.created_by
          m.createdAt = m.createdAt || m.created_at
          m.updatedAt = m.updatedAt || m.updated_at
          m.replyTo = m.replyTo || m.reply_to
        })
        messages.value.unshift(...newMessages)
      }

      hasMoreMessages.value = response.hasMore

      // Восстанавливаем позицию прокрутки относительно якорного элемента
      await nextTick()
      restoreScrollPosition(container, anchorElement, anchorOffset)
    } else {
      hasMoreMessages.value = false
    }
  } catch (err) {
    console.error('Failed to load more messages:', err)
  } finally {
    loadingMore.value = false
  }
}

// Находит первое видимое сообщение для якорения
function findFirstVisibleMessage(container) {
  const messageElements = container.querySelectorAll('.message[id^="message-"], .system-message')
  const containerRect = container.getBoundingClientRect()

  for (const el of messageElements) {
    const rect = el.getBoundingClientRect()
    // Сообщение считается видимым если его верхняя часть в пределах контейнера
    if (rect.top >= containerRect.top && rect.top < containerRect.bottom) {
      return {
        element: el,
        offset: rect.top - containerRect.top
      }
    }
  }
  return null
}

// Восстанавливает позицию прокрутки относительно якорного элемента
function restoreScrollPosition(container, anchorElement, anchorOffset) {
  if (!anchorElement) {
    // Fallback: используем старую логику
    return
  }

  // Проверяем что элемент всё ещё в DOM
  if (!container.contains(anchorElement)) {
    return
  }

  const containerRect = container.getBoundingClientRect()
  const anchorRect = anchorElement.getBoundingClientRect()
  const newOffset = anchorRect.top - containerRect.top
  const diff = newOffset - anchorOffset

  // Корректируем прокрутку чтобы вернуть элемент на то же место
  container.scrollTop += diff
}

function selectFiles() {
  fileInput.value?.click()
}

async function handleFileSelect(event) {
  const files = event.target.files
  if (!files || files.length === 0) return

  for (const file of files) {
    await processFile(file)
  }

  event.target.value = ''
}

async function processFile(file) {
  // Проверяем валидность файла
  if (!file || !(file instanceof Blob) || file.size === 0) {
    console.error('Invalid file:', file)
    alert('Ошибка: файл пустой или не выбран')
    return
  }

  const isImage = file.type?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name)
  const fileObj = reactive({
    file,
    name: file.name || 'file',
    size: file.size,
    type: file.type || 'application/octet-stream',
    isImage,
    preview: isImage ? URL.createObjectURL(file) : null,
    uploading: true,
    progress: 0,
    hash: null
  })
  selectedFiles.value.push(fileObj)

  try {
    const hash = await uploadFile(fileObj)
    fileObj.hash = hash
    fileObj.uploading = false
  } catch (err) {
    console.error('Failed to upload file:', err)
    removeFile(selectedFiles.value.indexOf(fileObj))
    alert(`Не удалось загрузить файл ${fileObj.name}: ${err.message}`)
  }
}

async function handlePaste(event) {
  const items = event.clipboardData?.items
  if (!items) return

  const imageItems = []

  for (const item of items) {
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile()
      if (file) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        const extension = item.type.split('/')[1] || 'png'
        const newFile = new File([file], `image-${timestamp}.${extension}`, { type: item.type })
        imageItems.push(newFile)
      }
    }
  }

  if (imageItems.length > 0) {
    event.preventDefault()

    for (const file of imageItems) {
      await processFile(file)
    }
  }
}

async function uploadFile(fileObj) {
  const { uploadUrl } = await apiFilesGetUploadUrlRoute.run(ctx)

  return new Promise((resolve, reject) => {
    let formData

    try {
      formData = new FormData()

      // Получаем файл и его имя
      const file = fileObj.file
      const fileName = file.name || fileObj.name || 'voice-message.webm'

      // console.log('Preparing upload:', {
      //   fileName,
      //   fileType: file.type,
      //   fileSize: file.size,
      //   isFile: file instanceof File,
      //   isBlob: file instanceof Blob,
      // })

      // Важно: Firefox требует явного указания имени файла (третий параметр)
      // Используем имя поля 'Filedata' как ожидает сервер Chatium
      formData.append('Filedata', file, fileName)

      // Проверяем что FormData содержит файл
      const formDataEntries = Array.from(formData.entries())
      // console.log('FormData entries:', formDataEntries.map(([k, v]) => ({
      //   key: k,
      //   name: v.name,
      //   type: v.type,
      //   size: v.size,
      // })))
    } catch (formError) {
      console.error('Error creating FormData:', formError)
      reject(new Error('Failed to prepare upload data'))
      return
    }

    const xhr = new XMLHttpRequest()

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        fileObj.progress = Math.round((e.loaded / e.total) * 100)
      }
    })

    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        // Ответ сервера - это просто hash файла
        // Используем xhr.response, так как установили responseType = 'text'
        const hash = xhr.response || xhr.responseText

        if (!hash) {
          console.error('Empty response from server')
          reject(new Error('Empty response from server'))
          return
        }

        // console.log('Upload successful, hash:', hash.substring(0, 50))
        resolve(hash)
      } else {
        // Логируем подробности ошибки
        console.error('Upload failed:', {
          status: xhr.status,
          statusText: xhr.statusText,
          response: xhr.responseText?.substring(0, 1000),
          contentType: xhr.getResponseHeader('content-type'),
          responseType: xhr.responseType,
          allResponseHeaders: xhr.getAllResponseHeaders()
        })

        // Попробуем распарсить как XML/HTML для диагностики
        const responseText = xhr.responseText || ''
        if (responseText.startsWith('<')) {
          console.error('Server returned HTML/XML error page:', responseText.substring(0, 500))
        }

        reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`))
      }
    })

    xhr.addEventListener('error', (e) => {
      console.error('Upload network error:', {
        event: e,
        status: xhr.status,
        statusText: xhr.statusText,
        readyState: xhr.readyState,
        response: xhr.response,
        responseText: xhr.responseText
      })

      // Проверяем, возможно это CORS-ошибка
      if (xhr.status === 0 && xhr.readyState === 4) {
        console.error('Possible CORS error or network failure')
      }

      reject(new Error('Upload failed: network error (status: ' + xhr.status + ')'))
    })

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload aborted'))
    })

    // Устанавливаем responseType для корректной обработки ответа
    xhr.responseType = 'text'

    xhr.open('POST', uploadUrl)

    // Явно указываем, что ожидаем текстовый ответ (не XML)
    xhr.setRequestHeader('Accept', 'text/plain, */*')

    // Логируем что отправляем (только для диагностики)
    const fileToUpload = fileObj.file
    // console.log('Uploading file:', {
    //   name: fileToUpload.name || fileObj.name,
    //   size: fileToUpload.size,
    //   type: fileToUpload.type,
    //   uploadUrl: uploadUrl.substring(0, 100) + '...',
    // })

    // Не устанавливаем Content-Type вручную - браузер сам установит правильный
    // с boundary для multipart/form-data
    xhr.send(formData)
  })
}

// Обработка записанного голосового сообщения
async function onVoiceRecorded({ file, duration }) {
  // Проверяем валидность файла
  if (!file || !(file instanceof Blob) || file.size === 0) {
    console.error('Invalid voice file:', file)
    alert('Ошибка записи: файл пустой или не создан')
    return
  }

  // console.log('Voice recorded:', {
  //   name: file.name,
  //   size: file.size,
  //   type: file.type,
  //   duration,
  //   isFile: file instanceof File,
  //   isBlob: file instanceof Blob,
  // })

  // Создаем объект файла для загрузки
  const voiceFile = reactive({
    file,
    name: file.name || `voice-message-${Date.now()}.webm`,
    size: file.size,
    type: file.type || 'audio/webm',
    isVoiceMessage: true,
    duration,
    preview: null,
    uploading: true,
    progress: 0,
    hash: null
  })

  selectedFiles.value.push(voiceFile)

  try {
    const hash = await uploadFile(voiceFile)
    voiceFile.hash = hash
    voiceFile.uploading = false

    // Автоматически отправляем голосовое
    await sendMessageWithFiles([voiceFile])
  } catch (err) {
    console.error('Failed to upload voice:', err)
    removeFile(selectedFiles.value.indexOf(voiceFile))
    alert('Не удалось загрузить голосовое сообщение: ' + err.message)
  }
}

// Обработка записанного видео-кружочка
async function onVideoRecorded({ file, duration }) {
  // Проверяем валидность файла
  if (!file) {
    alert('Ошибка записи: файл не создан')
    return
  }

  if (!(file instanceof Blob)) {
    alert('Ошибка записи: некорректный тип файла')
    return
  }

  if (file.size === 0) {
    alert('Ошибка записи: файл пустой')
    return
  }

  // console.log('Video recorded:', {
  //   name: file.name,
  //   size: file.size,
  //   type: file.type,
  //   duration,
  //   isFile: file instanceof File,
  //   isBlob: file instanceof Blob,
  // })

  // Создаем объект файла для загрузки
  const videoFile = reactive({
    file,
    name: file.name || `video-note-${Date.now()}.webm`,
    size: file.size,
    type: file.type || 'video/webm',
    isVideoNote: true,
    duration,
    preview: null,
    uploading: true,
    progress: 0,
    hash: null
  })

  selectedFiles.value.push(videoFile)

  try {
    const hash = await uploadFile(videoFile)
    videoFile.hash = hash
    videoFile.uploading = false

    // Автоматически отправляем видео
    await sendMessageWithFiles([videoFile])
  } catch (err) {
    console.error('Failed to upload video note:', err)
    removeFile(selectedFiles.value.indexOf(videoFile))
    alert('Не удалось загрузить видео-сообщение: ' + err.message)
  }
}

// Отправка сообщения с файлами (вспомогательная функция)
async function sendMessageWithFiles(files) {
  const uploadingFiles = files.filter((f) => f.uploading)
  if (uploadingFiles.length > 0) {
    return
  }

  if (typingTimeout) {
    clearTimeout(typingTimeout)
    typingTimeout = null
  }
  if (isTypingActive) {
    isTypingActive = false
    apiTypingStopRoute({ feedId: props.feedId }).run(ctx).catch(console.error)
  }

  sending.value = true

  try {
    const filesData = files.map((f) => {
      return {
        hash: f.hash,
        name: f.name,
        size: f.size,
        mimeType: f.type,
        isVoiceMessage: f.isVoiceMessage,
        isVideoNote: f.isVideoNote,
        duration: f.duration
      }
    })

    const result = await apiFilesUploadRoute({ feedId: props.feedId }).run(ctx, {
      files: filesData,
      text: '',
      replyTo: replyingTo.value?.id
    })

    // Очищаем отправленные файлы
    files.forEach((f) => {
      const idx = selectedFiles.value.indexOf(f)
      if (idx > -1) {
        selectedFiles.value.splice(idx, 1)
      }
    })

    replyingTo.value = null
  } catch (err) {
    console.error('Failed to send message:', err)
    alert('Не удалось отправить сообщение: ' + err.message)
  } finally {
    sending.value = false
    await nextTick()
    scrollToBottom()
  }
}

function removeFile(index) {
  const file = selectedFiles.value[index]
  if (file.preview) {
    URL.revokeObjectURL(file.preview)
  }
  selectedFiles.value.splice(index, 1)
}

function getUploadFileIcon(file) {
  const name = file.name || ''
  const type = file.type || ''

  if (type.startsWith('video/') || /\.(mp4|webm|ogg|mov|avi)$/i.test(name)) return 'fa-file-video'
  if (type.startsWith('audio/')) return 'fa-file-audio'
  if (name.endsWith('.pdf')) return 'fa-file-pdf'
  if (/\.(doc|docx)$/i.test(name)) return 'fa-file-word'
  if (/\.(xls|xlsx)$/i.test(name)) return 'fa-file-excel'
  if (/\.(ppt|pptx)$/i.test(name)) return 'fa-file-powerpoint'
  if (/\.(zip|rar)$/i.test(name)) return 'fa-file-archive'
  return 'fa-file'
}

async function sendMessage() {
  const hasText = newMessage.value.trim()
  const hasFiles = selectedFiles.value.length > 0

  if ((!hasText && !hasFiles) || sending.value) return

  const uploadingFiles = selectedFiles.value.filter((f) => f.uploading)
  if (uploadingFiles.length > 0) {
    alert('Подождите завершения загрузки файлов')
    return
  }

  if (typingTimeout) {
    clearTimeout(typingTimeout)
    typingTimeout = null
  }
  if (isTypingActive) {
    isTypingActive = false
    apiTypingStopRoute({ feedId: props.feedId }).run(ctx).catch(console.error)
  }

  sending.value = true
  const text = newMessage.value.trim()

  try {
    if (editingMessage.value) {
      await apiMessagesEditRoute({ feedId: props.feedId }).run(ctx, {
        messageId: editingMessage.value.id,
        text
      })
      const msg = messages.value.find((m) => m.id === editingMessage.value.id)
      if (msg) msg.text = text
      editingMessage.value = null
      newMessage.value = ''
      if (messageInput.value) {
        messageInput.value.style.height = 'auto'
      }
    } else if (hasFiles) {
      const filesData = selectedFiles.value.map((f) => ({
        hash: f.hash,
        name: f.name,
        size: f.size,
        mimeType: f.type
      }))

      await apiFilesUploadRoute({ feedId: props.feedId }).run(ctx, {
        files: filesData,
        text: text || '',
        replyTo: replyingTo.value?.id
      })

      selectedFiles.value.forEach((f) => {
        if (f.preview) URL.revokeObjectURL(f.preview)
      })
      selectedFiles.value = []
      newMessage.value = ''
      replyingTo.value = null
    } else {
      await apiMessagesSendRoute({ feedId: props.feedId }).run(ctx, {
        text,
        replyTo: replyingTo.value?.id
      })
      newMessage.value = ''
      replyingTo.value = null
      if (messageInput.value) {
        messageInput.value.style.height = 'auto'
      }
    }
  } catch (err) {
    console.error('Failed to send message:', err)
    alert('Не удалось отправить сообщение')
  } finally {
    sending.value = false
    await nextTick()
    scrollToBottom()
  }
}

function handleInputKeydown(event) {
  // Если открыт пикер упоминаний — не отправляем сообщение, позволяем пикеру обработать Enter
  if (showMentionPicker.value) {
    return
  }

  // На мобильных устройствах Enter добавляет новую строку, а не отправляет
  // Отправка только по кнопке
  if (isMobile.value) {
    return // Разрешаем стандартное поведение (переход на новую строку)
  }

  // На десктопе Enter отправляет сообщение, Shift+Enter — новая строка
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    sendMessage()
  }
}

function handleInput() {
  const textarea = messageInput.value
  if (textarea) {
    textarea.style.height = 'auto'
    const newHeight = Math.min(textarea.scrollHeight, lineHeight * maxInputRows)
    textarea.style.height = newHeight + 'px'
  }

  // Обрабатываем mention picker
  handleMentionInput()

  // Обновляем высоту панели ввода для позиционирования кнопки прокрутки
  nextTick(() => {
    if (inputAreaRef.value) {
      inputAreaHeight.value = inputAreaRef.value.offsetHeight
    }
  })

  if (!isTypingActive) {
    isTypingActive = true
    apiTypingStartRoute({ feedId: props.feedId }).run(ctx).catch(console.error)
  }

  if (typingTimeout) {
    clearTimeout(typingTimeout)
  }

  typingTimeout = setTimeout(() => {
    isTypingActive = false
    apiTypingStopRoute({ feedId: props.feedId }).run(ctx).catch(console.error)
  }, 3000)
}

// Обработка фокуса поля ввода (для мобильных при появлении клавиатуры)
function handleInputFocus() {
  // На мобильных при фокусе появляется клавиатура
  // Обновляем высоту панели ввода для позиционирования кнопки прокрутки
  if (isMobile.value) {
    setTimeout(() => {
      if (inputAreaRef.value) {
        inputAreaHeight.value = inputAreaRef.value.offsetHeight
      }
    }, 300)
  }
}

// Обработка потери фокуса полем ввода (для мобильных при скрытии клавиатуры)
function handleInputBlur() {
  // На мобильных при blur клавиатура скрывается
  if (isMobile.value) {
    setTimeout(() => {
      if (inputAreaRef.value) {
        inputAreaHeight.value = inputAreaRef.value.offsetHeight
      }
    }, 100)
  }
}

async function markAsRead(messageId) {
  // Проверяем, не отправляли ли уже запрос для этого сообщения
  if (sentReadMessages.value.has(messageId)) return

  // Добавляем в очередь ожидающих
  pendingReadMessages.value.add(messageId)

  // Очищаем предыдущий таймаут
  if (markAsReadTimeout) {
    clearTimeout(markAsReadTimeout)
  }

  // Устанавливаем новый таймаут для батчинга запросов
  markAsReadTimeout = setTimeout(async () => {
    const messagesToMark = Array.from(pendingReadMessages.value)
    pendingReadMessages.value.clear()

    if (messagesToMark.length === 0) return

    // Отмечаем все накопленные сообщения как "отправленные"
    messagesToMark.forEach((id) => sentReadMessages.value.add(id))

    // Сохраняем на сервере
    await saveReadMentionsToServer(messagesToMark)

    // Отправляем запрос только для последнего сообщения
    // (если пользователь прочитал позднее, значит прочитал и все предыдущие)
    const lastMessageId = messagesToMark[messagesToMark.length - 1]

    try {
      await apiReadReceiptsMarkRoute({ feedId: props.feedId }).run(ctx, {
        messageId: lastMessageId
      })
      // Обновляем список упоминаний после отметки как прочитанное
      updateUnreadMentions()
    } catch (err) {
      console.error('Failed to mark as read:', err)
      // В случае ошибки удаляем из sent, чтобы можно было повторить
      messagesToMark.forEach((id) => sentReadMessages.value.delete(id))
    }
  }, 500) // Дебаунс 500ms
}

function setupReadObserver() {
  if (readObserver) {
    readObserver.disconnect()
  }

  readObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const messageId = entry.target.id.replace('message-', '')
          const message = messages.value.find((m) => m.id === messageId)
          if (message && !isOwnMessage(message)) {
            markAsRead(messageId)

            // Если это последнее сообщение - сбрасываем badge
            const isLastMessage = messages.value.indexOf(message) === messages.value.length - 1
            if (isLastMessage) {
              resetChatBadge()
            }
          }
        }
      })
    },
    {
      root: messagesContainer.value,
      threshold: 0.5
    }
  )

  nextTick(() => {
    const messageElements = document.querySelectorAll('.message[id^="message-"]')
    messageElements.forEach((el) => readObserver.observe(el))
  })
}

function replyToMessage(message) {
  replyingTo.value = message
  nextTick(() => {
    // Фокус только на десктопе (на мобиле это вызовет клавиатуру)
    if (!isMobile.value) {
      messageInput.value?.focus()
    }
  })
}

function cancelReply() {
  replyingTo.value = null
  nextTick(() => {
    // Фокус только на десктопе
    if (!isMobile.value) {
      messageInput.value?.focus()
    }
  })
}

function forwardMessage(message) {
  forwardingMessage.value = message
  forwardingMessages.value = []
}

async function onMessagesForwarded({ chatId, messages: forwardedMessages, forwardedFrom }) {
  try {
    for (const msg of forwardedMessages) {
      const text = msg.text || ''
      // Используем forwardedFrom с автором из сообщения
      const msgForwardedFrom = msg.forwardedFrom || forwardedFrom

      if (msg.files && msg.files.length > 0) {
        await apiFilesUploadRoute({ feedId: chatId }).run(ctx, {
          files: msg.files,
          text,
          forwardedFrom: msgForwardedFrom
        })
      } else if (msg.text) {
        await apiMessagesSendRoute({ feedId: chatId }).run(ctx, {
          text,
          forwardedFrom: msgForwardedFrom
        })
      }
    }
    forwardingMessages.value = []
    exitSelectionMode()
  } catch (err) {
    console.error('Failed to forward messages:', err)
  }
}

async function onMessageForwarded({ chatId, text, files, forwardedFrom }) {
  try {
    // Отправляем текст как есть, без префикса — источник показывается в ForwardedFrom
    if (files && files.length > 0) {
      await apiFilesUploadRoute({ feedId: chatId }).run(ctx, {
        files: files,
        text: text || '',
        forwardedFrom
      })
    } else {
      await apiMessagesSendRoute({ feedId: chatId }).run(ctx, {
        text: text || '',
        forwardedFrom
      })
    }
    forwardingMessage.value = null
  } catch (err) {
    console.error('Failed to forward message:', err)
  }
}

async function pinMessage(message) {
  if (!canManage.value) return

  try {
    await apiPinnedSetRoute({ feedId: props.feedId }).run(ctx, {
      messageId: message.id
    })
    pinnedMessage.value = message
  } catch (err) {
    console.error('Failed to pin message:', err)
    alert('Не удалось закрепить сообщение')
  }
}

function editMessage(message) {
  editingMessage.value = message
  newMessage.value = message.text
  nextTick(() => {
    const input = messageInput.value
    if (input && !isMobile.value) {
      input.focus()
      input.selectionStart = input.selectionEnd = input.value.length
    }
  })
}

function cancelEdit() {
  editingMessage.value = null
  newMessage.value = ''
  if (messageInput.value) {
    messageInput.value.style.height = 'auto'
  }
}

async function deleteMessage(messageId) {
  if (!confirm('Удалить это сообщение?')) return

  try {
    await apiMessagesDeleteRoute({ feedId: props.feedId }).run(ctx, { messageId })
    loadedMessageIds.value.delete(messageId)
    messages.value = messages.value.filter((m) => m.id !== messageId)
  } catch (err) {
    console.error('Failed to delete message:', err)
    alert('Не удалось удалить сообщение')
  }
}

async function updateChat() {
  try {
    await apiChatUpdateRoute({ feedId: props.feedId }).run(ctx, editChat.value)
    chat.value = { ...chat.value, ...editChat.value }
    showSettings.value = false
  } catch (err) {
    console.error('Failed to update chat:', err)
    alert('Не удалось обновить чат')
  }
}

async function deleteChat() {
  if (!confirm('Вы уверены, что хотите удалить этот чат?')) return

  try {
    await apiChatDeleteRoute({ feedId: props.feedId }).run(ctx, {})
    emit('chat-deleted', props.feedId)
    emit('back')
  } catch (err) {
    console.error('Failed to delete chat:', err)
    alert('Не удалось удалить чат: ' + (err.message || 'Неизвестная ошибка'))
  }
}

async function deleteChatFromInfo() {
  activeModal.value = null
  await deleteChat()
}

async function updateChatFromEdit() {
  try {
    await apiChatUpdateRoute({ feedId: props.feedId }).run(ctx, editChat.value)
    chat.value = { ...chat.value, ...editChat.value }
    activeModal.value = null
    // Уведомляем родительский компонент об обновлении чата
    emit('chat-updated', props.feedId)
  } catch (err) {
    console.error('Failed to update chat:', err)
    alert('Не удалось обновить чат')
  }
}

// Методы для работы с аватаркой чата
function onChatAvatarSaved(hash) {
  editChat.value.avatarHash = hash
}

function onChatAvatarRemoved() {
  editChat.value.avatarHash = null
}

// Стили для аватарки в редакторе
function getChatEditAvatarStyle() {
  if (editChat.value.avatarHash) {
    return {
      background: `url(https://fs.chatium.ru/thumbnail/${editChat.value.avatarHash}/s/200x) center/cover no-repeat`
    }
  }
  return getParticipantAvatarStyle({ userId: props.feedId || 'default' })
}

function hasChatEditAvatar() {
  return !!editChat.value.avatarHash
}

async function onInvited() {
  await loadChat()
}

// Обработчик создания личного чата из панели участников
function onDirectChatCreated({ feedId, isNew }) {
  // Закрываем панель участников
  showParticipants.value = false
  // Переходим в личный чат
  emit('select-chat', feedId)
  window.location.hash = `#/chat/${feedId}`
}

// Показать профиль пользователя
function showUserProfile(message) {
  const author = getMessageAuthor(message)
  const authorId = getMessageAuthorId(message)
  if (!author || !authorId) return

  selectedUserProfile.value = {
    user: author,
    userId: authorId
  }
}

// Проверяем, содержит ли сообщение упоминание текущего пользователя
function checkForMentions(message) {
  if (!message.text || !ctx.user?.id) return false

  const text = message.text
  const userId = ctx.user.id

  // Проверяем формат @[Имя](userId)
  const mentionRegex = new RegExp(`@\\[[^\\]]+\\]\\(${userId}\\)`, 'i')
  if (mentionRegex.test(text)) return true

  // Проверяем, есть ли username текущего пользователя
  const myParticipant = participants.value.find((p) => String(p.userId) === String(userId))
  if (myParticipant?.user?.username) {
    const usernameRegex = new RegExp(`@${myParticipant.user.username}\\b`, 'i')
    if (usernameRegex.test(text)) return true
  }

  return false
}

// Обновляем список непрочитанных упоминаний
function updateUnreadMentions() {
  if (!isMember.value) return

  const currentUserId = ctx.user?.id
  unreadMentions.value = messages.value
    .filter((msg) => {
      // Пропускаем свои сообщения
      if (isOwnMessage(msg)) return false
      // Проверяем, что сообщение содержит упоминание
      if (!checkForMentions(msg)) return false
      // Проверяем, что сообщение не прочитано
      return !sentReadMessages.value.has(msg.id)
    })
    .map((msg) => msg.id)
}

// Обработка клика по индикатору упоминаний
function scrollToFirstUnreadMention() {
  if (unreadMentions.value.length === 0) return

  const firstMentionId = unreadMentions.value[0]
  scrollToMessage(firstMentionId)

  // Отмечаем как прочитанное
  markAsRead(firstMentionId)
}

// Обработка клика по упоминанию
function handleMentionClick({ userId, username }) {
  // Находим пользователя в участниках (по ID или username)
  const participant = participants.value.find((p) => {
    if (String(p.userId) === String(userId) || String(p.id) === String(userId)) return true
    // Если передан username или userId выглядит как username
    const searchUsername = username || userId
    if (searchUsername && p.user?.username) {
      return p.user.username.toLowerCase() === searchUsername.toLowerCase()
    }
    return false
  })

  if (participant?.user) {
    selectedUserProfile.value = {
      user: participant.user,
      userId: participant.userId
    }
  }
}

// Начать чат из профиля пользователя
function onUserProfileStartChat({ feedId }) {
  selectedUserProfile.value = null
  emit('select-chat', feedId)
  window.location.hash = `#/chat/${feedId}`
}

// Перейти в чат из профиля чата
function onChatProfileGoToChat(feedId) {
  emit('select-chat', feedId)
  window.location.hash = `#/chat/${feedId}`
}

// Показать профиль чата-источника
function showChatProfile(forwardedFrom) {
  if (!forwardedFrom) return
  selectedChatProfile.value = forwardedFrom
}

// Показать профиль автора пересланного сообщения
function showForwardedAuthorProfile({ userId, userName }) {
  if (!userId) return

  // Ищем пользователя в участниках текущего чата
  const participant = participants.value.find((p) => String(p.userId) === String(userId))

  if (participant?.user) {
    selectedUserProfile.value = {
      user: participant.user,
      userId: participant.userId
    }
  } else {
    // Если не нашли в участниках — создаём минимальный объект пользователя
    selectedUserProfile.value = {
      user: {
        id: userId,
        displayName: userName || 'Пользователь',
        firstName: userName || 'Пользователь'
      },
      userId: userId
    }
  }
}

// Получить данные о пересылке из сообщения
function getForwardedFrom(message) {
  return message.data?.forwardedFrom || null
}

// Управление папками из чата
async function loadFoldersForChat() {
  try {
    const folders = await apiChatFoldersListRoute.run(ctx)
    customFolders.value = folders

    // Загружаем текущие папки чата
    const folderIds = await apiChatFoldersGetForChatRoute({ feedId: props.feedId }).run(ctx)
    chatFolderIds.value = folderIds
  } catch (error) {
    console.error('Ошибка загрузки папок:', error)
  }
}

async function openAddToFolderFromChat() {
  await loadFoldersForChat()
  addToFolderModalOpen.value = true
}

async function toggleChatInFolderFromChat(folderId) {
  const isInFolder = chatFolderIds.value.includes(folderId)

  try {
    if (isInFolder) {
      await apiChatFoldersRemoveChatRoute({ id: folderId }).run(ctx, {
        feedId: props.feedId
      })
      chatFolderIds.value = chatFolderIds.value.filter((id) => id !== folderId)
    } else {
      await apiChatFoldersAddChatRoute({ id: folderId }).run(ctx, {
        feedId: props.feedId
      })
      chatFolderIds.value.push(folderId)
    }
    // Перезагружаем папки для обновления счётчиков
    await loadFoldersForChat()
  } catch (error) {
    console.error('Ошибка изменения папки чата:', error)
  }
}

function createFolderFromChat() {
  // Закрываем модалку и перенаправляем на список чатов
  activeModal.value = null
  emit('back')
  // Эмитим событие для открытия модалки создания папки
  setTimeout(() => {
    window.dispatchEvent(new CustomEvent('open-create-folder-modal'))
  }, 100)
}

// Открытие модалки настроек подписок
async function openSubscriptionModal() {
  activeModal.value = null
  await nextTick()
  activeModal.value = 'subscription'
}

async function removeParticipant(userId) {
  try {
    await apiParticipantsRemoveRoute({ feedId: props.feedId }).run(ctx, { userId })
    // Перезагружаем список участников
    await loadChat()
  } catch (err) {
    console.error('Failed to remove participant:', err)
    alert('Не удалось удалить участника')
  }
}

async function updateParticipantRole({ userId, role }) {
  try {
    await apiParticipantsUpdateRoleRoute({ feedId: props.feedId }).run(ctx, { userId, role })
    await loadChat()
  } catch (err) {
    console.error('Failed to update role:', err)
    alert(err.message || 'Не удалось изменить роль')
  }
}

async function joinChat() {
  if (!canJoin.value || joining.value) return

  joining.value = true
  try {
    const result = await apiChatJoinRoute({ feedId: props.feedId }).run(ctx, {})
    if (result.success) {
      await loadChat()
      await loadMessages()
      await loadPinnedMessages()
    }
  } catch (err) {
    console.error('Failed to join chat:', err)
    alert(err.message || 'Не удалось присоединиться к чату')
  } finally {
    joining.value = false
  }
}

async function leaveChat() {
  const confirmMessage = isChannel.value
    ? 'Вы уверены, что хотите отписаться от этого канала?'
    : 'Вы уверены, что хотите выйти из этого чата?'

  if (!confirm(confirmMessage)) return

  try {
    activeModal.value = null

    if (isChannel.value) {
      await apiChannelUnsubscribeRoute.run(ctx, { feedId: props.feedId })
    } else {
      await apiChatLeaveRoute.run(ctx, { feedId: props.feedId })
    }

    emit('chat-left', props.feedId)
    emit('back')
  } catch (err) {
    console.error('Failed to leave chat:', err)
    alert(err.message || 'Не удалось выйти из чата')
  }
}

async function blockUserFromChat() {
  if (chat.value?.type !== 'direct') return

  const otherParticipant = participants.value.find((p) => String(p.userId) !== String(ctx.user?.id))
  if (!otherParticipant) {
    alert('Не удалось определить пользователя для блокировки')
    return
  }

  const confirmMessage = `Вы уверены, что хотите заблокировать ${getUserName(otherParticipant.userId)}?`
  if (!confirm(confirmMessage)) return

  blocking.value = true
  try {
    await apiBlockedUsersBlockRoute.run(ctx, {
      userId: otherParticipant.userId,
      reason: `Заблокирован из чата ${chat.value?.title || ''}`
    })

    activeModal.value = null

    emit('chat-left', props.feedId)
    emit('back')

    alert('Пользователь заблокирован')
  } catch (err) {
    console.error('Failed to block user:', err)
    alert(err.message || 'Не удалось заблокировать пользователя')
  } finally {
    blocking.value = false
  }
}

const bottomAnchor = ref(null)
let scrollToBottomAttempts = 0
let maxScrollAttempts = 10
let scrollTimeout = null

// Ref для панели ввода (для динамического позиционирования кнопки прокрутки)
const inputAreaRef = ref(null)
const inputAreaHeight = ref(80) // Начальное значение fallback

// Порог для определения "внизу чата" (в пикселях)
const BOTTOM_THRESHOLD = 150

// Вычисляем стиль для кнопки прокрутки на основе высоты панели ввода
const scrollButtonStyle = computed(() => {
  // Добавляем отступ 20px сверху от панели ввода
  const bottomValue = inputAreaHeight.value + 20
  return { bottom: `${bottomValue}px` }
})

// Вычисляем позицию кнопки упоминаний (на 70px выше кнопки прокрутки вниз)
const mentionButtonBottom = computed(() => {
  return inputAreaHeight.value + 20 + 56 // 56px = высота кнопки прокрутки + отступ между кнопками
})

/**
 * Проверяет, находится ли пользователь внизу чата
 */
function isUserAtBottom() {
  if (!messagesContainer.value) return true
  const container = messagesContainer.value
  const scrollFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight
  return scrollFromBottom <= BOTTOM_THRESHOLD
}

/**
 * Гарантированная прокрутка в самый низ чата
 * Использует множественные попытки с увеличивающимися задержками
 */
function scrollToBottom(force = false) {
  // Очищаем предыдущий таймаут если есть
  if (scrollTimeout) {
    clearTimeout(scrollTimeout)
    scrollTimeout = null
  }

  // Сбрасываем счетчик попыток
  scrollToBottomAttempts = 0
  // Увеличиваем количество попыток для force режима (первоначальная загрузка)
  maxScrollAttempts = force ? 50 : 10

  // Выполняем прокрутку с множественными попытками
  attemptScrollToBottom(force)
}

function attemptScrollToBottom(force = false) {
  if (scrollToBottomAttempts >= maxScrollAttempts) {
    showScrollButton.value = !isUserAtBottom()
    return
  }

  scrollToBottomAttempts++

  // Используем requestAnimationFrame для гарантии отрисовки
  requestAnimationFrame(() => {
    if (!messagesContainer.value) return

    const container = messagesContainer.value

    // Прокручиваем с использованием scrollTo для более плавной прокрутки
    container.scrollTo({
      top: container.scrollHeight,
      behavior: 'auto'
    })

    // Дополнительная прямая установка для гарантии
    const targetScrollTop = container.scrollHeight - container.clientHeight
    container.scrollTop = targetScrollTop

    // Проверяем, действительно ли прокрутились до конца
    nextTick(() => {
      const currentScrollTop = container.scrollTop
      const maxScrollTop = container.scrollHeight - container.clientHeight
      const diff = Math.abs(maxScrollTop - currentScrollTop)

      // Если разница больше 3px — контент ещё не полностью загружен/отрендерен
      if (diff > 3) {
        // Для force режима используем более агрессивные задержки
        const baseDelay = force ? 80 : 50
        const delay = Math.min(baseDelay + scrollToBottomAttempts * (force ? 50 : 30), 800)

        scrollTimeout = setTimeout(() => {
          attemptScrollToBottom(force)
        }, delay)
      } else {
        // Прокрутились успешно, но делаем ещё одну проверку через небольшую задержку
        // чтобы убедиться, что контент не сдвинулся (например, изображения догрузились)
        if (force && scrollToBottomAttempts < 10) {
          scrollTimeout = setTimeout(() => {
            const finalCheckTop = container.scrollTop
            const finalMaxTop = container.scrollHeight - container.clientHeight
            const finalDiff = Math.abs(finalMaxTop - finalCheckTop)

            if (finalDiff > 3) {
              attemptScrollToBottom(force)
            } else {
              showScrollButton.value = false
            }
          }, 200)
        } else {
          showScrollButton.value = false
        }
      }
    })
  })
}

async function scrollToMessage(messageId) {
  // Сначала проверяем, загружено ли сообщение
  if (!loadedMessageIds.value.has(messageId)) {
    // Загружаем сообщения вокруг целевого (вместо последовательной подгрузки)
    await loadAroundMessage(messageId)
  }

  // Ждем обновления DOM
  await nextTick()

  let element = document.getElementById(`message-${messageId}`)

  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    element.classList.add('highlight')
    setTimeout(() => element.classList.remove('highlight'), 2000)
  }
}

function handleScroll() {
  if (!messagesContainer.value) return
  const container = messagesContainer.value
  const scrollTop = container.scrollTop
  const scrollHeight = container.scrollHeight
  const clientHeight = container.clientHeight
  const scrollFromBottom = scrollHeight - scrollTop - clientHeight
  // Показываем кнопку если прокрутили далеко от низа (>400px) и не внизу (>BOTTOM_THRESHOLD)
  showScrollButton.value = scrollTop > 400 && scrollFromBottom > BOTTOM_THRESHOLD
}

// Обработчики свайпа для возврата к списку чатов на мобильных
function handleTouchStart(event) {
  if (!isMobile.value) return

  const touch = event.touches[0]
  touchStartX.value = touch.clientX
  touchStartY.value = touch.clientY
  touchEndX.value = touch.clientX
  isSwiping.value = true
}

function handleTouchMove(event) {
  if (!isMobile.value || !isSwiping.value) return

  const touch = event.touches[0]
  touchEndX.value = touch.clientY

  // Проверяем, что свайп горизонтальный (не сильно отклоняется по вертикали)
  const verticalDiff = Math.abs(touch.clientY - touchStartY.value)
  if (verticalDiff > maxVerticalDeviation) {
    isSwiping.value = false
    return
  }

  // Опционально: можно добавить визуальную обратную связь здесь
  // Например, смещение контента при свайпе
}

function handleTouchEnd(event) {
  if (!isMobile.value || !isSwiping.value) return

  isSwiping.value = false

  const touch = event.changedTouches[0]
  const endX = touch.clientX
  const diffX = endX - touchStartX.value
  const verticalDiff = Math.abs(touch.clientY - touchStartY.value)

  // Проверяем условия для свайпа вправо:
  // 1. Движение вправо (diffX > 0)
  // 2. Расстояние больше порога
  // 3. Небольшое отклонение по вертикали
  if (diffX > swipeThreshold && verticalDiff < maxVerticalDeviation) {
    // Свайп вправо - возвращаемся к списку чатов
    emit('back')
  }
}

function checkMobile() {
  isMobile.value = window.innerWidth < 768
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)

  // Устанавливаем начальную высоту панели ввода и подключаем ResizeObserver
  nextTick(() => {
    if (inputAreaRef.value) {
      inputAreaHeight.value = inputAreaRef.value.offsetHeight
      setupInputAreaResizeObserver()
    }
  })

  // Подписываемся на канал чата для событий транскрибации
  setupChatChannelSubscription()

  // Отслеживаем изменение размера контейнера сообщений
  // НЕ прокручиваем автоматически — пользователь читает где хочет

  // Запускаем fallback polling для мобильных
  startFallbackPolling()

  contextMenuCloseHandler = (event) => {
    const menu = document.querySelector('.context-menu')
    if (menu && !menu.contains(event.target)) {
      closeContextMenu()
    }
  }
  document.addEventListener('click', contextMenuCloseHandler)

  loadChat().then(() => {
    // Переподключаем observer после загрузки чата
    nextTick(() => {
      if (loadMoreAnchor.value) {
        loadMoreObserver = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting && hasMoreMessages.value && !loadingMore.value) {
                loadMoreMessages()
              }
            })
          },
          {
            root: messagesContainer.value,
            rootMargin: '100px 0px 0px 0px',
            threshold: 0
          }
        )

        loadMoreObserver.observe(loadMoreAnchor.value)
      }
    })
  })

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && messages.value.length > 0) {
      // Находим последнее непрочитанное чужое сообщение
      for (let i = messages.value.length - 1; i >= 0; i--) {
        const msg = messages.value[i]
        if (!isOwnMessage(msg) && !sentReadMessages.value.has(msg.id)) {
          markAsRead(msg.id)
          break
        }
      }
    }
  })
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)

  stopFallbackPolling()

  // Отписываемся от канала чата
  if (chatChannelSubscription) {
    try {
      chatChannelSubscription()
    } catch (e) {
      console.warn('[ChatView] Error unsubscribing from chat channel:', e)
    }
    chatChannelSubscription = null
  }
  if (loadMoreObserver) {
    loadMoreObserver.disconnect()
  }
  if (readObserver) {
    readObserver.disconnect()
  }
  if (menuResizeObserver) {
    menuResizeObserver.disconnect()
    menuResizeObserver = null
  }
  if (inputAreaResizeObserver) {
    inputAreaResizeObserver.disconnect()
    inputAreaResizeObserver = null
  }
  if (typingTimeout) {
    clearTimeout(typingTimeout)
  }
  if (markAsReadTimeout) {
    clearTimeout(markAsReadTimeout)
  }
  if (scrollTimeout) {
    clearTimeout(scrollTimeout)
  }
  if (isTypingActive) {
    isTypingActive = false
    apiTypingStopRoute({ feedId: props.feedId }).run(ctx).catch(console.error)
  }
  if (contextMenuCloseHandler) {
    document.removeEventListener('click', contextMenuCloseHandler)
  }
})

// Сброс inbox badge для чата
async function resetChatBadge() {
  if (!chat.value || !chat.value.inboxSubjectId) return

  try {
    await apiInboxBadgeResetRoute.run(ctx, {
      subjectId: chat.value.inboxSubjectId,
      url: chat.value.inboxUrl
    })
    // Уведомляем родительский компонент об обновлении
    emit('badge-reset')
  } catch (err) {
    console.error('Failed to reset badge:', err)
  }
}

async function checkMyModeration() {
  try {
    const result = await apiModerationCheckRoute.run(ctx, {
      feedId: props.feedId,
      userId: ctx.user.id
    })
    myModeration.value = result.moderation

    // Отдельно проверяем бан (даже если пользователь уже не участник)
    if (result.moderation?.type === 'ban') {
      isBanned.value = true
      banInfo.value = result.moderation
    } else {
      isBanned.value = false
      banInfo.value = null
    }
  } catch (err) {
    console.error('Failed to check moderation:', err)
    myModeration.value = null
    isBanned.value = false
    banInfo.value = null
  }
}

async function loadParticipantsModerations() {
  if (!canManage.value) return

  participantsModerations.value.clear()

  for (const participant of participants.value) {
    if (participant.userId === ctx.user.id) continue

    try {
      const result = await apiModerationCheckRoute.run(ctx, {
        feedId: props.feedId,
        userId: participant.userId
      })

      if (result.moderation) {
        participantsModerations.value.set(participant.userId, result.moderation)
      }
    } catch (err) {
      console.error('Failed to check moderation for participant:', err)
    }
  }
}

function getParticipantModeration(userId) {
  return participantsModerations.value.get(userId) || null
}

function getModerationTooltip(userId) {
  const mod = getParticipantModeration(userId)
  if (!mod) return ''

  const type = mod.type === 'mute' ? 'Мьют' : 'Бан'
  const expires = mod.isPermanent ? 'навсегда' : `до ${formatModerationExpiry(mod.expiresAt)}`
  return `${type} ${expires}`
}

function formatModerationExpiry(date) {
  if (!date) return ''
  return new Date(date).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function openModerationModal(participant) {
  moderatingUser.value = participant
  showModerationModal.value = true
}

async function onModerationApplied() {
  await loadParticipantsModerations()
}

async function removeModeration({ userId, type }) {
  try {
    await apiModerationRemoveRoute.run(ctx, {
      feedId: props.feedId,
      userId,
      type
    })

    participantsModerations.value.delete(userId)

    // Если это мы сами - обновляем свою модерацию
    if (userId === ctx.user.id) {
      myModeration.value = null
    }
  } catch (err) {
    console.error('Failed to remove moderation:', err)
    // Модерация не снята - ошибка только в консоли, без алерта
  }
}

// Следим за появлением панели ввода и обновляем высоту
watch(inputAreaRef, (newRef) => {
  if (newRef) {
    nextTick(() => {
      inputAreaHeight.value = newRef.offsetHeight
    })
  }
})

// ResizeObserver для отслеживания изменения высоты панели ввода (важно для мобильных)
let inputAreaResizeObserver = null

function setupInputAreaResizeObserver() {
  if (inputAreaResizeObserver) {
    inputAreaResizeObserver.disconnect()
  }

  if (!inputAreaRef.value) return

  inputAreaResizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      inputAreaHeight.value = entry.contentRect.height
    }
  })

  inputAreaResizeObserver.observe(inputAreaRef.value)
}

watch(inputAreaRef, (newRef) => {
  if (newRef) {
    nextTick(() => {
      inputAreaHeight.value = newRef.offsetHeight
      setupInputAreaResizeObserver()
    })
  }
})

watch(
  () => props.feedId,
  () => {
    // Отписываемся от старого канала
    if (chatChannelSubscription) {
      try {
        chatChannelSubscription()
      } catch (e) {
        console.warn('[ChatView] Error unsubscribing from old chat channel:', e)
      }
      chatChannelSubscription = null
    }

    // Подписываемся на новый канал
    setupChatChannelSubscription()

    loadedMessageIds.value.clear()
    typingUsers.value = []
    readReceipts.value = {}
    pinnedMessage.value = null
    messages.value = []
    sentReadMessages.value.clear()
    pendingReadMessages.value.clear()
    unreadMentions.value = [] // Очищаем список упоминаний

    // Очищаем список прочитанных сообщений при смене чата
    showSearch.value = false
    hasMoreMessages.value = true
    myModeration.value = null
    participantsModerations.value.clear()
    hasAcceptedInvite.value = false // Сбрасываем флаг приглашения
    if (typingTimeout) {
      clearTimeout(typingTimeout)
      typingTimeout = null
    }
    if (isTypingActive) {
      isTypingActive = false
    }

    // Сбрасываем проверку доступа
    resetAccess()

    // Отключаем старый observer
    if (loadMoreObserver) {
      loadMoreObserver.disconnect()
      loadMoreObserver = null
    }

    loadChat().then(() => {
      // После загрузки чата переподключаем observer к новому якорю
      nextTick(() => {
        if (loadMoreAnchor.value && !loadMoreObserver) {
          loadMoreObserver = new IntersectionObserver(
            (entries) => {
              entries.forEach((entry) => {
                if (entry.isIntersecting && hasMoreMessages.value && !loadingMore.value) {
                  loadMoreMessages()
                }
              })
            },
            {
              root: messagesContainer.value,
              rootMargin: '100px 0px 0px 0px',
              threshold: 0
            }
          )

          loadMoreObserver.observe(loadMoreAnchor.value)
        }
      })
    })

    nextTick(() => {
      if (messageInput.value && canPostMessages.value) {
        messageInput.value.focus()
      }
    })
  }
)

watch(
  () => props.targetMessageId,
  (newId) => {
    if (newId) {
      nextTick(() => {
        scrollToMessage(newId)
        emit('message-viewed')
      })
    }
  }
)

watch(
  () => messages.value.length,
  () => {
    nextTick(() => {
      if (readObserver) {
        const messageElements = document.querySelectorAll('.message[id^="message-"]')
        messageElements.forEach((el) => readObserver.observe(el))
      }
    })
  }
)
</script>
