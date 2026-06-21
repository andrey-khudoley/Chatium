<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{
  visible: boolean
  pageTitle: string
  webhookSecret: string
  baseUrl: string
}>()

const emit = defineEmits<{
  close: []
}>()

const registerUrl = computed(() => `${props.baseUrl}/hook/register`)
const orderUrl = computed(() => `${props.baseUrl}/hook/order`)
const paymentUrl = computed(() => `${props.baseUrl}/hook/payment`)

const copied = ref(false)
const paramsOpen = ref(false)

async function copySecret() {
  if (!props.webhookSecret) return
  try {
    await navigator.clipboard.writeText(props.webhookSecret)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch {
    copied.value = false
  }
}

const examplePayload = {
  key: '<webhook_secret>',
  ref: 'ref_123',
  name: 'Иван Иванов',
  email: 'user@example.com',
  phone: '+79001234567',
  tg_id: '123456789',
  gc_id: 'getcourse_user_id'
}

const exampleHeaders = {
  'Content-Type': 'application/json',
  'X-Request-Source': 'getcourse'
}
</script>

<template>
  <div
    v-if="visible"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
    @click.self="emit('close')"
  >
    <div
      class="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] w-full max-w-xl max-h-[90vh] flex flex-col shadow-xl overflow-hidden"
    >
      <div
        class="p-4 border-b border-[var(--color-border)] flex items-center justify-between shrink-0"
      >
        <h2 class="text-lg text-[var(--color-text)]">
          Webhook
          <span v-if="pageTitle" class="text-[var(--color-text-secondary)] font-normal">
            — {{ pageTitle }}</span
          >
        </h2>
        <button
          type="button"
          class="p-2 rounded text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text)]"
          aria-label="Закрыть"
          @click="emit('close')"
        >
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="overflow-y-auto p-4 flex-1 min-h-0 space-y-4">
        <div>
          <p class="text-sm font-medium text-[var(--color-text)] mb-1">URL вебхука (регистрация)</p>
          <code
            class="block rounded border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] px-3 py-2 text-sm text-[var(--color-text)] break-all"
          >
            {{ registerUrl }}
          </code>
        </div>

        <div>
          <p class="text-sm font-medium text-[var(--color-text)] mb-1">Webhook Secret</p>
          <div class="flex gap-2 items-center">
            <code
              class="flex-1 rounded border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] px-3 py-2 text-sm text-[var(--color-text)] break-all min-w-0"
            >
              {{ webhookSecret || '—' }}
            </code>
            <button
              type="button"
              class="shrink-0 px-3 py-2 rounded border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-bg-tertiary)] text-sm flex items-center gap-2"
              :disabled="!webhookSecret"
              @click="copySecret()"
            >
              <i class="fas" :class="copied ? 'fa-check text-green-600' : 'fa-copy'"></i>
              {{ copied ? 'Скопировано' : 'Копировать' }}
            </button>
          </div>
        </div>

        <div>
          <p class="text-sm font-medium text-[var(--color-text)] mb-1">
            Пример POST-запроса (JSON)
          </p>
          <pre
            class="rounded border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] p-3 text-xs text-[var(--color-text)] overflow-x-auto"
            >{{ JSON.stringify(examplePayload, null, 2) }}</pre
          >
        </div>

        <div>
          <button
            type="button"
            class="w-full flex items-center justify-between text-sm font-medium text-[var(--color-text)] py-2 rounded hover:bg-[var(--color-bg-tertiary)] transition-colors"
            @click="paramsOpen = !paramsOpen"
          >
            <span>Параметры</span>
            <i
              class="fas transition-transform"
              :class="paramsOpen ? 'fa-chevron-up' : 'fa-chevron-down'"
            ></i>
          </button>
          <div v-show="paramsOpen" class="pt-2">
            <ul class="text-sm text-[var(--color-text-secondary)] space-y-1">
              <li>
                <code class="text-[var(--color-text)]">key</code> — Webhook Secret (обязательно)
              </li>
              <li>
                <code class="text-[var(--color-text)]">ref</code> — идентификатор реферала
                (обязательно)
              </li>
              <li><code class="text-[var(--color-text)]">name</code> — имя</li>
              <li><code class="text-[var(--color-text)]">email</code> — email</li>
              <li><code class="text-[var(--color-text)]">phone</code> — телефон</li>
              <li><code class="text-[var(--color-text)]">tg_id</code> — Telegram user id</li>
              <li><code class="text-[var(--color-text)]">gc_id</code> — GetCourse user id</li>
            </ul>
          </div>
        </div>

        <div>
          <p class="text-sm font-medium text-[var(--color-text)] mb-1">Заголовки (JSON)</p>
          <pre
            class="rounded border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] p-3 text-xs text-[var(--color-text)] overflow-x-auto"
            >{{ JSON.stringify(exampleHeaders, null, 2) }}</pre
          >
        </div>

        <div>
          <p class="text-sm font-medium text-[var(--color-text)] mb-2">Другие вебхуки</p>
          <ul class="text-sm space-y-1">
            <li>
              <span class="text-[var(--color-text-secondary)]">Заказ:</span>
              <code class="ml-1 text-[var(--color-text)] break-all">{{ orderUrl }}</code>
            </li>
            <li>
              <span class="text-[var(--color-text-secondary)]">Оплата:</span>
              <code class="ml-1 text-[var(--color-text)] break-all">{{ paymentUrl }}</code>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>
