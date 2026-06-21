<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  apiBaseUrl: string
  initialTitle?: string
}>()

const emit = defineEmits<{
  created: []
  cancel: []
}>()

const title = ref(props.initialTitle ?? '')
const saving = ref(false)
const error = ref('')

watch(
  () => props.initialTitle,
  (v) => {
    title.value = v ?? ''
  }
)

async function submit() {
  const t = title.value.trim()
  if (t.length < 2) {
    error.value = 'Название не менее 2 символов'
    return
  }
  error.value = ''
  saving.value = true
  try {
    const res = await fetch(`${props.apiBaseUrl}/api/campaigns/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ title: t })
    })
    const data = (await res.json().catch(() => null)) as {
      success?: boolean
      error?: string
      campaign?: { id: string }
    }
    if (res.ok && data?.success && data.campaign?.id) {
      emit('created')
      return
    }
    error.value = data?.error || 'Ошибка создания'
  } catch {
    error.value = 'Ошибка запроса'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
    @click.self="$emit('cancel')"
  >
    <div
      class="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-6 w-full max-w-md shadow-xl"
    >
      <h2 class="text-lg text-[var(--color-text)] mb-4">Новая кампания</h2>
      <form @submit.prevent="submit">
        <label class="block text-[var(--color-text-secondary)] text-sm mb-1">Название</label>
        <input
          v-model="title"
          type="text"
          class="w-full px-3 py-2 rounded border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] mb-3"
          placeholder="Название кампании"
          minlength="2"
        />
        <p v-if="error" class="text-red-400 text-sm mb-3">{{ error }}</p>
        <div class="flex gap-2 justify-end">
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
            Создать
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
