<template>
  <div class="invite-wrap">
    <div class="invite-card">
      <div class="invite-logo"><i class="fa-solid fa-shield-halved"></i></div>
      <h1 class="invite-title">Получить доступ к панели управления интеграцией LifePay</h1>

      <div class="invite-user">
        <div class="invite-user-label">Вы войдёте как</div>
        <div class="invite-user-name">{{ userDisplayName }}</div>
        <div v-if="userEmail" class="invite-user-email">{{ userEmail }}</div>
      </div>

      <p v-if="inviteNote" class="invite-note">Комментарий: {{ inviteNote }}</p>
      <p v-if="expiresLabel" class="invite-expires">Ссылка действительна до {{ expiresLabel }}</p>

      <!-- У пользователя уже есть доступ -->
      <template v-if="userAlreadyHasAccess">
        <p class="invite-msg invite-ok">У вас уже есть доступ к панели.</p>
        <a :href="panelHomeUrl" class="invite-btn invite-btn-primary">Перейти в панель</a>
      </template>

      <!-- Подтверждение -->
      <template v-else>
        <p v-if="error" class="invite-msg invite-error">{{ error }}</p>
        <button class="invite-btn invite-btn-primary" :disabled="submitting" @click="confirm">
          <i v-if="submitting" class="fa-solid fa-spinner fa-spin"></i>
          <span>{{ submitting ? 'Подтверждение…' : 'Подтвердить' }}</span>
        </button>
      </template>
    </div>
  </div>
</template>

<script>
export default {
  name: 'InviteAcceptPage',
  props: {
    token: { type: String, default: '' },
    userDisplayName: { type: String, default: '' },
    userEmail: { type: String, default: '' },
    inviteNote: { type: String, default: '' },
    expiresAt: { type: Number, default: 0 },
    consumeApiUrl: { type: String, default: '' },
    panelHomeUrl: { type: String, default: '/' },
    userAlreadyHasAccess: { type: Boolean, default: false }
  },
  data() {
    return {
      submitting: false,
      error: ''
    }
  },
  computed: {
    expiresLabel() {
      if (!this.expiresAt) return ''
      try {
        return new Date(this.expiresAt).toLocaleString('ru-RU')
      } catch (e) {
        return ''
      }
    }
  },
  methods: {
    async confirm() {
      if (this.submitting) return
      this.submitting = true
      this.error = ''
      try {
        const resp = await fetch(this.consumeApiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: this.token })
        })
        const data = await resp.json().catch(() => ({}))
        if (data && data.ok) {
          window.location.href = data.redirectTo || this.panelHomeUrl
          return
        }
        if (data && data.reason === 'already_has_access') {
          window.location.href = data.redirectTo || this.panelHomeUrl
          return
        }
        this.error = this.reasonText(data && data.reason)
      } catch (e) {
        this.error = 'Не удалось подтвердить доступ. Попробуйте ещё раз.'
      } finally {
        this.submitting = false
      }
    },
    reasonText(reason) {
      switch (reason) {
        case 'used':
          return 'Эта ссылка уже была использована.'
        case 'revoked':
          return 'Ссылка отозвана администратором.'
        case 'expired':
          return 'Срок действия ссылки истёк.'
        case 'unknown':
          return 'Ссылка недействительна.'
        default:
          return 'Не удалось получить доступ. Запросите новую ссылку у администратора.'
      }
    }
  }
}
</script>

<style scoped>
.invite-wrap {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: #0a0a0a;
  color: #e8e8e8;
  font-family: 'Share Tech Mono', 'Courier New', monospace;
  letter-spacing: 0.03em;
}
.invite-card {
  max-width: 520px;
  width: 100%;
  background: #141414;
  border: 1px solid #2a2a2a;
  border-radius: 4px;
  padding: 36px 32px;
  text-align: center;
}
.invite-logo {
  font-size: 40px;
  color: #d3234b;
  margin-bottom: 16px;
}
.invite-title {
  font-size: 20px;
  line-height: 1.4;
  margin: 0 0 24px;
  color: #e8e8e8;
}
.invite-user {
  background: #1a1a1a;
  border: 1px solid #2a2a2a;
  border-radius: 3px;
  padding: 16px;
  margin-bottom: 16px;
}
.invite-user-label {
  font-size: 12px;
  color: #707070;
  text-transform: uppercase;
  margin-bottom: 6px;
}
.invite-user-name {
  font-size: 18px;
  color: #e8e8e8;
}
.invite-user-email {
  font-size: 14px;
  color: #a0a0a0;
  margin-top: 4px;
}
.invite-note,
.invite-expires {
  font-size: 13px;
  color: #a0a0a0;
  margin: 0 0 8px;
}
.invite-msg {
  font-size: 14px;
  margin: 16px 0;
}
.invite-ok {
  color: #5cd65c;
}
.invite-error {
  color: #e6395f;
}
.invite-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  padding: 12px 28px;
  border: 1px solid #2a2a2a;
  border-radius: 3px;
  background: transparent;
  color: #e8e8e8;
  font-family: inherit;
  font-size: 15px;
  letter-spacing: 0.03em;
  cursor: pointer;
  text-decoration: none;
}
.invite-btn:hover {
  border-color: #d3234b;
  color: #d3234b;
}
.invite-btn-primary {
  background: #d3234b;
  border-color: #d3234b;
  color: #fff;
}
.invite-btn-primary:hover {
  background: #e6395f;
  border-color: #e6395f;
  color: #fff;
}
.invite-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
