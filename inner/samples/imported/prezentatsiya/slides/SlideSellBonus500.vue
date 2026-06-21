<template>
  <div class="slide">
    <div class="bg-effects">
      <div class="glow-orb orb-1"></div>
      <div class="glow-orb orb-2"></div>
      <div class="sparkles">
        <span
          v-for="n in 10"
          :key="n"
          class="sparkle"
          :style="{
            left: n * 9 + 2 + '%',
            top: 20 + Math.sin(n) * 30 + '%',
            animationDelay: n * 0.4 + 's'
          }"
          >✦</span
        >
      </div>
    </div>

    <div class="container">
      <div class="badge"><i class="fas fa-gift"></i> Бонус 1 из 5</div>

      <h2 class="title">Дарим <span class="hl-green">500 ₽</span> на баланс</h2>

      <div class="flow">
        <div class="flow-step">
          <div class="flow-num">1</div>
          <div class="flow-content">
            <h3>Оплачиваете подписку</h3>
            <div class="flow-amount">3 000 ₽</div>
          </div>
        </div>
        <div class="flow-arrow"><i class="fas fa-arrow-right"></i></div>
        <div class="flow-step highlight-step">
          <div class="flow-num gift">🎁</div>
          <div class="flow-content">
            <h3>Получаете на баланс</h3>
            <div class="flow-amount big">3 500 ₽</div>
            <div class="flow-bonus">+500 ₽ наш подарок</div>
          </div>
        </div>
        <div class="flow-arrow"><i class="fas fa-arrow-right"></i></div>
        <div class="flow-step">
          <div class="flow-num">3</div>
          <div class="flow-content">
            <h3>Начинаете работать</h3>
            <div class="flow-sub">за наш счёт</div>
          </div>
        </div>
      </div>

      <div class="guarantee-block">
        <div class="guarantee-icon">
          <i class="fas fa-shield-halved"></i>
        </div>
        <div class="guarantee-content">
          <h3>Гарантия возврата</h3>
          <p>
            Не понравилось? <span class="hl-green">Вернём ваши 3 000 ₽</span>, если вы их не
            потратили.
          </p>
          <p class="guarantee-small">А если потратили — значит вам понравилось 😏</p>
        </div>
      </div>

      <div class="warning-block">
        <div class="warning-icon">⚠️</div>
        <div class="warning-content">
          <h3>Осторожно: вызывает привыкание</h3>
          <p>За уши не оттащишь. Лудомания начнётся. Это опасно. Вы предупреждены.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({ active: Boolean })
</script>

<style scoped>
.slide {
  position: absolute;
  inset: 0;
  overflow-y: auto;
  padding: 40px 24px 24px;
  background: var(--bg-void);
  display: flex;
  align-items: center;
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
  animation: float 12s ease-in-out infinite;
}

.orb-1 {
  width: 500px;
  height: 500px;
  background: #10b981;
  opacity: 0.12;
  top: -15%;
  right: -5%;
}

.orb-2 {
  width: 400px;
  height: 400px;
  background: #8b5cf6;
  opacity: 0.1;
  bottom: -10%;
  left: -10%;
  animation-delay: -4s;
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-20px);
  }
}

.sparkles {
  position: absolute;
  inset: 0;
}

.sparkle {
  position: absolute;
  font-size: 16px;
  color: #f59e0b;
  opacity: 0;
  animation: twinkle 3s ease-in-out infinite;
}

@keyframes twinkle {
  0%,
  100% {
    opacity: 0;
    transform: scale(0.5) rotate(0deg);
  }
  50% {
    opacity: 0.4;
    transform: scale(1.2) rotate(180deg);
  }
}

.container {
  max-width: 780px;
  margin: 0 auto;
  position: relative;
  width: 100%;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 700;
  color: #8b5cf6;
  padding: 8px 18px;
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 10px;
  background: rgba(139, 92, 246, 0.08);
  margin-bottom: 24px;
}

.title {
  font-family: var(--font-display);
  font-size: clamp(28px, 5vw, 48px);
  font-weight: 800;
  line-height: 1.2;
  margin-bottom: 36px;
  color: var(--text-primary);
}

.hl-green {
  color: #10b981;
  font-weight: 900;
}

.flow {
  display: flex;
  align-items: stretch;
  gap: 0;
  margin-bottom: 28px;
}

.flow-step {
  flex: 1;
  padding: 24px 20px;
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: 16px;
  text-align: center;
  transition: all 0.4s ease;
}

.flow-step:hover {
  transform: translateY(-4px);
  border-color: rgba(99, 102, 241, 0.3);
}

.highlight-step {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(16, 185, 129, 0.02) 100%);
  border-color: rgba(16, 185, 129, 0.3);
  position: relative;
}

.highlight-step::before {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.3), rgba(6, 182, 212, 0.2));
  z-index: -1;
  filter: blur(8px);
  opacity: 0.5;
}

.flow-num {
  width: 44px;
  height: 44px;
  margin: 0 auto 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(99, 102, 241, 0.15);
  border-radius: 50%;
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 800;
  color: var(--accent-indigo);
}

.flow-num.gift {
  background: rgba(16, 185, 129, 0.15);
  font-size: 24px;
}

.flow-content h3 {
  font-family: var(--font-display);
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.flow-amount {
  font-family: var(--font-mono);
  font-size: 22px;
  font-weight: 800;
  color: var(--text-primary);
}

.flow-amount.big {
  font-size: 28px;
  color: #10b981;
}

.flow-bonus {
  font-size: 13px;
  color: #f59e0b;
  font-weight: 700;
  margin-top: 4px;
}

.flow-sub {
  font-size: 14px;
  color: var(--text-muted);
}

.flow-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 40px;
  color: var(--text-muted);
  font-size: 16px;
  animation: arrow-pulse 2s ease infinite;
}

@keyframes arrow-pulse {
  0%,
  100% {
    transform: translateX(0);
  }
  50% {
    transform: translateX(4px);
  }
}

.guarantee-block {
  display: flex;
  gap: 18px;
  padding: 24px 28px;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(16, 185, 129, 0.02) 100%);
  border: 1px solid rgba(16, 185, 129, 0.25);
  border-radius: 18px;
  margin-bottom: 16px;
  transition: all 0.4s ease;
}

.guarantee-block:hover {
  border-color: rgba(16, 185, 129, 0.4);
  transform: translateY(-2px);
  box-shadow: 0 16px 40px rgba(16, 185, 129, 0.1);
}

.guarantee-icon {
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #10b981, #059669);
  border-radius: 14px;
  color: white;
  font-size: 24px;
  flex-shrink: 0;
}

.guarantee-content h3 {
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.guarantee-content p {
  font-size: 15px;
  color: var(--text-secondary);
  margin: 0 0 4px;
  line-height: 1.5;
}

.guarantee-small {
  font-size: 13px !important;
  color: var(--text-muted) !important;
  font-style: italic;
}

.warning-block {
  display: flex;
  gap: 14px;
  padding: 18px 22px;
  background: rgba(245, 158, 11, 0.06);
  border: 1px solid rgba(245, 158, 11, 0.2);
  border-radius: 14px;
  transition: all 0.3s ease;
}

.warning-block:hover {
  border-color: rgba(245, 158, 11, 0.35);
}

.warning-icon {
  font-size: 28px;
  flex-shrink: 0;
}

.warning-content h3 {
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 700;
  color: #f59e0b;
  margin-bottom: 4px;
}

.warning-content p {
  font-size: 13px;
  color: var(--text-muted);
  margin: 0;
  line-height: 1.5;
}

@media (max-width: 640px) {
  .slide {
    align-items: flex-start;
  }
  .flow {
    flex-direction: column;
    gap: 0;
  }
  .flow-arrow {
    min-width: auto;
    padding: 4px 0;
    transform: rotate(90deg);
  }
  .flow-step {
    padding: 16px 14px;
  }
  .flow-num {
    width: 36px;
    height: 36px;
    font-size: 16px;
    margin-bottom: 8px;
  }
  .flow-content h3 {
    font-size: 13px;
  }
  .flow-amount {
    font-size: 18px;
  }
  .flow-amount.big {
    font-size: 22px;
  }
  .guarantee-block {
    flex-direction: row;
    text-align: left;
    padding: 16px 14px;
    gap: 14px;
  }
  .guarantee-icon {
    width: 44px;
    height: 44px;
    font-size: 20px;
    border-radius: 12px;
  }
  .guarantee-content h3 {
    font-size: 15px;
  }
  .guarantee-content p {
    font-size: 13px;
  }
  .warning-block {
    flex-direction: row;
    text-align: left;
    padding: 14px 14px;
    gap: 10px;
  }
  .warning-icon {
    font-size: 22px;
  }
  .warning-content h3 {
    font-size: 14px;
  }
  .warning-content p {
    font-size: 12px;
  }
}

@media (max-width: 480px) {
  .slide {
    padding: 24px 14px 14px;
  }
  .badge {
    font-size: 11px;
    padding: 6px 14px;
    margin-bottom: 16px;
  }
  .title {
    font-size: 24px;
    margin-bottom: 24px;
  }
  .flow-step {
    padding: 16px 14px;
    border-radius: 14px;
  }
  .flow-num {
    width: 36px;
    height: 36px;
    font-size: 16px;
    margin-bottom: 8px;
  }
  .flow-content h3 {
    font-size: 13px;
  }
  .flow-amount {
    font-size: 18px;
  }
  .flow-amount.big {
    font-size: 22px;
  }
  .flow-bonus {
    font-size: 12px;
  }
  .guarantee-block {
    padding: 18px 16px;
    border-radius: 14px;
  }
  .guarantee-icon {
    width: 44px;
    height: 44px;
    font-size: 20px;
    border-radius: 12px;
  }
  .guarantee-content h3 {
    font-size: 16px;
  }
  .guarantee-content p {
    font-size: 13px;
  }
  .warning-block {
    padding: 14px 16px;
    border-radius: 12px;
  }
  .warning-icon {
    font-size: 22px;
  }
  .warning-content h3 {
    font-size: 14px;
  }
  .warning-content p {
    font-size: 12px;
  }
}
</style>
