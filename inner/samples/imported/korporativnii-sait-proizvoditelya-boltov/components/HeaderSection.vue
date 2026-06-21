<template>
  <header class="bg-white shadow-md fixed w-full top-0 z-50">
    <div class="container mx-auto px-4 py-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <i class="fas fa-bolt text-3xl text-primary"></i>
          <div>
            <h1 class="text-2xl font-bold text-gray-900">БолтПром</h1>
            <p class="text-xs text-gray-600">Производство крепежа</p>
          </div>
        </div>

        <nav class="hidden md:flex items-center space-x-8">
          <a href="#about" class="text-gray-700 hover:text-primary transition">О компании</a>
          <a href="#products" class="text-gray-700 hover:text-primary transition">Продукция</a>
          <a href="#advantages" class="text-gray-700 hover:text-primary transition">Преимущества</a>
          <a href="#contacts" class="text-gray-700 hover:text-primary transition">Контакты</a>
        </nav>

        <button @click="toggleMenu" class="md:hidden text-2xl text-gray-700">
          <i :class="menuOpen ? 'fas fa-times' : 'fas fa-bars'"></i>
        </button>
      </div>

      <div v-if="menuOpen" class="md:hidden mt-4 pb-4 border-t pt-4">
        <nav class="flex flex-col space-y-3">
          <a
            href="#about"
            @click="menuOpen = false"
            class="text-gray-700 hover:text-primary transition"
            >О компании</a
          >
          <a
            href="#products"
            @click="menuOpen = false"
            class="text-gray-700 hover:text-primary transition"
            >Продукция</a
          >
          <a
            href="#advantages"
            @click="menuOpen = false"
            class="text-gray-700 hover:text-primary transition"
            >Преимущества</a
          >
          <a
            href="#contacts"
            @click="menuOpen = false"
            class="text-gray-700 hover:text-primary transition"
            >Контакты</a
          >
        </nav>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref } from 'vue'

const menuOpen = ref(false)

const toggleMenu = () => {
  menuOpen.value = !menuOpen.value
}
</script>
