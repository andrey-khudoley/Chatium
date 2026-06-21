<template>
  <div class="slide">
    <div class="bg-effects">
      <div class="glow-orb orb-1"></div>
      <div class="glow-orb orb-2"></div>
    </div>

    <div class="content">
      <div class="header">
        <h2 class="title">Отложенные задачи</h2>
        <p class="subtitle">
          Напомнить, списать, отправить — <span class="accent">в нужное время</span>
        </p>
      </div>

      <div class="timeline">
        <div class="timeline-row" v-for="(item, i) in items" :key="i">
          <div class="time-badge">
            <i :class="item.icon"></i>
            <span class="time-label">{{ item.when }}</span>
          </div>
          <div class="divider-dot"></div>
          <div class="task-text">{{ item.text }}</div>
        </div>
      </div>

      <div class="bottom-line">
        <span class="bottom-pill" v-for="(p, i) in pills" :key="i">{{ p }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({ active: Boolean })

const items = [
  { icon: 'fas fa-bell', when: 'через 2 ч', text: 'Напоминание о вебинаре' },
  { icon: 'fas fa-credit-card', when: 'каждый месяц', text: 'Списание подписки — 2 990 ₽' },
  { icon: 'fas fa-envelope', when: 'каждый пн', text: 'Отчёт руководителю' }
]

const pills = ['Через N минут', 'По дате', 'По расписанию', 'Отмена и перенос']
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
  background: #10b981;
  top: -15%;
  left: -10%;
}
.orb-2 {
  width: 400px;
  height: 400px;
  background: #059669;
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
  max-width: 860px;
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
  background: linear-gradient(135deg, #10b981, #34d399, #6ee7b7);
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
  background: linear-gradient(135deg, #10b981, #6ee7b7);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-weight: 700;
}

/* Timeline */
.timeline {
  display: flex;
  flex-direction: column;
  gap: 22px;
  width: 100%;
}

.timeline-row {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 18px 28px;
  border-radius: 16px;
  background: rgba(16, 185, 129, 0.04);
  border: 1px solid rgba(16, 185, 129, 0.1);
  transition: all 0.3s ease;
}

.timeline-row:hover {
  background: rgba(16, 185, 129, 0.08);
  border-color: rgba(16, 185, 129, 0.25);
  box-shadow: 0 8px 32px rgba(16, 185, 129, 0.08);
}

.time-badge {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  min-width: 200px;
}

.time-badge i {
  font-size: clamp(20px, 2.5vw, 28px);
  color: #34d399;
}

.time-label {
  font-family: var(--font-mono, 'JetBrains Mono', monospace);
  font-size: clamp(16px, 2vw, 22px);
  font-weight: 700;
  color: #6ee7b7;
  letter-spacing: -0.5px;
  white-space: nowrap;
}

.divider-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(16, 185, 129, 0.35);
  flex-shrink: 0;
}

.task-text {
  font-family: var(--font-body);
  font-size: clamp(18px, 2.5vw, 26px);
  color: rgba(255, 255, 255, 0.85);
  font-weight: 500;
  line-height: 1.3;
}

/* Bottom pills */
.bottom-line {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
}

.bottom-pill {
  padding: 10px 22px;
  border-radius: 100px;
  background: rgba(16, 185, 129, 0.06);
  border: 1px solid rgba(16, 185, 129, 0.12);
  font-size: clamp(13px, 1.6vw, 16px);
  font-weight: 500;
  color: var(--text-secondary);
  transition: all 0.3s ease;
}

.bottom-pill:hover {
  border-color: rgba(16, 185, 129, 0.3);
  background: rgba(16, 185, 129, 0.1);
}

@media (max-width: 768px) {
  .slide {
    padding: 30px 16px 16px;
  }
  .content {
    gap: 30px;
  }
  .timeline-row {
    flex-direction: column;
    gap: 8px;
    padding: 16px 18px;
    align-items: flex-start;
  }
  .time-badge {
    min-width: unset;
  }
  .divider-dot {
    display: none;
  }
  .bottom-pill {
    padding: 8px 16px;
  }
}
</style>
