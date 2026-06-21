<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white shadow-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-display font-bold text-dark">Управление записями</h1>
            <p class="text-gray-600 mt-1">Администраторская панель</p>
          </div>
          <a :href="indexPageRoute.url()" class="text-primary hover:text-accent transition-colors">
            <i class="fas fa-home mr-2"></i>На главную
          </a>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Filter Tabs -->
      <div class="bg-white rounded-lg shadow-sm mb-6">
        <div class="flex border-b">
          <button
            v-for="tab in tabs"
            :key="tab.value"
            @click="currentTab = tab.value"
            :class="[
              'px-6 py-4 font-medium transition-colors',
              currentTab === tab.value
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-600 hover:text-gray-900'
            ]"
          >
            {{ tab.label }}
            <span class="ml-2 px-2 py-1 text-xs rounded-full" :class="tab.badgeClass">
              {{ getCountByStatus(tab.value) }}
            </span>
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="bg-white rounded-lg shadow-sm p-8 text-center">
        <i class="fas fa-spinner fa-spin text-4xl text-primary mb-4"></i>
        <p class="text-gray-600">Загрузка записей...</p>
      </div>

      <!-- Bookings List -->
      <div v-else-if="filteredBookings.length > 0" class="space-y-4">
        <div
          v-for="booking in filteredBookings"
          :key="booking.id"
          class="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
        >
          <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <!-- Booking Info -->
            <div class="flex-1">
              <div class="flex items-start justify-between mb-2">
                <h3 class="text-xl font-semibold text-dark">{{ booking.clientName }}</h3>
                <span
                  :class="[
                    'px-3 py-1 rounded-full text-sm font-medium',
                    getStatusClass(booking.status)
                  ]"
                >
                  {{ getStatusLabel(booking.status) }}
                </span>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-gray-600">
                <div class="flex items-center">
                  <i class="fas fa-phone w-5 text-primary"></i>
                  <span class="ml-2">{{ booking.clientPhone }}</span>
                </div>
                <div v-if="booking.clientEmail" class="flex items-center">
                  <i class="fas fa-envelope w-5 text-primary"></i>
                  <span class="ml-2">{{ booking.clientEmail }}</span>
                </div>
                <div class="flex items-center">
                  <i class="fas fa-scissors w-5 text-primary"></i>
                  <span class="ml-2">{{ booking.service }}</span>
                </div>
                <div class="flex items-center">
                  <i class="fas fa-calendar-alt w-5 text-primary"></i>
                  <span class="ml-2">{{ formatDate(booking.date) }} в {{ booking.time }}</span>
                </div>
              </div>

              <div v-if="booking.notes" class="mt-3 text-gray-600">
                <i class="fas fa-comment-dots w-5 text-primary"></i>
                <span class="ml-2">{{ booking.notes }}</span>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex flex-col gap-2 min-w-[140px]">
              <button
                v-if="booking.status === 'pending'"
                @click="confirmBooking(booking)"
                class="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                <i class="fas fa-check mr-2"></i>Подтвердить
              </button>
              <button
                v-if="booking.status !== 'completed' && booking.status !== 'cancelled'"
                @click="openRescheduleModal(booking)"
                class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <i class="fas fa-calendar mr-2"></i>Перенести
              </button>
              <button
                v-if="booking.status !== 'completed' && booking.status !== 'cancelled'"
                @click="cancelBooking(booking)"
                class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                <i class="fas fa-times mr-2"></i>Отменить
              </button>
              <button
                v-if="booking.status === 'confirmed'"
                @click="completeBooking(booking)"
                class="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
              >
                <i class="fas fa-check-circle mr-2"></i>Завершить
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="bg-white rounded-lg shadow-sm p-12 text-center">
        <i class="fas fa-calendar-times text-6xl text-gray-300 mb-4"></i>
        <p class="text-gray-600 text-lg">Записей не найдено</p>
      </div>
    </main>

    <!-- Reschedule Modal -->
    <div
      v-if="showRescheduleModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      @click.self="closeRescheduleModal"
    >
      <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h3 class="text-2xl font-display font-bold text-dark mb-4">Перенести запись</h3>

        <div v-if="selectedBooking" class="mb-4">
          <p class="text-gray-600 mb-2">
            <strong>Клиент:</strong> {{ selectedBooking.clientName }}
          </p>
          <p class="text-gray-600 mb-4">
            <strong>Текущее время:</strong> {{ formatDate(selectedBooking.date) }} в
            {{ selectedBooking.time }}
          </p>

          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Новая дата</label>
              <input
                v-model="newDate"
                type="date"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Новое время</label>
              <input
                v-model="newTime"
                type="time"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <div class="flex gap-3 mt-6">
          <button
            @click="saveReschedule"
            :disabled="!newDate || !newTime"
            class="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Сохранить
          </button>
          <button
            @click="closeRescheduleModal"
            class="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { indexPageRoute } from '../index'
import {
  apiBookingsListRoute,
  apiBookingsUpdateRoute,
  apiBookingsDeleteRoute
} from '../api/bookings'

const loading = ref(true)
const bookings = ref([])
const currentTab = ref('all')
const showRescheduleModal = ref(false)
const selectedBooking = ref(null)
const newDate = ref('')
const newTime = ref('')

const tabs = [
  { label: 'Все записи', value: 'all', badgeClass: 'bg-gray-200 text-gray-700' },
  { label: 'Ожидают подтверждения', value: 'pending', badgeClass: 'bg-yellow-100 text-yellow-700' },
  { label: 'Подтверждены', value: 'confirmed', badgeClass: 'bg-green-100 text-green-700' },
  { label: 'Завершены', value: 'completed', badgeClass: 'bg-blue-100 text-blue-700' },
  { label: 'Отменены', value: 'cancelled', badgeClass: 'bg-red-100 text-red-700' }
]

const filteredBookings = computed(() => {
  if (currentTab.value === 'all') {
    return bookings.value
  }
  return bookings.value.filter((b) => b.status === currentTab.value)
})

const getCountByStatus = (status) => {
  if (status === 'all') return bookings.value.length
  return bookings.value.filter((b) => b.status === status).length
}

const getStatusLabel = (status) => {
  const labels = {
    pending: 'Ожидает',
    confirmed: 'Подтверждена',
    completed: 'Завершена',
    cancelled: 'Отменена'
  }
  return labels[status] || status
}

const getStatusClass = (status) => {
  const classes = {
    pending: 'bg-yellow-100 text-yellow-700',
    confirmed: 'bg-green-100 text-green-700',
    completed: 'bg-blue-100 text-blue-700',
    cancelled: 'bg-red-100 text-red-700'
  }
  return classes[status] || 'bg-gray-100 text-gray-700'
}

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

const loadBookings = async () => {
  loading.value = true
  try {
    const result = await apiBookingsListRoute.run(ctx)
    if (result.success) {
      bookings.value = result.bookings
    }
  } catch (error) {
    console.error('Ошибка загрузки записей:', error)
  } finally {
    loading.value = false
  }
}

const confirmBooking = async (booking) => {
  if (!confirm(`Подтвердить запись для ${booking.clientName}?`)) return

  try {
    await apiBookingsUpdateRoute({ id: booking.id }).run(ctx, {
      status: 'confirmed'
    })
    await loadBookings()
  } catch (error) {
    console.error('Ошибка подтверждения записи:', error)
    alert('Ошибка при подтверждении записи')
  }
}

const completeBooking = async (booking) => {
  if (!confirm(`Отметить запись как завершенную?`)) return

  try {
    await apiBookingsUpdateRoute({ id: booking.id }).run(ctx, {
      status: 'completed'
    })
    await loadBookings()
  } catch (error) {
    console.error('Ошибка завершения записи:', error)
    alert('Ошибка при завершении записи')
  }
}

const cancelBooking = async (booking) => {
  if (!confirm(`Отменить запись для ${booking.clientName}?`)) return

  try {
    await apiBookingsUpdateRoute({ id: booking.id }).run(ctx, {
      status: 'cancelled'
    })
    await loadBookings()
  } catch (error) {
    console.error('Ошибка отмены записи:', error)
    alert('Ошибка при отмене записи')
  }
}

const openRescheduleModal = (booking) => {
  selectedBooking.value = booking
  newDate.value = booking.date.split('T')[0]
  newTime.value = booking.time
  showRescheduleModal.value = true
}

const closeRescheduleModal = () => {
  showRescheduleModal.value = false
  selectedBooking.value = null
  newDate.value = ''
  newTime.value = ''
}

const saveReschedule = async () => {
  if (!selectedBooking.value || !newDate.value || !newTime.value) return

  try {
    await apiBookingsUpdateRoute({ id: selectedBooking.value.id }).run(ctx, {
      date: newDate.value,
      time: newTime.value
    })
    await loadBookings()
    closeRescheduleModal()
  } catch (error) {
    console.error('Ошибка переноса записи:', error)
    alert('Ошибка при переносе записи')
  }
}

onMounted(() => {
  loadBookings()
})
</script>
