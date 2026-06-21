<template>
  <div v-if="visible" class="debug-panel" :class="{ 'debug-panel--collapsed': collapsed }">
    <div class="debug-panel-header" @click="collapsed = !collapsed">
      <span class="debug-panel-title">
        <i class="fas fa-bug"></i>
        Проверка
      </span>
      <span class="debug-panel-time"
        >{{ formatTime(props.currentOffset) }} / {{ formatTime(duration) }}</span
      >
      <i
        class="fas"
        :class="collapsed ? 'fa-chevron-up' : 'fa-chevron-down'"
        style="font-size: 10px"
      ></i>
    </div>

    <div v-if="!collapsed" class="debug-panel-body">
      <!-- Progress bar -->
      <div class="debug-progress">
        <div class="debug-progress-bar" :style="{ width: progressPercent + '%' }"></div>
      </div>

      <!-- Seek buttons -->
      <div class="debug-seek-row">
        <button class="debug-btn debug-btn-accent" @click="seek(15)">+15s</button>
        <button class="debug-btn debug-btn-accent" @click="seek(60)">+1m</button>
      </div>

      <!-- Status -->
      <div class="debug-status">
        <span
          >Статус: <strong>{{ props.status }}</strong></span
        >
      </div>

      <!-- Schedule info -->
      <div v-if="props.schedule" class="debug-status">
        <div>
          Начало запуска: <strong>{{ formatScheduleDate(props.schedule.scheduledDate) }}</strong>
        </div>
      </div>

      <!-- Reset session button -->
      <div class="debug-reset-row">
        <button class="debug-btn debug-btn-danger" @click="resetSession">Сбросить сессию</button>
      </div>

      <!-- Nearby events -->
      <div class="debug-events">
        <div class="debug-events-title">Ближайшие события:</div>
        <div class="debug-events-list">
          <div
            v-for="evt in nearbyEvents"
            :key="evt.id"
            class="debug-event"
            :class="{ 'debug-event--past': evt.offsetSeconds <= props.currentOffset }"
          >
            <span class="debug-event-time">{{ formatTime(evt.offsetSeconds) }}</span>
            <span class="debug-event-type">{{ evt.eventType }}</span>
            <span v-if="evt.chatMessage" class="debug-event-detail">{{
              evt.chatMessage.authorName
            }}</span>
          </div>
          <div v-if="nearbyEvents.length === 0" class="debug-event-empty">Нет событий рядом</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { apiDebugSeekRoute, apiDebugStatusRoute } from '../../api/autowebinar-debug'

const props = defineProps({
  autowebinarId: { type: String, required: true },
  duration: { type: Number, default: 0 },
  scheduleId: { type: String, default: '' },
  currentOffset: { type: Number, default: 0 },
  status: { type: String, default: '' },
  schedule: { type: Object, default: null }
})

const emit = defineEmits(['seek'])

const visible = ref(false)
const collapsed = ref(false)
const nearbyEvents = ref([])

const progressPercent = computed(() => {
  if (!props.duration) return 0
  return Math.min(100, (props.currentOffset / props.duration) * 100)
})

const isStaff = ctx.user?.is?.('Staff') ?? false

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function formatScheduleDate(dateStr) {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${day}.${month}.${year} ${hours}:${minutes}`
}

async function refreshStatus() {
  try {
    const route = apiDebugStatusRoute({ autowebinarId: props.autowebinarId })
    const params = props.scheduleId ? { scheduleId: props.scheduleId } : {}
    const data = await route.query(params).run(ctx)
    if (data.active) {
      // Only update nearbyEvents, currentOffset and status come from props
      nearbyEvents.value = data.nearbyEvents || []
    }
  } catch (e) {}
}

async function seek(seconds) {
  try {
    const payload = {
      autowebinarId: props.autowebinarId,
      shiftSeconds: seconds
    }
    if (props.scheduleId) {
      payload.scheduleId = props.scheduleId
    }
    const data = await apiDebugSeekRoute.run(ctx, payload)
    // currentOffset will be updated via props after parent processes seek event
    nearbyEvents.value = data.nearbyEvents || []
    emit('seek', data.newOffset)
  } catch (e) {
    console.error('Debug seek failed:', e)
  }
}

function resetSession() {
  try {
    const storageKey = `aw_schedule_${props.autowebinarId}`
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(storageKey)
    }
    // Reload page to get new schedule assignment
    window.location.reload()
  } catch (e) {
    console.error('Failed to reset session:', e)
  }
}

onMounted(() => {
  if (isStaff) {
    visible.value = true
    // Load nearbyEvents once on mount, currentOffset and status come from props
    refreshStatus()
  }
})

onUnmounted(() => {
  // No cleanup needed anymore (no interval)
})
</script>

<style scoped>
.debug-panel {
  position: fixed;
  bottom: 16px;
  left: 16px;
  z-index: 10000;
  width: 320px;
  background: rgba(0, 0, 0, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  color: #fff;
  font-size: 12px;
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}

.debug-panel--collapsed {
  width: auto;
}

.debug-panel-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  user-select: none;
}

.debug-panel-title {
  font-weight: 600;
  color: #f59e0b;
  display: flex;
  align-items: center;
  gap: 6px;
}

.debug-panel-time {
  flex: 1;
  text-align: right;
  font-family: monospace;
  font-size: 11px;
  color: #9ca3af;
}

.debug-panel-body {
  padding: 0 12px 12px;
}

.debug-progress {
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  margin-bottom: 10px;
  overflow: hidden;
}

.debug-progress-bar {
  height: 100%;
  background: #f59e0b;
  border-radius: 2px;
  transition: width 0.3s ease;
}

.debug-seek-row {
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
}

.debug-btn {
  flex: 1;
  padding: 6px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.05);
  color: #d1d5db;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.debug-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
}

.debug-btn-accent {
  border-color: rgba(59, 130, 246, 0.3);
  color: #60a5fa;
}

.debug-btn-accent:hover {
  background: rgba(59, 130, 246, 0.15);
}

.debug-btn-danger {
  border-color: rgba(239, 68, 68, 0.3);
  color: #f87171;
}

.debug-btn-danger:hover {
  background: rgba(239, 68, 68, 0.15);
  color: #fca5a5;
}

.debug-reset-row {
  margin-bottom: 10px;
}

.debug-status {
  margin-bottom: 8px;
  color: #9ca3af;
}

.debug-events {
  display: flex;
  flex-direction: column;
  max-height: 120px;
}

.debug-events-title {
  color: #9ca3af;
  margin-bottom: 4px;
  font-weight: 500;
  flex-shrink: 0;
}

.debug-events-list {
  overflow-y: auto;
  overflow-x: hidden;
  flex: 1;
  min-height: 0;
}

.debug-events-list::-webkit-scrollbar {
  width: 4px;
}

.debug-events-list::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 2px;
}

.debug-events-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
}

.debug-events-list::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

.debug-event {
  display: flex;
  gap: 8px;
  padding: 3px 0;
  color: #d1d5db;
}

.debug-event--past {
  opacity: 0.4;
}

.debug-event-time {
  font-family: monospace;
  font-size: 10px;
  color: #6b7280;
  min-width: 42px;
}

.debug-event-type {
  font-size: 10px;
  font-weight: 500;
  color: #60a5fa;
}

.debug-event-detail {
  font-size: 10px;
  color: #9ca3af;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.debug-event-empty {
  color: #6b7280;
  font-style: italic;
}
</style>
