<template>
  <div class="profile-view">
    <!-- Сайдбар -->
    <aside class="profile-sidebar">
      <div class="sidebar-header">
        <button @click="$emit('back')" class="btn-back">
          <i class="fas fa-arrow-left"></i>
        </button>
        <h1 class="sidebar-title">Профиль</h1>
      </div>
      
      <nav class="profile-nav">
        <button 
          @click="activeTab = 'general'" 
          :class="['nav-item', { active: activeTab === 'general' }]"
        >
          <i class="fas fa-user"></i>
          <span>Основное</span>
        </button>
        <button 
          @click="activeTab = 'contacts'" 
          :class="['nav-item', { active: activeTab === 'contacts' }]"
        >
          <i class="fas fa-address-card"></i>
          <span>Контакты</span>
        </button>
        <button 
          @click="activeTab = 'security'" 
          :class="['nav-item', { active: activeTab === 'security' }]"
        >
          <i class="fas fa-shield-alt"></i>
          <span>Безопасность</span>
        </button>
        <button 
          @click="activeTab = 'blocked'" 
          :class="['nav-item', { active: activeTab === 'blocked' }]"
        >
          <i class="fas fa-ban"></i>
          <span>Чёрный список</span>
        </button>
        <button 
          @click="activeTab = 'privacy'" 
          :class="['nav-item', { active: activeTab === 'privacy' }]"
        >
          <i class="fas fa-lock"></i>
          <span>Приватность</span>
        </button>

        <button 
          v-if="isAdmin"
          @click="activeTab = 'agents'" 
          :class="['nav-item', { active: activeTab === 'agents' }]"
        >
          <i class="fas fa-robot"></i>
          <span>Агенты</span>
        </button>
        <button 
          v-if="isAdmin"
          @click="activeTab = 'admin'" 
          :class="['nav-item', { active: activeTab === 'admin' }]"
        >
          <i class="fas fa-cog"></i>
          <span>Настройки</span>
        </button>
      </nav>
    </aside>

    <!-- Основная область -->
    <main class="profile-main">
      <div v-if="loading" class="loading-state">
        <i class="fas fa-spinner fa-spin"></i>
        <p>Загрузка профиля...</p>
      </div>

      <template v-else>
        <!-- Вкладка Основное -->
        <div v-if="activeTab === 'general'" class="profile-section">
          <div class="section-header">
            <h2>Основная информация</h2>
            <p>Управляйте своим именем и личными данными</p>
          </div>

          <!-- Аватар -->
          <div class="avatar-section">
            <div class="avatar-wrapper">
              <div v-if="avatarUrl" class="profile-avatar">
                <img :src="avatarUrl" alt="Avatar" />
              </div>
              <div v-else class="profile-avatar placeholder">
                <span>{{ getUserInitials() }}</span>
              </div>
              <button @click="openAvatarModal" class="btn-change-avatar">
                <i class="fas fa-camera"></i>
              </button>
            </div>
            <p class="avatar-hint">Нажмите на аватар, чтобы изменить фото</p>
          </div>

          <!-- Форма редактирования -->
          <form @submit.prevent="saveProfile" class="profile-form">
            <div class="form-row">
              <div class="form-group">
                <label>Имя</label>
                <input 
                  v-model="editForm.firstName" 
                  type="text" 
                  placeholder="Ваше имя"
                />
              </div>
              <div class="form-group">
                <label>Фамилия</label>
                <input 
                  v-model="editForm.lastName" 
                  type="text" 
                  placeholder="Ваша фамилия"
                />
              </div>
            </div>

            <div class="form-group">
              <label>Имя пользователя (username)</label>
              <div class="username-input-wrapper">
                <span class="username-prefix">@</span>
                <input 
                  v-model="editForm.username" 
                  type="text" 
                  placeholder="username"
                  class="username-input"
                />
              </div>
              <span class="field-hint">Используется для поиска и приглашений в чаты</span>
              <span class="field-hint username-requirements">
                <i class="fas fa-info-circle"></i>
                Минимум 5 символов, только строчные буквы (a-z), цифры и подчёркивание
              </span>
            </div>

            <div class="form-group">
              <label>Отображаемое имя</label>
              <input 
                :value="profile.displayName" 
                type="text" 
                disabled
                class="disabled"
              />
              <span class="field-hint">Формируется автоматически из имени и фамилии</span>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Пол</label>
                <select v-model="editForm.gender">
                  <option value="">Не указан</option>
                  <option value="male">Мужской</option>
                  <option value="female">Женский</option>
                  <option value="other">Другой</option>
                </select>
              </div>
              <div class="form-group">
                <label>Дата рождения</label>
                <input 
                  v-model="editForm.birthday" 
                  type="date"
                />
              </div>
            </div>

            <div class="form-actions">
              <button 
                type="submit" 
                :disabled="saving || !hasChanges"
                class="btn-save"
              >
                <i v-if="saving" class="fas fa-spinner fa-spin"></i>
                <span v-else>Сохранить изменения</span>
              </button>
            </div>
          </form>
        </div>

        <!-- Вкладка Контакты -->
        <div v-if="activeTab === 'contacts'" class="profile-section">
          <div class="section-header">
            <h2>Контактная информация</h2>
            <p>Ваши подтвержденные контакты</p>
          </div>

          <div class="contacts-list">
            <div v-if="profile.email" class="contact-item">
              <div class="contact-icon">
                <i class="fas fa-envelope"></i>
              </div>
              <div class="contact-info">
                <span class="contact-label">Email</span>
                <span class="contact-value">{{ profile.email }}</span>
              </div>
              <span class="contact-status verified">
                <i class="fas fa-check-circle"></i>
                Подтверждён
              </span>
            </div>

            <div v-if="profile.phone" class="contact-item">
              <div class="contact-icon">
                <i class="fas fa-phone"></i>
              </div>
              <div class="contact-info">
                <span class="contact-label">Телефон</span>
                <span class="contact-value">{{ profile.phone }}</span>
              </div>
              <span class="contact-status verified">
                <i class="fas fa-check-circle"></i>
                Подтверждён
              </span>
            </div>

            <div class="contact-item">
              <div class="contact-icon">
                <i class="fas fa-id-card"></i>
              </div>
              <div class="contact-info">
                <span class="contact-label">ID пользователя</span>
                <span class="contact-value user-id">{{ profile.id }}</span>
              </div>
              <button @click="copyId" class="btn-copy" title="Копировать ID">
                <i class="fas fa-copy"></i>
              </button>
            </div>
          </div>

          <div class="contacts-info">
            <i class="fas fa-info-circle"></i>
            <p>Изменение email и телефона доступно через настройки безопасности аккаунта Chatium.</p>
          </div>
        </div>

        <!-- Вкладка Безопасность -->
        <div v-if="activeTab === 'security'" class="profile-section">
          <div class="section-header">
            <h2>Безопасность</h2>
            <p>Управление доступом к аккаунту</p>
          </div>

          <div class="security-list">
            <div class="security-item">
              <div class="security-info">
                <span class="security-label">Роль в аккаунте</span>
                <span class="security-value">{{ profile.accountRole }}</span>
              </div>
              <span class="role-badge">{{ profile.accountRole }}</span>
            </div>

            <div class="security-item">
              <div class="security-info">
                <span class="security-label">Пароль</span>
                <span class="security-value">••••••••</span>
              </div>
              <a href="/s/auth/change-password" class="btn-link">
                Изменить
              </a>
            </div>
          </div>
        </div>

        <!-- Вкладка Чёрный список -->
        <div v-if="activeTab === 'blocked'" class="profile-section">
          <div class="section-header">
            <h2>Чёрный список</h2>
            <p>Пользователи, которым вы запретили писать сообщения</p>
          </div>

          <div v-if="loadingBlocked" class="loading-state">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Загрузка...</p>
          </div>

          <div v-else-if="blockedUsers.length === 0" class="empty-blocked">
            <i class="fas fa-shield-alt"></i>
            <p>Чёрный список пуст</p>
            <span>Заблокированные пользователи не смогут писать вам сообщения</span>
          </div>

          <div v-else class="blocked-list">
            <div v-for="blocked in blockedUsers" :key="blocked.id" class="blocked-item">
              <div class="blocked-avatar" :style="getBlockedAvatarStyle(blocked)">
                <img v-if="blocked.user?.avatar" :src="blocked.user.avatar" />
                <span v-else>{{ getBlockedInitials(blocked) }}</span>
              </div>
              <div class="blocked-info">
                <div class="blocked-name">{{ getBlockedName(blocked) }}</div>
                <div v-if="blocked.reason" class="blocked-reason">{{ blocked.reason }}</div>
              </div>
              <button 
                @click="unblockUser(blocked)" 
                class="btn-unblock"
                :disabled="unblockingId === blocked.blockedUserId"
              >
                <i v-if="unblockingId === blocked.blockedUserId" class="fas fa-spinner fa-spin"></i>
                <span v-else>Разблокировать</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Вкладка Приватность -->
        <PrivacySettings v-if="activeTab === 'privacy'" />



        <!-- Вкладка Агенты (только для админов) -->
        <AgentChatsList v-if="activeTab === 'agents'" @chat-created="onAgentChatCreated" />

        <!-- Вкладка Настройки (только для админов) -->
        <AdminSettings v-if="activeTab === 'admin'" />
      </template>
    </main>

    <!-- Модальное окно для аватара с обрезкой -->
    <AvatarCropperModal
      :is-open="showAvatarModal"
      title="Выберите фото профиля"
      save-button-text="Сохранить фото"
      :current-avatar-hash="profile.imageHash || (profile.imageUrl ? profile.imageUrl.split('/').pop() : null)"
      @close="closeAvatarModal"
      @save="onAvatarSaved"
      @remove="removeAvatar"
    />

    <!-- Уведомление -->
    <div v-if="notification.show" :class="['notification', notification.type, { show: notification.show }]">
      <i :class="notification.icon"></i>
      <span>{{ notification.message }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import AgentChatsList from './AgentChatsList.vue'
import { apiProfileGetRoute, apiProfileUpdateRoute, apiProfileUpdateAvatarRoute } from '../api/profile'
import { apiBlockedUsersListRoute, apiBlockedUsersUnblockRoute } from '../api/blocked-users'
import PrivacySettings from './PrivacySettings.vue'
import AvatarCropperModal from './AvatarCropperModal.vue'

import AdminSettings from './AdminSettings.vue'

const emit = defineEmits(['back'])

const loading = ref(true)
const saving = ref(false)
const activeTab = ref('general')
const showAvatarModal = ref(false)
const avatarUploading = ref(false)

const profile = ref({
  id: '',
  displayName: '',
  firstName: '',
  lastName: '',
  username: '',
  email: '',
  phone: '',
  gender: '',
  birthday: '',
  imageUrl: '',
  imageHash: '',
  accountRole: '',
})

// Вычисляемый URL для аватарки с оптимальным размером
const avatarUrl = computed(() => {
  if (profile.value.imageHash) {
    return `https://fs.chatium.ru/thumbnail/${profile.value.imageHash}/s/256x256`
  }
  // Fallback на старый imageUrl если hash нет
  if (profile.value.imageUrl) {
    // Если это уже thumbnail URL, возвращаем как есть
    if (profile.value.imageUrl.includes('/thumbnail/')) {
      return profile.value.imageUrl
    }
    // Если это оригинал, пытаемся сделать thumbnail
    const match = profile.value.imageUrl.match(/\/get\/([a-zA-Z0-9_-]+)/)
    if (match) {
      return `https://fs.chatium.ru/thumbnail/${match[1]}/s/256x256`
    }
    return profile.value.imageUrl
  }
  return null
})

const isAdmin = computed(() => {
  return profile.value.accountRole === 'Admin' || profile.value.accountRole === 'Owner'
})

const editForm = ref({
  firstName: '',
  lastName: '',
  username: '',
  gender: '',
  birthday: '',
})

// ===== Методы для работы с аватаркой =====

function openAvatarModal() {
  showAvatarModal.value = true
}

function closeAvatarModal() {
  showAvatarModal.value = false
}

async function onAvatarSaved(hash) {
  avatarUploading.value = true
  try {
    await apiProfileUpdateAvatarRoute.run(ctx, { imageHash: hash })
    profile.value.imageHash = hash
    profile.value.imageUrl = `https://fs.chatium.ru/get/${hash}`
    showNotification('Аватар успешно обновлён')
    closeAvatarModal()
  } catch (error) {
    console.error('Ошибка обновления аватара:', error)
    showNotification('Не удалось обновить аватар', 'error')
  } finally {
    avatarUploading.value = false
  }
}

async function removeAvatar() {
  if (!confirm('Удалить фото профиля?')) return
  
  try {
    await apiProfileUpdateAvatarRoute.run(ctx, { imageHash: null })
    profile.value.imageHash = ''
    profile.value.imageUrl = ''
    showNotification('Аватар удалён')
    closeAvatarModal()
  } catch (error) {
    console.error('Ошибка удаления аватара:', error)
    showNotification('Не удалось удалить аватар', 'error')
  }
}

const notification = ref({
  show: false,
  type: 'success',
  message: '',
  icon: 'fas fa-check-circle',
})

// Чёрный список
const blockedUsers = ref([])
const loadingBlocked = ref(false)
const unblockingId = ref(null)

const hasChanges = computed(() => {
  return (
    editForm.value.firstName !== (profile.value.firstName || '') ||
    editForm.value.lastName !== (profile.value.lastName || '') ||
    editForm.value.username !== (profile.value.username || '') ||
    editForm.value.gender !== (profile.value.gender || '') ||
    editForm.value.birthday !== (profile.value.birthday || '')
  )
})

function getUserInitials() {
  const name = profile.value.firstName || profile.value.displayName || 'U'
  const lastName = profile.value.lastName || ''
  return (name[0] + (lastName[0] || '')).toUpperCase()
}

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

async function loadProfile() {
  try {
    loading.value = true
    const response = await apiProfileGetRoute.run(ctx)
    profile.value = response.user
    
    editForm.value = {
      firstName: response.user.firstName || '',
      lastName: response.user.lastName || '',
      username: response.user.username || '',
      gender: response.user.gender || '',
      birthday: response.user.birthday || '',
    }
  } catch (error) {
    console.error('Ошибка загрузки профиля:', error)
    showNotification('Не удалось загрузить профиль', 'error')
  } finally {
    loading.value = false
  }
}

async function saveProfile() {
  if (!hasChanges.value) return
  
  saving.value = true
  try {
    const result = await apiProfileUpdateRoute.run(ctx, {
      firstName: editForm.value.firstName,
      lastName: editForm.value.lastName,
      username: editForm.value.username,
      gender: editForm.value.gender,
      birthday: editForm.value.birthday,
    })
    
    if (result && result.success === false) {
      showNotification(result.message || 'Не удалось сохранить изменения', 'error')
      return
    }
    
    profile.value = {
      ...profile.value,
      firstName: editForm.value.firstName,
      lastName: editForm.value.lastName,
      username: editForm.value.username,
      gender: editForm.value.gender,
      birthday: editForm.value.birthday,
    }
    
    showNotification('Профиль успешно обновлён')
  } catch (error) {
    console.error('Ошибка сохранения профиля:', error)
    const errorMessage = error?.response?.data?.message || error?.message || 'Не удалось сохранить изменения'
    showNotification(errorMessage, 'error')
  } finally {
    saving.value = false
  }
}

function copyId() {
  navigator.clipboard.writeText(profile.value.id)
  showNotification('ID скопирован в буфер обмена')
}

function onAgentChatCreated(feedId) {
  showNotification('Чат с агентом создан')
  // Переключаемся на чаты и открываем созданный чат
  setTimeout(() => {
    window.location.hash = `#/chat/${feedId}`
  }, 500)
}

onMounted(() => {
  loadProfile()
  loadBlockedUsers()
})

async function loadBlockedUsers() {
  try {
    loadingBlocked.value = true
    const response = await apiBlockedUsersListRoute.run(ctx)
    blockedUsers.value = response.blockedUsers
  } catch (error) {
    console.error('Ошибка загрузки чёрного списка:', error)
  } finally {
    loadingBlocked.value = false
  }
}

async function unblockUser(blocked) {
  if (unblockingId.value) return
  
  unblockingId.value = blocked.blockedUserId
  try {
    await apiBlockedUsersUnblockRoute.run(ctx, { userId: blocked.blockedUserId })
    blockedUsers.value = blockedUsers.value.filter(b => b.id !== blocked.id)
    showNotification('Пользователь разблокирован')
  } catch (error) {
    console.error('Ошибка разблокировки:', error)
    showNotification('Не удалось разблокировать пользователя', 'error')
  } finally {
    unblockingId.value = null
  }
}

function getBlockedName(blocked) {
  if (!blocked.user) return 'Неизвестный пользователь'
  const name = blocked.user.firstName 
    ? (blocked.user.lastName ? `${blocked.user.firstName} ${blocked.user.lastName}` : blocked.user.firstName)
    : blocked.user.displayName
  return name || blocked.user.username || 'Пользователь'
}

function getBlockedInitials(blocked) {
  if (!blocked.user) return '?'
  const name = blocked.user.firstName || blocked.user.displayName || 'U'
  const lastName = blocked.user.lastName || ''
  return (name[0] + (lastName[0] || '')).toUpperCase()
}

function getBlockedAvatarStyle(blocked) {
  const colors = [
    ['#667eea', '#764ba2'],
    ['#f093fb', '#f5576c'],
    ['#4facfe', '#00f2fe'],
    ['#43e97b', '#38f9d7'],
    ['#fa709a', '#fee140'],
  ]
  const index = (blocked.blockedUserId?.charCodeAt(0) || 0) % colors.length
  const [from, to] = colors[index]
  return {
    background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`,
  }
}
</script>

<style scoped>
.profile-view {
  display: flex;
  height: 100vh;
  background: var(--bg-secondary);
  position: fixed;
  inset: 0;
  z-index: 200;
}

.profile-sidebar {
  width: 320px;
  background: var(--bg-primary);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: var(--primary-color);
  color: white;
}

.btn-back {
  width: 40px;
  height: 40px;
  border: none;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  transition: background 0.2s;
}

.btn-back:hover {
  background: rgba(255, 255, 255, 0.3);
}

.sidebar-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.profile-nav {
  padding: 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  color: var(--text-primary);
  font-size: 15px;
  transition: all 0.2s;
}

.nav-item:hover {
  background: var(--bg-hover);
}

.nav-item.active {
  background: var(--accent-light);
  color: var(--accent-primary);
}

.nav-item i {
  width: 24px;
  text-align: center;
  font-size: 16px;
}

.profile-main {
  flex: 1;
  overflow-y: auto;
  padding: 40px;
  background: var(--bg-secondary);
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-secondary);
  gap: 16px;
}

.loading-state i {
  font-size: 48px;
}

.profile-section {
  max-width: 600px;
  margin: 0 auto;
}

.section-header {
  margin-bottom: 32px;
}

.section-header h2 {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 8px;
}

.section-header p {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0;
}

.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 32px;
}

.avatar-wrapper {
  position: relative;
}

.profile-avatar {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  overflow: hidden;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.profile-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.profile-avatar.placeholder {
  color: white;
  font-size: 48px;
  font-weight: 600;
}

.profile-avatar.placeholder span {
  line-height: 1;
}

.btn-change-avatar {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 40px;
  height: 40px;
  border: none;
  background: var(--primary-color);
  border-radius: 50%;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  box-shadow: var(--shadow-md);
  transition: all 0.2s;
}

.btn-change-avatar:hover {
  background: var(--primary-hover);
  transform: scale(1.1);
}

.avatar-hint {
  margin-top: 12px;
  font-size: 13px;
  color: var(--text-secondary);
}

.profile-form {
  background: var(--bg-primary);
  border-radius: 16px;
  padding: 24px;
  box-shadow: var(--shadow-sm);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  font-size: 15px;
  outline: none;
  transition: border-color 0.2s;
  background: var(--bg-primary);
  color: var(--text-primary);
}

.form-group input:focus,
.form-group select:focus {
  border-color: var(--primary-color);
}

.form-group input:disabled {
  background: var(--bg-secondary);
  color: var(--text-secondary);
}

.field-hint {
  display: block;
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 6px;
}

.field-hint.username-requirements {
  font-size: 11px;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 6px;
}

.field-hint.username-requirements i {
  font-size: 10px;
  color: var(--accent-primary);
}

.form-actions {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid var(--border-color);
}

.btn-save {
  width: 100%;
  padding: 14px;
  background: var(--primary-color);
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

.btn-save:hover:not(:disabled) {
  background: var(--primary-hover);
}

.btn-save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.contacts-list {
  background: var(--bg-primary);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}

.contact-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  border-bottom: 1px solid var(--border-color);
}

.contact-item:last-child {
  border-bottom: none;
}

.contact-icon {
  width: 48px;
  height: 48px;
  background: var(--accent-light);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent-primary);
  font-size: 20px;
}

.contact-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.contact-label {
  font-size: 13px;
  color: var(--text-secondary);
}

.contact-value {
  font-size: 15px;
  color: var(--text-primary);
  font-weight: 500;
}

.contact-value.user-id {
  font-family: monospace;
  font-size: 13px;
  color: var(--text-secondary);
}

.contact-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--success-color, #10b981);
}

.contact-status i {
  font-size: 16px;
}

.btn-copy {
  width: 40px;
  height: 40px;
  border: none;
  background: var(--bg-secondary);
  border-radius: 10px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.btn-copy:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.contacts-info {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-top: 24px;
  padding: 16px;
  background: var(--warning-color, #f59e0b);
  opacity: 0.1;
  border-radius: 12px;
  color: var(--warning-color, #92400e);
}

.contacts-info i {
  font-size: 20px;
  flex-shrink: 0;
}

.contacts-info p {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
}

.security-list {
  background: var(--bg-primary);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}

.security-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  border-bottom: 1px solid var(--border-color);
}

.security-item:last-child {
  border-bottom: none;
}

.security-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.security-label {
  font-size: 13px;
  color: var(--text-secondary);
}

.security-value {
  font-size: 15px;
  color: var(--text-primary);
  font-weight: 500;
}

.role-badge {
  padding: 6px 12px;
  background: var(--accent-light);
  color: var(--accent-primary);
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
  text-transform: capitalize;
}

.btn-link {
  color: var(--accent-primary);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  padding: 8px 16px;
  border-radius: 8px;
  transition: background 0.2s;
}

.btn-link:hover {
  background: var(--accent-light);
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

@media (max-width: 900px) {
  .profile-sidebar {
    width: 240px;
  }
}

@media (max-width: 768px) {
  .profile-view {
    flex-direction: column;
  }
  
  .profile-sidebar {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid var(--border-color);
  }
  
  .profile-nav {
    flex-direction: row;
    padding: 8px;
    overflow-x: auto;
  }
  
  .nav-item {
    white-space: nowrap;
  }
  
  .nav-item span {
    display: none;
  }
  
  .profile-main {
    padding: 20px;
  }
  
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .username-input-wrapper {
    padding: 0 12px;
  }
  
  .username-prefix {
    font-size: 16px;
  }
  
  .username-input {
    padding: 12px 8px;
    font-size: 15px;
  }
}

@media (max-width: 480px) {
  .profile-main {
    padding: 16px;
  }
  
  .profile-avatar {
    width: 100px;
    height: 100px;
  }
  
  .profile-avatar.placeholder {
    font-size: 40px;
  }
  
  .section-header h2 {
    font-size: 20px;
  }
  
  .avatar-modal {
    max-width: 100%;
    margin: 16px;
  }
}

/* Стили для username */
.username-input-wrapper {
  display: flex;
  align-items: center;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 0 16px;
  background: var(--bg-primary);
  transition: border-color 0.2s;
}

.username-input-wrapper:focus-within {
  border-color: var(--primary-color);
}

.username-prefix {
  color: var(--text-muted);
  font-size: 18px;
  font-weight: 500;
  margin-right: 4px;
}

.username-input {
  flex: 1;
  border: none;
  background: transparent;
  padding: 12px 4px;
  font-size: 15px;
  outline: none;
  color: var(--text-primary);
}

.username-input::placeholder {
  color: var(--text-muted);
}

/* Стили для чёрного списка */
.empty-blocked {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 20px;
  color: var(--text-secondary);
  text-align: center;
}

.empty-blocked i {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-blocked p {
  font-size: 18px;
  margin-bottom: 8px;
  color: var(--text-primary);
}

.empty-blocked span {
  font-size: 14px;
}

.blocked-list {
  background: var(--bg-primary);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}

.blocked-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
}

.blocked-item:last-child {
  border-bottom: none;
}

.blocked-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 16px;
}

.blocked-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.blocked-info {
  flex: 1;
  min-width: 0;
}

.blocked-name {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-primary);
}

.blocked-reason {
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 2px;
}

.btn-unblock {
  padding: 8px 16px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
  white-space: nowrap;
}

.btn-unblock:hover:not(:disabled) {
  background: var(--bg-hover);
}

.btn-unblock:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}


</style>