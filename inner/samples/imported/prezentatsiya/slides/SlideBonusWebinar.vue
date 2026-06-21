<template>
  <div class="slide">
    <div class="bg-effects">
      <div class="glow-orb orb-1"></div>
      <div class="glow-orb orb-2"></div>
    </div>

    <div class="container">
      <div class="badge"><i class="fas fa-gift"></i> Бонус 5 из 5</div>

      <h2 class="title"><span class="grad-cyan">Вебинарная платформа</span> Chatium</h2>

      <div class="hero-block">
        <div class="hero-icon"><i class="fas fa-video"></i></div>
        <div class="hero-info">
          <h3>Замена Бизон</h3>
          <p>
            Мы её сделали. Стилизуйте под себя и используйте вместо Геткурс или Бизон. Покажу
            отдельно как.
          </p>
        </div>
      </div>

      <div class="features-grid">
        <div class="feature-card">
          <div class="feature-icon"><i class="fas fa-palette"></i></div>
          <h4>Полная стилизация</h4>
          <p>Ваш бренд, ваши цвета, ваши правила — без ограничений</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon"><i class="fas fa-display"></i></div>
          <h4>Ваша платформа</h4>
          <p>Вебинары на своём домене, без чужих логотипов</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon"><i class="fas fa-wand-magic-sparkles"></i></div>
          <h4>Простая настройка</h4>
          <p>Покажу как запустить — справится любой, кто осилил Zoom</p>
        </div>
      </div>

      <div class="value-block">
        <span class="value-label">Кто сегодня берёт подписку:</span>
        <span class="value-new">Отдаём бесплатно</span>
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
  background: #06b6d4;
  opacity: 0.12;
  top: -15%;
  right: -5%;
}

.orb-2 {
  width: 400px;
  height: 400px;
  background: #0891b2;
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
  color: #06b6d4;
  padding: 8px 18px;
  border: 1px solid rgba(6, 182, 212, 0.3);
  border-radius: 10px;
  background: rgba(6, 182, 212, 0.08);
  margin-bottom: 24px;
}

.title {
  font-family: var(--font-display);
  font-size: clamp(28px, 5vw, 44px);
  font-weight: 800;
  line-height: 1.2;
  margin-bottom: 32px;
  color: var(--text-primary);
}

.grad-cyan {
  background: linear-gradient(135deg, #06b6d4 0%, #22d3ee 50%, #67e8f9 100%);
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
  border: 1px solid rgba(6, 182, 212, 0.2);
  border-radius: 16px;
  transition: all 0.4s ease;
}

.hero-block:hover {
  border-color: rgba(6, 182, 212, 0.4);
  transform: translateY(-2px);
  box-shadow: 0 12px 32px rgba(6, 182, 212, 0.1);
}

.hero-icon {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #06b6d4, #0891b2);
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
  border-color: rgba(6, 182, 212, 0.3);
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
  background: rgba(6, 182, 212, 0.12);
  border-radius: 12px;
  color: #06b6d4;
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
    margin-bottom: 24px;
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
  .value-block {
    padding: 12px 16px;
  }
  .value-label {
    font-size: 13px;
  }
  .value-new {
    font-size: 16px;
  }
}
</style>
