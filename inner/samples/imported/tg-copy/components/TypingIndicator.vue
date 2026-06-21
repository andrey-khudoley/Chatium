<template>
  <div v-if="typingUsers.length > 0" class="typing-indicator">
    <div class="typing-dots">
      <span></span>
      <span></span>
      <span></span>
    </div>
    <span class="typing-text">{{ typingText }}</span>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  typingUsers: {
    type: Array,
    default: () => [],
  },
})

const typingText = computed(() => {
  const count = props.typingUsers.length
  
  if (count === 0) return ''
  
  if (count === 1) {
    return `${props.typingUsers[0].name} печатает...`
  }
  
  if (count === 2) {
    return `${props.typingUsers[0].name} и ${props.typingUsers[1].name} печатают...`
  }
  
  return `${count} человек печатают...`
})
</script>

<style scoped>
.typing-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  color: #667781;
  font-size: 13px;
  background: rgba(0, 0, 0, 0.03);
  border-radius: 16px;
  margin: 4px 0;
  align-self: flex-start;
}

.typing-dots {
  display: flex;
  gap: 3px;
}

.typing-dots span {
  width: 6px;
  height: 6px;
  background: #8696a0;
  border-radius: 50%;
  animation: typing 1.4s infinite ease-in-out both;
}

.typing-dots span:nth-child(1) {
  animation-delay: -0.32s;
}

.typing-dots span:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes typing {
  0%, 80%, 100% {
    transform: scale(0);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

.typing-text {
  font-style: italic;
}
</style>