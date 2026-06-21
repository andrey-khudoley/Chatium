<template>
  <div v-if="forwardedFrom" class="forwarded-from">
    <div class="forwarded-source" @click="handleSourceClick">
      <i class="fas fa-share"></i>
      <span class="forwarded-label">Из </span>
      <span class="forwarded-chat">{{ forwardedFrom.title }}</span>
    </div>
    <div v-if="forwardedFrom.authorName" class="forwarded-author-line" @click="handleAuthorClick">
      
      <span class="forwarded-author">@{{ forwardedFrom.authorName }}</span>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  forwardedFrom: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['click', 'authorClick'])

function handleSourceClick(event) {
  event.stopPropagation()
  emit('click', props.forwardedFrom)
}

function handleAuthorClick(event) {
  event.stopPropagation()
  if (props.forwardedFrom?.authorId) {
    emit('authorClick', {
      userId: props.forwardedFrom.authorId,
      userName: props.forwardedFrom.authorName,
    })
  }
}
</script>

<style scoped>
.forwarded-from {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 6px;
  user-select: none;
}

.forwarded-source {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: var(--accent-color, #008069);
  background: var(--accent-light, rgba(0, 128, 105, 0.1));
  padding: 3px 10px;
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.2s;
  width: fit-content;
}

.forwarded-source:hover {
  background: var(--accent-light-hover, rgba(0, 128, 105, 0.2));
}

.forwarded-source i {
  font-size: 10px;
  opacity: 0.7;
}

.forwarded-label {
  color: var(--text-secondary, #667781);
  font-size: 12px;
}

.forwarded-chat {
  font-weight: 500;
  color: var(--accent-color, #008069);
}

.forwarded-author-line {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-secondary, #667781);
  background: var(--bg-secondary, rgba(102, 119, 129, 0.08));
  padding: 2px 10px;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.2s;
  width: fit-content;
}

.forwarded-author-line:hover {
  background: var(--bg-secondary-hover, rgba(102, 119, 129, 0.15));
}

.forwarded-author-label {
  color: var(--text-secondary, #667781);
  font-size: 11px;
}

.forwarded-author {
  color: var(--text-primary, #111b21);
  font-weight: 500;
}

.forwarded-author-line:hover .forwarded-author {
  color: var(--accent-color, #008069);
}
</style>