<template>
  <div class="slide dot-grid">
    <div class="container">
      <header class="head">
        <h1 class="title">Декларативно ломается на интеграциях</h1>
        <span class="strip"></span>
        <p class="subtitle">AI не знает, как именно сейчас устроен конкретный API</p>
      </header>

      <div class="cards">
        <article
          v-for="(c, i) in cards"
          :key="c.title"
          class="card"
          :style="{ animationDelay: 0.1 + i * 0.1 + 's' }"
        >
          <div class="ico">
            <span class="dot d1"></span>
            <span class="dot d2"></span>
            <span class="dot d3"></span>
            <span class="dot d4"></span>
          </div>
          <h3 class="card-title">{{ c.title }}</h3>
          <p class="card-text">{{ c.text }}</p>
        </article>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({ active: Boolean })

const cards = [
  {
    title: 'Endpoints, которых нет',
    text: 'AI генерирует правдоподобные URL, которых не существует'
  },
  { title: 'Старые названия полей', text: 'Передаёт name, когда API ждёт full_name' },
  { title: 'Перепутанная авторизация', text: 'Кладёт ключ в заголовок, который API не читает' }
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
  max-width: 1600px;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.head {
  display: flex;
  flex-direction: column;
}
.title {
  font-family: var(--font-display-new);
  font-weight: 700;
  font-size: clamp(28px, 3.6vw, 56px);
  color: var(--text-primary);
  letter-spacing: -1px;
}
.strip {
  display: block;
  width: 80px;
  height: 4px;
  background: var(--accent-cyan);
  border-radius: 2px;
  margin: 20px 0 16px;
}
.subtitle {
  font-family: var(--font-body-new);
  font-size: clamp(15px, 1.6vw, 26px);
  color: var(--text-secondary);
}

.cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 32px;
}

.card {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 16px;
  padding: 32px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-height: 220px;
  opacity: 0;
  animation: fadeInUp 500ms ease-out forwards;
  transition:
    transform 0.3s ease,
    border-color 0.3s ease;
}
.card:hover {
  transform: translateY(-4px);
  border-color: rgba(255, 179, 71, 0.4);
}

.ico {
  display: grid;
  grid-template-columns: repeat(2, 24px);
  grid-template-rows: repeat(2, 24px);
  gap: 4px;
  width: 56px;
  height: 56px;
}
.dot {
  background: rgba(255, 179, 71, 0.8);
  border-radius: 4px;
}
.d1 {
  width: 24px;
  height: 6px;
  align-self: center;
}
.d2 {
  width: 6px;
  height: 24px;
  justify-self: end;
}
.d3 {
  width: 6px;
  height: 24px;
  justify-self: start;
}
.d4 {
  width: 24px;
  height: 6px;
  align-self: center;
}

.card-title {
  font-family: var(--font-display-new);
  font-weight: 600;
  font-size: clamp(18px, 1.8vw, 30px);
  color: var(--text-primary);
}
.card-text {
  font-family: var(--font-body-new);
  font-size: clamp(13px, 1.2vw, 22px);
  color: var(--text-secondary);
  line-height: 1.5;
}

@media (max-width: 1024px) {
  .slide {
    padding: 40px 24px;
  }
  .cards {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  .card {
    min-height: auto;
    padding: 22px;
  }
}
</style>
