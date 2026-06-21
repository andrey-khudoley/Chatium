<template>
  <div class="users-modal-overlay" @click.self="close">
    <div class="users-modal">
      <div class="users-modal-header">
        <h2>
          <i class="fas fa-users"></i>
          Список пользователей
        </h2>
        <button @click="close" class="btn-close">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <div class="users-modal-content">
        <!-- Поиск -->
        <div class="search-box">
          <i class="fas fa-search"></i>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Поиск по имени, username или email..."
          />
          <button v-if="searchQuery" @click="searchQuery = ''" class="clear-btn">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <!-- Статистика -->
        <div class="users-stats">
          <span class="stat-item">
            <i class="fas fa-user"></i>
            Всего: {{ filteredUsers.length }}
          </span>
        </div>

        <!-- Загрузка -->
        <div v-if="isLoading" class="loading-state">
          <i class="fas fa-spinner fa-spin"></i>
          <span>Загрузка пользователей...</span>
        </div>

        <!-- Пустое состояние -->
        <div v-else-if="filteredUsers.length === 0" class="empty-state">
          <i class="fas fa-inbox"></i>
          <p v-if="searchQuery">Ничего не найдено</p>
          <p v-else>Нет пользователей</p>
        </div>

        <!-- Список пользователей -->
        <div v-else class="users-list">
          <div
            v-for="user in filteredUsers"
            :key="user.id"
            class="user-item"
            @click="selectUser(user)"
          >
            <div class="user-avatar" :style="getAvatarStyle(user)">
              <span v-if="!user.hasAvatar && !user.imageUrl">
                {{ getUserInitials(user) }}
              </span>
            </div>
            <div class="user-info">
              <div class="user-name-row">
                <span class="user-name">{{ user.displayName || user.firstName }}</span>
                <span v-if="user.username" class="user-username">@{{ user.username }}</span>
              </div>
              <div class="user-contacts">
                <span v-if="user.email" class="contact-item">
                  <i class="fas fa-envelope"></i>
                  {{ user.email }}
                </span>
                <span v-if="user.phone" class="contact-item">
                  <i class="fas fa-phone"></i>
                  {{ user.phone }}
                </span>
              </div>
              <div class="user-meta">
                <span :class="['role-badge', user.accountRole?.toLowerCase()]">
                  {{ getRoleLabel(user.accountRole) }}
                </span>
                <span v-if="user.createdAt" class="created-date">
                  <i class="fas fa-calendar"></i>
                  {{ formatDate(user.createdAt) }}
                </span>
              </div>
            </div>
            <div class="user-actions">
              <button
                @click.stop="startChatWithUser(user)"
                class="btn-action"
                title="Написать сообщение"
              >
                <i class="fas fa-comment"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { apiUsersListRoute } from '../api/users-list'
import { apiDirectChatCreateRoute } from '../api/direct-chats'

const emit = defineEmits(['close', 'select-user', 'start-chat'])

const isLoading = ref(false)
const users = ref([])
const searchQuery = ref('')

// Фильтрация пользователей по поиску
const filteredUsers = computed(() => {
  if (!searchQuery.value.trim()) {
    return users.value
  }

  const query = searchQuery.value.toLowerCase().trim()
  return users.value.filter(user => {
    const nameMatch = (user.displayName || user.firstName || '').toLowerCase().includes(query)
    const usernameMatch = (user.username || '').toLowerCase().includes(query)
    const emailMatch = (user.email || '').toLowerCase().includes(query)
    const phoneMatch = (user.phone || '').toLowerCase().includes(query)
    return nameMatch || usernameMatch || emailMatch || phoneMatch
  })
})

// Получение инициалов пользователя
function getUserInitials(user) {
  const name = user.firstName || user.displayName || 'U'
  const lastName = user.lastName || ''
  return (name[0] + (lastName[0] || '')).toUpperCase()
}

// Получение стиля для аватарки
function getAvatarStyle(user) {
  if (user.imageHash) {
    return {
      background: `url(https://fs.chatium.ru/thumbnail/${user.imageHash}/s/128x) center/cover no-repeat`,
    }
  }
  if (user.imageUrl) {
    return {
      background: `url(${user.imageUrl}) center/cover no-repeat`,
    }
  }

  // Градиент по умолчанию
  const colors = [
    ['#667eea', '#764ba2'],
    ['#f093fb', '#f5576c'],
    ['#4facfe', '#00f2fe'],
    ['#43e97b', '#38f9d7'],
    ['#fa709a', '#fee140'],
  ]
  const index = (user.id?.charCodeAt(0) || 0) % colors.length
  const [from, to] = colors[index]
  return {
    background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`,
  }
}

// Получение лейбла роли
function getRoleLabel(role) {
  const labels = {
    'Admin': 'Админ',
    'Staff': 'Сотрудник',
    'User': 'Пользователь',
    'Developer': 'Разработчик'
  }
  return labels[role] || role
}

// Форматирование даты
function formatDate(date) {
  if (!date) return ''
  const d = new Date(date)
  return d.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

// Загрузка списка пользователей
async function loadUsers() {
  isLoading.value = true
  try {
    const result = await apiUsersListRoute.run(ctx)
    if (result.success) {
      users.value = result.users
    }
  } catch (error) {
    console.error('Ошибка загрузки пользователей:', error)
  } finally {
    isLoading.value = false
  }
}

// Выбор пользователя
function selectUser(user) {
  emit('select-user', user)
}

// Начать чат с пользователем
async function startChatWithUser(user) {
  try {
    const result = await apiDirectChatCreateRoute.run(ctx, {
      userId: user.id
    })
    if (result.success) {
      emit('start-chat', result.chat)
      close()
    }
  } catch (error) {
    console.error('Ошибка создания чата:', error)
  }
}

// Закрыть модалку
function close() {
  emit('close')
}

onMounted(() => {
  loadUsers()
})
</script>

<style scoped>
.users-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 4000;
  padding: 20px;
}

.users-modal {
  background: var(--bg-primary, #ffffff);
  border-radius: 16px;
  width: 100%;
  max-width: 600px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: modalAppear 0.2s ease;
}

@keyframes modalAppear {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.users-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color, #e5e7eb);
}

.users-modal-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary, #111b21);
  display: flex;
  align-items: center;
  gap: 10px;
}

.users-modal-header h2 i {
  color: #008069;
}

.btn-close {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: var(--text-muted, #667781);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.btn-close:hover {
  background: var(--bg-secondary, #f0f2f5);
  color: var(--text-primary, #111b21);
}

.users-modal-content {
  padding: 20px 24px;
  overflow-y: auto;
  flex: 1;
}

/* Поиск */
.search-box {
  position: relative;
  margin-bottom: 16px;
}

.search-box i {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted, #667781);
  font-size: 14px;
}

.search-box input {
  width: 100%;
  padding: 12px 40px 12px 40px;
  border: 1px solid var(--border-color, #d1d7db);
  border-radius: 10px;
  font-size: 15px;
  background: var(--bg-secondary, #f0f2f5);
  color: var(--text-primary, #111b21);
  outline: none;
  transition: all 0.2s;
}

.search-box input:focus {
  background: var(--bg-primary, #ffffff);
  border-color: #008069;
  box-shadow: 0 0 0 3px rgba(0, 128, 105, 0.1);
}

.search-box input::placeholder {
  color: var(--text-muted, #8696a0);
}

.clear-btn {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  background: var(--text-muted, #667781);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
}

/* Статистика */
.users-stats {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-color, #e5e7eb);
}

.stat-item {
  font-size: 14px;
  color: var(--text-muted, #667781);
  display: flex;
  align-items: center;
  gap: 6px;
}

.stat-item i {
  color: #008069;
}

/* Состояния загрузки и пусто */
.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: var(--text-muted, #667781);
  gap: 12px;
}

.loading-state i,
.empty-state i {
  font-size: 48px;
  opacity: 0.5;
}

.loading-state span,
.empty-state p {
  font-size: 15px;
}

/* Список пользователей */
.users-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.user-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.user-item:hover {
  background: var(--bg-secondary, #f0f2f5);
  border-color: var(--border-color, #e5e7eb);
}

.user-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 18px;
  overflow: hidden;
}

.user-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.user-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.user-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary, #111b21);
}

.user-username {
  font-size: 13px;
  color: var(--text-muted, #667781);
}

.user-contacts {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.contact-item {
  font-size: 13px;
  color: var(--text-muted, #667781);
  display: flex;
  align-items: center;
  gap: 4px;
}

.contact-item i {
  font-size: 11px;
}

.user-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.role-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 20px;
  font-weight: 500;
  text-transform: uppercase;
}

.role-badge.admin {
  background: #fef3c7;
  color: #d97706;
}

.role-badge.staff {
  background: #dbeafe;
  color: #2563eb;
}

.role-badge.developer {
  background: #e0e7ff;
  color: #4f46e5;
}

.role-badge.user {
  background: #f3f4f6;
  color: #6b7280;
}

.created-date {
  font-size: 12px;
  color: var(--text-muted, #667781);
  display: flex;
  align-items: center;
  gap: 4px;
}

.created-date i {
  font-size: 10px;
}

/* Действия */
.user-actions {
  display: flex;
  gap: 8px;
}

.btn-action {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: #008069;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.btn-action:hover {
  background: #005c4b;
  transform: scale(1.05);
}

/* Адаптивность */
@media (max-width: 640px) {
  .users-modal-overlay {
    padding: 0;
    align-items: flex-end;
  }

  .users-modal {
    max-height: 90vh;
    border-radius: 20px 20px 0 0;
  }

  .users-modal-header {
    padding: 16px 20px;
  }

  .users-modal-content {
    padding: 16px 20px;
  }

  .user-contacts {
    flex-direction: column;
    gap: 4px;
  }

  .user-meta {
    flex-wrap: wrap;
    gap: 8px;
  }
}
</style>