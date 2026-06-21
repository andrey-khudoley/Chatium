<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
    <div class="max-w-7xl mx-auto">
      <!-- Header -->
      <div class="text-center mb-8">
        <h1 class="text-4xl md:text-5xl font-bold text-gray-800 mb-2">
          Производственный календарь 2026
        </h1>
        <p class="text-gray-600">Рабочие дни, выходные и праздники для России</p>
      </div>

      <!-- Statistics -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div class="bg-white rounded-lg shadow-md p-4 text-center">
          <div class="text-3xl font-bold text-gray-800">{{ stats.totalDays }}</div>
          <div class="text-sm text-gray-600">Всего дней</div>
        </div>
        <div class="bg-white rounded-lg shadow-md p-4 text-center">
          <div class="text-3xl font-bold text-green-600">{{ stats.workDays }}</div>
          <div class="text-sm text-gray-600">Рабочих дней</div>
        </div>
        <div class="bg-white rounded-lg shadow-md p-4 text-center">
          <div class="text-3xl font-bold text-blue-600">{{ stats.weekends }}</div>
          <div class="text-sm text-gray-600">Выходных</div>
        </div>
        <div class="bg-white rounded-lg shadow-md p-4 text-center">
          <div class="text-3xl font-bold text-red-600">{{ stats.holidays }}</div>
          <div class="text-sm text-gray-600">Праздничных</div>
        </div>
      </div>

      <!-- Legend -->
      <div class="bg-white rounded-lg shadow-md p-6 mb-8">
        <h3 class="text-lg font-semibold mb-4 text-gray-800">Обозначения:</h3>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 bg-white border-2 border-gray-300 rounded"></div>
            <span class="text-sm text-gray-700">Рабочий день</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 bg-orange-100 border-2 border-orange-300 rounded"></div>
            <span class="text-sm text-gray-700">Выходной</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 bg-red-100 border-2 border-red-400 rounded"></div>
            <span class="text-sm text-gray-700">Праздничный</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 bg-yellow-100 border-2 border-yellow-400 rounded"></div>
            <span class="text-sm text-gray-700">Сокращенный</span>
          </div>
        </div>
      </div>

      <!-- Calendar Grid - максимум 3 месяца в ряд -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div v-for="month in months" :key="month.index" class="bg-white rounded-lg shadow-md p-4">
          <h3 class="text-xl font-bold text-gray-800 mb-4 text-center">{{ month.name }}</h3>

          <!-- Weekday headers -->
          <div class="grid grid-cols-7 gap-1 mb-2">
            <div
              v-for="day in weekDays"
              :key="day"
              class="text-center text-xs font-semibold text-gray-600"
            >
              {{ day }}
            </div>
          </div>

          <!-- Days -->
          <div class="grid grid-cols-7 gap-1">
            <div
              v-for="day in month.days"
              :key="day.key"
              :class="getDayClass(day)"
              class="aspect-square flex items-center justify-center text-sm font-medium rounded transition-all hover:scale-110 cursor-pointer relative"
              :title="getDayTitle(day)"
            >
              <span v-if="day.date">{{ day.date }}</span>
            </div>
          </div>

          <!-- Month statistics -->
          <div
            class="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-600 flex justify-between"
          >
            <span>Рабочих: {{ month.workDaysCount }}</span>
            <span>Выходных: {{ month.weekendsCount }}</span>
          </div>
        </div>
      </div>

      <!-- Footer notes -->
      <div class="mt-8 bg-white rounded-lg shadow-md p-6">
        <h3 class="text-lg font-semibold mb-3 text-gray-800">Примечания:</h3>
        <ul class="text-sm text-gray-600 space-y-2">
          <li>
            • Нерабочие праздничные дни установлены в соответствии с частью первой ст. 112 ТК РФ
          </li>
          <li>
            • Перенос выходных дней: с субботы 3 января на пятницу 9 января, с воскресенья 4 января
            на четверг 31 декабря
          </li>
          <li>• Дополнительные выходные: 9 января, 9 марта, 11 мая, 31 декабря</li>
          <li>• Новогодний отдых 2026: с 31 декабря 2025 по 11 января 2026 (12 дней)</li>
          <li>• Предпраздничные дни (сокращенные на 1 час): 30 апреля, 8 мая, 11 июня, 3 ноября</li>
          <li>
            • Календарь составлен на основании проекта Постановления Правительства РФ "О переносе
            выходных дней в 2026 году"
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

// Праздничные дни 2026 года (согласно ТК РФ)
const holidays = {
  '01-01': 'Новый год',
  '01-02': 'Новогодние каникулы',
  '01-03': 'Новогодние каникулы',
  '01-04': 'Новогодние каникулы',
  '01-05': 'Новогодние каникулы',
  '01-06': 'Новогодние каникулы',
  '01-07': 'Рождество Христово',
  '01-08': 'Новогодние каникулы',
  '02-23': 'День защитника Отечества',
  '03-08': 'Международный женский день',
  '05-01': 'Праздник Весны и Труда',
  '05-09': 'День Победы',
  '06-12': 'День России',
  '11-04': 'День народного единства'
}

// Переносные выходные дни (не являются праздничными)
const extraWeekends = {
  '01-09': 'Перенос выходного дня (с 3 января)',
  '03-09': 'Выходной день',
  '05-11': 'Выходной день',
  '12-31': 'Перенос выходного дня (с 4 января)'
}

// Сокращенные рабочие дни (предпраздничные дни согласно ТК РФ)
const shortenedDays = {
  '04-30': true, // перед Праздником Весны и Труда
  '05-08': true, // перед Днем Победы
  '06-11': true, // перед Днем России
  '11-03': true // перед Днем народного единства
}

const monthNames = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь'
]

function isHoliday(month, date) {
  const key = `${String(month).padStart(2, '0')}-${String(date).padStart(2, '0')}`
  return holidays[key]
}

function isExtraWeekend(month, date) {
  const key = `${String(month).padStart(2, '0')}-${String(date).padStart(2, '0')}`
  return extraWeekends[key]
}

function isShortened(month, date) {
  const key = `${String(month).padStart(2, '0')}-${String(date).padStart(2, '0')}`
  return shortenedDays[key]
}

function generateMonth(monthIndex) {
  const year = 2026
  const firstDay = new Date(year, monthIndex, 1)
  const lastDay = new Date(year, monthIndex + 1, 0)
  const daysInMonth = lastDay.getDate()

  // Get day of week (0 = Sunday, 1 = Monday, etc.)
  let firstDayOfWeek = firstDay.getDay()
  // Convert to Monday = 0, Sunday = 6
  firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1

  const days = []
  let workDaysCount = 0
  let weekendsCount = 0

  // Add empty cells for days before month starts
  for (let i = 0; i < firstDayOfWeek; i++) {
    days.push({ date: null, key: `empty-${i}` })
  }

  // Add all days of the month
  for (let date = 1; date <= daysInMonth; date++) {
    const currentDate = new Date(year, monthIndex, date)
    const dayOfWeek = currentDate.getDay()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    const holiday = isHoliday(monthIndex + 1, date)
    const extraWeekend = isExtraWeekend(monthIndex + 1, date)
    const shortened = isShortened(monthIndex + 1, date)

    // День считается рабочим, если это не выходной, не праздник и не переносной выходной
    const isWorkDay = !isWeekend && !holiday && !extraWeekend

    if (isWorkDay) {
      workDaysCount++
    } else {
      weekendsCount++
    }

    days.push({
      date,
      isWeekend: isWeekend || !!extraWeekend,
      isHoliday: !!holiday,
      holidayName: holiday,
      extraWeekendName: extraWeekend,
      isShortened: shortened && isWorkDay,
      key: `day-${date}`
    })
  }

  return {
    index: monthIndex,
    name: monthNames[monthIndex],
    days,
    workDaysCount,
    weekendsCount
  }
}

const months = computed(() => {
  return Array.from({ length: 12 }, (_, i) => generateMonth(i))
})

const stats = computed(() => {
  let totalDays = 366 // 2026 год - не високосный, но считаем все дни
  let workDays = 0
  let weekends = 0
  let holidays = 0

  months.value.forEach((month) => {
    month.days.forEach((day) => {
      if (day.date) {
        if (day.isHoliday) {
          holidays++
        } else if (day.isWeekend) {
          weekends++
        } else {
          workDays++
        }
      }
    })
  })

  totalDays = workDays + weekends + holidays

  return { totalDays, workDays, weekends, holidays }
})

function getDayClass(day) {
  if (!day.date) return 'invisible'

  if (day.isHoliday) {
    return 'bg-red-100 border-2 border-red-400 text-red-800 font-bold'
  }
  if (day.isWeekend) {
    return 'bg-orange-100 border-2 border-orange-300 text-orange-800'
  }
  if (day.isShortened) {
    return 'bg-yellow-100 border-2 border-yellow-400 text-gray-800 font-semibold'
  }
  return 'bg-white border-2 border-gray-300 text-gray-800 hover:border-gray-400'
}

function getDayTitle(day) {
  if (!day.date) return ''
  if (day.holidayName) return day.holidayName
  if (day.extraWeekendName) return day.extraWeekendName
  if (day.isShortened) return 'Сокращенный рабочий день'
  if (day.isWeekend) return 'Выходной'
  return 'Рабочий день'
}
</script>
