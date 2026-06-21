<template>
  <div class="modal-overlay" @click="$emit('close')">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h2 class="modal-title">
          <i class="fas fa-robot"></i>
          Агенты чата
        </h2>
        <button @click="$emit('close')" class="close-btn">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <div class="modal-body">
        <!-- Информация о работе агентов -->
        <div class="info-banner">
          <i class="fas fa-info-circle"></i>
          <div class="info-content">
            <p><strong>Как работают агенты:</strong></p>
            <ul>
              <li>Агенты создаются в <a :href="agentProcessUrl" target="_blank">панели управления агентами</a></li>
              <li>Добавьте агента в групповой чат — он будет отвечать по настроенным правилам</li>
              <li>Для личного чата с агентом используйте кнопку «Создать чат с агентом» в профиле</li>
              <li>Агенты используют все возможности Chatium: цепочки, базы знаний, автоматизации</li>
            </ul>
          </div>
        </div>

        <!-- Список агентов в чате -->
        <div v-if="loading" class="loading-state">
          <i class="fas fa-spinner fa-spin"></i>
          <span>Загрузка...</span>
        </div>

        <div v-else-if="error" class="error-state">
          <i class="fas fa-exclamation-circle"></i>
          <span>{{ error }}</span>
        </div>

        <div v-else-if="chatAgents.length === 0 && !showAddForm" class="empty-state">
          <i class="fas fa-robot"></i>
          <p>В этом чате пока нет агентов</p>
          <span class="hint">Добавьте AI-агента для автоматических ответов</span>
        </div>

        <div v-else-if="!showAddForm" class="agents-list">
          <div 
            v-for="agent in chatAgents" 
            :key="agent.id"
            class="agent-item"
            :class="{ editing: editingAgent?.id === agent.id }"
          >
            <div class="agent-info">
              <div class="agent-avatar" :style="getAgentAvatarStyle(agent)">
                <span v-if="!agent.avatarUrl">{{ getAgentInitials(agent) }}</span>
              </div>
              <div class="agent-details">
                <div class="agent-name">{{ agent.agentName }}</div>
                <div class="agent-key">@{{ agent.agentKey }}</div>
                <div class="agent-settings">
                  <span class="setting-badge" :class="agent.respondTo">
                    {{ getRespondToLabel(agent.respondTo) }}
                  </span>
                  <span v-if="agent.canScheduleInChat" class="setting-badge">
                    <i class="fas fa-bell"></i> Напоминания
                  </span>
                </div>
              </div>
            </div>

            <div class="agent-actions">
              <button 
                @click="startEdit(agent)" 
                class="btn-icon"
                title="Настройки"
              >
                <i class="fas fa-cog"></i>
              </button>
              <button 
                @click="confirmRemove(agent)" 
                class="btn-icon danger"
                title="Удалить"
              >
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
        </div>

        <!-- Форма добавления агента -->
        <div v-if="showAddForm" class="add-agent-form">
          <h3>Добавить агента</h3>
          
          <div class="form-group">
            <label>Выберите агента</label>
            <div v-if="availableAgents.length === 0" class="no-agents-hint">
              <p>Нет доступных агентов.</p>
              <a :href="agentProcessUrl" target="_blank" class="agent-link">
                <i class="fas fa-external-link-alt"></i>
                Создать агента в панели управления
              </a>
            </div>
            <div v-else class="agents-select-list">
              <div
                v-for="agent in availableAgents"
                :key="agent.id"
                class="select-agent-item"
                :class="{ selected: selectedAgentId === agent.id }"
                @click="selectedAgentId = agent.id"
              >
                <div class="select-agent-avatar" :style="getSystemAgentAvatarStyle(agent)">
                  <span v-if="!agent.avatarUrl">{{ getInitials(agent.name) }}</span>
                </div>
                <div class="select-agent-info">
                  <div class="select-agent-name">{{ agent.name }}</div>
                  <div class="select-agent-desc">{{ agent.description }}</div>
                </div>
                <i v-if="selectedAgentId === agent.id" class="fas fa-check check-icon"></i>
              </div>
            </div>
          </div>

          <div class="form-group">
            <label>Режим ответов</label>
            <select v-model="newAgentSettings.respondTo" class="form-select">
              <option value="mention">Только при упоминании (@Имя)</option>
              <option value="all">На все сообщения</option>
              <option value="admins">Только на сообщения админов</option>
            </select>
          </div>

          <div v-if="newAgentSettings.respondTo === 'mention'" class="form-group">
            <label>Отвечать при упоминании</label>
            <select v-model="newAgentSettings.respondToMention" class="form-select">
              <option value="all">Всем</option>
              <option value="admins">Только админам</option>
            </select>
          </div>

          <div class="form-group checkbox">
            <input 
              type="checkbox" 
              id="canScheduleInChat" 
              v-model="newAgentSettings.canScheduleInChat"
            />
            <label for="canScheduleInChat">
              Может создавать напоминания в чате
            </label>
          </div>

          <div class="form-actions">
            <button @click="cancelAdd" class="btn-secondary">
              Отмена
            </button>
            <button 
              @click="addAgent" 
              class="btn-primary"
              :disabled="!selectedAgentId || adding"
            >
              <i v-if="adding" class="fas fa-spinner fa-spin"></i>
              <span v-else>Добавить</span>
            </button>
          </div>
        </div>

        <!-- Форма редактирования -->
        <div v-if="editingAgent" class="edit-agent-form">
          <h3>Настройки агента</h3>
          
          <div class="form-group">
            <label>Режим ответов</label>
            <select v-model="editSettings.respondTo" class="form-select">
              <option value="mention">Только при упоминании (@Имя)</option>
              <option value="all">На все сообщения</option>
              <option value="admins">Только на сообщения админов</option>
            </select>
          </div>

          <div v-if="editSettings.respondTo === 'mention'" class="form-group">
            <label>Отвечать при упоминании</label>
            <select v-model="editSettings.respondToMention" class="form-select">
              <option value="all">Всем</option>
              <option value="admins">Только админам</option>
            </select>
          </div>

          <div class="form-group checkbox">
            <input 
              type="checkbox" 
              id="editCanScheduleInChat" 
              v-model="editSettings.canScheduleInChat"
            />
            <label for="editCanScheduleInChat">
              Может создавать напоминания в чате
            </label>
          </div>

          <div class="form-actions">
            <button @click="cancelEdit" class="btn-secondary">
              Отмена
            </button>
            <button 
              @click="saveEdit" 
              class="btn-primary"
              :disabled="saving"
            >
              <i v-if="saving" class="fas fa-spinner fa-spin"></i>
              <span v-else>Сохранить</span>
            </button>
          </div>
        </div>
      </div>

      <div v-if="!showAddForm && !editingAgent" class="modal-footer">
        <button @click="startAdd" class="btn-primary btn-full">
          <i class="fas fa-plus"></i>
          Добавить агента
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { 
  apiAgentsByFeedRoute, 
  apiAgentsListRoute, 
  apiAgentsAddRoute, 
  apiAgentsUpdateRoute, 
  apiAgentsRemoveRoute 
} from '../api/agents'

const props = defineProps({
  feedId: {
    type: String,
    required: true
  },
  chatId: {
    type: String,
    required: true
  }
})

const agentProcessUrl = '/app/agent-process'

const emit = defineEmits(['close', 'agent-added', 'agent-removed'])

const loading = ref(true)
const error = ref(null)
const chatAgents = ref([])
const availableAgents = ref([])
const showAddForm = ref(false)
const adding = ref(false)
const saving = ref(false)

const selectedAgentId = ref(null)
const newAgentSettings = ref({
  respondTo: 'mention',
  respondToMention: 'all',
  canScheduleInChat: true
})

const editingAgent = ref(null)
const editSettings = ref({
  respondTo: 'mention',
  respondToMention: 'all',
  canScheduleInChat: true
})

onMounted(async () => {
  await loadChatAgents()
})

async function loadChatAgents() {
  loading.value = true
  error.value = null
  
  try {
    const result = await apiAgentsByFeedRoute({ feedId: props.feedId }).run(ctx)
    chatAgents.value = result.agents || []
  } catch (err) {
    error.value = err.message || 'Не удалось загрузить агентов'
  } finally {
    loading.value = false
  }
}

async function loadAvailableAgents() {
  try {
    const result = await apiAgentsListRoute.run(ctx)
    // Фильтруем агентов, которые уже добавлены в чат
    const existingIds = new Set(chatAgents.value.map(a => a.agentId))
    availableAgents.value = (result.agents || []).filter(a => !existingIds.has(a.id))
  } catch (err) {
    console.error('Failed to load available agents:', err)
  }
}

function startAdd() {
  loadAvailableAgents()
  selectedAgentId.value = null
  newAgentSettings.value = {
    respondTo: 'mention',
    respondToMention: 'all',
    canScheduleInChat: true
  }
  showAddForm.value = true
}

function cancelAdd() {
  showAddForm.value = false
  selectedAgentId.value = null
}

async function addAgent() {
  if (!selectedAgentId.value) return
  
  const selectedAgent = availableAgents.value.find(a => a.id === selectedAgentId.value)
  if (!selectedAgent) return
  
  adding.value = true
  
  try {
    await apiAgentsAddRoute.run(ctx, {
      chatId: props.chatId,
      agentId: selectedAgent.id,
      agentName: selectedAgent.name,
      agentKey: selectedAgent.key || selectedAgent.id,
      respondTo: newAgentSettings.value.respondTo,
      respondToMention: newAgentSettings.value.respondToMention,
      canScheduleInChat: newAgentSettings.value.canScheduleInChat
    })
    
    await loadChatAgents()
    showAddForm.value = false
    selectedAgentId.value = null
    emit('agent-added')
  } catch (err) {
    alert(err.message || 'Не удалось добавить агента')
  } finally {
    adding.value = false
  }
}

function startEdit(agent) {
  editingAgent.value = agent
  editSettings.value = {
    respondTo: agent.respondTo,
    respondToMention: agent.respondToMention,
    canScheduleInChat: agent.canScheduleInChat
  }
}

function cancelEdit() {
  editingAgent.value = null
}

async function saveEdit() {
  if (!editingAgent.value) return
  
  saving.value = true
  
  try {
    await apiAgentsUpdateRoute({ agentId: editingAgent.value.id }).run(ctx, {
      respondTo: editSettings.value.respondTo,
      respondToMention: editSettings.value.respondToMention,
      canScheduleInChat: editSettings.value.canScheduleInChat
    })
    
    await loadChatAgents()
    editingAgent.value = null
  } catch (err) {
    alert(err.message || 'Не удалось сохранить настройки')
  } finally {
    saving.value = false
  }
}

async function confirmRemove(agent) {
  if (!confirm(`Удалить агента "${agent.agentName}" из чата?`)) return
  
  try {
    await apiAgentsRemoveRoute.run(ctx, { agentId: agent.id })
    await loadChatAgents()
    emit('agent-removed')
  } catch (err) {
    alert(err.message || 'Не удалось удалить агента')
  }
}

function getRespondToLabel(value) {
  const labels = {
    mention: 'При @упоминании',
    all: 'На все сообщения',
    admins: 'Только админы'
  }
  return labels[value] || value
}

function getAgentInitials(agent) {
  if (!agent.agentName) return '?'
  return agent.agentName.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()
}

function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()
}

function getAgentAvatarStyle(agent) {
  if (agent.avatarUrl) {
    return {
      background: `url(${agent.avatarUrl}) center/cover no-repeat`
    }
  }
  
  const colors = [
    ['#2AABEE', '#229ED9'],
    ['#f093fb', '#f5576c'],
    ['#4facfe', '#00f2fe'],
    ['#43e97b', '#38f9d7'],
    ['#fa709a', '#fee140']
  ]
  const index = (agent.id?.charCodeAt(0) || 0) % colors.length
  const [from, to] = colors[index]
  return {
    background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`
  }
}

function getSystemAgentAvatarStyle(agent) {
  if (agent.avatarUrl) {
    return {
      background: `url(${agent.avatarUrl}) center/cover no-repeat`
    }
  }
  
  const colors = [
    ['#2AABEE', '#229ED9'],
    ['#f093fb', '#f5576c'],
    ['#4facfe', '#00f2fe'],
    ['#43e97b', '#38f9d7'],
    ['#fa709a', '#fee140']
  ]
  const index = (agent.id?.charCodeAt(0) || 0) % colors.length
  const [from, to] = colors[index]
  return {
    background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`
  }
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
  max-width: 480px;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color, #e0e0e0);
  background: var(--bg-secondary, #f0f2f5);
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary, #111b21);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.modal-title i {
  color: var(--primary-color, #2AABEE);
}

.close-btn {
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

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.info-banner {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: #dbeafe;
  border-radius: 10px;
  margin-bottom: 20px;
  border-left: 4px solid #3b82f6;
}

.info-banner > i {
  font-size: 20px;
  color: #3b82f6;
  flex-shrink: 0;
  margin-top: 2px;
}

.info-content {
  flex: 1;
  font-size: 13px;
  color: #1e3a8a;
}

.info-content p {
  margin: 0 0 8px;
}

.info-content ul {
  margin: 0;
  padding-left: 16px;
}

.info-content li {
  margin-bottom: 4px;
}

.info-content a {
  color: #2AABEE;
  font-weight: 500;
  text-decoration: underline;
}

.info-content a:hover {
  color: #007a62;
}

.modal-footer {
  padding: 16px 20px;
  border-top: 1px solid var(--border-color, #e0e0e0);
}

.loading-state,
.error-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
  gap: 12px;
}

.loading-state i,
.error-state i,
.empty-state i {
  font-size: 48px;
  color: var(--text-secondary, #667781);
}

.error-state i {
  color: #ef4444;
}

.empty-state i {
  color: var(--primary-color, #2AABEE);
}

.empty-state p {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
  color: var(--text-primary, #111b21);
}

.empty-state .hint {
  font-size: 14px;
  color: var(--text-secondary, #667781);
}

.agents-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.agent-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: var(--bg-secondary, #f0f2f5);
  border-radius: 12px;
  transition: background 0.2s;
}

.agent-item:hover {
  background: var(--bg-hover, #e8eaed);
}

.agent-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.agent-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 16px;
  font-weight: 600;
  flex-shrink: 0;
}

.agent-details {
  min-width: 0;
}

.agent-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary, #111b21);
  margin-bottom: 2px;
}

.agent-key {
  font-size: 13px;
  color: var(--text-secondary, #667781);
  margin-bottom: 6px;
}

.agent-settings {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.setting-badge {
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 12px;
  background: var(--bg-primary, #fff);
  color: var(--text-secondary, #667781);
  border: 1px solid var(--border-color, #e0e0e0);
}

.setting-badge.mention {
  background: #dbeafe;
  color: #1e40af;
  border-color: #93c5fd;
}

.setting-badge.all {
  background: #dcfce7;
  color: #166534;
  border-color: #86efac;
}

.setting-badge.admins {
  background: #fef3c7;
  color: #92400e;
  border-color: #fcd34d;
}

.agent-actions {
  display: flex;
  gap: 8px;
}

.btn-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: var(--bg-primary, #fff);
  color: var(--text-secondary, #667781);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.btn-icon:hover {
  background: var(--bg-hover, #e0e2e5);
  color: var(--text-primary, #111b21);
}

.btn-icon.danger:hover {
  background: #fee2e2;
  color: #dc2626;
}

.add-agent-form,
.edit-agent-form {
  padding: 4px;
}

.add-agent-form h3,
.edit-agent-form h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary, #111b21);
  margin: 0 0 16px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary, #111b21);
  margin-bottom: 6px;
}

.form-select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 8px;
  font-size: 14px;
  background: var(--bg-primary, #fff);
  color: var(--text-primary, #111b21);
  cursor: pointer;
}

.form-select:focus {
  outline: none;
  border-color: var(--primary-color, #2AABEE);
}

.form-group.checkbox {
  display: flex;
  align-items: center;
  gap: 10px;
}

.form-group.checkbox input {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.form-group.checkbox label {
  margin: 0;
  cursor: pointer;
  font-weight: 400;
}

.no-agents-hint {
  padding: 16px;
  background: #fef3c7;
  border-radius: 8px;
  font-size: 14px;
  color: #92400e;
  text-align: center;
}

.no-agents-hint p {
  margin: 0 0 12px;
}

.agent-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #2AABEE;
  text-decoration: none;
  font-weight: 500;
  padding: 8px 12px;
  background: white;
  border-radius: 6px;
  transition: background 0.2s;
}

.agent-link:hover {
  background: #f0f2f5;
}

.agents-select-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 240px;
  overflow-y: auto;
}

.select-agent-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--bg-secondary, #f0f2f5);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
}

.select-agent-item:hover {
  background: var(--bg-hover, #e8eaed);
}

.select-agent-item.selected {
  border-color: var(--primary-color, #2AABEE);
  background: #f0fdf4;
}

.select-agent-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 14px;
  font-weight: 600;
  flex-shrink: 0;
}

.select-agent-info {
  flex: 1;
  min-width: 0;
}

.select-agent-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #111b21);
  margin-bottom: 2px;
}

.select-agent-desc {
  font-size: 12px;
  color: var(--text-secondary, #667781);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.check-icon {
  color: var(--primary-color, #2AABEE);
  font-size: 16px;
}

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--border-color, #e0e0e0);
}

.btn-primary,
.btn-secondary {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--primary-color, #2AABEE);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-hover, #007a62);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--bg-secondary, #f0f2f5);
  color: var(--text-primary, #111b21);
}

.btn-secondary:hover {
  background: var(--bg-hover, #e0e2e5);
}

.btn-full {
  width: 100%;
}

/* Scrollbar styling */
.modal-body::-webkit-scrollbar,
.agents-select-list::-webkit-scrollbar {
  width: 6px;
}

.modal-body::-webkit-scrollbar-track,
.agents-select-list::-webkit-scrollbar-track {
  background: transparent;
}

.modal-body::-webkit-scrollbar-thumb,
.agents-select-list::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb, rgba(0, 0, 0, 0.2));
  border-radius: 3px;
}

.modal-body::-webkit-scrollbar-thumb:hover,
.agents-select-list::-webkit-scrollbar-thumb:hover {
  background: var(--scrollbar-thumb-hover, rgba(0, 0, 0, 0.3));
}
</style>