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
    name: 'api',
    title: 'Тесты API endpoints (route.run)',
    icon: 'fa-code',
    tests: [
      { name: 'validate_token_empty', description: 'Валидация токена: пустой токен' },
      { name: 'validate_token_invalid', description: 'Валидация токена: невалидный токен' },
      { name: 'add_bot_empty_token', description: 'Добавление бота: пустой токен' },
      { name: 'add_bot_duplicate', description: 'Добавление бота: проверка дубликатов' },
      { name: 'add_bot_success', description: 'Добавление бота: успешное создание' },
      { name: 'delete_bot_empty_id', description: 'Удаление бота: пустой ID' },
      { name: 'delete_bot_not_found', description: 'Удаление бота: бот не найден' },
      { name: 'delete_bot_success', description: 'Удаление бота: успешное удаление' }
    ]
  },
  {
    name: 'api_http',
    title: 'Тесты HTTP доступности endpoints',
    icon: 'fa-globe',
    tests: [
      { name: 'http_post_validate_token', description: 'HTTP POST /api/bots/validate-token' },
      { name: 'http_post_add_bot', description: 'HTTP POST /api/bots/add' },
      { name: 'http_get_list', description: 'HTTP GET /api/bots/list' },
      { name: 'http_post_delete_bot', description: 'HTTP POST /api/bots/delete' }
    ]
  },
  {
    name: 'pages',
    title: 'Тесты загрузки страниц',
    icon: 'fa-file-lines',
    tests: [
      { name: 'page_index', description: 'GET / - Главная страница' },
      { name: 'page_login', description: 'GET /login - Страница входа' },
      { name: 'page_profile', description: 'GET /profile - Страница профиля' },
      { name: 'page_settings', description: 'GET /settings - Страница настроек' },
      { name: 'page_channels', description: 'GET /channels - Страница каналов' }
    ]
  },
  {
    name: 'database',
    title: 'Тесты базы данных (Heap Table)',
    icon: 'fa-database',
    tests: [
      { name: 'table_exists', description: 'Проверка существования таблицы BotTokens' },
      { name: 'create_bot', description: 'Создание записи бота в таблице' },
      { name: 'find_bot_by_user', description: 'Поиск ботов по userId' },
      { name: 'find_bot_duplicate', description: 'Проверка поиска дубликатов токена' },
      { name: 'delete_bot', description: 'Удаление записи бота из таблицы' }
    ]
  },
  {
    name: 'projects_database',
    title: 'Тесты базы данных проектов',
    icon: 'fa-database',
    tests: [
      { name: 'projects_table_exists', description: 'Проверка существования таблицы Projects' },
      {
        name: 'project_requests_table_exists',
        description: 'Проверка существования таблицы ProjectRequests'
      },
      { name: 'create_project', description: 'Создание проекта в таблице' },
      { name: 'find_project_by_id', description: 'Поиск проекта по ID' },
      { name: 'update_project', description: 'Обновление проекта' },
      { name: 'delete_project', description: 'Удаление проекта' },
      { name: 'create_project_request', description: 'Создание заявки на присоединение' },
      { name: 'find_project_requests', description: 'Поиск заявок по проекту' },
      { name: 'update_project_request', description: 'Обновление заявки' }
    ]
  },
  {
    name: 'projects_api',
    title: 'Тесты API проектов',
    icon: 'fa-code',
    tests: [
      {
        name: 'projects_list_empty_name',
        description: 'GET /api/projects/list - получение списка'
      },
      {
        name: 'projects_create_empty_name',
        description: 'POST /api/projects/create - пустое название'
      },
      {
        name: 'projects_create_success',
        description: 'POST /api/projects/create - успешное создание'
      },
      { name: 'projects_get_not_found', description: 'GET /api/projects/:id - проект не найден' },
      { name: 'projects_get_success', description: 'GET /api/projects/:id - успешное получение' },
      {
        name: 'projects_delete_not_found',
        description: 'POST /api/projects/delete - проект не найден'
      },
      {
        name: 'projects_delete_no_access',
        description: 'POST /api/projects/delete - нет прав доступа'
      },
      {
        name: 'projects_delete_success',
        description: 'POST /api/projects/delete - успешное удаление'
      },
      {
        name: 'projects_join_request_empty_project',
        description: 'POST /api/projects/join-request - пустой projectId'
      },
      {
        name: 'projects_join_request_not_found',
        description: 'POST /api/projects/join-request - проект не найден'
      },
      {
        name: 'projects_join_request_already_member',
        description: 'POST /api/projects/join-request - уже участник'
      },
      {
        name: 'projects_join_request_success',
        description: 'POST /api/projects/join-request - успешная подача заявки'
      },
      {
        name: 'projects_get_requests_no_access',
        description: 'GET /api/projects/:id/requests - нет прав доступа'
      },
      {
        name: 'projects_get_requests_success',
        description: 'GET /api/projects/:id/requests - успешное получение заявок'
      },
      {
        name: 'projects_approve_request_success',
        description: 'POST /api/projects/:id/requests/:requestId/approve - одобрение заявки'
      },
      {
        name: 'projects_reject_request_success',
        description: 'POST /api/projects/:id/requests/:requestId/reject - отклонение заявки'
      },
      {
        name: 'projects_remove_member_success',
        description: 'POST /api/projects/:id/members/remove - удаление участника'
      }
    ]
  },
  {
    name: 'projects_integration',
    title: 'Интеграционные тесты проектов',
    icon: 'fa-network-wired',
    tests: [
      {
        name: 'project_full_lifecycle',
        description: 'Полный цикл: создание → получение → удаление проекта'
      },
      {
        name: 'project_members_management',
        description: 'Управление участниками: добавление → удаление'
      },
      {
        name: 'project_request_flow',
        description: 'Полный цикл заявки: подача → одобрение → добавление участника'
      },
      { name: 'project_access_control', description: 'Проверка контроля доступа к проектам' }
    ]
  }
]
