<template>
  <section class="py-20 md:py-28 relative overflow-hidden">
    <div class="absolute inset-0 z-0">
      <div class="absolute inset-0 bg-gradient-to-br from-slate-50 via-cream-50 to-sage-50"></div>
      <div
        class="organic-blob absolute top-20 left-10 w-[400px] h-[400px] bg-moss-100/60"
        style="animation-delay: -5s"
      ></div>
      <div
        class="organic-blob absolute bottom-20 right-10 w-[500px] h-[500px] bg-ochre-50/60"
        style="animation-delay: -10s"
      ></div>
    </div>
    <div class="relative z-10 max-w-3xl mx-auto px-5 md:px-8 text-center">
      <div class="animate-on-scroll section-divider mb-8"></div>
      <h2
        class="animate-on-scroll delay-1 font-display text-3xl md:text-4xl font-semibold text-slate-800 mb-6"
        style="letter-spacing: 0.02em"
      >
        Эта встреча может стать первым точным шагом
      </h2>
      <p class="animate-on-scroll delay-2 text-lg text-slate-700/80 leading-relaxed mb-3">
        На ней вы сможете понять своё текущее состояние и получить ориентиры, с которых начинается
        восстановление энергии.
      </p>
      <p class="animate-on-scroll delay-3 text-lg text-slate-700/70 leading-relaxed mb-10">
        Даже если вы уже многое пробовали, здесь вы сможете по-другому посмотреть на своё состояние
        и понять, с чего начинается возвращение энергии.
      </p>
      <div class="animate-on-scroll delay-4">
        <button class="cta-btn text-lg" @click="$emit('openModal')">Принять участие</button>
      </div>
    </div>
  </section>
</template>

<script setup>
defineEmits(['openModal'])
</script>
