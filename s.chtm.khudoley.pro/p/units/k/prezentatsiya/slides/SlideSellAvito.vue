<template>
  <div class="slide">
    <div class="bg-effects">
      <div class="glow-orb orb-1"></div>
      <div class="glow-orb orb-2"></div>
    </div>

    <div class="container">
      <div class="badge"><i class="fas fa-chart-line"></i> Реальный кейс · emi online × Авито</div>

      <h2 class="title">
        <span class="num-big">40 000 ₽</span>
        <span class="title-sub">→ ~3 000 диалогов. 800 городов. 0 сотрудников.</span>
      </h2>

      <div class="vs-block">
        <div class="vs-side bad-side">
          <div class="vs-head">
            <span>👨‍💼 Люди</span>
            <span class="vs-amount bad">800 000 ₽+</span>
          </div>
          <ul>
            <li><i class="fas fa-times"></i> Зарплаты, найм, обучение</li>
            <li><i class="fas fa-times"></i> Больничные, отпуска, текучка</li>
            <li><i class="fas fa-times"></i> Ограниченные часы работы</li>
          </ul>
        </div>

        <div class="vs-divider">
          <div class="vs-circle">
            <span class="multiply">×20</span>
            <span class="multiply-label">дешевле</span>
          </div>
        </div>

        <div class="vs-side good-side">
          <div class="vs-head">
            <span>🤖 Леночка</span>
            <span class="vs-amount good">40 000 ₽</span>
          </div>
          <ul>
            <li><i class="fas fa-check"></i> 24/7, не устаёт, не болеет</li>
            <li><i class="fas fa-check"></i> Масштабируется мгновенно</li>
            <li><i class="fas fa-check"></i> ~3 000 диалогов за месяц</li>
          </ul>
        </div>
      </div>

      <div class="bottom-line">
        <i class="fas fa-fire"></i>
        Сущие копейки за целый отдел продаж
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
  padding: 40px 24px 24px;
  background: var(--bg-void);
}

.bg-effects {
  position: fixed;
  inset: 0;
  pointer-events: none;
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
  background: #f59e0b;
  opacity: 0.12;
  top: -15%;
  left: -10%;
}

.orb-2 {
  width: 400px;
  height: 400px;
  background: #10b981;
  opacity: 0.1;
  bottom: -10%;
  right: -10%;
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

.container {
  max-width: 850px;
  width: 100%;
  margin: 0 auto;
  position: relative;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 700;
  color: #f59e0b;
  padding: 6px 16px;
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 10px;
  background: rgba(245, 158, 11, 0.08);
  margin-bottom: 20px;
}

.title {
  margin-bottom: 28px;
}

.num-big {
  display: block;
  font-family: var(--font-display);
  font-size: clamp(32px, 6vw, 56px);
  font-weight: 900;
  background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 50%, #fcd34d 100%);
  background-size: 200% 200%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: gradient-shift 4s ease infinite;
  line-height: 1.1;
}

.title-sub {
  display: block;
  font-family: var(--font-display);
  font-size: clamp(15px, 2vw, 20px);
  font-weight: 500;
  color: var(--text-secondary);
  margin-top: 6px;
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

.vs-block {
  display: flex;
  align-items: stretch;
  gap: 0;
  margin-bottom: 20px;
}

.vs-side {
  flex: 1;
  padding: 20px;
  border-radius: 16px;
  border: 1px solid var(--border-subtle);
  transition: all 0.3s ease;
}

.vs-side:hover {
  transform: translateY(-3px);
}

.bad-side {
  background: rgba(244, 63, 94, 0.04);
  border-color: rgba(244, 63, 94, 0.2);
}

.good-side {
  background: rgba(16, 185, 129, 0.04);
  border-color: rgba(16, 185, 129, 0.2);
}

.good-side:hover {
  border-color: rgba(16, 185, 129, 0.35);
  box-shadow: 0 12px 30px rgba(16, 185, 129, 0.1);
}

.vs-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 14px;
}

.vs-amount {
  font-family: var(--font-mono);
  font-size: 22px;
  font-weight: 900;
}

.vs-amount.bad {
  color: #f43f5e;
}
.vs-amount.good {
  color: #10b981;
}

.vs-side ul {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.vs-side li {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-secondary);
}

.bad-side li i {
  color: #f43f5e;
  font-size: 11px;
  width: 14px;
  text-align: center;
}
.good-side li i {
  color: #10b981;
  font-size: 11px;
  width: 14px;
  text-align: center;
}

.vs-divider {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 72px;
  padding: 0 6px;
}

.vs-circle {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: linear-gradient(135deg, #10b981, #059669);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 24px rgba(16, 185, 129, 0.3);
  animation: pulse-circle 3s ease infinite;
}

@keyframes pulse-circle {
  0%,
  100% {
    box-shadow: 0 0 16px rgba(16, 185, 129, 0.2);
    transform: scale(1);
  }
  50% {
    box-shadow: 0 0 32px rgba(16, 185, 129, 0.4);
    transform: scale(1.05);
  }
}

.multiply {
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 900;
  color: white;
  line-height: 1;
}

.multiply-label {
  font-size: 8px;
  color: rgba(255, 255, 255, 0.8);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.bottom-line {
  text-align: center;
  font-family: var(--font-display);
  font-size: clamp(15px, 2vw, 20px);
  font-weight: 700;
  color: #f59e0b;
  padding: 14px 24px;
  background: rgba(245, 158, 11, 0.08);
  border: 1px solid rgba(245, 158, 11, 0.2);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.bottom-line i {
  animation: fire-pulse 1.5s ease infinite;
}

@keyframes fire-pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.2);
  }
}

@media (max-width: 640px) {
  .vs-block {
    flex-direction: column;
    gap: 10px;
  }
  .vs-divider {
    min-width: auto;
    padding: 6px 0;
  }
  .vs-circle {
    width: 52px;
    height: 52px;
  }
  .multiply {
    font-size: 15px;
  }
  .vs-head {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
  .slide {
    padding: 24px 14px 14px;
  }
  .badge {
    font-size: 11px;
    padding: 5px 12px;
  }
  .title {
    margin-bottom: 20px;
  }
  .num-big {
    font-size: 28px;
  }
  .title-sub {
    font-size: 14px;
  }
  .vs-side {
    padding: 16px;
    border-radius: 14px;
  }
  .vs-amount {
    font-size: 18px;
  }
  .vs-side li {
    font-size: 12px;
  }
  .bottom-line {
    font-size: 13px;
    padding: 12px 16px;
  }
}
</style>
