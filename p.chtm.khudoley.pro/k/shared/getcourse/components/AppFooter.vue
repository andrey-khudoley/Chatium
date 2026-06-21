<template>
  <footer class="app-footer">
    <div class="footer-content">
      <div class="footer-pill">ИП Худолей Андрей Германович</div>
      <div class="footer-pill footer-pill--muted">Все права сохранены © 2018-{{ currentYear }}</div>
      <button class="footer-link" @click="onChatiumClick">
        Сделано с <i class="fas fa-heart footer-heart"></i> на Chatium
      </button>
    </div>
  </footer>
</template>

<script setup lang="ts">
const currentYear = new Date().getFullYear()
const emit = defineEmits<{ 'chatium-click': [] }>()

function onChatiumClick() {
  emit('chatium-click')
}
</script>

<style scoped>
.app-footer {
  margin-top: 0.2rem;
}

.footer-content {
  border: 1px solid var(--color-border);
  border-radius: 1rem;
  background: rgba(255, 255, 255, 0.82);
  box-shadow: var(--shadow-card);
  padding: 0.75rem 0.9rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.55rem;
  flex-wrap: wrap;
  color: var(--color-text-secondary);
  font-size: 0.78rem;
}

.footer-pill {
  border: 1px solid #d3e3f6;
  background: #eff6ff;
  color: #2d4666;
  border-radius: 999px;
  padding: 0.25rem 0.55rem;
  font-weight: 700;
  white-space: nowrap;
}

.footer-pill--muted {
  background: #f5f8ff;
  color: #4b5f7d;
}

.footer-link {
  border: 1px solid #d3e3f6;
  border-radius: 999px;
  padding: 0.25rem 0.6rem;
  background: #f8fbff;
  color: #2d4666;
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  transition: background-color 0.18s ease, border-color 0.18s ease;
}

.footer-link:hover {
  background: #edf5ff;
  border-color: #bdd3ed;
}

.footer-heart {
  color: #dd3057;
  font-size: 0.75rem;
}

@media (max-width: 640px) {
  .footer-content {
    justify-content: center;
    padding: 0.68rem;
  }

  .footer-pill,
  .footer-link {
    width: 100%;
    text-align: center;
  }
}
</style>
