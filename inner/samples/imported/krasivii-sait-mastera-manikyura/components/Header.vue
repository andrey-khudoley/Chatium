<template>
  <header
    class="fixed top-0 left-0 right-0 z-50 bg-white shadow-md transition-all duration-300"
    :class="{ 'py-4': !scrolled, 'py-2': scrolled }"
  >
    <div class="container mx-auto px-4 flex items-center justify-between">
      <div class="flex items-center space-x-2">
        <i class="fas fa-spa text-primary text-2xl"></i>
        <span class="font-serif text-2xl font-bold text-dark">Nail Master</span>
      </div>

      <nav class="hidden md:flex space-x-8">
        <a href="#home" class="text-dark hover:text-primary transition-colors">Главная</a>
        <a href="#services" class="text-dark hover:text-primary transition-colors">Услуги</a>
        <a href="#portfolio" class="text-dark hover:text-primary transition-colors">Портфолио</a>
        <a href="#reviews" class="text-dark hover:text-primary transition-colors">Отзывы</a>
        <a href="#booking" class="text-dark hover:text-primary transition-colors">Запись</a>
      </nav>

      <a href="#booking" class="hidden md:block btn-primary">Записаться</a>

      <button @click="toggleMenu" class="md:hidden text-2xl text-dark">
        <i :class="menuOpen ? 'fas fa-times' : 'fas fa-bars'"></i>
      </button>
    </div>

    <div v-if="menuOpen" class="md:hidden bg-white border-t mt-2">
      <nav class="flex flex-col space-y-4 p-4">
        <a href="#home" @click="toggleMenu" class="text-dark hover:text-primary transition-colors"
          >Главная</a
        >
        <a
          href="#services"
          @click="toggleMenu"
          class="text-dark hover:text-primary transition-colors"
          >Услуги</a
        >
        <a
          href="#portfolio"
          @click="toggleMenu"
          class="text-dark hover:text-primary transition-colors"
          >Портфолио</a
        >
        <a
          href="#reviews"
          @click="toggleMenu"
          class="text-dark hover:text-primary transition-colors"
          >Отзывы</a
        >
        <a href="#booking" @click="toggleMenu" class="btn-primary text-center">Записаться</a>
      </nav>
    </div>
  </header>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const scrolled = ref(false)
const menuOpen = ref(false)

const handleScroll = () => {
  scrolled.value = window.scrollY > 50
}

const toggleMenu = () => {
  menuOpen.value = !menuOpen.value
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>
