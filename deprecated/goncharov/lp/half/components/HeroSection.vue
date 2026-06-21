<template>
  <section class="relative overflow-hidden min-h-screen flex items-center">
    <div class="absolute inset-0 z-0">
      <img :src="bgImage" alt="" class="w-full h-full object-cover opacity-[0.12]" />
      <div
        class="absolute inset-0 bg-gradient-to-br from-cream-50/95 via-moss-50/90 to-sage-50/85"
      ></div>
      <div
        class="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-white/40"
      ></div>
    </div>
    <div class="organic-blob top-20 right-10 w-80 h-80 bg-moss-200"></div>
    <div
      class="organic-blob bottom-20 left-10 w-96 h-96 bg-ochre-100"
      style="animation-delay: -5s"
    ></div>
    <div
      class="organic-blob top-1/2 left-1/3 w-64 h-64 bg-sage-100"
      style="animation-delay: -10s"
    ></div>

    <div class="relative z-10 max-w-7xl mx-auto px-5 md:px-8 py-20 md:py-28 w-full">
      <div class="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        <div>
          <div class="animate-on-scroll floating-badge mb-6">
            <i class="fa-solid fa-circle text-[6px] text-sage-400"></i>
            Запись вебинара с врачом и практиком традиционной китайской медицины
          </div>

          <h1
            class="animate-on-scroll delay-1 font-display text-4xl md:text-5xl lg:text-[3.6rem] leading-[1.1] font-bold text-slate-950 mb-6"
            style="letter-spacing: 0.02em"
          >
            Жизнь вполсилы
          </h1>

          <p
            class="animate-on-scroll delay-2 text-lg md:text-xl text-slate-700 leading-relaxed mb-5 max-w-xl"
          >
            Практическая встреча для тех, кто чувствует, что сил стало меньше, а&nbsp;привычные
            усилия уже не&nbsp;дают прежнего результата.
          </p>

          <p
            class="animate-on-scroll delay-3 text-base text-moss-700 leading-relaxed mb-6 max-w-xl border-l-3 border-moss-400/40 pl-5"
          >
            Вы поймёте своё текущее состояние, увидите, почему отдых и&nbsp;дисциплина помогают
            не&nbsp;всегда, и&nbsp;получите ориентиры, с&nbsp;которых начинается возвращение энергии
            и&nbsp;жизни в&nbsp;полную силу.
          </p>

          <div class="animate-on-scroll delay-3 mb-8 max-w-xl">
            <div
              class="flex items-start gap-3 bg-gradient-to-br from-sage-50 to-warm-50 rounded-lg p-4 border border-sage-100"
            >
              <div
                class="flex-shrink-0 w-10 h-10 rounded-full bg-moss-200/60 flex items-center justify-center"
              >
                <i class="fa-solid fa-user-doctor text-moss-600"></i>
              </div>
              <div>
                <p class="font-display text-lg font-semibold text-bark-800 mb-0.5">
                  Алексей Волков
                </p>
                <div class="flex flex-col gap-0.5 text-sm text-sage-700">
                  <span
                    ><i class="fa-solid fa-stethoscope mr-1 text-sage-500"></i>Врач с системным
                    клиническим подходом</span
                  >
                  <span
                    ><i class="fa-solid fa-yin-yang mr-1 text-sage-500"></i>Практик традиционной
                    китайской медицины</span
                  >
                </div>
              </div>
            </div>
          </div>

          <div class="animate-on-scroll delay-4 flex flex-wrap gap-3 mb-8">
            <div
              class="flex items-center gap-2 bg-white/70 backdrop-blur-sm rounded-xl px-4 py-2.5 border border-sage-100"
            >
              <i class="fa-solid fa-circle-play text-sage-500"></i>
              <span class="text-sm font-medium text-bark-800">В записи</span>
            </div>
            <div
              class="flex items-center gap-2 bg-white/70 backdrop-blur-sm rounded-xl px-4 py-2.5 border border-sage-100"
            >
              <i class="fa-regular fa-clock text-sage-500"></i>
              <span class="text-sm font-medium text-bark-800">1 час</span>
            </div>
            <div
              class="flex items-center gap-2 bg-white/70 backdrop-blur-sm rounded-xl px-4 py-2.5 border border-sage-100"
            >
              <i class="fa-regular fa-comments text-sage-500"></i>
              <span class="text-sm font-medium text-bark-800">Вопросы и ответы</span>
            </div>
          </div>

          <div
            class="animate-on-scroll delay-5 flex flex-col sm:flex-row items-start sm:items-center gap-5"
          >
            <button class="cta-btn" @click="$emit('openModal')">
              <span class="relative z-10">Принять участие</span>
            </button>
            <div class="flex items-baseline gap-2">
              <span class="font-display text-3xl font-bold text-slate-800">990 ₽</span>
            </div>
          </div>
        </div>

        <div class="animate-on-scroll animate-scale delay-3 relative">
          <div class="relative mx-auto max-w-md lg:max-w-lg">
            <div
              class="absolute -inset-6 bg-gradient-to-br from-moss-300/30 via-ochre-200/25 to-sage-200/30 rounded-[2.5rem] blur-2xl"
            ></div>
            <div class="relative overflow-hidden rounded-[1.8rem] shadow-2xl shadow-slate-900/15">
              <img
                :src="mainImage"
                alt="Практика традиционной китайской медицины"
                class="w-full object-cover object-[center_25%] aspect-[3/4]"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
defineEmits(['openModal'])

const mainImage = 'https://sel.cdn-chatium.io/thumbnail/image_msk_8sAokEsFbD.853x1280.jpeg/s/800x'
const bgImage = 'https://fs.chatium.ru/thumbnail/image_msk_b9qCTLaPtF.2752x1536.jpeg/s/1200x'
</script>
