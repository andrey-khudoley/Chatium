<script setup lang="ts">
import { ref } from 'vue'
import ConfirmModal from '../components/Modals/ConfirmModal.vue'
import { createComponentLogger } from '../shared/logger'

const log = createComponentLogger('AboutCampaignPage')

const props = defineProps<{
  campaignId: string
  campaignTitle: string
  indexUrl: string
}>()

function getApiBaseUrl(): string {
  const path = props.indexUrl.startsWith('http') ? new URL(props.indexUrl).pathname : props.indexUrl
  const basePath = path.replace(/\/$/, '') || ''
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  return basePath ? `${origin}${basePath}` : origin
}

const showDeleteConfirm = ref(false)
const deleteError = ref('')
const deleting = ref(false)

async function doDeleteCampaign() {
  if (!props.campaignId) return
  deleteError.value = ''
  deleting.value = true
  const base = getApiBaseUrl().replace(/\/$/, '')
  log.info('Удаление кампании', {
    campaignId: props.campaignId,
    url: `${base}/api/campaigns/delete`
  })
  try {
    const res = await fetch(`${base}/api/campaigns/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ campaignId: props.campaignId })
    })
    const rawText = await res.text()
    const data = (
      rawText
        ? (() => {
            try {
              return JSON.parse(rawText)
            } catch {
              return null
            }
          })()
        : null
    ) as { success?: boolean; error?: string } | null
    if (res.ok && data?.success) {
      log.info('Кампания удалена, редирект на список', { campaignId: props.campaignId })
      showDeleteConfirm.value = false
      const u = props.indexUrl.replace(/#.*$/, '')
      const href = u.startsWith('http')
        ? u
        : `${window.location.origin}${u.startsWith('/') ? u : '/' + u}`
      window.location.href = href
      return
    }
    const errMsg = data?.error ?? (rawText && rawText.length < 200 ? rawText : 'Ошибка удаления')
    log.warning('Ответ API: ошибка удаления кампании', {
      status: res.status,
      error: errMsg,
      campaignId: props.campaignId,
      bodyPreview: rawText?.slice(0, 300)
    })
    deleteError.value = errMsg
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    log.error('Ошибка запроса при удалении кампании', {
      campaignId: props.campaignId,
      error: message
    })
    deleteError.value = 'Ошибка запроса'
  } finally {
    deleting.value = false
  }
}

function openDeleteConfirm() {
  deleteError.value = ''
  showDeleteConfirm.value = true
}
</script>

<template>
  <div class="about-campaign p-6 max-w-4xl mx-auto">
    <h1 class="text-xl font-semibold text-[var(--color-text)] mb-4">О кампании</h1>
    <p class="text-[var(--color-text-secondary)] text-sm mb-6 max-w-xl">
      Здесь можно удалить кампанию «{{ campaignTitle }}». Удаление мягкое: кампания помечается как
      удалённая и перестаёт отображаться в списке. Удалять кампанию может только владелец.
    </p>

    <div
      class="border border-[var(--color-border)] rounded-lg p-4 bg-[var(--color-bg-secondary)] max-w-xl"
    >
      <h2 class="text-sm font-medium text-[var(--color-text)] mb-2">Опасная зона</h2>
      <p class="text-[var(--color-text-secondary)] text-sm mb-3">
        Удаление кампании необратимо с точки зрения отображения в интерфейсе. Все данные кампании
        останутся в системе, но доступ к ней будет закрыт.
      </p>
      <button
        type="button"
        class="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition"
        :disabled="deleting"
        @click="openDeleteConfirm"
      >
        <i class="fas fa-trash-alt mr-2" aria-hidden="true"></i>
        Удалить кампанию
      </button>
      <p v-if="deleteError" class="mt-2 text-sm text-red-500">
        {{ deleteError }}
      </p>
    </div>
  </div>

  <ConfirmModal
    :visible="showDeleteConfirm"
    title="Удалить кампанию?"
    :message="`Кампания «${campaignTitle}» будет удалена. Вы уверены?`"
    confirm-label="Удалить"
    cancel-label="Отмена"
    danger
    @confirm="doDeleteCampaign"
    @cancel="showDeleteConfirm = false"
  />
</template>
