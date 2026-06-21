<template>
  <div class="modal-overlay" @click="$emit('close')">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h2 class="modal-title">Пригласить в чат</h2>
        <button @click="$emit('close')" class="btn-icon">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <!-- Табы выбора способа -->
      <div class="invite-tabs">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="activeTab = tab.id"
          :class="['tab-btn', { active: activeTab === tab.id }]"
        >
          <i :class="tab.icon"></i>
          {{ tab.label }}
        </button>
      </div>

      <!-- Поиск по username -->
      <div v-if="activeTab === 'username'" class="tab-content">
        <div class="form-group">
          <label>Имя пользователя</label>
          <div class="input-with-prefix">
            <span class="prefix">@</span>
            <input
              v-model="username"
              type="text"
              placeholder="username"
              @keyup.enter="searchUser"
            />
          </div>
        </div>
        <button @click="searchUser" class="btn-primary" :disabled="!username || searching">
          <i class="fas fa-search"></i>
          Найти
        </button>
      </div>

      <!-- Поиск по email -->
      <div v-if="activeTab === 'email'" class="tab-content">
        <div class="form-group">
          <label>Email адрес</label>
          <input
            v-model="email"
            type="email"
            placeholder="user@example.com"
            @keyup.enter="searchUser"
          />
        </div>
        <button @click="searchUser" class="btn-primary" :disabled="!email || searching">
          <i class="fas fa-search"></i>
          Найти
        </button>
      </div>

      <!-- Поиск по телефону -->
      <div v-if="activeTab === 'phone'" class="tab-content">
        <div class="form-group">
          <label>Номер телефона</label>
          <input
            v-model="phone"
            type="tel"
            placeholder="+7 900 123 45 67"
            @keyup.enter="searchUser"
          />
        </div>
        <button @click="searchUser" class="btn-primary" :disabled="!phone || searching">
          <i class="fas fa-search"></i>
          Найти
        </button>
      </div>

      <!-- Инвайт-ссылка -->
      <div v-if="activeTab === 'link'" class="tab-content">
        <p class="hint">Создайте ссылку-приглашение, которую можно отправить любому человеку</p>
        <div class="link-actions">
          <button @click="createInviteLink(false)" class="btn-primary" :disabled="creatingLink">
            <i class="fas fa-link"></i>
            {{ inviteLink ? 'Показать ссылку' : 'Создать ссылку' }}
          </button>
          <button v-if="inviteLink" @click="createInviteLink(true)" class="btn-secondary" :disabled="creatingLink">
            <i class="fas fa-sync-alt"></i>
            Обновить ссылку
          </button>
        </div>

        <div v-if="inviteLink" class="link-result">
          <div class="link-box">
            <input
              ref="linkInput"
              type="text"
              :value="inviteLink"
              readonly
            />
            <button @click="copyLink" class="btn-copy" title="Копировать">
              <i :class="copied ? 'fas fa-check' : 'fas fa-copy'"></i>
            </button>
          </div>
          <p class="link-hint">Ссылка действительна 7 дней</p>
        </div>
      </div>

      <!-- Результат поиска -->
      <div v-if="foundUser" class="search-result">
        <div class="user-card">
          <div class="user-avatar">
            <img v-if="foundUser.avatar" :src="foundUser.avatar" alt="" />
            <span v-else>{{ getInitials(foundUser.displayName) }}</span>
          </div>
          <div class="user-info">
            <div class="user-name">{{ foundUser.displayName }}</div>
            <div v-if="foundUser.username" class="user-meta">@{{ foundUser.username }}</div>
            <div v-if="foundUser.email" class="user-meta">{{ foundUser.email }}</div>
            <div v-if="foundUser.phone" class="user-meta">{{ foundUser.phone }}</div>
          </div>
        </div>

        <!-- Кнопки действий -->
        <div class="action-buttons">
          <button @click="sendInvite" class="btn-primary" :disabled="sending">
            <i class="fas fa-paper-plane"></i>
            {{ sending ? 'Отправка...' : 'Пригласить в чат' }}
          </button>

          <!-- Опция предоставления подписки для платных чатов (только для админов) -->
          <template v-if="isAdmin && availablePlans.length > 0">
            <div class="divider">
              <span>или</span>
            </div>

            <button
              @click="showGrantSubscription = !showGrantSubscription"
              class="btn-secondary btn-grant"
              :class="{ active: showGrantSubscription }"
            >
              <i class="fas fa-gift"></i>
              {{ showGrantSubscription ? 'Скрыть' : 'Предоставить подписку' }}
            </button>

            <!-- Форма предоставления подписки -->
            <div v-if="showGrantSubscription" class="grant-subscription-form">
              <div class="form-group">
                <label>Выберите тариф</label>
                <select v-model="selectedPlanId" class="plan-select">
                  <option value="">-- Выберите тариф --</option>
                  <option v-for="plan in availablePlans" :key="plan.id" :value="plan.id">
                    {{ plan.name }} — {{ formatPrice(plan.price) }}
                    ({{ formatDuration(plan) }})
                  </option>
                </select>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Дата начала</label>
                  <input
                    v-model="subscriptionStartDate"
                    type="date"
                    :min="today"
                  />
                </div>
                <div class="form-group">
                  <label>Дата окончания</label>
                  <input
                    v-model="subscriptionEndDate"
                    type="date"
                    :min="subscriptionStartDate || today"
                  />
                </div>
              </div>

              <div class="form-group">
                <label>Примечание (опционально)</label>
                <input
                  v-model="subscriptionNote"
                  type="text"
                  placeholder="Например: Подарок за активность"
                />
              </div>

              <button
                @click="grantSubscription"
                class="btn-primary btn-grant-submit"
                :disabled="!selectedPlanId || grantingSubscription"
              >
                <i class="fas fa-check"></i>
                {{ grantingSubscription ? 'Предоставление...' : 'Предоставить подписку' }}
              </button>

              <p class="grant-hint">
                <i class="fas fa-info-circle"></i>
                Пользователь получит доступ ко всем чатам выбранного тарифа без оплаты
              </p>
            </div>
          </template>
        </div>
      </div>

      <!-- Ошибка поиска -->
      <div v-if="searchError" class="search-error">
        <i class="fas fa-exclamation-circle"></i>
        {{ searchError }}
      </div>

      <!-- Успех -->
      <div v-if="successMessage" class="success-message">
        <i class="fas fa-check-circle"></i>
        {{ successMessage }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { apiUsersFindByIdentityRoute } from '../api/users'
import { apiInvitesCreateRoute, apiInvitesGetLinkRoute } from '../api/invites'
import { apiAdminGrantSubscriptionRoute, apiAdminGetChatPlansRoute } from '../api/admin-subscriptions'

const props = defineProps({
  chatId: String,
  isAdmin: Boolean,
})

const emit = defineEmits(['close', 'invited'])

const tabs = [
  { id: 'username', label: 'Username', icon: 'fas fa-at' },
  { id: 'email', label: 'Email', icon: 'fas fa-envelope' },
  { id: 'phone', label: 'Телефон', icon: 'fas fa-phone' },
  { id: 'link', label: 'Ссылка', icon: 'fas fa-link' },
]

const activeTab = ref('username')
const username = ref('')
const email = ref('')
const phone = ref('')
const searching = ref(false)
const sending = ref(false)
const creatingLink = ref(false)
const foundUser = ref(null)
const searchError = ref('')
const successMessage = ref('')
const inviteLink = ref('')
const copied = ref(false)
const linkInput = ref(null)

// Для предоставления подписки
const showGrantSubscription = ref(false)
const availablePlans = ref([])
const selectedPlanId = ref('')
const subscriptionStartDate = ref('')
const subscriptionEndDate = ref('')
const subscriptionNote = ref('')
const grantingSubscription = ref(false)

const today = computed(() => {
  const date = new Date()
  return date.toISOString().split('T')[0]
})

onMounted(async () => {
  // Загружаем доступные тарифы для чата (если админ)
  if (props.isAdmin && props.chatId) {
    try {
      const response = await apiAdminGetChatPlansRoute({ feedId: props.chatId }).run(ctx)
      availablePlans.value = response.plans || []
      console.log('[InviteModal] Loaded plans:', availablePlans.value.length, 'for chat:', props.chatId)
    } catch (err) {
      console.error('[InviteModal] Failed to load chat plans:', err)
    }
  } else {
    console.log('[InviteModal] Skipped loading plans:', { isAdmin: props.isAdmin, chatId: props.chatId })
  }
})

function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()
}

function formatPrice(price) {
  if (!price) return 'Бесплатно'
  const amount = price.amount || 0
  const currency = price.currency || 'RUB'
  const symbols = { RUB: '₽', USD: '$', EUR: '€' }
  const symbol = symbols[currency] || currency
  return `${amount} ${symbol}`
}

function formatDuration(plan) {
  if (plan.calendarPeriod) {
    const labels = {
      'current_month': 'Текущий месяц',
      'next_month': 'Следующий месяц',
      'quarter_1': 'I квартал',
      'quarter_2': 'II квартал',
      'quarter_3': 'III квартал',
      'quarter_4': 'IV квартал'
    }
    return labels[plan.calendarPeriod] || plan.calendarPeriod
  }

  if (plan.durationType === 'days') {
    return `${plan.durationValue} дн.`
  } else if (plan.durationType === 'months') {
    return `${plan.durationValue} мес.`
  } else if (plan.durationType === 'years') {
    return `${plan.durationValue} г.`
  }
  return ''
}

async function searchUser() {
  searching.value = true
  foundUser.value = null
  searchError.value = ''
  successMessage.value = ''
  showGrantSubscription.value = false
  selectedPlanId.value = ''
  subscriptionStartDate.value = ''
  subscriptionEndDate.value = ''
  subscriptionNote.value = ''

  try {
    const params = {}
    if (activeTab.value === 'username') params.username = username.value
    if (activeTab.value === 'email') params.email = email.value
    if (activeTab.value === 'phone') params.phone = phone.value

    const response = await apiUsersFindByIdentityRoute.run(ctx, params)

    if (response.user) {
      foundUser.value = response.user
    } else {
      searchError.value = 'Пользователь не найден'
    }
  } catch (err) {
    searchError.value = 'Ошибка поиска: ' + err.message
  } finally {
    searching.value = false
  }
}

async function sendInvite() {
  if (!foundUser.value) return

  sending.value = true
  searchError.value = ''

  try {
    const response = await apiInvitesCreateRoute.run(ctx, {
      chatId: props.chatId,
      invitedUserId: foundUser.value.id,
    })

    if (response.success) {
      successMessage.value = `Приглашение отправлено пользователю ${foundUser.value.displayName}`
      foundUser.value = null
      username.value = ''
      email.value = ''
      phone.value = ''
      emit('invited')
    } else {
      searchError.value = response.error || 'Не удалось отправить приглашение'
    }
  } catch (err) {
    searchError.value = 'Ошибка: ' + err.message
  } finally {
    sending.value = false
  }
}

async function grantSubscription() {
  if (!foundUser.value || !selectedPlanId.value) return

  grantingSubscription.value = true
  searchError.value = ''

  try {
    const response = await apiAdminGrantSubscriptionRoute.run(ctx, {
      userId: foundUser.value.id,
      planId: selectedPlanId.value,
      startDate: subscriptionStartDate.value || undefined,
      endDate: subscriptionEndDate.value || undefined,
      note: subscriptionNote.value || undefined
    })

    if (response.success) {
      successMessage.value = `Подписка "${response.subscription.plan.name}" предоставлена пользователю ${foundUser.value.displayName}`
      showGrantSubscription.value = false
      selectedPlanId.value = ''
      subscriptionStartDate.value = ''
      subscriptionEndDate.value = ''
      subscriptionNote.value = ''
      foundUser.value = null
      username.value = ''
      email.value = ''
      phone.value = ''
      emit('invited')
    } else {
      searchError.value = response.error || 'Не удалось предоставить подписку'
    }
  } catch (err) {
    searchError.value = 'Ошибка: ' + err.message
  } finally {
    grantingSubscription.value = false
  }
}

async function createInviteLink(regenerate = false) {
  creatingLink.value = true
  searchError.value = ''

  try {
    const response = await apiInvitesGetLinkRoute.run(ctx, {
      chatId: props.chatId,
      regenerate,
    })

    if (response.success) {
      inviteLink.value = response.inviteLink
    } else {
      searchError.value = 'Не удалось создать ссылку'
    }
  } catch (err) {
    searchError.value = 'Ошибка: ' + err.message
  } finally {
    creatingLink.value = false
  }
}

function copyLink() {
  if (linkInput.value) {
    linkInput.value.select()
    document.execCommand('copy')
    copied.value = true
    setTimeout(() => copied.value = false, 2000)
  }
}
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
  padding: 16px;
}

.modal-content {
  background: var(--modal-bg);
  border-radius: 12px;
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 24px;
  box-shadow: var(--shadow-lg);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.modal-title {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
  color: var(--text-primary);
}

.btn-icon {
  width: 36px;
  height: 36px;
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

.btn-icon:hover {
  background: var(--bg-hover);
}

.invite-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.tab-btn {
  flex: 1;
  min-width: 80px;
  padding: 10px 12px;
  border: 1px solid var(--border-light);
  background: var(--bg-primary);
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 14px;
  color: var(--text-secondary);
  transition: all 0.2s;
}

.tab-btn:hover {
  background: var(--bg-hover);
}

.tab-btn.active {
  background: #008069;
  color: white;
  border-color: #008069;
}

.tab-content {
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 6px;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  background: var(--input-bg);
  color: var(--text-primary);
}

.form-group input:focus,
.form-group select:focus {
  border-color: var(--primary-color);
}

.form-group input::placeholder {
  color: var(--input-placeholder);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.form-row .form-group {
  margin-bottom: 0;
}

.input-with-prefix {
  display: flex;
  align-items: center;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
  background: var(--input-bg);
}

.input-with-prefix:focus-within {
  border-color: var(--primary-color);
}

.input-with-prefix .prefix {
  padding: 10px 8px 10px 12px;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  font-weight: 500;
}

.input-with-prefix input {
  flex: 1;
  border: none;
  padding-left: 4px;
  background: transparent;
  color: var(--text-primary);
}

.input-with-prefix input::placeholder {
  color: var(--input-placeholder);
}

.btn-primary {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 8px;
  background: var(--primary-color);
  color: var(--text-inverse);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: background 0.2s;
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-hover);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s;
}

.btn-secondary:hover:not(:disabled) {
  background: var(--bg-hover);
  border-color: var(--primary-color);
}

.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary.active {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.btn-grant {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
}

.btn-grant:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-grant-submit {
  background: #10b981;
}

.btn-grant-submit:hover:not(:disabled) {
  background: #059669;
}

.link-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.hint {
  color: var(--text-secondary);
  font-size: 14px;
  margin-bottom: 16px;
  line-height: 1.5;
}

.link-result {
  margin-top: 16px;
}

.link-box {
  display: flex;
  gap: 8px;
}

.link-box input {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 14px;
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.btn-copy {
  width: 44px;
  height: 44px;
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  transition: all 0.2s;
}

.btn-copy:hover {
  background: var(--bg-hover);
  color: var(--primary-color);
}

.link-hint {
  color: var(--text-secondary);
  font-size: 12px;
  margin-top: 8px;
}

.search-result {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 16px;
  margin-top: 16px;
}

.user-card {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.user-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 16px;
  overflow: hidden;
  flex-shrink: 0;
}

.user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-info {
  flex: 1;
}

.user-name {
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 2px;
}

.user-meta {
  font-size: 13px;
  color: var(--text-secondary);
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.divider {
  display: flex;
  align-items: center;
  text-align: center;
  color: var(--text-secondary);
  font-size: 13px;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid var(--border-color);
}

.divider span {
  padding: 0 12px;
}

.grant-subscription-form {
  background: var(--bg-primary);
  border-radius: 8px;
  padding: 16px;
  margin-top: 8px;
  border: 1px solid var(--border-color);
}

.plan-select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 14px;
  background: var(--input-bg);
  color: var(--text-primary);
  cursor: pointer;
}

.plan-select option {
  padding: 8px;
}

.grant-hint {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border-color);
  color: var(--text-secondary);
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.grant-hint i {
  color: var(--primary-color);
}

.search-error,
.success-message {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  border-radius: 8px;
  margin-top: 16px;
  font-size: 14px;
}

.search-error {
  background: var(--btn-decline-bg);
  color: var(--btn-decline-text);
}

.success-message {
  background: var(--btn-accept-bg);
  color: var(--btn-accept-text);
}

@media (max-width: 480px) {
  .modal-content {
    padding: 16px;
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .invite-tabs {
    gap: 4px;
  }

  .tab-btn {
    min-width: 60px;
    padding: 8px;
    font-size: 12px;
  }
}
</style>