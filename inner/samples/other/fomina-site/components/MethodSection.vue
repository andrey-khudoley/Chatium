<template>
  <section id="method" class="relative py-24 md:py-32 bg-warm-950">
    <div class="max-w-7xl mx-auto px-6 md:px-12 lg:px-20">
      <div class="grid lg:grid-cols-2 gap-16 lg:gap-24 items-start">
        <div class="relative">
          <span class="section-number">01</span>
          <p
            class="font-body text-amber/80 text-sm tracking-[0.3em] uppercase mb-4 relative z-10 reveal"
            style="line-height: 1.5"
          >
            Подход
          </p>
          <h2
            class="font-display text-3xl md:text-4xl lg:text-5xl font-medium mb-8 relative z-10 reveal reveal-delay-1"
            style="line-height: 1.15"
          >
            Не клики и&nbsp;CTR,<br />а&nbsp;<span class="text-gradient">деньги в&nbsp;кассе</span>
          </h2>
          <div class="divider-line w-16 mb-8 reveal reveal-delay-2"></div>
          <p
            class="font-body text-warm-200/80 text-base leading-relaxed mb-6 reveal reveal-delay-2"
          >
            Большинство маркетологов хвастаются высоким CTR и низкой ценой клика. Я смотрю на другое
            — сколько денег принёс каждый рубль, вложенный в рекламу.
          </p>
          <p class="font-body text-warm-200/80 text-base leading-relaxed reveal reveal-delay-3">
            Мой подход — это система, а не набор разрозненных действий. Сначала стратегия, потом
            тактика. Сначала исследования — потом бюджет.
          </p>
        </div>

        <div class="space-y-6">
          <div
            v-for="(step, i) in steps"
            :key="i"
            class="card-glass rounded-sm p-6 hover-lift reveal"
            :class="'reveal-delay-' + (i + 1)"
          >
            <div class="flex items-start gap-5">
              <span
                class="font-display text-3xl text-amber/50 font-light shrink-0 w-10"
                style="line-height: 1.15"
                >{{ String(i + 1).padStart(2, '0') }}</span
              >
              <div>
                <h3
                  class="font-body font-semibold text-warm-100 text-base mb-2"
                  style="line-height: 1.5"
                >
                  {{ step.title }}
                </h3>
                <p class="font-body text-warm-300/70 text-sm leading-relaxed">{{ step.desc }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
const steps = [
  {
    title: 'Аудит и диагностика',
    desc: 'Разбираю текущую ситуацию: что работает, что нет, где утечки бюджета.'
  },
  {
    title: 'Исследования',
    desc: 'Глубинные интервью, конкурентная разведка, анализ рынка — не по верхам, а в глубину.'
  },
  {
    title: 'Стратегия и позиционирование',
    desc: 'УТП, воронка, офферы, каналы — система, а не набор догадок.'
  },
  {
    title: 'Запуск с тестированием',
    desc: 'Десятки гипотез, A/B-тесты, оставляю только то, что приносит деньги.'
  },
  {
    title: 'Оптимизация по выручке',
    desc: 'Сверка с CRM, контроль ROMI, постоянное улучшение — не «настроил и забыл».'
  }
]
</script>
