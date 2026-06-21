<template>
  <div class="success-page" :class="themeClass">
    <!-- Loading -->
    <div v-if="loading" class="success-center">
      <div class="success-spinner">
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
      <p class="success-center-text">Загрузка...</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="success-center">
      <div class="success-error-icon">
        <i class="fas fa-exclamation"></i>
      </div>
      <h2 class="success-center-title">Ошибка</h2>
      <p class="success-center-text">{{ error }}</p>
    </div>

    <!-- Success -->
    <div v-else class="success-container">
      <div class="success-glow"></div>

      <div class="success-icon">
        <i class="fas fa-check"></i>
      </div>

      <h1 class="success-title">{{ thankYouTitle }}</h1>
      <p class="success-text">{{ thankYouText }}</p>

      <div class="success-actions">
        <a v-if="resultUrl" :href="resultUrl" class="success-button">
          {{ resultButtonText }}
          <i class="fas fa-arrow-right"></i>
        </a>
        <a v-if="episodeUrl" :href="episodeUrl" class="success-button-secondary">
          <i class="fas fa-arrow-left"></i>
          Вернуться к эфиру
        </a>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { apiFormSubmissionByIdRoute } from '../api/forms'
import { episodePageRoute } from '../episode'
import { initThemeWatcher, currentTheme } from '../shared/theme'

const props = defineProps({
  submissionId: { type: String, required: true }
})

const loading = ref(true)
const error = ref('')
const thankYouTitle = ref('Оплата прошла успешно!')
const thankYouText = ref('Ваш платёж успешно обработан. Спасибо за покупку!')
const resultUrl = ref('')
const resultButtonText = ref('Продолжить')
const episodeUrl = ref('')

const themeClass = computed(() => `is-${currentTheme.value}`)

onMounted(async () => {
  initThemeWatcher()
  try {
    const result = await apiFormSubmissionByIdRoute({ id: props.submissionId }).run(ctx)
    const formData = result.form
    const submissionData = result.submission

    if (formData.redirectUrl) {
      resultUrl.value = formData.redirectUrl
      resultButtonText.value = formData.buttonText || 'Продолжить'
    }

    if (submissionData.episodeId) {
      episodeUrl.value = episodePageRoute({ id: submissionData.episodeId }).url()
    } else if (submissionData.autowebinarId) {
      episodeUrl.value = episodePageRoute({ id: submissionData.autowebinarId }).url()
    }

    // Событие успешной оплаты уже записано в formPaymentSuccessRoute (серверный колбек)
    // Здесь ничего не трекаем, чтобы избежать дублирования при обновлении страницы

    loading.value = false
  } catch (e) {
    error.value = e.message
    loading.value = false
  }
})
</script>

<style scoped>
.success-page {
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
.success-center {
  text-align: center;
  max-width: 320px;
  animation: successFadeIn 0.4s ease both;
}

@keyframes successFadeIn {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.success-spinner {
  width: 48px;
  height: 48px;
  margin: 0 auto 16px;
  color: var(--wr-primary);
}

.success-error-icon {
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

.success-center-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--wr-text-primary);
  margin-bottom: 6px;
}

.success-center-text {
  font-size: 14px;
  color: var(--wr-text-tertiary);
  line-height: 1.5;
}

/* ===== Container ===== */
.success-container {
  position: relative;
  text-align: center;
  max-width: 480px;
  padding: 48px 32px;
  animation: successFadeIn 0.5s ease both;
}

.success-glow {
  position: absolute;
  top: 10%;
  left: 50%;
  transform: translateX(-50%);
  width: 250px;
  height: 250px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 70%);
  filter: blur(50px);
  pointer-events: none;
}

.success-icon {
  position: relative;
  width: 88px;
  height: 88px;
  border-radius: 50%;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  margin: 0 auto 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 36px;
  box-shadow: 0 12px 40px rgba(16, 185, 129, 0.35);
  animation: successPop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

@keyframes successPop {
  from {
    opacity: 0;
    transform: scale(0.4);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.success-title {
  position: relative;
  font-size: 32px;
  font-weight: 800;
  color: var(--wr-text-primary);
  margin-bottom: 12px;
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.success-text {
  position: relative;
  font-size: 16px;
  color: var(--wr-text-tertiary);
  line-height: 1.6;
  margin-bottom: 32px;
}

.success-actions {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.success-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 16px 32px;
  border-radius: 16px;
  background: linear-gradient(135deg, var(--wr-primary) 0%, #c7004a 100%);
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  text-decoration: none;
  box-shadow: 0 4px 20px rgba(248, 0, 91, 0.3);
  transition: all 0.2s ease;
}

.success-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 36px rgba(248, 0, 91, 0.4);
  filter: brightness(1.1);
}

.success-button:active {
  transform: translateY(0);
}

.success-button-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 14px 28px;
  border-radius: 16px;
  background: var(--wr-surface);
  color: var(--wr-text-primary);
  font-size: 15px;
  font-weight: 600;
  text-decoration: none;
  border: 1px solid var(--wr-border);
  transition: all 0.2s ease;
}

.success-button-secondary:hover {
  transform: translateY(-2px);
  background: var(--wr-surface-hover);
}

.success-button-secondary:active {
  transform: translateY(0);
}

/* ===== Mobile ===== */
@media (max-width: 640px) {
  .success-container {
    padding: 32px 24px;
  }

  .success-icon {
    width: 72px;
    height: 72px;
    font-size: 30px;
    margin-bottom: 24px;
  }

  .success-title {
    font-size: 26px;
  }

  .success-text {
    font-size: 15px;
  }
}
</style>
