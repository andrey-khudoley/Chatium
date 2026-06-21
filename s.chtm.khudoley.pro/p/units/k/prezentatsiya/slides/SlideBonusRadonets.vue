<template>
  <div class="slide">
    <div class="bg-effects">
      <div class="glow-orb orb-1"></div>
      <div class="glow-orb orb-2"></div>
    </div>

    <div class="container">
      <div class="badge"><i class="fas fa-gift"></i> Бонус 3 из 5</div>

      <h2 class="title">Курс <span class="grad-purple">«Вайбкодинг на Chatium»</span></h2>

      <div class="author-block">
        <div class="author-icon"><i class="fas fa-graduation-cap"></i></div>
        <div class="author-info">
          <h3>Алексей Радонец</h3>
          <p class="author-sub">Большая школа фриланса · 15 лет опыта</p>
        </div>
      </div>

      <p class="description">
        Подсел на Ботана весной 2025 — стал <span class="hl">первым укушенным</span>. Записал
        полноценный курс по вайбкодингу. Я попросил его в подарок для участников хакатона.
      </p>

      <div class="features">
        <span><i class="fas fa-play-circle"></i> Полноценный видео-курс</span>
        <span><i class="fas fa-code"></i> Вайбкодинг с нуля</span>
        <span><i class="fas fa-rocket"></i> Практика на Chatium</span>
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
  background: #8b5cf6;
  opacity: 0.12;
  top: -15%;
  right: -5%;
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
  color: #8b5cf6;
  padding: 8px 18px;
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 10px;
  background: rgba(139, 92, 246, 0.08);
  margin-bottom: 24px;
}

.title {
  font-family: var(--font-display);
  font-size: clamp(32px, 5.5vw, 50px);
  font-weight: 800;
  line-height: 1.2;
  margin-bottom: 32px;
  color: var(--text-primary);
}

.grad-purple {
  background: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 50%, #c4b5fd 100%);
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

.author-block {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-bottom: 24px;
  padding: 20px 24px;
  background: var(--bg-card);
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: 16px;
  transition: all 0.4s ease;
}

.author-block:hover {
  border-color: rgba(139, 92, 246, 0.4);
  transform: translateY(-2px);
  box-shadow: 0 12px 32px rgba(139, 92, 246, 0.1);
}

.author-icon {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
  color: white;
  font-size: 24px;
  flex-shrink: 0;
}

.author-info h3 {
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.author-sub {
  font-size: 16px;
  color: var(--text-muted);
}

.description {
  font-size: 19px;
  color: var(--text-secondary);
  line-height: 1.7;
  margin-bottom: 28px;
}

.hl {
  color: #f59e0b;
  font-weight: 600;
}

.features {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 24px;
}

.features span {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  color: var(--text-secondary);
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-subtle);
  border-radius: 10px;
  transition: all 0.3s ease;
}

.features span:hover {
  border-color: rgba(139, 92, 246, 0.3);
  background: rgba(139, 92, 246, 0.06);
}

.features i {
  color: #8b5cf6;
  font-size: 16px;
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

.value-old {
  font-size: 14px;
  color: var(--text-muted);
  text-decoration: line-through;
}

.value-arrow {
  color: var(--text-muted);
}

.value-new {
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 700;
  color: #10b981;
}

@media (max-width: 640px) {
  .author-block {
    flex-direction: column;
    text-align: center;
  }
  .features {
    justify-content: center;
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
    font-size: 26px;
    margin-bottom: 20px;
  }
  .author-block {
    padding: 16px 18px;
    border-radius: 14px;
  }
  .author-icon {
    width: 44px;
    height: 44px;
    font-size: 20px;
    border-radius: 12px;
  }
  .author-info h3 {
    font-size: 18px;
  }
  .author-sub {
    font-size: 13px;
  }
  .description {
    font-size: 15px;
    line-height: 1.6;
    margin-bottom: 20px;
  }
  .features span {
    font-size: 13px;
    padding: 6px 12px;
  }
  .features i {
    font-size: 13px;
  }
}
</style>
