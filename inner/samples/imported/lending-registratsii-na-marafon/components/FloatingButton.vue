<template>
  <div v-show="showButton" class="fixed bottom-6 inset-x-0 mx-auto w-fit z-50 slide-in-up">
    <button
      @click="$emit('open-popup')"
      class="group relative bg-gradient-to-r from-gold via-gold-light to-gold hover:from-gold-dark hover:via-gold hover:to-gold-light text-dark font-bold py-4 px-8 rounded-full shadow-2xl transform transition-all duration-300 hover:scale-110 pulse-gold flex items-center gap-3 text-lg"
    >
      <i class="fas fa-star text-lg"></i>
      <span>Забронировать место!</span>
      <div
        class="absolute -top-2 -right-2 bg-burgundy text-white text-xs font-bold px-3 py-1 rounded-full animate-pulse"
      >
        Бесплатно!
      </div>
    </button>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

defineEmits(['open-popup'])

const showButton = ref(false)

const handleScroll = () => {
  // Показываем кнопку после скрола больше высоты первого экрана
  showButton.value = window.scrollY > window.innerHeight
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll)
  handleScroll() // Проверяем сразу при загрузке
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<style scoped></style>
