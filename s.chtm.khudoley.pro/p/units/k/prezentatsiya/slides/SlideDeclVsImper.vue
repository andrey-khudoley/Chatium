<template>
  <div class="slide dot-grid">
    <div class="container">
      <header class="head">
        <h2 class="page-title">Два способа разговаривать с AI про код</h2>
      </header>

      <div class="cols">
        <section class="col">
          <span class="tag tag-cyan">ДЕКЛАРАТИВНО</span>
          <h3 class="col-title">Описываем результат</h3>
          <pre class="code">
«Сделай форму, которая собирает заявки
и кладёт их в GetCourse»</pre
          >
          <ul class="bullets">
            <li><i class="fas fa-check"></i> Быстро</li>
            <li><i class="fas fa-check"></i> Удобно</li>
            <li><i class="fas fa-check"></i> Естественно для AI</li>
          </ul>
        </section>

        <div class="divider"></div>

        <section class="col">
          <span class="tag tag-amber">ИМПЕРАТИВНО</span>
          <h3 class="col-title">Описываем шаги</h3>
          <pre class="code">
«Возьми email из формы.
Сделай POST на /api/users.
Передай Authorization: Bearer &lt;ключ&gt;.
Если 401 — обнови токен и повтори»</pre
          >
          <ul class="bullets bullets-amber">
            <li><i class="fas fa-check"></i> Скучнее</li>
            <li><i class="fas fa-check"></i> Длиннее</li>
            <li><i class="fas fa-check"></i> AI ошибается реже</li>
          </ul>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({ active: Boolean })
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
  gap: 40px;
}

.head {
  display: flex;
}
.page-title {
  font-family: var(--font-display-new);
  font-weight: 600;
  font-size: clamp(20px, 2.4vw, 38px);
  color: var(--text-primary);
}

.cols {
  display: grid;
  grid-template-columns: 1fr 1px 1fr;
  gap: 48px;
  align-items: stretch;
}

.col {
  display: flex;
  flex-direction: column;
  gap: 20px;
  animation: fadeInUp 480ms ease-out both;
}
.col:last-child {
  animation-delay: 120ms;
}

.divider {
  width: 1px;
  background: rgba(255, 255, 255, 0.08);
}

.tag {
  display: inline-block;
  align-self: flex-start;
  font-family: var(--font-mono);
  font-size: clamp(12px, 1vw, 18px);
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}
.tag-cyan {
  color: var(--accent-cyan);
}
.tag-amber {
  color: var(--accent-amber);
}

.col-title {
  font-family: var(--font-display-new);
  font-weight: 600;
  font-size: clamp(20px, 2.2vw, 36px);
  color: var(--text-primary);
}

.code {
  font-family: var(--font-mono);
  font-size: clamp(14px, 1.4vw, 24px);
  line-height: 1.55;
  color: var(--text-primary);
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  padding: 24px;
  margin: 0;
  white-space: pre-wrap;
}

.bullets {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.bullets li {
  display: flex;
  align-items: center;
  gap: 12px;
  font-family: var(--font-body-new);
  font-size: clamp(14px, 1.3vw, 22px);
  color: var(--text-secondary);
}
.bullets li i {
  font-size: 14px;
  color: var(--accent-cyan);
}
.bullets-amber li i {
  color: var(--accent-amber);
}

@media (max-width: 1024px) {
  .slide {
    padding: 40px 24px;
  }
  .cols {
    grid-template-columns: 1fr;
    gap: 32px;
  }
  .divider {
    display: none;
  }
}
</style>
