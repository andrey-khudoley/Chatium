<template>
  <div class="slide dot-grid">
    <div class="container">
      <header class="head">
        <h1 class="title">Ключ школы — <span class="hl">НЕ</span> в коде сценариев</h1>
        <span class="strip"></span>
      </header>

      <div class="steps">
        <template v-for="(s, i) in steps" :key="s.title">
          <article class="step" :style="{ animationDelay: 0.05 + i * 0.1 + 's' }">
            <span class="badge">{{ s.num }}</span>
            <h3 class="s-title">{{ s.title }}</h3>
            <p class="s-text">{{ s.text }}</p>
          </article>
          <div v-if="i < steps.length - 1" class="arr">
            <i class="fas fa-arrow-right-long"></i>
          </div>
        </template>
      </div>

      <div class="callout">
        <div class="line"><span class="dot"></span> Не утечёт в git.</div>
        <div class="line"><span class="dot"></span> Не утечёт в промпт AI.</div>
        <div class="line"><span class="dot"></span> Не утечёт в скриншот.</div>
      </div>

      <p class="disclaimer">
        <i>Ключ всё равно ходит по HTTPS на доверенный gateway — это нормально для интеграции.</i>
      </p>
    </div>
  </div>
</template>

<script setup>
defineProps({ active: Boolean })

const steps = [
  { num: '01', title: 'Один раз', text: 'Вводите ключ при настройке SDK' },
  { num: '02', title: 'Хранится', text: 'В heap-таблице' },
  { num: '03', title: 'В коде', text: 'Только имя школы. Ключ подмешивается перед запросом.' }
]
</script>

<style scoped>
.slide {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--gradient-bg);
  padding: 56px 64px;
  overflow: hidden;
}

.container {
  width: 100%;
  max-width: 1700px;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.title {
  font-family: var(--font-display-new);
  font-weight: 700;
  font-size: clamp(26px, 3.4vw, 56px);
  color: var(--text-primary);
}
.hl {
  color: var(--accent-cyan);
}
.strip {
  display: block;
  width: 80px;
  height: 4px;
  background: var(--accent-cyan);
  border-radius: 2px;
  margin-top: 16px;
}

.steps {
  display: grid;
  grid-template-columns: 1fr 50px 1fr 50px 1fr;
  gap: 16px;
  align-items: stretch;
}

.step {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 16px;
  padding: 28px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 200px;
  opacity: 0;
  animation: fadeInUp 480ms ease-out forwards;
  transition:
    transform 0.3s ease,
    border-color 0.3s ease;
}
.step:hover {
  transform: translateY(-4px);
  border-color: var(--border-accent);
}
.badge {
  align-self: flex-start;
  width: 64px;
  height: 64px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--accent-cyan);
  border-radius: 50%;
  font-family: var(--font-mono);
  font-weight: 600;
  font-size: clamp(16px, 1.4vw, 24px);
  color: var(--accent-cyan);
  background: rgba(0, 217, 255, 0.05);
}
.s-title {
  font-family: var(--font-display-new);
  font-weight: 600;
  font-size: clamp(18px, 1.8vw, 28px);
  color: var(--text-primary);
}
.s-text {
  font-family: var(--font-body-new);
  font-size: clamp(13px, 1.2vw, 22px);
  color: var(--text-secondary);
  line-height: 1.5;
}
.arr {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent-cyan);
  font-size: clamp(20px, 2vw, 32px);
}

.callout {
  background: rgba(0, 217, 255, 0.08);
  border-left: 4px solid var(--accent-cyan);
  border-radius: 16px;
  padding: 32px 40px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.line {
  display: flex;
  align-items: center;
  gap: 16px;
  font-family: var(--font-display-new);
  font-weight: 700;
  font-size: clamp(20px, 2vw, 36px);
  color: var(--text-primary);
}
.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--accent-cyan);
  box-shadow: 0 0 10px rgba(0, 217, 255, 0.6);
  flex-shrink: 0;
}

.disclaimer {
  font-family: var(--font-body-new);
  font-style: italic;
  font-size: clamp(11px, 1vw, 18px);
  color: var(--text-tertiary);
  text-align: center;
}

@media (max-width: 1024px) {
  .slide {
    padding: 32px 16px;
  }
  .steps {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  .arr {
    transform: rotate(90deg);
  }
  .step {
    min-height: auto;
    padding: 20px;
  }
  .callout {
    padding: 22px 24px;
  }
}
</style>
