<template>
  <section id="about" class="py-20 bg-light">
    <div class="container mx-auto px-4">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div class="order-2 lg:order-1">
          <div class="bg-white rounded-3xl p-8 shadow-2xl">
            <div class="aspect-w-4 aspect-h-5 rounded-2xl overflow-hidden mb-6">
              <img
                src="https://msk.cdn-chatium.io/get/image_msk_HEIyQCjLX6.433x650.jpeg"
                alt="Косметолог за работой"
                class="w-full h-[500px] object-cover"
              />
            </div>
            <div class="flex items-center justify-center space-x-6 text-center">
              <div class="flex flex-col items-center">
                <i class="fas fa-award text-4xl text-primary mb-2"></i>
                <span class="text-sm text-gray-600">Сертификаты</span>
              </div>
              <div class="flex flex-col items-center">
                <i class="fas fa-graduation-cap text-4xl text-primary mb-2"></i>
                <span class="text-sm text-gray-600">Обучение</span>
              </div>
              <div class="flex flex-col items-center">
                <i class="fas fa-heart text-4xl text-primary mb-2"></i>
                <span class="text-sm text-gray-600">Любовь к делу</span>
              </div>
            </div>
          </div>
        </div>

        <div class="order-1 lg:order-2">
          <h2 class="text-4xl md:text-5xl font-bold text-dark mb-6">
            О нашем <span class="text-primary">специалисте</span>
          </h2>

          <p class="text-lg text-gray-700 mb-6 leading-relaxed">
            Здравствуйте! Меня зовут Анна, и я — профессиональный косметолог с более чем 5-летним
            опытом работы.
          </p>

          <p class="text-lg text-gray-700 mb-6 leading-relaxed">
            Моя специализация — уход за кожей лица и тела с использованием современных методик и
            качественных препаратов. Я постоянно совершенствую свои навыки, посещая курсы и семинары
            ведущих специалистов индустрии красоты.
          </p>

          <div class="space-y-4 mb-8">
            <div class="flex items-start">
              <i class="fas fa-check-circle text-primary text-2xl mr-4 mt-1"></i>
              <div>
                <h4 class="font-semibold text-dark text-lg mb-1">Индивидуальный подход</h4>
                <p class="text-gray-600">
                  Каждый клиент уникален, и я подбираю процедуры с учётом особенностей вашей кожи
                </p>
              </div>
            </div>

            <div class="flex items-start">
              <i class="fas fa-check-circle text-primary text-2xl mr-4 mt-1"></i>
              <div>
                <h4 class="font-semibold text-dark text-lg mb-1">Профессиональные средства</h4>
                <p class="text-gray-600">
                  Использую только проверенную косметику и препараты премиум-класса
                </p>
              </div>
            </div>

            <div class="flex items-start">
              <i class="fas fa-check-circle text-primary text-2xl mr-4 mt-1"></i>
              <div>
                <h4 class="font-semibold text-dark text-lg mb-1">Комфортная атмосфера</h4>
                <p class="text-gray-600">
                  Уютный кабинет, где вы сможете расслабиться и насладиться процедурами
                </p>
              </div>
            </div>
          </div>

          <a href="#contact" class="btn-primary inline-block">
            <i class="fas fa-calendar-check mr-2"></i>
            Записаться на консультацию
          </a>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup></script>
