<template>
  <div class="profile-section">
    <div class="section-header">
      <h2>Настройки приватности</h2>
      <p>Управляйте, кто может писать вам личные сообщения</p>
    </div>

    <div v-if="loading" class="loading-state">
      <i class="fas fa-spinner fa-spin"></i>
      <p>Загрузка настроек...</p>
    </div>

    <template v-else>
      <div class="privacy-form">
        <div class="privacy-option">
          <h3>Кто может писать в личные сообщения</h3>
          <div class="radio-group">
            <label class="radio-item">
              <input 
                type="radio" 
                v-model="settings.allowDirectMessages" 
                value="everyone"
                @change="saveSettings"
              />
              <div class="radio-content">
                <span class="radio-title">
                  <i class="fas fa-globe"></i>
                  Все пользователи
                </span>
                <span class="radio-description">Любой пользователь может написать вам</span>
              </div>
            </label>

            <label class="radio-item">
              <input 
                type="radio" 
                v-model="settings.allowDirectMessages" 
                value="contacts"
                @change="saveSettings"
              />
              <div class="radio-content">
                <span class="radio-title">
                  <i class="fas fa-user-check"></i>
                  Только избранные
                </span>
                <span class="radio-description">Только выбранные вами пользователи могут писать</span>
              </div>
            </label>

            <label class="radio-item">
              <input 
                type="radio" 
                v-model="settings.allowDirectMessages" 
                value="none"
                @change="saveSettings"
              />
              <div class="radio-content">
                <span class="radio-title">
                  <i class="fas fa-ban"></i>
                  Никто
                </span>
                <span class="radio-description">Личные сообщения отключены для всех</span>
              </div>
            </label>
          </div>
        </div>

        <!-- Список избранных пользователей (когда выбран режим "contacts") -->
        <div v-if="settings.allowDirectMessages === 'contacts'" class="allowed-users-section">
          <h3>Избранные пользователи</h3>
          <p class="section-hint">Эти пользователи могут писать вам личные сообщения</p>

          <!-- Поиск пользователей для добавления -->
          <div class="add-user-section">
            <div class="search-box">
              <i class="fas fa-search"></i>
              <input
                type="text"
                v-model="searchQuery"
                @input="onSearchInput"
                @focus="showSearchResults = true"
                @blur="hideSearchResults"
                placeholder="Поиск по username, email или телефону..."
              />
              <i v-if="searching" class="fas fa-spinner fa-spin search-spinner"></i>
              <button
                v-else-if="searchQuery"
                @click="clearSearch"
                class="btn-clear-search"
              >
                <i class="fas fa-times"></i>
              </button>
            </div>

            <!-- Результаты поиска -->
            <div v-if="showSearchResults && (searchResults.length > 0 || (searchQuery && !searching))" class="search-results">
              <div v-if="searchResults.length === 0" class="search-empty">
                <i class="fas fa-user-slash"></i>
                <span>Пользователи не найдены</span>
              </div>
              <div
                v-for="user in searchResults"
                :key="user.id"
                class="search-result-item"
                :class="{ 'already-added': isUserAlreadyAdded(user.id) }"
              >
                <div class="result-avatar" :style="getUserAvatarStyle(user)">
                  <img v-if="user.avatar" :src="user.avatar" />
                  <span v-else>{{ getUserInitials(user) }}</span>
                </div>
                <div class="result-info">
                  <div class="result-name">{{ getUserDisplayName(user) }}</div>
                  <div v-if="user.username" class="result-username">@{{ user.username }}</div>
                </div>
                <button
                  v-if="!isUserAlreadyAdded(user.id)"
                  @click="addAllowedUser(user.id)"
                  class="btn-add"
                  :disabled="addingId === user.id"
                >
                  <i v-if="addingId === user.id" class="fas fa-spinner fa-spin"></i>
                  <i v-else class="fas fa-plus"></i>
                  <span>Добавить</span>
                </button>
                <span v-else class="already-added-label">
                  <i class="fas fa-check"></i>
                  Добавлен
                </span>
              </div>
            </div>
          </div>

          <div v-if="allowedUsersList.length === 0" class="empty-allowed">
            <i class="fas fa-users-slash"></i>
            <p>Список пуст</p>
            <span>Никто не сможет писать вам, пока вы не добавите пользователей</span>
          </div>

          <div v-else class="allowed-list">
            <div v-for="user in allowedUsersList" :key="user.id" class="allowed-item">
              <div class="allowed-avatar" :style="getUserAvatarStyle(user)">
                <img v-if="user.avatar" :src="user.avatar" />
                <span v-else>{{ getUserInitials(user) }}</span>
              </div>
              <div class="allowed-info">
                <div class="allowed-name">{{ getUserDisplayName(user) }}</div>
                <div v-if="user.username" class="allowed-username">@{{ user.username }}</div>
              </div>
              <button 
                @click="removeAllowedUser(user.id)" 
                class="btn-remove"
                :disabled="removingId === user.id"
              >
                <i v-if="removingId === user.id" class="fas fa-spinner fa-spin"></i>
                <i v-else class="fas fa-times"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Уведомление -->
    <div v-if="notification.show" :class="['notification', notification.type, { show: notification.show }]">
      <i :class="notification.icon"></i>
      <span>{{ notification.message }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { apiPrivacySettingsGetRoute, apiPrivacySettingsUpdateRoute, apiPrivacySettingsRemoveAllowedRoute, apiPrivacySettingsAllowUserRoute } from '../api/privacy-settings'
import { apiUsersGetByIdsRoute, apiUsersSearchRoute } from '../api/users'

const loading = ref(true)
const saving = ref(false)
const removingId = ref(null)
const addingId = ref(null)
const allowedUsersList = ref([])
const searchQuery = ref('')
const searchResults = ref([])
const searching = ref(false)
const showSearchResults = ref(false)

const settings = ref({
  allowDirectMessages: 'everyone',
  allowedUsers: [],
  blockedUsers: [],
})

const notification = ref({
  show: false,
  type: 'success',
  message: '',
  icon: 'fas fa-check-circle',
})

function showNotification(message, type = 'success') {
  notification.value = {
    show: true,
    type,
    message,
    icon: type === 'success' ? 'fas fa-check-circle' : 'fas fa-exclamation-circle',
  }
  setTimeout(() => {
    notification.value.show = false
  }, 3000)
}

async function loadSettings() {
  try {
    loading.value = true
    const response = await apiPrivacySettingsGetRoute.run(ctx)
    settings.value = {
      allowDirectMessages: response.allowDirectMessages || 'everyone',
      allowedUsers: response.allowedUsers || [],
      blockedUsers: response.blockedUsers || [],
    }
    
    // Загружаем информацию о разрешенных пользователях
    if (settings.value.allowedUsers.length > 0) {
      await loadAllowedUsersInfo(settings.value.allowedUsers)
    }
  } catch (error) {
    console.error('Ошибка загрузки настроек приватности:', error)
    showNotification('Не удалось загрузить настройки', 'error')
  } finally {
    loading.value = false
  }
}

async function loadAllowedUsersInfo(userIds) {
  try {
    const response = await apiUsersGetByIdsRoute.run(ctx, { ids: userIds })
    allowedUsersList.value = response.users || []
  } catch (error) {
    console.error('Ошибка загрузки пользователей:', error)
    allowedUsersList.value = []
  }
}

async function saveSettings() {
  if (saving.value) return
  
  saving.value = true
  try {
    await apiPrivacySettingsUpdateRoute.run(ctx, {
      allowDirectMessages: settings.value.allowDirectMessages,
    })
    showNotification('Настройки сохранены')
  } catch (error) {
    console.error('Ошибка сохранения настроек:', error)
    showNotification('Не удалось сохранить настройки', 'error')
  } finally {
    saving.value = false
  }
}

async function removeAllowedUser(userId) {
  if (removingId.value) return

  removingId.value = userId
  try {
    await apiPrivacySettingsRemoveAllowedRoute.run(ctx, { userId })
    settings.value.allowedUsers = settings.value.allowedUsers.filter(id => id !== userId)
    allowedUsersList.value = allowedUsersList.value.filter(u => u.id !== userId)
    showNotification('Пользователь удалён из списка')
  } catch (error) {
    console.error('Ошибка удаления пользователя:', error)
    showNotification('Не удалось удалить пользователя', 'error')
  } finally {
    removingId.value = null
  }
}

// Поиск пользователей
let searchTimeout = null
function onSearchInput() {
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }

  if (!searchQuery.value.trim()) {
    searchResults.value = []
    searching.value = false
    return
  }

  searching.value = true
  searchTimeout = setTimeout(() => {
    performSearch()
  }, 300)
}

async function performSearch() {
  if (!searchQuery.value.trim()) {
    searchResults.value = []
    searching.value = false
    return
  }

  try {
    const results = await apiUsersSearchRoute.run(ctx, {
      query: searchQuery.value.trim(),
      limit: 10,
    })
    // Фильтруем текущего пользователя из результатов
    searchResults.value = (results.users || []).filter(u => u.id !== ctx.user?.id)
  } catch (error) {
    console.error('Ошибка поиска:', error)
    searchResults.value = []
  } finally {
    searching.value = false
  }
}

function clearSearch() {
  searchQuery.value = ''
  searchResults.value = []
  showSearchResults.value = false
}

function hideSearchResults() {
  // Небольшая задержка чтобы успеть кликнуть по результату
  setTimeout(() => {
    showSearchResults.value = false
  }, 200)
}

function isUserAlreadyAdded(userId) {
  return settings.value.allowedUsers.includes(userId)
}

async function addAllowedUser(userId) {
  if (addingId.value || isUserAlreadyAdded(userId)) return

  addingId.value = userId
  try {
    await apiPrivacySettingsAllowUserRoute.run(ctx, { userId })

    // Добавляем в список
    settings.value.allowedUsers.push(userId)

    // Загружаем информацию о добавленном пользователе
    const response = await apiUsersGetByIdsRoute.run(ctx, { ids: [userId] })
    if (response.users && response.users.length > 0) {
      allowedUsersList.value.push(response.users[0])
    }

    // Очищаем поиск
    clearSearch()
    showNotification('Пользователь добавлен в избранные')
  } catch (error) {
    console.error('Ошибка добавления пользователя:', error)
    showNotification('Не удалось добавить пользователя', 'error')
  } finally {
    addingId.value = null
  }
}

function getUserDisplayName(user) {
  if (user.firstName) {
    return user.lastName ? `${user.firstName} ${user.lastName}` : user.firstName
  }
  return user.displayName || user.username || 'Пользователь'
}

function getUserInitials(user) {
  const name = user.firstName || user.displayName || 'U'
  const lastName = user.lastName || ''
  return (name[0] + (lastName[0] || '')).toUpperCase()
}

function getUserAvatarStyle(user) {
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

onMounted(() => {
  loadSettings()
})
</script>

<style scoped>
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: var(--text-secondary);
  gap: 16px;
}

.loading-state i {
  font-size: 48px;
}

.privacy-form {
  max-width: 600px;
  margin: 0 auto;
}

.privacy-option h3 {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 16px;
}

.radio-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.radio-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background: var(--bg-primary);
  border: 2px solid var(--border-color);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.radio-item:hover {
  border-color: var(--accent-primary);
}

.radio-item input[type="radio"] {
  margin-top: 2px;
  width: 18px;
  height: 18px;
  accent-color: var(--accent-primary);
}

.radio-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.radio-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 500;
  color: var(--text-primary);
}

.radio-title i {
  width: 20px;
  color: var(--accent-primary);
}

.radio-description {
  font-size: 13px;
  color: var(--text-secondary);
}

.allowed-users-section {
  margin-top: 32px;
  padding-top: 32px;
  border-top: 1px solid var(--border-color);
}

.allowed-users-section h3 {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 8px;
}

.section-hint {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0 0 16px;
}

.empty-allowed {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 20px;
  background: var(--bg-primary);
  border-radius: 12px;
  color: var(--text-secondary);
  text-align: center;
}

.empty-allowed i {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-allowed p {
  font-size: 16px;
  margin-bottom: 8px;
  color: var(--text-primary);
}

.empty-allowed span {
  font-size: 13px;
}

.allowed-list {
  background: var(--bg-primary);
  border-radius: 12px;
  overflow: hidden;
}

.allowed-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
}

.allowed-item:last-child {
  border-bottom: none;
}

.allowed-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 14px;
}

.allowed-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.allowed-info {
  flex: 1;
  min-width: 0;
}

.allowed-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.allowed-username {
  font-size: 12px;
  color: var(--text-secondary);
}

.btn-remove {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 6px;
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.btn-remove:hover:not(:disabled) {
  background: var(--danger-light, #fee2e2);
  color: var(--danger-color);
}

.btn-remove:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Стили для поиска и добавления */
.add-user-section {
  margin-bottom: 24px;
  position: relative;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--bg-secondary);
  border: 2px solid var(--border-color);
  border-radius: 12px;
  transition: all 0.2s;
}

.search-box:focus-within {
  border-color: var(--accent-primary);
  background: var(--bg-primary);
}

.search-box > i:first-child {
  color: var(--text-muted);
  font-size: 16px;
}

.search-box input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 14px;
  color: var(--text-primary);
  outline: none;
}

.search-box input::placeholder {
  color: var(--text-muted);
}

.search-spinner,
.btn-clear-search {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
}

.btn-clear-search {
  background: transparent;
  border: none;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
}

.btn-clear-search:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.search-results {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 8px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  box-shadow: var(--shadow-lg);
  max-height: 300px;
  overflow-y: auto;
  z-index: 100;
}

.search-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px;
  color: var(--text-muted);
  gap: 8px;
}

.search-empty i {
  font-size: 24px;
}

.search-result-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  transition: background 0.2s;
}

.search-result-item:last-child {
  border-bottom: none;
}

.search-result-item:hover:not(.already-added) {
  background: var(--bg-hover);
}

.search-result-item.already-added {
  opacity: 0.6;
}

.result-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 12px;
}

.result-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.result-info {
  flex: 1;
  min-width: 0;
}

.result-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.result-username {
  font-size: 12px;
  color: var(--text-secondary);
}

.btn-add {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: var(--accent-primary);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-add:hover:not(:disabled) {
  background: var(--accent-hover);
}

.btn-add:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.already-added-label {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  color: var(--success-color, #10b981);
  font-size: 13px;
  font-weight: 500;
}

.notification {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%) translateY(100px);
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 24px;
  background: var(--bg-primary);
  border-radius: 12px;
  box-shadow: var(--shadow-lg);
  z-index: 2000;
  opacity: 0;
  transition: all 0.3s ease;
}

.notification.show {
  transform: translateX(-50%) translateY(0);
  opacity: 1;
}

.notification.success {
  border-left: 4px solid var(--success-color, #10b981);
  color: var(--success-color, #10b981);
}

.notification.error {
  border-left: 4px solid var(--danger-color);
  color: var(--danger-color);
}

.notification i {
  font-size: 20px;
}
</style>