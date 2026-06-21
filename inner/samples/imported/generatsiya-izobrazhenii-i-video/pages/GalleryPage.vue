<template>
  <div
    class="app-container min-h-screen text-white overflow-x-hidden"
    style="background: linear-gradient(180deg, #0a0a0f 0%, #111118 100%)"
  >
    <!-- Animated Background -->
    <div class="fixed inset-0 overflow-hidden pointer-events-none">
      <div
        class="absolute top-0 -left-40 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl animate-blob"
      ></div>
      <div
        class="absolute top-1/3 -right-40 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-blob animation-delay-2000"
      ></div>
      <div
        class="absolute -bottom-40 left-1/3 w-96 h-96 bg-pink-500/15 rounded-full blur-3xl animate-blob animation-delay-4000"
      ></div>
    </div>

    <div class="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <!-- Header -->
      <header class="text-center mb-10 sm:mb-14">
        <div
          class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-6 backdrop-blur-sm"
        >
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span class="text-sm text-gray-400 font-medium tracking-wide">AI Creative Studio</span>
        </div>
        <h1 class="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4 tracking-tight">
          <span
            class="bg-gradient-to-r from-white via-purple-200 to-cyan-200 bg-clip-text text-transparent"
          >
            Генератор медиа
          </span>
        </h1>
        <p class="text-gray-400 text-lg max-w-xl mx-auto">
          Создавайте уникальные изображения и видео с помощью передовых AI-моделей
        </p>
      </header>
    </div>
  </div>
</template>

<script setup>
// Стартовая страница
</script>

<style scoped>
.app-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  box-sizing: border-box;
}
</style>
