<template>
  <header class="header">
    <div class="header-content">
      <div class="header-title-section">
        <a :href="indexPageUrl" class="header-logo-link">
          <div class="header-logo">
            <i class="fas fa-chart-bar"></i>
          </div>
          <h1 class="header-title">
            {{ pageTitle ? `${projectName} - ${pageTitle}` : projectName }}
          </h1>
        </a>
      </div>
      <div class="header-actions">
        <ThemeToggle />
        <a
          v-if="isAdmin && eventsPageUrl"
          :href="eventsPageUrl"
          class="header-settings-btn"
          title="События"
        >
          <i class="fas fa-chart-line"></i>
        </a>
        <a
          v-if="isAdmin"
          :href="isOnSettingsPage ? indexPageUrl : settingsPageUrl"
          class="header-settings-btn"
          :title="isOnSettingsPage ? 'Вернуться на главную' : 'Настройки проекта'"
        >
          <i :class="isOnSettingsPage ? 'fas fa-home' : 'fas fa-cog'"></i>
        </a>
      </div>
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue'
import ThemeToggle from './ThemeToggle.vue'

const props = defineProps({
  projectName: {
    type: String,
    required: true
  },
  indexPageUrl: {
    type: String,
    required: true
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  settingsPageUrl: {
    type: String,
    default: ''
  },
  eventsPageUrl: {
    type: String,
    default: ''
  },
  pageTitle: {
    type: String,
    default: ''
  }
})

// Проверяем, находимся ли мы на странице настроек
const isOnSettingsPage = computed(() => {
  if (!props.settingsPageUrl) return false

  try {
    const currentPath = window.location.pathname
    const settingsPath = new URL(props.settingsPageUrl, window.location.origin).pathname

    return currentPath === settingsPath
  } catch {
    // Если не удалось распарсить URL, сравниваем строки
    const currentHref = window.location.href.split('?')[0].split('#')[0]
    const settingsHref = props.settingsPageUrl.split('?')[0].split('#')[0]

    return (
      currentHref === settingsHref ||
      currentHref.endsWith(settingsHref) ||
      settingsHref.endsWith(currentHref)
    )
  }
})
</script>

<style scoped>
.header {
  background: linear-gradient(135deg, var(--color-bg-secondary) 0%, var(--color-bg) 100%);
  border-bottom: 1.5px solid var(--color-border);
  padding: 1rem 0;
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: var(--shadow-sm);
}

.header-content {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.header-title-section {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
  min-width: 0;
}

.header-logo-link {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  text-decoration: none;
  color: inherit;
  transition: opacity 0.2s ease;
}

.header-logo-link:hover {
  opacity: 0.8;
}

.header-logo {
  width: 40px;
  height: 40px;
  border-radius: 0.75rem;
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-md);
  flex-shrink: 0;
}

.header-logo i {
  font-size: 1.25rem;
  color: white;
}

.header-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  letter-spacing: -0.02em;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.header-settings-btn {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.5rem;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  transition: all 0.2s ease;
  color: var(--color-text);
  text-decoration: none;
  cursor: pointer;
}

.header-settings-btn:hover {
  background: var(--color-card-hover);
  border-color: var(--color-primary);
  color: var(--color-primary);
  transform: translateY(-1px);
}

.header-settings-btn:active {
  transform: translateY(0);
}

@media (max-width: 640px) {
  .header-title {
    font-size: 1.25rem;
  }

  .header-logo {
    width: 36px;
    height: 36px;
  }

  .header-logo i {
    font-size: 1.125rem;
  }
}
</style>
