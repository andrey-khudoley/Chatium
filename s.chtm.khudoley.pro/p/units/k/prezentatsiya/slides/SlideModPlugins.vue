<template>
  <div class="slide">
    <div class="bg-effects">
      <div class="glow-orb orb-1"></div>
      <div class="glow-orb orb-2"></div>
    </div>

    <div class="content">
      <h2 class="title">Плагины и шаблоны</h2>
      <p class="subtitle">Написал приложение — <span class="accent">продай или раздай</span></p>

      <div class="grid">
        <div class="card" v-for="(item, i) in items" :key="i">
          <div class="card-icon" :style="{ background: item.bg }">
            <i :class="item.icon"></i>
          </div>
          <div class="card-body">
            <div class="card-name">{{ item.name }}</div>
            <div class="card-desc">{{ item.desc }}</div>
          </div>
          <div class="card-footer">
            <span class="card-price" :class="{ free: item.free }">{{ item.price }}</span>
            <span class="card-btn">{{ item.free ? 'Установить' : 'Купить' }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({ active: Boolean })

const items = [
  {
    icon: 'fas fa-graduation-cap',
    name: 'Онлайн-школа',
    desc: 'LMS с уроками, домашками и прогрессом',
    price: '4 990 ₽',
    free: false,
    bg: 'rgba(168,85,247,0.18)'
  },
  {
    icon: 'fas fa-store',
    name: 'Интернет-магазин',
    desc: 'Каталог, корзина, оплата',
    price: 'Бесплатно',
    free: true,
    bg: 'rgba(59,130,246,0.18)'
  },
  {
    icon: 'fas fa-calendar-check',
    name: 'Запись на услуги',
    desc: 'Расписание и бронирование',
    price: '2 490 ₽',
    free: false,
    bg: 'rgba(16,185,129,0.18)'
  },
  {
    icon: 'fas fa-robot',
    name: 'AI-ассистент',
    desc: 'Бот-консультант для сайта',
    price: 'Бесплатно',
    free: true,
    bg: 'rgba(244,63,94,0.18)'
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
  width: 500px;
  height: 500px;
  background: #a855f7;
  top: -15%;
  right: -10%;
}
.orb-2 {
  width: 400px;
  height: 400px;
  background: #7c3aed;
  bottom: -15%;
  left: -5%;
  animation-delay: -7s;
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-30px);
  }
}

.content {
  max-width: 900px;
  width: 100%;
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 36px;
}

.title {
  font-family: var(--font-display);
  font-size: clamp(44px, 7vw, 80px);
  font-weight: 900;
  background: linear-gradient(135deg, #a855f7, #c084fc, #e9d5ff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
  line-height: 1.1;
  text-align: center;
  white-space: nowrap;
}

.subtitle {
  font-family: var(--font-display);
  font-size: clamp(18px, 2.5vw, 28px);
  color: var(--text-secondary);
  margin: 8px 0 0;
  font-weight: 500;
  text-align: center;
}

.accent {
  background: linear-gradient(135deg, #a855f7, #e9d5ff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-weight: 700;
}

/* Marketplace grid */
.grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  width: 100%;
}

.card {
  padding: 24px;
  border-radius: 20px;
  background: rgba(168, 85, 247, 0.03);
  border: 1px solid rgba(168, 85, 247, 0.1);
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: all 0.3s ease;
}

.card:hover {
  border-color: rgba(168, 85, 247, 0.3);
  background: rgba(168, 85, 247, 0.07);
  transform: translateY(-4px);
  box-shadow: 0 16px 48px rgba(168, 85, 247, 0.1);
}

.card-icon {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-icon i {
  font-size: 22px;
  color: #c084fc;
}

.card-body {
  flex: 1;
  min-width: 0;
}

.card-name {
  font-family: var(--font-display);
  font-size: clamp(18px, 2.2vw, 24px);
  font-weight: 800;
  color: rgba(255, 255, 255, 0.92);
}

.card-desc {
  font-size: clamp(13px, 1.5vw, 16px);
  color: rgba(255, 255, 255, 0.4);
  line-height: 1.4;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
  padding-top: 10px;
}

.card-price {
  font-family: var(--font-mono, 'JetBrains Mono', monospace);
  font-size: clamp(16px, 2vw, 22px);
  font-weight: 700;
  color: #c084fc;
}

.card-price.free {
  color: #34d399;
}

.card-btn {
  padding: 6px 16px;
  border-radius: 8px;
  background: rgba(168, 85, 247, 0.12);
  border: 1px solid rgba(168, 85, 247, 0.2);
  font-size: 13px;
  font-weight: 600;
  color: #c084fc;
  cursor: pointer;
  transition: all 0.2s ease;
}

.card:hover .card-btn {
  background: rgba(168, 85, 247, 0.2);
  border-color: rgba(168, 85, 247, 0.35);
}

@media (max-width: 768px) {
  .slide {
    padding: 24px 12px 12px;
    align-items: center;
  }
  .content {
    gap: 16px;
  }
  .title {
    white-space: normal;
    font-size: clamp(26px, 5.5vw, 38px);
  }
  .subtitle {
    font-size: 15px;
    margin: 0;
  }
  .grid {
    grid-template-columns: 1fr;
    gap: 8px;
  }
  .card {
    padding: 12px;
    flex-direction: row;
    align-items: center;
    gap: 10px;
  }
  .card-icon {
    width: 36px;
    height: 36px;
    flex-shrink: 0;
    border-radius: 10px;
  }
  .card-icon i {
    font-size: 16px;
  }
  .card-body {
    flex: 1;
    min-width: 0;
  }
  .card-name {
    font-size: 14px;
  }
  .card-desc {
    font-size: 12px;
    line-height: 1.3;
  }
  .card-footer {
    flex-direction: column;
    align-items: flex-end;
    flex-shrink: 0;
    padding-top: 0;
    gap: 4px;
  }
  .card-price {
    font-size: 13px;
    white-space: nowrap;
  }
  .card-btn {
    font-size: 11px;
    padding: 4px 10px;
    white-space: nowrap;
  }
}
</style>
