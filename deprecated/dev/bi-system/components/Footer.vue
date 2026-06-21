<template>
  <footer class="footer">
    <div class="footer-content">
      <div class="footer-info">
        <p class="footer-text">
          © {{ currentYear }} ИП Худолей Андрей Германович. Все права защищены.
        </p>
      </div>
      <div class="footer-links">
        <a :href="licenseUrl" class="footer-link">
          <i class="fas fa-file-contract"></i>
          <span>Лицензия</span>
        </a>
      </div>
    </div>
  </footer>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  licenseUrl: {
    type: String,
    required: true
  }
})

const currentYear = computed(() => new Date().getFullYear())
</script>

<style scoped>
.footer {
  background: linear-gradient(135deg, var(--color-bg-secondary) 0%, var(--color-bg) 100%);
  border-top: 1.5px solid var(--color-border);
  padding: 1.5rem 0;
  margin-top: auto;
}

.footer-content {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: center;
  justify-content: space-between;
}

.footer-info {
  text-align: center;
}

.footer-text {
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  margin: 0;
}

.footer-links {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.footer-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--color-text-secondary);
  text-decoration: none;
  font-size: 0.875rem;
  transition: color 0.2s ease;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  border: 1px solid var(--color-border);
  background: transparent;
}

.footer-link:hover {
  color: var(--color-primary);
  border-color: var(--color-primary);
}

.footer-link i {
  font-size: 0.875rem;
}

@media (min-width: 640px) {
  .footer-content {
    flex-direction: row;
  }

  .footer-info {
    text-align: left;
  }
}
</style>
