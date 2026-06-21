<template>
  <div class="min-h-screen bg-dark flex">
    <!-- Mobile overlay -->
    <Transition name="overlay-fade">
      <div
        v-if="mobileMenuOpen"
        class="fixed inset-0 z-[60] lg:hidden"
        style="background: rgba(0, 0, 0, 0.5); backdrop-filter: blur(2px)"
        @click="mobileMenuOpen = false"
      ></div>
    </Transition>

    <!-- Сайдбар -->
    <aside
      :class="[
        'w-64 bg-dark-card border-r border-wr-border flex flex-col fixed left-0 top-0 bottom-0 z-[70] transition-transform duration-300',
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      ]"
    >
      <!-- Логотип -->
      <div class="p-6 border-b border-wr-border">
        <div class="flex items-center gap-3">
          <div
            class="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center flex-shrink-0"
          >
            <i class="fas fa-tv text-white"></i>
          </div>
          <div class="flex-1 min-w-0">
            <h1 class="wr-text-primary font-bold text-lg">Админ</h1>
            <p class="wr-text-tertiary text-xs">Моя вебинарная комната</p>
          </div>
          <button
            @click="toggleTheme()"
            class="w-8 h-8 rounded-lg flex items-center justify-center wr-text-tertiary hover:wr-text-primary transition flex-shrink-0"
            style="background: var(--wr-btn-subtle-bg)"
            :title="currentTheme === 'dark' ? 'Светлая тема' : 'Тёмная тема'"
          >
            <i v-if="currentTheme === 'dark'" class="fas fa-sun"></i>
            <i v-else class="fas fa-moon"></i>
          </button>
          <button
            @click="mobileMenuOpen = false"
            class="lg:hidden w-8 h-8 rounded-lg flex items-center justify-center wr-text-tertiary hover:wr-text-primary transition flex-shrink-0"
          >
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>

      <!-- Навигация -->
      <nav class="flex-1 p-4 space-y-1 overflow-y-auto">
        <!-- Основные табы -->
        <div class="mb-3">
          <div class="flex rounded-lg overflow-hidden border border-wr-border">
            <button
              @click="switchTab('episodes')"
              :class="[
                'flex-1 px-3 py-2 text-xs font-semibold transition',
                mainTab === 'episodes'
                  ? 'bg-gradient-primary text-white'
                  : 'wr-text-secondary hover:wr-text-primary'
              ]"
            >
              <i class="fas fa-tv mr-1"></i> Эфиры
            </button>
            <button
              @click="switchTab('autowebinars')"
              :class="[
                'flex-1 px-3 py-2 text-xs font-semibold transition',
                mainTab === 'autowebinars'
                  ? 'bg-gradient-primary text-white'
                  : 'wr-text-secondary hover:wr-text-primary'
              ]"
            >
              <i class="fas fa-robot mr-1"></i> Автовеб
            </button>
          </div>
        </div>

        <button
          v-for="item in filteredMenuItems"
          :key="item.id"
          @click="
            navigate(item.id)
            mobileMenuOpen = false
          "
          :class="[
            'w-full flex items-center gap-3 px-4 py-3 rounded-lg transition',
            currentSection === item.id
              ? 'bg-gradient-primary text-white'
              : 'wr-text-secondary hover:bg-wr-input-bg hover:wr-text-primary'
          ]"
        >
          <i :class="item.icon" class="text-base w-5"></i>
          <span class="font-medium text-sm">{{ item.label }}</span>
          <span
            v-if="item.badge"
            class="ml-auto text-xs px-2 py-0.5 rounded-full"
            :class="currentSection === item.id ? 'bg-white/20' : 'bg-wr-input-bg'"
          >
            {{ item.badge }}
          </span>
        </button>
      </nav>
    </aside>

    <!-- Основной контент -->
    <main class="flex-1 lg:ml-64 min-w-0 relative">
      <!-- Mobile header -->
      <div class="lg:hidden sticky top-0 z-30 glass border-b border-wr-border">
        <div class="flex items-center gap-3 px-4 py-3">
          <button
            @click="mobileMenuOpen = true"
            class="w-10 h-10 rounded-lg flex items-center justify-center wr-text-secondary hover:wr-text-primary transition flex-shrink-0"
            style="background: var(--wr-btn-subtle-bg)"
          >
            <i class="fas fa-bars"></i>
          </button>
          <div class="flex-1 min-w-0">
            <h1 class="wr-text-primary font-bold text-base truncate">{{ currentLabel }}</h1>
          </div>
          <button
            @click="toggleTheme()"
            class="w-10 h-10 rounded-lg flex items-center justify-center wr-text-secondary hover:wr-text-primary transition flex-shrink-0"
            style="background: var(--wr-btn-subtle-bg)"
            :title="currentTheme === 'dark' ? 'Светлая тема' : 'Тёмная тема'"
          >
            <i v-if="currentTheme === 'dark'" class="fas fa-sun"></i>
            <i v-else class="fas fa-moon"></i>
          </button>
        </div>
      </div>

      <component
        :is="currentComponent"
        :key="currentSection + (episodeId || '') + (autowebinarId || '')"
        v-bind="componentProps"
      />
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import AdminListPage from './AdminListPage.vue'
import AdminCreatePage from './AdminCreatePage.vue'
import AdminEditPage from './AdminEditPage.vue'
import AdminFormsPage from './AdminFormsPage.vue'
import AdminSubmissionsPage from './AdminSubmissionsPage.vue'
import AdminAnalyticsPage from './AdminAnalyticsPage.vue'
import AdminAutowebinarListPage from './AdminAutowebinarListPage.vue'
import AdminAutowebinarCreatePage from './AdminAutowebinarCreatePage.vue'
import AdminAutowebinarEditPage from './AdminAutowebinarEditPage.vue'
import { currentTheme, initThemeWatcher, toggleTheme } from '../../shared/theme'

const props = defineProps({
  initialSection: { type: String, default: 'episodes' },
  episodeId: String,
  indexUrl: String
})

const currentSection = ref(props.initialSection)
const episodeId = ref(props.episodeId)
const autowebinarId = ref(null)
const mobileMenuOpen = ref(false)

const mainTab = ref(
  ['autowebinars', 'aw-create', 'aw-edit', 'aw-analytics'].includes(props.initialSection)
    ? 'autowebinars'
    : 'episodes'
)

const episodeMenuItems = [
  { id: 'episodes', label: 'Эфиры', icon: 'fas fa-tv' },
  { id: 'forms', label: 'Формы', icon: 'fas fa-clipboard-list' },
  { id: 'submissions', label: 'Ответы', icon: 'fas fa-inbox' },
  { id: 'analytics', label: 'Аналитика', icon: 'fas fa-chart-line' }
]

const autowebinarMenuItems = [
  { id: 'autowebinars', label: 'Автовебинары', icon: 'fas fa-robot' },
  { id: 'forms', label: 'Формы', icon: 'fas fa-clipboard-list' },
  { id: 'submissions', label: 'Ответы', icon: 'fas fa-inbox' },
  { id: 'aw-analytics', label: 'Аналитика', icon: 'fas fa-chart-line' }
]

const filteredMenuItems = computed(() => {
  return mainTab.value === 'autowebinars' ? autowebinarMenuItems : episodeMenuItems
})

const currentLabel = computed(() => {
  if (episodeId.value && currentSection.value === 'episodes') return 'Редактирование'
  if (currentSection.value === 'create') return 'Создание эфира'
  if (currentSection.value === 'aw-create') return 'Создание автовебинара'
  if (autowebinarId.value && currentSection.value === 'autowebinars')
    return 'Редактирование автовебинара'
  const allItems = [...episodeMenuItems, ...autowebinarMenuItems]
  const item = allItems.find((i) => i.id === currentSection.value)
  return item?.label || 'Админка'
})

const components = {
  episodes: AdminListPage,
  create: AdminCreatePage,
  edit: AdminEditPage,
  forms: AdminFormsPage,
  submissions: AdminSubmissionsPage,
  analytics: AdminAnalyticsPage,
  autowebinars: AdminAutowebinarListPage,
  'aw-create': AdminAutowebinarCreatePage,
  'aw-edit': AdminAutowebinarEditPage,
  'aw-analytics': AdminAnalyticsPage
}

const currentComponent = computed(() => {
  if (episodeId.value && currentSection.value === 'episodes') {
    return components.edit
  }
  if (autowebinarId.value && currentSection.value === 'autowebinars') {
    return components['aw-edit']
  }
  return components[currentSection.value] || components.episodes
})

const componentProps = computed(() => {
  const base = { indexUrl: props.indexUrl }

  if (episodeId.value && currentSection.value === 'episodes') {
    return { ...base, episodeId: episodeId.value }
  }

  if (autowebinarId.value && currentSection.value === 'autowebinars') {
    return { ...base, autowebinarId: autowebinarId.value }
  }

  // Аналитика автовебинаров
  if (currentSection.value === 'aw-analytics') {
    return { ...base, mode: 'autowebinars' }
  }

  // Ответы на формы: передаём mode в зависимости от текущего таба
  if (currentSection.value === 'submissions') {
    return { ...base, mode: mainTab.value === 'autowebinars' ? 'autowebinars' : 'episodes' }
  }

  return base
})

function switchTab(tab) {
  mainTab.value = tab

  // Очищаем query параметры другого типа при переключении табов
  const url = new URL(window.location.href)
  if (tab === 'episodes') {
    // Переключились на эфиры → очищаем параметры автовебинаров
    url.searchParams.delete('aw')
    url.searchParams.delete('autowebinarId')
    autowebinarId.value = null
    // Переходим на список эфиров если были в секции автовебинаров
    const targetSection = ['autowebinars', 'aw-create', 'aw-edit', 'aw-analytics'].includes(
      currentSection.value
    )
      ? 'episodes'
      : currentSection.value
    navigate(targetSection)
  } else {
    // Переключились на автовебинары → очищаем параметры эфиров
    url.searchParams.delete('episode')
    url.searchParams.delete('episodeId')
    episodeId.value = null
    navigate('autowebinars')
  }
}

function navigate(sectionId) {
  if (sectionId === 'episodes' && episodeId.value) {
    episodeId.value = null
  }
  if (sectionId === 'autowebinars' && autowebinarId.value) {
    autowebinarId.value = null
  }

  currentSection.value = sectionId

  const url = new URL(window.location.href)
  url.searchParams.set('section', sectionId)
  if (episodeId.value && sectionId === 'episodes') {
    url.searchParams.set('episode', episodeId.value)
  } else {
    url.searchParams.delete('episode')
  }
  if (autowebinarId.value && sectionId === 'autowebinars') {
    url.searchParams.set('aw', autowebinarId.value)
  } else {
    url.searchParams.delete('aw')
  }
  window.history.pushState({}, '', url.toString())
}

onMounted(() => {
  initThemeWatcher()

  // Проверяем URL на наличие autowebinar ID
  const urlParams = new URLSearchParams(window.location.search)
  const awParam = urlParams.get('aw')
  if (awParam) {
    autowebinarId.value = awParam
    currentSection.value = 'autowebinars'
    mainTab.value = 'autowebinars'
  }

  window.addEventListener('admin-navigate', (e) => {
    if (e.detail.section) {
      currentSection.value = e.detail.section
    }
    if (e.detail.episodeId !== undefined) {
      episodeId.value = e.detail.episodeId
    }
    if (e.detail.autowebinarId !== undefined) {
      autowebinarId.value = e.detail.autowebinarId
    }
    if (e.detail.mainTab) {
      mainTab.value = e.detail.mainTab
    }

    const url = new URL(window.location.href)
    url.searchParams.set('section', currentSection.value)
    if (episodeId.value) {
      url.searchParams.set('episode', episodeId.value)
    } else {
      url.searchParams.delete('episode')
    }
    if (autowebinarId.value) {
      url.searchParams.set('aw', autowebinarId.value)
    } else {
      url.searchParams.delete('aw')
    }
    window.history.pushState({}, '', url.toString())
  })
})
</script>

<style scoped>
.overlay-fade-enter-active,
.overlay-fade-leave-active {
  transition: opacity 0.25s ease;
}
.overlay-fade-enter-from,
.overlay-fade-leave-to {
  opacity: 0;
}

.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-from .glass,
.modal-leave-to .glass {
  transform: scale(0.95) translateY(10px);
}
</style>
