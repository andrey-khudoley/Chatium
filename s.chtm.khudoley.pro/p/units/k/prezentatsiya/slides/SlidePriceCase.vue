<template>
  <div class="slide">
    <div class="bg-effects">
      <div class="glow-orb orb1"></div>
      <div class="glow-orb orb2"></div>
      <div class="grid-pattern"></div>
    </div>

    <div class="container">
      <div class="badge">
        <i class="fas fa-bullseye"></i>
        <span>Кейс · emi online × Авито × Chatium</span>
      </div>

      <h2 class="title">
        2 630 диалогов. 800 городов.<br />
        <span class="gradient-text">0 сотрудников.</span>
      </h2>

      <div class="versus">
        <div class="card card-ai">
          <div class="card-badge badge-ai">
            <i class="fas fa-robot"></i>
            ИИ-агент
          </div>
          <div class="card-price">41 320 ₽</div>
          <div class="card-period">за 2 недели</div>
          <div class="card-stats">
            <div class="stat">
              <span class="stat-value">0</span>
              <span class="stat-label">людей</span>
            </div>
            <div class="stat-divider"></div>
            <div class="stat">
              <span class="stat-value">10 сек</span>
              <span class="stat-label">ответ</span>
            </div>
            <div class="stat-divider"></div>
            <div class="stat">
              <span class="stat-value">24/7</span>
              <span class="stat-label">график</span>
            </div>
          </div>
        </div>

        <div class="multiplier">
          <div class="multiplier-value">×19</div>
          <div class="multiplier-label">дешевле</div>
        </div>

        <div class="card card-human">
          <div class="card-badge badge-human">
            <i class="fas fa-users"></i>
            Команда людей
          </div>
          <div class="card-price">790 000 ₽</div>
          <div class="card-period">за 2 недели</div>
          <div class="card-stats">
            <div class="stat">
              <span class="stat-value">15</span>
              <span class="stat-label">людей</span>
            </div>
            <div class="stat-divider"></div>
            <div class="stat">
              <span class="stat-value">5 мин</span>
              <span class="stat-label">ответ</span>
            </div>
            <div class="stat-divider"></div>
            <div class="stat">
              <span class="stat-value">3 смены</span>
              <span class="stat-label">график</span>
            </div>
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
  padding: 40px 24px 24px;
  background: var(--bg-deep);
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
  animation: float 16s ease-in-out infinite;
}

.orb1 {
  width: 500px;
  height: 500px;
  background: #f59e0b;
  opacity: 0.12;
  top: -10%;
  right: 10%;
}

.orb2 {
  width: 400px;
  height: 400px;
  background: #ef4444;
  opacity: 0.08;
  bottom: 10%;
  left: 5%;
  animation-delay: -5s;
}

.grid-pattern {
  position: absolute;
  inset: 0;
  background-image: linear-gradient(rgba(245, 158, 11, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(245, 158, 11, 0.03) 1px, transparent 1px);
  background-size: 50px 50px;
  mask-image: radial-gradient(ellipse at center, black 40%, transparent 80%);
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0) scale(1);
  }
  50% {
    transform: translateY(-25px) scale(1.04);
  }
}

.container {
  position: relative;
  max-width: 1000px;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 16px;
  border-radius: 100px;
  font-size: 13px;
  font-weight: 600;
  color: #fbbf24;
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.25);
  margin-bottom: 24px;
  letter-spacing: 0.5px;
}

.title {
  font-family: var(--font-display);
  font-size: clamp(26px, 4.5vw, 48px);
  font-weight: 800;
  line-height: 1.15;
  color: var(--text-primary);
  margin-bottom: 40px;
}

.gradient-text {
  background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.versus {
  display: flex;
  align-items: center;
  gap: 0;
  width: 100%;
  margin-bottom: 32px;
}

.card {
  flex: 1;
  border-radius: 24px;
  padding: 32px 24px 28px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  transition: transform 0.3s ease;
}

.card:hover {
  transform: translateY(-4px);
}

.card-ai {
  background: rgba(16, 185, 129, 0.06);
  border: 1px solid rgba(16, 185, 129, 0.2);
}

.card-human {
  background: rgba(239, 68, 68, 0.04);
  border: 1px solid rgba(239, 68, 68, 0.15);
}

.card-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 14px;
  border-radius: 100px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 8px;
}

.badge-ai {
  background: rgba(16, 185, 129, 0.15);
  color: #34d399;
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.badge-human {
  background: rgba(239, 68, 68, 0.1);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.25);
}

.card-price {
  font-family: var(--font-display);
  font-size: clamp(26px, 4vw, 42px);
  font-weight: 900;
  line-height: 1;
  color: var(--text-primary);
  letter-spacing: -1px;
}

.card-ai .card-price {
  background: linear-gradient(135deg, #10b981, #06b6d4);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.card-human .card-price {
  color: rgba(255, 255, 255, 0.4);
  text-decoration: line-through;
  text-decoration-color: rgba(239, 68, 68, 0.5);
}

.card-period {
  font-size: 13px;
  color: var(--text-muted);
  margin-bottom: 12px;
}

.card-stats {
  display: flex;
  align-items: center;
  gap: 0;
  width: 100%;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.stat-value {
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 800;
  color: var(--text-primary);
}

.card-human .stat-value {
  color: var(--text-secondary);
}

.stat-label {
  font-size: 11px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-divider {
  width: 1px;
  height: 28px;
  background: rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
}

.multiplier {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 0 20px;
  flex-shrink: 0;
}

.multiplier-value {
  font-family: var(--font-display);
  font-size: clamp(36px, 6vw, 64px);
  font-weight: 900;
  line-height: 1;
  background: linear-gradient(135deg, #f59e0b, #ef4444);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: pulse-scale 3s ease-in-out infinite;
}

@keyframes pulse-scale {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

.multiplier-label {
  font-size: 14px;
  font-weight: 700;
  color: #fbbf24;
  text-transform: uppercase;
  letter-spacing: 2px;
}

.bottom-line {
  font-size: clamp(13px, 1.5vw, 16px);
  color: var(--text-muted);
  max-width: 600px;
  line-height: 1.5;
}

@media (max-width: 768px) {
  .versus {
    flex-direction: column;
    gap: 0;
  }

  .card {
    width: 100%;
    padding: 24px 20px 20px;
    border-radius: 20px;
  }

  .multiplier {
    padding: 16px 0;
    flex-direction: row;
    gap: 10px;
  }

  .multiplier-value {
    font-size: 36px;
  }

  .card-price {
    font-size: 32px;
  }

  .title {
    margin-bottom: 28px;
  }
}

@media (max-width: 480px) {
  .slide {
    padding: 24px 14px 14px;
  }
  .badge {
    font-size: 11px;
    padding: 5px 12px;
    margin-bottom: 16px;
  }
  .title {
    font-size: 22px;
    margin-bottom: 20px;
  }
  .card {
    padding: 18px 16px 16px;
    border-radius: 16px;
  }
  .card-badge {
    font-size: 10px;
    padding: 4px 10px;
  }
  .card-price {
    font-size: 26px;
  }
  .card-period {
    font-size: 12px;
  }
  .stat-value {
    font-size: 14px;
  }
  .stat-label {
    font-size: 10px;
  }
  .multiplier-value {
    font-size: 28px;
  }
  .multiplier-label {
    font-size: 12px;
  }
}
</style>
