<template>
  <div class="subscription-required">
    <div class="subscription-content">
      <!-- Аватар чата -->
      <div class="chat-preview-avatar" :style="avatarStyle">
        <span v-if="!chat?.avatarHash">{{ getInitials(chat?.title) }}</span>
      </div>

      <h2 class="chat-title">{{ chat?.title }}</h2>
      <p class="chat-description">{{ chat?.description || 'Платный чат' }}</p>

      <div class="participants-badge">
        <i class="fas fa-users"></i>
        <span>{{ formatParticipants(chat?.participantsCount || 0) }}</span>
      </div>

      <div class="subscription-divider"></div>

      <!-- Статус подписки -->
      <div v-if="props.accessStatus === 'pending'" class="status-message pending">
        <i class="fas fa-clock"></i>
        <div>
          <strong>Подписка оформлена</strong>
          <p>Доступ откроется {{ subscriptionStartDate }}</p>
        </div>
      </div>

      <template v-else-if="props.accessStatus === 'expired'">
        <div class="status-message expired">
          <i class="fas fa-exclamation-circle"></i>
          <div>
            <strong>Подписка истекла</strong>
            <p>Срок действия вашей подписки закончился</p>
          </div>
        </div>

        <!-- Показываем тарифы для возобновления -->
        <h3 class="plans-title">Возобновить подписку</h3>

        <div v-if="loadingPlans" class="plans-loading">
          <i class="fas fa-spinner fa-spin"></i>
          <span>Загрузка тарифов...</span>
        </div>

        <div v-else-if="plans.length === 0" class="no-plans">
          <i class="fas fa-info-circle"></i>
          <span>В данный момент подписка недоступна</span>
        </div>

        <div v-else class="plans-list">
          <div
            v-for="plan in plans"
            :key="plan.id"
            :class="['plan-card', { selected: selectedPlan?.id === plan.id }]"
            @click="selectedPlan = plan"
          >
            <div class="plan-header">
              <span class="plan-name">{{ plan.name }}</span>
              <span class="plan-price">{{ formatPrice(plan.price) }}</span>
            </div>

            <div class="plan-duration">
              <i class="fas fa-calendar-alt"></i>
              <span>{{ formatDuration(plan) }}</span>
            </div>

            <div v-if="plan.allowAutoRenewal" class="plan-auto">
              <i class="fas fa-rotate"></i>
              <span>Возможно автопродление</span>
            </div>

            <!-- Список чатов в тарифе -->
            <div v-if="plan.chats && plan.chats.length > 0" class="plan-chats">
              <div class="plan-chats-label">
                <i class="fas fa-comments"></i>
                <span>Включает {{ plan.chats.length }} чатов:</span>
              </div>
              <div class="plan-chats-list">
                <span
                  v-for="chat in plan.chats.slice(0, 3)"
                  :key="chat.feedId"
                  class="plan-chat-tag"
                >
                  {{ chat.title }}
                </span>
                <span v-if="plan.chats.length > 3" class="plan-chat-more">
                  +{{ plan.chats.length - 3 }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Выбор периода (для календарных тарифов) -->
        <div v-if="selectedPlan && periodOptions.length > 0" class="period-selector">
          <label>Период доступа:</label>
          <select v-model="selectedPeriod">
            <option v-for="option in periodOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </div>

        <!-- Автопродление -->
        <div v-if="selectedPlan?.allowAutoRenewal" class="auto-renewal">
          <label class="checkbox-label">
            <input v-model="autoRenewal" type="checkbox">
            <span class="checkmark"></span>
            <span class="label-text">Автопродление подписки</span>
          </label>
        </div>

        <!-- Кнопка оплаты -->
        <button
          class="btn-subscribe"
          :disabled="!selectedPlan || subscribing"
          @click="subscribe"
        >
          <i v-if="subscribing" class="fas fa-spinner fa-spin"></i>
          <span v-else>
            Возобновить подписку
            <span v-if="selectedPlan" class="total-price">{{ formatPrice(selectedPlan.price) }}</span>
          </span>
        </button>
      </template>

      <template v-else-if="props.accessStatus === 'no_subscription'">
        <!-- Список тарифов -->
        <h3 class="plans-title">Доступные тарифы</h3>

        <div v-if="loadingPlans" class="plans-loading">
          <i class="fas fa-spinner fa-spin"></i>
          <span>Загрузка тарифов...</span>
        </div>

        <div v-else-if="plans.length === 0" class="no-plans">
          <i class="fas fa-info-circle"></i>
          <span>В данный момент подписка недоступна</span>
        </div>

        <div v-else class="plans-list">
          <div
            v-for="plan in plans"
            :key="plan.id"
            :class="['plan-card', { selected: selectedPlan?.id === plan.id }]"
            @click="selectedPlan = plan"
          >
            <div class="plan-header">
              <span class="plan-name">{{ plan.name }}</span>
              <span class="plan-price">{{ formatPrice(plan.price) }}</span>
            </div>

            <div class="plan-duration">
              <i class="fas fa-calendar-alt"></i>
              <span>{{ formatDuration(plan) }}</span>
            </div>

            <div v-if="plan.allowAutoRenewal" class="plan-auto">
              <i class="fas fa-rotate"></i>
              <span>Возможно автопродление</span>
            </div>

            <!-- Список чатов в тарифе -->
            <div v-if="plan.chats && plan.chats.length > 0" class="plan-chats">
              <div class="plan-chats-label">
                <i class="fas fa-comments"></i>
                <span>Включает {{ plan.chats.length }} чатов:</span>
              </div>
              <div class="plan-chats-list">
                <span
                  v-for="chat in plan.chats.slice(0, 3)"
                  :key="chat.feedId"
                  class="plan-chat-tag"
                >
                  {{ chat.title }}
                </span>
                <span v-if="plan.chats.length > 3" class="plan-chat-more">
                  +{{ plan.chats.length - 3 }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Выбор периода (для календарных тарифов) -->
        <div v-if="selectedPlan && periodOptions.length > 0" class="period-selector">
          <label>Период доступа:</label>
          <select v-model="selectedPeriod">
            <option v-for="option in periodOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </div>

        <!-- Автопродление -->
        <div v-if="selectedPlan?.allowAutoRenewal" class="auto-renewal">
          <label class="checkbox-label">
            <input v-model="autoRenewal" type="checkbox">
            <span class="checkmark"></span>
            <span class="label-text">Автопродление подписки</span>
          </label>
        </div>

        <!-- Кнопка оплаты -->
        <button
          class="btn-subscribe"
          :disabled="!selectedPlan || subscribing"
          @click="subscribe"
        >
          <i v-if="subscribing" class="fas fa-spinner fa-spin"></i>
          <span v-else>
            Оформить подписку
            <span v-if="selectedPlan" class="total-price">{{ formatPrice(selectedPlan.price) }}</span>
          </span>
        </button>

        <p class="subscribe-hint">
          После оплаты вы получите доступ ко всем чатам выбранного тарифа
        </p>
      </template>

      <!-- Сохраненные карты -->
      <div v-if="savedCards.length > 0 && props.accessStatus !== 'pending'" class="saved-cards">
        <p class="saved-cards-title">Сохраненные карты:</p>
        <div class="cards-list">
          <div
            v-for="card in savedCards"
            :key="card.id"
            :class="['card-item', { selected: selectedCard?.id === card.id }]"
            @click="selectedCard = card"
          >
            <i class="fas fa-credit-card"></i>
            <span>{{ card.displayName }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'

const props = defineProps({
  feedId: String,
  chat: Object,
  plans: Array,
  accessStatus: {
    type: String,
    default: 'no_subscription'
  },
  subscription: Object,
})

const emit = defineEmits(['subscribed', 'cancel'])

const chat = ref(props.chat || null)
const plans = ref(props.plans || [])
const loadingPlans = ref(false)
const selectedPlan = ref(null)
const selectedPeriod = ref(null)
const autoRenewal = ref(false)
const subscribing = ref(false)
const subscriptionStartDate = computed(() => {
  if (props.subscription?.startDate) {
    return new Date(props.subscription.startDate).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }
  return ''
})
const savedCards = ref([])
const selectedCard = ref(null)
const periodOptions = ref([])

const avatarStyle = computed(() => {
  if (!chat.value?.avatarHash) {
    const colors = [
      ['#667eea', '#764ba2'],
      ['#f093fb', '#f5576c'],
      ['#4facfe', '#00f2fe'],
      ['#43e97b', '#38f9d7'],
      ['#fa709a', '#fee140'],
    ]
    const index = (chat.value?.feedId?.charCodeAt(0) || 0) % colors.length
    const [from, to] = colors[index]
    return {
      background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`,
    }
  }
  return {
    background: `url(https://fs.chatium.ru/thumbnail/${chat.value.avatarHash}/s/200x) center/cover no-repeat`,
  }
})

onMounted(async () => {
  // Если данные не переданы через props - загружаем самостоятельно
  if (!chat.value) {
    await loadChatInfo()
  }
  if (!plans.value || plans.value.length === 0) {
    await loadPlans()
  }
  await loadSavedCards()
})

watch(selectedPlan, async (plan) => {
  if (plan) {
    await loadPeriodOptions(plan)
  }
})

async function loadChatInfo() {
  try {
    // Сначала пробуем получить публичную инфу, если не получится - используем данные из чек-апа
    const response = await fetch(`/tg/api/chats~${props.feedId}/public`).then(r => r.json())
    chat.value = response.chat
  } catch (err) {
    console.error('Failed to load chat info:', err)
    // Не показываем ошибку, просто оставляем chat null
    // Это может произойти если чат не существует или API недоступен
  }
}

async function loadPlans() {
  loadingPlans.value = true
  try {
    // Используем новый endpoint для получения тарифов по чату
    const response = await fetch(`/tg/api/chat-subscription-plans~by-chat/${props.feedId}/plans`).then(r => r.json())
    plans.value = response || []

    // Выбираем первый активный план по умолчанию
    if (plans.value.length > 0) {
      selectedPlan.value = plans.value[0]
    }
  } catch (err) {
    console.error('Failed to load plans:', err)
    plans.value = []
  } finally {
    loadingPlans.value = false
  }
}

async function loadPeriodOptions(plan) {
  if (!plan) return

  try {
    const response = await fetch(`/tg/api/chat-subscription-plans~plans/${plan.id}/periods`).then(r => r.json())
    periodOptions.value = response || []
    if (periodOptions.value.length > 0 && !selectedPeriod.value) {
      selectedPeriod.value = periodOptions.value[0].value
    }
  } catch (err) {
    console.error('Failed to load period options:', err)
    periodOptions.value = []
  }
}

async function loadSavedCards() {
  try {
    const response = await fetch('/tg/api/chat-subscriptions~cards').then(r => r.json())
    savedCards.value = response.cards || []
  } catch (err) {
    console.error('Failed to load saved cards:', err)
    savedCards.value = []
  }
}

async function subscribe() {
  if (!selectedPlan.value || subscribing.value) return

  subscribing.value = true
  try {
    const response = await fetch('/tg/api/chat-subscriptions~subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        planId: selectedPlan.value.id,
        periodValue: selectedPeriod.value,
        autoRenewal: autoRenewal.value,
      })
    }).then(r => r.json())

    if (response.paymentLink) {
      // Перенаправляем на страницу оплаты
      window.location.href = response.paymentLink
    } else {
      // Подписка активна сразу
      emit('subscribed')
    }
  } catch (err) {
    console.error('Failed to subscribe:', err)
    alert(err.message || 'Не удалось оформить подписку')
  } finally {
    subscribing.value = false
  }
}

function getInitials(title) {
  if (!title) return '?'
  return title.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()
}

function formatParticipants(count) {
  if (count === 1) return '1 участник'
  if (count < 5) return `${count} участника`
  return `${count} участников`
}

function formatPrice(price) {
  if (!price) return ''

  let amount, currency

  if (typeof price === 'object') {
    if (Array.isArray(price)) {
      amount = price[0]
      currency = price[1]
    } else {
      amount = price.amount
      currency = price.currency
    }
  }

  if (amount === undefined || currency === undefined) {
    return ''
  }

  const currencySymbols = {
    'RUB': '₽',
    'USD': '$',
    'EUR': '€',
  }

  const symbol = currencySymbols[currency] || currency
  return `${amount} ${symbol}`
}

function formatDuration(plan) {
  const typeLabels = {
    'days': { one: 'день', few: 'дня', many: 'дней' },
    'months': { one: 'месяц', few: 'месяца', many: 'месяцев' },
    'years': { one: 'год', few: 'года', many: 'лет' },
  }

  const labels = typeLabels[plan.durationType] || typeLabels.days
  const value = plan.durationValue

  let label
  if (value === 1) label = labels.one
  else if (value >= 2 && value <= 4) label = labels.few
  else label = labels.many

  return `${value} ${label}`
}
</script>

<style scoped>
.subscription-required {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100%;
  padding: 20px;
  background: var(--bg-primary);
}

.subscription-content {
  max-width: 480px;
  width: 100%;
  text-align: center;
  padding: 32px;
  background: var(--bg-secondary);
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.chat-preview-avatar {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  margin: 0 auto 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  font-weight: 600;
  color: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.chat-title {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 8px;
}

.chat-description {
  font-size: 15px;
  color: var(--text-secondary);
  margin: 0 0 16px;
  line-height: 1.5;
}

.participants-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  background: var(--bg-tertiary);
  border-radius: 20px;
  font-size: 14px;
  color: var(--text-secondary);
}

.subscription-divider {
  height: 1px;
  background: var(--border-color);
  margin: 24px 0;
}

.status-message {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 20px;
  border-radius: 12px;
  text-align: left;
  margin-bottom: 20px;
}

.status-message.pending {
  background: rgba(0, 128, 105, 0.1);
  color: var(--primary-color);
}

.status-message.expired {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.status-message i {
  font-size: 24px;
  margin-top: 2px;
}

.status-message strong {
  display: block;
  font-size: 16px;
  margin-bottom: 4px;
}

.status-message p {
  margin: 0;
  font-size: 14px;
  opacity: 0.9;
}

.plans-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 16px;
}

.plans-loading,
.no-plans {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 32px;
  color: var(--text-secondary);
}

.plans-loading i {
  font-size: 24px;
}

.no-plans i {
  font-size: 32px;
  color: var(--text-muted);
}

.plans-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

.plan-card {
  padding: 16px;
  background: var(--bg-primary);
  border: 2px solid var(--border-color);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}

.plan-card:hover {
  border-color: var(--primary-color);
}

.plan-card.selected {
  border-color: var(--primary-color);
  background: rgba(0, 128, 105, 0.05);
}

.plan-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.plan-name {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 16px;
}

.plan-price {
  font-weight: 700;
  color: var(--primary-color);
  font-size: 18px;
}

.plan-duration,
.plan-auto {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.plan-auto {
  color: var(--primary-color);
}

/* Plan chats */
.plan-chats {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border-color);
}

.plan-chats-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.plan-chats-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.plan-chat-tag {
  padding: 4px 10px;
  background: var(--bg-secondary);
  border-radius: 12px;
  font-size: 12px;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 120px;
}

.plan-chat-more {
  padding: 4px 10px;
  background: var(--accent-light);
  border-radius: 12px;
  font-size: 12px;
  color: var(--accent-color);
  font-weight: 500;
}

.period-selector {
  margin-bottom: 16px;
  text-align: left;
}

.period-selector label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.period-selector select {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 14px;
  cursor: pointer;
}

.auto-renewal {
  margin-bottom: 20px;
  text-align: left;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  font-size: 14px;
  color: var(--text-primary);
}

.checkbox-label input {
  display: none;
}

.checkmark {
  width: 20px;
  height: 20px;
  border: 2px solid var(--border-color);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.checkbox-label input:checked + .checkmark {
  background: var(--primary-color);
  border-color: var(--primary-color);
}

.checkbox-label input:checked + .checkmark::after {
  content: '✓';
  color: white;
  font-size: 12px;
}

.btn-subscribe {
  width: 100%;
  padding: 16px 24px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn-subscribe:hover:not(:disabled) {
  background: var(--primary-hover);
  transform: translateY(-1px);
}

.btn-subscribe:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.total-price {
  opacity: 0.9;
  font-weight: 500;
}

.subscribe-hint {
  margin-top: 12px;
  font-size: 13px;
  color: var(--text-secondary);
}

.saved-cards {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--border-color);
  text-align: left;
}

.saved-cards-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
  margin: 0 0 12px;
}

.cards-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.card-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--bg-primary);
  border: 2px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
}

.card-item:hover {
  border-color: var(--primary-color);
}

.card-item.selected {
  border-color: var(--primary-color);
  background: rgba(0, 128, 105, 0.05);
}

.card-item i {
  color: var(--text-secondary);
}
</style>