<script setup lang="ts">
// Презентация «Монитора логов» админки. Состояние и методы приходят из
// composable useLogStream (через пропсы/события родителя). CSS — глобальный
// (классы .ap-log-* инжектятся на странице админки).
import { ref } from 'vue'
import type { LogDisplayItem, LogStreamKey } from '../../shared/useLogStream'

defineProps<{
  displayedLogs: LogDisplayItem[]
  logsLoading: boolean
  logsError: string
  logsHasMore: boolean
  selectedLogStream: LogStreamKey
  selectedLogStreamLabel: string
  currentLogCount: number
  expandedLogRows: Record<number, boolean>
  logStreamKeys: LogStreamKey[]
  logStreamLabels: Record<LogStreamKey, string>
}>()

defineEmits<{
  (e: 'load-more'): void
  (e: 'clear'): void
  (e: 'toggle-filter', stream: LogStreamKey): void
  (e: 'toggle-row', index: number): void
}>()

// Ссылка на контейнер списка (соответствует исходной разметке).
const logsOutputRef = ref<HTMLElement | null>(null)
</script>

<template>
  <section class="ap-card ap-logs ap-card--stagger-2">
    <div class="ap-card-hd">
      <h2><i class="fas fa-stream ap-icon-hd"></i> Монитор логов</h2>
      <span class="ap-log-ct">{{ currentLogCount }} зап.</span>
    </div>
    <div class="ap-log-filters">
      <button
        v-for="s in logStreamKeys"
        :key="s"
        type="button"
        class="ap-flt"
        :class="{ active: selectedLogStream === s }"
        @click="$emit('toggle-filter', s)"
      >
        {{ logStreamLabels[s] }}
      </button>
    </div>
    <div class="ap-log-out custom-scrollbar" ref="logsOutputRef">
      <div v-if="!displayedLogs.length" class="ap-log-empty">
        <i
          class="fas fa-inbox"
          style="font-size: 1.2rem; display: block; margin-bottom: 0.5rem; opacity: 0.4"
        ></i>
        Поток «{{ selectedLogStreamLabel }}» пуст
      </div>
      <template v-for="(item, index) in displayedLogs" :key="index">
        <div v-if="item.type === 'divider'" class="ap-log-div">
          <span>{{ item.date }}</span>
        </div>
        <div
          v-else
          class="ap-log-row"
          :class="{ expanded: expandedLogRows[index] }"
          @click="$emit('toggle-row', index)"
        >
          <span class="ap-log-t">{{ item.formattedTime }}</span>
          <span class="ap-log-l" :class="`lvl-${item.entry.level}`"
            >[{{ item.entry.level.toUpperCase() }}]</span
          >
          <span class="ap-log-m">{{ item.formattedMessage }}</span>
        </div>
      </template>
    </div>
    <div class="ap-log-ft">
      <span v-if="logsLoading" class="ap-log-sync">
        <i class="fas fa-circle-notch fa-spin"></i> Загрузка...
      </span>
      <p v-if="logsError" class="ap-err">
        <i class="fas fa-exclamation-circle"></i> {{ logsError }}
      </p>
      <div class="ap-log-btns">
        <button
          v-if="logsHasMore && !logsLoading"
          type="button"
          class="ap-btn"
          @click="$emit('load-more')"
        >
          <i class="fas fa-chevron-down"></i> Ещё 50
        </button>
        <button type="button" class="ap-btn ap-btn--danger" @click="$emit('clear')">
          <i class="fas fa-trash-alt"></i> Очистить
        </button>
      </div>
    </div>
  </section>
</template>
