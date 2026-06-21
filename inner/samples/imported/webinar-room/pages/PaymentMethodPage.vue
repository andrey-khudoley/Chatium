<template>
  <div class="pay-page" :class="themeClass">
    <!-- Loading -->
    <div v-if="loading" class="pay-center">
      <div class="pay-spinner">
        <svg viewBox="0 0 50 50">
          <circle
            cx="25"
            cy="25"
            r="20"
            fill="none"
            stroke="currentColor"
            stroke-width="3"
            stroke-linecap="round"
            stroke-dasharray="90 150"
            stroke-dashoffset="0"
          >
            <animateTransform
              attributeName="transform"
              type="rotate"
              dur="1s"
              values="0 25 25;360 25 25"
              repeatCount="indefinite"
            />
          </circle>
        </svg>
      </div>
      <p class="pay-center-text">Загрузка...</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="pay-center">
      <div class="pay-error-icon">
        <i class="fas fa-exclamation"></i>
      </div>
      <h2 class="pay-center-title">Ошибка</h2>
      <p class="pay-center-text">{{ error }}</p>
      <button class="pay-retry" @click="reload">
        <i class="fas fa-redo"></i> Попробовать снова
      </button>
    </div>

    <!-- Redirecting -->
    <div v-else-if="paymentCreated" class="pay-center">
      <div class="pay-success-icon">
        <i class="fas fa-check"></i>
      </div>
      <h2 class="pay-center-title">Переходим к оплате</h2>
      <p class="pay-center-text">Подождите, открываем платёжную страницу...</p>
      <div class="pay-progress">
        <div class="pay-progress-bar"></div>
      </div>
    </div>

    <!-- Main -->
    <div v-else class="pay-container">
      <!-- Price section -->
      <div class="pay-price-section">
        <div class="pay-price-glow"></div>
        <div class="pay-price-inner">
          <p class="pay-price-label">К оплате</p>
          <div class="pay-price-row">
            <span class="pay-price-amount">{{ formatPrice(formData?.paymentAmount) }}</span>
            <span v-if="formData?.paymentOldPrice" class="pay-price-old">{{
              formatPrice(formData.paymentOldPrice)
            }}</span>
          </div>
          <span v-if="formData?.paymentOldPrice && discountPercent > 0" class="pay-discount">
            Скидка {{ discountPercent }}%
          </span>
        </div>
        <p v-if="formData?.title" class="pay-desc">{{ formData.title }}</p>
        <p v-if="formData?.paymentDescription" class="pay-subdesc">
          {{ formData.paymentDescription }}
        </p>
      </div>

      <!-- Divider -->
      <div class="pay-divider">
        <span class="pay-divider-text">Способ оплаты</span>
      </div>

      <!-- Providers -->
      <div v-if="loadingProviders" class="pay-providers-loading">
        <Spinner :size="20" style="color: var(--wr-primary)" />
      </div>

      <div v-else-if="filteredProviders.length === 0" class="pay-providers-empty">
        <i class="fas fa-credit-card"></i>
        <p>Нет доступных способов оплаты</p>
      </div>

      <div v-else class="pay-providers">
        <button
          v-for="provider in filteredProviders"
          :key="provider.id"
          type="button"
          @click="selectProvider(provider.id)"
          :disabled="!!processingProviderId"
          class="pay-provider"
          :class="{ 'pay-provider--loading': processingProviderId === provider.id }"
        >
          <div class="pay-provider-left">
            <div class="pay-provider-logo" v-if="provider.iconUrl">
              <img :src="provider.iconUrl" :alt="provider.title" />
            </div>
            <div class="pay-provider-logo pay-provider-logo--fallback" v-else>
              <i class="fas fa-credit-card"></i>
            </div>
            <div class="pay-provider-text">
              <span class="pay-provider-name">{{ provider.title || provider.slug }}</span>
            </div>
          </div>
          <div class="pay-provider-right">
            <Spinner
              v-if="processingProviderId === provider.id"
              :size="18"
              style="color: var(--wr-primary)"
            />
            <span v-else class="pay-provider-arrow">
              <i class="fas fa-arrow-right"></i>
            </span>
          </div>
        </button>
      </div>

      <!-- Secure footer -->
      <div class="pay-secure">
        <i class="fas fa-shield-alt"></i>
        <span>Безопасная оплата через защищённое соединение</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { apiFormSubmissionByIdRoute, apiPaymentProvidersRoute } from '../api/forms'
import { apiFormCreatePaymentRoute } from '../api/forms-payment'
import Spinner from '../components/Spinner.vue'
import { initThemeWatcher, currentTheme } from '../shared/theme'
import { trackFormPaymentPageOpened } from '../shared/use-form-analytics'

const props = defineProps({
  submissionId: { type: String, required: true }
})

const loading = ref(true)
const loadingProviders = ref(true)
const error = ref('')
const formData = ref(null)
const submissionData = ref(null)
const allProviders = ref([])
const processingProviderId = ref(null)
const paymentCreated = ref(false)

const themeClass = computed(() => `is-${currentTheme.value}`)

const currencySymbols = { RUB: '₽', USD: '$', EUR: '€' }

function formatPrice(amount) {
  if (!amount) return ''
  const cur = formData.value?.paymentCurrency || 'RUB'
  const symbol = currencySymbols[cur] || cur
  return `${Number(amount).toLocaleString('ru-RU')} ${symbol}`
}

const discountPercent = computed(() => {
  const old = formData.value?.paymentOldPrice
  const cur = formData.value?.paymentAmount
  if (!old || !cur || old <= cur) return 0
  return Math.round(((old - cur) / old) * 100)
})

const filteredProviders = computed(() => {
  if (!formData.value?.paymentProviders || formData.value.paymentProviders.length === 0) {
    return allProviders.value
  }
  return allProviders.value.filter(
    (p) =>
      formData.value.paymentProviders.includes(p.id) ||
      formData.value.paymentProviders.includes(p.slug)
  )
})

onMounted(async () => {
  initThemeWatcher()
  try {
    const result = await apiFormSubmissionByIdRoute({ id: props.submissionId }).run(ctx)
    submissionData.value = result.submission
    formData.value = result.form
    allProviders.value = (result.configured || []).map((p) => ({ ...p }))
    loadingProviders.value = false
    loading.value = false

    // Трекаем событие открытия страницы оплаты
    if (formData.value && submissionData.value?.episodeId) {
      trackFormPaymentPageOpened(
        submissionData.value.episodeId,
        formData.value.id,
        formData.value.title,
        formData.value.paymentAmount || 0,
        formData.value.paymentCurrency || 'RUB'
      )
    }
  } catch (e) {
    error.value = e.message
    loading.value = false
  }
})

function reload() {
  window.location.reload()
}

async function selectProvider(providerId) {
  if (processingProviderId.value) return
  processingProviderId.value = providerId

  try {
    const result = await apiFormCreatePaymentRoute.run(ctx, {
      submissionId: props.submissionId,
      providerId
    })

    if (result.paymentLink) {
      paymentCreated.value = true
      window.location.href = result.paymentLink
    } else {
      error.value = result.error || 'Не удалось создать платёж'
      processingProviderId.value = null
    }
  } catch (e) {
    error.value = e.message
    processingProviderId.value = null
  }
}
</script>

<style scoped>
.pay-page {
  min-height: 100vh;
  min-height: 100dvh;
  background: var(--wr-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  font-family: 'Inter', sans-serif;
}

/* ===== Center states ===== */
.pay-center {
  text-align: center;
  max-width: 320px;
  animation: payFadeIn 0.4s ease both;
}

@keyframes payFadeIn {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.pay-spinner {
  width: 48px;
  height: 48px;
  margin: 0 auto 16px;
  color: var(--wr-primary);
}

.pay-error-icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: rgba(239, 68, 68, 0.12);
  color: #ef4444;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  margin: 0 auto 16px;
}

.pay-success-icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: rgba(16, 185, 129, 0.12);
  color: #10b981;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  margin: 0 auto 16px;
  animation: payPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

@keyframes payPop {
  from {
    transform: scale(0.5);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.pay-center-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--wr-text-primary);
  margin-bottom: 6px;
}

.pay-center-text {
  font-size: 14px;
  color: var(--wr-text-tertiary);
  line-height: 1.5;
}

.pay-retry {
  margin-top: 16px;
  padding: 10px 20px;
  border-radius: 12px;
  background: var(--wr-btn-subtle-bg);
  border: 1px solid var(--wr-btn-subtle-border);
  color: var(--wr-text-primary);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
}

.pay-retry:hover {
  background: var(--wr-btn-subtle-hover-bg);
}

.pay-progress {
  width: 160px;
  height: 3px;
  border-radius: 2px;
  background: var(--wr-border);
  margin: 16px auto 0;
  overflow: hidden;
}

.pay-progress-bar {
  height: 100%;
  border-radius: 2px;
  background: var(--wr-primary);
  animation: payProgressAnim 2s ease-in-out infinite;
}

@keyframes payProgressAnim {
  0% {
    width: 0%;
    margin-left: 0;
  }
  50% {
    width: 60%;
    margin-left: 20%;
  }
  100% {
    width: 0%;
    margin-left: 100%;
  }
}

/* ===== Container ===== */
.pay-container {
  width: 100%;
  max-width: 440px;
  animation: payFadeIn 0.5s ease both;
}

/* ===== Price section ===== */
.pay-price-section {
  position: relative;
  text-align: center;
  padding: 40px 24px 32px;
  margin-bottom: 8px;
}

.pay-price-glow {
  position: absolute;
  top: 10%;
  left: 50%;
  transform: translateX(-50%);
  width: 200px;
  height: 200px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(248, 0, 91, 0.15) 0%, transparent 70%);
  filter: blur(40px);
  pointer-events: none;
}

.pay-price-inner {
  position: relative;
}

.pay-price-label {
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: var(--wr-text-tertiary);
  margin-bottom: 12px;
}

.pay-price-row {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 14px;
  flex-wrap: wrap;
}

.pay-price-amount {
  font-size: 48px;
  font-weight: 800;
  color: var(--wr-text-primary);
  letter-spacing: -0.03em;
  line-height: 1;
}

.pay-price-old {
  font-size: 24px;
  font-weight: 600;
  color: var(--wr-text-muted);
  text-decoration: line-through;
  text-decoration-color: var(--wr-primary);
  text-decoration-thickness: 2px;
}

.pay-discount {
  display: inline-block;
  margin-top: 12px;
  padding: 5px 14px;
  border-radius: 100px;
  font-size: 13px;
  font-weight: 700;
  background: rgba(248, 0, 91, 0.1);
  color: var(--wr-primary);
  border: 1px solid rgba(248, 0, 91, 0.15);
}

.pay-desc {
  position: relative;
  font-size: 16px;
  font-weight: 600;
  color: var(--wr-text-primary);
  margin-top: 16px;
  line-height: 1.4;
}

.pay-subdesc {
  position: relative;
  font-size: 14px;
  color: var(--wr-text-tertiary);
  margin-top: 4px;
  line-height: 1.5;
}

/* ===== Divider ===== */
.pay-divider {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 4px;
  margin-bottom: 16px;
}

.pay-divider::before,
.pay-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--wr-border);
}

.pay-divider-text {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--wr-text-muted);
  white-space: nowrap;
}

/* ===== Providers ===== */
.pay-providers-loading {
  display: flex;
  justify-content: center;
  padding: 40px 0;
}

.pay-providers-empty {
  text-align: center;
  padding: 32px 16px;
  color: var(--wr-text-tertiary);
  font-size: 14px;
}

.pay-providers-empty i {
  font-size: 24px;
  display: block;
  margin-bottom: 8px;
  opacity: 0.4;
}

.pay-providers {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pay-provider {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 18px;
  border-radius: 16px;
  background: var(--wr-bg-card);
  border: 1px solid var(--wr-border);
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  width: 100%;
}

.pay-provider:hover:not(:disabled) {
  border-color: var(--wr-border-hover);
  background: var(--wr-hover-bg);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.pay-provider:active:not(:disabled) {
  transform: scale(0.99);
}

.pay-provider:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pay-provider--loading {
  border-color: rgba(248, 0, 91, 0.3);
}

.pay-provider-left {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
  flex: 1;
}

.pay-provider-logo {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  overflow: hidden;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pay-provider-logo img {
  width: 44px;
  height: 44px;
  object-fit: contain;
  border-radius: 12px;
}

.pay-provider-logo--fallback {
  color: var(--wr-text-muted);
  font-size: 18px;
  background: var(--wr-input-bg);
}

.pay-provider-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.pay-provider-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--wr-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pay-provider-right {
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.pay-provider-arrow {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: var(--wr-text-secondary);
  background: var(--wr-input-bg);
  border: 1px solid var(--wr-border);
  transition: all 0.2s ease;
}

.pay-provider:hover:not(:disabled) .pay-provider-arrow {
  color: var(--wr-primary);
  background: rgba(248, 0, 91, 0.1);
  transform: translateX(2px);
}

/* ===== Secure ===== */
.pay-secure {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 24px;
  font-size: 12px;
  color: var(--wr-text-muted);
}

.pay-secure i {
  font-size: 11px;
  color: #10b981;
}

/* ===== Mobile ===== */
@media (max-width: 640px) {
  .pay-page {
    padding: 16px 12px;
    align-items: flex-start;
    padding-top: 24px;
  }

  .pay-price-section {
    padding: 28px 16px 24px;
  }

  .pay-price-amount {
    font-size: 40px;
  }

  .pay-price-old {
    font-size: 20px;
  }

  .pay-provider {
    padding: 14px 16px;
  }

  .pay-provider-logo {
    width: 40px;
    height: 40px;
    border-radius: 10px;
  }

  .pay-provider-logo img {
    width: 40px;
    height: 40px;
    border-radius: 10px;
  }

  .pay-provider-arrow {
    width: 30px;
    height: 30px;
    font-size: 12px;
  }
}
</style>
