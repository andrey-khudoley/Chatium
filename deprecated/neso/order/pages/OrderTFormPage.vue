<template>
  <OrderTFormLayout>
    <div class="card">
      <OrderTFormHeader :title="props.pageTitle" />

      <OrderTCurrencySwitcher v-model="selectedCurrency" :currencies="currencies" />

      <form class="order-t-form-content" @submit.prevent="handleSubmit">
        <div class="order-t-form-fields">
          <OrderTTextFields
            :name="form.name"
            :email="form.email"
            :disabled="loading"
            @update:name="form.name = $event"
            @update:email="form.email = $event"
          />
          <OrderTPhoneInput ref="phoneFieldRef" :disabled="loading" />
        </div>

        <OrderTFormAlerts :success="success" :error="error" />

        <OrderTFormSubmit :loading="loading" />
      </form>
    </div>
  </OrderTFormLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import OrderTFormLayout from '../components/orderT/OrderTFormLayout.vue'
import OrderTFormHeader from '../components/orderT/OrderTFormHeader.vue'
import OrderTCurrencySwitcher from '../components/orderT/OrderTCurrencySwitcher.vue'
import OrderTTextFields from '../components/orderT/OrderTTextFields.vue'
import OrderTPhoneInput from '../components/orderT/OrderTPhoneInput.vue'
import OrderTFormAlerts from '../components/orderT/OrderTFormAlerts.vue'
import OrderTFormSubmit from '../components/orderT/OrderTFormSubmit.vue'
import { getOfferId } from '../shared/orderTOfferMap'
import type { OrderTVariant, OrderTCurrency } from '../shared/orderTOfferMap'
import { createOrderRoute } from '../api/order/create'

const props = defineProps<{
  pageVariant: OrderTVariant
  pageTitle: string
}>()

const currencies = ['RUB', 'EUR', 'UAH'] as const
const selectedCurrency = ref<(typeof currencies)[number]>('EUR')

const form = ref({
  name: '',
  email: ''
})

const loading = ref(false)
const success = ref(false)
const error = ref<string | null>(null)

type PhoneFieldExpose = {
  getNumber: () => string
  isValidNumber: () => boolean
  isReady: () => boolean
  clearInput: () => void
}

const phoneFieldRef = ref<PhoneFieldExpose | null>(null)

async function handleSubmit() {
  loading.value = true
  success.value = false
  error.value = null

  try {
    if (!form.value.name.trim()) {
      throw new Error('Пожалуйста, введите ваше имя')
    }
    if (!form.value.email.trim()) {
      throw new Error('Пожалуйста, введите email')
    }
    const phoneApi = phoneFieldRef.value
    if (!phoneApi?.isReady()) {
      throw new Error('Ошибка инициализации поля телефона')
    }
    const phoneNumber = phoneApi.getNumber()
    if (!phoneNumber) {
      throw new Error('Пожалуйста, введите телефон')
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(form.value.email)) {
      throw new Error('Пожалуйста, введите корректный email')
    }
    if (!phoneApi.isValidNumber()) {
      throw new Error('Пожалуйста, введите корректный номер телефона')
    }

    const currency = selectedCurrency.value as OrderTCurrency
    const offerId = getOfferId(props.pageVariant, currency)

    const result = await createOrderRoute.run(ctx, {
      name: form.value.name.trim(),
      email: form.value.email.trim(),
      phone: phoneNumber,
      offerId,
      currency
    })

    if (!result.success) {
      throw new Error(result.error || 'Ошибка создания заказа')
    }

    if (result.paymentUrl) {
      window.location.href = result.paymentUrl
      return
    }

    success.value = true
    setTimeout(() => {
      form.value = { name: '', email: '' }
      phoneFieldRef.value?.clearInput()
      success.value = false
    }, 2000)
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : String(e)
    setTimeout(() => {
      error.value = null
    }, 5000)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.order-t-form-content {
  display: flex;
  flex-direction: column;
}

.order-t-form-fields {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  margin-bottom: 1.25rem;
}

@media (max-width: 640px) {
  .order-t-form-fields {
    gap: 1rem;
  }
}
</style>
