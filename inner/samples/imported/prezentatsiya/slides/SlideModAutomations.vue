<template>
  <div class="slide">
    <div class="bg-effects">
      <div class="glow-orb orb-1"></div>
      <div class="glow-orb orb-2"></div>
    </div>

    <div class="content">
      <h2 class="title">
        <span class="module-name">Автоматизации</span>
      </h2>

      <p class="headline">
        Опиши процесс.<br />
        <span class="gradient-text-amber">Остальное — на автомате.</span>
      </p>

      <div class="pipeline">
        <div
          v-for="(s, i) in pipeline"
          :key="s.text"
          class="pipe-step"
          :style="{ transitionDelay: i * 0.12 + 's' }"
        >
          <div class="pipe-icon"><i :class="s.icon"></i></div>
          <div class="pipe-text">{{ s.text }}</div>
          <div v-if="i < pipeline.length - 1" class="pipe-arrow">
            <i class="fas fa-chevron-right"></i>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({ active: Boolean })

const pipeline = [
  { icon: 'fas fa-bolt', text: 'Событие' },
  { icon: 'fas fa-filter', text: 'Условие' },
  { icon: 'fas fa-clock', text: 'Задержка' },
  { icon: 'fas fa-paper-plane', text: 'Действие' }
]

const features = [
  'Событие → Действие',
  'Условия и фильтры',
  'Задержки по времени',
  'Цепочки шагов',
  'Без кода'
]
</script>

<style scoped>
.slide {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px 24px 24px;
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
  filter: blur(120px);
  opacity: 0.12;
  animation: float 18s ease-in-out infinite;
}
.orb-1 {
  width: 500px;
  height: 500px;
  background: #f59e0b;
  top: -20%;
  right: -10%;
}
.orb-2 {
  width: 400px;
  height: 400px;
  background: #f43f5e;
  bottom: -15%;
  left: -5%;
  animation-delay: -6s;
}

.content {
  max-width: 900px;
  width: 100%;
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.module-badge {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 20px;
}
.badge-icon {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: rgba(245, 158, 11, 0.12);
  color: #f59e0b;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}
.badge-group {
  display: block;
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  color: #f59e0b;
  letter-spacing: 2px;
}
.badge-num {
  display: block;
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 2px;
}

.title {
  margin-bottom: 12px;
}
.module-name {
  display: block;
  font-family: var(--font-mono);
  font-size: clamp(48px, 8vw, 80px);
  font-weight: 900;
  background: linear-gradient(135deg, #f59e0b, #f43f5e);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.module-subtitle {
  display: block;
  font-family: var(--font-display);
  font-size: 16px;
  color: var(--text-muted);
  font-weight: 600;
  margin-top: 4px;
}

.headline {
  font-family: var(--font-display);
  font-size: clamp(24px, 5vw, 38px);
  font-weight: 700;
  line-height: 1.3;
  margin-bottom: 20px;
}
.gradient-text-amber {
  background: linear-gradient(135deg, #f59e0b, #fbbf24);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.biz-block {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 20px;
  border-radius: 16px;
  background: rgba(245, 158, 11, 0.05);
  border: 1px solid rgba(245, 158, 11, 0.12);
  margin-bottom: 24px;
}
.biz-icon {
  font-size: 28px;
  flex-shrink: 0;
}
.biz-block p {
  font-size: 15px;
  color: var(--text-secondary);
  line-height: 1.7;
  margin: 0;
}

.pipeline {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  margin-bottom: 20px;
  flex-wrap: wrap;
}
.pipe-step {
  display: flex;
  align-items: center;
  gap: 8px;
}
.pipe-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #f59e0b;
  font-size: 14px;
}
.pipe-text {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
}
.pipe-arrow {
  color: var(--text-muted);
  font-size: 10px;
  margin: 0 8px;
}

.features {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 24px;
}
.chip {
  padding: 8px 14px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 500;
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  color: var(--text-secondary);
}

.quote {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px 20px;
  border-radius: 14px;
  background: rgba(245, 158, 11, 0.04);
  border-left: 3px solid #f59e0b;
}
.quote i {
  color: #f59e0b;
  opacity: 0.4;
  font-size: 14px;
  margin-top: 3px;
}
.quote p {
  font-size: 14px;
  color: #fbbf24;
  font-style: italic;
  line-height: 1.6;
  margin: 0;
}

@media (max-width: 640px) {
  .slide {
    padding: 24px 16px 16px;
    align-items: center;
  }
  .pipeline {
    gap: 4px;
  }
  .module-name {
    font-size: 40px;
  }
  .headline {
    font-size: 22px;
    margin-bottom: 16px;
  }
  .pipe-icon {
    width: 34px;
    height: 34px;
    font-size: 12px;
  }
  .pipe-text {
    font-size: 12px;
  }
}
</style>
