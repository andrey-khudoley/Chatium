<template>
  <div class="slide">
    <div class="bg-effects">
      <div class="glow-orb orb-1"></div>
      <div class="glow-orb orb-2"></div>
    </div>

    <div class="content">
      <div class="header">
        <h2 class="title">Аналитика</h2>
        <p class="subtitle">Откуда пришли, что делали, <span class="accent">где купили</span></p>
      </div>

      <div class="funnel">
        <div class="funnel-step" v-for="(step, i) in steps" :key="i">
          <div class="step-bar" :style="{ width: step.width, background: step.bg }">
            <div class="step-icon"><i :class="step.icon"></i></div>
            <div class="step-label">{{ step.label }}</div>
            <div class="step-value">{{ step.value }}</div>
          </div>
          <div class="step-arrow" v-if="i < steps.length - 1">
            <i class="fas fa-chevron-down"></i>
          </div>
        </div>
      </div>

      <div class="bottom-pills">
        <span class="pill" v-for="(p, i) in pills" :key="i"
          ><i :class="p.icon"></i> {{ p.text }}</span
        >
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({ active: Boolean })

const steps = [
  {
    icon: 'fas fa-ad',
    label: 'Реклама',
    value: '12 400',
    width: '100%',
    bg: 'linear-gradient(90deg, rgba(245,158,11,0.15), rgba(245,158,11,0.25))'
  },
  {
    icon: 'fas fa-eye',
    label: 'Посещения',
    value: '8 200',
    width: '75%',
    bg: 'linear-gradient(90deg, rgba(251,191,36,0.15), rgba(251,191,36,0.25))'
  },
  {
    icon: 'fas fa-hand-pointer',
    label: 'Заявки',
    value: '1 340',
    width: '45%',
    bg: 'linear-gradient(90deg, rgba(245,158,11,0.2), rgba(245,158,11,0.35))'
  },
  {
    icon: 'fas fa-credit-card',
    label: 'Оплаты',
    value: '420',
    width: '22%',
    bg: 'linear-gradient(90deg, rgba(245,158,11,0.3), rgba(245,158,11,0.5))'
  }
]

const pills = [
  { icon: 'fas fa-chart-line', text: 'Источники трафика' },
  { icon: 'fas fa-filter', text: 'Воронки продаж' },
  { icon: 'fas fa-users', text: 'Когорты' },
  { icon: 'fas fa-bolt', text: 'События' }
]
</script>

<style scoped>
.slide {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 32px 24px;
  background: var(--bg-deep);
  overflow-y: auto;
  overflow-x: hidden;
}

.bg-effects {
  position: fixed;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}
.glow-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(140px);
  opacity: 0.12;
  animation: float 20s ease-in-out infinite;
}
.orb-1 {
  width: 500px;
  height: 500px;
  background: #f59e0b;
  top: -15%;
  left: -10%;
}
.orb-2 {
  width: 400px;
  height: 400px;
  background: #f97316;
  bottom: -15%;
  right: -5%;
  animation-delay: -7s;
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-30px);
  }
}

.content {
  max-width: 780px;
  width: 100%;
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32px;
}

.header {
  text-align: center;
}

.title {
  font-family: var(--font-display);
  font-size: clamp(48px, 7vw, 84px);
  font-weight: 900;
  background: linear-gradient(135deg, #f59e0b, #fbbf24, #fde68a);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
  line-height: 1.1;
}

.subtitle {
  font-family: var(--font-display);
  font-size: clamp(20px, 3vw, 32px);
  color: var(--text-secondary);
  margin: 14px 0 0;
  font-weight: 500;
}

.accent {
  background: linear-gradient(135deg, #f59e0b, #fde68a);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-weight: 700;
}

/* Funnel */
.funnel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
  width: 100%;
}

.funnel-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

.step-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 10px 20px;
  border-radius: 12px;
  border: 1px solid rgba(245, 158, 11, 0.15);
  transition: all 0.3s ease;
  margin: 0 auto;
}

.step-bar:hover {
  border-color: rgba(245, 158, 11, 0.35);
  box-shadow: 0 8px 32px rgba(245, 158, 11, 0.1);
  transform: scale(1.02);
}

.step-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: rgba(245, 158, 11, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.step-icon i {
  font-size: clamp(14px, 1.6vw, 17px);
  color: #fbbf24;
}

.step-label {
  flex: 1;
  font-family: var(--font-display);
  font-size: clamp(16px, 2vw, 22px);
  font-weight: 700;
  color: rgba(255, 255, 255, 0.9);
}

.step-value {
  font-family: var(--font-mono, 'JetBrains Mono', monospace);
  font-size: clamp(18px, 2.5vw, 26px);
  font-weight: 800;
  color: #fbbf24;
  letter-spacing: -0.5px;
}

.step-arrow {
  padding: 3px 0;
  color: rgba(245, 158, 11, 0.3);
  font-size: 14px;
}

/* Pills */
.bottom-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
}

.pill {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 22px;
  border-radius: 100px;
  background: rgba(245, 158, 11, 0.06);
  border: 1px solid rgba(245, 158, 11, 0.12);
  font-size: clamp(13px, 1.6vw, 16px);
  font-weight: 500;
  color: var(--text-secondary);
  transition: all 0.3s ease;
}

.pill:hover {
  border-color: rgba(245, 158, 11, 0.3);
  background: rgba(245, 158, 11, 0.1);
}

.pill i {
  color: #f59e0b;
  font-size: 14px;
}

@media (max-width: 768px) {
  .slide {
    padding: 30px 16px 16px;
    align-items: flex-start;
  }
  .content {
    gap: 20px;
  }
  .step-bar {
    padding: 8px 14px;
    gap: 10px;
  }
  .step-icon {
    width: 32px;
    height: 32px;
  }
  .step-arrow {
    padding: 2px 0;
    font-size: 12px;
  }
  .pill {
    padding: 6px 14px;
    font-size: 13px;
  }
  .bottom-pills {
    gap: 8px;
  }
}
</style>
