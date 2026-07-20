<template>
  <section
    id="results"
    class="relative py-24 md:py-32 overflow-hidden"
    style="background: linear-gradient(180deg, #1a1008 0%, #2d1f12 50%, #1a1008 100%)"
  >
    <div class="max-w-7xl mx-auto px-6 md:px-12 lg:px-20">
      <div class="text-center mb-16 md:mb-20">
        <p
          class="font-body text-amber/80 text-sm tracking-[0.3em] uppercase mb-4 reveal"
          style="line-height: 1.5"
        >
          Результаты
        </p>
        <h2
          class="font-display text-3xl md:text-4xl lg:text-5xl font-medium reveal reveal-delay-1"
          style="line-height: 1.15"
        >
          Цифры, которые<br /><span class="text-gradient">говорят за себя</span>
        </h2>
      </div>

      <div class="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 mb-20">
        <div
          v-for="(stat, i) in stats"
          :key="i"
          class="text-center reveal"
          :class="'reveal-delay-' + (i + 1)"
        >
          <div
            class="font-display text-4xl md:text-5xl lg:text-6xl font-medium text-amber mb-3"
            style="line-height: 1.1"
          >
            {{ stat.value }}
          </div>
          <div
            class="font-body text-warm-300/70 text-xs md:text-sm tracking-wide uppercase"
            style="line-height: 1.5"
          >
            {{ stat.label }}
          </div>
        </div>
      </div>

      <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="(caseItem, i) in cases"
          :key="i"
          class="card-glass rounded-sm p-6 md:p-8 hover-lift group reveal"
          :class="'reveal-delay-' + ((i % 3) + 1)"
        >
          <div class="flex items-center gap-3 mb-5">
            <span class="text-lg">{{ caseItem.icon }}</span>
            <span
              class="font-body text-amber/70 text-xs tracking-[0.2em] uppercase"
              style="line-height: 1.5"
              >{{ caseItem.niche }}</span
            >
          </div>

          <h3
            class="font-display text-2xl md:text-3xl font-medium text-warm-100 mb-2"
            style="line-height: 1.15"
          >
            {{ caseItem.mainMetric }}
          </h3>
          <p class="font-body text-warm-300/60 text-sm mb-4" style="line-height: 1.5">
            {{ caseItem.metricLabel }}
          </p>

          <div class="divider-line w-full mb-4"></div>

          <ul class="space-y-2">
            <li
              v-for="(detail, j) in caseItem.details"
              :key="j"
              class="font-body text-warm-200/75 text-sm flex items-start gap-2"
              style="line-height: 1.5"
            >
              <span class="text-amber/60 mt-0.5 text-xs">◆</span>
              <span>{{ detail }}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
const stats = [
  { value: '12+', label: 'лет в маркетинге' },
  { value: '559%', label: 'лучший ROMI' },
  { value: '7+', label: 'ниш с кейсами' },
  { value: '12М', label: 'выручка с кампании' }
]

const cases = [
  {
    icon: '🚗',
    niche: 'Автонавесы',
    mainMetric: 'ROMI 559%',
    metricLabel: 'Выручка 12,1 млн ₽ за 2,5 месяца',
    details: ['Расход на рекламу: 1,84 млн ₽', '405 целевых заявок', '20+ протестированных гипотез']
  },
  {
    icon: '🏗',
    niche: 'B2B промышленность',
    mainMetric: 'CPL ↓ в 2,2×',
    metricLabel: 'С 11 000 ₽ до 5 000 ₽ за лид',
    details: ['ROMI вырос до +152%', '3 950 лидов из digital', '+49% к прошлому году']
  },
  {
    icon: '🏘',
    niche: 'Недвижимость',
    mainMetric: '116 заявок',
    metricLabel: 'Средний чек квартиры — 7,1 млн ₽',
    details: ['Рост заявок: +46,84%', 'Снижение CPL: −26,11%', 'CTR на поиске: 15,54%']
  },
  {
    icon: '💍',
    niche: 'Ювелирная мастерская',
    mainMetric: '854 260 ₽',
    metricLabel: 'Выручка за 1 месяц',
    details: [
      'Расход: 115 709 ₽ (вкл. тесты)',
      '4 перезапуска до результата',
      'Помолвочные кольца, премиум'
    ]
  },
  {
    icon: '🧴',
    niche: 'Косметика',
    mainMetric: '1 млн ₽',
    metricLabel: 'Заказ от гос. корпорации',
    details: [
      'CPL: 22 ₽ (оптовое направление)',
      '80 лидов за 1 777 ₽',
      'Возврат к докризисному уровню'
    ]
  },
  {
    icon: '👔',
    niche: 'Бизнес-коучинг',
    mainMetric: 'Система с 0',
    metricLabel: 'Полная маркетинговая упаковка',
    details: [
      'Продуктовая линейка 1,5K–190K ₽',
      'CJM + воронка + 5 офферов',
      'Из «как у всех» — в уникальность'
    ]
  }
]
</script>
