<template>
  <div v-if="canManage" class="subscription-settings">
    <div class="settings-header">
      <h3>Тарифы подписок</h3>
      <button class="btn btn-primary btn-sm" @click="createNewPlan">
        <i class="fa-solid fa-plus"></i>
        Создать тариф
      </button>
    </div>

    <div v-if="plans.length === 0" class="empty-plans">
      <i class="fa-solid fa-tags"></i>
      <p>Нет созданных тарифов</p>
      <span>Создайте тариф и добавьте в него чаты</span>
    </div>

    <div v-else class="plans-list">
      <div
        v-for="plan in sortedPlans"
        :key="plan.id"
        class="plan-card"
        :class="{ inactive: !plan.isActive }"
      >
        <div class="plan-header">
          <div class="plan-title-section">
            <span class="plan-name">{{ plan.name }}</span>
            <span class="plan-price">{{ formatPrice(plan.price) }}</span>
          </div>
          <div class="plan-actions">
            <button class="btn btn-icon" @click="editPlan(plan)" title="Редактировать">
              <i class="fa-solid fa-pen"></i>
            </button>
            <button
              class="btn btn-icon"
              :class="plan.isActive ? 'btn-danger' : 'btn-success'"
              @click="togglePlanActive(plan)"
              :title="plan.isActive ? 'Деактивировать' : 'Активировать'"
            >
              <i :class="plan.isActive ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'"></i>
            </button>
            <button class="btn btn-icon btn-danger" @click="deletePlan(plan)" title="Удалить">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </div>

        <div class="plan-meta">
          <span class="plan-duration">{{ formatDuration(plan) }}</span>
          <span v-if="plan.allowAutoRenewal" class="plan-auto">
            <i class="fa-solid fa-rotate"></i>
            Автопродление
          </span>
        </div>

        <p v-if="plan.description" class="plan-description">{{ plan.description }}</p>

        <!-- Список чатов в тарифе -->
        <div class="plan-chats-section">
          <div class="plan-chats-header">
            <span class="plan-chats-title">
              <i class="fa-solid fa-comments"></i>
              Чаты в тарифе ({{ plan.chats?.length || 0 }})
            </span>
            <button class="btn btn-sm btn-secondary" @click="openChatSelector(plan)">
              <i class="fa-solid fa-plus"></i>
              Добавить чат
            </button>
          </div>

          <div v-if="plan.chats && plan.chats.length > 0" class="plan-chats-list">
            <div
              v-for="chat in plan.chats"
              :key="chat.feedId"
              class="plan-chat-item"
            >
              <div class="chat-info">
                <div class="chat-avatar">
                  <img v-if="chat.avatarHash" :src="getAvatarUrl(chat.avatarHash)" />
                  <i v-else class="fa-solid fa-comments"></i>
                </div>
                <div class="chat-details">
                  <span class="chat-title">{{ chat.title }}</span>
                  <span class="chat-type">{{ formatChatType(chat.type) }}</span>
                </div>
              </div>
              <button
                class="btn btn-icon btn-sm btn-danger"
                @click="removeChatFromPlan(plan, chat.feedId)"
                title="Удалить из тарифа"
              >
                <i class="fa-solid fa-times"></i>
              </button>
            </div>
          </div>

          <div v-else class="plan-chats-empty">
            <i class="fa-solid fa-inbox"></i>
            <span>Нет чатов в этом тарифе</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Модалка создания/редактирования тарифа -->
    <Teleport to="body">
      <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
        <div class="modal-content plan-modal">
          <div class="modal-header">
            <h4>{{ editingPlan ? 'Редактировать тариф' : 'Новый тариф' }}</h4>
            <button class="btn-close" @click="closeModal">
              <i class="fa-solid fa-times"></i>
            </button>
          </div>

          <form @submit.prevent="savePlan">
            <div class="form-group">
              <label>Название *</label>
              <input
                v-model="planForm.name"
                type="text"
                placeholder="Например: Базовый доступ"
                required
              />
            </div>

            <div class="form-group">
              <label>Описание</label>
              <textarea
                v-model="planForm.description"
                placeholder="Краткое описание тарифа"
                rows="2"
              ></textarea>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Цена *</label>
                <input
                  v-model.number="planForm.priceAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="1000"
                  required
                />
              </div>
              <div class="form-group">
                <label>Валюта</label>
                <select v-model="planForm.priceCurrency">
                  <option value="RUB">RUB (₽)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Тип длительности *</label>
                <select v-model="planForm.durationType" @change="onDurationTypeChange">
                  <option value="days">Дни</option>
                  <option value="months">Месяцы</option>
                  <option value="years">Годы</option>
                </select>
              </div>
              <div class="form-group">
                <label>Значение *</label>
                <input
                  v-model.number="planForm.durationValue"
                  type="number"
                  min="1"
                  placeholder="1"
                  required
                />
              </div>
            </div>

            <!-- Настройки для месячных подписок -->
            <div v-if="planForm.durationType === 'months'" class="form-group">
              <label>Тип периода</label>
              <select v-model="planForm.calendarPeriod">
                <option value="current">Текущий/следующий месяц</option>
                <option value="specific">Специфический период (кварталы)</option>
              </select>
            </div>

            <div v-if="planForm.durationType === 'months' && planForm.calendarPeriod === 'specific'" class="form-group">
              <label>Месяц начала периода</label>
              <select v-model.number="planForm.specificPeriodStart">
                <option :value="1">Январь (I квартал: янв-мар)</option>
                <option :value="4">Апрель (II квартал: апр-июн)</option>
                <option :value="5">Май (май-июль)</option>
                <option :value="7">Июль (III квартал: июл-сен)</option>
                <option :value="8">Август (авг-окт)</option>
                <option :value="10">Октябрь (IV квартал: окт-дек)</option>
                <option :value="11">Ноябрь (ноя-янв)</option>
              </select>
              <small class="hint">Периоды будут формироваться от указанного месяца на {{ planForm.durationValue }} месяцев</small>
            </div>

            <div class="form-group checkbox-group">
              <label class="checkbox-label">
                <input type="checkbox" v-model="planForm.allowAutoRenewal" />
                <span class="checkmark"></span>
                <span>Разрешить автопродление</span>
              </label>
            </div>

            <div class="form-group checkbox-group">
              <label class="checkbox-label">
                <input type="checkbox" v-model="planForm.isActive" />
                <span class="checkmark"></span>
                <span>Активен</span>
              </label>
            </div>

            <div v-if="error" class="error-message">{{ error }}</div>

            <div class="modal-actions">
              <button type="button" class="btn btn-secondary" @click="closeModal">Отмена</button>
              <button type="submit" class="btn btn-primary" :disabled="saving">
                <i v-if="saving" class="fa-solid fa-spinner fa-spin"></i>
                <span v-else>Сохранить</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Модалка выбора чатов для тарифа -->
    <Teleport to="body">
      <div v-if="showChatSelector" class="modal-overlay" @click.self="closeChatSelector">
        <div class="modal-content chat-selector-modal">
          <div class="modal-header">
            <h4>Добавить чаты в тариф</h4>
            <button class="btn-close" @click="closeChatSelector">
              <i class="fa-solid fa-times"></i>
            </button>
          </div>

          <div class="chat-selector-content">
            <div v-if="availableChats.length === 0" class="empty-chats">
              <i class="fa-solid fa-inbox"></i>
              <p>Нет доступных чатов</p>
              <span>Все чаты уже добавлены в этот тариф</span>
            </div>

            <div v-else class="available-chats-list">
              <div
                v-for="chat in availableChats"
                :key="chat.feedId"
                class="chat-select-item"
                :class="{ selected: selectedChats.includes(chat.feedId) }"
                @click="toggleChatSelection(chat.feedId)"
              >
                <div class="chat-select-checkbox">
                  <i v-if="selectedChats.includes(chat.feedId)" class="fa-solid fa-check-square"></i>
                  <i v-else class="fa-regular fa-square"></i>
                </div>
                <div class="chat-select-avatar">
                  <img v-if="chat.avatarHash" :src="getAvatarUrl(chat.avatarHash)" />
                  <i v-else class="fa-solid fa-comments"></i>
                </div>
                <div class="chat-select-info">
                  <span class="chat-select-title">{{ chat.title }}</span>
                  <span class="chat-select-type">{{ formatChatType(chat.type) }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="modal-actions">
            <button class="btn btn-secondary" @click="closeChatSelector">Отмена</button>
            <button
              class="btn btn-primary"
              :disabled="selectedChats.length === 0 || addingChats"
              @click="addSelectedChats"
            >
              <i v-if="addingChats" class="fa-solid fa-spinner fa-spin"></i>
              <span v-else>Добавить ({{ selectedChats.length }})</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const props = defineProps({
  canManage: Boolean,
  mode: {
    type: String,
    default: 'chat' // 'chat' | 'global'
  },
  feedId: String,
  isPaid: Boolean,
  isOwnerOrAdmin: Boolean
})

const emit = defineEmits(['plans-updated'])

const plans = ref([])
const allChats = ref([])
const showModal = ref(false)
const showChatSelector = ref(false)
const editingPlan = ref(null)
const selectedPlanForChats = ref(null)
const saving = ref(false)
const addingChats = ref(false)
const error = ref('')
const selectedChats = ref([])

const planForm = ref({
  name: '',
  description: '',
  priceAmount: 1000,
  priceCurrency: 'RUB',
  durationType: 'months',
  durationValue: 1,
  calendarPeriod: 'current',
  specificPeriodStart: 1,
  allowAutoRenewal: true,
  isActive: true,
  chatIds: []
})

const sortedPlans = computed(() => {
  if (!Array.isArray(plans.value)) return []
  return [...plans.value].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
})

// Чаты, которые можно добавить к выбранному тарифу
const availableChats = computed(() => {
  if (!selectedPlanForChats.value) return []

  const planChatIds = new Set(selectedPlanForChats.value.chats?.map(c => c.feedId) || [])
  return allChats.value.filter(chat => !planChatIds.has(chat.feedId))
})

onMounted(() => {
  loadPlans()
  if (props.mode === 'global') {
    loadAllChats()
  }
})

async function loadPlans() {
  try {
    const response = await fetch('/tg/api/chat-subscription-plans~plans/all').then(r => r.json())
    plans.value = response.plans || []
  } catch (e) {
    console.error('Failed to load plans:', e)
    plans.value = []
  }
}

async function loadAllChats() {
  try {
    const response = await fetch('/tg/api/chats~list').then(r => r.json())
    allChats.value = response?.chats || []
  } catch (e) {
    console.error('Failed to load chats:', e)
  }
}

function createNewPlan() {
  editingPlan.value = null
  resetForm()
  showModal.value = true
}

function onDurationTypeChange() {
  if (planForm.value.durationType === 'days') {
    planForm.value.calendarPeriod = 'current'
    planForm.value.specificPeriodStart = null
  }
}

function editPlan(plan) {
  editingPlan.value = plan
  planForm.value = {
    name: plan.name,
    description: plan.description || '',
    priceAmount: plan.price?.[0] ?? plan.price?.amount ?? 0,
    priceCurrency: plan.price?.[1] ?? plan.price?.currency ?? 'RUB',
    durationType: plan.durationType || 'months',
    durationValue: plan.durationValue || 1,
    calendarPeriod: plan.calendarPeriod || 'current',
    specificPeriodStart: plan.specificPeriodStart || 1,
    allowAutoRenewal: plan.allowAutoRenewal !== false,
    isActive: plan.isActive !== false,
    chatIds: plan.chats?.map(c => c.feedId) || []
  }
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingPlan.value = null
  error.value = ''
  resetForm()
}

function resetForm() {
  planForm.value = {
    name: '',
    description: '',
    priceAmount: 1000,
    priceCurrency: 'RUB',
    durationType: 'months',
    durationValue: 1,
    calendarPeriod: 'current',
    specificPeriodStart: 1,
    allowAutoRenewal: true,
    isActive: true,
    chatIds: []
  }
}

async function savePlan() {
  saving.value = true
  error.value = ''

  try {
    // Если создаем новый тариф с чатами или добавляем чаты в существующий,
    // нужно сделать эти чаты платными
    const chatIdsToMakePaid = editingPlan.value 
      ? planForm.value.chatIds.filter(id => !editingPlan.value.chats?.some(c => c.feedId === id))
      : planForm.value.chatIds

    // Делаем чаты платными
    for (const feedId of chatIdsToMakePaid) {
      try {
        await fetch(`/tg/api/chats~${feedId}/set-paid`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isPaid: true })
        })
      } catch (e) {
        console.error(`Failed to set paid status for chat ${feedId}:`, e)
      }
    }


    const body = {
      name: planForm.value.name,
      description: planForm.value.description,
      price: {
        amount: planForm.value.priceAmount,
        currency: planForm.value.priceCurrency
      },
      durationType: planForm.value.durationType,
      durationValue: planForm.value.durationValue,
      calendarPeriod: planForm.value.calendarPeriod,
      specificPeriodStart: planForm.value.specificPeriodStart,
      allowAutoRenewal: planForm.value.allowAutoRenewal,
      isActive: planForm.value.isActive,
      chatIds: planForm.value.chatIds
    }

    if (editingPlan.value) {
      await fetch(`/tg/api/chat-subscription-plans~plans/${editingPlan.value.id}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
    } else {
      await fetch('/tg/api/chat-subscription-plans~plans/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
    }

    await loadPlans()
    emit('plans-updated')
    closeModal()
  } catch (e) {
    error.value = e.message || 'Ошибка при сохранении'
  } finally {
    saving.value = false
  }
}

async function togglePlanActive(plan) {
  try {
    await fetch(`/tg/api/chat-subscription-plans~plans/${plan.id}/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !plan.isActive })
    })
    await loadPlans()
    emit('plans-updated')
  } catch (e) {
    console.error('Failed to toggle plan:', e)
  }
}

async function deletePlan(plan) {
  if (!confirm(`Удалить тариф "${plan.name}"? Это не отменит существующие подписки.`)) return

  try {
    await fetch(`/tg/api/chat-subscription-plans~plans/${plan.id}/delete`, {
      method: 'POST'
    })
    await loadPlans()
    emit('plans-updated')
  } catch (e) {
    console.error('Failed to delete plan:', e)
  }
}

// Управление чатами в тарифе
function openChatSelector(plan) {
  selectedPlanForChats.value = plan
  selectedChats.value = []
  showChatSelector.value = true
}

function closeChatSelector() {
  showChatSelector.value = false
  selectedPlanForChats.value = null
  selectedChats.value = []
}

function toggleChatSelection(feedId) {
  const index = selectedChats.value.indexOf(feedId)
  if (index === -1) {
    selectedChats.value.push(feedId)
  } else {
    selectedChats.value.splice(index, 1)
  }
}

async function addSelectedChats() {
  if (!selectedPlanForChats.value || selectedChats.value.length === 0) return

  addingChats.value = true
  try {
    // Делаем добавляемые чаты платными
    for (const feedId of selectedChats.value) {
      try {
        await fetch(`/tg/api/chats~${feedId}/set-paid`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isPaid: true })
        })
      } catch (e) {
        console.error(`Failed to set paid status for chat ${feedId}:`, e)
      }
    }

    for (const feedId of selectedChats.value) {
      await fetch(`/tg/api/chat-subscription-plans~plans/${selectedPlanForChats.value.id}/add-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedId })
      })
    }
    await loadPlans()
    emit('plans-updated')
    closeChatSelector()
  } catch (e) {
    console.error('Failed to add chats:', e)
    alert('Ошибка при добавлении чатов')
  } finally {
    addingChats.value = false
  }
}

async function removeChatFromPlan(plan, feedId) {
  if (!confirm('Удалить чат из этого тарифа?')) return

  try {
    await fetch(`/tg/api/chat-subscription-plans~plans/${plan.id}/remove-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feedId })
    })
    await loadPlans()
    emit('plans-updated')
  } catch (e) {
    console.error('Failed to remove chat:', e)
  }
}

function getAvatarUrl(hash) {
  return `https://fs.chatium.ru/thumbnail/${hash}/s/100x100`
}

function formatChatType(type) {
  const types = {
    direct: 'Личный',
    group: 'Группа',
    channel: 'Канал'
  }
  return types[type] || type
}

function formatPrice(price) {
  if (!price) return ''

  const amount = price.amount !== undefined ? price.amount : price[0] !== undefined ? price[0] : 0
  const currency = price.currency !== undefined ? price.currency : price[1] !== undefined ? price[1] : 'RUB'

  const symbol = currency === 'RUB' ? '₽' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency
  return `${amount} ${symbol}`
}

function formatDuration(plan) {
  const typeLabels = {
    days: { one: 'день', few: 'дня', many: 'дней' },
    months: { one: 'месяц', few: 'месяца', many: 'месяцев' },
    years: { one: 'год', few: 'года', many: 'лет' }
  }

  const value = plan.durationValue
  const labels = typeLabels[plan.durationType] || typeLabels.days

  let label
  if (value === 1) label = labels.one
  else if (value >= 2 && value <= 4) label = labels.few
  else label = labels.many

  let result = `${value} ${label}`

  if (plan.durationType === 'months' && plan.calendarPeriod === 'specific') {
    const months = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']
    const startMonth = months[(plan.specificPeriodStart || 1) - 1]
    result += ` (с ${startMonth})`
  }

  return result
}
</script>

<style scoped>
.subscription-settings {
  padding: 16px 0;
}

.settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.settings-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.empty-plans {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-secondary);
}

.empty-plans i {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.empty-plans p {
  margin: 0 0 4px 0;
  font-size: 15px;
}

.empty-plans span {
  font-size: 13px;
  opacity: 0.7;
}

.plans-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.plan-card {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 16px;
  border: 1px solid var(--border-color);
  transition: all 0.2s;
}

.plan-card:hover {
  border-color: var(--accent-color);
}

.plan-card.inactive {
  opacity: 0.6;
}

.plan-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 8px;
}

.plan-title-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
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

.plan-actions {
  display: flex;
  gap: 4px;
}

.plan-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.plan-duration {
  font-size: 13px;
  color: var(--text-secondary);
}

.plan-auto {
  font-size: 12px;
  color: var(--success-color);
  display: flex;
  align-items: center;
  gap: 4px;
}

.plan-description {
  margin: 8px 0;
  font-size: 13px;
  color: var(--text-secondary);
}

/* Plan chats section */
.plan-chats-section {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border-color);
}

.plan-chats-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.plan-chats-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 6px;
}

.plan-chats-title i {
  color: var(--accent-color);
}

.plan-chats-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.plan-chat-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: var(--bg-primary);
  border-radius: 8px;
  transition: background 0.2s;
}

.plan-chat-item:hover {
  background: var(--bg-hover);
}

.chat-info {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.chat-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}

.chat-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.chat-avatar i {
  font-size: 16px;
  color: var(--text-secondary);
}

.chat-details {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.chat-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chat-type {
  font-size: 12px;
  color: var(--text-secondary);
}

.plan-chats-empty {
  text-align: center;
  padding: 24px;
  color: var(--text-secondary);
}

.plan-chats-empty i {
  font-size: 32px;
  margin-bottom: 8px;
  opacity: 0.5;
}

.plan-chats-empty span {
  font-size: 13px;
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
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

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn-secondary:hover {
  background: var(--bg-hover);
}

.btn-sm {
  padding: 6px 12px;
  font-size: 13px;
}

.btn-icon {
  width: 36px;
  height: 36px;
  padding: 0;
  background: transparent;
  color: var(--text-secondary);
}

.btn-icon:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.btn-icon.btn-sm {
  width: 28px;
  height: 28px;
}

.btn-success {
  color: var(--success-color);
}

.btn-danger {
  color: var(--danger-color);
}

/* Modal */
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

.plan-modal {
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
  background: var(--modal-bg);
  border-radius: 16px;
}

.chat-selector-modal {
  width: 100%;
  max-width: 400px;
  max-height: 80vh;
  background: var(--modal-bg);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h4 {
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

form {
  padding: 20px;
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
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  font-size: 15px;
  outline: none;
  transition: border-color 0.2s;
  background: var(--input-bg);
  color: var(--text-primary);
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  border-color: var(--accent-color);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.hint {
  display: block;
  margin-top: 6px;
  font-size: 12px;
  color: var(--text-secondary);
}

.checkbox-group {
  display: flex;
  align-items: center;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 10px;
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
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.checkmark::after {
  content: '';
  width: 10px;
  height: 10px;
  background: var(--accent-color);
  border-radius: 2px;
  opacity: 0;
  transition: opacity 0.2s;
}

.checkbox-label input:checked + .checkmark {
  border-color: var(--accent-color);
}

.checkbox-label input:checked + .checkmark::after {
  opacity: 1;
}

.error-message {
  padding: 12px;
  background: var(--error-bg);
  color: var(--error-color);
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 14px;
}

.modal-actions {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid var(--border-color);
}

.modal-actions .btn {
  flex: 1;
}

/* Chat selector styles */
.chat-selector-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.empty-chats {
  text-align: center;
  padding: 32px 16px;
  color: var(--text-secondary);
}

.empty-chats i {
  font-size: 40px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.empty-chats p {
  margin: 0 0 4px 0;
  font-size: 15px;
}

.empty-chats span {
  font-size: 13px;
}

.available-chats-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.chat-select-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.chat-select-item:hover {
  background: var(--bg-secondary);
}

.chat-select-item.selected {
  background: var(--accent-light);
}

.chat-select-checkbox {
  font-size: 18px;
  color: var(--accent-color);
}

.chat-select-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}

.chat-select-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.chat-select-avatar i {
  font-size: 14px;
  color: var(--text-secondary);
}

.chat-select-info {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.chat-select-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chat-select-type {
  font-size: 12px;
  color: var(--text-secondary);
}
</style>