<template>
  <Teleport to="body">
    <div v-if="show" class="modal-overlay" @click.self="close">
      <div class="modal-content subscription-modal">
        <div class="modal-header">
          <h3>{{ isPendingAccess ? 'Доступ откроется позже' : 'Подписка на чат' }}</h3>
          <button class="btn-close" @click="close">
            <i class="fa-solid fa-times"></i>
          </button>
        </div>
        
        <div class="modal-body">
          <!-- Нет доступа - нужна подписка -->
          <div v-if="!isPendingAccess && !subscription" class="subscription-required">
            <div class="chat-preview">
              <div class="chat-avatar" :style="chatAvatarStyle">
                {{ chatInitials }}
              </div>
              <div class="chat-info">
                <h4>{{ chatTitle }}</h4>
                <p v-if="chatDescription" class="description">{{ chatDescription }}</p>
              </div>
            </div>
            
            <div class="plans-section">
              <h4>Выберите тариф</h4>
              <div class="plans-list">
                <div
                  v-for="plan in plans"
                  :key="plan.id"
                  class="plan-card"
                  :class="{ selected: selectedPlan?.id === plan.id }"
                  @click="selectPlan(plan)"
                >
                  <div class="plan-header">
                    <span class="plan-name">{{ plan.name }}</span>
                    <span class="plan-price">{{ formatPrice(plan.price) }}</span>
                  </div>
                  <p v-if="plan.description" class="plan-description">{{ plan.description }}</p>
                  <div class="plan-duration">
                    <i class="fa-regular fa-clock"></i>
                    {{ formatDuration(plan) }}
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Выбор периода для календарных тарифов -->
            <div v-if="selectedPlan && periodOptions.length > 0" class="period-section">
              <h4>Выберите период</h4>
              <div class="period-options">
                <label
                  v-for="option in periodOptions"
                  :key="option.value"
                  class="period-option"
                  :class="{ selected: selectedPeriod === option.value }"
                >
                  <input
                    type="radio"
                    v-model="selectedPeriod"
                    :value="option.value"
                    class="period-radio"
                  />
                  <span class="period-label">{{ option.label }}</span>
                </label>
              </div>
            </div>
            
            <!-- Автопродление -->
            <div v-if="selectedPlan?.allowAutoRenewal" class="auto-renewal-section">
              <label class="checkbox-label">
                <input
                  type="checkbox"
                  v-model="autoRenewal"
                  class="checkbox-input"
                />
                <span class="checkbox-text">
                  Автоматическое продление подписки
                  <small>Можно отключить в любой момент в профиле</small>
                </span>
              </label>
            </div>
            
            <div v-if="error" class="error-message">
              <i class="fa-solid fa-circle-exclamation"></i>
              {{ error }}
            </div>
            
            <button
              class="btn btn-primary btn-large btn-full"
              :disabled="!selectedPlan || !selectedPeriod || loading"
              @click="subscribe"
            >
              <i v-if="loading" class="fa-solid fa-spinner fa-spin"></i>
              <span v-else>Оформить подписку</span>
            </button>
          </div>
          
          <!-- Pending доступ -->
          <div v-else-if="isPendingAccess" class="pending-access">
            <div class="pending-icon">
              <i class="fa-regular fa-clock"></i>
            </div>
            <h4>Подписка оформлена!</h4>
            <p>Доступ к чату откроется</p>
            <div class="pending-date">
              {{ formatDate(subscription.startDate) }}
            </div>
            <p class="pending-note">
              Мы отправим вам уведомление, когда доступ будет открыт.
            </p>
            <button class="btn btn-secondary btn-full" @click="close">
              Понятно
            </button>
          </div>
          
          <!-- Есть активная подписка -->
          <div v-else-if="subscription" class="active-subscription">
            <div class="subscription-status">
              <i class="fa-solid fa-check-circle success-icon"></i>
              <h4>Активная подписка</h4>
              <p>Действует до {{ formatDate(subscription.endDate) }}</p>
            </div>

            <div v-if="subscription.isExpiringSoon" class="expiring-warning">
              <i class="fa-solid fa-exclamation-triangle"></i>
              <span>Подписка скоро истекает!</span>
            </div>

            <div class="auto-renewal-status">
              <div class="renewal-info">
                <span class="renewal-label">Автопродление:</span>
                <span :class="['renewal-value', subscription.autoRenewal ? 'enabled' : 'disabled']">
                  {{ subscription.autoRenewal ? 'Включено' : 'Отключено' }}
                </span>
              </div>
              <button
                v-if="subscription.autoRenewal"
                class="btn btn-text"
                @click="cancelAutoRenewal"
              >
                Отключить автопродление
              </button>
            </div>

            <!-- Выбор периода для продления -->
            <div class="extend-section">
              <div class="extend-divider">
                <span>или</span>
              </div>

              <h4 class="extend-title">Продлить подписку</h4>

              <!-- Выбор периода -->
              <div v-if="extendPeriodOptions.length > 0" class="period-options">
                <label
                  v-for="option in extendPeriodOptions"
                  :key="option.value"
                  class="period-option"
                  :class="{ selected: selectedExtendPeriod === option.value }"
                >
                  <input
                    type="radio"
                    v-model="selectedExtendPeriod"
                    :value="option.value"
                    class="period-radio"
                  />
                  <span class="period-label">{{ option.label }}</span>
                </label>
              </div>

              <button
                class="btn btn-primary btn-full"
                :disabled="!selectedExtendPeriod || extending"
                @click="extendSubscription"
              >
                <i v-if="extending" class="fa-solid fa-spinner fa-spin"></i>
                <span v-else>
                  Продлить
                  <span v-if="selectedPlan?.price" class="price">за {{ formatPrice(selectedPlan.price) }}</span>
                </span>
              </button>
            </div>

            <button class="btn btn-secondary btn-full" @click="close">
              Закрыть
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'

const props = defineProps({
  show: Boolean,
  feedId: String,
  chatTitle: String,
  chatDescription: String,
  chatAvatar: String,
})

const emit = defineEmits(['close', 'subscribed'])

const plans = ref([])
const periodOptions = ref([])
const selectedPlan = ref(null)
const selectedPeriod = ref('')
const autoRenewal = ref(false)
const loading = ref(false)
const error = ref('')
const subscription = ref(null)
const accessStatus = ref(null)

// Для продления подписки
const extendPeriodOptions = ref([])
const selectedExtendPeriod = ref('')
const extending = ref(false)

const isPendingAccess = computed(() => {
  return subscription.value?.status === 'pending' || 
    (subscription.value?.startDate && new Date(subscription.value.startDate) > new Date())
})

const chatInitials = computed(() => {
  if (!props.chatTitle) return '?'
  return props.chatTitle.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
})

const chatAvatarStyle = computed(() => {
  if (props.chatAvatar) {
    return { backgroundImage: `url(${props.chatAvatar})`, backgroundSize: 'cover' }
  }
  return { background: generateGradient(props.feedId) }
})

function generateGradient(id) {
  const colors = [
    ['#667eea', '#764ba2'],
    ['#f093fb', '#f5576c'],
    ['#4facfe', '#00f2fe'],
    ['#43e97b', '#38f9d7'],
    ['#fa709a', '#fee140'],
    ['#a8edea', '#fed6e3'],
  ]
  const index = id?.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length || 0
  return `linear-gradient(135deg, ${colors[index][0]}, ${colors[index][1]})`
}

function formatDuration(plan) {
  const typeLabels = {
    days: 'день',
    months: 'месяц',
    years: 'год'
  }
  
  const value = plan.durationValue
  const type = typeLabels[plan.durationType] || plan.durationType
  
  if (plan.durationType === 'months' && plan.durationValue === 1) {
    return '1 месяц'
  }
  if (plan.durationType === 'months' && plan.durationValue >= 2 && plan.durationValue <= 4) {
    return `${value} месяца`
  }
  if (plan.durationType === 'months') {
    return `${value} месяцев`
  }
  if (plan.durationType === 'days') {
    if (value === 1) return '1 день'
    if (value >= 2 && value <= 4) return `${value} дня`
    return `${value} дней`
  }
  if (plan.durationType === 'years') {
    if (value === 1) return '1 год'
    return `${value} года`
  }
  
  return `${value} ${type}`
}

function formatDate(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

async function loadPlans() {
  try {
    const response = await fetch(`/tg/api/chat-subscription-plans~${props.feedId}/plans`).then(r => r.json())
    plans.value = response || []
  } catch (e) {
    console.error('Failed to load plans:', e)
  }
}

async function loadSubscription() {
  try {
    const response = await fetch(`/tg/api/chat-subscriptions~${props.feedId}/subscription`).then(r => r.json())
    subscription.value = response
  } catch (e) {
    console.error('Failed to load subscription:', e)
  }
}

async function checkAccess() {
  try {
    const response = await fetch(`/tg/api/chat-subscriptions~${props.feedId}/check-access`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    }).then(r => r.json())

    accessStatus.value = response

    if (!response.hasAccess && response.reason === 'no_subscription') {
      // Показываем список тарифов
      await loadPlans()
    } else if (response.subscription) {
      subscription.value = response.subscription
      // Загружаем опции для продления
      await loadExtendPeriodOptions()
    }
  } catch (e) {
    console.error('Failed to check access:', e)
  }
}

async function loadExtendPeriodOptions() {
  if (!subscription.value?.plan?.id) return

  try {
    const response = await fetch(`/tg/api/chat-subscription-plans~plans/${subscription.value.plan.id}/periods`).then(r => r.json())
    extendPeriodOptions.value = response || []
    if (extendPeriodOptions.value.length > 0) {
      selectedExtendPeriod.value = extendPeriodOptions.value[0].value
    }
  } catch (e) {
    console.error('Failed to load extend period options:', e)
  }
}

async function extendSubscription() {
  if (!subscription.value || !selectedExtendPeriod.value) return

  extending.value = true
  error.value = ''

  try {
    const response = await fetch(`/tg/api/chat-subscriptions~${subscription.value.id}/extend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        periodValue: selectedExtendPeriod.value
      })
    }).then(r => r.json())

    if (response.paymentLink) {
      // Перенаправляем на оплату
      window.location.href = response.paymentLink
    } else {
      await loadSubscription()
    }
  } catch (e) {
    error.value = e.message || 'Ошибка при продлении подписки'
  } finally {
    extending.value = false
  }
}

async function selectPlan(plan) {
  selectedPlan.value = plan
  selectedPeriod.value = ''
  periodOptions.value = []
  
  if (plan.durationType === 'months' || plan.durationType === 'years') {
    try {
      const options = await fetch(`/tg/api/chat-subscription-plans~${props.feedId}/plans/${plan.id}/periods`).then(r => r.json())
      periodOptions.value = options || []
      if (periodOptions.value.length > 0) {
        selectedPeriod.value = periodOptions.value[0].value
      }
    } catch (e) {
      console.error('Failed to load periods:', e)
    }
  } else {
    // Для дней - сразу создаем опцию
    selectedPeriod.value = 'immediate'
  }
}

async function subscribe() {
  if (!selectedPlan.value || !selectedPeriod.value) return
  
  loading.value = true
  error.value = ''
  
  try {
    const response = await fetch(`/tg/api/chat-subscriptions~${props.feedId}/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        planId: selectedPlan.value.id,
        periodValue: selectedPeriod.value,
        autoRenewal: autoRenewal.value
      })
    }).then(r => r.json())
    
    if (response.paymentLink) {
      // Перенаправляем на оплату
      window.location.href = response.paymentLink
    } else {
      await loadSubscription()
      emit('subscribed')
    }
  } catch (e) {
    error.value = e.message || 'Ошибка при оформлении подписки'
  } finally {
    loading.value = false
  }
}

async function cancelAutoRenewal() {
  try {
    await fetch(`/tg/api/chat-subscriptions~${props.feedId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    })
    await loadSubscription()
  } catch (e) {
    error.value = e.message || 'Ошибка при отмене автопродления'
  }
}

function close() {
  emit('close')
}

watch(() => props.show, (show) => {
  if (show) {
    checkAccess()
  }
})

onMounted(() => {
  if (props.show) {
    checkAccess()
  }
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: var(--modal-bg);
  border-radius: 16px;
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
}

.subscription-modal {
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.btn-close {
  background: none;
  border: none;
  font-size: 20px;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px;
}

.modal-body {
  padding: 20px;
}

.chat-preview {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: 12px;
  margin-bottom: 20px;
}

.chat-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 600;
  color: white;
  flex-shrink: 0;
}

.chat-info h4 {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.chat-info .description {
  margin: 0;
  font-size: 14px;
  color: var(--text-secondary);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.plans-section h4,
.period-section h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.plans-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

.plan-card {
  padding: 16px;
  border: 2px solid var(--border-color);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.plan-card:hover {
  border-color: var(--accent-color);
  background: var(--bg-hover);
}

.plan-card.selected {
  border-color: var(--accent-color);
  background: var(--accent-light);
}

.plan-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.plan-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.plan-price {
  font-size: 18px;
  font-weight: 700;
  color: var(--accent-color);
}

.plan-description {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: var(--text-secondary);
}

.plan-duration {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-secondary);
}

.period-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 20px;
}

.period-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border: 2px solid var(--border-color);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.period-option:hover {
  border-color: var(--accent-color);
}

.period-option.selected {
  border-color: var(--accent-color);
  background: var(--accent-light);
}

.period-radio {
  width: 20px;
  height: 20px;
  accent-color: var(--accent-color);
}

.period-label {
  font-size: 14px;
  color: var(--text-primary);
}

.auto-renewal-section {
  margin-bottom: 20px;
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: 10px;
}

.checkbox-label {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  cursor: pointer;
}

.checkbox-input {
  width: 20px;
  height: 20px;
  margin-top: 2px;
  accent-color: var(--accent-color);
}

.checkbox-text {
  font-size: 14px;
  color: var(--text-primary);
  line-height: 1.4;
}

.checkbox-text small {
  display: block;
  color: var(--text-secondary);
  font-size: 12px;
  margin-top: 4px;
}

.error-message {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: var(--error-bg);
  color: var(--error-color);
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 14px;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 20px;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary {
  background: var(--accent-color);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--accent-hover);
}

.btn-secondary {
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn-secondary:hover {
  background: var(--bg-hover);
}

.btn-text {
  background: none;
  color: var(--accent-color);
  padding: 8px;
  font-size: 14px;
}

.btn-text:hover {
  text-decoration: underline;
}

.btn-large {
  padding: 16px 24px;
  font-size: 16px;
}

.btn-full {
  width: 100%;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Pending access state */
.pending-access {
  text-align: center;
  padding: 20px 0;
}

.pending-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto 20px;
  background: var(--accent-light);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pending-icon i {
  font-size: 40px;
  color: var(--accent-color);
}

.pending-access h4 {
  margin: 0 0 8px 0;
  font-size: 20px;
  color: var(--text-primary);
}

.pending-access p {
  margin: 0 0 12px 0;
  color: var(--text-secondary);
}

.pending-date {
  font-size: 24px;
  font-weight: 600;
  color: var(--accent-color);
  margin-bottom: 16px;
}

.pending-note {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 24px;
}

/* Active subscription state */
.active-subscription {
  text-align: center;
  padding: 20px 0;
}

.subscription-status {
  margin-bottom: 24px;
}

.success-icon {
  font-size: 64px;
  color: var(--success-color);
  margin-bottom: 16px;
}

.subscription-status h4 {
  margin: 0 0 8px 0;
  font-size: 20px;
  color: var(--text-primary);
}

.subscription-status p {
  margin: 0;
  color: var(--text-secondary);
}

.expiring-warning {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  background: var(--warning-bg);
  color: var(--warning-color);
  border-radius: 10px;
  margin-bottom: 20px;
  font-size: 14px;
}

.auto-renewal-status {
  margin-bottom: 24px;
}

.renewal-info {
  margin-bottom: 12px;
}

.renewal-label {
  color: var(--text-secondary);
  margin-right: 8px;
}

.renewal-value.enabled {
  color: var(--success-color);
  font-weight: 500;
}

.renewal-value.disabled {
  color: var(--text-secondary);
}

/* Extend section */
.extend-section {
  margin: 24px 0;
  padding: 20px;
  background: var(--bg-secondary);
  border-radius: 12px;
}

.extend-divider {
  position: relative;
  text-align: center;
  margin-bottom: 16px;
}

.extend-divider::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 1px;
  background: var(--border-color);
}

.extend-divider span {
  position: relative;
  background: var(--bg-secondary);
  padding: 0 12px;
  font-size: 13px;
  color: var(--text-secondary);
}

.extend-title {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.btn-primary .price {
  opacity: 0.9;
  font-weight: 500;
  margin-left: 4px;
}
</style>