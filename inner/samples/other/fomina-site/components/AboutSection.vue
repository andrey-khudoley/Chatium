<template>
  <section
    id="about"
    class="relative py-24 md:py-32 overflow-hidden"
    style="background: linear-gradient(180deg, #1a1008 0%, #2d1f12 50%, #1a1008 100%)"
  >
    <div class="absolute top-0 right-0 w-1/2 h-full opacity-5">
      <img
        src="https://sel.cdn-chatium.io/get/image_msk_Xr3aBfQ1VZ.1408x768.jpeg"
        alt=""
        class="w-full h-full object-cover"
        loading="lazy"
      />
    </div>

    <div class="relative z-10 max-w-7xl mx-auto px-6 md:px-12 lg:px-20">
      <div class="grid lg:grid-cols-5 gap-12 lg:gap-20 items-center">
        <div class="lg:col-span-2 flex justify-center reveal">
          <div class="photo-frame">
            <img
              src="https://fs.chatium.ru/thumbnail/image_msk_iDirKQPGBA.1024x1013.jpeg/s/600x"
              alt="Надежда Фомина"
              class="relative z-10 w-64 md:w-80 object-cover rounded-sm shadow-2xl shadow-warm-950/50"
              loading="lazy"
              width="320"
              height="320"
            />
          </div>
        </div>

        <div class="lg:col-span-3">
          <div class="relative">
            <span class="section-number">03</span>
            <p
              class="font-body text-amber/80 text-sm tracking-[0.3em] uppercase mb-4 relative z-10 reveal"
              style="line-height: 1.5"
            >
              Обо мне
            </p>
            <h2
              class="font-display text-3xl md:text-4xl lg:text-5xl font-medium mb-8 relative z-10 reveal reveal-delay-1"
              style="line-height: 1.15"
            >
              Честность —<br />моё <span class="text-gradient">главное УТП</span>
            </h2>
          </div>

          <div class="space-y-5 mb-10">
            <p class="font-body text-warm-200/80 text-base leading-relaxed reveal reveal-delay-2">
              12 лет в маркетинге научили меня главному: красивые отчёты не&nbsp;оплачивают аренду.
              Поэтому я считаю не клики, а деньги в кассе клиента.
            </p>
            <p class="font-body text-warm-200/80 text-base leading-relaxed reveal reveal-delay-3">
              Я не обещаю «заявки по 200 рублей» — я&nbsp;даю прозрачность. Если Директ не подходит
              вашему бизнесу, скажу об этом прямо. Если нужна стратегия перед рекламой — не буду
              тянуть деньги на запуск.
            </p>
            <p class="font-body text-warm-200/80 text-base leading-relaxed reveal reveal-delay-4">
              Мой подход: лично обзваниваю конкурентов, хожу «в разведку» с легендой, провожу
              глубинные интервью по 2,5 часа. Потому что настоящие инсайты не лежат на поверхности.
            </p>
          </div>

          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div
              v-for="(cert, i) in certs"
              :key="i"
              class="card-glass rounded-sm p-4 text-center reveal"
              :class="'reveal-delay-' + (i + 1)"
            >
              <i :class="cert.icon" class="text-amber/60 text-lg mb-2 block"></i>
              <p class="font-body text-warm-200/75 text-xs leading-tight">{{ cert.label }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
const certs = [
  { icon: 'fas fa-certificate', label: 'Яндекс Директ ПРО' },
  { icon: 'fas fa-chart-bar', label: 'Яндекс Метрика' },
  { icon: 'fas fa-graduation-cap', label: 'Диплом: Контекстная реклама' },
  { icon: 'fas fa-book-open', label: 'Постоянное обучение' }
]
</script>
