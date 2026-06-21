<script setup lang="ts">
import { ref } from 'vue'

type CategoryDto = { id: string; name: string; color: string }

const props = defineProps<{
  categories: CategoryDto[]
  selectedCategoryIds: string[]
  showArchived: boolean
}>()

const emit = defineEmits<{
  (e: 'toggle-category', id: string): void
  (e: 'clear-filters'): void
  (e: 'toggle-archived'): void
  (e: 'manage-categories'): void
}>()

const catDropdownOpen = ref(false)

function toggleCatDropdown() {
  catDropdownOpen.value = !catDropdownOpen.value
}

function onToggleCat(id: string) {
  emit('toggle-category', id)
}

function hasActiveFilters() {
  return props.selectedCategoryIds.length > 0 || props.showArchived
}
</script>

<template>
  <div class="nb-filter">
    <div class="nb-filter-left">
      <div class="nb-filter-dropdown-wrap">
        <button type="button" class="nb-filter-btn" @click="toggleCatDropdown">
          <i class="fa-solid fa-tag" aria-hidden="true" />
          <span>Категории</span>
          <span v-if="props.selectedCategoryIds.length" class="nb-filter-count">
            {{ props.selectedCategoryIds.length }}
          </span>
          <i class="fa-solid fa-chevron-down nb-filter-chevron" aria-hidden="true" />
        </button>

        <div v-if="catDropdownOpen" class="nb-filter-dropdown" @click.stop>
          <label
            v-for="cat in props.categories"
            :key="cat.id"
            class="nb-filter-cat-item"
          >
            <input
              type="checkbox"
              :checked="props.selectedCategoryIds.includes(cat.id)"
              @change="onToggleCat(cat.id)"
            />
            <span class="nb-filter-cat-dot" :style="{ background: cat.color }" />
            <span>{{ cat.name }}</span>
          </label>
          <p v-if="!props.categories.length" class="nb-filter-cat-empty">Нет категорий</p>
          <div class="nb-filter-cat-footer">
            <button type="button" class="nb-filter-link" @click="emit('manage-categories')">
              <i class="fa-solid fa-gear" aria-hidden="true" /> Управление
            </button>
          </div>
        </div>
      </div>

      <button
        type="button"
        class="nb-filter-btn"
        :class="{ 'nb-filter-btn--active': props.showArchived }"
        :aria-pressed="props.showArchived"
        @click="emit('toggle-archived')"
      >
        <i class="fa-solid fa-box-archive" aria-hidden="true" />
        <span>Архив</span>
      </button>
    </div>

    <div class="nb-filter-right">
      <button
        v-if="hasActiveFilters()"
        type="button"
        class="nb-filter-link"
        @click="emit('clear-filters')"
      >
        <i class="fa-solid fa-xmark" aria-hidden="true" /> Сбросить
      </button>
    </div>
  </div>
</template>

<style scoped>
.nb-filter {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.4rem 0.5rem;
  border-bottom: 1px solid var(--color-border);
  flex-wrap: wrap;
}

.nb-filter-left {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.nb-filter-right {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.nb-filter-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.45rem;
  font-family: inherit;
  font-size: 0.76rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-text-secondary);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 2px;
  cursor: pointer;
  transition: var(--transition);
}

.nb-filter-btn:hover {
  color: var(--color-text);
  border-color: var(--color-border-light);
}

.nb-filter-btn--active {
  color: var(--color-accent);
  border-color: var(--color-accent);
  background: var(--color-accent-light);
}

.nb-filter-count {
  padding: 0 0.2rem;
  font-size: 0.72rem;
  background: var(--color-accent);
  color: #fff;
  border-radius: 2px;
  min-width: 1rem;
  text-align: center;
}

.nb-filter-chevron {
  font-size: 0.74rem;
  transition: transform 0.2s;
}

.nb-filter-dropdown-wrap {
  position: relative;
}

.nb-filter-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 100;
  margin-top: 0.2rem;
  min-width: 12rem;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border-light);
  border-radius: 2px;
  padding: 0.35rem 0;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
}

.nb-filter-cat-item {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.3rem 0.5rem;
  cursor: pointer;
  font-size: 0.82rem;
  color: var(--color-text-secondary);
  transition: background 0.15s;
}

.nb-filter-cat-item:hover {
  background: rgba(255, 255, 255, 0.03);
  color: var(--color-text);
}

.nb-filter-cat-item input {
  accent-color: var(--color-accent);
  width: 12px;
  height: 12px;
}

.nb-filter-cat-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.nb-filter-cat-empty {
  margin: 0;
  padding: 0.4rem 0.5rem;
  font-size: 0.76rem;
  color: var(--color-text-tertiary);
  font-style: italic;
}

.nb-filter-cat-footer {
  border-top: 1px solid var(--color-border);
  padding: 0.3rem 0.5rem 0.1rem;
  margin-top: 0.2rem;
}

.nb-filter-link {
  background: none;
  border: none;
  color: var(--color-text-tertiary);
  font-family: inherit;
  font-size: 0.72rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  padding: 0.15rem 0.25rem;
  transition: var(--transition);
}

.nb-filter-link:hover {
  color: var(--color-accent);
}
</style>
