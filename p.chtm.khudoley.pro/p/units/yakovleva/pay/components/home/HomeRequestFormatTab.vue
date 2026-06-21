<template>
  <section class="panel-section">
    <header class="panel-section-head">
      <span class="prompt">›</span>
      <h2>Формат запросов</h2>
      <span class="head-meta muted">
        Контракты `POST /api/gateways/invoke` и подписка на оплату через WebSocket
      </span>
    </header>

    <p class="rf-lede muted">
      Атомарные сниппеты для интеграционного JS: тело запроса, успешный ответ и точечный вызов из
      браузера. Готовый сценарий «от выбора оффера до редиректа» магазин собирает сам — здесь только
      контракты.
    </p>

    <article v-for="section in sections" :key="section.id" class="rf-section">
      <header class="rf-section-head">
        <i class="fas" :class="section.icon"></i>
        <h3>{{ section.title }}</h3>
        <span v-if="section.subtitle" class="rf-section-sub muted">{{ section.subtitle }}</span>
      </header>

      <p v-for="(line, i) in section.intro" :key="i" class="rf-paragraph">
        {{ line }}
      </p>

      <div
        v-for="(snippet, idx) in section.snippets"
        :key="section.id + ':' + idx"
        class="rf-snippet"
      >
        <div class="rf-snippet-head">
          <span class="rf-snippet-title">{{ snippet.title || 'Сниппет' }}</span>
          <span class="rf-snippet-lang">{{ snippet.language }}</span>
          <button
            type="button"
            class="btn-mini rf-copy"
            :class="{ 'rf-copied': copiedKey === section.id + ':' + idx }"
            @click="copy(section.id + ':' + idx, snippet.code)"
            :title="copiedKey === section.id + ':' + idx ? 'Скопировано' : 'Скопировать'"
          >
            <i
              class="far"
              :class="copiedKey === section.id + ':' + idx ? 'fa-check' : 'fa-copy'"
            ></i>
            {{ copiedKey === section.id + ':' + idx ? 'Скопировано' : 'Копировать' }}
          </button>
        </div>
        <p v-if="snippet.description" class="rf-snippet-desc muted">
          {{ snippet.description }}
        </p>
        <pre class="rf-code"><code>{{ snippet.code }}</code></pre>
      </div>

      <ul v-if="section.notes && section.notes.length" class="rf-notes">
        <li v-for="(note, i) in section.notes" :key="i">{{ note }}</li>
      </ul>
    </article>
  </section>
</template>

<script>
// Вкладка «Формат запросов»: декларативный рендер секций из shared/requestFormatSamples.
// Без логики и состояния — только сниппеты и кнопки копирования. Источник истины для
// контрактов — модуль `requestFormatSamples`, а параметризация (invokeUrl/paymentSocketUrl)
// прокидывается из HomePage через пропы apiUrls.
import { buildRequestFormatSamples } from '../../shared/requestFormatSamples'

const COPY_RESET_MS = 1500

export default {
  name: 'HomeRequestFormatTab',
  props: {
    invokeUrl: { type: String, default: '' },
    paymentSocketUrl: { type: String, default: '' }
  },
  emits: ['copy-text'],
  data() {
    return {
      copiedKey: '',
      copyResetTimer: null
    }
  },
  computed: {
    sections() {
      return buildRequestFormatSamples({
        invokeUrl: this.invokeUrl || '',
        paymentSocketUrl: this.paymentSocketUrl || ''
      })
    }
  },
  beforeUnmount() {
    if (this.copyResetTimer) {
      clearTimeout(this.copyResetTimer)
      this.copyResetTimer = null
    }
  },
  methods: {
    copy(key, code) {
      this.$emit('copy-text', code)
      this.copiedKey = key
      if (this.copyResetTimer) clearTimeout(this.copyResetTimer)
      this.copyResetTimer = setTimeout(() => {
        this.copiedKey = ''
        this.copyResetTimer = null
      }, COPY_RESET_MS)
    }
  }
}
</script>
