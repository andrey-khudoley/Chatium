<script setup lang="ts">
export type BrokerModuleRow = {
  moduleKey: string
  displayName: string
  kind: string
  enabled: boolean
  declaredEnabled: boolean
  adminDisabled: boolean
  allowedPublishTypes: string[]
  allowedSubscribeTypes: string[]
}

defineProps<{
  modules: BrokerModuleRow[]
  loading?: boolean
  actionPending?: string
}>()

defineEmits<{
  (e: 'toggle', row: BrokerModuleRow, enabled: boolean): void
}>()
</script>

<template>
  <div class="broker-table-wrap">
    <table class="broker-table">
      <thead>
        <tr>
          <th>Module</th>
          <th>Kind</th>
          <th>Status</th>
          <th>Publish</th>
          <th>Subscribe</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="loading">
          <td colspan="6" class="broker-empty">
            <i class="fas fa-circle-notch fa-spin"></i> Загрузка
          </td>
        </tr>
        <tr v-else-if="!modules.length">
          <td colspan="6" class="broker-empty">Модули не зарегистрированы</td>
        </tr>
        <tr v-for="item in modules" v-else :key="item.moduleKey">
          <td>
            <strong>{{ item.displayName || item.moduleKey }}</strong>
            <span>{{ item.moduleKey }}</span>
          </td>
          <td>{{ item.kind }}</td>
          <td>
            <span
              class="broker-pill"
              :class="item.enabled ? 'broker-pill--ok' : 'broker-pill--off'"
            >
              {{ item.enabled ? 'enabled' : item.adminDisabled ? 'admin stop' : 'disabled' }}
            </span>
          </td>
          <td>{{ item.allowedPublishTypes.join(', ') || '—' }}</td>
          <td>{{ item.allowedSubscribeTypes.join(', ') || '—' }}</td>
          <td class="broker-actions">
            <button
              type="button"
              class="ap-btn ap-btn--sm"
              :class="{ 'ap-btn--danger': item.enabled }"
              :disabled="!!actionPending"
              @click="$emit('toggle', item, !item.enabled)"
            >
              <i :class="item.enabled ? 'fas fa-ban' : 'fas fa-power-off'"></i>
              {{ item.enabled ? 'Stop' : 'Enable' }}
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
