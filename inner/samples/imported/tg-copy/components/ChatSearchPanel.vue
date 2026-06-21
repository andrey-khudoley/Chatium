<template>
  <div class="chat-search-panel">
    <div class="search-header">
      <div class="search-box">
        <i class="fas fa-search search-icon"></i>
        <input
          v-model="searchQuery"
          @input="onSearchInput"
          type="text"
          placeholder="Поиск в чате..."
          class="search-input"
          ref="searchInput"
        />
        <button v-if="searchQuery" @click="clearSearch" class="clear-search">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <button @click="$emit('close')" class="btn-close">
        <i class="fas fa-times"></i>
      </button>
    </div>

    <!-- Индикатор загрузки -->
    <div v-if="isSearching" class="search-loading">
      <i class="fas fa-spinner fa-spin"></i>
      <span>Поиск...</span>
    </div>

    <!-- Начальное состояние -->
    <div v-else-if="!searchQuery || searchQuery.length < 2" class="search-empty">
      <i class="fas fa-search"></i>
      <p>Введите минимум 2 символа для поиска</p>
    </div>

    <!-- Нет результатов -->
    <div v-else-if="searchResults.length === 0" class="search-empty">
      <i class="fas fa-inbox"></i>
      <p>Сообщений не найдено</p>
      <span class="search-hint">Попробуйте изменить запрос</span>
    </div>

    <!-- Результаты поиска -->
    <div v-else class="search-results">
      <div class="results-count">
        Найдено {{ searchResults.length }} {{ formatMessageWord(searchResults.length) }}
      </div>
      <div class="search-items">
        <div
          v-for="message in searchResults"
          :key="message.id"
          @click="goToMessage(message.id)"
          class="search-item"
        >
          <div class="message-header">
            <span class="message-author">{{ getAuthorName(message) }}</span>
            <span class="message-time">{{ formatTime(message.createdAt) }}</span>
          </div>
          <p class="message-text" v-html="highlightMatch(message.text)"></p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { apiChatSearchRoute } from '../api/chat-search'

const props = defineProps({
  feedId: String,
})

const emit = defineEmits(['close', 'go-to-message'])

const searchQuery = ref('')
const searchResults = ref([])
const isSearching = ref(false)
const searchInput = ref(null)
let searchTimeout = null

onMounted(() => {
  nextTick(() => {
    searchInput.value?.focus()
  })
})

function onSearchInput() {
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
  
  if (!searchQuery.value || searchQuery.value.length < 2) {
    searchResults.value = []
    return
  }
  
  searchTimeout = setTimeout(() => {
    performSearch()
  }, 300)
}

async function performSearch() {
  if (!searchQuery.value || searchQuery.value.length < 2) return
  
  isSearching.value = true
  
  try {
    const result = await apiChatSearchRoute({ feedId: props.feedId }).run(ctx, {
      query: searchQuery.value,
    })
    
    searchResults.value = result.messages || []
  } catch (error) {
    console.error('Ошибка поиска:', error)
    searchResults.value = []
  } finally {
    isSearching.value = false
  }
}

function clearSearch() {
  searchQuery.value = ''
  searchResults.value = []
  searchInput.value?.focus()
}

function goToMessage(messageId) {
  emit('go-to-message', messageId)
  emit('close')
}

function getAuthorName(message) {
  if (!message.author) return 'Неизвестно'
  if (message.author.id === ctx.user?.id) return 'Вы'
  return message.author.firstName 
    ? (message.author.lastName ? `${message.author.firstName} ${message.author.lastName}` : message.author.firstName)
    : message.author.displayName || 'Пользователь'
}

function formatTime(date) {
  if (!date) return ''
  const d = new Date(date)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  
  if (isToday) {
    return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  }
  
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) {
    return 'Вчера ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  }
  
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function highlightMatch(text) {
  if (!text || !searchQuery.value) return text
  
  const query = searchQuery.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${query})`, 'gi')
  return text.replace(regex, '<mark>$1</mark>')
}

function formatMessageWord(count) {
  const lastDigit = count % 10
  const lastTwoDigits = count % 100
  
  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) return 'сообщений'
  if (lastDigit === 1) return 'сообщение'
  if (lastDigit >= 2 && lastDigit <= 4) return 'сообщения'
  return 'сообщений'
}
</script>

<style scoped>
.chat-search-panel {
  position: absolute;
  top: 0;
  right: 0;
  width: 360px;
  height: 100%;
  background: var(--bg-primary);
  border-left: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  z-index: 50;
  box-shadow: -4px 0 12px rgba(0, 0, 0, 0.1);
}

.search-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-secondary);
}

.search-box {
  flex: 1;
  display: flex;
  align-items: center;
  background: var(--bg-primary);
  border-radius: 8px;
  padding: 0 12px;
}

.search-icon {
  color: var(--text-muted);
  font-size: 14px;
}

.search-input {
  flex: 1;
  border: none;
  background: transparent;
  padding: 10px 8px;
  font-size: 14px;
  outline: none;
  color: var(--text-primary);
}

.search-input::placeholder {
  color: var(--text-muted);
}

.clear-search {
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px;
  font-size: 12px;
}

.clear-search:hover {
  color: var(--text-primary);
}

.btn-close {
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  font-size: 16px;
  transition: all 0.2s;
}

.btn-close:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

/* Состояния поиска */
.search-loading {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  gap: 12px;
}

.search-loading i {
  font-size: 32px;
  color: var(--accent-primary);
}

.search-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  padding: 40px;
  text-align: center;
}

.search-empty i {
  font-size: 48px;
  margin-bottom: 16px;
}

.search-empty p {
  font-size: 14px;
  margin-bottom: 8px;
}

.search-hint {
  font-size: 12px;
  color: var(--text-secondary);
}

/* Результаты поиска */
.search-results {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.results-count {
  padding: 12px 16px;
  font-size: 13px;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-secondary);
}

.search-items {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.search-item {
  display: flex;
  flex-direction: column;
  padding: 12px 16px;
  cursor: pointer;
  transition: background 0.2s;
  border-bottom: 1px solid var(--bg-secondary);
}

.search-item:hover {
  background: var(--bg-hover);
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.message-author {
  font-size: 13px;
  font-weight: 600;
  color: var(--accent-primary);
}

.message-time {
  font-size: 11px;
  color: var(--text-muted);
}

.message-text {
  font-size: 14px;
  color: var(--text-primary);
  margin: 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.message-text :deep(mark) {
  background: #ffd700;
  color: var(--text-primary);
  padding: 0 2px;
  border-radius: 2px;
}

/* Адаптивность */
@media (max-width: 900px) {
  .chat-search-panel {
    width: 320px;
  }
}

@media (max-width: 768px) {
  .chat-search-panel {
    width: 100%;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 200;
    border-left: none;
  }
}
</style>