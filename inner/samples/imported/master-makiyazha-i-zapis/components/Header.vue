<template>
  <header class="fixed top-0 w-full bg-white/90 backdrop-blur-lg shadow-sm z-50 transition-all">
    <div class="container mx-auto px-6 py-4">
      <div class="flex items-center justify-between">
        <a href="#" class="text-2xl font-bold font-heading gradient-text">Make-Up Studio</a>

        <button @click="toggleMenu" class="md:hidden text-2xl">
          <i :class="isMenuOpen ? 'fas fa-times' : 'fas fa-bars'"></i>
        </button>

        <nav class="hidden md:flex items-center gap-8">
          <a href="#services" class="text-gray-700 hover:text-primary transition-colors font-medium"
            >Услуги</a
          >
          <a
            href="#portfolio"
            class="text-gray-700 hover:text-primary transition-colors font-medium"
            >Портфолио</a
          >
          <a href="#booking" class="btn-primary text-white px-6 py-2 rounded-full font-semibold">
            Записаться
          </a>
        </nav>
      </div>

      <nav v-if="isMenuOpen" class="md:hidden mt-4 pb-4 space-y-4">
        <a
          href="#services"
          @click="toggleMenu"
          class="block text-gray-700 hover:text-primary transition-colors font-medium"
          >Услуги</a
        >
        <a
          href="#portfolio"
          @click="toggleMenu"
          class="block text-gray-700 hover:text-primary transition-colors font-medium"
          >Портфолио</a
        >
        <a
          href="#booking"
          @click="toggleMenu"
          class="block btn-primary text-white px-6 py-2 rounded-full font-semibold text-center"
        >
          Записаться
        </a>
      </nav>
    </div>
  </header>
</template>

<script setup>
import { ref } from 'vue'

const isMenuOpen = ref(false)

const toggleMenu = () => {
  isMenuOpen.value = !isMenuOpen.value
}
</script>
