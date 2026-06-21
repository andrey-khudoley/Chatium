<template>
  <div class="slide dot-grid">
    <div class="container">
      <header class="head">
        <h1 class="title">Как это выглядит целиком</h1>
        <span class="strip"></span>
      </header>

      <div class="layout">
        <pre
          class="code"
        ><span class="ln"><span class="kw">POST</span> /api/users <span class="dim">HTTP/1.1</span></span>
<span class="ln"><span class="hdr">Host:</span> school.getcourse.ru</span>
<span class="ln"><span class="hdr">Authorization:</span> <span class="val">Bearer eyJhbGc...</span></span>
<span class="ln"><span class="hdr">Content-Type:</span> <span class="val">application/json</span></span>
<span class="ln"></span>
<span class="ln">{</span>
<span class="ln">  <span class="key">"email"</span>: <span class="str">"ivan@example.com"</span>,</span>
<span class="ln">  <span class="key">"name"</span>: <span class="str">"Иван Петров"</span></span>
<span class="ln">}</span></pre>

        <ul class="annot">
          <li
            v-for="(a, i) in annotations"
            :key="a.text"
            :style="{ animationDelay: 0.1 + i * 0.1 + 's' }"
          >
            <span class="arr"><i class="fas fa-arrow-left"></i></span>
            <span>{{ a.text }}</span>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({ active: Boolean })

const annotations = [
  { text: 'Метод и URL' },
  { text: 'Какой стандарт' },
  { text: 'Авторизация' },
  { text: 'Формат тела' },
  { text: 'Сами данные' }
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
  max-width: 1700px;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.title {
  font-family: var(--font-display-new);
  font-weight: 700;
  font-size: clamp(24px, 3.2vw, 52px);
  color: var(--text-primary);
}
.strip {
  display: block;
  width: 80px;
  height: 4px;
  background: var(--accent-cyan);
  border-radius: 2px;
  margin-top: 16px;
}

.layout {
  display: grid;
  grid-template-columns: 1.6fr 1fr;
  gap: 48px;
  align-items: center;
}

.code {
  font-family: var(--font-mono);
  font-size: clamp(13px, 1.4vw, 24px);
  line-height: 1.6;
  background: var(--bg-code);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  padding: 28px 32px;
  margin: 0;
  color: var(--text-primary);
  white-space: pre-wrap;
  overflow-x: auto;
}
.ln {
  display: block;
}
.code :deep(.kw) {
  color: var(--accent-cyan);
  font-weight: 700;
}
.code :deep(.dim) {
  color: var(--text-tertiary);
}
.code :deep(.hdr) {
  color: var(--accent-cyan);
  font-weight: 600;
}
.code :deep(.val) {
  color: var(--text-primary);
}
.code :deep(.key) {
  color: var(--accent-amber);
}
.code :deep(.str) {
  color: var(--json-string);
}

.annot {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 18px;
  height: 100%;
}
.annot li {
  display: flex;
  align-items: center;
  gap: 16px;
  font-family: var(--font-body-new);
  font-weight: 600;
  font-size: clamp(13px, 1.2vw, 22px);
  color: var(--text-primary);
  opacity: 0;
  animation: fadeInLeft 460ms ease-out forwards;
}
.arr {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  color: var(--accent-cyan);
  background: rgba(0, 217, 255, 0.08);
  border: 1px solid var(--border-accent);
  font-size: 12px;
}

@media (max-width: 1024px) {
  .slide {
    padding: 32px 16px;
  }
  .layout {
    grid-template-columns: 1fr;
    gap: 24px;
  }
}
</style>
