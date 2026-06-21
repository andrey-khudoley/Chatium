<template>
  <div class="subscriptions-section">
    <div class="section-header">
      <h2>Мои подписки</h2>
      <p>Управление подписками на платные чаты</p>
    </div>

    <!-- Модалка продления подписки -->
    <Teleport to="body">
      <div v-if="showExtendModal" class="modal-overlay" @click.self="closeExtendModal">
        <div class="modal-content extend-modal">
          <div class="modal-header">
            <h3>
              {{
                extendingSubscription?.status === 'expired'
                  ? 'Возобновить подписку'
                  : 'Продлить подписку'
              }}
            </h3>
            <button class="btn-close" @click="closeExtendModal">
              <i class="fa-solid fa-times"></i>
            </button>
          </div>
          <div class="modal-body">
            <div v-if="extendingSubscription" class="extend-info">
              <div class="current-plan">
                <span class="plan-name">{{ extendingSubscription.plan?.name }}</span>
                <span v-if="extendingSubscription.status === 'expired'" class="expired-badge"
                  >Истекла</span
                >
                <span v-else class="active-badge"
                  >Действует до {{ formatDate(extendingSubscription.endDate) }}</span
                >
              </div>

              <!-- Выбор периода -->
              <div v-if="periodOptions.length > 0" class="period-section">
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

              <div v-if="extendError" class="error-message">
                <i class="fa-solid fa-circle-exclamation"></i>
                {{ extendError }}
              </div>

              <button
                class="btn btn-primary btn-full"
                :disabled="!selectedPeriod || extending"
                @click="confirmExtend"
              >
                <i v-if="extending" class="fa-solid fa-spinner fa-spin"></i>
                <span v-else>
                  {{ extendingSubscription?.status === 'expired' ? 'Возобновить' : 'Продлить' }}
                  <span v-if="extendingSubscription?.plan?.price" class="price">
                    за {{ formatPrice(extendingSubscription.plan.price) }}
                  </span>
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <div v-if="loading" class="loading-state">
      <i class="fa-solid fa-spinner fa-spin"></i>
      <p>Загрузка...</p>
    </div>

    <div v-else-if="subscriptions.length === 0" class="empty-subscriptions">
      <i class="fa-solid fa-crown"></i>
      <p>Нет активных подписок</p>
      <span>У вас пока нет подписок на платные чаты</span>
    </div>

    <div v-else class="subscriptions-list">
      <div
        v-for="sub in subscriptions"
        :key="sub.id"
        class="subscription-card"
        :class="{
          'expiring-soon': sub.isExpiringSoon,
          pending: sub.status === 'pending',
          expired: sub.status === 'expired'
        }"
      >
        <div class="subscription-header">
          <div class="plan-info">
            <div class="plan-avatar" :style="getPlanAvatarStyle(sub.plan)">
              <i class="fa-solid fa-crown"></i>
            </div>
            <div class="plan-details">
              <h4 class="plan-title">{{ sub.plan?.name || 'Подписка' }}</h4>
              <span class="chats-count">{{ sub.plan?.chats?.length || 0 }} чатов</span>
            </div>
          </div>
          <div class="subscription-status" :class="sub.status">
            <span v-if="sub.status === 'pending'">Ожидает</span>
            <span v-else-if="sub.status === 'expired'">Истекла</span>
            <span v-else-if="sub.isExpiringSoon">Истекает</span>
            <span v-else-if="sub.status === 'active'">Активна</span>
            <span v-else>Статус: {{ sub.status }}</span>
          </div>
        </div>

        <!-- Список чатов в подписке -->
        <div v-if="sub.plan?.chats && sub.plan.chats.length > 0" class="subscription-chats">
          <div class="chats-label">Доступные чаты:</div>
          <div class="chats-grid">
            <div
              v-for="chat in sub.plan.chats"
              :key="chat.feedId"
              class="chat-item"
              @click="openChat(chat.feedId)"
            >
              <div class="chat-item-avatar" :style="getChatAvatarStyle(chat)">
                <span v-if="!chat.avatarHash">{{ getChatInitials(chat) }}</span>
              </div>
              <span class="chat-item-name">{{ chat.title }}</span>
            </div>
          </div>
        </div>

        <div class="subscription-dates">
          <div class="date-row">
            <span class="date-label">Начало:</span>
            <span class="date-value">{{ formatDate(sub.startDate) }}</span>
          </div>
          <div class="date-row">
            <span class="date-label">Окончание:</span>
            <span class="date-value" :class="{ expiring: sub.isExpiringSoon }">
              {{ formatDate(sub.endDate) }}
            </span>
          </div>
        </div>

        <div class="subscription-footer">
          <div class="auto-renewal">
            <span class="renewal-label">Автопродление:</span>
            <span :class="['renewal-value', sub.autoRenewal ? 'enabled' : 'disabled']">
              {{ sub.autoRenewal ? 'Включено' : 'Отключено' }}
            </span>
          </div>

          <div class="subscription-actions">
            <!-- Кнопка продления для активных подписок -->
            <button
              v-if="sub.status === 'active'"
              class="btn btn-primary"
              @click="openExtendModal(sub)"
            >
              <i class="fa-solid fa-calendar-plus"></i>
              <span>Продлить</span>
            </button>
            <!-- Кнопка возобновления для истекших -->
            <button
              v-if="sub.status === 'expired'"
              class="btn btn-primary"
              @click="openExtendModal(sub)"
            >
              <i class="fa-solid fa-rotate"></i>
              <span>Возобновить</span>
            </button>
            <button
              v-if="sub.autoRenewal && sub.status === 'active'"
              class="btn btn-text"
              @click="cancelRenewal(sub)"
              :disabled="cancellingId === sub.id"
            >
              <i v-if="cancellingId === sub.id" class="fa-solid fa-spinner fa-spin"></i>
              <span v-else>Отключить автопродление</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Информация о законе -->
    <div class="legal-info">
      <i class="fa-solid fa-scale-balanced"></i>
      <p>
        Согласно законодательству, вы можете отменить автопродление подписки в любой момент. Доступ
        к чатам сохранится до окончания оплаченного периода.
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const subscriptions = ref([])
const loading = ref(false)
const cancellingId = ref(null)

// Для модалки продления
const showExtendModal = ref(false)
const extendingSubscription = ref(null)
const periodOptions = ref([])
const selectedPeriod = ref('')
const extending = ref(false)
const extendError = ref('')

onMounted(() => {
  loadSubscriptions()
})

async function openExtendModal(subscription) {
  extendingSubscription.value = subscription
  showExtendModal.value = true
  extendError.value = ''
  selectedPeriod.value = ''
  periodOptions.value = []

  // Загружаем опции периодов
  if (subscription.plan?.id) {
    try {
      const response = await fetch(
        `/projekt-chat/api/chat-subscription-plans~plans/${subscription.plan.id}/periods`
      ).then((r) => r.json())
      periodOptions.value = response || []
      if (periodOptions.value.length > 0) {
        selectedPeriod.value = periodOptions.value[0].value
      }
    } catch (e) {
      console.error('Failed to load period options:', e)
      extendError.value = 'Не удалось загрузить варианты периодов'
    }
  }
}

function closeExtendModal() {
  showExtendModal.value = false
  extendingSubscription.value = null
  periodOptions.value = []
  selectedPeriod.value = ''
  extendError.value = ''
}

async function confirmExtend() {
  if (!extendingSubscription.value || !selectedPeriod.value) return

  extending.value = true
  extendError.value = ''

  try {
    const response = await fetch(
      `/projekt-chat/api/chat-subscriptions~${extendingSubscription.value.id}/extend`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodValue: selectedPeriod.value
        })
      }
    ).then((r) => r.json())

    if (response.paymentLink) {
      // Перенаправляем на оплату
      window.location.href = response.paymentLink
    } else {
      closeExtendModal()
      await loadSubscriptions()
    }
  } catch (e) {
    console.error('Failed to extend subscription:', e)
    extendError.value = e.message || 'Ошибка при продлении подписки'
  } finally {
    extending.value = false
  }
}

function formatPrice(price) {
  if (!price) return ''
  const amount = price.amount || price
  const currency = price.currency || 'RUB'
  const symbol =
    currency === 'RUB' ? '₽' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency
  return `${amount} ${symbol}`
}

async function loadSubscriptions() {
  loading.value = true
  try {
    const response = await fetch('/projekt-chat/api/chat-subscriptions~my').then((r) => r.json())
    // Преобразуем строки дат в объекты Date
    subscriptions.value = (response || []).map((sub) => ({
      ...sub,
      startDate: sub.startDate ? new Date(sub.startDate) : null,
      endDate: sub.endDate ? new Date(sub.endDate) : null,
      status: sub.status?.toString()?.toLowerCase()?.trim() || 'unknown'
    }))
  } catch (e) {
    console.error('Failed to load subscriptions:', e)
  } finally {
    loading.value = false
  }
}

async function cancelRenewal(sub) {
  if (!confirm('Отключить автопродление подписки?')) return

  cancellingId.value = sub.id
  try {
    await fetch(`/projekt-chat/api/chat-subscriptions~${sub.id}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    })
    await loadSubscriptions()
  } catch (e) {
    console.error('Failed to cancel renewal:', e)
  } finally {
    cancellingId.value = null
  }
}

function openChat(feedId) {
  window.location.hash = `#/chat/${feedId}`
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

function getChatInitials(chat) {
  if (!chat?.title) return '?'
  return chat.title
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function getPlanAvatarStyle(plan) {
  const colors = [
    ['#667eea', '#764ba2'],
    ['#f093fb', '#f5576c'],
    ['#4facfe', '#00f2fe'],
    ['#43e97b', '#38f9d7'],
    ['#fa709a', '#fee140']
  ]
  const index = plan?.id?.charCodeAt(0) % colors.length || 0
  const [from, to] = colors[index]
  return {
    background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`
  }
}

function getChatAvatarStyle(chat) {
  if (chat?.avatarHash) {
    return { backgroundImage: `url(https://fs.chatium.ru/get/${chat.avatarHash})` }
  }
  return { background: generateGradient(chat?.feedId) }
}

function generateGradient(id) {
  const colors = [
    ['#667eea', '#764ba2'],
    ['#f093fb', '#f5576c'],
    ['#4facfe', '#00f2fe'],
    ['#43e97b', '#38f9d7'],
    ['#fa709a', '#fee140']
  ]
  const index =
    id?.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length || 0
  return `linear-gradient(135deg, ${colors[index][0]}, ${colors[index][1]})`
}
</script>

<style scoped>
.subscriptions-section {
  max-width: 600px;
  margin: 0 auto;
}

.section-header {
  margin-bottom: 24px;
}

.section-header h2 {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 8px 0;
}

.section-header p {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: var(--text-secondary);
  gap: 16px;
}

.loading-state i {
  font-size: 32px;
}

.empty-subscriptions {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: var(--text-secondary);
  text-align: center;
}

.empty-subscriptions i {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-subscriptions p {
  font-size: 18px;
  margin: 0 0 8px 0;
  color: var(--text-primary);
}

.empty-subscriptions span {
  font-size: 14px;
}

.subscriptions-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.subscription-card {
  background: var(--bg-primary);
  border-radius: 16px;
  padding: 20px;
  border: 1px solid var(--border-color);
  transition: all 0.2s;
}

.subscription-card:hover {
  border-color: var(--border-hover);
}

.subscription-card.expiring-soon {
  border-color: var(--warning-color);
  background: var(--warning-bg);
}

.subscription-card.pending {
  border-color: var(--info-color);
  background: var(--info-bg);
}

.subscription-card.expired {
  border-color: var(--danger-color);
  background: var(--danger-bg);
  opacity: 0.9;
}

.subscription-status.expired {
  background: var(--danger-bg);
  color: var(--danger-color);
}

.subscription-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 16px;
}

.plan-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.plan-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 20px;
  flex-shrink: 0;
}

.plan-details h4 {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.chats-count {
  font-size: 13px;
  color: var(--text-secondary);
}

.subscription-status {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.subscription-status.active {
  background: var(--success-bg);
  color: var(--success-color);
}

.subscription-status.pending {
  background: var(--info-bg);
  color: var(--info-color);
}

.subscription-status.expiring-soon {
  background: var(--warning-bg);
  color: var(--warning-color);
}

/* Chats in subscription */
.subscription-chats {
  margin-bottom: 16px;
  padding: 12px;
  background: var(--bg-secondary);
  border-radius: 12px;
}

.chats-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.chats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 8px;
}

.chat-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: var(--bg-primary);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.chat-item:hover {
  border-color: var(--accent-color);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.chat-item-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 11px;
  font-weight: 600;
  flex-shrink: 0;
}

.chat-item-name {
  font-size: 13px;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.subscription-dates {
  margin-bottom: 16px;
  padding: 12px;
  background: var(--bg-secondary);
  border-radius: 10px;
}

.date-row {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
}

.date-label {
  font-size: 13px;
  color: var(--text-secondary);
}

.date-value {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}

.date-value.expiring {
  color: var(--warning-color);
}

.subscription-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

.auto-renewal {
  font-size: 13px;
}

.renewal-label {
  color: var(--text-secondary);
  margin-right: 6px;
}

.renewal-value.enabled {
  color: var(--success-color);
  font-weight: 500;
}

.renewal-value.disabled {
  color: var(--text-secondary);
}

.subscription-actions {
  display: flex;
  gap: 8px;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--accent-color);
  color: white;
}

.btn-primary:hover {
  background: var(--accent-hover);
}

.btn-text {
  background: transparent;
  color: var(--text-secondary);
  padding: 8px;
}

.btn-text:hover {
  color: var(--danger-color);
  text-decoration: underline;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.legal-info {
  display: flex;
  gap: 12px;
  margin-top: 32px;
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: 12px;
  border-left: 3px solid var(--accent-color);
}

.legal-info i {
  font-size: 20px;
  color: var(--accent-color);
  flex-shrink: 0;
}

.legal-info p {
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
}

@media (max-width: 480px) {
  .subscription-footer {
    flex-direction: column;
    align-items: stretch;
  }

  .subscription-actions {
    flex-direction: column;
  }

  .btn {
    width: 100%;
  }

  .chats-grid {
    grid-template-columns: 1fr;
  }
}

/* Modal styles */
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
  background: var(--bg-primary);
  border-radius: 16px;
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
  border: 1px solid var(--border-color);
}

.extend-modal {
  max-width: 420px;
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

.extend-info {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.current-plan {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: 12px;
  flex-wrap: wrap;
}

.plan-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.expired-badge {
  padding: 4px 10px;
  background: var(--danger-bg);
  color: var(--danger-color);
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.active-badge {
  padding: 4px 10px;
  background: var(--success-bg);
  color: var(--success-color);
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.period-section h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.period-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
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

.error-message {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: var(--danger-bg);
  color: var(--danger-color);
  border-radius: 8px;
  font-size: 14px;
}

.btn-primary .price {
  opacity: 0.9;
  font-weight: 500;
}
</style>
