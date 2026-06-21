<template>
  <div class="slide dot-grid">
    <div class="anchor-glow"></div>

    <div class="content">
      <h1 class="title">Запомните: интеграция = разговор по <span class="hl">HTTPS</span></h1>
      <span class="strip"></span>
      <p class="hint"><i>(на этом и остановимся)</i></p>

      <div class="caps">
        <article class="cap">
          <span class="tag">ЗАЧЕМ</span>
          <h3>Один прикладной протокол</h3>
          <p>программы зовут друг друга; «S» — шифрование канала</p>
        </article>
        <article class="cap">
          <span class="tag">ИЗ ЧЕГО</span>
          <h3>Запрос <span class="bidir">↔</span> Ответ</h3>
          <p>у каждого — несколько обязательных частей</p>
        </article>
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
  padding: 56px 32px;
  overflow: hidden;
}

.content {
  position: relative;
  z-index: 1;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 1500px;
  animation: fadeInUp 600ms ease-out both;
}

.title {
  font-family: var(--font-display-new);
  font-weight: 800;
  font-size: clamp(30px, 6vw, 92px);
  color: var(--text-primary);
  letter-spacing: -2px;
  line-height: 1.05;
  text-shadow: 0 0 60px rgba(0, 217, 255, 0.2);
  max-width: 1300px;
}
.hl {
  color: var(--accent-cyan);
}

.strip {
  display: block;
  width: 280px;
  height: 4px;
  background: var(--accent-cyan);
  border-radius: 2px;
  margin-top: 32px;
  box-shadow: 0 0 18px rgba(0, 217, 255, 0.6);
}

.hint {
  margin-top: 24px;
  font-family: var(--font-body-new);
  font-style: italic;
  font-size: clamp(15px, 1.5vw, 26px);
  color: var(--text-secondary);
}

.caps {
  margin-top: 80px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
  width: 100%;
  max-width: 1180px;
}

.cap {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 16px;
  padding: 28px 32px;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 180px;
  transition:
    transform 0.3s ease,
    border-color 0.3s ease;
}
.cap:hover {
  transform: translateY(-4px);
  border-color: var(--border-accent);
}

.tag {
  font-family: var(--font-mono);
  font-size: clamp(11px, 1vw, 18px);
  font-weight: 600;
  letter-spacing: 0.16em;
  color: var(--accent-cyan);
  text-transform: uppercase;
}
.cap h3 {
  font-family: var(--font-display-new);
  font-weight: 700;
  font-size: clamp(18px, 1.8vw, 28px);
  color: var(--text-primary);
}
.cap p {
  font-family: var(--font-body-new);
  font-size: clamp(13px, 1.2vw, 22px);
  color: var(--text-secondary);
  line-height: 1.45;
}
.bidir {
  color: var(--accent-cyan);
  font-family: var(--font-mono);
  font-weight: 700;
  letter-spacing: 0.1em;
  margin: 0 8px;
}

@media (max-width: 768px) {
  .caps {
    grid-template-columns: 1fr;
    gap: 16px;
    margin-top: 40px;
  }
  .cap {
    min-height: auto;
    padding: 20px 22px;
  }
  .strip {
    width: 180px;
  }
}
</style>
