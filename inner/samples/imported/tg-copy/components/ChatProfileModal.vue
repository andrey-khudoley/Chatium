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
        </div>
        
        <!-- Информация о подписке -->
        <div v-if="isPaid && showSubscriptionInfo" class="info-section subscription-section">
          <h3><i class="fas fa-credit-card"></i> Подписка</h3>
          
          <div v-if="loadingSubscription" class="subscription-loading">
            <i class="fas fa-spinner fa-spin"></i> Загрузка...
          </div>
          
          <div v-else-if="subscriptionInfo && isSubscriptionActive" class="subscription-info active">
            <div class="subscription-status">
              <i class="fas fa-check-circle"></i>
              <span class="status-text">Активна</span>
            </div>
            <div v-if="subscriptionInfo.plan" class="subscription-plan">
              <span class="label">Тариф:</span>
              <span class="value">{{ subscriptionInfo.plan.name }}</span>
            </div>
            <div class="subscription-date">
              <span class="label">Действует до:</span>
              <span class="value">{{ formatDate(subscriptionInfo.endDate) }}</span>
            </div>
          </div>
          
          <div v-else-if="subscriptionInfo && isSubscriptionExpired" class="subscription-info expired">
            <div class="subscription-status">
              <i class="fas fa-times-circle"></i>
              <span class="status-text">Истекла</span>
            </div>
            <div v-if="subscriptionInfo.plan" class="subscription-plan">
              <span class="label">Тариф:</span>
              <span class="value">{{ subscriptionInfo.plan.name }}</span>
            </div>
            <div class="subscription-date">
              <span class="label">Истекла:</span>
              <span class="value">{{ formatDate(subscriptionInfo.endDate) }}</span>
            </div>
          </div>
          
          <div v-else-if="subscriptionInfo && subscriptionInfo.status === 'pending'" class="subscription-info pending">
            <div class="subscription-status">
              <i class="fas fa-clock"></i>
              <span class="status-text">Ожидает начала</span>
            </div>
            <div v-if="subscriptionInfo.plan" class="subscription-plan">
              <span class="label">Тариф:</span>
              <span class="value">{{ subscriptionInfo.plan.name }}</span>
            </div>
            <div class="subscription-date">
              <span class="label">Начнется:</span>
              <span class="value">{{ formatDate(subscriptionInfo.startDate) }}</span>
            </div>
          </div>
          
          <div v-else class="subscription-info no-subscription">
            <div class="subscription-status">
              <i class="fas fa-lock"></i>
              <span class="status-text">Нет активной подписки</span>
            </div>
            <p class="subscription-hint">Оформите подписку для доступа к чату</p>
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
        <button @click="$emit('close')" class="btn-secondary btn-full">
          Закрыть
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, watch } from 'vue'
import { apiChatSubscriptionGetRoute } from '../api/chat-subscriptions'

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
  },
  showSubscriptionInfo: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'go-to-chat'])

// Данные о подписке
const subscriptionInfo = ref(null)
const loadingSubscription = ref(false)

// Загружаем информацию о подписке для платного чата
onMounted(async () => {
  if (props.isPaid && props.showSubscriptionInfo) {
    loadingSubscription.value = true
    try {
      const result = await apiChatSubscriptionGetRoute({ feedId: props.chatId }).run(ctx)
      subscriptionInfo.value = result
    } catch (e) {
      console.error('Failed to load subscription info:', e)
    } finally {
      loadingSubscription.value = false
    }
  }
})

// Отладочное логирование
watch(subscriptionInfo, (val) => {
  console.log('[ChatProfileModal] Subscription info loaded:', val)
}, { immediate: true })

// Проверка активности подписки
const isSubscriptionActive = computed(() => {
  if (!subscriptionInfo.value) return false
  const now = new Date()
  const endDate = new Date(subscriptionInfo.value.endDate)
  const isActive = subscriptionInfo.value.status === 'active' && endDate > now
  console.log('[ChatProfileModal] isSubscriptionActive:', { status: subscriptionInfo.value.status, endDate, now, isActive })
  return isActive
})

// Проверка истекшей подписки
const isSubscriptionExpired = computed(() => {
  if (!subscriptionInfo.value) return false
  const now = new Date()
  const endDate = new Date(subscriptionInfo.value.endDate)
  const isExpired = subscriptionInfo.value.status === 'expired' || endDate < now
  console.log('[ChatProfileModal] isSubscriptionExpired:', { status: subscriptionInfo.value.status, endDate, now, isExpired })
  return isExpired
})

// Форматирование даты
const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

const hasAvatar = computed(() => !!props.avatarHash)

const initials = computed(() => {
  if (!props.chatTitle) return '?'
  return props.chatTitle.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()
})

const avatarStyle = computed(() => {
  if (props.avatarHash) {
    return {
      background: `url(https://fs.chatium.ru/thumbnail/${props.avatarHash}/s/300x) center/cover no-repeat`,
    }
  }
  
  // Градиент по умолчанию
  const colors = [
    ['#2AABEE', '#229ED9'],
    ['#f093fb', '#f5576c'],
    ['#4facfe', '#00f2fe'],
    ['#43e97b', '#38f9d7'],
    ['#fa709a', '#fee140'],
  ]
  const index = (props.chatId?.charCodeAt(0) || 0) % colors.length
  const [from, to] = colors[index]
  return {
    background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`,
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
  transition: background 0.2s, color 0.2s;
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

/* Стили для секции подписки */
.subscription-section {
  background: var(--bg-secondary, #f0f2f5);
  border-radius: 12px;
  padding: 16px;
}

.subscription-section h3 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.subscription-section h3 i {
  color: var(--primary-color, #008069);
}

.subscription-loading {
  text-align: center;
  padding: 16px;
  color: var(--text-secondary, #667781);
}

.subscription-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.subscription-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 15px;
  padding: 8px 12px;
  border-radius: 8px;
}

.subscription-info.active .subscription-status {
  background: rgba(16, 185, 129, 0.1);
  color: #059669;
}

.subscription-info.active .subscription-status i {
  color: #10b981;
}

.subscription-info.expired .subscription-status {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
}

.subscription-info.expired .subscription-status i {
  color: #ef4444;
}

.subscription-info.pending .subscription-status {
  background: rgba(245, 158, 11, 0.1);
  color: #d97706;
}

.subscription-info.pending .subscription-status i {
  color: #f59e0b;
}

.subscription-info.no-subscription .subscription-status {
  background: rgba(107, 114, 128, 0.1);
  color: #6b7280;
}

.subscription-info.no-subscription .subscription-status i {
  color: #9ca3af;
}

.subscription-plan,
.subscription-date {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  font-size: 14px;
  border-bottom: 1px dashed var(--border-color, #e0e0e0);
}

.subscription-plan:last-child,
.subscription-date:last-child {
  border-bottom: none;
}

.subscription-plan .label,
.subscription-date .label {
  color: var(--text-secondary, #667781);
}

.subscription-plan .value,
.subscription-date .value {
  font-weight: 500;
  color: var(--text-primary, #111b21);
}

.subscription-hint {
  text-align: center;
  font-size: 13px;
  color: var(--text-secondary, #667781);
  margin: 8px 0 0;
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
  transition: background 0.2s, opacity 0.2s;
}

.btn-full {
  width: 100%;
}

.btn-primary {
  background: var(--primary-color, #2AABEE);
  color: white;
}

.btn-primary:hover {
  background: var(--primary-hover, #229ED9);
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