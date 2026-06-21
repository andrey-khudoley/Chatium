<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white shadow-sm border-b">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <div class="flex items-center">
            <a
              :href="indexPageRoute.url()"
              class="text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors"
            >
              <i class="fas fa-arrow-left mr-2"></i>
              Назад к блогу
            </a>
          </div>
          <div class="flex items-center space-x-4">
            <span class="text-gray-700">{{ ctx.user.displayName }}</span>
            <button @click="signOut" class="text-gray-500 hover:text-red-600 transition-colors">
              <i class="fas fa-sign-out-alt"></i>
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- Content -->
    <main class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="bg-white rounded-lg shadow-sm p-6">
        <h1 class="text-2xl font-bold text-gray-900 mb-6">
          <i class="fas fa-user mr-3"></i>
          Мой профиль
        </h1>

        <!-- Success/Error Messages -->
        <div
          v-if="successMessage"
          class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6"
        >
          <i class="fas fa-check-circle mr-2"></i>
          {{ successMessage }}
        </div>

        <div
          v-if="errorMessage"
          class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6"
        >
          <i class="fas fa-exclamation-circle mr-2"></i>
          {{ errorMessage }}
        </div>

        <!-- Profile Form -->
        <form @submit.prevent="updateProfile" class="space-y-6">
          <!-- Personal Information -->
          <div>
            <h2 class="text-lg font-semibold text-gray-900 mb-4">Личная информация</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2"> Имя </label>
                <input
                  type="text"
                  v-model="form.firstName"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Введите имя"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2"> Фамилия </label>
                <input
                  type="text"
                  v-model="form.lastName"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Введите фамилию"
                />
              </div>
            </div>
          </div>

          <!-- Additional Information -->
          <div>
            <h2 class="text-lg font-semibold text-gray-900 mb-4">Дополнительная информация</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2"> Пол </label>
                <select
                  v-model="form.gender"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Не указан</option>
                  <option value="male">Мужской</option>
                  <option value="female">Женский</option>
                  <option value="other">Другое</option>
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2"> Дата рождения </label>
                <input
                  type="date"
                  v-model="form.birthday"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <!-- System Information (Read-only) -->
          <div>
            <h2 class="text-lg font-semibold text-gray-900 mb-4">Системная информация</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div v-if="ctx.user.confirmedEmail">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Email (подтвержден)
                </label>
                <input
                  type="email"
                  :value="ctx.user.confirmedEmail"
                  readonly
                  class="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-600"
                />
              </div>

              <div v-if="ctx.user.confirmedPhone">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Телефон (подтвержден)
                </label>
                <input
                  type="tel"
                  :value="ctx.user.confirmedPhone"
                  readonly
                  class="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-600"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2"> Роль </label>
                <input
                  type="text"
                  :value="ctx.user.accountRole"
                  readonly
                  class="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-600"
                />
              </div>
            </div>
          </div>

          <!-- Submit Button -->
          <div class="flex justify-end">
            <button
              type="submit"
              :disabled="isLoading"
              class="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <i class="fas fa-save mr-2"></i>
              <span v-if="isLoading">Сохранение...</span>
              <span v-else>Сохранить изменения</span>
            </button>
          </div>
        </form>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { indexPageRoute } from '../index'
import { updateProfileRoute } from '../api/profile'

const form = ref({
  firstName: '',
  lastName: '',
  gender: '',
  birthday: ''
})

const isLoading = ref(false)
const successMessage = ref('')
const errorMessage = ref('')

onMounted(() => {
  // Заполняем форму данными пользователя
  if (ctx.user) {
    form.value.firstName = ctx.user.firstName || ''
    form.value.lastName = ctx.user.lastName || ''
    form.value.gender = ctx.user.gender || ''
    form.value.birthday = ctx.user.birthday || ''
  }
})

async function updateProfile() {
  isLoading.value = true
  successMessage.value = ''
  errorMessage.value = ''

  try {
    const result = await updateProfileRoute.run(ctx, form.value)

    if (result.success) {
      successMessage.value = 'Профиль успешно обновлен!'
      // Обновляем контекст пользователя
      window.location.reload()
    } else {
      errorMessage.value = result.error || 'Произошла ошибка при обновлении профиля'
    }
  } catch (error) {
    console.error('Update profile error:', error)
    errorMessage.value = 'Произошла ошибка при обновлении профиля'
  } finally {
    isLoading.value = false
  }
}

async function signOut() {
  try {
    const response = await fetch('/s/auth/sign-out', {
      method: 'POST'
    })

    if (response.ok) {
      window.location.href = indexPageRoute.url()
    }
  } catch (error) {
    console.error('Sign out error:', error)
  }
}
</script>
