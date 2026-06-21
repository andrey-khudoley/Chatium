<template>
  <section id="services" class="relative py-24 md:py-32 bg-warm-950">
    <div class="max-w-7xl mx-auto px-6 md:px-12 lg:px-20">
      <div class="relative mb-16 md:mb-20">
        <span class="section-number">02</span>
        <p
          class="font-body text-amber/80 text-sm tracking-[0.3em] uppercase mb-4 relative z-10 reveal"
          style="line-height: 1.5"
        >
          С чем можно прийти
        </p>
        <h2
          class="font-display text-3xl md:text-4xl lg:text-5xl font-medium relative z-10 reveal reveal-delay-1"
          style="line-height: 1.15"
        >
          Форматы<br /><span class="text-gradient">сотрудничества</span>
        </h2>
      </div>

      <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        <div
          v-for="(service, i) in services"
          :key="i"
          class="group relative card-glass rounded-sm p-8 hover-lift reveal"
          :class="'reveal-delay-' + ((i % 3) + 1)"
        >
          <div class="flex items-center gap-3 mb-6">
            <div
              class="service-icon-wrap w-10 h-10 rounded-full bg-amber/10 flex items-center justify-center"
            >
              <i :class="service.icon" class="text-amber/70 text-sm"></i>
            </div>
            <span
              v-if="service.tag"
              class="font-body text-[10px] tracking-[0.15em] uppercase text-amber/60 border border-amber/25 px-2 py-0.5 rounded-full"
              style="line-height: 1.5"
              >{{ service.tag }}</span
            >
          </div>

          <h3
            class="font-display text-xl md:text-2xl font-medium text-warm-100 mb-3"
            style="line-height: 1.2"
          >
            {{ service.title }}
          </h3>
          <p class="font-body text-warm-300/70 text-sm leading-relaxed mb-5">{{ service.desc }}</p>

          <div class="divider-line w-full mb-4"></div>

          <p class="font-body text-amber/55 text-xs tracking-wide" style="line-height: 1.5">
            {{ service.note }}
          </p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
const services = [
  {
    icon: 'fas fa-search-dollar',
    title: 'Аудит рекламы',
    desc: 'Разберу, где утекает бюджет, почему заявки дорогие и что можно исправить прямо сейчас.',
    note: 'Подходит, если реклама уже запущена, но результат не устраивает',
    tag: ''
  },
  {
    icon: 'fas fa-rocket',
    title: 'Яндекс Директ',
    desc: 'Настрою, запущу и буду вести рекламу с фокусом на выручку. Не «настроил и забыл» — постоянная оптимизация.',
    note: 'Настройка + ведение с ежедневным мониторингом',
    tag: ''
  },
  {
    icon: 'fas fa-chess-queen',
    title: 'Маркетинговая стратегия',
    desc: 'Анализ рынка, ЦА, конкурентов. Позиционирование, УТП, воронка, каналы — полная система.',
    note: 'Идеально, если бизнес работает интуитивно',
    tag: 'Премиум'
  },
  {
    icon: 'fas fa-dna',
    title: 'ДНК бренда',
    desc: 'Глубинное интервью на 2,5 часа, проработка ценностей, миссии и уникальности вашего бизнеса.',
    note: 'Основа для всех коммуникаций',
    tag: ''
  },
  {
    icon: 'fas fa-layer-group',
    title: 'Упаковка бизнеса',
    desc: 'Из «звучим как все» — в чёткое предложение, которое выделяет на фоне конкурентов.',
    note: 'УТП + бренд-платформа + офферы',
    tag: ''
  },
  {
    icon: 'fas fa-comments',
    title: 'Стратегический разбор',
    desc: '40 минут, ваш бизнес, конкретный план действий. Без шаблонов — только под вашу ситуацию.',
    note: 'Первый шаг — чтобы понять, что мешает расти',
    tag: 'Бесплатно'
  }
]
</script>
