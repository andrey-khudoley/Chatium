<template>
  <div class="order-t-form-field">
    <label
      class="order-t-field-label block text-sm font-semibold mb-2 flex items-center"
      style="color: var(--color-text)"
    >
      <i class="fas fa-user mr-2" style="color: var(--color-text-secondary)"></i>
      Ваше имя
    </label>
    <input
      v-model="nameModel"
      type="text"
      class="input"
      placeholder="Например: Иван"
      required
      :disabled="disabled"
    />
  </div>

  <div class="order-t-form-field">
    <label
      class="order-t-field-label block text-sm font-semibold mb-2 flex items-center"
      style="color: var(--color-text)"
    >
      <i class="fas fa-envelope mr-2" style="color: var(--color-text-secondary)"></i>
      Email
    </label>
    <input
      v-model="emailModel"
      type="email"
      class="input"
      placeholder="Например: ivan@example.com"
      required
      :disabled="disabled"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  name: string
  email: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:name': [value: string]
  'update:email': [value: string]
}>()

const nameModel = computed({
  get: () => props.name,
  set: (v: string) => emit('update:name', v)
})

const emailModel = computed({
  get: () => props.email,
  set: (v: string) => emit('update:email', v)
})
</script>

<style scoped>
.order-t-form-field {
  flex: 1;
  min-width: 0;
}

.order-t-field-label {
  font-family: inherit;
}
</style>
