<template>
  <div
    class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6 flex items-center justify-center"
  >
    <div class="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8">
      <!-- Заголовок -->
      <div class="text-center mb-6">
        <div
          class="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4"
        >
          <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
        </div>
        <h1 class="text-3xl font-bold text-gray-900 mb-2">WebApp Opened Events</h1>
        <p class="text-gray-600">
          Автоматическое уведомление ИИ-агента при открытии Telegram WebApp
        </p>
      </div>

      <!-- Описание работы -->
      <div class="bg-blue-50 rounded-xl p-6 mb-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-3">Как это работает</h2>
        <div class="space-y-3">
          <div class="flex items-start">
            <div
              class="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold mr-3"
            >
              1
            </div>
            <p class="text-gray-700 text-sm">Пользователь открывает ваш Telegram WebApp</p>
          </div>
          <div class="flex items-start">
            <div
              class="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold mr-3"
            >
              2
            </div>
            <p class="text-gray-700 text-sm">Система автоматически фиксирует событие открытия</p>
          </div>
          <div class="flex items-start">
            <div
              class="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold mr-3"
            >
              3
            </div>
            <p class="text-gray-700 text-sm">
              ИИ-агент получает уведомление с данными пользователя
            </p>
          </div>
          <div class="flex items-start">
            <div
              class="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold mr-3"
            >
              4
            </div>
            <p class="text-gray-700 text-sm">Агент может начать диалог или выполнить действие</p>
          </div>
        </div>
      </div>

      <!-- Возможности -->
      <div class="grid grid-cols-2 gap-4 mb-6">
        <div class="bg-gray-50 rounded-lg p-4">
          <div class="text-blue-600 mb-2">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
          </div>
          <h3 class="font-semibold text-gray-900 text-sm mb-1">Выбор бота</h3>
          <p class="text-gray-600 text-xs">Отправка через любого вашего Telegram бота</p>
        </div>

        <div class="bg-gray-50 rounded-lg p-4">
          <div class="text-blue-600 mb-2">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h3 class="font-semibold text-gray-900 text-sm mb-1">Выбор агента</h3>
          <p class="text-gray-600 text-xs">Создание и настройка ИИ-агента для обработки</p>
        </div>

        <div class="bg-gray-50 rounded-lg p-4">
          <div class="text-blue-600 mb-2">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
              />
            </svg>
          </div>
          <h3 class="font-semibold text-gray-900 text-sm mb-1">Гибкие настройки</h3>
          <p class="text-gray-600 text-xs">Уведомление при первом или каждом открытии</p>
        </div>

        <div class="bg-gray-50 rounded-lg p-4">
          <div class="text-blue-600 mb-2">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
              />
            </svg>
          </div>
          <h3 class="font-semibold text-gray-900 text-sm mb-1">Шаблон сообщения</h3>
          <p class="text-gray-600 text-xs">Персонализация с данными пользователя</p>
        </div>
      </div>
    </div>
  </div>
</template>
