<template>
  <section
    class="py-20 md:py-28 bg-gradient-to-br from-white via-cream-50/30 to-moss-50/20 relative overflow-hidden"
  >
    <div class="max-w-6xl mx-auto px-5 md:px-8">
      <div class="text-center mb-16">
        <div class="animate-on-scroll section-divider mb-7"></div>
        <h2
          class="animate-on-scroll delay-1 font-display text-3xl md:text-4xl lg:text-[2.8rem] font-bold text-slate-900 mb-5"
          style="letter-spacing: 0.02em"
        >
          Три состояния, в&nbsp;которых мы&nbsp;проживаем жизнь
        </h2>
        <p
          class="animate-on-scroll delay-2 text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed"
        >
          Между состоянием полного ресурса и&nbsp;выраженной усталости есть промежуточные уровни.
          Большинство людей не&nbsp;замечают этих переходов и&nbsp;продолжают действовать так, как
          будто ничего не изменилось.
        </p>
      </div>

      <div class="animate-on-scroll delay-3 mb-10">
        <div class="relative h-4 rounded-full overflow-hidden shadow-inner bg-slate-100/80">
          <div
            class="absolute inset-0 bg-gradient-to-r from-moss-400 via-ochre-300 to-slate-300"
          ></div>
          <div
            class="absolute top-1/2 left-0 w-4 h-8 -translate-y-1/2 bg-white border-2 border-moss-600 rounded-full shadow-lg"
          ></div>
          <div
            class="absolute top-1/2 left-1/2 w-4 h-8 -translate-y-1/2 -translate-x-1/2 bg-white border-2 border-ochre-500 rounded-full shadow-lg"
          ></div>
          <div
            class="absolute top-1/2 right-0 w-4 h-8 -translate-y-1/2 bg-white border-2 border-slate-400 rounded-full shadow-lg"
          ></div>
        </div>
      </div>

      <div class="grid md:grid-cols-3 gap-6 lg:gap-8">
        <div
          v-for="(level, i) in levels"
          :key="i"
          :class="['animate-on-scroll card-hover', 'delay-' + (i + 4)]"
        >
          <div
            :class="[
              'rounded-3xl p-7 h-full border-2 transition-all duration-500',
              level.gradientClass,
              level.borderClass
            ]"
          >
            <div class="flex items-center gap-3 mb-5">
              <div :class="['w-5 h-5 rounded-full shadow-md', level.dotClass]"></div>
              <h3
                class="font-display text-xl lg:text-2xl font-bold"
                :class="level.titleColor"
                style="letter-spacing: 0.015em"
              >
                {{ level.title }}
              </h3>
            </div>
            <p :class="['leading-relaxed', level.textColor]">{{ level.text }}</p>
          </div>
        </div>
      </div>

      <div class="animate-on-scroll delay-7 mt-14 text-center">
        <div
          class="inline-block bg-gradient-to-br from-moss-50 to-sage-50 border-2 border-moss-200/50 rounded-3xl px-10 py-7 shadow-lg"
        >
          <p class="text-slate-700 text-lg md:text-xl leading-relaxed max-w-3xl font-medium">
            Понимание уровня меняет стратегию. Иногда человеку нужен не новый рывок,
            а&nbsp;корректная последовательность восстановления.
          </p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
const levels = [
  {
    title: 'Наполненность',
    text: 'Когда энергии достаточно, задачи не превращаются в проблемы, а восстановление происходит быстрее.',
    gradientClass: 'energy-gradient-vitality',
    borderClass: 'border-moss-300/60',
    dotClass: 'bg-gradient-to-br from-moss-400 to-moss-600',
    titleColor: 'text-moss-800',
    textColor: 'text-moss-700/90'
  },
  {
    title: 'Перегрузка',
    text: 'Когда энергии начинает не хватать. Становится сложнее сосредоточиться, раздражение возникает быстрее, а нагрузки ощущаются сильнее.',
    gradientClass: 'energy-gradient-transition',
    borderClass: 'border-ochre-300/60',
    dotClass: 'bg-gradient-to-br from-ochre-400 to-ochre-600',
    titleColor: 'text-ochre-800',
    textColor: 'text-ochre-700/90'
  },
  {
    title: 'Жизнь в полсилы',
    text: 'Когда сил хватает в основном на обязательные дела. Даже небольшие задачи требуют усилий, а радость от жизни становится слабее.',
    gradientClass: 'energy-gradient-depleted',
    borderClass: 'border-slate-300/60',
    dotClass: 'bg-gradient-to-br from-slate-400 to-slate-600',
    titleColor: 'text-slate-800',
    textColor: 'text-slate-600/90'
  }
]
</script>
