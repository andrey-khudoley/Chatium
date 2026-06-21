<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4"
    >
      <div
        class="absolute inset-0 backdrop-blur-sm"
        style="background: var(--wr-modal-backdrop)"
      ></div>

      <div
        class="relative rounded-t-3xl sm:rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl"
        style="
          background: var(--wr-bg-card);
          border: 1px solid var(--wr-border);
          padding-bottom: max(1.25rem, env(safe-area-inset-bottom));
        "
      >
        <div
          class="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-primary/10 mx-auto mb-3 sm:mb-4 flex items-center justify-center"
        >
          <i class="fas fa-user text-primary text-xl sm:text-2xl"></i>
        </div>

        <h2 class="text-lg sm:text-xl font-bold text-center mb-1.5 sm:mb-2 wr-text-primary">
          Представьтесь, пожалуйста
        </h2>
        <p class="text-xs sm:text-sm text-center mb-5 sm:mb-6 wr-text-tertiary">
          Как к вам обращаться в чате?
        </p>

        <form @submit.prevent="handleSubmit" class="space-y-3 sm:space-y-4">
          <!-- First Name -->
          <div>
            <label class="block text-xs sm:text-sm mb-1.5 wr-text-tertiary">Имя</label>
            <input
              v-model="firstName"
              type="text"
              required
              placeholder="Введите ваше имя"
              class="modal-input w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl transition text-sm sm:text-base"
            />
          </div>

          <!-- Email (optional) -->
          <div>
            <label class="block text-xs sm:text-sm mb-1.5 wr-text-tertiary"
              >Email <span class="wr-text-muted">(необязательно)</span></label
            >
            <input
              v-model="email"
              type="email"
              placeholder="Введите ваш email"
              class="modal-input w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl transition text-sm sm:text-base"
            />
          </div>

          <!-- Error -->
          <div
            v-if="error"
            class="px-3 sm:px-4 py-2.5 sm:py-3 wr-badge-red rounded-xl"
            style="border: 1px solid var(--wr-border)"
          >
            <p class="wr-status-red text-xs sm:text-sm">{{ error }}</p>
          </div>

          <!-- Submit -->
          <button
            type="submit"
            :disabled="loading || !firstName.trim()"
            class="w-full px-6 py-3 min-h-[48px] bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
          >
            <span v-if="loading" class="flex items-center justify-center gap-2">
              <span
                class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"
              ></span>
              <span>Сохранение...</span>
            </span>
            <span v-else>Продолжить</span>
          </button>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue'
import { apiUserUpdateNameRoute } from '../api/episodes'

const props = defineProps({
  show: { type: Boolean, required: true }
})

const emit = defineEmits(['close', 'updated'])

const firstName = ref(ctx.user?.firstName || '')
const email = ref(ctx.user?.confirmedEmail || '')
const loading = ref(false)
const error = ref('')

async function handleSubmit() {
  if (!firstName.value.trim()) {
    error.value = 'Введите имя'
    return
  }

  loading.value = true
  error.value = ''

  try {
    await apiUserUpdateNameRoute.run(ctx, {
      firstName: firstName.value.trim(),
      email: email.value.trim() || undefined
    })

    // ctx.user.firstName = firstName.value.trim()

    localStorage.setItem('userFirstName', firstName.value.trim())

    emit('updated')
    emit('close')
  } catch (e) {
    error.value = e.message || 'Не удалось сохранить имя'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.modal-input {
  background: var(--wr-input-bg);
  border: 1px solid var(--wr-input-border);
  color: var(--wr-text-primary);
}
.modal-input::placeholder {
  color: var(--wr-text-muted);
}
.modal-input:focus {
  outline: none;
  border-color: rgba(248, 0, 91, 0.5);
  background: var(--wr-input-focus-bg);
}
</style>
