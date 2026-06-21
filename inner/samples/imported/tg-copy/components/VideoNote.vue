<template>
  <div class="video-note" :class="{ 'is-playing': isPlaying }">
    <!-- Видео в кружочке -->
    <div 
      v-if="videoUrl"
      class="video-circle"
      @click.stop="togglePlay"
      @touchstart.stop="handleTouchStart"
      @touchend.stop="handleTouchEnd"
      @mouseenter="handleMouseEnter"
      @mouseleave="handleMouseLeave"
    >
      <video
        ref="videoElement"
        :src="videoUrl"
        class="video-content"
        playsinline
        preload="metadata"
        @ended="onEnded"
      />
      
      <!-- Превью (пока видео не загружено) -->
      <div v-if="!isLoaded" class="video-placeholder">
        <i class="fas fa-spinner fa-spin"></i>
      </div>
      
      <!-- Иконка воспроизведения (когда на паузе) -->
      <div v-if="!isPlaying && isLoaded" class="play-overlay">
        <i class="fas fa-play"></i>
      </div>
      
      <!-- Иконка паузы (при наведении на играющее видео) -->
      <div v-if="isPlaying && showPauseOverlay" class="pause-overlay" @click.stop.prevent="togglePlay">
        <i class="fas fa-pause"></i>
      </div>
      
      <!-- Длительность -->
      <div v-if="duration > 0 && !isPlaying" class="duration-badge">
        {{ formatDuration(duration) }}
      </div>
    </div>
    
    <!-- Заглушка если нет videoUrl -->
    <div v-else class="video-circle video-error">
      <div class="video-placeholder">
        <i class="fas fa-exclamation-triangle"></i>
        <span>Видео недоступно</span>
      </div>
    </div>
    
    <!-- Прогресс (показывается при наведении/воспроизведении) -->
    <div 
      v-if="isPlaying || showProgress"
      class="video-progress-container"
      @click.stop="seekTo"
    >
      <div class="video-progress-bar">
        <div 
          class="video-progress-fill"
          :style="{ width: progressPercent + '%' }"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  file: {
    type: Object,
    required: true
  },
  duration: {
    type: Number,
    default: 0
  }
})

const videoElement = ref(null)
const isPlaying = ref(false)
const isLoaded = ref(false)
const showProgress = ref(false)
const showPauseOverlay = ref(false)
const currentTime = ref(0)
const videoDuration = ref(props.duration)

const videoUrl = computed(() => {
  if (!props.file) return ''
  const fileId = props.file.hash || props.file.uid
  if (!fileId) {
    console.warn('[VideoNote] Missing hash/uid for file:', props.file?.name)
    return ''
  }
  return `https://fs.chatium.ru/get/${fileId}`
})

const progressPercent = computed(() => {
  if (videoDuration.value === 0) return 0
  return (currentTime.value / videoDuration.value) * 100
})

// Форматирование длительности
function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00'
  const secs = Math.floor(seconds)
  return `${secs}s`
}

// Переключение воспроизведения
function togglePlay() {
  if (!videoElement.value) return
  
  if (isPlaying.value) {
    videoElement.value.pause()
    isPlaying.value = false
  } else {
    // Останавливаем другие видео
    document.querySelectorAll('video').forEach(video => {
      if (video !== videoElement.value) {
        video.pause()
      }
    })
    
    videoElement.value.play().then(() => {
      isPlaying.value = true
    }).catch(err => {
      console.error('Failed to play video:', err)
    })
  }
}

// Перемотка
function seekTo(event) {
  if (!videoElement.value || videoDuration.value === 0) return
  
  const rect = event.currentTarget.getBoundingClientRect()
  const x = event.clientX - rect.left
  const percent = x / rect.width
  
  videoElement.value.currentTime = percent * videoDuration.value
}

// Обработчики событий
function onEnded() {
  isPlaying.value = false
  currentTime.value = 0
}

function updateProgress() {
  if (videoElement.value) {
    currentTime.value = videoElement.value.currentTime
    if (videoElement.value.duration && !isNaN(videoElement.value.duration)) {
      videoDuration.value = videoElement.value.duration
    }
  }
  
  if (isPlaying.value) {
    requestAnimationFrame(updateProgress)
  }
}

// Наведение для показа прогресса и паузы
function handleMouseEnter() {
  showProgress.value = true
  showPauseOverlay.value = true
}

function handleMouseLeave() {
  if (!isPlaying.value) {
    showProgress.value = false
  }
  showPauseOverlay.value = false
}

// Обработчики touch событий для предотвращения всплытия
function handleTouchStart(event) {
  // Предотвращаем всплытие для избежания конфликтов с контекстным меню
  event.stopPropagation()
}

function handleTouchEnd(event) {
  // Предотвращаем всплытие для избежания конфликтов с контекстным меню
  event.stopPropagation()
}

onMounted(() => {
  if (videoElement.value) {
    // Слушаем загрузку метаданных
    videoElement.value.addEventListener('loadedmetadata', () => {
      isLoaded.value = true
      if (videoElement.value.duration && !isNaN(videoElement.value.duration)) {
        videoDuration.value = videoElement.value.duration
      }
    })
    
    // Логируем ошибки
    videoElement.value.addEventListener('error', (e) => {
      console.error('[VideoNote] Video error:', videoElement.value?.error)
    })
    
    // Слушаем обновление времени
    videoElement.value.addEventListener('timeupdate', () => {
      currentTime.value = videoElement.value.currentTime
    })
    
    // Слушаем начало воспроизведения
    videoElement.value.addEventListener('play', () => {
      isPlaying.value = true
      updateProgress()
    })
    
    // Слушаем паузу
    videoElement.value.addEventListener('pause', () => {
      isPlaying.value = false
    })
    
    // Проверяем, что видео уже загружено
    if (videoElement.value?.readyState >= 1) {
      isLoaded.value = true
    }
  }
})

onUnmounted(() => {
  if (videoElement.value) {
    videoElement.value.pause()
  }
})
</script>

<style scoped>
.video-note {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.video-circle {
  position: relative;
  width: 200px;
  height: 200px;
  border-radius: 50%;
  overflow: hidden;
  cursor: pointer;
  background: #111b21;
  transition: transform 0.2s;
}

.video-circle:hover {
  transform: scale(1.02);
}

.video-circle.video-error {
  background: #333;
  cursor: not-allowed;
}

.video-circle.video-error .video-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #999;
  font-size: 14px;
  gap: 8px;
}

.video-circle.video-error .video-placeholder i {
  font-size: 32px;
}

.video-content {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.video-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 24px;
}

.play-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.3);
  transition: background 0.2s;
}

.video-circle:hover .play-overlay {
  background: rgba(0, 0, 0, 0.5);
}

.play-overlay i {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.7);
  color: #111b21;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  padding-left: 4px; /* Оптическая компенсация для иконки play */
  opacity: 0.8;
}

/* Оверлей паузы - полностью прозрачный, не мешает просмотру */
.pause-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  cursor: pointer;
}

.pause-overlay i {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  opacity: 0; /* Полностью прозрачная иконка */
}

.duration-badge {
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.6);
  color: white;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

/* Прогресс */
.video-progress-container {
  width: 180px;
  padding: 8px 0;
  cursor: pointer;
}

.video-progress-bar {
  height: 3px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 2px;
  overflow: hidden;
}

.video-progress-fill {
  height: 100%;
  background: #008069;
  transition: width 0.1s;
}

/* Адаптивность */
@media (max-width: 480px) {
  .video-circle {
    width: 160px;
    height: 160px;
  }
  
  .video-progress-container {
    width: 140px;
  }
}
</style>