<template>
  <div class="slide">
    <div class="bg-effects">
      <div class="glow-orb orb-1"></div>
      <div class="glow-orb orb-2"></div>
      <div class="grid-noise"></div>
    </div>

    <div class="content">
      <div class="header">
        <h2 class="title">Файловое хранилище</h2>
        <p class="subtitle">
          Загрузите что угодно — <span class="accent">доставим мгновенно</span>
        </p>
      </div>

      <div class="features-grid">
        <div class="feature-card" v-for="(f, i) in features" :key="i">
          <div class="feature-icon">
            <i :class="f.icon"></i>
          </div>
          <h3>{{ f.title }}</h3>
          <p>{{ f.desc }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({ active: Boolean })

const features = [
  {
    icon: 'fas fa-image',
    title: 'Авто-превью',
    desc: 'Загрузили фото — платформа сама создаёт миниатюры нужных размеров. Ретина, мобайл — всё из коробки.'
  },
  {
    icon: 'fas fa-globe',
    title: 'CDN по всему миру',
    desc: 'Файлы отдаются с ближайшего сервера. Картинки грузятся за миллисекунды, видео не буферит.'
  },
  {
    icon: 'fas fa-file-zipper',
    title: 'Умная оптимизация',
    desc: 'Автоматическое сжатие без потери качества. Экономия трафика до 70% для ваших пользователей.'
  }
]
</script>

<style scoped>
.slide {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 32px 24px;
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
  filter: blur(140px);
  opacity: 0.12;
  animation: float 20s ease-in-out infinite;
}
.orb-1 {
  width: 550px;
  height: 550px;
  background: #14b8a6;
  top: -20%;
  right: -10%;
}
.orb-2 {
  width: 400px;
  height: 400px;
  background: #2dd4bf;
  bottom: -15%;
  left: -5%;
  animation-delay: -8s;
}

.grid-noise {
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");
  opacity: 0.4;
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-35px);
  }
}

.content {
  max-width: 1100px;
  width: 100%;
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 40px;
}

.header {
  text-align: center;
}

.title {
  font-family: var(--font-display);
  font-size: clamp(48px, 7vw, 84px);
  font-weight: 900;
  background: linear-gradient(135deg, #14b8a6, #2dd4bf, #5eead4);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
  line-height: 1.1;
}

.subtitle {
  font-family: var(--font-display);
  font-size: clamp(22px, 3.5vw, 36px);
  color: var(--text-secondary);
  margin: 16px 0 0;
  font-weight: 500;
}

.accent {
  background: linear-gradient(135deg, #14b8a6, #5eead4);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-weight: 700;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

.feature-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 16px;
  padding: 36px 28px 32px;
  border-radius: 20px;
  background: rgba(20, 184, 166, 0.04);
  border: 1px solid rgba(20, 184, 166, 0.1);
  transition: all 0.3s ease;
}

.feature-card:hover {
  border-color: rgba(20, 184, 166, 0.3);
  background: rgba(20, 184, 166, 0.08);
  transform: translateY(-5px);
  box-shadow: 0 12px 40px rgba(20, 184, 166, 0.15);
}

.feature-icon {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: rgba(20, 184, 166, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.feature-icon i {
  font-size: 24px;
  color: #14b8a6;
}

.feature-card h3 {
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.feature-card p {
  font-size: 16px;
  color: var(--text-tertiary, rgba(255, 255, 255, 0.5));
  margin: 0;
  line-height: 1.6;
}

@media (max-width: 768px) {
  .slide {
    padding: 24px 16px 16px;
    align-items: center;
  }
  .content {
    gap: 20px;
  }
  .title {
    font-size: 36px;
  }
  .subtitle {
    font-size: 18px;
    margin-top: 8px;
  }
  .features-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }
  .feature-card {
    flex-direction: row;
    text-align: left;
    align-items: center;
    padding: 14px 16px;
    gap: 14px;
    border-radius: 14px;
  }
  .feature-icon {
    width: 40px;
    height: 40px;
    min-width: 40px;
    border-radius: 12px;
  }
  .feature-icon i {
    font-size: 18px;
  }
  .feature-card h3 {
    font-size: 15px;
  }
  .feature-card p {
    font-size: 13px;
    line-height: 1.4;
  }
}
</style>
