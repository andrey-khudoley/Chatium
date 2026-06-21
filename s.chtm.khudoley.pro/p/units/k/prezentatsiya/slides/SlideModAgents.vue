<template>
  <div class="slide">
    <div class="bg-effects">
      <div class="glow-orb orb-1"></div>
      <div class="glow-orb orb-2"></div>
      <div class="glow-orb orb-3"></div>
    </div>

    <!-- Леночка — на весь правый край -->
    <div class="lena-bg">
      <img
        src="https://sel.cdn-chatium.io/get/image_msk_sbofO7KoSI.848x1264.png"
        alt=""
        class="lena-img"
      />
      <div class="lena-glow"></div>
    </div>

    <div class="content">
      <div class="left-col">
        <h2 class="title">
          <span class="title-main">Леночки</span>
        </h2>
        <p class="tagline">Одна цель — <span class="glow-text">результат</span></p>

        <div class="powers">
          <div v-for="(p, i) in powers" :key="i" class="power-card">
            <i :class="p.icon"></i>
            <div>
              <strong>{{ p.title }}</strong>
              <span>{{ p.desc }}</span>
            </div>
          </div>
        </div>

        <div class="creator-note">
          <i class="fas fa-link"></i>
          <span>Создаётся <strong>Ботаном</strong> — без программиста</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({ active: Boolean })

const powers = [
  {
    icon: 'fas fa-masks-theater',
    title: 'Множество субличностей',
    desc: 'Продавец, консультант, HR, саппорт — в одном агенте'
  },
  {
    icon: 'fas fa-bullseye',
    title: 'Достигает целей',
    desc: 'Не просто отвечает — продаёт, оформляет, закрывает сделки'
  },
  {
    icon: 'fas fa-brain',
    title: 'Помнит всё',
    desc: 'История клиента, заказы, предпочтения — полный контекст'
  },
  {
    icon: 'fas fa-share-nodes',
    title: '10+ каналов',
    desc: 'Telegram, WhatsApp, Авито, сайт — одновременно'
  }
]
</script>

<style scoped>
.slide {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 40px 24px 24px;
  background: var(--bg-deep);
  overflow-y: auto;
  overflow-x: hidden;
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
  filter: blur(150px);
  opacity: 0.12;
  animation: orb-float 20s ease-in-out infinite;
}
.orb-1 {
  width: 600px;
  height: 600px;
  background: #a78bfa;
  top: -20%;
  left: -10%;
}
.orb-2 {
  width: 500px;
  height: 500px;
  background: #c084fc;
  bottom: -15%;
  right: -10%;
  animation-delay: -7s;
}
.orb-3 {
  width: 400px;
  height: 400px;
  background: #f472b6;
  top: 40%;
  left: 50%;
  animation-delay: -14s;
  opacity: 0.06;
}

@keyframes orb-float {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
  }
  33% {
    transform: translate(20px, -30px) scale(1.05);
  }
  66% {
    transform: translate(-15px, 20px) scale(0.95);
  }
}

/* Леночка — занимает всю правую половину */
.lena-bg {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 55%;
  z-index: 1;
  pointer-events: none;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.lena-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top center;
  -webkit-mask-image: linear-gradient(to right, transparent 0%, black 25%, black 100%),
    linear-gradient(to top, transparent 0%, black 15%, black 100%);
  -webkit-mask-composite: source-in;
  mask-image: linear-gradient(to right, transparent 0%, black 25%, black 100%),
    linear-gradient(to top, transparent 0%, black 15%, black 100%);
  mask-composite: intersect;
  filter: brightness(0.75) saturate(1.3) contrast(1.1);
  animation: lena-breathe 6s ease-in-out infinite;
}

@keyframes lena-breathe {
  0%,
  100% {
    filter: brightness(0.75) saturate(1.3) contrast(1.1);
  }
  50% {
    filter: brightness(0.9) saturate(1.5) contrast(1.15);
  }
}

.lena-glow {
  position: absolute;
  top: 25%;
  right: 15%;
  width: 500px;
  height: 500px;
  background: radial-gradient(
    circle,
    rgba(167, 139, 250, 0.14) 0%,
    rgba(196, 132, 252, 0.06) 40%,
    transparent 70%
  );
  border-radius: 50%;
  pointer-events: none;
  animation: glow-pulse 5s ease-in-out infinite;
}

@keyframes glow-pulse {
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

/* Контент */
.content {
  max-width: 600px;
  width: 100%;
  position: relative;
  z-index: 3;
  padding-left: 40px;
}

.left-col {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Badge */
.lenochka-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 16px 6px 8px;
  border-radius: 100px;
  background: linear-gradient(135deg, rgba(167, 139, 250, 0.12), rgba(244, 114, 182, 0.1));
  border: 1px solid rgba(167, 139, 250, 0.2);
  width: fit-content;
  animation: badge-glow 3s ease-in-out infinite;
}
@keyframes badge-glow {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(167, 139, 250, 0);
  }
  50% {
    box-shadow: 0 0 20px rgba(167, 139, 250, 0.15);
  }
}
.badge-icon {
  font-size: 20px;
}
.badge-text {
  font-family: var(--font-display);
  font-size: 14px;
  font-weight: 800;
  background: linear-gradient(135deg, #a78bfa, #f472b6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.badge-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
}
.badge-status {
  font-size: 11px;
  color: var(--text-muted);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Header */
.title {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0;
}
.title-main {
  font-family: var(--font-display);
  font-size: clamp(48px, 7vw, 76px);
  font-weight: 900;
  line-height: 1;
  background: linear-gradient(135deg, #a78bfa 0%, #c084fc 40%, #f472b6 100%);
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

.title-sub {
  font-family: var(--font-display);
  font-size: clamp(18px, 2.5vw, 24px);
  color: rgba(167, 139, 250, 0.7);
  font-weight: 600;
  letter-spacing: 2px;
  text-transform: uppercase;
}

.tagline {
  font-family: var(--font-display);
  font-size: clamp(16px, 2vw, 22px);
  font-weight: 400;
  line-height: 1.4;
  margin: 0;
  color: var(--text-muted);
}
.glow-text {
  background: linear-gradient(135deg, #a78bfa, #f472b6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-weight: 600;
}

/* Powers */
.powers {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}

.power-card {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 20px 24px;
  background: rgba(167, 139, 250, 0.04);
  border: 1px solid rgba(167, 139, 250, 0.12);
  border-radius: 16px;
  text-align: left;
  transition: all 0.3s ease;
  backdrop-filter: blur(8px);
}
.power-card:hover {
  border-color: rgba(167, 139, 250, 0.35);
  background: rgba(167, 139, 250, 0.1);
  transform: translateX(6px);
  box-shadow: 0 12px 30px rgba(167, 139, 250, 0.12);
}
.power-card > i {
  font-size: 26px;
  color: #a78bfa;
  flex-shrink: 0;
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(167, 139, 250, 0.08);
  border-radius: 14px;
}
.power-card strong {
  display: block;
  font-size: 20px;
  color: var(--text-primary);
  margin-bottom: 3px;
}
.power-card span {
  font-size: 14px;
  color: var(--text-muted);
  line-height: 1.4;
}

/* Creator note */
.creator-note {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 20px;
  background: rgba(167, 139, 250, 0.06);
  border: 1px solid rgba(167, 139, 250, 0.15);
  border-radius: 12px;
  font-size: 16px;
  color: var(--text-secondary);
}
.creator-note i {
  color: #a78bfa;
  font-size: 18px;
}
.creator-note strong {
  color: #c084fc;
}

/* Mobile */
@media (max-width: 960px) {
  .content {
    padding-left: 16px;
    max-width: 100%;
  }
  .lena-bg {
    width: 45%;
    opacity: 0.5;
  }
}

@media (max-width: 600px) {
  .slide {
    padding: 24px 16px 16px;
  }
  .lena-bg {
    width: 100%;
    opacity: 0.2;
  }
  .content {
    padding-left: 0;
  }
  .left-col {
    gap: 18px;
  }
  .title-main {
    font-size: 48px;
  }
  .tagline {
    font-size: 16px;
  }
  .power-card {
    padding: 14px 16px;
    gap: 14px;
  }
  .power-card > i {
    font-size: 20px;
    width: 40px;
    height: 40px;
    border-radius: 12px;
  }
  .power-card strong {
    font-size: 16px;
  }
  .power-card span {
    font-size: 13px;
  }
  .creator-note {
    font-size: 14px;
    padding: 12px 16px;
  }
}
</style>
