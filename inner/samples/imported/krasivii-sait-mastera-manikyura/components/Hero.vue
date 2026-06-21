<template>
  <section
    id="home"
    class="relative min-h-screen flex items-center justify-center overflow-hidden pt-20"
  >
    <div
      class="absolute inset-0 bg-gradient-to-br from-secondary via-white to-primary opacity-70"
    ></div>

    <div
      class="absolute inset-0"
      style="
        background-image: url('data:image/svg+xml,%3Csvg width=&quot;60&quot; height=&quot;60&quot; viewBox=&quot;0 0 60 60&quot; xmlns=&quot;http://www.w3.org/2000/svg&quot;%3E%3Cg fill=&quot;none&quot; fill-rule=&quot;evenodd&quot;%3E%3Cg fill=&quot;%23C89595&quot; fill-opacity=&quot;0.1&quot;%3E%3Cpath d=&quot;M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z&quot;/%3E%3C/g%3E%3C/g%3E%3C/svg%3E');
      "
    ></div>

    <div class="container mx-auto px-4 relative z-10 text-center">
      <div class="fade-in">
        <i class="fas fa-gem text-6xl text-primary mb-6"></i>
        <h1 class="text-5xl md:text-7xl font-bold mb-6 text-dark">
          Ваши ногти – <br class="md:hidden" />наше искусство
        </h1>
        <p class="text-xl md:text-2xl text-gray-700 mb-8 max-w-2xl mx-auto">
          Профессиональный маникюр и nail-дизайн с заботой о ваших ногтях
        </p>
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <a href="#booking" class="btn-primary">
            <i class="fas fa-calendar-check mr-2"></i>
            Записаться на прием
          </a>
          <a
            href="#portfolio"
            class="bg-white text-primary border-2 border-primary px-8 py-3 rounded-full hover:bg-primary hover:text-white transition-all duration-300 font-medium"
          >
            <i class="fas fa-images mr-2"></i>
            Посмотреть работы
          </a>
        </div>
      </div>

      <div class="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
        <div class="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg hover-lift">
          <i class="fas fa-clock text-4xl text-primary mb-4"></i>
          <h3 class="text-xl font-bold mb-2">Быстро</h3>
          <p class="text-gray-600">Качественный маникюр за 1-2 часа</p>
        </div>
        <div class="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg hover-lift">
          <i class="fas fa-heart text-4xl text-primary mb-4"></i>
          <h3 class="text-xl font-bold mb-2">Бережно</h3>
          <p class="text-gray-600">Забота о здоровье ваших ногтей</p>
        </div>
        <div class="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg hover-lift">
          <i class="fas fa-star text-4xl text-primary mb-4"></i>
          <h3 class="text-xl font-bold mb-2">Красиво</h3>
          <p class="text-gray-600">Современный дизайн и тренды</p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup></script>
