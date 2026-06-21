<template>
  <div 
    v-if="show" 
    class="mention-picker"
    :style="pickerStyle"
    @click.stop
  >
    <div class="mention-picker-header">
      <i class="fas fa-at"></i>
      <span>Упомянуть</span>
    </div>
    
    <div v-if="loading" class="mention-picker-loading">
      <i class="fas fa-spinner fa-spin"></i>
      <span>Загрузка...</span>
    </div>
    
    <div v-else-if="filteredUsers.length === 0" class="mention-picker-empty">
      <i class="fas fa-search"></i>
      <span>Пользователи не найдены</span>
    </div>
    
    <div v-else class="mention-picker-list">
      <div
        v-for="(participant, index) in filteredUsers"
        :key="participant.userId || participant.id"
        class="mention-user"
        :class="{ selected: index === selectedIndex }"
        @click="selectUser(participant)"
        @mouseenter="selectedIndex = index"
      >
        <div class="mention-user-avatar" :style="getAvatarStyle(participant)">
          <span v-if="!getUserAvatar(participant)">{{ getInitials(participant) }}</span>
        </div>
        <div class="mention-user-info">
          <div class="mention-user-name">{{ getDisplayName(participant) }}</div>
          <div v-if="getUserUsername(participant)" class="mention-user-username">@{{ getUserUsername(participant) }}</div>
        </div>
        <div v-if="index === selectedIndex" class="mention-user-check">
          <i class="fas fa-check"></i>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  show: Boolean,
  participants: {
    type: Array,
    default: () => []
  },
  searchQuery: {
    type: String,
    default: ''
  },
  position: {
    type: Object,
    default: () => ({ x: 0, y: 0 })
  },
  textareaRect: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['select', 'close'])

const loading = ref(false)
const selectedIndex = ref(0)

// Получаем объект user из participant
function getUser(participant) {
  return participant?.user || participant
}

// Получаем аватар пользователя
function getUserAvatar(participant) {
  const user = getUser(participant)
  return user?.avatar || participant?.avatar
}

// Получаем username пользователя
function getUserUsername(participant) {
  const user = getUser(participant)
  return user?.username || participant?.username
}

// Получаем ID пользователя
function getUserId(participant) {
  return participant?.userId || participant?.id || user?.id
}

// Фильтруем пользователей по поисковому запросу
const filteredUsers = computed(() => {
  if (!props.searchQuery) return props.participants
  
  const query = props.searchQuery.toLowerCase()
  return props.participants.filter(participant => {
    const name = getDisplayName(participant).toLowerCase()
    const username = (getUserUsername(participant) || '').toLowerCase()
    return name.includes(query) || username.includes(query)
  })
})

// Позиционирование пикера
const pickerStyle = computed(() => {
  if (!props.textareaRect) {
    return {
      left: `${props.position.x}px`,
      top: `${props.position.y}px`,
    }
  }
  
  const pickerHeight = Math.min(filteredUsers.value.length * 56 + 50, 300)
  const pickerWidth = 280
  
  let left = props.textareaRect.left + 20
  let top = props.textareaRect.top - pickerHeight - 10
  
  // Проверяем границы экрана
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  
  if (left + pickerWidth > viewportWidth - 10) {
    left = viewportWidth - pickerWidth - 10
  }
  
  if (top < 10) {
    // Если не помещается сверху — показываем снизу от textarea
    top = props.textareaRect.bottom + 10
  }
  
  return {
    left: `${left}px`,
    top: `${top}px`,
    width: `${pickerWidth}px`,
    maxHeight: '300px',
  }
})

// Сбрасываем выбор при изменении фильтра
watch(() => props.searchQuery, () => {
  selectedIndex.value = 0
})

// Обработка клавиатуры
function handleKeydown(event) {
  if (!props.show) return
  
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      selectedIndex.value = (selectedIndex.value + 1) % filteredUsers.value.length
      break
    case 'ArrowUp':
      event.preventDefault()
      selectedIndex.value = (selectedIndex.value - 1 + filteredUsers.value.length) % filteredUsers.value.length
      break
    case 'Enter':
      event.preventDefault()
      if (filteredUsers.value[selectedIndex.value]) {
        selectUser(filteredUsers.value[selectedIndex.value])
      }
      break
    case 'Escape':
      event.preventDefault()
      emit('close')
      break
    case 'Tab':
      event.preventDefault()
      if (filteredUsers.value[selectedIndex.value]) {
        selectUser(filteredUsers.value[selectedIndex.value])
      }
      break
  }
}

function selectUser(participant) {
  emit('select', {
    id: getUserId(participant),
    displayName: getDisplayName(participant),
    username: getUserUsername(participant),
  })
}

function getDisplayName(participant) {
  const user = getUser(participant)
  
  if (user?.firstName && user?.lastName) {
    return `${user.firstName} ${user.lastName}`
  }
  if (user?.firstName) return user.firstName
  if (user?.displayName) return user.displayName
  if (user?.username) return user.username
  if (participant?.displayName) return participant.displayName
  if (participant?.username) return participant.username
  return 'Пользователь'
}

function getInitials(participant) {
  const user = getUser(participant)
  const firstName = user?.firstName || ''
  const lastName = user?.lastName || ''
  
  if (firstName && lastName) {
    return (firstName[0] + lastName[0]).toUpperCase()
  }
  if (firstName) {
    return firstName.substring(0, 2).toUpperCase()
  }
  if (user?.displayName) {
    return user.displayName.substring(0, 2).toUpperCase()
  }
  if (user?.username) {
    return user.username.substring(0, 2).toUpperCase()
  }
  if (participant?.displayName) {
    return participant.displayName.substring(0, 2).toUpperCase()
  }
  if (participant?.username) {
    return participant.username.substring(0, 2).toUpperCase()
  }
  return '?'
}

function getAvatarStyle(participant) {
  const avatar = getUserAvatar(participant)
  
  if (avatar) {
    return {
      background: `url(${avatar}) center/cover no-repeat`,
    }
  }
  
  const colors = [
    ['#667eea', '#764ba2'],
    ['#f093fb', '#f5576c'],
    ['#4facfe', '#00f2fe'],
    ['#43e97b', '#38f9d7'],
    ['#fa709a', '#fee140'],
    ['#a8edea', '#fed6e3'],
    ['#d299c2', '#fef9d7'],
    ['#89f7fe', '#66a6ff'],
  ]
  const userId = getUserId(participant) || ''
  const index = userId.charCodeAt(0) % colors.length
  const [from, to] = colors[index]
  return {
    background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`,
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.mention-picker {
  position: fixed;
  background: var(--bg-primary, #fff);
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: mentionPickerFadeIn 0.15s ease-out;
}

@keyframes mentionPickerFadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.mention-picker-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color, #e0e0e0);
  color: var(--text-secondary, #667781);
  font-size: 13px;
  font-weight: 500;
}

.mention-picker-header i {
  color: var(--accent-color, #008069);
}

.mention-picker-loading,
.mention-picker-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  gap: 12px;
  color: var(--text-secondary, #667781);
}

.mention-picker-loading i,
.mention-picker-empty i {
  font-size: 24px;
  opacity: 0.5;
}

.mention-picker-list {
  overflow-y: auto;
  max-height: 250px;
}

.mention-user {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.mention-user:hover,
.mention-user.selected {
  background: var(--bg-hover, #f0f2f5);
}

.mention-user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 13px;
  font-weight: 600;
  flex-shrink: 0;
}

.mention-user-info {
  flex: 1;
  min-width: 0;
}

.mention-user-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary, #111b21);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mention-user-username {
  font-size: 12px;
  color: var(--text-secondary, #667781);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mention-user-check {
  color: var(--accent-color, #008069);
  font-size: 14px;
}

/* Скроллбар */
.mention-picker-list::-webkit-scrollbar {
  width: 6px;
}

.mention-picker-list::-webkit-scrollbar-track {
  background: transparent;
}

.mention-picker-list::-webkit-scrollbar-thumb {
  background: var(--border-color, #e0e0e0);
  border-radius: 3px;
}

.mention-picker-list::-webkit-scrollbar-thumb:hover {
  background: var(--text-secondary, #667781);
}
</style>