<template>
  <div class="modal-overlay" @click="$emit('close')">
    <div class="modal-content" @click.stop>
      <h2 class="modal-title">
        {{
          isMultiple
            ? `Переслать ${messages.length} ${messages.length === 1 ? 'сообщение' : messages.length < 5 ? 'сообщения' : 'сообщений'}`
            : 'Переслать сообщение'
        }}
      </h2>

      <!-- Превью одиночного сообщения -->
      <div v-if="!isMultiple" class="forward-preview">
        <div class="forward-label">Сообщение:</div>
        <div class="forward-text">
          <template v-if="message.files && message.files.length > 0">
            <div class="forward-files">
              <i class="fas fa-paperclip"></i>
              {{ message.files.length }}
              {{
                message.files.length === 1 ? 'файл' : message.files.length < 5 ? 'файла' : 'файлов'
              }}
            </div>
          </template>
          {{ message.text }}
        </div>
      </div>

      <!-- Превью нескольких сообщений -->
      <div v-else class="forward-preview multiple">
        <div class="forward-label">Выбрано сообщений: {{ messages.length }}</div>
        <div class="forward-messages-list">
          <div v-for="(msg, index) in displayedMessages" :key="msg.id" class="forward-message-item">
            <span class="message-number">{{ index + 1 }}.</span>
            <span class="message-preview-text">
              <template v-if="msg.files && msg.files.length > 0">
                <i class="fas fa-paperclip"></i>
              </template>
              {{ msg.text || (msg.files ? 'Вложение' : 'Пустое сообщение') }}
            </span>
          </div>
          <div v-if="messages.length > 3" class="more-messages">
            и ещё {{ messages.length - 3 }} сообщ.
          </div>
        </div>
      </div>

      <!-- Поиск по чатам -->
      <div class="search-box">
        <i class="fas fa-search search-icon"></i>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Поиск по чатам..."
          class="search-input"
        />
        <button v-if="searchQuery" @click="searchQuery = ''" class="clear-search">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <div class="chats-list">
        <div class="chats-label">
          {{ filteredChats.length }}
          {{ filteredChats.length === 1 ? 'чат' : filteredChats.length < 5 ? 'чата' : 'чатов' }}
          <span v-if="excludedChannelsCount > 0" class="excluded-hint">
            ({{ excludedChannelsCount }} каналов скрыто — нет прав на публикацию)
          </span>
        </div>

        <div v-if="filteredChats.length === 0" class="no-results">
          <i class="fas fa-search"></i>
          <span>Ничего не найдено</span>
        </div>

        <div
          v-for="chat in filteredChats"
          :key="chat.id"
          :class="['chat-item', { selected: selectedChatId === chat.feedId }]"
          @click="selectedChatId = chat.feedId"
        >
          <div class="chat-avatar" :style="getChatAvatarStyle(chat)">
            <span v-if="!chat.avatarHash && !(chat.type === 'direct' && chat.otherUser?.avatar)">
              {{ getChatInitials(chat.title) }}
            </span>
          </div>
          <div class="chat-info">
            <div class="chat-name">{{ chat.title }}</div>
            <div class="chat-type">
              <template v-if="chat.type === 'direct'">Личный чат</template>
              <template v-else-if="chat.type === 'channel'">
                <i class="fas fa-bullhorn"></i> Канал
                <span v-if="chat.myRole === 'owner'" class="role-badge owner">владелец</span>
                <span v-else-if="chat.myRole === 'admin'" class="role-badge admin">админ</span>
              </template>
              <template v-else> <i class="fas fa-users"></i> Групповой чат </template>
            </div>
          </div>
          <i v-if="selectedChatId === chat.feedId" class="fas fa-check check-icon"></i>
        </div>
      </div>

      <div class="modal-actions">
        <button @click="$emit('close')" class="btn-secondary">Отмена</button>
        <button
          @click="forward"
          :disabled="!selectedChatId"
          :class="['btn-primary', { disabled: !selectedChatId }]"
        >
          <i class="fas fa-share"></i>
          Переслать
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  message: Object,
  messages: {
    type: Array,
    default: () => []
  },
  chats: Array,
  sourceChat: {
    type: Object,
    default: null
  }
})

const isMultiple = computed(() => props.messages && props.messages.length > 0)
const displayedMessages = computed(() => {
  if (!isMultiple.value) return []
  return props.messages.slice(0, 3)
})

const emit = defineEmits(['close', 'forward'])

const selectedChatId = ref(null)
const searchQuery = ref('')

// Фильтруем чаты для пересылки
const filteredChats = computed(() => {
  const query = searchQuery.value.toLowerCase().trim()

  return (props.chats || []).filter((chat) => {
    // Исключаем каналы, где пользователь не owner/admin (не может публиковать)
    if (chat.type === 'channel' && chat.myRole !== 'owner' && chat.myRole !== 'admin') {
      return false
    }

    // Фильтр по поисковому запросу
    if (query) {
      const title = (chat.title || '').toLowerCase()
      return title.includes(query)
    }

    return true
  })
})

// Счётчик скрытых каналов (где нет прав на публикацию)
const excludedChannelsCount = computed(() => {
  return (props.chats || []).filter(
    (chat) => chat.type === 'channel' && chat.myRole !== 'owner' && chat.myRole !== 'admin'
  ).length
})

function getChatInitials(title) {
  if (!title) return '?'
  return title
    .split(' ')
    .map((w) => w[0])
    .join('')
    .substring(0, 2)
    .toUpperCase()
}

function getChatAvatarStyle(chat) {
  // Если у чата есть аватарка
  if (chat.avatarHash) {
    return {
      background: `url(https://fs.chatium.ru/thumbnail/${chat.avatarHash}/s/200x) center/cover no-repeat`
    }
  }

  // Для личного чата показываем аватарку собеседника
  if (chat.type === 'direct' && chat.otherUser?.avatar) {
    return {
      background: `url(${chat.otherUser.avatar}) center/cover no-repeat`
    }
  }

  // Градиент по умолчанию
  const colors = [
    ['#667eea', '#764ba2'],
    ['#f093fb', '#f5576c'],
    ['#4facfe', '#00f2fe'],
    ['#43e97b', '#38f9d7'],
    ['#fa709a', '#fee140']
  ]
  const index = (chat.id?.charCodeAt(0) || 0) % colors.length
  const [from, to] = colors[index]
  return {
    background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`
  }
}

function forward() {
  if (!selectedChatId.value) return

  // Формируем данные об источнике
  const forwardedFrom = props.sourceChat
    ? {
        feedId: props.sourceChat.feedId || props.sourceChat.id,
        title: props.sourceChat.displayTitle || props.sourceChat.title,
        type: props.sourceChat.type,
        avatarHash: props.sourceChat.avatarHash,
        isPublic: props.sourceChat.isPublic
      }
    : null

  if (isMultiple.value) {
    // Пересылка нескольких сообщений - добавляем автора к каждому сообщению
    const messagesWithAuthor = props.messages.map((msg) => ({
      ...msg,
      forwardedFrom: forwardedFrom
        ? {
            ...forwardedFrom,
            authorName: msg.author?.displayName || msg.author?.firstName || 'Неизвестно',
            authorId: msg.author?.id || msg.createdBy
          }
        : null
    }))
    emit('forward', {
      chatId: selectedChatId.value,
      messages: messagesWithAuthor,
      forwardedFrom
    })
  } else {
    // Пересылка одиночного сообщения
    const forwardedFromWithAuthor = forwardedFrom
      ? {
          ...forwardedFrom,
          authorName:
            props.message.author?.displayName || props.message.author?.firstName || 'Неизвестно',
          authorId: props.message.author?.id || props.message.createdBy
        }
      : null
    emit('forward', {
      chatId: selectedChatId.value,
      text: props.message.text,
      files: props.message.files,
      forwardedFrom: forwardedFromWithAuthor
    })
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(2px);
}

.modal-content {
  background: var(--bg-primary, #fff);
  border-radius: 12px;
  width: 90%;
  max-width: 420px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  padding: 20px;
  border-bottom: 1px solid var(--border-color, #e0e0e0);
  color: var(--text-primary, #111b21);
}

.forward-preview {
  padding: 16px 20px;
  background: var(--bg-secondary, #f0f2f5);
  border-bottom: 1px solid var(--border-color, #e0e0e0);
}

.forward-label {
  font-size: 12px;
  color: var(--text-secondary, #667781);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}

.forward-text {
  font-size: 14px;
  color: var(--text-primary, #111b21);
  line-height: 1.4;
  max-height: 60px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.forward-files {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--text-secondary, #667781);
  font-size: 13px;
  margin-bottom: 4px;
}

/* Стили для множественных сообщений */
.forward-preview.multiple {
  max-height: 150px;
  overflow-y: auto;
}

.forward-messages-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.forward-message-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-primary, #111b21);
  line-height: 1.4;
}

.message-number {
  color: var(--text-secondary, #667781);
  font-weight: 500;
  min-width: 20px;
}

.message-preview-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.message-preview-text i {
  color: var(--text-secondary, #667781);
  margin-right: 4px;
  font-size: 12px;
}

.more-messages {
  font-size: 12px;
  color: var(--text-secondary, #667781);
  font-style: italic;
  padding-left: 28px;
}

/* Поиск */
.search-box {
  position: relative;
  padding: 12px 20px;
  border-bottom: 1px solid var(--border-color, #e0e0e0);
}

.search-icon {
  position: absolute;
  left: 28px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-secondary, #667781);
  font-size: 14px;
}

.search-input {
  width: 100%;
  padding: 10px 32px 10px 36px;
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 8px;
  font-size: 14px;
  background: var(--bg-primary, #fff);
  color: var(--text-primary, #111b21);
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: var(--primary-color, #008069);
  box-shadow: 0 0 0 2px rgba(0, 128, 105, 0.1);
}

.search-input::placeholder {
  color: var(--text-muted, #999);
}

.clear-search {
  position: absolute;
  right: 28px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--text-secondary, #667781);
  cursor: pointer;
  padding: 4px;
  font-size: 12px;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background 0.2s;
}

.clear-search:hover {
  background: var(--bg-secondary, #f0f2f5);
}

.chats-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
  max-height: 350px;
}

.chats-label {
  font-size: 12px;
  color: var(--text-secondary, #667781);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 8px 20px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.excluded-hint {
  color: var(--text-muted, #999);
  font-size: 11px;
  text-transform: none;
  letter-spacing: normal;
}

.no-results {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: var(--text-secondary, #667781);
  gap: 12px;
}

.no-results i {
  font-size: 32px;
  opacity: 0.5;
}

.no-results span {
  font-size: 14px;
}

.chat-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  cursor: pointer;
  transition: background 0.2s;
}

.chat-item:hover {
  background: var(--bg-hover, #f0f2f5);
}

.chat-item.selected {
  background: rgba(0, 128, 105, 0.1);
}

.chat-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 14px;
  flex-shrink: 0;
}

.chat-info {
  flex: 1;
  min-width: 0;
}

.chat-name {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-primary, #111b21);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chat-type {
  font-size: 12px;
  color: var(--text-secondary, #667781);
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 2px;
}

.chat-type i {
  font-size: 10px;
}

.role-badge {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 10px;
  margin-left: 4px;
  font-weight: 500;
}

.role-badge.owner {
  background: rgba(0, 128, 105, 0.15);
  color: var(--primary-color, #008069);
}

.role-badge.admin {
  background: rgba(59, 130, 246, 0.15);
  color: #3b82f6;
}

.check-icon {
  color: var(--primary-color, #008069);
  font-size: 16px;
}

.modal-actions {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid var(--border-color, #e0e0e0);
}

.btn-primary,
.btn-secondary {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition:
    background 0.2s,
    opacity 0.2s;
}

.btn-primary {
  background: var(--primary-color, #008069);
  color: white;
}

.btn-primary:hover:not(.disabled) {
  background: var(--primary-hover, #007a62);
}

.btn-primary.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--bg-secondary, #f0f2f5);
  color: var(--text-primary, #333);
}

.btn-secondary:hover {
  background: var(--bg-hover, #e0e2e5);
}

/* Scrollbar styling */
.chats-list::-webkit-scrollbar {
  width: 6px;
}

.chats-list::-webkit-scrollbar-track {
  background: transparent;
}

.chats-list::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb, rgba(0, 0, 0, 0.2));
  border-radius: 3px;
}

.chats-list::-webkit-scrollbar-thumb:hover {
  background: var(--scrollbar-thumb-hover, rgba(0, 0, 0, 0.3));
}
</style>
