<template>
  <section
    class="py-20 md:py-28 bg-gradient-to-br from-cream-50 via-white to-sage-50/30 relative overflow-hidden"
  >
    <div
      class="organic-blob top-10 right-10 w-[500px] h-[500px] bg-moss-100"
      style="animation-delay: -3s"
    ></div>
    <div
      class="organic-blob bottom-20 left-20 w-[400px] h-[400px] bg-ochre-50"
      style="animation-delay: -7s"
    ></div>
    <div
      class="organic-blob top-1/3 left-1/4 w-[300px] h-[300px] bg-sage-100"
      style="animation-delay: -12s"
    ></div>

    <div
      class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-moss-200 to-transparent"
    ></div>
    <div class="relative z-10 max-w-5xl mx-auto px-5 md:px-8">
      <div class="text-center mb-16">
        <div class="animate-on-scroll section-divider mb-7"></div>
        <h2
          class="animate-on-scroll delay-1 font-display text-3xl md:text-4xl lg:text-[2.8rem] font-bold text-slate-900 mb-5"
          style="letter-spacing: 0.02em"
        >
          7 признаков того, что энергии стало меньше
        </h2>
        <p
          class="animate-on-scroll delay-2 text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed"
        >
          Мы постепенно привыкаем к&nbsp;состоянию усталости и&nbsp;начинаем считать его нормой. Но
          у&nbsp;снижения ресурса есть вполне узнаваемые сигналы.
        </p>
      </div>

      <div class="grid sm:grid-cols-2 gap-5">
        <div
          v-for="(item, i) in signs"
          :key="i"
          :class="[
            'animate-on-scroll card-hover',
            'delay-' + (i + 1),
            i === 6 ? 'sm:col-span-2 sm:max-w-lg sm:mx-auto' : ''
          ]"
        >
          <div
            class="flex items-start gap-4 bg-white/80 backdrop-blur-sm border-2 border-moss-200/40 rounded-3xl p-6 h-full shadow-sm hover:shadow-md transition-all duration-300"
          >
            <div
              class="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-moss-100 to-moss-200 flex items-center justify-center mt-0.5 shadow-md"
            >
              <span class="text-sm font-bold text-moss-700">{{ i + 1 }}</span>
            </div>
            <p class="text-slate-700 leading-relaxed">{{ item }}</p>
          </div>
        </div>
      </div>

      <div
        class="animate-on-scroll mt-14 bg-gradient-to-br from-moss-50 to-sage-50 border-2 border-moss-200/50 rounded-3xl p-7 md:p-9 text-center shadow-lg"
      >
        <p class="text-slate-700 leading-relaxed text-lg md:text-xl max-w-3xl mx-auto font-medium">
          Если вы узнаёте у себя хотя бы часть этих состояний, возможно, дело
          не&nbsp;в&nbsp;характере и&nbsp;не&nbsp;в&nbsp;дисциплине. Часто это связано с&nbsp;тем,
          что организм постепенно теряет энергетический ресурс.
        </p>
      </div>
    </div>
  </section>
</template>

<script setup>
const signs = [
  'Утром всё сложнее просыпаться с ощущением отдыха',
  'Даже после выходных нет ощущения, что силы полностью восстановились',
  'Простые задачи требуют больше усилий, чем раньше',
  'Раздражение возникает быстрее, чем хотелось бы',
  'Всё чаще хочется отложить даже небольшие дела',
  'То, что раньше радовало, теперь утомляет',
  'Появляется ощущение, что жизнь идёт, но не в полную силу'
]
</script>
