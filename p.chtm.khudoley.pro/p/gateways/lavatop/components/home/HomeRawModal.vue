<script>
// Модальное окно просмотра «сырого» тела запроса клиента / ответа Lava.Top.
// Состояние — в HomePage (rawModal); действия — через emit. CSS глобальный (.raw-modal*).
import { rawJsonString } from '../../shared/lavatopHomeFormat'

export default {
  name: 'HomeRawModal',
  props: {
    modal: { type: Object, required: true }
  },
  emits: ['close', 'copy'],
  methods: {
    rawJsonString
  }
}
</script>

<template>
  <div class="raw-modal-backdrop" @click.self="$emit('close')">
    <div class="raw-modal" role="dialog" aria-modal="true">
      <header class="raw-modal-head">
        <span class="prompt">›</span>
        <h2>
          {{ modal.kind === 'upstream' ? 'Ответ Lava.Top' : 'Запрос клиента' }}
          <span class="muted">#{{ modal.id }}</span>
        </h2>
        <button type="button" class="btn-mini head-action" @click="$emit('close')" title="Закрыть">
          <i class="fas fa-xmark"></i> Закрыть
        </button>
      </header>
      <div class="raw-modal-body">
        <p v-if="modal.loading" class="muted"><i class="fas fa-spinner fa-spin"></i> Загрузка…</p>
        <p v-else-if="modal.error" class="form-msg is-err">
          <i class="fas fa-circle-exclamation"></i> {{ modal.error }}
        </p>
        <template v-else-if="modal.entry">
          <div class="raw-modal-actions">
            <button
              class="btn-mini"
              @click="$emit('copy', rawJsonString(modal.entry))"
              title="Скопировать JSON"
            >
              <i class="far fa-copy"></i> Скопировать
            </button>
          </div>
          <pre class="json-block">{{ rawJsonString(modal.entry) }}</pre>
        </template>
        <p v-else class="muted"><i class="fas fa-circle-info"></i> Запись не найдена.</p>
      </div>
    </div>
  </div>
</template>
