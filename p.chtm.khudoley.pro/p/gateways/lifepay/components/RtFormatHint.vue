<script setup lang="ts">
import { ref } from 'vue'
import type { LegendRow } from '../shared/requestTestForm'

defineProps<{
  httpMethod: string
  op: string
  exampleRequest: string
  legendRows: LegendRow[]
}>()

// Спойлер-подсказка о формате запроса выбранной операции — по умолчанию закрыт.
const showHint = ref(false)
</script>

<template>
  <div class="rt-section">
    <button
      type="button"
      class="rt-spoiler-hd"
      :aria-expanded="showHint"
      @click="showHint = !showHint"
    >
      <i
        class="fas rt-spoiler-chevron"
        :class="showHint ? 'fa-chevron-down' : 'fa-chevron-right'"
      ></i>
      <span class="rt-section-hd">Формат запроса — подсказка</span>
      <span class="rt-spoiler-count">{{ httpMethod }} /v1/{{ op }}</span>
    </button>
    <div v-show="showHint" class="rt-spoiler-body">
      <p class="rt-hint">
        {{
          httpMethod === 'GET'
            ? 'Параметры передаются в query-строке URL.'
            : 'Параметры передаются в теле запроса (JSON).'
        }}
      </p>
      <div class="rt-hint-block">
        <div class="rt-hint-label">
          {{ httpMethod === 'GET' ? 'Пример query' : 'Пример тела (JSON)' }}
        </div>
        <pre class="rt-pre custom-scrollbar">{{ exampleRequest }}</pre>
      </div>
      <div v-if="legendRows.length" class="rt-hint-block">
        <div class="rt-hint-label">Поля</div>
        <ul class="rt-legend">
          <li
            v-for="row in legendRows"
            :key="row.path"
            class="rt-legend-item"
            :style="{ paddingLeft: row.depth * 0.9 + 'rem' }"
          >
            <code class="rt-legend-name">{{ row.path }}</code>
            <span class="rt-legend-type">{{ row.type }}</span>
            <span v-if="row.required" class="rt-req">обязательное</span>
            <span v-else class="rt-opt">опционально</span>
            <span v-if="row.description" class="rt-legend-desc">— {{ row.description }}</span>
          </li>
        </ul>
      </div>
      <p v-else class="rt-hint">У этой операции нет параметров запроса.</p>
    </div>
  </div>
</template>
