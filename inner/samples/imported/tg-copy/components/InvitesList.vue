<template>
  <div v-if="invites.length > 0" class="invites-section">
    <div class="invites-header" @click="expanded = !expanded">
      <div class="invites-title">
        <i class="fas fa-envelope"></i>
        <span>Приглашения</span>
        <span v-if="invites.length > 0" class="invites-badge">{{ invites.length }}</span>
      </div>
      <i :class="['fas', expanded ? 'fa-chevron-up' : 'fa-chevron-down']"></i>
    </div>
    
    <div v-if="expanded" class="invites-list">
      <div>
        <div
          v-for="invite in invites"
          :key="invite.id"
          class="invite-item"
        >
          <div class="invite-chat-info">
            <div class="invite-chat-avatar">
              {{ getChatInitials(invite.chat.title) }}
            </div>
            <div class="invite-details">
              <div class="invite-chat-name">{{ invite.chat.title }}</div>
              <div v-if="invite.invitedBy" class="invite-from">
                от {{ invite.invitedBy.displayName }}
              </div>
            </div>
          </div>
          <div class="invite-actions">
            <button @click="acceptInvite(invite.id)" class="btn-accept" title="Принять">
              <i class="fas fa-check"></i>
            </button>
            <button @click="declineInvite(invite.id)" class="btn-decline" title="Отклонить">
              <i class="fas fa-times"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { apiInvitesAcceptRoute, apiInvitesDeclineRoute } from '../api/invites'

const props = defineProps({
  invites: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['accepted', 'declined'])

const expanded = ref(true)

function getChatInitials(title) {
  if (!title) return '?'
  return title.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()
}

async function acceptInvite(inviteId) {
  try {
    const response = await apiInvitesAcceptRoute.run(ctx, { inviteId })
    if (response.success) {
      emit('accepted', response.feedId)
    }
  } catch (err) {
    console.error('Failed to accept invite:', err)
    alert('Не удалось принять приглашение')
  }
}

async function declineInvite(inviteId) {
  try {
    await apiInvitesDeclineRoute.run(ctx, { inviteId })
    emit('declined')
  } catch (err) {
    console.error('Failed to decline invite:', err)
    alert('Не удалось отклонить приглашение')
  }
}
</script>

<style scoped>
.invites-section {
  background: var(--invites-bg);
  border-bottom: 1px solid var(--border-light);
}

.invites-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  cursor: pointer;
  transition: background 0.2s;
}

.invites-header:hover {
  background: var(--invites-header-hover);
}

.invites-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
  color: var(--text-primary);
  font-size: 14px;
}

.invites-title i {
  color: var(--primary-color);
}

.invites-badge {
  background: var(--primary-color);
  color: var(--text-inverse);
  font-size: 11px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 18px;
  text-align: center;
}

.invites-list {
  padding: 0 16px 12px;
}

.invites-empty {
  padding: 16px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 13px;
}

.invite-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: var(--invites-item-bg);
  border-radius: 8px;
  margin-bottom: 8px;
  box-shadow: var(--invites-item-shadow);
}

.invite-chat-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.invite-chat-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 14px;
}

.invite-details {
  flex: 1;
}

.invite-chat-name {
  font-weight: 500;
  color: var(--text-primary);
  font-size: 14px;
}

.invite-from {
  font-size: 12px;
  color: var(--text-secondary);
}

.invite-actions {
  display: flex;
  gap: 6px;
}

.btn-accept,
.btn-decline {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  transition: all 0.2s;
}

.btn-accept {
  background: var(--btn-accept-bg);
  color: var(--btn-accept-text);
}

.btn-accept:hover {
  background: var(--btn-accept-hover-bg);
  color: var(--btn-accept-hover-text);
}

.btn-decline {
  background: var(--btn-decline-bg);
  color: var(--btn-decline-text);
}

.btn-decline:hover {
  background: var(--btn-decline-hover-bg);
  color: var(--btn-decline-hover-text);
}
</style>