<script setup lang="ts">
import { ref, computed } from 'vue'
import { submitLeadRoute } from '../api/submit'

declare const ctx: app.Ctx

const props = defineProps<{
  pageTitle: string
  apiSubmitUrl: string
}>()

type FieldErrors = {
  phone?: string | null
  telegramUsername?: string | null
  integrationNotes?: string | null
}

type SubmitResponse = {
  success: boolean
  id?: string
  error?: string
  fieldErrors?: FieldErrors
}

const phone = ref('')
const telegramUsername = ref('')
const integrationNotes = ref('')

const isSubmitting = ref(false)
const isDone = ref(false)
const errorMessage = ref<string | null>(null)
const fieldErrors = ref<FieldErrors>({})

const canSubmit = computed(() => {
  return (
    !isSubmitting.value &&
    !isDone.value &&
    phone.value.trim().length > 0 &&
    telegramUsername.value.trim().length > 0 &&
    integrationNotes.value.trim().length > 0
  )
})

const resetForm = () => {
  phone.value = ''
  telegramUsername.value = ''
  integrationNotes.value = ''
  fieldErrors.value = {}
  errorMessage.value = null
  isDone.value = false
}

const onSubmit = async (e: Event) => {
  e.preventDefault()
  if (!canSubmit.value) return

  isSubmitting.value = true
  errorMessage.value = null
  fieldErrors.value = {}

  try {
    const response = (await submitLeadRoute.run(ctx, {
      phone: phone.value.trim(),
      telegramUsername: telegramUsername.value.trim(),
      integrationNotes: integrationNotes.value.trim()
    })) as SubmitResponse

    if (response && response.success) {
      isDone.value = true
    } else {
      errorMessage.value = response?.error || 'Не удалось отправить заявку'
      fieldErrors.value = response?.fieldErrors || {}
    }
  } catch (err) {
    errorMessage.value = 'Сетевая ошибка. Попробуйте ещё раз.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <main class="lp-shell">
    <div class="lp-bg"></div>

    <section class="lp-grid">
      <!-- Левая колонка: маркетинг -->
      <div class="lp-hero">
        <div class="lp-badge">
          <span class="lp-badge-dot"></span>
          <span>Chatium Club · SDK</span>
        </div>
        <h1 class="lp-title">{{ props.pageTitle }}</h1>
        <p class="lp-subtitle">
          Тонкий клиент над <b>Chatium</b> и <b>GetCourse</b> — берите готовый SDK, подключайте свой
          workspace и стройте интеграции без серверной рутины.
        </p>

        <ul class="lp-features">
          <li>
            <span class="lp-feat-icon">⚡</span>
            <div>
              <div class="lp-feat-title">Готовый каркас приложения</div>
              <div class="lp-feat-text">
                Heap-таблицы, роуты, авторизация и логирование «из коробки».
              </div>
            </div>
          </li>
          <li>
            <span class="lp-feat-icon">🔌</span>
            <div>
              <div class="lp-feat-title">Прокладка к gateway</div>
              <div class="lp-feat-text">Один HTTP-вызов до GetCourse через единый шлюз.</div>
            </div>
          </li>
          <li>
            <span class="lp-feat-icon">📊</span>
            <div>
              <div class="lp-feat-title">Логи и метрики</div>
              <div class="lp-feat-text">Серверные/браузерные логи с уровнем, дашборд админки.</div>
            </div>
          </li>
        </ul>
      </div>

      <!-- Правая колонка: форма -->
      <div class="lp-card">
        <form class="lp-form" novalidate @submit="onSubmit">
          <header class="lp-form-head">
            <h2 class="lp-form-title">Получить доступ к&nbsp;SDK</h2>
            <p class="lp-form-sub">Оставьте контакты — пришлём детали и инструкции.</p>
          </header>

          <div v-if="!isDone" class="lp-fields">
            <label class="lp-field">
              <span class="lp-label">Телефон</span>
              <input
                v-model="phone"
                type="tel"
                inputmode="tel"
                autocomplete="tel"
                placeholder="+7 999 123-45-67"
                class="lp-input"
                :class="{ 'lp-input-error': fieldErrors.phone }"
                :disabled="isSubmitting"
              />
              <span v-if="fieldErrors.phone" class="lp-error">{{ fieldErrors.phone }}</span>
            </label>

            <label class="lp-field">
              <span class="lp-label">Telegram username</span>
              <input
                v-model="telegramUsername"
                type="text"
                autocomplete="off"
                placeholder="@username"
                class="lp-input"
                :class="{ 'lp-input-error': fieldErrors.telegramUsername }"
                :disabled="isSubmitting"
              />
              <span v-if="fieldErrors.telegramUsername" class="lp-error">{{
                fieldErrors.telegramUsername
              }}</span>
            </label>

            <label class="lp-field">
              <span class="lp-label">Что хотите интегрировать?</span>
              <textarea
                v-model="integrationNotes"
                rows="4"
                placeholder="Кратко: какой проект, какой stack, какие задачи..."
                class="lp-textarea"
                :class="{ 'lp-input-error': fieldErrors.integrationNotes }"
                :disabled="isSubmitting"
              ></textarea>
              <span v-if="fieldErrors.integrationNotes" class="lp-error">{{
                fieldErrors.integrationNotes
              }}</span>
            </label>

            <button type="submit" class="lp-button" :disabled="!canSubmit">
              <span v-if="!isSubmitting">Отправить заявку</span>
              <span v-else>Отправляем...</span>
            </button>

            <p v-if="errorMessage" class="lp-form-error">{{ errorMessage }}</p>
            <p class="lp-form-note">
              Нажимая кнопку, вы соглашаетесь, что мы&nbsp;свяжемся с&nbsp;вами по&nbsp;указанным
              контактам.
            </p>
          </div>

          <div v-else class="lp-success">
            <div class="lp-success-icon">✓</div>
            <h3 class="lp-success-title">Заявка отправлена</h3>
            <p class="lp-success-text">
              Спасибо! Мы получили заявку и свяжемся с&nbsp;вами в&nbsp;Telegram в&nbsp;ближайшее
              время.
            </p>
            <button type="button" class="lp-button lp-button-secondary" @click="resetForm">
              Отправить ещё одну заявку
            </button>
          </div>
        </form>
      </div>
    </section>

    <footer class="lp-footer">
      <span>© Chatium Club · SDK Landing</span>
      <a :href="props.apiSubmitUrl" class="lp-footer-link" rel="noopener" target="_blank">API</a>
    </footer>
  </main>
</template>

<style>
:root {
  --lp-bg: #0b1020;
  --lp-bg-2: #0e152b;
  --lp-card: #ffffff;
  --lp-text: #0f172a;
  --lp-text-soft: #475569;
  --lp-text-muted: #94a3b8;
  --lp-border: #e2e8f0;
  --lp-border-strong: #cbd5e1;
  --lp-accent: #6366f1;
  --lp-accent-strong: #4f46e5;
  --lp-accent-soft: rgba(99, 102, 241, 0.12);
  --lp-success: #10b981;
  --lp-error: #ef4444;
}

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
  background: var(--lp-bg);
  color: #e2e8f0;
  font-family:
    'Inter',
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    Roboto,
    sans-serif;
  min-height: 100vh;
}

.lp-shell {
  position: relative;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.lp-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
  background: radial-gradient(80% 60% at 15% 10%, rgba(99, 102, 241, 0.35) 0%, transparent 60%),
    radial-gradient(60% 50% at 90% 90%, rgba(236, 72, 153, 0.25) 0%, transparent 60%),
    linear-gradient(180deg, #0b1020 0%, #0e152b 100%);
  pointer-events: none;
}

.lp-bg::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
  background-size: 64px 64px;
  mask-image: radial-gradient(70% 60% at 50% 40%, #000 0%, transparent 80%);
}

.lp-grid {
  position: relative;
  z-index: 1;
  flex: 1 1 auto;
  display: grid;
  grid-template-columns: 1.05fr 1fr;
  gap: 4rem;
  align-items: center;
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
  padding: 5rem 2rem 3rem;
}

.lp-hero {
  color: #e2e8f0;
}

.lp-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.9rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
  border-radius: 999px;
  font-size: 0.8rem;
  letter-spacing: 0.04em;
  color: #c7d2fe;
  margin-bottom: 1.25rem;
}

.lp-badge-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6366f1, #a855f7);
  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.18);
}

.lp-title {
  margin: 0 0 1rem;
  font-size: clamp(2.2rem, 4vw, 3.4rem);
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: -0.02em;
  color: #f8fafc;
}

.lp-subtitle {
  margin: 0 0 2rem;
  font-size: 1.05rem;
  line-height: 1.6;
  color: #cbd5e1;
  max-width: 540px;
}

.lp-subtitle b {
  color: #f8fafc;
}

.lp-features {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 540px;
}

.lp-features li {
  display: flex;
  align-items: flex-start;
  gap: 0.85rem;
  padding: 0.9rem 1rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
  border-radius: 14px;
  backdrop-filter: blur(6px);
}

.lp-feat-icon {
  flex: 0 0 auto;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.35), rgba(168, 85, 247, 0.35));
  font-size: 1.1rem;
}

.lp-feat-title {
  font-weight: 600;
  color: #f8fafc;
  font-size: 0.98rem;
}

.lp-feat-text {
  font-size: 0.88rem;
  color: #94a3b8;
  margin-top: 0.15rem;
  line-height: 1.45;
}

.lp-card {
  background: var(--lp-card);
  border-radius: 22px;
  padding: 2rem;
  box-shadow:
    0 30px 80px rgba(2, 6, 23, 0.45),
    0 12px 24px rgba(2, 6, 23, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.4);
  color: var(--lp-text);
}

.lp-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.lp-form-head {
  margin-bottom: 0.5rem;
}

.lp-form-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--lp-text);
}

.lp-form-sub {
  margin: 0.4rem 0 0;
  font-size: 0.92rem;
  color: var(--lp-text-soft);
}

.lp-fields {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.lp-field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.lp-label {
  font-size: 0.82rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--lp-text-soft);
  text-transform: uppercase;
}

.lp-input,
.lp-textarea {
  font: inherit;
  font-size: 0.98rem;
  color: var(--lp-text);
  background: #f8fafc;
  border: 1px solid var(--lp-border);
  border-radius: 12px;
  padding: 0.75rem 0.9rem;
  outline: none;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease,
    background 0.15s ease;
  width: 100%;
}

.lp-textarea {
  min-height: 110px;
  resize: vertical;
  line-height: 1.5;
  font-family: inherit;
}

.lp-input::placeholder,
.lp-textarea::placeholder {
  color: var(--lp-text-muted);
}

.lp-input:hover,
.lp-textarea:hover {
  border-color: var(--lp-border-strong);
}

.lp-input:focus,
.lp-textarea:focus {
  border-color: var(--lp-accent);
  background: #ffffff;
  box-shadow: 0 0 0 4px var(--lp-accent-soft);
}

.lp-input:disabled,
.lp-textarea:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.lp-input-error,
.lp-input-error:focus {
  border-color: var(--lp-error);
  box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.12);
}

.lp-error {
  color: var(--lp-error);
  font-size: 0.82rem;
  margin-top: 0.1rem;
}

.lp-button {
  margin-top: 0.4rem;
  font: inherit;
  font-weight: 600;
  font-size: 1rem;
  color: #fff;
  background: linear-gradient(135deg, var(--lp-accent) 0%, var(--lp-accent-strong) 100%);
  border: none;
  border-radius: 12px;
  padding: 0.85rem 1rem;
  cursor: pointer;
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease,
    opacity 0.15s ease;
  box-shadow: 0 10px 22px rgba(79, 70, 229, 0.35);
}

.lp-button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 14px 28px rgba(79, 70, 229, 0.4);
}

.lp-button:active:not(:disabled) {
  transform: translateY(0);
}

.lp-button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  box-shadow: none;
}

.lp-button-secondary {
  background: #f1f5f9;
  color: var(--lp-text);
  box-shadow: none;
  margin-top: 1rem;
}

.lp-button-secondary:hover:not(:disabled) {
  background: #e2e8f0;
  box-shadow: none;
}

.lp-form-error {
  margin: 0;
  color: var(--lp-error);
  font-size: 0.9rem;
}

.lp-form-note {
  margin: 0.4rem 0 0;
  color: var(--lp-text-muted);
  font-size: 0.78rem;
  line-height: 1.4;
}

.lp-success {
  text-align: center;
  padding: 1rem 0.5rem;
}

.lp-success-icon {
  width: 56px;
  height: 56px;
  margin: 0 auto 0.75rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #34d399, #10b981);
  color: #ffffff;
  font-size: 1.6rem;
  box-shadow: 0 10px 20px rgba(16, 185, 129, 0.35);
}

.lp-success-title {
  margin: 0 0 0.4rem;
  font-size: 1.25rem;
  color: var(--lp-text);
  font-weight: 700;
}

.lp-success-text {
  margin: 0;
  color: var(--lp-text-soft);
  font-size: 0.95rem;
  line-height: 1.5;
}

.lp-footer {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
  padding: 1.25rem 2rem 1.75rem;
  font-size: 0.82rem;
  color: rgba(226, 232, 240, 0.55);
}

.lp-footer-link {
  color: rgba(199, 210, 254, 0.85);
  text-decoration: none;
  border-bottom: 1px dashed rgba(199, 210, 254, 0.35);
}

.lp-footer-link:hover {
  color: #c7d2fe;
}

@media (max-width: 960px) {
  .lp-grid {
    grid-template-columns: 1fr;
    gap: 2.5rem;
    padding: 3rem 1.25rem 2rem;
  }
  .lp-hero {
    text-align: left;
  }
  .lp-features {
    max-width: none;
  }
}

@media (max-width: 520px) {
  .lp-grid {
    padding: 2rem 1rem 1.5rem;
  }
  .lp-card {
    padding: 1.5rem;
    border-radius: 18px;
  }
  .lp-title {
    font-size: 2rem;
  }
  .lp-subtitle {
    font-size: 0.98rem;
  }
  .lp-footer {
    padding: 1rem 1rem 1.25rem;
  }
}
</style>
