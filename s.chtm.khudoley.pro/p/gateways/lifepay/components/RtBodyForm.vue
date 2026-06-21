<script setup lang="ts">
import { isSecretField, isEmailField } from '../shared/requestTestForm'
import type { ArgsFieldSchema } from '../shared/operationsCatalogShared'

// Двусторонние карты (`argsValues`/`revealedArgs`) приходят пропсами и мутируются по месту:
// вложенная мутация prop-объекта в Vue 3 реактивна и не вызывает предупреждений (shallowReadonly
// защищает только переприсваивание самого пропа). Родитель пересоздаёт объекты при смене операции.
const props = defineProps<{
  argsFields: ArgsFieldSchema[]
  argsValues: Record<string, string>
  revealedArgs: Record<string, boolean>
  fieldErrors: Record<string, string>
  bodyLabel: string
}>()

const EMAIL_PLACEHOLDER = 'tester@khudoley.pro'

function toggleReveal(name: string) {
  props.revealedArgs[name] = !props.revealedArgs[name]
}

function fillEmail(fieldName: string) {
  props.argsValues[fieldName] = EMAIL_PLACEHOLDER
}
</script>

<template>
  <div v-if="argsFields.length" class="rt-section">
    <div class="rt-section-hd">{{ bodyLabel }}</div>
    <div v-for="field in argsFields" :key="field.name" class="rt-row">
      <label class="rt-lbl" :for="`rt-arg-${field.name}`">
        {{ field.name }}
        <span v-if="field.required" class="rt-req">*</span>
        <span v-else class="rt-opt">(опционально)</span>
      </label>
      <div class="rt-input-row">
        <input
          :id="`rt-arg-${field.name}`"
          class="rt-input rt-input-grow"
          :type="isSecretField(field.name) && !revealedArgs[field.name] ? 'password' : 'text'"
          :inputmode="field.type === 'number' ? 'decimal' : 'text'"
          autocomplete="off"
          v-model="argsValues[field.name]"
          :placeholder="field.description"
        />
        <button
          v-if="isSecretField(field.name)"
          type="button"
          class="rt-btn-secondary"
          @click="toggleReveal(field.name)"
          :title="revealedArgs[field.name] ? 'Скрыть' : 'Показать'"
        >
          <i class="fas" :class="revealedArgs[field.name] ? 'fa-eye-slash' : 'fa-eye'"></i>
        </button>
        <button
          v-if="isEmailField(field.name)"
          type="button"
          class="rt-btn-secondary"
          @click="fillEmail(field.name)"
          title="Подставить тестовый email"
        >
          <i class="fas fa-at"></i> Подставить
        </button>
      </div>
      <p v-if="field.description" class="rt-hint">{{ field.description }}</p>
      <p v-if="fieldErrors[field.name]" class="rt-err">{{ fieldErrors[field.name] }}</p>
    </div>
  </div>
</template>
