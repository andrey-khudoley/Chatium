<template>
  <div class="slide">
    <div class="bg">
      <div class="grid-bg"></div>
      <div class="glow g1"></div>
      <div class="glow g2"></div>
    </div>

    <div class="content">
      <div class="hero">
        <div class="printer-icon">
          <div class="printer-body">
            <i class="fas fa-print"></i>
          </div>
          <div class="printer-beam"></div>
        </div>
        <h2 class="title">Печатай <span class="grad">что угодно</span></h2>
        <p class="sub">Пишешь в чат — получаешь готовый продукт</p>
        <p class="sub-hint">
          Управляй всем через один чат. Без кода, без программистов, без ожиданий.
        </p>
      </div>

      <div class="conveyors">
        <div class="conv-row">
          <div class="conveyor">
            <div class="conv-track track-left">
              <div
                v-for="(item, i) in [...services, ...services]"
                :key="'s' + i"
                class="conv-item"
                :style="{ '--accent': item.color }"
              >
                <div class="item-icon">
                  <i :class="item.icon"></i>
                </div>
                <span class="item-label">{{ item.label }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="conv-row">
          <div class="conveyor">
            <div class="conv-track track-right">
              <div
                v-for="(item, i) in [...agents, ...agents]"
                :key="'a' + i"
                class="conv-item"
                :style="{ '--accent': item.color }"
              >
                <div class="item-icon">
                  <i :class="item.icon"></i>
                </div>
                <span class="item-label">{{ item.label }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="bottom">
        <div class="bottom-line"></div>
        <p class="bottom-text">
          <i class="fas fa-infinity"></i>
          Всё из одной платформы — связано между собой
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

defineProps({ active: Boolean })

const services = [
  { label: 'Интернет-магазин', icon: 'fas fa-shopping-bag', color: '#6366f1' },
  { label: 'CRM', icon: 'fas fa-address-book', color: '#8b5cf6' },
  { label: 'Лендинг', icon: 'fas fa-desktop', color: '#a855f7' },
  { label: 'Рассылки', icon: 'fas fa-paper-plane', color: '#6366f1' },
  { label: 'Автоворонка', icon: 'fas fa-filter', color: '#8b5cf6' },
  { label: 'Платежи', icon: 'fas fa-credit-card', color: '#a855f7' },
  { label: 'Онлайн-курс', icon: 'fas fa-graduation-cap', color: '#6366f1' },
  { label: 'Аналитика', icon: 'fas fa-chart-bar', color: '#8b5cf6' },
  { label: 'Чат-бот', icon: 'fas fa-comment-dots', color: '#a855f7' },
  { label: 'Личный кабинет', icon: 'fas fa-user-circle', color: '#6366f1' },
  { label: 'Вебинар', icon: 'fas fa-video', color: '#8b5cf6' },
  { label: 'База знаний', icon: 'fas fa-book', color: '#a855f7' }
]

const agents = [
  { label: 'Продавец', icon: 'fas fa-handshake', color: '#06b6d4' },
  { label: 'Консультант', icon: 'fas fa-headset', color: '#22d3ee' },
  { label: 'Маркетолог', icon: 'fas fa-bullhorn', color: '#06b6d4' },
  { label: 'Копирайтер', icon: 'fas fa-pen-nib', color: '#22d3ee' },
  { label: 'Суппорт 24/7', icon: 'fas fa-life-ring', color: '#06b6d4' },
  { label: 'Аналитик', icon: 'fas fa-chart-pie', color: '#22d3ee' },
  { label: 'HR-ассистент', icon: 'fas fa-users', color: '#06b6d4' },
  { label: 'Контент-менеджер', icon: 'fas fa-images', color: '#22d3ee' },
  { label: 'Финансист', icon: 'fas fa-calculator', color: '#06b6d4' },
  { label: 'Ассистент', icon: 'fas fa-crown', color: '#22d3ee' }
]
</script>

<style scoped>
.slide {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow-y: auto;
  overflow-x: hidden;
  background: var(--bg-deep);
}

.bg {
  position: fixed;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.grid-bg {
  position: absolute;
  inset: 0;
  background-image: linear-gradient(rgba(99, 102, 241, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(99, 102, 241, 0.04) 1px, transparent 1px);
  background-size: 60px 60px;
  mask-image: radial-gradient(ellipse at center, black 30%, transparent 75%);
}

.glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(160px);
  animation: glow-float 16s ease-in-out infinite;
}

.g1 {
  width: 600px;
  height: 600px;
  background: #6366f1;
  opacity: 0.15;
  top: -20%;
  left: 20%;
}

.g2 {
  width: 500px;
  height: 500px;
  background: #06b6d4;
  opacity: 0.12;
  bottom: -15%;
  right: 15%;
  animation-delay: -8s;
}

@keyframes glow-float {
  0%,
  100% {
    transform: translateY(0) scale(1);
  }
  50% {
    transform: translateY(-30px) scale(1.06);
  }
}

.content {
  position: relative;
  width: 100%;
  max-width: 1200px;
  padding: 32px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 40px;
}

/* Hero */
.hero {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.printer-icon {
  position: relative;
  width: 72px;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 4px;
}

.printer-body {
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(99, 102, 241, 0.1);
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-radius: 18px;
  font-size: 28px;
  color: #818cf8;
  animation: printer-pulse 3s ease-in-out infinite;
}

@keyframes printer-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.2);
  }
  50% {
    box-shadow: 0 0 40px 10px rgba(99, 102, 241, 0.15);
  }
}

.printer-beam {
  position: absolute;
  bottom: -6px;
  left: 50%;
  transform: translateX(-50%);
  width: 36px;
  height: 3px;
  background: linear-gradient(90deg, #6366f1, #06b6d4);
  border-radius: 4px;
  animation: beam-scan 2s ease-in-out infinite;
  opacity: 0.8;
}

@keyframes beam-scan {
  0%,
  100% {
    width: 28px;
    opacity: 0.5;
  }
  50% {
    width: 52px;
    opacity: 1;
  }
}

.title {
  font-family: var(--font-display);
  font-size: clamp(32px, 5.5vw, 56px);
  font-weight: 800;
  line-height: 1.1;
  color: var(--text-primary);
}

.grad {
  background: linear-gradient(135deg, #6366f1 0%, #a855f7 40%, #06b6d4 100%);
  background-size: 200% 200%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: grad-shift 5s ease infinite;
}

@keyframes grad-shift {
  0%,
  100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

.sub {
  font-size: clamp(15px, 2vw, 20px);
  color: var(--text-secondary);
  font-weight: 400;
}

.sub-hint {
  font-size: clamp(13px, 1.5vw, 16px);
  color: var(--text-muted);
  font-weight: 400;
  margin-top: -4px;
}

/* Conveyors */
.conveyors {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.conv-row {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.row-label {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-left: 8px;
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: #818cf8;
}

.row-label i {
  font-size: 12px;
  opacity: 0.8;
}

.row-label--ai {
  color: #22d3ee;
}

.conveyor {
  width: 100%;
  overflow: hidden;
  padding: 4px 0;
  mask-image: linear-gradient(90deg, transparent, black 4%, black 96%, transparent);
}

.conv-track {
  display: flex;
  gap: 12px;
  width: max-content;
}

.track-left {
  animation: scroll-left 45s linear infinite;
}

.track-right {
  animation: scroll-right 40s linear infinite;
}

.conv-track:hover {
  animation-play-state: paused;
}

@keyframes scroll-left {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(-50%);
  }
}

@keyframes scroll-right {
  0% {
    transform: translateX(-50%);
  }
  100% {
    transform: translateX(0);
  }
}

.conv-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 20px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 14px;
  white-space: nowrap;
  cursor: default;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.conv-item:hover {
  border-color: var(--accent, rgba(99, 102, 241, 0.5));
  background: rgba(255, 255, 255, 0.06);
  transform: translateY(-3px) scale(1.03);
  box-shadow:
    0 10px 36px rgba(0, 0, 0, 0.3),
    0 0 18px color-mix(in srgb, var(--accent) 20%, transparent);
}

.item-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 9px;
  background: color-mix(in srgb, var(--accent) 15%, transparent);
  color: var(--accent);
  font-size: 14px;
  transition: transform 0.3s ease;
}

.conv-item:hover .item-icon {
  transform: scale(1.15) rotate(-5deg);
}

.item-label {
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
  letter-spacing: 0.2px;
}

/* Bottom */
.bottom {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}

.bottom-line {
  width: 60px;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(99, 102, 241, 0.4), transparent);
  border-radius: 2px;
}

.bottom-text {
  font-size: clamp(13px, 1.6vw, 17px);
  color: var(--text-muted);
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 10px;
}

.bottom-text i {
  color: #818cf8;
  font-size: 0.9em;
}

/* Mobile */
@media (max-width: 768px) {
  .content {
    padding: 20px 12px;
    gap: 28px;
  }

  .printer-icon {
    width: 56px;
    height: 56px;
  }

  .printer-body {
    width: 48px;
    height: 48px;
    font-size: 22px;
    border-radius: 14px;
  }

  .conveyors {
    gap: 18px;
  }

  .conv-item {
    padding: 8px 14px;
  }

  .item-icon {
    width: 28px;
    height: 28px;
    font-size: 12px;
  }

  .item-label {
    font-size: 12px;
  }

  .row-label {
    font-size: 11px;
  }
}
</style>
