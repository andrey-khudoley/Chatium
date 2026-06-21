<template>
  <button
    v-if="canMessageUser"
    @click="startDirectChat"
    :disabled="loading"
    class="btn-message-user"
    title="Написать личное сообщение"
  >
    <i v-if="loading" class="fas fa-spinner fa-spin"></i>
    <i v-else class="fas fa-comment"></i>
  </button>
  <span v-else-if="privacyReason" class="privacy-reason" :title="privacyReason">
    <i class="fas fa-lock"></i>
  </span>
</template>

<script setup>
import { ref, computed } from 'vue'
import { apiDirectChatCanMessageRoute, apiDirectChatCreateRoute } from '../api/direct-chats'

const props = defineProps({
  userId: String,
  userName: String,
})

const emit = defineEmits(['chat-created'])

const loading = ref(false)
const canMessage = ref(null)
const privacyReason = ref('')

const canMessageUser = computed(() => {
  return canMessage.value === true
})

// Проверяем возможность отправки сообщения
async function checkCanMessage() {
  try {
    const result = await apiDirectChatCanMessageRoute.run(ctx, {
      userId: props.userId,
    })
    canMessage.value = result.allowed
    privacyReason.value = result.reason || ''
  } catch (error) {
    console.error('Failed to check can message:', error)
    canMessage.value = false
  }
}

// Создаем или открываем личный чат
async function startDirectChat() {
  if (loading.value) return
  
  loading.value = true
  try {
    const result = await apiDirectChatCreateRoute.run(ctx, {
      userId: props.userId,
    })
    
    if (result.success) {
      emit('chat-created', {
        feedId: result.feedId,
        isNew: result.isNew,
        chat: result.chat,
      })
    }
  } catch (error) {
    console.error('Failed to create direct chat:', error)
    alert(error.message || 'Не удалось создать чат')
  } finally {
    loading.value = false
  }
}

// Проверяем при монтировании
checkCanMessage()
</script>

<style scoped>
.btn-message-user {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--accent-light);
  color: var(--accent-primary);
  border: none;
  border-radius: 50%;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.btn-message-user:hover:not(:disabled) {
  background: var(--accent-primary);
  color: var(--text-inverse);
}

.btn-message-user:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.privacy-reason {
  color: var(--text-muted);
  font-size: 12px;
  padding: 6px;
}
</style>