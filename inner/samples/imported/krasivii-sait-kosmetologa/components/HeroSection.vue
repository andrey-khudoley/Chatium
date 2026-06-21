<template>
  <section
    id="home"
    class="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden"
  >
    <div class="absolute inset-0 bg-gradient-to-br from-light via-white to-secondary/10"></div>

    <div class="absolute inset-0 opacity-10">
      <div
        class="absolute top-20 left-10 w-72 h-72 bg-primary rounded-full filter blur-3xl animate-pulse"
      ></div>
      <div
        class="absolute bottom-20 right-10 w-96 h-96 bg-secondary rounded-full filter blur-3xl animate-pulse"
        style="animation-delay: 1s"
      ></div>
    </div>

    <div class="container mx-auto px-4 relative z-10">
      <div class="text-center max-w-4xl mx-auto">
        <div class="mb-6 inline-block">
          <i class="fas fa-sparkles text-primary text-6xl animate-pulse"></i>
        </div>

        <h1 class="text-5xl md:text-7xl font-bold text-dark mb-6 leading-tight">
          Ваша красота — наша <span class="text-primary">страсть</span>
        </h1>

        <p class="text-xl md:text-2xl text-gray-700 mb-8 leading-relaxed">
          Профессиональная косметология для тех, кто ценит качество и заботу о себе
        </p>

        <div class="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <a href="#contact" class="btn-primary inline-block">
            <i class="fas fa-calendar-check mr-2"></i>
            Записаться на приём
          </a>
          <a href="#services" class="btn-secondary inline-block">
            <i class="fas fa-list-ul mr-2"></i>
            Наши услуги
          </a>
        </div>

        <div class="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div class="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
            <div class="text-4xl font-bold text-primary mb-2">500+</div>
            <div class="text-gray-600">Довольных клиентов</div>
          </div>
          <div class="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
            <div class="text-4xl font-bold text-primary mb-2">5+</div>
            <div class="text-gray-600">Лет опыта</div>
          </div>
          <div class="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
            <div class="text-4xl font-bold text-primary mb-2">100%</div>
            <div class="text-gray-600">Качество процедур</div>
          </div>
        </div>
      </div>
    </div>

    <div class="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
      <a href="#services" class="text-primary text-3xl">
        <i class="fas fa-chevron-down"></i>
      </a>
    </div>
  </section>
</template>

<script setup></script>
