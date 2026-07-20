<template>
  <section id="testimonials" class="relative py-24 md:py-32 bg-warm-950">
    <div class="max-w-7xl mx-auto px-6 md:px-12 lg:px-20">
      <div class="text-center mb-16 md:mb-20">
        <p
          class="font-body text-amber/80 text-sm tracking-[0.3em] uppercase mb-4 reveal"
          style="line-height: 1.5"
        >
          Принципы
        </p>
        <h2
          class="font-display text-3xl md:text-4xl lg:text-5xl font-medium reveal reveal-delay-1"
          style="line-height: 1.15"
        >
          Почему выбирают<br /><span class="text-gradient">работать со мной</span>
        </h2>
      </div>

      <div class="grid md:grid-cols-2 gap-8 mb-16">
        <div
          v-for="(item, i) in quotes"
          :key="i"
          class="card-glass rounded-sm p-8 md:p-10 reveal"
          :class="'reveal-delay-' + (i + 1)"
        >
          <div class="flex items-center gap-3 mb-6">
            <div class="w-8 h-8 rounded-full bg-amber/10 flex items-center justify-center">
              <i class="fas fa-quote-left text-amber/50 text-xs"></i>
            </div>
            <span
              class="font-body text-amber/60 text-xs tracking-[0.2em] uppercase"
              style="line-height: 1.5"
              >{{ item.source }}</span
            >
          </div>
          <blockquote
            class="font-display text-xl md:text-2xl text-warm-100/95 italic mb-6"
            style="line-height: 1.4"
          >
            «{{ item.quote }}»
          </blockquote>
          <p class="font-body text-warm-300/55 text-sm" style="line-height: 1.5">
            {{ item.context }}
          </p>
        </div>
      </div>

      <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div
          v-for="(diff, i) in differences"
          :key="i"
          class="text-center p-6 reveal"
          :class="'reveal-delay-' + (i + 1)"
        >
          <div
            class="w-12 h-12 mx-auto rounded-full bg-amber/10 flex items-center justify-center mb-4 transition-all duration-300 hover:bg-amber/18 hover:shadow-lg hover:shadow-amber/8"
          >
            <i :class="diff.icon" class="text-amber/65 text-base"></i>
          </div>
          <h4 class="font-body font-semibold text-warm-100 text-sm mb-2" style="line-height: 1.5">
            {{ diff.title }}
          </h4>
          <p class="font-body text-warm-300/60 text-xs leading-relaxed">{{ diff.desc }}</p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
const quotes = [
  {
    source: 'Клиент, ДНК бренда',
    quote:
      'Я для себя тоже открыл много нового относительно собственных ценностей и направления, в котором хотелось бы двигаться дальше',
    context: 'После глубинного интервью на 2,5 часа и проработки ДНК бренда'
  },
  {
    source: 'Из философии Надежды',
    quote:
      'Маркетинг — не волшебная кнопка. Это тестирование гипотез, аналитика и фокус на деньги, а не на клики',
    context: 'Подход, который отличает от 90% подрядчиков на рынке'
  }
]

const differences = [
  {
    icon: 'fas fa-eye',
    title: 'Прозрачность',
    desc: 'Видите, куда уходит каждый рубль бюджета'
  },
  {
    icon: 'fas fa-hand-paper',
    title: 'Умею говорить «нет»',
    desc: 'Если Директ не подходит — скажу честно, не потратив ваш бюджет'
  },
  {
    icon: 'fas fa-sync-alt',
    title: 'Постоянная работа',
    desc: 'Мониторинг каждый день, включая выходные и праздники'
  },
  {
    icon: 'fas fa-user-shield',
    title: 'Защита интересов',
    desc: 'Кабинеты на вас, честные цифры, защита от «продавцов воздуха»'
  }
]
</script>
