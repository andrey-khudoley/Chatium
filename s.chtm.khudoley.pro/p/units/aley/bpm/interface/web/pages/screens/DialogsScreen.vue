<template>
  <div data-role="dlg" class="dialogs-screen anim-fadein">
    <!-- Список тредов -->
    <div data-role="threadlist" class="thread-list">
      <div class="thread-search">
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          stroke="var(--fg3)"
          stroke-width="1.5"
          style="flex: none"
        >
          <circle cx="7" cy="7" r="4.2" />
          <line x1="10.2" y1="10.2" x2="13.5" y2="13.5" />
        </svg>
        <input placeholder="Поиск диалогов…" class="search-input" />
      </div>
      <div class="threads-scroll">
        <div
          v-for="t in store.threads"
          :key="t.id"
          :class="['thread-row', { active: store.activeThread === t.id }]"
          @click="selectThread(t.id)"
        >
          <div
            class="thread-avatar"
            :style="{
              background: t.ai ? 'var(--accent-soft)' : 'var(--surface-2)',
              color: t.ai ? 'var(--accent)' : 'var(--fg2)'
            }"
          >
            {{ t.name[0] }}
          </div>
          <div class="thread-info">
            <div class="thread-name-row">
              <span class="thread-name">{{ t.name }}</span>
              <span v-if="t.ai" class="ai-badge">АИ</span>
              <div style="flex: 1"></div>
              <span class="thread-time">{{ t.time }}</span>
            </div>
            <div class="thread-last-row">
              <span class="thread-last">{{ t.last }}</span>
              <span v-if="t.unread" class="unread-badge">{{ t.unread }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Область чата -->
    <div class="chat-area">
      <template v-if="activeThread">
        <!-- Заголовок чата -->
        <div class="chat-header">
          <div
            class="chat-avatar"
            :style="{
              background: activeThread.ai ? 'var(--accent-soft)' : 'var(--surface-2)',
              color: activeThread.ai ? 'var(--accent)' : 'var(--fg2)'
            }"
          >
            {{ activeThread.name[0] }}
          </div>
          <div class="chat-info">
            <div class="chat-name-row">
              <span class="chat-name">{{ activeThread.name }}</span>
              <span v-if="activeThread.ai" class="ai-badge">АИ</span>
            </div>
            <div class="chat-status">
              {{ activeThread.ai ? 'Ассистент · онлайн' : 'Последний визит недавно' }}
            </div>
          </div>
          <div style="flex: 1"></div>
          <span class="action-chip">→ В задачу</span>
          <span class="action-chip">→ В журнал</span>
        </div>

        <!-- Сообщения -->
        <div class="messages-scroll">
          <div v-for="m in activeThread.messages" :key="m.id" :class="['msg-row', m.role]">
            <div :class="['msg-bubble', m.role]">
              <div v-if="m.role === 'ai'" class="ai-label">Ассистент</div>
              <div class="msg-text">{{ m.text }}</div>
              <div class="msg-time">{{ m.time }}</div>
            </div>
          </div>
        </div>

        <!-- Composer -->
        <div class="composer">
          <input
            v-model="store.composer"
            placeholder="Сообщение…   /задача   /журнал"
            class="composer-input"
            @keydown.enter="sendMessage"
          />
          <button class="send-btn" @click="sendMessage">Отправить</button>
        </div>
      </template>

      <div v-else class="chat-empty">
        <span>Выберите диалог</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { store } from '../../shared/store'
import { uid } from '../../shared/format'

const activeThread = computed(() => store.threads.find((t) => t.id === store.activeThread) || null)

function selectThread(id: string) {
  store.activeThread = id
  // Сбросить непрочитанные
  const t = store.threads.find((t) => t.id === id)
  if (t) t.unread = 0
}

function sendMessage() {
  if (!store.composer.trim() || !store.activeThread) return
  const t = store.threads.find((t) => t.id === store.activeThread)
  if (!t) return
  t.messages.push({
    id: uid(),
    role: 'me',
    text: store.composer,
    time: new Date().toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })
  })
  t.last = store.composer
  store.composer = ''
}
</script>

<style scoped>
.dialogs-screen {
  display: grid;
  grid-template-columns: 280px 1fr;
  height: 100%;
}
.thread-list {
  border-right: 1px solid var(--line);
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
}
.thread-search {
  padding: 13px;
  border-bottom: 1px solid var(--line);
  flex: none;
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--surface);
}
.search-input {
  flex: 1;
  background: transparent;
  border: none;
  color: var(--fg);
  font-family: 'Inter', sans-serif;
  font-size: 12.5px;
  outline: none;
}
.threads-scroll {
  flex: 1;
  overflow: auto;
  min-height: 0;
}
.thread-row {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 13px;
  cursor: pointer;
  border-bottom: 1px solid var(--line);
  transition: background 0.1s;
}
.thread-row:hover {
  background: var(--surface-2);
}
.thread-row.active {
  background: var(--surface-2);
}
.thread-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  flex: none;
}
.thread-info {
  flex: 1;
  min-width: 0;
}
.thread-name-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.thread-name {
  font-size: 13px;
  color: var(--fg);
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ai-badge {
  font-size: 8.5px;
  font-weight: 600;
  color: var(--accent);
  background: var(--accent-soft);
  border-radius: 4px;
  padding: 1px 5px;
  flex: none;
}
.thread-time {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9.5px;
  color: var(--fg3);
  flex: none;
}
.thread-last-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
}
.thread-last {
  font-size: 11.5px;
  color: var(--fg2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}
.unread-badge {
  min-width: 17px;
  height: 17px;
  padding: 0 5px;
  border-radius: 4px;
  background: var(--accent);
  color: var(--accent-fg);
  font-family: 'JetBrains Mono', monospace;
  font-size: 9.5px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
}
.chat-area {
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  background: var(--bg);
}
.chat-header {
  height: 60px;
  flex: none;
  border-bottom: 1px solid var(--line);
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 20px;
}
.chat-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  flex: none;
}
.chat-info {
  min-width: 0;
}
.chat-name-row {
  display: flex;
  align-items: center;
  gap: 7px;
}
.chat-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--fg);
}
.chat-status {
  font-size: 11px;
  color: var(--fg3);
  margin-top: 2px;
}
.action-chip {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--fg2);
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: 3px;
  padding: 6px 12px;
  cursor: pointer;
  flex: none;
  transition:
    color 0.12s,
    border-color 0.12s;
}
.action-chip:hover {
  color: var(--accent);
  border-color: var(--accent-line);
}
.messages-scroll {
  flex: 1;
  overflow: auto;
  padding: 22px 24px;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.msg-row {
  display: flex;
}
.msg-row.me {
  justify-content: flex-end;
}
.msg-row.ai,
.msg-row.them {
  justify-content: flex-start;
}
.msg-bubble {
  max-width: 72%;
  padding: 13px 16px;
  border-radius: 12px;
}
.msg-bubble.me {
  background: var(--accent);
  border-radius: 12px 12px 4px 12px;
}
.msg-bubble.ai,
.msg-bubble.them {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 12px 12px 12px 4px;
}
.ai-label {
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: var(--accent);
  margin-bottom: 6px;
  text-transform: uppercase;
}
.msg-text {
  font-size: 13.5px;
  line-height: 1.55;
  color: var(--fg);
}
.msg-time {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  color: var(--fg3);
  margin-top: 8px;
  text-align: right;
}
.msg-bubble.me .msg-text {
  color: var(--accent-fg);
}
.composer {
  flex: none;
  border-top: 1px solid var(--line);
  padding: 14px 16px;
  display: flex;
  gap: 10px;
  align-items: center;
}
.composer-input {
  flex: 1;
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: 4px;
  color: var(--fg);
  padding: 12px 14px;
  font-family: 'Inter', sans-serif;
  font-size: 13.5px;
  outline: none;
  transition: border-color 0.12s;
}
.composer-input:focus {
  border-color: var(--accent-line);
}
.send-btn {
  background: var(--accent);
  color: var(--accent-fg);
  border: none;
  border-radius: 4px;
  padding: 12px 18px;
  font-family: 'Inter', sans-serif;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  flex: none;
  transition: filter 0.12s;
}
.send-btn:hover {
  filter: brightness(1.08);
}
.chat-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--fg3);
  font-size: 14px;
}
</style>
