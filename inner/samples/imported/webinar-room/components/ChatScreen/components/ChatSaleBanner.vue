<template>
  <div class="sale-banner" @click="$emit('click')">
    <div class="sale-banner-card">
      <!-- Animated background decorations -->
      <div class="sale-banner-bg-orb sale-banner-bg-orb--1"></div>
      <div class="sale-banner-bg-orb sale-banner-bg-orb--2"></div>
      <div class="sale-banner-bg-orb sale-banner-bg-orb--3"></div>
      <div class="sale-banner-shimmer"></div>

      <div class="sale-banner-body">
        <!-- Left accent stripe -->
        <div class="sale-banner-stripe"></div>

        <div class="sale-banner-main">
          <div class="sale-banner-label">
            <span class="sale-banner-label-dot"></span>
            <span class="sale-banner-label-text">Спецпредложение</span>
          </div>
          <div class="sale-banner-title">{{ title || 'Подключить Чатиум AI' }}</div>
          <div class="sale-banner-subtitle">
            {{ subtitle || 'Создавайте сайты, автоматизируйте бизнес, подключайте ИИ-агентов' }}
          </div>

          <div class="sale-banner-cta">
            <span class="sale-banner-cta-text">{{ buttonText || 'Подключить' }}</span>
            <svg
              class="sale-banner-cta-arrow"
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
            >
              <path
                d="M1 7h11M8 3l4 4-4 4"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  buttonText: { type: String, default: '' },
  formId: { type: String, default: '' }
})
defineEmits(['click'])
</script>

<style scoped>
.sale-banner {
  padding: 6px 14px;
  animation: bannerEntrance 0.6s cubic-bezier(0.22, 1, 0.36, 1) both;
  cursor: pointer;
}

@keyframes bannerEntrance {
  from {
    opacity: 0;
    transform: translateY(16px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.sale-banner-card {
  position: relative;
  overflow: hidden;
  border-radius: 16px;
  background: linear-gradient(135deg, #1a0a14 0%, #1c0820 40%, #130a1e 100%);
  border: 1px solid rgba(248, 0, 91, 0.25);
  padding: 0;
  transition:
    transform 0.25s ease,
    box-shadow 0.25s ease,
    border-color 0.25s ease;
  box-shadow:
    0 2px 12px rgba(248, 0, 91, 0.15),
    0 0 0 0 rgba(248, 0, 91, 0),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.sale-banner:hover .sale-banner-card {
  transform: translateY(-1px);
  border-color: rgba(248, 0, 91, 0.4);
  box-shadow:
    0 8px 32px rgba(248, 0, 91, 0.25),
    0 0 60px rgba(248, 0, 91, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

.sale-banner:active .sale-banner-card {
  transform: translateY(0) scale(0.99);
}

/* Animated background orbs */
.sale-banner-bg-orb {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  filter: blur(30px);
}

.sale-banner-bg-orb--1 {
  width: 100px;
  height: 100px;
  top: -30px;
  right: -10px;
  background: radial-gradient(circle, rgba(248, 0, 91, 0.4) 0%, transparent 70%);
  animation: orbFloat1 4s ease-in-out infinite;
}

.sale-banner-bg-orb--2 {
  width: 70px;
  height: 70px;
  bottom: -20px;
  left: 20px;
  background: radial-gradient(circle, rgba(99, 102, 241, 0.35) 0%, transparent 70%);
  animation: orbFloat2 5s ease-in-out infinite;
}

.sale-banner-bg-orb--3 {
  width: 50px;
  height: 50px;
  top: 50%;
  right: 30%;
  transform: translateY(-50%);
  background: radial-gradient(circle, rgba(6, 182, 212, 0.2) 0%, transparent 70%);
  animation: orbFloat3 6s ease-in-out infinite;
}

@keyframes orbFloat1 {
  0%,
  100% {
    transform: translate(0, 0);
  }
  50% {
    transform: translate(-8px, 6px);
  }
}
@keyframes orbFloat2 {
  0%,
  100% {
    transform: translate(0, 0);
  }
  50% {
    transform: translate(6px, -8px);
  }
}
@keyframes orbFloat3 {
  0%,
  100% {
    transform: translateY(-50%) translate(0, 0);
  }
  50% {
    transform: translateY(-50%) translate(-5px, 4px);
  }
}

/* Shimmer sweep */
.sale-banner-shimmer {
  position: absolute;
  top: 0;
  left: -100%;
  width: 60%;
  height: 100%;
  background: linear-gradient(
    105deg,
    transparent 20%,
    rgba(255, 255, 255, 0.04) 40%,
    rgba(255, 255, 255, 0.08) 50%,
    rgba(255, 255, 255, 0.04) 60%,
    transparent 80%
  );
  animation: shimmerSweep 4s ease-in-out infinite;
  pointer-events: none;
}

@keyframes shimmerSweep {
  0% {
    left: -100%;
  }
  40%,
  100% {
    left: 200%;
  }
}

/* Body layout */
.sale-banner-body {
  position: relative;
  display: flex;
  align-items: stretch;
  z-index: 1;
}

/* Left accent stripe */
.sale-banner-stripe {
  width: 4px;
  flex-shrink: 0;
  background: linear-gradient(180deg, #f8005b 0%, #6366f1 50%, #06b6d4 100%);
  border-radius: 0 0 0 0;
}

/* Main content */
.sale-banner-main {
  flex: 1;
  min-width: 0;
  padding: 14px 16px;
}

/* Label tag */
.sale-banner-label {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 8px;
  padding: 3px 9px 3px 7px;
  border-radius: 100px;
  background: rgba(248, 0, 91, 0.12);
  border: 1px solid rgba(248, 0, 91, 0.2);
}

.sale-banner-label-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #f8005b;
  animation: dotPulse 2s ease-in-out infinite;
}

@keyframes dotPulse {
  0%,
  100% {
    opacity: 1;
    box-shadow: 0 0 4px rgba(248, 0, 91, 0.6);
  }
  50% {
    opacity: 0.5;
    box-shadow: 0 0 8px rgba(248, 0, 91, 0.3);
  }
}

.sale-banner-label-text {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: #f8005b;
}

/* Title */
.sale-banner-title {
  font-size: 15px;
  font-weight: 700;
  color: #ffffff;
  line-height: 1.3;
  margin-bottom: 4px;
  letter-spacing: -0.01em;
}

/* Subtitle */
.sale-banner-subtitle {
  font-size: 12px;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.55);
  line-height: 1.45;
  margin-bottom: 12px;
}

/* CTA button */
.sale-banner-cta {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 16px;
  border-radius: 10px;
  background: linear-gradient(135deg, #f8005b 0%, #d4004e 100%);
  color: #fff;
  font-size: 12.5px;
  font-weight: 600;
  letter-spacing: 0.01em;
  transition: all 0.25s ease;
  box-shadow: 0 2px 8px rgba(248, 0, 91, 0.3);
}

.sale-banner:hover .sale-banner-cta {
  background: linear-gradient(135deg, #ff1a6e 0%, #f8005b 100%);
  box-shadow: 0 4px 16px rgba(248, 0, 91, 0.4);
}

.sale-banner-cta-arrow {
  transition: transform 0.25s ease;
}

.sale-banner:hover .sale-banner-cta-arrow {
  transform: translateX(2px);
}

/* Light theme adjustments */
:global(.theme-light) .sale-banner-card {
  background: linear-gradient(135deg, #fff5f8 0%, #faf0ff 40%, #f0f4ff 100%);
  border-color: rgba(248, 0, 91, 0.18);
  box-shadow:
    0 2px 12px rgba(248, 0, 91, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

:global(.theme-light) .sale-banner:hover .sale-banner-card {
  border-color: rgba(248, 0, 91, 0.3);
  box-shadow: 0 8px 32px rgba(248, 0, 91, 0.12);
}

:global(.theme-light) .sale-banner-bg-orb--1 {
  background: radial-gradient(circle, rgba(248, 0, 91, 0.15) 0%, transparent 70%);
}

:global(.theme-light) .sale-banner-bg-orb--2 {
  background: radial-gradient(circle, rgba(99, 102, 241, 0.12) 0%, transparent 70%);
}

:global(.theme-light) .sale-banner-bg-orb--3 {
  background: radial-gradient(circle, rgba(6, 182, 212, 0.1) 0%, transparent 70%);
}

:global(.theme-light) .sale-banner-shimmer {
  background: linear-gradient(
    105deg,
    transparent 20%,
    rgba(248, 0, 91, 0.03) 40%,
    rgba(248, 0, 91, 0.06) 50%,
    rgba(248, 0, 91, 0.03) 60%,
    transparent 80%
  );
}

:global(.theme-light) .sale-banner-label {
  background: rgba(248, 0, 91, 0.08);
  border-color: rgba(248, 0, 91, 0.15);
}

:global(.theme-light) .sale-banner-title {
  color: #1a1a2e;
}

:global(.theme-light) .sale-banner-subtitle {
  color: rgba(26, 26, 46, 0.6);
}
</style>
