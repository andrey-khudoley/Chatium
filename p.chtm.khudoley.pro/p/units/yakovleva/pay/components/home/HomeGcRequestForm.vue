<template>
  <div class="grid-form">
    <!-- Корневой не-объект: одно textarea для произвольного JSON. -->
    <label v-if="showRootTextarea" class="field field-full">
      <span class="field-label">
        payload
        <span class="field-required">*</span>
      </span>
      <textarea
        :value="argsValues['__root__'] || ''"
        @input="updateField('__root__', $event.target.value)"
        class="field-input field-textarea"
        :placeholder="rootPlaceholder"
        required
        rows="8"
      ></textarea>
      <span class="field-hint">
        Корневая схема операции — {{ rootKind === 'array' ? 'массив' : 'произвольное значение' }}.
        Передайте валидный JSON.
      </span>
      <span v-if="errors['__root__']" class="form-msg is-err">
        <i class="fas fa-circle-exclamation"></i> {{ errors['__root__'] }}
      </span>
    </label>

    <!-- Пустая объектная схема — argsTree.kind === 'object', fields === []. -->
    <div v-if="showEmptyMessage" class="field-full muted op-no-fields">
      <i class="fas fa-circle-info"></i> Эта операция не требует аргументов.
    </div>

    <!-- Иерархический рендер: группы (заголовки с отступом) + листья (поля ввода). -->
    <template v-for="row in renderedRows" :key="row.path">
      <div v-if="row.kind === 'group'" class="field-full gc-group" :style="rowStyle(row)">
        <div class="gc-group-head">
          <i class="fas fa-folder"></i>
          <span class="gc-group-name">{{ row.name }}</span>
          <span v-if="row.required" class="field-required">*</span>
          <span v-else class="field-optional muted">(опционально)</span>
          <code class="gc-group-path muted">{{ row.path }}</code>
        </div>
        <p v-if="row.description" class="gc-group-desc muted">{{ row.description }}</p>
      </div>

      <label v-else class="field" :class="{ 'field-full': isWideRow(row) }" :style="rowStyle(row)">
        <span class="field-label">
          <code class="gc-leaf-name">{{ row.name }}</code>
          <span class="gc-leaf-type muted">{{ (row.typeLabel || '').toUpperCase() }}</span>
          <span v-if="row.required" class="field-required">*</span>
          <span v-else class="field-optional muted">(опционально)</span>
        </span>

        <select
          v-if="row.inputType === 'boolean'"
          :value="argsValues[row.path] || ''"
          @change="updateField(row.path, $event.target.value)"
          class="field-input"
          :required="row.required"
        >
          <option value="">—</option>
          <option value="true">true</option>
          <option value="false">false</option>
        </select>

        <textarea
          v-else-if="row.inputType === 'json'"
          :value="argsValues[row.path] || ''"
          @input="updateField(row.path, $event.target.value)"
          class="field-input field-textarea"
          :placeholder="jsonPlaceholderFor(row)"
          :required="row.required"
          rows="4"
        ></textarea>

        <input
          v-else
          :value="argsValues[row.path] || ''"
          @input="updateField(row.path, $event.target.value)"
          :type="row.inputType === 'number' ? 'number' : 'text'"
          :inputmode="row.inputType === 'number' ? 'decimal' : undefined"
          :step="row.inputType === 'number' ? 'any' : undefined"
          :required="row.required"
          class="field-input"
        />

        <span v-if="row.description" class="field-hint">{{ row.description }}</span>
        <span v-if="errors[row.path]" class="form-msg is-err">
          <i class="fas fa-circle-exclamation"></i> {{ errors[row.path] }}
        </span>
      </label>
    </template>
  </div>
</template>

<script>
// Универсальная форма GC: рендер плоского списка FormRow (groups + leaves) с
// отступом по depth. Изменения транслируются единым emit `update:argsValues`
// (полная копия объекта с обновлённым ключом). Логика типов берётся из
// `row.inputType` — никакого преобразования к ClientFieldType не делаем
// (это разница с не-GC формой в HomeCreateRequestTab.vue, см. v3 plan).
//
// Структура: три взаимоисключающих ветки, без вложенных <template v-else>
// (помогает Vue корректно отслеживать DOM-узлы при апдейтах).
export default {
  name: 'HomeGcRequestForm',
  props: {
    formRows: { type: Array, required: true },
    argsValues: { type: Object, required: true },
    errors: { type: Object, default: () => ({}) },
    rootKind: { type: String, default: 'object' }
  },
  emits: ['update:argsValues'],
  computed: {
    showRootTextarea() {
      return this.rootKind !== 'object'
    },
    showEmptyMessage() {
      return this.rootKind === 'object' && (this.formRows || []).length === 0
    },
    renderedRows() {
      if (this.showRootTextarea || this.showEmptyMessage) return []
      return this.formRows || []
    },
    rootPlaceholder() {
      if (this.rootKind === 'array') return '[ ... ]'
      if (this.rootKind === 'any') return '"строка" / 42 / true / { ... } / [ ... ]'
      return '{ ... }'
    }
  },
  methods: {
    updateField(path, value) {
      this.$emit('update:argsValues', { ...(this.argsValues || {}), [path]: value })
    },
    isWideRow(row) {
      return row.inputType === 'json'
    },
    jsonPlaceholderFor(row) {
      // Дублирует логику `jsonPlaceholder` из shared/gcArgsForm.ts, но без
      // импорта — Vue-компонент не подтягивает граф shared в браузерный бандл.
      return (row.typeLabel || '').endsWith('[]') ? '[ ... ]' : '{ ... }'
    },
    rowStyle(row) {
      return { paddingLeft: `${(row.depth || 0) * 0.9}rem` }
    }
  }
}
</script>

<style scoped>
.gc-group {
  border-top: 1px solid #2a2a2a;
  padding-top: 0.5rem;
  margin-top: 0.3rem;
}
.gc-group-head {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-weight: 600;
  font-size: 0.95rem;
}
.gc-group-head i {
  color: #d3234b;
}
.gc-group-name {
  letter-spacing: 0.04em;
}
.gc-group-path {
  font-size: 0.75rem;
  opacity: 0.6;
}
.gc-group-desc {
  margin: 0.2rem 0 0;
  font-size: 0.8rem;
}
.gc-leaf-name {
  background: transparent;
  padding: 0;
  font-weight: 600;
}
.gc-leaf-type {
  font-size: 0.7rem;
  letter-spacing: 0.06em;
}
</style>
