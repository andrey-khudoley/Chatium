<template>
  <section
    class="py-20 md:py-28 bg-gradient-to-br from-sage-50/40 via-cream-50/50 to-moss-50/30 relative overflow-hidden"
  >
    <div
      class="organic-blob top-20 right-1/4 w-[450px] h-[450px] bg-sage-100"
      style="animation-delay: -5s"
    ></div>
    <div
      class="organic-blob bottom-10 left-1/3 w-[350px] h-[350px] bg-moss-100"
      style="animation-delay: -10s"
    ></div>

    <div class="relative z-10 max-w-5xl mx-auto px-5 md:px-8">
      <div class="text-center mb-12">
        <div class="animate-on-scroll section-divider mb-7"></div>
        <h2
          class="animate-on-scroll delay-1 font-display text-3xl md:text-4xl lg:text-[2.8rem] font-bold text-slate-900"
          style="letter-spacing: 0.02em"
        >
          На чём основан разбор на&nbsp;встрече
        </h2>
      </div>

      <div class="animate-on-scroll delay-2 grid md:grid-cols-2 gap-10 lg:gap-16 items-center">
        <div class="order-2 md:order-1 space-y-6">
          <p class="text-lg text-slate-700 leading-relaxed">
            В основе встречи лежит традиционная китайская медицина как структурная система оценки
            состояния. Этот подход рассматривает человека как единую систему, где физическое
            и&nbsp;психическое состояние тесно связаны.
          </p>
          <p class="text-lg text-slate-700 leading-relaxed">
            Он помогает не&nbsp;просто говорить об усталости в&nbsp;общем, а&nbsp;различать уровни
            состояния, видеть критерии и&nbsp;подбирать более уместную стратегию действий.
          </p>
        </div>
        <div class="order-1 md:order-2">
          <div class="relative flow-in-right">
            <div
              class="absolute -inset-6 bg-gradient-to-br from-moss-200/40 via-sage-200/30 to-ochre-200/20 rounded-[40%/60%] blur-2xl"
            ></div>
            <div
              class="absolute -bottom-8 -left-8 w-48 h-48 bg-ochre-100/60 rounded-[60%/40%] blur-[60px] opacity-80"
            ></div>
            <div
              class="absolute -top-6 -right-6 w-40 h-40 bg-moss-100/50 rounded-[45%/55%] blur-[50px] opacity-70"
            ></div>
            <img
              :src="photo"
              alt="Подход традиционной китайской медицины"
              class="relative rounded-[2rem] w-full shadow-2xl shadow-slate-900/10 object-cover aspect-[3/4]"
            />
          </div>
        </div>
      </div>

      <div class="animate-on-scroll delay-4 mt-12">
        <div class="relative">
          <div
            class="absolute inset-0 bg-gradient-to-br from-moss-100/50 to-sage-100/50 rounded-3xl blur-lg"
          ></div>
          <div
            class="relative bg-gradient-to-br from-white to-moss-50/30 border-2 border-moss-200/50 rounded-3xl p-8 md:p-10 text-center shadow-lg"
          >
            <p
              class="text-moss-800 text-lg md:text-xl font-semibold leading-relaxed font-display"
              style="letter-spacing: 0.015em"
            >
              Сначала понять, в&nbsp;каком состоянии вы&nbsp;находитесь. Потом решать, что именно
              усиливать, а&nbsp;что&nbsp;восстанавливать.
            </p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
const photo = 'https://fs.chatium.ru/thumbnail/image_msk_sLenSIVTS0.864x1184.png/s/800x/f/webp'
</script>
