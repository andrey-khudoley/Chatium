<template>
  <div v-if="isOpen" class="modal-overlay" @click="close">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>{{ isEditing ? 'Изменить папку' : 'Новая папка' }}</h3>
        <button @click="close" class="btn-close">
          <i class="fas fa-times"></i>
        </button>
      </div>
      
      <div class="modal-body">
        <!-- Название папки -->
        <div class="form-group">
          <label>Название</label>
          <input 
            v-model="folderName" 
            type="text" 
            placeholder="Название папки"
            maxlength="30"
            ref="nameInput"
            @keyup.enter="save"
          />
          <span class="char-count">{{ folderName.length }}/30</span>
        </div>
        
        <!-- Иконка -->
        <div class="form-group">
          <label>Иконка</label>
          <div class="icon-picker">
            <button
              v-for="icon in availableIcons"
              :key="icon"
              :class="['icon-btn', { active: selectedIcon === icon }]"
              @click="selectedIcon = icon"
            >
              {{ icon }}
            </button>
          </div>
        </div>
        
        <!-- Выбор чатов -->
        <div class="form-group chats-section">
          <label>Чаты в папке ({{ selectedChats.length }})</label>
          
          <!-- Поиск по чатам -->
          <div class="search-box">
            <i class="fas fa-search search-icon"></i>
            <input 
              v-model="chatSearchQuery" 
              type="text" 
              placeholder="Поиск чатов..."
              class="search-input"
            />
            <button v-if="chatSearchQuery" @click="chatSearchQuery = ''" class="clear-search">
              <i class="fas fa-times"></i>
            </button>
          </div>
          
          <!-- Список чатов -->
          <div class="chats-list">
            <div v-if="filteredAvailableChats.length === 0 && chatSearchQuery" class="no-results">
              <i class="fas fa-search"></i>
              <span>Ничего не найдено</span>
            </div>
            
            <div v-else-if="filteredAvailableChats.length === 0" class="no-results">
              <i class="fas fa-comments"></i>
              <span>Нет доступных чатов</span>
            </div>
            
            <label
              v-for="chat in filteredAvailableChats"
              :key="chat.feedId"
              class="chat-item"
              :class="{ 'is-selected': isChatSelected(chat.feedId) }"
            >
              <input
                type="checkbox"
                :checked="isChatSelected(chat.feedId)"
                @change="toggleChat(chat.feedId)"
                class="chat-checkbox"
              />
              <div class="chat-avatar-small" :style="getAvatarStyle(chat)">
                <span v-if="!hasChatAvatar(chat)">{{ getChatInitials(chat.displayTitle || chat.title) }}</span>
              </div>
              <div class="chat-info">
                <span class="chat-name">{{ chat.displayTitle || chat.title }}</span>
                <span class="chat-type">
                  <i v-if="chat.type === 'group'" class="fas fa-users" title="Группа"></i>
                  <i v-else-if="chat.type === 'channel'" class="fas fa-bullhorn" title="Канал"></i>
                  <i v-else class="fas fa-user" title="Личный чат"></i>
                </span>
              </div>
            </label>
          </div>
        </div>
      </div>
      
      <div class="modal-footer">
        <button @click="close" class="btn-secondary">Отмена</button>
        <button 
          @click="save" 
          :class="['btn-primary', { loading: isSaving }]"
          :disabled="!folderName.trim() || isSaving"
        >
          <i v-if="isSaving" class="fas fa-spinner fa-spin"></i>
          <span v-else>{{ isEditing ? 'Сохранить' : 'Создать' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, computed } from 'vue'

const props = defineProps({
  isOpen: Boolean,
  folder: {
    type: Object,
    default: null
  },
  folderChats: {
    type: Array,
    default: () => []
  },
  allChats: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['close', 'save', 'add-chat', 'remove-chat'])

const nameInput = ref(null)
const folderName = ref('')
const selectedIcon = ref('📁')
const chatSearchQuery = ref('')
const isSaving = ref(false)
const selectedChats = ref([])

const isEditing = computed(() => !!props.folder)

const availableIcons = [
  '📁', '💼', '📚', '⭐', '🔥', '💡', '🎯', '🚀',
  '📌', '🏠', '📅', '✅', '💬', '👥', '🤖',
  '🎮', '🎵', '📺', '💰', '🛒', '📷', '🎨', '⚙️'
]

// Фильтруем чаты по поиску
const filteredAvailableChats = computed(() => {
  if (!chatSearchQuery.value.trim()) {
    return props.allChats
  }
  
  const query = chatSearchQuery.value.toLowerCase()
  return props.allChats.filter(chat => {
    const title = (chat.displayTitle || chat.title || '').toLowerCase()
    return title.includes(query)
  })
})

watch(() => props.isOpen, (open) => {
  if (open) {
    if (props.folder) {
      folderName.value = props.folder.name || ''
      selectedIcon.value = props.folder.icon || '📁'
      // Загружаем чаты папки
      selectedChats.value = [...props.folderChats]
    } else {
      folderName.value = ''
      selectedIcon.value = '📁'
      selectedChats.value = []
    }
    chatSearchQuery.value = ''
    nextTick(() => {
      nameInput.value?.focus()
    })
  }
})

function close() {
  emit('close')
}

function isChatSelected(feedId) {
  return selectedChats.value.includes(feedId)
}

function toggleChat(feedId) {
  const index = selectedChats.value.indexOf(feedId)
  if (index > -1) {
    selectedChats.value.splice(index, 1)
  } else {
    selectedChats.value.push(feedId)
  }
}

async function save() {
  if (!folderName.value.trim()) return
  
  isSaving.value = true
  
  try {
    emit('save', {
      id: props.folder?.id,
      name: folderName.value.trim(),
      icon: selectedIcon.value,
      selectedChats: selectedChats.value
    })
  } finally {
    isSaving.value = false
  }
}

function getChatInitials(title) {
  if (!title) return '?'
  return title.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()
}

function getAvatarStyle(chat) {
  if (chat.avatarHash) {
    return {
      background: `url(https://fs.chatium.ru/thumbnail/${chat.avatarHash}/s/100x) center/cover no-repeat`,
    }
  }
  
  if (chat.type === 'direct' && chat.participants) {
    const otherParticipant = chat.participants.find(p => p.userId !== ctx.user?.id)
    if (otherParticipant?.user?.avatar) {
      return {
        background: `url(${otherParticipant.user.avatar}) center/cover no-repeat`,
      }
    }
  }
  
  const colors = [
    ['#667eea', '#764ba2'],
    ['#f093fb', '#f5576c'],
    ['#4facfe', '#00f2fe'],
    ['#43e97b', '#38f9d7'],
    ['#fa709a', '#fee140'],
  ]
  const index = (chat.id?.charCodeAt(0) || 0) % colors.length
  const [from, to] = colors[index]
  return {
    background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`,
  }
}

function hasChatAvatar(chat) {
  if (chat.avatarHash) return true
  if (chat.type === 'direct' && chat.participants) {
    const otherParticipant = chat.participants.find(p => p.userId !== ctx.user?.id)
    if (otherParticipant?.user?.avatar) return true
  }
  return false
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  background: var(--bg-primary);
  border-radius: 0.75rem;
  width: 100%;
  max-width: 28rem;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-lg);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h3 {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-primary);
}

.btn-close {
  width: 2rem;
  height: 2rem;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
}

.btn-close:hover {
  background: var(--bg-hover);
}

.modal-body {
  padding: 1.25rem;
  overflow-y: auto;
  flex: 1;
}

.form-group {
  margin-bottom: 1.25rem;
  position: relative;
}

.form-group label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
}

.form-group input[type="text"] {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 0.9375rem;
  outline: none;
  transition: border-color 0.2s;
}

.form-group input[type="text"]:focus {
  border-color: var(--accent-primary);
}

.char-count {
  position: absolute;
  right: 0.75rem;
  bottom: 0.75rem;
  font-size: 0.75rem;
  color: var(--text-muted);
}

.icon-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.icon-btn {
  width: 2.25rem;
  height: 2.25rem;
  border: 2px solid transparent;
  background: var(--bg-secondary);
  border-radius: 0.5rem;
  font-size: 1.25rem;
  cursor: pointer;
  transition: all 0.2s;
}

.icon-btn:hover {
  background: var(--bg-hover);
}

.icon-btn.active {
  border-color: var(--accent-primary);
  background: var(--accent-light);
}

/* Секция чатов */
.chats-section {
  margin-bottom: 0;
}

.search-box {
  display: flex;
  align-items: center;
  background: var(--bg-secondary);
  border-radius: 0.5rem;
  padding: 0 0.75rem;
  margin-bottom: 0.5rem;
  border: 1px solid var(--border-color);
}

.search-box:focus-within {
  border-color: var(--accent-primary);
}

.search-icon {
  color: var(--text-muted);
  font-size: 0.875rem;
}

.search-input {
  flex: 1;
  border: none;
  background: transparent;
  padding: 0.625rem 0.5rem;
  font-size: 0.875rem;
  outline: none;
  color: var(--text-primary);
}

.clear-search {
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0.25rem;
  font-size: 0.75rem;
}

.chats-list {
  max-height: 16rem;
  overflow-y: auto;
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  padding: 0.25rem;
}

.no-results {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: var(--text-muted);
  gap: 0.5rem;
}

.no-results i {
  font-size: 1.5rem;
  opacity: 0.5;
}

.chat-item {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.5rem;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: background 0.15s;
}

.chat-item:hover {
  background: var(--bg-hover);
}

.chat-item.is-selected {
  background: var(--accent-light);
}

.chat-checkbox {
  width: 1.125rem;
  height: 1.125rem;
  cursor: pointer;
  accent-color: var(--accent-primary);
  flex-shrink: 0;
}

.chat-avatar-small {
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 0.625rem;
  font-weight: 600;
  flex-shrink: 0;
}

.chat-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.375rem;
  min-width: 0;
}

.chat-name {
  flex: 1;
  font-size: 0.875rem;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chat-type {
  color: var(--text-muted);
  font-size: 0.75rem;
  flex-shrink: 0;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  border-top: 1px solid var(--border-color);
}

.btn-secondary {
  padding: 0.625rem 1rem;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  border-radius: 0.5rem;
  transition: all 0.2s;
}

.btn-secondary:hover {
  background: var(--bg-hover);
}

.btn-primary {
  padding: 0.625rem 1.25rem;
  border: none;
  background: var(--accent-primary);
  color: white;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  border-radius: 0.5rem;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-primary:hover:not(:disabled) {
  background: var(--accent-hover);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Мобильная адаптация */
@media (max-width: 480px) {
  .modal-content {
    max-height: 95vh;
    margin: 0.5rem;
  }
  
  .chats-list {
    max-height: 12rem;
  }
  
  .icon-picker {
    gap: 0.375rem;
  }
  
  .icon-btn {
    width: 2rem;
    height: 2rem;
    font-size: 1rem;
  }
}
</style>