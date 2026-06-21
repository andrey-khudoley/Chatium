<template>
  <section class="py-20 md:py-28 bg-white relative overflow-hidden">
    <div class="max-w-5xl mx-auto px-5 md:px-8">
      <div class="text-center mb-14">
        <div class="animate-on-scroll section-divider mb-6"></div>
        <h2
          class="animate-on-scroll delay-1 font-display text-3xl md:text-4xl font-semibold text-bark-800"
        >
          Формат участия
        </h2>
      </div>

      <div class="animate-on-scroll delay-2 max-w-3xl mx-auto">
        <div class="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
          <div
            v-for="(item, i) in formats"
            :key="i"
            class="bg-sage-50 border border-sage-200/50 rounded-2xl p-5 text-center card-hover"
          >
            <i :class="item.icon" class="text-sage-500 text-2xl mb-3"></i>
            <p class="text-bark-800 font-medium text-sm">{{ item.text }}</p>
          </div>
        </div>

        <div class="text-center">
          <div class="mb-4">
            <span class="font-display text-4xl md:text-5xl font-bold text-bark-800">990 ₽</span>
          </div>
          <button class="cta-btn mb-4 text-lg" @click="$emit('openModal')">Хочу на вебинар</button>
          <p class="text-bark-600/60 text-sm">После регистрации вы получите доступ к записи</p>
          <p class="text-bark-600/50 text-xs mt-2">Участвовать можно с телефона или ноутбука</p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
defineEmits(['openModal'])

const formats = [
  { icon: 'fa-regular fa-clock', text: '1 час' },
  { icon: 'fa-solid fa-video', text: 'В записи' },
  { icon: 'fa-regular fa-comments', text: 'Вопросы и ответы' }
]
</script>
