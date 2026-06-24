<script setup lang="ts">
// Презентационная таблица событий broker-а. Summary показывается прямо в строке;
// raw payload открывается отдельной карточкой (audit-triggered) через событие open-raw.
import { formatBrokerTs, summaryPreview, type BrokerEventView } from '../../../shared/brokerOps'

defineProps<{ events: BrokerEventView[] }>()

defineEmits<{ (e: 'open-raw', event: BrokerEventView): void }>()
</script>

<template>
  <div class="brk-table-scroll custom-scrollbar">
    <table class="brk-table">
      <thead>
        <tr>
          <th>Событие</th>
          <th>Источник</th>
          <th>Summary</th>
          <th>Опубликовано</th>
          <th class="brk-th-act">Действие</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="!events.length">
          <td colspan="5" class="brk-empty">Событий нет</td>
        </tr>
        <tr v-for="ev in events" :key="ev.eventId">
          <td>
            <div class="brk-cell-main">{{ ev.eventType }} v{{ ev.eventVersion }}</div>
            <div class="brk-cell-sub">{{ ev.eventId }}</div>
          </td>
          <td>{{ ev.producerModule }}</td>
          <td class="brk-cell-sub brk-cell-summary">{{ summaryPreview(ev.primarySummary) }}</td>
          <td class="brk-cell-sub">{{ formatBrokerTs(ev.publishedAt) }}</td>
          <td class="brk-th-act">
            <button type="button" class="ap-btn ap-btn--sm" @click="$emit('open-raw', ev)">
              <i class="fas fa-file-code"></i> Raw
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
