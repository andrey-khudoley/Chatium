<template>
  <div class="min-h-screen bg-dark">
    <header class="glass sticky top-0 z-50">
      <div
        class="max-w-6xl mx-auto px-3 sm:px-4 lg:px-6 py-3 sm:py-4 flex items-center gap-3 sm:gap-4"
      >
        <h1 class="wr-text-primary font-bold text-base sm:text-lg truncate">Ответы на формы</h1>
        <div class="ml-auto flex items-center gap-2">
          <button
            @click="exportCsv"
            :disabled="exporting || submissions.length === 0"
            class="admin-btn-subtle px-3 py-2 rounded-lg text-xs sm:text-sm font-medium inline-flex items-center gap-1.5 transition"
          >
            <i
              :class="exporting ? 'fas fa-spinner fa-spin' : 'fas fa-file-csv'"
              class="text-xs"
            ></i>
            <span class="hidden sm:inline">Экспорт CSV</span>
          </button>
        </div>
      </div>
    </header>

    <main
      class="max-w-6xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8 space-y-4 sm:space-y-6"
    >
      <!-- Фильтры -->
      <div class="glass rounded-2xl p-4 sm:p-5 space-y-4">
        <h3 class="wr-text-primary font-semibold text-sm flex items-center gap-2">
          <i class="fas fa-filter text-primary"></i>
          Фильтры
        </h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="wr-text-tertiary text-xs font-medium mb-1.5 block">Форма</label>
            <CustomSelect
              v-model="filterFormId"
              :options="formSelectOptions"
              placeholder="— Все формы —"
              size="md"
            />
          </div>
          <div>
            <label class="wr-text-tertiary text-xs font-medium mb-1.5 block">{{
              mode === 'autowebinars' ? 'Автовебинар' : 'Эфир'
            }}</label>
            <CustomSelect
              v-model="filterEpisodeId"
              :options="episodeSelectOptions"
              :placeholder="mode === 'autowebinars' ? '— Все автовебинары —' : '— Все эфиры —'"
              size="md"
            />
          </div>
        </div>
      </div>

      <!-- Статистика -->
      <div class="flex items-center gap-3 flex-wrap">
        <div class="glass-light rounded-xl px-4 py-2.5 flex items-center gap-2">
          <i class="fas fa-inbox text-primary text-sm"></i>
          <span class="wr-text-secondary text-sm font-medium">{{ totalCount }}</span>
          <span class="wr-text-tertiary text-xs">{{ pluralSubmissions(totalCount) }}</span>
        </div>
        <div
          v-if="totalPages > 1"
          class="glass-light rounded-xl px-4 py-2.5 flex items-center gap-2"
        >
          <i class="fas fa-file-alt text-primary text-sm"></i>
          <span class="wr-text-secondary text-sm font-medium"
            >Страница {{ currentPage }} из {{ totalPages }}</span
          >
        </div>
        <button
          v-if="filterFormId || filterEpisodeId"
          @click="clearFilters"
          class="wr-text-tertiary hover:wr-text-primary text-xs transition flex items-center gap-1"
        >
          <i class="fas fa-times"></i> Сбросить фильтры
        </button>
      </div>

      <!-- Загрузка -->
      <div v-if="loading" class="flex justify-center py-12">
        <div
          class="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"
        ></div>
      </div>

      <!-- Пусто -->
      <div v-else-if="submissions.length === 0" class="text-center py-16">
        <div class="w-16 h-16 rounded-2xl glass mx-auto mb-4 flex items-center justify-center">
          <i class="fas fa-inbox wr-text-tertiary text-2xl"></i>
        </div>
        <p class="wr-text-secondary text-base mb-1">Ответов пока нет</p>
        <p class="wr-text-muted text-sm">Они появятся, когда зрители заполнят формы</p>
      </div>

      <!-- Таблица (десктоп) -->
      <div v-else class="hidden md:block glass rounded-2xl overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b" style="border-color: var(--wr-border)">
                <th
                  class="text-left px-4 py-3 wr-text-tertiary text-xs font-semibold uppercase tracking-wider"
                >
                  Дата
                </th>
                <th
                  class="text-left px-4 py-3 wr-text-tertiary text-xs font-semibold uppercase tracking-wider"
                >
                  Форма
                </th>
                <th
                  class="text-left px-4 py-3 wr-text-tertiary text-xs font-semibold uppercase tracking-wider"
                >
                  {{ mode === 'autowebinars' ? 'Автовебинар' : 'Эфир' }}
                </th>
                <th
                  class="text-left px-4 py-3 wr-text-tertiary text-xs font-semibold uppercase tracking-wider"
                >
                  Пользователь
                </th>
                <th
                  class="text-left px-4 py-3 wr-text-tertiary text-xs font-semibold uppercase tracking-wider"
                >
                  Данные
                </th>
                <th class="w-10"></th>
              </tr>
            </thead>
            <tbody>
              <template v-for="sub in submissions" :key="sub.id">
                <tr
                  class="border-b transition"
                  style="border-color: var(--wr-border-light)"
                  :class="{ 'hover-row': true }"
                >
                  <td class="px-4 py-3 whitespace-nowrap">
                    <div class="wr-text-secondary text-xs">{{ formatDate(sub.createdAt) }}</div>
                    <div class="wr-text-muted text-[10px]">{{ formatTime(sub.createdAt) }}</div>
                  </td>
                  <td class="px-4 py-3">
                    <span class="wr-text-primary text-xs font-medium">{{
                      getFormTitle(sub.formId)
                    }}</span>
                  </td>
                  <td class="px-4 py-3">
                    <span class="wr-text-secondary text-xs">{{
                      getEpisodeTitle(sub.episodeId, sub.autowebinarId) || '—'
                    }}</span>
                  </td>
                  <td class="px-4 py-3">
                    <div class="wr-text-primary text-xs font-medium">
                      {{ getUserName(sub.userId) }}
                    </div>
                    <div v-if="getUserContact(sub)" class="wr-text-tertiary text-[10px]">
                      {{ getUserContact(sub) }}
                    </div>
                  </td>
                  <td class="px-4 py-3 max-w-xs">
                    <div class="flex flex-wrap gap-1">
                      <span
                        v-for="(val, key) in getVisibleData(sub.data)"
                        :key="key"
                        class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] max-w-[200px]"
                        style="background: var(--wr-btn-subtle-bg)"
                      >
                        <span class="wr-text-tertiary truncate">{{ key }}:</span>
                        <span class="wr-text-secondary truncate">{{ val }}</span>
                      </span>
                    </div>
                  </td>
                  <td class="px-4 py-3">
                    <button @click="toggleExpand(sub.id)" class="admin-icon-btn">
                      <i
                        :class="expandedId === sub.id ? 'fas fa-chevron-up' : 'fas fa-chevron-down'"
                        class="text-[9px]"
                      ></i>
                    </button>
                  </td>
                </tr>
                <tr v-if="expandedId === sub.id">
                  <td colspan="6" class="px-4 py-4" style="background: var(--wr-glass-light-bg)">
                    <div class="space-y-2 max-w-2xl">
                      <h4 class="wr-text-primary text-xs font-semibold mb-2">Все данные ответа</h4>
                      <div v-for="(val, key) in sub.data" :key="key" class="flex gap-3 text-xs">
                        <span class="wr-text-tertiary font-medium min-w-[100px]">{{
                          getFieldLabel(sub.formId, key) || key
                        }}</span>
                        <span class="wr-text-primary break-all">{{ val }}</span>
                      </div>
                      <div
                        class="flex gap-3 text-xs pt-1 border-t"
                        style="border-color: var(--wr-border-light)"
                      >
                        <span class="wr-text-muted font-medium min-w-[100px]">ID</span>
                        <span class="wr-text-muted font-mono text-[10px]">{{ sub.id }}</span>
                      </div>
                    </div>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Карточки (мобайл) -->
      <div v-if="!loading && submissions.length > 0" class="md:hidden space-y-3">
        <div v-for="sub in submissions" :key="'m-' + sub.id" class="glass rounded-xl p-4 space-y-3">
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <span class="wr-text-primary text-sm font-medium block truncate">{{
                getFormTitle(sub.formId)
              }}</span>
              <span class="wr-text-tertiary text-[11px] block mt-0.5"
                >{{ formatDate(sub.createdAt) }} · {{ formatTime(sub.createdAt) }}</span
              >
            </div>
            <button @click="toggleExpand(sub.id)" class="admin-icon-btn flex-shrink-0">
              <i
                :class="expandedId === sub.id ? 'fas fa-chevron-up' : 'fas fa-chevron-down'"
                class="text-[9px]"
              ></i>
            </button>
          </div>

          <div class="flex items-center gap-2">
            <div
              class="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
              style="background: linear-gradient(135deg, #f8005b 0%, #c7004a 100%)"
            >
              {{ getUserInitials(sub.userId) }}
            </div>
            <div class="min-w-0">
              <span class="wr-text-primary text-xs font-medium block truncate">{{
                getUserName(sub.userId)
              }}</span>
              <span
                v-if="getUserContact(sub)"
                class="wr-text-tertiary text-[10px] block truncate"
                >{{ getUserContact(sub) }}</span
              >
            </div>
          </div>

          <div
            v-if="getEpisodeTitle(sub.episodeId, sub.autowebinarId)"
            class="wr-text-tertiary text-[11px]"
          >
            <i class="fas fa-tv mr-1 text-[9px]"></i>
            {{ getEpisodeTitle(sub.episodeId, sub.autowebinarId) }}
          </div>

          <!-- Краткий обзор данных -->
          <div class="flex flex-wrap gap-1">
            <span
              v-for="(val, key) in getVisibleData(sub.data, 3)"
              :key="key"
              class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px]"
              style="background: var(--wr-btn-subtle-bg)"
            >
              <span class="wr-text-tertiary">{{ key }}:</span>
              <span class="wr-text-secondary truncate max-w-[120px]">{{ val }}</span>
            </span>
          </div>

          <!-- Развёрнутые данные -->
          <div
            v-if="expandedId === sub.id"
            class="pt-3 border-t space-y-2"
            style="border-color: var(--wr-border-light)"
          >
            <div v-for="(val, key) in sub.data" :key="key" class="flex gap-2 text-xs">
              <span class="wr-text-tertiary font-medium min-w-[80px] flex-shrink-0">{{
                getFieldLabel(sub.formId, key) || key
              }}</span>
              <span class="wr-text-primary break-all">{{ val }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Пагинация -->
      <div v-if="!loading && totalPages > 1" class="flex items-center justify-center gap-2 py-4">
        <button
          @click="
            currentPage--
            loadSubmissions()
          "
          :disabled="currentPage === 1"
          class="admin-btn-subtle px-3 py-2 rounded-lg text-xs sm:text-sm font-medium inline-flex items-center gap-1.5 transition"
        >
          <i class="fas fa-chevron-left text-xs"></i>
          <span class="hidden sm:inline">Назад</span>
        </button>

        <div class="flex items-center gap-1">
          <template v-for="page in getPageNumbers()" :key="page">
            <button
              v-if="page !== '...'"
              @click="
                currentPage = page
                loadSubmissions()
              "
              :class="{
                'admin-btn-primary': currentPage === page,
                'admin-btn-subtle': currentPage !== page
              }"
              class="w-8 h-8 sm:w-9 sm:h-9 rounded-lg text-xs sm:text-sm font-medium transition"
            >
              {{ page }}
            </button>
            <span v-else class="wr-text-tertiary text-xs px-1">...</span>
          </template>
        </div>

        <button
          @click="
            currentPage++
            loadSubmissions()
          "
          :disabled="currentPage === totalPages"
          class="admin-btn-subtle px-3 py-2 rounded-lg text-xs sm:text-sm font-medium inline-flex items-center gap-1.5 transition"
        >
          <span class="hidden sm:inline">Вперёд</span>
          <i class="fas fa-chevron-right text-xs"></i>
        </button>
      </div>

      <!-- Ошибка -->
      <div v-if="error" class="glass rounded-xl p-4 wr-status-red text-sm flex items-center gap-2">
        <i class="fas fa-exclamation-triangle"></i>
        {{ error }}
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { apiFormsAllRoute } from '../../api/forms-admin-routes'
import {
  apiFormSubmissionsRoute,
  apiFormSubmissionsExportRoute
} from '../../api/forms-submissions-routes'
import { apiEpisodesListRoute } from '../../api/episodes'
import { apiAutowebinarsListRoute } from '../../api/autowebinars'
import CustomSelect from '../../components/CustomSelect.vue'

const props = defineProps({
  indexUrl: String,
  mode: { type: String, default: 'episodes' } // 'episodes' | 'autowebinars'
})

const loading = ref(true)
const error = ref('')
const exporting = ref(false)
const expandedId = ref(null)

const filterFormId = ref('')
const filterEpisodeId = ref('')
const currentPage = ref(1)
const totalPages = ref(1)
const totalCount = ref(0)

const submissions = ref([])
const formsMap = ref({})
const episodesMap = ref({})
const autowebinarsMap = ref({})
const usersMap = ref({})

const episodes = ref([])
const autowebinars = ref([])
const forms = ref([])

const formSelectOptions = computed(() => forms.value.map((f) => ({ value: f.id, label: f.title })))

const episodeSelectOptions = computed(() => {
  if (props.mode === 'autowebinars') {
    return autowebinars.value.map((aw) => ({
      value: `autowebinar:${aw.id}`,
      label: aw.title
    }))
  } else {
    return episodes.value.map((ep) => ({
      value: `episode:${ep.id}`,
      label: `${ep.title} — ${formatDate(ep.scheduledDate)}`
    }))
  }
})

function clearFilters() {
  filterFormId.value = ''
  filterEpisodeId.value = ''
}

watch([filterFormId, filterEpisodeId], () => {
  currentPage.value = 1
  loadSubmissions()
})

async function loadSubmissions() {
  loading.value = true
  error.value = ''
  expandedId.value = null
  try {
    const query = { page: currentPage.value.toString(), mode: props.mode }
    if (filterFormId.value) query.formId = filterFormId.value

    if (filterEpisodeId.value) {
      const [type, id] = filterEpisodeId.value.split(':')
      if (type === 'episode') query.episodeId = id
      if (type === 'autowebinar') query.autowebinarId = id
    }

    console.log('[AdminSubmissionsPage] query:', query)
    const result = await apiFormSubmissionsRoute.query(query).run(ctx)
    console.log('[AdminSubmissionsPage] result:', result)
    submissions.value = result.submissions || []
    formsMap.value = result.formsMap || {}
    episodesMap.value = result.episodesMap || {}
    autowebinarsMap.value = result.autowebinarsMap || {}
    usersMap.value = result.usersMap || {}
    totalCount.value = result.totalCount || 0
    totalPages.value = result.totalPages || 1
  } catch (e) {
    error.value = e.message
    console.error('[AdminSubmissionsPage] error:', e)
  }
  loading.value = false
}

async function exportCsv() {
  exporting.value = true
  try {
    const query = { mode: props.mode }
    if (filterFormId.value) query.formId = filterFormId.value

    if (filterEpisodeId.value) {
      const [type, id] = filterEpisodeId.value.split(':')
      if (type === 'episode') query.episodeId = id
      if (type === 'autowebinar') query.autowebinarId = id
    }

    const url = apiFormSubmissionsExportRoute.query(query).url()
    window.open(url, '_blank')
  } catch (e) {
    error.value = e.message
  }
  exporting.value = false
}

function toggleExpand(id) {
  expandedId.value = expandedId.value === id ? null : id
}

function getFormTitle(formId) {
  return formsMap.value[formId]?.title || 'Неизвестная форма'
}

function getEpisodeTitle(episodeId, autowebinarId) {
  if (episodeId) {
    return episodesMap.value[episodeId]?.title || ''
  }
  if (autowebinarId) {
    return autowebinarsMap.value[autowebinarId]?.title || ''
  }
  return ''
}

function getUserName(userId) {
  if (!userId) return 'Аноним'
  const u = usersMap.value[userId]
  return u?.displayName || 'Пользователь'
}

function getUserInitials(userId) {
  const name = getUserName(userId)
  const parts = name.split(' ')
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function getUserContact(sub) {
  const u = sub.userId ? usersMap.value[sub.userId] : null
  if (u?.confirmedEmail) return u.confirmedEmail
  if (u?.confirmedPhone) return u.confirmedPhone
  if (sub.data?.email) return sub.data.email
  if (sub.data?.phone) return sub.data.phone
  return ''
}

function getFieldLabel(formId, key) {
  const form = formsMap.value[formId]
  if (!form?.fields) return null
  const field = form.fields.find((f) => f.id === key || f.label === key)
  return field?.label || null
}

function getVisibleData(data, maxItems = 4) {
  if (!data || typeof data !== 'object') return {}
  const entries = Object.entries(data)
  const limited = entries.slice(0, maxItems)
  return Object.fromEntries(limited)
}

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

function formatTime(d) {
  if (!d) return ''
  return new Date(d).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

function pluralSubmissions(n) {
  const abs = Math.abs(n) % 100
  const last = abs % 10
  if (abs > 10 && abs < 20) return 'ответов'
  if (last > 1 && last < 5) return 'ответа'
  if (last === 1) return 'ответ'
  return 'ответов'
}

function getPageNumbers() {
  const pages = []
  const maxVisible = 7 // максимум видимых кнопок

  if (totalPages.value <= maxVisible) {
    // Показываем все страницы
    for (let i = 1; i <= totalPages.value; i++) {
      pages.push(i)
    }
  } else {
    // Показываем с многоточиями
    if (currentPage.value <= 4) {
      // Начало списка
      for (let i = 1; i <= 5; i++) pages.push(i)
      pages.push('...')
      pages.push(totalPages.value)
    } else if (currentPage.value >= totalPages.value - 3) {
      // Конец списка
      pages.push(1)
      pages.push('...')
      for (let i = totalPages.value - 4; i <= totalPages.value; i++) pages.push(i)
    } else {
      // Середина
      pages.push(1)
      pages.push('...')
      for (let i = currentPage.value - 1; i <= currentPage.value + 1; i++) pages.push(i)
      pages.push('...')
      pages.push(totalPages.value)
    }
  }

  return pages
}

onMounted(async () => {
  // Загрузка только нужных данных в зависимости от mode
  try {
    const promises = [apiFormsAllRoute.run(ctx)]

    if (props.mode === 'autowebinars') {
      promises.push(apiAutowebinarsListRoute.run(ctx))
    } else {
      promises.push(apiEpisodesListRoute.run(ctx))
    }

    const [formsRes, listRes] = await Promise.all(promises)
    forms.value = formsRes || []

    if (props.mode === 'autowebinars') {
      autowebinars.value = listRes || []
    } else {
      episodes.value = listRes || []
    }
  } catch (e) {
    console.error('Failed to load data:', e)
  }

  // Инициализация фильтров из URL query параметров
  const urlParams = new URLSearchParams(window.location.search)
  const formIdFromUrl = urlParams.get('formId')
  const episodeIdFromUrl = urlParams.get('episodeId')
  const autowebinarIdFromUrl = urlParams.get('autowebinarId')

  if (formIdFromUrl && forms.value.some((f) => f.id === formIdFromUrl)) {
    filterFormId.value = formIdFromUrl
  }

  if (props.mode === 'episodes' && episodeIdFromUrl) {
    // Проверяем что эпизод существует
    if (episodes.value.some((ep) => ep.id === episodeIdFromUrl)) {
      filterEpisodeId.value = `episode:${episodeIdFromUrl}`
    }
  } else if (props.mode === 'autowebinars' && autowebinarIdFromUrl) {
    // Проверяем что автовебинар существует
    if (autowebinars.value.some((aw) => aw.id === autowebinarIdFromUrl)) {
      filterEpisodeId.value = `autowebinar:${autowebinarIdFromUrl}`
    }
  }

  loadSubmissions()
})
</script>

<style scoped>
.admin-icon-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: var(--wr-btn-subtle-bg);
  color: var(--wr-text-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s ease;
  border: none;
  flex-shrink: 0;
}
.admin-icon-btn:hover {
  background: var(--wr-btn-subtle-hover-bg);
  color: var(--wr-text-primary);
}
.admin-btn-subtle {
  background: var(--wr-btn-subtle-bg);
  color: var(--wr-text-secondary);
  border: 1px solid var(--wr-btn-subtle-border);
}
.admin-btn-subtle:hover:not(:disabled) {
  background: var(--wr-btn-subtle-hover-bg);
  color: var(--wr-text-primary);
}
.admin-btn-subtle:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.admin-btn-primary {
  background: var(--wr-primary);
  color: white;
  border: 1px solid transparent;
}
.admin-btn-primary:hover:not(:disabled) {
  background: var(--wr-primary-hover);
}
.hover-row:hover {
  background: var(--wr-hover-bg);
}
</style>
