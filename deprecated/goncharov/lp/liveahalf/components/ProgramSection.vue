<template>
  <section class="py-20 md:py-28 bg-sage-50/50 relative overflow-hidden">
    <div
      class="organic-blob top-10 right-20 w-[350px] h-[350px] bg-moss-100"
      style="animation-delay: -3s"
    ></div>
    <div
      class="organic-blob bottom-20 left-10 w-[300px] h-[300px] bg-ochre-50"
      style="animation-delay: -7s"
    ></div>

    <div class="max-w-5xl mx-auto px-5 md:px-8 relative z-10">
      <div class="text-center mb-14">
        <div class="animate-on-scroll section-divider mb-6"></div>
        <h2
          class="animate-on-scroll delay-1 font-display text-3xl md:text-4xl lg:text-[2.8rem] font-semibold text-slate-900 mb-4"
          style="letter-spacing: 0.02em"
        >
          Что вы сможете применить уже на следующий день
        </h2>
        <p
          class="animate-on-scroll delay-2 text-lg text-slate-700 max-w-3xl mx-auto leading-relaxed"
        >
          На встрече будет разобрана модель уровней энергии. Не как абстрактная теория, а как
          инструмент, который можно приложить к себе сразу.
        </p>
      </div>

      <div class="max-w-3xl mx-auto space-y-4">
        <div
          v-for="(item, i) in program"
          :key="i"
          :class="['animate-on-scroll animate-slide-left card-hover', 'delay-' + (i + 1)]"
        >
          <div
            class="flex items-start gap-5 bg-white rounded-2xl p-6 border border-sage-100/80 shadow-sm hover:shadow-md transition-all duration-300"
          >
            <div
              class="flex-shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-moss-400 to-moss-600 flex items-center justify-center shadow-md"
            >
              <span class="text-white font-display text-xl font-bold">{{ i + 1 }}</span>
            </div>
            <div>
              <p class="text-slate-800 text-lg leading-relaxed font-medium">{{ item }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
const program = [
  'Как определить свой текущий уровень энергии',
  'Почему сил не хватает даже на простые вещи',
  'Чем обычная усталость отличается от системного дефицита энергии',
  'Почему отдых не всегда помогает восстановиться',
  'Какие изменения помогают начать возвращать ресурс и полноценную включённость в жизнь'
]
</script>
