<template>
  <div class="agent-chats-section">
    <div class="section-header">
      <h2>Чаты с агентами</h2>
      <p>Создавайте личные чаты с AI-агентами для персонального общения</p>
    </div>

    <!-- Список существующих чатов с агентами -->
    <div v-if="loading" class="loading-state">
      <i class="fas fa-spinner fa-spin"></i>
      <p>Загрузка...</p>
    </div>

    <div v-else-if="agentChats.length > 0" class="agent-chats-list">
      <div 
        v-for="chat in agentChats" 
        :key="chat.id"
        class="agent-chat-item"
        @click="openChat(chat.feedId)"
      >
        <div class="agent-chat-avatar" :style="getAvatarStyle(chat)">
          <i class="fas fa-robot"></i>
        </div>
        <div class="agent-chat-info">
          <div class="agent-chat-name">{{ chat.title }}</div>
          <div class="agent-chat-meta">
            <span class="agent-badge"><i class="fas fa-robot"></i> AI-агент</span>
          </div>
        </div>
        <i class="fas fa-chevron-right arrow-icon"></i>
      </div>
    </div>

    <div v-else class="empty-state">
      <i class="fas fa-robot"></i>
      <p>У вас пока нет чатов с агентами</p>
      <span>Создайте первый чат с AI-агентом</span>
    </div>

    <!-- Создание нового чата с агентом -->
    <div class="create-section">
      <h3>Создать чат с агентом</h3>
      
      <div v-if="loadingAgents" class="loading-state small">
        <i class="fas fa-spinner fa-spin"></i>
        <span>Загрузка агентов...</span>
      </div>

      <div v-else-if="availableAgents.length === 0" class="no-agents-hint">
        <i class="fas fa-info-circle"></i>
        <p>Нет доступных агентов.</p>
        <a :href="agentProcessUrl" target="_blank" class="agent-link">
          Создать агента в панели управления
          <i class="fas fa-external-link-alt"></i>
        </a>
      </div>

      <div v-else class="agents-select-list">
        <div
          v-for="agent in availableAgents"
          :key="agent.id"
          class="select-agent-item"
          :class="{ selected: selectedAgentId === agent.id, disabled: creating }"
          @click="!creating && (selectedAgentId = agent.id)"
        >
          <div class="select-agent-avatar" :style="getAgentAvatarStyle(agent)">
            <span v-if="!agent.avatarUrl">{{ getInitials(agent.name) }}</span>
          </div>
          <div class="select-agent-info">
            <div class="select-agent-name">{{ agent.name }}</div>
            <div v-if="agent.description" class="select-agent-desc">{{ agent.description }}</div>
          </div>
          <i v-if="selectedAgentId === agent.id" class="fas fa-check check-icon"></i>
        </div>
      </div>

      <button 
        v-if="availableAgents.length > 0"
        @click="createChatWithAgent"
        class="btn-create"
        :disabled="!selectedAgentId || creating"
      >
        <i v-if="creating" class="fas fa-spinner fa-spin"></i>
        <i v-else class="fas fa-plus"></i>
        <span>{{ creating ? 'Создание...' : 'Создать чат' }}</span>
      </button>
    </div>

    <!-- Информация -->
    <div class="info-box">
      <i class="fas fa-lightbulb"></i>
      <div>
        <strong>Как это работает:</strong>
        <ul>
          <li>Агенты создаются в <a :href="agentProcessUrl" target="_blank">панели управления агентами</a></li>
          <li>В личном чате агент отвечает на все ваши сообщения</li>
          <li>Агент использует цепочки, базы знаний и автоматизации из Chatium</li>
          <li>Вы можете создать несколько чатов с разными агентами</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { apiAgentsListRoute } from '../api/agents'
import { apiDirectChatWithAgentRoute, apiDirectChatsWithAgentsRoute } from '../api/direct-chats'

const emit = defineEmits(['chat-created'])

const agentProcessUrl = '/app/agent-process'

const loading = ref(true)
const loadingAgents = ref(true)
const agentChats = ref([])
const availableAgents = ref([])
const selectedAgentId = ref(null)
const creating = ref(false)

onMounted(async () => {
  await Promise.all([
    loadAgentChats(),
    loadAvailableAgents(),
  ])
})

async function loadAgentChats() {
  try {
    const result = await apiDirectChatsWithAgentsRoute.run(ctx)
    agentChats.value = result.chats || []
  } catch (err) {
    console.error('Failed to load agent chats:', err)
  } finally {
    loading.value = false
  }
}

async function loadAvailableAgents() {
  try {
    const result = await apiAgentsListRoute.run(ctx)
    // Фильтруем агентов, с которыми уже есть чат
    const existingAgentIds = new Set(agentChats.value.map(c => c.agentId))
    availableAgents.value = (result.agents || []).filter(a => !existingAgentIds.has(a.id))
  } catch (err) {
    console.error('Failed to load agents:', err)
  } finally {
    loadingAgents.value = false
  }
}

async function createChatWithAgent() {
  if (!selectedAgentId.value || creating.value) return

  const agent = availableAgents.value.find(a => a.id === selectedAgentId.value)
  if (!agent) return

  creating.value = true
  try {
    const result = await apiDirectChatWithAgentRoute.run(ctx, {
      agentId: agent.id,
      agentKey: agent.key,
      agentName: agent.name,
    })

    if (result.success) {
      emit('chat-created', result.feedId)
      // Перезагружаем списки
      await loadAgentChats()
      await loadAvailableAgents()
      selectedAgentId.value = null
    }
  } catch (err) {
    console.error('Failed to create chat with agent:', err)
    alert(err.message || 'Не удалось создать чат с агентом')
  } finally {
    creating.value = false
  }
}

function openChat(feedId) {
  window.location.hash = `#/chat/${feedId}`
}

function getAvatarStyle(chat) {
  const colors = [
    ['#667eea', '#764ba2'],
    ['#f093fb', '#f5576c'],
    ['#4facfe', '#00f2fe'],
    ['#43e97b', '#38f9d7'],
    ['#fa709a', '#fee140'],
  ]
  const index = (chat.id?.charCodeAt(0) || 0) % colors.length
  const [from, to] = colors[index]
  return {
    background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`,
  }
}

function getAgentAvatarStyle(agent) {
  if (agent.avatarUrl) {
    return {
      background: `url(${agent.avatarUrl}) center/cover no-repeat`,
    }
  }

  const colors = [
    ['#667eea', '#764ba2'],
    ['#f093fb', '#f5576c'],
    ['#4facfe', '#00f2fe'],
    ['#43e97b', '#38f9d7'],
    ['#fa709a', '#fee140'],
  ]
  const index = (agent.id?.charCodeAt(0) || 0) % colors.length
  const [from, to] = colors[index]
  return {
    background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`,
  }
}

function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()
}
</script>

<style scoped>
.agent-chats-section {
  max-width: 600px;
  margin: 0 auto;
}

.section-header {
  margin-bottom: 24px;
}

.section-header h2 {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary, #111b21);
  margin: 0 0 8px;
}

.section-header p {
  font-size: 14px;
  color: var(--text-secondary, #667781);
  margin: 0;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: var(--text-secondary, #667781);
  gap: 12px;
}

.loading-state.small {
  flex-direction: row;
  padding: 20px;
  font-size: 14px;
}

.loading-state i {
  font-size: 32px;
}

.loading-state.small i {
  font-size: 16px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: var(--text-secondary, #667781);
  text-align: center;
  background: var(--bg-primary, #fff);
  border-radius: 16px;
  margin-bottom: 24px;
}

.empty-state i {
  font-size: 48px;
  margin-bottom: 16px;
  color: var(--primary-color, #008069);
  opacity: 0.5;
}

.empty-state p {
  font-size: 16px;
  margin-bottom: 8px;
  color: var(--text-primary, #111b21);
  font-weight: 500;
}

.empty-state span {
  font-size: 14px;
}

.agent-chats-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 24px;
}

.agent-chat-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: var(--bg-primary, #fff);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.05));
}

.agent-chat-item:hover {
  background: var(--bg-hover, #f0f2f5);
  transform: translateX(4px);
}

.agent-chat-avatar {
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

.agent-chat-info {
  flex: 1;
  min-width: 0;
}

.agent-chat-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary, #111b21);
  margin-bottom: 4px;
}

.agent-chat-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.agent-badge {
  font-size: 12px;
  padding: 3px 8px;
  background: #dbeafe;
  color: #1e40af;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.arrow-icon {
  color: var(--text-secondary, #667781);
  font-size: 14px;
}

.create-section {
  background: var(--bg-primary, #fff);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.05));
}

.create-section h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary, #111b21);
  margin: 0 0 16px;
}

.no-agents-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 24px;
  background: #fef3c7;
  border-radius: 12px;
  text-align: center;
}

.no-agents-hint i {
  font-size: 32px;
  color: #92400e;
}

.no-agents-hint p {
  margin: 0;
  color: #92400e;
  font-size: 14px;
}

.agent-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #008069;
  font-weight: 500;
  text-decoration: none;
  font-size: 14px;
}

.agent-link:hover {
  text-decoration: underline;
}

.agents-select-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 240px;
  overflow-y: auto;
  margin-bottom: 16px;
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

.select-agent-item:hover:not(.disabled) {
  background: var(--bg-hover, #e8eaed);
}

.select-agent-item.selected {
  border-color: var(--primary-color, #008069);
  background: #f0fdf4;
}

.select-agent-item.disabled {
  opacity: 0.6;
  cursor: not-allowed;
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
  color: var(--primary-color, #008069);
  font-size: 16px;
}

.btn-create {
  width: 100%;
  padding: 14px;
  background: var(--primary-color, #008069);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s;
}

.btn-create:hover:not(:disabled) {
  background: var(--primary-hover, #007a62);
}

.btn-create:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.info-box {
  display: flex;
  gap: 16px;
  padding: 20px;
  background: #f0fdf4;
  border-radius: 12px;
  border-left: 4px solid var(--primary-color, #008069);
  font-size: 13px;
  color: #166534;
  line-height: 1.6;
}

.info-box > i {
  font-size: 20px;
  color: var(--primary-color, #008069);
  flex-shrink: 0;
}

.info-box strong {
  display: block;
  margin-bottom: 8px;
  color: var(--text-primary, #111b21);
}

.info-box ul {
  margin: 0;
  padding-left: 16px;
}

.info-box li {
  margin-bottom: 4px;
}

.info-box a {
  color: #008069;
  font-weight: 500;
  text-decoration: underline;
}

.info-box a:hover {
  color: #007a62;
}

/* Scrollbar styling */
.agents-select-list::-webkit-scrollbar {
  width: 6px;
}

.agents-select-list::-webkit-scrollbar-track {
  background: transparent;
}

.agents-select-list::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}

.agents-select-list::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.3);
}
</style>