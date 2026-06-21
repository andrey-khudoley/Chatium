<template>
  <div v-if="pinnedChats.length > 0" class="pinned-chats-section">
    <div class="pinned-header">
      <i class="fas fa-thumbtack"></i>
      <span>Закрепленные</span>
    </div>
    <div class="pinned-list" ref="pinnedListRef">
      <div
        v-for="(chat, index) in pinnedChatsWithData"
        :key="chat.feedId"
        :class="['pinned-item', { 
          active: chat.feedId === selectedChat,
          dragging: draggedIndex === index 
        }]"
        :draggable="true"
        @dragstart="onDragStart($event, index)"
        @dragover.prevent="onDragOver($event, index)"
        @drop="onDrop($event, index)"
        @dragend="onDragEnd"
        @click="selectChat(chat.feedId)"
      >
        <div class="drag-handle">
          <i class="fas fa-grip-lines"></i>
        </div>
        <div class="chat-avatar" :style="getAvatarStyle(chat)">
          <span v-if="!hasChatAvatar(chat)">{{ getChatInitials(chat.displayTitle || chat.title) }}</span>
        </div>
        <div class="chat-info">
          <div class="chat-name">{{ chat.displayTitle || chat.title }}</div>
          <div class="chat-type">
            <i v-if="chat.type === 'group'" class="fas fa-users"></i>
            <i v-else-if="chat.type === 'channel'" class="fas fa-bullhorn"></i>
            <i v-else class="fas fa-user"></i>
            {{ getChatTypeLabel(chat.type) }}
          </div>
        </div>
        <button 
          class="unpin-btn" 
          @click.stop="unpinChat(chat.feedId)"
          title="Открепить"
        >
          <i class="fas fa-times"></i>
        </button>
      </div>
    </div>
    <div class="pinned-divider"></div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  pinnedChats: {
    type: Array,
    default: () => []
  },
  allChats: {
    type: Array,
    default: () => []
  },
  selectedChat: String,
})

const emit = defineEmits(['select-chat', 'unpin', 'reorder'])

const draggedIndex = ref(-1)

// Сопоставляем закрепленные чаты с полными данными из списка чатов
const pinnedChatsWithData = computed(() => {
  return props.pinnedChats
    .map(pinned => {
      const fullChat = props.allChats.find(c => c.feedId === pinned.feedId)
      return fullChat ? { ...fullChat, sortOrder: pinned.sortOrder } : null
    })
    .filter(Boolean)
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
})

function selectChat(feedId) {
  emit('select-chat', feedId)
}

function unpinChat(feedId) {
  emit('unpin', feedId)
}

function onDragStart(event, index) {
  draggedIndex.value = index
  event.dataTransfer.effectAllowed = 'move'
  event.target.style.opacity = '0.5'
}

function onDragOver(event, index) {
  event.preventDefault()
  event.dataTransfer.dropEffect = 'move'
}

function onDrop(event, dropIndex) {
  event.preventDefault()
  const dragIndex = draggedIndex.value
  
  if (dragIndex === -1 || dragIndex === dropIndex) return
  
  const newOrder = [...pinnedChatsWithData.value]
  const [removed] = newOrder.splice(dragIndex, 1)
  newOrder.splice(dropIndex, 0, removed)
  
  const feedIds = newOrder.map(c => c.feedId)
  emit('reorder', feedIds)
  
  event.target.closest('.pinned-item').style.opacity = '1'
}

function onDragEnd(event) {
  if (event.target) {
    event.target.style.opacity = '1'
  }
  draggedIndex.value = -1
}

function getChatInitials(title) {
  if (!title) return '?'
  return title.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()
}

function getChatTypeLabel(type) {
  const labels = {
    group: 'Группа',
    direct: 'Личный',
    channel: 'Канал',
  }
  return labels[type] || 'Чат'
}

function getAvatarStyle(chat) {
  if (chat.avatarHash) {
    return {
      background: `url(https://fs.chatium.ru/thumbnail/${chat.avatarHash}/s/200x) center/cover no-repeat`,
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
    ['#a8edea', '#fed6e3'],
    ['#d299c2', '#fef9d7'],
    ['#89f7fe', '#66a6ff'],
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
.pinned-chats-section {
  background: var(--bg-primary);
  flex-shrink: 0;
}

.pinned-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.pinned-header i {
  font-size: 0.625rem;
  transform: rotate(-45deg);
}

.pinned-list {
  display: flex;
  flex-direction: column;
}

.pinned-item {
  display: flex;
  align-items: center;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  transition: background 0.2s;
  border-left: 3px solid transparent;
  gap: 0.5rem;
}

.pinned-item:hover {
  background: var(--bg-hover);
}

.pinned-item.active {
  background: var(--accent-light);
  border-left-color: var(--accent-primary);
}

.pinned-item.dragging {
  opacity: 0.5;
}

.drag-handle {
  color: var(--text-muted);
  font-size: 0.625rem;
  cursor: grab;
  padding: 0.25rem;
  opacity: 0;
  transition: opacity 0.2s;
}

.pinned-item:hover .drag-handle {
  opacity: 1;
}

.drag-handle:active {
  cursor: grabbing;
}

.chat-avatar {
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 0.75rem;
  flex-shrink: 0;
}

.chat-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.chat-name {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chat-type {
  font-size: 0.6875rem;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.chat-type i {
  font-size: 0.625rem;
}

.unpin-btn {
  width: 1.5rem;
  height: 1.5rem;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.625rem;
  opacity: 0;
  transition: all 0.2s;
}

.pinned-item:hover .unpin-btn {
  opacity: 1;
}

.unpin-btn:hover {
  background: var(--bg-hover);
  color: var(--danger-color);
}

.pinned-divider {
  height: 1px;
  background: var(--border-color);
  margin: 0.5rem 0;
}

@media (max-width: 768px) {
  .drag-handle {
    opacity: 1;
  }
  
  .unpin-btn {
    opacity: 1;
  }
}
</style>