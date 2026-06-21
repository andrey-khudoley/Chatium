<template>
  <header class="fixed top-0 left-0 right-0 bg-dark shadow-md z-50">
    <div class="container mx-auto px-4 py-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-2">
          <i class="fas fa-spa text-primary text-2xl"></i>
          <span class="text-2xl font-bold text-white font-serif">Beauty Studio</span>
        </div>

        <nav class="hidden md:flex items-center space-x-8">
          <a
            href="#home"
            class="text-white hover:text-primary transition-colors duration-200 font-medium"
            >Главная</a
          >
          <a
            href="#services"
            class="text-white hover:text-primary transition-colors duration-200 font-medium"
            >Услуги</a
          >
          <a
            href="#about"
            class="text-white hover:text-primary transition-colors duration-200 font-medium"
            >О нас</a
          >
          <a
            href="#gallery"
            class="text-white hover:text-primary transition-colors duration-200 font-medium"
            >Галерея</a
          >
          <a
            href="#contact"
            class="text-white hover:text-primary transition-colors duration-200 font-medium"
            >Контакты</a
          >
        </nav>

        <button @click="toggleMenu" class="md:hidden text-white text-2xl">
          <i :class="menuOpen ? 'fas fa-times' : 'fas fa-bars'"></i>
        </button>
      </div>

      <nav v-if="menuOpen" class="md:hidden mt-4 pb-4 flex flex-col space-y-4">
        <a
          href="#home"
          @click="closeMenu"
          class="text-white hover:text-primary transition-colors duration-200 font-medium"
          >Главная</a
        >
        <a
          href="#services"
          @click="closeMenu"
          class="text-white hover:text-primary transition-colors duration-200 font-medium"
          >Услуги</a
        >
        <a
          href="#about"
          @click="closeMenu"
          class="text-white hover:text-primary transition-colors duration-200 font-medium"
          >О нас</a
        >
        <a
          href="#gallery"
          @click="closeMenu"
          class="text-white hover:text-primary transition-colors duration-200 font-medium"
          >Галерея</a
        >
        <a
          href="#contact"
          @click="closeMenu"
          class="text-white hover:text-primary transition-colors duration-200 font-medium"
          >Контакты</a
        >
      </nav>
    </div>
  </header>
</template>

<script setup>
import { ref } from 'vue'

const menuOpen = ref(false)

const toggleMenu = () => {
  menuOpen.value = !menuOpen.value
}

const closeMenu = () => {
  menuOpen.value = false
}
</script>
