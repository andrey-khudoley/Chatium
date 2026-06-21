<template>
  <div class="flex items-center gap-4">
    <button
      type="button"
      class="flex h-10 w-10 items-center justify-center rounded-full bg-sky-500 text-white shadow-inner transition hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-300 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-200 disabled:opacity-70 disabled:shadow-none"
      @click="togglePlayback"
      :disabled="!sourceUrl || hasError"
    >
      <i class="fas text-lg" :class="isPlaying ? 'fa-pause' : 'fa-play'"></i>
    </button>

    <div class="flex min-w-0 flex-1 flex-col gap-1">
      <div class="audio-wave" :class="{ 'is-playing': isPlaying }" @click="seek">
        <span
          v-for="(height, index) in waveformBars"
          :key="index"
          class="audio-wave__bar"
          :class="{ 'is-active': index < activeBarCount }"
          :style="{ height: `${height}%`, '--bar-index': index }"
        ></span>
      </div>

      <div class="flex items-center justify-between text-[11px] text-slate-500 tabular-nums">
        <span>{{ formattedCurrentTime }}</span>
      </div>

      <div v-if="hasError" class="text-xs text-red-500">Не удалось воспроизвести аудио</div>
    </div>

    <audio
      ref="audioRef"
      class="hidden"
      :src="sourceUrl"
      preload="metadata"
      @timeupdate="handleTimeUpdate"
      @loadedmetadata="handleLoadedMetadata"
      @play="handlePlay"
      @pause="handlePause"
      @ended="handleEnded"
      @error="handleError"
    ></audio>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps({
  file: {
    type: Object,
    required: true
  }
})

const audioRef = ref(null)
const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const hasError = ref(false)
const progressRatio = ref(0)

const sourceUrl = computed(() => props.file?.url || props.file?.downloadUrl || '')

const progress = computed(() => Math.min(100, Math.max(0, progressRatio.value * 100)))

const formattedSize = computed(() => formatFileSize(props.file?.size))
const formattedCurrentTime = computed(() => formatTime(currentTime.value))
const formattedDuration = computed(() => (duration.value ? formatTime(duration.value) : '00:00'))

const waveformBars = Object.freeze([
  32, 58, 44, 72, 64, 52, 38, 68, 46, 60, 54, 76, 48, 40, 70, 56, 62, 50, 74, 58, 36, 66, 42, 68,
  52, 60, 46, 72, 58, 44, 64, 50
])

const activeBarCount = computed(() => {
  if (!waveformBars.length) {
    return 0
  }

  const count = Math.round(progressRatio.value * waveformBars.length)
  return Math.min(waveformBars.length, Math.max(0, count))
})

watch(
  () => sourceUrl.value,
  () => {
    stopPlayback()
    currentTime.value = 0
    duration.value = 0
    hasError.value = false
    progressRatio.value = 0
    audioRef.value?.load?.()
  }
)

onBeforeUnmount(() => {
  stopPlayback()
})

const togglePlayback = async () => {
  const audio = audioRef.value
  if (!audio || !sourceUrl.value || hasError.value) {
    return
  }

  if (isPlaying.value) {
    audio.pause()
    return
  }

  try {
    pauseOtherMedia(audio)
    await audio.play()
  } catch (error) {
    hasError.value = true
  }
}

const seek = (event) => {
  const audio = audioRef.value
  if (!audio || hasError.value) {
    return
  }

  const rect = event.currentTarget.getBoundingClientRect()
  const ratio = rect.width ? Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1) : 0

  const totalDuration = getEffectiveDuration(audio) || duration.value
  if (!totalDuration) {
    return
  }

  audio.currentTime = totalDuration * ratio
  currentTime.value = audio.currentTime
  progressRatio.value = Math.min(1, Math.max(0, audio.currentTime / totalDuration))
}

const handleTimeUpdate = () => {
  const audio = audioRef.value
  if (!audio) {
    return
  }
  currentTime.value = audio.currentTime

  const totalDuration = getEffectiveDuration(audio)
  if (totalDuration) {
    duration.value = totalDuration
  }

  const effectiveDuration = totalDuration || duration.value
  if (effectiveDuration) {
    progressRatio.value = Math.min(1, Math.max(0, audio.currentTime / effectiveDuration))
  }
}

const handleLoadedMetadata = () => {
  const audio = audioRef.value
  if (!audio) {
    return
  }
  const totalDuration = getEffectiveDuration(audio) || audio.duration
  if (totalDuration) {
    duration.value = totalDuration
    progressRatio.value = Math.min(1, Math.max(0, audio.currentTime / totalDuration))
  }
}

const handlePlay = () => {
  isPlaying.value = true
  hasError.value = false
}

const handlePause = () => {
  isPlaying.value = false
}

const handleEnded = () => {
  isPlaying.value = false
  currentTime.value = 0
  progressRatio.value = 0
}

const handleError = () => {
  hasError.value = true
  isPlaying.value = false
}

const stopPlayback = () => {
  const audio = audioRef.value
  if (audio) {
    audio.pause()
    audio.currentTime = 0
  }
  isPlaying.value = false
  progressRatio.value = 0
}

const pauseOtherMedia = (current) => {
  if (typeof document === 'undefined') {
    return
  }

  document.querySelectorAll('audio, video').forEach((element) => {
    if (element !== current) {
      element.pause?.()
    }
  })
}

const formatTime = (value) => {
  if (!Number.isFinite(value) || value < 0) {
    return '00:00'
  }

  const minutes = Math.floor(value / 60)
  const seconds = Math.floor(value % 60)

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

const formatFileSize = (bytes) => {
  if (!Number.isFinite(Number(bytes)) || Number(bytes) <= 0) {
    return ''
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const value = Number(bytes)
  const exponent = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1)
  const size = value / Math.pow(1024, exponent)

  const formatted = size < 10 && exponent > 0 ? size.toFixed(1) : size.toFixed(0)

  return `${formatted} ${units[exponent]}`
}

const getEffectiveDuration = (audio) => {
  if (!audio) {
    return 0
  }

  const nativeDuration = audio.duration
  if (Number.isFinite(nativeDuration) && nativeDuration > 0) {
    return nativeDuration
  }

  const seekableEnd = getTimeRangeEnd(audio.seekable)
  if (seekableEnd > 0) {
    return seekableEnd
  }

  const bufferedEnd = getTimeRangeEnd(audio.buffered)
  if (bufferedEnd > 0) {
    return bufferedEnd
  }

  return 0
}

const getTimeRangeEnd = (ranges) => {
  if (!ranges || typeof ranges.length !== 'number' || ranges.length === 0) {
    return 0
  }

  try {
    const end = ranges.end(ranges.length - 1)
    return Number.isFinite(end) && end > 0 ? end : 0
  } catch (error) {
    return 0
  }
}
</script>

<style scoped>
.audio-wave {
  position: relative;
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(3px, 1fr);
  align-items: end;
  gap: 2px;
  height: 22px;
  cursor: pointer;
  overflow: hidden;
}

.audio-wave__bar {
  width: 100%;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.35);
  transition:
    background-color 0.2s ease,
    transform 0.2s ease,
    opacity 0.2s ease;
  opacity: 0.65;
}

.audio-wave__bar.is-active {
  background: #38bdf8;
  opacity: 1;
}

.audio-wave.is-playing .audio-wave__bar.is-active {
  animation: barPulse 1.6s ease-in-out infinite;
  animation-delay: calc(var(--bar-index) * 35ms);
}

@keyframes barPulse {
  0%,
  100% {
    transform: scaleY(1);
  }
  50% {
    transform: scaleY(1.05);
  }
}
</style>
