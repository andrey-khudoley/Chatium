<template>
  <div class="voice-modal-overlay" @click.self="close">
    <div class="voice-modal-content">
      <div class="voice-header">
        <h3>Голосовое сообщение</h3>
        <button class="btn-close" @click="close">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <!-- Waveform -->
      <div class="waveform-container">
        <canvas ref="waveformCanvas" width="300" height="80"></canvas>
      </div>

      <!-- Таймер -->
      <div class="voice-timer" :class="{ recording: isRecording }">
        <span v-if="isRecording" class="record-dot"></span>
        {{ formatDuration(recordingDuration) }}
      </div>

      <!-- Подсказка -->
      <p class="voice-hint">
        {{ isRecording ? 'Идёт запись...' : 'Нажмите кнопку для начала записи' }}
      </p>

      <!-- Кнопка записи -->
      <div class="voice-controls">
        <button
          v-if="!isRecording"
          class="btn-record"
          @mousedown="startRecording"
          @touchstart.prevent="startRecording"
          @mouseup="stopRecording"
          @touchend.prevent="stopRecording"
          @mouseleave="cancelRecording"
          @touchcancel.prevent="cancelRecording"
        >
          <i class="fas fa-microphone"></i>
        </button>

        <template v-else>
          <button class="btn-stop" @click="finishRecording" title="Отправить">
            <i class="fas fa-check"></i>
          </button>
          <button class="btn-cancel" @click="cancelRecording" title="Отменить">
            <i class="fas fa-times"></i>
          </button>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onUnmounted, nextTick } from 'vue'

const emit = defineEmits(['recorded', 'close'])

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

function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function getWaveformColor() {
  const root = document.documentElement
  return getComputedStyle(root).getPropertyValue('--primary-color').trim() || '#008069'
}

function drawWaveform() {
  if (!analyser.value || !waveformCanvas.value) return

  const canvas = waveformCanvas.value
  const ctx = canvas.getContext('2d')
  const width = canvas.width
  const height = canvas.height

  analyser.value.getByteFrequencyData(dataArray.value)

  ctx.clearRect(0, 0, width, height)

  const barWidth = 4
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
    ctx.beginPath()
    ctx.roundRect(x, y, barWidth, barHeight, 2)
    ctx.fill()
  }

  animationId.value = requestAnimationFrame(drawWaveform)
}

async function startRecording(event) {
  if (event.type === 'touchstart') {
    event.preventDefault()
  }

  if (isRecording.value) return

  try {
    stream.value = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 44100
      }
    })

    audioContext.value = new (window.AudioContext || window.webkitAudioContext)()
    analyser.value = audioContext.value.createAnalyser()
    analyser.value.fftSize = 256

    source.value = audioContext.value.createMediaStreamSource(stream.value)
    source.value.connect(analyser.value)

    const bufferLength = analyser.value.frequencyBinCount
    dataArray.value = new Uint8Array(bufferLength)

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

    mediaRecorder.value.start(100)
    isRecording.value = true
    recordingDuration.value = 0
    
    // Запрашиваем Wake Lock чтобы экран не затухал
    await requestWakeLock()

    timerInterval.value = setInterval(() => {
      recordingDuration.value++
    }, 1000)

    await nextTick()
    drawWaveform()

  } catch (err) {
    console.error('Failed to start recording:', err)
    alert('Не удалось получить доступ к микрофону')
    cleanup()
  }
}

function getSupportedMimeType() {
  // Opus в WebM — единственный формат, поддерживаемый всеми современными браузерами
  // Firefox предпочитает Ogg, но он не работает в Chrome/Safari
  const preferredType = 'audio/webm;codecs=opus'
  
  if (MediaRecorder.isTypeSupported(preferredType)) {
    return preferredType
  }
  
  // Fallback для старых браузеров
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

function stopRecording() {
  if (!isRecording.value) return

  if (recordingDuration.value < 1) {
    cancelRecording()
    return
  }

  finishRecording()
}

// Запрос Wake Lock чтобы экран не затухал
async function requestWakeLock() {
  if ('wakeLock' in navigator) {
    try {
      wakeLock.value = await navigator.wakeLock.request('screen')
      // console.log('[VoiceRecorder] Wake Lock активирован')
    } catch (err) {
      console.warn('[VoiceRecorder] Не удалось активировать Wake Lock:', err)
    }
  }
}

// Освобождение Wake Lock
async function releaseWakeLock() {
  if (wakeLock.value) {
    try {
      await wakeLock.value.release()
      wakeLock.value = null
      // console.log('[VoiceRecorder] Wake Lock освобождён')
    } catch (err) {
      console.warn('[VoiceRecorder] Ошибка при освобождении Wake Lock:', err)
    }
  }
}

function finishRecording() {
  if (mediaRecorder.value && mediaRecorder.value.state !== 'inactive') {
    mediaRecorder.value.stop()
  }
}

function handleRecordingStop() {
  // Если запись была отменена — не отправляем
  if (isCancelled.value) {
    // console.log('[VoiceRecorderModal] Recording cancelled, discarding')
    cleanup()
    isCancelled.value = false // Сбрасываем флаг после cleanup
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
    
    // Проверяем, что Blob валидный
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
    
    // console.log('Voice file created (modal):', {
    //   name: file.name,
    //   size: file.size,
    //   type: file.type,
    //   duration: recordingDuration.value
    // })

    emit('recorded', { file, duration: recordingDuration.value })
  } catch (err) {
    console.error('Failed to create voice file:', err)
    alert('Ошибка создания аудиофайла')
  }

  cleanup()
  isCancelled.value = false // Сбрасываем флаг в конце
}

function getExtensionFromMimeType(mimeType) {
  if (mimeType.includes('webm')) return 'webm'
  if (mimeType.includes('mp4')) return 'm4a'
  if (mimeType.includes('ogg')) return 'ogg'
  if (mimeType.includes('wav')) return 'wav'
  if (mimeType.includes('mpeg')) return 'mp3'
  return 'webm'
}

function cancelRecording() {
  if (!isRecording.value) return

  // Устанавливаем флаг отмены ПЕРЕД остановкой
  isCancelled.value = true

  if (mediaRecorder.value && mediaRecorder.value.state !== 'inactive') {
    mediaRecorder.value.stop()
  }
  // НЕ вызываем cleanup() здесь! Пусть handleRecordingStop() сам вызовет его
  // после проверки isCancelled флага
}

async function cleanup() {
  // Сбрасываем состояние
  isRecording.value = false
  // Не сбрасываем isCancelled здесь - пусть handleRecordingStop() разберётся
  
  // Освобождаем Wake Lock
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
  audioChunks.value = [] // Очищаем чанки
  isCancelled.value = false // Убеждаемся, что флаг сброшен
}

function close() {
  cancelRecording()
  emit('close')
}

onUnmounted(() => {
  cleanup()
})
</script>

<style scoped>
.voice-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.voice-modal-content {
  background: white;
  border-radius: 20px;
  padding: 24px;
  width: 100%;
  max-width: 360px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  animation: slideUp 0.2s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.voice-header {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.voice-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #111b21;
}

.btn-close {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: #f0f2f5;
  color: #667781;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  transition: all 0.2s;
}

.btn-close:hover {
  background: #e0e2e5;
}

.waveform-container {
  width: 100%;
  height: 80px;
  background: linear-gradient(to bottom, #f0f2f5, white);
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.waveform-container canvas {
  width: 100%;
  height: 100%;
}

.voice-timer {
  font-size: 32px;
  font-weight: 300;
  color: #111b21;
  display: flex;
  align-items: center;
  gap: 8px;
}

.voice-timer.recording {
  color: #ef4444;
}

.record-dot {
  width: 10px;
  height: 10px;
  background: #ef4444;
  border-radius: 50%;
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.voice-hint {
  margin: 0;
  font-size: 14px;
  color: #667781;
  text-align: center;
}

.voice-controls {
  display: flex;
  gap: 16px;
  align-items: center;
}

.btn-record {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  border: none;
  background: #008069;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(0, 128, 105, 0.3);
}

.btn-record:hover {
  background: #006c58;
  transform: scale(1.05);
}

.btn-record:active {
  transform: scale(0.95);
}

.btn-stop,
.btn-cancel {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  transition: all 0.2s;
}

.btn-stop {
  background: #008069;
  color: white;
}

.btn-stop:hover {
  background: #006c58;
}

.btn-cancel {
  background: #fee2e2;
  color: #ef4444;
}

.btn-cancel:hover {
  background: #fecaca;
}

@media (max-width: 480px) {
  .voice-modal-overlay {
    padding: 16px;
  }

  .voice-modal-content {
    padding: 20px;
  }
}
</style>