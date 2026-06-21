<template>
  <section class="py-20 md:py-28 bg-white relative overflow-hidden">
    <div
      class="absolute top-0 right-0 w-96 h-96 bg-sage-100/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"
    ></div>
    <div class="relative z-10 max-w-5xl mx-auto px-5 md:px-8">
      <div class="text-center mb-10">
        <div class="animate-on-scroll section-divider mb-6"></div>
        <h2
          class="animate-on-scroll delay-1 font-display text-3xl md:text-4xl font-semibold text-slate-900"
          style="letter-spacing: 0.02em"
        >
          О спикере
        </h2>
      </div>

      <div class="animate-on-scroll delay-2 grid md:grid-cols-5 gap-10 items-center">
        <div class="md:col-span-2">
          <div class="relative">
            <div
              class="absolute -inset-3 bg-gradient-to-br from-sage-200/30 to-warm-200/30 rounded-[2rem] blur-lg"
            ></div>
            <img
              :src="speakerPhoto"
              alt="Алексей Волков"
              class="relative rounded-2xl w-full shadow-lg shadow-slate-900/10 object-cover object-top aspect-[3/4]"
            />
          </div>
        </div>
        <div class="md:col-span-3 space-y-5">
          <h3 class="font-display text-3xl font-semibold text-slate-800">Алексей Волков</h3>
          <div class="flex flex-col gap-2">
            <div class="flex items-center gap-3">
              <div class="w-2 h-2 rounded-full bg-moss-500"></div>
              <span class="text-slate-700 font-medium">Врач с системным клиническим подходом</span>
            </div>
            <div class="flex items-center gap-3">
              <div class="w-2 h-2 rounded-full bg-moss-500"></div>
              <span class="text-slate-700 font-medium"
                >Практик традиционной китайской медицины</span
              >
            </div>
          </div>
          <p class="text-lg text-slate-700 leading-relaxed">
            Алексей выстраивает разбор так, чтобы у&nbsp;человека появилась внутренняя опора:
            понимание закономерностей своего состояния, критерии оценки и&nbsp;более точная
            стратегия действий.
          </p>
          <div
            class="bg-gradient-to-br from-moss-50 to-sage-50 border border-moss-200/50 rounded-xl p-5"
          >
            <p class="text-slate-700 leading-relaxed">
              После встречи многие отмечают, что принимать решения становится спокойнее, точнее
              и&nbsp;без постоянного давления на себя.
            </p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
const speakerPhoto =
  'https://sel.cdn-chatium.io/thumbnail/image_msk_8mT8jeaH0i.852x1279.jpeg/s/800x'
</script>
