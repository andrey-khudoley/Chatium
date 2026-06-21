<template>
  <div class="inline-voice-recorder">
    <!-- Кнопка отмены слева -->
    <button 
      type="button" 
      class="btn-cancel-record"
      @click="cancelRecording"
      title="Отменить"
    >
      <i class="fas fa-times"></i>
    </button>

    <!-- Waveform и таймер по центру -->
    <div class="recording-waveform">
      <canvas ref="waveformCanvas" width="300" height="40"></canvas>
    </div>
    
    <div class="recording-timer" :class="{ 'is-recording': isRecording }">
      <span class="record-dot"></span>
      {{ formatDuration(recordingDuration) }}
    </div>

    <!-- Кнопка отправки справа -->
    <button 
      type="button"
      class="btn-send-record"
      @click="finishRecording"
      :disabled="recordingDuration < 1"
      title="Отправить"
    >
      <i class="fas fa-check"></i>
    </button>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'

const emit = defineEmits(['recorded', 'cancel'])

const isRecording = ref(false)
const wakeLock = ref(null)
const isCancelled = ref(false)
const recordingDuration = ref(0)
const mediaRecorder = ref(null)
const audioChunks = ref([])
const audioContext = ref(null)
const analyser = ref(null)
const dataArray = ref(null)
const source = ref(null)
const animationId = ref(null)
const timerInterval = ref(null)
const stream = ref(null)
const waveformCanvas = ref(null)

// Форматирование времени записи
function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Получение цвета из CSS переменных
function getWaveformColor() {
  const root = document.documentElement
  return getComputedStyle(root).getPropertyValue('--primary-color').trim() || '#2AABEE'
}

// Рисование waveform
function drawWaveform() {
  if (!analyser.value || !waveformCanvas.value) return
  
  const canvas = waveformCanvas.value
  const ctx = canvas.getContext('2d')
  const width = canvas.width
  const height = canvas.height
  
  analyser.value.getByteFrequencyData(dataArray.value)
  
  ctx.clearRect(0, 0, width, height)
  
  const barWidth = 3
  const gap = 2
  const bars = Math.floor(width / (barWidth + gap))
  const step = Math.floor(dataArray.value.length / bars)
  
  const color = getWaveformColor()
  
  for (let i = 0; i < bars; i++) {
    const value = dataArray.value[i * step]
    const percent = value / 255
    const barHeight = Math.max(4, percent * height * 0.8)
    const x = i * (barWidth + gap)
    const y = (height - barHeight) / 2
    
    ctx.fillStyle = color
    ctx.roundRect(x, y, barWidth, barHeight, 2)
    ctx.fill()
  }
  
  animationId.value = requestAnimationFrame(drawWaveform)
}

// Начало записи при монтировании
onMounted(async () => {
  await startRecording()
})

// Очистка при размонтировании
onUnmounted(() => {
  cleanup()
})

async function startRecording() {
  try {
    // Запрашиваем доступ к микрофону
    stream.value = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 44100
      }
    })
    
    // Создаем AudioContext для анализа
    audioContext.value = new (window.AudioContext || window.webkitAudioContext)()
    analyser.value = audioContext.value.createAnalyser()
    analyser.value.fftSize = 256
    
    source.value = audioContext.value.createMediaStreamSource(stream.value)
    source.value.connect(analyser.value)
    
    const bufferLength = analyser.value.frequencyBinCount
    dataArray.value = new Uint8Array(bufferLength)
    
    // Создаем MediaRecorder
    const mimeType = getSupportedMimeType()
    mediaRecorder.value = new MediaRecorder(stream.value, { mimeType })
    audioChunks.value = []
    
    mediaRecorder.value.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.value.push(event.data)
      }
    }
    
    mediaRecorder.value.onstop = () => {
      handleRecordingStop()
    }
    
    // Начинаем запись
    mediaRecorder.value.start(100)
    isRecording.value = true
    recordingDuration.value = 0
    
    // Запрашиваем Wake Lock
    await requestWakeLock()
    
    // Запускаем таймер
    timerInterval.value = setInterval(() => {
      recordingDuration.value++
    }, 1000)
    
    // Запускаем анимацию waveform
    await nextTick()
    drawWaveform()
    
  } catch (err) {
    console.error('Failed to start recording:', err)
    alert('Не удалось получить доступ к микрофону')
    emit('cancel')
    cleanup()
  }
}

// Получение поддерживаемого MIME типа
function getSupportedMimeType() {
  const preferredType = 'audio/webm;codecs=opus'
  
  if (MediaRecorder.isTypeSupported(preferredType)) {
    return preferredType
  }
  
  const fallbackTypes = [
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
    'audio/ogg',
    'audio/wav'
  ]
  
  for (const type of fallbackTypes) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type
    }
  }
  
  return 'audio/webm'
}

// Запрос Wake Lock
async function requestWakeLock() {
  if ('wakeLock' in navigator) {
    try {
      wakeLock.value = await navigator.wakeLock.request('screen')
    } catch (err) {
      console.warn('Не удалось активировать Wake Lock:', err)
    }
  }
}

// Освобождение Wake Lock
async function releaseWakeLock() {
  if (wakeLock.value) {
    try {
      await wakeLock.value.release()
      wakeLock.value = null
    } catch (err) {
      console.warn('Ошибка при освобождении Wake Lock:', err)
    }
  }
}

// Завершение записи (отправка)
function finishRecording() {
  if (mediaRecorder.value && mediaRecorder.value.state !== 'inactive') {
    mediaRecorder.value.stop()
  }
}

// Обработка остановки записи
function handleRecordingStop() {
  if (isCancelled.value) {
    cleanup()
    isCancelled.value = false
    return
  }

  if (audioChunks.value.length === 0) {
    cleanup()
    isCancelled.value = false
    return
  }
  
  const mimeType = mediaRecorder.value?.mimeType || 'audio/webm'
  const extension = getExtensionFromMimeType(mimeType)
  
  try {
    const audioBlob = new Blob(audioChunks.value, { type: mimeType })
    
    if (audioBlob.size === 0) {
      console.error('Recorded blob is empty')
      alert('Ошибка записи: пустой аудиофайл')
      cleanup()
      isCancelled.value = false
      return
    }
    
    const file = new File([audioBlob], `voice-message-${Date.now()}.${extension}`, { 
      type: mimeType,
      lastModified: Date.now()
    })
    
    file.duration = recordingDuration.value
    file.isVoiceMessage = true
    
    emit('recorded', { file, duration: recordingDuration.value })
  } catch (err) {
    console.error('Failed to create voice file:', err)
    alert('Ошибка создания аудиофайла')
  }
  
  cleanup()
  isCancelled.value = false
}

// Получение расширения из MIME типа
function getExtensionFromMimeType(mimeType) {
  if (mimeType.includes('webm')) return 'webm'
  if (mimeType.includes('mp4')) return 'm4a'
  if (mimeType.includes('ogg')) return 'ogg'
  if (mimeType.includes('wav')) return 'wav'
  if (mimeType.includes('mpeg')) return 'mp3'
  return 'webm'
}

// Отмена записи
function cancelRecording() {
  if (!isRecording.value) {
    emit('cancel')
    return
  }

  isCancelled.value = true

  if (mediaRecorder.value && mediaRecorder.value.state !== 'inactive') {
    mediaRecorder.value.stop()
  }
  
  emit('cancel')
}

// Очистка ресурсов
async function cleanup() {
  isRecording.value = false
  
  await releaseWakeLock()
  
  if (timerInterval.value) {
    clearInterval(timerInterval.value)
    timerInterval.value = null
  }
  
  if (animationId.value) {
    cancelAnimationFrame(animationId.value)
    animationId.value = null
  }
  
  if (stream.value) {
    stream.value.getTracks().forEach(track => track.stop())
    stream.value = null
  }
  
  if (audioContext.value && audioContext.value.state !== 'closed') {
    audioContext.value.close().catch(console.error)
    audioContext.value = null
  }
  
  analyser.value = null
  source.value = null
  dataArray.value = null
  mediaRecorder.value = null
  audioChunks.value = []
  isCancelled.value = false
}
</script>

<style scoped>
.inline-voice-recorder {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  padding: 0.375rem 0.75rem;
  background: var(--input-bg);
  border-radius: 1rem;
  min-height: 2.75rem;
}

.btn-cancel-record,
.btn-send-record {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  transition: all 0.2s;
  flex-shrink: 0;
}

.btn-cancel-record {
  background: #fee2e2;
  color: #ef4444;
}

.btn-cancel-record:hover {
  background: #fecaca;
}

.btn-send-record {
  background: #2AABEE;
  color: white;
}

.btn-send-record:hover:not(:disabled) {
  background: #229ED9;
}

.btn-send-record:disabled {
  background: #e5e7eb;
  color: #9ca3af;
  cursor: not-allowed;
}

.recording-waveform {
  flex: 1;
  height: 40px;
  overflow: hidden;
}

.recording-waveform canvas {
  width: 100%;
  height: 100%;
}

.recording-timer {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 16px;
  font-weight: 500;
  color: #111b21;
  white-space: nowrap;
  min-width: 50px;
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

@media (max-width: 768px) {
  .inline-voice-recorder {
    padding: 0.25rem 0.5rem;
  }
  
  .btn-cancel-record,
  .btn-send-record {
    width: 32px;
    height: 32px;
    font-size: 12px;
  }
  
  .recording-waveform {
    height: 32px;
  }
  
  .recording-timer {
    font-size: 14px;
  }
}
</style>