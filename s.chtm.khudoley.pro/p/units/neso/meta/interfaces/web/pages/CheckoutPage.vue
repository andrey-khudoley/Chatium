<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { getOrCreateBrowserSocketClient } from '@app/socket'
import { checkoutSubmitRoute } from '../api/checkout/submit'
import { checkoutStatusRoute } from '../api/checkout/status'
import type { CheckoutClientState, CheckoutSocketMessage } from '../shared/checkoutClient'

declare const ctx: app.Ctx

const props = defineProps<{
  requestKey: string
  encodedSocketId: string
  defaultCurrency: string
  pollIntervalMs: number
  submitUrl?: string
}>()

// ---------------------------------------------------------------------------
// Поля формы
// ---------------------------------------------------------------------------

const email = ref('')
const offerId = ref('')
const amount = ref('')
const currency = ref(props.defaultCurrency)
const firstName = ref('')
const lastName = ref('')
const phone = ref('')
const utmSource = ref('')
const utmMedium = ref('')
const utmCampaign = ref('')
const utmContent = ref('')
const utmTerm = ref('')
const comment = ref('')
const sourceUrl = ref('')
const returnUrl = ref('')

// ---------------------------------------------------------------------------
// Состояние
// ---------------------------------------------------------------------------

const state = ref<CheckoutClientState>('idle')
const errorMessage = ref('')
const paymentUrl = ref('')
const redirected = ref(false)
let pollTimer: number | null = null

// ---------------------------------------------------------------------------
// WebSocket подписка
// ---------------------------------------------------------------------------

let socketUnsubscribe: (() => void) | null = null
let socketSubscription: { unsubscribe?: () => void } | null = null

// ---------------------------------------------------------------------------
// Методы
// ---------------------------------------------------------------------------

function doRedirect(url: string): void {
  if (redirected.value) return
  redirected.value = true
  paymentUrl.value = url
  state.value = 'redirecting'
  // Гасим poll-loop: redirect мог прийти из сокета, пока таймер запланирован
  if (pollTimer !== null) {
    clearTimeout(pollTimer)
    pollTimer = null
  }
  window.location.href = url
}

function schedulePoll(): void {
  pollTimer = window.setTimeout(() => {
    void runPoll()
  }, props.pollIntervalMs)
}

async function runPoll(): Promise<void> {
  // Если уже редиректнулись (например, из сокета) — не продолжаем poll
  if (redirected.value) return
  try {
    const s = (await checkoutStatusRoute.run(ctx, { requestKey: props.requestKey })) as {
      success: boolean
      status: string
      paymentUrl?: string
      error?: string
    }
    if (s.paymentUrl) {
      doRedirect(s.paymentUrl)
      return
    }
    if (s.status === 'failed') {
      state.value = 'error'
      errorMessage.value = s.error ?? 'Ошибка обработки заказа'
      return
    }
  } catch {
    // Сеть недоступна — продолжаем poll
  }
  schedulePoll()
}

function startPoll(): void {
  if (pollTimer !== null) {
    clearTimeout(pollTimer)
    pollTimer = null
  }
  schedulePoll()
}

async function submit(): Promise<void> {
  if (state.value === 'submitting' || state.value === 'redirecting') return
  state.value = 'submitting'
  errorMessage.value = ''
  try {
    const body: Record<string, unknown> = {
      requestKey: props.requestKey,
      email: email.value,
      amount: amount.value,
      currency: currency.value
    }
    if (offerId.value.trim()) body.offerId = offerId.value.trim()
    if (firstName.value.trim()) body.firstName = firstName.value.trim()
    if (lastName.value.trim()) body.lastName = lastName.value.trim()
    if (phone.value.trim()) body.phone = phone.value.trim()
    if (utmSource.value.trim()) body.utmSource = utmSource.value.trim()
    if (utmMedium.value.trim()) body.utmMedium = utmMedium.value.trim()
    if (utmCampaign.value.trim()) body.utmCampaign = utmCampaign.value.trim()
    if (utmContent.value.trim()) body.utmContent = utmContent.value.trim()
    if (utmTerm.value.trim()) body.utmTerm = utmTerm.value.trim()
    if (comment.value.trim()) body.comment = comment.value.trim()
    if (sourceUrl.value.trim()) body.sourceUrl = sourceUrl.value.trim()
    if (returnUrl.value.trim()) body.returnUrl = returnUrl.value.trim()

    const r = (await checkoutSubmitRoute.run(ctx, body)) as {
      success: boolean
      error?: string
      status?: string
      paymentUrl?: string
    }

    if (r.success === false) {
      state.value = 'error'
      errorMessage.value = r.error ?? 'Ошибка отправки формы'
      return
    }

    // Идемпотентный повтор — ссылка уже готова
    if (r.paymentUrl) {
      doRedirect(r.paymentUrl)
      return
    }

    // Идемпотентный повтор уже провального заказа — не уходим в бесконечное ожидание
    if (r.status === 'failed') {
      state.value = 'error'
      errorMessage.value = r.error ?? 'Заказ не удалось оформить'
      return
    }

    state.value = 'waiting_payment_url'
    startPoll()
  } catch (e) {
    state.value = 'error'
    errorMessage.value = (e as Error)?.message ?? 'Ошибка сети'
  }
}

async function checkStatus(): Promise<void> {
  try {
    const s = (await checkoutStatusRoute.run(ctx, { requestKey: props.requestKey })) as {
      success: boolean
      status: string
      paymentUrl?: string
      error?: string
    }
    if (s.paymentUrl) {
      doRedirect(s.paymentUrl)
    } else if (s.status === 'failed') {
      state.value = 'error'
      errorMessage.value = s.error ?? 'Ошибка обработки заказа'
    }
  } catch {
    // Игнорируем — ручная проверка
  }
}

function retry(): void {
  state.value = 'idle'
  errorMessage.value = ''
}

// ---------------------------------------------------------------------------
// Жизненный цикл
// ---------------------------------------------------------------------------

onMounted(async () => {
  try {
    const socketClient = await getOrCreateBrowserSocketClient()
    const subscription = socketClient.subscribeToData(props.encodedSocketId)
    socketSubscription = subscription as typeof socketSubscription
    socketUnsubscribe = subscription.listen((msg: CheckoutSocketMessage) => {
      if (msg.type === 'payment_ready' && msg.data.paymentUrl) {
        doRedirect(msg.data.paymentUrl)
      } else if (msg.type === 'checkout_failed') {
        state.value = 'error'
        errorMessage.value = msg.data.error
      }
    })
  } catch {
    // WebSocket недоступен — работаем через poll
  }
})

onBeforeUnmount(() => {
  if (pollTimer !== null) {
    clearTimeout(pollTimer)
    pollTimer = null
  }
  if (socketUnsubscribe) {
    try {
      socketUnsubscribe()
    } catch {
      /* ignore */
    }
    socketUnsubscribe = null
  }
  if (socketSubscription?.unsubscribe) {
    try {
      socketSubscription.unsubscribe()
    } catch {
      /* ignore */
    }
    socketSubscription = null
  }
})
</script>

<template>
  <div
    class="min-h-screen flex flex-col items-center justify-center p-6"
    style="background: var(--color-bg, #0a0a0a); color: var(--color-text, #e8e8e8)"
  >
    <div class="w-full max-w-lg">
      <!-- Заголовок -->
      <h1
        class="text-2xl font-bold mb-6 text-center"
        style="font-family: 'Share Tech Mono', monospace; color: var(--color-accent, #d3234b)"
      >
        NeSo Meta Web Interface
      </h1>

      <!-- Состояние: redirecting -->
      <div v-if="state === 'redirecting'" class="text-center py-12">
        <i
          class="fas fa-circle-notch fa-spin text-3xl mb-4"
          style="color: var(--color-accent, #d3234b)"
        ></i>
        <p class="text-lg">Переходим к оплате…</p>
      </div>

      <!-- Состояние: submitting -->
      <div v-else-if="state === 'submitting'" class="text-center py-12">
        <i
          class="fas fa-circle-notch fa-spin text-3xl mb-4"
          style="color: var(--color-accent, #d3234b)"
        ></i>
        <p class="text-lg">Отправка…</p>
      </div>

      <!-- Состояние: waiting_payment_url -->
      <div v-else-if="state === 'waiting_payment_url'" class="text-center py-8">
        <i
          class="fas fa-circle-notch fa-spin text-3xl mb-4"
          style="color: var(--color-accent, #d3234b)"
        ></i>
        <p class="text-lg mb-6">Ожидаем ссылку оплаты…</p>
        <button
          type="button"
          class="px-6 py-3 rounded text-sm font-medium border"
          style="
            border-color: var(--color-border-light, #3a3a3a);
            color: var(--color-text-secondary, #a0a0a0);
          "
          @click="checkStatus"
        >
          <i class="fas fa-sync-alt mr-2"></i>Проверить статус
        </button>
      </div>

      <!-- Состояние: error -->
      <div v-else-if="state === 'error'" class="text-center py-8">
        <i class="fas fa-exclamation-triangle text-3xl mb-4" style="color: #e53e3e"></i>
        <p class="text-base mb-6" style="color: #e53e3e">{{ errorMessage }}</p>
        <button
          type="button"
          class="px-6 py-3 rounded text-sm font-medium"
          style="background: var(--color-accent, #d3234b); color: #fff"
          @click="retry"
        >
          <i class="fas fa-redo mr-2"></i>Повторить
        </button>
      </div>

      <!-- Состояние: idle — форма -->
      <form v-else @submit.prevent="submit" class="space-y-4">
        <!-- Обязательные поля -->
        <div>
          <label class="block text-sm mb-1" style="color: var(--color-text-secondary, #a0a0a0)">
            Email <span style="color: var(--color-accent, #d3234b)">*</span>
          </label>
          <input
            v-model="email"
            type="email"
            required
            class="w-full px-3 py-2 rounded text-sm outline-none"
            style="
              background: var(--color-bg-secondary, #141414);
              border: 1px solid var(--color-border, #2a2a2a);
              color: var(--color-text, #e8e8e8);
            "
            placeholder="user@example.com"
          />
        </div>

        <div>
          <label class="block text-sm mb-1" style="color: var(--color-text-secondary, #a0a0a0)">
            Сумма <span style="color: var(--color-accent, #d3234b)">*</span>
          </label>
          <input
            v-model="amount"
            type="text"
            required
            class="w-full px-3 py-2 rounded text-sm outline-none"
            style="
              background: var(--color-bg-secondary, #141414);
              border: 1px solid var(--color-border, #2a2a2a);
              color: var(--color-text, #e8e8e8);
            "
            placeholder="9900"
          />
        </div>

        <div>
          <label class="block text-sm mb-1" style="color: var(--color-text-secondary, #a0a0a0)"
            >Валюта</label
          >
          <input
            v-model="currency"
            type="text"
            class="w-full px-3 py-2 rounded text-sm outline-none"
            style="
              background: var(--color-bg-secondary, #141414);
              border: 1px solid var(--color-border, #2a2a2a);
              color: var(--color-text, #e8e8e8);
            "
            placeholder="RUB"
          />
        </div>

        <!-- Опциональные поля -->
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm mb-1" style="color: var(--color-text-secondary, #a0a0a0)"
              >Имя</label
            >
            <input
              v-model="firstName"
              type="text"
              class="w-full px-3 py-2 rounded text-sm outline-none"
              style="
                background: var(--color-bg-secondary, #141414);
                border: 1px solid var(--color-border, #2a2a2a);
                color: var(--color-text, #e8e8e8);
              "
            />
          </div>
          <div>
            <label class="block text-sm mb-1" style="color: var(--color-text-secondary, #a0a0a0)"
              >Фамилия</label
            >
            <input
              v-model="lastName"
              type="text"
              class="w-full px-3 py-2 rounded text-sm outline-none"
              style="
                background: var(--color-bg-secondary, #141414);
                border: 1px solid var(--color-border, #2a2a2a);
                color: var(--color-text, #e8e8e8);
              "
            />
          </div>
        </div>

        <div>
          <label class="block text-sm mb-1" style="color: var(--color-text-secondary, #a0a0a0)"
            >Телефон</label
          >
          <input
            v-model="phone"
            type="tel"
            class="w-full px-3 py-2 rounded text-sm outline-none"
            style="
              background: var(--color-bg-secondary, #141414);
              border: 1px solid var(--color-border, #2a2a2a);
              color: var(--color-text, #e8e8e8);
            "
          />
        </div>

        <div>
          <label class="block text-sm mb-1" style="color: var(--color-text-secondary, #a0a0a0)"
            >ID предложения</label
          >
          <input
            v-model="offerId"
            type="text"
            class="w-full px-3 py-2 rounded text-sm outline-none"
            style="
              background: var(--color-bg-secondary, #141414);
              border: 1px solid var(--color-border, #2a2a2a);
              color: var(--color-text, #e8e8e8);
            "
          />
        </div>

        <div>
          <label class="block text-sm mb-1" style="color: var(--color-text-secondary, #a0a0a0)"
            >Комментарий</label
          >
          <input
            v-model="comment"
            type="text"
            class="w-full px-3 py-2 rounded text-sm outline-none"
            style="
              background: var(--color-bg-secondary, #141414);
              border: 1px solid var(--color-border, #2a2a2a);
              color: var(--color-text, #e8e8e8);
            "
          />
        </div>

        <!-- UTM-поля -->
        <details class="rounded" style="border: 1px solid var(--color-border, #2a2a2a)">
          <summary
            class="px-3 py-2 cursor-pointer text-sm"
            style="color: var(--color-text-secondary, #a0a0a0)"
          >
            UTM-параметры
          </summary>
          <div class="px-3 pb-3 space-y-3">
            <div>
              <label class="block text-xs mb-1" style="color: var(--color-text-tertiary, #707070)"
                >utm_source</label
              >
              <input
                v-model="utmSource"
                type="text"
                class="w-full px-3 py-2 rounded text-sm outline-none"
                style="
                  background: var(--color-bg-secondary, #141414);
                  border: 1px solid var(--color-border, #2a2a2a);
                  color: var(--color-text, #e8e8e8);
                "
              />
            </div>
            <div>
              <label class="block text-xs mb-1" style="color: var(--color-text-tertiary, #707070)"
                >utm_medium</label
              >
              <input
                v-model="utmMedium"
                type="text"
                class="w-full px-3 py-2 rounded text-sm outline-none"
                style="
                  background: var(--color-bg-secondary, #141414);
                  border: 1px solid var(--color-border, #2a2a2a);
                  color: var(--color-text, #e8e8e8);
                "
              />
            </div>
            <div>
              <label class="block text-xs mb-1" style="color: var(--color-text-tertiary, #707070)"
                >utm_campaign</label
              >
              <input
                v-model="utmCampaign"
                type="text"
                class="w-full px-3 py-2 rounded text-sm outline-none"
                style="
                  background: var(--color-bg-secondary, #141414);
                  border: 1px solid var(--color-border, #2a2a2a);
                  color: var(--color-text, #e8e8e8);
                "
              />
            </div>
            <div>
              <label class="block text-xs mb-1" style="color: var(--color-text-tertiary, #707070)"
                >utm_content</label
              >
              <input
                v-model="utmContent"
                type="text"
                class="w-full px-3 py-2 rounded text-sm outline-none"
                style="
                  background: var(--color-bg-secondary, #141414);
                  border: 1px solid var(--color-border, #2a2a2a);
                  color: var(--color-text, #e8e8e8);
                "
              />
            </div>
            <div>
              <label class="block text-xs mb-1" style="color: var(--color-text-tertiary, #707070)"
                >utm_term</label
              >
              <input
                v-model="utmTerm"
                type="text"
                class="w-full px-3 py-2 rounded text-sm outline-none"
                style="
                  background: var(--color-bg-secondary, #141414);
                  border: 1px solid var(--color-border, #2a2a2a);
                  color: var(--color-text, #e8e8e8);
                "
              />
            </div>
          </div>
        </details>

        <div>
          <label class="block text-sm mb-1" style="color: var(--color-text-secondary, #a0a0a0)"
            >URL источника</label
          >
          <input
            v-model="sourceUrl"
            type="text"
            class="w-full px-3 py-2 rounded text-sm outline-none"
            style="
              background: var(--color-bg-secondary, #141414);
              border: 1px solid var(--color-border, #2a2a2a);
              color: var(--color-text, #e8e8e8);
            "
          />
        </div>

        <div>
          <label class="block text-sm mb-1" style="color: var(--color-text-secondary, #a0a0a0)"
            >URL возврата</label
          >
          <input
            v-model="returnUrl"
            type="text"
            class="w-full px-3 py-2 rounded text-sm outline-none"
            style="
              background: var(--color-bg-secondary, #141414);
              border: 1px solid var(--color-border, #2a2a2a);
              color: var(--color-text, #e8e8e8);
            "
          />
        </div>

        <button
          type="submit"
          class="w-full py-3 rounded text-sm font-semibold mt-2"
          style="background: var(--color-accent, #d3234b); color: #fff"
        >
          <i class="fas fa-shopping-cart mr-2"></i>Оформить
        </button>
      </form>
    </div>
  </div>
</template>
