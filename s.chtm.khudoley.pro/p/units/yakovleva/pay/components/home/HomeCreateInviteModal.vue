<template>
  <div class="raw-modal-backdrop" @click.self="$emit('close')">
    <div class="raw-modal" role="dialog" aria-modal="true">
      <header class="raw-modal-head">
        <span class="prompt">›</span>
        <h2>Создать пригласительную ссылку</h2>
        <button type="button" class="btn-mini head-action" @click="$emit('close')" title="Закрыть">
          <i class="fas fa-xmark"></i> Закрыть
        </button>
      </header>
      <div class="raw-modal-body">
        <template v-if="!modal.result">
          <label class="field field-full">
            <span class="field-label">Комментарий (необязательно)</span>
            <input
              :value="modal.note"
              @input="$emit('update-note', $event.target.value)"
              type="text"
              placeholder="например «для Ольги»"
              class="field-input"
            />
          </label>
          <p v-if="modal.error" class="form-msg is-err">
            <i class="fas fa-circle-exclamation"></i> {{ modal.error }}
          </p>
          <div class="settings-save-bar">
            <button
              type="button"
              class="btn-primary"
              :disabled="modal.creating"
              @click="$emit('submit')"
            >
              <i class="fas fa-link"></i> {{ modal.creating ? 'Создание…' : 'Создать' }}
            </button>
          </div>
        </template>
        <template v-else>
          <p class="muted">
            Скопируйте ссылку и передайте сотруднику. Токен показывается один раз.
          </p>
          <div class="raw-modal-actions">
            <button
              class="btn-mini"
              @click="$emit('copy', modal.result.fullUrl)"
              title="Скопировать ссылку"
            >
              <i class="far fa-copy"></i> Скопировать
            </button>
          </div>
          <pre class="json-block">{{ modal.result.fullUrl }}</pre>
          <p class="muted">Действительна до {{ formatTime(modal.result.expiresAt) }}.</p>
        </template>
      </div>
    </div>
  </div>
</template>

<script>
// Модальное окно «Создать пригласительную ссылку». Состояние — в orchestrator'е
// (inviteModal); действия — emit (close, submit, copy, update-note). CSS глобальный.
import { formatTime } from '../../shared/sbpHomeFormat'

export default {
  name: 'HomeCreateInviteModal',
  props: {
    modal: { type: Object, required: true }
  },
  emits: ['close', 'submit', 'copy', 'update-note'],
  methods: {
    formatTime
  }
}
</script>
