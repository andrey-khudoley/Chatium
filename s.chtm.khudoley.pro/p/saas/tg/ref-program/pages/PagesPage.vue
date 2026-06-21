<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import PageForm from '../components/Forms/PageForm.vue'
import ConfirmModal from '../components/Modals/ConfirmModal.vue'
import WebhookInfoModal from '../components/Modals/WebhookInfoModal.vue'

const props = defineProps<{
  campaignId: string
  campaignTitle: string
  indexUrl: string
}>()

function getApiBaseUrl(): string {
  const u = props.indexUrl
  if (typeof window === 'undefined') return ''
  if (u.startsWith('http')) {
    try {
      const url = new URL(u)
      return url.origin + url.pathname.replace(/\/$/, '')
    } catch {
      return window.location.origin + (u.startsWith('/') ? u : '/' + u).replace(/\/$/, '')
    }
  }
  return window.location.origin + (u.startsWith('/') ? u : '/' + u).replace(/\/$/, '')
}

interface PageRow {
  id: string
  title?: string
  urlTemplate?: string
  webhookSecret?: string
  createdAt?: string
  updatedAt?: string
}

interface LinkRow {
  id: string
  pageId: string
  partnerId: string
  publicSlug: string
  pageTitle: string
  partnerName: string
  fullUrl: string
}

const pages = ref<PageRow[]>([])
const links = ref<LinkRow[]>([])
const loading = ref(true)
const linksLoading = ref(true)
const error = ref('')
const showForm = ref(false)
const editingPage = ref<PageRow | null>(null)
const deleteTarget = ref<PageRow | null>(null)
const webhookModalPage = ref<PageRow | null>(null)

async function loadPages() {
  const base = getApiBaseUrl().replace(/\/$/, '')
  try {
    const res = await fetch(
      `${base}/api/pages/list?campaignId=${encodeURIComponent(props.campaignId)}`,
      {
        credentials: 'include'
      }
    )
    const data = (await res.json().catch(() => null)) as {
      success?: boolean
      error?: string
      pages?: PageRow[]
    }
    if (res.ok && data?.success && Array.isArray(data.pages)) {
      pages.value = data.pages
    } else {
      error.value = data?.error ?? 'Ошибка загрузки страниц'
    }
  } catch {
    error.value = 'Ошибка загрузки'
  } finally {
    loading.value = false
  }
}

async function loadLinks() {
  linksLoading.value = true
  const base = getApiBaseUrl().replace(/\/$/, '')
  try {
    const res = await fetch(
      `${base}/api/links/list?campaignId=${encodeURIComponent(props.campaignId)}`,
      {
        credentials: 'include'
      }
    )
    const data = (await res.json().catch(() => null)) as {
      success?: boolean
      error?: string
      links?: LinkRow[]
    }
    if (res.ok && data?.success && Array.isArray(data.links)) {
      links.value = data.links
    }
  } catch {
    // не блокируем интерфейс
  } finally {
    linksLoading.value = false
  }
}

function openCreate() {
  editingPage.value = null
  showForm.value = true
}

function openEdit(page: PageRow) {
  editingPage.value = page
  showForm.value = true
}

function onFormSaved(payload?: { page?: { id: string; title?: string; webhookSecret?: string } }) {
  showForm.value = false
  editingPage.value = null
  loadPages()
  loadLinks()
  if (payload?.page) {
    webhookModalPage.value = payload.page as PageRow
  }
}

function confirmDelete(page: PageRow) {
  deleteTarget.value = page
}

async function doDelete() {
  const page = deleteTarget.value
  if (!page?.id) {
    deleteTarget.value = null
    return
  }
  const base = getApiBaseUrl().replace(/\/$/, '')
  try {
    const res = await fetch(`${base}/api/pages/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ pageId: page.id })
    })
    const data = (await res.json().catch(() => null)) as { success?: boolean; error?: string }
    if (res.ok && data?.success) {
      deleteTarget.value = null
      loadPages()
      loadLinks()
    } else {
      error.value = data?.error ?? 'Ошибка удаления'
    }
  } catch {
    error.value = 'Ошибка запроса'
  } finally {
    deleteTarget.value = null
  }
}

async function copyUrl(url: string) {
  try {
    await navigator.clipboard.writeText(url)
    // при желании можно показать toast
  } catch {}
}

onMounted(() => {
  loadPages()
  loadLinks()
})

watch(
  () => props.campaignId,
  () => {
    loading.value = true
    linksLoading.value = true
    loadPages()
    loadLinks()
  }
)
</script>

<template>
  <div class="p-6 max-w-4xl mx-auto">
    <h1 class="text-2xl text-[var(--color-text)] mb-6">Страницы и ссылки</h1>

    <section class="mb-8">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg text-[var(--color-text)]">Целевые страницы</h2>
        <button
          type="button"
          class="px-4 py-2 rounded bg-[var(--color-accent)] text-white hover:opacity-90 transition"
          @click="openCreate"
        >
          <i class="fas fa-plus mr-2"></i>Добавить страницу
        </button>
      </div>
      <p v-if="error" class="text-red-400 text-sm mb-3">{{ error }}</p>
      <div v-if="loading" class="text-[var(--color-text-secondary)] py-4 text-center">
        <i class="fas fa-spinner fa-spin"></i>
      </div>
      <div
        v-else-if="pages.length === 0"
        class="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-6 text-center text-[var(--color-text-secondary)]"
      >
        Нет страниц. Добавьте целевую страницу с URL-шаблоном (плейсхолдер
        <code class="px-1 rounded bg-[var(--color-bg-tertiary)]">{ref}</code>).
      </div>
      <ul v-else class="space-y-2">
        <li
          v-for="p in pages"
          :key="p.id"
          class="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] flex items-center justify-between gap-4 px-4 py-3"
        >
          <div class="min-w-0 flex-1">
            <span class="text-[var(--color-text)] font-medium">{{ p.title || '—' }}</span>
            <p
              class="text-[var(--color-text-secondary)] text-sm truncate font-mono"
              :title="p.urlTemplate"
            >
              {{ p.urlTemplate || '—' }}
            </p>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <button
              type="button"
              class="px-3 py-1.5 rounded border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-bg-tertiary)] text-sm"
              title="Webhook"
              @click="webhookModalPage = p"
            >
              <i class="fas fa-plug mr-1"></i>Webhook
            </button>
            <button
              type="button"
              class="px-3 py-1.5 rounded border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-bg-tertiary)] text-sm"
              @click="openEdit(p)"
            >
              <i class="fas fa-pen mr-1"></i>Изменить
            </button>
            <button
              type="button"
              class="px-3 py-1.5 rounded border border-red-500/50 text-red-400 hover:bg-red-500/10 text-sm"
              @click="confirmDelete(p)"
            >
              <i class="fas fa-trash mr-1"></i>Удалить
            </button>
          </div>
        </li>
      </ul>
    </section>

    <section>
      <h2 class="text-lg text-[var(--color-text)] mb-4">Партнёрские ссылки</h2>
      <p class="text-[var(--color-text-secondary)] text-sm mb-3">
        Ссылки создаются при переходе партнёров по целевым страницам (через бота или вручную). Здесь
        — просмотр и копирование.
      </p>
      <div v-if="linksLoading" class="text-[var(--color-text-secondary)] py-4 text-center">
        <i class="fas fa-spinner fa-spin"></i>
      </div>
      <div
        v-else-if="links.length === 0"
        class="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-6 text-center text-[var(--color-text-secondary)]"
      >
        Нет партнёрских ссылок.
      </div>
      <div
        v-else
        class="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] overflow-hidden"
      >
        <table class="w-full text-sm">
          <thead class="bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] text-left">
            <tr>
              <th class="px-4 py-2">Страница</th>
              <th class="px-4 py-2">Партнёр</th>
              <th class="px-4 py-2">Ссылка</th>
              <th class="px-4 py-2 w-24"></th>
            </tr>
          </thead>
          <tbody class="text-[var(--color-text)]">
            <tr
              v-for="link in links"
              :key="link.id"
              class="border-t border-[var(--color-border)] hover:bg-[var(--color-bg-tertiary)]"
            >
              <td class="px-4 py-2">{{ link.pageTitle || '—' }}</td>
              <td class="px-4 py-2">{{ link.partnerName }}</td>
              <td class="px-4 py-2 font-mono truncate max-w-xs" :title="link.fullUrl">
                {{ link.fullUrl }}
              </td>
              <td class="px-4 py-2">
                <button
                  v-if="link.fullUrl"
                  type="button"
                  class="text-[var(--color-accent)] hover:underline"
                  title="Копировать"
                  @click="copyUrl(link.fullUrl)"
                >
                  <i class="fas fa-copy"></i>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <PageForm
      v-if="showForm"
      :api-base-url="getApiBaseUrl().replace(/\/$/, '')"
      :campaign-id="campaignId"
      :page-id="editingPage?.id"
      :initial-title="editingPage?.title ?? ''"
      :initial-url-template="editingPage?.urlTemplate ?? ''"
      @saved="onFormSaved"
      @cancel="
        showForm = false
        editingPage = null
      "
    />

    <ConfirmModal
      :visible="!!deleteTarget"
      title="Удалить страницу?"
      :message="deleteTarget ? `Страница «${deleteTarget.title}» будет удалена.` : ''"
      confirm-label="Удалить"
      :danger="true"
      @confirm="doDelete"
      @cancel="deleteTarget = null"
    />

    <WebhookInfoModal
      :visible="!!webhookModalPage"
      :page-title="webhookModalPage?.title ?? ''"
      :webhook-secret="webhookModalPage?.webhookSecret ?? ''"
      :base-url="getApiBaseUrl().replace(/\/$/, '')"
      @close="webhookModalPage = null"
    />
  </div>
</template>
