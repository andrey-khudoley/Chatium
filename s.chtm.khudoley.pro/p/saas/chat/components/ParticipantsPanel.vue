<template>
  <aside class="participants-panel">
    <div class="panel-header">
      <h3>{{ isChannel ? 'Подписчики' : 'Участники' }} ({{ filteredParticipants.length }})</h3>
      <button @click="$emit('close')" class="btn-icon">
        <i class="fas fa-times"></i>
      </button>
    </div>

    <!-- Поиск (не для личных чатов) -->
    <div v-if="!isDirectChat" class="panel-search">
      <div class="search-input-wrapper">
        <i class="fas fa-search search-icon"></i>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Поиск по имени или email..."
          class="search-input"
        />
        <button v-if="searchQuery" @click="searchQuery = ''" class="clear-search">
          <i class="fas fa-times"></i>
        </button>
      </div>
    </div>

    <!-- Кнопка пригласить (не для личных чатов) -->
    <div v-if="canManage && !isDirectChat" class="panel-actions">
      <button @click="$emit('invite')" class="btn-primary">
        <i class="fas fa-user-plus"></i>
        {{ isChannel ? 'Пригласить подписчика' : 'Пригласить участника' }}
      </button>
    </div>

    <!-- Список участников -->
    <div class="participants-list" ref="participantsList">
      <div
        v-for="participant in visibleParticipants"
        :key="participant.id"
        class="participant-item"
      >
        <!-- Аватар -->
        <div class="participant-avatar" :style="getParticipantAvatarStyle(participant)">
          <span>{{ getParticipantInitials(participant) }}</span>
        </div>

        <!-- Информация -->
        <div class="participant-info">
          <div class="participant-name-row">
            <span class="participant-name" @click="showParticipantProfile(participant)">
              {{ getUserName(participant.userId) }}
            </span>
            <span
              v-if="getParticipantModeration(participant.userId)"
              class="moderation-badge"
              :title="getModerationTooltip(participant.userId)"
            >
              <i
                class="fas"
                :class="
                  getParticipantModeration(participant.userId).type === 'mute'
                    ? 'fa-volume-mute'
                    : 'fa-ban'
                "
              ></i>
            </span>
          </div>
          <div v-if="participant.user" class="participant-contact">
            {{
              participant.user.email || participant.user.phone || participant.user.username || ''
            }}
          </div>
        </div>

        <!-- Кнопки действий -->
        <div class="participant-actions">
          <!-- Кнопка написать (не для себя и не в личном чате) -->
          <ParticipantDirectChat
            v-if="participant.userId !== currentUserId && !isDirectChat"
            :user-id="participant.userId"
            :user-name="getUserName(participant.userId)"
            @chat-created="$emit('direct-chat-created', $event)"
          />

          <!-- Кнопка профиля -->
          <button @click="showParticipantProfile(participant)" class="btn-icon-sm" title="Профиль">
            <i class="fas fa-user"></i>
          </button>

          <!-- Кнопки модерации (для админов и владельца) -->
          <template
            v-if="canManage && participant.userId !== currentUserId && participant.role !== 'owner'"
          >
            <!-- Снять модерацию -->
            <button
              v-if="getParticipantModeration(participant.userId)"
              @click="
                removeModeration(
                  participant.userId,
                  getParticipantModeration(participant.userId).type
                )
              "
              class="btn-icon-sm btn-moderation-active"
              :title="
                'Снять ' +
                (getParticipantModeration(participant.userId).type === 'mute' ? 'мьют' : 'бан')
              "
            >
              <i class="fas fa-unlock"></i>
            </button>
            <!-- Применить модерацию -->
            <button
              v-else
              @click="$emit('moderate', participant)"
              class="btn-icon-sm"
              title="Модерация"
            >
              <i class="fas fa-gavel"></i>
            </button>

            <!-- Удалить участника -->
            <button
              @click="removeParticipant(participant.userId)"
              class="btn-icon-sm btn-remove"
              title="Удалить"
            >
              <i class="fas fa-times"></i>
            </button>
          </template>
        </div>
      </div>

      <!-- Загрузка дополнительных -->
      <div v-if="hasMoreToLoad" class="load-more-participants">
        <button @click="loadMore" class="btn-load-more" :disabled="loadingMore">
          <i v-if="loadingMore" class="fas fa-spinner fa-spin"></i>
          <span v-else>Загрузить ещё ({{ filteredParticipants.length - visibleCount }})</span>
        </button>
      </div>

      <!-- Пустой результат поиска -->
      <div v-if="filteredParticipants.length === 0 && searchQuery" class="empty-search">
        <i class="fas fa-search"></i>
        <p>Ничего не найдено</p>
      </div>
    </div>

    <!-- Аккордеон с деталями участника (при клике) -->
    <div
      v-if="selectedParticipant"
      class="participant-details-overlay"
      @click="selectedParticipant = null"
    >
      <div class="participant-details" @click.stop>
        <div class="details-header">
          <h4>Информация об участнике</h4>
          <button @click="selectedParticipant = null" class="btn-icon">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <div class="details-content">
          <div class="details-avatar" :style="getParticipantAvatarStyle(selectedParticipant)">
            <span>{{ getParticipantInitials(selectedParticipant) }}</span>
          </div>

          <div class="details-info">
            <h5 class="details-name">{{ getUserName(selectedParticipant.userId) }}</h5>
            <p v-if="selectedParticipant.user?.email" class="details-contact">
              <i class="fas fa-envelope"></i> {{ selectedParticipant.user.email }}
            </p>
            <p v-if="selectedParticipant.user?.phone" class="details-contact">
              <i class="fas fa-phone"></i> {{ selectedParticipant.user.phone }}
            </p>
            <p v-if="selectedParticipant.user?.username" class="details-contact">
              <i class="fas fa-at"></i> {{ selectedParticipant.user.username }}
            </p>
          </div>

          <div class="details-role">
            <span :class="['role-badge', 'role-' + selectedParticipant.role]">
              {{ getRoleLabel(selectedParticipant.role) }}
            </span>
          </div>

          <!-- Смена роли (только для owner и не для себя/владельца) -->
          <div
            v-if="
              isOwner &&
              selectedParticipant.userId !== currentUserId &&
              selectedParticipant.role !== 'owner' &&
              !isDirectChat
            "
            class="details-section"
          >
            <h6>Изменить роль</h6>
            <div class="role-options">
              <button
                v-for="role in availableRoles"
                :key="role.value"
                :class="['role-option', { active: selectedParticipant.role === role.value }]"
                @click="updateRole(selectedParticipant.userId, role.value)"
              >
                {{ role.label }}
              </button>
            </div>
          </div>

          <div class="details-actions">
            <ParticipantDirectChat
              v-if="selectedParticipant.userId !== currentUserId && !isDirectChat"
              :user-id="selectedParticipant.userId"
              :user-name="getUserName(selectedParticipant.userId)"
              @chat-created="
                $emit('direct-chat-created', $event)
                selectedParticipant = null
              "
            />
            <button @click="selectedParticipant = null" class="btn-secondary">Закрыть</button>
          </div>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import ParticipantDirectChat from './ParticipantDirectChat.vue'

const props = defineProps({
  participants: {
    type: Array,
    default: () => []
  },
  currentUserId: String,
  isChannel: Boolean,
  isDirectChat: Boolean,
  canManage: Boolean,
  isOwner: Boolean,
  participantsModerations: {
    type: Map,
    default: () => new Map()
  }
})

const emit = defineEmits([
  'close',
  'invite',
  'remove-participant',
  'update-role',
  'moderate',
  'remove-moderation',
  'direct-chat-created'
])

const searchQuery = ref('')
const selectedParticipant = ref(null)
const visibleCount = ref(200)
const loadingMore = ref(false)

const BATCH_SIZE = 200

// Фильтрация по поиску
const filteredParticipants = computed(() => {
  if (!searchQuery.value.trim()) {
    return props.participants
  }

  const query = searchQuery.value.toLowerCase().trim()
  return props.participants.filter((p) => {
    const name = getUserName(p.userId).toLowerCase()
    const email = p.user?.email?.toLowerCase() || ''
    const phone = p.user?.phone?.toLowerCase() || ''
    const username = p.user?.username?.toLowerCase() || ''

    return (
      name.includes(query) ||
      email.includes(query) ||
      phone.includes(query) ||
      username.includes(query)
    )
  })
})

// Видимые участники (с пагинацией)
const visibleParticipants = computed(() => {
  return filteredParticipants.value.slice(0, visibleCount.value)
})

// Есть ли ещё что загружать
const hasMoreToLoad = computed(() => {
  return filteredParticipants.value.length > visibleCount.value
})

// Загрузить ещё
function loadMore() {
  loadingMore.value = true
  setTimeout(() => {
    visibleCount.value += BATCH_SIZE
    loadingMore.value = false
  }, 100)
}

// Сброс пагинации при изменении поиска
watch(searchQuery, () => {
  visibleCount.value = BATCH_SIZE
})

// Доступные роли
const availableRoles = [
  { value: 'admin', label: 'Администратор' },
  { value: 'guest', label: props.isChannel ? 'Подписчик' : 'Участник' }
]

function getUserName(userId) {
  if (String(userId) === String(props.currentUserId)) return 'Вы'
  const participant = props.participants.find((p) => p.userId === userId)
  if (participant?.user) {
    const name = participant.user.firstName
      ? participant.user.lastName
        ? `${participant.user.firstName} ${participant.user.lastName}`
        : participant.user.firstName
      : participant.user.displayName
    return name || participant.user.username || userId.substring(0, 8)
  }
  return userId.substring(0, 8)
}

function getParticipantInitials(participant) {
  if (participant.user) {
    const firstName = participant.user.firstName
    const lastName = participant.user.lastName
    if (firstName && lastName) {
      return (firstName[0] + lastName[0]).toUpperCase()
    }
    if (firstName) {
      return firstName.substring(0, 2).toUpperCase()
    }
    if (participant.user.displayName) {
      return participant.user.displayName.substring(0, 2).toUpperCase()
    }
  }
  return participant.userId.substring(0, 2).toUpperCase()
}

function getParticipantAvatarStyle(participant) {
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
  const index = participant.userId.charCodeAt(0) % colors.length
  const [from, to] = colors[index]
  return {
    background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`
  }
}

function getRoleLabel(role) {
  const labels = {
    owner: 'Владелец',
    admin: 'Администратор',
    guest: props.isChannel ? 'Подписчик' : 'Участник'
  }
  return labels[role] || role
}

function getParticipantModeration(userId) {
  return props.participantsModerations.get(userId) || null
}

function getModerationTooltip(userId) {
  const mod = getParticipantModeration(userId)
  if (!mod) return ''

  const type = mod.type === 'mute' ? 'Мьют' : 'Бан'
  const expires = mod.isPermanent ? 'навсегда' : `до ${formatModerationExpiry(mod.expiresAt)}`
  return `${type} ${expires}`
}

function formatModerationExpiry(date) {
  if (!date) return ''
  return new Date(date).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function showParticipantProfile(participant) {
  selectedParticipant.value = participant
}

function removeParticipant(userId) {
  if (!confirm('Удалить этого участника?')) return
  emit('remove-participant', userId)
}

function updateRole(userId, role) {
  emit('update-role', { userId, role })
  if (selectedParticipant.value) {
    selectedParticipant.value.role = role
  }
}

function removeModeration(userId, type) {
  emit('remove-moderation', { userId, type })
}
</script>

<style scoped>
.participants-panel {
  width: 320px;
  background: var(--bg-secondary);
  border-left: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  height: 100%;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid var(--border-color);
}

.panel-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.btn-icon {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  font-size: 14px;
  transition: all 0.2s;
}

.btn-icon:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

/* Поиск */
.panel-search {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
}

.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 12px;
  color: var(--text-muted);
  font-size: 14px;
}

.search-input {
  width: 100%;
  padding: 10px 32px 10px 36px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 14px;
  outline: none;
  transition: all 0.2s;
}

.search-input:focus {
  border-color: var(--accent-primary);
}

.clear-search {
  position: absolute;
  right: 8px;
  width: 20px;
  height: 20px;
  border: none;
  background: var(--bg-hover);
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  font-size: 10px;
}

.clear-search:hover {
  background: var(--border-color);
  color: var(--text-primary);
}

/* Кнопка пригласить */
.panel-actions {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
}

.btn-primary {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  background: var(--accent-primary);
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary:hover {
  background: var(--accent-hover);
}

/* Список участников */
.participants-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.participant-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  transition: background 0.2s;
}

.participant-item:hover {
  background: var(--bg-hover);
}

.participant-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  color: white;
  flex-shrink: 0;
}

.participant-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.participant-name-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.participant-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.participant-name:hover {
  color: var(--accent-primary);
}

.participant-contact {
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.moderation-badge {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #ef4444;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 8px;
  flex-shrink: 0;
}

/* Кнопки действий - выровнены в одну линию */
.participant-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.btn-icon-sm {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  font-size: 12px;
  transition: all 0.2s;
}

.btn-icon-sm:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.btn-moderation-active {
  color: #10b981;
}

.btn-moderation-active:hover {
  background: rgba(16, 185, 129, 0.1);
}

.btn-remove {
  color: #ef4444;
}

.btn-remove:hover {
  background: rgba(239, 68, 68, 0.1);
}

/* Загрузка ещё */
.load-more-participants {
  padding: 16px;
  text-align: center;
}

.btn-load-more {
  padding: 8px 16px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-primary);
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-load-more:hover:not(:disabled) {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.btn-load-more:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Пустой поиск */
.empty-search {
  padding: 40px 20px;
  text-align: center;
  color: var(--text-muted);
}

.empty-search i {
  font-size: 32px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.empty-search p {
  margin: 0;
  font-size: 14px;
}

/* Оверлей деталей участника */
.participant-details-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.participant-details {
  background: var(--bg-secondary);
  border-radius: 12px;
  width: 100%;
  max-width: 360px;
  max-height: 90vh;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.details-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
}

.details-header h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.details-content {
  padding: 24px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.details-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  font-weight: 600;
  color: white;
}

.details-info {
  text-align: center;
  width: 100%;
}

.details-name {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.details-contact {
  margin: 4px 0;
  font-size: 13px;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.details-contact i {
  width: 14px;
  color: var(--text-muted);
}

.details-role {
  margin: 8px 0;
}

.role-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.role-owner {
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
}

.role-admin {
  background: rgba(59, 130, 246, 0.15);
  color: #3b82f6;
}

.role-guest {
  background: var(--bg-hover);
  color: var(--text-secondary);
}

/* Секция смены роли */
.details-section {
  width: 100%;
  padding-top: 16px;
  border-top: 1px solid var(--border-color);
}

.details-section h6 {
  margin: 0 0 12px 0;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.role-options {
  display: flex;
  gap: 8px;
}

.role-option {
  flex: 1;
  padding: 10px 16px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.role-option:hover {
  background: var(--bg-hover);
}

.role-option.active {
  border-color: var(--accent-primary);
  background: rgba(0, 128, 105, 0.1);
  color: var(--accent-primary);
}

/* Кнопки в деталях */
.details-actions {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 16px;
  border-top: 1px solid var(--border-color);
}

.btn-secondary {
  width: 100%;
  padding: 10px 16px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary:hover {
  background: var(--bg-hover);
}

/* Адаптивность */
@media (max-width: 768px) {
  .participants-panel {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    width: 100%;
    max-width: 360px;
    z-index: 100;
  }
}

@media (max-width: 480px) {
  .participants-panel {
    max-width: 100%;
  }
}
</style>
