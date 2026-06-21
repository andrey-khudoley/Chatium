<template>
  <div class="video-modal-overlay" @click.self="close">
    <div class="video-modal-content">
      <!-- Видео превью -->
      <div v-if="!recordedBlob" class="video-preview-container" :class="{ 'is-recording': isRecording }">
        <video
          ref="videoPreview"
          class="video-preview"
          autoplay
          playsinline
          muted
        />

        <!-- Круглая маска для кружочка -->
        <div class="circle-mask" v-if="!recordedBlob">
          <svg viewBox="0 0 100 100">
            <defs>
              <clipPath id="circleClip">
                <circle cx="50" cy="50" r="48"/>
              </clipPath>
            </defs>
          </svg>
        </div>

        <!-- Индикатор записи -->
        <div v-if="isRecording" class="recording-indicator">
          <span class="record-dot"></span>
          <span class="record-timer">{{ formatDuration(recordingDuration) }}</span>
        </div>

        <!-- Прогресс максимальной длительности -->
        <div v-if="isRecording" class="duration-progress">
          <svg viewBox="0 0 100 100">
            <circle
              class="progress-bg"
              cx="50" cy="50" r="48"
            />
            <circle
              class="progress-fill"
              cx="50" cy="50" r="48"
              :style="progressStyle"
            />
          </svg>
        </div>
      </div>

      <!-- Управление -->
      <div class="video-controls">
        <template v-if="!recordedBlob">
          <!-- Кнопка записи/остановки -->
          <button
            class="btn-record-circle"
            :class="{ 'is-recording': isRecording }"
            @click="toggleRecording"
          >
            <div class="record-inner"></div>
          </button>

          <p class="record-hint">
            {{ isRecording ? 'Нажмите для остановки' : 'Нажмите для начала записи' }}
          </p>
          <p class="record-limit">Максимум 1 минута</p>
        </template>

        <template v-else>
          <!-- Просмотр записанного -->
          <video
            ref="recordedVideo"
            class="recorded-preview"
            :src="recordedUrl"
            playsinline
            controls
          />

          <div class="recorded-actions">
            <button class="btn-retake" @click="retake">
              <i class="fas fa-redo"></i>
              Перезаписать
            </button>
            <button class="btn-send-video" @click="sendVideo">
              <i class="fas fa-paper-plane"></i>
              Отправить
            </button>
          </div>
        </template>
      </div>

      <!-- Кнопка закрыть -->
      <button class="btn-close-modal" @click="close">
        <i class="fas fa-times"></i>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const emit = defineEmits(['recorded', 'close'])

const MAX_DURATION = 60

const isRecording = ref(false)
const recordingDuration = ref(0)
const recordedBlob = ref(null)
const recordedUrl = ref('')
const stream = ref(null)
const mediaRecorder = ref(null)
const chunks = ref([])
const timerInterval = ref(null)

const videoPreview = ref(null)
const recordedVideo = ref(null)

const progressStyle = computed(() => {
  const circumference = 2 * Math.PI * 48
  const progress = recordingDuration.value / MAX_DURATION
  const dashoffset = circumference * (1 - progress)

  return {
    strokeDasharray: `${circumference} ${circumference}`,
    strokeDashoffset: dashoffset,
    transform: 'rotate(-90deg)',
    transformOrigin: '50% 50%'
  }
})

function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

async function initCamera() {
  try {
    stream.value = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 720 },
        height: { ideal: 720 },
        facingMode: 'user'
      },
      audio: true
    })

    if (videoPreview.value) {
      videoPreview.value.srcObject = stream.value
    }
  } catch (err) {
    console.error('Failed to access camera:', err)
    alert('Не удалось получить доступ к камере')
    close()
  }
}

function toggleRecording() {
  if (isRecording.value) {
    stopRecording()
  } else {
    startRecording()
  }
}

function startRecording() {
  if (!stream.value) return

  const mimeType = getSupportedVideoMimeType()

  try {
    mediaRecorder.value = new MediaRecorder(stream.value, { mimeType })
    chunks.value = []

    mediaRecorder.value.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.value.push(event.data)
      }
    }

    mediaRecorder.value.onstop = () => {
      handleRecordingComplete()
    }

    mediaRecorder.value.start(100)
    isRecording.value = true
    recordingDuration.value = 0

    timerInterval.value = setInterval(() => {
      recordingDuration.value++

      if (recordingDuration.value >= MAX_DURATION) {
        stopRecording()
      }
    }, 1000)

  } catch (err) {
    console.error('Failed to start recording:', err)
    alert('Не удалось начать запись')
  }
}

function stopRecording() {
  if (mediaRecorder.value && mediaRecorder.value.state !== 'inactive') {
    mediaRecorder.value.stop()
  }

  isRecording.value = false

  if (timerInterval.value) {
    clearInterval(timerInterval.value)
    timerInterval.value = null
  }
}

function handleRecordingComplete() {
  // console.log('[VideoRecorderModal] Recording complete, chunks:', chunks.value.length)
  
  if (chunks.value.length === 0) {
    console.error('[VideoRecorderModal] No chunks recorded')
    return
  }

  const mimeType = mediaRecorder.value?.mimeType || 'video/webm'
  const totalSize = chunks.value.reduce((sum, chunk) => sum + chunk.size, 0)
  
  // console.log('[VideoRecorderModal] Creating blob:', {
  //   chunks: chunks.value.length,
  //   totalSize: totalSize,
  //   mimeType: mimeType
  // })
  
  recordedBlob.value = new Blob(chunks.value, { type: mimeType })
  recordedUrl.value = URL.createObjectURL(recordedBlob.value)
  
  // console.log('[VideoRecorderModal] Blob created:', {
  //   blobSize: recordedBlob.value.size,
  //   blobType: recordedBlob.value.type
  // })

  if (videoPreview.value) {
    videoPreview.value.srcObject = null
  }
}

function retake() {
  recordedBlob.value = null
  if (recordedUrl.value) {
    URL.revokeObjectURL(recordedUrl.value)
    recordedUrl.value = ''
  }

  if (videoPreview.value && stream.value) {
    videoPreview.value.srcObject = stream.value
  }
}

function sendVideo() {
  if (!recordedBlob.value) {
    console.error('[VideoRecorderModal] No recorded blob to send')
    return
  }

  const extension = getExtensionFromMimeType(recordedBlob.value.type)
  const fileName = `video-note-${Date.now()}.${extension}`
  
  // console.log('[VideoRecorderModal] Creating video file:', {
  //   blobSize: recordedBlob.value.size,
  //   blobType: recordedBlob.value.type,
  //   fileName: fileName,
  //   duration: recordingDuration.value
  // })
  
  const file = new File([recordedBlob.value], fileName, {
    type: recordedBlob.value.type,
    lastModified: Date.now()
  })

  file.isVideoNote = true
  file.duration = recordingDuration.value
  
  // console.log('[VideoRecorderModal] Video file created:', {
  //   name: file.name,
  //   size: file.size,
  //   type: file.type,
  //   isVideoNote: file.isVideoNote,
  //   duration: file.duration,
  //   lastModified: file.lastModified
  // })

  emit('recorded', { file, duration: recordingDuration.value })
  close()
}

function getSupportedVideoMimeType() {
  const types = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4;codecs=h264,aac',
    'video/mp4'
  ]

  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type
    }
  }

  return 'video/webm'
}

function getExtensionFromMimeType(mimeType) {
  if (mimeType.includes('mp4')) return 'mp4'
  if (mimeType.includes('webm')) return 'webm'
  if (mimeType.includes('ogg')) return 'ogg'
  return 'webm'
}

function cleanup() {
  if (timerInterval.value) {
    clearInterval(timerInterval.value)
    timerInterval.value = null
  }

  if (stream.value) {
    stream.value.getTracks().forEach(track => track.stop())
    stream.value = null
  }

  mediaRecorder.value = null
  chunks.value = []
  isRecording.value = false
  recordingDuration.value = 0
}

function close() {
  stopRecording()
  cleanup()
  if (recordedUrl.value) {
    URL.revokeObjectURL(recordedUrl.value)
    recordedUrl.value = ''
  }
  emit('close')
}

onMounted(() => {
  initCamera()
})

onUnmounted(() => {
  cleanup()
  if (recordedUrl.value) {
    URL.revokeObjectURL(recordedUrl.value)
  }
})
</script>

<style scoped>
.video-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.video-modal-content {
  position: relative;
  background: #111b21;
  border-radius: 20px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

/* Контейнер превью */
.video-preview-container {
  position: relative;
  width: 320px;
  height: 320px;
  border-radius: 50%;
  overflow: hidden;
  background: #000;
}

.video-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scaleX(-1);
}

/* Маска для кружочка */
.circle-mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

/* Индикатор записи */
.recording-indicator {
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(0, 0, 0, 0.6);
  padding: 6px 12px;
  border-radius: 20px;
}

.record-dot {
  width: 8px;
  height: 8px;
  background: #ef4444;
  border-radius: 50%;
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.record-timer {
  color: white;
  font-size: 14px;
  font-weight: 500;
}

/* Прогресс записи */
.duration-progress {
  position: absolute;
  top: -4px;
  left: -4px;
  right: -4px;
  bottom: -4px;
  pointer-events: none;
}

.duration-progress svg {
  width: 100%;
  height: 100%;
}

.progress-bg {
  fill: none;
  stroke: rgba(255, 255, 255, 0.2);
  stroke-width: 3;
}

.progress-fill {
  fill: none;
  stroke: #008069;
  stroke-width: 3;
  stroke-linecap: round;
  transition: stroke-dashoffset 0.3s;
}

/* Управление */
.video-controls {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

/* Кнопка записи */
.btn-record-circle {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  border: 4px solid white;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.btn-record-circle:hover {
  transform: scale(1.05);
}

.btn-record-circle.is-recording {
  border-color: #ef4444;
}

.record-inner {
  width: 56px;
  height: 56px;
  background: #ef4444;
  border-radius: 50%;
  transition: all 0.2s;
}

.btn-record-circle.is-recording .record-inner {
  width: 24px;
  height: 24px;
  border-radius: 4px;
}

.record-hint {
  color: white;
  font-size: 14px;
  margin: 0;
}

.record-limit {
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
  margin: 0;
}

/* Просмотр записанного */
.recorded-preview {
  width: 320px;
  height: 320px;
  border-radius: 50%;
  object-fit: cover;
}

.recorded-actions {
  display: flex;
  gap: 16px;
}

.btn-retake,
.btn-send-video {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border-radius: 24px;
  border: none;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-retake {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.btn-retake:hover {
  background: rgba(255, 255, 255, 0.2);
}

.btn-send-video {
  background: #008069;
  color: white;
}

.btn-send-video:hover {
  background: #006c58;
}

/* Кнопка закрыть */
.btn-close-modal {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  transition: all 0.2s;
}

.btn-close-modal:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* Адаптивность */
@media (max-width: 480px) {
  .video-modal-content {
    width: 100%;
    height: 100%;
    border-radius: 0;
    justify-content: center;
  }

  .video-preview-container,
  .recorded-preview {
    width: 280px;
    height: 280px;
  }
}
</style>