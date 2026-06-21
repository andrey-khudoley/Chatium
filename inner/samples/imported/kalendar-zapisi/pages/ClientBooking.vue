<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
    <div class="max-w-6xl mx-auto">
      <div class="bg-white rounded-lg shadow-lg p-8">
        <h1 class="text-3xl font-bold text-gray-800 mb-2">
          {{ calendarSettings?.title || 'Запись на встречу' }}
        </h1>
        <p class="text-gray-600 mb-6">Выберите удобное для вас время</p>

        <div
          v-if="calendarSettings && !calendarSettings.isActive"
          class="p-4 bg-red-50 border border-red-200 rounded-lg"
        >
          <p class="text-red-800 font-medium">Запись на встречу закрыта</p>
          <p class="text-red-700 text-sm">
            В данный момент записи на встречу недоступны. Пожалуйста, свяжитесь с нами позже.
          </p>
        </div>

        <div v-else-if="!selectedSlot && !submitted">
          <!-- Schedule Grid -->
          <div v-if="schedule && Object.keys(schedule).length > 0" class="mb-8">
            <div class="flex gap-2 mb-4">
              <button
                @click="scrollWeek(-1)"
                :disabled="weekOffset <= 0"
                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
              >
                ← Назад
              </button>
              <button
                @click="scrollWeek(1)"
                :disabled="weekOffset >= maxWeekOffset"
                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
              >
                Вперед →
              </button>
            </div>

            <div class="overflow-x-auto">
              <div class="flex gap-1 min-w-max">
                <!-- Time Column -->
                <div class="flex-shrink-0">
                  <div class="h-12 flex items-end px-2 font-semibold text-gray-700 text-sm">
                    Время
                  </div>
                  <div
                    v-for="time in allTimes"
                    :key="time"
                    class="h-12 flex items-center px-2 border-b border-gray-200 text-xs font-medium text-gray-600"
                  >
                    {{ time }}
                  </div>
                </div>

                <!-- Day Columns -->
                <div v-for="date in visibleDates" :key="date" class="flex-shrink-0">
                  <div class="w-32">
                    <!-- Day Header -->
                    <div
                      class="h-12 flex flex-col items-center justify-center px-2 font-semibold text-gray-800 text-xs bg-gray-50 border-b-2 border-gray-300"
                    >
                      <div>{{ formatDayName(date) }}</div>
                      <div class="text-gray-600">{{ formatDateShort(date) }}</div>
                    </div>

                    <!-- Time Slots -->
                    <div v-if="schedule[date]">
                      <button
                        v-for="slot in schedule[date]"
                        :key="`${date}-${slot.time}`"
                        @click="selectSlot(date, slot.time)"
                        :disabled="!slot.available"
                        class="w-full h-12 px-2 py-1 text-xs font-medium border border-gray-200 transition-colors"
                        :class="{
                          'bg-green-100 text-green-800 hover:bg-green-200 cursor-pointer':
                            slot.available,
                          'bg-red-100 text-red-800 cursor-not-allowed':
                            !slot.available && slot.booked,
                          'bg-gray-100 text-gray-400 cursor-not-allowed':
                            !slot.available && !slot.booked
                        }"
                      >
                        {{
                          slot.available ? '✓ Свободно' : slot.booked ? '✗ Занято' : 'Недоступно'
                        }}
                      </button>
                    </div>
                    <div v-else class="p-4 text-gray-500 text-xs text-center">Выходной</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-if="loading" class="text-center py-8">
            <p class="text-gray-500">Загрузка расписания...</p>
          </div>
        </div>

        <!-- Contact Form -->
        <div v-if="selectedSlot && !submitted" class="space-y-4 max-w-lg">
          <div class="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p class="text-sm text-gray-700">
              <strong>Дата:</strong> {{ formatDate(selectedSlot.date) }}<br />
              <strong>Время:</strong> {{ selectedSlot.time }}
            </p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Ваше имя *</label>
            <input
              v-model="form.name"
              type="text"
              placeholder="Введите ваше имя"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Телеграм</label>
            <input
              v-model="form.telegramId"
              type="text"
              placeholder="@username"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Почта</label>
            <input
              v-model="form.email"
              type="email"
              placeholder="your@email.com (опционально)"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Комментарий</label>
            <textarea
              v-model="form.comments"
              placeholder=""
              rows="3"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            ></textarea>
          </div>

          <div
            v-if="error"
            class="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"
          >
            {{ error }}
          </div>

          <div class="flex gap-2">
            <button
              @click="submitForm"
              :disabled="submitting"
              class="flex-1 py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
            >
              {{ submitting ? 'Записание...' : 'Подтвердить запись' }}
            </button>
            <button
              @click="cancelSelection"
              class="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Назад
            </button>
          </div>
        </div>

        <!-- Success Message -->
        <div v-if="submitted" class="text-center">
          <div class="text-5xl mb-4">✓</div>
          <h2 class="text-2xl font-bold text-gray-800 mb-2">Запись подтверждена!</h2>
          <p class="text-gray-600 mb-4">Спасибо! До встречи.</p>
          <button
            @click="resetForm"
            class="py-2 px-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Сделать новую запись
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import {
  apiCalendarSettingsRoute,
  apiScheduleRoute,
  apiCreateAppointmentRoute
} from '../api/appointments'
import { getMoscowDateString, getMoscowNow } from '../shared/timeUtils'

const selectedSlot = ref(null)
const schedule = ref({})
const loading = ref(false)
const submitting = ref(false)
const submitted = ref(false)
const error = ref('')
const calendarSettings = ref(null)
const weekOffset = ref(0)

const maxWeekOffset = computed(() => {
  if (!calendarSettings.value) return 0
  const maxDays = calendarSettings.value.maxDaysAhead || 30
  return Math.ceil(maxDays / 7) - 1
})

const form = ref({
  name: '',
  telegramId: '',
  email: '',
  comments: ''
})

const allTimes = computed(() => {
  if (!calendarSettings.value) return []
  const times = []
  const [startHour, startMin] = calendarSettings.value.workStartTime.split(':').map(Number)
  const [endHour, endMin] = calendarSettings.value.workEndTime.split(':').map(Number)
  const duration = calendarSettings.value.slotDurationMinutes

  let hour = startHour
  let min = startMin

  while (hour < endHour || (hour === endHour && min < endMin)) {
    times.push(`${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`)
    min += duration
    if (min >= 60) {
      hour += Math.floor(min / 60)
      min = min % 60
    }
  }

  return times
})

const visibleDates = computed(() => {
  const dates = []
  const startDate = new Date(getMoscowDateString())
  startDate.setDate(startDate.getDate() + weekOffset.value * 7)

  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate)
    date.setDate(date.getDate() + i)
    const dateStr = date.toISOString().split('T')[0]

    if (schedule.value[dateStr] !== undefined) {
      dates.push(dateStr)
    }
  }

  return dates
})

onMounted(async () => {
  try {
    const settings = await apiCalendarSettingsRoute.run(ctx)
    calendarSettings.value = settings
    if (settings && settings.isActive) {
      await loadSchedule()
    }
  } catch (err) {
    console.error('Error loading settings:', err)
  }
})

async function loadSchedule() {
  if (!calendarSettings.value) return

  loading.value = true
  error.value = ''

  try {
    const startDate = new Date(getMoscowDateString())
    startDate.setDate(startDate.getDate() + weekOffset.value * 7)
    const startDateStr = startDate.toISOString().split('T')[0]

    const data = await apiScheduleRoute.run(ctx, {
      startDate: startDateStr,
      days: 14
    })

    if (data.schedule) {
      schedule.value = data.schedule
    }
  } catch (err) {
    console.error('Error loading schedule:', err)
    error.value = 'Ошибка загрузки расписания'
  } finally {
    loading.value = false
  }
}

function scrollWeek(direction) {
  weekOffset.value += direction
  loadSchedule()
}

function selectSlot(date, time) {
  selectedSlot.value = { date, time }
  error.value = ''
}

async function submitForm() {
  if (!form.value.name) {
    error.value = 'Пожалуйста, заполните все обязательные поля'
    return
  }

  submitting.value = true
  error.value = ''

  try {
    const data = await apiCreateAppointmentRoute.run(ctx, {
      name: form.value.name,
      telegramId: form.value.telegramId,
      email: form.value.email || '',
      comments: form.value.comments || '',
      appointmentDate: selectedSlot.value.date,
      appointmentTime: selectedSlot.value.time
    })
    if (data.success) {
      submitted.value = true
    } else {
      error.value = data.error || 'Ошибка при создании записи'
    }
  } catch (err) {
    console.error('Error creating appointment:', err)
    error.value = 'Ошибка при создании записи'
  } finally {
    submitting.value = false
  }
}

function cancelSelection() {
  selectedSlot.value = null
  error.value = ''
}

function resetForm() {
  selectedSlot.value = null
  submitted.value = false
  form.value = {
    name: '',
    telegramId: '',
    email: '',
    comments: ''
  }
  weekOffset.value = 0
  loadSchedule()
}

function formatDate(dateStr) {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  })
}

function formatDayName(dateStr) {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('ru-RU', { weekday: 'short' }).toUpperCase()
}

function formatDateShort(dateStr) {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('ru-RU', { month: 'numeric', day: 'numeric' })
}

function formatDuration(minutes) {
  if (minutes < 60) {
    return `${minutes}мин`
  }
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (mins === 0) {
    return `${hours}ч`
  }
  return `${hours}ч ${mins}мин`
}
</script>

<style scoped>
input::-webkit-calendar-picker-indicator {
  cursor: pointer;
}
</style>
