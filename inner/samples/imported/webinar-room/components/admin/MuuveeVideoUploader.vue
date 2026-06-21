<template>
  <div class="space-y-4">
    <!-- Выбранное видео -->
    <div
      v-if="(modelValue || muuveeVideoId) && videoInfo"
      class="flex items-start gap-3 p-3 rounded-lg border border-primary bg-primary/10"
    >
      <div class="flex-1 min-w-0">
        <div class="wr-text-primary font-medium text-sm">
          {{ videoInfo.title || 'Видео загружено' }}
        </div>
        <div class="wr-text-tertiary text-xs mt-1">
          Длительность: {{ formatDuration(videoInfo.duration) }}
        </div>
        <div v-if="muuveeVideoId" class="wr-text-tertiary text-xs mt-0.5">
          Muuvee ID: {{ muuveeVideoId }}
        </div>
        <div v-else-if="modelValue" class="wr-text-tertiary text-xs mt-0.5">
          Hash: {{ modelValue }}
        </div>
      </div>
      <button
        type="button"
        @click="clearVideo"
        class="text-wr-text-tertiary hover:text-wr-text-primary transition-colors"
      >
        <i class="fas fa-times"></i>
      </button>
    </div>

    <!-- Загрузка или выбор -->
    <div v-if="!modelValue && !muuveeVideoId" class="space-y-3">
      <!-- Кнопка выбора из Muuvee -->
      <button
        type="button"
        @click="showMuuveeSelector = true"
        class="w-full p-4 rounded-lg border-2 border-wr-border hover:border-primary/50 wr-text-primary hover:bg-primary/5 transition flex items-center justify-center gap-2"
      >
        <img
          src="https://fs.chatium.ru/get/image_msk_yaatnfBCb7.180x67.png"
          alt="Muuvee"
          class="h-5 object-contain"
        />
        <span>Выбрать из Muuvee</span>
      </button>

      <div class="text-center wr-text-tertiary text-sm">или</div>

      <!-- Загрузка файла -->
      <label class="block cursor-pointer">
        <input
          ref="fileInput"
          type="file"
          accept="video/*"
          @change="handleFileSelect"
          class="hidden"
        />
        <div
          class="border-2 border-dashed rounded-xl p-6 text-center transition"
          :class="
            uploading
              ? 'border-primary bg-primary/5 wr-text-primary'
              : 'border-wr-border hover:border-primary/50 wr-text-tertiary hover:wr-text-primary'
          "
        >
          <div v-if="uploading" class="space-y-3">
            <div
              class="inline-block w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"
            ></div>
            <div class="space-y-1">
              <div class="wr-text-primary font-medium">{{ uploadingStage }}</div>
              <div v-if="uploadProgress > 0" class="text-sm wr-text-tertiary">
                {{ uploadProgress }}%
              </div>
            </div>
          </div>
          <div v-else class="space-y-2">
            <i class="fas fa-cloud-upload-alt text-3xl"></i>
            <div class="font-medium">Загрузить новое видео</div>
            <div class="text-xs wr-text-tertiary">MP4, MOV, AVI и другие форматы</div>
          </div>
        </div>
      </label>
    </div>

    <!-- Ошибка -->
    <div
      v-if="error"
      class="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm"
    >
      <i class="fas fa-exclamation-triangle mr-1.5"></i>
      {{ error }}
    </div>

    <!-- Модальное окно выбора из Muuvee -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showMuuveeSelector"
          class="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4"
          @click.self="showMuuveeSelector = false"
        >
          <div
            class="wr-bg-primary rounded-xl max-w-4xl w-full max-h-[80vh] flex flex-col shadow-2xl"
          >
            <!-- Заголовок -->
            <div class="flex items-center justify-between p-4 border-b border-wr-border">
              <h3 class="text-lg font-semibold wr-text-primary">Выбрать видео из Muuvee</h3>
              <button
                type="button"
                @click="showMuuveeSelector = false"
                class="text-wr-text-tertiary hover:text-wr-text-primary transition"
              >
                <i class="fas fa-times"></i>
              </button>
            </div>

            <!-- Поиск -->
            <div class="p-4 border-b border-wr-border">
              <div class="relative">
                <input
                  v-model="muuveeSearch"
                  @input="debouncedSearchMuuvee"
                  type="text"
                  placeholder="Поиск по названию..."
                  class="w-full px-4 py-2 pl-10 rounded-lg wr-bg-secondary border border-wr-border wr-text-primary placeholder:text-wr-text-tertiary focus:outline-none focus:border-primary"
                />
                <i
                  class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-wr-text-tertiary"
                ></i>
              </div>
            </div>

            <!-- Список видео -->
            <div class="flex-1 overflow-y-auto p-4">
              <div v-if="loadingMuuveeVideos" class="flex items-center justify-center py-12">
                <div
                  class="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"
                ></div>
              </div>

              <div
                v-else-if="muuveeVideosError"
                class="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm"
              >
                <i class="fas fa-exclamation-triangle mr-1.5"></i>
                {{ muuveeVideosError }}
              </div>

              <div v-else-if="muuveeVideos.length === 0" class="text-center py-12 wr-text-tertiary">
                <i class="fas fa-video text-3xl mb-2"></i>
                <div>Видео не найдены</div>
              </div>

              <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button
                  v-for="video in muuveeVideos"
                  :key="video.id"
                  type="button"
                  @click="selectMuuveeVideo(video)"
                  class="flex gap-3 p-3 rounded-lg border border-wr-border hover:border-primary hover:bg-primary/5 transition text-left"
                >
                  <img
                    v-if="video.coverUrl"
                    :src="video.coverUrl"
                    :alt="video.title"
                    class="w-24 h-16 object-cover rounded flex-shrink-0"
                  />
                  <div class="flex-1 min-w-0">
                    <div class="wr-text-primary font-medium text-sm line-clamp-2">
                      {{ video.title }}
                    </div>
                    <div class="flex items-center gap-3 mt-1 text-xs wr-text-tertiary">
                      <span
                        ><i class="fas fa-clock mr-1"></i>{{ formatDuration(video.duration) }}</span
                      >
                      <span v-if="video.hasTranscribation" class="text-green-400"
                        ><i class="fas fa-check-circle mr-1"></i>Транскрибировано</span
                      >
                    </div>
                    <div class="text-xs wr-text-tertiary mt-0.5">{{ video.channel.name }}</div>
                  </div>
                </button>
              </div>
            </div>

            <!-- Пагинация -->
            <div
              v-if="muuveeVideos.length > 0"
              class="p-4 border-t border-wr-border flex items-center justify-between"
            >
              <button
                type="button"
                @click="loadMuuveeVideos(muuveeOffset - muuveeLimit)"
                :disabled="muuveeOffset === 0 || loadingMuuveeVideos"
                class="px-4 py-2 rounded-lg wr-text-primary hover:bg-primary/10 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <i class="fas fa-chevron-left mr-1"></i>
                Назад
              </button>
              <div class="wr-text-tertiary text-sm">
                {{ muuveeOffset + 1 }}–{{
                  Math.min(muuveeOffset + muuveeLimit, muuveeVideosCount)
                }}
                из {{ muuveeVideosCount }}
              </div>
              <button
                type="button"
                @click="loadMuuveeVideos(muuveeOffset + muuveeLimit)"
                :disabled="muuveeOffset + muuveeLimit >= muuveeVideosCount || loadingMuuveeVideos"
                class="px-4 py-2 rounded-lg wr-text-primary hover:bg-primary/10 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Вперёд
                <i class="fas fa-chevron-right ml-1"></i>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, watch, onUnmounted } from 'vue'
import { obtainStorageFilePutUrl, getDurationFromHash } from '@app/storage'
import { apiMuuveeVideosListRoute } from '../../api/autowebinars'

const props = defineProps({
  modelValue: { type: String, default: null }, // videoHash
  videoInfo: { type: Object, default: null }, // { title, duration }
  muuveeVideoId: { type: String, default: null }, // ID видео в Muuvee (если выбрано из Muuvee)
  kinescopeVideoId: { type: String, default: null } // ID видео в Kinescope (если пришел из Muuvee)
})

const emit = defineEmits([
  'update:modelValue',
  'update:videoInfo',
  'update:muuveeVideoId',
  'update:kinescopeVideoId'
])

const fileInput = ref(null)
const uploading = ref(false)
const uploadProgress = ref(0)
const uploadingStage = ref('')
const error = ref('')

// Muuvee selector
const showMuuveeSelector = ref(false)
const muuveeVideos = ref([])
const muuveeVideosCount = ref(0)
const muuveeSearch = ref('')
const muuveeOffset = ref(0)
const muuveeLimit = ref(20)
const loadingMuuveeVideos = ref(false)
const muuveeVideosError = ref('')

let searchTimeout = null

function formatDuration(seconds) {
  if (!seconds) return '0:00'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`
}

async function handleFileSelect(event) {
  const file = event.target.files?.[0]
  if (!file) return

  uploading.value = true
  uploadProgress.value = 0
  error.value = ''

  try {
    // Загрузка файла в хранилище Chatium
    uploadingStage.value = 'Загрузка файла...'
    const videoHash = await uploadFile(file)

    // Получаем длительность из hash
    uploadingStage.value = 'Получение информации о видео...'
    const duration = getDurationFromHash(videoHash)

    // Возвращаем hash и информацию о видео
    emit('update:modelValue', videoHash)
    emit('update:muuveeVideoId', null)
    emit('update:kinescopeVideoId', null)
    emit('update:videoInfo', {
      title: file.name,
      duration: duration || 0
    })

    uploadingStage.value = 'Готово!'
  } catch (e) {
    const errorMsg = e.message || 'Ошибка при загрузке видео'
    error.value = errorMsg
    console.error('[MuuveeVideoUploader] Ошибка загрузки:', errorMsg)
    console.error('[MuuveeVideoUploader] Полная ошибка:', e)
  } finally {
    uploading.value = false
    uploadProgress.value = 0
    if (fileInput.value) fileInput.value.value = ''
  }
}

function uploadFile(file) {
  return new Promise(async (resolve, reject) => {
    try {
      const uploadUrl = await obtainStorageFilePutUrl(ctx)
      const data = new FormData()
      data.append('Filedata', file)

      const request = new XMLHttpRequest()
      request.open('POST', uploadUrl)

      request.upload.addEventListener('progress', (e) => {
        if (e.total !== 0) {
          uploadProgress.value = Math.round((e.loaded / e.total) * 100)
        }
      })

      request.addEventListener('load', () => {
        if (request.status === 200) {
          resolve(request.response)
        } else {
          reject(new Error('Ошибка загрузки файла'))
        }
      })

      request.addEventListener('error', () => {
        reject(new Error('Ошибка сети при загрузке'))
      })

      request.send(data)
    } catch (e) {
      reject(e)
    }
  })
}

function clearVideo() {
  emit('update:modelValue', null)
  emit('update:videoInfo', null)
  emit('update:muuveeVideoId', null)
  emit('update:kinescopeVideoId', null)
  error.value = ''
}

// Загрузка видео из Muuvee
async function loadMuuveeVideos(offset = 0) {
  loadingMuuveeVideos.value = true
  muuveeVideosError.value = ''
  muuveeOffset.value = offset

  try {
    const result = await apiMuuveeVideosListRoute
      .query({
        search: muuveeSearch.value || undefined,
        limit: muuveeLimit.value,
        offset: muuveeOffset.value,
        onlyTranscribated: false,
        addKinescopeId: true
      })
      .run(ctx)

    if (result.success) {
      muuveeVideos.value = result.videos || []
      muuveeVideosCount.value = result.videosCount || 0

      const firstVideo = muuveeVideos.value[0]
      if (firstVideo) {
        console.log('[MuuveeVideoUploader] listVideos sample', {
          hasKinescopeId: Boolean(firstVideo.kinescopeId),
          kinescopeId: firstVideo.kinescopeId,
          keys: Object.keys(firstVideo)
        })
      }
    } else {
      muuveeVideosError.value = result.error || 'Ошибка загрузки видео из Muuvee'
    }
  } catch (e) {
    muuveeVideosError.value = e.message || 'Ошибка при загрузке видео'
    console.error('[MuuveeVideoUploader] Ошибка загрузки из Muuvee:', e)
  } finally {
    loadingMuuveeVideos.value = false
  }
}

// Debounced поиск
function debouncedSearchMuuvee() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    muuveeOffset.value = 0
    loadMuuveeVideos(0)
  }, 500)
}

// Выбор видео из Muuvee
function selectMuuveeVideo(video) {
  const kinescopeVideoId = video?.kinescopeId || video?.kinescope_id || null

  // Для видео из Muuvee нет videoHash, но может быть прямой kinescopeId.
  emit('update:modelValue', null) // videoHash отсутствует для Muuvee видео
  emit('update:muuveeVideoId', video.id)
  emit('update:kinescopeVideoId', kinescopeVideoId)
  emit('update:videoInfo', {
    title: video.title,
    duration: video.duration,
    coverUrl: video.coverUrl
  })

  console.log('[MuuveeVideoUploader] selected video', {
    muuveeVideoId: video.id,
    kinescopeVideoId,
    rawKinescopeId: video?.kinescopeId,
    rawKinescopeSnake: video?.kinescope_id
  })

  showMuuveeSelector.value = false
  error.value = ''
}

// Автоматическая загрузка при открытии модалки + блокировка скролла
watch(showMuuveeSelector, (newVal) => {
  if (newVal) {
    loadMuuveeVideos(0)
    // Блокируем скролл body
    document.body.style.overflow = 'hidden'
  } else {
    // Разблокируем скролл body
    document.body.style.overflow = ''
  }
})

// Cleanup при размонтировании
onUnmounted(() => {
  document.body.style.overflow = ''
})
</script>

<style scoped>
/* Анимация модального окна */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-active > div,
.modal-leave-active > div {
  transition:
    transform 0.2s ease,
    opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from > div,
.modal-leave-to > div {
  transform: scale(0.95);
  opacity: 0;
}
</style>
