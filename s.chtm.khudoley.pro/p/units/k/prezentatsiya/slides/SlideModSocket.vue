<template>
  <div class="slide">
    <div class="bg-effects">
      <div class="glow-orb orb-1"></div>
      <div class="glow-orb orb-2"></div>
      <div class="grid-noise"></div>
    </div>

    <div class="content">
      <div class="header">
        <h2 class="title">Реалтайм</h2>
        <p class="subtitle">Всё обновляется <span class="accent">без перезагрузки</span></p>
      </div>

      <div class="timeline">
        <div class="timeline-line">
          <div
            class="pulse-dot"
            v-for="n in 6"
            :key="n"
            :style="{ left: (n - 1) * 20 + '%', animationDelay: n * 0.3 + 's' }"
          ></div>
          <div
            class="signal-wave"
            v-for="n in 3"
            :key="'w' + n"
            :style="{ left: (n - 1) * 40 + 10 + '%', animationDelay: n * 0.8 + 's' }"
          ></div>
        </div>

        <div class="timeline-items">
          <div class="timeline-item" v-for="(f, i) in features" :key="i">
            <div class="item-connector">
              <div class="connector-dot"></div>
              <div class="connector-line"></div>
            </div>
            <div class="item-card">
              <div class="item-number">{{ String(i + 1).padStart(2, '0') }}</div>
              <div class="item-icon">
                <i :class="f.icon"></i>
              </div>
              <div class="item-body">
                <h3>{{ f.title }}</h3>
                <p>{{ f.desc }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({ active: Boolean })

const features = [
  {
    icon: 'fas fa-comments',
    title: 'Живые чаты',
    desc: 'Сообщения появляются мгновенно — как в Telegram. Никаких задержек и кнопок «обновить».'
  },
  {
    icon: 'fas fa-bell',
    title: 'Пуш-уведомления',
    desc: 'Оплата прошла, заказ создан, клиент написал — менеджер видит сразу, без обновления страницы.'
  },
  {
    icon: 'fas fa-arrows-rotate',
    title: 'Синхронизация данных',
    desc: 'Таблицы, дашборды, статусы — всё обновляется у всех одновременно. Один источник правды.'
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
  width: 550px;
  height: 550px;
  background: #f43f5e;
  top: -20%;
  right: -10%;
}
.orb-2 {
  width: 400px;
  height: 400px;
  background: #fb7185;
  bottom: -15%;
  left: -5%;
  animation-delay: -8s;
}

.grid-noise {
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");
  opacity: 0.4;
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-35px);
  }
}

.content {
  max-width: 1100px;
  width: 100%;
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 48px;
}

.header {
  text-align: center;
}

.title {
  font-family: var(--font-display);
  font-size: clamp(48px, 7vw, 84px);
  font-weight: 900;
  background: linear-gradient(135deg, #f43f5e, #fb7185, #fda4af);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
  line-height: 1.1;
}

.subtitle {
  font-family: var(--font-display);
  font-size: clamp(22px, 3.5vw, 36px);
  color: var(--text-secondary);
  margin: 16px 0 0;
  font-weight: 500;
}

.accent {
  background: linear-gradient(135deg, #f43f5e, #fda4af);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-weight: 700;
}

/* Timeline */
.timeline {
  position: relative;
}

.timeline-line {
  position: absolute;
  top: 0;
  left: 40px;
  right: 40px;
  height: 3px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(244, 63, 94, 0.3),
    rgba(251, 113, 133, 0.5),
    rgba(244, 63, 94, 0.3),
    transparent
  );
  border-radius: 2px;
}

.pulse-dot {
  position: absolute;
  top: 50%;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #f43f5e;
  transform: translate(-50%, -50%);
  animation: pulse-travel 4s ease-in-out infinite;
}

@keyframes pulse-travel {
  0%,
  100% {
    opacity: 0.2;
    box-shadow: 0 0 4px rgba(244, 63, 94, 0.3);
  }
  50% {
    opacity: 1;
    box-shadow:
      0 0 20px rgba(244, 63, 94, 0.8),
      0 0 40px rgba(244, 63, 94, 0.3);
  }
}

.signal-wave {
  position: absolute;
  top: 50%;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid rgba(244, 63, 94, 0.4);
  transform: translate(-50%, -50%) scale(0);
  animation: wave-expand 3s ease-out infinite;
}

@keyframes wave-expand {
  0% {
    transform: translate(-50%, -50%) scale(0);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) scale(4);
    opacity: 0;
  }
}

.timeline-items {
  display: flex;
  gap: 24px;
  padding-top: 32px;
}

.timeline-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.item-connector {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 16px;
}

.connector-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #f43f5e;
  box-shadow:
    0 0 12px rgba(244, 63, 94, 0.6),
    0 0 30px rgba(244, 63, 94, 0.2);
  position: relative;
}

.connector-dot::before {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 2px solid rgba(244, 63, 94, 0.3);
  animation: ring-pulse 2s ease-in-out infinite;
}

@keyframes ring-pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.5;
  }
  50% {
    transform: scale(1.4);
    opacity: 0;
  }
}

.connector-line {
  width: 2px;
  height: 20px;
  background: linear-gradient(to bottom, #f43f5e, transparent);
}

.item-card {
  position: relative;
  padding: 28px 24px;
  border-radius: 20px;
  background: rgba(244, 63, 94, 0.03);
  border: 1px solid rgba(244, 63, 94, 0.1);
  transition: all 0.4s ease;
  text-align: center;
  width: 100%;
  overflow: hidden;
}

.item-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, #f43f5e, transparent);
  opacity: 0;
  transition: opacity 0.4s;
}

.item-card:hover::before {
  opacity: 1;
}

.item-card:hover {
  border-color: rgba(244, 63, 94, 0.25);
  background: rgba(244, 63, 94, 0.06);
  transform: translateY(-4px);
  box-shadow: 0 16px 48px rgba(244, 63, 94, 0.12);
}

.item-number {
  position: absolute;
  top: 12px;
  right: 16px;
  font-family: var(--font-mono, 'JetBrains Mono', monospace);
  font-size: 13px;
  color: rgba(244, 63, 94, 0.25);
  font-weight: 600;
}

.item-icon {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: rgba(244, 63, 94, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
  border: 1px solid rgba(244, 63, 94, 0.15);
}

.item-icon i {
  font-size: 22px;
  color: #fb7185;
}

.item-body h3 {
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 10px;
}

.item-body p {
  font-size: 15px;
  color: var(--text-tertiary, rgba(255, 255, 255, 0.5));
  margin: 0;
  line-height: 1.6;
}

@media (max-width: 768px) {
  .slide {
    padding: 30px 16px 16px;
    align-items: flex-start;
  }
  .timeline-line {
    display: none;
  }
  .timeline-items {
    flex-direction: column;
    gap: 12px;
    padding-top: 0;
  }
  .item-connector {
    display: none;
  }
  .item-card {
    padding: 16px;
    display: flex;
    flex-direction: row;
    gap: 14px;
    text-align: left;
  }
  .item-icon {
    margin: 0;
    width: 40px;
    height: 40px;
    flex-shrink: 0;
  }
  .item-icon i {
    font-size: 18px;
  }
  .item-body h3 {
    font-size: 16px;
  }
  .item-body p {
    font-size: 13px;
  }
  .content {
    gap: 24px;
  }
  .item-number {
    display: none;
  }
}

@media (max-width: 480px) {
  .content {
    gap: 28px;
  }
  .item-icon {
    width: 44px;
    height: 44px;
  }
  .item-icon i {
    font-size: 18px;
  }
}
</style>
