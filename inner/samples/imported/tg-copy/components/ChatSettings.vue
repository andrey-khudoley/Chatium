<template>
  <div class="chat-settings">
    <!-- Header -->
    <div class="settings-header-bar">
      <button @click="$emit('back')" class="btn-back">
        <i class="fas fa-arrow-left"></i>
      </button>
      <h2 class="settings-title">Настройки чатов</h2>
      <div class="header-spacer"></div>
    </div>

    <!-- Tabs -->
    <div class="settings-tabs">
      <button 
        v-for="tab in availableTabs" 
        :key="tab.id"
        @click="activeTab = tab.id"
        :class="['tab-btn', { active: activeTab === tab.id }]"
      >
        <i :class="tab.icon"></i>
        <span>{{ tab.label }}</span>
      </button>
    </div>

    <!-- Content -->
    <div class="settings-content">
      <!-- My Subscriptions Tab -->
      <div v-if="activeTab === 'subscriptions'" class="tab-content">
        <div class="content-header">
          <h3>Мои подписки</h3>
          <p class="content-description">Управление вашими активными подписками на чаты</p>
        </div>
        
        <div v-if="loading" class="loading-state">
          <i class="fas fa-spinner fa-spin"></i>
          <span>Загрузка...</span>
        </div>
        
        <div v-else-if="mySubscriptions.length === 0" class="empty-state">
          <i class="fas fa-crown"></i>
          <p>У вас нет активных подписок</p>
          <span class="empty-hint">Подписки на платные чаты будут отображаться здесь</span>
        </div>
        
        <div v-else class="subscriptions-list">
          <div 
            v-for="sub in mySubscriptions" 
            :key="sub.id" 
            class="subscription-card"
            :class="{ 'expired': isExpired(sub), 'expiring-soon': isExpiringSoon(sub) }"
          >
            <div class="sub-header">
              <div class="sub-info">
                <h4 class="sub-plan-name">{{ sub.plan?.name || 'Подписка' }}</h4>
                <span class="sub-status" :class="sub.status">
                  {{ getStatusLabel(sub) }}
                </span>
              </div>
              <div class="sub-price">
                <span class="price-amount">{{ formatPrice(sub.plan?.price) }}</span>
                <span class="price-period">/{{ getPeriodLabel(sub.plan) }}</span>
              </div>
            </div>
            
            <div class="sub-chats">
              <div class="chats-label">
                <i class="fas fa-comments"></i>
                Чаты в подписке ({{ sub.plan?.chats?.length || 0 }}):
              </div>
              <div class="chats-list-compact">
                <span 
                  v-for="chat in sub.plan?.chats?.slice(0, 3)" 
                  :key="chat.feedId"
                  class="chat-tag clickable"
                  @click="openChat(chat.feedId)"
                >
                  {{ chat.title || 'Чат' }}
                </span>
                <span v-if="(sub.plan?.chats?.length || 0) > 3" class="chat-tag more">
                  +{{ sub.plan.chats.length - 3 }}
                </span>
              </div>
            </div>
            
            <div class="sub-footer">
              <div class="sub-dates">
                <div class="date-row">
                  <i class="fas fa-play-circle"></i>
                  <span>Начало: {{ formatDate(sub.startDate) }}</span>
                </div>
                <div class="date-row" v-if="sub.endDate">
                  <i class="fas fa-stop-circle"></i>
                  <span>Окончание: {{ formatDate(sub.endDate) }}</span>
                </div>
                <div v-if="sub.autoRenew && sub.status === 'active'" class="auto-renew-badge">
                  <i class="fas fa-rotate"></i>
                  Автопродление включено
                </div>
              </div>
              
              <div class="sub-actions">
                <button 
                  v-if="sub.status === 'active' && sub.autoRenew"
                  @click="cancelSubscription(sub)"
                  class="btn btn-outline-danger btn-sm"
                  :disabled="cancellingId === sub.id"
                >
                  <i v-if="cancellingId === sub.id" class="fas fa-spinner fa-spin"></i>
                  <span v-else>Отменить автопродление</span>
                </button>
                <button 
                  v-else-if="sub.status === 'active' && !sub.autoRenew"
                  @click="renewSubscription(sub)"
                  class="btn btn-primary btn-sm"
                  :disabled="renewingId === sub.id"
                >
                  <i v-if="renewingId === sub.id" class="fas fa-spinner fa-spin"></i>
                  <span v-else>Продлить</span>
                </button>
                <button 
                  v-else-if="sub.status === 'cancelled' || sub.status === 'expired'"
                  @click="renewSubscription(sub)"
                  class="btn btn-primary btn-sm"
                  :disabled="renewingId === sub.id"
                >
                  <i v-if="renewingId === sub.id" class="fas fa-spinner fa-spin"></i>
                  <span v-else>Возобновить</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Subscription Plans Tab (Admin only) -->
      <div v-if="activeTab === 'plans'" class="tab-content">
        <div class="content-header">
          <h3>Тарифы подписок</h3>
          <p class="content-description">Управление тарифами для платных чатов</p>
        </div>
        
        <SubscriptionPlansSettings
          :feed-id="null"
          :is-paid="true"
          :is-owner-or-admin="true"
          :can-manage="true"
          mode="global"
          @plans-updated="loadPlans"
        />
      </div>

      <!-- Available Plans Tab -->
      <div v-if="activeTab === 'available'" class="tab-content">
        <div class="content-header">
          <h3>Доступные тарифы</h3>
          <p class="content-description">Все доступные тарифы подписок на чаты</p>
        </div>
        
        <div v-if="loadingPlans" class="loading-state">
          <i class="fas fa-spinner fa-spin"></i>
          <span>Загрузка...</span>
        </div>
        
        <div v-else-if="allPlans.length === 0" class="empty-state">
          <i class="fas fa-tag"></i>
          <p>Нет доступных тарифов</p>
          <span class="empty-hint">В данный момент нет доступных тарифов подписок</span>
        </div>
        
        <div v-else class="available-plans-list">
          <div 
            v-for="plan in allPlans" 
            :key="plan.id" 
            class="plan-card"
            :class="{ 'has-subscription': hasSubscriptionToPlan(plan.id) }"
          >
            <div class="plan-header">
              <h4 class="plan-name">{{ plan.name }}</h4>
              <div class="plan-price">
                <span class="price-amount">{{ formatPrice(plan.price) }}</span>
                <span class="price-period">/{{ getPeriodLabel(plan) }}</span>
              </div>
            </div>
            
            <div v-if="plan.description" class="plan-description">
              {{ plan.description }}
            </div>
            
            <div class="plan-chats">
              <div class="chats-label">
                <i class="fas fa-comments"></i>
                Включает чаты ({{ plan.chatIds?.length || 0 }}):
              </div>
              <div class="chats-list-compact">
                <span 
                  v-for="chatId in plan.chatIds?.slice(0, 5)" 
                  :key="chatId"
                  class="chat-tag clickable"
                  @click="openChat(chatId)"
                >
                  {{ getChatName(chatId) }}
                </span>
                <span v-if="(plan.chatIds?.length || 0) > 5" class="chat-tag more">
                  +{{ plan.chatIds.length - 5 }}
                </span>
              </div>
            </div>
            
            <div class="plan-actions">
              <button 
                v-if="hasSubscriptionToPlan(plan.id)"
                class="btn btn-success btn-sm"
                disabled
              >
                <i class="fas fa-check"></i>
                Оформлено
              </button>
              <button 
                v-else
                @click="subscribeToPlan(plan)"
                class="btn btn-primary btn-sm"
                :disabled="subscribingPlanId === plan.id"
              >
                <i v-if="subscribingPlanId === plan.id" class="fas fa-spinner fa-spin"></i>
                <span v-else>Оформить подписку</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Agents Tab (Admin only) -->
      <div v-if="activeTab === 'agents'" class="tab-content">
        <AgentsSettings />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import SubscriptionPlansSettings from './SubscriptionPlansSettings.vue'
import AgentsSettings from './AgentsSettings.vue'
import { apiChatSubscriptionsMyRoute, apiChatSubscriptionCancelRoute, apiChatSubscriptionExtendRoute } from '../api/chat-subscriptions'
import { apiSubscriptionPlansListRoute, apiSubscriptionPlansAllRoute } from '../api/chat-subscription-plans'

const props = defineProps({
  user: Object,
  chats: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['back', 'select-chat'])

const activeTab = ref('subscriptions')
const loading = ref(false)
const loadingPlans = ref(false)
const mySubscriptions = ref([])
const allPlans = ref([])
const cancellingId = ref(null)
const renewingId = ref(null)
const subscribingPlanId = ref(null)

const isAdmin = computed(() => {
  return props.user?.accountRole === 'Admin' || props.user?.accountRole === 'Owner'
})

const tabs = [
  { id: 'subscriptions', label: 'Мои подписки', icon: 'fas fa-crown' },
  { id: 'available', label: 'Доступные тарифы', icon: 'fas fa-tags' },
  { id: 'plans', label: 'Управление тарифами', icon: 'fas fa-cog' },
  { id: 'agents', label: 'Агенты', icon: 'fas fa-robot' },
]

const availableTabs = computed(() => {
  return tabs.filter(tab => {
    if (tab.id === 'plans') return isAdmin.value
    if (tab.id === 'agents') return isAdmin.value
    return true
  })
})

function formatPrice(price) {
  if (!price) return '0 ₽'
  if (typeof price === 'object') {
    const amount = price.amount || 0
    const currency = price.currency || 'RUB'
    const symbol = currency === 'RUB' ? '₽' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency
    return `${amount} ${symbol}`
  }
  if (Array.isArray(price)) {
    const [amount, currency] = price
    const symbol = currency === 'RUB' ? '₽' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency
    return `${amount} ${symbol}`
  }
  return `${price} ₽`
}

function getPeriodLabel(plan) {
  if (!plan) return ''
  const labels = {
    'day': 'день',
    'week': 'неделю',
    'month': 'мес.',
    'quarter': 'квартал',
    'year': 'год',
  }
  return labels[plan.period] || plan.period
}

function getStatusLabel(sub) {
  const labels = {
    'active': 'Активна',
    'cancelled': 'Отменена',
    'expired': 'Истекла',
    'pending': 'Ожидает оплаты',
  }
  return labels[sub.status] || sub.status
}

function isExpired(sub) {
  if (!sub.endDate) return false
  return new Date(sub.endDate) < new Date()
}

function isExpiringSoon(sub) {
  if (!sub.endDate || sub.status !== 'active') return false
  const daysUntilExpiry = Math.ceil((new Date(sub.endDate) - new Date()) / (1000 * 60 * 60 * 24))
  return daysUntilExpiry <= 3 && daysUntilExpiry > 0
}

function formatDate(date) {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function getChatName(chatId) {
  const chat = props.chats.find(c => c.feedId === chatId || c.id === chatId)
  return chat?.title || chat?.displayTitle || 'Чат'
}

function hasSubscriptionToPlan(planId) {
  return mySubscriptions.value.some(s => {
    const subPlanId = typeof s.planId === 'object' ? s.planId.id : s.planId
    return subPlanId === planId && (s.status === 'active' || s.status === 'pending')
  })
}

function openChat(chatId) {
  emit('select-chat', chatId)
}

async function loadSubscriptions() {
  loading.value = true
  try {
    const response = await apiChatSubscriptionsMyRoute.run(ctx)
    // API возвращает массив напрямую
    mySubscriptions.value = Array.isArray(response) ? response : []
    console.log('Loaded subscriptions:', mySubscriptions.value)
  } catch (error) {
    console.error('Ошибка загрузки подписок:', error)
  } finally {
    loading.value = false
  }
}

async function loadPlans() {
  loadingPlans.value = true
  try {
    // Для админов загружаем все тарифы, для обычных пользователей - только активные
    const response = isAdmin.value 
      ? await apiSubscriptionPlansAllRoute.run(ctx)
      : await apiSubscriptionPlansListRoute.run(ctx)
    allPlans.value = response.plans || []
    console.log('Loaded plans:', allPlans.value)
  } catch (error) {
    console.error('Ошибка загрузки тарифов:', error)
  } finally {
    loadingPlans.value = false
  }
}

async function cancelSubscription(sub) {
  if (!confirm('Отменить автопродление подписки? Доступ сохранится до окончания оплаченного периода.')) {
    return
  }
  
  cancellingId.value = sub.id
  try {
    await apiChatSubscriptionCancelRoute({ subscriptionId: sub.id }).run(ctx, {})
    await loadSubscriptions()
  } catch (error) {
    console.error('Ошибка отмены подписки:', error)
    alert('Не удалось отменить подписку')
  } finally {
    cancellingId.value = null
  }
}

async function renewSubscription(sub) {
  renewingId.value = sub.id
  try {
    // Получаем тариф
    const planId = typeof sub.planId === 'object' ? sub.planId.id : sub.planId
    const plan = allPlans.value.find(p => p.id === planId)
    
    if (!plan) {
      alert('Тариф не найден')
      return
    }
    
    // Генерируем доступные периоды
    const { generatePeriodOptions } = await import('../shared/subscription-periods')
    const periodOptions = generatePeriodOptions(
      plan.durationType,
      plan.durationValue,
      plan.calendarPeriod,
      plan.specificPeriodStart || undefined
    )
    
    if (periodOptions.length === 0) {
      alert('Нет доступных периодов для продления')
      return
    }
    
    // Используем первый доступный период
    const selectedPeriod = periodOptions[0]
    
    // Используем API продления существующей подписки
    const result = await apiChatSubscriptionExtendRoute({ subscriptionId: sub.id }).run(ctx, {
      periodValue: selectedPeriod.value,
    })
    
    if (result.paymentLink) {
      window.open(result.paymentLink, '_blank')
    }
    
    await loadSubscriptions()
  } catch (error) {
    console.error('Ошибка продления подписки:', error)
    alert('Не удалось продлить подписку')
  } finally {
    renewingId.value = null
  }
}

async function subscribeToPlan(plan) {
  subscribingPlanId.value = plan.id
  try {
    // Генерируем доступные периоды
    const { generatePeriodOptions } = await import('../shared/subscription-periods')
    const periodOptions = generatePeriodOptions(
      plan.durationType,
      plan.durationValue,
      plan.calendarPeriod,
      plan.specificPeriodStart || undefined
    )
    
    if (periodOptions.length === 0) {
      alert('Нет доступных периодов для подписки')
      return
    }
    
    // Используем первый доступный период
    const selectedPeriod = periodOptions[0]
    
    const result = await apiChatSubscriptionCreateRoute.run(ctx, {
      planId: plan.id,
      periodValue: selectedPeriod.value,
      autoRenewal: true,
    })
    
    if (result.paymentLink) {
      window.open(result.paymentLink, '_blank')
    }
    
    await loadSubscriptions()
    // Switch to subscriptions tab to show new subscription
    activeTab.value = 'subscriptions'
  } catch (error) {
    console.error('Ошибка оформления подписки:', error)
    alert('Не удалось оформить подписку: ' + (error.message || 'Неизвестная ошибка'))
  } finally {
    subscribingPlanId.value = null
  }
}

onMounted(() => {
  loadSubscriptions()
  loadPlans()
})
</script>

<style scoped>
.chat-settings {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-primary);
}

.settings-header-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
}

.btn-back {
  width: 40px;
  height: 40px;
  border: none;
  background: transparent;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  font-size: 18px;
  transition: all 0.2s;
}

.btn-back:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.settings-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.header-spacer {
  width: 40px;
}

.settings-tabs {
  display: flex;
  gap: 8px;
  padding: 12px 20px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  overflow-x: auto;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s;
  white-space: nowrap;
}

.tab-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.tab-btn.active {
  background: var(--accent-primary);
  color: white;
}

.tab-btn i {
  font-size: 14px;
}

.settings-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.tab-content {
  max-width: 900px;
  margin: 0 auto;
}

.content-header {
  margin-bottom: 24px;
}

.content-header h3 {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 8px 0;
}

.content-description {
  color: var(--text-secondary);
  font-size: 14px;
  margin: 0;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: var(--text-muted);
  gap: 12px;
}

.loading-state i {
  font-size: 32px;
  color: var(--accent-primary);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: var(--text-muted);
  text-align: center;
}

.empty-state i {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state p {
  font-size: 16px;
  margin: 0 0 8px 0;
  color: var(--text-primary);
}

.empty-hint {
  font-size: 14px;
}

/* Subscription Cards */
.subscriptions-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.subscription-card {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 20px;
  border: 2px solid transparent;
  transition: all 0.2s;
}

.subscription-card:hover {
  border-color: var(--accent-primary);
}

.subscription-card.expired {
  opacity: 0.7;
  border-color: var(--danger-color);
}

.subscription-card.expiring-soon {
  border-color: var(--warning-color);
}

.sub-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.sub-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.sub-plan-name {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.sub-status {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  width: fit-content;
}

.sub-status.active {
  background: rgba(0, 128, 105, 0.1);
  color: var(--accent-primary);
}

.sub-status.cancelled {
  background: rgba(239, 68, 68, 0.1);
  color: var(--danger-color);
}

.sub-status.expired {
  background: rgba(107, 114, 128, 0.1);
  color: var(--text-muted);
}

.sub-price {
  text-align: right;
}

.price-amount {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
}

.price-period {
  font-size: 14px;
  color: var(--text-secondary);
}

.sub-chats {
  margin-bottom: 16px;
  padding: 12px;
  background: var(--bg-primary);
  border-radius: 8px;
}

.chats-label {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.chats-list-compact {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chat-tag {
  padding: 4px 10px;
  background: var(--accent-light);
  color: var(--accent-primary);
  border-radius: 12px;
  font-size: 13px;
  font-weight: 500;
}

.chat-tag.clickable {
  cursor: pointer;
  transition: all 0.2s;
}

.chat-tag.clickable:hover {
  background: var(--accent-primary);
  color: white;
}

.chat-tag.more {
  background: var(--bg-hover);
  color: var(--text-secondary);
}

.sub-footer {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 12px;
}

.sub-dates {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.date-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-secondary);
}

.date-row i {
  font-size: 12px;
  width: 14px;
}

.auto-renew-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  margin-top: 4px;
  width: fit-content;
}

.sub-actions {
  display: flex;
  gap: 8px;
}

/* Plan Cards */
.available-plans-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.plan-card {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 20px;
  border: 2px solid transparent;
  transition: all 0.2s;
}

.plan-card:hover {
  border-color: var(--accent-primary);
}

.plan-card.has-subscription {
  border-color: #10b981;
  background: rgba(16, 185, 129, 0.05);
}

.plan-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.plan-name {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.plan-description {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 16px;
  line-height: 1.5;
}

.plan-chats {
  margin-bottom: 16px;
  padding: 12px;
  background: var(--bg-primary);
  border-radius: 8px;
}

.plan-actions {
  display: flex;
  justify-content: flex-end;
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--accent-primary);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--accent-hover);
}

.btn-success {
  background: #10b981;
  color: white;
}

.btn-outline-danger {
  background: transparent;
  color: var(--danger-color);
  border: 1px solid var(--danger-color);
}

.btn-outline-danger:hover:not(:disabled) {
  background: var(--danger-color);
  color: white;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 13px;
}

/* Responsive */
@media (max-width: 768px) {
  .settings-header-bar {
    padding: 12px 16px;
  }
  
  .settings-tabs {
    padding: 8px 12px;
  }
  
  .tab-btn {
    padding: 8px 12px;
    font-size: 13px;
  }
  
  .tab-btn span {
    display: none;
  }
  
  .settings-content {
    padding: 16px;
  }
  
  .sub-header {
    flex-direction: column;
    gap: 12px;
  }
  
  .sub-price {
    text-align: left;
  }
  
  .sub-footer {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .plan-header {
    flex-direction: column;
    gap: 8px;
  }
}
</style>