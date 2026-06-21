<template>
  <div v-if="replyTo" class="message-reply" @click="scrollToOriginal">
    <div class="reply-border"></div>
    <div class="reply-content">
      <div class="reply-author">{{ replyAuthorName }}</div>
      <div class="reply-text">{{ replyText }}</div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { cleanMentionsForPreview } from '../shared/mentions'

const props = defineProps({
  replyTo: Object, // Сообщение, на которое отвечаем
  currentUserId: String,
})

const emit = defineEmits(['scroll-to'])

const replyAuthorName = computed(() => {
  if (!props.replyTo) return ''
  
  // Если есть автор с данными
  if (props.replyTo.author) {
    const author = props.replyTo.author
    if (author.id === props.currentUserId) return 'Вы'
    return author.firstName 
      ? (author.lastName ? `${author.firstName} ${author.lastName}` : author.firstName)
      : author.displayName || author.username || 'Неизвестно'
  }
  
  // Если только createdBy
  if (props.replyTo.createdBy === props.currentUserId || 
      props.replyTo.created_by === props.currentUserId) {
    return 'Вы'
  }
  
  return 'Пользователь'
})

const replyText = computed(() => {
  if (!props.replyTo) return ''
  
  const text = cleanMentionsForPreview(props.replyTo.text || '')
  // Обрезаем длинный текст
  if (text.length > 60) {
    return text.substring(0, 60) + '...'
  }
  return text
})

function scrollToOriginal() {
  if (props.replyTo) {
    emit('scroll-to', props.replyTo.id)
  }
}
</script>

<style scoped>
.message-reply {
  display: flex;
  gap: calc(8px * var(--ui-scale, 1));
  padding: calc(4px * var(--ui-scale, 1)) 0;
  margin-bottom: calc(4px * var(--ui-scale, 1));
  cursor: pointer;
  border-radius: calc(4px * var(--ui-scale, 1));
  transition: background 0.2s;
}

.message-reply:hover {
  background: var(--bg-hover);
}

.reply-border {
  width: calc(3px * var(--ui-scale, 1));
  background: var(--accent-color);
  border-radius: calc(2px * var(--ui-scale, 1));
  flex-shrink: 0;
}

.reply-content {
  flex: 1;
  min-width: 0;
}

.reply-author {
  font-size: calc(12px * var(--ui-scale, 1));
  color: var(--accent-color);
  font-weight: 600;
  margin-bottom: calc(2px * var(--ui-scale, 1));
}

.reply-text {
  font-size: calc(12px * var(--ui-scale, 1));
  color: var(--text-primary);
  opacity: 0.85;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>