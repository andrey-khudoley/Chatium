<template>
  <section
    class="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-accent via-light to-white"
  >
    <div class="absolute inset-0 opacity-10">
      <div class="absolute top-20 left-20 w-72 h-72 bg-primary rounded-full filter blur-3xl"></div>
      <div
        class="absolute bottom-20 right-20 w-96 h-96 bg-secondary rounded-full filter blur-3xl"
      ></div>
    </div>

    <div class="container mx-auto px-6 py-20 relative z-10">
      <div class="grid md:grid-cols-2 gap-12 items-center">
        <div class="fade-in">
          <h1 class="text-5xl md:text-7xl font-bold font-heading mb-6 leading-tight">
            Искусство<br />
            <span class="gradient-text">Красоты</span>
          </h1>
          <p class="text-xl text-gray-600 mb-8 leading-relaxed">
            Профессиональный макияж для особенных моментов вашей жизни. Более 7 лет опыта и сотни
            довольных клиентов.
          </p>
          <div class="flex flex-wrap gap-4">
            <a
              href="#booking"
              class="btn-primary text-white px-8 py-4 rounded-full font-semibold inline-flex items-center gap-2"
            >
              <i class="fas fa-calendar-check"></i>
              Записаться на прием
            </a>
            <a
              href="#portfolio"
              class="bg-white text-dark px-8 py-4 rounded-full font-semibold inline-flex items-center gap-2 hover:bg-gray-50 transition-all"
            >
              <i class="fas fa-images"></i>
              Посмотреть работы
            </a>
          </div>
        </div>

        <div class="relative fade-in">
          <div class="relative z-10">
            <img
              src="https://msk.cdn-chatium.io/get/image_msk_zZFpJZoag7.940x627.jpeg"
              alt="Мастер по макияжу"
              class="rounded-3xl shadow-2xl hover-lift"
            />
            <div class="absolute -bottom-6 -right-6 bg-white p-6 rounded-2xl shadow-xl">
              <div class="text-center">
                <div class="text-4xl font-bold gradient-text">500+</div>
                <div class="text-gray-600 text-sm mt-1">Довольных клиентов</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup></script>
