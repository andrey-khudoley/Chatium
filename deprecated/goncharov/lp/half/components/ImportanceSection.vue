<template>
  <section class="py-24 md:py-32 relative overflow-hidden">
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
    <div class="relative z-10 max-w-4xl mx-auto px-5 md:px-8 text-cream-50">
      <div class="text-center mb-16">
        <div
          class="animate-on-scroll w-16 h-1 bg-gradient-to-r from-transparent via-moss-400 to-transparent mx-auto mb-8 rounded-full"
        ></div>
        <h2
          class="animate-on-scroll delay-1 font-display text-3xl md:text-4xl lg:text-[2.8rem] font-bold mb-5"
          style="letter-spacing: 0.02em"
        >
          Почему важно начать именно с&nbsp;понимания «на&nbsp;каком уровне&nbsp;я&nbsp;сейчас»
        </h2>
        <p
          class="animate-on-scroll delay-2 text-lg text-sage-200 max-w-2xl mx-auto leading-relaxed"
        >
          Не осознав текущее положение, мы можем неверно или не&nbsp;вовремя приложить усилия.
        </p>
      </div>

      <div class="space-y-5 mb-14">
        <div
          v-for="(item, i) in scenarios"
          :key="i"
          :class="['animate-on-scroll animate-slide-left card-hover', 'delay-' + (i + 3)]"
        >
          <div
            class="flex items-start gap-4 bg-white/10 border border-sage-200/30 backdrop-blur-md rounded-2xl p-6 hover:bg-white/15 transition-all duration-300"
          >
            <div
              class="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-ochre-400/30 to-ochre-600/30 flex items-center justify-center mt-0.5 shadow-lg"
            >
              <i class="fa-solid fa-xmark text-ochre-300 text-base"></i>
            </div>
            <p class="text-cream-50 text-lg leading-relaxed">{{ item }}</p>
          </div>
        </div>
      </div>

      <div class="animate-on-scroll delay-6 relative">
        <div
          class="absolute inset-0 bg-gradient-to-br from-moss-500/20 via-sage-500/15 to-moss-600/20 rounded-3xl blur-xl"
        ></div>
        <div
          class="relative bg-gradient-to-br from-moss-600/40 via-moss-700/35 to-sage-600/40 border-2 border-moss-400/30 backdrop-blur-sm rounded-3xl p-8 md:p-12 shadow-2xl"
        >
          <div
            class="absolute inset-0 rounded-3xl bg-gradient-to-t from-white/[0.03] to-transparent"
          ></div>
          <p
            class="relative text-lg md:text-xl leading-relaxed text-center text-moss-50 font-medium"
          >
            Если у организма нет энергии, любые изменения даются тяжелее. Иногда достаточно начать
            восстанавливать энергетический ресурс, и&nbsp;многие жизненные вопросы начинают решаться
            значительно легче.
          </p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
const scenarios = [
  'Эпизодически пытаться искать мотивацию и новые цели, когда организму уже нужен другой режим.',
  'Обратиться к психотерапии, когда на неё ещё просто нет внутреннего ресурса.',
  'Безуспешно пытаться менять привычки и делать вывод, что проблема в характере.'
]
</script>
