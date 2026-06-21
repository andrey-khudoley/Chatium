<template>
  <div class="w-full">
    <div
      class="relative flex items-center gap-0 bg-white rounded-3xl border border-gray-200 shadow-sm focus-within:border-gray-300 transition-all"
    >
      <div class="flex items-center">
        <button
          @click="triggerFileInput"
          :disabled="isSending"
          class="m-1.5 mr-0 w-8 h-8 flex-shrink-0 self-end rounded-full flex items-center justify-center transition-colors text-gray-400 hover:text-gray-800"
        >
          <i class="fas fa-paperclip"></i>
        </button>

        <button
          v-if="!isRecording && !isProcessingRecording"
          @click="startVoiceRecording"
          :disabled="!canStartVoiceRecording"
          :class="[
            'my-1.5 mr-1.5 w-8 h-8 flex-shrink-0 self-end rounded-full flex items-center justify-center transition-colors',
            isRecording
              ? 'bg-rose-500 text-white shadow-sm shadow-rose-200 cursor-not-allowed'
              : canStartVoiceRecording
                ? 'text-gray-400 hover:text-gray-800'
                : 'cursor-not-allowed opacity-60 text-gray-300'
          ]"
          aria-label="Записать голосовое сообщение"
        >
          <i class="fas fa-microphone"></i>
        </button>
      </div>

      <input
        ref="fileInput"
        type="file"
        class="hidden"
        multiple
        @change="handleFileSelect"
        :disabled="isSending"
      />

      <!-- Text Input -->
      <div class="flex-1 py-1.5 flex flex-col overflow-hidden">
        <!-- Selected Files Preview -->
        <div v-if="selectedFiles.length > 0" class="flex flex-wrap gap-2 mb-2">
          <div
            v-for="(fileItem, index) in selectedFiles"
            :key="fileItem.file?.name + index"
            :title="fileItem.status === 'error' ? fileItem.error : fileItem.file?.name"
            :class="[
              'relative overflow-hidden rounded-full bg-white/70 px-3 py-1.5 text-xs shadow-sm backdrop-blur-sm transition-all duration-300',
              fileItem.status === 'done'
                ? 'border border-emerald-200/50 shadow-sm shadow-emerald-100/40'
                : fileItem.status === 'error'
                  ? 'border border-rose-200/60 shadow-sm shadow-rose-100/30'
                  : 'border border-slate-200/60 shadow-sm shadow-black/5'
            ]"
          >
            <div
              class="absolute inset-y-0 left-0 h-full bg-gradient-to-r from-emerald-100/30 via-sky-100/20 to-indigo-100/25 transition-all"
              :style="{
                width: `${fileItem.status === 'done' ? 100 : fileItem.progress}%`,
                opacity: ['uploading', 'done'].includes(fileItem.status) ? 1 : 0
              }"
            ></div>
            <div class="relative flex items-center gap-2">
              <div
                class="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-500 shadow-inner"
              >
                <i class="fas fa-file text-[11px]"></i>
              </div>
              <div class="flex min-w-0 flex-col">
                <span class="max-w-[140px] truncate text-gray-700">
                  {{ fileItem.file.name }}
                </span>
                <div class="flex items-center gap-3 text-[10px] tracking-wide">
                  <div class="font-medium uppercase">
                    <span v-if="fileItem.status === 'uploading'" class="text-slate-500">
                      {{ fileItem.progress }}%
                    </span>
                    <span
                      v-else-if="fileItem.status === 'done'"
                      class="flex items-center gap-1 text-emerald-400"
                    >
                      <i class="fas fa-check"></i>
                      готово
                    </span>
                    <span
                      v-else-if="fileItem.status === 'error'"
                      class="flex items-center gap-1 text-rose-400"
                    >
                      <i class="fas fa-exclamation-triangle"></i>
                      ошибка
                    </span>
                    <span v-else class="text-slate-400">в очереди</span>
                  </div>
                  <span class="text-slate-400 uppercase">
                    {{ formatFileSize(fileItem.file.size) }}
                  </span>
                </div>
              </div>
              <button
                v-if="fileItem.status === 'error'"
                @click="retryUpload(fileItem)"
                class="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100/70 text-amber-600 transition-colors hover:bg-amber-200/80 hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="isSending"
              >
                <i class="fas fa-rotate-right text-[10px]"></i>
              </button>
              <button
                @click="removeFile(index)"
                class="text-gray-400 transition-colors hover:text-gray-600 disabled:cursor-not-allowed disabled:text-gray-300"
                :disabled="isSending"
              >
                <i class="fas fa-times"></i>
              </button>
            </div>
          </div>
        </div>

        <div
          v-if="isRecording || isProcessingRecording"
          class="recording-indicator flex items-center gap-1 rounded-[999px] bg-blue-50/70 text-sm mr-1.5"
        >
          <button
            v-if="isRecording || isProcessingRecording"
            :class="[
              'w-8 h-8 flex-shrink-0 self-end rounded-full flex items-center justify-center transition-colors',
              isRecording
                ? 'bg-rose-500 text-white shadow-sm shadow-rose-200 cursor-not-allowed'
                : 'text-gray-400 hover:text-gray-800'
            ]"
          >
            <i class="fas fa-microphone"></i>
          </button>
          <div class="flex items-center gap-2 font-mono font-medium text-blue-500 pl-3">
            <span class="recording-ping relative flex h-2 w-2">
              <span
                v-if="isRecording"
                class="absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75 animate-ping"
              ></span>
              <span
                class="relative inline-flex h-2 w-2 rounded-full"
                :class="isProcessingRecording ? 'bg-blue-400/70' : 'bg-blue-500'"
              ></span>
            </span>
            <span v-if="isRecording">{{ formattedRecordingDuration }}</span>
          </div>
          <div
            v-if="isRecording"
            class="levels flex-1 flex items-center justify-center gap-1 h-6 overflow-hidden"
          >
            <span
              v-for="(level, index) in audioLevels"
              :key="index"
              class="w-1 rounded -rounded-full bg-blue-400 transition-[height] duration-100 ease-out"
              :style="{ height: getLevelHeight(level) }"
            ></span>
          </div>
          <div
            v-else
            class="levels flex-1 flex items-center justify-center gap-1 h-6 overflow-hidden"
          >
            <span class="text-blue-400/90">Отправляем голосовое...</span>
          </div>
          <button
            v-if="isRecording"
            @click="cancelRecording"
            class="flex h-8 w-8 items-center justify-center rounded-full bg-white text-blue-400 shadow-sm transition-colors hover:bg-rose-100 hover:text-rose-500"
            aria-label="Отменить запись"
          >
            <i class="fas fa-times"></i>
          </button>
          <button
            @click="finishRecording"
            :disabled="isProcessingRecording"
            class="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-white shadow-sm transition-colors hover:bg-blue-600 disabled:cursor-not-allowed"
            aria-label="Завершить запись"
          >
            <i
              :class="[
                'text-base',
                isProcessingRecording ? 'fas fa-circle-notch fa-spin' : 'fas fa-check'
              ]"
            ></i>
          </button>
        </div>

        <textarea
          v-else
          ref="textInput"
          v-model="text"
          :placeholder="placeholder"
          @keydown.enter.exact.prevent="handleSubmit"
          @paste="handlePaste"
          :disabled="isSending || isProcessingRecording"
          class="w-full bg-transparent border-none outline-none resize-none text-gray-900 placeholder-gray-400 max-h-40"
          rows="1"
        ></textarea>
      </div>

      <!-- Send Button -->
      <button
        v-if="!isRecording && !isProcessingRecording"
        @click="handleSubmit"
        :disabled="isSubmitDisabled"
        :class="[
          'm-1.5 w-8 h-8 flex-shrink-0 self-end rounded-full flex items-center justify-center transition-colors',
          isSubmitDisabled && !isSending
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-gray-900 text-white hover:bg-gray-800'
        ]"
      >
        <i :class="['text-sm', isSending ? 'fas fa-circle-notch fa-spin' : 'fas fa-arrow-up']"></i>
      </button>
    </div>
    <div class="mt-3 text-center text-xs text-gray-500">
      GPT может делать ошибки. Проверяйте важную информацию.
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { apiGetUploadUrlRoute } from '../api/files'

const props = defineProps({
  placeholder: {
    type: String,
    default: 'Введите сообщение...'
  },
  isSending: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['submit'])

const text = ref('')
const selectedFiles = ref([])
const textInput = ref(null)
const fileInput = ref(null)

const isRecording = ref(false)
const isProcessingRecording = ref(false)
const recordingDuration = ref(0)
const audioLevels = ref(Array.from({ length: 16 }, () => 0))
const recordingUploadProgress = ref(0)

const mediaRecorder = ref(null)
const mediaStream = ref(null)
const audioChunks = ref([])
const audioContextRef = ref(null)
const analyserNodeRef = ref(null)

const discardRecording = ref(false)
const awaitingVoiceSendCompletion = ref(false)
const voiceSendObserved = ref(false)

const finalizeVoiceProcessing = () => {
  if (voiceSendFallbackTimeoutId !== null) {
    window.clearTimeout(voiceSendFallbackTimeoutId)
    voiceSendFallbackTimeoutId = null
  }
  awaitingVoiceSendCompletion.value = false
  voiceSendObserved.value = false
  isProcessingRecording.value = false
}

const trimmedText = computed(() => text.value.trim())
const canStartVoiceRecording = computed(() => {
  if (props.isSending || isRecording.value || isProcessingRecording.value) {
    return false
  }

  const hasFiles = selectedFiles.value.length > 0
  const hasText = trimmedText.value.length > 0

  return !hasFiles || !hasText
})

let durationTimerId = null
let levelsAnimationId = null
let frequencyData = null
let recordingStartedAt = 0
let voiceSendFallbackTimeoutId = null
let recorderDataRequestId = null

const isUploading = computed(() =>
  selectedFiles.value.some((item) => ['pending', 'uploading'].includes(item.status))
)

const hasUploadError = computed(() => selectedFiles.value.some((item) => item.status === 'error'))

const hasUploadedFiles = computed(() => selectedFiles.value.some((item) => item.status === 'done'))

const formattedRecordingDuration = computed(() => {
  const totalSeconds = Math.floor(recordingDuration.value / 1000)
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0')
  const seconds = String(totalSeconds % 60).padStart(2, '0')
  return `${minutes}:${seconds}`
})

const getLevelHeight = (level) => {
  const clamped = Math.max(0, Math.min(1, Number(level) || 0))
  return `${Math.max(8, Math.round(clamped * 100))}%`
}

const createAudioContext = () => {
  if (typeof window === 'undefined') {
    return null
  }

  const AudioContextCtor = window.AudioContext || window.webkitAudioContext || null

  if (!AudioContextCtor) {
    return null
  }

  try {
    return new AudioContextCtor()
  } catch (error) {
    console.error('Не удалось создать AudioContext', error)
    return null
  }
}

const getSupportedMimeType = () => {
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') {
    return null
  }

  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4;codecs=mp4a.40.2',
    'audio/mp4',
    'audio/mpeg'
  ]

  const isTypeSupported =
    typeof MediaRecorder.isTypeSupported === 'function'
      ? MediaRecorder.isTypeSupported.bind(MediaRecorder)
      : () => true

  return candidates.find((type) => isTypeSupported(type)) || null
}

const isSubmitDisabled = computed(() => {
  const currentText = trimmedText.value

  return (
    props.isSending ||
    isUploading.value ||
    hasUploadError.value ||
    isRecording.value ||
    isProcessingRecording.value ||
    (!currentText && !hasUploadedFiles.value)
  )
})

const formatFileSize = (bytes) => {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B'
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const size = bytes / Math.pow(1024, exponent)

  const formatted = size < 10 && exponent > 0 ? size.toFixed(1) : size.toFixed(0)

  return `${formatted} ${units[exponent]}`
}

const refreshSelectedFiles = () => {
  selectedFiles.value = [...selectedFiles.value]
}

const triggerFileInput = () => {
  if (props.isSending || isRecording.value || isProcessingRecording.value) {
    return
  }
  fileInput.value?.click()
}

const stopDurationTimer = () => {
  if (durationTimerId !== null) {
    window.clearInterval(durationTimerId)
    durationTimerId = null
  }
}

const startDurationTimer = () => {
  stopDurationTimer()
  durationTimerId = window.setInterval(() => {
    recordingDuration.value = Date.now() - recordingStartedAt
  }, 200)
}

const resetAudioLevels = () => {
  audioLevels.value = audioLevels.value.map(() => 0)
}

const stopLevelsAnimation = () => {
  if (levelsAnimationId !== null) {
    window.cancelAnimationFrame(levelsAnimationId)
    levelsAnimationId = null
  }
}

const stopRecorderDataRequestInterval = () => {
  if (recorderDataRequestId !== null) {
    window.clearInterval(recorderDataRequestId)
    recorderDataRequestId = null
  }
}

const startLevelsAnimation = () => {
  stopLevelsAnimation()

  const animate = () => {
    if (!analyserNodeRef.value || !frequencyData) {
      levelsAnimationId = null
      return
    }

    analyserNodeRef.value.getByteFrequencyData(frequencyData)

    const barsCount = audioLevels.value.length
    const chunkSize = Math.max(1, Math.floor(frequencyData.length / barsCount))
    const levels = []
    for (let i = 0; i < barsCount; i += 1) {
      let sum = 0
      for (let j = 0; j < chunkSize; j += 1) {
        const value = frequencyData[i * chunkSize + j]
        if (typeof value === 'number') {
          sum += value
        }
      }
      const avg = sum / (chunkSize * 255)
      levels.push(Number.isFinite(avg) ? avg : 0)
    }

    const previousLevels = audioLevels.value
    audioLevels.value = levels.map((level, index) => {
      const previous = previousLevels[index] ?? 0
      return Math.max(level, previous * 0.65)
    })

    levelsAnimationId = window.requestAnimationFrame(animate)
  }

  animate()
}

const cleanupAudioResources = () => {
  stopDurationTimer()
  stopLevelsAnimation()
  stopRecorderDataRequestInterval()

  if (audioContextRef.value) {
    audioContextRef.value.close().catch(() => {})
    audioContextRef.value = null
  }

  if (mediaStream.value) {
    mediaStream.value.getTracks().forEach((track) => track.stop())
    mediaStream.value = null
  }

  analyserNodeRef.value = null
  frequencyData = null
}

const stopMediaRecorder = () => {
  const recorder = mediaRecorder.value
  if (!recorder) {
    return
  }

  if (recorder.state !== 'inactive') {
    if (typeof recorder.requestData === 'function') {
      try {
        recorder.requestData()
      } catch (error) {
        console.warn('Не удалось запросить финальные данные перед остановкой', error)
      }
    }
    stopRecorderDataRequestInterval()
    recorder.stop()
  }
}

const handleRecorderStop = async (mimeType) => {
  cleanupAudioResources()

  const chunks = [...audioChunks.value]
  audioChunks.value = []

  const shouldDiscard = discardRecording.value || !chunks.length
  discardRecording.value = false
  isRecording.value = false
  recordingUploadProgress.value = 0
  awaitingVoiceSendCompletion.value = false
  voiceSendObserved.value = false

  if (shouldDiscard) {
    resetAudioLevels()
    recordingDuration.value = 0
    return
  }

  isProcessingRecording.value = true

  try {
    const chunkType = chunks.find((chunk) => chunk?.type)?.type
    const type = mimeType || chunkType || 'audio/webm'
    const blob = new Blob(chunks, { type })

    let extension = 'webm'
    const [, rawExt] = type.split('/')
    if (rawExt) {
      extension = rawExt.split(';')[0]
    }
    if (extension === 'x-mpeg') {
      extension = 'mp3'
    }

    const fileName = `voice-${new Date().toISOString().replace(/[.:]/g, '-')}.${extension}`
    const file = new File([blob], fileName, { type })
    const uploaded = await uploadFile(file, (progress) => {
      recordingUploadProgress.value = progress
    })

    emit('submit', {
      text: '',
      files: [uploaded]
    })

    awaitingVoiceSendCompletion.value = true
    voiceSendObserved.value = false
    await nextTick()
    if (voiceSendFallbackTimeoutId !== null) {
      window.clearTimeout(voiceSendFallbackTimeoutId)
    }
    voiceSendFallbackTimeoutId = window.setTimeout(() => {
      if (awaitingVoiceSendCompletion.value && !voiceSendObserved.value) {
        finalizeVoiceProcessing()
      }
    }, 600)
  } catch (error) {
    console.error('Не удалось отправить голосовое сообщение', error)
    finalizeVoiceProcessing()
  } finally {
    recordingUploadProgress.value = 0
    recordingDuration.value = 0
    resetAudioLevels()
  }
}

const startVoiceRecording = async () => {
  if (!canStartVoiceRecording.value) {
    return
  }

  if (typeof MediaRecorder === 'undefined' || !navigator?.mediaDevices?.getUserMedia) {
    console.error('Микрофон недоступен в этом браузере')
    return
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    mediaStream.value = stream
    recordingUploadProgress.value = 0
    awaitingVoiceSendCompletion.value = false
    voiceSendObserved.value = false
    if (voiceSendFallbackTimeoutId !== null) {
      window.clearTimeout(voiceSendFallbackTimeoutId)
      voiceSendFallbackTimeoutId = null
    }

    const recorderOptions = {}
    const supportedMimeType = getSupportedMimeType()
    if (supportedMimeType) {
      recorderOptions.mimeType = supportedMimeType
    }

    let recorder
    try {
      recorder = new MediaRecorder(stream, recorderOptions)
    } catch (error) {
      console.warn('MediaRecorder без опций', error)
      recorder = new MediaRecorder(stream)
    }

    mediaRecorder.value = recorder
    audioChunks.value = []
    discardRecording.value = false

    recorder.addEventListener('dataavailable', (event) => {
      if (event.data && event.data.size > 0) {
        audioChunks.value.push(event.data)
      }
    })

    recorder.addEventListener('stop', () => {
      stopRecorderDataRequestInterval()
      handleRecorderStop(recorder.mimeType)
      mediaRecorder.value = null
    })

    const audioContext = createAudioContext()
    audioContextRef.value = audioContext
    if (audioContext) {
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 64
      analyser.smoothingTimeConstant = 0.6
      source.connect(analyser)
      analyserNodeRef.value = analyser
      frequencyData = new Uint8Array(analyser.frequencyBinCount)
    } else {
      analyserNodeRef.value = null
      frequencyData = null
    }

    recordingStartedAt = Date.now()
    recordingDuration.value = 0
    resetAudioLevels()
    isRecording.value = true

    startDurationTimer()
    startLevelsAnimation()

    try {
      recorder.start()
    } catch (error) {
      console.error('Не удалось начать запись', error)
      throw error
    }

    if (typeof recorder.requestData === 'function') {
      stopRecorderDataRequestInterval()
      const requestIntervalMs = 1000
      recorderDataRequestId = window.setInterval(() => {
        if (recorder.state !== 'recording') {
          stopRecorderDataRequestInterval()
          return
        }

        try {
          recorder.requestData()
        } catch (requestError) {
          console.warn('Не удалось запросить промежуточные данные записи', requestError)
          stopRecorderDataRequestInterval()
        }
      }, requestIntervalMs)
    }
  } catch (error) {
    console.error('Не удалось получить доступ к микрофону', error)
    cleanupAudioResources()
    mediaRecorder.value = null
    discardRecording.value = false
    recordingDuration.value = 0
    resetAudioLevels()
  }
}

const finishRecording = () => {
  if (!isRecording.value || isProcessingRecording.value) {
    return
  }

  discardRecording.value = false
  stopMediaRecorder()
}

const cancelRecording = () => {
  if (!isRecording.value) {
    return
  }

  discardRecording.value = true
  stopMediaRecorder()
}

onBeforeUnmount(() => {
  discardRecording.value = true
  stopMediaRecorder()
  cleanupAudioResources()
  finalizeVoiceProcessing()
})

const queueFilesForUpload = (files) => {
  if (props.isSending || !files?.length) {
    return
  }

  const normalizedFiles = files.map((file) => ({
    file,
    progress: 0,
    status: 'pending',
    hash: null,
    error: null,
    uploaded: null
  }))

  selectedFiles.value.push(...normalizedFiles)
  refreshSelectedFiles()

  normalizedFiles.forEach((fileItem) => {
    startUpload(fileItem)
  })
}

const handleFileSelect = (event) => {
  const files = Array.from(event.target.files || [])
  queueFilesForUpload(files)
  event.target.value = '' // Reset input
}

const handlePaste = (event) => {
  if (props.isSending) {
    return
  }

  const clipboardData = event.clipboardData

  if (!clipboardData) {
    return
  }

  const files = Array.from(clipboardData.files || [])

  if (!files.length) {
    return
  }

  event.preventDefault()
  queueFilesForUpload(files)
}

const removeFile = (index) => {
  selectedFiles.value.splice(index, 1)
  refreshSelectedFiles()
}

const startUpload = async (fileItem) => {
  if (!fileItem?.file) {
    return
  }

  fileItem.status = 'uploading'
  fileItem.progress = 0
  refreshSelectedFiles()

  try {
    const uploaded = await uploadFile(fileItem.file, (progress) => {
      fileItem.progress = progress
      refreshSelectedFiles()
    })

    fileItem.status = 'done'
    fileItem.progress = 100
    fileItem.hash = uploaded.hash
    fileItem.uploaded = uploaded
    fileItem.error = null
    refreshSelectedFiles()
  } catch (error) {
    fileItem.status = 'error'
    fileItem.progress = 0
    fileItem.hash = null
    fileItem.uploaded = null
    fileItem.error = error instanceof Error ? error.message : String(error ?? 'Ошибка')
    console.error('Не удалось загрузить файл', fileItem.file?.name ?? '', error)
    refreshSelectedFiles()
  }
}

const retryUpload = (fileItem) => {
  if (!fileItem || fileItem.status === 'uploading') {
    return
  }

  fileItem.status = 'pending'
  fileItem.progress = 0
  fileItem.error = null
  fileItem.hash = null
  fileItem.uploaded = null
  refreshSelectedFiles()

  startUpload(fileItem)
}

const focusInput = () => {
  nextTick(() => {
    if (textInput.value) {
      textInput.value.focus()
      const length = text.value.length
      textInput.value.setSelectionRange?.(length, length)
    }
  })
}

const uploadFile = async (file, onProgress) => {
  try {
    // Get upload URL
    const { uploadUrl } = await apiGetUploadUrlRoute.run(ctx)

    // Upload file
    const formData = new FormData()
    formData.append('Filedata', file)

    return await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          onProgress?.(Math.round((e.loaded / e.total) * 100))
        }
      })

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          onProgress?.(100)
          resolve({
            hash: xhr.responseText,
            mime: file.type,
            size: file.size,
            name: file.name
          })
        } else {
          reject(new Error('Upload failed'))
        }
      })

      xhr.addEventListener('error', () => reject(new Error('Upload failed')))

      xhr.open('POST', uploadUrl)
      xhr.send(formData)
    })
  } catch (error) {
    console.error('Ошибка загрузки файла:', error)
    onProgress?.(0)
    throw error
  }
}

const handleSubmit = async () => {
  if (
    props.isSending ||
    isUploading.value ||
    hasUploadError.value ||
    isRecording.value ||
    isProcessingRecording.value
  ) {
    return
  }

  const currentText = trimmedText.value

  if (!currentText && !hasUploadedFiles.value) {
    return
  }

  const uploadedFiles = selectedFiles.value
    .filter((item) => item.status === 'done' && item.uploaded)
    .map((item) => item.uploaded)

  emit('submit', {
    text: currentText,
    files: uploadedFiles
  })

  text.value = ''
  selectedFiles.value = []
}

watch(
  () => props.isSending,
  (sending) => {
    if (!awaitingVoiceSendCompletion.value) {
      return
    }

    if (sending) {
      voiceSendObserved.value = true
      return
    }

    if (!sending && voiceSendObserved.value) {
      finalizeVoiceProcessing()
    }
  }
)

watch(text, async () => {
  await nextTick()
  if (textInput.value) {
    textInput.value.style.height = 'auto'
    textInput.value.style.height = textInput.value.scrollHeight + 'px'
  }
})

defineExpose({
  focus: focusInput
})
</script>

<style scoped>
textarea {
  font-family: inherit;
}

@media (max-width: 480px) {
  .recording-ping {
    display: none;
  }

  .recording-indicator {
    gap: 0.375rem;
  }

  .recording-indicator button {
    height: 2rem;
    width: 2rem;
  }
}
</style>
