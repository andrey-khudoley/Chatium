<template>
  <div class="agents-settings">
    <div class="agents-header">
      <h2 class="agents-title">
        <i class="fas fa-robot"></i>
        AI-агенты
      </h2>
    </div>

    <div class="agents-info">
      <p class="info-text">
        <i class="fas fa-info-circle"></i>
        Здесь отображаются системные AI-агенты, доступные в вашем аккаунте Chatium.
        Для управления агентами (создание, редактирование, настройка инструментов) используйте
        <a href="/app/ai-agents" target="_blank">панель управления агентами</a>.
      </p>
    </div>

    <div v-if="loading" class="loading-state">
      <i class="fas fa-spinner fa-spin"></i>
      Загрузка агентов...
    </div>

    <div v-else-if="agents.length === 0" class="empty-state">
      <i class="fas fa-robot"></i>
      <p>В вашем аккаунте пока нет AI-агентов</p>
      <a href="/app/ai-agents" target="_blank" class="create-btn">
        <i class="fas fa-plus"></i>
        Создать агента
      </a>
    </div>

    <div v-else class="agents-list">
      <div v-for="agent in agents" :key="agent.id" class="agent-card">
        <div class="agent-avatar">
          <img v-if="agent.avatarUrl" :src="agent.avatarUrl" :alt="agent.name">
          <div v-else class="avatar-placeholder">
            <i class="fas fa-robot"></i>
          </div>
        </div>
        
        <div class="agent-info">
          <h3 class="agent-name">{{ agent.name }}</h3>
          <p v-if="agent.key" class="agent-key">{{ agent.key }}</p>
          <p v-if="agent.description" class="agent-description">{{ agent.description }}</p>
        </div>

        <div class="agent-status">
          <span :class="['status-badge', agent.isActive ? 'active' : 'inactive']">
            {{ agent.isActive ? 'Активен' : 'Неактивен' }}
          </span>
        </div>
      </div>
    </div>

    <div class="agents-footer">
      <p class="footer-text">
        Агенты могут быть добавлены в групповые чаты через настройки чата.
        В личных чатах с агентами они отвечают автоматически.
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { apiAgentsListRoute } from '../api/agents'

const agents = ref([])
const loading = ref(false)

// Загрузка списка агентов
async function loadAgents() {
  loading.value = true
  try {
    const response = await apiAgentsListRoute.run(ctx)
    if (response.success) {
      agents.value = response.agents
    }
  } catch (error) {
    console.error('Failed to load agents:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadAgents()
})
</script>

<style scoped>
.agents-settings {
  padding: 20px;
}

.agents-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.agents-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.agents-title i {
  color: var(--primary-color);
}

.agents-info {
  margin-bottom: 24px;
  padding: 12px 16px;
  background: var(--bg-secondary);
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.info-text {
  margin: 0;
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.info-text i {
  color: var(--primary-color);
  margin-right: 6px;
}

.info-text a {
  color: var(--primary-color);
  text-decoration: none;
  font-weight: 500;
}

.info-text a:hover {
  text-decoration: underline;
}

.loading-state,
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-secondary);
}

.empty-state i {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state p {
  margin-bottom: 20px;
}

.create-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.2s;
}

.create-btn:hover {
  background: var(--primary-dark);
}

.agents-list {
  display: grid;
  gap: 16px;
}

.agent-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: 12px;
  border: 1px solid var(--border-color);
  transition: all 0.2s;
}

.agent-card:hover {
  border-color: var(--primary-color);
}

.agent-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
}

.agent-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 24px;
}

.agent-info {
  flex: 1;
  min-width: 0;
}

.agent-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 4px;
}

.agent-key {
  font-size: 13px;
  color: var(--primary-color);
  margin: 0 0 8px;
  font-family: monospace;
}

.agent-description {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.4;
}

.agent-status {
  flex-shrink: 0;
}

.status-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.active {
  background: #d1fae5;
  color: #065f46;
}

.status-badge.inactive {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}

.agents-footer {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--border-color);
}

.footer-text {
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary);
  text-align: center;
}
</style>