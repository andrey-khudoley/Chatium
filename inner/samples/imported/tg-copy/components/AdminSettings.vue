<template>
  <div class="admin-settings">
    <div class="settings-header">
      <h2>Настройки приложения</h2>
      <p class="subtitle">Управление конфигурацией приложения</p>
    </div>

    <!-- Roadmap -->
    <div class="settings-section">
      <div class="section-header">
        <i class="fas fa-road"></i>
        <h3>План развития</h3>
      </div>
      <ul class="roadmap-list">
        <li><i class="fas fa-check"></i> WebSocket (real-time сообщения)</li>
        <li><i class="fas fa-check"></i> Inbox API (счётчики непрочитанных)</li>
        <li><i class="fas fa-check"></i> Голосовые сообщения и видео-заметки</li>
        <li><i class="fas fa-check"></i> AI-агенты в чатах</li>
        <li><i class="fas fa-check"></i> Платные чаты и подписки</li>
      </ul>
    </div>
  </div>
</template>

<script setup>
// Настройки упрощены — push-уведомления удалены из проекта
</script>

<style scoped>
.admin-settings {
  max-width: 800px;
  margin: 0 auto;
  padding: 24px;
}

.settings-header {
  margin-bottom: 32px;
}

.settings-header h2 {
  font-size: 24px;
  font-weight: 600;
  color: var(--c-text-primary);
  margin: 0 0 8px;
}

.subtitle {
  color: var(--c-text-secondary);
  margin: 0;
}

.settings-section {
  background: var(--c-surface);
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  border: 1px solid var(--c-border);
}

.section-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.section-header i {
  font-size: 20px;
  color: var(--c-primary);
}

.section-header h3 {
  font-size: 18px;
  font-weight: 600;
  color: var(--c-text-primary);
  margin: 0;
}

.section-description {
  color: var(--c-text-secondary);
  font-size: 14px;
  margin-bottom: 20px;
  line-height: 1.5;
}

.info-box {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background: rgba(37, 211, 102, 0.1);
  border-radius: 8px;
  color: var(--c-success);
}

.info-box i {
  font-size: 24px;
  flex-shrink: 0;
}

.info-box strong {
  display: block;
  margin-bottom: 4px;
}

.info-box p {
  margin: 0;
  font-size: 14px;
  opacity: 0.9;
}

.roadmap-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.roadmap-list li {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid var(--c-border);
  color: var(--c-text-primary);
}

.roadmap-list li:last-child {
  border-bottom: none;
}

.roadmap-list li i {
  width: 20px;
  text-align: center;
}

.roadmap-list li i.fa-check {
  color: var(--c-success);
}

.roadmap-list li i.fa-times {
  color: var(--c-danger);
}
</style>