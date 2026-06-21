<template>
  <div class="modal-overlay" @click="$emit('close')">
    <div class="modal-content user-profile-modal" @click.stop>
      <!-- Шапка профиля -->
      <div class="profile-header">
        <button @click="$emit('close')" class="btn-close">
          <i class="fas fa-times"></i>
        </button>
        <div class="profile-photo-container">
          <img v-if="user?.avatar" :src="user.avatar" class="profile-photo" />
          <div v-else class="profile-photo-placeholder" :style="avatarStyle">
            {{ initials }}
          </div>
          <div class="profile-photo-overlay">
            <h2 class="profile-name">{{ displayName }}</h2>
            <p v-if="user?.username" class="profile-username">@{{ user.username }}</p>
          </div>
        </div>
      </div>

      <!-- Информация о пользователе -->
      <div class="profile-body">
        <div v-if="user?.firstName || user?.lastName" class="profile-section">
          <h3>Имя</h3>
          <p>{{ fullName }}</p>
        </div>

        <div v-if="user?.bio" class="profile-section">
          <h3>О себе</h3>
          <p>{{ user.bio }}</p>
        </div>

        <div v-if="user?.phone || user?.email" class="profile-section">
          <h3>Контакты</h3>
          <div v-if="user?.phone" class="contact-row">
            <i class="fas fa-phone"></i>
            <span>{{ user.phone }}</span>
          </div>
          <div v-if="user?.email" class="contact-row">
            <i class="fas fa-envelope"></i>
            <span>{{ user.email }}</span>
          </div>
        </div>
      </div>

      <!-- Действия -->
      <div class="profile-actions">
        <ParticipantDirectChat
          v-if="canMessage"
          :user-id="userId"
          :user-name="displayName"
          @chat-created="onChatCreated"
        />
        <button v-else-if="isCurrentUser" class="btn-current-user" disabled>
          <i class="fas fa-user"></i>
          <span>Это вы</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import ParticipantDirectChat from './ParticipantDirectChat.vue'

const props = defineProps({
  user: Object,
  userId: String
})

const emit = defineEmits(['close', 'start-chat'])

const isCurrentUser = computed(() => {
  return String(props.userId) === String(ctx.user?.id)
})

const canMessage = computed(() => {
  return !isCurrentUser.value && props.userId
})

const displayName = computed(() => {
  if (!props.user) return 'Пользователь'
  if (props.user.firstName) {
    return props.user.lastName
      ? `${props.user.firstName} ${props.user.lastName}`
      : props.user.firstName
  }
  return props.user.displayName || props.user.username || 'Пользователь'
})

const fullName = computed(() => {
  if (!props.user) return ''
  const parts = []
  if (props.user.firstName) parts.push(props.user.firstName)
  if (props.user.lastName) parts.push(props.user.lastName)
  return parts.join(' ')
})

const initials = computed(() => {
  if (!props.user) return '?'
  const name = props.user.firstName || props.user.displayName || props.user.username || 'U'
  const lastName = props.user.lastName || ''
  return (name[0] + (lastName[0] || '')).toUpperCase()
})

const avatarStyle = computed(() => {
  const colors = [
    ['#667eea', '#764ba2'],
    ['#f093fb', '#f5576c'],
    ['#4facfe', '#00f2fe'],
    ['#43e97b', '#38f9d7'],
    ['#fa709a', '#fee140'],
    ['#a8edea', '#fed6e3'],
    ['#d299c2', '#fef9d7'],
    ['#89f7fe', '#66a6ff']
  ]
  const index = (props.userId?.charCodeAt(0) || 0) % colors.length
  const [from, to] = colors[index]
  return {
    background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`
  }
})

const roleLabel = computed(() => {
  const roles = {
    Admin: 'Администратор',
    Staff: 'Сотрудник',
    User: 'Пользователь',
    Owner: 'Владелец'
  }
  return roles[props.user?.accountRole] || props.user?.accountRole
})

function onChatCreated({ feedId, isNew }) {
  emit('start-chat', { feedId, isNew })
  emit('close')
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: var(--bg-primary);
  border-radius: 16px;
  width: 100%;
  max-width: 400px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.profile-header {
  position: relative;
  background: var(--bg-primary);
}

.btn-close {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 36px;
  height: 36px;
  border: none;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 50%;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  transition: all 0.2s;
  z-index: 10;
}

.btn-close:hover {
  background: rgba(0, 0, 0, 0.6);
}

.profile-photo-container {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  overflow: hidden;
}

.profile-photo {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.profile-photo-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 72px;
  font-weight: 600;
  color: white;
}

.profile-photo-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 40px 20px 20px;
  background: linear-gradient(
    to top,
    rgba(0, 0, 0, 0.7) 0%,
    rgba(0, 0, 0, 0.3) 50%,
    transparent 100%
  );
  text-align: center;
}

.profile-name {
  font-size: 24px;
  font-weight: 600;
  margin: 0 0 4px;
  color: white;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
}

.profile-username {
  font-size: 14px;
  margin: 0;
  color: rgba(255, 255, 255, 0.9);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.profile-body {
  padding: 24px;
}

.profile-section {
  margin-bottom: 20px;
}

.profile-section:last-child {
  margin-bottom: 0;
}

.profile-section h3 {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0 0 8px;
}

.profile-section p {
  font-size: 15px;
  color: var(--text-primary);
  margin: 0;
  line-height: 1.5;
}

.contact-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  color: var(--text-primary);
  font-size: 14px;
}

.contact-row i {
  width: 20px;
  text-align: center;
  color: var(--text-secondary);
}

.profile-actions {
  padding: 0 24px 24px;
  display: flex;
  justify-content: center;
}

.btn-current-user {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  border: none;
  border-radius: 24px;
  font-size: 15px;
  font-weight: 500;
  cursor: default;
}

@media (max-width: 480px) {
  .modal-content {
    max-width: 100%;
    margin: 0 16px;
  }

  .profile-photo-placeholder {
    font-size: 56px;
  }

  .profile-name {
    font-size: 20px;
  }

  .profile-photo-overlay {
    padding: 30px 16px 16px;
  }
}
</style>
