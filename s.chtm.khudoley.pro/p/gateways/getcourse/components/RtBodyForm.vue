<script setup lang="ts">
import { isSecretField, isEmailField, jsonPlaceholder } from '../shared/requestTestForm'
import type { FormRow } from '../shared/requestTestForm'

// Двусторонние карты (`argsValues`/`revealedArgs`) приходят пропсами и мутируются по месту:
// вложенная мутация prop-объекта в Vue 3 реактивна и не вызывает предупреждений (shallowReadonly
// защищает только переприсваивание самого пропа). Родитель пересоздаёт объекты при смене операции.
const props = defineProps<{
  formRows: FormRow[]
  argsValues: Record<string, string>
  revealedArgs: Record<string, boolean>
  fieldErrors: Record<string, string>
  bodyLabel: string
}>()

const EMAIL_PLACEHOLDER = 'tester@khudoley.pro'

function toggleReveal(path: string) {
  props.revealedArgs[path] = !props.revealedArgs[path]
}

function fillEmail(path: string) {
  props.argsValues[path] = EMAIL_PLACEHOLDER
}
</script>

<template>
  <div v-if="formRows.length" class="rt-section">
    <div class="rt-section-hd">{{ bodyLabel }}</div>
    <template v-for="row in formRows" :key="row.kind + ':' + row.path">
      <!-- Заголовок вложенного объекта -->
      <div
        v-if="row.kind === 'group'"
        class="rt-group-hd"
        :style="{ marginLeft: row.depth * 0.9 + 'rem' }"
      >
        <i class="fas fa-folder-open rt-group-ic"></i>
        <span class="rt-group-name">{{ row.name }}</span>
        <span v-if="row.required" class="rt-req">*</span>
        <span v-else class="rt-opt">(опционально)</span>
        <span v-if="row.description" class="rt-group-desc">— {{ row.description }}</span>
      </div>

      <!-- Поле ввода листа -->
      <div v-else class="rt-row" :style="{ marginLeft: row.depth * 0.9 + 'rem' }">
        <label class="rt-lbl" :for="`rt-arg-${row.path}`">
          {{ row.name }}
          <span class="rt-type">{{ row.typeLabel }}</span>
          <span v-if="row.required" class="rt-req">*</span>
          <span v-else class="rt-opt">(опционально)</span>
        </label>

        <!-- boolean -->
        <select
          v-if="row.inputType === 'boolean'"
          :id="`rt-arg-${row.path}`"
          class="rt-input"
          v-model="argsValues[row.path]"
        >
          <option value="">— не задано —</option>
          <option value="true">true</option>
          <option value="false">false</option>
        </select>

        <!-- array / object / any → сырой JSON -->
        <textarea
          v-else-if="row.inputType === 'json'"
          :id="`rt-arg-${row.path}`"
          class="rt-input rt-textarea"
          rows="3"
          v-model="argsValues[row.path]"
          :placeholder="jsonPlaceholder(row.typeLabel)"
        ></textarea>

        <!-- string / number -->
        <div v-else class="rt-input-row">
          <input
            :id="`rt-arg-${row.path}`"
            class="rt-input rt-input-grow"
            :type="isSecretField(row.name) && !revealedArgs[row.path] ? 'password' : 'text'"
            :inputmode="row.inputType === 'number' ? 'decimal' : 'text'"
            autocomplete="off"
            v-model="argsValues[row.path]"
            :placeholder="row.description"
          />
          <button
            v-if="isSecretField(row.name)"
            type="button"
            class="rt-btn-secondary"
            @click="toggleReveal(row.path)"
            :title="revealedArgs[row.path] ? 'Скрыть' : 'Показать'"
          >
            <i class="fas" :class="revealedArgs[row.path] ? 'fa-eye-slash' : 'fa-eye'"></i>
          </button>
          <button
            v-if="isEmailField(row.name)"
            type="button"
            class="rt-btn-secondary"
            @click="fillEmail(row.path)"
            title="Подставить тестовый email"
          >
            <i class="fas fa-at"></i> Подставить
          </button>
        </div>

        <p v-if="row.description" class="rt-hint">{{ row.description }}</p>
        <p v-if="fieldErrors[row.path]" class="rt-err">{{ fieldErrors[row.path] }}</p>
      </div>
    </template>
  </div>
</template>
