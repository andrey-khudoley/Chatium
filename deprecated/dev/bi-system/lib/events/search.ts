// @shared

/**
 * Построение SQL условий для поиска событий
 * Поиск проводится сначала по наиболее вероятным полям, затем по остальным
 */
export function buildSearchConditions(searchQuery: string): string[] {
  const escapedQuery = searchQuery.replace(/'/g, "''")

  // Приоритет 1: Наиболее вероятные поля (email, user_id, uid)
  const priority1 = [
    `user_email LIKE '%${escapedQuery}%'`,
    `user_id LIKE '%${escapedQuery}%'`,
    `uid LIKE '%${escapedQuery}%'`
  ]

  // Приоритет 2: Идентификаторы
  const priority2 = [
    `ip = '${escapedQuery}'`,
    `session_id LIKE '%${escapedQuery}%'`,
    `gc_visitor_id LIKE '%${escapedQuery}%'`,
    `gc_session_id LIKE '%${escapedQuery}%'`
  ]

  // Приоритет 3: URL и контент
  const priority3 = [
    `url LIKE '%${escapedQuery}%'`,
    `urlPath LIKE '%${escapedQuery}%'`,
    `title LIKE '%${escapedQuery}%'`,
    `referer LIKE '%${escapedQuery}%'`
  ]

  // Приоритет 4: Локация
  const priority4 = [
    `location_country LIKE '%${escapedQuery}%'`,
    `location_city LIKE '%${escapedQuery}%'`,
    `location_region LIKE '%${escapedQuery}%'`
  ]

  // Приоритет 5: Параметры действий
  const priority5 = [
    `action LIKE '%${escapedQuery}%'`,
    `action_param1 LIKE '%${escapedQuery}%'`,
    `action_param2 LIKE '%${escapedQuery}%'`,
    `action_param3 LIKE '%${escapedQuery}%'`
  ]

  // Приоритет 6: UTM метки
  const priority6 = [
    `utm_source LIKE '%${escapedQuery}%'`,
    `utm_medium LIKE '%${escapedQuery}%'`,
    `utm_campaign LIKE '%${escapedQuery}%'`,
    `utm_term LIKE '%${escapedQuery}%'`,
    `utm_content LIKE '%${escapedQuery}%'`
  ]

  // Приоритет 7: Информация о пользователе
  const priority7 = [
    `user_first_name LIKE '%${escapedQuery}%'`,
    `user_last_name LIKE '%${escapedQuery}%'`,
    `user_phone LIKE '%${escapedQuery}%'`,
    `user_account_role LIKE '%${escapedQuery}%'`
  ]

  // Приоритет 8: Технические данные
  const priority8 = [
    `user_agent LIKE '%${escapedQuery}%'`,
    `ua_os_name LIKE '%${escapedQuery}%'`,
    `ua_client_name LIKE '%${escapedQuery}%'`,
    `ua_device_type LIKE '%${escapedQuery}%'`
  ]

  // Объединяем все условия в порядке приоритета
  return [
    ...priority1,
    ...priority2,
    ...priority3,
    ...priority4,
    ...priority5,
    ...priority6,
    ...priority7,
    ...priority8
  ]
}
