<script setup lang="ts">
// Презентация «Монитора логов» страницы тестов (с разворачиванием всех строк).
// Состояние/методы — из composable useLogStream через родителя. CSS глобальный (.tp-log-*).
import { ref, computed } from 'vue'
import type { LogDisplayItem, LogStreamKey } from '../../shared/useLogStream'

const props = defineProps<{
  displayedLogs: LogDisplayItem[]
  logsLoading: boolean
  logsError: string
  logsHasMore: boolean
  selectedLogStream: LogStreamKey
  selectedLogStreamLabel: string
  currentLogCount: number
  expandedLogRows: Record<number, boolean>
  hasAnyExpandedLogRow: boolean
  logStreamKeys: LogStreamKey[]
  logStreamLabels: Record<LogStreamKey, string>
}>()

defineEmits<{
  (e: 'load-more'): void
  (e: 'clear'): void
  (e: 'toggle-filter', stream: LogStreamKey): void
  (e: 'toggle-row', index: number): void
  (e: 'toggle-all'): void
}>()

const hasLogRows = computed(() => props.displayedLogs.some((i) => i.type === 'log'))
const logsOutputRef = ref<HTMLElement | null>(null)
</script>

<template>
  <section class="tp-card tp-log-card">
    <div class="tp-card-hd">
      <h2><i class="fas fa-stream tp-icon-hd"></i> Монитор логов</h2>
      <span class="tp-log-ct">{{ currentLogCount }} зап.</span>
    </div>
    <div class="tp-log-filters">
      <button
        v-for="s in logStreamKeys"
        :key="s"
        type="button"
        class="tp-flt"
        :class="{ active: selectedLogStream === s }"
        @click="$emit('toggle-filter', s)"
      >
        {{ logStreamLabels[s] }}
      </button>
    </div>
    <div v-if="hasLogRows" class="tp-log-toggle-row">
      <button type="button" class="tp-btn tp-btn--toggle-all" @click="$emit('toggle-all')">
        <i :class="hasAnyExpandedLogRow ? 'fas fa-compress-alt' : 'fas fa-expand-alt'"></i>
        {{ hasAnyExpandedLogRow ? 'Свернуть все' : 'Развернуть все' }}
      </button>
    </div>
    <div class="tp-log-out custom-scrollbar" ref="logsOutputRef">
      <div v-if="!displayedLogs.length" class="tp-log-empty">
        <i
          class="fas fa-inbox"
          style="font-size: 1.2rem; display: block; margin-bottom: 0.5rem; opacity: 0.4"
        ></i>
        Поток «{{ selectedLogStreamLabel }}» пуст
      </div>
      <template v-for="(item, index) in displayedLogs" :key="index">
        <div v-if="item.type === 'divider'" class="tp-log-div">
          <span>{{ item.date }}</span>
        </div>
        <div
          v-else
          class="tp-log-row"
          :class="{ expanded: expandedLogRows[index] }"
          @click="$emit('toggle-row', index)"
        >
          <span class="tp-log-t">{{ item.formattedTime }}</span>
          <span class="tp-log-l" :class="`lvl-${item.entry.level}`"
            >[{{ item.entry.level.toUpperCase() }}]</span
          >
          <span class="tp-log-m">{{ item.formattedMessage }}</span>
        </div>
      </template>
    </div>
    <div class="tp-log-ft">
      <span v-if="logsLoading" class="tp-log-sync">
        <i class="fas fa-circle-notch fa-spin"></i> Загрузка...
      </span>
      <p v-if="logsError" class="tp-err">
        <i class="fas fa-exclamation-circle"></i> {{ logsError }}
      </p>
      <div class="tp-log-btns">
        <button
          v-if="logsHasMore && !logsLoading"
          type="button"
          class="tp-btn"
          @click="$emit('load-more')"
        >
          <i class="fas fa-chevron-down"></i> Ещё 50
        </button>
        <button type="button" class="tp-btn tp-btn--danger" @click="$emit('clear')">
          <i class="fas fa-trash-alt"></i> Очистить
        </button>
      </div>
    </div>
  </section>
</template>
