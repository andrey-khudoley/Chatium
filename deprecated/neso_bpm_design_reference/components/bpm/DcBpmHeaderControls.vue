<script setup lang="ts">
import type { BpmLocale } from '../../shared/bpmI18n'

interface ThemeOption {
  id: string
  label: string
}

const props = withDefaults(
  defineProps<{
    languageLabel: string
    themeLabel: string
    locale: BpmLocale
    themeOptions: ThemeOption[]
    selectedThemeId: string
    openIndexLabel: string
    indexUrl: string
    /** 'presets' — выбор пресета текстом; 'light-dark' — переключатель светлая/тёмная с иконками солнца и луны */
    themeVariant?: 'presets' | 'light-dark'
    /** Aria-label для кнопки светлой темы (themeVariant === 'light-dark'). */
    themeLightAriaLabel?: string
    /** Aria-label для кнопки тёмной темы (themeVariant === 'light-dark'). */
    themeDarkAriaLabel?: string
  }>(),
  {
    themeVariant: 'presets',
    themeLightAriaLabel: 'Светлая тема',
    themeDarkAriaLabel: 'Тёмная тема'
  }
)

const emit = defineEmits<{
  changeLocale: [locale: BpmLocale]
  changeTheme: [id: string]
}>()
</script>

<template>
  <div class="dc-bpm-header-controls__group">
    <span class="dc-bpm-header-controls__label">{{ languageLabel }}</span>
    <button
      type="button"
      class="dc-bpm-header-controls__chip"
      :class="{ active: locale === 'ru' }"
      @click="emit('changeLocale', 'ru')"
    >
      RU
    </button>
    <button
      type="button"
      class="dc-bpm-header-controls__chip"
      :class="{ active: locale === 'en' }"
      @click="emit('changeLocale', 'en')"
    >
      EN
    </button>
  </div>

  <div class="dc-bpm-header-controls__group">
    <span class="dc-bpm-header-controls__label">{{ themeLabel }}</span>
    <template v-if="themeVariant === 'light-dark'">
      <button
        type="button"
        class="dc-bpm-header-controls__chip dc-bpm-header-controls__chip--icon"
        :class="{ active: selectedThemeId === 'light' }"
        :aria-label="themeLightAriaLabel"
        @click="emit('changeTheme', 'light')"
      >
        <i class="fas fa-sun" aria-hidden="true"></i>
      </button>
      <button
        type="button"
        class="dc-bpm-header-controls__chip dc-bpm-header-controls__chip--icon"
        :class="{ active: selectedThemeId === 'dark' }"
        :aria-label="themeDarkAriaLabel"
        @click="emit('changeTheme', 'dark')"
      >
        <i class="fas fa-moon" aria-hidden="true"></i>
      </button>
    </template>
    <template v-else>
      <button
        v-for="option in themeOptions"
        :key="option.id"
        type="button"
        class="dc-bpm-header-controls__chip"
        :class="{ active: selectedThemeId === option.id }"
        @click="emit('changeTheme', option.id)"
      >
        {{ option.label }}
      </button>
    </template>
  </div>

  <a :href="indexUrl" class="dc-bpm-header-controls__link">
    <i class="fas fa-compass"></i>
    {{ openIndexLabel }}
  </a>
</template>

<style scoped>
.dc-bpm-header-controls__group {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-soft);
  background: color-mix(in srgb, var(--surface-3) 88%, transparent);
}

.dc-bpm-header-controls__label {
  font-size: 0.62rem;
  letter-spacing: 0;
  text-transform: uppercase;
  color: var(--text-tertiary);
  padding-left: 4px;
  padding-right: 2px;
}

.dc-bpm-header-controls__chip {
  min-width: 30px;
  height: 28px;
  border-radius: var(--radius-xs);
  border: 1px solid transparent;
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.7rem;
  padding: 0 9px;
}

.dc-bpm-header-controls__chip--icon {
  width: 30px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.dc-bpm-header-controls__chip.active {
  border-color: var(--border-accent);
  color: var(--text-primary);
  background: color-mix(in srgb, var(--accent-soft) 76%, transparent);
}

.dc-bpm-header-controls__link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 12px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-soft);
  text-decoration: none;
  color: var(--text-secondary);
  font-size: 0.74rem;
  background: color-mix(in srgb, var(--surface-3) 78%, transparent);
}

.dc-bpm-header-controls__link:hover {
  color: var(--text-primary);
  border-color: var(--border-accent);
}
</style>
