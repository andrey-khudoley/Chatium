<script setup lang="ts">
import type { ClientMessageEntry, ClientThread } from '../../shared/clientSupportDemo'

defineProps<{
  thread: ClientThread
  entries: ClientMessageEntry[]
}>()
</script>

<template>
  <section class="dc-client-conversation-panel">
    <header class="dc-client-conversation-panel__header">
      <div>
        <h3>{{ thread.clientName }}</h3>
        <p>{{ thread.channel }}</p>
      </div>

      <div class="dc-client-conversation-panel__tools">
        <button type="button" aria-label="Search"><i class="fas fa-search"></i></button>
        <button type="button" aria-label="Layout"><i class="fas fa-columns"></i></button>
        <button type="button" aria-label="More"><i class="fas fa-ellipsis-h"></i></button>
      </div>
    </header>

    <div class="dc-client-conversation-panel__feed">
      <template v-for="entry in entries" :key="entry.id">
        <div v-if="entry.type === 'divider'" class="dc-client-conversation-panel__divider">
          <span>{{ entry.label }}</span>
        </div>

        <article
          v-else
          class="dc-client-conversation-panel__message"
          :class="`direction-${entry.direction}`"
        >
          <div class="dc-client-conversation-panel__bubble">
            <strong>{{ entry.author }}</strong>
            <p>{{ entry.text }}</p>
            <time>{{ entry.time }}</time>
          </div>
          <span v-if="entry.avatar" class="dc-client-conversation-panel__avatar">{{
            entry.avatar
          }}</span>
        </article>
      </template>
    </div>

    <footer class="dc-client-conversation-panel__composer">
      <div class="dc-client-conversation-panel__input-wrap">
        <input type="text" placeholder="Введите сообщение..." />
        <button type="button" aria-label="Emoji"><i class="far fa-smile"></i></button>
      </div>
      <div class="dc-client-conversation-panel__actions">
        <button type="button" aria-label="Attach"><i class="fas fa-paperclip"></i></button>
        <button type="button" aria-label="Quick actions"><i class="fas fa-bolt"></i></button>
        <button type="button" aria-label="AI prompt"><i class="fas fa-robot"></i></button>
        <button type="button" aria-label="Voice"><i class="fas fa-microphone"></i></button>
      </div>
    </footer>
  </section>
</template>

<style scoped>
.dc-client-conversation-panel {
  min-width: 0;
  display: grid;
  grid-template-rows: auto 1fr auto;
  background: color-mix(in srgb, var(--surface-1) 94%, transparent);
}

.dc-client-conversation-panel__header {
  min-height: 62px;
  border-bottom: 1px solid color-mix(in srgb, var(--border-soft) 64%, transparent);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
}

.dc-client-conversation-panel__header h3 {
  margin: 0;
  font-size: 1rem;
}

.dc-client-conversation-panel__header p {
  margin: 3px 0 0;
  font-size: 0.7rem;
  color: var(--text-tertiary);
}

.dc-client-conversation-panel__tools {
  display: flex;
  gap: 6px;
}

.dc-client-conversation-panel__tools button {
  width: 30px;
  height: 30px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-soft);
  background: color-mix(in srgb, var(--surface-3) 88%, transparent);
  color: var(--text-tertiary);
}

.dc-client-conversation-panel__feed {
  padding: 14px;
  overflow: auto;
  display: grid;
  gap: 8px;
  align-content: start;
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--surface-1) 94%, transparent),
    color-mix(in srgb, var(--surface-1) 98%, transparent)
  );
}

.dc-client-conversation-panel__divider {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 8px;
}

.dc-client-conversation-panel__divider::before,
.dc-client-conversation-panel__divider::after {
  content: '';
  height: 1px;
  background: color-mix(in srgb, var(--border-soft) 72%, transparent);
}

.dc-client-conversation-panel__divider span {
  font-size: 0.66rem;
  color: var(--text-tertiary);
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--border-soft) 72%, transparent);
  padding: 3px 10px;
  background: color-mix(in srgb, var(--surface-2) 90%, transparent);
}

.dc-client-conversation-panel__message {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}

.dc-client-conversation-panel__message.direction-in {
  justify-content: flex-start;
}

.dc-client-conversation-panel__message.direction-out {
  justify-content: flex-end;
}

.dc-client-conversation-panel__bubble {
  max-width: min(680px, 88%);
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--border-soft) 66%, transparent);
  padding: 9px 11px;
  background: color-mix(in srgb, var(--surface-2) 94%, transparent);
  box-shadow: var(--shadow-xs);
}

.dc-client-conversation-panel__message.direction-out .dc-client-conversation-panel__bubble {
  background: color-mix(in srgb, var(--status-info) 24%, var(--surface-2));
  border-color: color-mix(in srgb, var(--status-info) 42%, var(--border-soft));
}

.dc-client-conversation-panel__bubble strong {
  display: block;
  font-size: 0.76rem;
}

.dc-client-conversation-panel__bubble p {
  margin: 3px 0 0;
  font-size: 0.8rem;
  line-height: 1.44;
  white-space: pre-line;
}

.dc-client-conversation-panel__bubble time {
  display: block;
  margin-top: 5px;
  text-align: right;
  font-size: 0.64rem;
  color: var(--text-tertiary);
}

.dc-client-conversation-panel__avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid color-mix(in srgb, var(--border-soft) 70%, transparent);
  display: grid;
  place-items: center;
  font-size: 0.65rem;
  font-family: var(--font-mono);
  color: var(--text-secondary);
  background: color-mix(in srgb, var(--surface-3) 90%, transparent);
}

.dc-client-conversation-panel__composer {
  border-top: 1px solid color-mix(in srgb, var(--border-soft) 64%, transparent);
  padding: 10px 12px;
  display: grid;
  gap: 8px;
}

.dc-client-conversation-panel__input-wrap {
  height: 40px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--border-soft) 72%, transparent);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
  background: color-mix(in srgb, var(--surface-2) 92%, transparent);
}

.dc-client-conversation-panel__input-wrap input {
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  color: var(--text-primary);
  font-size: 0.78rem;
}

.dc-client-conversation-panel__input-wrap button,
.dc-client-conversation-panel__actions button {
  width: 30px;
  height: 30px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-soft);
  background: color-mix(in srgb, var(--surface-3) 88%, transparent);
  color: var(--text-tertiary);
}

.dc-client-conversation-panel__actions {
  display: flex;
  gap: 7px;
  justify-content: flex-start;
}

@media (max-width: 760px) {
  .dc-client-conversation-panel__bubble {
    max-width: 100%;
  }
}
</style>
