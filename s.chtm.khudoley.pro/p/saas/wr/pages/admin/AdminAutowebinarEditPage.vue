<template>
  <div class="min-h-screen bg-dark">
    <header class="glass sticky top-0 z-30 border-b border-wr-border">
      <div class="px-4 sm:px-6 lg:px-8 py-4">
        <div class="flex items-center gap-3">
          <button
            @click="goBack"
            class="admin-btn-subtle w-10 h-10 rounded-lg flex items-center justify-center"
          >
            <i class="fas fa-arrow-left"></i>
          </button>
          <div class="flex-1 min-w-0">
            <h1 class="wr-text-primary font-bold text-xl truncate">
              {{ aw?.title || 'Загрузка...' }}
            </h1>
            <p class="wr-text-tertiary text-sm mt-0.5">Редактирование автовебинара</p>
          </div>
          <div v-if="aw" class="flex items-center gap-2">
            <span
              :class="statusBadgeClass(aw.status)"
              class="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider"
            >
              {{ statusLabel(aw.status) }}
            </span>
            <button
              v-if="aw.status === 'draft'"
              @click="changeAutowebinarStatus('activate')"
              :disabled="statusActionLoading"
              class="btn-primary text-white px-3 py-2 rounded-lg text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <i v-if="statusActionLoading" class="fas fa-spinner fa-spin mr-1"></i>
              <i v-else class="fas fa-play mr-1"></i>
              Активировать
            </button>
            <button
              v-else-if="aw.status === 'active'"
              @click="changeAutowebinarStatus('archive')"
              :disabled="statusActionLoading"
              class="admin-btn-subtle px-3 py-2 rounded-lg text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <i v-if="statusActionLoading" class="fas fa-spinner fa-spin mr-1"></i>
              <i v-else class="fas fa-box-archive mr-1"></i>
              В архив
            </button>
            <button
              v-else-if="aw.status === 'archived'"
              @click="changeAutowebinarStatus('restore')"
              :disabled="statusActionLoading"
              class="admin-btn-subtle px-3 py-2 rounded-lg text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <i v-if="statusActionLoading" class="fas fa-spinner fa-spin mr-1"></i>
              <i v-else class="fas fa-rotate-left mr-1"></i>
              В черновик
            </button>
          </div>
        </div>
      </div>
    </header>

    <main v-if="loading" class="px-4 py-20 text-center">
      <div
        class="inline-block w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"
      ></div>
      <p class="wr-text-secondary">Загрузка...</p>
    </main>

    <main v-else-if="aw" class="px-4 sm:px-6 lg:px-8 py-6">
      <!-- Табы настроек / сценарий -->
      <div class="flex gap-2 mb-6 border-b border-wr-border">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="activeTab = tab.id"
          :class="[
            'px-4 py-2.5 text-sm font-medium transition border-b-2 -mb-px',
            activeTab === tab.id
              ? 'border-primary text-primary'
              : 'border-transparent wr-text-tertiary hover:wr-text-primary'
          ]"
        >
          <i :class="tab.icon" class="mr-1.5"></i> {{ tab.label }}
        </button>
      </div>

      <!-- Предупреждение об ошибке Muuvee -->
      <div
        v-if="aw.muuveeError"
        class="glass rounded-xl p-4 border-2 border-danger bg-danger/10 mb-6"
      >
        <div class="flex items-start gap-3">
          <i class="fas fa-exclamation-triangle text-danger text-xl mt-0.5"></i>
          <div class="flex-1">
            <h3 class="text-danger font-semibold mb-1">Ошибка обработки видео</h3>
            <p class="wr-text-secondary text-sm whitespace-pre-wrap">{{ aw.muuveeError }}</p>
            <a
              v-if="aw.muuveeError.includes('баланс')"
              href="https://chatium.ru/app/muuvee"
              target="_blank"
              class="inline-flex items-center gap-1.5 mt-2 text-primary hover:text-primary/80 text-sm font-medium"
            >
              <i class="fas fa-external-link-alt"></i>
              Пополнить баланс Muuvee
            </a>
          </div>
        </div>
      </div>

      <!-- Настройки -->
      <div v-if="activeTab === 'settings'" class="max-w-3xl space-y-6">
        <form @submit.prevent="saveSettings" class="space-y-6">
          <div class="glass rounded-xl p-5 space-y-4">
            <h2 class="wr-text-primary font-semibold text-lg">Основные настройки</h2>
            <div>
              <label class="block wr-text-secondary text-sm font-medium mb-1">Название</label>
              <input
                v-model="form.title"
                type="text"
                class="input-modern w-full px-4 py-3 rounded-xl wr-text-primary"
              />
            </div>
            <div>
              <label class="block wr-text-secondary text-sm font-medium mb-1">Описание</label>
              <textarea
                v-model="form.description"
                rows="3"
                class="input-modern w-full px-4 py-3 rounded-xl wr-text-primary"
              ></textarea>
            </div>
            <div>
              <label class="block wr-text-secondary text-sm font-medium mb-1"
                >Комната ожидания (сек)</label
              >
              <input
                v-model.number="form.waitingRoomDuration"
                type="number"
                min="0"
                class="input-modern w-full px-4 py-3 rounded-xl wr-text-primary"
              />
            </div>
          </div>

          <div class="glass rounded-xl p-5 space-y-4">
            <h2 class="wr-text-primary font-semibold text-lg">Видео</h2>

            <MuuveeVideoUploader
              v-model="videoData"
              :videoInfo="videoInfo"
              :muuveeVideoId="muuveeVideoId"
              :kinescopeVideoId="kinescopeVideoId"
              @update:videoInfo="handleVideoInfoUpdate"
              @update:muuveeVideoId="muuveeVideoId = $event"
              @update:kinescopeVideoId="kinescopeVideoId = $event"
            />

            <div v-if="aw.kinescopePlayerId" class="text-xs wr-text-tertiary">
              <i class="fas fa-info-circle mr-1"></i> Плеер ID: {{ aw.kinescopePlayerId }}
            </div>
          </div>

          <div class="glass rounded-xl p-5">
            <h3 class="wr-text-primary font-semibold text-sm mb-3 flex items-center gap-2">
              <i class="fas fa-link text-primary"></i>
              Ссылка для зрителей
            </h3>
            <div class="flex items-center gap-2">
              <input
                :value="displayUrl"
                readonly
                class="input-modern w-full px-4 py-3 rounded-xl wr-text-secondary text-sm"
                :class="{ 'opacity-50': loadingShortUrl }"
              />
              <button
                type="button"
                @click="copyUrl"
                class="admin-btn-subtle px-4 py-3 rounded-xl"
                :disabled="loadingShortUrl"
              >
                <i v-if="loadingShortUrl" class="fas fa-spinner fa-spin"></i>
                <i v-else class="fas fa-copy"></i>
              </button>
            </div>
            <p v-if="loadingShortUrl" class="wr-text-tertiary text-xs mt-2">
              Создание короткой ссылки...
            </p>
            <p v-else-if="shortUrl" class="wr-status-green text-xs mt-2 flex items-center gap-1">
              <i class="fas fa-check-circle"></i>
              Короткая ссылка создана
            </p>
          </div>

          <div class="glass rounded-xl p-5">
            <h3 class="wr-text-primary font-semibold text-sm mb-3 flex items-center gap-2">
              <i class="fas fa-bolt text-primary"></i>
              Спецссылка для моментального запуска
            </h3>
            <div class="flex items-center gap-2">
              <input
                :value="displayInstantStartUrl"
                readonly
                class="input-modern w-full px-4 py-3 rounded-xl wr-text-secondary text-sm"
                :class="{ 'opacity-50': loadingShortUrl }"
              />
              <button
                type="button"
                @click="copyInstantStartUrl"
                class="admin-btn-subtle px-4 py-3 rounded-xl"
                :disabled="loadingShortUrl"
              >
                <i v-if="loadingShortUrl" class="fas fa-spinner fa-spin"></i>
                <i v-else class="fas fa-copy"></i>
              </button>
            </div>
            <p v-if="loadingShortUrl" class="wr-text-tertiary text-xs mt-2">
              Создание короткой спецссылки...
            </p>
            <p class="wr-text-tertiary text-xs mt-2">
              При переходе по ссылке откроется запуск, начавшийся менее минуты назад, либо будет
              создан новый запуск в реальном времени.
            </p>
          </div>

          <div class="glass rounded-xl p-5 space-y-4">
            <h2 class="wr-text-primary font-semibold text-lg">Фейковый онлайн</h2>
            <p v-if="form.duration === 0" class="wr-text-tertiary text-sm">
              <i class="fas fa-info-circle mr-1.5"></i>Выберите видео, чтобы настроить график
              фейкового онлайна
            </p>
            <OnlineChartEditor
              v-else
              :key="'chart-' + (videoData || 'none') + '-' + form.duration"
              v-model="form.fakeOnlineConfig"
              :duration="Math.floor(form.duration / 60)"
            />
          </div>

          <div class="glass rounded-xl p-5 space-y-4">
            <h2 class="wr-text-primary font-semibold text-lg">После завершения</h2>
            <div>
              <CustomSelect
                v-model="form.finishAction"
                :options="[
                  { value: 'page', label: 'Показать страницу' },
                  { value: 'redirect', label: 'Редирект' }
                ]"
              />
            </div>
            <div v-if="form.finishAction === 'redirect'">
              <label class="block wr-text-secondary text-sm font-medium mb-2"
                >Ссылка для редиректа</label
              >
              <input
                v-model="form.resultUrl"
                type="url"
                placeholder="https://..."
                class="input-modern w-full px-4 py-3 rounded-xl wr-text-primary placeholder-gray-500"
              />
              <p class="wr-text-tertiary text-xs mt-1">
                Зрители будут автоматически перенаправлены на этот URL после завершения автовебинара
              </p>
            </div>
            <div v-if="form.finishAction === 'page'" class="space-y-4">
              <div>
                <label class="block wr-text-secondary text-sm font-medium mb-1"
                  >Текст после завершения</label
                >
                <textarea
                  v-model="form.resultText"
                  rows="2"
                  placeholder="Спасибо за просмотр!"
                  class="input-modern w-full px-4 py-3 rounded-xl wr-text-primary resize-none"
                ></textarea>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block wr-text-secondary text-sm font-medium mb-1"
                    >Текст кнопки</label
                  >
                  <input
                    v-model="form.resultButtonText"
                    type="text"
                    placeholder="Подробнее"
                    class="input-modern w-full px-4 py-3 rounded-xl wr-text-primary"
                  />
                </div>
                <div>
                  <label class="block wr-text-secondary text-sm font-medium mb-1"
                    >Ссылка кнопки</label
                  >
                  <input
                    v-model="form.resultUrl"
                    type="url"
                    placeholder="https://..."
                    class="input-modern w-full px-4 py-3 rounded-xl wr-text-primary"
                  />
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            :disabled="saving"
            class="btn-primary text-white font-semibold px-8 py-3 rounded-xl flex items-center gap-2"
          >
            <i v-if="saving" class="fas fa-spinner animate-spin"></i>
            <i v-else class="fas fa-save"></i>
            Сохранить
          </button>
        </form>
      </div>

      <!-- Сценарий -->
      <div v-if="activeTab === 'scenario'">
        <ScenarioEditor
          :autowebinarId="props.autowebinarId"
          :duration="form.duration"
          :subtitles="aw.subtitles"
        />
      </div>

      <!-- Текст видео -->
      <div v-if="activeTab === 'subtitles'" class="max-w-3xl">
        <div class="glass rounded-xl p-5">
          <h2 class="wr-text-primary font-semibold text-lg mb-4 flex items-center gap-2">
            <i class="fas fa-closed-captioning text-primary"></i>
            Текст видео
          </h2>

          <!-- Статус processing -->
          <div
            v-if="aw.subtitlesStatus === 'processing' && !aw.subtitles"
            class="text-center py-10"
          >
            <div
              class="inline-block w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"
            ></div>
            <p class="wr-text-primary font-medium mb-2">Обработка видео...</p>
            <p class="wr-text-tertiary text-sm mb-4">
              Получение текста видео из Muuvee. Это может занять несколько минут.
            </p>
            <button
              @click="retrySubtitles"
              :disabled="retrySubtitlesLoading"
              class="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-wr-border wr-text-secondary text-sm hover:wr-text-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <i v-if="retrySubtitlesLoading" class="fas fa-spinner fa-spin"></i>
              <i v-else class="fas fa-redo"></i>
              {{ retrySubtitlesLoading ? 'Запрашиваем...' : 'Запросить повторно' }}
            </button>
          </div>

          <!-- Статус failed -->
          <div
            v-else-if="aw.subtitlesStatus === 'failed' || aw.muuveeError"
            class="text-center py-10"
          >
            <i class="fas fa-exclamation-circle text-danger text-4xl mb-4"></i>
            <p class="wr-text-primary font-medium mb-2">Ошибка получения текста</p>
            <p class="wr-text-tertiary text-sm mb-4">
              {{ aw.muuveeError || 'Не удалось получить текст видео' }}
            </p>
            <a
              v-if="aw.muuveeError?.includes('баланс')"
              href="https://chatium.ru/app/muuvee"
              target="_blank"
              class="inline-flex items-center gap-1.5 mt-2 text-primary hover:text-primary/80 text-sm font-medium"
            >
              <i class="fas fa-external-link-alt"></i>
              Пополнить баланс Muuvee
            </a>
            <button
              @click="retrySubtitles"
              :disabled="retrySubtitlesLoading"
              class="inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <i v-if="retrySubtitlesLoading" class="fas fa-spinner fa-spin"></i>
              <i v-else class="fas fa-redo"></i>
              {{ retrySubtitlesLoading ? 'Запрашиваем...' : 'Повторить запрос' }}
            </button>
          </div>

          <!-- Статус completed - есть текст -->
          <div v-else-if="aw.subtitles">
            <div class="wr-bg-secondary rounded-lg p-4 max-h-[600px] overflow-y-auto">
              <p class="wr-text-primary text-sm whitespace-pre-wrap leading-relaxed">
                {{ aw.subtitles }}
              </p>
            </div>
            <p class="wr-text-tertiary text-xs mt-2">
              <i class="fas fa-info-circle mr-1"></i>
              Текст получен автоматически через Muuvee
            </p>
          </div>

          <!-- Нет текста -->
          <div v-else class="text-center py-10">
            <i class="fas fa-file-alt wr-text-muted text-4xl mb-4"></i>
            <p class="wr-text-secondary">Текст видео не получен</p>
            <p class="wr-text-tertiary text-sm mt-2">
              Загрузите видео через файловое хранилище, чтобы получить текст
            </p>
            <button
              v-if="muuveeVideoId"
              @click="retrySubtitles"
              :disabled="retrySubtitlesLoading"
              class="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <i v-if="retrySubtitlesLoading" class="fas fa-spinner fa-spin"></i>
              <i v-else class="fas fa-sync-alt"></i>
              {{ retrySubtitlesLoading ? 'Запрашиваем...' : 'Запросить текст' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Расписание -->
      <div v-if="activeTab === 'schedule'" class="space-y-6">
        <!-- Массовое планирование -->
        <div class="glass rounded-xl p-5 space-y-4">
          <h2 class="wr-text-primary font-semibold text-lg flex items-center gap-2">
            <i class="fas fa-calendar-plus text-primary"></i>
            Массовое планирование
          </h2>
          <p class="wr-text-tertiary text-sm">
            Создайте несколько запусков с настраиваемым интервалом
          </p>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block wr-text-secondary text-sm font-medium mb-1"
                >Дата и время начала</label
              >
              <input
                v-model="bulkSchedule.startDate"
                type="datetime-local"
                class="input-modern w-full px-4 py-3 rounded-xl wr-text-primary"
              />
            </div>
            <div>
              <label class="block wr-text-secondary text-sm font-medium mb-1"
                >Дата и время окончания</label
              >
              <input
                v-model="bulkSchedule.endDate"
                type="datetime-local"
                class="input-modern w-full px-4 py-3 rounded-xl wr-text-primary"
              />
            </div>
          </div>

          <div>
            <label class="block wr-text-secondary text-sm font-medium mb-2"
              >Интервал между запусками</label
            >
            <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
              <button
                v-for="interval in [15, 30, 45, 60]"
                :key="interval"
                type="button"
                @click="bulkSchedule.intervalMinutes = interval"
                :class="[
                  'px-4 py-3 rounded-xl font-semibold text-sm transition',
                  bulkSchedule.intervalMinutes === interval
                    ? 'bg-gradient-to-r from-primary to-primary-dark text-white shadow-lg shadow-primary/30'
                    : 'glass wr-text-secondary hover:wr-text-primary hover:border-primary/50'
                ]"
              >
                {{ interval }} мин
              </button>
            </div>
          </div>

          <button
            @click="bulkCreateSchedules"
            :disabled="bulkScheduling"
            class="btn-primary text-white font-semibold px-6 py-3 rounded-xl flex items-center gap-2"
          >
            <i v-if="bulkScheduling" class="fas fa-spinner animate-spin"></i>
            <i v-else class="fas fa-calendar-check"></i>
            {{ bulkScheduling ? 'Создание...' : 'Создать расписание' }}
          </button>

          <p v-if="bulkScheduleError" class="wr-status-red text-sm">
            {{ bulkScheduleError }}
          </p>
        </div>

        <!-- Одиночное добавление -->
        <div class="glass rounded-xl p-5">
          <div class="flex items-center justify-between gap-3">
            <h2 class="wr-text-primary font-semibold text-lg">Расписание запусков</h2>
            <div class="flex gap-2 items-end">
              <input
                v-model="newScheduleDate"
                type="datetime-local"
                class="input-modern px-3 py-2 rounded-lg text-xs wr-text-primary"
              />
              <button
                @click="addSchedule"
                class="btn-primary text-white px-3 py-2 rounded-lg text-xs font-medium"
              >
                <i class="fas fa-plus mr-1"></i> Добавить
              </button>
              <button
                @click="launchNow"
                :disabled="launchingNow"
                class="admin-btn-subtle px-3 py-2 rounded-lg text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <i v-if="launchingNow" class="fas fa-spinner animate-spin mr-1"></i>
                <i v-else class="fas fa-play mr-1"></i>
                {{ launchingNow ? 'Запуск...' : 'Запустить сейчас' }}
              </button>
            </div>
          </div>
          <div class="mt-4">
            <label class="block wr-text-secondary text-sm font-medium mb-1"
              >Спецссылка моментального запуска</label
            >
            <div class="flex items-center gap-2">
              <input
                :value="displayInstantStartUrl"
                readonly
                class="input-modern w-full px-3 py-4 rounded-lg text-sm wr-text-primary"
                :class="{ 'opacity-50': loadingShortUrl }"
              />
              <button
                type="button"
                @click="copyInstantStartUrl"
                class="admin-btn-subtle px-3 py-2 rounded-lg text-xs font-medium"
                :disabled="loadingShortUrl"
              >
                <i class="fas fa-copy mr-1"></i> Копировать
              </button>
            </div>
          </div>
        </div>

        <div v-if="loadingSchedules" class="text-center py-10">
          <div
            class="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"
          ></div>
        </div>

        <div v-else-if="schedules.length === 0" class="text-center py-10 wr-text-muted">
          Нет запланированных запусков
        </div>

        <div v-else class="space-y-2">
          <div
            v-for="sched in schedules"
            :key="sched.id"
            class="glass rounded-lg p-3 flex items-center gap-3"
          >
            <span
              :class="schedStatusBadge(sched.status)"
              class="px-2 py-0.5 rounded text-[10px] font-semibold uppercase"
            >
              {{ schedStatusLabel(sched.status) }}
            </span>
            <div class="flex-1 text-sm wr-text-primary">
              {{ formatDate(sched.scheduledDate) }}
            </div>
            <button
              v-if="sched.status === 'scheduled'"
              @click="deleteSchedule(sched.id)"
              class="wr-text-tertiary hover:text-red-400 text-xs px-2"
            >
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import OnlineChartEditor from '../../components/admin/OnlineChartEditor.vue'
import MuuveeVideoUploader from '../../components/admin/MuuveeVideoUploader.vue'
import ScenarioEditor from '../../components/admin/scenario/ScenarioEditor.vue'
import CustomSelect from '../../components/CustomSelect.vue'
import { ref, reactive, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import {
  apiAutowebinarByIdRoute,
  apiAutowebinarUpdateRoute,
  apiAutowebinarActivateRoute,
  apiAutowebinarArchiveRoute,
  apiAutowebinarRestoreRoute,
  apiAutowebinarRetrySubtitlesRoute
} from '../../api/autowebinars'
import {
  apiSchedulesListRoute,
  apiScheduleCreateRoute,
  apiScheduleCreateNowRoute,
  apiScheduleDeleteRoute,
  apiScheduleBulkCreateRoute
} from '../../api/schedules'
import { episodePageRoute, autowebinarInstantStartRoute } from '../../episode'
import { request } from '@app/request'

const props = defineProps({
  autowebinarId: { type: String, required: true }
})

const aw = ref(null)
const loading = ref(true)
const saving = ref(false)
const statusActionLoading = ref(false)
const activeTab = ref('settings')
const videoInfo = ref(null)
const videoData = ref(null) // videoHash (string)
const muuveeVideoId = ref(null) // ID видео в Muuvee (если выбрано из Muuvee)
const kinescopeVideoId = ref(null) // ID видео в Kinescope (если возвращает listVideos)
const shortUrl = ref('')
const instantStartShortUrl = ref('')
const loadingShortUrl = ref(false)

const tabs = [
  { id: 'settings', label: 'Настройки', icon: 'fas fa-cog' },
  { id: 'scenario', label: 'Сценарий', icon: 'fas fa-film' },
  { id: 'subtitles', label: 'Текст видео', icon: 'fas fa-closed-captioning' },
  { id: 'schedule', label: 'Расписание', icon: 'fas fa-calendar' }
]

const form = reactive({
  title: '',
  description: '',
  duration: 3600,
  waitingRoomDuration: 0,
  fakeOnlineConfig: [],
  finishAction: 'page',
  resultUrl: '',
  resultText: '',
  resultButtonText: ''
})

// Schedules
const schedules = ref([])
const loadingSchedules = ref(false)
const newScheduleDate = ref('')
const launchingNow = ref(false)

// Bulk scheduling
const bulkSchedule = reactive({
  startDate: '',
  endDate: '',
  intervalMinutes: 60
})
const bulkScheduling = ref(false)
const bulkScheduleError = ref('')

function statusLabel(s) {
  return { draft: 'Черновик', active: 'Активен', archived: 'Архив' }[s] || s
}
function statusBadgeClass(s) {
  return (
    {
      draft: 'wr-badge-gray wr-status-gray',
      active: 'wr-badge-green wr-status-green',
      archived: 'wr-badge-yellow wr-status-yellow'
    }[s] || ''
  )
}
function schedStatusLabel(s) {
  return (
    { scheduled: 'Запланирован', waiting_room: 'Ожидание', live: 'В эфире', finished: 'Завершён' }[
      s
    ] || s
  )
}
function schedStatusBadge(s) {
  return (
    {
      scheduled: 'wr-badge-blue wr-status-blue',
      waiting_room: 'wr-badge-yellow wr-status-yellow',
      live: 'wr-badge-green wr-status-green',
      finished: 'wr-badge-gray wr-status-gray'
    }[s] || ''
  )
}
function formatDate(d) {
  return new Date(d).toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const autowebinarUrl = computed(() => {
  if (!aw.value?.id) return ''
  return episodePageRoute({ id: aw.value.id }).url()
})

const displayUrl = computed(() => shortUrl.value || autowebinarUrl.value)
const instantStartUrl = computed(() => {
  if (!aw.value?.id) return ''
  return autowebinarInstantStartRoute({ id: aw.value.id }).url()
})
const displayInstantStartUrl = computed(() => instantStartShortUrl.value || instantStartUrl.value)

async function makeShortUrl(url) {
  try {
    const result = await request({
      method: 'post',
      url: 'https://app.chatium.io/api/2.0/shortLink/create',
      json: { url },
      responseType: 'json'
    })
    return result.body.redirectShortLink || url
  } catch (e) {
    console.error('Failed to create short link:', e)
    return url
  }
}

function copyUrl() {
  navigator.clipboard.writeText(displayUrl.value)
}

function copyInstantStartUrl() {
  if (!displayInstantStartUrl.value) return
  navigator.clipboard.writeText(displayInstantStartUrl.value)
}

function goBack() {
  window.dispatchEvent(
    new CustomEvent('admin-navigate', {
      detail: { section: 'autowebinars', autowebinarId: null, mainTab: 'autowebinars' }
    })
  )
}

const retrySubtitlesLoading = ref(false)
const subtitlesPoller = ref < any > null

function stopSubtitlesPolling() {
  if (subtitlesPoller.value) {
    clearInterval(subtitlesPoller.value)
    subtitlesPoller.value = null
  }
}

async function refreshAwSilently() {
  try {
    const freshAw = await apiAutowebinarByIdRoute({ id: props.autowebinarId }).run(ctx)
    aw.value = freshAw
    if (freshAw?.subtitlesStatus !== 'processing') {
      stopSubtitlesPolling()
    }
  } catch {
    // Ignore polling errors to avoid noisy UI alerts
  }
}

function ensureSubtitlesPolling() {
  if (!aw.value || aw.value.subtitlesStatus !== 'processing') {
    stopSubtitlesPolling()
    return
  }
  if (subtitlesPoller.value) return

  subtitlesPoller.value = setInterval(() => {
    refreshAwSilently()
  }, 5000)
}

async function retrySubtitles() {
  retrySubtitlesLoading.value = true
  try {
    await apiAutowebinarRetrySubtitlesRoute({ id: props.autowebinarId }).run(ctx)
    aw.value = await apiAutowebinarByIdRoute({ id: props.autowebinarId }).run(ctx)
    ensureSubtitlesPolling()
  } catch (e) {
    alert(e.message)
  } finally {
    retrySubtitlesLoading.value = false
  }
}

async function loadAw() {
  loading.value = true
  try {
    aw.value = await apiAutowebinarByIdRoute({ id: props.autowebinarId }).run(ctx)
    Object.assign(form, {
      title: aw.value.title,
      description: aw.value.description || '',
      duration: aw.value.duration,
      waitingRoomDuration: aw.value.waitingRoomDuration || 0,
      fakeOnlineConfig: aw.value.fakeOnlineConfig || [],
      finishAction: aw.value.finishAction || 'page',
      resultUrl: aw.value.resultUrl || '',
      resultText: aw.value.resultText || '',
      resultButtonText: aw.value.resultButtonText || ''
    })

    // Инициализируем videoData и muuveeVideoId из автовебинара
    videoData.value = aw.value.videoHash || null
    muuveeVideoId.value = aw.value.muuveeVideoId || null
    kinescopeVideoId.value = aw.value.kinescopeVideoId || null

    // Инициализируем videoInfo для отображения
    if (aw.value.videoHash || aw.value.kinescopeVideoId || aw.value.muuveeVideoId) {
      videoInfo.value = {
        title: aw.value.title,
        duration: aw.value.duration
      }
    }

    // Создаём короткие ссылки
    if (aw.value.id) {
      loadingShortUrl.value = true
      const [viewerShort, instantShort] = await Promise.all([
        makeShortUrl(autowebinarUrl.value),
        makeShortUrl(instantStartUrl.value)
      ])
      shortUrl.value = viewerShort
      instantStartShortUrl.value = instantShort
      loadingShortUrl.value = false
    }

    ensureSubtitlesPolling()
  } catch (e) {
    alert(e.message)
    goBack()
  }
  loading.value = false
}

function handleVideoInfoUpdate(info) {
  videoInfo.value = info
  if (info) {
    form.duration = Math.floor(info.duration || 0)

    // Сброс графика при смене видео
    form.fakeOnlineConfig = []
  }
}

async function saveSettings() {
  saving.value = true
  try {
    aw.value = await apiAutowebinarUpdateRoute({ id: props.autowebinarId }).run(ctx, {
      ...form,
      videoHash: videoData.value || undefined,
      muuveeVideoId: muuveeVideoId.value || undefined,
      kinescopeVideoId: kinescopeVideoId.value || undefined
    })
  } catch (e) {
    alert(e.message)
  }
  saving.value = false
}

async function changeAutowebinarStatus(action) {
  if (!aw.value?.id || statusActionLoading.value) return

  const confirmText = {
    activate: 'Активировать автовебинар?',
    archive: 'Перевести автовебинар в архив?',
    restore: 'Вернуть автовебинар в черновик?'
  }[action]

  if (!confirm(confirmText)) return

  statusActionLoading.value = true
  try {
    if (action === 'activate') {
      aw.value = await apiAutowebinarActivateRoute({ id: aw.value.id }).run(ctx)
    } else if (action === 'archive') {
      aw.value = await apiAutowebinarArchiveRoute({ id: aw.value.id }).run(ctx)
    } else if (action === 'restore') {
      aw.value = await apiAutowebinarRestoreRoute({ id: aw.value.id }).run(ctx)
    }
  } catch (e) {
    alert(e.message)
  }
  statusActionLoading.value = false
}

// Schedules
async function loadSchedules() {
  loadingSchedules.value = true
  try {
    schedules.value = await apiSchedulesListRoute
      .query({ autowebinarId: props.autowebinarId })
      .run(ctx)
  } catch (e) {
    console.error(e)
  }
  loadingSchedules.value = false
}

async function addSchedule() {
  if (!newScheduleDate.value) return alert('Выберите дату')
  try {
    const sched = await apiScheduleCreateRoute.run(ctx, {
      autowebinarId: props.autowebinarId,
      scheduledDate: new Date(newScheduleDate.value).toISOString()
    })
    schedules.value.push(sched)
    newScheduleDate.value = ''
  } catch (e) {
    alert(e.message)
  }
}

async function launchNow() {
  if (launchingNow.value) return
  launchingNow.value = true
  try {
    await apiScheduleCreateNowRoute.run(ctx, {
      autowebinarId: props.autowebinarId
    })
    await loadSchedules()
  } catch (e) {
    alert(e.message)
  }
  launchingNow.value = false
}

async function deleteSchedule(id) {
  if (!confirm('Удалить запуск?')) return
  try {
    await apiScheduleDeleteRoute({ id }).run(ctx)
    schedules.value = schedules.value.filter((s) => s.id !== id)
  } catch (e) {
    alert(e.message)
  }
}

async function bulkCreateSchedules() {
  const MAX_BULK_SCHEDULES = 360
  bulkScheduleError.value = ''

  if (!bulkSchedule.startDate || !bulkSchedule.endDate) {
    bulkScheduleError.value = 'Заполните даты начала и окончания'
    return
  }

  const start = new Date(bulkSchedule.startDate)
  const end = new Date(bulkSchedule.endDate)

  if (start >= end) {
    bulkScheduleError.value = 'Дата начала должна быть раньше даты окончания'
    return
  }

  const estimatedCount = Math.floor((end - start) / (bulkSchedule.intervalMinutes * 60 * 1000)) + 1

  if (estimatedCount > MAX_BULK_SCHEDULES) {
    bulkScheduleError.value = `За один раз можно запланировать не более ${MAX_BULK_SCHEDULES} запусков (сейчас: ${estimatedCount})`
    return
  }

  if (!confirm(`Будет создано примерно ${estimatedCount} запусков. Продолжить?`)) return

  bulkScheduling.value = true
  try {
    const result = await apiScheduleBulkCreateRoute.run(ctx, {
      autowebinarId: props.autowebinarId,
      startDate: new Date(bulkSchedule.startDate).toISOString(),
      endDate: new Date(bulkSchedule.endDate).toISOString(),
      intervalMinutes: bulkSchedule.intervalMinutes
    })

    alert(`Успешно создано ${result.created} запусков`)
    await loadSchedules()

    // Очистка формы
    bulkSchedule.startDate = ''
    bulkSchedule.endDate = ''
    bulkSchedule.intervalMinutes = 60
  } catch (e) {
    bulkScheduleError.value = e?.message || 'Не удалось создать расписание'
  }
  bulkScheduling.value = false
}

watch(activeTab, (tab) => {
  if (tab === 'schedule' && schedules.value.length === 0) loadSchedules()
})

onMounted(() => {
  loadAw()
})

onBeforeUnmount(() => {
  stopSubtitlesPolling()
})

watch(
  () => aw.value?.subtitlesStatus,
  () => {
    ensureSubtitlesPolling()
  }
)
</script>

<style scoped>
.admin-btn-subtle {
  background: var(--wr-btn-subtle-bg);
  color: var(--wr-text-secondary);
  border: 1px solid var(--wr-btn-subtle-border);
}
.admin-btn-subtle:hover {
  background: var(--wr-btn-subtle-hover-bg);
  color: var(--wr-text-primary);
}
</style>
