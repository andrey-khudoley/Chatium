<template>
  <div class="voice-recorder">
    <!-- Кнопка записи голосового -->
    <button
      type="button"
      class="btn-record-voice"
      :class="{ 
        recording: isRecording, 
        'is-locked': isLocked,
        'can-send': recordingDuration >= 1 
      }"
      @mousedown="startRecording"
      @mouseup="stopRecording"
      @mouseleave="cancelRecording"
      @touchstart.prevent="startRecording"
      @touchend.prevent="stopRecording"
      @touchcancel.prevent="cancelRecording"
      :title="isRecording ? 'Отпустите для отправки' : 'Удерживайте для записи голосового'"
    >
      <i class="fas" :class="isRecording ? 'fa-microphone-lines' : 'fa-microphone'"></i>
    </button>

    <!-- Панель записи (показывается при записи) -->
    <div v-if="isRecording" class="recording-panel" @click.stop>

      
      <!-- Waveform и таймер -->
      <div class="recording-waveform">
        <canvas ref="waveformCanvas" width="300" height="60"></canvas>
      </div>
      
      <div class="recording-timer" :class="{ 'is-recording': isRecording }">
        <span class="record-dot"></span>
        {{ formatDuration(recordingDuration) }}
      </div>

      <!-- Кнопка остановки -->
      <button 
        class="btn-stop-record"
        @click.stop="finishRecording"
        title="Остановить и отправить"
      >
        <i class="fas fa-check"></i>
      </button>

      <!-- Кнопка отмены -->
      <button 
        class="btn-cancel-record"
        @click.stop="cancelRecording"
        title="Отменить"
      >
        <i class="fas fa-times"></i>
      </button>
    </div>

    <!-- Скрытый input для fallback (если нужно) -->
    <input 
      ref="audioInput"
      type="file" 
      accept="audio/*" 
      style="display: none"
      @change="handleAudioSelect"
    />
  </div>
</template>

<script setup>
import { ref, onUnmounted, nextTick } from 'vue'

const emit = defineEmits(['recorded'])

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

// Начало записи
async function startRecording(event) {
  if (event.type === 'touchstart') {
    event.preventDefault()
  }
  
  if (isRecording.value) return
  
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
    mediaRecorder.value.start(100) // Собираем данные каждые 100ms
    isRecording.value = true
    recordingDuration.value = 0
    
    // Запрашиваем Wake Lock чтобы экран не затухал
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
    cleanup()
  }
}

// Получение поддерживаемого MIME типа
// Принудительно используем audio/webm;codecs=opus для совместимости между браузерами
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

// Остановка записи (отправка)
function stopRecording() {
  if (!isRecording.value) return
  
  // Минимальная длительность 1 секунда
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

// Завершение записи
function finishRecording() {
  if (mediaRecorder.value && mediaRecorder.value.state !== 'inactive') {
    mediaRecorder.value.stop()
  }
}

// Обработка остановки записи
function handleRecordingStop() {
  // Если запись была отменена — не отправляем
  if (isCancelled.value) {
    // console.log('[VoiceRecorder] Recording cancelled, discarding')
    cleanup()
    isCancelled.value = false // Сбрасываем флаг после cleanup
    return
  }

  if (audioChunks.value.length === 0) {
    cleanup()
    isCancelled.value = false
    return
  }
  
  // Определяем MIME тип из записи
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
    
    // Добавляем метаданные (не передаются на сервер, но полезны локально)
    file.duration = recordingDuration.value
    file.isVoiceMessage = true
    
    // console.log('Voice file created:', {
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
  if (!isRecording.value) return

  // Устанавливаем флаг отмены ПЕРЕД остановкой
  isCancelled.value = true

  if (mediaRecorder.value && mediaRecorder.value.state !== 'inactive') {
    mediaRecorder.value.stop()
  }
  // НЕ вызываем cleanup() здесь! Пусть handleRecordingStop() сам вызовет его
  // после проверки isCancelled флага
}

// Очистка ресурсов
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

// Fallback - выбор файла
function handleAudioSelect(event) {
  const file = event.target.files[0]
  if (file) {
    emit('recorded', { file, duration: 0 })
  }
}

onUnmounted(() => {
  cleanup()
})
</script>

<style scoped>
.voice-recorder {
  position: relative;
  display: flex;
  align-items: center;
}

.btn-record-voice {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: #667781;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  transition: all 0.2s;
}

.btn-record-voice:hover {
  background: rgba(0, 0, 0, 0.05);
  color: #2AABEE;
}

.btn-record-voice.recording {
  color: #ef4444;
  animation: pulse 1s infinite;
}

.btn-record-voice.recording:hover {
  background: rgba(239, 68, 68, 0.1);
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

/* Панель записи */
.recording-panel {
  position: absolute;
  bottom: calc(100% + 12px);
  left: 50%;
  transform: translateX(-50%);
  background: white;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  min-width: 280px;
  z-index: 100;
}

.record-lock-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #667781;
}

.record-lock-hint i {
  font-size: 10px;
}

.recording-waveform {
  width: 100%;
  height: 60px;
  background: linear-gradient(to bottom, #f0f2f5, white);
  border-radius: 8px;
  overflow: hidden;
}

.recording-waveform canvas {
  width: 100%;
  height: 100%;
}

.recording-timer {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 600;
  color: #111b21;
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

/* Кнопки управления */
.btn-stop-record,
.btn-cancel-record {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  transition: all 0.2s;
}

.btn-stop-record {
  background: #2AABEE;
  color: white;
}

.btn-stop-record:hover {
  background: #229ED9;
}

.btn-cancel-record {
  background: #fee2e2;
  color: #ef4444;
}

.btn-cancel-record:hover {
  background: #fecaca;
}


</style>