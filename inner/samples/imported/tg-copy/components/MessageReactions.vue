<template>
  <div class="message-reactions">
    <div class="reactions-list">
      <button
        v-for="(users, emoji) in safeReactions"
        :key="emoji"
        :class="['reaction-btn', { active: hasUserReacted(emoji) }]"
        @click="toggleReaction(emoji)"
        :title="getReactionTooltip(emoji, users)"
      >
        <span class="reaction-emoji">{{ emoji }}</span>
        <span class="reaction-count">{{ Array.isArray(users) ? users.length : 0 }}</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { apiReactionsToggleRoute } from '../api/reactions'

const props = defineProps({
  messageId: String,
  feedId: String,
  reactions: {
    type: Object,
    default: () => ({}),
  },
})

const emit = defineEmits(['update'])

// Вспомогательная функция для нормализации реакций
function normalizeReactions(reactions) {
  if (typeof reactions === 'string') {
    try {
      return JSON.parse(reactions)
    } catch (e) {
      return {}
    }
  }
  return reactions || {}
}

// Безопасный доступ к реакциям
const safeReactions = computed(() => {
  return normalizeReactions(props.reactions)
})

function hasUserReacted(emoji) {
  const users = safeReactions.value[emoji] || []
  return users.some(u => u?.user_id === ctx.user?.id)
}

function getReactionTooltip(emoji, users) {
  if (!Array.isArray(users)) return emoji
  
  const count = users.length
  if (count === 0) return emoji
  
  const hasMine = users.some(u => u?.user_id === ctx.user?.id)
  
  if (count === 1 && hasMine) return 'Вы'
  if (hasMine) return `Вы и ещё ${count - 1}`
  return `${count}`
}

async function toggleReaction(emoji) {
  try {
    const result = await apiReactionsToggleRoute({ feedId: props.feedId }).run(ctx, {
      messageId: props.messageId,
      emoji,
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
    
    emit('update', {
      messageId: props.messageId,
      reactions: JSON.parse(JSON.stringify(reactions)),
    })
  } catch (err) {
    console.error('[MessageReactions] Failed to toggle reaction:', err)
  }
}
</script>

<style scoped>
.message-reactions {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
  flex-wrap: wrap;
}

.reactions-list {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.reaction-btn {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 2px 6px;
  border: 1px solid var(--reaction-border);
  border-radius: 12px;
  background: var(--bg-primary);
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.reaction-btn:hover {
  background: var(--bg-hover);
  border-color: var(--border-color);
}

.reaction-btn.active {
  background: var(--reaction-active);
  border-color: var(--primary-color);
}

.reaction-emoji {
  font-size: 14px;
}

.reaction-count {
  font-size: 11px;
  color: var(--text-secondary);
  font-weight: 500;
}
</style>