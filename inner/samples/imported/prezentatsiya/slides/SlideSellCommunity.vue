<template>
  <div class="slide">
    <div class="bg-effects">
      <div class="glow-orb orb-1"></div>
      <div class="glow-orb orb-2"></div>
    </div>

    <div class="container">
      <div class="badge"><i class="fas fa-gift"></i> Бонус 2 из 5</div>

      <h2 class="title">
        Закрытый чат<br />
        <span class="grad-text">по Авито</span>
      </h2>

      <p class="subtitle">Для тех, кто на вебинаре и берёт подписку сейчас</p>

      <div class="content-row">
        <div class="features-list">
          <div class="feature-item">
            <div class="feature-icon"><i class="fas fa-bullhorn"></i></div>
            <div>
              <h3>Трафик с Авито</h3>
              <p>Обсуждаем стратегии, делимся рабочими связками и результатами</p>
            </div>
          </div>
          <div class="feature-item">
            <div class="feature-icon"><i class="fas fa-robot"></i></div>
            <div>
              <h3>Подключение агентов</h3>
              <p>Помогаем настроить ИИ-агентов для автоматизации работы на Авито</p>
            </div>
          </div>
          <div class="feature-item">
            <div class="feature-icon"><i class="fas fa-users"></i></div>
            <div>
              <h3>Живое общение с командой</h3>
              <p>Прямой доступ к экспертам Chatium и опытным участникам</p>
            </div>
          </div>
        </div>

        <div class="cta-block">
          <div class="lock-icon">
            <i class="fas fa-lock"></i>
          </div>
          <div class="cta-label">Профильный чат для тех, кто действует</div>
          <div class="cta-hint">Доступ — при оплате подписки сегодня</div>
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
}

.glow-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(120px);
  animation: float 12s ease-in-out infinite;
}

.orb-1 {
  width: 450px;
  height: 450px;
  background: #f59e0b;
  opacity: 0.1;
  top: -15%;
  right: -10%;
}

.orb-2 {
  width: 400px;
  height: 400px;
  background: #6366f1;
  opacity: 0.08;
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

.container {
  max-width: 860px;
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
  color: #f59e0b;
  padding: 8px 18px;
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 10px;
  background: rgba(245, 158, 11, 0.08);
  margin-bottom: 24px;
}

.title {
  font-family: var(--font-display);
  font-size: clamp(28px, 5vw, 48px);
  font-weight: 800;
  line-height: 1.15;
  margin-bottom: 12px;
  color: var(--text-primary);
}

.grad-text {
  background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 50%, #fcd34d 100%);
  background-size: 200% 200%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: gradient-shift 4s ease infinite;
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

.subtitle {
  font-size: clamp(15px, 2.5vw, 18px);
  color: var(--text-secondary);
  line-height: 1.5;
  margin-bottom: 36px;
  max-width: 500px;
}

.content-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 32px;
  align-items: start;
}

.features-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.feature-item {
  display: flex;
  gap: 16px;
  padding: 20px 24px;
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: 16px;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.feature-item:hover {
  border-color: rgba(245, 158, 11, 0.3);
  transform: translateX(6px);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.2);
}

.feature-icon {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f59e0b, #d97706);
  border-radius: 12px;
  color: white;
  font-size: 18px;
  flex-shrink: 0;
}

.feature-item:nth-child(2) .feature-icon {
  background: linear-gradient(135deg, #6366f1, #4f46e5);
}

.feature-item:nth-child(3) .feature-icon {
  background: linear-gradient(135deg, #06b6d4, #0891b2);
}

.feature-item h3 {
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.feature-item p {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
  margin: 0;
}

.cta-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 32px 28px;
  background: var(--bg-card);
  border: 1px solid rgba(245, 158, 11, 0.2);
  border-radius: 20px;
  min-width: 220px;
  position: relative;
  overflow: hidden;
}

.cta-block::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 50% 0%, rgba(245, 158, 11, 0.08) 0%, transparent 70%);
  pointer-events: none;
}

.lock-icon {
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f59e0b, #d97706);
  border-radius: 18px;
  color: white;
  font-size: 26px;
  margin-bottom: 20px;
  box-shadow: 0 8px 24px rgba(245, 158, 11, 0.25);
}

.cta-label {
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 10px;
  line-height: 1.4;
}

.cta-hint {
  font-size: 13px;
  color: #f59e0b;
  font-weight: 600;
  padding: 6px 16px;
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.2);
  border-radius: 100px;
}

@media (max-width: 768px) {
  .slide {
    align-items: flex-start;
  }
  .content-row {
    grid-template-columns: 1fr;
    gap: 20px;
  }
  .cta-block {
    min-width: unset;
    padding: 20px 18px;
  }
  .feature-item {
    flex-direction: row;
    text-align: left;
    padding: 14px 16px;
    gap: 12px;
  }
  .feature-icon {
    margin: 0;
    width: 38px;
    height: 38px;
    font-size: 16px;
  }
  .feature-item h3 {
    font-size: 15px;
  }
  .feature-item p {
    font-size: 12px;
  }
  .lock-icon {
    width: 48px;
    height: 48px;
    font-size: 20px;
    margin-bottom: 14px;
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
    margin-bottom: 8px;
  }
  .subtitle {
    font-size: 14px;
    margin-bottom: 24px;
  }
  .feature-item {
    padding: 14px 16px;
    border-radius: 14px;
    gap: 12px;
  }
  .feature-icon {
    width: 38px;
    height: 38px;
    font-size: 16px;
    border-radius: 10px;
  }
  .feature-item h3 {
    font-size: 14px;
  }
  .feature-item p {
    font-size: 12px;
  }
  .cta-block {
    padding: 24px 20px;
    border-radius: 16px;
  }
  .lock-icon {
    width: 48px;
    height: 48px;
    font-size: 20px;
    margin-bottom: 14px;
    border-radius: 14px;
  }
  .cta-label {
    font-size: 14px;
  }
  .cta-hint {
    font-size: 12px;
  }
}
</style>
