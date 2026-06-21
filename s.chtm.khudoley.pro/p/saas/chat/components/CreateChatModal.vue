<template>
  <Teleport to="body">
    <div class="modal-overlay" @click="$emit('close')">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>Создать новый чат</h2>
          <button @click="$emit('close')" class="btn-close">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <form @submit.prevent="createChat">
          <!-- Аватарка чата (только для групп и каналов) -->
          <div v-if="!isAgentChat && !isDirectChat" class="form-group">
            <label>Аватар чата</label>
            <div class="chat-avatar-upload">
              <div
                class="avatar-preview"
                :style="getAvatarPreviewStyle()"
                @click="showAvatarModal = true"
                style="cursor: pointer"
              >
                <span v-if="!avatarHash">{{ getChatInitials(newChat.title) }}</span>
                <div class="avatar-overlay" v-if="!avatarHash">
                  <i class="fas fa-camera"></i>
                </div>
              </div>
              <div class="avatar-actions">
                <button type="button" @click="showAvatarModal = true" class="btn-secondary btn-sm">
                  <i class="fas fa-upload"></i>
                  {{ avatarHash ? 'Изменить' : 'Загрузить' }}
                </button>
                <button v-if="avatarHash" type="button" @click="removeAvatar" class="btn-text">
                  Удалить
                </button>
              </div>
            </div>
            <span class="field-hint">Нажмите на аватар, чтобы изменить фото</span>
          </div>

          <div v-if="!isAgentChat" class="form-group">
            <label>Название чата *</label>
            <input
              v-model="newChat.title"
              type="text"
              :required="!isAgentChat"
              placeholder="Например: Команда разработки"
              autofocus
            />
          </div>

          <div v-if="!isAgentChat" class="form-group">
            <label>Описание</label>
            <textarea
              v-model="newChat.description"
              placeholder="Краткое описание чата"
              rows="2"
            ></textarea>
          </div>

          <div class="form-group">
            <label>Тип чата</label>
            <div class="type-selector">
              <label
                v-for="type in filteredChatTypes"
                :key="type.value"
                :class="['type-option', { active: newChat.type === type.value }]"
              >
                <input
                  v-model="newChat.type"
                  type="radio"
                  :value="type.value"
                  class="hidden"
                  @change="onChatTypeChange"
                />
                <i :class="type.icon"></i>
                <span>{{ type.label }}</span>
              </label>
            </div>
          </div>

          <div v-if="isAdmin && !isAgentChat" class="form-group checkbox">
            <label class="checkbox-label">
              <input v-model="newChat.isPublic" type="checkbox" />
              <span class="checkmark"></span>
              <span class="checkbox-text">
                <strong>Публичный чат</strong>
                <small>Любой пользователь сможет найти и присоединиться</small>
              </span>
            </label>
          </div>

          <!-- Настройки платного чата (только для админов, групп и каналов) -->
          <div v-if="isAdmin && !isAgentChat && !isDirectChat" class="paid-section">
            <div class="form-group checkbox">
              <label class="checkbox-label">
                <input v-model="isPaidChat" type="checkbox" />
                <span class="checkmark"></span>
                <span class="checkbox-text">
                  <strong>Платный чат</strong>
                  <small>Доступ к чату только по подписке</small>
                </span>
              </label>
            </div>

            <!-- Настройки тарифов при создании чата -->
            <div v-if="isPaidChat" class="plans-setup">
              <div class="plans-setup-header">
                <h4>Тарифы</h4>
                <button type="button" class="btn-add-plan" @click="addPlan">
                  <i class="fas fa-plus"></i>
                  Добавить
                </button>
              </div>

              <div v-if="plans.length === 0" class="plans-empty">
                <i class="fas fa-tag"></i>
                <span>Добавьте хотя бы один тариф</span>
              </div>

              <div v-else class="plans-list">
                <div v-for="(plan, index) in plans" :key="index" class="plan-item">
                  <div class="plan-fields">
                    <input
                      v-model="plan.name"
                      type="text"
                      placeholder="Название"
                      class="plan-input"
                      required
                    />
                    <div class="plan-row">
                      <input
                        v-model.number="plan.priceAmount"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Цена"
                        class="plan-input plan-price"
                        required
                      />
                      <select v-model="plan.priceCurrency" class="plan-select">
                        <option value="RUB">₽</option>
                        <option value="USD">$</option>
                        <option value="EUR">€</option>
                      </select>
                      <select v-model="plan.durationType" class="plan-select">
                        <option value="days">дней</option>
                        <option value="months">мес</option>
                        <option value="years">лет</option>
                      </select>
                      <input
                        v-model.number="plan.durationValue"
                        type="number"
                        min="1"
                        placeholder="1"
                        class="plan-input plan-duration"
                        required
                      />
                    </div>
                  </div>
                  <button type="button" class="btn-remove-plan" @click="removePlan(index)">
                    <i class="fas fa-times"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Настройки агента (только для админов и групповых чатов или чата с агентом) -->
          <div v-if="isAdmin && (isGroupChat || isAgentChat)" class="agent-section">
            <div v-if="!isAgentChat" class="form-group checkbox">
              <label class="checkbox-label">
                <input v-model="withAgent" type="checkbox" />
                <span class="checkmark"></span>
                <span class="checkbox-text">
                  <strong>Добавить агента в чат</strong>
                  <small>Агент будет автоматически отвечать на сообщения</small>
                </span>
              </label>
            </div>

            <div v-if="withAgent || isAgentChat" class="agent-settings">
              <div class="form-group">
                <label>Выберите агента *</label>
                <select
                  v-model="selectedAgentId"
                  @change="onAgentChange"
                  class="agent-select"
                  required
                >
                  <option value="">-- Выберите агента --</option>
                  <option v-for="agent in availableAgents" :key="agent.id" :value="agent.id">
                    {{ agent.title }}
                  </option>
                </select>
                <div v-if="loadingAgents" class="loading-hint">
                  <i class="fas fa-spinner fa-spin"></i> Загрузка агентов...
                </div>
                <div v-else-if="availableAgents.length === 0" class="empty-hint">
                  Нет доступных агентов. Создайте агента в разделе AI-агенты.
                </div>
              </div>

              <div v-if="isGroupChat" class="form-group">
                <label>Имя агента для упоминаний</label>
                <input v-model="agentName" type="text" placeholder="Например: Ассистент" />
                <small class="hint">Используйте @Имя чтобы упомянуть агента в чате</small>
              </div>

              <div v-if="isGroupChat" class="form-group">
                <label>Отвечать на</label>
                <div class="radio-group">
                  <label
                    v-for="option in respondToOptions"
                    :key="option.value"
                    class="radio-option"
                  >
                    <input
                      v-model="agentRespondTo"
                      type="radio"
                      :value="option.value"
                      name="respondTo"
                    />
                    <span class="radio-mark"></span>
                    <span class="radio-text">
                      <strong>{{ option.label }}</strong>
                      <small>{{ option.description }}</small>
                    </span>
                  </label>
                </div>
              </div>

              <div v-if="isGroupChat && agentRespondTo === 'mention'" class="form-group">
                <label>При упоминании отвечать</label>
                <div class="radio-group">
                  <label
                    v-for="option in respondToMentionOptions"
                    :key="option.value"
                    class="radio-option"
                  >
                    <input
                      v-model="agentRespondToMention"
                      type="radio"
                      :value="option.value"
                      name="respondToMention"
                    />
                    <span class="radio-mark"></span>
                    <span class="radio-text">
                      <strong>{{ option.label }}</strong>
                      <small>{{ option.description }}</small>
                    </span>
                  </label>
                </div>
              </div>

              <div v-if="isAgentChat" class="form-group">
                <small class="hint" style="color: var(--text-secondary)">
                  <i class="fas fa-info-circle"></i>
                  В личном чате с агентом бот будет отвечать на все ваши сообщения
                </small>
              </div>
            </div>
          </div>

          <div class="modal-actions">
            <button type="button" @click="$emit('close')" class="btn-secondary">Отмена</button>
            <button
              type="submit"
              :disabled="
                creating ||
                (!isAgentChat && !newChat.title.trim()) ||
                (isAgentChat && !selectedAgentId)
              "
              class="btn-primary"
            >
              <i v-if="creating" class="fas fa-spinner fa-spin"></i>
              <span v-else>{{ isAgentChat ? 'Начать чат' : 'Создать чат' }}</span>
            </button>
          </div>
        </form>
      </div>

      <!-- Модалка обрезки аватара -->
      <AvatarCropperModal
        :is-open="showAvatarModal"
        title="Выберите аватар чата"
        save-button-text="Сохранить аватар"
        :current-avatar-hash="avatarHash"
        @close="showAvatarModal = false"
        @save="onAvatarSaved"
        @remove="removeAvatar"
      />
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { apiChatsCreateRoute } from '../api/chats'
import { apiAgentsListRoute } from '../api/agents'
import { apiDirectChatWithAgentRoute } from '../api/direct-chats'
import AvatarCropperModal from './AvatarCropperModal.vue'

const props = defineProps({
  isAdmin: Boolean,
  user: Object
})

console.log('CreateChatModal props:', props.isAdmin, props.user?.accountRole)

const emit = defineEmits(['close', 'created'])

const creating = ref(false)
const loadingAgents = ref(false)
const availableAgents = ref([])
const newChat = ref({
  title: '',
  description: '',
  type: 'group',
  isPublic: false
})

// Настройки агента
const withAgent = ref(false)
const selectedAgentId = ref('')
const selectedAgent = ref(null)
const agentName = ref('')
const agentRespondTo = ref('all') // 'all' | 'admins' | 'mention'
const agentRespondToMention = ref('all') // 'all' | 'admins'

// Аватарка чата
const avatarHash = ref(null)
const showAvatarModal = ref(false)

// Настройки платного чата
const isPaidChat = ref(false)
const plans = ref([])

const isGroupChat = computed(() => newChat.value.type === 'group')
const isAgentChat = computed(() => newChat.value.type === 'agent')
const isDirectChat = computed(() => newChat.value.type === 'direct')

// Фильтруем типы чатов - чат с агентом только для админов
const filteredChatTypes = computed(() => {
  return chatTypes.filter((type) => !type.adminOnly || props.isAdmin)
})

// Сброс полей при смене типа чата
function onChatTypeChange() {
  if (isAgentChat.value) {
    // Для чата с агентом сбрасываем название и описание
    newChat.value.title = ''
    newChat.value.description = ''
    // Автоматически включаем выбор агента
    withAgent.value = true
  } else {
    withAgent.value = false
    selectedAgentId.value = ''
    selectedAgent.value = null
    agentName.value = ''
  }
}

const chatTypes = [
  { value: 'group', label: 'Группа', icon: 'fas fa-users' },
  { value: 'channel', label: 'Канал', icon: 'fas fa-bullhorn' },
  { value: 'agent', label: 'Чат с агентом', icon: 'fas fa-robot', adminOnly: true }
]

const respondToOptions = [
  { value: 'all', label: 'Всем сообщениям', description: 'Агент отвечает на все сообщения' },
  {
    value: 'admins',
    label: 'Только админам',
    description: 'Агент отвечает только на сообщения от администраторов'
  },
  {
    value: 'mention',
    label: 'Только при упоминании',
    description: 'Агент отвечает только когда его упоминают по имени'
  }
]

const respondToMentionOptions = [
  { value: 'all', label: 'Всем', description: 'При упоминании отвечает всем' },
  {
    value: 'admins',
    label: 'Только админам',
    description: 'При упоминании отвечает только администраторам'
  }
]

onMounted(async () => {
  if (props.isAdmin) {
    await loadAgents()
  }
})

// Загружаем агентов когда isAdmin становится true (асинхронная загрузка пользователя)
watch(
  () => props.isAdmin,
  async (isAdmin) => {
    if (isAdmin && availableAgents.value.length === 0) {
      await loadAgents()
    }
  }
)

async function loadAgents() {
  loadingAgents.value = true
  try {
    const response = await apiAgentsListRoute.run(ctx)
    if (response.success) {
      availableAgents.value = response.agents
    }
  } catch (error) {
    console.error('Ошибка загрузки агентов:', error)
  } finally {
    loadingAgents.value = false
  }
}

function onAgentChange() {
  const agent = availableAgents.value.find((a) => a.id === selectedAgentId.value)
  selectedAgent.value = agent || null
  if (agent && !agentName.value) {
    agentName.value = agent.title
  }
}

async function createChat() {
  // Для чата с агентом название не обязательно - оно будет взято из имени агента
  if (!isAgentChat.value && !newChat.value.title.trim()) return
  if (isAgentChat.value && !selectedAgentId.value) {
    alert('Выберите агента')
    return
  }

  creating.value = true
  try {
    // Если это чат с агентом - используем специальный API
    if (isAgentChat.value) {
      const response = await apiDirectChatWithAgentRoute.run(ctx, {
        agentId: selectedAgentId.value,
        agentKey: selectedAgent.value?.key || '',
        agentName: agentName.value || selectedAgent.value?.title || 'Агент'
      })
      if (response.success) {
        emit('created', response.feedId)
      }
    } else {
      // Обычное создание чата
      const chatData = {
        ...newChat.value,
        avatarHash: avatarHash.value,
        withAgent: withAgent.value && isGroupChat.value && !!selectedAgent.value,
        agentId: selectedAgentId.value,
        agentKey: selectedAgent.value?.key || '',
        agentName: agentName.value || selectedAgent.value?.title,
        agentRespondTo: agentRespondTo.value,
        agentRespondToMention: agentRespondToMention.value,
        isPaid: isPaidChat.value,
        plans: isPaidChat.value ? plans.value.filter((p) => p.name && p.priceAmount > 0) : []
      }

      // Проверка: если платный чат, должны быть тарифы
      if (isPaidChat.value && chatData.plans.length === 0) {
        alert('Добавьте хотя бы один тариф для платного чата')
        creating.value = false
        return
      }

      const response = await apiChatsCreateRoute.run(ctx, chatData)
      if (response.success) {
        emit('created', response.feedId)
      }
    }
  } catch (error) {
    console.error('Ошибка создания чата:', error)
    alert('Не удалось создать чат: ' + error.message)
  } finally {
    creating.value = false
  }
}

// Методы для работы с аватаркой
function getChatInitials(title) {
  if (!title) return '?'
  return title
    .split(' ')
    .map((w) => w[0])
    .join('')
    .substring(0, 2)
    .toUpperCase()
}

function getAvatarPreviewStyle() {
  const colors = [
    ['#667eea', '#764ba2'],
    ['#f093fb', '#f5576c'],
    ['#4facfe', '#00f2fe'],
    ['#43e97b', '#38f9d7'],
    ['#fa709a', '#fee140']
  ]
  const index = (newChat.value.title?.charCodeAt(0) || 0) % colors.length
  const [from, to] = colors[index]

  if (avatarHash.value) {
    return {
      background: `url(https://fs.chatium.ru/thumbnail/${avatarHash.value}/s/200x) center/cover no-repeat`
    }
  }

  return {
    background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`
  }
}

function onAvatarSaved(hash) {
  avatarHash.value = hash
  showAvatarModal.value = false
}

function removeAvatar() {
  avatarHash.value = null
  showAvatarModal.value = false
}

// Методы для работы с тарифами
function addPlan() {
  plans.value.push({
    name: '',
    priceAmount: 1000,
    priceCurrency: 'RUB',
    durationType: 'months',
    durationValue: 1,
    allowAutoRenewal: true,
    isActive: true
  })
}

function removePlan(index) {
  plans.value.splice(index, 1)
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

.modal-content {
  background: var(--bg-modal, var(--bg-primary));
  border-radius: 16px;
  width: 100%;
  max-width: 420px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 25px 80px rgba(0, 0, 0, 0.6);
  color: var(--text-primary);
  position: relative;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h2 {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
  color: var(--text-primary);
}

.btn-close {
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

.btn-close:hover {
  background: var(--bg-hover);
}

form {
  padding: 2rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  font-size: 15px;
  outline: none;
  transition: border-color 0.2s;
  background: var(--bg-input, var(--bg-primary));
  color: var(--text-primary);
}

.form-group input:focus,
.form-group textarea:focus {
  border-color: var(--accent-color);
}

.form-group textarea {
  resize: vertical;
  min-height: 60px;
}

.type-selector {
  display: flex;
  gap: 12px;
}

.type-option {
  flex: 1;
  display: flex !important;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 12px;
  border: 2px solid var(--border-color);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  background: var(--bg-bubble-other, var(--bg-primary));
}

.type-option:hover {
  border-color: var(--accent-color);
}

.type-option.active {
  border-color: var(--accent-color);
  background: var(--bg-hover);
}

.type-option i {
  font-size: 24px;
  color: var(--accent-color);
}

.type-option span {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}

.hidden {
  display: none;
}

.checkbox-label {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  cursor: pointer;
}

.checkbox-label input {
  display: none;
}

.checkmark {
  width: 22px;
  height: 22px;
  border: 2px solid var(--border-color);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s;
  background: var(--bg-input, var(--bg-primary));
}

.checkmark::after {
  content: '';
  width: 12px;
  height: 12px;
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

.checkbox-text {
  display: flex;
  flex-direction: column;
}

.checkbox-text strong {
  font-size: 14px;
  color: var(--text-primary);
  font-weight: 500;
}

.checkbox-text small {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 2px;
}

.agent-section {
  border-top: 1px solid var(--border-color);
  padding-top: 16px;
  margin-top: 16px;
}

.paid-section {
  border-top: 1px solid var(--border-color);
  padding-top: 16px;
  margin-top: 16px;
}

.plans-setup {
  margin-left: 34px;
  margin-top: 12px;
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: 12px;
}

.plans-setup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.plans-setup-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.btn-add-plan {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: var(--accent-color);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-add-plan:hover {
  background: var(--accent-hover);
}

.plans-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 24px;
  color: var(--text-secondary);
  text-align: center;
}

.plans-empty i {
  font-size: 32px;
  opacity: 0.5;
}

.plans-empty span {
  font-size: 13px;
}

.plans-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.plan-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px;
  background: var(--bg-bubble-other, var(--bg-primary));
  border-radius: 10px;
  border: 1px solid var(--border-color);
}

.plan-fields {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.plan-input,
.plan-select {
  padding: 8px 10px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 14px;
  background: var(--bg-input, var(--bg-primary));
  color: var(--text-primary);
  outline: none;
}

.plan-input:focus,
.plan-select:focus {
  border-color: var(--accent-color);
}

.plan-row {
  display: flex;
  gap: 8px;
}

.plan-row .plan-input,
.plan-row .plan-select {
  flex: 1;
}

.plan-row .plan-price {
  flex: 2;
}

.plan-row .plan-duration {
  width: 50px;
  flex: none;
}

.btn-remove-plan {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s;
}

.btn-remove-plan:hover {
  background: var(--bg-hover);
  color: var(--danger-color);
}

.agent-settings {
  margin-left: 34px;
  margin-top: 12px;
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: 12px;
}

.agent-select {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  font-size: 15px;
  outline: none;
  background: var(--bg-input, var(--bg-primary));
  color: var(--text-primary);
  cursor: pointer;
}

.agent-select:focus {
  border-color: var(--accent-color);
}

.loading-hint,
.empty-hint {
  margin-top: 8px;
  font-size: 13px;
  color: var(--text-secondary);
}

.empty-hint {
  color: var(--warning-color, #f59e0b);
}

.hint {
  display: block;
  margin-top: 6px;
  font-size: 12px;
  color: var(--text-secondary);
}

.radio-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.radio-option {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  cursor: pointer;
  padding: 10px 12px;
  border-radius: 8px;
  transition: background 0.2s;
}

.radio-option:hover {
  background: var(--bg-hover);
}

.radio-option input {
  display: none;
}

.radio-mark {
  width: 20px;
  height: 20px;
  border: 2px solid var(--border-color);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2px;
}

.radio-mark::after {
  content: '';
  width: 10px;
  height: 10px;
  background: var(--accent-color);
  border-radius: 50%;
  opacity: 0;
  transition: opacity 0.2s;
}

.radio-option input:checked + .radio-mark {
  border-color: var(--accent-color);
}

.radio-option input:checked + .radio-mark::after {
  opacity: 1;
}

.radio-text {
  display: flex;
  flex-direction: column;
}

.radio-text strong {
  font-size: 14px;
  color: var(--text-primary);
  font-weight: 500;
}

.radio-text small {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 2px;
}

.modal-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}

.btn-primary,
.btn-secondary {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--accent-color);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--accent-hover);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.btn-secondary:hover {
  background: var(--bg-hover);
}

@media (max-width: 480px) {
  .modal-content {
    border-radius: 12px;
    max-height: 95vh;
  }

  .modal-header {
    padding: 16px 20px;
  }

  form {
    padding: 16px 20px;
  }

  .type-option {
    padding: 12px 8px;
  }

  .type-option i {
    font-size: 20px;
  }

  .type-option span {
    font-size: 12px;
  }

  .modal-overlay {
    padding: 10px;
  }
}

/* Стили для загрузки аватарки */
.chat-avatar-upload {
  display: flex;
  align-items: center;
  gap: 16px;
}

.avatar-preview {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 24px;
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
}

.avatar-preview .avatar-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
  border-radius: 50%;
}

.avatar-preview:hover .avatar-overlay {
  opacity: 1;
}

.avatar-preview .avatar-overlay i {
  font-size: 20px;
  color: white;
}

.avatar-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.btn-sm {
  padding: 8px 14px;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-text {
  padding: 4px 8px;
  background: transparent;
  border: none;
  color: var(--danger-color, #ef4444);
  font-size: 13px;
  cursor: pointer;
  text-align: left;
}

.btn-text:hover {
  text-decoration: underline;
}

.field-hint {
  display: block;
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 6px;
}
</style>
