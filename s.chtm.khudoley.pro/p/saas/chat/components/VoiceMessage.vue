<template>
  <div class="voice-message-wrapper">
    <!-- Основной блок аудио -->
    <div class="voice-message" :class="{ 'is-own': isOwn }">
      <!-- Кнопка воспроизведения -->
      <button
        class="btn-play"
        @click.stop="togglePlay"
        :title="isPlayingState ? 'Пауза' : 'Воспроизвести'"
      >
        <i class="fas" :class="isPlayingState ? 'fa-pause' : 'fa-play'"></i>
      </button>

      <!-- Waveform и прогресс -->
      <div class="waveform-container" @click.stop="seekTo">
        <canvas ref="waveformCanvas" class="waveform" :width="canvasWidth" height="40" />
        <div
          class="progress-overlay"
          :style="{ width: (isCurrentTrack ? globalProgress : progressPercent) + '%' }"
        />
        <!-- Проигранная часть waveform (отдельный canvas для производительности) -->
        <canvas
          v-show="isPlayingState || displayTime > 0"
          ref="progressCanvas"
          class="progress-canvas"
          :width="canvasWidth"
          height="40"
          :style="{
            clipPath: `inset(0 ${100 - (isCurrentTrack ? globalProgress : progressPercent)}% 0 0)`
          }"
        />
      </div>

      <!-- Информация -->
      <div class="voice-info">
        <span class="duration"
          >{{ formatTime(displayTime) }} / {{ formatTime(fileDuration || duration) }}</span
        >
      </div>

      <!-- Аудио элемент (только для локального воспроизведения, если глобальный плеер не используется) -->
      <audio
        ref="audioElement"
        :src="audioUrl"
        @timeupdate="onTimeUpdate"
        @ended="onEnded"
        @loadedmetadata="onLoadedMetadata"
        preload="metadata"
      />
    </div>

    <!-- Секция транскрибации (видна всем, если есть результат) -->
    <div class="transcription-section">
      <!-- Кнопка запуска транскрибации - только для админов -->
      <button
        v-if="
          isWorkspaceAdmin && !displayedTranscription && !isTranscribing && !messageTranscription
        "
        class="btn-transcribe"
        @click.stop="requestTranscription"
        :disabled="isTranscribing"
      >
        <i class="fas fa-closed-captioning"></i>
        <span>Перевести в текст</span>
      </button>

      <!-- Индикатор загрузки - виден тому, кто запустил -->
      <div v-else-if="isTranscribing" class="transcription-loading">
        <i class="fas fa-spinner fa-spin"></i>
        <span>Расшифровка...</span>
      </div>

      <!-- Результат транскрибации - виден всем -->
      <div v-else-if="displayedTranscription" class="transcription-result">
        <div class="transcription-text">{{ displayedTranscription }}</div>
        <button
          v-if="isWorkspaceAdmin"
          class="btn-hide-transcription"
          @click.stop="hideTranscription"
          title="Скрыть"
        >
          <i class="fas fa-times"></i>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch, nextTick, inject } from 'vue'
import {
  apiVoiceTranscriptionGetRoute,
  apiVoiceTranscriptionCreateRoute
} from '../api/voice-transcriptions'
import { getOrCreateBrowserSocketClient } from '@app/socket'
import { useGlobalAudioPlayerSingleton } from '../composables/useGlobalAudioPlayer.ts'

const props = defineProps({
  file: {
    type: Object,
    required: true
  },
  isOwn: {
    type: Boolean,
    default: false
  },
  messageId: {
    type: String,
    default: ''
  },
  feedId: {
    type: String,
    default: ''
  },
  isWorkspaceAdmin: {
    type: Boolean,
    default: false
  },
  messageData: {
    type: Object,
    default: () => ({})
  },
  // Передаем всё сообщение для реактивного доступа к транскрипции
  message: {
    type: Object,
    default: null
  },
  chatTitle: {
    type: String,
    default: ''
  },
  senderName: {
    type: String,
    default: ''
  }
})

const audioElement = ref(null)
const waveformCanvas = ref(null)
const progressCanvas = ref(null)
const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const audioContext = ref(null)
const audioBuffer = ref(null)
const waveformData = ref(null)
const canvasWidth = ref(200)
const isWaveformReady = ref(false)

// Транскрибация
const transcription = ref('')
const isTranscribing = ref(false)
const transcriptionStatus = ref('')

const fileHash = computed(() => props.file?.hash || props.file?.uid || props.file?.id)

// Глобальный аудиоплеер
const globalPlayer = useGlobalAudioPlayerSingleton()

// Уникальный ID трека для глобального плеера
const trackId = computed(() => `voice-${props.messageId || fileHash.value}`)

// Проверяем, является ли этот трек текущим в глобальном плеере
const isCurrentTrack = computed(() => {
  return globalPlayer.currentTrack.value?.id === trackId.value
})

// Состояние воспроизведения из глобального плеера
const isPlayingGlobal = computed(() => {
  return isCurrentTrack.value && globalPlayer.isPlaying.value
})

// Прогресс воспроизведения из глобального плеера
const globalProgress = computed(() => {
  if (!isCurrentTrack.value) return 0
  return globalPlayer.progressPercent.value
})

// Текущее время из глобального плеера
const globalCurrentTime = computed(() => {
  if (!isCurrentTrack.value) return currentTime.value
  return globalPlayer.playbackProgress.value
})

// Отображаемое время (из глобального или локального плеера)
const displayTime = computed(() => {
  return isCurrentTrack.value ? globalCurrentTime.value : currentTime.value
})

// Состояние воспроизведения (глобальное или локальное)
const isPlayingState = computed(() => {
  return isCurrentTrack.value ? isPlayingGlobal.value : isPlaying.value
})

const progressPercent = computed(() => {
  if (duration.value === 0) return 0
  return (currentTime.value / duration.value) * 100
})

const audioUrl = computed(() => {
  if (!props.file) return ''
  const hash = props.file.hash || props.file.uid || props.file.id
  return `https://fs.chatium.ru/get/${hash}`
})

// Получаем длительность из метаданных файла
const fileDuration = computed(() => {
  if (props.file?.duration && !isNaN(props.file.duration) && props.file.duration > 0) {
    return props.file.duration
  }
  if (duration.value && !isNaN(duration.value) && duration.value > 0) {
    return duration.value
  }
  return 0
})

// Форматирование времени
function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Получение цветов из CSS
function getColors() {
  const root = document.documentElement
  const styles = getComputedStyle(root)
  const primary = styles.getPropertyValue('--primary-color').trim() || '#008069'

  if (props.isOwn) {
    return {
      primary,
      bg: 'rgba(0, 128, 105, 0.25)',
      played: '#008069',
      playedBg: 'rgba(0, 128, 105, 0.45)'
    }
  } else {
    return {
      primary,
      bg: 'rgba(0, 128, 105, 0.25)',
      played: '#008069',
      playedBg: 'rgba(0, 128, 105, 0.4)'
    }
  }
}

// Генерация waveform из аудио
async function generateWaveform() {
  if (!props.file || isWaveformReady.value) return

  try {
    const response = await fetch(audioUrl.value)
    const arrayBuffer = await response.arrayBuffer()

    audioContext.value = new (window.AudioContext || window.webkitAudioContext)()

    // Пытаемся декодировать аудио
    audioBuffer.value = await audioContext.value.decodeAudioData(arrayBuffer)

    if (audioBuffer.value.duration && !isNaN(audioBuffer.value.duration)) {
      duration.value = audioBuffer.value.duration
    }

    drawWaveform()
    isWaveformReady.value = true
  } catch (err) {
    // При любой ошибке декодирования используем простую визуализацию
    // Без вывода ошибки в консоль
    drawSimpleWaveform()
    isWaveformReady.value = true
  }
}

// Рисование waveform из аудио данных
function drawWaveform() {
  if (!waveformCanvas.value || !audioBuffer.value) return

  const canvas = waveformCanvas.value
  const ctx = canvas.getContext('2d')
  const width = canvas.width
  const height = canvas.height

  const colors = getColors()
  const data = audioBuffer.value.getChannelData(0)
  const step = Math.ceil(data.length / width)
  const amp = height / 2

  ctx.clearRect(0, 0, width, height)

  const barWidth = 2
  const gap = 1

  waveformData.value = []

  for (let i = 0; i < width; i += barWidth + gap) {
    let min = 1.0
    let max = -1.0

    for (let j = 0; j < step; j++) {
      const datum = data[i * step + j]
      if (datum < min) min = datum
      if (datum > max) max = datum
    }

    const barHeight = Math.max(2, (max - min) * amp * 0.8)
    const x = i
    const y = (height - barHeight) / 2

    ctx.fillStyle = colors.bg
    ctx.roundRect(x, y, barWidth, barHeight, 1)
    ctx.fill()

    waveformData.value.push({ x, y, barHeight, barWidth })
  }

  drawProgressWaveform()
}

// Простая визуализация (fallback)
function drawSimpleWaveform() {
  if (!waveformCanvas.value) return

  const canvas = waveformCanvas.value
  const ctx = canvas.getContext('2d')
  const width = canvas.width
  const height = canvas.height

  const colors = getColors()
  const bars = 40
  const barWidth = (width - (bars - 1)) / bars

  ctx.clearRect(0, 0, width, height)

  waveformData.value = []

  for (let i = 0; i < bars; i++) {
    const pseudoRandom = Math.sin(i * 12.9898) * 43758.5453
    const normalized = pseudoRandom - Math.floor(pseudoRandom)
    const barHeight = Math.max(4, normalized * height * 0.8)

    const x = i * (barWidth + 1)
    const y = (height - barHeight) / 2

    ctx.fillStyle = colors.bg
    ctx.roundRect(x, y, barWidth, barHeight, 1)
    ctx.fill()

    waveformData.value.push({ x, y, barHeight, barWidth })
  }

  drawProgressWaveform()
}

// Рисуем waveform для прогресса
function drawProgressWaveform() {
  if (!progressCanvas.value || !waveformData.value) return

  const canvas = progressCanvas.value
  const ctx = canvas.getContext('2d')
  const colors = getColors()

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  for (const bar of waveformData.value) {
    ctx.fillStyle = colors.played
    ctx.roundRect(bar.x, bar.y, bar.barWidth, bar.barHeight, 1)
    ctx.fill()
  }
}

// Переключение воспроизведения
function togglePlay() {
  // Используем глобальный плеер
  if (isCurrentTrack.value) {
    // Этот трек уже загружен в глобальный плеер
    globalPlayer.togglePlay()
    return
  }

  // Загружаем новый трек в глобальный плеер
  const track = {
    id: trackId.value,
    url: audioUrl.value,
    duration: fileDuration.value || duration.value,
    currentTime: 0,
    messageId: props.messageId,
    feedId: props.feedId,
    chatTitle: props.chatTitle,
    senderName: props.senderName,
    isOwn: props.isOwn
  }

  globalPlayer.play(track)

  // Приостанавливаем локальное аудио, если оно играло
  if (audioElement.value && isPlaying.value) {
    audioElement.value.pause()
    isPlaying.value = false
  }
}

// Перемотка по клику на waveform
function seekTo(event) {
  const totalDuration = fileDuration.value || duration.value
  if (!totalDuration || totalDuration === Infinity || totalDuration === 0) {
    return
  }

  const rect = event.currentTarget.getBoundingClientRect()
  const x = event.clientX - rect.left
  const percent = Math.max(0, Math.min(100, (x / rect.width) * 100))

  // Если этот трек в глобальном плеере - используем его
  if (isCurrentTrack.value) {
    globalPlayer.seekTo(percent)
    return
  }

  // Локальная перемотка
  if (!audioElement.value) return

  const newTime = (percent / 100) * totalDuration

  try {
    if (audioElement.value.readyState >= 1) {
      audioElement.value.currentTime = newTime
    } else {
      const onMetadata = () => {
        if (audioElement.value && totalDuration > 0) {
          audioElement.value.currentTime = newTime
        }
        audioElement.value?.removeEventListener('loadedmetadata', onMetadata)
      }
      audioElement.value.addEventListener('loadedmetadata', onMetadata)
      audioElement.value.load()
    }
  } catch (err) {
    console.error('Failed to seek:', err)
  }
}

// Обработчики аудио событий
function onTimeUpdate() {
  if (audioElement.value) {
    currentTime.value = audioElement.value.currentTime
  }
}

function onEnded() {
  isPlaying.value = false
  currentTime.value = 0
}

function onLoadedMetadata() {
  if (audioElement.value) {
    const audioDuration = audioElement.value.duration

    if (audioDuration && !isNaN(audioDuration) && audioDuration !== Infinity && audioDuration > 0) {
      duration.value = audioDuration
    } else if (props.file?.duration && !isNaN(props.file.duration) && props.file.duration > 0) {
      duration.value = props.file.duration
    }

    if ((!duration.value || duration.value === Infinity) && audioBuffer.value) {
      duration.value = audioBuffer.value.duration
    }
  }
}

// Логирование на клиенте
function logClient(stage, data = {}) {
  // console.log(`[VoiceMessage][${stage}]`, {
  //   timestamp: new Date().toISOString(),
  //   fileHash: fileHash.value,
  //   messageId: props.messageId,
  //   ...data,
  // })
}

// Запрос транскрибации
async function requestTranscription() {
  if (!props.isWorkspaceAdmin) {
    logClient('REQUEST_BLOCKED', { reason: 'not_admin' })
    return
  }
  if (!fileHash.value) {
    logClient('REQUEST_BLOCKED', { reason: 'no_file_hash' })
    return
  }

  logClient('REQUEST_START', {
    feedId: props.feedId,
    isWorkspaceAdmin: props.isWorkspaceAdmin
  })

  isTranscribing.value = true
  transcriptionStatus.value = 'pending'

  try {
    // Сначала проверяем, есть ли уже готовая транскрибация
    logClient('CHECK_EXISTING_START', {})
    const checkResponse = await apiVoiceTranscriptionGetRoute({ fileHash: fileHash.value }).run(ctx)

    logClient('CHECK_EXISTING_RESULT', {
      found: !!checkResponse.transcription,
      status: checkResponse.transcription?.status
    })

    if (checkResponse.transcription?.status === 'completed') {
      logClient('CACHE_HIT', {
        preview: checkResponse.transcription.transcription?.substring(0, 100)
      })
      transcription.value = checkResponse.transcription.transcription
      isTranscribing.value = false
      return
    }

    // Запускаем транскрибацию
    logClient('CREATE_START', {})
    const response = await apiVoiceTranscriptionCreateRoute.run(ctx, {
      fileHash: fileHash.value,
      messageId: props.messageId,
      feedId: props.feedId
    })

    logClient('CREATE_RESULT', {
      success: response.success,
      fromCache: response.fromCache,
      status: response.transcription?.status,
      hasTranscription: !!response.transcription?.transcription
    })

    // Если транскрипция уже готова (из кэша) - показываем сразу
    if (
      response.fromCache &&
      response.transcription?.status === 'completed' &&
      response.transcription?.transcription
    ) {
      transcription.value = response.transcription.transcription
      isTranscribing.value = false
      transcriptionStatus.value = 'completed'
      logClient('CACHE_USED', {
        preview: response.transcription.transcription?.substring(0, 100)
      })
      return
    }

    // Если статус completed но fromCache=false (только что создали) - тоже показываем
    if (response.transcription?.status === 'completed' && response.transcription?.transcription) {
      transcription.value = response.transcription.transcription
      isTranscribing.value = false
      transcriptionStatus.value = 'completed'
      logClient('TRANSCRIPTION_IMMEDIATE', {
        preview: response.transcription.transcription?.substring(0, 100)
      })
      return
    }

    // Иначе ждем callback через WebSocket (статус processing или нет текста)
    logClient('WAITING_WEBSOCKET', {
      transcriptionId: response.transcription?.id,
      status: response.transcription?.status
    })
  } catch (error) {
    logClient('REQUEST_ERROR', { error: String(error) })
    // console.error('[VoiceMessage] Transcription error:', error)
    isTranscribing.value = false
    transcriptionStatus.value = 'error'
  }
}

// Ссылка на функцию отписки от WebSocket
let unsubscribeFromTranscription = null

// Fallback: периодическая проверка статуса транскрибации
let fallbackPollTimer = null
const FALLBACK_POLL_INTERVAL = 5000 // 5 секунд

function startFallbackPolling() {
  // Запускаем только если есть fileHash и нет транскрипции
  if (!fileHash.value || displayedTranscription.value) {
    return
  }

  // Очищаем предыдущий таймер
  if (fallbackPollTimer) {
    clearInterval(fallbackPollTimer)
    fallbackPollTimer = null
  }

  logClient('FALLBACK_POLL_START', { fileHash: fileHash.value, interval: FALLBACK_POLL_INTERVAL })

  let pollCount = 0
  const maxPolls = 60 // 5 минут максимум (60 * 5 сек)

  fallbackPollTimer = setInterval(async () => {
    pollCount++

    // Проверяем, не превысили ли лимит попыток
    if (pollCount > maxPolls) {
      logClient('FALLBACK_POLL_STOP', { reason: 'max_polls_reached', pollCount })
      clearInterval(fallbackPollTimer)
      fallbackPollTimer = null
      return
    }

    // Если уже есть транскрипция — останавливаем
    if (displayedTranscription.value) {
      logClient('FALLBACK_POLL_STOP', { reason: 'transcription_received', pollCount })
      clearInterval(fallbackPollTimer)
      fallbackPollTimer = null
      return
    }

    try {
      logClient('FALLBACK_POLL_CHECK', { pollCount, fileHash: fileHash.value })
      const response = await apiVoiceTranscriptionGetRoute({ fileHash: fileHash.value }).run(ctx)

      if (response.transcription?.status === 'completed' && response.transcription?.transcription) {
        logClient('FALLBACK_POLL_SUCCESS', {
          pollCount,
          transcriptionLength: response.transcription.transcription.length
        })
        transcription.value = response.transcription.transcription
        isTranscribing.value = false
        transcriptionStatus.value = 'completed'

        clearInterval(fallbackPollTimer)
        fallbackPollTimer = null
      } else {
        logClient('FALLBACK_POLL_PENDING', { pollCount, status: response.transcription?.status })
      }
    } catch (error) {
      logClient('FALLBACK_POLL_ERROR', { pollCount, error: String(error) })
    }
  }, FALLBACK_POLL_INTERVAL)
}

function stopFallbackPolling() {
  if (fallbackPollTimer) {
    logClient('FALLBACK_POLL_STOP', { reason: 'manual' })
    clearInterval(fallbackPollTimer)
    fallbackPollTimer = null
  }
}

// Обработка WebSocket событий транскрибации
async function setupTranscriptionListener() {
  if (!props.feedId) {
    logClient('LISTENER_SETUP_SKIP', { reason: 'no_feed_id' })
    return
  }

  // Если уже есть подписка - отписываемся
  if (unsubscribeFromTranscription) {
    logClient('LISTENER_SETUP_UNSUBSCRIBE', { reason: 'already_subscribed' })
    try {
      unsubscribeFromTranscription()
    } catch (e) {
      // console.warn('[VoiceMessage] Error unsubscribing:', e)
    }
    unsubscribeFromTranscription = null
  }

  logClient('LISTENER_SETUP_START', {
    feedId: props.feedId,
    fileHash: fileHash.value,
    messageId: props.messageId,
    currentUserId: ctx.user?.id,
    isWorkspaceAdmin: props.isWorkspaceAdmin
  })

  // Подписываемся на события транскрибации для всех пользователей
  // (не только админов), чтобы видеть результат когда админ запустит транскрибацию

  try {
    const channelName = `chat-${props.feedId}`
    // console.log('[VoiceMessage] Getting socket client for channel:', channelName, 'user:', ctx.user?.id)

    const socketClient = await getOrCreateBrowserSocketClient()
    // console.log('[VoiceMessage] Socket client obtained:', !!socketClient, 'for channel:', channelName)

    const subscription = socketClient.subscribeToData(channelName)
    // console.log('[VoiceMessage] Subscription created:', !!subscription, 'for channel:', channelName)

    logClient('LISTENER_SETUP_SUCCESS', {
      feedId: props.feedId,
      channel: channelName,
      fileHash: fileHash.value,
      messageId: props.messageId,
      currentUserId: ctx.user?.id
    })

    // Сохраняем функцию отписки
    unsubscribeFromTranscription = subscription.listen((data) => {
      // console.log('[VoiceMessage] RAW WebSocket data received:', {
      //   type: data?.type,
      //   channel: channelName,
      //   currentUser: ctx.user?.id,
      //   hasTranscription: !!data?.transcription,
      //   dataKeys: Object.keys(data || {})
      // })

      logClient('WEBSOCKET_EVENT', {
        type: data?.type,
        channel: channelName,
        fileHashMatch: data?.fileHash === fileHash.value,
        eventFileHash: data?.fileHash,
        ourFileHash: fileHash.value,
        ourMessageId: props.messageId,
        eventMessageId: data?.messageId,
        eventFeedId: data?.feedId,
        ourFeedId: props.feedId,
        feedIdMatch: data?.feedId === props.feedId,
        currentUserId: ctx.user?.id,
        isWorkspaceAdmin: props.isWorkspaceAdmin
      })

      if (data?.type === 'transcription-completed') {
        // Проверяем совпадение по fileHash ИЛИ по messageId
        const fileHashMatch = data.fileHash === fileHash.value
        const messageIdMatch = data.messageId === props.messageId
        const isOurTranscription = fileHashMatch || messageIdMatch

        logClient('WEBSOCKET_CHECK_MATCH', {
          fileHashMatch,
          messageIdMatch,
          isOurTranscription,
          eventFileHash: data.fileHash,
          ourFileHash: fileHash.value,
          eventMessageId: data.messageId,
          ourMessageId: props.messageId
        })

        if (isOurTranscription) {
          logClient('WEBSOCKET_COMPLETED', {
            transcriptionLength: data.transcription?.length,
            preview: data.transcription?.substring(0, 100),
            matchBy: fileHashMatch ? 'fileHash' : 'messageId'
          })
          transcription.value = data.transcription
          isTranscribing.value = false
          transcriptionStatus.value = 'completed'
        } else {
          logClient('WEBSOCKET_NOT_OUR_TRANSCRIPTION', {
            eventFileHash: data.fileHash,
            ourFileHash: fileHash.value,
            eventMessageId: data.messageId,
            ourMessageId: props.messageId
          })
        }
      } else if (data?.type === 'transcription-error') {
        const isOurError = data.fileHash === fileHash.value || data.messageId === props.messageId

        if (isOurError) {
          logClient('WEBSOCKET_ERROR', { error: data.error })
          isTranscribing.value = false
          transcriptionStatus.value = 'error'
        }
      }
    })
  } catch (error) {
    logClient('LISTENER_SETUP_ERROR', { error: String(error) })
    // console.error('[VoiceMessage] Failed to setup transcription listener:', error)
  }
}

// Вычисляем транскрипцию из данных сообщения (для всех пользователей)
// Используем props.message для реактивного обновления при WebSocket событиях
const messageTranscription = computed(() => {
  // Приоритет: полное сообщение (реактивное) > messageData (статичное)
  const fromMessage = props.message?.data?.voiceTranscription
  const fromMessageData = props.messageData?.voiceTranscription

  const result = fromMessage || fromMessageData || ''

  if (result && result.length > 0) {
    logClient('COMPUTED_TRANSCRIPTION', {
      source: fromMessage ? 'message' : 'messageData',
      length: result.length,
      hasMessageProp: !!props.message,
      hasMessageDataProp: !!props.messageData
    })
  }

  return result
})

// Итоговая транскрипция для отображения (из сообщения или локально загруженная)
const displayedTranscription = computed(() => {
  const fromMessage = messageTranscription.value
  const fromLocal = transcription.value
  const result = fromMessage || fromLocal

  if (result && result.length > 0) {
    logClient('DISPLAYED_TRANSCRIPTION', {
      fromMessage: !!fromMessage,
      fromLocal: !!fromLocal,
      resultLength: result.length,
      isWorkspaceAdmin: props.isWorkspaceAdmin
    })
  }

  return result
})

// Скрыть локальную транскрипцию (для админа)
function hideTranscription() {
  transcription.value = null
}

// Проверка существующей транскрибации при монтировании
async function checkExistingTranscription() {
  if (!fileHash.value) {
    logClient('CHECK_MOUNT_SKIP', { reason: 'no_file_hash' })
    return
  }

  logClient('CHECK_MOUNT_START', {})

  try {
    const response = await apiVoiceTranscriptionGetRoute({ fileHash: fileHash.value }).run(ctx)
    logClient('CHECK_MOUNT_RESULT', {
      found: !!response.transcription,
      status: response.transcription?.status
    })
    if (response.transcription?.status === 'completed') {
      transcription.value = response.transcription.transcription
      logClient('CHECK_MOUNT_LOADED', {
        preview: transcription.value?.substring(0, 100)
      })
    }
  } catch (error) {
    logClient('CHECK_MOUNT_ERROR', { error: String(error) })
    // Игнорируем ошибку - просто нет транскрибации
  }
}

// Наблюдатели
watch(
  () => props.file,
  (newFile) => {
    isWaveformReady.value = false
    waveformData.value = null
    currentTime.value = 0
    isPlaying.value = false

    if (newFile?.duration && !isNaN(newFile.duration) && newFile.duration > 0) {
      duration.value = newFile.duration
    }

    nextTick(() => {
      generateWaveform()
    })
  },
  { immediate: true }
)

// Следим за изменением feedId для переподписки
watch(
  () => props.feedId,
  (newFeedId, oldFeedId) => {
    if (newFeedId && newFeedId !== oldFeedId) {
      logClient('FEED_ID_CHANGED', { newFeedId, oldFeedId })
      // Переподписываемся на новый канал
      setupTranscriptionListener()
    }
  }
)

// Следим за изменением message.data.voiceTranscription (реактивное обновление из ChatView)
watch(
  () => props.message?.data?.voiceTranscription,
  (newTranscription, oldTranscription) => {
    if (newTranscription && newTranscription !== oldTranscription) {
      logClient('MESSAGE_DATA_CHANGED', {
        newLength: newTranscription?.length,
        oldLength: oldTranscription?.length,
        source: 'watch message.data'
      })
      // Обновляем локальное значение для отображения
      transcription.value = newTranscription
      isTranscribing.value = false
      transcriptionStatus.value = 'completed'
    }
  },
  { immediate: true }
)

onMounted(() => {
  logClient('MOUNT_START', {
    feedId: props.feedId,
    messageId: props.messageId,
    fileHash: fileHash.value,
    hasMessageProp: !!props.message,
    hasMessageDataProp: !!props.messageData,
    existingInMessage: !!props.message?.data?.voiceTranscription,
    existingInMessageData: !!props.messageData?.voiceTranscription
  })

  const container = waveformCanvas.value?.parentElement
  if (container) {
    canvasWidth.value = Math.min(250, container.clientWidth - 80)
  }

  nextTick(() => {
    generateWaveform()
  })

  // Сначала проверяем, есть ли транскрипция в данных сообщения (например, после обновления страницы)
  const existingTranscription =
    props.message?.data?.voiceTranscription || props.messageData?.voiceTranscription
  if (existingTranscription) {
    logClient('MOUNT_EXISTING_TRANSCRIPTION', {
      source: props.message?.data?.voiceTranscription ? 'message.data' : 'messageData',
      length: existingTranscription.length
    })
    transcription.value = existingTranscription
    transcriptionStatus.value = 'completed'
  }

  // Проверяем существующую транскрибацию через API (для случая когда в данных нет, но в БД есть)
  // (для всех пользователей, не только админов)
  checkExistingTranscription()

  // Подписываемся на WebSocket события
  setupTranscriptionListener()

  // Запускаем fallback polling для надежности (на случай если WebSocket не сработает)
  // Запускаем для всех, не только админов, чтобы они тоже получили результат
  if (!existingTranscription && fileHash.value) {
    startFallbackPolling()
  }

  logClient('MOUNT_COMPLETE', {
    displayedTranscriptionLength: displayedTranscription.value?.length,
    isTranscribing: isTranscribing.value,
    fallbackPolling: !!fallbackPollTimer
  })
})

onUnmounted(() => {
  // Не останавливаем глобальный плеер при размонтировании,
  // чтобы аудио продолжало играть при переключении чатов

  // Останавливаем только локальное аудио
  if (audioElement.value) {
    audioElement.value.pause()
  }
  if (audioContext.value && audioContext.value.state !== 'closed') {
    audioContext.value.close().catch(console.error)
  }
  // Отписываемся от WebSocket
  if (unsubscribeFromTranscription) {
    try {
      unsubscribeFromTranscription()
    } catch (e) {
      // console.warn('[VoiceMessage] Error unsubscribing on unmount:', e)
    }
    unsubscribeFromTranscription = null
  }
  // Останавливаем fallback polling
  stopFallbackPolling()
})
</script>

<style scoped>
.voice-message-wrapper {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 320px;
}

.voice-message {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(0, 128, 105, 0.08);
  border-radius: 12px;
  min-width: 200px;
}

.voice-message.is-own {
  background: rgba(0, 128, 105, 0.12);
}

.btn-play {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: #008069;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  flex-shrink: 0;
  transition: all 0.2s;
}

.btn-play:hover {
  background: #006c58;
}

.voice-message.is-own .btn-play {
  background: #008069;
  color: white;
}

.voice-message.is-own .btn-play:hover {
  background: #006c58;
}

.waveform-container {
  flex: 1;
  height: 40px;
  cursor: pointer;
  position: relative;
  border-radius: 4px;
  overflow: hidden;
}

.waveform {
  width: 100%;
  height: 100%;
}

.progress-overlay {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: rgba(0, 128, 105, 0.15);
  pointer-events: none;
  transition: width 0.1s;
}

.progress-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.voice-info {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.duration {
  font-size: 11px;
  color: #667781;
  white-space: nowrap;
}

.voice-message.is-own .duration {
  color: rgba(255, 255, 255, 0.8);
}

/* Секция транскрибации */
.transcription-section {
  padding: 0 4px;
}

.btn-transcribe {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: transparent;
  border: 1px solid rgba(0, 128, 105, 0.3);
  border-radius: 12px;
  color: #008069;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-transcribe:hover {
  background: rgba(0, 128, 105, 0.08);
  border-color: rgba(0, 128, 105, 0.5);
}

.btn-transcribe:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-transcribe i {
  font-size: 11px;
}

.transcription-loading {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  color: #667781;
  font-size: 12px;
}

.transcription-result {
  position: relative;
  padding: 8px 12px;
  background: rgba(0, 128, 105, 0.06);
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-primary, #111b21);
}

.transcription-text {
  padding-right: 20px;
}

.btn-hide-transcription {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  border: none;
  background: transparent;
  color: #667781;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  font-size: 11px;
}

.btn-hide-transcription:hover {
  background: rgba(0, 0, 0, 0.08);
  color: #e74c3c;
}
</style>
