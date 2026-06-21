<script setup lang="ts">
import { computed, ref } from 'vue'
import { submitLeadRoute } from '../api/lead/submit'
import { createComponentLogger } from '../shared/logger'

const log = createComponentLogger('LeadForm')

declare const ctx: app.Ctx

type ValidationError = { field: string; message: string }

type SubmitResponse = {
  success: boolean
  leadId?: string
  validationErrors?: ValidationError[]
  error?: { code: string; message: string }
  addUser?: { ok: boolean; errorCode?: string }
  createDeal?: { ok: boolean; errorCode?: string; skipped: boolean }
}

const name = ref('')
const email = ref('')
const phone = ref('')

const fieldErrors = ref<Record<string, string>>({})
const generalError = ref('')
const status = ref<'idle' | 'loading' | 'success' | 'error'>('idle')
const leadId = ref('')

const isLoading = computed(() => status.value === 'loading')
const isSuccess = computed(() => status.value === 'success')

const clearFieldError = (field: string) => {
  if (fieldErrors.value[field]) {
    const next = { ...fieldErrors.value }
    delete next[field]
    fieldErrors.value = next
  }
  if (generalError.value) generalError.value = ''
}

const resetForm = () => {
  name.value = ''
  email.value = ''
  phone.value = ''
  fieldErrors.value = {}
  generalError.value = ''
  status.value = 'idle'
  leadId.value = ''
}

const submit = async () => {
  if (isLoading.value) return
  log.notice('Lead form submit clicked', {
    hasName: !!name.value,
    hasEmail: !!email.value,
    hasPhone: !!phone.value
  })

  const trimmed = {
    name: name.value.trim(),
    email: email.value.trim(),
    phone: phone.value.trim()
  }

  const localErrors: Record<string, string> = {}
  if (!trimmed.name) localErrors.name = 'Имя обязательно'
  else if (trimmed.name.length < 2) localErrors.name = 'Имя слишком короткое'
  if (!trimmed.email) localErrors.email = 'Email обязателен'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed.email))
    localErrors.email = 'Некорректный формат email'
  if (trimmed.phone && !/[+\d]/.test(trimmed.phone))
    localErrors.phone = 'Телефон содержит недопустимые символы'

  if (Object.keys(localErrors).length > 0) {
    fieldErrors.value = localErrors
    generalError.value = ''
    status.value = 'error'
    log.warning('Lead form local validation failed', { fields: Object.keys(localErrors) })
    return
  }

  status.value = 'loading'
  fieldErrors.value = {}
  generalError.value = ''

  try {
    const res = (await submitLeadRoute.run(ctx, {
      name: trimmed.name,
      email: trimmed.email,
      phone: trimmed.phone
    })) as SubmitResponse

    log.info('Lead form server response', {
      success: res?.success,
      hasLeadId: !!res?.leadId,
      validationCount: res?.validationErrors?.length ?? 0,
      errorCode: res?.error?.code ?? null,
      addUserOk: res?.addUser?.ok ?? null
    })

    if (res?.validationErrors && res.validationErrors.length > 0) {
      const next: Record<string, string> = {}
      for (const err of res.validationErrors) {
        if (err && typeof err.field === 'string') next[err.field] = err.message
      }
      fieldErrors.value = next
      status.value = 'error'
      return
    }

    if (res?.success) {
      leadId.value = res.leadId ?? ''
      status.value = 'success'
      return
    }

    generalError.value = res?.error?.message || 'Не удалось отправить заявку. Попробуйте ещё раз.'
    status.value = 'error'
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    log.error('Lead form submit failed', { error: msg })
    generalError.value = 'Ошибка соединения. Проверьте интернет и попробуйте снова.'
    status.value = 'error'
  }
}
</script>

<template>
  <section class="lead-form-section" aria-labelledby="lead-form-title">
    <div class="lead-form-card">
      <div class="lead-form-corner lead-form-corner--tl"></div>
      <div class="lead-form-corner lead-form-corner--tr"></div>
      <div class="lead-form-corner lead-form-corner--bl"></div>
      <div class="lead-form-corner lead-form-corner--br"></div>

      <header class="lead-form-header">
        <span class="lead-form-prompt">&gt;_</span>
        <h2 id="lead-form-title" class="lead-form-title">Оставить заявку</h2>
      </header>
      <p class="lead-form-subtitle">Заполните контакты — мы свяжемся в ближайшее время.</p>

      <template v-if="!isSuccess">
        <form class="lead-form" @submit.prevent="submit" novalidate>
          <div class="lead-form-row">
            <label class="lead-form-label" for="lead-name">
              <span class="lead-form-label-text">Имя</span>
              <span class="lead-form-label-marker">*</span>
            </label>
            <input
              id="lead-name"
              v-model="name"
              type="text"
              class="lead-form-input"
              :class="{ 'lead-form-input--error': fieldErrors.name }"
              placeholder="Как к вам обращаться"
              autocomplete="name"
              :disabled="isLoading"
              @input="clearFieldError('name')"
            />
            <span v-if="fieldErrors.name" class="lead-form-field-error">
              <i class="fas fa-exclamation-triangle"></i>
              {{ fieldErrors.name }}
            </span>
          </div>

          <div class="lead-form-row">
            <label class="lead-form-label" for="lead-email">
              <span class="lead-form-label-text">Email</span>
              <span class="lead-form-label-marker">*</span>
            </label>
            <input
              id="lead-email"
              v-model="email"
              type="email"
              class="lead-form-input"
              :class="{ 'lead-form-input--error': fieldErrors.email }"
              placeholder="you@example.com"
              autocomplete="email"
              :disabled="isLoading"
              @input="clearFieldError('email')"
            />
            <span v-if="fieldErrors.email" class="lead-form-field-error">
              <i class="fas fa-exclamation-triangle"></i>
              {{ fieldErrors.email }}
            </span>
          </div>

          <div class="lead-form-row">
            <label class="lead-form-label" for="lead-phone">
              <span class="lead-form-label-text">Телефон</span>
              <span class="lead-form-label-marker lead-form-label-marker--optional">опц.</span>
            </label>
            <input
              id="lead-phone"
              v-model="phone"
              type="tel"
              class="lead-form-input"
              :class="{ 'lead-form-input--error': fieldErrors.phone }"
              placeholder="+7 900 000-00-00"
              autocomplete="tel"
              :disabled="isLoading"
              @input="clearFieldError('phone')"
            />
            <span v-if="fieldErrors.phone" class="lead-form-field-error">
              <i class="fas fa-exclamation-triangle"></i>
              {{ fieldErrors.phone }}
            </span>
          </div>

          <p v-if="generalError" class="lead-form-general-error">
            <i class="fas fa-circle-exclamation"></i>
            {{ generalError }}
          </p>

          <button type="submit" class="lead-form-submit" :disabled="isLoading">
            <span v-if="isLoading" class="lead-form-submit-spinner">
              <i class="fas fa-circle-notch fa-spin"></i>
              Отправка…
            </span>
            <span v-else class="lead-form-submit-label">
              <i class="fas fa-paper-plane"></i>
              Отправить
            </span>
          </button>
        </form>
      </template>

      <template v-else>
        <div class="lead-form-success">
          <div class="lead-form-success-icon">
            <i class="fas fa-check"></i>
          </div>
          <p class="lead-form-success-title">Заявка принята</p>
          <p class="lead-form-success-text">
            Мы получили ваши контакты<span v-if="leadId"> (ID&nbsp;{{ leadId }})</span> и скоро
            свяжемся.
          </p>
          <button type="button" class="lead-form-reset" @click="resetForm">
            <i class="fas fa-rotate-left"></i>
            Отправить ещё одну
          </button>
        </div>
      </template>
    </div>
  </section>
</template>

<style scoped>
.lead-form-section {
  width: 100%;
  max-width: 520px;
  margin: 0 auto;
  display: flex;
  justify-content: center;
}

.lead-form-card {
  position: relative;
  width: 100%;
  background: rgba(20, 20, 20, 0.85);
  border: 1px solid var(--color-border);
  padding: 1.6rem 1.6rem 1.7rem;
  font-family: 'Share Tech Mono', 'Courier New', monospace;
  color: var(--color-text);
  box-shadow:
    0 14px 40px rgba(0, 0, 0, 0.55),
    inset 0 0 0 1px rgba(255, 255, 255, 0.02);
  clip-path: polygon(
    0 6px,
    6px 6px,
    6px 0,
    calc(100% - 6px) 0,
    calc(100% - 6px) 6px,
    100% 6px,
    100% calc(100% - 6px),
    calc(100% - 6px) calc(100% - 6px),
    calc(100% - 6px) 100%,
    6px 100%,
    6px calc(100% - 6px),
    0 calc(100% - 6px)
  );
}

.lead-form-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.04) 0px,
    rgba(0, 0, 0, 0.04) 1px,
    transparent 1px,
    transparent 3px
  );
  pointer-events: none;
  z-index: 0;
}

.lead-form-corner {
  position: absolute;
  width: 14px;
  height: 14px;
  pointer-events: none;
  z-index: 1;
}

.lead-form-corner--tl {
  top: 6px;
  left: 6px;
  border-top: 2px solid var(--color-accent);
  border-left: 2px solid var(--color-accent);
}
.lead-form-corner--tr {
  top: 6px;
  right: 6px;
  border-top: 2px solid var(--color-accent);
  border-right: 2px solid var(--color-accent);
}
.lead-form-corner--bl {
  bottom: 6px;
  left: 6px;
  border-bottom: 2px solid var(--color-accent);
  border-left: 2px solid var(--color-accent);
}
.lead-form-corner--br {
  bottom: 6px;
  right: 6px;
  border-bottom: 2px solid var(--color-accent);
  border-right: 2px solid var(--color-accent);
}

.lead-form-header {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
  margin-bottom: 0.35rem;
}

.lead-form-prompt {
  color: var(--color-accent);
  font-weight: 700;
  letter-spacing: 0.06em;
  text-shadow: 0 0 6px rgba(211, 35, 75, 0.45);
}

.lead-form-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 400;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--color-text);
  text-shadow: 0 0 6px rgba(232, 232, 232, 0.18);
}

.lead-form-subtitle {
  position: relative;
  z-index: 1;
  margin: 0 0 1.25rem;
  font-size: 0.82rem;
  color: var(--color-text-secondary);
  letter-spacing: 0.04em;
}

.lead-form {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.lead-form-row {
  display: flex;
  flex-direction: column;
  gap: 0.32rem;
}

.lead-form-label {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  font-size: 0.7rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-text-tertiary);
}

.lead-form-label-marker {
  color: var(--color-accent);
  font-weight: 700;
  letter-spacing: 0.05em;
}
.lead-form-label-marker--optional {
  color: var(--color-text-tertiary);
  font-weight: 400;
  text-transform: lowercase;
}

.lead-form-input {
  width: 100%;
  padding: 0.6rem 0.75rem;
  border: 1px solid var(--color-border);
  background: rgba(10, 10, 10, 0.85);
  color: var(--color-text);
  font-family: inherit;
  font-size: 0.92rem;
  letter-spacing: 0.03em;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    background 0.2s ease;
  box-sizing: border-box;
}

.lead-form-input:focus {
  outline: none;
  border-color: var(--color-accent);
  background: rgba(15, 15, 15, 0.95);
  box-shadow:
    0 0 0 1px rgba(211, 35, 75, 0.25),
    0 0 18px rgba(211, 35, 75, 0.12);
}

.lead-form-input::placeholder {
  color: var(--color-text-tertiary);
  letter-spacing: 0.03em;
}

.lead-form-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.lead-form-input--error {
  border-color: rgba(217, 122, 138, 0.7);
  background: rgba(45, 14, 22, 0.55);
}

.lead-form-field-error {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.72rem;
  color: #ecc8cf;
  letter-spacing: 0.04em;
}
.lead-form-field-error i {
  font-size: 0.68rem;
  color: rgba(217, 122, 138, 0.95);
}

.lead-form-general-error {
  margin: 0.1rem 0 0;
  padding: 0.55rem 0.7rem;
  font-size: 0.78rem;
  letter-spacing: 0.03em;
  color: #f1d4da;
  background: rgba(45, 14, 22, 0.55);
  border: 1px solid rgba(217, 122, 138, 0.45);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.lead-form-general-error i {
  color: rgba(217, 122, 138, 0.95);
}

.lead-form-submit {
  margin-top: 0.4rem;
  padding: 0.7rem 1rem;
  border: 1px solid var(--color-accent);
  background: linear-gradient(135deg, rgba(211, 35, 75, 0.18) 0%, rgba(211, 35, 75, 0.32) 100%);
  color: #fff;
  font-family: inherit;
  font-size: 0.86rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  position: relative;
  overflow: hidden;
  clip-path: polygon(
    0 3px,
    3px 3px,
    3px 0,
    calc(100% - 3px) 0,
    calc(100% - 3px) 3px,
    100% 3px,
    100% calc(100% - 3px),
    calc(100% - 3px) calc(100% - 3px),
    calc(100% - 3px) 100%,
    3px 100%,
    3px calc(100% - 3px),
    0 calc(100% - 3px)
  );
}

.lead-form-submit::after {
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.08) 0px,
    rgba(0, 0, 0, 0.08) 1px,
    transparent 1px,
    transparent 2px
  );
  pointer-events: none;
}

.lead-form-submit:hover:not(:disabled) {
  background: linear-gradient(135deg, rgba(211, 35, 75, 0.32) 0%, rgba(230, 57, 95, 0.5) 100%);
  box-shadow:
    0 0 18px rgba(211, 35, 75, 0.35),
    0 6px 14px rgba(0, 0, 0, 0.4);
  transform: translateY(-1px);
}

.lead-form-submit:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: none;
}

.lead-form-submit:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.lead-form-submit-spinner,
.lead-form-submit-label {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  position: relative;
  z-index: 1;
}

.lead-form-submit i {
  font-size: 0.75rem;
}

.lead-form-success {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.6rem;
  padding: 1rem 0.5rem 0.4rem;
}

.lead-form-success-icon {
  width: 3rem;
  height: 3rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(106, 175, 126, 0.25) 0%, rgba(106, 175, 126, 0.45) 100%);
  border: 1px solid rgba(106, 175, 126, 0.6);
  color: #d8f0e0;
  font-size: 1.2rem;
  margin-bottom: 0.35rem;
  clip-path: polygon(
    0 4px,
    4px 4px,
    4px 0,
    calc(100% - 4px) 0,
    calc(100% - 4px) 4px,
    100% 4px,
    100% calc(100% - 4px),
    calc(100% - 4px) calc(100% - 4px),
    calc(100% - 4px) 100%,
    4px 100%,
    4px calc(100% - 4px),
    0 calc(100% - 4px)
  );
}

.lead-form-success-title {
  margin: 0;
  font-size: 1rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--color-text);
}

.lead-form-success-text {
  margin: 0;
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  letter-spacing: 0.03em;
  max-width: 360px;
}

.lead-form-reset {
  margin-top: 0.4rem;
  padding: 0.5rem 0.85rem;
  border: 1px solid var(--color-border);
  background: rgba(10, 10, 10, 0.85);
  color: var(--color-text-secondary);
  font-family: inherit;
  font-size: 0.74rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  transition: all 0.2s ease;
}

.lead-form-reset:hover {
  border-color: var(--color-accent);
  color: var(--color-text);
  background: rgba(20, 20, 20, 0.95);
}

@media (max-width: 480px) {
  .lead-form-card {
    padding: 1.3rem 1.1rem 1.4rem;
  }
  .lead-form-title {
    font-size: 0.95rem;
    letter-spacing: 0.14em;
  }
  .lead-form-subtitle {
    font-size: 0.78rem;
  }
  .lead-form-input {
    font-size: 0.88rem;
  }
}
</style>
