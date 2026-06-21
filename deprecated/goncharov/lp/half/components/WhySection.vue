<template>
  <section class="py-20 md:py-28 relative overflow-hidden">
    <div class="absolute inset-0 z-0">
      <img :src="bgImage" alt="" class="w-full h-full object-cover opacity-[0.06]" />
      <div class="absolute inset-0 bg-cream-50/95"></div>
    </div>
    <div class="relative z-10 max-w-4xl mx-auto px-5 md:px-8">
      <div class="text-center mb-10">
        <div class="animate-on-scroll section-divider mb-6"></div>
        <h2
          class="animate-on-scroll delay-1 font-display text-3xl md:text-4xl font-semibold text-bark-800"
        >
          Почему отдых, дисциплина и&nbsp;мотивация помогают не&nbsp;всегда
        </h2>
      </div>

      <div class="animate-on-scroll delay-2 space-y-6 mb-10">
        <p class="text-lg text-bark-700/80 leading-relaxed">
          Мы часто связываем усталость только с&nbsp;нагрузкой и&nbsp;делаем привычный вывод: нужно
          собраться, усилить дисциплину, ещё немного надавить на&nbsp;себя. Но проблема часто
          не&nbsp;в&nbsp;силе воли.
        </p>
        <p class="text-lg text-bark-700/80 leading-relaxed">
          Если организм уже работает в&nbsp;другом режиме, сон, выходные и&nbsp;привычные усилия
          могут давать только частичное восстановление. В этом состоянии человеку важнее понять свой
          уровень энергии, чем пытаться действовать по&nbsp;старой схеме.
        </p>
      </div>

      <div class="animate-on-scroll delay-3 relative">
        <div class="bg-sage-600 text-white rounded-2xl p-7 md:p-10">
          <div class="flex items-start gap-4">
            <i class="fa-solid fa-quote-left text-sage-400/50 text-3xl mt-1 flex-shrink-0"></i>
            <p class="text-lg md:text-xl leading-relaxed font-light">
              Без понимания состояния легко усиливать там, где организму в&nbsp;первую очередь нужна
              пауза и&nbsp;восстановление.
            </p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
const bgImage = 'https://fs.chatium.ru/thumbnail/image_msk_QbxmebJfmY.2528x1696.jpeg/s/1200x'
</script>
