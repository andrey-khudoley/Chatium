<template>
  <div class="min-h-screen bg-dark">
    <header class="glass sticky top-0 z-50">
      <div
        class="max-w-3xl mx-auto px-3 sm:px-4 lg:px-6 py-3 sm:py-4 flex items-center gap-3 sm:gap-4"
      >
        <a
          :href="adminListUrl"
          class="wr-text-tertiary hover:wr-text-primary transition w-8 h-8 sm:w-auto sm:h-auto flex items-center justify-center sm:block flex-shrink-0"
        >
          <i class="fas fa-arrow-left text-sm sm:text-base"></i>
        </a>
        <h1 class="wr-text-primary font-bold text-base sm:text-lg truncate">Создание эфира</h1>
      </div>
    </header>

    <main class="max-w-3xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
      <form @submit.prevent="submitForm" class="space-y-6">
        <div>
          <label class="block wr-text-secondary text-sm font-medium mb-2">Название *</label>
          <input
            v-model="form.title"
            type="text"
            required
            placeholder="Тема эфира"
            class="input-modern w-full px-4 py-3 rounded-xl wr-text-primary placeholder-gray-500"
          />
        </div>

        <div>
          <label class="block wr-text-secondary text-sm font-medium mb-2">Описание</label>
          <textarea
            v-model="form.description"
            rows="3"
            placeholder="О чём будет эфир..."
            class="input-modern w-full px-4 py-3 rounded-xl wr-text-primary placeholder-gray-500 resize-none"
          ></textarea>
        </div>

        <div>
          <label class="block wr-text-secondary text-sm font-medium mb-2">Дата и время *</label>
          <input
            v-model="form.scheduledDate"
            type="datetime-local"
            required
            class="input-modern w-full px-4 py-3 rounded-xl wr-text-primary"
          />
        </div>

        <div>
          <label class="block wr-text-secondary text-sm font-medium mb-2">Доступ к чату</label>
          <CustomSelect v-model="form.chatAccessMode" :options="chatAccessOptions" size="lg" />
        </div>

        <div>
          <label class="block wr-text-secondary text-sm font-medium mb-2"
            >Задержка трансляции</label
          >
          <CustomSelect v-model="form.latencyMode" :options="latencyOptions" size="lg" />
          <p class="wr-text-tertiary text-xs mt-1">
            Минимальная задержка обеспечивает почти реальное время взаимодействия со зрителями
          </p>
        </div>

        <div>
          <CustomCheckbox v-model="form.dvr">
            <span class="wr-text-secondary text-sm font-medium"
              >Разрешить перемотку во время эфира (DVR)</span
            >
          </CustomCheckbox>
          <p class="wr-text-tertiary text-xs mt-1 ml-[30px]">
            Зрители смогут перематывать трансляцию и смотреть с начала
          </p>
        </div>

        <div>
          <CustomCheckbox v-model="form.record">
            <span class="wr-text-secondary text-sm font-medium">Сохранять запись эфира</span>
          </CustomCheckbox>
          <p class="wr-text-tertiary text-xs mt-1 ml-[30px]">
            Запись эфира будет сохранена в Kinescope после завершения
          </p>
        </div>

        <div v-if="form.record" class="space-y-2">
          <label class="block wr-text-secondary text-sm font-medium"
            >Папка для записи в Kinescope *</label
          >
          <CustomSelect
            v-model="form.kinescopeFolderId"
            :options="folderOptions"
            :placeholder="loadingFolders ? 'Загрузка папок...' : 'Выберите папку'"
            :disabled="loadingFolders"
            size="lg"
          />
          <p v-if="foldersError" class="wr-status-red text-xs">{{ foldersError }}</p>
          <p class="wr-text-tertiary text-xs">
            Выберите папку в Kinescope, куда будет сохранена запись эфира
          </p>
        </div>

        <div class="space-y-2">
          <label class="block wr-text-secondary text-sm font-medium">Плеер Kinescope</label>
          <CustomSelect
            v-model="form.kinescopePlayerId"
            :options="playerOptions"
            :placeholder="loadingPlayers ? 'Загрузка...' : 'Плеер по умолчанию'"
            :disabled="loadingPlayers"
            size="lg"
          />
          <p v-if="playersError" class="wr-status-red text-xs">{{ playersError }}</p>
          <p class="wr-text-tertiary text-xs">
            Выберите плеер для отображения трансляции. Если не выбран — используется плеер по
            умолчанию.
          </p>
        </div>

        <div class="glass rounded-2xl p-5 space-y-4">
          <h3 class="wr-text-primary font-semibold text-sm flex items-center gap-2">
            <i class="fas fa-flag-checkered text-primary"></i>
            Действие при завершении эфира
          </h3>
          <div>
            <label class="block wr-text-secondary text-sm font-medium mb-2"
              >Что показать зрителям после завершения</label
            >
            <CustomSelect v-model="form.finishAction" :options="finishActionOptions" size="lg" />
            <p class="wr-text-tertiary text-xs mt-1">
              {{
                form.finishAction === 'redirect'
                  ? 'Зрители будут автоматически перенаправлены на указанный URL'
                  : 'Зрители увидят страницу с текстом и кнопкой'
              }}
            </p>
          </div>

          <div v-if="form.finishAction === 'redirect'">
            <label class="block wr-text-secondary text-sm font-medium mb-2"
              >Ссылка для редиректа *</label
            >
            <input
              v-model="form.resultUrl"
              type="url"
              required
              placeholder="https://..."
              class="input-modern w-full px-4 py-3 rounded-xl wr-text-primary placeholder-gray-500"
            />
            <p class="wr-text-tertiary text-xs mt-1">
              Зрители будут автоматически перенаправлены на этот URL после завершения эфира
            </p>
          </div>

          <div v-if="form.finishAction === 'page'" class="space-y-4 pt-2">
            <div>
              <label class="block wr-text-secondary text-sm font-medium mb-2"
                >Текст после завершения</label
              >
              <textarea
                v-model="form.resultText"
                rows="2"
                placeholder="Спасибо за участие! Мы рады, что вы были с нами."
                class="input-modern w-full px-4 py-3 rounded-xl wr-text-primary placeholder-gray-500 resize-none"
              ></textarea>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block wr-text-secondary text-sm font-medium mb-2">Текст кнопки</label>
                <input
                  v-model="form.resultButtonText"
                  type="text"
                  placeholder="Подробнее"
                  class="input-modern w-full px-4 py-3 rounded-xl wr-text-primary placeholder-gray-500"
                />
              </div>
              <div>
                <label class="block wr-text-secondary text-sm font-medium mb-2"
                  >Ссылка кнопки</label
                >
                <input
                  v-model="form.resultUrl"
                  type="url"
                  placeholder="https://..."
                  class="input-modern w-full px-4 py-3 rounded-xl wr-text-primary placeholder-gray-500"
                />
              </div>
            </div>
          </div>
        </div>

        <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-4">
          <button
            type="submit"
            :disabled="saving"
            class="btn-primary text-white font-semibold px-6 sm:px-8 py-3 rounded-xl flex items-center justify-center gap-2 min-h-[48px]"
          >
            <i v-if="saving" class="fas fa-spinner fa-spin"></i>
            <i v-else class="fas fa-plus"></i>
            {{ saving ? 'Создание...' : 'Создать эфир' }}
          </button>
          <a
            :href="adminListUrl"
            class="wr-text-tertiary hover:wr-text-primary transition text-sm px-4 py-3 text-center sm:text-left"
            >Отмена</a
          >
        </div>

        <div v-if="error" class="glass-toast rounded-xl p-4 wr-status-red text-sm">
          <i class="fas fa-exclamation-circle mr-2"></i> {{ error }}
        </div>
      </form>
    </main>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch, computed } from 'vue'
import { apiEpisodeCreateRoute } from '../../api/episodes'
import CustomSelect from '../../components/CustomSelect.vue'
import CustomCheckbox from '../../components/CustomCheckbox.vue'
import {
  apiKinescopeFoldersRoute,
  apiKinescopePlayersRoute
} from '../../api/episodes-kinescope-routes'

const chatAccessOptions = [
  { value: 'open', label: 'Открытый (все могут писать)' },
  { value: 'auth-only', label: 'Только авторизованные' },
  { value: 'disabled', label: 'Чат отключён' }
]

const latencyOptions = [
  { value: 'low', label: 'Минимальная (Low Latency) — рекомендуется' },
  { value: 'standard', label: 'Стандартная (Standard Latency)' }
]

const finishActionOptions = [
  { value: 'page', label: 'Показать финальную страницу с кнопкой' },
  { value: 'redirect', label: 'Перенаправить на другую страницу' }
]

const props = defineProps({
  adminListUrl: String
})

const saving = ref(false)
const error = ref('')
const players = ref([])
const loadingPlayers = ref(false)
const playersError = ref('')
const folders = ref([])
const loadingFolders = ref(false)
const foldersError = ref('')

const form = reactive({
  title: '',
  description: '',
  scheduledDate: '',
  chatAccessMode: 'open',
  latencyMode: 'low',
  kinescopePlayerId: '',
  dvr: true,
  record: true,
  kinescopeFolderId: '',
  finishAction: 'page',
  resultText: '',
  resultButtonText: '',
  resultUrl: ''
})

const folderOptions = computed(() => [
  { value: '', label: loadingFolders.value ? 'Загрузка папок...' : 'Выберите папку' },
  ...folders.value.map((f) => ({ value: f.id, label: `${f.projectName} / ${f.name}` }))
])

const playerOptions = computed(() => [
  { value: '', label: loadingPlayers.value ? 'Загрузка...' : 'Плеер по умолчанию' },
  ...players.value.map((p) => ({ value: p.id, label: p.name }))
])

async function loadPlayers() {
  loadingPlayers.value = true
  playersError.value = ''
  try {
    const data = await apiKinescopePlayersRoute.run(ctx)
    players.value = data
  } catch (e) {
    playersError.value = 'Не удалось загрузить плееры: ' + e.message
  }
  loadingPlayers.value = false
}

async function loadFolders() {
  loadingFolders.value = true
  foldersError.value = ''
  try {
    const data = await apiKinescopeFoldersRoute.run(ctx)
    folders.value = data
    // Автоматически выбираем первую папку, если есть
    if (data.length > 0 && !form.kinescopeFolderId) {
      form.kinescopeFolderId = data[0].id
    }
  } catch (e) {
    foldersError.value = 'Не удалось загрузить папки: ' + e.message
  }
  loadingFolders.value = false
}

onMounted(() => {
  loadPlayers()
  loadFolders()
})

async function submitForm() {
  saving.value = true
  error.value = ''

  if (form.finishAction === 'redirect' && !form.resultUrl) {
    error.value = 'Укажите URL для перенаправления'
    saving.value = false
    return
  }

  try {
    const episode = await apiEpisodeCreateRoute.run(ctx, {
      title: form.title,
      description: form.description || undefined,
      scheduledDate: new Date(form.scheduledDate).toISOString(),
      chatAccessMode: form.chatAccessMode,
      latencyMode: form.latencyMode,
      kinescopePlayerId: form.kinescopePlayerId || undefined,
      dvr: form.dvr,
      record: form.record,
      kinescopeFolderId: form.kinescopeFolderId || undefined,
      finishAction: form.finishAction,
      resultText: form.resultText || undefined,
      resultButtonText: form.resultButtonText || undefined,
      resultUrl: form.resultUrl || undefined
    })
    // Навигация через событие
    window.dispatchEvent(
      new CustomEvent('admin-navigate', {
        detail: { section: 'episodes', episodeId: episode.id }
      })
    )
  } catch (e) {
    error.value = e.message
  }
  saving.value = false
}
</script>
