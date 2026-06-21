<template>
  <div class="slide">
    <div class="bg-effects">
      <div class="glow-orb orb-1"></div>
      <div class="glow-orb orb-2"></div>
    </div>

    <div class="container">
      <div class="badge"><i class="fas fa-gift"></i> Бонус 4 из 5</div>

      <h2 class="title"><span class="grad-gold">Фан-клуб</span> Ботана</h2>
      <p class="subtitle">Основатель — Алексей Радонец</p>

      <div class="hero-block">
        <div class="hero-icon"><i class="fas fa-star"></i></div>
        <div class="hero-info">
          <h3>30 дней бесплатного доступа</h3>
          <p>
            Мастермайнды, куча шаблонов, помощь от опытных участников. Чтобы быстрее войти в курс
            дела и разобраться.
          </p>
        </div>
      </div>

      <div class="features-grid">
        <div class="feature-card">
          <div class="feature-icon"><i class="fas fa-users"></i></div>
          <h4>Мастермайнды</h4>
          <p>Еженедельные разборы и обмен опытом с другими участниками</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon"><i class="fas fa-layer-group"></i></div>
          <h4>Готовые шаблоны</h4>
          <p>Копируй и адаптируй под свои задачи — не начинай с нуля</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon"><i class="fas fa-bolt"></i></div>
          <h4>Быстрый старт</h4>
          <p>Помощь от опытных участников — войдёшь в курс дела за дни</p>
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
  width: 500px;
  height: 500px;
  background: #f59e0b;
  opacity: 0.12;
  top: -15%;
  left: -5%;
}

.orb-2 {
  width: 400px;
  height: 400px;
  background: #eab308;
  opacity: 0.08;
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
  max-width: 720px;
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
  font-size: clamp(28px, 5vw, 44px);
  font-weight: 800;
  line-height: 1.2;
  margin-bottom: 8px;
  color: var(--text-primary);
}

.subtitle {
  font-family: var(--font-body);
  font-size: clamp(15px, 2.5vw, 18px);
  color: var(--text-secondary);
  margin-bottom: 28px;
  opacity: 0.8;
}

.grad-gold {
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

.hero-block {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-bottom: 28px;
  padding: 20px 24px;
  background: var(--bg-card);
  border: 1px solid rgba(245, 158, 11, 0.2);
  border-radius: 16px;
  transition: all 0.4s ease;
}

.hero-block:hover {
  border-color: rgba(245, 158, 11, 0.4);
  transform: translateY(-2px);
  box-shadow: 0 12px 32px rgba(245, 158, 11, 0.1);
}

.hero-icon {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: white;
  font-size: 24px;
  flex-shrink: 0;
}

.hero-info h3 {
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 6px;
}

.hero-info p {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  margin-bottom: 24px;
}

.feature-card {
  padding: 20px;
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: 14px;
  text-align: center;
  transition: all 0.4s ease;
}

.feature-card:hover {
  border-color: rgba(245, 158, 11, 0.3);
  transform: translateY(-4px);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.2);
}

.feature-icon {
  width: 44px;
  height: 44px;
  margin: 0 auto 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(245, 158, 11, 0.12);
  border-radius: 12px;
  color: #f59e0b;
  font-size: 18px;
}

.feature-card h4 {
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 6px;
}

.feature-card p {
  font-size: 13px;
  color: var(--text-muted);
  line-height: 1.5;
  margin: 0;
}

.value-block {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 16px 20px;
  background: rgba(16, 185, 129, 0.06);
  border: 1px solid rgba(16, 185, 129, 0.15);
  border-radius: 14px;
}

.value-label {
  font-size: 14px;
  color: var(--text-muted);
}

.value-new {
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 700;
  color: #10b981;
}

@media (max-width: 640px) {
  .slide {
    align-items: flex-start;
  }
  .hero-block {
    flex-direction: row;
    text-align: left;
    padding: 16px 14px;
    gap: 14px;
  }
  .hero-icon {
    width: 44px;
    height: 44px;
    font-size: 20px;
  }
  .hero-info h3 {
    font-size: 16px;
  }
  .hero-info p {
    font-size: 13px;
  }
  .features-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }
  .feature-card {
    padding: 14px;
    text-align: left;
    display: flex;
    flex-direction: row;
    gap: 12px;
    align-items: center;
  }
  .feature-icon {
    margin: 0;
    width: 38px;
    height: 38px;
    flex-shrink: 0;
  }
  .feature-card h4 {
    font-size: 14px;
    margin-bottom: 2px;
  }
  .feature-card p {
    font-size: 12px;
  }
  .value-block {
    justify-content: center;
    text-align: center;
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
    margin-bottom: 6px;
  }
  .subtitle {
    font-size: 14px;
    margin-bottom: 20px;
  }
  .hero-block {
    padding: 16px 18px;
    border-radius: 14px;
    margin-bottom: 20px;
  }
  .hero-icon {
    width: 44px;
    height: 44px;
    font-size: 20px;
    border-radius: 12px;
  }
  .hero-info h3 {
    font-size: 16px;
  }
  .hero-info p {
    font-size: 13px;
  }
  .feature-card {
    padding: 16px;
    border-radius: 12px;
  }
  .feature-icon {
    width: 38px;
    height: 38px;
    font-size: 16px;
    border-radius: 10px;
    margin-bottom: 8px;
  }
  .feature-card h4 {
    font-size: 14px;
  }
  .feature-card p {
    font-size: 12px;
  }
}
</style>
