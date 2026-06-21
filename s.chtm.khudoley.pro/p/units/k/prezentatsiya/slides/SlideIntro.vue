<template>
  <div class="slide">
    <!-- Animated background -->
    <div class="cosmos">
      <div class="orb orb-1"></div>
      <div class="orb orb-2"></div>
      <div class="orb orb-3"></div>
      <div class="stars"></div>
      <div class="particles">
        <span v-for="n in 20" :key="n" :class="'p' + n"></span>
      </div>
    </div>

    <div class="content">
      <!-- Main title -->
      <div class="title-wrapper">
        <div class="title-line show">
          <span class="title-small">Добро пожаловать</span>
        </div>
        <div class="title-line show">
          <span class="title-small">в мир</span>
          <span class="title-big gradient-text">Chatium</span>
        </div>
      </div>
    </div>

    <!-- Decorative elements -->
    <div class="glow-ring ring-1"></div>
    <div class="glow-ring ring-2"></div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({ active: Boolean })
const features = [
  { icon: 'fas fa-server', text: 'Инфраструктура' },
  { icon: 'fas fa-code', text: 'Вайбкодинг' },
  { icon: 'fas fa-robot', text: 'AI-Агенты' }
]
</script>

<style scoped>
.slide {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow-y: auto;
  overflow-x: hidden;
  background: var(--bg-void);
}

/* Cosmos background */
.cosmos {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(100px);
  opacity: 0.4;
  animation: float 12s ease-in-out infinite;
}

.orb-1 {
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, #6366f1 0%, transparent 70%);
  top: -20%;
  left: -15%;
  animation-duration: 15s;
}

.orb-2 {
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, #8b5cf6 0%, transparent 70%);
  bottom: -15%;
  right: -10%;
  animation-duration: 18s;
  animation-delay: -5s;
}

.orb-3 {
  width: 350px;
  height: 350px;
  background: radial-gradient(circle, #06b6d4 0%, transparent 70%);
  top: 50%;
  right: 15%;
  animation-duration: 10s;
  animation-delay: -3s;
  opacity: 0.25;
}

/* Stars */
.stars {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(2px 2px at 20px 30px, rgba(255, 255, 255, 0.3), transparent),
    radial-gradient(2px 2px at 40px 70px, rgba(255, 255, 255, 0.2), transparent),
    radial-gradient(1px 1px at 90px 40px, rgba(255, 255, 255, 0.3), transparent),
    radial-gradient(2px 2px at 160px 120px, rgba(255, 255, 255, 0.2), transparent),
    radial-gradient(1px 1px at 230px 80px, rgba(255, 255, 255, 0.3), transparent),
    radial-gradient(2px 2px at 300px 150px, rgba(255, 255, 255, 0.2), transparent),
    radial-gradient(1px 1px at 350px 50px, rgba(255, 255, 255, 0.3), transparent);
  background-repeat: repeat;
  background-size: 400px 200px;
  animation: twinkle 8s ease-in-out infinite;
  opacity: 0.6;
}

@keyframes twinkle {
  0%,
  100% {
    opacity: 0.4;
  }
  50% {
    opacity: 0.8;
  }
}

/* Particles */
.particles {
  position: absolute;
  inset: 0;
}

.particles span {
  position: absolute;
  width: 4px;
  height: 4px;
  background: rgba(99, 102, 241, 0.6);
  border-radius: 50%;
  animation: particle-float 15s infinite;
}

.p1 {
  left: 10%;
  top: 20%;
  animation-delay: 0s;
}
.p2 {
  left: 20%;
  top: 80%;
  animation-delay: 1s;
}
.p3 {
  left: 30%;
  top: 40%;
  animation-delay: 2s;
}
.p4 {
  left: 40%;
  top: 60%;
  animation-delay: 3s;
}
.p5 {
  left: 50%;
  top: 30%;
  animation-delay: 4s;
}
.p6 {
  left: 60%;
  top: 70%;
  animation-delay: 5s;
}
.p7 {
  left: 70%;
  top: 20%;
  animation-delay: 6s;
}
.p8 {
  left: 80%;
  top: 50%;
  animation-delay: 7s;
}
.p9 {
  left: 90%;
  top: 80%;
  animation-delay: 8s;
}
.p10 {
  left: 15%;
  top: 50%;
  animation-delay: 9s;
}
.p11 {
  left: 25%;
  top: 10%;
  animation-delay: 10s;
}
.p12 {
  left: 35%;
  top: 90%;
  animation-delay: 11s;
}
.p13 {
  left: 45%;
  top: 25%;
  animation-delay: 12s;
}
.p14 {
  left: 55%;
  top: 75%;
  animation-delay: 13s;
}
.p15 {
  left: 65%;
  top: 45%;
  animation-delay: 14s;
}
.p16 {
  left: 75%;
  top: 85%;
  animation-delay: 0.5s;
}
.p17 {
  left: 85%;
  top: 15%;
  animation-delay: 1.5s;
}
.p18 {
  left: 5%;
  top: 65%;
  animation-delay: 2.5s;
}
.p19 {
  left: 95%;
  top: 35%;
  animation-delay: 3.5s;
}
.p20 {
  left: 50%;
  top: 95%;
  animation-delay: 4.5s;
}

@keyframes particle-float {
  0%,
  100% {
    transform: translateY(0) scale(1);
    opacity: 0;
  }
  10% {
    opacity: 1;
  }
  90% {
    opacity: 1;
  }
  50% {
    transform: translateY(-100px) scale(1.5);
  }
}

/* Content */
.content {
  position: relative;
  z-index: 2;
  text-align: center;
  padding: 24px;
  max-width: 900px;
  width: 100%;
}

/* Animations */
.badge-wrapper,
.title-line,
.subtitle,
.feature,
.hint {
  opacity: 1;
  transform: translateY(0);
}

/* Badge */
.badge {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 10px 28px;
  background: rgba(99, 102, 241, 0.12);
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-radius: 100px;
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 3px;
  color: var(--accent-indigo);
  backdrop-filter: blur(10px);
  box-shadow: 0 0 30px rgba(99, 102, 241, 0.15);
}

.badge-dot {
  width: 8px;
  height: 8px;
  background: var(--accent-emerald);
  border-radius: 50%;
  animation: pulse-glow 2s ease infinite;
  box-shadow: 0 0 10px var(--accent-emerald);
}

@keyframes pulse-glow {
  0%,
  100% {
    opacity: 0.6;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.2);
  }
}

/* Title */
.title-wrapper {
  margin: 40px 0 32px;
}

.title-line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 12px 16px;
  margin-bottom: 8px;
}

.title-small {
  font-family: var(--font-display);
  font-size: clamp(20px, 5vw, 36px);
  font-weight: 600;
  color: var(--text-secondary);
  letter-spacing: 1px;
  white-space: nowrap;
}

.title-big {
  font-family: var(--font-display);
  font-size: clamp(48px, 12vw, 100px);
  font-weight: 800;
  letter-spacing: -2px;
  line-height: 1;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 30%, #06b6d4 60%, #6366f1 100%);
  background-size: 200% 200%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: gradient-shift 5s ease infinite;
  text-shadow: 0 0 80px rgba(99, 102, 241, 0.3);
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

/* Subtitle */
.subtitle {
  font-size: clamp(22px, 4vw, 32px);
  color: var(--text-secondary);
  font-weight: 400;
  letter-spacing: 0.5px;
  margin-bottom: 56px;
}

/* Features */
.features {
  display: flex;
  gap: 24px;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 48px;
}

.feature {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 22px 36px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 18px;
  font-size: 20px;
  font-weight: 500;
  color: var(--text-secondary);
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  cursor: pointer;
  backdrop-filter: blur(10px);
}

.feature:hover {
  border-color: rgba(99, 102, 241, 0.4);
  color: var(--text-primary);
  background: rgba(99, 102, 241, 0.1);
  transform: translateY(-4px) scale(1.02);
  box-shadow: 0 20px 40px rgba(99, 102, 241, 0.15);
}

.feature-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(99, 102, 241, 0.15);
  border-radius: 10px;
  transition: all 0.3s ease;
}

.feature:hover .feature-icon {
  background: rgba(99, 102, 241, 0.25);
  transform: scale(1.1);
}

.feature-icon i {
  color: var(--accent-indigo);
  font-size: 22px;
}

.feature-text {
  white-space: nowrap;
}

/* Hint */
.hint {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 12px 24px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 100px;
  font-size: 13px;
  color: var(--text-muted);
  font-family: var(--font-mono);
}

.hint-arrow {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: rgba(99, 102, 241, 0.2);
  border-radius: 50%;
  color: var(--accent-indigo);
  font-size: 14px;
  animation: bounce-x 1.5s ease infinite;
}

@keyframes bounce-x {
  0%,
  100% {
    transform: translateX(0);
  }
  50% {
    transform: translateX(4px);
  }
}

/* Glow rings */
.glow-ring {
  position: absolute;
  border-radius: 50%;
  border: 1px solid rgba(99, 102, 241, 0.1);
  pointer-events: none;
}

.ring-1 {
  width: 600px;
  height: 600px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  animation: ring-pulse 4s ease-in-out infinite;
}

.ring-2 {
  width: 800px;
  height: 800px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  animation: ring-pulse 4s ease-in-out infinite;
  animation-delay: 2s;
}

@keyframes ring-pulse {
  0%,
  100% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 0.3;
  }
  50% {
    transform: translate(-50%, -50%) scale(1.05);
    opacity: 0.6;
  }
}

/* Mobile adaptations */
@media (max-width: 768px) {
  .content {
    padding: 20px 16px;
  }

  .badge {
    padding: 8px 20px;
    font-size: 11px;
  }

  .title-wrapper {
    margin: 32px 0 24px;
  }

  .title-line {
    gap: 8px 12px;
  }

  .features {
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }

  .feature {
    width: 100%;
    max-width: 280px;
    justify-content: center;
    padding: 14px 24px;
  }

  .subtitle {
    margin-bottom: 32px;
  }

  .hint {
    font-size: 12px;
    padding: 10px 18px;
  }
}

@media (max-width: 480px) {
  .title-small {
    font-size: 18px;
  }

  .title-big {
    font-size: 42px;
  }

  .subtitle {
    font-size: 15px;
  }

  .feature {
    font-size: 14px;
  }

  .feature-icon {
    width: 32px;
    height: 32px;
  }

  .feature-icon i {
    font-size: 14px;
  }
}
</style>
