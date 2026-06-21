<template>
  <section class="py-20 md:py-28 relative overflow-hidden">
    <div class="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-700 to-sage-800"></div>
    <div
      class="organic-blob top-10 right-10 w-[450px] h-[450px] bg-sage-500/20"
      style="animation-delay: -3s"
    ></div>
    <div
      class="organic-blob bottom-10 left-10 w-[400px] h-[400px] bg-moss-500/15"
      style="animation-delay: -7s"
    ></div>
    <div
      class="organic-blob top-1/2 left-1/3 w-[350px] h-[350px] bg-ochre-500/10"
      style="animation-delay: -12s"
    ></div>

    <div class="relative z-10 max-w-5xl mx-auto px-5 md:px-8">
      <div class="text-center mb-12">
        <div
          class="animate-on-scroll section-divider mb-7 bg-gradient-to-r from-transparent via-sage-300 to-transparent"
        ></div>
        <h2
          class="animate-on-scroll delay-1 font-display text-3xl md:text-4xl lg:text-[2.8rem] font-bold text-cream-50 mb-5"
          style="letter-spacing: 0.02em"
        >
          Энергия организма влияет на качество жизни
        </h2>
        <p
          class="animate-on-scroll delay-2 text-lg md:text-xl text-sage-200 max-w-2xl mx-auto leading-relaxed"
        >
          То, как мы проживаем жизнь, во многом зависит от уровня внутреннего ресурса.
        </p>
        <p
          class="animate-on-scroll delay-2 text-lg md:text-xl text-ochre-300 max-w-2xl mx-auto leading-relaxed mt-6 font-display font-semibold tracking-wide"
        >
          Когда энергии достаточно:
        </p>
      </div>

      <div class="grid sm:grid-cols-2 gap-5 mb-12">
        <div
          v-for="(item, i) in benefits"
          :key="i"
          :class="['animate-on-scroll card-hover', 'delay-' + (i + 1)]"
        >
          <div
            class="flex items-start gap-4 bg-white/10 backdrop-blur-md border border-sage-200/30 rounded-3xl p-6 h-full shadow-lg hover:bg-white/15 transition-all duration-300"
          >
            <div
              class="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-moss-400 to-moss-600 flex items-center justify-center shadow-md"
            >
              <i :class="['fa-solid text-white text-lg', item.icon]"></i>
            </div>
            <div>
              <p class="text-cream-50 font-display text-lg font-semibold mb-1">{{ item.title }}</p>
              <p class="text-sage-200/90 leading-relaxed text-sm">{{ item.description }}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="animate-on-scroll delay-5 text-center">
        <div
          class="bg-gradient-to-r from-moss-500/20 via-sage-500/20 to-ochre-500/20 backdrop-blur-md border border-sage-200/30 rounded-3xl p-8 md:p-10 max-w-3xl mx-auto"
        >
          <p class="text-lg md:text-xl text-sage-200 leading-relaxed mb-4">
            Когда энергии становится меньше, меняется не только самочувствие.
          </p>
          <p
            class="text-2xl md:text-3xl text-cream-50 font-display font-bold leading-relaxed"
            style="letter-spacing: 0.02em"
          >
            Меняется то, как мы живём.
          </p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
const benefits = [
  {
    icon: 'fa-lightbulb',
    title: 'Легче принимать решения',
    description: 'Ясность мышления и внутренняя опора помогают видеть верные направления'
  },
  {
    icon: 'fa-battery-full',
    title: 'Быстрее происходит восстановление',
    description: 'Восстановление происходит естественным образом, без лишних усилий'
  },
  {
    icon: 'fa-shield-heart',
    title: 'Проще справляться со стрессом',
    description: 'Устойчивость к внешним нагрузкам растёт изнутри'
  },
  {
    icon: 'fa-anchor',
    title: 'Ощущение внутренней устойчивости',
    description: 'Жизнь ощущается наполненной и целостной, а не фрагментарной'
  }
]
</script>
