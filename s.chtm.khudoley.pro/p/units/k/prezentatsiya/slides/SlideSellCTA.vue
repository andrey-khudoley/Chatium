<template>
  <div class="slide">
    <div class="bg-effects">
      <div class="glow-orb orb-1"></div>
      <div class="glow-orb orb-2"></div>
      <div class="glow-orb orb-3"></div>
    </div>

    <div class="container">
      <h2 class="mega-title">Итого вы получаете</h2>

      <div class="pillars">
        <div class="pillar pillar-platform">
          <div class="pillar-icon"><i class="fas fa-cubes"></i></div>
          <div class="pillar-label">Платформа</div>
          <div class="pillar-sub">16+ модулей</div>
        </div>

        <div class="pillar pillar-botan">
          <div class="pillar-icon"><i class="fas fa-wand-magic-sparkles"></i></div>
          <div class="pillar-label">Ботан</div>
          <div class="pillar-sub">Вайбкодер</div>
        </div>

        <div class="pillar pillar-lena">
          <div class="pillar-icon"><i class="fas fa-user-tie"></i></div>
          <div class="pillar-label">Леночка</div>
          <div class="pillar-sub">AI‑агент</div>
        </div>
      </div>

      <div class="bonuses-strip">
        <div class="bonus-tag" v-for="b in bonuses" :key="b.icon">
          <i :class="b.icon"></i>
          <span>{{ b.text }}</span>
        </div>
      </div>

      <div class="price-hero-block">
        <div class="price-glow-ring"></div>
        <div class="price-content">
          <div class="price-top">Всё это за</div>
          <div class="price-number">
            <span class="price-val">3 000</span>
            <span class="price-cur"> ₽<span class="price-period">/мес</span></span>
          </div>
          <div class="price-explainer">
            <i class="fas fa-arrow-turn-down"></i>
            <span
              >И эти деньги <strong>попадают на ваш баланс</strong> — на корм Ботана и Леночки</span
            >
          </div>
        </div>
      </div>

      <button @click="openModal" class="cta-btn">
        <span class="cta-label">Покормить Ботана</span>
        <span class="cta-arrow"><i class="fas fa-arrow-right"></i></span>
        <div class="cta-shine"></div>
      </button>
    </div>

    <!-- Modal -->
    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal-content">
        <button class="modal-close" @click="closeModal">
          <i class="fas fa-xmark"></i>
        </button>
        <iframe
          src="https://chatium.ru/t-biznes/order-form-embed?utm_source=presentation&utm_medium=webinar&utm_campaign=pro-chatium&utm_content=feed-botan"
          class="modal-iframe"
          frameborder="0"
        ></iframe>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

defineProps({ active: Boolean })

const showModal = ref(false)

const openModal = () => {
  showModal.value = true
  document.body.style.overflow = 'hidden'
}

const closeModal = () => {
  showModal.value = false
  document.body.style.overflow = ''
}

const modules = [
  '@contacts',
  '@sender',
  '@automations',
  '@pay',
  'HeapTables',
  '@auth',
  '@agents',
  '@start',
  '@kinescope',
  '@storage',
  '@socket',
  '@jobs',
  '@traffic',
  '@app',
  '@i18n',
  '@plugins'
]

const bonuses = [
  { icon: 'fas fa-gift', text: '+500 ₽ на баланс' },
  { icon: 'fas fa-lock', text: 'Чат по Авито' },
  { icon: 'fas fa-graduation-cap', text: 'Курс Радонца' },
  { icon: 'fas fa-star', text: 'Фан-клуб Ботана' },
  { icon: 'fas fa-video', text: 'Вебинарная платформа' }
]
</script>

<style scoped>
.slide {
  position: absolute;
  inset: 0;
  overflow-y: auto;
  padding: 28px 24px 24px;
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
  filter: blur(140px);
  animation: float 12s ease-in-out infinite;
}

.orb-1 {
  width: 600px;
  height: 600px;
  background: #6366f1;
  opacity: 0.12;
  top: -25%;
  left: -10%;
}
.orb-2 {
  width: 500px;
  height: 500px;
  background: #10b981;
  opacity: 0.1;
  bottom: -20%;
  right: -5%;
  animation-delay: -4s;
}
.orb-3 {
  width: 400px;
  height: 400px;
  background: #f59e0b;
  opacity: 0.07;
  top: 40%;
  right: 20%;
  animation-delay: -8s;
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
  max-width: 920px;
  margin: 0 auto;
  position: relative;
  width: 100%;
  text-align: center;
}

/* Title */
.mega-title {
  font-family: var(--font-display);
  font-size: clamp(26px, 4.5vw, 42px);
  font-weight: 900;
  color: var(--text-primary);
  margin-bottom: 24px;
  letter-spacing: -0.5px;
}

/* Three pillars */
.pillars {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  margin-bottom: 20px;
}

.pillar {
  padding: 22px 16px 18px;
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: 18px;
  transition: all 0.4s ease;
  position: relative;
  overflow: hidden;
}

.pillar::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  border-radius: 18px 18px 0 0;
}

.pillar-platform::before {
  background: linear-gradient(90deg, #6366f1, #06b6d4);
}
.pillar-botan::before {
  background: linear-gradient(90deg, #f59e0b, #f97316);
}
.pillar-lena::before {
  background: linear-gradient(90deg, #ec4899, #a855f7);
}

.pillar:hover {
  transform: translateY(-4px);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.25);
}

.pillar-platform:hover {
  border-color: rgba(99, 102, 241, 0.4);
}
.pillar-botan:hover {
  border-color: rgba(245, 158, 11, 0.4);
}
.pillar-lena:hover {
  border-color: rgba(236, 72, 153, 0.4);
}

.pillar-icon {
  width: 48px;
  height: 48px;
  margin: 0 auto 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  font-size: 22px;
  color: white;
}

.pillar-platform .pillar-icon {
  background: linear-gradient(135deg, #6366f1, #4f46e5);
}
.pillar-botan .pillar-icon {
  background: linear-gradient(135deg, #f59e0b, #d97706);
}
.pillar-lena .pillar-icon {
  background: linear-gradient(135deg, #ec4899, #db2777);
}

.pillar-label {
  font-family: var(--font-display);
  font-size: clamp(18px, 2.5vw, 24px);
  font-weight: 800;
  color: var(--text-primary);
  margin-bottom: 2px;
}

.pillar-sub {
  font-size: 13px;
  color: var(--text-muted);
  margin-bottom: 10px;
}

.pillar-desc {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
}

/* Module cloud */
.module-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  justify-content: center;
}

.mod-chip {
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 600;
  padding: 3px 7px;
  border-radius: 6px;
  background: rgba(99, 102, 241, 0.1);
  color: rgba(165, 160, 255, 0.8);
  border: 1px solid rgba(99, 102, 241, 0.15);
  transition: all 0.3s ease;
  line-height: 1.2;
}

.mod-chip:hover {
  background: rgba(99, 102, 241, 0.2);
  color: #a5b4fc;
  border-color: rgba(99, 102, 241, 0.35);
}

/* Bonuses strip */
.bonuses-strip {
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 24px;
}

.bonus-tag {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 13px;
  font-weight: 600;
  color: #10b981;
  padding: 7px 14px;
  background: rgba(16, 185, 129, 0.08);
  border: 1px solid rgba(16, 185, 129, 0.2);
  border-radius: 100px;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.bonus-tag:hover {
  background: rgba(16, 185, 129, 0.14);
  border-color: rgba(16, 185, 129, 0.4);
  transform: translateY(-2px);
}

.bonus-tag i {
  font-size: 12px;
}

/* Price hero */
.price-hero-block {
  position: relative;
  padding: 32px 28px 24px;
  background: var(--bg-card);
  border: 2px solid rgba(99, 102, 241, 0.25);
  border-radius: 24px;
  margin-bottom: 24px;
  overflow: hidden;
}

.price-glow-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 600px;
  height: 400px;
  background: radial-gradient(ellipse, rgba(99, 102, 241, 0.1) 0%, transparent 60%);
  animation: ring-pulse 5s ease-in-out infinite;
  pointer-events: none;
}

@keyframes ring-pulse {
  0%,
  100% {
    opacity: 0.4;
    transform: translate(-50%, -50%) scale(1);
  }
  50% {
    opacity: 0.8;
    transform: translate(-50%, -50%) scale(1.05);
  }
}

.price-content {
  position: relative;
  z-index: 2;
}

.price-top {
  font-size: 16px;
  color: var(--text-muted);
  margin-bottom: 4px;
}

.price-number {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 4px;
  margin-bottom: 12px;
}

.price-val {
  font-family: var(--font-display);
  font-size: clamp(52px, 10vw, 84px);
  font-weight: 900;
  line-height: 1;
  background: linear-gradient(135deg, #6366f1 0%, #06b6d4 40%, #10b981 100%);
  background-size: 200% 200%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: gradient-shift 5s ease infinite;
}

.price-cur {
  font-family: var(--font-display);
  font-size: clamp(22px, 4vw, 32px);
  font-weight: 700;
  color: var(--text-muted);
}

.price-period {
  font-size: clamp(14px, 2vw, 18px);
  font-weight: 400;
  color: var(--text-muted);
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

.price-explainer {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 10px 22px;
  background: rgba(245, 158, 11, 0.08);
  border: 1px solid rgba(245, 158, 11, 0.2);
  border-radius: 12px;
  font-size: clamp(13px, 2vw, 16px);
  color: var(--text-secondary);
  line-height: 1.4;
}

.price-explainer i {
  color: #f59e0b;
  font-size: 16px;
  flex-shrink: 0;
}

.price-explainer strong {
  color: #f59e0b;
  font-weight: 700;
}

/* CTA */
.cta-btn {
  display: inline-flex;
  align-items: center;
  gap: 14px;
  padding: 20px 52px;
  background: linear-gradient(135deg, #6366f1, #4f46e5, #4338ca);
  border-radius: 16px;
  color: white;
  font-family: var(--font-display);
  font-size: clamp(17px, 3vw, 22px);
  font-weight: 700;
  text-decoration: none;
  border: none;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
  overflow: hidden;
  margin-bottom: 16px;
  box-shadow: 0 8px 32px rgba(99, 102, 241, 0.35);
}

.cta-btn:hover {
  transform: translateY(-4px) scale(1.02);
  box-shadow: 0 20px 50px rgba(99, 102, 241, 0.5);
}

.cta-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  transition: all 0.3s ease;
}

.cta-btn:hover .cta-arrow {
  transform: translateX(4px);
  background: rgba(255, 255, 255, 0.3);
}

.cta-shine {
  position: absolute;
  top: 0;
  left: -100%;
  width: 50%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  animation: shine 3s ease-in-out infinite;
}

@keyframes shine {
  0% {
    left: -100%;
  }
  50%,
  100% {
    left: 150%;
  }
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(2, 2, 8, 0.85);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.modal-content {
  position: relative;
  width: 100%;
  max-width: 1200px;
  height: 80vh;
  max-height: 800px;
  background: var(--bg-card);
  border-radius: 20px;
  border: 1px solid var(--border-subtle);
  overflow: hidden;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal-close {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid var(--border-subtle);
  border-radius: 10px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  z-index: 10;
  font-size: 18px;
}

.modal-close:hover {
  background: rgba(255, 255, 255, 0.15);
  color: var(--text-primary);
}

.modal-iframe {
  width: 100%;
  height: 100%;
  border: none;
}

/* Mobile */
@media (max-width: 768px) {
  .slide {
    align-items: flex-start;
  }
  .pillars {
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }
  .pillar {
    padding: 14px 10px;
  }
  .pillar-icon {
    width: 40px;
    height: 40px;
    font-size: 18px;
    margin-bottom: 6px;
  }
  .pillar-label {
    font-size: 16px;
  }
  .pillar-sub {
    font-size: 11px;
    margin-bottom: 4px;
  }
  .bonuses-strip {
    gap: 6px;
  }
  .bonus-tag {
    font-size: 11px;
    padding: 5px 10px;
  }
  .cta-btn {
    padding: 14px 28px;
    font-size: 16px;
  }
  .price-hero-block {
    padding: 20px 16px 16px;
  }
  .mega-title {
    font-size: 24px;
    margin-bottom: 16px;
  }

  /* Mobile modal */
  .modal-overlay {
    padding: 0;
    align-items: flex-end;
  }
  .modal-content {
    max-width: 100%;
    height: 90vh;
    max-height: none;
    border-radius: 20px 20px 0 0;
    animation: slideUpMobile 0.3s ease;
  }
  @keyframes slideUpMobile {
    from {
      opacity: 0;
      transform: translateY(100%);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
}

@media (max-width: 480px) {
  .slide {
    padding: 16px 14px 14px;
  }
  .mega-title {
    font-size: 22px;
    margin-bottom: 16px;
  }
  .pillar {
    padding: 14px 12px;
    border-radius: 14px;
  }
  .pillar-icon {
    width: 40px;
    height: 40px;
    font-size: 18px;
    margin-bottom: 8px;
    border-radius: 12px;
  }
  .pillar-label {
    font-size: 18px;
  }
  .pillar-sub {
    font-size: 12px;
    margin-bottom: 6px;
  }
  .bonuses-strip {
    margin-bottom: 16px;
  }
  .bonus-tag {
    font-size: 11px;
    padding: 5px 10px;
    gap: 5px;
  }
  .bonus-tag i {
    font-size: 10px;
  }
  .price-hero-block {
    padding: 20px 14px 16px;
    border-radius: 18px;
    margin-bottom: 16px;
  }
  .price-val {
    font-size: 48px;
  }
  .price-cur {
    font-size: 20px;
  }
  .price-top {
    font-size: 14px;
  }
  .price-explainer {
    font-size: 12px;
    padding: 8px 14px;
    gap: 8px;
  }
  .price-explainer i {
    font-size: 14px;
  }
  .cta-btn {
    padding: 14px 28px;
    font-size: 16px;
    border-radius: 14px;
  }
  .cta-arrow {
    width: 30px;
    height: 30px;
    border-radius: 8px;
  }

  /* Mobile modal */
  .modal-close {
    top: 8px;
    right: 8px;
    width: 36px;
    height: 36px;
    font-size: 16px;
  }
}
</style>
