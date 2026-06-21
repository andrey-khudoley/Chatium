<script>
// Модальное окно «создать пригласительную ссылку». Состояние — в HomePage
// (createModal); ввод комментария — через emit update-note; действия — через emit.
// CSS глобальный (.raw-modal*, .field-*, .form-msg).
export default {
  name: 'HomeCreateInviteModal',
  props: {
    modal: { type: Object, required: true }
  },
  emits: ['close', 'submit', 'copy', 'update-note']
}
</script>

<template>
  <div class="raw-modal-backdrop" @click.self="$emit('close')">
    <div class="raw-modal raw-modal-narrow" role="dialog" aria-modal="true">
      <header class="raw-modal-head">
        <span class="prompt">›</span>
        <h2>Создать пригласительную ссылку</h2>
        <button type="button" class="btn-mini head-action" @click="$emit('close')" title="Закрыть">
          <i class="fas fa-xmark"></i> Закрыть
        </button>
      </header>
      <div class="raw-modal-body">
        <template v-if="!modal.result">
          <label class="field-label">Комментарий (необязательно)</label>
          <input
            :value="modal.note"
            @input="$emit('update-note', $event.target.value)"
            type="text"
            class="filter-input field-full"
            placeholder="например: для Ольги"
          />
          <p v-if="modal.error" class="form-msg is-err">{{ modal.error }}</p>
          <div class="raw-modal-actions">
            <button
              class="btn-mini btn-primary"
              :disabled="modal.submitting"
              @click="$emit('submit')"
            >
              <i v-if="modal.submitting" class="fas fa-spinner fa-spin"></i>
              <span>{{ modal.submitting ? 'Создание…' : 'Создать ссылку' }}</span>
            </button>
          </div>
        </template>
        <template v-else>
          <p class="form-msg is-ok">
            <i class="fas fa-circle-check"></i> Ссылка создана. Скопируйте её — повторно она не
            показывается.
          </p>
          <pre class="json-block">{{ modal.result.fullUrl }}</pre>
          <div class="raw-modal-actions">
            <button class="btn-mini" @click="$emit('copy', modal.result.fullUrl)">
              <i class="far fa-copy"></i> Скопировать ссылку
            </button>
            <button class="btn-mini btn-primary" @click="$emit('close')">
              <i class="fas fa-check"></i> Готово
            </button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
