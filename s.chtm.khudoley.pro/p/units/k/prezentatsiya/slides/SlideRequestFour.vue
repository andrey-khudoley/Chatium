<template>
  <div class="slide dot-grid">
    <div class="container">
      <header class="head">
        <h1 class="title">Любой HTTPS-запрос — это четыре вещи</h1>
        <span class="strip"></span>
      </header>

      <div class="grid">
        <article
          v-for="(c, i) in cards"
          :key="c.title"
          class="card"
          :style="{ animationDelay: 0.05 + i * 0.08 + 's' }"
        >
          <span class="badge">{{ c.num }}</span>
          <h3 class="card-title">{{ c.title }}</h3>
          <pre class="code" v-html="c.code"></pre>
        </article>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({ active: Boolean })

const cards = [
  {
    num: '01',
    title: 'Метод',
    code: '<span class="kw">GET</span> · <span class="kw">POST</span> · <span class="kw">PUT</span> · <span class="kw">DELETE</span>'
  },
  { num: '02', title: 'URL', code: 'https://school.getcourse.ru/api/users' },
  {
    num: '03',
    title: 'Заголовки',
    code: '<span class="kw">Authorization:</span> <span class="kw">Bearer</span> …'
  },
  {
    num: '04',
    title: 'Тело',
    code: '{ <span class="key">"email"</span>: <span class="str">"…"</span>, <span class="key">"name"</span>: <span class="str">"…"</span> }'
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
  background: var(--gradient-bg);
  padding: 56px 96px;
  overflow: hidden;
}

.container {
  width: 100%;
  max-width: 1500px;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.title {
  font-family: var(--font-display-new);
  font-weight: 700;
  font-size: clamp(24px, 3.2vw, 52px);
  color: var(--text-primary);
  letter-spacing: -1px;
}
.strip {
  display: block;
  width: 80px;
  height: 4px;
  background: var(--accent-cyan);
  border-radius: 2px;
  margin-top: 16px;
}

.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-auto-rows: 1fr;
  gap: 28px;
}

.card {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 16px;
  padding: 28px 32px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  opacity: 0;
  animation: fadeInUp 480ms ease-out forwards;
  transition:
    transform 0.3s ease,
    border-color 0.3s ease;
  min-height: 220px;
}
.card:hover {
  transform: translateY(-4px);
  border-color: var(--border-accent);
}

.badge {
  align-self: flex-start;
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

.card-title {
  font-family: var(--font-display-new);
  font-weight: 600;
  font-size: clamp(18px, 1.9vw, 30px);
  color: var(--text-primary);
}

.code {
  font-family: var(--font-mono);
  font-size: clamp(13px, 1.2vw, 22px);
  margin: 0;
  padding: 16px 20px;
  background: var(--bg-code);
  border-radius: 8px;
  color: var(--text-primary);
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.55;
}
.code :deep(.kw) {
  color: var(--accent-cyan);
  font-weight: 600;
}
.code :deep(.key) {
  color: var(--accent-amber);
}
.code :deep(.str) {
  color: var(--json-string);
}

@media (max-width: 1024px) {
  .slide {
    padding: 40px 24px;
  }
  .grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  .card {
    min-height: auto;
    padding: 20px 22px;
  }
}
</style>
