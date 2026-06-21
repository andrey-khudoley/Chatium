import RegistrationsTable from '../tables/registrations.table'

/**
 * Интерфейс регистрации
 */
export interface Registration {
  lend?: string
  createdAt?: any // timestamp, Date, или строка
  date_reg?: string // старое поле для совместимости
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_term?: string
  utm_content?: string
  uid?: string
}

/**
 * Загружает все регистрации из локальной таблицы
 */
export async function loadLocalRegistrations(ctx: app.Ctx): Promise<Registration[]> {
  const allRegistrations: Registration[] = []
  let offset = 0
  const batchSize = 1000

  while (true) {
    const batch = await RegistrationsTable.findAll(ctx, {
      limit: batchSize,
      offset: offset
    })

    if (batch.length === 0) break
    allRegistrations.push(...batch)

    if (batch.length < batchSize) break
    offset += batchSize
  }

  return allRegistrations
}

/**
 * Загружает регистрации из внешнего воркспейса
 */
export async function loadExternalRegistrations(
  ctx: app.Ctx,
  workspacePath: string
): Promise<Registration[]> {
  try {
    // Получаем список всех таблиц в воркспейсе
    const tables = await ctx.heap.getWorkspaceTables(workspacePath)

    // Ищем таблицу с регистрациями по названию
    const regTable = tables.find(
      (t) =>
        t.title.toLowerCase().includes('регистр') ||
        t.title.toLowerCase().includes('registr') ||
        t.name.toLowerCase().includes('registr')
    )

    if (!regTable) {
      ctx.account.log('Registrations table not found', {
        level: 'warn',
        json: { workspacePath }
      })
      return []
    }

    // Загружаем все данные из таблицы с пагинацией
    const allRegistrations: Registration[] = []
    let offset = 0
    const batchSize = 1000

    while (true) {
      const batch = await ctx.heap.loadExternalTableData(regTable.path, {
        limit: batchSize,
        offset: offset
      })

      if (batch.length === 0) break
      allRegistrations.push(...batch)

      if (batch.length < batchSize) break
      offset += batchSize
    }

    ctx.account.log('External registrations loaded', {
      level: 'info',
      json: { workspacePath, tablePath: regTable.path, count: allRegistrations.length }
    })

    return allRegistrations
  } catch (error) {
    ctx.account.log('Error loading external registrations', {
      level: 'error',
      json: { error: error.message, workspacePath }
    })
    return []
  }
}

/**
 * Универсальная функция загрузки регистраций
 */
export async function loadRegistrations(
  ctx: app.Ctx,
  workspacePath: string
): Promise<Registration[]> {
  // Если workspacePath не указан или совпадает с текущим
  if (!workspacePath || workspacePath === ctx.workspacePath) {
    return await loadLocalRegistrations(ctx)
  }

  // Иначе загружаем из внешнего воркспейса
  return await loadExternalRegistrations(ctx, workspacePath)
}

/**
 * Парсит дату из различных форматов
 */
export function parseRegistrationDate(dateValue: any): Date | null {
  if (!dateValue) return null

  // Если это строка
  if (typeof dateValue === 'string') {
    // Формат DD.MM.YYYY
    if (dateValue.includes('.')) {
      const parts = dateValue.split('.')
      if (parts.length !== 3) return null
      const day = parseInt(parts[0])
      const month = parseInt(parts[1]) - 1
      const year = parseInt(parts[2])
      return new Date(year, month, day)
    }
    // Формат YYYY-MM-DD или ISO
    return new Date(dateValue)
  }

  // Если это число (timestamp)
  if (typeof dateValue === 'number') {
    return new Date(dateValue)
  }

  // Если это уже Date
  if (dateValue instanceof Date) {
    return dateValue
  }

  return null
}

/**
 * Фильтрует регистрации по диапазону дат
 */
export function filterRegistrationsByPeriod(
  registrations: Registration[],
  periodStart: Date,
  periodEnd: Date
): Registration[] {
  return registrations.filter((reg) => {
    // Пробуем сначала createdAt, потом date_reg для совместимости
    const regDate = parseRegistrationDate(reg.createdAt || reg.date_reg)
    if (!regDate) return false
    return regDate >= periodStart && regDate <= periodEnd
  })
}
