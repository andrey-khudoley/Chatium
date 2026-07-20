<template>
  <section class="hero-gradient relative min-h-screen flex items-center overflow-hidden">
    <div class="absolute inset-0 opacity-10">
      <img
        src="https://sel.cdn-chatium.io/get/image_msk_K7CcktROPv.1408x768.jpeg"
        alt=""
        class="w-full h-full object-cover"
        loading="lazy"
      />
    </div>

    <div
      class="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-warm-950 to-transparent z-10"
    ></div>
    <div
      class="absolute bottom-0 left-0 w-full h-48 bg-gradient-to-t from-warm-950 to-transparent z-10"
    ></div>

    <div class="relative z-20 w-full max-w-7xl mx-auto px-6 md:px-12 lg:px-20 py-24 md:py-20">
      <div class="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
        <div class="order-2 lg:order-1">
          <div class="animate-fade-up">
            <p
              class="font-body text-amber/80 text-sm tracking-[0.3em] uppercase mb-6"
              style="line-height: 1.5"
            >
              маркетолог-стратег
            </p>
          </div>

          <h1
            class="font-display text-5xl md:text-6xl lg:text-7xl font-medium mb-8 animate-fade-up delay-100"
            style="line-height: 1.1"
          >
            Надежда<br />
            <span class="text-gradient">Фомина</span>
          </h1>

          <div class="divider-line w-24 mb-8 animate-fade-up delay-200"></div>

          <p
            class="font-body text-warm-200/85 text-lg md:text-xl max-w-lg mb-10 animate-fade-up delay-300"
            style="line-height: 1.7"
          >
            Выстраиваю маркетинг, который приносит деньги в&nbsp;кассу, а&nbsp;не&nbsp;красивые
            отчёты. 12+ лет. Системный подход. Без&nbsp;сказок.
          </p>

          <div class="flex flex-col sm:flex-row gap-4 animate-fade-up delay-400">
            <a href="#contact" class="btn-primary"> Обсудить проект </a>
            <a
              href="https://t.me/marketing_bezskazok"
              target="_blank"
              rel="noopener"
              class="btn-outline"
            >
              <i class="fab fa-telegram mr-2"></i>Telegram-канал
            </a>
          </div>
        </div>

        <div class="order-1 lg:order-2 flex justify-center lg:justify-end">
          <div class="photo-frame animate-scale-in delay-200">
            <img
              src="https://fs.chatium.ru/thumbnail/image_msk_iluouajXqE.768x765.jpeg/s/600x"
              alt="Надежда Фомина"
              class="relative z-10 w-72 md:w-80 lg:w-96 object-cover rounded-sm shadow-2xl shadow-warm-950/50"
              loading="eager"
              width="384"
              height="384"
            />
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
