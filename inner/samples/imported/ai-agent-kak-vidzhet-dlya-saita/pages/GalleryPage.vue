<template>
  <div class="gallery">
    <div class="gallery__container">
      <div class="gallery__header">
        <h1 class="gallery__title">AI-Виджет чата для сайта</h1>
        <p class="gallery__subtitle">Встраиваемый помощник с искусственным интеллектом</p>
      </div>

      <div class="gallery__content">
        <div class="gallery__section">
          <h2 class="gallery__section-title">🎯 Что это?</h2>
          <p class="gallery__text">
            Интеллектуальный виджет чата, который можно встроить на любой сайт. Работает через
            AI-агента для автоматических ответов на вопросы посетителей.
          </p>
        </div>

        <div class="gallery__section">
          <h2 class="gallery__section-title">✨ Основные возможности</h2>
          <ul class="gallery__list">
            <li>💬 Чат с AI-агентом для общения с посетителями</li>
            <li>📎 Поддержка отправки файлов и изображений</li>
            <li>🎨 Настраиваемый дизайн кнопки и чата</li>
            <li>📱 Адаптивный интерфейс для всех устройств</li>
            <li>⚡ Realtime обновления через WebSocket</li>
            <li>🔧 Простая интеграция через один скрипт</li>
          </ul>
        </div>

        <div class="gallery__section">
          <h2 class="gallery__section-title">🚀 Как работает?</h2>
          <p class="gallery__text">
            Виджет встраивается на сайт через iframe и состоит из двух частей: плавающей кнопки
            (80×80px) и всплывающего окна чата (370×620px). AI-агент обрабатывает сообщения через
            систему Chatium Sender.
          </p>
        </div>

        <div class="gallery__section">
          <h2 class="gallery__section-title">🛠 Технологии</h2>
          <p class="gallery__text">
            Vue 3, Chatium SDK, AI Agents, Sender Transport, WebSocket, Storage API
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.gallery {
  min-height: 100vh;
  background: linear-gradient(135deg, #ffe5ec 0%, #ffc4d6 50%, #ffb3c6 100%);
  padding: 60px 24px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif;
}

.gallery__container {
  max-width: 900px;
  margin: 0 auto;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border-radius: 24px;
  padding: 48px;
  box-shadow: 0 8px 32px rgba(255, 105, 180, 0.2);
}

.gallery__header {
  text-align: center;
  margin-bottom: 48px;
  padding-bottom: 32px;
  border-bottom: 2px solid rgba(255, 105, 180, 0.2);
}

.gallery__title {
  font-size: 42px;
  font-weight: 800;
  color: #c41e3a;
  margin-bottom: 16px;
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.gallery__subtitle {
  font-size: 20px;
  color: #8b3a62;
  font-weight: 500;
}

.gallery__content {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.gallery__section {
  background: rgba(255, 255, 255, 0.6);
  padding: 28px;
  border-radius: 16px;
  border: 1px solid rgba(255, 105, 180, 0.15);
  transition: all 0.3s ease;
}

.gallery__section:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(255, 105, 180, 0.15);
}

.gallery__section-title {
  font-size: 24px;
  font-weight: 700;
  color: #c41e3a;
  margin-bottom: 16px;
}

.gallery__text {
  font-size: 17px;
  line-height: 1.6;
  color: #4a4a4a;
}

.gallery__list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.gallery__list li {
  font-size: 17px;
  line-height: 1.6;
  color: #4a4a4a;
  padding-left: 0;
}

@media (max-width: 768px) {
  .gallery {
    padding: 32px 16px;
  }

  .gallery__container {
    padding: 32px 24px;
  }

  .gallery__title {
    font-size: 32px;
  }

  .gallery__subtitle {
    font-size: 18px;
  }

  .gallery__section-title {
    font-size: 20px;
  }

  .gallery__text,
  .gallery__list li {
    font-size: 16px;
  }
}
</style>
