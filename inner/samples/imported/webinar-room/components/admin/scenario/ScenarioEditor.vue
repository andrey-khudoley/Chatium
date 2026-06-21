<template>
  <div class="scenario-editor">
    <!-- Toolbar -->
    <div class="se-toolbar">
      <div class="se-toolbar-left">
        <h2 class="wr-text-primary font-semibold text-lg">Сценарий</h2>
        <span class="se-event-count">{{ totalCount }} событий</span>
      </div>
      <div class="se-toolbar-right">
        <div class="se-generate-wrapper group relative">
          <button
            @click="generateScenario"
            :disabled="!hasSubtitles || generatingScenario"
            class="se-tool-btn"
            :class="{ 'se-tool-btn--disabled': !hasSubtitles }"
            :title="hasSubtitles ? 'Сгенерировать сценарий через ИИ' : ''"
          >
            <i
              :class="generatingScenario ? 'fas fa-spinner fa-spin' : 'fas fa-magic'"
              class="text-purple-500"
            ></i>
            <span class="se-btn-text">{{
              generatingScenario ? 'Генерация...' : 'Сгенерировать'
            }}</span>
          </button>
          <div
            v-if="!hasSubtitles"
            class="se-generate-hint invisible group-hover:visible opacity-0 group-hover:opacity-100"
          >
            <i class="fas fa-info-circle"></i>
            <span
              >Для генерации нужен текст видео. Перейдите на вкладку "Текст видео" чтобы проверить
              статус обработки.</span
            >
          </div>
        </div>
        <button @click="exportScenario" class="se-tool-btn" title="Экспорт JSON">
          <i class="fas fa-download"></i>
          <span class="se-btn-text">Экспорт</span>
        </button>
        <label class="se-tool-btn" title="Импорт JSON">
          <i class="fas fa-upload"></i>
          <span class="se-btn-text">Импорт</span>
          <input type="file" accept=".json" @change="importScenario" class="hidden" />
        </label>
        <button @click="openAddModal" class="se-tool-btn se-tool-btn--primary">
          <i class="fas fa-plus"></i>
          <span class="se-btn-text">Добавить</span>
        </button>
      </div>
    </div>

    <!-- Timeline visualization -->
    <ScenarioTimeline
      :autowebinarId="autowebinarId"
      :duration="duration"
      :selectedEventId="selectedEventId"
      :refreshToken="timelineRefreshToken"
      @select="selectEvent"
      @edit="openEditModal"
    />

    <!-- Filters -->
    <div class="se-filters">
      <div class="se-filter-chips">
        <button
          v-for="ft in filterTabs"
          :key="ft.value"
          @click="activeFilter = activeFilter === ft.value ? '' : ft.value"
          class="se-filter-chip"
          :class="{ 'se-filter-chip--active': activeFilter === ft.value }"
        >
          <i :class="ft.icon" class="mr-1"></i>
          {{ ft.label }}
          <span class="se-chip-count">{{ getCountForFilter(ft.value) }}</span>
        </button>
      </div>
      <div class="se-search-wrap">
        <i class="fas fa-search se-search-icon"></i>
        <input
          v-model="searchQuery"
          type="text"
          class="se-search"
          placeholder="Поиск по тексту..."
        />
      </div>
    </div>

    <!-- Events list -->
    <div v-if="loadingEvents" class="se-loading">
      <div class="se-spinner"></div>
      <span>Загрузка событий...</span>
    </div>

    <div v-else-if="totalCount === 0" class="se-empty">
      <i class="fas fa-film se-empty-icon"></i>
      <p class="se-empty-title">Нет событий</p>
      <p class="se-empty-sub">Добавьте первое событие в сценарий</p>
      <button @click="openAddModal" class="se-tool-btn se-tool-btn--primary mt-3">
        <i class="fas fa-plus mr-1.5"></i> Добавить событие
      </button>
    </div>

    <div v-else-if="filteredEvents.length === 0" class="se-empty">
      <i class="fas fa-search se-empty-icon"></i>
      <p class="se-empty-title">Ничего не найдено</p>
      <p class="se-empty-sub">Попробуйте изменить фильтр</p>
    </div>

    <div v-else class="se-events-list">
      <div v-for="(group, gIdx) in groupedEvents" :key="gIdx" class="se-time-group">
        <div class="se-time-marker">
          <span class="se-time-badge">{{ group.label }}</span>
        </div>
        <div class="se-group-events">
          <div
            v-for="evt in group.events"
            :key="evt.id"
            class="se-event-card"
            :class="{ 'se-event-card--selected': selectedEventId === evt.id }"
            @click="selectEvent(evt)"
          >
            <div class="se-event-left">
              <span
                class="se-event-type-icon"
                :style="{
                  background: typeColor(evt.eventType) + '20',
                  color: typeColor(evt.eventType)
                }"
              >
                <i :class="typeIcon(evt.eventType)"></i>
              </span>
              <div class="se-event-info">
                <div class="se-event-type-label">{{ typeLabel(evt.eventType) }}</div>
                <div class="se-event-detail">{{ eventDetail(evt) }}</div>
              </div>
            </div>
            <div class="se-event-right">
              <span class="se-event-time">{{ formatOffset(evt.offsetSeconds) }}</span>
              <div class="se-event-actions">
                <button
                  @click.stop="openEditModal(evt)"
                  class="se-action-btn"
                  title="Редактировать"
                >
                  <i class="fas fa-pen"></i>
                </button>
                <button @click.stop="duplicateEvent(evt)" class="se-action-btn" title="Дублировать">
                  <i class="fas fa-copy"></i>
                </button>
                <button
                  @click.stop="deleteEvent(evt.id)"
                  class="se-action-btn se-action-btn--danger"
                  title="Удалить"
                >
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="se-pagination">
      <button @click="loadPage(1)" :disabled="page === 1" class="se-page-btn">
        <i class="fas fa-angle-double-left"></i>
      </button>
      <button @click="loadPage(page - 1)" :disabled="page === 1" class="se-page-btn">
        <i class="fas fa-angle-left"></i>
      </button>
      <span class="se-page-info">Страница {{ page }} из {{ totalPages }}</span>
      <button @click="loadPage(page + 1)" :disabled="page >= totalPages" class="se-page-btn">
        <i class="fas fa-angle-right"></i>
      </button>
      <button @click="loadPage(totalPages)" :disabled="page >= totalPages" class="se-page-btn">
        <i class="fas fa-angle-double-right"></i>
      </button>
    </div>

    <!-- Event modal -->
    <ScenarioEventModal
      :visible="showModal"
      :editing="editingEvent"
      :forms="forms"
      :duration="duration"
      :autowebinarId="autowebinarId"
      @close="closeModal"
      @save="handleSaveEvent"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import ScenarioTimeline from './ScenarioTimeline.vue'
import ScenarioEventModal from './ScenarioEventModal.vue'
import {
  apiScenarioEventsListRoute,
  apiScenarioEventCreateRoute,
  apiScenarioEventUpdateRoute,
  apiScenarioEventDeleteRoute,
  apiScenarioExportRoute,
  apiScenarioImportRoute,
  apiScenarioGenerateRoute
} from '../../../api/scenario'
import { apiFormsAllRoute } from '../../../api/forms-admin-routes'
import { apiAutowebinarByIdRoute } from '../../../api/autowebinars'

const props = defineProps({
  autowebinarId: { type: String, required: true },
  duration: { type: Number, default: 3600 },
  subtitles: { type: String, default: '' }
})

const events = ref([])
const totalCount = ref(0)
const page = ref(1)
const totalPages = ref(1)
const forms = ref([])
const loadingEvents = ref(false)
const activeFilter = ref('')
const searchQuery = ref('')
const selectedEventId = ref('')
const showModal = ref(false)
const editingEvent = ref(null)
const generatingScenario = ref(false)
const generationPollingTimer = ref(null)
const timelineRefreshToken = ref(0)

const hasSubtitles = computed(() => !!props.subtitles)

const filterTabs = [
  { value: 'chat_message', label: 'Чат', icon: 'fas fa-comments' },
  { value: 'forms', label: 'Формы', icon: 'fas fa-file-alt' },
  { value: 'sale_banner', label: 'Баннеры', icon: 'fas fa-bullhorn' },
  { value: 'reaction', label: 'Реакции', icon: 'fas fa-heart' },
  { value: 'system', label: 'Система', icon: 'fas fa-cog' }
]

function getCountForFilter(value) {
  // Считаем только по текущей странице
  if (value === 'system')
    return events.value.filter((e) =>
      ['waiting_room_start', 'stream_start', 'finish'].includes(e.eventType)
    ).length
  if (value === 'forms')
    return events.value.filter((e) => ['show_form', 'hide_form'].includes(e.eventType)).length
  return events.value.filter((e) => e.eventType === value).length
}

function buildServerFilter(filterValue) {
  if (!filterValue) return {}
  if (filterValue === 'forms' || filterValue === 'system') {
    return { filterTab: filterValue }
  }
  return { eventType: filterValue }
}

const filteredEvents = computed(() => {
  let list = [...events.value]

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim()
    list = list.filter((e) => {
      if (e.chatMessage?.text?.toLowerCase().includes(q)) return true
      if (e.chatMessage?.authorName?.toLowerCase().includes(q)) return true
      if (e.formSnapshot?.title?.toLowerCase().includes(q)) return true
      if (e.bannerData?.title?.toLowerCase().includes(q)) return true
      return typeLabel(e.eventType).toLowerCase().includes(q)
    })
  }

  return list.sort((a, b) => a.offsetSeconds - b.offsetSeconds)
})

const groupedEvents = computed(() => {
  const groups = []
  let currentGroup = null

  for (const evt of filteredEvents.value) {
    const min = Math.floor(evt.offsetSeconds / 60)
    const label = formatOffset(min * 60)

    if (!currentGroup || currentGroup.minute !== min) {
      currentGroup = { minute: min, label, events: [] }
      groups.push(currentGroup)
    }
    currentGroup.events.push(evt)
  }
  return groups
})

function typeLabel(t) {
  const map = {
    waiting_room_start: 'Начало ожидания',
    stream_start: 'Старт стрима',
    finish: 'Завершение',
    show_form: 'Показать форму',
    hide_form: 'Скрыть форму',
    sale_banner: 'Продажный баннер',
    chat_message: 'Сообщение в чат',
    reaction: 'Реакция'
  }
  return map[t] || t
}

function typeIcon(t) {
  const map = {
    waiting_room_start: 'fas fa-hourglass-start',
    stream_start: 'fas fa-play-circle',
    finish: 'fas fa-flag-checkered',
    show_form: 'fas fa-file-alt',
    hide_form: 'fas fa-eye-slash',
    sale_banner: 'fas fa-bullhorn',
    chat_message: 'fas fa-comment',
    reaction: 'fas fa-heart'
  }
  return map[t] || 'fas fa-circle'
}

function typeColor(t) {
  const map = {
    waiting_room_start: '#6b7280',
    stream_start: '#10b981',
    finish: '#ef4444',
    show_form: '#10b981',
    hide_form: '#f59e0b',
    sale_banner: '#8b5cf6',
    chat_message: '#3b82f6',
    reaction: '#ec4899'
  }
  return map[t] || '#6b7280'
}

function eventDetail(evt) {
  if (evt.eventType === 'chat_message' && evt.chatMessage) {
    const name = evt.chatMessage.authorName || 'Аноним'
    const text = evt.chatMessage.text || ''
    return `${name}: ${text.length > 60 ? text.substring(0, 60) + '...' : text}`
  }
  if ((evt.eventType === 'show_form' || evt.eventType === 'hide_form') && evt.formSnapshot)
    return evt.formSnapshot.title
  if (evt.eventType === 'sale_banner' && evt.bannerData) return evt.bannerData.title
  if (evt.eventType === 'reaction' && evt.reactionData) return evt.reactionData.emoji
  if (evt.eventType === 'waiting_room_start') return 'Зрители видят зал ожидания'
  if (evt.eventType === 'stream_start') return 'Запуск видео трансляции'
  if (evt.eventType === 'finish') return 'Завершение автовебинара'
  return ''
}

function formatOffset(sec) {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function selectEvent(evt) {
  selectedEventId.value = selectedEventId.value === evt.id ? '' : evt.id
}

function openAddModal() {
  editingEvent.value = null
  showModal.value = true
}

function openEditModal(evt) {
  editingEvent.value = evt
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingEvent.value = null
}

async function handleSaveEvent({ payload, editingId }) {
  try {
    if (editingId) {
      const updated = await apiScenarioEventUpdateRoute({ id: editingId }).run(ctx, {
        offsetSeconds: payload.offsetSeconds,
        eventType: payload.eventType,
        formId: payload.formId,
        formSnapshot: payload.formSnapshot,
        chatMessage: payload.chatMessage,
        bannerData: payload.bannerData,
        reactionData: payload.reactionData
      })
      const idx = events.value.findIndex((e) => e.id === editingId)
      if (idx >= 0) events.value[idx] = updated
    } else {
      const created = await apiScenarioEventCreateRoute.run(ctx, payload)
      events.value.push(created)
      events.value.sort((a, b) => a.offsetSeconds - b.offsetSeconds)
      totalCount.value++
    }
    closeModal()
  } catch (e) {
    alert('Ошибка: ' + e.message)
  }
}

async function deleteEvent(id) {
  if (!confirm('Удалить событие?')) return
  try {
    await apiScenarioEventDeleteRoute({ id }).run(ctx)
    events.value = events.value.filter((e) => e.id !== id)
    totalCount.value--
    if (selectedEventId.value === id) selectedEventId.value = ''
  } catch (e) {
    alert(e.message)
  }
}

async function duplicateEvent(evt) {
  try {
    const payload = {
      autowebinarId: props.autowebinarId,
      offsetSeconds: evt.offsetSeconds + 5,
      eventType: evt.eventType,
      formId: typeof evt.formId === 'object' ? evt.formId?.id : evt.formId,
      formSnapshot: evt.formSnapshot,
      chatMessage: evt.chatMessage,
      bannerData: evt.bannerData,
      reactionData: evt.reactionData,
      sortOrder: evt.sortOrder || 0
    }
    const created = await apiScenarioEventCreateRoute.run(ctx, payload)
    events.value.push(created)
    events.value.sort((a, b) => a.offsetSeconds - b.offsetSeconds)
    totalCount.value++
  } catch (e) {
    alert(e.message)
  }
}

function stopGenerationPolling() {
  if (generationPollingTimer.value) {
    clearInterval(generationPollingTimer.value)
    generationPollingTimer.value = null
  }
}

async function checkGenerationStatus(showTerminalAlert = true, runCatchUpRefresh = true) {
  const aw = await apiAutowebinarByIdRoute({ id: props.autowebinarId }).run(ctx)
  const status = aw?.scenarioGenerationStatus

  if (status === 'processing') {
    generatingScenario.value = true
    return false
  }

  stopGenerationPolling()
  generatingScenario.value = false

  if (status === 'completed') {
    activeFilter.value = ''
    searchQuery.value = ''
    selectedEventId.value = ''
    page.value = 1
    if (runCatchUpRefresh) {
      await refreshScenarioDataWithRetries()
    } else {
      await loadEvents()
      timelineRefreshToken.value += 1
    }
    if (showTerminalAlert) {
      alert('Генерация сценария завершена')
    }
    return true
  }

  if (status === 'failed') {
    if (showTerminalAlert) {
      alert('Ошибка генерации: ' + (aw?.scenarioGenerationError || 'Неизвестная ошибка'))
    }
    return true
  }

  return false
}

function startGenerationPolling() {
  stopGenerationPolling()
  generationPollingTimer.value = setInterval(async () => {
    try {
      await checkGenerationStatus()
    } catch (e) {
      console.error(e)
    }
  }, 3000)
}

async function exportScenario() {
  try {
    const data = await apiScenarioExportRoute.query({ autowebinarId: props.autowebinarId }).run(ctx)
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `scenario_export.json`
    a.click()
    URL.revokeObjectURL(url)
  } catch (e) {
    alert(e.message)
  }
}

async function importScenario(e) {
  const file = e.target.files?.[0]
  if (!file) return
  e.target.value = ''
  try {
    const text = await file.text()
    const scenario = JSON.parse(text)
    if (
      !confirm(
        `Импортировать сценарий (${scenario.events?.length || 0} событий)? Существующие события будут удалены.`
      )
    )
      return
    await apiScenarioImportRoute.run(ctx, {
      autowebinarId: props.autowebinarId,
      scenario,
      clearExisting: true
    })
    await loadEvents()
  } catch (e) {
    alert(e.message)
  }
}

async function generateScenario() {
  if (!hasSubtitles.value) {
    alert('У автовебинара нет текста видео. Дождитесь обработки видео в Muuvee.')
    return
  }

  if (
    !confirm(
      'Сгенерировать сценарий через ИИ?\n\nБудет выполнена одна генерация на основе полного текста видео.\nСуществующие события будут удалены и заменены новыми.'
    )
  )
    return

  generatingScenario.value = true
  try {
    const res = await apiScenarioGenerateRoute.run(ctx, {
      autowebinarId: props.autowebinarId
    })
    alert(res.message + '\n\nПроцесс генерации запущен. Ожидайте, статус обновится автоматически.')
    startGenerationPolling()
  } catch (e) {
    alert('Ошибка: ' + e.message)
    generatingScenario.value = false
  }
}

async function loadEvents() {
  loadingEvents.value = true
  try {
    const serverFilter = buildServerFilter(activeFilter.value)
    const res = await apiScenarioEventsListRoute
      .query({
        autowebinarId: props.autowebinarId,
        page: page.value,
        ...serverFilter
      })
      .run(ctx)
    events.value = res.events || []
    totalCount.value = res.totalCount || 0
    totalPages.value = res.totalPages || 1
    return totalCount.value
  } catch (e) {
    console.error(e)
    return totalCount.value
  } finally {
    loadingEvents.value = false
  }
}

function loadPage(newPage) {
  if (newPage < 1 || newPage > totalPages.value) return
  page.value = newPage
  loadEvents()
}

async function loadForms() {
  try {
    forms.value = await apiFormsAllRoute.run(ctx)
  } catch (e) {
    console.error(e)
  }
}

onMounted(() => {
  loadEvents()
  loadForms()
  checkGenerationStatus(false, false)
    .then((done) => {
      if (!done && generatingScenario.value) {
        startGenerationPolling()
      }
    })
    .catch(() => {})
})

onBeforeUnmount(() => {
  stopGenerationPolling()
})

// Перезагрузка при смене фильтра
watch(activeFilter, () => {
  page.value = 1
  loadEvents()
})
watch(searchQuery, () => {
  page.value = 1
})
</script>

<style scoped>
.scenario-editor {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Toolbar */
.se-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.se-toolbar-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.se-event-count {
  font-size: 12px;
  color: var(--wr-text-muted);
  background: var(--wr-hover-bg);
  padding: 3px 10px;
  border-radius: 20px;
}

.se-toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.se-tool-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border-radius: 10px;
  border: 1px solid var(--wr-border);
  background: var(--wr-btn-subtle-bg);
  color: var(--wr-text-secondary);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}

.se-tool-btn:hover:not(:disabled) {
  background: var(--wr-btn-subtle-hover-bg);
  color: var(--wr-text-primary);
}

.se-tool-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.se-tool-btn--disabled {
  opacity: 0.4;
  cursor: not-allowed;
  background: var(--wr-btn-subtle-bg) !important;
  color: var(--wr-text-muted) !important;
}

.se-tool-btn--primary {
  background: #f8005b;
  border-color: #f8005b;
  color: white;
}

.se-tool-btn--primary:hover:not(:disabled) {
  background: #d4004d;
  color: white;
}

.se-tool-btn--danger {
  border-color: rgba(239, 68, 68, 0.3);
  color: #ef4444;
}

.se-tool-btn--danger:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

/* Generate wrapper */
.se-generate-wrapper {
  display: flex;
  flex-direction: column;
  gap: 6px;
  position: relative;
}

.se-generate-hint {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-top: 8px;
  padding: 10px 14px;
  background: var(--wr-bg-secondary);
  border: 1px solid var(--wr-border);
  border-radius: 8px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--wr-text-secondary);
  display: flex;
  align-items: flex-start;
  gap: 8px;
  width: 280px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  z-index: 100;
  transition: all 0.2s ease-out;
  pointer-events: none;
}

.se-generate-hint i {
  flex-shrink: 0;
  font-size: 13px;
  color: #60a5fa;
  margin-top: 1px;
}

.se-generate-hint span {
  flex: 1;
}

:global(.theme-light) .se-generate-hint {
  background: white;
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.1),
    0 1px 2px rgba(0, 0, 0, 0.05);
}

/* Filters */
.se-filters {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.se-filter-chips {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  flex: 1;
  min-width: 0;
}

.se-filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  border-radius: 8px;
  border: 1px solid var(--wr-border);
  background: transparent;
  color: var(--wr-text-tertiary);
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.se-filter-chip:hover {
  color: var(--wr-text-secondary);
  border-color: var(--wr-border-hover);
}

.se-filter-chip--active {
  background: rgba(248, 0, 91, 0.1);
  border-color: rgba(248, 0, 91, 0.3);
  color: #f8005b;
}

.se-chip-count {
  font-size: 10px;
  background: var(--wr-hover-bg);
  padding: 1px 5px;
  border-radius: 6px;
}

.se-filter-chip--active .se-chip-count {
  background: rgba(248, 0, 91, 0.15);
}

.se-search-wrap {
  position: relative;
  width: 200px;
  min-width: 140px;
}

.se-search-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 11px;
  color: var(--wr-text-muted);
  pointer-events: none;
}

.se-search {
  width: 100%;
  padding: 6px 10px 6px 28px;
  border-radius: 8px;
  border: 1px solid var(--wr-input-border);
  background: var(--wr-input-bg);
  color: var(--wr-text-primary);
  font-size: 12px;
  outline: none;
  transition: all 0.2s;
}

.se-search:focus {
  border-color: #f8005b;
  box-shadow: 0 0 0 2px rgba(248, 0, 91, 0.1);
}

.se-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  z-index: 999;
}

.se-modal {
  width: 100%;
  max-width: 540px;
  border: 1px solid var(--wr-border);
  background: var(--wr-bg-secondary);
  border-radius: 12px;
  padding: 16px;
}

.se-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.se-modal-close {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid var(--wr-border);
  background: var(--wr-btn-subtle-bg);
  color: var(--wr-text-secondary);
}

.se-modal-actions {
  margin-top: 14px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.se-episode-picker {
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--wr-input-border);
  background: var(--wr-input-bg);
  color: var(--wr-text-primary);
}

/* Loading / Empty */
.se-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 40px 0;
  color: var(--wr-text-muted);
  font-size: 13px;
}

.se-spinner {
  width: 28px;
  height: 28px;
  border: 3px solid var(--wr-border);
  border-top-color: #f8005b;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.se-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 50px 20px;
  text-align: center;
}

.se-empty-icon {
  font-size: 36px;
  color: var(--wr-text-muted);
  opacity: 0.3;
  margin-bottom: 12px;
}

.se-empty-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--wr-text-secondary);
}

.se-empty-sub {
  font-size: 12px;
  color: var(--wr-text-muted);
  margin-top: 4px;
}

/* Events list */
.se-events-list {
  display: flex;
  flex-direction: column;
  gap: 0;
  max-height: 560px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--wr-scrollbar-thumb) transparent;
  border: 1px solid var(--wr-border);
  border-radius: 12px;
}

.se-time-group {
  border-bottom: 1px solid var(--wr-border-light);
}

.se-time-group:last-child {
  border-bottom: none;
}

.se-time-marker {
  padding: 6px 12px;
  background: var(--wr-hover-bg);
  position: sticky;
  top: 0;
  z-index: 2;
}

.se-time-badge {
  font-size: 10px;
  font-weight: 700;
  font-family: monospace;
  color: var(--wr-text-tertiary);
  letter-spacing: 0.5px;
}

.se-group-events {
  display: flex;
  flex-direction: column;
}

.se-event-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--wr-border-light);
  cursor: pointer;
  transition: background 0.12s;
}

.se-event-card:last-child {
  border-bottom: none;
}

.se-event-card:hover {
  background: var(--wr-hover-bg);
}

.se-event-card--selected {
  background: rgba(248, 0, 91, 0.06);
  border-left: 3px solid #f8005b;
}

.se-event-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.se-event-type-icon {
  width: 30px;
  height: 30px;
  min-width: 30px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}

.se-event-info {
  min-width: 0;
}

.se-event-type-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--wr-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.se-event-detail {
  font-size: 12px;
  color: var(--wr-text-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 400px;
}

.se-event-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.se-event-time {
  font-size: 11px;
  font-family: monospace;
  color: var(--wr-text-muted);
  min-width: 50px;
  text-align: right;
}

.se-event-actions {
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.15s;
}

.se-event-card:hover .se-event-actions {
  opacity: 1;
}

.se-action-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--wr-text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  transition: all 0.12s;
}

.se-action-btn:hover {
  background: var(--wr-hover-bg);
  color: var(--wr-text-primary);
}

.se-action-btn--danger:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

/* Bulk operations */
.se-bulk {
  border: 1px solid var(--wr-border);
  border-radius: 12px;
  overflow: hidden;
}

.se-bulk-header {
  display: flex;
  align-items: center;
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 500;
  color: var(--wr-text-secondary);
  cursor: pointer;
  transition: background 0.12s;
}

.se-bulk-header:hover {
  background: var(--wr-hover-bg);
}

.se-bulk-body {
  padding: 12px 14px;
  border-top: 1px solid var(--wr-border-light);
}

.se-bulk-row {
  display: flex;
  align-items: end;
  gap: 10px;
  flex-wrap: wrap;
}

.se-bulk-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.se-label {
  font-size: 11px;
  font-weight: 500;
  color: var(--wr-text-tertiary);
}

.se-time-input {
  padding: 7px 10px;
  border-radius: 8px;
  border: 1px solid var(--wr-input-border);
  background: var(--wr-input-bg);
  color: var(--wr-text-primary);
  font-size: 13px;
  font-family: monospace;
  outline: none;
}

.se-time-input:focus {
  border-color: #f8005b;
}

/* Slide transition */
.slide-enter-active {
  transition: all 0.2s ease;
}
.slide-leave-active {
  transition: all 0.15s ease;
}
.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}
.slide-enter-to,
.slide-leave-from {
  max-height: 100px;
}

/* Responsive */
@media (max-width: 640px) {
  .se-btn-text {
    display: none;
  }
  .se-search-wrap {
    width: 100%;
  }
  .se-event-detail {
    max-width: 150px;
  }
  .se-event-actions {
    opacity: 1;
  }
}

/* Pagination */
.se-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  border: 1px solid var(--wr-border);
  border-radius: 12px;
  background: var(--wr-bg-card);
}

.se-page-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid var(--wr-border);
  background: var(--wr-btn-subtle-bg);
  color: var(--wr-text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  transition: all 0.15s;
}

.se-page-btn:hover:not(:disabled) {
  background: var(--wr-btn-subtle-hover-bg);
  color: var(--wr-text-primary);
}

.se-page-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.se-page-info {
  font-size: 12px;
  color: var(--wr-text-secondary);
  padding: 0 8px;
  font-weight: 500;
}
</style>
