<script>
// Вкладка «Доступы» (только админ): пригласительные ссылки и выданные доступы.
// Презентация; данные пропсами, действия — эмитами. CSS глобальный (.badge, .data-table).
import { formatDateTime, inviteStatusLabel } from '../../shared/lavatopHomeFormat'

export default {
  name: 'HomeAccessTab',
  props: {
    invites: { type: Array, default: () => [] },
    grants: { type: Array, default: () => [] }
  },
  emits: ['load-invites', 'load-grants', 'open-create-invite', 'revoke-invite', 'revoke-grant'],
  methods: {
    formatDateTime,
    inviteStatusLabel
  }
}
</script>

<template>
  <div>
    <section class="panel-section">
      <header class="panel-section-head">
        <span class="prompt">›</span>
        <h2>Пригласительные ссылки</h2>
        <button
          type="button"
          class="btn-mini head-action"
          @click="$emit('load-invites')"
          title="Обновить"
        >
          <i class="fas fa-rotate"></i>
        </button>
        <button
          type="button"
          class="btn-mini"
          @click="$emit('open-create-invite')"
          title="Создать пригласительную ссылку"
        >
          <i class="fas fa-plus"></i> Создать инвайт
        </button>
      </header>
      <div v-if="invites.length > 0" class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Статус</th>
              <th>Комментарий</th>
              <th>Создал</th>
              <th>Создан</th>
              <th>Истекает</th>
              <th>Использован</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="inv in invites" :key="inv.inviteId">
              <td>
                <span class="badge" :class="'badge-' + inv.status">{{
                  inviteStatusLabel(inv.status)
                }}</span>
              </td>
              <td>{{ inv.note || '—' }}</td>
              <td>{{ inv.createdByDisplayName }}</td>
              <td>{{ formatDateTime(inv.issuedAt) }}</td>
              <td>{{ formatDateTime(inv.expiresAt) }}</td>
              <td>
                {{
                  inv.usedByDisplayName
                    ? `${inv.usedByDisplayName} (${formatDateTime(inv.usedAt)})`
                    : '—'
                }}
              </td>
              <td>
                <button
                  v-if="inv.status === 'active'"
                  class="btn-mini btn-danger"
                  @click="$emit('revoke-invite', inv.inviteId)"
                  title="Отозвать инвайт"
                >
                  <i class="fas fa-ban"></i>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="empty-state">
        <i class="fas fa-link empty-icon"></i>
        <p class="empty-title">Инвайтов пока нет</p>
        <p class="empty-hint">
          Создайте ссылку и передайте её сотруднику, которому нужен доступ к панели.
        </p>
      </div>
    </section>

    <section class="panel-section">
      <header class="panel-section-head">
        <span class="prompt">›</span>
        <h2>Выданные доступы</h2>
        <button
          type="button"
          class="btn-mini head-action"
          @click="$emit('load-grants')"
          title="Обновить"
        >
          <i class="fas fa-rotate"></i>
        </button>
      </header>
      <div v-if="grants.length > 0" class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Статус</th>
              <th>Пользователь</th>
              <th>Email</th>
              <th>Выдан</th>
              <th>Кем</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="g in grants" :key="g.userId" :class="{ 'row-revoked': !g.active }">
              <td>
                <span class="badge" :class="g.active ? 'badge-active' : 'badge-revoked'">{{
                  g.active ? 'активен' : 'отозван'
                }}</span>
              </td>
              <td>{{ g.userDisplayName }}</td>
              <td>{{ g.userEmail || '—' }}</td>
              <td>{{ formatDateTime(g.grantedAt) }}</td>
              <td>{{ g.grantedByDisplayName }}</td>
              <td>
                <button
                  v-if="g.active"
                  class="btn-mini btn-danger"
                  @click="$emit('revoke-grant', g.userId)"
                  title="Отозвать доступ"
                >
                  <i class="fas fa-user-slash"></i>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="empty-state">
        <i class="fas fa-users empty-icon"></i>
        <p class="empty-title">Выданных доступов нет</p>
        <p class="empty-hint">
          Администраторы аккаунта имеют доступ автоматически, без записи здесь.
        </p>
      </div>
    </section>
  </div>
</template>
