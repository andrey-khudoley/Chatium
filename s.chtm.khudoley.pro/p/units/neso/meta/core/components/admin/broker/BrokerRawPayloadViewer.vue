<script setup lang="ts">
// Просмотр raw payload события. Raw грузится ТОЛЬКО по запросу через
// POST /api/admin/broker/events/raw (audit-triggered). До раскрытия показывается
// primary summary. Поддержка поиска, collapse/expand верхних ключей и ограниченной
// высоты. Редактирование payload/metadata и publish не предоставляются.
import { ref, computed, watch } from 'vue'
import { adminBrokerEventRawRoute } from '../../../api/admin/broker/events/raw'
import { createComponentLogger } from '../../../shared/logger'
import { summaryItemText, type BrokerEventView } from '../../../shared/brokerOps'

const log = createComponentLogger('BrokerRawPayloadViewer')

declare const ctx: app.Ctx

const props = defineProps<{
  visible: boolean
  event: BrokerEventView | null
}>()

const emit = defineEmits<{ (e: 'close'): void }>()

type RawEntry = { key: string; full: string; expandable: boolean }

const loading = ref(false)
const error = ref('')
const loaded = ref(false)
const reason = ref('')
const search = ref('')
const rawEntries = ref<RawEntry[]>([])
const expanded = ref<Record<string, boolean>>({})

const buildEntries = (payload: unknown): RawEntry[] => {
  if (payload === null || payload === undefined) {
    return [{ key: '(payload)', full: String(payload), expandable: false }]
  }
  if (typeof payload !== 'object') {
    return [{ key: '(payload)', full: String(payload), expandable: false }]
  }
  const obj = payload as Record<string, unknown>
  return Object.keys(obj).map((key) => {
    const value = obj[key]
    const isComplex = value !== null && typeof value === 'object'
    const full = isComplex ? JSON.stringify(value, null, 2) : String(value)
    return { key, full, expandable: isComplex || full.length > 80 }
  })
}

const filteredEntries = computed<RawEntry[]>(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return rawEntries.value
  return rawEntries.value.filter(
    (e) => e.key.toLowerCase().includes(q) || e.full.toLowerCase().includes(q)
  )
})

const resetState = () => {
  loading.value = false
  error.value = ''
  loaded.value = false
  reason.value = ''
  search.value = ''
  rawEntries.value = []
  expanded.value = {}
}

const loadRaw = async () => {
  const ev = props.event
  if (!ev || loading.value) return
  const requestedId = ev.eventId
  loading.value = true
  error.value = ''
  try {
    const res = await adminBrokerEventRawRoute.run(ctx, {
      eventId: requestedId,
      reason: reason.value.trim() || undefined
    })
    // Карточку могли закрыть или переоткрыть на другом событии, пока шёл запрос —
    // не применяем ответ к чужому контексту.
    if (!props.visible || props.event?.eventId !== requestedId) return
    const data = res as { success?: boolean; error?: string; payload?: unknown }
    if (data?.success) {
      rawEntries.value = buildEntries(data.payload)
      loaded.value = true
      log.notice('Raw payload загружен', { eventId: requestedId, entries: rawEntries.value.length })
    } else {
      error.value = data?.error || 'Не удалось загрузить raw payload'
      log.error('Ошибка загрузки raw payload', { eventId: requestedId, error: error.value })
    }
  } catch (e) {
    if (!props.visible || props.event?.eventId !== requestedId) return
    error.value = (e as Error)?.message || 'Не удалось загрузить raw payload'
    log.error('Исключение при загрузке raw payload', { eventId: requestedId, error: error.value })
  } finally {
    if (props.event?.eventId === requestedId) loading.value = false
  }
}

const toggleEntry = (key: string) => {
  expanded.value = { ...expanded.value, [key]: !expanded.value[key] }
}

watch(
  () => props.visible,
  (v) => {
    if (v) {
      resetState()
      log.info('Открыт просмотр raw payload', { eventId: props.event?.eventId })
    }
  }
)
</script>

<template>
  <Transition name="brk-modal">
    <div v-if="visible && event" class="brk-modal-overlay" @click="emit('close')">
      <div class="brk-raw" @click.stop>
        <div class="brk-modal-hd">
          <i class="fas fa-file-code"></i>
          <span>{{ event.eventType }} v{{ event.eventVersion }}</span>
          <button type="button" class="ap-btn ap-btn--sm brk-raw-close" @click="emit('close')">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="brk-raw-meta">
          <span class="brk-raw-id">{{ event.eventId }}</span>
          <span class="brk-raw-mod">{{ event.producerModule }}</span>
        </div>

        <div class="brk-raw-sect">
          <h4 class="brk-raw-h">Primary summary</h4>
          <div v-if="!event.primarySummary.length" class="brk-raw-empty">Нет полей summary</div>
          <ul v-else class="brk-raw-summary">
            <li v-for="(item, i) in event.primarySummary" :key="i">
              <span class="brk-raw-skey">{{ item.label }}</span>
              <span class="brk-raw-sval">{{ summaryItemText(item) }}</span>
            </li>
          </ul>
        </div>

        <div class="brk-raw-sect">
          <h4 class="brk-raw-h">Raw payload</h4>
          <div v-if="!loaded" class="brk-raw-load">
            <input
              v-model="reason"
              type="text"
              class="brk-raw-reason"
              placeholder="Причина просмотра (опционально, для аудита)"
              :disabled="loading"
            />
            <button type="button" class="ap-btn ap-btn--sm" :disabled="loading" @click="loadRaw">
              <i v-if="loading" class="fas fa-circle-notch fa-spin"></i>
              <i v-else class="fas fa-download"></i>
              Загрузить raw
            </button>
          </div>
          <p v-if="error" class="ap-err"><i class="fas fa-exclamation-circle"></i> {{ error }}</p>

          <template v-if="loaded">
            <input
              v-model="search"
              type="text"
              class="brk-raw-reason"
              placeholder="Поиск по ключам и значениям"
            />
            <div class="brk-raw-body custom-scrollbar">
              <div v-if="!filteredEntries.length" class="brk-raw-empty">Ничего не найдено</div>
              <div v-for="entry in filteredEntries" :key="entry.key" class="brk-raw-entry">
                <div
                  class="brk-raw-entry-hd"
                  :class="{ 'brk-raw-entry-hd--btn': entry.expandable }"
                  @click="entry.expandable && toggleEntry(entry.key)"
                >
                  <i
                    v-if="entry.expandable"
                    class="fas"
                    :class="expanded[entry.key] ? 'fa-chevron-down' : 'fa-chevron-right'"
                  ></i>
                  <span class="brk-raw-ekey">{{ entry.key }}</span>
                  <span v-if="!entry.expandable" class="brk-raw-eval">{{ entry.full }}</span>
                </div>
                <pre v-if="entry.expandable && expanded[entry.key]" class="brk-raw-pre">{{
                  entry.full
                }}</pre>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.brk-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.88);
  padding: 1rem;
}
.brk-raw {
  width: 100%;
  max-width: 640px;
  max-height: 82vh;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--c-bdr-hi, #4b3e4e);
  background: var(--c-bg2, #100f13);
  padding: 1.1rem 1.25rem;
  box-shadow: 0 0 40px rgba(0, 0, 0, 0.6);
  font-family: 'Share Tech Mono', 'Courier New', monospace;
}
.brk-modal-hd {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--c-tx, #e0dcdf);
}
.brk-raw-close {
  margin-left: auto;
}
.brk-raw-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin: 0.4rem 0 0.8rem;
  font-size: 0.7rem;
  color: var(--c-tx3, #7e777b);
}
.brk-raw-id {
  word-break: break-all;
}
.brk-raw-mod {
  color: var(--c-red-s, #d95672);
}
.brk-raw-sect {
  margin-top: 0.5rem;
  min-height: 0;
}
.brk-raw-h {
  margin: 0 0 0.4rem;
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--c-tx2, #a39da0);
}
.brk-raw-summary {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}
.brk-raw-summary li {
  display: flex;
  gap: 0.6rem;
  font-size: 0.76rem;
}
.brk-raw-skey {
  color: var(--c-tx3, #7e777b);
  min-width: 7rem;
}
.brk-raw-sval {
  color: var(--c-tx, #e0dcdf);
  word-break: break-word;
}
.brk-raw-load {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.brk-raw-reason {
  flex: 1 1 12rem;
  padding: 0.45rem 0.6rem;
  border: 1px solid var(--c-bdr, #322c36);
  background: var(--c-bg-deep, #08070a);
  color: var(--c-tx, #e0dcdf);
  font-family: inherit;
  font-size: 0.78rem;
  margin-bottom: 0.5rem;
  box-sizing: border-box;
}
.brk-raw-reason:focus {
  outline: none;
  border-color: var(--c-red-s, #d95672);
}
.brk-raw-body {
  overflow-y: auto;
  max-height: 38vh;
  border: 1px solid var(--c-bdr, #322c36);
  background: var(--c-bg-deep, #08070a);
  padding: 0.5rem;
}
.brk-raw-entry {
  border-bottom: 1px solid rgba(50, 44, 54, 0.25);
  padding: 0.25rem 0;
}
.brk-raw-entry-hd {
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
  font-size: 0.78rem;
}
.brk-raw-entry-hd--btn {
  cursor: pointer;
}
.brk-raw-entry-hd i {
  font-size: 0.6rem;
  color: var(--c-tx3, #7e777b);
}
.brk-raw-ekey {
  color: var(--c-red-s, #d95672);
}
.brk-raw-eval {
  color: var(--c-tx, #e0dcdf);
  word-break: break-word;
}
.brk-raw-pre {
  margin: 0.3rem 0 0.2rem;
  padding: 0.4rem 0.6rem;
  background: rgba(5, 4, 7, 0.9);
  border-left: 2px solid rgba(50, 44, 54, 0.4);
  font-size: 0.74rem;
  line-height: 1.5;
  color: var(--c-tx2, #a39da0);
  white-space: pre-wrap;
  word-break: break-word;
  overflow-x: auto;
}
.brk-raw-empty {
  color: var(--c-tx3, #7e777b);
  font-size: 0.76rem;
  padding: 0.5rem 0;
}
.brk-modal-enter-active,
.brk-modal-leave-active {
  transition: opacity 0.2s ease;
}
.brk-modal-enter-from,
.brk-modal-leave-to {
  opacity: 0;
}
</style>
