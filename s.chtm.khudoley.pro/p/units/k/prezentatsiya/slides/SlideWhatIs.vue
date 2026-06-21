<template>
  <div class="slide">
    <div class="bg-effects">
      <div class="glow-orb orb-left"></div>
      <div class="glow-orb orb-right"></div>
      <div class="glow-orb orb-center"></div>
      <div class="grid-pattern"></div>
    </div>

    <div class="container">
      <h2 class="title">
        <span class="title-line">Chatium — это</span>
        <span class="title-line gradient-text">операционная система</span>
        <span class="title-line">для бизнеса</span>
      </h2>

      <div class="subtitle">Три составляющие платформы</div>

      <div class="blocks">
        <div class="block block-infra">
          <div class="block-glow"></div>
          <div class="block-icon">
            <i class="fas fa-server"></i>
          </div>
          <div class="block-title">Инфраструктура</div>
          <div class="block-desc">
            16+ модулей из коробки: база данных, платежи, рассылки, CRM, авторизация, аналитика,
            файлы, автоматизации
          </div>
          <div class="block-footer">
            <span class="block-tag">8 лет разработки</span>
            <span class="block-tag">150 млн ₽</span>
          </div>
        </div>

        <div class="block block-botan">
          <div class="block-glow"></div>
          <div class="block-icon">
            <i class="fas fa-wand-magic-sparkles"></i>
          </div>
          <div class="block-title">Ботан</div>
          <div class="block-label">Вайбкодинг</div>
          <div class="block-desc">
            ИИ-агент, который создаёт любой цифровой продукт по вашему описанию: сайт, приложение,
            магазин, CRM, бот
          </div>
          <div class="block-footer">
            <span class="block-tag">Заменяет сотрудников</span>
          </div>
        </div>

        <div class="block block-lena">
          <div class="block-glow"></div>
          <div class="block-icon">
            <i class="fas fa-robot"></i>
          </div>
          <div class="block-title">Леночка</div>
          <div class="block-label">Процессные AI-агенты</div>
          <div class="block-desc">
            Цифровой сотрудник 24/7 — продаёт, консультирует, обрабатывает заявки, ведёт переписку
            во всех каналах
          </div>
          <div class="block-footer">
            <span class="block-tag">Заменяет сотрудников</span>
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
  padding: 60px 24px 24px;
  background: var(--bg-deep);
}

@media (max-width: 768px) {
  .slide {
    align-items: flex-start;
    padding: 20px 16px 16px;
  }
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
  opacity: 0.25;
  animation: float 15s ease-in-out infinite;
}

.orb-left {
  width: 400px;
  height: 400px;
  background: #6366f1;
  top: 10%;
  left: -10%;
}

.orb-right {
  width: 350px;
  height: 350px;
  background: #06b6d4;
  bottom: 10%;
  right: -5%;
  animation-delay: -5s;
}

.orb-center {
  width: 300px;
  height: 300px;
  background: #8b5cf6;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  animation-delay: -8s;
}

.grid-pattern {
  position: absolute;
  inset: 0;
  background-image: linear-gradient(rgba(99, 102, 241, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(99, 102, 241, 0.03) 1px, transparent 1px);
  background-size: 50px 50px;
  mask-image: radial-gradient(ellipse at center, black 40%, transparent 80%);
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0) scale(1);
  }
  50% {
    transform: translateY(-30px) scale(1.05);
  }
}

.container {
  position: relative;
  max-width: 1100px;
  width: 100%;
}

.section-num {
  margin-bottom: 16px;
}

.num {
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 700;
  color: var(--accent-indigo);
  padding: 6px 14px;
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-radius: 8px;
  background: rgba(99, 102, 241, 0.05);
  backdrop-filter: blur(10px);
}

.title {
  font-family: var(--font-display);
  font-size: clamp(28px, 4.5vw, 48px);
  font-weight: 800;
  line-height: 1.15;
  margin-bottom: 8px;
}

.title-line {
  display: block;
}

.gradient-text {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #06b6d4 100%);
  background-size: 200% 200%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: gradient-shift 5s ease infinite;
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
  font-family: var(--font-mono);
  font-size: 14px;
  color: var(--text-muted);
  letter-spacing: 2px;
  text-transform: uppercase;
  margin-bottom: 32px;
}

.blocks {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

.block {
  padding: 32px 28px;
  border-radius: 24px;
  border: 1px solid var(--border-subtle);
  position: relative;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  display: flex;
  flex-direction: column;
}

.block:hover {
  transform: translateY(-8px) scale(1.02);
}

.block-glow {
  position: absolute;
  inset: 0;
  opacity: 0;
  transition: opacity 0.5s ease;
}

.block:hover .block-glow {
  opacity: 1;
}

.block-number {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 2px;
  margin-bottom: 20px;
  opacity: 0.4;
}

/* Инфраструктура */
.block-infra {
  background: linear-gradient(160deg, rgba(99, 102, 241, 0.12) 0%, rgba(99, 102, 241, 0.03) 100%);
  border-color: rgba(99, 102, 241, 0.25);
}
.block-infra .block-glow {
  background: radial-gradient(circle at 50% 0%, rgba(99, 102, 241, 0.2) 0%, transparent 70%);
}
.block-infra:hover {
  border-color: rgba(99, 102, 241, 0.5);
  box-shadow: 0 24px 60px rgba(99, 102, 241, 0.15);
}
.block-infra .block-icon {
  color: #6366f1;
  border-color: rgba(99, 102, 241, 0.25);
}
.block-infra .block-number {
  color: #6366f1;
}
.block-infra .block-tag {
  background: rgba(99, 102, 241, 0.1);
  border-color: rgba(99, 102, 241, 0.2);
  color: #818cf8;
}

/* Ботан */
.block-botan {
  background: linear-gradient(160deg, rgba(139, 92, 246, 0.12) 0%, rgba(139, 92, 246, 0.03) 100%);
  border-color: rgba(139, 92, 246, 0.25);
}
.block-botan .block-glow {
  background: radial-gradient(circle at 50% 0%, rgba(139, 92, 246, 0.2) 0%, transparent 70%);
}
.block-botan:hover {
  border-color: rgba(139, 92, 246, 0.5);
  box-shadow: 0 24px 60px rgba(139, 92, 246, 0.15);
}
.block-botan .block-icon {
  color: #8b5cf6;
  border-color: rgba(139, 92, 246, 0.25);
}
.block-botan .block-number {
  color: #8b5cf6;
}
.block-botan .block-tag {
  background: rgba(139, 92, 246, 0.1);
  border-color: rgba(139, 92, 246, 0.2);
  color: #a78bfa;
}

/* Леночка */
.block-lena {
  background: linear-gradient(160deg, rgba(6, 182, 212, 0.12) 0%, rgba(16, 185, 129, 0.03) 100%);
  border-color: rgba(6, 182, 212, 0.25);
}
.block-lena .block-glow {
  background: radial-gradient(circle at 50% 0%, rgba(6, 182, 212, 0.2) 0%, transparent 70%);
}
.block-lena:hover {
  border-color: rgba(6, 182, 212, 0.5);
  box-shadow: 0 24px 60px rgba(6, 182, 212, 0.15);
}
.block-lena .block-icon {
  color: #06b6d4;
  border-color: rgba(6, 182, 212, 0.25);
}
.block-lena .block-number {
  color: #06b6d4;
}
.block-lena .block-tag {
  background: rgba(6, 182, 212, 0.1);
  border-color: rgba(6, 182, 212, 0.2);
  color: #22d3ee;
}

.block-icon {
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid;
  border-radius: 18px;
  font-size: 28px;
  position: relative;
  z-index: 1;
}

.block-title {
  font-family: var(--font-display);
  font-size: 28px;
  font-weight: 800;
  line-height: 1.2;
  margin-bottom: 6px;
  color: var(--text-primary);
  position: relative;
  z-index: 1;
}

.block-label {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 12px;
  position: relative;
  z-index: 1;
}

.block-desc {
  font-size: 15px;
  line-height: 1.55;
  color: var(--text-secondary);
  flex: 1;
  position: relative;
  z-index: 1;
}

.block-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 20px;
  position: relative;
  z-index: 1;
}

.block-tag {
  padding: 6px 14px;
  border-radius: 100px;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid;
  white-space: nowrap;
}

/* Для блока без label добавим отступ */
.block-infra .block-title {
  margin-bottom: 14px;
}

@media (max-width: 900px) {
  .blocks {
    grid-template-columns: 1fr;
    max-width: 500px;
    margin: 0 auto;
  }
}

@media (max-width: 768px) {
  .title {
    font-size: 22px;
    margin-bottom: 4px;
  }
  .subtitle {
    font-size: 11px;
    letter-spacing: 1px;
    margin-bottom: 16px;
  }
  .blocks {
    gap: 12px;
  }
  .block {
    padding: 16px 14px;
    border-radius: 14px;
  }
  .block-icon {
    width: 40px;
    height: 40px;
    font-size: 18px;
    margin-bottom: 10px;
    border-radius: 12px;
  }
  .block-title {
    font-size: 18px;
    margin-bottom: 4px;
  }
  .block-infra .block-title {
    margin-bottom: 8px;
  }
  .block-label {
    font-size: 10px;
    margin-bottom: 8px;
  }
  .block-desc {
    font-size: 12px;
    line-height: 1.45;
  }
  .block-footer {
    margin-top: 12px;
    gap: 6px;
  }
  .block-tag {
    font-size: 10px;
    padding: 3px 8px;
  }
}

@media (max-width: 480px) {
  .slide {
    padding: 16px 12px 12px;
  }
  .title {
    font-size: 20px;
    margin-bottom: 2px;
  }
  .subtitle {
    font-size: 10px;
    letter-spacing: 1px;
    margin-bottom: 12px;
  }
  .blocks {
    gap: 10px;
  }
  .block {
    padding: 14px 12px;
    border-radius: 12px;
  }
  .block-icon {
    width: 36px;
    height: 36px;
    font-size: 16px;
    margin-bottom: 8px;
    border-radius: 10px;
  }
  .block-title {
    font-size: 16px;
    margin-bottom: 2px;
  }
  .block-infra .block-title {
    margin-bottom: 6px;
  }
  .block-label {
    font-size: 9px;
    margin-bottom: 6px;
  }
  .block-desc {
    font-size: 11px;
    line-height: 1.4;
  }
  .block-footer {
    margin-top: 10px;
    gap: 4px;
  }
  .block-tag {
    font-size: 9px;
    padding: 2px 7px;
  }
}
</style>
