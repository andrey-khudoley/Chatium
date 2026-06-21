<template>
  <div class="modal-overlay" @click="$emit('close')">
    <div class="modal-content" @click.stop>
      <div class="chat-profile-header">
        <button @click="$emit('close')" class="close-btn">
          <i class="fas fa-times"></i>
        </button>

        <div class="chat-avatar-wrapper">
          <div class="chat-avatar" :style="avatarStyle">
            <span v-if="!hasAvatar">{{ initials }}</span>
          </div>
        </div>

        <h2 class="chat-name">
          <i v-if="chatType === 'channel'" class="fas fa-bullhorn" title="Канал"></i>
          <i v-else-if="chatType === 'group'" class="fas fa-users" title="Групповой чат"></i>
          <i v-else-if="chatType === 'direct'" class="fas fa-user" title="Личный чат"></i>
          <span>{{ chatTitle }}</span>
        </h2>

        <p class="chat-type">{{ typeLabel }}</p>
      </div>

      <div class="chat-profile-body">
        <div v-if="chatDescription" class="info-section">
          <h3>Описание</h3>
          <p class="description">{{ chatDescription }}</p>
        </div>

        <div class="info-section">
          <h3>Информация</h3>
          <div class="info-item">
            <i class="fas fa-hashtag"></i>
            <span>ID: {{ chatId }}</span>
          </div>
          <div v-if="isPaid" class="info-item">
            <i class="fas fa-crown"></i>
            <span>Платный {{ typeLabel }}</span>
          </div>
          <div v-if="isPublic" class="info-item">
            <i class="fas fa-globe"></i>
            <span>Публичный</span>
          </div>
        </div>
      </div>

      <div class="chat-profile-footer">
        <button @click="goToChat" class="btn-primary btn-full">
          <i class="fas fa-arrow-right"></i>
          Перейти в {{ typeLabel.toLowerCase() }}
        </button>
        <button @click="$emit('close')" class="btn-secondary btn-full">Закрыть</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  chatId: {
    type: String,
    required: true
  },
  chatTitle: {
    type: String,
    default: 'Неизвестный чат'
  },
  chatType: {
    type: String,
    default: 'group' // 'direct' | 'group' | 'channel'
  },
  chatDescription: {
    type: String,
    default: ''
  },
  avatarHash: {
    type: String,
    default: null
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  isPaid: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'go-to-chat'])

const hasAvatar = computed(() => !!props.avatarHash)

const initials = computed(() => {
  if (!props.chatTitle) return '?'
  return props.chatTitle
    .split(' ')
    .map((w) => w[0])
    .join('')
    .substring(0, 2)
    .toUpperCase()
})

const avatarStyle = computed(() => {
  if (props.avatarHash) {
    return {
      background: `url(https://fs.chatium.ru/thumbnail/${props.avatarHash}/s/300x) center/cover no-repeat`
    }
  }

  // Градиент по умолчанию
  const colors = [
    ['#667eea', '#764ba2'],
    ['#f093fb', '#f5576c'],
    ['#4facfe', '#00f2fe'],
    ['#43e97b', '#38f9d7'],
    ['#fa709a', '#fee140']
  ]
  const index = (props.chatId?.charCodeAt(0) || 0) % colors.length
  const [from, to] = colors[index]
  return {
    background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`
  }
})

const typeLabel = computed(() => {
  const labels = {
    direct: 'Личный чат',
    group: 'Групповой чат',
    channel: 'Канал'
  }
  return labels[props.chatType] || 'Чат'
})

function goToChat() {
  emit('go-to-chat', props.chatId)
  emit('close')
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(2px);
}

.modal-content {
  background: var(--bg-primary, #fff);
  border-radius: 16px;
  width: 90%;
  max-width: 360px;
  max-height: 80vh;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
}

.chat-profile-header {
  position: relative;
  padding: 24px 20px;
  background: var(--bg-secondary, #f0f2f5);
  text-align: center;
  border-bottom: 1px solid var(--border-color, #e0e0e0);
}

.close-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  background: none;
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text-secondary, #667781);
  transition:
    background 0.2s,
    color 0.2s;
}

.close-btn:hover {
  background: var(--bg-hover, #e0e2e5);
  color: var(--text-primary, #111b21);
}

.chat-avatar-wrapper {
  margin-bottom: 12px;
}

.chat-avatar {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 36px;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.chat-name {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary, #111b21);
  margin: 0 0 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.chat-name i {
  font-size: 16px;
  color: var(--text-secondary, #667781);
}

.chat-type {
  font-size: 14px;
  color: var(--text-secondary, #667781);
  margin: 0;
}

.chat-profile-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.info-section {
  margin-bottom: 20px;
}

.info-section:last-child {
  margin-bottom: 0;
}

.info-section h3 {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary, #667781);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0 0 12px;
}

.description {
  font-size: 14px;
  color: var(--text-primary, #111b21);
  line-height: 1.5;
  margin: 0;
  padding: 12px;
  background: var(--bg-secondary, #f0f2f5);
  border-radius: 8px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid var(--border-color, #e0e0e0);
  font-size: 14px;
  color: var(--text-primary, #111b21);
}

.info-item:last-child {
  border-bottom: none;
}

.info-item i {
  width: 20px;
  text-align: center;
  color: var(--text-secondary, #667781);
}

.chat-profile-footer {
  padding: 16px 20px;
  border-top: 1px solid var(--border-color, #e0e0e0);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.btn-primary,
.btn-secondary {
  padding: 12px 16px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition:
    background 0.2s,
    opacity 0.2s;
}

.btn-full {
  width: 100%;
}

.btn-primary {
  background: var(--primary-color, #008069);
  color: white;
}

.btn-primary:hover {
  background: var(--primary-hover, #007a62);
}

.btn-secondary {
  background: var(--bg-secondary, #f0f2f5);
  color: var(--text-primary, #333);
}

.btn-secondary:hover {
  background: var(--bg-hover, #e0e2e5);
}

/* Scrollbar styling */
.chat-profile-body::-webkit-scrollbar {
  width: 6px;
}

.chat-profile-body::-webkit-scrollbar-track {
  background: transparent;
}

.chat-profile-body::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb, rgba(0, 0, 0, 0.2));
  border-radius: 3px;
}

.chat-profile-body::-webkit-scrollbar-thumb:hover {
  background: var(--scrollbar-thumb-hover, rgba(0, 0, 0, 0.3));
}
</style>
