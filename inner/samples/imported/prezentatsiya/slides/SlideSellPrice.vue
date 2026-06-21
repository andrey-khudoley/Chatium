<template>
  <div class="slide">
    <div class="bg-effects">
      <div class="glow-orb orb-1"></div>
      <div class="glow-orb orb-2"></div>
      <div class="glow-orb orb-3"></div>
    </div>

    <div class="container">
      <h2 class="title">
        И стоит это<br />
        <span class="price-hero">
          <span class="price-amount">3 000 ₽</span>
          <span class="price-period">/мес</span>
        </span>
      </h2>

      <div class="subtitle-line">
        <span class="kopecks">Сущщщие копейки</span>
      </div>

      <div class="how-it-works">
        <div class="hw-card">
          <div class="hw-icon"><i class="fas fa-wallet"></i></div>
          <div class="hw-content">
            <h3>Как рекламный кабинет</h3>
            <p>
              Оплачиваете подписку — деньги <span class="hl-green">падают на баланс</span>. На эти
              деньги питаются Ботан и Леночка.
            </p>
          </div>
        </div>
        <div class="hw-card">
          <div class="hw-icon"><i class="fas fa-bolt"></i></div>
          <div class="hw-content">
            <h3>Платите за использование</h3>
            <p>
              Не используете — деньги лежат. Используете —
              <span class="hl-green">сотрудники работают</span>. Всё прозрачно.
            </p>
          </div>
        </div>
        <div class="hw-card">
          <div class="hw-icon"><i class="fas fa-rocket"></i></div>
          <div class="hw-content">
            <h3>В разы быстрее, в разы дешевле</h3>
            <p>
              Один агент заменяет отдел. <span class="hl-green">Работает 24/7</span>. Не болеет. Не
              увольняется.
            </p>
          </div>
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
  display: flex;
  align-items: center;
  justify-content: center;
  overflow-y: auto;
  padding: 24px;
  background: var(--bg-void);
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
  top: -20%;
  right: -10%;
}

.orb-2 {
  width: 400px;
  height: 400px;
  background: #f59e0b;
  opacity: 0.1;
  bottom: -15%;
  left: -10%;
  animation-delay: -3s;
}

.orb-3 {
  width: 300px;
  height: 300px;
  background: #6366f1;
  opacity: 0.08;
  top: 50%;
  left: 50%;
  animation-delay: -6s;
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-25px);
  }
}

.container {
  max-width: 800px;
  margin: 0 auto;
  position: relative;
}

.title {
  font-family: var(--font-display);
  font-size: clamp(28px, 5vw, 48px);
  font-weight: 800;
  line-height: 1.15;
  text-align: center;
  margin-bottom: 8px;
  color: var(--text-primary);
}

.price-hero {
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
}

.price-amount {
  background: linear-gradient(135deg, #10b981 0%, #34d399 50%, #6ee7b7 100%);
  background-size: 200% 200%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: gradient-shift 4s ease infinite;
  font-size: clamp(48px, 10vw, 96px);
  font-weight: 900;
  letter-spacing: -2px;
}

.price-period {
  font-size: clamp(18px, 3vw, 28px);
  color: var(--text-muted);
  font-weight: 400;
}

@keyframes gradient-shift {
  0%,
  100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

.subtitle-line {
  text-align: center;
  margin-bottom: 36px;
}

.kopecks {
  display: inline-block;
  font-family: var(--font-display);
  font-size: clamp(16px, 3vw, 24px);
  font-weight: 700;
  color: #f59e0b;
  padding: 6px 24px;
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.25);
  border-radius: 100px;
  animation: kopecks-glow 3s ease-in-out infinite;
}

@keyframes kopecks-glow {
  0%,
  100% {
    box-shadow: 0 0 0 rgba(245, 158, 11, 0);
  }
  50% {
    box-shadow: 0 0 30px rgba(245, 158, 11, 0.2);
  }
}

.how-it-works {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 32px;
}

.hw-card {
  display: flex;
  gap: 16px;
  padding: 20px 24px;
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: 16px;
  transition: all 0.4s ease;
}

.hw-card:hover {
  border-color: rgba(16, 185, 129, 0.3);
  transform: translateX(6px);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.2);
}

.hw-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #10b981, #059669);
  border-radius: 14px;
  color: white;
  font-size: 20px;
  flex-shrink: 0;
}

.hw-card:nth-child(2) .hw-icon {
  background: linear-gradient(135deg, #f59e0b, #d97706);
}

.hw-card:nth-child(3) .hw-icon {
  background: linear-gradient(135deg, #6366f1, #4f46e5);
}

.hw-content h3 {
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 6px;
  color: var(--text-primary);
}

.hw-content p {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.5;
}

.hl-green {
  color: #10b981;
  font-weight: 600;
}

@media (max-width: 640px) {
  .hw-card {
    flex-direction: column;
    text-align: center;
  }
  .hw-icon {
    margin: 0 auto;
  }
}

@media (max-width: 480px) {
  .slide {
    padding: 16px;
  }
  .container {
    max-width: 100%;
  }
  .title {
    font-size: 22px;
  }
  .price-amount {
    font-size: 48px;
  }
  .price-period {
    font-size: 16px;
  }
  .kopecks {
    font-size: 14px;
    padding: 5px 18px;
  }
  .subtitle-line {
    margin-bottom: 24px;
  }
  .hw-card {
    padding: 16px;
    border-radius: 14px;
    gap: 12px;
  }
  .hw-icon {
    width: 40px;
    height: 40px;
    font-size: 18px;
    border-radius: 12px;
  }
  .hw-content h3 {
    font-size: 14px;
    margin-bottom: 4px;
  }
  .hw-content p {
    font-size: 13px;
  }
}
</style>
