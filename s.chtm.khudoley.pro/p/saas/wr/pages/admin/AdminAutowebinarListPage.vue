<template>
  <div class="min-h-screen bg-dark">
    <header class="glass sticky top-0 z-30 border-b border-wr-border">
      <div class="px-4 sm:px-6 lg:px-8 py-4">
        <div class="flex items-center justify-between gap-3">
          <div>
            <h1 class="wr-text-primary font-bold text-xl">Автовебинары</h1>
            <p class="wr-text-tertiary text-sm mt-0.5">Воспроизведение записанных эфиров</p>
          </div>
          <div class="flex items-center gap-2">
            <button
              @click="navigateToCreate"
              class="btn-primary text-white font-semibold px-5 py-2.5 rounded-xl inline-flex items-center gap-2"
            >
              <i class="fas fa-plus"></i>
              <span>Создать</span>
            </button>
          </div>
        </div>
      </div>
    </header>

    <main class="px-4 sm:px-6 lg:px-8 py-6">
      <!-- Фильтры -->
      <div class="flex gap-2 mb-4 flex-wrap">
        <button
          v-for="f in statusFilters"
          :key="f.value"
          @click="statusFilter = f.value"
          :class="[
            'px-3 py-1.5 rounded-lg text-xs font-medium transition border',
            statusFilter === f.value
              ? 'bg-gradient-primary text-white border-transparent'
              : 'border-wr-border wr-text-secondary hover:wr-text-primary'
          ]"
        >
          {{ f.label }}
        </button>
      </div>

      <div v-if="loading" class="text-center py-20">
        <div
          class="inline-block w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"
        ></div>
        <p class="wr-text-secondary">Загрузка...</p>
      </div>

      <div v-else-if="!filteredList.length" class="text-center py-20">
        <div class="w-20 h-20 rounded-2xl glass mx-auto mb-6 flex items-center justify-center">
          <i class="fas fa-robot wr-text-tertiary text-3xl"></i>
        </div>
        <p class="wr-text-secondary text-lg mb-2">Автовебинаров пока нет</p>
        <p class="wr-text-muted text-sm mb-6">Создайте первый автовебинар</p>
        <button
          @click="navigateToCreate"
          class="btn-primary text-white font-semibold px-6 py-3 rounded-xl inline-flex items-center gap-2"
        >
          <i class="fas fa-plus"></i> Создать
        </button>
      </div>

      <div v-else class="space-y-4">
        <div
          v-for="aw in filteredList"
          :key="aw.id"
          class="glass rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-5 card-hover"
        >
          <div class="flex flex-col gap-3 sm:gap-4">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 sm:gap-3 mb-2 flex-wrap">
                <span
                  :class="statusBadgeClass(aw.status)"
                  class="px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold uppercase tracking-wider"
                >
                  {{ statusLabel(aw.status) }}
                </span>
                <span
                  v-if="aw.subtitlesStatus === 'processing'"
                  class="px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold uppercase tracking-wider bg-primary/20 text-primary border border-primary/50"
                  title="Обработка видео"
                >
                  <i class="fas fa-spinner fa-spin mr-1"></i> Обработка
                </span>
                <span
                  v-if="aw.muuveeError"
                  class="px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold uppercase tracking-wider bg-danger/20 text-danger border border-danger/50"
                  title="Ошибка обработки видео"
                >
                  <i class="fas fa-exclamation-triangle mr-1"></i> Ошибка
                </span>
              </div>
              <h3 class="wr-text-primary font-semibold text-base sm:text-lg line-clamp-1">
                {{ aw.title }}
              </h3>
              <p class="wr-text-tertiary text-xs sm:text-sm mt-1">
                <i class="fas fa-clock mr-1"></i> {{ formatDuration(aw.duration) }}
              </p>
              <p
                v-if="aw.description"
                class="wr-text-tertiary text-xs sm:text-sm mt-1 line-clamp-2"
              >
                {{ aw.description }}
              </p>
            </div>

            <div class="flex items-center gap-2 flex-wrap">
              <button
                v-if="aw.status === 'draft'"
                @click="activateAw(aw)"
                :disabled="actionLoading === aw.id"
                class="wr-btn-green px-3 py-2 rounded-lg text-xs font-medium transition flex items-center gap-1.5 min-h-[40px]"
              >
                <i class="fas fa-play text-[10px]"></i> Активировать
              </button>
              <button
                v-if="aw.status === 'active'"
                @click="archiveAw(aw)"
                :disabled="actionLoading === aw.id"
                class="wr-btn-yellow px-3 py-2 rounded-lg text-xs font-medium transition flex items-center gap-1.5 min-h-[40px]"
              >
                <i class="fas fa-archive text-[10px]"></i> Архивировать
              </button>
              <button
                v-if="aw.status === 'archived'"
                @click="restoreAw(aw)"
                :disabled="actionLoading === aw.id"
                class="admin-btn-subtle px-3 py-2 rounded-lg text-xs font-medium transition flex items-center gap-1.5 min-h-[40px]"
              >
                <i class="fas fa-undo text-[10px]"></i> Восстановить
              </button>
              <button
                @click="navigateToEdit(aw.id)"
                class="admin-btn-subtle px-3 py-2 rounded-lg text-xs font-medium transition flex items-center gap-1.5 min-h-[40px]"
              >
                <i class="fas fa-pen text-[10px]"></i>
                <span class="hidden xs:inline">Изменить</span>
              </button>
              <button
                @click="deleteAw(aw)"
                :disabled="actionLoading === aw.id"
                class="admin-btn-subtle hover:!bg-red-600/20 hover:!text-red-400 px-3 py-2 rounded-lg text-xs transition min-h-[40px]"
              >
                <i class="fas fa-trash text-[10px]"></i>
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
  apiAutowebinarsListRoute,
  apiAutowebinarDeleteRoute,
  apiAutowebinarActivateRoute,
  apiAutowebinarArchiveRoute,
  apiAutowebinarRestoreRoute
} from '../../api/autowebinars'

const list = ref([])
const loading = ref(true)
const actionLoading = ref(null)
const statusFilter = ref('')

const statusFilters = [
  { label: 'Все', value: '' },
  { label: 'Черновики', value: 'draft' },
  { label: 'Активные', value: 'active' },
  { label: 'Архив', value: 'archived' }
]

const filteredList = computed(() => {
  if (!statusFilter.value) return list.value
  return list.value.filter((aw) => aw.status === statusFilter.value)
})

function statusLabel(status) {
  const map = { draft: 'Черновик', active: 'Активен', archived: 'Архив' }
  return map[status] || status
}

function statusBadgeClass(status) {
  const map = {
    draft: 'wr-badge-gray wr-status-gray',
    active: 'wr-badge-green wr-status-green',
    archived: 'wr-badge-yellow wr-status-yellow'
  }
  return map[status] || 'wr-badge-gray wr-status-gray'
}

function formatDuration(seconds) {
  if (!seconds) return '—'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}ч ${m}м`
  return `${m}м ${s}с`
}

function navigateToCreate() {
  window.dispatchEvent(
    new CustomEvent('admin-navigate', { detail: { section: 'aw-create', mainTab: 'autowebinars' } })
  )
}

function navigateToEdit(awId) {
  window.dispatchEvent(
    new CustomEvent('admin-navigate', {
      detail: { section: 'autowebinars', autowebinarId: awId, mainTab: 'autowebinars' }
    })
  )
}

async function activateAw(aw) {
  if (!confirm(`Активировать "${aw.title}"?`)) return
  actionLoading.value = aw.id
  try {
    const updated = await apiAutowebinarActivateRoute({ id: aw.id }).run(ctx)
    const idx = list.value.findIndex((a) => a.id === aw.id)
    if (idx >= 0) list.value[idx] = { ...list.value[idx], ...updated }
  } catch (e) {
    alert(e.message)
  }
  actionLoading.value = null
}

async function archiveAw(aw) {
  if (!confirm(`Архивировать "${aw.title}"?`)) return
  actionLoading.value = aw.id
  try {
    const updated = await apiAutowebinarArchiveRoute({ id: aw.id }).run(ctx)
    const idx = list.value.findIndex((a) => a.id === aw.id)
    if (idx >= 0) list.value[idx] = { ...list.value[idx], ...updated }
  } catch (e) {
    alert(e.message)
  }
  actionLoading.value = null
}

async function restoreAw(aw) {
  if (!confirm(`Восстановить "${aw.title}"?`)) return
  actionLoading.value = aw.id
  try {
    const updated = await apiAutowebinarRestoreRoute({ id: aw.id }).run(ctx)
    const idx = list.value.findIndex((a) => a.id === aw.id)
    if (idx >= 0) list.value[idx] = { ...list.value[idx], ...updated }
  } catch (e) {
    alert(e.message)
  }
  actionLoading.value = null
}

async function deleteAw(aw) {
  if (!confirm(`Удалить "${aw.title}"? Это действие необратимо.`)) return
  actionLoading.value = aw.id
  try {
    await apiAutowebinarDeleteRoute({ id: aw.id }).run(ctx)
    list.value = list.value.filter((a) => a.id !== aw.id)
  } catch (e) {
    alert(e.message)
  }
  actionLoading.value = null
}

async function loadList() {
  loading.value = true
  try {
    list.value = await apiAutowebinarsListRoute.run(ctx)
  } catch (e) {
    console.error('Failed to load autowebinars:', e)
  }
  loading.value = false
}

onMounted(() => {
  loadList()
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
</style>
