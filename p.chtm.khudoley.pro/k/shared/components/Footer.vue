<template>
  <footer class="app-footer">
    <div class="footer-content">
      <div class="footer-left">
        <i class="fas fa-book"></i>
        <span class="footer-text">Knowledge Base</span>
        <span class="footer-version">v1.0</span>
      </div>
      <div class="footer-center">
        <span class="footer-copyright">© {{ currentYear }} Все права защищены</span>
      </div>
      <div class="footer-right">
        <a href="#" class="footer-link" title="Документация" @click.prevent>
          <i class="fas fa-circle-question"></i>
        </a>
        <a href="#" class="footer-link" title="Поддержка" @click.prevent>
          <i class="fas fa-envelope"></i>
        </a>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const currentYear = computed(() => new Date().getFullYear())
</script>

<style scoped>
.app-footer {
  background: linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%);
  border-top: 1px solid var(--border-primary);
  padding: 1.5rem 0;
  margin-top: 3rem;
  transition: all 0.3s ease;
}

[data-theme="dark"] .app-footer {
  background: linear-gradient(135deg, var(--glass-bg) 0%, var(--bg-primary) 100%);
  border-top-color: var(--glass-border);
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
}

.footer-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.footer-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-primary);
  font-weight: 600;
  font-size: 0.875rem;
}

.footer-left i {
  color: var(--link-primary);
  font-size: 1rem;
}

.footer-text {
  font-weight: 700;
}

.footer-version {
  font-size: 0.75rem;
  color: var(--text-tertiary);
  background-color: var(--bg-tertiary);
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-weight: 500;
}

.footer-center {
  flex: 1;
  text-align: center;
}

.footer-copyright {
  color: var(--text-secondary);
  font-size: 0.8125rem;
}

.footer-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.footer-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 0.5rem;
  color: var(--text-secondary);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  text-decoration: none;
  background-color: var(--bg-tertiary);
}

.footer-link:hover {
  color: var(--link-primary);
  background-color: var(--bg-secondary);
  transform: translateY(-2px);
}

[data-theme="dark"] .footer-link {
  background: linear-gradient(135deg, var(--bg-tertiary) 0%, var(--bg-secondary) 100%);
}

/* Мобильная адаптация */
@media (max-width: 768px) {
  .footer-content {
    flex-direction: column;
    text-align: center;
    gap: 1rem;
  }

  .footer-center {
    order: 3;
    width: 100%;
  }

  .footer-left {
    order: 1;
  }

  .footer-right {
    order: 2;
  }
}
</style>
