<template>
  <div class="onboarding-overlay" @click.self="handleOverlayClick">
    <div class="onboarding-modal">
      <div class="onboarding-header">
        <div class="welcome-icon">
          <i class="fas fa-user-plus"></i>
        </div>
        <h1>Добро пожаловать!</h1>
        <p class="subtitle">Заполните оставшиеся данные для завершения настройки профиля</p>
      </div>

      <div class="onboarding-content">
        <!-- Форма -->
        <form @submit.prevent="saveProfile" class="profile-form">
          <!-- Аватар -->
          <div class="avatar-section">
            <div class="avatar-wrapper" @click="openAvatarModal">
              <div v-if="avatarUrl" class="profile-avatar">
                <img :src="avatarUrl" alt="Avatar" />
              </div>
              <div v-else class="profile-avatar placeholder" :style="avatarStyle">
                <span>{{ initials }}</span>
              </div>
              <div class="avatar-overlay">
                <i class="fas fa-camera"></i>
                <span>{{ avatarUrl ? 'Изменить' : 'Добавить' }}</span>
              </div>
            </div>
          </div>

          <!-- Имя -->
          <div class="form-group">
            <label>Имя <span class="required">*</span></label>
            <input 
              v-model="form.firstName" 
              type="text" 
              placeholder="Ваше имя"
              required
            />
          </div>

          <!-- Фамилия -->
          <div class="form-group">
            <label>Фамилия</label>
            <input 
              v-model="form.lastName" 
              type="text" 
              placeholder="Ваша фамилия (опционально)"
            />
          </div>

          <!-- Email (из Chatium, только просмотр) -->
          <div class="form-group">
            <label>Email</label>
            <input 
              v-model="form.email" 
              type="email" 
              placeholder="email@example.com"
              :disabled="!!props.user?.email"
              :class="{ 'disabled-field': !!props.user?.email }"
            />
            <span v-if="props.user?.email" class="field-hint">
              <i class="fas fa-lock"></i> Email подтвержден в Chatium
            </span>
          </div>

          <!-- Телефон (из Chatium, только просмотр) -->
          <div class="form-group">
            <label>Телефон</label>
            <input 
              v-model="form.phone" 
              type="tel" 
              placeholder="+7 (999) 123-45-67"
              :disabled="!!props.user?.phone"
              :class="{ 'disabled-field': !!props.user?.phone }"
            />
            <span v-if="props.user?.phone" class="field-hint">
              <i class="fas fa-lock"></i> Телефон подтвержден в Chatium
            </span>
          </div>

          <!-- Username -->
          <div class="form-group">
            <label>Имя пользователя (username) <span class="required">*</span></label>
            <div class="username-input-wrapper" :class="{ error: errors.username }">
              <span class="username-prefix">@</span>
              <input 
                v-model="form.username" 
                type="text" 
                placeholder="username"
                class="username-input"
              />
            </div>
            <span v-if="errors.username" class="error-text">{{ errors.username }}</span>
            <span v-else class="field-hint">
              <i class="fas fa-info-circle"></i>
              Минимум 3 символа: буквы a-z, цифры и подчёркивание
            </span>
          </div>

          

          <div class="form-actions">
            <button 
              type="submit" 
              :disabled="saving || !isValid"
              class="btn-save"
            >
              <i v-if="saving" class="fas fa-spinner fa-spin"></i>
              <span v-else>Продолжить</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Модальное окно для аватара -->
    <AvatarCropperModal
      :is-open="showAvatarModal"
      title="Выберите фото профиля"
      save-button-text="Сохранить фото"
      :current-avatar-hash="form.imageHash"
      @close="closeAvatarModal"
      @save="onAvatarSaved"
      @remove="removeAvatar"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import AvatarCropperModal from './AvatarCropperModal.vue'
import { apiProfileUpdateRoute, apiProfileUpdateAvatarRoute } from '../api/profile'

const emit = defineEmits(['complete'])

const props = defineProps({
  user: {
    type: Object,
    default: () => ({})
  }
})

const saving = ref(false)
const showAvatarModal = ref(false)
const errors = ref({})

const form = ref({
  firstName: '',
  lastName: '',
  username: '',
  email: '',
  phone: '',
  imageHash: '',
})

// Вычисляемый URL для аватарки
const avatarUrl = computed(() => {
  if (form.value.imageHash) {
    return `https://fs.chatium.ru/thumbnail/${form.value.imageHash}/s/256x256`
  }
  return null
})

// Инициалы для аватарки-плейсхолдера
const initials = computed(() => {
  const name = form.value.firstName || 'U'
  const lastName = form.value.lastName || ''
  return (name[0] + (lastName[0] || '')).toUpperCase()
})

// Стиль для плейсхолдера аватарки
const avatarStyle = computed(() => {
  const colors = [
    ['#667eea', '#764ba2'],
    ['#f093fb', '#f5576c'],
    ['#4facfe', '#00f2fe'],
    ['#43e97b', '#38f9d7'],
    ['#fa709a', '#fee140'],
  ]
  const index = (props.user?.id?.charCodeAt(0) || 0) % colors.length
  const [from, to] = colors[index]
  return {
    background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`,
  }
})

// Валидация формы - имя и username обязательны
const isValid = computed(() => {
  return form.value.firstName.trim().length >= 2 &&
         form.value.username.trim().length >= 3 &&
         /^[a-zA-Z0-9_]+$/.test(form.value.username)
})

// Валидация перед отправкой
function validate() {
  errors.value = {}
  
  if (!form.value.firstName.trim()) {
    errors.value.firstName = 'Введите имя'
  } else if (form.value.firstName.trim().length < 2) {
    errors.value.firstName = 'Минимум 2 символа'
  }
  
  if (!form.value.username.trim()) {
    errors.value.username = 'Введите имя пользователя'
  } else if (form.value.username.trim().length < 3) {
    errors.value.username = 'Минимум 3 символа'
  } else if (!/^[a-zA-Z0-9_]+$/.test(form.value.username)) {
    errors.value.username = 'Только буквы a-z, цифры и подчёркивание'
  }
  
  return Object.keys(errors.value).length === 0
}

function openAvatarModal() {
  showAvatarModal.value = true
}

function closeAvatarModal() {
  showAvatarModal.value = false
}

async function onAvatarSaved(hash) {
  try {
    await apiProfileUpdateAvatarRoute.run(ctx, { imageHash: hash })
    form.value.imageHash = hash
  } catch (error) {
    console.error('Ошибка обновления аватара:', error)
  }
}

async function removeAvatar() {
  try {
    await apiProfileUpdateAvatarRoute.run(ctx, { imageHash: null })
    form.value.imageHash = ''
  } catch (error) {
    console.error('Ошибка удаления аватара:', error)
  }
}

async function saveProfile() {
  if (!validate()) return
  
  saving.value = true
  try {
    const result = await apiProfileUpdateRoute.run(ctx, {
      firstName: form.value.firstName,
      lastName: form.value.lastName,
      username: form.value.username,
    })
    
    if (result && result.success === false) {
      if (result.error === 'username_taken') {
        errors.value.username = result.message || 'Это имя пользователя уже занято'
      } else {
        errors.value.general = result.message || 'Не удалось сохранить изменения'
      }
      return
    }
    
    emit('complete')
  } catch (error) {
    console.error('Ошибка сохранения профиля:', error)
    errors.value.general = 'Не удалось сохранить изменения. Попробуйте позже.'
  } finally {
    saving.value = false
  }
}

function handleOverlayClick() {
  // Не закрываем при клике на оверлей - пользователь должен заполнить профиль
}

onMounted(() => {
  // Предзаполняем данными из Chatium
  if (props.user) {
    form.value.firstName = props.user.firstName || ''
    form.value.lastName = props.user.lastName || ''
    form.value.username = props.user.username || ''
    form.value.email = props.user.email || ''
    form.value.phone = props.user.phone || ''
    form.value.imageHash = props.user.imageHash || ''
  }
})
</script>

<style scoped>
.onboarding-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3000;
  padding: 20px;
}

.onboarding-modal {
  background: var(--bg-primary);
  border-radius: 20px;
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: var(--shadow-lg);
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.onboarding-header {
  text-align: center;
  padding: 32px 32px 24px;
  background: linear-gradient(135deg, #008069 0%, #005c4b 100%);
  color: white;
  border-radius: 20px 20px 0 0;
}

.welcome-icon {
  width: 72px;
  height: 72px;
  background: rgba(255, 255, 255, 0.25);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
  font-size: 32px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(4px);
}

.onboarding-header h1 {
  font-size: 24px;
  font-weight: 600;
  margin: 0 0 8px;
}

.subtitle {
  font-size: 14px;
  opacity: 0.9;
  margin: 0;
  line-height: 1.5;
}

.onboarding-content {
  padding: 24px 32px 32px;
}

.avatar-section {
  display: flex;
  justify-content: center;
  margin-bottom: 24px;
}

.avatar-wrapper {
  position: relative;
  cursor: pointer;
  border-radius: 50%;
  overflow: hidden;
}

.profile-avatar {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s;
}

.profile-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.profile-avatar.placeholder {
  color: white;
  font-size: 40px;
  font-weight: 600;
}

.avatar-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
  opacity: 0;
  transition: opacity 0.2s;
  border-radius: 50%;
}

.avatar-wrapper:hover .avatar-overlay {
  opacity: 1;
}

.avatar-overlay i {
  font-size: 24px;
  margin-bottom: 4px;
}

.avatar-overlay span {
  font-size: 11px;
  font-weight: 500;
}

.profile-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}

.required {
  color: var(--danger-color);
}

.form-group input,
.form-group select {
  padding: 12px 14px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  font-size: 15px;
  outline: none;
  transition: all 0.2s;
  background: var(--bg-primary);
  color: var(--text-primary);
}

.form-group input:focus,
.form-group select:focus {
  border-color: #008069;
  box-shadow: 0 0 0 3px rgba(0, 128, 105, 0.15);
}

.form-group input.error,
.username-input-wrapper.error {
  border-color: var(--danger-color);
}

.form-group input.disabled-field {
  background: var(--bg-secondary);
  color: var(--text-secondary);
  cursor: not-allowed;
}

.error-text {
  font-size: 12px;
  color: var(--danger-color);
}

.field-hint {
  font-size: 12px;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 6px;
}

.field-hint i {
  font-size: 10px;
  color: var(--accent-primary);
}

.username-input-wrapper {
  display: flex;
  align-items: center;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 0 14px;
  background: var(--bg-primary);
  transition: all 0.2s;
}

.username-input-wrapper:focus-within {
  border-color: #008069;
  box-shadow: 0 0 0 3px rgba(0, 128, 105, 0.15);
}

.username-input-wrapper.error {
  border-color: var(--danger-color);
}

.username-prefix {
  color: var(--text-muted);
  font-size: 16px;
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

.form-actions {
  margin-top: 8px;
}

.btn-save {
  width: 100%;
  padding: 14px;
  background: var(--accent-primary);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s;
}

.btn-save:hover:not(:disabled) {
  background: var(--accent-hover);
}

.btn-save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.info-group {
  background: var(--bg-secondary);
  padding: 12px 16px;
  border-radius: 10px;
}

.info-value {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-primary);
  padding: 8px 0;
}

@media (max-width: 480px) {
  .onboarding-overlay {
    padding: 0;
    align-items: flex-end;
  }
  
  .onboarding-modal {
    max-height: 95vh;
    border-radius: 20px 20px 0 0;
  }
  
  .onboarding-header {
    padding: 24px 24px 20px;
  }
  
  .onboarding-header h1 {
    font-size: 20px;
  }
  
  .onboarding-content {
    padding: 20px 24px 24px;
  }
  
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .profile-avatar {
    width: 80px;
    height: 80px;
  }
  
  .profile-avatar.placeholder {
    font-size: 32px;
  }
}
</style>