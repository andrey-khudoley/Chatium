<template>
  <div class="slide">
    <div class="bg-effects">
      <div class="glow-orb orb-1"></div>
      <div class="glow-orb orb-2"></div>
    </div>

    <div class="content">
      <div class="header">
        <h2 class="title">Версии и бекапы</h2>
        <p class="subtitle">Меняй, тестируй, <span class="accent">публикуй мгновенно</span></p>
      </div>

      <div class="pipeline">
        <div class="pipe-step" v-for="(step, i) in steps" :key="i">
          <div class="step-card" :class="step.cls">
            <div class="step-status">
              <i :class="step.statusIcon" :style="{ color: step.color }"></i>
              <span class="status-label" :style="{ color: step.color }">{{ step.status }}</span>
            </div>
            <div class="step-name">{{ step.name }}</div>
            <div class="step-desc">{{ step.desc }}</div>
          </div>
          <div class="pipe-arrow" v-if="i < steps.length - 1">
            <i class="fas fa-arrow-right"></i>
          </div>
        </div>
      </div>

      <div class="speed-block">
        <div class="speed-icon"><i class="fas fa-bolt"></i></div>
        <div class="speed-text">
          <div class="speed-title">Скорость изменений</div>
          <div class="speed-desc">
            Меняешь код — видишь результат мгновенно. Как на вебе. Без деплоя, без ожидания.
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({ active: Boolean })

const steps = [
  {
    name: 'Разработка',
    desc: 'Тестируй изменения в черновике, не ломая прод',
    status: 'DRAFT',
    statusIcon: 'fas fa-code',
    color: '#fbbf24',
    cls: 'step-dev'
  },
  {
    name: 'Публикация',
    desc: 'Один клик — и новая версия доступна всем',
    status: 'PUBLISH',
    statusIcon: 'fas fa-rocket',
    color: '#34d399',
    cls: 'step-prod'
  },
  {
    name: 'Откат',
    desc: 'Что-то пошло не так? Вернись на предыдущую версию',
    status: 'ROLLBACK',
    statusIcon: 'fas fa-rotate-left',
    color: '#fb7185',
    cls: 'step-rollback'
  }
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
  background: #f97316;
  top: -15%;
  right: -10%;
}
.orb-2 {
  width: 400px;
  height: 400px;
  background: #ea580c;
  bottom: -15%;
  left: -5%;
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
  max-width: 900px;
  width: 100%;
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 44px;
}

.header {
  text-align: center;
}

.title {
  font-family: var(--font-display);
  font-size: clamp(44px, 7vw, 80px);
  font-weight: 900;
  background: linear-gradient(135deg, #f97316, #fb923c, #fdba74);
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
  background: linear-gradient(135deg, #f97316, #fdba74);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-weight: 700;
}

/* Pipeline */
.pipeline {
  display: flex;
  align-items: stretch;
  gap: 0;
  width: 100%;
}

.pipe-step {
  display: flex;
  align-items: center;
  flex: 1;
}

.step-card {
  flex: 1;
  padding: 28px 24px;
  border-radius: 20px;
  border: 1px solid rgba(249, 115, 22, 0.1);
  background: rgba(249, 115, 22, 0.03);
  transition: all 0.3s ease;
}

.step-card:hover {
  border-color: rgba(249, 115, 22, 0.25);
  background: rgba(249, 115, 22, 0.06);
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(249, 115, 22, 0.08);
}

.step-status {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
}

.step-status i {
  font-size: clamp(16px, 2vw, 22px);
}

.status-label {
  font-family: var(--font-mono, 'JetBrains Mono', monospace);
  font-size: clamp(11px, 1.3vw, 14px);
  font-weight: 700;
  letter-spacing: 1.5px;
}

.step-name {
  font-family: var(--font-display);
  font-size: clamp(20px, 2.5vw, 28px);
  font-weight: 800;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 8px;
}

.step-desc {
  font-size: clamp(13px, 1.5vw, 16px);
  color: rgba(255, 255, 255, 0.4);
  line-height: 1.5;
}

.pipe-arrow {
  padding: 0 14px;
  color: rgba(249, 115, 22, 0.3);
  font-size: 18px;
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

/* Speed block */
.speed-block {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 22px 28px;
  border-radius: 18px;
  background: rgba(249, 115, 22, 0.04);
  border: 1px solid rgba(249, 115, 22, 0.12);
  width: 100%;
}

.speed-icon {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: rgba(249, 115, 22, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.speed-icon i {
  font-size: 26px;
  color: #fb923c;
}

.speed-title {
  font-family: var(--font-display);
  font-size: clamp(18px, 2.5vw, 24px);
  font-weight: 700;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 4px;
}

.speed-desc {
  font-size: clamp(14px, 1.6vw, 17px);
  color: rgba(255, 255, 255, 0.45);
  line-height: 1.5;
}

@media (max-width: 768px) {
  .slide {
    padding: 30px 16px 16px;
    align-items: flex-start;
  }
  .content {
    gap: 24px;
  }
  .pipeline {
    flex-direction: column;
    gap: 0;
  }
  .pipe-arrow {
    padding: 4px 0;
    justify-content: center;
    font-size: 14px;
  }
  .pipe-arrow i {
    transform: rotate(90deg);
  }
  .step-card {
    padding: 16px 14px;
  }
  .step-name {
    font-size: 18px;
  }
  .step-desc {
    font-size: 13px;
  }
  .speed-block {
    flex-direction: row;
    text-align: left;
    padding: 16px 14px;
    gap: 14px;
  }
  .speed-icon {
    width: 44px;
    height: 44px;
  }
  .speed-icon i {
    font-size: 20px;
  }
  .speed-title {
    font-size: 16px;
  }
  .speed-desc {
    font-size: 13px;
  }
}
</style>
