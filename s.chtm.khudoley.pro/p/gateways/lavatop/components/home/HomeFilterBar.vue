<script>
// Панель фильтра по дате/времени (обзор и журналы). Состояние filter — в HomePage;
// поля правятся через emit update-field, действия — через emit. CSS глобальный (.filter-*).
export default {
  name: 'HomeFilterBar',
  props: {
    filter: { type: Object, required: true },
    filterSaving: { type: Boolean, default: false },
    filterValid: { type: Boolean, default: true },
    hasFilter: { type: Boolean, default: false },
    filterError: { type: String, default: '' }
  },
  emits: ['apply', 'reset', 'update-field']
}
</script>

<template>
  <section class="filter-bar">
    <div class="filter-group">
      <span class="filter-label"><i class="far fa-calendar"></i> С</span>
      <input
        :value="filter.fromDate"
        @input="$emit('update-field', 'fromDate', $event.target.value)"
        type="date"
        class="filter-input"
      />
      <input
        :value="filter.fromTime"
        @input="$emit('update-field', 'fromTime', $event.target.value)"
        type="time"
        class="filter-input filter-time"
      />
    </div>
    <div class="filter-group">
      <span class="filter-label">по</span>
      <input
        :value="filter.toDate"
        @input="$emit('update-field', 'toDate', $event.target.value)"
        type="date"
        class="filter-input"
      />
      <input
        :value="filter.toTime"
        @input="$emit('update-field', 'toTime', $event.target.value)"
        type="time"
        class="filter-input filter-time"
      />
    </div>
    <div class="filter-actions">
      <button
        type="button"
        class="btn-mini"
        :disabled="filterSaving || !filterValid"
        @click="$emit('apply')"
        title="Применить фильтр"
      >
        <i class="fas fa-filter"></i> Применить
      </button>
      <button
        type="button"
        class="btn-mini"
        :disabled="filterSaving || !hasFilter"
        @click="$emit('reset')"
        title="Сбросить фильтр"
      >
        <i class="fas fa-xmark"></i> Сбросить
      </button>
      <span v-if="!filterValid" class="filter-msg is-err"
        >Начало не может быть позже окончания</span
      >
      <span v-else-if="filterError" class="filter-msg is-err">{{ filterError }}</span>
      <span v-else-if="hasFilter" class="filter-msg muted">Фильтр активен</span>
    </div>
  </section>
</template>
