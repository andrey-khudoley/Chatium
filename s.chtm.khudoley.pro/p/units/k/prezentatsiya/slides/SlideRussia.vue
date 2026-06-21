<template>
  <div class="slide">
    <div class="bg-effects">
      <div class="glow-orb orb-1"></div>
      <div class="glow-orb orb-2"></div>
    </div>

    <div class="container">
      <div class="header">
        <span class="num">02.2</span>
        <h2 class="title">
          Для бизнеса в РФ —<br />
          <span class="gradient-text">единственный вариант</span>
        </h2>
      </div>

      <div class="cards">
        <div
          v-for="(c, i) in cards"
          :key="i"
          class="card"
          :style="{ '--card-color': c.color, transitionDelay: i * 0.15 + 's' }"
        >
          <div class="card-glow"></div>
          <div class="card-icon" :style="{ background: c.color + '15', color: c.color }">
            <i :class="c.icon"></i>
          </div>
          <h3>{{ c.title }}</h3>
          <ul>
            <li v-for="(item, j) in c.items" :key="j">
              <span class="check"><i class="fas fa-check"></i></span>{{ item }}
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({ active: Boolean })

const cards = [
  {
    icon: 'fas fa-gavel',
    title: 'Юридическое',
    color: '#6366f1',
    items: [
      '152-ФЗ — данные в российских дата-центрах',
      '54-ФЗ — автоматические чеки при оплате',
      'Нет риска блокировок'
    ]
  },
  {
    icon: 'fas fa-credit-card',
    title: 'Платежи РФ',
    color: '#10b981',
    items: [
      'ЮКасса, CloudPayments, Invoice',
      'МИР, Visa РФ, MasterCard РФ, СБП',
      'Рекуррентные, оплата в 1 клик'
    ]
  },
  {
    icon: 'fas fa-plug',
    title: 'Интеграции',
    color: '#06b6d4',
    items: ['GetCourse, AmoCRM, Bitrix24', 'VK API, Telegram Bot API', 'SMS-шлюзы, Wazzup24, MAX']
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
  padding: 60px 24px 24px;
  background: var(--bg-deep);
  overflow-y: auto;
  overflow-x: hidden;
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
  opacity: 0.2;
  animation: float 12s ease-in-out infinite;
}

.orb-1 {
  width: 400px;
  height: 400px;
  background: var(--accent-indigo);
  top: -10%;
  right: -5%;
}

.orb-2 {
  width: 350px;
  height: 350px;
  background: var(--accent-cyan);
  bottom: -10%;
  left: -5%;
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
  max-width: 960px;
  width: 100%;
}

.header {
  margin-bottom: 40px;
}
.num {
  display: inline-block;
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 700;
  color: var(--accent-indigo);
  padding: 6px 14px;
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-radius: 8px;
  margin-bottom: 16px;
  background: rgba(99, 102, 241, 0.05);
}
.title {
  font-family: var(--font-display);
  font-size: clamp(26px, 4vw, 42px);
  font-weight: 800;
  line-height: 1.2;
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

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
}
.card {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: 20px;
  padding: 32px;
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
  overflow: hidden;
  opacity: 1;
  transform: translateY(0);
}

.card:hover {
  border-color: var(--card-color);
  transform: translateY(-8px) scale(1.02);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.4);
}

.card-glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 50% 0%, var(--card-color) 0%, transparent 70%);
  opacity: 0;
  transition: opacity 0.5s ease;
}

.card:hover .card-glow {
  opacity: 0.08;
}

.card-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  margin-bottom: 20px;
  position: relative;
  z-index: 2;
  transition: transform 0.4s ease;
}

.card:hover .card-icon {
  transform: scale(1.1);
}

.card h3 {
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 20px;
  position: relative;
  z-index: 2;
}

.card ul {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 12px;
  position: relative;
  z-index: 2;
}

.card li {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.5;
  transition: color 0.3s ease;
}

.card:hover li {
  color: var(--text-primary);
}

.check {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(16, 185, 129, 0.15);
  border-radius: 6px;
  color: var(--accent-emerald);
  font-size: 10px;
  flex-shrink: 0;
  margin-top: 1px;
}

@media (max-width: 768px) {
  .cards {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .slide {
    padding: 24px 14px 14px;
  }
  .header {
    margin-bottom: 24px;
  }
  .title {
    font-size: 22px;
  }
  .card {
    padding: 20px 18px;
    border-radius: 16px;
  }
  .card-icon {
    width: 44px;
    height: 44px;
    font-size: 18px;
    margin-bottom: 14px;
    border-radius: 12px;
  }
  .card h3 {
    font-size: 16px;
    margin-bottom: 14px;
  }
  .card li {
    font-size: 13px;
    gap: 8px;
  }
  .check {
    width: 18px;
    height: 18px;
    font-size: 9px;
  }
}
</style>
