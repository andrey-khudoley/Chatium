<template>
  <section class="py-20 md:py-28 relative overflow-hidden">
    <div class="absolute inset-0 z-0">
      <img :src="bgImage" alt="" class="w-full h-full object-cover opacity-[0.05]" />
      <div class="absolute inset-0 bg-cream-50/95"></div>
    </div>
    <div class="relative z-10 max-w-5xl mx-auto px-5 md:px-8">
      <div class="text-center mb-14">
        <div class="animate-on-scroll section-divider mb-6"></div>
        <h2
          class="animate-on-scroll delay-1 font-display text-3xl md:text-4xl font-semibold text-bark-800 mb-4"
        >
          Практические ориентиры, которые вы получите
        </h2>
        <p
          class="animate-on-scroll delay-2 text-lg text-bark-700/70 max-w-2xl mx-auto leading-relaxed"
        >
          На встрече Алексей Волков разберёт несколько базовых направлений, через которые можно
          мягко поддерживать восстановление ресурса.
        </p>
      </div>

      <div class="grid md:grid-cols-3 gap-6">
        <div
          v-for="(item, i) in tips"
          :key="i"
          :class="['animate-on-scroll animate-scale card-hover', 'delay-' + (i + 2)]"
        >
          <div class="bg-white rounded-2xl p-7 h-full border border-sage-100/80 shadow-sm">
            <div class="w-14 h-14 rounded-2xl bg-sage-50 flex items-center justify-center mb-5">
              <i :class="item.icon" class="text-sage-600 text-xl"></i>
            </div>
            <h3 class="font-display text-xl font-semibold text-bark-800 mb-3">{{ item.title }}</h3>
            <p class="text-bark-700/75 leading-relaxed">{{ item.text }}</p>
          </div>
        </div>
      </div>

      <div class="animate-on-scroll delay-6 mt-12 text-center">
        <p class="text-bark-600 text-lg max-w-2xl mx-auto italic">
          Это не&nbsp;жёсткая программа и&nbsp;не&nbsp;универсальный рецепт для всех,
          а&nbsp;ориентиры, которые помогают начать действовать точнее.
        </p>
      </div>
    </div>
  </section>
</template>

<script setup>
const bgImage = 'https://fs.chatium.ru/thumbnail/image_msk_ozaNdBVO44.1280x853.jpeg/s/1200x'

const tips = [
  {
    icon: 'fa-solid fa-moon',
    title: 'Режим',
    text: 'Как выстроить сон и ритм дня так, чтобы организм действительно восстанавливался.'
  },
  {
    icon: 'fa-solid fa-apple-whole',
    title: 'Питание',
    text: 'Какие привычки питания могут постепенно забирать ресурс и как выстроить питание так, чтобы оно поддерживало состояние.'
  },
  {
    icon: 'fa-solid fa-person-walking',
    title: 'Движение',
    text: 'Несколько простых упражнений, которые помогают мягко поддерживать состояние организма и уровень внутренней энергии.'
  }
]
</script>
