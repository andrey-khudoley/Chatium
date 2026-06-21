<script setup lang="ts">
import { ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    apiBaseUrl: string
    campaignId: string
    initialTitle?: string
    initialUrlTemplate?: string
    pageId?: string
  }>(),
  { initialTitle: '', initialUrlTemplate: '', pageId: undefined }
)

const emit = defineEmits<{
  saved: [payload?: { page?: { id: string; title?: string; webhookSecret?: string } }]
  cancel: []
}>()

const title = ref(props.initialTitle)
const urlTemplate = ref(props.initialUrlTemplate)
const saving = ref(false)
const error = ref('')

const isEdit = () => !!props.pageId

watch(
  () => [props.initialTitle, props.initialUrlTemplate],
  ([t, u]) => {
    title.value = (t as string) ?? ''
    urlTemplate.value = (u as string) ?? ''
  }
)

function validate(): boolean {
  const t = title.value.trim()
  if (t.length < 1) {
    error.value = 'Введите название'
    return false
  }
  const u = urlTemplate.value.trim()
  if (!u) {
    error.value = 'Введите URL-шаблон'
    return false
  }
  if (!u.includes('{ref}')) {
    error.value = 'URL-шаблон должен содержать плейсхолдер {ref}'
    return false
  }
  error.value = ''
  return true
}

async function submit() {
  if (!validate()) return
  saving.value = true
  try {
    const base = props.apiBaseUrl.replace(/\/$/, '')
    if (isEdit()) {
      const res = await fetch(`${base}/api/pages/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          pageId: props.pageId,
          title: title.value.trim(),
          urlTemplate: urlTemplate.value.trim()
        })
      })
      const data = (await res.json().catch(() => null)) as { success?: boolean; error?: string }
      if (res.ok && data?.success) {
        emit('saved')
        return
      }
      error.value = data?.error ?? 'Ошибка сохранения'
    } else {
      const res = await fetch(`${base}/api/pages/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          campaignId: props.campaignId,
          title: title.value.trim(),
          urlTemplate: urlTemplate.value.trim()
        })
      })
      const data = (await res.json().catch(() => null)) as {
        success?: boolean
        error?: string
        page?: { id: string; title?: string; webhookSecret?: string }
      }
      if (res.ok && data?.success && data?.page) {
        emit('saved', { page: data.page })
        return
      }
      error.value = data?.error ?? 'Ошибка создания'
    }
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
    @click.self="emit('cancel')"
  >
    <div
      class="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-6 w-full max-w-lg shadow-xl"
    >
      <h2 class="text-lg text-[var(--color-text)] mb-4">
        {{ isEdit() ? 'Редактировать страницу' : 'Новая страница' }}
      </h2>
      <form @submit.prevent="submit">
        <label class="block text-[var(--color-text-secondary)] text-sm mb-1">Название</label>
        <input
          v-model="title"
          type="text"
          class="w-full px-3 py-2 rounded border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] mb-3"
          placeholder="Название страницы"
        />
        <label class="block text-[var(--color-text-secondary)] text-sm mb-1"
          >URL-шаблон (обязателен плейсхолдер {ref})</label
        >
        <input
          v-model="urlTemplate"
          type="text"
          class="w-full px-3 py-2 rounded border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] mb-3 font-mono text-sm"
          placeholder="https://example.com/landing?ref={ref}"
        />
        <p v-if="error" class="text-red-400 text-sm mb-3">{{ error }}</p>
        <div class="flex gap-2 justify-end">
          <button
            type="button"
            class="px-4 py-2 rounded border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-bg-tertiary)]"
            @click="emit('cancel')"
          >
            Отмена
          </button>
          <button
            type="submit"
            :disabled="saving"
            class="px-4 py-2 rounded bg-[var(--color-accent)] text-white hover:opacity-90 disabled:opacity-50"
          >
            <span v-if="saving"><i class="fas fa-spinner fa-spin mr-1"></i></span>
            {{ isEdit() ? 'Сохранить' : 'Создать' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
