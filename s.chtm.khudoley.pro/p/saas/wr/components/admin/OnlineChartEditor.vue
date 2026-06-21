<template>
  <div class="online-chart-editor">
    <div class="chart-header">
      <h3 class="chart-title">График фейкового онлайна</h3>
      <button type="button" @click="addPoint" class="btn-add-point">
        <i class="fas fa-plus"></i>
        Добавить точку
      </button>
    </div>

    <div class="chart-container" ref="chartContainer">
      <svg
        ref="svgEl"
        :width="chartWidth"
        :height="chartHeight"
        class="chart-svg"
        @mousedown="onSvgMouseDown"
        @touchstart="onSvgMouseDown"
      >
        <!-- Grid lines -->
        <g class="grid">
          <line
            v-for="i in 5"
            :key="`h-${i}`"
            :x1="padLeft"
            :y1="padTop + (drawHeight * (i - 1)) / 4"
            :x2="chartWidth - padRight"
            :y2="padTop + (drawHeight * (i - 1)) / 4"
            stroke="var(--wr-border)"
            stroke-width="1"
            opacity="0.3"
          />
        </g>

        <!-- Y-axis labels -->
        <g class="y-labels">
          <text
            v-for="i in 5"
            :key="`yl-${i}`"
            :x="padLeft - 8"
            :y="padTop + (drawHeight * (i - 1)) / 4 + 4"
            text-anchor="end"
            fill="var(--wr-text-tertiary)"
            font-size="11"
          >
            {{ Math.round(maxCount * (1 - (i - 1) / 4)) }}
          </text>
        </g>

        <!-- X-axis labels -->
        <g class="x-labels">
          <text
            v-for="label in xLabels"
            :key="label.minute"
            :x="getX(label.minute)"
            :y="chartHeight - 4"
            text-anchor="middle"
            fill="var(--wr-text-tertiary)"
            font-size="11"
          >
            {{ label.text }}
          </text>
        </g>

        <!-- Area fill -->
        <path :d="areaPath" fill="url(#onlineGradient)" opacity="0.2" />

        <!-- Line path -->
        <path
          :d="linePath"
          fill="none"
          stroke="#f8005b"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />

        <!-- Gradient -->
        <defs>
          <linearGradient id="onlineGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stop-color="#f8005b" />
            <stop offset="100%" stop-color="#f8005b" stop-opacity="0" />
          </linearGradient>
        </defs>

        <!-- Points -->
        <g v-for="(point, index) in sortedPoints" :key="'p' + index">
          <!-- Hit area (invisible larger circle for easier grabbing) -->
          <circle
            :cx="getX(point.minute)"
            :cy="getY(point.count)"
            r="16"
            fill="transparent"
            class="point-hitarea"
            @mousedown.stop="startDrag(index, $event)"
            @touchstart.stop="startDrag(index, $event)"
          />
          <!-- Visible circle -->
          <circle
            :cx="getX(point.minute)"
            :cy="getY(point.count)"
            r="6"
            fill="#fff"
            stroke="#f8005b"
            stroke-width="2.5"
            class="point-circle"
            :class="{ dragging: draggingIndex === index }"
            pointer-events="none"
          />
          <!-- Label -->
          <text
            v-if="shouldShowLabel(index)"
            :x="getX(point.minute)"
            :y="getY(point.count) - 12"
            text-anchor="middle"
            fill="var(--wr-text-primary)"
            font-size="11"
            font-weight="600"
            pointer-events="none"
          >
            {{ point.count }}
          </text>
        </g>
      </svg>
    </div>

    <div class="points-list-header" @click="showPointsList = !showPointsList">
      <span>Точки ({{ sortedPoints.length }})</span>
      <i class="fas" :class="showPointsList ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
    </div>

    <div v-if="showPointsList" class="points-list">
      <div v-for="(point, index) in sortedPoints" :key="index" class="point-item">
        <div class="point-inputs">
          <div class="input-group">
            <label>Минута</label>
            <input
              type="number"
              :value="point.minute"
              @input="updatePoint(index, 'minute', $event.target.value)"
              min="0"
              :max="duration"
              class="point-input"
            />
          </div>
          <div class="input-group">
            <label>Зрителей</label>
            <input
              type="number"
              :value="point.count"
              @input="updatePoint(index, 'count', $event.target.value)"
              min="0"
              class="point-input"
            />
          </div>
        </div>
        <button
          type="button"
          @click="removePoint(index)"
          class="btn-remove"
          :disabled="sortedPoints.length <= 2"
        >
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  duration: { type: Number, default: 60 }
})

const emit = defineEmits(['update:modelValue'])

const chartContainer = ref(null)
const svgEl = ref(null)
const showPointsList = ref(false)
const draggingIndex = ref(null)

const chartWidth = ref(600)
const chartHeight = 260
const padLeft = 50
const padRight = 20
const padTop = 24
const padBottom = 30

const drawWidth = computed(() => chartWidth.value - padLeft - padRight)
const drawHeight = chartHeight - padTop - padBottom

const sortedPoints = computed(() => {
  if (props.modelValue && props.modelValue.length > 0) {
    return [...props.modelValue].sort((a, b) => a.minute - b.minute)
  }

  const points = []
  const totalMinutes = Math.max(props.duration, 1)
  const peakMinute = Math.floor(totalMinutes * 0.3)
  const maxViewers = 100

  const step = totalMinutes > 60 ? 5 : totalMinutes > 30 ? 2 : 1

  for (let minute = 0; minute <= totalMinutes; minute += step) {
    let count
    if (minute <= peakMinute) {
      const progress = peakMinute > 0 ? minute / peakMinute : 1
      count = Math.round(20 + (maxViewers - 20) * Math.pow(progress, 1.5))
    } else {
      const progress =
        totalMinutes - peakMinute > 0 ? (minute - peakMinute) / (totalMinutes - peakMinute) : 1
      count = Math.round(maxViewers * Math.exp(-progress * 1.2) + 10)
    }
    points.push({ minute, count })
  }

  if (points[points.length - 1].minute < totalMinutes) {
    const lastCount = points[points.length - 1].count
    points.push({ minute: totalMinutes, count: Math.max(10, Math.round(lastCount * 0.8)) })
  }

  return points
})

const maxCount = computed(() => {
  const max = Math.max(...sortedPoints.value.map((p) => p.count), 10)
  return Math.ceil((max * 1.15) / 10) * 10
})

const xLabels = computed(() => {
  const total = props.duration
  if (total <= 0) return [{ minute: 0, text: '0' }]

  const labelCount = Math.min(10, Math.max(2, Math.floor(drawWidth.value / 60)))
  const step = total / labelCount
  const labels = []
  for (let i = 0; i <= labelCount; i++) {
    const m = Math.round(step * i)
    labels.push({ minute: m, text: `${m}м` })
  }
  return labels
})

const linePath = computed(() => {
  if (sortedPoints.value.length === 0) return ''
  return 'M ' + sortedPoints.value.map((p) => `${getX(p.minute)},${getY(p.count)}`).join(' L ')
})

const areaPath = computed(() => {
  if (sortedPoints.value.length === 0) return ''
  const pts = sortedPoints.value
  const bottom = padTop + drawHeight
  const firstX = getX(pts[0].minute)
  const lastX = getX(pts[pts.length - 1].minute)
  const line = pts.map((p) => `${getX(p.minute)},${getY(p.count)}`).join(' L ')
  return `M ${firstX},${bottom} L ${line} L ${lastX},${bottom} Z`
})

function getX(minute) {
  const dur = props.duration || 1
  return padLeft + (minute / dur) * drawWidth.value
}

function getY(count) {
  return padTop + (1 - count / maxCount.value) * drawHeight
}

function getMinuteFromX(x) {
  const dur = props.duration || 1
  const minute = Math.round(((x - padLeft) / drawWidth.value) * dur)
  return Math.max(0, Math.min(dur, minute))
}

function getCountFromY(y) {
  const count = Math.round((1 - (y - padTop) / drawHeight) * maxCount.value)
  return Math.max(0, count)
}

function shouldShowLabel(index) {
  if (sortedPoints.value.length <= 15) return true
  if (index === 0 || index === sortedPoints.value.length - 1) return true
  if (draggingIndex.value === index) return true
  const step = Math.max(1, Math.floor(sortedPoints.value.length / 15))
  return index % step === 0
}

function getSvgCoords(event) {
  const svg = svgEl.value
  if (!svg) return { x: 0, y: 0 }
  const rect = svg.getBoundingClientRect()
  const clientX = event.touches ? event.touches[0].clientX : event.clientX
  const clientY = event.touches ? event.touches[0].clientY : event.clientY
  return {
    x: clientX - rect.left,
    y: clientY - rect.top
  }
}

function startDrag(index, event) {
  event.preventDefault()
  draggingIndex.value = index
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
  document.addEventListener('touchmove', onDrag, { passive: false })
  document.addEventListener('touchend', stopDrag)
}

function onDrag(event) {
  if (draggingIndex.value === null) return
  event.preventDefault()

  const { x, y } = getSvgCoords(event)
  const newPoints = [...sortedPoints.value]
  newPoints[draggingIndex.value] = {
    minute: getMinuteFromX(x),
    count: getCountFromY(y)
  }
  emit('update:modelValue', newPoints)
}

function stopDrag() {
  draggingIndex.value = null
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
  document.removeEventListener('touchmove', onDrag)
  document.removeEventListener('touchend', stopDrag)
}

function onSvgMouseDown(event) {
  // Клик по пустому месту — ничего не делаем
}

function updatePoint(index, field, value) {
  const newPoints = [...sortedPoints.value]
  newPoints[index] = { ...newPoints[index], [field]: Number(value) }
  emit('update:modelValue', newPoints)
}

function addPoint() {
  const pts = [...sortedPoints.value]
  if (pts.length < 2) {
    pts.push({ minute: Math.round(props.duration / 2), count: 50 })
    emit('update:modelValue', pts)
    return
  }

  let bestIdx = 0
  let bestGap = 0
  for (let i = 0; i < pts.length - 1; i++) {
    const gap = pts[i + 1].minute - pts[i].minute
    if (gap > bestGap) {
      bestGap = gap
      bestIdx = i
    }
  }

  const midMinute = Math.round((pts[bestIdx].minute + pts[bestIdx + 1].minute) / 2)
  const midCount = Math.round((pts[bestIdx].count + pts[bestIdx + 1].count) / 2)
  pts.push({ minute: midMinute, count: midCount })
  emit('update:modelValue', pts)
}

function removePoint(index) {
  if (sortedPoints.value.length <= 2) return
  const newPoints = [...sortedPoints.value]
  newPoints.splice(index, 1)
  emit('update:modelValue', newPoints)
}

function handleResize() {
  if (chartContainer.value) {
    chartWidth.value = chartContainer.value.clientWidth - 2 // 2px for border
  }
}

onMounted(() => {
  handleResize()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.online-chart-editor {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.chart-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.chart-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--wr-text-primary);
}

.btn-add-point {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 8px;
  background: var(--wr-btn-bg);
  color: var(--wr-text-primary);
  border: 1px solid var(--wr-border);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-add-point:hover {
  background: var(--wr-btn-hover-bg);
  border-color: var(--wr-btn-hover-border);
}

.chart-container {
  width: 100%;
  background: var(--wr-bg-card);
  border: 1px solid var(--wr-border);
  border-radius: 12px;
  overflow: hidden;
}

.chart-svg {
  display: block;
  user-select: none;
  -webkit-user-select: none;
}

.point-hitarea {
  cursor: grab;
}

.point-hitarea:hover + .point-circle {
  r: 8;
  filter: drop-shadow(0 0 6px rgba(248, 0, 91, 0.4));
}

.point-circle {
  transition:
    r 0.15s,
    filter 0.15s;
  pointer-events: none;
}

.point-circle.dragging {
  r: 8;
  filter: drop-shadow(0 0 8px rgba(248, 0, 91, 0.6));
}

.points-list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-radius: 8px;
  background: var(--wr-bg-card);
  border: 1px solid var(--wr-border);
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: var(--wr-text-secondary);
  transition: background 0.2s;
}

.points-list-header:hover {
  background: var(--wr-btn-hover-bg);
}

.points-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 300px;
  overflow-y: auto;
}

.point-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: var(--wr-bg-card);
  border: 1px solid var(--wr-border);
  border-radius: 8px;
}

.point-inputs {
  flex: 1;
  display: flex;
  gap: 10px;
}

.input-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.input-group label {
  font-size: 11px;
  font-weight: 500;
  color: var(--wr-text-secondary);
}

.point-input {
  padding: 6px 8px;
  border-radius: 6px;
  font-size: 13px;
  color: var(--wr-text-primary);
  background: var(--wr-input-bg);
  border: 1px solid var(--wr-input-border);
  transition: all 0.2s;
}

.point-input:focus {
  outline: none;
  background: var(--wr-input-focus-bg);
  border-color: #f8005b;
  box-shadow: 0 0 0 3px rgba(248, 0, 91, 0.12);
}

.btn-remove {
  padding: 6px 8px;
  border-radius: 6px;
  background: transparent;
  color: var(--wr-text-tertiary);
  border: 1px solid var(--wr-border);
  cursor: pointer;
  transition: all 0.2s;
}

.btn-remove:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.3);
  color: #ef4444;
}

.btn-remove:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
