<template>
  <div class="min-h-screen flex flex-col relative overflow-hidden" style="background: var(--wr-bg)">
    <header class="glass sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-3 sm:px-6 py-3 flex items-center justify-between">
        <h1 class="font-semibold text-sm sm:text-base truncate wr-text-primary">
          {{ autowebinar.title }}
        </h1>
        <HeaderActions />
      </div>
    </header>

    <div class="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 relative">
      <div class="absolute inset-0 pointer-events-none">
        <div class="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
        <div
          class="absolute bottom-1/4 right-1/4 w-80 h-80 bg-secondary/5 rounded-full blur-3xl"
        ></div>
      </div>

      <div class="relative z-10 text-center max-w-xl w-full">
        <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8">
          <span class="w-2 h-2 rounded-full wr-dot-blue animate-pulse"></span>
          <span class="wr-status-blue text-sm font-medium">Скоро начнётся</span>
        </div>

        <h1 class="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 leading-tight wr-text-primary">
          {{ autowebinar.title }}
        </h1>
        <p
          v-if="autowebinar.description"
          class="text-base sm:text-lg mb-10 leading-relaxed max-w-lg mx-auto wr-text-tertiary"
        >
          {{ autowebinar.description }}
        </p>

        <template v-if="schedule">
          <!-- Countdown -->
          <div class="flex items-center justify-center gap-3 sm:gap-5 mb-10">
            <template v-if="countdown.showDays">
              <div
                class="countdown-box rounded-2xl px-4 sm:px-6 py-4 sm:py-5 min-w-[80px] sm:min-w-[100px] text-center"
              >
                <div class="text-3xl sm:text-4xl font-bold tabular-nums wr-text-primary">
                  {{ countdown.days }}
                </div>
                <div class="text-xs sm:text-sm mt-1 wr-text-tertiary">{{ pluralDays }}</div>
              </div>
              <span class="text-primary text-2xl font-bold opacity-50">:</span>
            </template>
            <div
              class="countdown-box rounded-2xl px-4 sm:px-6 py-4 sm:py-5 min-w-[80px] sm:min-w-[100px] text-center"
            >
              <div class="text-3xl sm:text-4xl font-bold tabular-nums wr-text-primary">
                {{ countdown.hours }}
              </div>
              <div class="text-xs sm:text-sm mt-1 wr-text-tertiary">{{ pluralHours }}</div>
            </div>
            <span class="text-primary text-2xl font-bold opacity-50">:</span>
            <div
              class="countdown-box rounded-2xl px-4 sm:px-6 py-4 sm:py-5 min-w-[80px] sm:min-w-[100px] text-center"
            >
              <div class="text-3xl sm:text-4xl font-bold tabular-nums wr-text-primary">
                {{ countdown.minutes }}
              </div>
              <div class="text-xs sm:text-sm mt-1 wr-text-tertiary">{{ pluralMinutes }}</div>
            </div>
            <span class="text-primary text-2xl font-bold opacity-50">:</span>
            <div
              class="countdown-box rounded-2xl px-4 sm:px-6 py-4 sm:py-5 min-w-[80px] sm:min-w-[100px] text-center"
            >
              <div class="text-3xl sm:text-4xl font-bold tabular-nums wr-text-primary">
                {{ countdown.seconds }}
              </div>
              <div class="text-xs sm:text-sm mt-1 wr-text-tertiary">{{ pluralSeconds }}</div>
            </div>
          </div>

          <p class="text-sm wr-text-tertiary">
            <i class="far fa-calendar-alt mr-1"></i>
            {{ formattedDate }}
          </p>
        </template>

        <template v-else>
          <p class="text-lg wr-text-tertiary">
            Следите за обновлениями — дата эфира будет объявлена
          </p>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import HeaderActions from '../HeaderActions.vue'

const props = defineProps({
  autowebinar: { type: Object, required: true },
  schedule: { type: Object, default: null }
})

const now = ref(Date.now())
let timer = null

onMounted(() => {
  timer = setInterval(() => {
    now.value = Date.now()
  }, 1000)
})
onUnmounted(() => {
  if (timer) clearInterval(timer)
})

function pluralize(n, one, few, many) {
  const abs = Math.abs(n) % 100
  const lastDigit = abs % 10
  if (abs > 10 && abs < 20) return many
  if (lastDigit > 1 && lastDigit < 5) return few
  if (lastDigit === 1) return one
  return many
}

const countdown = computed(() => {
  if (!props.schedule?.scheduledDate)
    return {
      showDays: false,
      days: '00',
      hours: '00',
      minutes: '00',
      seconds: '00',
      daysNum: 0,
      hoursNum: 0,
      minutesNum: 0,
      secondsNum: 0
    }
  const target = new Date(props.schedule.scheduledDate).getTime()
  const diff = Math.max(0, target - now.value)
  const totalSeconds = Math.floor(diff / 1000)
  const totalMinutes = Math.floor(totalSeconds / 60)
  const totalHours = Math.floor(totalMinutes / 60)
  const days = Math.floor(totalHours / 24)
  return {
    showDays: days > 0,
    daysNum: days,
    hoursNum: totalHours % 24,
    minutesNum: totalMinutes % 60,
    secondsNum: totalSeconds % 60,
    days: String(days).padStart(2, '0'),
    hours: String(totalHours % 24).padStart(2, '0'),
    minutes: String(totalMinutes % 60).padStart(2, '0'),
    seconds: String(totalSeconds % 60).padStart(2, '0')
  }
})

const pluralDays = computed(() => pluralize(countdown.value.daysNum, 'день', 'дня', 'дней'))
const pluralHours = computed(() => pluralize(countdown.value.hoursNum, 'час', 'часа', 'часов'))
const pluralMinutes = computed(() =>
  pluralize(countdown.value.minutesNum, 'минута', 'минуты', 'минут')
)
const pluralSeconds = computed(() =>
  pluralize(countdown.value.secondsNum, 'секунда', 'секунды', 'секунд')
)

const formattedDate = computed(() => {
  if (!props.schedule?.scheduledDate) return ''
  return new Date(props.schedule.scheduledDate).toLocaleString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
})
</script>

<style scoped>
.countdown-box {
  background: var(--wr-countdown-bg);
}
</style>
