<template>
  <main class="min-h-screen">
    <section class="relative py-16 md:py-24 px-4">
      <div
        class="organic-blob bg-moss-400"
        style="width: 420px; height: 420px; top: -120px; right: -140px"
      ></div>
      <div
        class="organic-blob bg-ochre-400"
        style="width: 340px; height: 340px; bottom: -120px; left: -90px; animation-delay: -8s"
      ></div>

      <div class="max-w-5xl mx-auto relative z-10">
        <div class="text-center mb-10 md:mb-14 animate-on-scroll is-visible">
          <p class="floating-badge mb-4">
            <i class="fas fa-circle-play"></i>
            Запись вебинара
          </p>
          <h1
            class="font-display text-5xl md:text-6xl lg:text-7xl text-slate-900 leading-[1.05] mb-4"
          >
            Жизнь вполсилы
          </h1>
          <p class="text-slate-700 text-lg md:text-2xl max-w-3xl mx-auto">
            Это запись вебинара с Алексеем Волковым.
          </p>
        </div>

        <div
          class="bg-white/80 backdrop-blur-sm rounded-2xl md:rounded-3xl p-3 md:p-5 shadow-[0_20px_60px_rgba(46,37,25,0.12)] border border-sage-200/70"
        >
          <div style="position: relative; padding-top: 56.2%; width: 100%">
            <iframe
              src="https://kinescope.io/embed/cR5C9pmt1tJ9CRPCajF4Nx"
              allow="autoplay; fullscreen; picture-in-picture; encrypted-media; gyroscope; accelerometer; clipboard-write; screen-wake-lock;"
              frameborder="0"
              allowfullscreen
              style="position: absolute; width: 100%; height: 100%; top: 0; left: 0"
            ></iframe>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>
