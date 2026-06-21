<template>
  <div class="slide">
    <div class="bg-effects">
      <div class="glow-orb orb-1"></div>
      <div class="glow-orb orb-2"></div>
      <div class="glow-orb orb-3"></div>
    </div>

    <!-- Веном на весь правый край -->
    <div class="venom-bg">
      <img
        src="https://sel.cdn-chatium.io/get/image_msk_eRQyfIqKp3.1408x768.jpeg"
        alt=""
        class="venom-img"
      />
      <div class="venom-glow"></div>
    </div>

    <div class="content">
      <div class="left-col">
        <div class="header">
          <h2 class="title">
            <span class="title-main">Ботан</span>
            <span class="title-sub">Верховный агент</span>
          </h2>
          <p class="tagline">
            Говоришь что нужно — <span class="glow-text">он делает и управляет</span>
          </p>
        </div>

        <div class="powers">
          <div v-for="(p, i) in powers" :key="i" class="power-card">
            <i :class="p.icon"></i>
            <div>
              <strong>{{ p.title }}</strong>
              <span>{{ p.desc }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({ active: Boolean })

const powers = [
  {
    icon: 'fas fa-wand-magic-sparkles',
    title: 'Создаёт сам',
    desc: 'Магазины, школы, лендинги, CRM — за минуты'
  },
  {
    icon: 'fas fa-users-gear',
    title: 'Управляет командой',
    desc: 'Раздаёт задачи агентам и следит за результатом'
  },
  {
    icon: 'fas fa-database',
    title: 'Знает всё',
    desc: 'Видит все данные, модули и подключения платформы'
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
  background: #eab308;
  top: -20%;
  left: -10%;
}
.orb-2 {
  width: 500px;
  height: 500px;
  background: #84cc16;
  bottom: -15%;
  right: -10%;
  animation-delay: -7s;
}
.orb-3 {
  width: 400px;
  height: 400px;
  background: #facc15;
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

/* Веном — занимает всю правую половину */
.venom-bg {
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

.venom-img {
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
  filter: brightness(0.7) saturate(1.3) contrast(1.1);
  animation: venom-breathe 6s ease-in-out infinite;
}

@keyframes venom-breathe {
  0%,
  100% {
    filter: brightness(0.7) saturate(1.3) contrast(1.1);
  }
  50% {
    filter: brightness(0.85) saturate(1.5) contrast(1.15);
  }
}

.venom-glow {
  position: absolute;
  top: 30%;
  right: 15%;
  width: 500px;
  height: 500px;
  background: radial-gradient(
    circle,
    rgba(234, 179, 8, 0.12) 0%,
    rgba(132, 204, 22, 0.06) 40%,
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
  gap: 28px;
}

/* Header */
.header {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.title {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0;
}
.title-main {
  font-family: var(--font-display);
  font-size: clamp(56px, 8vw, 88px);
  font-weight: 900;
  line-height: 1;
  background: linear-gradient(135deg, #eab308 0%, #84cc16 60%, #22d3ee 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.title-sub {
  font-family: var(--font-display);
  font-size: clamp(20px, 3vw, 28px);
  color: rgba(234, 179, 8, 0.7);
  font-weight: 600;
  letter-spacing: 2px;
  text-transform: uppercase;
}

.tagline {
  font-family: var(--font-display);
  font-size: clamp(20px, 2.5vw, 30px);
  font-weight: 400;
  line-height: 1.4;
  margin: 0;
  color: var(--text-muted);
}
.glow-text {
  background: linear-gradient(135deg, #eab308, #84cc16);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-weight: 600;
}

/* Powers */
.powers {
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: 100%;
}

.power-card {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 22px 26px;
  background: rgba(234, 179, 8, 0.04);
  border: 1px solid rgba(234, 179, 8, 0.12);
  border-radius: 16px;
  text-align: left;
  transition: all 0.3s ease;
  backdrop-filter: blur(8px);
}
.power-card:hover {
  border-color: rgba(234, 179, 8, 0.35);
  background: rgba(234, 179, 8, 0.1);
  transform: translateX(6px);
  box-shadow: 0 12px 30px rgba(234, 179, 8, 0.12);
}
.power-card > i {
  font-size: 28px;
  color: #eab308;
  flex-shrink: 0;
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(234, 179, 8, 0.08);
  border-radius: 14px;
}
.power-card strong {
  display: block;
  font-size: 22px;
  color: var(--text-primary);
  margin-bottom: 3px;
}
.power-card span {
  font-size: 15px;
  color: var(--text-muted);
  line-height: 1.4;
}

/* Mobile */
@media (max-width: 960px) {
  .content {
    padding-left: 16px;
    max-width: 100%;
  }
  .venom-bg {
    width: 45%;
    opacity: 0.5;
  }
}

@media (max-width: 600px) {
  .slide {
    padding: 24px 16px 16px;
  }
  .venom-bg {
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
  .title-sub {
    font-size: 16px;
    letter-spacing: 1px;
  }
  .tagline {
    font-size: 16px;
  }
  .power-card {
    padding: 14px 16px;
    gap: 14px;
  }
  .power-card > i {
    font-size: 22px;
    width: 42px;
    height: 42px;
    border-radius: 12px;
  }
  .power-card strong {
    font-size: 16px;
  }
  .power-card span {
    font-size: 13px;
  }
}
</style>
