<template>
  <div
    class="min-h-screen flex items-center justify-center p-4 bg-cover bg-center bg-fixed"
    style="
      background-image: url('https://msk.cdn-chatium.io/get/image_msk_q7yRABERyI.1024x1024.png');
    "
  >
    <div class="max-w-2xl w-full">
      <!-- Единый белый блок -->
      <div class="bg-white bg-opacity-70 backdrop-blur rounded-3xl shadow-2xl p-8">
        <!-- Заголовок -->
        <div class="text-center mb-8 pb-8 border-b border-gray-200">
          <h1 class="text-2xl font-bold text-gray-800 mb-2">Голосовые сообщения</h1>
          <p class="text-gray-600 text-lg">Запишите сообщение<br />и&nbsp;поделитесь ссылкой</p>
        </div>
        <!-- Статус -->
        <div class="text-center mb-8">
          <div v-if="!isRecording && !audioBlob" class="text-gray-500">
            <i class="fas fa-microphone text-5xl mb-3 text-gray-400"></i>
            <p class="text-lg">Нажмите кнопку<br />для начала записи</p>
          </div>

          <div v-else-if="isRecording" class="text-danger">
            <div class="relative inline-block">
              <i class="fas fa-circle text-5xl mb-3 animate-pulse"></i>
              <div class="absolute inset-0 pulse-ring">
                <i class="fas fa-circle text-5xl opacity-50"></i>
              </div>
            </div>
            <p class="text-lg font-semibold">Идет запись... {{ recordingTime }}с</p>
          </div>

          <div v-else-if="audioBlob && !uploadedFile" class="text-success">
            <i class="fas fa-check-circle text-5xl mb-3"></i>
            <p class="text-lg">Запись готова! Длительность: {{ recordingTime }}с</p>
          </div>

          <div v-else-if="isUploading" class="text-primary">
            <i class="fas fa-cloud-upload-alt text-5xl mb-3 animate-pulse"></i>
            <p class="text-lg">Загрузка... {{ uploadProgress }}%</p>
            <div class="w-full bg-gray-200 rounded-full h-2 mt-3">
              <div
                class="bg-primary h-2 rounded-full transition-all"
                :style="{ width: uploadProgress + '%' }"
              ></div>
            </div>
          </div>

          <div v-else-if="uploadedFile" class="text-success">
            <i class="fas fa-link text-5xl mb-3"></i>
            <p class="text-lg font-semibold">Ссылка готова!</p>
          </div>
        </div>

        <!-- Аудио плеер -->
        <div v-if="audioBlob && !isRecording" class="mb-6">
          <audio :src="audioUrl" controls class="w-full"></audio>
        </div>

        <!-- Поле с ссылкой -->
        <div v-if="uploadedFile && publicUrl" class="mb-6">
          <div class="flex gap-2">
            <button
              @click="copyLink"
              class="px-6 py-3 bg-primary text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold"
            >
              <i class="fas fa-copy mr-2"></i>
              {{ copied ? 'Скопировано!' : 'Копировать ссылку' }}
            </button>
          </div>
        </div>

        <!-- Кнопки управления -->
        <div class="flex justify-center gap-4">
          <button
            v-if="!isRecording && !audioBlob"
            @click="startRecording"
            :disabled="!isSupported"
            class="w-20 h-20 rounded-full bg-danger text-white shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <i class="fas fa-microphone text-2xl"></i>
          </button>

          <button
            v-if="isRecording"
            @click="stopRecording"
            class="w-20 h-20 rounded-full bg-gray-800 text-white shadow-lg hover:shadow-xl transition-all flex items-center justify-center"
          >
            <i class="fas fa-stop text-2xl"></i>
          </button>

          <button
            v-if="audioBlob && !isRecording && !uploadedFile"
            @click="uploadAudio"
            :disabled="isUploading"
            class="px-8 py-4 rounded-full bg-success text-white shadow-lg hover:shadow-xl transition-all disabled:opacity-50 font-semibold text-lg"
          >
            <i class="fas fa-cloud-upload-alt mr-2"></i>
            Сохранить
          </button>

          <button
            v-if="audioBlob && !isRecording"
            @click="resetRecording"
            class="px-8 py-4 rounded-full bg-gray-500 text-white shadow-lg hover:shadow-xl transition-all font-semibold text-lg"
          >
            <i class="fas fa-redo mr-2"></i>
            Новая запись
          </button>
        </div>

        <!-- Предупреждение о неподдержке -->
        <div
          v-if="!isSupported"
          class="mt-6 p-4 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-700 rounded"
        >
          <i class="fas fa-exclamation-triangle mr-2"></i>
          Ваш браузер не поддерживает запись аудио. Попробуйте использовать современный браузер.
        </div>

        <!-- Ошибка -->
        <div v-if="error" class="mt-6 p-4 bg-red-50 border-l-4 border-red-400 text-red-700 rounded">
          <i class="fas fa-exclamation-circle mr-2"></i>
          {{ error }}
        </div>

        <!-- История записей -->
        <div v-if="history.length > 0" class="mt-8 pt-8">
          <h2 class="text-center text-2xl font-bold mb-4 text-gray-800">История записей</h2>
          <div class="space-y-3">
            <div v-for="item in history" :key="item.hash" class="flex items-center justify-between">
              <div class="flex-1">
                <p class="text-sm text-gray-500">{{ formatDate(item.date) }}</p>
              </div>
              <button
                @click="copyHistoryLink(item.url)"
                class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
              >
                <i class="fas fa-copy mr-1"></i>
                Копировать
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { obtainStorageFilePutUrl } from '@app/storage'
import { apiGetPublicUrlRoute } from '../api/file'

const isSupported = ref(false)
const isRecording = ref(false)
const audioBlob = ref(null)
const audioUrl = ref('')
const mediaRecorder = ref(null)
const audioChunks = ref([])
const recordingTime = ref(0)
const recordingInterval = ref(null)
const error = ref('')

const isUploading = ref(false)
const uploadProgress = ref(0)
const uploadedFile = ref(null)
const publicUrl = ref('')
const copied = ref(false)

const history = ref([])

onMounted(() => {
  // Проверка поддержки
  isSupported.value = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)

  // Загрузка истории из localStorage
  const savedHistory = localStorage.getItem('voiceMessagesHistory')
  if (savedHistory) {
    try {
      history.value = JSON.parse(savedHistory)
    } catch (e) {
      console.error('Error loading history:', e)
    }
  }
})

onUnmounted(() => {
  if (audioUrl.value) {
    URL.revokeObjectURL(audioUrl.value)
  }
})

async function startRecording() {
  try {
    error.value = ''
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

    // Определяем MIME тип в зависимости от браузера
    let mimeType = 'audio/webm'

    // Для iOS используем MP4
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
      mimeType = 'audio/mp4'
    } else if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
      mimeType = 'audio/webm;codecs=opus'
    } else if (MediaRecorder.isTypeSupported('audio/webm')) {
      mimeType = 'audio/webm'
    } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
      mimeType = 'audio/mp4'
    }

    mediaRecorder.value = new MediaRecorder(stream, { mimeType })
    audioChunks.value = []

    mediaRecorder.value.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.value.push(event.data)
      }
    }

    mediaRecorder.value.onstop = () => {
      const blob = new Blob(audioChunks.value, { type: mimeType })
      audioBlob.value = blob
      audioUrl.value = URL.createObjectURL(blob)

      // Останавливаем все треки
      stream.getTracks().forEach((track) => track.stop())
    }

    mediaRecorder.value.start()
    isRecording.value = true
    recordingTime.value = 0

    // Таймер записи
    recordingInterval.value = setInterval(() => {
      recordingTime.value++
    }, 1000)
  } catch (err) {
    console.error('Error accessing microphone:', err)
    error.value = 'Не удалось получить доступ к микрофону. Проверьте разрешения.'
  }
}

function stopRecording() {
  if (mediaRecorder.value && isRecording.value) {
    mediaRecorder.value.stop()
    isRecording.value = false

    if (recordingInterval.value) {
      clearInterval(recordingInterval.value)
      recordingInterval.value = null
    }
  }
}

function resetRecording() {
  if (audioUrl.value) {
    URL.revokeObjectURL(audioUrl.value)
  }

  audioBlob.value = null
  audioUrl.value = ''
  recordingTime.value = 0
  uploadedFile.value = null
  publicUrl.value = ''
  copied.value = false
  error.value = ''
  uploadProgress.value = 0
}

async function uploadAudio() {
  if (!audioBlob.value) return

  try {
    isUploading.value = true
    uploadProgress.value = 0
    error.value = ''

    const uploadUrl = await obtainStorageFilePutUrl(ctx)

    const data = new FormData()
    data.append('Filedata', audioBlob.value, 'voice-message.webm')

    const response = await new Promise((resolve, reject) => {
      const request = new XMLHttpRequest()
      request.open('POST', uploadUrl)

      request.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          uploadProgress.value = Math.round((e.loaded / e.total) * 100)
        }
      })

      request.addEventListener('load', () => {
        if (request.status === 200) {
          resolve(request.response)
        } else {
          reject(new Error('Upload failed'))
        }
      })

      request.addEventListener('error', () => {
        reject(new Error('Network error'))
      })

      request.send(data)
    })

    const hash = response

    uploadedFile.value = {
      hash,
      type: audioBlob.value.type,
      size: audioBlob.value.size,
      name: 'voice-message.webm'
    }

    // Получаем публичную ссылку
    const urlResponse = await apiGetPublicUrlRoute({ hash }).run(ctx)
    publicUrl.value = urlResponse.url

    // Сохраняем в историю
    const historyItem = {
      hash,
      url: urlResponse.url,
      date: new Date().toISOString()
    }
    history.value.unshift(historyItem)

    // Ограничиваем историю 10 записями
    if (history.value.length > 10) {
      history.value = history.value.slice(0, 10)
    }

    // Сохраняем в localStorage
    localStorage.setItem('voiceMessagesHistory', JSON.stringify(history.value))
  } catch (err) {
    console.error('Upload error:', err)
    error.value = 'Ошибка при загрузке файла. Попробуйте еще раз.'
  } finally {
    isUploading.value = false
  }
}

async function copyLink() {
  try {
    await navigator.clipboard.writeText(publicUrl.value)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (err) {
    console.error('Copy error:', err)
    // Fallback для старых браузеров
    const input = document.createElement('input')
    input.value = publicUrl.value
    document.body.appendChild(input)
    input.select()
    document.execCommand('copy')
    document.body.removeChild(input)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  }
}

async function copyHistoryLink(url) {
  try {
    await navigator.clipboard.writeText(url)
  } catch (err) {
    console.error('Copy error:', err)
  }
}

function formatDate(dateString) {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Только что'
  if (diffMins < 60) return `${diffMins} мин назад`
  if (diffHours < 24) return `${diffHours} ч назад`
  if (diffDays < 7) return `${diffDays} дн назад`

  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>
