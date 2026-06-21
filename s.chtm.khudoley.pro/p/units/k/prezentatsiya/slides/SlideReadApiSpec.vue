<template>
  <div class="slide dot-grid">
    <div class="container">
      <header class="head">
        <h1 class="title">Как читать API-спецификацию</h1>
        <span class="strip"></span>
        <p class="subtitle">Когда AI ошибся — это пять минут</p>
      </header>

      <ul class="items">
        <li
          v-for="(it, i) in items"
          :key="it.title"
          class="item"
          :class="{ accent: it.accent }"
          :style="{ animationDelay: 0.05 + i * 0.08 + 's' }"
        >
          <span class="badge">{{ it.num }}</span>
          <div class="text">
            <div class="i-title">{{ it.title }}</div>
            <div class="i-caption">{{ it.caption }}</div>
          </div>
        </li>
      </ul>

      <div class="footer-anchor">
        <span class="vstrip"></span>
        <span>AI ошибся → откройте спеку → проверьте 4 вещи → 5 минут</span>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({ active: Boolean })

const items = [
  { num: '01', title: 'Метод и URL', caption: 'Что делаем и куда стучимся' },
  { num: '02', title: 'Обязательные параметры', caption: 'Без чего вообще не сработает' },
  { num: '03', title: 'Тело запроса', caption: 'Формат и поля' },
  { num: '04', title: 'Примеры', caption: 'Главное. С них и начинайте.', accent: true }
]
</script>

<style scoped>
.slide {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--gradient-bg);
  padding: 56px 96px;
  overflow: hidden;
}

.container {
  width: 100%;
  max-width: 1500px;
  display: flex;
  flex-direction: column;
  gap: 36px;
}

.title {
  font-family: var(--font-display-new);
  font-weight: 700;
  font-size: clamp(26px, 3.2vw, 52px);
  color: var(--text-primary);
}
.strip {
  display: block;
  width: 80px;
  height: 4px;
  background: var(--accent-cyan);
  border-radius: 2px;
  margin: 16px 0;
}
.subtitle {
  font-family: var(--font-body-new);
  font-size: clamp(15px, 1.5vw, 26px);
  color: var(--text-secondary);
}

.items {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.item {
  display: flex;
  align-items: center;
  gap: 28px;
  padding: 18px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  opacity: 0;
  animation: fadeInUp 480ms ease-out forwards;
}
.item:last-child {
  border-bottom: none;
}
.item.accent {
  background: rgba(0, 217, 255, 0.06);
  border-left: 4px solid var(--accent-cyan);
  border-bottom: none;
  border-radius: 8px;
  padding: 18px 24px;
}

.badge {
  flex-shrink: 0;
  width: 56px;
  height: 56px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--accent-cyan);
  border-radius: 50%;
  font-family: var(--font-mono);
  font-weight: 600;
  font-size: clamp(14px, 1.2vw, 22px);
  color: var(--accent-cyan);
  background: rgba(0, 217, 255, 0.05);
}
.item.accent .badge {
  background: var(--accent-cyan);
  color: var(--bg-base);
}
.text {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.i-title {
  font-family: var(--font-display-new);
  font-weight: 600;
  font-size: clamp(18px, 1.9vw, 32px);
  color: var(--text-primary);
}
.i-caption {
  font-family: var(--font-body-new);
  font-size: clamp(13px, 1.2vw, 22px);
  color: var(--text-secondary);
}
.item.accent .i-caption {
  color: var(--text-primary);
  font-weight: 600;
}

.footer-anchor {
  display: flex;
  align-items: center;
  gap: 20px;
  justify-content: center;
  padding: 20px 24px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
}
.footer-anchor .vstrip {
  width: 60px;
  height: 4px;
  background: var(--accent-cyan);
  border-radius: 2px;
  flex-shrink: 0;
}
.footer-anchor span:last-child {
  font-family: var(--font-body-new);
  font-weight: 600;
  font-size: clamp(14px, 1.4vw, 26px);
  color: var(--text-secondary);
}

@media (max-width: 1024px) {
  .slide {
    padding: 32px 16px;
  }
  .badge {
    width: 44px;
    height: 44px;
  }
  .item {
    gap: 16px;
  }
}
</style>
