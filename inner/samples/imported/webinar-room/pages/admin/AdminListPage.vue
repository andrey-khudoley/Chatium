<template>
  <div class="min-h-screen bg-dark">
    <header class="glass sticky top-0 z-30 border-b border-wr-border">
      <div class="px-4 sm:px-6 lg:px-8 py-4">
        <div class="flex items-center justify-between gap-3">
          <div>
            <h1 class="wr-text-primary font-bold text-xl">Эфиры</h1>
            <p class="wr-text-tertiary text-sm mt-0.5">Управление прямыми трансляциями</p>
          </div>
          <button
            @click="navigateToCreate"
            class="btn-primary text-white font-semibold px-5 py-2.5 rounded-xl inline-flex items-center gap-2"
          >
            <i class="fas fa-plus"></i>
            <span>Создать эфир</span>
          </button>
        </div>
      </div>
    </header>

    <main class="px-4 sm:px-6 lg:px-8 py-6">
      <div v-if="loading" class="text-center py-20">
        <div
          class="inline-block w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"
        ></div>
        <p class="wr-text-secondary">Загрузка эфиров...</p>
      </div>

      <div v-else-if="!localEpisodes.length" class="text-center py-20">
        <div class="w-20 h-20 rounded-2xl glass mx-auto mb-6 flex items-center justify-center">
          <i class="fas fa-video wr-text-tertiary text-3xl"></i>
        </div>
        <p class="wr-text-secondary text-lg mb-2">Эфиров пока нет</p>
        <p class="wr-text-muted text-sm mb-6">Создайте первый эфир, чтобы начать</p>
        <button
          @click="navigateToCreate"
          class="btn-primary text-white font-semibold px-6 py-3 rounded-xl inline-flex items-center gap-2"
        >
          <i class="fas fa-plus"></i> Создать эфир
        </button>
      </div>

      <div v-else class="space-y-4">
        <div
          v-for="ep in localEpisodes"
          :key="ep.id"
          class="glass rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-5 card-hover"
        >
          <div class="flex flex-col gap-3 sm:gap-4">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 sm:gap-3 mb-2 flex-wrap">
                <span
                  :class="statusBadgeClass(ep.status)"
                  class="px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold uppercase tracking-wider"
                >
                  {{ statusLabel(ep.status) }}
                </span>
              </div>
              <h3 class="wr-text-primary font-semibold text-base sm:text-lg line-clamp-1">
                {{ ep.title }}
              </h3>
              <p class="wr-text-secondary text-xs sm:text-sm mt-1">
                <i class="far fa-calendar-alt mr-1"></i>
                {{ formatDate(ep.scheduledDate) }}
              </p>
              <p
                v-if="ep.description"
                class="wr-text-tertiary text-xs sm:text-sm mt-1 line-clamp-2"
              >
                {{ ep.description }}
              </p>
            </div>

            <div class="flex items-center gap-2 flex-wrap">
              <template v-if="ep.status === 'scheduled'">
                <button
                  @click="openRoom(ep)"
                  :disabled="actionLoading === ep.id"
                  class="wr-btn-yellow px-3 py-2 sm:px-4 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition flex items-center gap-1.5 sm:gap-2 min-h-[40px] sm:min-h-0"
                >
                  <i class="fas fa-door-open text-[10px] sm:text-xs"></i>
                  <span class="whitespace-nowrap">Открыть комнату</span>
                </button>
              </template>
              <template v-if="ep.status === 'waiting_room'">
                <button
                  @click="startEpisode(ep)"
                  :disabled="actionLoading === ep.id"
                  class="wr-btn-green px-3 py-2 sm:px-4 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition flex items-center gap-1.5 sm:gap-2 min-h-[40px] sm:min-h-0"
                >
                  <i class="fas fa-play text-[10px] sm:text-xs"></i>
                  <span class="whitespace-nowrap">Начать стрим</span>
                </button>
              </template>
              <template v-if="ep.status === 'live'">
                <button
                  @click="finishEpisode(ep)"
                  :disabled="actionLoading === ep.id"
                  class="wr-btn-red px-3 py-2 sm:px-4 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition flex items-center gap-1.5 sm:gap-2 min-h-[40px] sm:min-h-0"
                >
                  <i class="fas fa-stop text-[10px] sm:text-xs"></i>
                  <span>Завершить</span>
                </button>
              </template>

              <a
                :href="episodeUrl(ep.id)"
                class="admin-btn-subtle px-3 py-2 sm:px-4 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition flex items-center gap-1.5 sm:gap-2 min-h-[40px] sm:min-h-0"
                title="Перейти на страницу эфира"
              >
                <i class="fas fa-eye text-[10px] sm:text-xs"></i>
                <span class="hidden xs:inline">Смотреть</span>
              </a>
              <button
                @click="navigateToEdit(ep.id)"
                class="admin-btn-subtle px-3 py-2 sm:px-4 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition flex items-center gap-1.5 sm:gap-2 min-h-[40px] sm:min-h-0"
              >
                <i class="fas fa-pen text-[10px] sm:text-xs"></i>
                <span class="hidden xs:inline">Изменить</span>
              </button>
              <button
                @click="deleteEpisode(ep)"
                :disabled="actionLoading === ep.id"
                class="admin-btn-subtle hover:!bg-red-600/20 hover:!text-red-400 px-3 py-2 sm:px-4 rounded-lg sm:rounded-xl text-xs sm:text-sm transition min-h-[40px] sm:min-h-0"
              >
                <i class="fas fa-trash text-[10px] sm:text-xs"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import {
  apiEpisodeStartRoute,
  apiEpisodeFinishRoute,
  apiEpisodeDeleteRoute,
  apiEpisodeOpenRoomRoute,
  apiEpisodesListRoute
} from '../../api/episodes'
import { episodePageRoute } from '../../episode'

const props = defineProps({
  indexUrl: String
})

const localEpisodes = ref([])
const loading = ref(true)
const actionLoading = ref(null)

function editUrl(id) {
  navigateToEdit(id)
  return 'javascript:void(0)'
}

function navigateToEdit(episodeId) {
  window.dispatchEvent(
    new CustomEvent('admin-navigate', { detail: { section: 'episodes', episodeId } })
  )
}

function navigateToCreate() {
  window.dispatchEvent(new CustomEvent('admin-navigate', { detail: { section: 'create' } }))
}

function episodeUrl(id) {
  return episodePageRoute({ id }).url()
}

function statusLabel(status) {
  const map = {
    scheduled: 'Запланирован',
    waiting_room: 'Комната открыта',
    live: 'В эфире',
    finished: 'Завершён'
  }
  return map[status] || status
}

function statusBadgeClass(status) {
  const map = {
    scheduled: 'wr-badge-blue wr-status-blue',
    waiting_room: 'wr-badge-yellow wr-status-yellow animate-pulse',
    live: 'wr-badge-green wr-status-green animate-pulse',
    finished: 'wr-badge-gray wr-status-gray'
  }
  return map[status] || 'wr-badge-gray wr-status-gray'
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

async function openRoom(ep) {
  if (!confirm(`Открыть комнату для "${ep.title}"? Зрители смогут зайти и общаться в чате.`)) return
  actionLoading.value = ep.id
  try {
    const updated = await apiEpisodeOpenRoomRoute({ id: ep.id }).run(ctx)
    const idx = localEpisodes.value.findIndex((e) => e.id === ep.id)
    if (idx >= 0) localEpisodes.value[idx] = { ...localEpisodes.value[idx], ...updated }
  } catch (e) {
    alert(e.message)
  }
  actionLoading.value = null
}

async function startEpisode(ep) {
  if (!confirm(`Начать стрим "${ep.title}"?`)) return
  actionLoading.value = ep.id
  try {
    const updated = await apiEpisodeStartRoute({ id: ep.id }).run(ctx)
    const idx = localEpisodes.value.findIndex((e) => e.id === ep.id)
    if (idx >= 0) localEpisodes.value[idx] = { ...localEpisodes.value[idx], ...updated }
  } catch (e) {
    alert(e.message)
  }
  actionLoading.value = null
}

async function finishEpisode(ep) {
  if (!confirm(`Завершить эфир "${ep.title}"?`)) return
  actionLoading.value = ep.id
  try {
    const updated = await apiEpisodeFinishRoute({ id: ep.id }).run(ctx, {})
    const idx = localEpisodes.value.findIndex((e) => e.id === ep.id)
    if (idx >= 0) localEpisodes.value[idx] = { ...localEpisodes.value[idx], ...updated }
  } catch (e) {
    alert(e.message)
  }
  actionLoading.value = null
}

async function deleteEpisode(ep) {
  if (!confirm(`Удалить эфир "${ep.title}"? Это действие необратимо.`)) return
  actionLoading.value = ep.id
  try {
    await apiEpisodeDeleteRoute({ id: ep.id }).run(ctx)
    localEpisodes.value = localEpisodes.value.filter((e) => e.id !== ep.id)
  } catch (e) {
    alert(e.message)
  }
  actionLoading.value = null
}

async function loadEpisodes() {
  loading.value = true
  try {
    const episodes = await apiEpisodesListRoute.run(ctx)
    localEpisodes.value = episodes
  } catch (e) {
    console.error('Failed to load episodes:', e)
    alert('Не удалось загрузить эфиры')
  }
  loading.value = false
}

onMounted(() => {
  loadEpisodes()
})
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
.hover\:\!bg-red-600\/20:hover {
  background: rgba(220, 38, 38, 0.2) !important;
}
.theme-light .hover\:\!bg-red-600\/20:hover {
  background: rgba(185, 28, 28, 0.12) !important;
}
.theme-dark .hover\:\!text-red-400:hover {
  color: #f87171 !important;
}
.theme-light .hover\:\!text-red-400:hover {
  color: #b91c1c !important;
}
</style>
