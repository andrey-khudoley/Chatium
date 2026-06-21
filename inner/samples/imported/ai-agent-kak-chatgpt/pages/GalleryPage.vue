<template>
  <div class="min-h-screen bg-white">
    <div class="max-w-4xl mx-auto px-6 py-16">
      <!-- Заголовок -->
      <h1 class="text-5xl font-bold text-gray-900 mb-8">AI-агент как ChatGPT</h1>

      <p class="text-xl text-gray-700 leading-relaxed">
        Готовое приложение AI-агента с полноценным интерфейсом чатов. Позволяет пользователям
        общаться с искусственным интеллектом в удобном формате, аналогичном ChatGPT.
      </p>

      <!-- Описание и скриншот в две колонки -->
      <div class="mt-8 mb-12 flex flex-col md:flex-row gap-8 items-start">
        <div class="prose prose-lg max-w-none flex-1">
          <div>
            <h2 class="text-2xl font-semibold text-gray-900 mb-4">Основные возможности</h2>

            <ul class="space-y-4 text-gray-700">
              <li class="flex items-start gap-3">
                <span class="text-blue-600 mt-1">•</span>
                <span>
                  <strong class="text-gray-900">Множественные чаты</strong> — пользователи могут
                  создавать и управлять несколькими независимыми чатами с AI-агентом
                </span>
              </li>
              <li class="flex items-start gap-3">
                <span class="text-blue-600 mt-1">•</span>
                <span>
                  <strong class="text-gray-900">История чатов</strong> — все чаты сохраняются и
                  доступны для просмотра в боковой панели
                </span>
              </li>
              <li class="flex items-start gap-3">
                <span class="text-blue-600 mt-1">•</span>
                <span>
                  <strong class="text-gray-900">Интерфейс чата</strong> — современный и интуитивный
                  интерфейс для общения с AI-агентом
                </span>
              </li>
              <li class="flex items-start gap-3">
                <span class="text-blue-600 mt-1">•</span>
                <span>
                  <strong class="text-gray-900">Настройки агента</strong> — администраторы могут
                  настраивать инструкции и поведение AI-агента
                </span>
              </li>
              <li class="flex items-start gap-3">
                <span class="text-blue-600 mt-1">•</span>
                <span>
                  <strong class="text-gray-900">Интеграция с процесс-агентом</strong> — использует
                  систему процесс-агентов с поддержкой инструментов
                </span>
              </li>
            </ul>
          </div>
        </div>
        <div class="flex-shrink-0">
          <img
            src="https://msk.cdn-chatium.io/thumbnail/image_msk_cuhvTUyl49.2450x2082.png/s/800x"
            alt="Скриншот AI-агента как ChatGPT"
            class="max-w-full h-auto"
            width="400"
            height="340"
          />
        </div>
      </div>

      <!-- Возможности -->
      <div class="space-y-8">
        <div>
          <h2 class="text-2xl font-semibold text-gray-900 mb-4">Технические особенности</h2>

          <ul class="space-y-4 text-gray-700">
            <li class="flex items-start gap-3">
              <span class="text-blue-600 mt-1">•</span>
              <span>Сохранение чатов в таблице базы данных</span>
            </li>
            <li class="flex items-start gap-3">
              <span class="text-blue-600 mt-1">•</span>
              <span>WebSocket для реального времени обновлений</span>
            </li>
            <li class="flex items-start gap-3">
              <span class="text-blue-600 mt-1">•</span>
              <span>Адаптивный дизайн для мобильных устройств</span>
            </li>
            <li class="flex items-start gap-3">
              <span class="text-blue-600 mt-1">•</span>
              <span>Интеграция с системой транспортов для отправки сообщений</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.prose {
  color: inherit;
}
</style>

<script setup lang="ts"></script>
