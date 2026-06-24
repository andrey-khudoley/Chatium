<script setup lang="ts">
// Презентационная таблица BPM-модулей broker-а с действием enable/disable.
// Состояние и запросы — в родительской панели; здесь только разметка и события.
import { formatBrokerTs, type BrokerModuleView } from '../../../shared/brokerOps'

defineProps<{ modules: BrokerModuleView[] }>()

defineEmits<{ (e: 'toggle', module: BrokerModuleView): void }>()
</script>

<template>
  <div class="brk-table-scroll custom-scrollbar">
    <table class="brk-table">
      <thead>
        <tr>
          <th>Модуль</th>
          <th>Тип</th>
          <th>Состояние</th>
          <th>Pub / Sub</th>
          <th>Обновлён</th>
          <th class="brk-th-act">Действие</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="!modules.length">
          <td colspan="6" class="brk-empty">Модули не зарегистрированы</td>
        </tr>
        <tr v-for="m in modules" :key="m.moduleKey">
          <td>
            <div class="brk-cell-main">{{ m.displayName || m.moduleKey }}</div>
            <div class="brk-cell-sub">{{ m.moduleKey }}</div>
          </td>
          <td>{{ m.kind }}</td>
          <td>
            <span class="brk-st" :class="m.enabled ? 'brk-st--ok' : 'brk-st--err'">
              {{ m.enabled ? 'включён' : 'выключен' }}
            </span>
            <span v-if="m.adminDisabled" class="brk-tag">admin off</span>
            <span v-else-if="!m.declaredEnabled" class="brk-tag">declared off</span>
          </td>
          <td class="brk-num">
            {{ m.allowedPublishTypes.length }} / {{ m.allowedSubscribeTypes.length }}
          </td>
          <td class="brk-cell-sub">{{ formatBrokerTs(m.updatedAt) }}</td>
          <td class="brk-th-act">
            <button
              type="button"
              class="ap-btn ap-btn--sm"
              :class="{ 'ap-btn--danger': !m.adminDisabled }"
              @click="$emit('toggle', m)"
            >
              <i :class="m.adminDisabled ? 'fas fa-play' : 'fas fa-ban'"></i>
              {{ m.adminDisabled ? 'Включить' : 'Отключить' }}
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
