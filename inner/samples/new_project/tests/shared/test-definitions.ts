// @shared

export interface TestDefinition {
  name: string
  description: string
}

export interface TestCategory {
  name: string
  title: string
  icon: string
  tests: TestDefinition[]
}

export const TEST_CATEGORIES: TestCategory[] = [
  {
    name: 'basic',
    title: 'Базовые тесты',
    icon: 'fa-flask',
    tests: [{ name: 'app_loads', description: 'Приложение загружается' }]
  },
  {
    name: 'pages',
    title: 'Тесты страниц',
    icon: 'fa-file-lines',
    tests: [
      { name: 'page_index', description: 'Главная страница' },
      { name: 'page_login', description: 'Страница входа' },
      { name: 'page_profile', description: 'Страница профиля' }
    ]
  },
  {
    name: 'database',
    title: 'Тесты базы данных',
    icon: 'fa-database',
    tests: [
      { name: 'table_settings_exists', description: 'Таблица settings существует' },
      { name: 'table_logs_exists', description: 'Таблица logs существует' }
    ]
  },
  {
    name: 'admin',
    title: 'Тесты админки',
    icon: 'fa-cog',
    tests: [
      // Настройки
      { name: 'api_admin_settings_get', description: 'Получение настроек админки' },
      {
        name: 'api_admin_settings_update_project_name',
        description: 'Обновление названия проекта'
      },
      {
        name: 'api_admin_settings_update_project_description',
        description: 'Обновление описания проекта'
      },
      { name: 'api_admin_settings_update_log_level', description: 'Обновление уровня логирования' },
      {
        name: 'api_admin_settings_invalid_log_level',
        description: 'Обновление с недопустимым уровнем логирования'
      },
      // Логи
      { name: 'api_admin_logs_get_all', description: 'Получение всех логов' },
      {
        name: 'api_admin_logs_get_filtered',
        description: 'Получение логов с фильтрацией по уровню'
      },
      { name: 'api_admin_logs_get_paginated', description: 'Получение логов с пагинацией' },
      { name: 'api_admin_logs_counts', description: 'Получение счётчиков логов' },
      { name: 'api_admin_logs_counters_increment', description: 'Проверка инкремента счётчиков' },
      { name: 'api_admin_logs_reset_counters', description: 'Сброс счётчиков' },
      { name: 'api_admin_logs_socket_id', description: 'Получение socket ID для WebSocket' },
      // Страница админки
      { name: 'page_admin', description: 'Страница админки загружается' }
    ]
  }
]
