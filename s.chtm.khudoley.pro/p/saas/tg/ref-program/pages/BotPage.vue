<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import BotForm from '../components/Forms/BotForm.vue'

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

const bot = ref<{
  id: string
  username?: string
  title?: string
  webhookStatus?: string
  tgBotId?: string
} | null>(null)
const updates = ref<
  Array<{ id: string; updateId?: number; tgUserId?: string; updateType?: string }>
>([])
const loading = ref(true)
const showForm = ref(false)

const hasExistingBot = computed(() => !!bot.value)

async function loadBot() {
  const baseUrl = getApiBaseUrl().replace(/\/$/, '')
  try {
    const res = await fetch(
      `${baseUrl}/api/bot/get?campaignId=${encodeURIComponent(props.campaignId)}`,
      {
        credentials: 'include'
      }
    )
    const data = (await res.json().catch(() => null)) as {
      success?: boolean
      bot?: typeof bot.value
    }
    if (res.ok && data?.success) {
      bot.value = data.bot ?? null
    }
  } finally {
    loading.value = false
  }
}

async function loadUpdates() {
  if (!bot.value) return
  const baseUrl = getApiBaseUrl().replace(/\/$/, '')
  try {
    const res = await fetch(
      `${baseUrl}/api/bot/updates?campaignId=${encodeURIComponent(props.campaignId)}&limit=20`,
      { credentials: 'include' }
    )
    const data = (await res.json().catch(() => null)) as {
      success?: boolean
      updates?: Array<{ id: string; updateId?: number; tgUserId?: string; updateType?: string }>
    }
    if (res.ok && data?.success && Array.isArray(data.updates)) {
      updates.value = data.updates
    }
  } catch {
    // ignore
  }
}

const reinstalling = ref(false)

async function reinstallWebhook() {
  if (!bot.value || reinstalling.value) return
  reinstalling.value = true
  const baseUrl = getApiBaseUrl().replace(/\/$/, '')
  try {
    const res = await fetch(`${baseUrl}/api/bot/reinstall-webhook`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignId: props.campaignId })
    })
    const data = (await res.json().catch(() => null)) as {
      success?: boolean
      bot?: typeof bot.value
      error?: string
    }
    if (res.ok && data?.success && data.bot) {
      bot.value = data.bot
    }
  } finally {
    reinstalling.value = false
  }
}

function onConnected() {
  showForm.value = false
  loadBot()
  loadUpdates()
}

onMounted(() => {
  loadBot().then(() => {
    if (bot.value) loadUpdates()
  })
})
</script>

<template>
  <div class="p-6 max-w-4xl mx-auto">
    <h1 class="text-2xl text-[var(--color-text)] mb-6">Telegram-бот</h1>
    <p class="text-[var(--color-text-secondary)] mb-6">
      Подключите бота к кампании. После подключения установится webhook для приёма сообщений от
      пользователей.
    </p>

    <div v-if="loading" class="text-[var(--color-text-secondary)]">
      <i class="fas fa-spinner fa-spin mr-2"></i>Загрузка…
    </div>

    <template v-else>
      <section
        v-if="bot"
        class="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4 mb-6"
      >
        <h2 class="text-lg text-[var(--color-text)] mb-3">Подключённый бот</h2>
        <p class="text-[var(--color-text-secondary)] text-sm mb-2">
          <span v-if="bot.username">@{{ bot.username }}</span>
          <span v-else>ID: {{ bot.tgBotId || bot.id }}</span>
          <span v-if="bot.webhookStatus" class="ml-2">
            (webhook:
            <span :class="bot.webhookStatus === 'ok' ? 'text-green-400' : 'text-amber-500'">{{
              bot.webhookStatus
            }}</span
            >)
          </span>
        </p>
        <div class="flex gap-2 items-center flex-wrap mt-2">
          <button
            type="button"
            class="px-4 py-2 rounded border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-bg-tertiary)] disabled:opacity-50"
            :disabled="reinstalling"
            @click="reinstallWebhook"
          >
            <i v-if="reinstalling" class="fas fa-spinner fa-spin mr-1"></i>
            <i v-else class="fas fa-sync-alt mr-1"></i>Переустановить
          </button>
        </div>
        <p class="text-[var(--color-text-tertiary)] text-xs mt-2">
          Если кто-то снаружи перезаписал webhook в Telegram — нажмите «Переустановить», чтобы
          вернуть приём сообщений.
        </p>
      </section>

      <section
        v-else
        class="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4 mb-6"
      >
        <p class="text-[var(--color-text-secondary)] mb-3">
          Бот не подключён. Создайте бота через @BotFather и введите токен.
        </p>
      </section>

      <section class="mb-6">
        <button
          v-if="!showForm"
          type="button"
          class="px-4 py-2 rounded bg-[var(--color-accent)] text-white hover:opacity-90"
          @click="showForm = true"
        >
          {{ bot ? 'Заменить бота' : 'Подключить бота' }}
        </button>
        <BotForm
          v-else
          :api-base-url="getApiBaseUrl()"
          :campaign-id="campaignId"
          :has-existing-bot="hasExistingBot"
          @connected="onConnected"
          @cancel="showForm = false"
        />
      </section>

      <section
        v-if="bot && updates.length > 0"
        class="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4"
      >
        <h2 class="text-lg text-[var(--color-text)] mb-3">Последние апдейты</h2>
        <ul class="space-y-2 text-sm text-[var(--color-text-secondary)]">
          <li v-for="u in updates" :key="u.id" class="flex gap-2 items-center">
            <span class="text-[var(--color-text-tertiary)]">#{{ u.updateId }}</span>
            <span>{{ u.updateType || 'other' }}</span>
            <span v-if="u.tgUserId">tg:{{ u.tgUserId }}</span>
          </li>
        </ul>
      </section>
    </template>
  </div>
</template>
