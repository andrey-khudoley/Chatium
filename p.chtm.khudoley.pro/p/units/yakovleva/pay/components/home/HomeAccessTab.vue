<template>
  <section class="panel-section">
    <header class="panel-section-head">
      <span class="prompt">›</span>
      <h2>Управление доступом</h2>
      <button
        type="button"
        class="btn-mini head-action"
        @click="$emit('load-access')"
        title="Обновить"
      >
        <i class="fas fa-rotate"></i> Обновить
      </button>
    </header>

    <p v-if="accessError" class="form-msg is-err">
      <i class="fas fa-circle-exclamation"></i> {{ accessError }}
    </p>

    <!-- Пригласительные ссылки -->
    <div class="access-block">
      <div class="access-block-head">
        <h3><i class="fas fa-link"></i> Пригласительные ссылки</h3>
        <button type="button" class="btn-primary" @click="$emit('open-invite-modal')">
          <i class="fas fa-plus"></i> Создать ссылку
        </button>
      </div>
      <div v-if="invites.length > 0" class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Комментарий</th>
              <th>Создал</th>
              <th>Создан</th>
              <th>Истекает</th>
              <th>Использовал</th>
              <th>Статус</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="inv in invites" :key="inv.inviteId">
              <td>{{ inv.note || '—' }}</td>
              <td>{{ inv.createdByDisplayName }}</td>
              <td>{{ formatTime(inv.issuedAt) }}</td>
              <td>{{ formatTime(inv.expiresAt) }}</td>
              <td>{{ inv.usedByDisplayName || '—' }}</td>
              <td>
                <span :class="inviteStatusClass(inv.status)">{{
                  inviteStatusLabel(inv.status)
                }}</span>
              </td>
              <td>
                <button
                  v-if="inv.status === 'active'"
                  type="button"
                  class="btn-mini"
                  @click="$emit('revoke-invite', inv.inviteId)"
                >
                  <i class="fas fa-ban"></i> Отозвать
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="muted">Пригласительных ссылок пока нет.</p>
    </div>

    <!-- Выданные доступы -->
    <div class="access-block">
      <div class="access-block-head">
        <h3><i class="fas fa-user-check"></i> Выданные доступы</h3>
      </div>
      <div v-if="grants.length > 0" class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Пользователь</th>
              <th>Email</th>
              <th>Выдан</th>
              <th>Кем</th>
              <th>Статус</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="g in grants" :key="g.userId">
              <td>{{ g.userDisplayName }}</td>
              <td>{{ g.userEmail || '—' }}</td>
              <td>{{ formatTime(g.grantedAt) }}</td>
              <td>{{ g.grantedByDisplayName }}</td>
              <td>
                <span :class="g.active ? 'cell-ok' : 'cell-err'">{{
                  g.active ? 'активен' : 'отозван'
                }}</span>
              </td>
              <td>
                <button
                  v-if="g.active"
                  type="button"
                  class="btn-mini"
                  @click="$emit('revoke-grant', g.userId)"
                >
                  <i class="fas fa-ban"></i> Отозвать доступ
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="muted">Выданных доступов пока нет.</p>
    </div>
  </section>
</template>

<script>
// Презентация вкладки «Доступ» (Admin only): пригласительные ссылки + выданные доступы.
// Данные приходят пропсами, действия — через emit (load-access, open-invite-modal,
// revoke-invite, revoke-grant). CSS глобальный (sbpHomeCss*).
import { formatTime, inviteStatusClass, inviteStatusLabel } from '../../shared/sbpHomeFormat'

export default {
  name: 'HomeAccessTab',
  props: {
    invites: { type: Array, default: () => [] },
    grants: { type: Array, default: () => [] },
    accessError: { type: String, default: '' }
  },
  emits: ['load-access', 'open-invite-modal', 'revoke-invite', 'revoke-grant'],
  methods: {
    formatTime,
    inviteStatusClass,
    inviteStatusLabel
  }
}
</script>
