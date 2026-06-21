<template>
  <footer class="bg-dark text-white py-12">
    <div class="container mx-auto px-6">
      <div class="grid md:grid-cols-3 gap-8 mb-8">
        <div>
          <h3 class="text-2xl font-bold font-heading mb-4 gradient-text">Make-Up Studio</h3>
          <p class="text-gray-400">Профессиональный макияж для особенных моментов вашей жизни</p>
        </div>

        <div>
          <h4 class="font-semibold mb-4 text-lg">Контакты</h4>
          <div class="space-y-3 text-gray-400">
            <div class="flex items-center gap-3">
              <i class="fas fa-phone text-primary"></i>
              <a href="tel:+79991234567" class="hover:text-primary transition-colors"
                >+7 (999) 123-45-67</a
              >
            </div>
            <div class="flex items-center gap-3">
              <i class="fas fa-envelope text-primary"></i>
              <a href="mailto:info@makeup.com" class="hover:text-primary transition-colors"
                >info@makeup.com</a
              >
            </div>
            <div class="flex items-center gap-3">
              <i class="fas fa-map-marker-alt text-primary"></i>
              <span>Москва, ул. Примерная, 1</span>
            </div>
          </div>
        </div>

        <div>
          <h4 class="font-semibold mb-4 text-lg">Социальные сети</h4>
          <div class="flex gap-4">
            <a
              href="#"
              class="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center hover:bg-primary transition-colors"
            >
              <i class="fab fa-vk"></i>
            </a>
            <a
              href="#"
              class="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center hover:bg-primary transition-colors"
            >
              <i class="fab fa-telegram"></i>
            </a>
            <a
              href="#"
              class="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center hover:bg-primary transition-colors"
            >
              <i class="fab fa-whatsapp"></i>
            </a>
          </div>
        </div>
      </div>

      <div class="border-t border-gray-700 pt-8 text-center text-gray-400 text-sm">
        <p>&copy; 2025 Make-Up Studio. Все права защищены.</p>
      </div>
    </div>
  </footer>
</template>

<script setup></script>
