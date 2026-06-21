// @shared

/**
 * Безопасное экранирование строк для SQL-запросов
 * Предотвращает SQL-инъекции
 */
export function escapeSql(value: string): string {
  if (typeof value !== 'string') {
    return String(value)
  }

  return value
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "''")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\x00/g, '\\x00')
    .replace(/\x1a/g, '\\x1a')
}
