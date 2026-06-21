<template>
  <div class="scenario-timeline" ref="timelineContainer">
    <div class="timeline-header">
      <div class="timeline-ruler" ref="ruler">
        <div class="ruler-track" :style="{ width: rulerWidth + 'px' }">
          <template v-for="mark in timeMarks" :key="mark.sec">
            <div
              class="ruler-mark"
              :class="{ 'ruler-mark--major': mark.major }"
              :style="{ left: secToX(mark.sec) + 'px' }"
            >
              <span v-if="mark.major" class="ruler-label">{{ mark.label }}</span>
            </div>
          </template>
        </div>
      </div>
    </div>

    <div class="timeline-body" @scroll="syncScroll" ref="body">
      <div class="timeline-lanes" :style="{ width: rulerWidth + 'px' }">
        <div v-for="lane in lanes" :key="lane.id" class="timeline-lane">
          <div class="lane-label">
            <span class="lane-icon" :style="{ color: lane.color }"><i :class="lane.icon"></i></span>
            <span class="lane-name">{{ lane.label }}</span>
            <span class="lane-count">{{ lane.events.length }}</span>
          </div>
          <div class="lane-track">
            <div
              v-for="evt in lane.events"
              :key="evt.id"
              class="lane-event"
              :class="{ 'lane-event--selected': selectedEventId === evt.id }"
              :style="{
                left: secToX(evt.offsetSeconds) + 'px',
                background: lane.color + '33',
                borderColor: lane.color
              }"
              :title="eventTooltip(evt)"
              @click.stop="$emit('select', evt)"
              @dblclick.stop="$emit('edit', evt)"
            >
              <span class="lane-event-dot" :style="{ background: lane.color }"></span>
            </div>
          </div>
        </div>

        <div
          class="timeline-playhead"
          v-if="duration > 0"
          :style="{ left: secToX(duration) + 'px' }"
        >
          <div class="playhead-line"></div>
          <span class="playhead-label">{{ formatOffset(duration) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { apiScenarioTimelineDataRoute } from '../../../api/scenario'

const props = defineProps({
  autowebinarId: { type: String, required: true },
  duration: { type: Number, default: 3600 },
  selectedEventId: { type: String, default: '' },
  refreshToken: { type: Number, default: 0 }
})

defineEmits(['select', 'edit'])

const timelineContainer = ref(null)
const ruler = ref(null)
const body = ref(null)
const events = ref([])
const loading = ref(false)

const PX_PER_MIN = 8
const MIN_WIDTH = 800

const rulerWidth = computed(() => {
  const mins = Math.ceil(props.duration / 60)
  return Math.max(MIN_WIDTH, mins * PX_PER_MIN + 60)
})

function secToX(sec) {
  const totalMin = props.duration / 60
  if (totalMin <= 0) return 30
  return 30 + (sec / 60 / totalMin) * (rulerWidth.value - 60)
}

const timeMarks = computed(() => {
  const totalMin = Math.ceil(props.duration / 60)
  const marks = []
  let interval = 1
  if (totalMin > 180) interval = 10
  else if (totalMin > 60) interval = 5
  else if (totalMin > 30) interval = 2

  for (let m = 0; m <= totalMin; m += interval) {
    marks.push({
      sec: m * 60,
      label: formatOffset(m * 60),
      major: m % (interval * 5 === 0 ? interval * 5 : interval) === 0 || m === 0
    })
  }
  return marks
})

const laneConfig = [
  {
    id: 'system',
    label: 'Система',
    icon: 'fas fa-cog',
    color: '#6b7280',
    types: ['waiting_room_start', 'stream_start', 'finish']
  },
  {
    id: 'forms',
    label: 'Формы',
    icon: 'fas fa-file-alt',
    color: '#10b981',
    types: ['show_form', 'hide_form']
  },
  {
    id: 'banners',
    label: 'Баннеры',
    icon: 'fas fa-bullhorn',
    color: '#8b5cf6',
    types: ['sale_banner']
  },
  { id: 'chat', label: 'Чат', icon: 'fas fa-comments', color: '#3b82f6', types: ['chat_message'] },
  { id: 'reactions', label: 'Реакции', icon: 'fas fa-heart', color: '#ec4899', types: ['reaction'] }
]

const lanes = computed(() => {
  return laneConfig
    .map((cfg) => ({
      ...cfg,
      events: events.value.filter((e) => cfg.types.includes(e.eventType))
    }))
    .filter((lane) => lane.events.length > 0)
})

function formatOffset(sec) {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function eventTooltip(evt) {
  const time = formatOffset(evt.offsetSeconds)
  const type = evt.eventType
  let detail = ''
  if (evt.chatText) detail = `${evt.chatAuthor || 'Аноним'}: ${evt.chatText}`
  if (evt.formTitle) detail = evt.formTitle
  return `[${time}] ${type}${detail ? ' — ' + detail : ''}`
}

function syncScroll() {
  if (ruler.value && body.value) {
    ruler.value.scrollLeft = body.value.scrollLeft
  }
}

async function loadTimelineData() {
  loading.value = true
  try {
    const res = await apiScenarioTimelineDataRoute
      .query({ autowebinarId: props.autowebinarId })
      .run(ctx)
    events.value = res.events || []
  } catch (e) {
    console.error(e)
  }
  loading.value = false
}

onMounted(() => {
  loadTimelineData()
})

watch(
  () => props.autowebinarId,
  () => {
    loadTimelineData()
  }
)

watch(
  () => props.refreshToken,
  () => {
    loadTimelineData()
  }
)
</script>

<style scoped>
.scenario-timeline {
  border: 1px solid var(--wr-border);
  border-radius: 12px;
  overflow: hidden;
  background: var(--wr-bg-card);
}

.timeline-header {
  border-bottom: 1px solid var(--wr-border-light);
  overflow: hidden;
}

.timeline-ruler {
  overflow: hidden;
  height: 32px;
  position: relative;
}

.ruler-track {
  position: relative;
  height: 100%;
}

.ruler-mark {
  position: absolute;
  top: 0;
  height: 100%;
  width: 1px;
  background: var(--wr-border-light);
}

.ruler-mark--major {
  background: var(--wr-border);
}

.ruler-label {
  position: absolute;
  top: 4px;
  left: 4px;
  font-size: 9px;
  color: var(--wr-text-tertiary);
  white-space: nowrap;
  font-family: monospace;
}

.timeline-body {
  overflow-x: auto;
  overflow-y: visible;
  scrollbar-width: thin;
  scrollbar-color: var(--wr-scrollbar-thumb) transparent;
}

.timeline-lanes {
  position: relative;
  min-height: 60px;
}

.timeline-lane {
  display: flex;
  align-items: center;
  height: 36px;
  border-bottom: 1px solid var(--wr-border-light);
}

.timeline-lane:last-child {
  border-bottom: none;
}

.lane-label {
  width: 110px;
  min-width: 110px;
  padding: 0 10px;
  display: flex;
  align-items: center;
  gap: 6px;
  position: sticky;
  left: 0;
  z-index: 2;
  background: var(--wr-bg-card);
}

.lane-icon {
  font-size: 10px;
}

.lane-name {
  font-size: 11px;
  color: var(--wr-text-secondary);
  font-weight: 500;
}

.lane-count {
  font-size: 9px;
  color: var(--wr-text-muted);
  background: var(--wr-hover-bg);
  border-radius: 8px;
  padding: 1px 5px;
}

.lane-track {
  position: relative;
  flex: 1;
  height: 100%;
}

.lane-event {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
  z-index: 1;
}

.lane-event:hover {
  transform: translate(-50%, -50%) scale(1.4);
  z-index: 3;
}

.lane-event--selected {
  transform: translate(-50%, -50%) scale(1.5);
  z-index: 3;
  box-shadow: 0 0 0 3px rgba(248, 0, 91, 0.3);
}

.lane-event-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.timeline-playhead {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  z-index: 5;
  pointer-events: none;
}

.playhead-line {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 2px;
  background: var(--wr-text-muted);
  opacity: 0.5;
}

.playhead-label {
  position: absolute;
  bottom: -16px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 9px;
  color: var(--wr-text-muted);
  font-family: monospace;
  white-space: nowrap;
}
</style>
