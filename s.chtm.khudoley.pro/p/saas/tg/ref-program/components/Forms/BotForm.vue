<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  apiBaseUrl: string
  campaignId: string
  hasExistingBot: boolean
}>()

const emit = defineEmits<{
  connected: []
  cancel: []
}>()

const token = ref('')
const saving = ref(false)
const error = ref('')

watch(
  () => props.hasExistingBot,
  () => {
    error.value = ''
  }
)

async function submit() {
  const t = token.value.trim()
  if (!t) {
    error.value = 'Введите токен бота'
    return
  }
  error.value = ''
  saving.value = true
  try {
    const res = await fetch(`${props.apiBaseUrl}/api/bot/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ campaignId: props.campaignId, token: t })
    })
    const data = (await res.json().catch(() => null)) as {
      success?: boolean
      error?: string
      bot?: { id: string }
    }
    if (res.ok && data?.success) {
      emit('connected')
      return
    }
    error.value = data?.error || 'Ошибка подключения'
  } catch {
    error.value = 'Ошибка запроса'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
    <h3 class="text-lg text-[var(--color-text)] mb-3">
      {{ hasExistingBot ? 'Заменить бота' : 'Подключить бота' }}
    </h3>
    <p v-if="hasExistingBot" class="text-amber-500 text-sm mb-3">
      <i class="fas fa-exclamation-triangle mr-1"></i>
      У кампании уже подключён бот. Ввод нового токена заменит его. Старый бот перестанет получать
      апдейты.
    </p>
    <form @submit.prevent="submit">
      <label class="block text-[var(--color-text-secondary)] text-sm mb-1"
        >Токен бота (от @BotFather)</label
      >
      <input
        v-model="token"
        type="password"
        autocomplete="off"
        class="w-full px-3 py-2 rounded border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] mb-3 font-mono text-sm"
        placeholder="123456789:AAH..."
      />
      <p v-if="error" class="text-red-400 text-sm mb-3">{{ error }}</p>
      <div class="flex gap-2">
        <button
          type="button"
          class="px-4 py-2 rounded border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-bg-tertiary)]"
          @click="$emit('cancel')"
        >
          Отмена
        </button>
        <button
          type="submit"
          :disabled="saving"
          class="px-4 py-2 rounded bg-[var(--color-accent)] text-white hover:opacity-90 disabled:opacity-50"
        >
          <span v-if="saving"><i class="fas fa-spinner fa-spin mr-1"></i></span>
          {{ hasExistingBot ? 'Заменить' : 'Подключить' }}
        </button>
      </div>
    </form>
  </div>
</template>
