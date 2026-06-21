<template>
  <div class="slide dot-grid">
    <div class="container">
      <header class="head">
        <h1 class="title">И что вернётся в ответ</h1>
        <span class="strip"></span>
      </header>

      <div class="pills">
        <div
          v-for="(p, i) in pills"
          :key="p.code"
          class="pill"
          :class="p.kind"
          :style="{ animationDelay: 0.05 + i * 0.08 + 's' }"
        >
          <span class="num">{{ p.code }}</span>
          <span class="label">{{ p.label }}</span>
        </div>
      </div>

      <section class="body">
        <div class="body-text">
          <h3>Тело ответа</h3>
          <p>обычно JSON. Это ради него вы и стучались.</p>
        </div>
        <pre
          class="code"
        >{ <span class="key">"id"</span>: <span class="num">12345</span>, <span class="key">"email"</span>: <span class="str">"ivan@…"</span>, <span class="key">"created"</span>: <span class="str">"2026-05-06"</span> }</pre>
      </section>
    </div>
  </div>
</template>

<script setup>
defineProps({ active: Boolean })

const pills = [
  { code: '200', label: 'OK', kind: 'ok' },
  { code: '400', label: 'Ты накосячил', kind: 'warn' },
  { code: '401 / 403', label: 'Нет прав', kind: 'warn' },
  { code: '404', label: 'Нет такого', kind: 'mute' },
  { code: '500', label: 'Они сломались', kind: 'err' }
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
  padding: 56px 64px;
  overflow: hidden;
}

.container {
  width: 100%;
  max-width: 1700px;
  display: flex;
  flex-direction: column;
  gap: 56px;
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

.pills {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  justify-content: center;
}

.pill {
  display: inline-flex;
  align-items: center;
  gap: 14px;
  padding: 14px 28px;
  border-radius: 999px;
  border: 1px solid var(--border-subtle);
  opacity: 0;
  animation: fadeInUp 460ms ease-out forwards;
}
.pill .num {
  font-family: var(--font-mono);
  font-weight: 700;
  font-size: clamp(20px, 2vw, 32px);
}
.pill .label {
  font-family: var(--font-body-new);
  font-weight: 500;
  font-size: clamp(13px, 1.3vw, 22px);
}
.pill.ok {
  background: rgba(74, 222, 128, 0.16);
  color: var(--status-success);
  border-color: rgba(74, 222, 128, 0.3);
}
.pill.warn {
  background: rgba(255, 179, 71, 0.16);
  color: var(--status-warning);
  border-color: rgba(255, 179, 71, 0.3);
}
.pill.mute {
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-secondary);
}
.pill.err {
  background: rgba(248, 113, 113, 0.16);
  color: var(--status-error);
  border-color: rgba(248, 113, 113, 0.3);
}

.body {
  display: grid;
  grid-template-columns: 1fr 1.5fr;
  gap: 32px;
  align-items: center;
  padding: 28px;
  border: 1px solid var(--border-subtle);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.02);
}
.body-text h3 {
  font-family: var(--font-display-new);
  font-weight: 600;
  font-size: clamp(16px, 1.5vw, 24px);
  color: var(--text-primary);
  margin-bottom: 8px;
}
.body-text p {
  font-family: var(--font-body-new);
  font-size: clamp(14px, 1.3vw, 22px);
  color: var(--text-secondary);
}

.code {
  font-family: var(--font-mono);
  font-size: clamp(12px, 1.1vw, 20px);
  background: var(--bg-surface);
  padding: 16px;
  border-radius: 8px;
  margin: 0;
  color: var(--text-primary);
  overflow-x: auto;
}
.code :deep(.key),
.key {
  color: var(--accent-amber);
}
.code :deep(.str),
.str {
  color: var(--json-string);
}
.code :deep(.num),
.code .num {
  color: var(--accent-cyan);
}

@media (max-width: 1024px) {
  .slide {
    padding: 32px 16px;
  }
  .body {
    grid-template-columns: 1fr;
  }
}
</style>
