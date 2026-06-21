<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { createComponentLogger } from '../shared/logger'

const log = createComponentLogger('InvitePage')

declare global {
  interface Window {
    hideAppLoader?: () => void
    bootLoaderComplete?: boolean
  }
}

const props = defineProps<{
  token: string
  indexUrl: string
  loginUrl: string
  isAuthenticated: boolean
}>()

function getApiBaseUrl(): string {
  const path = props.indexUrl.startsWith('http') ? new URL(props.indexUrl).pathname : props.indexUrl
  const basePath = path.replace(/\/$/, '') || ''
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  return basePath ? `${origin}${basePath}` : origin
}

const campaignTitle = ref<string | null>(null)
const campaignId = ref<string | null>(null)
const loading = ref(true)
const error = ref('')
const accepting = ref(false)
const acceptError = ref('')

async function loadInvite() {
  if (!props.token) {
    error.value = 'Ссылка приглашения не указана'
    loading.value = false
    return
  }
  loading.value = true
  error.value = ''
  try {
    const baseUrl = getApiBaseUrl().replace(/\/$/, '')
    const res = await fetch(
      `${baseUrl}/api/invites/get-by-token?token=${encodeURIComponent(props.token)}`,
      { credentials: 'include' }
    )
    const data = (await res.json().catch(() => null)) as {
      success?: boolean
      error?: string
      campaignTitle?: string
      campaignId?: string
    }
    if (res.ok && data?.success) {
      campaignTitle.value = data.campaignTitle ?? null
      campaignId.value = data.campaignId ?? null
    } else {
      error.value = data?.error || 'Приглашение не найдено или истекло'
    }
  } catch (e) {
    log.error('Ошибка загрузки приглашения', e)
    error.value = 'Ошибка загрузки'
  } finally {
    loading.value = false
  }
}

async function accept() {
  if (!props.token || !props.isAuthenticated) return
  accepting.value = true
  acceptError.value = ''
  try {
    const baseUrl = getApiBaseUrl().replace(/\/$/, '')
    const res = await fetch(`${baseUrl}/api/invites/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ token: props.token })
    })
    const data = (await res.json().catch(() => null)) as {
      success?: boolean
      error?: string
      campaignId?: string
    }
    if (res.ok && data?.success && data.campaignId) {
      const path = props.indexUrl.startsWith('http')
        ? new URL(props.indexUrl).pathname
        : props.indexUrl
      const basePath = path.replace(/\/$/, '') || ''
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      const campaignUrl = `${origin}${basePath}/web/campaign?campaignId=${encodeURIComponent(data.campaignId)}`
      window.location.href = campaignUrl
      return
    }
    acceptError.value = data?.error || 'Не удалось принять приглашение'
  } catch (e) {
    log.error('Ошибка принятия приглашения', e)
    acceptError.value = 'Ошибка запроса'
  } finally {
    accepting.value = false
  }
}

function decline() {
  window.location.href = props.indexUrl
}

onMounted(() => {
  if (window.hideAppLoader) window.hideAppLoader()
  if (window.bootLoaderComplete) {
    loadInvite()
  } else {
    window.addEventListener('bootloader-complete', loadInvite)
  }
})

watch(
  () => props.token,
  () => loadInvite()
)
</script>

<template>
  <div
    class="app-layout min-h-screen text-[var(--color-text)] flex flex-col items-center justify-center p-6 font-['Share_Tech_Mono',monospace]"
  >
    <div class="w-full max-w-md">
      <h1 class="text-xl text-[var(--color-text)] mb-6 text-center">Приглашение в кампанию</h1>

      <div v-if="loading" class="text-[var(--color-text-secondary)] text-center py-8">
        <i class="fas fa-spinner fa-spin text-2xl mb-2"></i>
        <p>Загрузка...</p>
      </div>

      <div
        v-else-if="error"
        class="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-6 text-center"
      >
        <p class="text-[var(--color-text-secondary)] mb-4">{{ error }}</p>
        <a
          :href="indexUrl"
          class="inline-block px-4 py-2 rounded bg-[var(--color-accent)] text-white hover:opacity-90 transition"
        >
          На главную
        </a>
      </div>

      <div
        v-else-if="!isAuthenticated"
        class="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-6 text-center"
      >
        <p class="text-[var(--color-text)] mb-2">Вас приглашают в кампанию</p>
        <p class="text-[var(--color-text-secondary)] mb-4">{{ campaignTitle }}</p>
        <p class="text-[var(--color-text-tertiary)] text-sm mb-4">
          Войдите в аккаунт, чтобы принять приглашение.
        </p>
        <a
          :href="
            loginUrl +
            '?back=' +
            encodeURIComponent(typeof window !== 'undefined' ? window.location.href : indexUrl)
          "
          class="inline-block px-4 py-2 rounded bg-[var(--color-accent)] text-white hover:opacity-90 transition"
        >
          Войти
        </a>
      </div>

      <div
        v-else
        class="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-6"
      >
        <p class="text-[var(--color-text-secondary)] mb-2">Вас приглашают в кампанию</p>
        <p class="text-lg text-[var(--color-text)] mb-6">{{ campaignTitle }}</p>
        <p v-if="acceptError" class="text-red-400 text-sm mb-3">{{ acceptError }}</p>
        <div class="flex gap-3">
          <button
            type="button"
            :disabled="accepting"
            class="flex-1 px-4 py-2 rounded bg-[var(--color-accent)] text-white hover:opacity-90 transition disabled:opacity-50"
            @click="accept"
          >
            <span v-if="accepting"><i class="fas fa-spinner fa-spin mr-1"></i></span>
            Принять
          </button>
          <button
            type="button"
            :disabled="accepting"
            class="px-4 py-2 rounded border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-bg-tertiary)] transition"
            @click="decline"
          >
            Отклонить
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
