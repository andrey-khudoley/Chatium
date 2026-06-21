<template>
  <Teleport to="body">
    <div class="modal-overlay" :class="{ active: isOpen }" @click.self="close">
      <div class="modal-content-glass">
        <div class="flex justify-between items-center mb-6">
          <h3
            class="font-display text-2xl lg:text-3xl font-bold text-slate-900"
            style="letter-spacing: 0.015em"
          >
            Регистрация на встречу
          </h3>
          <button
            @click="close"
            class="w-10 h-10 rounded-full bg-moss-100 flex items-center justify-center hover:bg-moss-200 transition-all duration-300 hover:scale-110"
          >
            <i class="fa-solid fa-xmark text-moss-700 text-sm"></i>
          </button>
        </div>

        <div v-if="!submitted">
          <p class="text-slate-600 mb-7 text-sm font-medium">28 марта · Онлайн · 1 час · 990 ₽</p>

          <form @submit.prevent="handleSubmit" class="space-y-5">
            <div>
              <input
                v-model="form.name"
                type="text"
                placeholder="Ваше имя"
                required
                class="input-field-glass"
              />
            </div>
            <div>
              <input
                v-model="form.email"
                type="email"
                placeholder="Email"
                required
                class="input-field-glass"
              />
            </div>
            <div>
              <input
                v-model="form.phone"
                type="tel"
                placeholder="Телефон (необязательно)"
                class="input-field-glass"
              />
            </div>
            <div class="space-y-3 pt-1">
              <label class="consent-item">
                <input v-model="consents.offerAccepted" type="checkbox" class="consent-checkbox" />
                <span class="text-sm text-slate-700 leading-snug">
                  Я согласен с
                  <a
                    href="https://gc.praktiky.ru/legal"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="consent-link"
                    >офертой</a
                  >
                </span>
              </label>
              <label class="consent-item">
                <input
                  v-model="consents.privacyAccepted"
                  type="checkbox"
                  class="consent-checkbox"
                />
                <span class="text-sm text-slate-700 leading-snug">
                  Я согласен с
                  <a
                    href="https://gc.praktiky.ru/privacypolicy"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="consent-link"
                    >политикой обработки персональных данных</a
                  >
                </span>
              </label>
              <label class="consent-item">
                <input
                  v-model="consents.marketingAccepted"
                  type="checkbox"
                  class="consent-checkbox"
                />
                <span class="text-sm text-slate-700 leading-snug"
                  >Я согласен на получение рекламных и маркетинговых рассылок</span
                >
              </label>
            </div>
            <button
              type="submit"
              class="cta-btn w-full text-center"
              :class="{ 'opacity-60 cursor-not-allowed': loading || !isConsentsAccepted }"
              :disabled="loading || !isConsentsAccepted"
            >
              <span v-if="!loading" class="relative z-10">Зарегистрироваться</span>
              <span v-else class="flex items-center justify-center gap-2 relative z-10">
                <i class="fa-solid fa-spinner fa-spin"></i> Отправка...
              </span>
            </button>
          </form>

          <p v-if="error" class="mt-4 text-red-500 text-sm text-center">{{ error }}</p>
        </div>

        <div v-else class="text-center py-8">
          <div
            class="w-20 h-20 rounded-full bg-gradient-to-br from-moss-100 to-moss-200 flex items-center justify-center mx-auto mb-6 shadow-lg"
          >
            <i class="fa-solid fa-check text-moss-600 text-3xl"></i>
          </div>
          <h4
            class="font-display text-2xl lg:text-3xl font-bold text-slate-900 mb-4"
            style="letter-spacing: 0.015em"
          >
            Вы зарегистрированы!
          </h4>
          <p class="text-slate-600 leading-relaxed text-lg">
            Информация для подключения придёт на&nbsp;указанный email. До&nbsp;встречи 28 марта!
          </p>
          <button @click="close" class="cta-btn-outline mt-8">Закрыть</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { apiRegisterRoute } from '../api/register'

const props = defineProps({ isOpen: Boolean })
const emit = defineEmits(['close'])

const form = ref({ name: '', email: '', phone: '' })
const consents = ref({
  offerAccepted: false,
  privacyAccepted: false,
  marketingAccepted: false
})
const loading = ref(false)
const error = ref('')
const submitted = ref(false)
const isConsentsAccepted = computed(
  () =>
    consents.value.offerAccepted &&
    consents.value.privacyAccepted &&
    consents.value.marketingAccepted
)

function close() {
  emit('close')
  if (submitted.value) {
    setTimeout(() => {
      submitted.value = false
      form.value = { name: '', email: '', phone: '' }
      error.value = ''
    }, 300)
  }
}

function getUtm() {
  try {
    const params = new URLSearchParams(window.location.search)
    return {
      utmSource: params.get('utm_source') || '',
      utmMedium: params.get('utm_medium') || '',
      utmCampaign: params.get('utm_campaign') || '',
      utmContent: params.get('utm_content') || '',
      utmTerm: params.get('utm_term') || ''
    }
  } catch {
    return {
      utmSource: '',
      utmMedium: '',
      utmCampaign: '',
      utmContent: '',
      utmTerm: ''
    }
  }
}

async function handleSubmit() {
  if (!isConsentsAccepted.value) {
    error.value = 'Подтвердите все согласия перед отправкой формы.'
    return
  }

  loading.value = true
  error.value = ''
  try {
    const utm = getUtm()
    const clrtUid = typeof window !== 'undefined' ? window.clrtUid : undefined
    const result = await apiRegisterRoute.run(ctx, {
      ...form.value,
      ...utm,
      clrtUid
    })

    if (result && !result.success && result.error) {
      error.value = result.error
      loading.value = false
      return
    }

    // Если есть ссылка на оплату, перенаправляем на неё
    if (result && result.paymentUrl) {
      if (typeof window !== 'undefined' && window.clrtTrack) {
        window.clrtTrack({
          url: 'event://custom/liveahalf/redirect-to-payment',
          action: 'redirect_to_payment',
          action_param1: 'webinar_liveahalf',
          action_param2: result.paymentUrl
        })
      }

      // Перенаправляем на страницу оплаты
      if (typeof window !== 'undefined') {
        window.location.href = result.paymentUrl
      }
      return
    }

    // Если ссылки нет (бесплатная регистрация), показываем сообщение об успехе
    submitted.value = true

    if (typeof window !== 'undefined' && window.clrtTrack) {
      window.clrtTrack({
        url: 'event://custom/liveahalf/registration-complete',
        action: 'registration_complete',
        action_param1: 'webinar_liveahalf'
      })
    }
  } catch (e) {
    error.value = e?.message || 'Произошла ошибка. Попробуйте ещё раз.'
  } finally {
    loading.value = false
  }
}

watch(
  () => props.isOpen,
  (val) => {
    if (typeof document !== 'undefined') {
      document.body.style.overflow = val ? 'hidden' : ''
    }
  }
)
</script>

<style scoped>
.modal-content-glass {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 28px;
  padding: 40px;
  max-width: 500px;
  width: 90%;
  transform: scale(0.9) translateY(20px);
  transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow:
    0 30px 80px rgba(44, 48, 56, 0.2),
    0 0 0 1px rgba(255, 255, 255, 0.5) inset;
  border: 1.5px solid rgba(168, 188, 160, 0.2);
}
.modal-overlay.active .modal-content-glass {
  transform: scale(1) translateY(0);
}

.input-field-glass {
  width: 100%;
  padding: 15px 20px;
  border: 2px solid rgba(168, 188, 160, 0.25);
  border-radius: 14px;
  font-size: 16px;
  font-family: 'Source Sans 3', sans-serif;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(10px);
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  outline: none;
  color: #2c3038;
}
.input-field-glass:focus {
  border-color: #7f9b76;
  box-shadow: 0 0 0 4px rgba(127, 155, 118, 0.15);
  background: rgba(255, 255, 255, 0.95);
  transform: translateY(-1px);
}
.input-field-glass::placeholder {
  color: #a8bca0;
}

.consent-item {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.consent-checkbox {
  margin-top: 2px;
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  accent-color: #7f9b76;
}

.consent-link {
  color: #4f6a4a;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.consent-link:hover {
  color: #2f4532;
}

@media (max-width: 768px) {
  .modal-content-glass {
    padding: 32px 24px;
    margin: 16px;
    border-radius: 24px;
  }
}
</style>
