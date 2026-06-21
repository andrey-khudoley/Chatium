<template>
  <main class="relative overflow-hidden min-h-screen flex items-center">
    <div class="absolute inset-0 z-0">
      <img :src="bgImage" alt="" class="w-full h-full object-cover opacity-[0.12]" />
      <div
        class="absolute inset-0 bg-gradient-to-br from-cream-50/95 via-moss-50/90 to-sage-50/85"
      ></div>
      <div
        class="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-white/40"
      ></div>
    </div>

    <div class="organic-blob top-24 right-12 w-80 h-80 bg-moss-200"></div>
    <div
      class="organic-blob bottom-16 left-10 w-96 h-96 bg-ochre-100"
      style="animation-delay: -6s"
    ></div>
    <div
      class="organic-blob top-1/2 left-1/3 w-72 h-72 bg-sage-100"
      style="animation-delay: -11s"
    ></div>

    <section class="relative z-10 w-full px-5 md:px-8">
      <div class="max-w-5xl mx-auto">
        <div
          class="bg-white/72 backdrop-blur-xl rounded-[2rem] border border-white/60 shadow-2xl shadow-slate-900/10 p-6 md:p-10 lg:p-14"
        >
          <div class="floating-badge mb-5">
            <i class="fa-solid fa-circle-check text-moss-500"></i>
            Регистрация подтверждена
          </div>

          <h1
            class="font-display text-4xl md:text-5xl lg:text-[3.3rem] leading-[1.08] text-slate-950 mb-4"
            style="letter-spacing: 0.02em"
          >
            Спасибо за регистрацию на вебинар
          </h1>

          <p class="text-lg md:text-xl text-slate-700 leading-relaxed max-w-3xl mb-7">
            Вебинар начнётся <strong class="text-bark-800">28 марта 2026 в 19:00</strong>
            <span class="whitespace-nowrap"> (по Московскому часовому поясу)</span>.
          </p>

          <div class="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
            <div class="rounded-2xl border border-sage-100 bg-white/80 px-4 py-4 text-center">
              <div class="font-display text-3xl md:text-4xl leading-none text-slate-900">
                {{ timer.days }}
              </div>
              <div class="text-xs md:text-sm text-sage-700 mt-1">дней</div>
            </div>
            <div class="rounded-2xl border border-sage-100 bg-white/80 px-4 py-4 text-center">
              <div class="font-display text-3xl md:text-4xl leading-none text-slate-900">
                {{ timer.hours }}
              </div>
              <div class="text-xs md:text-sm text-sage-700 mt-1">часов</div>
            </div>
            <div class="rounded-2xl border border-sage-100 bg-white/80 px-4 py-4 text-center">
              <div class="font-display text-3xl md:text-4xl leading-none text-slate-900">
                {{ timer.minutes }}
              </div>
              <div class="text-xs md:text-sm text-sage-700 mt-1">минут</div>
            </div>
            <div class="rounded-2xl border border-sage-100 bg-white/80 px-4 py-4 text-center">
              <div class="font-display text-3xl md:text-4xl leading-none text-slate-900">
                {{ timer.seconds }}
              </div>
              <div class="text-xs md:text-sm text-sage-700 mt-1">секунд</div>
            </div>
          </div>

          <p class="text-base md:text-lg text-slate-700 mb-5">
            Для того, чтобы получить уведомление и ссылку на вебинар, выберите мессенджер:
          </p>

          <div class="flex flex-col sm:flex-row gap-3 sm:gap-4 max-w-xl">
            <a
              class="cta-btn text-center flex-1"
              href="https://t.me/praktiky_energy_bot?start=web2803"
              target="_blank"
              rel="noopener noreferrer"
              role="button"
            >
              <span class="relative z-10"><i class="fa-brands fa-telegram mr-2"></i>Telegram</span>
            </a>
            <a
              class="cta-btn-outline text-center flex-1 bg-white/75"
              href="https://max.ru/id7536149502_bot?start=web2803"
              target="_blank"
              rel="noopener noreferrer"
              role="button"
            >
              <span><i class="fa-solid fa-comment-dots mr-2"></i>MAX</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'

const WEBINAR_START_UTC_MS = Date.UTC(2026, 2, 28, 16, 0, 0)
const bgImage = 'https://fs.chatium.ru/thumbnail/image_msk_b9qCTLaPtF.2752x1536.jpeg/s/1200x'

const timer = ref({ days: '00', hours: '00', minutes: '00', seconds: '00' })
let timerId = 0

function twoDigits(value) {
  return String(value).padStart(2, '0')
}

function updateTimer() {
  const diffMs = WEBINAR_START_UTC_MS - Date.now()
  if (diffMs <= 0) {
    timer.value = { days: '00', hours: '00', minutes: '00', seconds: '00' }
    return
  }

  const totalSeconds = Math.floor(diffMs / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  timer.value = {
    days: twoDigits(days),
    hours: twoDigits(hours),
    minutes: twoDigits(minutes),
    seconds: twoDigits(seconds)
  }
}

onMounted(() => {
  updateTimer()
  timerId = window.setInterval(updateTimer, 1000)
})

onBeforeUnmount(() => {
  if (timerId) {
    window.clearInterval(timerId)
  }
})
</script>
