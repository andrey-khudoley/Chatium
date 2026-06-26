<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { DiagnosticsItem, DiagnosticsDetailItem } from '../shared/types'
import DiagnosticsList from '../components/admin/DiagnosticsList.vue'
import DiagnosticsFilters from '../components/admin/DiagnosticsFilters.vue'
import DiagnosticsDetail from '../components/admin/DiagnosticsDetail.vue'
import DiagnosticsToggle from '../components/admin/DiagnosticsToggle.vue'
import { getAdminDiagnosticsListRoute } from '../api/admin/diagnostics/list'
import { getAdminDiagnosticsGetRoute } from '../api/admin/diagnostics/get'
import { postAdminDiagnosticsDeleteRoute } from '../api/admin/diagnostics/delete'
import { getAdminSettingsGetRoute } from '../api/admin/settings/get'
import { postAdminSettingsSaveRoute } from '../api/admin/settings/save'

declare const ctx: app.Ctx

const props = defineProps<{
  adminUrl: string
  indexUrl: string
  projectTitle: string
  isAdmin: boolean
}>()

const rows = ref<DiagnosticsItem[]>([])
const total = ref(0)
const limit = ref(20)
const offset = ref(0)
const loading = ref(false)
const filters = ref<{ visitorId: string; ip: string; url: string }>({
  visitorId: '',
  ip: '',
  url: ''
})
const selectedRow = ref<DiagnosticsDetailItem | null>(null)
const diagnosticsEnabled = ref(true)

async function loadPage() {
  loading.value = true
  try {
    const queryParams: Record<string, string | undefined> = {
      limit: String(limit.value),
      offset: String(offset.value),
      visitorId: filters.value.visitorId || undefined,
      ip: filters.value.ip || undefined,
      url: filters.value.url || undefined
    }

    const res = await getAdminDiagnosticsListRoute.query(queryParams).run(ctx)
    const data = res as { success?: boolean; rows?: any[]; total?: number }
    if (data?.success) {
      rows.value = data.rows ?? []
      total.value = data.total ?? 0
    }
  } catch (e) {
    ctx.account.log('[AdminPage] loadPage error', { level: 'error', json: { error: String(e) } })
  } finally {
    loading.value = false
  }
}

async function loadRow(id: string) {
  try {
    const res = await getAdminDiagnosticsGetRoute.query({ id }).run(ctx)
    const data = res as { success?: boolean; row?: any }
    if (data?.success && data.row) {
      selectedRow.value = data.row
    }
  } catch (e) {
    ctx.account.log('[AdminPage] loadRow error', { level: 'error', json: { error: String(e) } })
  }
}

async function deleteRow(id: string) {
  try {
    const res = await postAdminDiagnosticsDeleteRoute.run(ctx, { id })
    const data = res as { success?: boolean }
    if (data?.success) {
      selectedRow.value = null
      loadPage()
    }
  } catch (e) {
    ctx.account.log('[AdminPage] deleteRow error', { level: 'error', json: { error: String(e) } })
  }
}

async function loadToggle() {
  try {
    const res = await getAdminSettingsGetRoute.query({ key: 'diagnostics_enabled' }).run(ctx)
    const data = res as { success?: boolean; value?: unknown }
    if (data?.success) {
      diagnosticsEnabled.value = data.value !== false
    }
  } catch (e) {
    ctx.account.log('[AdminPage] loadToggle error', { level: 'error', json: { error: String(e) } })
  }
}

async function saveToggle(val: boolean) {
  try {
    const res = await postAdminSettingsSaveRoute.run(ctx, {
      key: 'diagnostics_enabled',
      value: val
    })
    const data = res as { success?: boolean; value?: unknown }
    if (data?.success) {
      diagnosticsEnabled.value = data.value !== false
    }
  } catch (e) {
    ctx.account.log('[AdminPage] saveToggle error', { level: 'error', json: { error: String(e) } })
  }
}

function applyFilters(f: { visitorId: string; ip: string; url: string }) {
  filters.value = f
  offset.value = 0
  loadPage()
}

function resetFilters() {
  filters.value = { visitorId: '', ip: '', url: '' }
  offset.value = 0
  loadPage()
}

function prevPage() {
  if (offset.value > 0) {
    offset.value = Math.max(0, offset.value - limit.value)
    loadPage()
  }
}

function nextPage() {
  if (offset.value + limit.value < total.value) {
    offset.value = offset.value + limit.value
    loadPage()
  }
}

onMounted(() => {
  loadPage()
  loadToggle()
})
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-7xl mx-auto px-4 py-6">
      <!-- Заголовок -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">{{ props.projectTitle }}</h1>
          <a :href="props.indexUrl" class="text-sm text-blue-600 hover:text-blue-800">На главную</a>
        </div>
        <DiagnosticsToggle :enabled="diagnosticsEnabled" @toggle="saveToggle" />
      </div>

      <!-- Фильтры -->
      <DiagnosticsFilters @filter="applyFilters" @reset="resetFilters" />

      <!-- Список -->
      <DiagnosticsList
        :rows="rows"
        :total="total"
        :limit="limit"
        :offset="offset"
        :loading="loading"
        @select-row="loadRow"
        @prev-page="prevPage"
        @next-page="nextPage"
      />

      <!-- Детали записи -->
      <DiagnosticsDetail
        v-if="selectedRow"
        :row="selectedRow"
        @close="selectedRow = null"
        @delete="deleteRow"
      />
    </div>
  </div>
</template>
