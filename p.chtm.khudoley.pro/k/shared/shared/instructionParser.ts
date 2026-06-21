// @shared
// Парсер инструкций из первой строки markdown-файлов
// Формат: "@instruction1 @instruction2"

/**
 * Парсит первую строку контента и возвращает массив инструкций
 * @param content - Содержимое markdown файла
 * @returns Массив инструкций в нижнем регистре (без символа @)
 * @example
 * parseInstructions("@shared @featured\n# Title") // ['shared', 'featured']
 * parseInstructions("# Title\nContent") // []
 */
export function parseInstructions(content: string): string[] {
  if (!content || typeof content !== 'string') {
    return []
  }

  // Берём первую строку
  const firstLine = content.split('\n')[0].trim()

  // Если строка начинается с @, это строка инструкций
  if (!firstLine.startsWith('@')) {
    return []
  }

  // Разбиваем по пробелам и убираем @ из каждого токена
  return firstLine
    .split(/\s+/)
    .map(token => token.trim())
    .filter(token => token.length > 0 && token.startsWith('@'))
    .map(token => token.substring(1).toLowerCase())
}

/**
 * Проверяет наличие конкретной инструкции в контенте
 * @param content - Содержимое markdown файла
 * @param instruction - Название инструкции (без символа @)
 * @returns true если инструкция найдена
 * @example
 * hasInstruction("@shared\n# Title", 'shared') // true
 * hasInstruction("@shared @featured\n# Title", 'featured') // true
 * hasInstruction("# Title", 'shared') // false
 */
export function hasInstruction(content: string, instruction: string): boolean {
  if (!content || !instruction) {
    return false
  }

  const instructions = parseInstructions(content)
  return instructions.includes(instruction.toLowerCase())
}

/**
 * Удаляет строку инструкций из контента
 * @param content - Содержимое markdown файла
 * @returns Контент без первой строки инструкций
 * @example
 * stripInstructions("@shared\n# Title") // "# Title"
 * stripInstructions("@shared @featured\n# Title") // "# Title"
 * stripInstructions("# Title") // "# Title"
 */
export function stripInstructions(content: string): string {
  if (!content || typeof content !== 'string') {
    return content || ''
  }

  const lines = content.split('\n')
  const firstLine = lines[0]?.trim() || ''

  // Если первая строка начинается с @, удаляем её
  if (firstLine.startsWith('@')) {
    return lines.slice(1).join('\n')
  }

  return content
}
