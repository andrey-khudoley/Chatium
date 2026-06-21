<template>
  <div v-if="pinnedMessage" class="pinned-messages-container">
    <div class="pinned-message" @click="scrollToMessage">
      <div class="pinned-icon">
        <i class="fas fa-thumbtack"></i>
      </div>
      <div class="pinned-content">
        <div class="pinned-label">
          Закрепленное сообщение
        </div>
        <div class="pinned-text">{{ pinnedMessage.text || 'Нет текста' }}</div>
        <div v-if="pinnedMessage.author" class="pinned-author">
          {{ getAuthorName(pinnedMessage.author) }}
        </div>
      </div>
      <button 
        v-if="canManage" 
        class="pinned-unpin" 
        @click.stop="unpinMessage"
        title="Открепить"
      >
        <i class="fas fa-times"></i>
      </button>
    </div>
  </div>
</template>

<script setup>
import { apiPinnedRemoveRoute } from '../api/pinned'

const props = defineProps({
  pinnedMessage: {
    type: Object,
    default: null
  },
  feedId: String,
  canManage: Boolean,
})

const emit = defineEmits(['unpin', 'scroll-to'])

async function unpinMessage() {
  if (!confirm('Открепить это сообщение?')) return
  
  try {
    await apiPinnedRemoveRoute({ feedId: props.feedId }).run(ctx, {})
    emit('unpin')
  } catch (err) {
    console.error('Failed to unpin message:', err)
  }
}

function scrollToMessage() {
  if (props.pinnedMessage) {
    emit('scroll-to', props.pinnedMessage.id)
  }
}

function getAuthorName(author) {
  if (!author) return 'Неизвестно'
  return author.firstName 
    ? (author.lastName ? `${author.firstName} ${author.lastName}` : author.firstName)
    : author.displayName || 'Пользователь'
}
</script>

<style scoped>
.pinned-messages-container {
  background: var(--pinned-bg);
  border-bottom: 1px solid var(--pinned-border);
}

.pinned-message {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  cursor: pointer;
  transition: background 0.2s;
}

.pinned-message:hover {
  background: var(--bg-hover);
}

.pinned-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--primary-color);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 14px;
  flex-shrink: 0;
}

.pinned-content {
  flex: 1;
  min-width: 0;
}

.pinned-label {
  font-size: 12px;
  color: var(--primary-color);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.pinned-text {
  font-size: 13px;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 2px;
}

.pinned-author {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 2px;
}

.pinned-unpin {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  font-size: 14px;
}

.pinned-unpin:hover {
  background: var(--bg-hover);
  color: var(--text-secondary);
}
</style>